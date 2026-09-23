/**
 * A jogi szövegek archiválása: `npx vite-node eszkozok/jogiArchivum.ts`
 *
 * A **mostani** `JOGI_VERZIO` alá írja ki a három jogi oldal renderelt
 * szövegét (`jogi-archivum/<verzió>/<dokumentum>.html`), és kiírja a
 * lenyomatokat — ezek kerülnek a `legal_versions` sorába a migrációban.
 *
 * ⚠️ **Meglévő archívumot nem ír felül.** Egy kiadott változat szövege
 * bizonyíték: ha valaki már elfogadta, akkor az a szöveg az, ami volt. Ha a
 * szöveg megváltozott, az **új verzió** — új `JOGI_VERZIO`, új
 * `legal_versions` sor, új mappa. A `src/oldalak/jogi/archivum.test.tsx`
 * pirosra vált, ha a mai szöveg eltér a mai verzió archívumától, tehát az
 * elcsúszás nem marad észrevétlen.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DOKUMENTUMOK, lenyomat, renderel } from '../src/oldalak/jogi/archivum.tsx';
import { JOGI_VERZIO } from '../src/oldalak/jogi/adatok.ts';

const mappa = new URL(`../jogi-archivum/${JOGI_VERZIO}/`, import.meta.url);

mkdirSync(mappa, { recursive: true });

let hiba = false;

for (const dok of DOKUMENTUMOK) {
  const ut = new URL(`${dok}.html`, mappa);
  const szoveg = renderel(dok);

  if (existsSync(ut)) {
    const meglevo = readFileSync(ut, 'utf8');

    if (meglevo !== szoveg) {
      console.error(
        `⛔ ${JOGI_VERZIO}/${dok}.html már archiválva van, és a mai szöveg ELTÉR tőle. ` +
          'Egy kiadott változatot nem írunk felül: vegyél fel új JOGI_VERZIO-t.',
      );
      hiba = true;
      continue;
    }

    console.log(`= ${JOGI_VERZIO}/${dok}.html  ${lenyomat(meglevo)}  (változatlan)`);
    continue;
  }

  writeFileSync(ut, szoveg);
  console.log(`+ ${JOGI_VERZIO}/${dok}.html  ${lenyomat(szoveg)}`);
}

if (hiba) process.exit(1);
