import { createClient } from '@supabase/supabase-js';

import { szamlafolyo } from '../../../config/szamlafolyo.ts';
import { tokenAllitas } from '../../../shared/uzleti/token.ts';
import { stripe } from '../_kozos/stripe.ts';

/**
 * A Stripe számlázási portál (Customer Portal) munkamenetének indítása.
 *
 * # Mit csinál, és mit nem
 *
 * Egyetlen dolgot: a cég tulajdonosának ad egy egyszer használatos belépőt a
 * **saját** Stripe-ügyfeléhez. Onnantól a csomagváltás, a lemondás, a
 * kártyacsere és a számlák letöltése a Stripe oldalán történik.
 *
 * **Semmit nem ír a cég számlázási állapotába** — ugyanaz a szabály, mint a
 * `stripe-checkout`-nál. Ami a portálon történik, az a `stripe-webhook`-on jön
 * vissza (`customer.subscription.updated` / `deleted`), aláírás-ellenőrzés
 * után. A visszatérő böngésző itt sem bizonyíték semmire.
 *
 * # Miért nincs itt beállítás-azonosító
 *
 * Mert a portál működését a **Stripe-fiók** dashboardja írja le
 * (`billing_portal.configuration`), nem a repó. Ez szándékos: egy
 * `configuration` azonosító ugyanúgy fiókhoz kötött lenne, mint az
 * árazonosító, tehát sandboxban és élesben más — pontosan az a csapda, ami
 * miatt a csomagoknál `lookup_key`-re váltottunk. Beállítás nélkül a Stripe az
 * adott fiók **alapértelmezett** konfigurációját használja.
 *
 * ⚠️ Ennek ára van, és ki kell mondani: **a portál viselkedése a repóból nem
 * látszik.** Amit a felhasználó ott tehet, az a dashboardon dől el. Ezért a
 * Beállítások képernyője nem sorolja fel részletekbe menően, mi lesz ott —
 * csak azt, amiért oda küldjük.
 *
 * # Miért csak a tulajdonos
 *
 * Mert a portálon **pénzt lehet elkötelezni és lemondani**, és a számlázás a
 * tulajdonosé (`enumok.ts`). Ráadásul a portál a Stripe számlatörténetét is
 * megmutatja — egy szerkesztőnek ahhoz semmi köze.
 *
 * ⚠️ `verify_jwt: true`, és a függvény **támaszkodik is rá**: a hívó
 * azonosítója a token `sub` állításából jön, ellenőrzés nélkül. Kikapcsolva
 * bárki belépőt kérhetne más cég számlázási adataihoz — ez itt súlyosabb, mint
 * a checkoutnál, mert ott legfeljebb fizetni lehetett volna valaki helyett.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Tagsag = { company_id: string; role: string };

type Ceg = { id: string; stripe_customer_id: string | null };

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  const felhasznalo = tokenAllitas(keres.headers.get('Authorization'), 'sub');

  if (felhasznalo === null) {
    return valasz({ hiba: 'Bejelentkezés szükséges.' }, 401);
  }

  const kulcs = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

  if (kulcs === '') {
    console.error('Nincs STRIPE_SECRET_KEY.');

    return valasz({ hiba: 'A számlázási portál jelenleg nem elérhető.' }, 503);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // A cég a **hitelesített felhasználóból** következik, nem a kérés testéből —
  // a kérésnek nincs is teste. Ez a végpont szándékosan nem fogad paramétert:
  // amit nem kérünk el, azt nem is lehet meghamisítani.
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
    return valasz({ hiba: 'A számlázási portált a cég tulajdonosa nyithatja meg.' }, 403);
  }

  const { data: ceg } = await db
    .from('companies')
    .select('id, stripe_customer_id')
    .eq('id', tagsag.company_id)
    .maybeSingle<Ceg>();

  if (ceg === null) {
    return valasz({ hiba: 'A cég nem található.' }, 404);
  }

  // Ügyfél nélkül a portálnak nincs mit mutatnia. Ez nem hiba, hanem sorrend:
  // előbb az első fizetés, utána a portál — a felület ezért a csomagválasztót
  // adja ilyenkor, nem ezt a gombot.
  if (ceg.stripe_customer_id === null) {
    return valasz({ hiba: 'Ehhez a céghez még nem tartozik Stripe-ügyfél.' }, 409);
  }

  try {
    const mezok = new URLSearchParams();

    mezok.set('customer', ceg.stripe_customer_id);
    mezok.set('locale', 'hu');

    // ⚠️ A `return_url` **kötelező**, ha a fiók alapértelmezett
    // konfigurációján nincs `default_return_url` — sandboxban mérve nincs.
    // Nélküle a Stripe hibát ad, és a felhasználó egy angol hibaoldalon köt ki.
    //
    // A `portal=vissza` paraméter nem állapot, csak jelzés a képernyőnek, hogy
    // a látogató épp onnan jön — ugyanaz a szerep, mint a `fizetes=kesz`-nél.
    mezok.set('return_url', `${szamlafolyo.webcim}/beallitasok?portal=vissza`);

    const munkamenet = await stripe<{ url: string | null }>(
      kulcs,
      '/billing_portal/sessions',
      mezok,
    );

    if (munkamenet.url === null) {
      throw new Error('A Stripe nem adott portál-linket.');
    }

    return valasz({ url: munkamenet.url }, 200);
  } catch (hiba) {
    console.error('Stripe-hiba a portál indításakor:', hiba);

    // ⚠️ A leggyakoribb valódi ok ezen az ágon nem hálózati hiba, hanem az,
    // hogy a portál **nincs beállítva** abban a fiókban („No configuration
    // provided and your test mode default configuration has not been created").
    // Ezért mondja a hibaüzenet azt, ami a felhasználónak segít, és ezért megy
    // a Stripe saját szövege a naplóba.
    return valasz({ hiba: 'A számlázási portál megnyitása nem sikerült.' }, 502);
  }
});

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
