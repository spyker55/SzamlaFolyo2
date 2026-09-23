import { szamlafolyo, type CsomagKulcs } from '../../config/szamlafolyo.ts';
import { formaz } from './osszeg.ts';
import { tulhasznalatSzamol, type Tulhasznalat } from './tulhasznalat.ts';

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
 * 4. **A keret megállít, a túlhasználat külön engedély — és az engedély sem
 *    nyitott végű.** Alapból senki nem kap váratlan számlát attól, hogy egy
 *    hónapban többet dolgozott. Aki bekapcsolja, az sem: a plafon forintban
 *    mért felső határ, és **ez a modul tartja be** (`tulhasznalat.ts`). Sokáig
 *    nem tartotta — a döntés `mehet: !elfogyott || overage_enabled` volt, ami
 *    a képernyőn ígért plafont szó nélkül átlépte volna.
 *
 * 5. **Próbaidőn nincs túlhasználat, és ez nem a felület döntése.** Ez a modul
 *    a próbaidős ágon mindig `tulhasznalatban: false`-t ad — nincs kinek
 *    számlázni, mert nincs Stripe-előfizetés. A kapcsolót ezért szerveroldalon
 *    is zárva tartjuk (`20260920000300_tulhasznalat.sql`), különben a
 *    Beállítások olyat ígérne, aminek nincs fedezete.
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
  /** A túlhasználat forintban mért plafonja. `null` = az alapérték. */
  overage_limit_ft: number | null;
  /**
   * Az időszak csomagváltásainak nyoma (`keret_fedezetek`) — lásd a
   * `hatalyosKeret()`-et. **Hiányozhat**: egy régebbi RPC nem adja vissza, és
   * akkor nincs fedezet, vagyis a régi viselkedés marad.
   */
  fedezetek?: readonly KeretFedezet[] | null;
};

/**
 * Egy csomagváltás pillanata: mennyi fogyott addig az időszakban, és melyik
 * csomag keretének terhére. Az adatbázis rögzíti a váltáskor
 * (`20260923000300_keret_fedezet.sql`), nem a kliens.
 */
export type KeretFedezet = {
  /** A váltás ELŐTTI csomag Stripe `lookup_key`-e. */
  kulcs: string | null;
  /** Az időszakban a váltás pillanatáig felhasznált kredit. */
  felhasznalt: number;
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
   * A kereten felüli használat számokban. **Próbaidőn `null`**: ott nincs
   * csomag, tehát darabár sincs, amihez mérni lehetne.
   *
   * Akkor is ki van töltve, ha a cég **nem** kapcsolta be a túlhasználatot —
   * a Beállításoknak meg kell tudnia mutatni a plafont és az állást ahhoz,
   * hogy a felhasználó dönteni tudjon róla.
   */
  tulhasznalat: Tulhasznalat | null;
  /**
   * Ismeretlen csomagkulcsot láttunk, és a legkisebb csomag keretét adtuk.
   * **A hívó naplózza** — ez csendben nem maradhat.
   */
  ismeretlenCsomag: boolean;
};

/**
 * Azok a Stripe-státuszok, amelyek mellett az előfizetés **fut** — vagyis a
 * cégnek csomagja van, nem próbaideje.
 *
 * A `past_due` szándékosan **benne van**: egy lejárt bankkártya nem ok arra,
 * hogy valakit a hónap közepén elvágjunk a saját bizonylataitól. A Stripe
 * úgyis újrapróbálja, és a ciklus végén a státusz magától `unpaid`-re vagy
 * `canceled`-re vált — akkor viszont már nem megy át.
 *
 * ⚠️ **Ez a lista négy SQL-migrációban is le van írva**, mert a kvóta, a
 * helykorlát, a fióktörlés tényei és a túlhasználat őre mind ugyanezt a
 * kérdést teszi fel, az írás helyén. Az egyezést a `keret.test.ts`
 * drift-tesztje méri: egy elcsúszott lista csendben rossz keretet adna, és a
 * hiba csak a számlán derülne ki.
 *
 * ⚠️ Nem tévesztendő össze a `stripe-checkout` `FUTO` listájával: az
 * **szándékosan tágabb** (`unpaid` és `incomplete` is), mert ott más a kérdés
 * — nem „jár-e csomagkeret", hanem „van-e már bármilyen előfizetés, amire egy
 * második checkout ráduplázna".
 */
export const FUTO_ALLAPOTOK: readonly string[] = ['active', 'trialing', 'past_due'] as const;

function elofizetesFut(status: string | null): boolean {
  return status !== null && FUTO_ALLAPOTOK.includes(status);
}

/**
 * A Stripe `lookup_key`-éhez tartozó csomag, vagy `null`, ha nem ismerjük.
 *
 * ⚠️ **Exportált, és a hívónak magának kell eldöntenie, mit kezd a `null`-lal
 * — mert a biztonságos irány hívónként más.**
 *
 * A keretszámolás az ismeretlen kulcsot a **legkisebb** csomag keretére ejti
 * (`legkisebb()`): ott a szigorúbb irány a helyes, mert a megengedőbb
 * AI-költséget jelent. A ciklus végi **számlázás** viszont ugyanettől
 * *többet* számlázna — a kisebb kerethez képest több esne túlhasználatba. Ott
 * ezért a `null` azt jelenti: **nem számlázunk**, és a naplóba kerül.
 *
 * Ugyanaz a hiányzó adat, két ellentétes helyes válasz. Ezt a modul nem tudja
 * eldönteni a hívó helyett, ezért nem is próbálja.
 */
export function csomagKulcsbol(lookupKulcs: string | null): CsomagKulcs | null {
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

/**
 * Az a keret, amihez a túlhasználatot mérni kell — csomagváltás után is.
 *
 * # Miért nem elég a mostani csomag kerete
 *
 * Mert a ciklus végi számlázás a **teljes időszak** felhasználását méri, a
 * csomag viszont a ciklus közben is változhat. Aki a Pro keretén (500) belül
 * feldolgozott 300 bizonylatot, aztán Startra (50) váltott, annál a mostani
 * keret szerint 250 esne túlhasználatba — utólag, olyan munkáért, ami
 * elvégzésekor szabályosan a keretén belül volt. 2026-09-23-ig pontosan így
 * működött (a jogi felülvizsgálat harmadik körének 10. pontja nyomán mérve).
 *
 * # A szabály
 *
 * Minden váltásnál az addig felhasznált rész **a régi keretig fedezve
 * marad**: `min(felhasznált a váltáskor, régi keret)`. A hatályos keret a
 * mostani csomag kerete és a fedezetek közül a legnagyobb.
 *
 * ⚠️ **Ez új helyet soha nem ad**, és ezért biztonságos a keretszámolás
 * (AI-költség) oldalán is: a fedezet sosem nagyobb a már felhasznált
 * mennyiségnél, tehát ha a fedezet a döntő, a keret már elfogyott, és minden
 * további bizonylat túlhasználat — engedéllyel és plafonnal, ahogy eddig.
 * Csak a múltat nem számlázzuk újra.
 *
 * Ismeretlen régi csomagnál a teljes addigi felhasználás fedezett marad: ez a
 * felhasználó javára tévedés, és a fenti okból új költséget ez sem nyit.
 */
export function hatalyosKeret(
  csomagKeret: number,
  fedezetek: readonly KeretFedezet[] | null | undefined,
): number {
  let keret = csomagKeret;

  for (const f of fedezetek ?? []) {
    const hasznalt = Math.max(0, Math.trunc(Number(f.felhasznalt)) || 0);
    const regi = csomagKulcsbol(f.kulcs);
    const regiKeret = regi === null ? hasznalt : szamlafolyo.csomagok[regi].dokumentumok;

    keret = Math.max(keret, Math.min(hasznalt, regiKeret));
  }

  return keret;
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

  // A kijelzett keret és az `elfogyott` a mostani csomagé; a túlhasználat
  // viszont a hatályos kerethez mér, különben egy visszaváltás a már elvégzett
  // munkát is túlhasználatba ejtené. (A kettő az `elfogyott`-ban nem tér el:
  // a fedezet sosem nagyobb a felhasználtnál — lásd `hatalyosKeret()`.)
  const tulhasznalat = tulhasznalatSzamol({
    keret: hatalyosKeret(csomag.dokumentumok, ceg.fedezetek),
    darabAr: csomag.extraFt,
    felhasznalt,
    plafonFt: ceg.overage_limit_ft,
  });

  const engedve = ceg.overage_enabled;

  // Két kapu, nem egy. Az első a cég **engedélye**, a második a saját
  // **plafonja** — és a kettő közül eddig csak az első létezett a kódban.
  const mehet = !elfogyott || (engedve && tulhasznalat.ferMegDarab > 0);

  return {
    allapot: 'elofizetes',
    csomag: csomag.nev,
    csomagKulcs: kulcs,
    keret: csomag.dokumentumok,
    felhasznalt,
    maradek,
    idoszakVege: ceg.current_period_end,
    hatralevoNap: null,
    mehet,
    // A két elakadásnak **két külön indoka** van, mert két külön teendő
    // tartozik hozzájuk: az egyiknél a túlhasználatot kell bekapcsolni, a
    // másiknál a plafont emelni. Egy közös „elfogyott a kereted" mondat a
    // plafonra futó felhasználót a Beállítások rossz kapcsolójához küldené.
    indok: mehet
      ? null
      : engedve
        ? `Elérted a túlhasználati plafont (${formaz(tulhasznalat.plafonFt, 'Ft')}). A Beállításokban emelheted, vagy válts nagyobb csomagra.`
        : `Elfogyott a havi kereted (${csomag.dokumentumok} bizonylat). Válts nagyobb csomagra, vagy engedélyezd a túlhasználatot a Beállításokban.`,
    tulhasznalatban: elfogyott && engedve,
    tulhasznalat,
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
    // Próbaidőn nincs túlhasználat: ahhoz előbb csomag kell. A `null` itt nem
    // „nulla forint", hanem **nem értelmezett** — nincs darabár, amihez mérni
    // lehetne, és nincs Stripe-ügyfél, akinek számlázni lehetne.
    tulhasznalatban: false,
    tulhasznalat: null,
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

  if (k.tulhasznalatban && k.tulhasznalat !== null) {
    const t = k.tulhasznalat;

    // A **forint** szerepel benne, nem csak az, hogy „díjszabás szerint": ez
    // az a szám, ami a következő számlán meg fog jelenni. Aki a keretén túl
    // dolgozik, annak nem a tény újdonság, hanem az összeg.
    return `A ${k.csomag} keretén túl vagy (${k.felhasznalt} / ${k.keret}). A ${t.darab} többlet eddig ${formaz(t.ft, 'Ft')} – a plafonod ${formaz(t.plafonFt, 'Ft')}.`;
  }

  return `${k.csomag}: ${k.maradek} bizonylat van hátra a ${k.keret}-ből.`;
}
