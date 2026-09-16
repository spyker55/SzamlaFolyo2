import { createClient } from '@supabase/supabase-js';

/**
 * Fiók nyitása meghívóra — a nyilvános regisztráció megkerülésével.
 *
 * # Miért kellett ez
 *
 * A meghívott eddig a közönséges `supabase.auth.signUp()`-ot hívta. Amíg a
 * projektben nyitva állt a regisztráció, ez működött — de a nyitott
 * regisztráció azt jelenti, hogy **bárki fiókot nyithat** a böngészőcsomagban
 * szereplő publikálható kulccsal, közvetlenül az API-n. A felületi kapcsoló
 * (`VITE_REGISZTRACIO_NYITVA`) csak a képernyőt zárja, a végpontot nem.
 *
 * A Supabase `disable_signup` kapcsolója viszont **nem tesz különbséget**: a
 * meghívott `signUp()` hívását ugyanúgy elutasítja, mint az idegenét. Vagyis a
 * kettő addig kizárta egymást: vagy nyitva a kapu mindenkinek, vagy a meghívás
 * sem működik.
 *
 * Ez a függvény bontja szét a kettőt. A fiókot `service_role`-lal hozza létre,
 * tehát a `disable_signup` nem érinti — cserébe **csak olyan címre**, amit egy
 * tulajdonos nevesítve meghívott, és csak élő meghívóra.
 *
 * # Mi hitelesíti, ha nincs JWT
 *
 * A meghívónak **nincs** még fiókja, tehát nincs tokenje sem: a `verify_jwt`
 * ezért van kikapcsolva (a második ilyen a projektben, az `email-bekuldes`
 * után). A hitelesítés maga a **meghívó jele**: 24 karakter a
 * félreolvashatatlan ábécéből (`belso.veletlen_jel`), ~119 bit. Ugyanaz az elv,
 * mint a beküldő címnél — a jel bemutatóra szóló kulcs, nem azonosító.
 *
 * Amit a jel birtokosa elérhet, az szűk: **egyetlen** fiók, **egyetlen**
 * címre, amit nem ő választ, hanem a meghívó. Meglévő fiókot nem ír felül —
 * az `email_exists` hibát kiadjuk, nem nyeljük le.
 *
 * # Miért `email_confirm: true`
 *
 * Mert a cím ellenőrzése **már megtörtént**: a jel ehhez a postafiókhoz ment
 * ki (a `sent_at` és a szolgáltató kézbesítési naplója is ezt mondja), vagy a
 * tulajdonos adta át kézzel a linket — mindkét esetben ő nevezte meg a címet.
 * Egy második megerősítő kör ezen a ponton nem mérne semmi újat, viszont
 * **egy egész levélváltással** hosszabbítaná meg az utat: pont az a lépés,
 * ami élesben egyszer már elnyelt egy meghívót.
 *
 * # Amit ez a függvény NEM csinál
 *
 * **Nem fogadja el a meghívót.** Azt továbbra is a `meghivot_elfogad()` teszi,
 * a maga négy kapujával, a friss munkamenettel. Két helyen eldöntve előbb-utóbb
 * két választ adna — ugyanaz az érv, ami a `Meghivo.tsx` fejlécében is áll.
 */

/**
 * CORS. A `meghivo-kuld` tanulsága szó szerint érvényes ide is: böngészőből
 * hívott függvény elővizsgálat (`OPTIONS`) nélkül **némán** nem működik, és a
 * mockolt hálózatú böngészőpróba ezt nem fogja meg.
 *
 * A `*` itt még kevésbé lazítás, mint ott: a végpont eleve nyitott, a védelmét
 * a meghívó jele adja, nem a származási hely.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** A jelszó alsó határa. Ugyanaz, amit a felület is kér — egy szabály, két hely. */
const JELSZO_MIN = 8;

type Meghivo = {
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  let jel: string;
  let jelszo: string;

  try {
    const test = (await keres.json()) as { jel?: unknown; jelszo?: unknown };

    if (typeof test.jel !== 'string' || test.jel === '') {
      return valasz({ hiba: 'Hiányzik a meghívó jele.' }, 400);
    }

    if (typeof test.jelszo !== 'string' || test.jelszo.length < JELSZO_MIN) {
      return valasz({ hiba: `A jelszó legyen legalább ${JELSZO_MIN} karakter.` }, 400);
    }

    jel = test.jel;
    jelszo = test.jelszo;
  } catch {
    return valasz({ hiba: 'Értelmezhetetlen kérés.' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data, error } = await db
    .from('company_invites')
    .select('email, expires_at, accepted_at, revoked_at')
    .eq('token', jel)
    .maybeSingle<Meghivo>();

  if (error !== null) {
    console.error('A meghívó nem kérdezhető le:', error.message);
    return valasz({ hiba: 'A meghívó nem kérdezhető le.' }, 500);
  }

  if (data === null) {
    return valasz({ hiba: 'Ez a meghívó nem érvényes.' }, 404);
  }

  const allapot = allapota(data);

  if (allapot !== null) {
    return valasz({ hiba: allapot }, 409);
  }

  const { error: fiokHiba } = await db.auth.admin.createUser({
    email: data.email,
    password: jelszo,
    email_confirm: true,
  });

  if (fiokHiba !== null) {
    if (marLetezik(fiokHiba)) {
      // ⚠️ Ez **nem** szivárgás: a jel birtokosa a `meghivo_adatok()`-ból amúgy
      // is tudja, melyik címre szól a meghívó. Cserébe ez az üzenet fogja meg
      // azt a zsákutcát, amiben a Supabase — cím-kitalálás elleni védelemből —
      // ugyanazt a „nézd meg a postafiókod" választ adja a foglalt címre is,
      // csak épp nem érkezik levél.
      return valasz({ hiba: 'Ehhez a címhez már tartozik fiók. Lépj be a jelszavaddal.' }, 409);
    }

    console.error('A fiók nem jött létre:', fiokHiba.message);
    return valasz({ hiba: 'A fiókot nem sikerült létrehozni.' }, 500);
  }

  return valasz({ ok: true, cim: data.email }, 200);
});

/** Ha a meghívóra nem nyitható fiók, ez adja meg az emberi indokot. */
function allapota(m: Meghivo): string | null {
  if (m.revoked_at !== null) return 'Ezt a meghívót visszavonták.';
  if (m.accepted_at !== null) return 'Ezt a meghívót már elfogadták. Jelentkezz be.';
  if (new Date(m.expires_at).getTime() <= Date.now()) {
    return 'Ez a meghívó lejárt. Kérj újat a cég tulajdonosától.';
  }

  return null;
}

/**
 * „Ez a cím már foglalt" — három jelből, mert egyik sem garantált önmagában.
 *
 * A `code` a supabase-js újabb verzióiban jön, a `status` a HTTP-válaszé, a
 * szöveg pedig a végső tartalék. Ha mindhárom elvétené, a hívó egy általános
 * 500-at kap — az kevesebbet mond, de nem mond rosszat.
 */
function marLetezik(hiba: { code?: string; status?: number; message: string }): boolean {
  if (hiba.code === 'email_exists' || hiba.code === 'user_already_exists') return true;
  if (hiba.status === 422 && /regist|exist/i.test(hiba.message)) return true;

  return /already been registered|already exists/i.test(hiba.message);
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    // A hibákon is rajta a CORS — enélkül a böngésző csak néma hálózati hibát
    // látna, pont akkor, amikor meg kellene mondanunk, mi a baj.
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
