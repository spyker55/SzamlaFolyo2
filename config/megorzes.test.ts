import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { szamlafolyo } from './szamlafolyo.ts';

/**
 * A három kísérő megőrzési idő két helyen él — ez a teszt az ára.
 *
 * A szám itt, a configban születik, mert az Adatkezelési tájékoztató innen
 * olvassa: ami a 4. pontban kilencven napot ígér, az ebből a mezőből jön. A
 * **törlést** viszont egy napi SQL-cron végzi, és az nem tud TS-configot
 * olvasni — ugyanaz a tükrözés, mint a fejszámoknál (`config/hely.test.ts`).
 *
 * A veszély itt is a **csendes** elcsúszás, és rosszabb irányba dől, mint a
 * fejszámoknál: ha valaki a configban hatvan napra viszi le, a tájékoztató
 * hatvanat ígér, a cron viszont kilencvenig tart meg adatot. Az nem kényelmi
 * eltérés, hanem egy megszegett adatvédelmi ígéret — pontosan az a hibafajta,
 * amiért ez a projekt a számokat egy helyen tartja.
 *
 * A teszt ezért **a migráció szövegét olvassa**, nem a szándékot.
 */

const MIGRACIO = 'supabase/migrations/20260920000400_adattakaritas.sql';

const sql = readFileSync(MIGRACIO, 'utf8');

/** A `<nev> constant integer := <szám>;` deklarációk a takarító függvényből. */
function sqlNapok(): Map<string, number> {
  const talalatok = [...sql.matchAll(/(\w+)\s+constant\s+integer\s*:=\s*(\d+)\s*;/g)];

  expect(
    talalatok.length,
    `A ${MIGRACIO} fájlban nem találtam \`… constant integer := <szám>;\` sorokat. ` +
      'Ha a migráció alakja változott, ezt a tesztet is igazítani kell.',
  ).toBeGreaterThanOrEqual(3);

  return new Map(talalatok.map((t) => [t[1] as string, Number(t[2])]));
}

describe('megőrzési idők: a config és a takarító cron együtt mozog', () => {
  const napok = sqlNapok();

  const parok: readonly [string, string, number][] = [
    ['meghivoNap', 'meghivo_nap', szamlafolyo.megorzes.meghivoNap],
    ['levelNaploNap', 'level_nap', szamlafolyo.megorzes.levelNaploNap],
    ['nyersValaszNap', 'nyers_nap', szamlafolyo.megorzes.nyersValaszNap],
  ];

  for (const [configNev, sqlNev, ertek] of parok) {
    it(`${configNev} = ${sqlNev}`, () => {
      expect(
        napok.get(sqlNev),
        `A(z) ${configNev} a configban ${ertek} nap, az SQL-ben ${String(napok.get(sqlNev))}. ` +
          'Az Adatkezelési tájékoztató a configot idézi, a törlést viszont az SQL végzi — ' +
          'a kettő eltérése megszegett ígéret, nem stílus kérdése.',
      ).toBe(ertek);
    });
  }

  it('a takarítás mindhárom adatkört érinti', () => {
    // „Találunk-e egyáltalán valamit": ha egy adatkör kiesik a függvényből, a
    // tájékoztató attól még ígérné a törlését.
    for (const tabla of ['company_invites', 'inbound_emails', 'document_extractions']) {
      expect(sql.includes(tabla), `A takarításból hiányzik: ${tabla}`).toBe(true);
    }
  });

  it('a kiolvasás sorát nem törli, csak a nyers választ üríti', () => {
    // A keret ezekből a sorokból számol (a terv 1. szabálya). Ha valaha
    // `delete from public.document_extractions` kerülne ide, a havi keret
    // utólag visszaadhatóvá válna — ezért áll itt külön állítás.
    expect(/delete\s+from\s+public\.document_extractions/i.test(sql)).toBe(false);
    expect(/update\s+public\.document_extractions\s+set\s+raw_response\s*=\s*null/i.test(sql)).toBe(
      true,
    );
  });
});
