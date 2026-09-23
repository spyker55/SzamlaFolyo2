import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOKUMENTUMOK, lenyomat, renderel } from './archivum.tsx';
import { JOGI_VERZIO } from './adatok.ts';

/**
 * A jogi szövegek archívumának őre.
 *
 * Két dolgot mér, és mindkettő a „melyik szöveget fogadta el" kérdés
 * bizonyíthatóságáról szól (jogi felülvizsgálat, harmadik kör, 5. pont):
 *
 * 1. **A mai szöveg = a mai verzió archívuma.** Ha valaki verzióváltás nélkül
 *    ír át egy mondatot — vagy egy árat a configban, ami az ÁSZF-ben is
 *    megjelenik —, az új szöveget a régi verzió nevén fogadnák el. Ez a teszt
 *    ott piros, és a hibaüzenet megmondja, mi a teendő.
 * 2. **Az archívum lenyomata = az adatbázisba írt lenyomat.** A migrációk
 *    szövegét olvassa: minden archivált fájl SHA-256-ja szerepel abban a
 *    migrációban, amely a verzió sorát írja.
 */

const GYOKER = new URL('../../../', import.meta.url).pathname;
const ARCHIVUM = GYOKER + 'jogi-archivum/';
const MIGRACIOK = GYOKER + 'supabase/migrations/';

const osszesMigracio = readdirSync(MIGRACIOK)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(MIGRACIOK + f, 'utf8'))
  .join('\n');

describe('a mai szöveg a mai verzió archívuma', () => {
  for (const dok of DOKUMENTUMOK) {
    it(`${dok}: egyezik a jogi-archivum/${JOGI_VERZIO}/${dok}.html fájllal`, () => {
      const ut = `${ARCHIVUM}${JOGI_VERZIO}/${dok}.html`;

      expect(
        existsSync(ut),
        `Nincs archívum a(z) ${JOGI_VERZIO} változathoz: ${ut}. Futtasd: ` +
          '`npx vite-node eszkozok/jogiArchivum.ts`.',
      ).toBe(true);

      const mai = renderel(dok);

      // Anti-vakság: egy üres render egy üres archívummal „egyezne".
      expect(mai.length).toBeGreaterThan(5000);

      expect(
        mai === readFileSync(ut, 'utf8'),
        `A(z) ${dok} mai szövege ELTÉR a(z) ${JOGI_VERZIO} változat archívumától. Egy ` +
          'kiadott változat szövege nem változhat: vegyél fel új JOGI_VERZIO-t (adatok.ts), ' +
          'új legal_versions sort a lenyomatokkal (supabase/migrations/), és futtasd a ' +
          '`npx vite-node eszkozok/jogiArchivum.ts`-t. Ha a változás egy config-érték ' +
          '(ár, határidő), az is új ÁSZF.',
      ).toBe(true);
    });
  }
});

describe('az archívum lenyomatai az adatbázisban', () => {
  // `<dátum>` vagy `<dátum>-<sorszám>`, ha egy napon két változat jelent meg.
  const verziok = readdirSync(ARCHIVUM).filter((v) => /^\d{4}-\d{2}-\d{2}(-\d+)?$/.test(v));

  it('egyáltalán talál archivált verziókat', () => {
    expect(verziok.length).toBeGreaterThanOrEqual(2);
    expect(verziok).toContain(JOGI_VERZIO);
  });

  for (const verzio of verziok) {
    for (const dok of DOKUMENTUMOK) {
      it(`${verzio}/${dok}: a lenyomat szerepel a migrációkban`, () => {
        const h = lenyomat(readFileSync(`${ARCHIVUM}${verzio}/${dok}.html`, 'utf8'));

        expect(
          osszesMigracio,
          `A(z) ${verzio}/${dok}.html lenyomata (${h}) egyetlen migrációban sem szerepel. ` +
            'Vagy az archivált fájl változott utólag — azt nem szabad —, vagy a ' +
            'legal_versions sora hiányzik.',
        ).toContain(`'${h}'`);
      });
    }
  }
});
