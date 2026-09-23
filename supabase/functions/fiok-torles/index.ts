import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { nevEgyezik, torlesDontes, type TorlesTenyek } from '../../../shared/uzleti/fiokTorles.ts';
import { tokenAllitas } from '../../../shared/uzleti/token.ts';
import { stripeKeres } from '../_kozos/stripe.ts';

/**
 * A fiók törlése — a rendszer egyetlen visszafordíthatatlan művelete.
 *
 * # A sorrend, és miért pont ez
 *
 * Négy lépés, és mindegyik **megszakadhat**. A sorrendet az szabta meg, hogy
 * egy félbemaradt futás milyen állapotot hagy hátra — mert a hálózat nem
 * kérdezi meg, mikor alkalmas:
 *
 * | Lépés | Ha ITT szakad meg |
 * |---|---|
 * | 1. Stripe-lemondás | **semmi nem történt** — a fiók és az adat ép |
 * | 2. tároló ürítése | az előfizetés lemondva, az adat ép; újra indítható |
 * | 3. a cégsor törlése | a fájlok elmentek, a sorok maradtak; újra indítható |
 * | 4. a fiók törlése | az adat elment, a belépés maradt; újra indítható |
 *
 * Minden lépés **újrafuttatható**, és a következő futás a már elvégzettet
 * kihagyja. Ezért fontos, hogy a lemondás legyen az első: az az egyetlen
 * lépés, ami **pénzt** érint, és amit nem mi tartunk nyilván. Ha az elbukik,
 * inkább ne töröljünk semmit — egy törölt fiók mellett tovább terhelt
 * bankkártya a lehető legrosszabb kimenetel.
 *
 * # Amit a kaszkád intéz helyettünk — mérve, nem feltételezve
 *
 * - `company_members.user_id → auth.users` **CASCADE**: a fiók törlése viszi a
 *   tagságot. Külön törölni nem kell, és nem is szabad.
 * - `files.uploaded_by`, `exports.created_by`, `documents.approved_by`,
 *   `document_corrections.corrected_by`, `activity_log.user_id` → **SET NULL**:
 *   a megmaradó cég adatain a személyes kapcsolat magától elvágódik.
 * - a `companies` sor törlése **CASCADE**-el mind a tíz cégfüggő táblán.
 *
 * Amit viszont **nem** intéz senki, és ezért itt van: a tárolóban lévő fájlok
 * (a Storage nem ismeri az idegen kulcsainkat) és a `company_invites.email`,
 * ami sima szöveg — egy meghívósoron a törölt felhasználó címe maradna.
 *
 * # Amit a böngészőtől NEM fogadunk el
 *
 * Semmit azon kívül, hogy melyik cégnevet gépelte be. A tényeket — hány tag
 * van, fut-e előfizetés, ki a tulajdonos — a szerver a **saját** olvasásából
 * veszi, a hívó JWT-jével, és a döntést ugyanaz a tiszta modul hozza, mint a
 * képernyőn. Ha a kettő széttartana, a felhasználó egy másik műveletre mondana
 * igent, mint ami lefut.
 *
 * ⚠️ `verify_jwt: true`. A hívó azonosítója a token `sub` állításából jön,
 * ellenőrzés nélkül — azt csak azért tehetjük meg, mert a platform a tokent
 * addigra már hitelesítette. Kikapcsolva bárki törölhetné bárki fiókját.
 */

/** A két bucket, ahol a cégnek fájlja lehet. Mindkettő `<cég-azonosító>/…`. */
const TAROLOK = ['bizonylatok', 'exportok'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Ceg = { id: string; stripe_subscription_id: string | null };

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  const fejlec = keres.headers.get('Authorization');
  const felhasznalo = tokenAllitas(fejlec, 'sub');
  const email = tokenAllitas(fejlec, 'email');

  if (felhasznalo === null) {
    return valasz({ hiba: 'Bejelentkezés szükséges.' }, 401);
  }

  let megerosites = '';

  try {
    const test = (await keres.json()) as { megerosites?: unknown };
    megerosites = typeof test.megerosites === 'string' ? test.megerosites : '';
  } catch {
    return valasz({ hiba: 'Értelmezhetetlen kérés.' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';

  // A tényeket a **hívó jogán** kérdezzük le, ugyanazzal az RPC-vel, amit a
  // képernyő is hívott. Így a szerver és a felület egy forrásból dolgozik, és
  // a felhasználó mégsem tud hamis tényeket beküldeni: a függvény az
  // `auth.uid()`-ból indul, nem a kérésből.
  const hivoDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: fejlec ?? '' } },
  });

  const { data: nyers, error: tenyHiba } = await hivoDb.rpc('fiok_torles_tenyek');

  if (tenyHiba !== null || nyers === null) {
    console.error('A törlési tények lekérdezése nem sikerült:', tenyHiba);

    return valasz({ hiba: 'A fiók állapotát nem sikerült lekérdezni.' }, 500);
  }

  const tenyek = nyers as unknown as TorlesTenyek;
  const dontes = torlesDontes(tenyek);

  if (dontes.fajta === 'tiltva') {
    return valasz({ hiba: dontes.miert }, 409);
  }

  // ⚠️ A begépelt cégnév ellenőrzése **itt is** megtörténik, nem csak a
  // böngészőben. Ez a végpont közvetlenül is hívható.
  if (dontes.fajta === 'ceggel' && !nevEgyezik(megerosites, tenyek.cegNev)) {
    return valasz({ hiba: 'A megerősítéshez a cég nevét pontosan be kell írni.' }, 400);
  }

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  if (dontes.fajta === 'ceggel') {
    const { data: ceg } = await db
      .from('companies')
      .select('id, stripe_subscription_id')
      .eq('id', await cegAzonosito(db, felhasznalo))
      .maybeSingle<Ceg>();

    if (ceg === null) {
      return valasz({ hiba: 'A cég nem található.' }, 404);
    }

    // 1. A pénz. Ha ez nem megy, nem törlünk semmit.
    const lemondas = await elofizetestLemond(ceg.stripe_subscription_id);

    if (!lemondas.ok) {
      console.error('Az előfizetés lemondása nem sikerült:', lemondas.miert);

      return valasz(
        {
          hiba:
            'Az előfizetés lemondása nem sikerült, ezért semmit nem töröltünk. ' +
            'Próbáld újra később, vagy mondd le a számlázási portálon.',
        },
        502,
      );
    }

    // 2. A tároló. A Storage nem ismeri az idegen kulcsainkat: ha a cégsort
    //    előbb törölnénk, a fájlok gazdátlanul ottmaradnának — és épp azt az
    //    ígéretet szegnénk meg, hogy nem tartunk fenn másolatot.
    for (const tarolo of TAROLOK) {
      const urites = await mappatUrit(db, tarolo, ceg.id);

      if (!urites.ok) {
        console.error(`A(z) ${tarolo} ürítése nem sikerült:`, urites.miert);

        return valasz(
          {
            hiba: 'A fájlok törlése nem sikerült, ezért az adatok megmaradtak. Próbáld újra.',
          },
          500,
        );
      }
    }

    // 3. A cégsor — és vele kaszkádban mind a tíz cégfüggő tábla.
    const { error: cegHiba } = await db.from('companies').delete().eq('id', ceg.id);

    if (cegHiba !== null) {
      console.error('A cég törlése nem sikerült:', cegHiba);

      return valasz({ hiba: 'A cég adatainak törlése nem sikerült. Próbáld újra.' }, 500);
    }

    // A helyreállítási eljárás nyoma (`eszkozok/torles/OLVASS-EL.md`). Egy
    // mentésből visszaállított adatbázisban ez a cég újra megjelenne, és a
    // naplón kívül semmi nem őrzi, hogy törölni kell: az adatbázis a mentés
    // állapotára áll vissza, vele minden benne tárolt nyom. **Csak azonosító**,
    // személyes adat nélkül — a napló nem lehet egy második adattár.
    console.log(JSON.stringify({ esemeny: 'ceg_torolve', ceg: ceg.id }));
  }

  // A meghívósorokon a cím **sima szöveg**, nem idegen kulcs — azt semmilyen
  // kaszkád nem viszi el. Egy megmaradó cégben ottmaradna a törölt felhasználó
  // e-mail-címe.
  if (email !== null) {
    const { error } = await db.from('company_invites').delete().eq('email', email);

    if (error !== null) {
      // Nem állítjuk meg miatta a törlést: a fiók megszüntetése fontosabb,
      // mint egy meghívósor. De a naplóba bekerül, mert nyom nélkül nem maradhat.
      console.error('A meghívósorok törlése nem sikerült:', error);
    }
  }

  // 4. A fiók. Innentől a tagság (CASCADE) és a személyes hivatkozások
  //    (SET NULL) magukat intézik.
  const { error: fiokHiba } = await db.auth.admin.deleteUser(felhasznalo);

  if (fiokHiba !== null) {
    console.error('A fiók törlése nem sikerült:', fiokHiba);

    return valasz(
      {
        hiba:
          'Az adataid törlődtek, de a belépési fiókod megszüntetése nem sikerült. ' +
          'Indítsd el a törlést még egyszer.',
      },
      500,
    );
  }

  // Ugyanaz a nyom a fiókról — lásd a cégtörlésnél.
  console.log(JSON.stringify({ esemeny: 'fiok_torolve', felhasznalo }));

  return valasz({ rendben: true, fajta: dontes.fajta }, 200);
});

/** A hívó cége — ugyanaz a rendezés, mint a `belso.aktualis_ceg()`-ben. */
async function cegAzonosito(
  db: SupabaseClient,
  felhasznalo: string,
): Promise<string | null> {
  const { data } = await db
    .from('company_members')
    .select('company_id')
    .eq('user_id', felhasznalo)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ company_id: string }>();

  return data?.company_id ?? null;
}

/**
 * Az előfizetés azonnali lemondása.
 *
 * Előbb **megnézzük**, aztán mondunk le: egy már lemondott előfizetésre a
 * Stripe hibát ad, és abból nem szabad „nem sikerült"-et olvasni — különben
 * egy megszakadt törlés soha nem lenne újraindítható.
 *
 * ⚠️ Azonnali lemondás, nem a ciklus végére. Az ÁSZF 9. pontja ezt mondja ki:
 * a fiók törlésével az adatok is elmennek, tehát a kifizetett időszak
 * hátralévő része úgysem használható fel.
 */
async function elofizetestLemond(
  elofizetes: string | null,
): Promise<{ ok: true } | { ok: false; miert: string }> {
  if (elofizetes === null) {
    return { ok: true };
  }

  const kulcs = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

  if (kulcs === '') {
    // Nincs kulcs, de van előfizetés-azonosító: ezt **nem** hagyjuk szó
    // nélkül. Törölni úgy, hogy közben egy élő előfizetés tovább terhel, a
    // legrosszabb, amit tehetnénk.
    return { ok: false, miert: 'Nincs STRIPE_SECRET_KEY.' };
  }

  // A **nem dobó** réteget hívjuk (`stripeKeres`), nem a `stripe()`-et: itt egy
  // 404 nem hiba, hanem válasz — és egy kivétel megállítaná a törlési láncot.
  const allapot = await stripeKeres(kulcs, `/subscriptions/${elofizetes}`);

  if (allapot.status === 404) {
    // A Stripe nem ismeri — nincs mit lemondani. Ez például egy fiókváltás
    // után fordulhat elő (sandbox azonosító éles kulccsal).
    return { ok: true };
  }

  if (!allapot.ok) {
    return { ok: false, miert: `Stripe ${allapot.status}` };
  }

  const sor = (await allapot.json()) as { status?: string };

  if (sor.status === 'canceled' || sor.status === 'incomplete_expired') {
    return { ok: true };
  }

  const torles = await stripeKeres(kulcs, `/subscriptions/${elofizetes}`, { mod: 'DELETE' });

  if (!torles.ok) {
    return {
      ok: false,
      miert: `Stripe ${torles.status}: ${(await torles.text()).slice(0, 300)}`,
    };
  }

  return { ok: true };
}

/**
 * Egy cég mappájának ürítése a megadott tárolóban.
 *
 * Nem a `files` sorokból dolgozik, hanem a tároló **tényleges** tartalmából:
 * így az is elmegy, aminek a nyilvántartott sora valamiért már nincs meg. A
 * lapozás azért kell, mert a `list` egy hívásban csak véges sok nevet ad.
 */
async function mappatUrit(
  db: SupabaseClient,
  tarolo: string,
  ceg: string,
): Promise<{ ok: true; darab: number } | { ok: false; miert: string }> {
  const tar = db.storage.from(tarolo);
  let osszes = 0;

  // Felső korlát a végtelen ciklus ellen: ha száz kör után is jön név, valami
  // mást rontottunk el, és jobb hibával megállni, mint örökké körözni.
  for (let kor = 0; kor < 100; kor += 1) {
    const { data, error } = await tar.list(ceg, { limit: 100 });

    if (error !== null) {
      return { ok: false, miert: error.message };
    }

    if (data === null || data.length === 0) {
      return { ok: true, darab: osszes };
    }

    const utvonalak = data.map((f) => `${ceg}/${f.name}`);
    const { error: torlesHiba } = await tar.remove(utvonalak);

    if (torlesHiba !== null) {
      return { ok: false, miert: torlesHiba.message };
    }

    osszes += utvonalak.length;
  }

  return { ok: false, miert: 'A tároló ürítése nem ért véget száz kör alatt.' };
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
