import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { csomagSorrend, szamlafolyo } from './szamlafolyo.ts';

/**
 * A fejszámok két helyen élnek, és ez a teszt az ára.
 *
 * # Miért van egyáltalán két példány
 *
 * A számok itt, a configban születnek — ott, ahol az árak és a keretek is. A
 * **kikényszerítés** viszont az adatbázisba való: a helyet a
 * `meghivot_letrehoz()` és a `meghivot_elfogad()` foglalja el, és egy szabály
 * ott ér valamit, ahol az írás történik. (Ezt a Stripe-vízjel köre tanította
 * meg: a javítás akkor lett jó, amikor az SQL-be került, nem a függvénybe.)
 *
 * A két példány veszélye a **csendes** elcsúszás: valaki átírja a Flow
 * fejszámát 5-ről 8-ra a configban, a nyitólap már nyolcat hirdet, az
 * adatbázis viszont ötnél megállítja a meghívót — és ezt senki nem veszi
 * észre, amíg egy ügyfél be nem ütközik.
 *
 * Ezért ez a teszt **kiolvassa a migrációból** a tényleges SQL-számokat, és
 * összeveti a configgal. Nem a szándékot méri, hanem a szöveget.
 *
 * ⚠️ Ha valaha a migrációs fájl formája változik (például táblává alakul a
 * `case`), ez a teszt **elbukik, nem hallgat el** — a hibaüzenet megmondja,
 * mit keresett. Ez szándékos: egy néma őr rosszabb a hiányzónál.
 */

const MIGRACIO = 'supabase/migrations/20260920000200_hely_korlat.sql';

const sql = readFileSync(MIGRACIO, 'utf8');

/** A `when '<kulcs>' then <szám|null>` ágak a `belso.csomag_helyek`-ből. */
function sqlHelyek(): Map<string, number | null> {
  const talalatok = [...sql.matchAll(/when\s+'([a-z_]+)'\s+then\s+(\d+|null)/g)];

  expect(
    talalatok.length,
    `A ${MIGRACIO} fájlban nem találtam \`when '<kulcs>' then <szám>\` ágakat. ` +
      'Ha a migráció alakja változott, ezt a tesztet is igazítani kell.',
  ).toBeGreaterThan(0);

  const parok = new Map<string, number | null>();

  for (const talalat of talalatok) {
    const kulcs = talalat[1] ?? '';
    const ertek = talalat[2] ?? '';

    parok.set(kulcs, ertek === 'null' ? null : Number(ertek));
  }

  return parok;
}

describe('a fejszámok nem csúszhatnak el a config és az SQL között', () => {
  it('mindhárom csomag fejszáma egyezik', () => {
    const sqlbol = sqlHelyek();

    for (const kulcs of csomagSorrend) {
      const csomag = szamlafolyo.csomagok[kulcs];

      expect(
        sqlbol.has(csomag.lookupKulcs),
        `A(z) ${csomag.nev} csomag (${csomag.lookupKulcs}) nincs benne a ${MIGRACIO} ` +
          'fájl `belso.csomag_helyek` ágai között — az adatbázis nem ismeri a fejszámát.',
      ).toBe(true);

      expect(
        sqlbol.get(csomag.lookupKulcs),
        `A(z) ${csomag.nev} fejszáma a configban ${String(csomag.felhasznalok)}, ` +
          `az SQL-ben ${String(sqlbol.get(csomag.lookupKulcs))}. ` +
          'A kettőnek egyeznie kell — a nyitólap az egyiket hirdeti, a meghívó a ' +
          'másikat kényszeríti ki.',
      ).toBe(csomag.felhasznalok);
    }
  });

  /** A próbaidő fejszáma a `belso.helyek()` `else` ágán ül. */
  it('a próbaidő fejszáma egyezik', () => {
    const talalat = /else\s+(\d+)\s*--\s*probaido/.exec(sql);

    expect(
      talalat,
      `A ${MIGRACIO} fájlban nem találtam az \`else <szám> -- probaido\` ágat.`,
    ).not.toBeNull();

    expect(
      Number(talalat?.[1]),
      `A próbaidő fejszáma a configban ${String(szamlafolyo.proba.felhasznalok)}, ` +
        `az SQL-ben ${String(talalat?.[1])}.`,
    ).toBe(szamlafolyo.proba.felhasznalok);
  });

  /**
   * Az ismeretlen kulcs a **legkisebb** csomag fejszámát kapja, soha nem
   * korlátlant. Ez szó szerint a `keret.ts` 3. szabálya, és ugyanaz az indok: a
   * hibás irány itt a szigorúbb.
   */
  it('az ismeretlen kulcs a legkisebb csomag fejszámát kapja', () => {
    const talalat = /else\s+(\d+)\s*--\s*ismeretlen/.exec(sql);

    expect(
      talalat,
      `A ${MIGRACIO} fájlban nem találtam az \`else <szám> -- ismeretlen\` ágat.`,
    ).not.toBeNull();

    const legkisebb = csomagSorrend
      .map((k) => szamlafolyo.csomagok[k])
      .reduce((a, b) => (a.dokumentumok <= b.dokumentumok ? a : b));

    expect(
      Number(talalat?.[1]),
      `Az ismeretlen kulcs ${String(talalat?.[1])} helyet kap, a legkisebb csomag ` +
        `(${legkisebb.nev}) viszont ${String(legkisebb.felhasznalok)}-t ad.`,
    ).toBe(legkisebb.felhasznalok);
  });
});
