import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { alairastEllenoriz } from '../../../shared/uzleti/alairas.ts';
import {
  cimetKibont,
  cimzettekbolToken,
  feladotEllenoriz,
  mellekletValogat,
  type MellekletFej,
} from '../../../shared/uzleti/bekuldes.ts';
import { ellenoriz, MINTA_BAJT } from '../../../shared/uzleti/fajltipus.ts';
import { keretAllapot, type CegAllapot } from '../../../shared/uzleti/keret.ts';

/**
 * E-mailes beküldés — a bejövő levél webhookja.
 *
 * # ⚠️ Ez az első függvény ebben a projektben, ami `verify_jwt: false`-szal fut
 *
 * A `kiolvas` és a `selejtez` is a platform JWT-ellenőrzése mögött ül, és a
 * `token.ts` érvelése **arra támaszkodik**, hogy a tokent már hitelesítették,
 * mire a kód megnézi a `role` állítását. Egy webhook-végponton ez nem járható:
 * a levélszolgáltató nem tud Supabase-JWT-t küldeni.
 *
 * Ezért itt a hitelesítés **teljes egészében** az aláírás-ellenőrzés
 * (`shared/uzleti/alairas.ts`). Ami ott második réteg volt, az itt az első és
 * az utolsó — és ennek megfelelően ez a **legelső** dolog, ami lefut. Előtte
 * nem olvasunk adatbázist, nem töltünk le semmit, és nem írunk naplót.
 *
 * # Miért webhook, és nem IMAP
 *
 * A régi rendszer postafiókot olvasott. Annak három baja volt, és mindhárom
 * élesben sült el: a kapcsolat elhalt és senki nem vette észre; a „melyik
 * levelet láttuk már" állapot a postafiókban élt, tehát egy kézi olvasás
 * elrontotta; és a futás alatt a postafiók jelszava ott volt a processzben.
 * Itt egyik sincs.
 *
 * # A válaszkód jelentése
 *
 * - **401**: az aláírás nem stimmel. Ez az egyetlen eset, ahol nem 2xx megy
 *   vissza — mert ez nem a szolgáltatótól jött.
 * - **200 minden másra**, beleértve az ismeretlen címzettet és az elutasított
 *   feladót is. Ezek a **mi** döntéseink, nem kézbesítési hibák; egy 4xx csak
 *   annyit érne el, hogy a szolgáltató napokig újrapróbálkozzon ugyanazzal.
 *
 * ⚠️ `service_role`-lal fut, tehát megkerüli az RLS-t. Minden írás kézzel adja
 * meg a `company_id`-t: a `tolti_company_id()` trigger az `auth.uid()`-ra épül,
 * ami itt üres.
 */

type Melleklet = MellekletFej & { download_url?: string | null };

type LevelAdat = {
  email_id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  attachments?: Melleklet[];
};

const RESEND_API = 'https://api.resend.com';

Deno.serve(async (keres: Request): Promise<Response> => {
  // A **nyers** test kell az aláírás-ellenőrzéshez, nem az értelmezett JSON:
  // egy `JSON.parse` → `stringify` kör megváltoztatja a bájtokat, és attól az
  // aláírás érvénytelenné válna.
  const nyersTest = await keres.text();

  const alairas = await alairastEllenoriz({
    test: nyersTest,
    // A Standard Webhooks `webhook-*` fejléceket ír; a Svix-alapú
    // szolgáltatók a `svix-*` alakot küldik. Ugyanaz a séma, két név.
    id: fejlec(keres, 'webhook-id', 'svix-id'),
    idobelyeg: fejlec(keres, 'webhook-timestamp', 'svix-timestamp'),
    alairas: fejlec(keres, 'webhook-signature', 'svix-signature'),
    titok: Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '',
  });

  if (!alairas.ok) {
    // A `miert` a naplóba megy, nem a válaszba: egy hívónak semmi dolga azzal,
    // hogy az aláírás vagy az időbélyeg bukott el. A kettő megkülönböztetése
    // épp elég ahhoz, hogy valaki próbálgatásból tanuljon.
    console.warn('Elutasított webhook:', alairas.miert);

    return valasz({ hiba: 'Érvénytelen aláírás.' }, 401);
  }

  let esemeny: { type?: string; data?: LevelAdat };

  try {
    esemeny = JSON.parse(nyersTest) as typeof esemeny;
  } catch {
    return valasz({ allapot: 'ertelmezhetetlen' }, 200);
  }

  if (esemeny.type !== 'email.received') {
    // Más eseményre is fel lehetünk iratkozva (kézbesítés, visszapattanás); az
    // nem ennek a végpontnak a dolga, de nem is hiba.
    return valasz({ allapot: 'kihagyva', tipus: esemeny.type ?? null }, 200);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  try {
    return await levelet(db, esemeny.data ?? {});
  } catch (hiba) {
    // ⚠️ Szándékosan 200. Egy váratlan hiba után az újrapróbálkozás ugyanazon a
    // kódon futna végig, ugyanazzal az eredménnyel — a szolgáltató viszont
    // napokig kopogtatna vele. A nyom a naplóban marad.
    console.error('Feldolgozási hiba:', hiba);

    return valasz({ allapot: 'hiba' }, 200);
  }
});

async function levelet(db: SupabaseClient, adat: LevelAdat): Promise<Response> {
  const levelAzonosito = adat.email_id ?? '';

  if (levelAzonosito === '') {
    return valasz({ allapot: 'azonosito_nelkul' }, 200);
  }

  const token = cimzettekbolToken(adat.to ?? []);

  if (token === null) {
    // ⚠️ Ismeretlen címzett: **semmit nem tárolunk.** Nincs cége, tehát nincs,
    // akinek a sora lenne — egy bérlő nélküli sort pedig az RLS nem tud
    // megvédeni. Ez az az út, amin a levélszemét érkezik; a naplóban látszik.
    console.info('Ismeretlen címzett, eldobva.');

    return valasz({ allapot: 'ismeretlen_cimzett' }, 200);
  }

  const { data: ceg } = await db
    .from('companies')
    .select('id, bekuldes_be, bekuldes_barkitol')
    .eq('bekuldes_token', token)
    .maybeSingle();

  if (ceg === null) {
    console.info('Nincs cég ehhez a tokenhez.');

    return valasz({ allapot: 'ismeretlen_cimzett' }, 200);
  }

  const cegId = ceg.id as string;
  const felado = cimetKibont(adat.from ?? '') ?? adat.from ?? null;
  const targy = adat.subject ?? null;

  /*
   * # Az idempotencia, és mit bír el pontosan
   *
   * A sort **a munka előtt** írjuk be, és a `provider_email_id` egyedi indexe
   * dönt: ha már van ilyen, ez a kézbesítés ismétlés, és nem csinálunk semmit.
   * Ez nem elméleti eset — a szolgáltató minden elakadt válasz után újraküld.
   *
   * Az induló állapot `ures`, és ez **igaz állítás** abban a pillanatban: a
   * levél rendben megérkezett, de még egyetlen mellékletéből sem lett
   * bizonylat. Ha a függvény félúton elszáll, a sor pontosan ezt mondja, és a
   * felhasználó látja. Nem írunk be „feldolgozás alatt" állapotot, mert az a
   * három állapot egyikét sem jelentené.
   *
   * A második védelem a fájl `sha256`-szűrője: ha mégis kétszer futnánk végig,
   * a fájl `duplikatum` sort kap, ami **nem kerül kreditbe**. A kettő együtt
   * azt jelenti, hogy a legrosszabb kimenetel egy fölösleges sor, nem egy
   * kétszer kiszámlázott bizonylat.
   */
  const { data: naplosor, error: naploHiba } = await db
    .from('inbound_emails')
    .insert({
      company_id: cegId,
      provider_email_id: levelAzonosito,
      from_address: felado,
      subject: targy,
      status: 'ures',
      attachment_count: adat.attachments?.length ?? 0,
    })
    .select('id')
    .single();

  if (naploHiba !== null || naplosor === null) {
    // 23505 = egyedi index megsértése. Ez a várt eset újraküldéskor.
    if (naploHiba?.code === '23505') {
      return valasz({ allapot: 'mar_feldolgozva' }, 200);
    }

    throw new Error(`A napló sora nem íródott be: ${naploHiba?.message ?? 'ismeretlen'}`);
  }

  const naploId = naplosor.id as string;

  if (ceg.bekuldes_be !== true) {
    return await lezar(db, naploId, 'elutasitva', 0, 'Az e-mailes beküldés ki van kapcsolva a Beállításokban.');
  }

  const feladoDontes = feladotEllenoriz(
    adat.from ?? '',
    await tagCimek(db, cegId),
    ceg.bekuldes_barkitol === true,
  );

  if (!feladoDontes.ok) {
    return await lezar(db, naploId, 'elutasitva', 0, feladoDontes.indok);
  }

  const keret = await keretEllenoriz(db, cegId);

  if (keret !== null) {
    return await lezar(db, naploId, 'elutasitva', 0, keret);
  }

  const mellekletek = await mellekleteket(adat, levelAzonosito);
  const { elfogadott, mellozott } = mellekletValogat(mellekletek);

  if (elfogadott.length === 0) {
    const indok =
      mellozott.length === 0
        ? 'A levélben nem volt melléklet.'
        : `Egyetlen melléklet sem volt feldolgozható. ${mellozott
            .map((m) => `${m.nev}: ${m.indok}`)
            .join(' ')}`;

    return await lezar(db, naploId, 'ures', 0, indok);
  }

  let kesz = 0;
  const bukott: string[] = [];

  for (const melleklet of elfogadott) {
    const eredmeny = await mellekletet(db, cegId, melleklet as Melleklet, levelAzonosito);

    if (eredmeny === null) {
      kesz++;
    } else {
      bukott.push(`${melleklet.filename ?? 'melléklet'}: ${eredmeny}`);
    }
  }

  const uzenet = [
    ...mellozott.map((m) => `${m.nev}: ${m.indok}`),
    ...bukott,
  ].join(' ');

  return await lezar(
    db,
    naploId,
    kesz > 0 ? 'feldolgozva' : 'ures',
    kesz,
    uzenet === '' ? null : uzenet,
  );
}

/**
 * Egy melléklet átemelése: letöltés → típusellenőrzés → tároló → sorok.
 *
 * Visszatérés: `null`, ha sikerült; különben az emberi indok, ami a naplósorba
 * kerül. Nem dob kivételt — egy rossz melléklet nem viheti el a levél többi
 * mellékletét.
 *
 * A sorrend **szándékosan** ugyanaz, mint a böngészős feltöltésnél
 * (`src/lib/feltoltes.ts`): előbb a tárolóba, utána az adatbázisba. Fordítva
 * egy megszakadt művelet után maradna egy sor, ami nem létező fájlra mutat — a
 * Beérkező mutatná, a megnyitása viszont hibára futna.
 */
async function mellekletet(
  db: SupabaseClient,
  cegId: string,
  melleklet: Melleklet,
  levelAzonosito: string,
): Promise<string | null> {
  const nev = melleklet.filename ?? 'melleklet';

  let bajtok: Uint8Array;

  try {
    bajtok = await letolt(melleklet, levelAzonosito);
  } catch (hiba) {
    return `Nem tölthető le (${hiba instanceof Error ? hiba.message : 'ismeretlen hiba'}).`;
  }

  /*
   * ⚠️ Itt dől el a típus, és **a bájtokból**, nem a levél állításából. Ez
   * ugyanaz a függvény, ami a böngészős feltöltésnél is dönt — egy fájl akkor
   * sem lesz PDF, ha a küldő annak mondja.
   *
   * A `mellekletValogat()` fejléc-szűrője ezt nem váltja ki: az **olcsóbb, nem
   * szigorúbb**, azt dönti el, mit érdemes egyáltalán áthozni. A végső szót
   * ez a sor mondja ki.
   */
  const vizsgalat = ellenoriz(bajtok.slice(0, MINTA_BAJT), bajtok.length, nev);

  if (!vizsgalat.ok) {
    return vizsgalat.hiba;
  }

  const sha256 = await ujjlenyomat(bajtok);

  const { data: meglevo } = await db
    .from('files')
    .select('id')
    .eq('company_id', cegId)
    .eq('sha256', sha256)
    .limit(1)
    .maybeSingle();

  if (meglevo !== null) {
    // Ugyanazt a bizonylatot már láttuk. A `duplikatum` sor **nem kerül
    // kreditbe**, és megmondja, minek a párja — pontosan úgy, ahogy a
    // böngészős feltöltésnél.
    const { data: eredeti } = await db
      .from('documents')
      .select('id')
      .eq('file_id', meglevo.id)
      .neq('status', 'duplikatum')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    await db.from('documents').insert({
      company_id: cegId,
      file_id: meglevo.id,
      status: 'duplikatum',
      duplicate_of_id: eredeti?.id ?? null,
    });

    return 'Ezt a fájlt már feltöltötték korábban.';
  }

  const fajlId = crypto.randomUUID();
  const utvonal = `${cegId}/${fajlId}.${vizsgalat.tipus.kiterjesztes}`;

  const { error: tarolasiHiba } = await db.storage.from('bizonylatok').upload(utvonal, bajtok, {
    contentType: vizsgalat.tipus.mime,
    upsert: false,
  });

  if (tarolasiHiba !== null) {
    return 'A tárolóba mentés nem sikerült.';
  }

  const { error: fajlHiba } = await db.from('files').insert({
    id: fajlId,
    company_id: cegId,
    original_filename: nev,
    mime_type: vizsgalat.tipus.mime,
    size_bytes: bajtok.length,
    sha256,
    storage_path: utvonal,
    source: 'email',
    // `uploaded_by` marad üres, és ez igaz állítás: **nem felhasználó töltötte
    // fel.** Egy odaírt cégtulajdonos azt hazudná, hogy ő volt.
  });

  if (fajlHiba !== null) {
    return `A fájl sora nem íródott be: ${fajlHiba.message}`;
  }

  const { error: dokumentumHiba } = await db.from('documents').insert({
    company_id: cegId,
    file_id: fajlId,
    status: 'feltoltve',
  });

  if (dokumentumHiba !== null) {
    return `A bizonylat sora nem íródott be: ${dokumentumHiba.message}`;
  }

  // A kiolvasást **nem** indítjuk el innen: a percenkénti cron
  // (`szamlafolyo-sor`) úgyis felveszi. Egy levél amúgy is perceket utazott,
  // mire ideért — egy közvetlen hívás itt nem gyorsítana érdemben, cserébe
  // egy újabb hibalehetőséget hozna a levélfeldolgozás útjába.
  return null;
}

/** A melléklet bájtjai. */
async function letolt(melleklet: Melleklet, levelAzonosito: string): Promise<Uint8Array> {
  let url = melleklet.download_url ?? null;

  // A webhook payloadja **csak metaadatot** hoz; a bájtokért külön kell menni.
  // Ha a letöltési hivatkozás nincs benne (vagy lejárt), a mellékletlistából
  // frissen kérünk egyet.
  if (url === null) {
    const lista = await resend<{ data?: Melleklet[] }>(
      `/emails/receiving/${levelAzonosito}/attachments`,
    );

    url = lista.data?.find((m) => m.id === melleklet.id)?.download_url ?? null;
  }

  if (url === null) {
    throw new Error('nincs letöltési hivatkozás');
  }

  const valasz = await fetch(url);

  if (!valasz.ok) {
    throw new Error(`HTTP ${valasz.status}`);
  }

  return new Uint8Array(await valasz.arrayBuffer());
}

/** A levél mellékletei — a payloadból, vagy ha ott nincs, a szolgáltatótól. */
async function mellekleteket(adat: LevelAdat, levelAzonosito: string): Promise<Melleklet[]> {
  if (adat.attachments !== undefined && adat.attachments.length > 0) {
    return adat.attachments;
  }

  try {
    const lista = await resend<{ data?: Melleklet[] }>(
      `/emails/receiving/${levelAzonosito}/attachments`,
    );

    return lista.data ?? [];
  } catch (hiba) {
    console.warn('A mellékletlista nem kérhető le:', hiba);

    return [];
  }
}

async function resend<T>(ut: string): Promise<T> {
  const valasz = await fetch(`${RESEND_API}${ut}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}` },
  });

  if (!valasz.ok) {
    throw new Error(`A szolgáltató ${valasz.status} választ adott.`);
  }

  return (await valasz.json()) as T;
}

/** A cég tagjainak e-mail címe. */
async function tagCimek(db: SupabaseClient, cegId: string): Promise<string[]> {
  const { data: tagok } = await db
    .from('company_members')
    .select('user_id')
    .eq('company_id', cegId)
    .not('accepted_at', 'is', null);

  if (tagok === null) {
    return [];
  }

  const cimek: string[] = [];

  for (const tag of tagok) {
    // Az `auth.users` nem érhető el a PostgREST-en; az admin API adja.
    const { data } = await db.auth.admin.getUserById(tag.user_id as string);

    if (data?.user?.email) {
      cimek.push(data.user.email);
    }
  }

  return cimek;
}

/**
 * Van-e még keret.
 *
 * Ugyanaz a modul dönt, mint a böngészőben és a `kiolvas`-ban
 * (`shared/uzleti/keret.ts` + `keret_adatok()`). Itt **a letöltés előtt** áll:
 * egy elfogyott keretnél nincs értelme mellékleteket áthozni, hogy aztán a
 * `kiolvas` álljon meg velük.
 */
async function keretEllenoriz(db: SupabaseClient, cegId: string): Promise<string | null> {
  const { data } = await db.rpc('keret_adatok', { ceg_id: cegId });

  if (data === null || data === undefined) {
    // Nem tudjuk megmondani. Ilyenkor átengedjük: a `kiolvas` saját fékje
    // úgyis megáll, ha tényleg elfogyott — ott viszont már nem vész el levél.
    return null;
  }

  const nyers = data as unknown as CegAllapot & { felhasznalt: number };
  const allapot = keretAllapot(nyers, nyers.felhasznalt);

  return allapot.mehet ? null : (allapot.indok ?? 'Elfogyott a kereted.');
}

async function lezar(
  db: SupabaseClient,
  naploId: string,
  status: 'feldolgozva' | 'ures' | 'elutasitva',
  elfogadott: number,
  indok: string | null,
): Promise<Response> {
  await db
    .from('inbound_emails')
    .update({ status, accepted_count: elfogadott, reason: indok })
    .eq('id', naploId);

  return valasz({ allapot: status, bizonylat: elfogadott }, 200);
}

function fejlec(keres: Request, elsodleges: string, masodlagos: string): string {
  return keres.headers.get(elsodleges) ?? keres.headers.get(masodlagos) ?? '';
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** SHA-256 hexa alakban — ugyanaz a számítás, mint a böngészős feltöltésnél. */
async function ujjlenyomat(bajtok: Uint8Array): Promise<string> {
  const kivonat = await crypto.subtle.digest('SHA-256', bajtok as unknown as ArrayBuffer);

  return [...new Uint8Array(kivonat)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
