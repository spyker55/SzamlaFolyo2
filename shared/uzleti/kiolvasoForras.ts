/**
 * Ki olvasta ki ezt a bizonylatot: a **saját értelmezőnk** vagy a **modell**?
 *
 * # Miért van erre külön modul
 *
 * A `document_extractions.model` oszlop a kezdetektől tudja a választ — a
 * felület viszont 2026-09-22-ig **nem jelenítette meg**. Ez nem kozmetikai
 * hiány volt:
 *
 * 1. **Az ellenőrzőnek más a dolga a két esetben.** A strukturált ágon a mezők
 *    a szállító gépe által kiírt értékek *átvételei*; a modellágon egy olvasat,
 *    ami tévedhet — és a neveken semmilyen determinisztikus ellenőrzésünk
 *    nincs (lásd a `kapuk.ts` d) és g) kapuját). Aki nem tudja, melyiket nézi,
 *    vagy fölöslegesen ellenőriz, vagy nem eléggé.
 * 2. **Az adatvédelmi különbség is ez.** A felismert e-számla tartalma el sem
 *    hagyja a szervert; a fel nem ismert XML viszont a modellhez kerül
 *    (`felderites.ts`, szándékosan). Az Adatkezelési tájékoztató 3. pontja ezt
 *    kimondja — de egy konkrét iratról eddig nem lehetett megtudni, melyik út
 *    futott rajta.
 *
 * # A szabály: az `xml/` előtag dönt, nem a felsorolás
 *
 * ⚠️ A **besorolást** az előtag adja, a **címkét** a térkép — és ez a sorrend
 * szándékos. Ha valaki ötödik értelmezőt vesz fel, és a `CIMKEK`-be elfelejti
 * beírni, a bizonylat akkor is „saját értelmező"-ként jelenik meg, csak a
 * nyers nevével. A fordítottja volna a veszélyes: egy ismeretlen `xml/…`
 * nevet a felület modellnek mutatna, vagyis **rosszabb minőségűnek, mint
 * amilyen**, és az adatvédelmi mondat is hamis lenne rá.
 *
 * A felejtés ettől még hiba, csak nem csendes: a `kiolvasoForras.test.ts`
 * a `xmlKiolvaso.ts` `ERTELMEZOK` tömbjéből olvassa ki az igazságot, és
 * megbukik, ha a kettő elcsúszik.
 *
 * ⚠️ A térkép **nem** importálja az értelmezőket. Az `xmlKiolvaso.ts` a
 * `parser.ts`-en át a `fast-xml-parser`-t húzza magával — annak a böngészőbe
 * kiadott csomagban semmi keresnivalója, egy címkéért pedig végképp nincs.
 */

/** Ezzel kezdődik minden saját értelmező neve. Ez a besorolás egyetlen szabálya. */
export const ERTELMEZO_ELOTAG = 'xml/';

/**
 * Az értelmezők emberi neve. A kulcs az `Ertelmezo.nev`, ami a
 * `document_extractions.model` oszlopba kerül.
 */
export const CIMKEK: Record<string, string> = {
  'xml/ubl': 'UBL e-számla',
  'xml/cii': 'Factur-X / ZUGFeRD (CII)',
  'xml/nav': 'NAV Online Számla',
  'xml/apeh': 'APEH 2005 adatexport',
};

export type Forras = 'ertelmezo' | 'modell' | 'ismeretlen';

export type ForrasJel = {
  forras: Forras;
  /** Rövid, listába való alak. */
  rovid: string;
  /** Egy mondat arról, mit jelent ez az ellenőrzésre nézve. */
  mondat: string;
};

/**
 * A `document_extractions.model` oszlopból a felületnek szóló válasz.
 *
 * A `null` külön eset, és nem „modell": ha nincs kiolvasás-sorunk (a bizonylat
 * még nem futott le, vagy a sora már kiürült), akkor **nem tudjuk** — és ezt
 * ki is mondjuk, ahelyett hogy az egyik ágat tippelnénk. Ugyanaz az elv, amit
 * a `fa.ts` a hiányzó mezőkre mond: inkább üres, mint egy odaírt érték, ami
 * úgy néz ki, mintha tudnánk.
 */
export function kiolvasoForras(model: string | null | undefined): ForrasJel {
  if (model === null || model === undefined || model.trim() === '') {
    return {
      forras: 'ismeretlen',
      rovid: 'nincs adat',
      mondat: 'Erről a bizonylatról nincs kiolvasási nyomunk.',
    };
  }

  if (model.startsWith(ERTELMEZO_ELOTAG)) {
    return {
      forras: 'ertelmezo',
      // A `?? model` az a bizonyos biztonságos irány: címke nélkül is értelmező.
      rovid: CIMKEK[model] ?? model,
      // A formátum nevét a `rovid` viszi, ezért itt nem ismételjük: a kettő
      // mindig egymás mellett jelenik meg.
      mondat:
        'A bizonylat adatai a fájlban lévő strukturált e-számlából származnak: a szállító ' +
        'rendszere írta ki őket, mi átvettük. Nem gépi olvasat, és a tartalma nem hagyta el ' +
        'a szervert. A számtani ellenőrzések ettől még futnak – egy rosszul kiállított ' +
        'számla így is elbukhat rajtuk.',
    };
  }

  return {
    forras: 'modell',
    rovid: 'modell olvasta ki',
    mondat:
      'A bizonylat adatait nyelvi modell olvasta ki a fájlból. Minden mező olvasat, nem ' +
      'átvétel – a neveknél ez külön számít, mert azokra semmilyen számtani ellenőrzésünk ' +
      'nincs.',
  };
}
