/**
 * A bizonylatszám **összevetési kulcsa** – az írásmód nélkül.
 *
 * # Miért kell
 *
 * 2026-10-08-án egy kézzel írt tömbszámla nyomtatott sorszámát a két mért
 * modell két alakban olvasta ki: a betűcsoport és a számjegyek között az egyik
 * szóközzel, a másik anélkül. Mindkettő helyes, mert a papíron rés van, de
 * betű szerint nem egyeznek. Az előzménykapu (`bizonylatszamMarLatott`) eddig
 * betű szerint vetett össze, tehát ugyanannak a számlának a második példánya
 * „új számnak" látszott volna. A Gemini ugyanazon a számlán egy másik mezőt
 * három futásban háromféleképp írt, vagyis ez modellcsere nélkül is előáll.
 *
 * # Mit hagy figyelmen kívül
 *
 * Kis-nagybetű, szóköz (a nem törő is), és a szokásos elválasztók: kötőjelek,
 * aláhúzás, pont, perjel, fordított perjel. A tárolt érték **nem változik**:
 * az marad, ami a papíron áll. Ez csak az összevetés kulcsa.
 *
 * # Miért ebbe az irányba téved
 *
 * Egy téves „már láttuk" annyit tesz, hogy a bizonylat emberhez megy
 * ellenőrzésre. Egy elmulasztott viszont azt, hogy egy dupla számla
 * automatikusan átmehet. A kulcs ezért inkább összevon, mint szétválaszt.
 *
 * A vezető nullát **nem** dobjuk el: a `0012` és a `12` két különböző
 * sorszám lehet ugyanannál a szállítónál.
 */
export function bizonylatszamKulcs(ertek: string | null | undefined): string | null {
  if (ertek === null || ertek === undefined) return null;

  const kulcs = ertek
    .normalize('NFKC')
    .toLocaleUpperCase('hu')
    .replace(/[\s\-‐‑‒–—_./\\]/gu, '');

  return kulcs === '' ? null : kulcs;
}

/** Szerepelt-e már ez a bizonylatszám – írásmódtól függetlenül. */
export function bizonylatszamSzerepelt(
  mostani: string | null | undefined,
  korabbiak: readonly (string | null | undefined)[],
): boolean {
  const kulcs = bizonylatszamKulcs(mostani);
  if (kulcs === null) return false;

  return korabbiak.some((k) => bizonylatszamKulcs(k) === kulcs);
}
