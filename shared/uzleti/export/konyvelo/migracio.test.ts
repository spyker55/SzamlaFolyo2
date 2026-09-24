import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROGRAMOK } from './beallitas.ts';
import { EXPORT_MIME } from '../mime.ts';

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

function utolso(minta: RegExp, elem = /'([a-z]+)'/g): { fajl: string; lista: string[] } {
  const fajlok = readdirSync(MAPPA).filter((f) => f.endsWith('.sql')).sort().reverse();
  for (const fajl of fajlok) {
    const talalat = readFileSync(join(MAPPA, fajl), 'utf8').match(minta);
    // Több alternatíva is lehet a mintában: az első illeszkedő csoport számít.
    const csoport = talalat?.slice(1).find((c) => c !== undefined);
    if (csoport !== undefined) {
      return { fajl, lista: [...csoport.matchAll(elem)].map((m) => m[1] as string) };
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

  it('az exportok bucket minden export-MIME-et befogad', () => {
    // A bucket az első migrációban `insert`-tel, később `update`-tel kapja a
    // listát; a legutolsó érvényes. Ha itt hiányzik egy MIME, a feltöltés
    // bukik el – 2026-09-24-én a Novitax-ZIP így akadt el élesben.
    const { fajl, lista } = utolso(
      /values\s*\(\s*'exportok'[\s\S]*?array\[([^\]]*)\]|allowed_mime_types\s*=\s*array\[([^\]]*)\][^;]*where\s+id\s*=\s*'exportok'/i,
      /'([^']+)'/g,
    );
    for (const mime of new Set(Object.values(EXPORT_MIME))) expect(lista, `${fajl}: ${mime}`).toContain(mime);
  });
});
