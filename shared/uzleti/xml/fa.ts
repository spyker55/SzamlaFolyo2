/**
 * Az XML egyszerű fa-ábrázolása.
 *
 * Miért van külön ez a réteg: az értelmezők (`cii.ts`, `ubl.ts`) **nem
 * ismernek parsert**. Egy semleges fát járnak be, a parser pedig az Edge
 * Function határán ül. Így ugyanaz az értelmező-logika fut a tesztekben és
 * élesben, és egy parsercsere nem érinti a szaktudást hordozó részt.
 *
 * A csomópont neve mindig a **helyi név**, névtér-prefix nélkül. Ez nem
 * kényelmi egyszerűsítés: a ZUGFeRD 1.0, a ZUGFeRD 2.x, a Factur-X és az
 * XRechnung más névtér-URI-t és más prefixet ad ugyanannak az elemnek, tehát a
 * prefixre épített keresés az egyik formátumon menne csak.
 */

export type Csomopont = {
  /** A helyi név: `ram:SellerTradeParty` → `SellerTradeParty`. */
  nev: string;
  attr: Record<string, string>;
  gyerekek: Csomopont[];
  /** A közvetlen szöveges tartalom, összefűzve és trimmelve. */
  szoveg: string;
};

/** A gyökéren deklarált névterek — ezekből ismerjük fel a formátumot. */
export type Dokumentum = {
  gyoker: Csomopont;
  /** Minden `xmlns` és `xmlns:*` **értéke** a gyökérről. */
  nevterek: readonly string[];
};

/**
 * Deklarálva van-e a gyökéren olyan névtér, ami tartalmazza a mintát.
 *
 * Miért lista, és miért nem egyetlen URI: a gyökér lehet prefixes
 * (`<ns2:InvoiceData xmlns:ns2="…">`), és olyankor **nincs** alapértelmezett
 * `xmlns`. Mérve: a magyar számlázók JAXB-alapú exportja rendszeresen ilyen —
 * egy `xmlns`-re épített vizsgálat ott csendben `null`-t kapna, a bizonylat
 * pedig felismeretlenül a modellhez esne, pénzért.
 */
export function nevterTartalmaz(doc: Dokumentum, minta: string): boolean {
  return doc.nevterek.some((nevter) => nevter.includes(minta));
}

export function helyiNev(nev: string): string {
  const ketospont = nev.lastIndexOf(':');
  return ketospont === -1 ? nev : nev.slice(ketospont + 1);
}

/** A közvetlen gyerekek a megadott helyi névvel. */
export function gyerekek(csomopont: Csomopont | null, nev: string): Csomopont[] {
  if (csomopont === null) return [];
  return csomopont.gyerekek.filter((gy) => gy.nev === nev);
}

/** Az első közvetlen gyerek a megadott helyi névvel. */
export function gyerek(csomopont: Csomopont | null, nev: string): Csomopont | null {
  if (csomopont === null) return null;
  return csomopont.gyerekek.find((gy) => gy.nev === nev) ?? null;
}

/**
 * Útvonal-bejárás **közvetlen** gyerekeken át: `ut(gyoker, 'A', 'B', 'C')`.
 *
 * Szándékosan nem rekurzív keresés: az összegeknél épp az a lényeg, hogy a
 * fejléc-összesítő alól olvassunk, ne a tételsorok alól — ugyanazok a nevek
 * ott is előfordulnak.
 */
export function ut(csomopont: Csomopont | null, ...nevek: string[]): Csomopont | null {
  let aktualis = csomopont;
  for (const nev of nevek) {
    aktualis = gyerek(aktualis, nev);
    if (aktualis === null) return null;
  }
  return aktualis;
}

/** Az összes leszármazott a megadott helyi névvel, mélységi sorrendben. */
export function leszarmazottak(csomopont: Csomopont | null, nev: string): Csomopont[] {
  if (csomopont === null) return [];

  const talalatok: Csomopont[] = [];
  const sor: Csomopont[] = [...csomopont.gyerekek];

  while (sor.length > 0) {
    const aktualis = sor.shift()!;
    if (aktualis.nev === nev) {
      talalatok.push(aktualis);
    }
    sor.unshift(...aktualis.gyerekek);
  }

  return talalatok;
}

/** Az első leszármazott a megadott helyi névvel. */
export function elsoLeszarmazott(csomopont: Csomopont | null, nev: string): Csomopont | null {
  return leszarmazottak(csomopont, nev)[0] ?? null;
}

/**
 * A régi XPath-ok `.//Elso/Masodik/Harmadik` alakjának megfelelője: az **első
 * név leszármazott-keresés**, a többi közvetlen gyerek.
 *
 * Ez a megkülönböztetés nem finomkodás. A `SpecifiedTradeSettlementHeader-
 * MonetarySummation/TaxBasisTotalAmount` azért így néz ki, mert ugyanez a név
 * a tételsorok alatt is előfordul — ott viszont soronkénti érték áll, nem a
 * végösszeg. A leszármazott-keresés megtalálja a fejléc-összesítőt bárhol a
 * fában, a közvetlen lépés pedig megakadályozza, hogy alatta mélyebbre
 * csússzunk.
 */
export function keresOsszes(csomopont: Csomopont | null, ...nevek: string[]): Csomopont[] {
  if (csomopont === null || nevek.length === 0) return [];

  const [elso, ...tovabbi] = nevek;

  // Minden lépésnél **minden** találatot továbbviszünk, nem csak az elsőt: a
  // `.//ApplicableHeaderTradeSettlement/ApplicableTradeTax` az összes
  // ÁFA-kulcssort jelenti, nem csak a legelsőt. Egy „első találat" logika itt
  // csendben elnyelné a többkulcsos számla összes további sorát.
  let aktualisak = leszarmazottak(csomopont, elso!);

  for (const nev of tovabbi) {
    aktualisak = aktualisak.flatMap((cs) => gyerekek(cs, nev));
  }

  return aktualisak;
}

export function keres(csomopont: Csomopont | null, ...nevek: string[]): Csomopont | null {
  return keresOsszes(csomopont, ...nevek)[0] ?? null;
}

export function keresSzoveg(csomopont: Csomopont | null, ...nevek: string[]): string | null {
  const talalat = keres(csomopont, ...nevek);
  if (talalat === null) return null;

  const ertek = talalat.szoveg.trim();
  return ertek === '' ? null : ertek;
}

export function keresSzam(csomopont: Csomopont | null, ...nevek: string[]): number | null {
  const szoveg = keresSzoveg(csomopont, ...nevek);
  if (szoveg === null) return null;

  const szam = Number(szoveg);
  return Number.isFinite(szam) ? szam : null;
}

/** Egy útvonal szövege, vagy `null`, ha nincs meg vagy üres. */
export function utSzoveg(csomopont: Csomopont | null, ...nevek: string[]): string | null {
  const talalat = ut(csomopont, ...nevek);
  if (talalat === null) return null;

  const ertek = talalat.szoveg.trim();
  return ertek === '' ? null : ertek;
}

/**
 * Egy útvonal száma. **Amit nem értünk, azt eldobjuk** — inkább üres mező, mint
 * egy odaírt nulla, ami úgy néz ki, mintha tudnánk.
 */
export function utSzam(csomopont: Csomopont | null, ...nevek: string[]): number | null {
  const szoveg = utSzoveg(csomopont, ...nevek);
  if (szoveg === null) return null;

  const szam = Number(szoveg);
  return Number.isFinite(szam) ? szam : null;
}

/**
 * Dátum a CII és az UBL alakjából egyaránt.
 *
 * A CII a `102`-es UNCL2379 formátumot használja (`20260314`), az UBL viszont
 * ISO-t (`2026-03-14`, néha időbélyeggel).
 */
export function datummaAlakit(nyers: string | null): string | null {
  if (nyers === null) return null;

  const s = nyers.trim();

  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return iso === null ? null : iso[1]!;
}
