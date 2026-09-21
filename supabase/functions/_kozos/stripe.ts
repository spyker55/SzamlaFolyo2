/**
 * A Stripe REST API hívása — egy helyen, négy függvénynek.
 *
 * # Miért van ez a mappa
 *
 * A segédfüggvény három példányban élt (`stripe-checkout`, `stripe-portal`,
 * `stripe-webhook`), és ez **tudatos** volt: ezek külön telepített Deno-
 * függvények, a `shared/uzleti` pedig szándékosan nulla függőségű, tiszta kód
 * — egy `fetch`-elő segéd nem való bele. A három példány kommentje ki is
 * mondta a küszöböt: *ha valaha négy lesz belőle, érdemes egy
 * `supabase/functions/_kozos/` mappát nyitni.*
 *
 * A `fiok-torles` lett a negyedik függvény, ami a Stripe-pal beszél. A szabály
 * elsült, tehát itt a mappa.
 *
 * ⚠️ **Az aláhúzás nem díszítés.** A Supabase CLI az `_`-szal kezdődő mappákat
 * nem tekinti önálló függvénynek, tehát ez nem lesz telepíthető végpont —
 * csak olyan kód, amit a többi függvény importál. Egy `kozos/` nevű mappából
 * a CLI egy publikus végpontot csinálna.
 *
 * # Két réteg, mert két hibaszerződés van
 *
 * A három Stripe-függvény számára egy hiba **kivétel**: nincs mit tenni vele,
 * a kérés elbukott. A `fiok-torles` viszont nem dobhat — ott a lemondás
 * **első** lépése a törlési láncnak, és egy 404 (a Stripe nem ismeri az
 * előfizetést) nem hiba, hanem „nincs mit lemondani". Ha ott kivétel
 * keletkezne, a fiók törlése egy már megszűnt előfizetésen akadna el.
 *
 * Ezért a `stripeKeres()` a nyers `Response`-t adja vissza — a hívó nézi meg a
 * státuszt —, a `stripe()` pedig erre épül, és dob. A közös rész az, ami
 * ténylegesen duplikálódott: az API címe, a hitelesítő fejléc és az
 * űrlapkódolás.
 *
 * # Nincs SDK
 *
 * Ugyanaz a döntés, mint az `openrouter.ts`-nél: a Stripe REST API-ja
 * űrlapkódolt kéréseket vár, és ehhez egy `fetch` elég. Egy SDK cserébe
 * verziófüggőséget és egy nagyobb csomagot hozna az Edge Runtime alá.
 */

export const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * Egy Stripe-hívás, nyers válasszal.
 *
 * Nem dob státuszhiba miatt — a hívó dolga eldönteni, mit jelent egy 404. A
 * hálózati hiba természetesen így is kivétel.
 */
export async function stripeKeres(
  kulcs: string,
  ut: string,
  opciok: {
    mod?: 'GET' | 'POST' | 'DELETE';
    mezok?: URLSearchParams;
    fejlec?: Record<string, string>;
  } = {},
): Promise<Response> {
  const { mezok, fejlec = {} } = opciok;
  const mod = opciok.mod ?? (mezok === undefined ? 'GET' : 'POST');

  return await fetch(`${STRIPE_API}${ut}`, {
    method: mod,
    headers: {
      Authorization: `Bearer ${kulcs}`,
      ...(mezok === undefined
        ? {}
        : { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }),
      ...fejlec,
    },
    // A `body` **kimarad**, ha nincs — nem `undefined` értékkel szerepel. A
    // `body: mezok?.toString()` alak futásidőben ugyanaz, típusra viszont nem
    // az (`exactOptionalPropertyTypes`).
    ...(mezok === undefined ? {} : { body: mezok.toString() }),
  });
}

/**
 * Egy Stripe-hívás, ami hibára dob és JSON-t ad.
 *
 * ⚠️ A Stripe hibaüzenete **naplóba** való, nem a böngészőbe: tartalmazhat
 * azonosítókat és a fiókra vonatkozó részleteket. Ezért a hívók a kivétel
 * szövegét sosem adják tovább a válaszban.
 */
export async function stripe<T>(
  kulcs: string,
  ut: string,
  mezok?: URLSearchParams,
  extraFejlec: Record<string, string> = {},
): Promise<T> {
  const felelet = await stripeKeres(kulcs, ut, {
    ...(mezok === undefined ? {} : { mezok }),
    fejlec: extraFejlec,
  });

  if (!felelet.ok) {
    throw new Error(`Stripe ${felelet.status}: ${(await felelet.text()).slice(0, 500)}`);
  }

  return (await felelet.json()) as T;
}
