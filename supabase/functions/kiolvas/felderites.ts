import { extractText, getDocumentProxy } from 'unpdf';
import { beagyazottXml, type PdfCsatolmany } from '../../../shared/uzleti/xml/csatolmany.ts';

/**
 * A feldolgozási lánc első lépése — és önmagában is mérés: minden iratról
 * feljegyezzük, mi *lett volna* elérhető benne.
 *
 * A sorrend olcsótól drágáig: strukturált XML → **PDF-be ágyazott XML** → PDF
 * szövegréteggel → kép. Amit strukturáltan is megkapunk, azért nem fizetünk
 * modellhívást.
 *
 * ⚠️ **A `jelleg` azt mondja meg, mi volt elérhető — nem azt, ki olvasta ki.**
 * Egy fel nem ismert sémájú XML `strukturalt_xml` marad, és közben a modellhez
 * esik; ugyanez igaz a `beagyazott_xml`-re. Hogy ténylegesen ki olvasta ki, azt
 * a `document_extractions.model` oszlop mondja meg, nem ez.
 */

export type Jelleg = 'strukturalt_xml' | 'beagyazott_xml' | 'szovegreteg' | 'kep';

export type Felderites = {
  jelleg: Jelleg;
  /** Önálló vagy PDF-be ágyazott XML tartalma. */
  xml: string | null;
  /**
   * Az `xml` **tényleges bájthossza**.
   *
   * ⚠️ Ez nem kozmetika. A 4 MB-os XML-korlátot az `xmltFelolvas` a kapott
   * bájthosszra méri, és a hívónak eddig csak a *fájl* mérete állt
   * rendelkezésére. Önálló XML-nél a kettő ugyanaz; egy beágyazott XML-nél
   * viszont a **PDF** méretét mérnénk a melléklet korlátjához — egy 5 MB-os
   * PDF-ben ülő 10 kB-os Factur-X XML-t elutasítanánk, egy nagy melléklet
   * pedig egy kis PDF-ben átcsúszna. A melléklet saját hosszát ezért végig
   * magunkkal visszük.
   */
  xmlBajt: number | null;
  /** Melyik mellékletből jött a beágyazott XML. Önálló XML-nél `null`. */
  xmlNev: string | null;
  oldalszam: number | null;
  szovegHossz: number;
  /**
   * PDF-nél az **oldalankénti** szöveg. A kötegszétszedő ezt küldi a modellnek
   * a fájl helyett, ha van szövegréteg: a bizonylathatárok felismeréséhez a
   * szöveg elég, és nagyságrenddel olcsóbb, mint a képek átvitele.
   */
  oldalSzovegek: string[] | null;
  hiba: string | null;
};

/**
 * Ez alatt nem tekintjük szövegrétegnek. Szkennelt PDF-en is szokott lenni
 * néhány karakter: a szkennelő szoftver fejléce, egy oldalszám.
 */
export const SZOVEG_KUSZOB = 200;

export async function felderit(bajtok: Uint8Array, mime: string): Promise<Felderites> {
  // A MIME-re nem hagyatkozunk egyedül: a tartalom eleje dönt.
  if (mime.includes('xml') || xmlNekLatszik(bajtok)) {
    return {
      jelleg: 'strukturalt_xml',
      xml: new TextDecoder().decode(bajtok),
      xmlBajt: bajtok.byteLength,
      xmlNev: null,
      oldalszam: null,
      szovegHossz: 0,
      oldalSzovegek: null,
      hiba: null,
    };
  }

  if (mime !== 'application/pdf') {
    return {
      jelleg: 'kep',
      xml: null,
      xmlBajt: null,
      xmlNev: null,
      oldalszam: null,
      szovegHossz: 0,
      oldalSzovegek: null,
      hiba: null,
    };
  }

  try {
    // ⚠️ **Másolattal hívjuk, és ez mérés eredménye.** A pdf.js a kapott
    // puffert **átadja** a feldolgozójának: a hívás után a `bajtok`
    // `byteLength`-e 0, az `ArrayBuffer`-e `detached` (Node 22-n mérve, a
    // `felderites.test.ts` fixtúráján). A `kiolvas` viszont a felderítés
    // **után** is használja ugyanezt a tömböt — a kötegszétszedés kivágásához
    // és a modellnek küldött tartalomhoz.
    //
    // **Élesben ez eddig nem sült el** — ez tény: PDF-es bizonylatok sora ment
    // végig hibátlanul. Hogy *miért* nem, az viszont feltevés (valószínűleg az
    // Edge Runtime alatt a pdf.js álfeldolgozóval fut, és ott nincs átadás), és
    // **innen nem mérhető meg**: ebben a környezetben nincs Deno. Egy feltevésre
    // pedig nem támaszkodunk, amikor a másolat ára néhány megabájt, a
    // leválasztott pufferé pedig egy üresen elküldött bizonylat — hibaüzenet
    // nélkül.
    const pdf = await getDocumentProxy(bajtok.slice());
    const oldalszam = pdf.numPages > 0 ? pdf.numPages : null;

    // **Oldalanként** kérjük, nem egybefűzve: ugyanannyiba kerül, de a
    // kötegszétszedőnek oldalhatárokra bontva kell a szöveg. Az összhosszt
    // ebből számoljuk, tehát a `SZOVEG_KUSZOB` mércéje nem változik.
    const { text } = await extractText(pdf, { mergePages: false });
    const oldalSzovegek = Array.isArray(text) ? text : [String(text)];
    const szovegHossz = oldalSzovegek.join(' ').replace(/\s+/g, ' ').trim().length;

    // A hibrid e-számla (Factur-X, ZUGFeRD, XRechnung) egyetlen fájl két
    // olvasattal: az ember a PDF-et látja, a gép a mellékletként beágyazott
    // XML-t. A szövegréteget **akkor is megmérjük**, ha találunk XML-t — a
    // napló arról szól, mi lett volna elérhető, és a kettő együtt mondja meg,
    // miből mit nyertünk.
    const beagyazott = beagyazottXml(await csatolmanyok(pdf));

    return {
      jelleg:
        beagyazott !== null
          ? 'beagyazott_xml'
          : szovegHossz >= SZOVEG_KUSZOB
            ? 'szovegreteg'
            : 'kep',
      xml: beagyazott?.xml ?? null,
      xmlBajt: beagyazott?.bajtHossz ?? null,
      xmlNev: beagyazott?.nev ?? null,
      oldalszam,
      szovegHossz,
      oldalSzovegek,
      hiba: null,
    };
  } catch (hiba) {
    // Egy sérült PDF attól még elküldhető a multimodális modellnek — egy hiba
    // itt sosem állíthatja meg a feldolgozást. Az oldalszám ilyenkor
    // ismeretlen, és a kreditszabály szerint az egy kredit:
    // bizonytalanságból nem számlázunk többet.
    return {
      jelleg: 'kep',
      xml: null,
      xmlBajt: null,
      xmlNev: null,
      oldalszam: null,
      szovegHossz: 0,
      oldalSzovegek: null,
      hiba: hiba instanceof Error ? hiba.message : 'Ismeretlen PDF-hiba.',
    };
  }
}

/** A `forras_naplo` oszlopba mentett alak. A null értékek kimaradnak. */
export function naplo(f: Felderites): Record<string, unknown> {
  const sorok: Record<string, unknown> = {
    jelleg: f.jelleg,
    szoveg_hossz: f.szovegHossz,
  };

  if (f.oldalszam !== null) sorok['oldalszam'] = f.oldalszam;
  if (f.xmlBajt !== null) sorok['xml_bajt'] = f.xmlBajt;
  // Melyik mellékletből olvastunk — enélkül egy hibrid PDF-nél utólag nem
  // lehetne megmondani, melyik fájlt értelmeztük a többi közül.
  if (f.xmlNev !== null) sorok['xml_nev'] = f.xmlNev;
  if (f.hiba !== null) sorok['hiba'] = f.hiba;

  return sorok;
}

/** Igényel-e modellhívást. A strukturált ágak nem. */
export function igenyelModellt(jelleg: Jelleg): boolean {
  return jelleg !== 'strukturalt_xml' && jelleg !== 'beagyazott_xml';
}

/**
 * A PDF mellékletei, semleges alakban.
 *
 * ⚠️ **A pdf.js a `Names/EmbeddedFiles` névfát olvassa, az `/AF` bejegyzéseket
 * nem** (mérve a csomagolt forrásban, az unpdf 0.12.1-ben és 1.8.1-ben is). A
 * PDF/A-3 — és vele a Factur-X meg a ZUGFeRD — mindkettőt előírja, tehát a
 * szabványos hibrid számla átjön; egy csak `/AF`-et író, szabálytalan kiadó
 * bizonylata viszont a modellhez esik. Az irány jó: rosszabb kiolvasás helyett
 * drágább kiolvasás.
 *
 * # Két lépés, és ez mérés eredménye (unpdf 1.8.1, pdf.js 5)
 *
 * A 0.12.1 alatti pdf.js a `getAttachments()`-ben **sima objektumot** adott,
 * mellékletenként a tartalommal (`content`). Az 1.8.1 alatti már **`Map`-et**
 * ad, és benne **csak a nevet és a leírást** — a tartalmat mellékletenként a
 * `getAttachmentContent(kulcs)` hozza. A régi kód az új változaton **hiba
 * nélkül** üres listát adott (`Object.entries` egy `Map`-re `[]`), és minden
 * hibrid számla csendben a modellhez esett volna. A `felderites.test.ts` hat
 * tesztje erre pirosra váltott, és tíz PDF felderítésének a váltás előtti és
 * utáni összevetése ugyanezt mutatta – a javítás után mind a tíz azonos.
 *
 * A saját `try` azért van, mert egy sérült mellékletlista nem viheti magával a
 * már kimért oldalszámot és szövegréteget — ott a bizonylat `kep` lenne
 * hibaüzenettel, pedig a PDF-fel magával semmi baj nincs. Egy **egyes**
 * melléklet olvasási hibája pedig a többit nem viheti magával.
 */
async function csatolmanyok(pdf: {
  getAttachments: () => Promise<Map<string, { filename?: unknown }> | null>;
  getAttachmentContent: (kulcs: string) => Promise<Uint8Array | null>;
}): Promise<PdfCsatolmany[]> {
  let nevek: Map<string, { filename?: unknown }> | null;

  try {
    nevek = await pdf.getAttachments();
  } catch {
    return [];
  }

  // Melléklet nélküli PDF-re `null` jön vissza, nem üres `Map`.
  if (!(nevek instanceof Map)) {
    return [];
  }

  const lista: PdfCsatolmany[] = [];

  for (const [kulcs, adatok] of nevek) {
    let tartalom: Uint8Array | null;

    try {
      tartalom = await pdf.getAttachmentContent(kulcs);
    } catch {
      continue;
    }

    if (!(tartalom instanceof Uint8Array)) continue;

    const { filename } = adatok ?? {};

    lista.push({
      nev: typeof filename === 'string' && filename !== '' ? filename : kulcs,
      tartalom,
    });
  }

  return lista;
}

function xmlNekLatszik(bajtok: Uint8Array): boolean {
  const eleje = new TextDecoder().decode(bajtok.subarray(0, 200)).trimStart();
  return eleje.startsWith('<?xml');
}
