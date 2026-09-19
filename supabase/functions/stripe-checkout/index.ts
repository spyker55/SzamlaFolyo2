import { createClient } from '@supabase/supabase-js';

import { szamlafolyo, type CsomagKulcs } from '../../../config/szamlafolyo.ts';
import { tokenAllitas } from '../../../shared/uzleti/token.ts';

/**
 * A Stripe Checkout munkamenet indítása.
 *
 * # Mit csinál, és mit nem
 *
 * Egyetlen dolgot: a cég tulajdonosának ad egy fizetési linket a választott
 * csomagra. **Semmit nem ír a cég számlázási állapotába** — azt kizárólag a
 * `stripe-webhook` teheti, aláírás-ellenőrzés után. Ez szándékos: a böngészőből
 * visszatérő felhasználó nem bizonyíték arra, hogy a fizetés sikerült, a
 * `success_url` pedig bárki által meghívható cím.
 *
 * Egy kivétel van: a Stripe **ügyfélazonosítót** lefoglaljuk a cégnek, még a
 * fizetés előtt. Enélkül minden indítás új ügyfelet hozna létre ugyanannak a
 * cégnek, és a második fizetés már egy másik ügyfélhez tartozna — a Stripe
 * oldalán két „cég", egy valódi helyett.
 *
 * # Miért csak a tulajdonos
 *
 * Mert a számlázás az övé (`enumok.ts`: „Számlázás, tagok kezelése, végleges
 * törlés. Csak a tulajdonos."). Egy szerkesztő ne tudjon havi díjat
 * elkötelezni a cég nevében.
 *
 * ⚠️ `verify_jwt: true`, és a függvény **támaszkodik is rá**: a hívó
 * azonosítóját a token `sub` állításából olvassuk, ellenőrzés nélkül — azt
 * csak azért tehetjük meg, mert a platform a tokent addigra már hitelesítette.
 * Ugyanaz az érvelés, mint a `token.ts`-ben és a `meghivo-kuld`-ban.
 *
 * # Miért `lookup_key`, és miért futásidőben
 *
 * Az árazonosító fiókhoz kötött: a sandbox és az éles fiók ugyanazt a csomagot
 * más azonosítón tartja. A `lookup_key` viszont mindkettőben ugyanaz, tehát a
 * repóban nem kell tudni, melyik fiókban futunk — azt egyedül a
 * `STRIPE_SECRET_KEY` titok dönti el. Az árat ezért **a Stripe-tól kérdezzük
 * meg**, nem a configból olvassuk.
 *
 * Ha a kulcs nincs beállítva abban a fiókban, a függvény **hangosan** bukik
 * („Ez a csomag nincs beállítva a Stripe-fiókban"), nem csendben rossz árat
 * számláz. Ez a helyes irány: egy hiányzó címke hibaüzenet, nem meglepetés a
 * bankszámlán.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Azok a Stripe-státuszok, amelyek mellett **már fut** előfizetés. */
const FUTO = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

type Tagsag = { company_id: string; role: string };

type Ceg = {
  id: string;
  name: string | null;
  stripe_customer_id: string | null;
  stripe_status: string | null;
};

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  const fejlec = keres.headers.get('Authorization');
  const felhasznalo = tokenAllitas(fejlec, 'sub');

  if (felhasznalo === null) {
    return valasz({ hiba: 'Bejelentkezés szükséges.' }, 401);
  }

  const kulcs = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

  if (kulcs === '') {
    console.error('Nincs STRIPE_SECRET_KEY.');

    return valasz({ hiba: 'A fizetés jelenleg nem elérhető.' }, 503);
  }

  let csomagKulcs: string;

  try {
    const test = (await keres.json()) as { csomag?: unknown };
    csomagKulcs = typeof test.csomag === 'string' ? test.csomag : '';
  } catch {
    return valasz({ hiba: 'Értelmezhetetlen kérés.' }, 400);
  }

  if (!(csomagKulcs in szamlafolyo.csomagok)) {
    return valasz({ hiba: 'Ismeretlen csomag.' }, 400);
  }

  const csomag = szamlafolyo.csomagok[csomagKulcs as CsomagKulcs];

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // A tagságot a `service_role` olvassa, de a **felhasználó azonosítója a
  // hitelesített tokenből** jön — nem a kérés testéből. Ezért nem lehet más
  // cégére előfizetést indítani.
  const { data: tagsag } = await db
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', felhasznalo)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<Tagsag>();

  if (tagsag === null) {
    return valasz({ hiba: 'Ehhez a fiókhoz nem tartozik cég.' }, 403);
  }

  if (tagsag.role !== 'tulajdonos') {
    return valasz({ hiba: 'Az előfizetést a cég tulajdonosa indíthatja.' }, 403);
  }

  const { data: ceg } = await db
    .from('companies')
    .select('id, name, stripe_customer_id, stripe_status')
    .eq('id', tagsag.company_id)
    .maybeSingle<Ceg>();

  if (ceg === null) {
    return valasz({ hiba: 'A cég nem található.' }, 404);
  }

  // ⚠️ Enélkül egy második checkout **második** előfizetést hozna létre
  // ugyanannak a cégnek — két havi díj, és a `keret.ts` csak az egyiket látná.
  // A csomagváltás nem itt történik, hanem a számlázási portálon.
  if (ceg.stripe_status !== null && FUTO.includes(ceg.stripe_status)) {
    return valasz(
      { hiba: 'Ennek a cégnek már van előfizetése. A csomagot a számlázási portálon válthatod.' },
      409,
    );
  }

  try {
    const ar = await arKulcsbol(kulcs, csomag.lookupKulcs);

    if (ar === null) {
      console.error(`A ${csomag.lookupKulcs} lookup_key nincs a Stripe-fiókban.`);

      return valasz({ hiba: 'Ez a csomag nincs beállítva a Stripe-fiókban.' }, 503);
    }

    const ugyfel = await ugyfelet(db, kulcs, ceg, tokenAllitas(fejlec, 'email'));
    const link = await munkamenetet(kulcs, ceg.id, ugyfel, ar);

    return valasz({ url: link }, 200);
  } catch (hiba) {
    console.error('Stripe-hiba a checkout indításakor:', hiba);

    return valasz({ hiba: 'A fizetés indítása nem sikerült.' }, 502);
  }
});

/**
 * Az árazonosító a `lookup_key`-ből.
 *
 * Csak **aktív** árat fogadunk el: egy archivált ár azonosítója még feloldódna,
 * de a checkout később elutasítaná — jobb itt megállni, érthető üzenettel.
 */
async function arKulcsbol(kulcs: string, lookupKulcs: string): Promise<string | null> {
  const valaszok = await stripe<{ data: { id: string }[] }>(
    kulcs,
    `/prices?active=true&lookup_keys[]=${encodeURIComponent(lookupKulcs)}`,
  );

  return valaszok.data[0]?.id ?? null;
}

/**
 * A cég Stripe-ügyfele: a meglévő, vagy egy most létrehozott.
 *
 * A lefoglalás az SQL-ben dől el (`stripe_ugyfel_rogzit`), nem itt: az a
 * függvény csak akkor ír, ha az oszlop még üres, és a **ténylegesen érvényes**
 * azonosítót adja vissza. Két egyszerre indított checkout közül így pontosan
 * egy nyer — ugyanaz az alak, mint a `kiolvas` claimje.
 *
 * ⚠️ Versenyvesztéskor az imént létrehozott Stripe-ügyfél gazdátlanul marad.
 * Ez elfogadható ár: nem kerül pénzbe, nincs rajta előfizetés, és a Stripe
 * felületén látszik. A másik irány — előbb foglalni, aztán létrehozni —
 * rosszabb, mert egy meghiúsult létrehozás után a cég egy **nem létező**
 * ügyfélazonosítóra mutatna, és onnan nincs magától visszaút.
 */
async function ugyfelet(
  db: ReturnType<typeof createClient>,
  kulcs: string,
  ceg: Ceg,
  email: string | null,
): Promise<string> {
  if (ceg.stripe_customer_id !== null) {
    return ceg.stripe_customer_id;
  }

  const mezok = new URLSearchParams();

  if (email !== null) {
    mezok.set('email', email);
  }

  if (ceg.name !== null) {
    mezok.set('name', ceg.name);
  }

  // A metadata a Stripe felületén is megmutatja, melyik céghez tartozik az
  // ügyfél — egy hibakeresés ezzel kezdődik.
  mezok.set('metadata[company_id]', ceg.id);

  const uj = await stripe<{ id: string }>(kulcs, '/customers', mezok);

  const { data } = await db.rpc('stripe_ugyfel_rogzit', { ceg: ceg.id, ugyfel: uj.id });

  return typeof data === 'string' && data !== '' ? data : uj.id;
}

/** A fizetési munkamenet, és a link, amire a böngészőt küldjük. */
async function munkamenetet(
  kulcs: string,
  cegId: string,
  ugyfel: string,
  ar: string,
): Promise<string> {
  const mezok = new URLSearchParams();

  mezok.set('mode', 'subscription');
  mezok.set('customer', ugyfel);
  mezok.set('line_items[0][price]', ar);
  mezok.set('line_items[0][quantity]', '1');
  mezok.set('locale', 'hu');

  // A cég azonosítója **két helyre** kerül, és ez nem felesleges ismétlés: a
  // munkamenet metadata-ját a `checkout.session.completed`, az előfizetését
  // pedig minden későbbi `customer.subscription.*` esemény hordozza. Ha csak az
  // elsőt írnánk, egy fél év múlvai csomagváltás eseménye nem tudná, melyik
  // cégről szól — és a cég csak az ügyfélazonosítóról lenne megtalálható.
  mezok.set('metadata[company_id]', cegId);
  mezok.set('subscription_data[metadata][company_id]', cegId);

  mezok.set('success_url', `${szamlafolyo.webcim}/beallitasok?fizetes=kesz`);
  mezok.set('cancel_url', `${szamlafolyo.webcim}/beallitasok?fizetes=megsem`);

  const munkamenet = await stripe<{ url: string | null }>(kulcs, '/checkout/sessions', mezok);

  if (munkamenet.url === null) {
    throw new Error('A Stripe nem adott fizetési linket.');
  }

  return munkamenet.url;
}

/**
 * Egy Stripe-hívás.
 *
 * Nincs SDK — ugyanaz a döntés, mint az `openrouter.ts`-nél: a Stripe REST
 * API-ja űrlapkódolt kéréseket vár, és ehhez egy `fetch` elég. Egy SDK
 * cserébe verziófüggőséget és egy nagyobb csomagot hozna az Edge Runtime alá.
 */
async function stripe<T>(kulcs: string, ut: string, mezok?: URLSearchParams): Promise<T> {
  const valasz = await fetch(`${STRIPE_API}${ut}`, {
    method: mezok === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${kulcs}`,
      ...(mezok === undefined
        ? {}
        : { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }),
    },
    body: mezok?.toString(),
  });

  if (!valasz.ok) {
    // A Stripe hibaüzenete **naplóba** való, nem a böngészőbe: tartalmazhat
    // azonosítókat és fiókra vonatkozó részleteket.
    throw new Error(`Stripe ${valasz.status}: ${(await valasz.text()).slice(0, 500)}`);
  }

  return (await valasz.json()) as T;
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    // A CORS-fejlécek minden válaszon rajta vannak, a hibákon is — különben a
    // böngésző a hibaüzenetet sem látná, csak egy néma hálózati hibát.
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
