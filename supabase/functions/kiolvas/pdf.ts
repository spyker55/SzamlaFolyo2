import { PDFDocument } from 'pdf-lib';

/**
 * Oldaltartomány kivágása egy PDF-ből — **csak a modellhívás kedvéért**.
 *
 * A tárolt fájlt nem vágjuk szét, és ez tudatos: a `documents` sor
 * oldaltartományt tárol, az előnézet pedig `#page=N`-nel ugrik a helyére. Egy
 * szétvágott fájlból viszont nem lehet visszaállítani az eredetit, és a
 * megőrzési szabály is fájlra szól.
 *
 * ⚠️ De a **modellnek** nem adhatjuk oda az egész köteget. Ha odaadnánk, és
 * csak a promptban kérnénk, hogy „a 3–4. oldalt olvasd", minden bizonylatra
 * ugyanaz a kockázat állna fenn: a modell az első, legfeltűnőbb bizonylatot
 * olvassa ki. Ezt nem lehet prompttal megbízhatóan kikényszeríteni — a
 * bemenetet kell szűkíteni. Az itt előálló PDF **sehova nem kerül mentésre**:
 * megszületik, elmegy a modellnek, és elfogy.
 *
 * A `pdf-lib` azért kell ehhez, mert a `unpdf` (pdf.js) **olvasni tud, írni
 * nem**. Tiszta JavaScript, natív függőség nélkül — az Edge Runtime alatt is
 * elfut.
 */
export async function oldaltartomany(
  bajtok: Uint8Array,
  tol: number,
  ig: number,
): Promise<Uint8Array> {
  const forras = await PDFDocument.load(bajtok, {
    // A titkosított PDF-et is meg akarjuk nyitni: a bizonylatokon gyakran csak
    // szerkesztési tiltás ül, ami az olvasást nem akadályozza. Ha mégsem megy,
    // a hívó a teljes fájlt küldi el — az a mai viselkedés, tehát nincs
    // visszalépés.
    ignoreEncryption: true,
  });

  const osszes = forras.getPageCount();
  const elso = Math.max(1, Math.min(tol, osszes));
  const utolso = Math.max(elso, Math.min(ig, osszes));

  // Ha a tartomány az egész fájl, nincs mit másolni: az eredeti bájtok mennek.
  // Így egy egybizonylatos fájl nem megy át fölöslegesen egy újraíráson.
  if (elso === 1 && utolso === osszes) {
    return bajtok;
  }

  const cel = await PDFDocument.create();
  const indexek: number[] = [];

  for (let i = elso - 1; i <= utolso - 1; i++) {
    indexek.push(i);
  }

  const oldalak = await cel.copyPages(forras, indexek);
  for (const oldal of oldalak) {
    cel.addPage(oldal);
  }

  return await cel.save();
}
