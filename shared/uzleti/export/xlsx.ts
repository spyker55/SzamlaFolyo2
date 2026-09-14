import { FEJLECEK, KULCSOK, SZAM_OSZLOPOK, type ExportCella } from './oszlopok.ts';
import { zip } from './zip.ts';

/**
 * XLSX egy saját, minimális íróval.
 *
 * Az `xlsx` egy ZIP-be csomagolt, néhány fájlból álló XML-csomag. A teljes
 * szabvány óriási, de az exporthoz ebből pontosan annyi kell, amennyi itt van:
 * egy munkalap, egy félkövér fejlécsor, és számok.
 *
 * ⚠️ **A számok számként kerülnek a cellába**, nem szövegként — különben a
 * könyvelő nem tud velük számolni, és ez az egész export értelme. Ezért van a
 * szám cellán `<v>`, a szövegesen pedig `t="inlineStr"`.
 *
 * A **dátumok viszont szándékosan szövegek** maradnak, ISO alakban
 * (`2026-09-03`). Szövegként is helyes sorrendben rendeződnek, és a
 * könyvelőprogramok importja így olvassa be őket; az Excel-sorszámra váltás
 * cserébe elvenné ezt. Ez tehát nem hiányosság, hanem választás.
 *
 * Beágyazott sztringtábla (`sharedStrings.xml`) nincs: egy exportban alig van
 * ismétlődő szöveg, a tábla viszont egy újabb fájl és egy újabb hibalehetőség.
 */

/**
 * A stíluslap sorai. Névvel, mert a cellákon indexként hivatkozunk rájuk, és
 * egy elcsúszott szám némán rossz formátumot adna.
 */
const STILUS_ALAP = 0;
const STILUS_FEJLEC = 1;
const STILUS_PENZ = 2;

/**
 * A pénzoszlopok szélessége karakterben.
 *
 * **Ez a szám a számformátum ára.** Formázatlanul a `280000` elfért az
 * alapértelmezett ~8,4 karakteres oszlopban; `280 000,00`-ként már nem, és az
 * Excel `#######`-et ír a helyére. A 14 elfér a leghosszabb pénzfejléccel
 * („Nettó egyéb", félkövéren) és egy hétjegyű negatív összeggel is.
 */
const PENZ_SZELESSEG = 14;

const MUNKALAP = 'Bizonylatok';

export async function fajl(sorok: readonly Record<string, unknown>[]): Promise<Uint8Array> {
  const kodolo = new TextEncoder();

  const reszek: { nev: string; tartalom: string }[] = [
    { nev: '[Content_Types].xml', tartalom: tipusok() },
    { nev: '_rels/.rels', tartalom: gyokerKapcsolatok() },
    { nev: 'xl/workbook.xml', tartalom: munkafuzet() },
    { nev: 'xl/_rels/workbook.xml.rels', tartalom: munkafuzetKapcsolatok() },
    { nev: 'xl/styles.xml', tartalom: stilusok() },
    { nev: 'xl/worksheets/sheet1.xml', tartalom: munkalap(sorok) },
  ];

  return zip(
    reszek.map((resz) => ({
      nev: resz.nev,
      tartalom: kodolo.encode(resz.tartalom),
      // Az XML tizedére megy össze — itt a deflate megéri.
      tomorit: true,
    })),
  );
}

// ---------------------------------------------------------------------------
// A munkalap
// ---------------------------------------------------------------------------

function munkalap(sorok: readonly Record<string, unknown>[]): string {
  const xml: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<worksheet xmlns="${FO_NS}">`,
    // A fejléc rögzítve: huszonkilenc oszlopot görgetve különben két sor után
    // nem tudni, melyik szám melyik oszlopé.
    '<sheetViews><sheetView workbookViewId="0">',
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    '</sheetView></sheetViews>',
    penzOszlopok(),
    '<sheetData>',
    '<row r="1">',
  ];

  KULCSOK.forEach((kulcs, i) => {
    xml.push(szovegCella(oszlopBetu(i) + '1', FEJLECEK[kulcs], STILUS_FEJLEC));
  });

  xml.push('</row>');

  sorok.forEach((sor, sorIndex) => {
    const sorszam = sorIndex + 2;
    xml.push(`<row r="${sorszam}">`);

    KULCSOK.forEach((kulcs, i) => {
      const hivatkozas = oszlopBetu(i) + sorszam;
      const ertek = (sor[kulcs] ?? null) as ExportCella;

      if (ertek === null || ertek === '') {
        return; // A hiányzó cellát ki sem írjuk — az üres cella nem nulla.
      }

      if (SZAM_OSZLOPOK.includes(kulcs)) {
        const n = typeof ertek === 'number' ? ertek : Number(ertek);

        if (Number.isFinite(n)) {
          xml.push(`<c r="${hivatkozas}" s="${STILUS_PENZ}"><v>${szamKiiras(n)}</v></c>`);
          return;
        }
      }

      xml.push(szovegCella(hivatkozas, String(ertek), STILUS_ALAP));
    });

    xml.push('</row>');
  });

  xml.push('</sheetData></worksheet>');

  return xml.join('');
}

/**
 * A pénzoszlopok szélessége.
 *
 * Csak azokra adunk szélességet, amelyeket a számformátum szélesített — a
 * szövegoszlopok maradnak úgy, ahogy eddig voltak. A `<cols>` a séma szerint a
 * `<sheetViews>` után és a `<sheetData>` előtt áll; máshol az Excel a fájlt
 * sérültnek mondja.
 *
 * Az indexeket a `SZAM_OSZLOPOK`-ból számoljuk, nem kézzel írjuk be: ha az
 * oszlopsorrend egyszer változik, ez magától követi.
 */
function penzOszlopok(): string {
  const cols = KULCSOK.map((kulcs, i) =>
    SZAM_OSZLOPOK.includes(kulcs)
      ? `<col min="${i + 1}" max="${i + 1}" width="${PENZ_SZELESSEG}" customWidth="1"/>`
      : '',
  ).join('');

  return cols === '' ? '' : `<cols>${cols}</cols>`;
}

function szovegCella(hivatkozas: string, ertek: string, stilus: number): string {
  const s = stilus === STILUS_ALAP ? '' : ` s="${stilus}"`;
  // `xml:space="preserve"`: a kezdő és záró szóköz különben elveszne — egy
  // bizonylatszám előtti szóköz apróság, de nem a mi dolgunk eltüntetni.
  return `<c r="${hivatkozas}"${s} t="inlineStr"><is><t xml:space="preserve">${szoveg(ertek)}</t></is></c>`;
}

/** Két tizedes, pont tizedesjellel — az xlsx belső alakja mindig ilyen. */
function szamKiiras(n: number): string {
  return n.toFixed(2).replace(/\.00$/, '');
}

/** 0 → A, 25 → Z, 26 → AA. Huszonkilenc oszlopnál ez már nem elmélet. */
export function oszlopBetu(index: number): string {
  let n = index;
  let ki = '';

  do {
    ki = String.fromCharCode(65 + (n % 26)) + ki;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return ki;
}

/**
 * XML-escape, és a vezérlőkarakterek eldobása.
 *
 * Az XML 1.0 a legtöbb vezérlőkaraktert **nem engedi meg**, a szöveget viszont
 * egy modell olvasta ki egy idegen PDF-ből: ha egy ilyen belekerül, az Excel a
 * teljes fájlt sérültnek mondja. Egy karakter nem ér meg egy megnyithatatlan
 * exportot.
 */
function szoveg(ertek: string): string {
  return ertek
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// A csomag többi része — ezek állandók
// ---------------------------------------------------------------------------

const FO_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const KAPCSOLAT_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOKUMENTUM_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function tipusok(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>'
  );
}

function gyokerKapcsolatok(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${KAPCSOLAT_NS}">` +
    `<Relationship Id="rId1" Type="${DOKUMENTUM_NS}/officeDocument" Target="xl/workbook.xml"/>` +
    '</Relationships>'
  );
}

function munkafuzet(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<workbook xmlns="${FO_NS}" xmlns:r="${DOKUMENTUM_NS}">` +
    `<sheets><sheet name="${MUNKALAP}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  );
}

function munkafuzetKapcsolatok(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<Relationships xmlns="${KAPCSOLAT_NS}">` +
    `<Relationship Id="rId1" Type="${DOKUMENTUM_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${DOKUMENTUM_NS}/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}

/**
 * A legkisebb stíluslap, amit az Excel elfogad. A két kitöltés (`none` és
 * `gray125`) nem díszítés: az Excel enélkül sérültnek mondja a fájlt.
 */
function stilusok(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<styleSheet xmlns="${FO_NS}">` +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="2">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    // A pénzcellák formátuma: ezres csoportosítás, két tizedes.
    //
    // A `4`-es a szabvány **beépített** formátuma (`#,##0.00`), ezért nincs
    // szükség saját `<numFmts>` blokkra — és ami még fontosabb: az Excel a
    // beépített kódot a **saját nyelvi beállítása szerint** jeleníti meg, tehát
    // a magyar Excelben magától tizedesvessző lesz belőle. Egy kézzel írt
    // formátumkód ezt nem tudná.
    //
    // Pénznemjel (` Ft`) szándékosan nincs benne: az export **vegyes pénznemű**
    // lehet, van külön `Pénznem` oszlop, és egy euróra ráírt „Ft" hazugság
    // volna. A negatív összeg így mínuszjellel jelenik meg — a sztornó pont
    // ettől marad kivonható.
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    // A „Normal" stílus hiányát az Excel elnézi, más olvasók viszont
    // figyelmeztetnek rá. Egy sor, és nincs miről magyarázkodni.
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}
