import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * Az oldalalapú fair-use szabály.
 *
 * A vevő „dokumentumot" vásárol, a költségünk viszont oldalarányos: egy nyolcvan
 * oldalas köteg nem kerülhet ugyanannyiba, mint egy egyoldalas nyugta. Ha ezt
 * nem mérjük, a nagy csomag margója pont a legnagyobb ügyfeleken tűnik el.
 *
 * A szabály szándékosan ilyen egyszerű, mert **ki van írva a felületre** — a
 * nyitólapon és a Beállításokban is, ugyanebből a függvényből. Egy normál számla
 * (1–3 oldal) így biztosan egy marad: a fair-use szabály nem érintheti a
 * hétköznapi használatot, különben nem fair-use, hanem rejtett áremelés.
 *
 * ⚠️ A mértékegység a **bizonylat**, nem a feltöltött fájl. Ha egy fájlban több
 * bizonylat van, a rendszer szétszedi, és mindegyik külön számít — de a köteg
 * maga nem kerül kreditbe, mert a szétszedés a szolgáltatás része.
 */

/** Hány oldal fér egy kreditbe. Nullás beállítás nullával osztana — ezért véd. */
export function hatar(oldalPerKredit: number = szamlafolyo.kredit.oldalPerKredit): number {
  return Math.max(1, Math.trunc(oldalPerKredit) || 0);
}

/**
 * Hány kredit egy adott oldalszámú bizonylat.
 *
 * Amiről nem tudjuk az oldalszámot (kép, XML, sérült PDF), az **egy** kredit:
 * bizonytalanságból nem számlázunk többet.
 */
export function oldalakbol(
  oldalszam: number | null | undefined,
  oldalPerKredit?: number,
): number {
  const h = hatar(oldalPerKredit);

  if (oldalszam === null || oldalszam === undefined || oldalszam <= h) {
    return 1;
  }

  return Math.ceil(oldalszam / h);
}

/** A felületre kiírt mondat. Egy forrásból a nyitólap, a Beállítások és a keretszámolás. */
export function szabaly(oldalPerKredit?: number): string {
  const h = hatar(oldalPerKredit);

  return `Az első ${h} oldal egy dokumentum; e fölött minden megkezdett ${h} oldal még egy.`;
}
