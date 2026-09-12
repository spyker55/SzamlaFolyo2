/**
 * Magyar adószám: `12345678-2-42`.
 *
 * A 8. számjegy ellenőrző számjegy az első hét fölött (9-7-3-1-9-7-3 súlyozás),
 * a 9. az ÁFA-kód (1–5), az utolsó kettő a megyekód. Ez a **legerősebb
 * determinisztikus jelünk** arra, hogy a modell jól olvasta-e ki a partnert:
 * nem vélemény kérdése, vagy stimmel, vagy nem.
 *
 * Amit biztosan nem tudunk eldönteni, azt nem utasítjuk el: külföldi
 * regisztrációs szám vagy EU-s adószám nem magyar alakú, és attól még helyes.
 * Egy téves validátor soha ne álljon egy valódi partner útjába.
 */

const SULYOK = [9, 7, 3, 1, 9, 7, 3] as const;

/** Csak a számjegyek. */
export function szamjegyek(ertek: string | null | undefined): string {
  return (ertek ?? '').replace(/\D/g, '');
}

/** `12345678-2-42` alak, ha 11 jegyű; egyébként az eredeti, trimmelve. */
export function formaz(ertek: string | null | undefined): string | null {
  if (ertek === null || ertek === undefined || ertek.trim() === '') {
    return null;
  }

  const sz = szamjegyek(ertek);

  if (sz.length === 11) {
    return `${sz.slice(0, 8)}-${sz.slice(8, 9)}-${sz.slice(9, 11)}`;
  }

  return ertek.trim();
}

/**
 * A törzsszám (első 8 jegy) azonosítja az adóalanyt: az ÁFA-kód és a megyekód
 * változhat, ez nem. Ezért megy az export ügyfélszűrője is a törzsszámra — a
 * `11176165-2-10` és a `HU11176165` ugyanaz a cég.
 */
export function torzsszam(ertek: string | null | undefined): string | null {
  const sz = szamjegyek(ertek);
  return sz.length >= 8 ? sz.slice(0, 8) : null;
}

/**
 * Magyar adószámként érvényes-e. 8 jegy esetén csak a törzsszámot nézzük,
 * 11 jegy esetén az ÁFA-kódot is.
 */
export function ervenyes(ertek: string | null | undefined): boolean {
  const sz = szamjegyek(ertek);

  if (sz.length !== 8 && sz.length !== 11) {
    return false;
  }

  if (!ellenorzoSzamjegyStimmel(sz.slice(0, 8))) {
    return false;
  }

  if (sz.length === 11) {
    const afaKod = Number(sz[8]);
    if (afaKod < 1 || afaKod > 5) {
      return false;
    }
  }

  return true;
}

/**
 * Csak azt utasítjuk el, ami **biztosan** rossz: a magyarnak látszó (8 vagy 11
 * jegyű, csupa számjegy) értéket ellenőrizzük, minden mást átengedünk.
 *
 * Itt szándékosan megengedőbb a mérce, mint a cégalapításnál: ez a szabály a
 * bizonylaton szereplő **partnerre** szól, a cégnyitás pedig a saját cégünkre.
 */
export function biztosanRossz(ertek: string | null | undefined): boolean {
  if (ertek === null || ertek === undefined || ertek.trim() === '') {
    return false;
  }

  const sz = szamjegyek(ertek);
  // Szóközök és kötőjelek nélkül maradt-e bármi más a számjegyeken kívül?
  // Az `ATU12345678` és a `DE 811 122 233` így esik ki a vizsgálatból.
  const csakSzamjegy = sz === ertek.trim().replace(/[\s-]/g, '');

  if (!csakSzamjegy) {
    return false;
  }

  if (sz.length !== 8 && sz.length !== 11) {
    return false;
  }

  return !ervenyes(sz);
}

function ellenorzoSzamjegyStimmel(torzs: string): boolean {
  if (!/^\d{8}$/.test(torzs)) {
    return false;
  }

  let osszeg = 0;
  for (let i = 0; i < 7; i++) {
    osszeg += Number(torzs[i]) * SULYOK[i]!;
  }

  const ellenorzo = (10 - (osszeg % 10)) % 10;

  return ellenorzo === Number(torzs[7]);
}
