import { DATUM_MEZOK, MEZOK, OSSZEG_MEZOK, type Mezo } from './sema.ts';
import { ertelmez as osszegErtelmez } from './osszeg.ts';
import { datumErtelmez } from './ido.ts';

/**
 * A megtisztított válasz értékeinek a **tárolási alakra** hozása.
 *
 * A séma csak a szerkezetet rendezi el; az értelmezés itt történik, egy helyen
 * — ugyanaz a függvény szolgálja ki a modell válaszát és az XML-értelmezőt,
 * mert egy csővezeték van, nem kettő.
 *
 * Amit nem értünk, az `null` lesz, nem nulla és nem az eredeti szemét: a
 * `numeric(15,2)` oszlopba nem tehetünk „1 612 900,25"-öt, a `date`-be pedig
 * nem tehetünk „valamikor márciusban"-t.
 */
export function normalizal(mezok: Record<Mezo, unknown>): Record<Mezo, string | null> {
  const eredmeny = {} as Record<Mezo, string | null>;

  for (const mezo of MEZOK) {
    const ertek = mezok[mezo];

    if (ertek === null || ertek === undefined || ertek === '') {
      eredmeny[mezo] = null;
      continue;
    }

    if ((OSSZEG_MEZOK as readonly string[]).includes(mezo)) {
      const o = osszegErtelmez(ertek as string | number);
      eredmeny[mezo] = o.ok ? o.ertek : null;
      continue;
    }

    if ((DATUM_MEZOK as readonly string[]).includes(mezo)) {
      eredmeny[mezo] = datumErtelmez(String(ertek));
      continue;
    }

    if (mezo === 'currency') {
      // Három betűs ISO kód, nagybetűvel. Ami nem az, az menjen úgy, ahogy
      // jött — a validátor majd megjelöli; itt nem a helyünk eldönteni,
      // hogy egy ismeretlen kód hibás-e vagy csak új.
      const kod = String(ertek).trim().toUpperCase();
      eredmeny[mezo] = kod === '' ? null : kod;
      continue;
    }

    const szoveg = String(ertek).trim();
    eredmeny[mezo] = szoveg === '' ? null : szoveg;
  }

  return eredmeny;
}
