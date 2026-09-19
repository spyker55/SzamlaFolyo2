import { szamlafolyo, type CsomagKulcs } from '../../config/szamlafolyo.ts';

/**
 * Mennyi fér még a keretbe.
 *
 * # Miért itt, és miért tiszta függvényként
 *
 * Ugyanezt a kérdést három hely teszi fel: a Beérkező (feltölthet-e még), a
 * Beállítások (mennyi van hátra) és a `kiolvas` (dolgozhat-e). Ha három helyen
 * válaszolnánk meg, előbb-utóbb három különböző választ adnának — és a kettő
 * közül a megengedőbb mindig AI-költséget jelent.
 *
 * # Négy szabály, amit ez a modul kimond
 *
 * 1. **A próbaidőn a nap és a darabszám VAGY kapcsolatban van**: amelyik előbb
 *    elfogy, az zárja le. Nem „és" — különben egy könyvelőiroda, ami az első
 *    napon feltölti az ötven bizonylatot, még tizenhárom napig azt hinné, hogy
 *    van kerete.
 *
 * 2. **Nincs számláló, csak lekérdezés.** Ez a modul a felhasznált darabszámot
 *    *kapja*, nem tárolja: a hívó az adatbázisból kérdezi le, a
 *    `document_extractions`-ből. Egy számláló elcsúszhat, és amit a felhasználó
 *    el tud tüntetni (a `documents` sort), abból nem lehet keretet számolni.
 *
 * 3. **Ismeretlen csomagkulcs a legkisebb csomag keretét kapja**, nem
 *    korlátlant — és a hívó naplózza. A régi rendszerben ez `PHP_INT_MAX` volt,
 *    épp az AI-költséges oldalon: egy elgépelt vagy egy Stripe-ban átnevezett
 *    ár csendben végtelen keretet adott. A hibás irány itt a szigorúbb.
 *
 * 4. **A keret megállít, a túlhasználat külön engedély.** Alapból senki nem kap
 *    váratlan számlát attól, hogy egy hónapban többet dolgozott.
 *
 * ⚠️ A próbaidő hossza **két helyen** van leírva: itt a `trial_ends_at`
 * oszlopból olvassuk (tehát a tárolt dátum dönt), a cégalapítás viszont
 * `interval '14 days'`-t ír be az SQL-ben, miközben a `config.proba.napok`
 * ugyanezt a 14-et mondja. Ma egyeznek. Ha valaha elválnak, a tárolt dátum
 * nyer — ez a modul szándékosan nem számol újra 14 napot.
 */

/** Amit a keretszámoláshoz tudni kell a cégről. A `companies` sor részhalmaza. */
export type CegAllapot = {
  trial_ends_at: string | null;
  stripe_status: string | null;
  /**
   * A csomagot **ebből** keressük vissza, nem az árazonosítóból: az
   * árazonosító fiókonként más (sandbox kontra éles), a `lookup_key` nem.
   */
  stripe_lookup_key: string | null;
  /** Csak hibakereséshez és naplóhoz — a döntést a `stripe_lookup_key` hozza. */
  stripe_price_id: string | null;
  current_period_end: string | null;
  overage_enabled: boolean;
};

export type Allapot = 'proba' | 'elofizetes' | 'lejart';

export type Keret = {
  allapot: Allapot;
  /** A csomag neve („Start"), vagy `null` próbaidőn. */
  csomag: string | null;
  csomagKulcs: CsomagKulcs | null;
  /** Hány bizonylat fér az időszakba. */
  keret: number;
  felhasznalt: number;
  /** Soha nem negatív — a túlhasználat nem „mínusz maradék", hanem külön jelzés. */
  maradek: number;
  /** Meddig szól ez a keret. Próbaidőn a próba vége, előfizetésen a ciklus vége. */
  idoszakVege: string | null;
  /** Hány nap van hátra a próbából. `null`, ha nem próbaidőn vagyunk. */
  hatralevoNap: number | null;
  /** Feltölthet-e még. */
  mehet: boolean;
  /** Ha nem mehet: a felületre kiírható mondat. */
  indok: string | null;
  /** A keret fölött is mehet — a cég bekapcsolta a túlhasználatot. */
  tulhasznalatban: boolean;
  /**
   * Ismeretlen csomagkulcsot láttunk, és a legkisebb csomag keretét adtuk.
   * **A hívó naplózza** — ez csendben nem maradhat.
   */
  ismeretlenCsomag: boolean;
};

/**
 * Fut-e az előfizetés.
 *
 * A `past_due` szándékosan **átmegy**: egy lejárt bankkártya nem ok arra, hogy
 * valakit a hónap közepén elvágjunk a saját bizonylataitól. A Stripe úgyis
 * újrapróbálja, és a ciklus végén a státusz magától `unpaid`-re vagy
 * `canceled`-re vált — akkor viszont már nem megy át.
 */
function elofizetesFut(status: string | null): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

/** A Stripe `lookup_key`-éhez tartozó csomag, vagy `null`, ha nem ismerjük. */
function csomagKulcsbol(lookupKulcs: string | null): CsomagKulcs | null {
  if (lookupKulcs === null || lookupKulcs === '') {
    return null;
  }

  for (const kulcs of Object.keys(szamlafolyo.csomagok) as CsomagKulcs[]) {
    if (szamlafolyo.csomagok[kulcs].lookupKulcs === lookupKulcs) {
      return kulcs;
    }
  }

  return null;
}

/** A legkisebb csomag — ez a tartalék ismeretlen árazonosítóra. */
function legkisebb(): CsomagKulcs {
  return (Object.keys(szamlafolyo.csomagok) as CsomagKulcs[]).reduce((a, b) =>
    szamlafolyo.csomagok[a].dokumentumok <= szamlafolyo.csomagok[b].dokumentumok ? a : b,
  );
}

/** Napok száma mostantól egy időpontig, fölfelé kerekítve. Múltbeli időpontra 0. */
function napokMeg(vege: string | null, most: Date): number {
  if (vege === null) {
    return 0;
  }

  const veg = new Date(vege).getTime();

  if (Number.isNaN(veg)) {
    return 0;
  }

  const nap = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.ceil((veg - most.getTime()) / nap));
}

/** Lejárt-e már ez az időpont. A `null` **nem** lejárt: nincs mit lejárni. */
function lejart(mikor: string | null, most: Date): boolean {
  if (mikor === null) {
    return false;
  }

  const t = new Date(mikor).getTime();

  return !Number.isNaN(t) && t <= most.getTime();
}

/**
 * A keret állapota.
 *
 * A `felhasznalt` a hívótól jön — lásd a 2. szabályt a fájl tetején.
 */
export function keretAllapot(
  ceg: CegAllapot,
  felhasznalt: number,
  most: Date = new Date(),
): Keret {
  const hasznalt = Math.max(0, Math.trunc(felhasznalt) || 0);

  if (elofizetesFut(ceg.stripe_status)) {
    return elofizetesre(ceg, hasznalt);
  }

  return probara(ceg, hasznalt, most);
}

function elofizetesre(ceg: CegAllapot, felhasznalt: number): Keret {
  const talalt = csomagKulcsbol(ceg.stripe_lookup_key);
  const ismeretlen = talalt === null;
  const kulcs = talalt ?? legkisebb();
  const csomag = szamlafolyo.csomagok[kulcs];

  const maradek = Math.max(0, csomag.dokumentumok - felhasznalt);
  const elfogyott = felhasznalt >= csomag.dokumentumok;
  const tulhasznalat = ceg.overage_enabled;

  return {
    allapot: 'elofizetes',
    csomag: csomag.nev,
    csomagKulcs: kulcs,
    keret: csomag.dokumentumok,
    felhasznalt,
    maradek,
    idoszakVege: ceg.current_period_end,
    hatralevoNap: null,
    mehet: !elfogyott || tulhasznalat,
    indok:
      elfogyott && !tulhasznalat
        ? `Elfogyott a havi kereted (${csomag.dokumentumok} bizonylat). Válts nagyobb csomagra, vagy engedélyezd a túlhasználatot a Beállításokban.`
        : null,
    tulhasznalatban: elfogyott && tulhasznalat,
    ismeretlenCsomag: ismeretlen,
  };
}

function probara(ceg: CegAllapot, felhasznalt: number, most: Date): Keret {
  const keret = szamlafolyo.proba.dokumentumok;
  const maradek = Math.max(0, keret - felhasznalt);

  const ideLejart = lejart(ceg.trial_ends_at, most);
  const elfogyott = felhasznalt >= keret;
  const hatralevoNap = napokMeg(ceg.trial_ends_at, most);

  // A kettő VAGY kapcsolatban van: amelyik előbb elfogy, az zárja le.
  const vege = ideLejart || elfogyott;

  // Ha mindkettő elfogyott, a **napot** mondjuk: azon nem tud segíteni az, hogy
  // kevesebbet tölt fel, tehát az a valódi akadály.
  const indok = ideLejart
    ? 'Lejárt a 14 napos próbaidő. Válassz csomagot, és folytathatod ott, ahol abbahagytad.'
    : elfogyott
      ? `Elfogyott a próbaidős kereted (${keret} bizonylat). Válassz csomagot, és folytathatod.`
      : null;

  return {
    allapot: vege ? 'lejart' : 'proba',
    csomag: null,
    csomagKulcs: null,
    keret,
    felhasznalt,
    maradek,
    idoszakVege: ceg.trial_ends_at,
    hatralevoNap,
    mehet: !vege,
    indok,
    // Próbaidőn nincs túlhasználat: ahhoz előbb csomag kell.
    tulhasznalatban: false,
    ismeretlenCsomag: false,
  };
}

/**
 * Egy mondat a keret állapotáról, kiírható alakban.
 *
 * Azért itt van, és nem a képernyőn, mert a Beérkező és a Beállítások is ezt
 * mondja — és ha két helyen fogalmaznánk meg, két különböző számot ígérnénk.
 */
export function keretMondat(k: Keret): string {
  if (k.allapot === 'lejart') {
    return k.indok ?? 'A kereted elfogyott.';
  }

  if (k.allapot === 'proba') {
    const nap = k.hatralevoNap ?? 0;
    const napSzo = nap === 1 ? 'egy nap' : `${nap} nap`;

    return `Próbaidő: ${k.maradek} bizonylat és ${napSzo} van hátra.`;
  }

  if (k.tulhasznalatban) {
    return `A ${k.csomag} keretén túl vagy (${k.felhasznalt} / ${k.keret}). A további bizonylatok a túlhasználati díjszabás szerint mennek.`;
  }

  return `${k.csomag}: ${k.maradek} bizonylat van hátra a ${k.keret}-ből.`;
}
