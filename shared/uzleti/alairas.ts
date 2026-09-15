/**
 * Bejövő webhook aláírásának ellenőrzése (Svix/Standard Webhooks alak).
 *
 * # Miért ez az egyetlen kapu
 *
 * A többi Edge Functionünk `verify_jwt: true` mögött ül: a platform
 * hitelesíti a tokent, mielőtt a kód egyáltalán elindul. Egy webhook-végpontot
 * viszont **nem** lehet így védeni — a levélszolgáltató nem tud Supabase-JWT-t
 * küldeni. Ezért ott a `verify_jwt` kikapcsolva áll, és a hitelesítés teljes
 * egészében **ez a függvény**.
 *
 * Vagyis ami a `token.ts`-ben egy második réteg volt, az itt az első és az
 * utolsó. Ennek megfelelően szigorú:
 *
 * - **a nyers kérés-testtel** dolgozik, nem az értelmezett JSON-nal. Egy
 *   `JSON.parse` → `JSON.stringify` kör megváltoztatja a bájtokat (kulcsok
 *   sorrendje, számok alakja, unicode-escape-ek), és attól az aláírás
 *   érvénytelenné válik — vagy ami rosszabb, egy laza összehasonlítás mellett
 *   érvényesnek látszana valami, ami nem az;
 * - **időbélyeget is néz**: aláírás önmagában nem elég, mert egy egyszer
 *   elfogott, érvényes kérés különben örökre újrajátszható lenne;
 * - **állandó idejű** összehasonlítást használ. A korai kilépéses
 *   sztring-egyenlőség a nem egyező karakter helyéből mérhetően kiszivárogtatja
 *   a helyes aláírást, karakterenként.
 *
 * A modul tiszta: nulla függőség, a böngésző és a Deno beépített kriptója
 * hajtja. Ezért tesztelhető anélkül, hogy bármit telepítenénk.
 */

/** Ennyi másodperc eltérést tűrünk a küldés és a fogadás ideje között. */
export const TURES_MP = 300;

export type AlairasKeres = {
  /** A kérés teste **nyersen**, ahogy megérkezett. */
  test: string;
  /** `webhook-id` / `svix-id` */
  id: string;
  /** `webhook-timestamp` / `svix-timestamp` — másodperc alapú unix idő. */
  idobelyeg: string;
  /** `webhook-signature` / `svix-signature` — szóközzel tagolt `v1,<base64>` lista. */
  alairas: string;
  /** A végponthoz tartozó titok, `whsec_` előtaggal vagy anélkül. */
  titok: string;
  /** Tesztelhetőség: az „éppen most" beadható. Ezredmásodperc. */
  most?: number;
  turesMp?: number;
};

export type AlairasEredmeny =
  | { ok: true }
  /**
   * A `miert` **naplóba** való, nem válaszba: egy webhook-hívónak semmi dolga
   * azzal, hogy az aláírás vagy az időbélyeg bukott-e el. A kettő
   * megkülönböztetése épp elég ahhoz, hogy valaki próbálgatásból tanuljon.
   */
  | { ok: false; miert: string };

export async function alairastEllenoriz(keres: AlairasKeres): Promise<AlairasEredmeny> {
  const { test, id, idobelyeg, alairas, titok } = keres;

  if (id === '' || idobelyeg === '' || alairas === '' || titok === '') {
    return { ok: false, miert: 'Hiányzó aláírásfejléc vagy titok.' };
  }

  const masodperc = Number(idobelyeg);

  if (!Number.isFinite(masodperc)) {
    return { ok: false, miert: 'Az időbélyeg nem szám.' };
  }

  const most = keres.most ?? Date.now();
  const tures = (keres.turesMp ?? TURES_MP) * 1000;

  // Mindkét irányban tűrünk: az óracsúszás nem csak késést okozhat.
  if (Math.abs(most - masodperc * 1000) > tures) {
    return { ok: false, miert: 'Az időbélyeg a tűrésen kívül van.' };
  }

  let kulcs: Uint8Array;

  try {
    kulcs = titkotOlvas(titok);
  } catch {
    return { ok: false, miert: 'A titok nem értelmezhető.' };
  }

  const sajat = await hmac(kulcs, `${id}.${idobelyeg}.${test}`);

  // A fejléc több aláírást is hordozhat (kulcsforgatás alatt mindkettőt), és
  // elég, ha **bármelyik** egyezik. Verziójelölés nélküli elemet nem fogadunk
  // el: a `v1` ma az egyetlen séma, és egy jövőbeli `v2`-t nem szabad
  // v1-ként ellenőrizni.
  const jeloltek = alairas
    .split(' ')
    .filter((r) => r.startsWith('v1,'))
    .map((r) => r.slice(3));

  if (jeloltek.length === 0) {
    return { ok: false, miert: 'Nincs v1 aláírás a fejlécben.' };
  }

  // ⚠️ Szándékosan **nem** lépünk ki az első egyezésnél: a `some()` korai
  // kilépése maga is időkülönbség. Az összeset végigmérjük.
  const talalat = jeloltek.reduce((eddig, jelolt) => egyezik(jelolt, sajat) || eddig, false);

  return talalat ? { ok: true } : { ok: false, miert: 'Az aláírás nem egyezik.' };
}

/**
 * A `whsec_` előtag lekerül, a maradék base64.
 *
 * Ez a lépés könnyen kimarad, és akkor a HMAC a base64 **szövegével** számol a
 * bájtjai helyett — az aláírás sosem egyezik, a hibaüzenet viszont ugyanaz,
 * mint egy hamis kérésnél. Ezért van külön függvényben, saját teszttel.
 */
export function titkotOlvas(titok: string): Uint8Array {
  const nyers = titok.startsWith('whsec_') ? titok.slice(6) : titok;
  const binaris = atob(nyers);

  return Uint8Array.from(binaris, (c) => c.charCodeAt(0));
}

async function hmac(kulcs: Uint8Array, uzenet: string): Promise<string> {
  const cryptoKulcs = await crypto.subtle.importKey(
    'raw',
    kulcs as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const alairas = await crypto.subtle.sign('HMAC', cryptoKulcs, new TextEncoder().encode(uzenet));

  return btoa(String.fromCharCode(...new Uint8Array(alairas)));
}

/**
 * Állandó idejű összehasonlítás.
 *
 * A hossz eltérése kiderül — az nem titok, a base64-SHA256 hossza kötött.
 * Ami számít: azonos hossz mellett **minden** karaktert megnézünk, akkor is,
 * ha az első már nem egyezik.
 */
function egyezik(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let kulonbseg = 0;

  for (let i = 0; i < a.length; i++) {
    kulonbseg |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return kulonbseg === 0;
}
