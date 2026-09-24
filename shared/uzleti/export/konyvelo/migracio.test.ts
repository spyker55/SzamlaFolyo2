import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROGRAMOK } from './beallitas.ts';

/**
 * A formátumlista három helyen él: a TS-ben (`PROGRAMOK`, `Formatum`), az
 * `exports.format` kényszerében és az `export_rogzit()` ellenőrzésében. Ha
 * egy új program csak a TS-be kerül, az export **a fájl feltöltése után**
 * bukik el az adatbázisban – ez a teszt előbb szól.
 *
 * A **legutolsó** migrációt nézzük, amelyik az adott helyet definiálja: az
 * érvényes, ami utoljára lefutott.
 */

const MAPPA = new URL('../../../../supabase/migrations/', import.meta.url).pathname;
const VART = ['xlsx', 'csv', 'json', ...PROGRAMOK];

function utolso(minta: RegExp): { fajl: string; lista: string[] } {
  const fajlok = readdirSync(MAPPA).filter((f) => f.endsWith('.sql')).sort().reverse();
  for (const fajl of fajlok) {
    const talalat = readFileSync(join(MAPPA, fajl), 'utf8').match(minta);
    if (talalat?.[1] !== undefined) {
      return { fajl, lista: [...talalat[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1] as string) };
    }
  }
  throw new Error(`Nincs migráció erre: ${minta}`);
}

describe('az exportformátumok listája', () => {
  it('az exports.format kényszere ugyanazt sorolja, mint a TS', () => {
    const { fajl, lista } = utolso(/exports_format_check\s+check\s*\(\s*format\s+in\s*\(([^)]*)\)/i);
    expect(lista, fajl).toEqual(VART);
  });

  it('az export_rogzit() ellenőrzése ugyanazt sorolja, mint a TS', () => {
    const { fajl, lista } = utolso(/if\s+formatum\s+not\s+in\s*\(([^)]*)\)/i);
    expect(lista, fajl).toEqual(VART);
  });
});
