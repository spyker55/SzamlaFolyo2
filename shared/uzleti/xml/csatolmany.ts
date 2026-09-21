import { MAX_BAJT } from './xmlKiolvaso.ts';

/**
 * **Melyik melléklet az e-számla XML?** — a PDF-be ágyazott bizonylat
 * (Factur-X, ZUGFeRD, XRechnung) kiválasztása.
 *
 * A hibrid e-számla egyetlen fájl, két olvasattal: egy ember által olvasható
 * PDF, és **ugyanaz a számla** géppel olvasható XML-ként a mellékletei között.
 * Ha a PDF-et küldjük a modellhez, azt fizetjük meg, hogy egy kép alapján
 * kitalálja, ami a fájlban strukturáltan ott van.
 *
 * A döntés azért **itt** van, és nem a `felderites.ts`-ben, mert ez az egyetlen
 * része a műveletnek, ami hibázhat úgy, hogy közben látszólag működik — és
 * mert így telepítés nélkül, egységteszttel mérhető. A `felderites.ts` dolga
 * ezután annyi, hogy a pdf.js válaszát erre az alakra képezze.
 *
 * # Amit ez a modul NEM csinál
 *
 * **Nem dönti el, hogy a választott XML valóban számla-e.** Azt az
 * `xmlKiolvaso.ts` négy értelmezője dönti el, és ha egyik sem ismeri fel, a
 * bizonylat a modellhez esik — pont úgy, ahogy egy fel nem ismert, önállóan
 * feltöltött XML. Ez a lánc szokásos következő foka, nem hiba.
 *
 * Ezért lehet a tartalék szabály megengedő: egy rosszul megtippelt melléklet
 * legrosszabb esetben **egy értelmezési kísérletbe** kerül, nem pénzbe és nem
 * rossz adatba.
 */

/** Egy melléklet a PDF-ből. Szándékosan nem pdf.js-alak: ez a modul tiszta. */
export type PdfCsatolmany = {
  /** A melléklet neve. Útvonalat is tartalmazhat — az alapnevet nézzük. */
  nev: string;
  tartalom: Uint8Array;
};

export type BeagyazottXml = {
  /** Melyik mellékletből lett — a `forras_naplo`-ba kerül. */
  nev: string;
  xml: string;
  /** A melléklet **tényleges bájthossza**, nem a PDF-é és nem karakterszám. */
  bajtHossz: number;
};

/**
 * A szabványos fájlnevek, **elsőbbségi sorrendben**.
 *
 * A Factur-X és a ZUGFeRD 2.x ugyanaz a szabvány két néven, és a kiadók
 * mindkét fájlnevet használják; a ZUGFeRD 1.0 `ZUGFeRD-invoice.xml`-t ír, amit
 * a kisbetűsítés fog meg. Ha egy PDF-ben több is van közülük, ugyanaz a számla
 * áll bennük — ezért elég az elsőt venni, és nem többértelműség.
 *
 * ⚠️ **Az `order-x.xml` szándékosan nincs itt.** Az megrendelés, nem számla —
 * ugyanabban a CII-alakban. A tartalék szabály így is megtalálja, az
 * értelmezőink pedig elutasítják (más a gyökérelem), tehát a modellhez esik.
 * Ez a helyes kimenetel: nem akarjuk, hogy egy megrendelés számlaként
 * olvasódjon ki.
 */
const SZABVANYOS_NEVEK: readonly string[] = [
  'factur-x.xml',
  'zugferd-invoice.xml',
  'xrechnung.xml',
];

/** A tartalék jelöltek rangja: minden más `.xml`. */
const TARTALEK_RANG = SZABVANYOS_NEVEK.length;

/** Nem jelölt. */
const NEM_JELOLT = -1;

/**
 * A PDF mellékletei közül az e-számla XML, vagy `null`.
 *
 * A `null` azt jelenti: **nincs miből olcsóbban olvasni** — menjen a PDF a
 * szokásos úton.
 */
export function beagyazottXml(csatolmanyok: readonly PdfCsatolmany[]): BeagyazottXml | null {
  const jeloltek = csatolmanyok
    .map((cs) => ({ cs, helyezes: rang(cs.nev) }))
    .filter(({ cs, helyezes }) => helyezes !== NEM_JELOLT && hasznalhato(cs.tartalom));

  if (jeloltek.length === 0) {
    return null;
  }

  const legjobb = Math.min(...jeloltek.map((j) => j.helyezes));
  const nyertesek = jeloltek.filter((j) => j.helyezes === legjobb);

  // ⚠️ **A többértelműséget nem oldjuk fel találgatással.** Két szabványos név
  // nem fordulhat elő azonos rangon, tehát ez a `.xml` tartalékot érinti: ha
  // egy PDF-ben két ismeretlen nevű XML van, nincs szabály, amivel el lehetne
  // dönteni, melyik a bizonylat. Menjen a modellhez — az látja a PDF-et is.
  if (nyertesek.length !== 1) {
    return null;
  }

  const { cs } = nyertesek[0]!;

  return {
    nev: alapnev(cs.nev),
    // ⚠️ **UTF-8-nak vesszük.** A Factur-X és a ZUGFeRD ezt írja elő, és az
    // önállóan feltöltött XML-t is így olvassuk — vagyis ez nem új korlát,
    // hanem a meglévő. Egy ISO-8859-2-es melléklet ékezetei elromlanának; ha
    // valaha ilyen kerül elő, a prológus `encoding` attribútumából kell
    // kiolvasni, **mindkét** ágon egyszerre.
    xml: new TextDecoder().decode(cs.tartalom),
    bajtHossz: cs.tartalom.byteLength,
  };
}

/**
 * Érdemes-e egyáltalán hozzányúlni.
 *
 * A méretkorlát itt is áll, nem csak az `xmltFelolvas`-ban: egy 50 MB-os
 * melléklet dekódolása fölösleges munka, ha úgyis elutasítanánk. Az üres
 * melléklet pedig azért esik ki, mert különben a `forras_jelleg`
 * `beagyazott_xml`-t mondana egy olyan fájlra, amiből semmi nem olvasható —
 * és a napló a valóságot rögzíti, nem a szándékot.
 */
function hasznalhato(tartalom: Uint8Array): boolean {
  return tartalom.byteLength > 0 && tartalom.byteLength <= MAX_BAJT;
}

function rang(nev: string): number {
  const alap = alapnev(nev).toLowerCase();
  const szabvanyos = SZABVANYOS_NEVEK.indexOf(alap);

  if (szabvanyos !== NEM_JELOLT) {
    return szabvanyos;
  }

  return alap.endsWith('.xml') ? TARTALEK_RANG : NEM_JELOLT;
}

/**
 * A fájlnév útvonal nélkül.
 *
 * A pdf.js a `rawFilename`-ből maga is levágja az utolsó `/` előttit, de a
 * `\` alakú (Windows-os) elválasztót nem — és a szabványos nevet akkor is fel
 * kell ismernünk, ha a kiadó útvonalastul írta be.
 */
function alapnev(nev: string): string {
  const vago = Math.max(nev.lastIndexOf('/'), nev.lastIndexOf('\\'));

  return vago === NEM_JELOLT ? nev : nev.slice(vago + 1);
}
