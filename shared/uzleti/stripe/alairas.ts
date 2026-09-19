/**
 * A Stripe webhook-aláírásának ellenőrzése.
 *
 * # Miért külön modul, és nem a `shared/uzleti/alairas.ts`
 *
 * Mert a két alak **nem ugyanaz**, és a különbség csendes: aki a Svix-modult
 * lemásolja ide, annál az aláírás soha nem fog egyezni, hibaüzenet nélkül.
 * Három ponton tér el:
 *
 * | | Svix (`alairas.ts`) | Stripe (ez a fájl) |
 * |---|---|---|
 * | aláírt szöveg | `<id>.<időbélyeg>.<test>` | `<időbélyeg>.<test>` — **nincs id** |
 * | a kivonat alakja | base64 | **hex** |
 * | a titok | `whsec_` levágva, a maradék base64-ből **dekódolva** | a **teljes** `whsec_…` sztring, nyers bájtként |
 *
 * A harmadik a legalattomosabb. A Svixnél a `whsec_` előtag után álló rész
 * base64-kódolt kulcs, tehát dekódolni kell; a Stripe-nál viszont maga a teljes
 * betűsor — az előtaggal együtt — a HMAC kulcsa. Aki „megtisztítja" a titkot,
 * az egy helyes implementációt ront el.
 *
 * # Amiben viszont megegyeznek
 *
 * Ez a végpont `verify_jwt: false` mögött ül — a Stripe nem tud Supabase-JWT-t
 * küldeni —, tehát itt az aláírás az **első és az utolsó** kapu. Ebből három
 * szigorúság következik, ugyanaz, amit a Svix-modul fejléce is kimond:
 *
 * - **a nyers kérés-testtel** dolgozunk, nem az értelmezett JSON-nal. Egy
 *   `JSON.parse` → `JSON.stringify` kör megváltoztatja a bájtokat, és attól az
 *   aláírás érvénytelen lesz;
 * - **időbélyeget is nézünk**, különben egy egyszer elfogott, érvényes kérés
 *   örökre újrajátszható;
 * - **állandó idejű** összehasonlítás, mert a korai kilépés a nem egyező
 *   karakter helyéből karakterenként szivárogtatja a helyes aláírást.
 *
 * Egy negyedik, ami csak a Stripe-nál van: a fejléc **több `v1=` aláírást** is
 * tartalmazhat. Ez nem hiba, hanem a titokcsere alakja — a Stripe a forgatás
 * ablakában mindkét titokkal aláír. Ha bármelyik egyezik, a kérés érvényes.
 *
 * A modul tiszta: nulla függőség, a beépített WebCrypto hajtja.
 */

/**
 * Ennyi másodperc eltérést tűrünk a Stripe küldési ideje és a mi óránk között.
 * A Stripe saját könyvtárainak alapértéke is ez.
 */
export const TURES_MP = 300;

export type StripeAlairasKeres = {
  /** A kérés teste **nyersen**, ahogy megérkezett. */
  test: string;
  /** A `Stripe-Signature` fejléc teljes tartalma. */
  fejlec: string;
  /** A végponthoz tartozó aláíró titok, teljes egészében (`whsec_…`). */
  titok: string;
  /** Tesztelhetőség: az „éppen most" beadható. Ezredmásodperc. */
  most?: number;
  turesMp?: number;
};

export type StripeAlairasEredmeny =
  | { ok: true }
  /**
   * A `miert` **naplóba** való, nem válaszba: egy hívónak semmi dolga azzal,
   * hogy az aláírás vagy az időbélyeg bukott-e el. A kettő megkülönböztetése
   * épp elég ahhoz, hogy valaki próbálgatásból tanuljon.
   */
  | { ok: false; miert: string };

/**
 * A `Stripe-Signature` fejléc szétszedése.
 *
 * Alakja vesszővel tagolt kulcs-érték lista: `t=1492774577,v1=5257a8…,v1=…`.
 * A `t` az aláírás időpontja másodpercben, a `v1` a hex kivonat. Az ismeretlen
 * sémákat (`v0`, ami a Stripe-nál csak a Connect end-to-end titkaié) eldobjuk —
 * nem hiba, csak nem a mi dolgunk.
 */
export function fejlecetBont(fejlec: string): { t: string | null; v1: string[] } {
  let t: string | null = null;
  const v1: string[] = [];

  for (const darab of fejlec.split(',')) {
    const hatar = darab.indexOf('=');

    if (hatar === -1) {
      continue;
    }

    const kulcs = darab.slice(0, hatar).trim();
    const ertek = darab.slice(hatar + 1).trim();

    if (kulcs === 't') {
      t = ertek;
    } else if (kulcs === 'v1') {
      v1.push(ertek);
    }
  }

  return { t, v1 };
}

export async function stripeAlairastEllenoriz(
  keres: StripeAlairasKeres,
): Promise<StripeAlairasEredmeny> {
  const { test, fejlec, titok } = keres;
  const most = keres.most ?? Date.now();
  const turesMp = keres.turesMp ?? TURES_MP;

  if (fejlec === '' || titok === '') {
    return { ok: false, miert: 'Hiányzó aláírás vagy titok.' };
  }

  const { t, v1 } = fejlecetBont(fejlec);

  if (t === null || v1.length === 0) {
    return { ok: false, miert: 'A Stripe-Signature fejléc alakja ismeretlen.' };
  }

  const masodperc = Number(t);

  if (!Number.isFinite(masodperc)) {
    return { ok: false, miert: 'Az időbélyeg nem szám.' };
  }

  // Mindkét irányban tűrünk: a jövőbeli időbélyeg is gyanús, de egy pár
  // másodperces óraeltérés a két gép között normális.
  const elteresMp = Math.abs(most / 1000 - masodperc);

  if (elteresMp > turesMp) {
    return { ok: false, miert: `Az időbélyeg ${Math.round(elteresMp)} másodperccel tér el.` };
  }

  // ⚠️ A titok **teljes egészében** a kulcs, a `whsec_` előtaggal együtt.
  // Lásd a fájl fejlécét: itt nincs levágás és nincs base64-dekódolás.
  const kulcs = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(titok),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sajat = hexbe(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', kulcs, new TextEncoder().encode(`${t}.${test}`)),
    ),
  );

  // Több aláírás is jöhet (titokforgatás) — bármelyik egyezése elég. Nem
  // lépünk ki korán: minden jelöltet végigmérünk, hogy a futásidő ne árulja
  // el, hányadiknál jártunk.
  let talalt = false;

  for (const jelolt of v1) {
    if (egyezik(sajat, jelolt)) {
      talalt = true;
    }
  }

  return talalt ? { ok: true } : { ok: false, miert: 'Az aláírás nem egyezik.' };
}

/** Bájtok hexadecimális alakja, kisbetűkkel — ez a Stripe kivonatának alakja. */
function hexbe(bajtok: Uint8Array): string {
  let ki = '';

  for (const b of bajtok) {
    ki += b.toString(16).padStart(2, '0');
  }

  return ki;
}

/**
 * Állandó idejű sztring-összehasonlítás.
 *
 * A hossz különbsége önmagában kiderül (és nem is titok: a hex kivonat hossza
 * kötött), a tartalomból viszont semmi — minden karaktert végigmérünk.
 */
function egyezik(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let elteres = 0;

  for (let i = 0; i < a.length; i += 1) {
    elteres |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return elteres === 0;
}
