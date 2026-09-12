import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * A feltöltött fájl típusa **a tartalomból**, nem a kliens állításából.
 *
 * Egy feltöltött számla akkor is idegen fájl, ha belépett felhasználó hozta: a
 * bizonylatot a szállítója írta. A böngésző által küldött `Content-Type` a
 * feltöltő állítása, nem tény — a bájtok viszont tények.
 *
 * Ez a modul a böngészőben és az Edge Functionben is fut, ezért `Uint8Array`-t
 * kap, nem `File`-t.
 */

export type FelismertTipus = {
  /** A tárolásra és kiszolgálásra használt MIME. */
  mime: string;
  /** A fájlnév kiterjesztése (pont nélkül). */
  kiterjesztes: string;
};

/** Ennyi bájt elég a felismeréshez. */
export const MINTA_BAJT = 512;

const ELFOGADOTT = szamlafolyo.feltoltes.mimeTipusok;

/**
 * A tartalomból megállapított típus, vagy `null`, ha nem ismerjük fel.
 *
 * A felismerés szándékosan szűk: amit nem tudunk biztosan azonosítani, azt nem
 * engedjük be. Egy „hátha jó lesz" átengedés itt azt jelentené, hogy a
 * kiszolgáláskor derül ki, mi is az valójában.
 */
export function felismer(bajtok: Uint8Array): FelismertTipus | null {
  if (kezdodik(bajtok, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mime: 'application/pdf', kiterjesztes: 'pdf' };
  }

  if (kezdodik(bajtok, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', kiterjesztes: 'jpg' };
  }

  if (kezdodik(bajtok, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', kiterjesztes: 'png' };
  }

  // A WebP RIFF-konténer: `RIFF` … `WEBP`, a második jel a 8. bájttól.
  if (kezdodik(bajtok, [0x52, 0x49, 0x46, 0x46]) && kezdodik(bajtok, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', kiterjesztes: 'webp' };
  }

  if (xmlNekLatszik(bajtok)) {
    // Az XML-t **soha nem szolgáljuk ki XML típussal** — a `text/plain` itt
    // nem pongyolaság, hanem védelem: a böngésző így nem értelmezi, és egy
    // beágyazott szkript nem fut le a mi tartományunkon.
    return { mime: 'text/xml', kiterjesztes: 'xml' };
  }

  return null;
}

/**
 * XML-nek látszik-e a tartalom.
 *
 * A BOM és a bevezető whitespace átugorható. Elfogadjuk a deklaráció nélküli
 * XML-t is (egy `<` után névkezdő karakter), **de a `<!DOCTYPE`-ot nem**: az
 * entitás-alapú támadások egész osztálya azon múlik, és az XML-értelmező is
 * eldobja az ilyen fájlt. Ami ott elbukna, azt itt sem engedjük be.
 */
function xmlNekLatszik(bajtok: Uint8Array): boolean {
  let i = 0;

  // UTF-8 BOM
  if (kezdodik(bajtok, [0xef, 0xbb, 0xbf])) {
    i = 3;
  }

  while (i < bajtok.length && (bajtok[i] === 0x20 || bajtok[i] === 0x09 || bajtok[i] === 0x0a || bajtok[i] === 0x0d)) {
    i++;
  }

  if (bajtok[i] !== 0x3c) {
    // nem `<`
    return false;
  }

  const kovetkezo = bajtok[i + 1];
  if (kovetkezo === undefined) {
    return false;
  }

  // `<?xml …`
  if (kovetkezo === 0x3f) {
    return kezdodik(bajtok, [0x3f, 0x78, 0x6d, 0x6c], i + 1);
  }

  // Deklaráció nélküli XML: `<` + névkezdő karakter (betű vagy alulvonás).
  // A `<!DOCTYPE` és a `<!--` így magától kiesik.
  const betu =
    (kovetkezo >= 0x41 && kovetkezo <= 0x5a) ||
    (kovetkezo >= 0x61 && kovetkezo <= 0x7a) ||
    kovetkezo === 0x5f;

  return betu;
}

export type Kifogas = { ok: false; hiba: string };
export type Rendben = { ok: true; tipus: FelismertTipus };

/**
 * A feltöltés teljes ellenőrzése: méret és tartalom szerinti típus.
 *
 * A hibaüzenet a felhasználónak szól, ezért megmondja, mi a baj **és** mit
 * fogadunk el — egy „érvénytelen fájl" üzenetből nem derül ki, mit csináljon.
 */
export function ellenoriz(
  bajtok: Uint8Array,
  meret: number,
  fajlnev: string,
): Rendben | Kifogas {
  if (meret > szamlafolyo.feltoltes.maxBajt) {
    const mb = Math.round(szamlafolyo.feltoltes.maxBajt / 1024 / 1024);
    return { ok: false, hiba: `A(z) „${fajlnev}" nagyobb ${mb} MB-nál.` };
  }

  if (meret === 0) {
    return { ok: false, hiba: `A(z) „${fajlnev}" üres.` };
  }

  const tipus = felismer(bajtok);

  if (tipus === null || !(tipus.mime in ELFOGADOTT)) {
    return {
      ok: false,
      hiba: `A(z) „${fajlnev}" nem feldolgozható. PDF, JPG, PNG, WEBP vagy e-számla XML kell.`,
    };
  }

  return { ok: true, tipus };
}

function kezdodik(bajtok: Uint8Array, minta: readonly number[], eltolas = 0): boolean {
  if (bajtok.length < eltolas + minta.length) {
    return false;
  }

  return minta.every((b, i) => bajtok[eltolas + i] === b);
}
