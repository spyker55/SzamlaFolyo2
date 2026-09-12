import { extractText, getDocumentProxy } from 'unpdf';

/**
 * A feldolgozási lánc első lépése — és önmagában is mérés: minden iratról
 * feljegyezzük, mi *lett volna* elérhető benne.
 *
 * A sorrend olcsótól drágáig: strukturált XML → PDF szövegréteggel → kép.
 * Amit strukturáltan is megkapunk, azért nem fizetünk modellhívást.
 */

export type Jelleg = 'strukturalt_xml' | 'beagyazott_xml' | 'szovegreteg' | 'kep';

export type Felderites = {
  jelleg: Jelleg;
  /** Önálló vagy PDF-be ágyazott XML tartalma. */
  xml: string | null;
  oldalszam: number | null;
  szovegHossz: number;
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
      oldalszam: null,
      szovegHossz: 0,
      hiba: null,
    };
  }

  if (mime !== 'application/pdf') {
    return { jelleg: 'kep', xml: null, oldalszam: null, szovegHossz: 0, hiba: null };
  }

  try {
    const pdf = await getDocumentProxy(bajtok);
    const oldalszam = pdf.numPages > 0 ? pdf.numPages : null;

    const { text } = await extractText(pdf, { mergePages: true });
    const szovegHossz = text.replace(/\s+/g, ' ').trim().length;

    return {
      jelleg: szovegHossz >= SZOVEG_KUSZOB ? 'szovegreteg' : 'kep',
      xml: null,
      oldalszam,
      szovegHossz,
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
      oldalszam: null,
      szovegHossz: 0,
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
  if (f.xml !== null) sorok['xml_bajt'] = f.xml.length;
  if (f.hiba !== null) sorok['hiba'] = f.hiba;

  return sorok;
}

/** Igényel-e modellhívást. A strukturált ágak nem. */
export function igenyelModellt(jelleg: Jelleg): boolean {
  return jelleg !== 'strukturalt_xml' && jelleg !== 'beagyazott_xml';
}

function xmlNekLatszik(bajtok: Uint8Array): boolean {
  const eleje = new TextDecoder().decode(bajtok.subarray(0, 200)).trimStart();
  return eleje.startsWith('<?xml');
}
