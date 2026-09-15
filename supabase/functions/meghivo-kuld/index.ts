import { createClient } from '@supabase/supabase-js';

import { szamlafolyo } from '../../../config/szamlafolyo.ts';
import { meghivoLevel } from '../../../shared/uzleti/meghivo.ts';
import { tokenAllitas } from '../../../shared/uzleti/token.ts';
import type { Szerep } from '../../../shared/uzleti/enumok.ts';

/**
 * A meghívó levél kiküldése.
 *
 * # Miért csak a levél, és miért nem a meghívó létrehozása is
 *
 * Mert a kettő külön hibázik. A meghívót a `meghivot_letrehoz()` SQL-függvény
 * hozza létre, a böngészőből hívva; ez a függvény **csak elküldi**. Így ha a
 * levélküldés elakad — lejárt API-kulcs, a Resend nem válaszol —, a meghívó
 * **akkor is létrejött**: ott a sor a Beállításokban, ott a link, és ott a
 * „Küldd újra" gomb. Egy kézbesítési hiba ne vigye el magát a meghívást.
 *
 * # Miért a hívó jogával olvas, és nem `service_role`-lal
 *
 * Mert nem kell több. A meghívó sorát a `company_invites` RLS-politikája
 * amúgy is csak a cég **tulajdonosának** adja oda; ha a hívó nem az, a
 * lekérdezés üresen jön vissza, és ez pontosan a helyes válasz. Egy
 * `service_role` kliens itt csak azt tenné lehetővé, hogy elrontsuk.
 *
 * ⚠️ `verify_jwt: true` — a `kiolvas` és a `selejtez` mintájára, és itt is
 * arra támaszkodunk, hogy a platform a tokent már hitelesítette: a levélbe
 * írt „ki hívott" a token `email` állításából jön.
 */

type Meghivo = {
  id: string;
  email: string;
  role: Szerep;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  companies: { name: string } | { name: string }[] | null;
};

/**
 * CORS.
 *
 * ⚠️ **Ez az első böngészőből hívott Edge Function ebben a projektben**, és az
 * első verzióból pont ez hiányzott. A `kiolvas` és a `selejtez` szerverről jön,
 * az `email-bekuldes`-t a szolgáltató hívja — egyiknek sem kell CORS, tehát
 * semmi nem kényszerítette ki.
 *
 * Élesben így nézett ki: a meghívó **létrejött**, a levél **soha nem indult el**,
 * és a Resend naplójában egyetlen kérés sem volt. A böngésző az elővizsgálatot
 * (`OPTIONS`) 405-tel és CORS-fejléc nélkül kapta vissza, tehát a POST-ot el sem
 * küldte. A mérés, ami ezt kimondta: a platform saját 401-es válasza **hozott**
 * `access-control-allow-origin` fejlécet, a mi 404-esünk **nem**.
 *
 * A böngészős próbám sem foghatta meg, mert mockolt hálózaton **nincs CORS**.
 * Ez a bekezdés ezért itt áll: aki legközelebb böngészőből hívott függvényt ír,
 * ne ugyanezt a délutánt töltse el vele.
 *
 * A `*` nem lazaság: a végpont védelme a JWT (`verify_jwt: true`), nem a
 * származási hely — a Supabase saját elutasításai is `*`-ot adnak. Egy szűkített
 * lista ráadásul a helyi fejlesztést (`localhost:5173`) csendben elrontaná, és
 * az ilyet szokás „ideiglenesen" kikapcsolni.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  const fejlec = keres.headers.get('Authorization');

  if (fejlec === null) {
    return valasz({ hiba: 'Bejelentkezés szükséges.' }, 401);
  }

  let meghivoId: string;

  try {
    const test = (await keres.json()) as { meghivo_id?: unknown };

    if (typeof test.meghivo_id !== 'string' || test.meghivo_id === '') {
      return valasz({ hiba: 'Hiányzik a meghívó azonosítója.' }, 400);
    }

    meghivoId = test.meghivo_id;
  } catch {
    return valasz({ hiba: 'Értelmezhetetlen kérés.' }, 400);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: fejlec } },
    },
  );

  const { data, error } = await db
    .from('company_invites')
    .select('id, email, role, token, expires_at, accepted_at, revoked_at, companies(name)')
    .eq('id', meghivoId)
    .maybeSingle<Meghivo>();

  if (error !== null) {
    console.error('A meghívó nem kérdezhető le:', error.message);
    return valasz({ hiba: 'A meghívó nem kérdezhető le.' }, 500);
  }

  // Az RLS miatt ez a két eset — „nincs ilyen" és „nem a tiéd" — ugyanaz a
  // válasz, és ez helyes: egy idegen meghívó létezését sem kell megerősíteni.
  if (data === null) {
    return valasz({ hiba: 'Nincs ilyen meghívó.' }, 404);
  }

  const allapot = allapota(data);

  if (allapot !== null) {
    return valasz({ hiba: allapot }, 409);
  }

  const level = meghivoLevel({
    cegNev: cegNeve(data.companies),
    szerep: data.role,
    // A hívó a tulajdonos: a tokenből olvassuk, mert az `auth.users` a
    // kliens jogával nem érhető el — és nem is kell hozzá.
    meghivo: tokenAllitas(fejlec, 'email') ?? 'A cég tulajdonosa',
    token: data.token,
    lejar: data.expires_at,
  });

  const kulcs = Deno.env.get('RESEND_API_KEY') ?? '';

  if (kulcs === '') {
    console.error('Nincs RESEND_API_KEY.');
    return valasz({ hiba: 'A levélküldés nincs beállítva.' }, 500);
  }

  const kuldes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kulcs}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: szamlafolyo.levelFelado,
      to: [data.email],
      subject: level.targy,
      html: level.html,
      text: level.szoveg,
    }),
  });

  if (!kuldes.ok) {
    const szoveg = await kuldes.text();

    console.error('A Resend elutasította a levelet:', kuldes.status, szoveg);

    // A hibát **kiadjuk a felületnek**, nem nyeljük le. A tulajdonos abban a
    // pillanatban látja, hogy a kollégája nem kapott levelet, amikor még tehet
    // róla — nem két nap múlva, amikor rákérdez.
    return valasz({ hiba: `A levél nem ment ki (${kuldes.status}).` }, 502);
  }

  // A kiküldés nyoma. **A levél már elment**, tehát ha ez a hívás elakad, attól
  // még nem hibás a művelet — csak a lista fog óvatosabbat mondani a
  // valóságnál. Ez a helyes irány: inkább mondjuk azt, hogy nem tudunk a
  // levélről, mint azt, hogy elküldtük, amikor nem.
  const { error: jelzesHiba } = await db.rpc('meghivo_kikuldve', { meghivo: meghivoId });

  if (jelzesHiba !== null) {
    console.warn('A kiküldést nem sikerült rögzíteni:', jelzesHiba.message);
  }

  return valasz({ ok: true, cim: data.email }, 200);
});

/** Ha nem küldhető, ez adja meg az emberi indokot. Küldhető meghívóra `null`. */
function allapota(m: Meghivo): string | null {
  if (m.revoked_at !== null) return 'Ezt a meghívót visszavonták.';
  if (m.accepted_at !== null) return 'Ezt a meghívót már elfogadták.';
  if (new Date(m.expires_at).getTime() <= Date.now()) {
    return 'Ez a meghívó lejárt. Küldj újat.';
  }

  return null;
}

/**
 * A beágyazott cégnév.
 *
 * A PostgREST a kapcsolt sort hol objektumként, hol egyelemű tömbként adja
 * vissza — a kettő között a séma felismerése dönt, nem a lekérdezés. Mindkettőt
 * elfogadjuk: egy levél ne maradjon el azért, mert a burkoló alakja megváltozott.
 */
function cegNeve(ceg: Meghivo['companies']): string {
  if (ceg === null) return 'a cég';
  if (Array.isArray(ceg)) return ceg[0]?.name ?? 'a cég';

  return ceg.name;
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    // A CORS-fejlécek **minden** válaszon rajta vannak, a hibákon is. Enélkül a
    // böngésző a hibaüzenetet sem látná — csak egy néma hálózati hibát —, és
    // pont akkor nem tudnánk megmondani, mi a baj, amikor baj van.
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
