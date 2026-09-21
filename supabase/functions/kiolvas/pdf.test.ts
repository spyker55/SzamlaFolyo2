import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { oldaltartomany } from './pdf.ts';

/**
 * A PDF-darabolás mérése — **telepítés előtt**.
 *
 * Ez az a kód, ami nélkül a kötegszétszedés nem ér semmit: ha a modell az egész
 * köteget kapja meg, minden darabra ugyanazt az első bizonylatot olvassa ki. A
 * darabolás tehát nem kényelmi lépés, hanem a helyesség feltétele — és a
 * PLACEHOLDER-eset óta az ilyet nem telepítjük mérés nélkül.
 *
 * ⚠️ Az oldalakat **a méretük** azonosítja, nem beléjük írt szöveg. Az első
 * változat szöveget rajzolt, és a nyers bájtokban kereste — az mérve nem
 * működik: a `pdf-lib` a tartalomfolyamot `FlateDecode`-dal tömöríti, tehát az
 * „OLDAL-3" felirat sehol nem áll olvashatóan a fájlban. A méret viszont a
 * lapobjektum saját adata, és a `pdf-lib` API-jával közvetlenül kiolvasható —
 * nem kell hozzá szövegkinyerő könyvtár, és nem is múlik tömörítésen.
 */
async function kotegetKeszit(oldalak: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (let i = 1; i <= oldalak; i++) {
    // A szélesség azonosítja az oldalt: az i. oldal 300 + i pont széles.
    doc.addPage([300 + i, 200]);
  }

  return await doc.save();
}

/** Melyik oldalak jöttek át — a szélességükből visszafejtve. */
async function oldalsorszamok(bajtok: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bajtok);

  return doc.getPages().map((o) => Math.round(o.getWidth()) - 300);
}

describe('PDF oldaltartomány kivágása', () => {
  it('a kivágott oldalak **azok**, amiket kértünk, és abban a sorrendben', async () => {
    const koteg = await kotegetKeszit(6);

    expect(await oldalsorszamok(await oldaltartomany(koteg, 3, 4))).toEqual([3, 4]);
    expect(await oldalsorszamok(await oldaltartomany(koteg, 1, 1))).toEqual([1]);
    expect(await oldalsorszamok(await oldaltartomany(koteg, 5, 6))).toEqual([5, 6]);
    expect(await oldalsorszamok(await oldaltartomany(koteg, 2, 5))).toEqual([2, 3, 4, 5]);
  });

  it('a teljes fájlra kért tartomány az eredeti bájtokat adja vissza', async () => {
    const koteg = await kotegetKeszit(3);

    // Ugyanaz az objektum: egy egybizonylatos fájl nem megy át fölösleges
    // újraíráson, és a modell pontosan azt kapja, amit a felhasználó feltöltött.
    expect(await oldaltartomany(koteg, 1, 3)).toBe(koteg);
  });

  it('a fájlon túlnyúló kérés a fájl végéig vág, nem hibázik', async () => {
    const koteg = await kotegetKeszit(3);

    expect(await oldalsorszamok(await oldaltartomany(koteg, 2, 99))).toEqual([2, 3]);
  });

  it('az egyoldalas kivágás egy oldal, akkor is, ha a köteg vastag', async () => {
    const koteg = await kotegetKeszit(20);

    expect(await oldalsorszamok(await oldaltartomany(koteg, 13, 13))).toEqual([13]);
  });
});
