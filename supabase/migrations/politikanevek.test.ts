import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A migrációlánc elcsúszás-őre.
 *
 * # Mit fog meg, és miért pont ezt
 *
 * 2026-09-21-én derült ki, hogy a `20260912000400_belso_sema.sql`
 * **huszonnyolc** `drop policy`-je olyan nevekre mutatott, amiket a repó
 * egyetlen korábbi migrációja sem hozott létre: a lánc ékezetes neveket
 * gyártott, a dobások viszont ékezetmenteseket vártak. Élesben ez sosem sült
 * el, mert ott a politikák ékezet nélkül jöttek létre — a **repó** viszont
 * ettől kezdve nem volt lejátszható: egy friss adatbázison (`supabase db
 * reset`, új branch, újraépítés) a migráció az első dobásnál elhasalt volna.
 *
 * Ez a hibaosztály csendes: amíg csak az élő adatbázisra alkalmazunk, semmi
 * nem jelez. Egyetlen olcsó mérőeszköz van rá, és ez az.
 *
 * ⚠️ **Csak a szó szerinti utasításokat modellezzük.** A `do $$ … $$` blokkból
 * futtatott, név nélküli dobásokat (amiket a 20260918000100 vezetett be, majd
 * a 20260912000400 is átvett) ez a teszt nem látja — de nem is kell: azok
 * pont attól biztonságosak, hogy nem névre hivatkoznak. A szabály tehát szűk
 * és pontos: **ami nevet mond ki, annak a névnek léteznie kell.**
 */

const MAPPA = new URL('.', import.meta.url).pathname;

const LETREHOZ = /create\s+policy\s+"([^"]+)"\s*\n?\s*on\s+([a-z_]+\.[a-z_]+)/gi;
const DOB = /drop\s+policy\s+(if\s+exists\s+)?"([^"]+)"\s+on\s+([a-z_]+\.[a-z_]+)/gi;

/** A migrációk időrendben — a fájlnév prefixe adja a sorrendet. */
function migraciok(): { nev: string; sql: string }[] {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nev) => ({ nev, sql: readFileSync(join(MAPPA, nev), 'utf8') }));
}

describe('a migrációlánc lejátszható', () => {
  it('minden nevesített `drop policy` létező politikára mutat', () => {
    const letezo = new Set<string>();
    const bajok: string[] = [];

    for (const { nev, sql } of migraciok()) {
      // A sorrend a fájlon belül is számít, ezért egy menetben olvassuk.
      const utasitasok = [...sql.matchAll(/(create|drop)\s+policy[^;]*/gi)];

      for (const [reszlet] of utasitasok) {
        LETREHOZ.lastIndex = 0;
        DOB.lastIndex = 0;

        const l = LETREHOZ.exec(reszlet);
        const d = DOB.exec(reszlet);

        if (d !== null) {
          const kulcs = `${d[3]}::${d[2]}`;
          if (!letezo.has(kulcs)) {
            bajok.push(`${nev}: drop policy "${d[2]}" on ${d[3]} — ilyen politika nincs`);
          }
          letezo.delete(kulcs);
        } else if (l !== null) {
          letezo.add(`${l[2]}::${l[1]}`);
        }
      }
    }

    expect(bajok).toEqual([]);
  });

  it('a minta tényleg talál politikákat — különben a fenti állítás üresen menne át', () => {
    const osszes = migraciok()
      .map(({ sql }) => [...sql.matchAll(/create\s+policy\s+"/gi)].length)
      .reduce((a, b) => a + b, 0);

    expect(osszes).toBeGreaterThan(20);
  });
});
