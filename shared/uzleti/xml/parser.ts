import { XMLParser } from 'fast-xml-parser';
import { helyiNev, type Csomopont, type Dokumentum } from './fa.ts';
import { tulNagy, vanDoctype } from './xmlKiolvaso.ts';

/**
 * A parser-adapter: nyers XML-ből semleges fa.
 *
 * Ez az **egyetlen** hely, ahol a projekt egy XML-könyvtárat ismer. Az
 * értelmezők (`cii.ts`, `ubl.ts`) csak a fát látják, ezért egy parsercsere
 * nem érinti a szaktudást hordozó részt — és ezért tesztelhetők kézzel épített
 * fával is.
 *
 * A `preserveOrder` alak azért kell, mert csak abban marad meg a gyerekek
 * sorrendje és az ismétlődő elemek külön azonossága. Az ÁFA-bontásnál ez nem
 * elhanyagolható: kulcsonként egy sor, és a sorrend számít.
 */

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // A prefixeket **nem** töletjük le a parserrel: a `helyiNev()` intézi, így
  // az `xmlns` deklarációk megmaradnak, és azokból tudjuk a dokumentumot
  // UBL-ként vagy NAV-ként azonosítani.
  removeNSPrefix: false,
  trimValues: true,
  // A szabványos entitások (&amp; &lt; …) feldolgozása biztonságos, mert a
  // doctype-os fájlt eldobjuk — saját entitást deklarálni nincs hol. A HTML
  // entitások viszont nem tartoznak ide.
  processEntities: true,
  htmlEntities: false,
  // Minden érték maradjon szöveg: a számmá alakítást mi végezzük, a magunk
  // szabályai szerint (`Osszeg`), nem a parser heurisztikája.
  parseTagValue: false,
  parseAttributeValue: false,
});

export class XmlHiba extends Error {}

/**
 * Nyers XML → dokumentum. Hibát dob, ha a tartalom eleve nem értelmezhető
 * biztonságosan; `null`-t ad, ha értelmezhető, de nincs benne elem.
 */
export function xmltFelolvas(xml: string, bajtHossz: number): Dokumentum | null {
  if (xml === '') {
    return null;
  }

  if (tulNagy(bajtHossz)) {
    throw new XmlHiba('Az XML nagyobb a megengedettnél.');
  }

  if (vanDoctype(xml)) {
    // Nem hiba a felhasználó felé — a lánc következő foka (a modell) még
    // megpróbálhatja. De XML-ként nem nyúlunk hozzá.
    throw new XmlHiba('Az XML doctype-deklarációt tartalmaz.');
  }

  const fa = parser.parse(xml) as unknown[];
  const nyersGyoker = elsoElem(fa);

  if (nyersGyoker === null) {
    return null;
  }

  const gyoker = alakit(nyersGyoker);

  return gyoker === null ? null : { gyoker, nevterek: nevterekOlvas(nyersGyoker[':@']) };
}

/**
 * A gyökéren deklarált névterek.
 *
 * A **nyers** rekordból olvassuk, nem a kész csomópontból: az `attributumok()`
 * addigra minden nevet helyi névre rövidít, tehát az `xmlns:ns2` kulcsból
 * `ns2` lesz, és onnantól nem látszik, hogy névtér-deklaráció volt. Egy
 * prefixes gyökér így csendben névtér nélkülinek tűnne.
 */
function nevterekOlvas(nyers: unknown): string[] {
  if (nyers === null || typeof nyers !== 'object') {
    return [];
  }

  const eredmeny: string[] = [];

  for (const [kulcs, ertek] of Object.entries(nyers as Record<string, unknown>)) {
    const nev = kulcs.startsWith('@_') ? kulcs.slice(2) : kulcs;

    if (nev === 'xmlns' || nev.startsWith('xmlns:')) {
      eredmeny.push(String(ertek));
    }
  }

  return eredmeny;
}

/**
 * A fast-xml-parser tömbjéből az első valódi elem **nyers rekordja** (a `?xml`
 * prológus kimarad). Nyersen, mert a névtér-attribútumok csak itt láthatók.
 */
function elsoElem(csomopontok: unknown[]): Record<string, unknown> | null {
  for (const nyers of csomopontok) {
    if (nyers === null || typeof nyers !== 'object') {
      continue;
    }

    const rekord = nyers as Record<string, unknown>;
    const nev = Object.keys(rekord).find((k) => k !== ':@' && k !== '#text');

    if (nev !== undefined && nev !== '?xml') {
      return rekord;
    }
  }

  return null;
}

function alakit(nyers: unknown): Csomopont | null {
  if (nyers === null || typeof nyers !== 'object') {
    return null;
  }

  const rekord = nyers as Record<string, unknown>;
  const nev = Object.keys(rekord).find((k) => k !== ':@' && k !== '#text');

  if (nev === undefined) {
    return null;
  }

  const gyerekLista = Array.isArray(rekord[nev]) ? (rekord[nev] as unknown[]) : [];
  const gyerekek: Csomopont[] = [];
  let szoveg = '';

  for (const gyerekNyers of gyerekLista) {
    if (gyerekNyers !== null && typeof gyerekNyers === 'object' && '#text' in gyerekNyers) {
      szoveg += String((gyerekNyers as Record<string, unknown>)['#text'] ?? '');
      continue;
    }

    const gyerek = alakit(gyerekNyers);
    if (gyerek !== null) {
      gyerekek.push(gyerek);
    }
  }

  return {
    nev: helyiNev(nev),
    attr: attributumok(rekord[':@']),
    gyerekek,
    szoveg: szoveg.trim(),
  };
}

function attributumok(nyers: unknown): Record<string, string> {
  if (nyers === null || typeof nyers !== 'object') {
    return {};
  }

  const eredmeny: Record<string, string> = {};

  for (const [kulcs, ertek] of Object.entries(nyers as Record<string, unknown>)) {
    const nev = kulcs.startsWith('@_') ? kulcs.slice(2) : kulcs;
    eredmeny[helyiNev(nev)] = String(ertek);
  }

  return eredmeny;
}
