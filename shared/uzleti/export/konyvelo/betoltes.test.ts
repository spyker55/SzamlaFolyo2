import { describe, expect, it } from 'vitest';
import { kicsomagol } from '../tesztZip.ts';
import { alapBeallitas } from './beallitas.ts';
import { BETOLTES } from './betoltes.ts';
import { KULCS_FAJLOK, kulcs } from './kulcs.ts';
import { NOVITAX_FAJLOK, novitax } from './novitax.ts';

/**
 * A felület azt mondja: „a szamla.csv-t válaszd, a partner.csv maradjon
 * mellette". Ez csak akkor igaz, ha a ZIP-ben pontosan ezek a fájlok vannak,
 * és a lépések mindegyiket megnevezik.
 */

const lepesek = (p: keyof typeof BETOLTES) => BETOLTES[p].join('\n');

describe('betöltési lépések', () => {
  it('a Novitax-ZIP pontosan azokat a fájlokat tartalmazza, amelyeket a lépések megneveznek', async () => {
    const fajlok = kicsomagol(await novitax([], alapBeallitas(), new Map()));
    expect([...fajlok.keys()]).toEqual(Object.values(NOVITAX_FAJLOK));
    for (const nev of fajlok.keys()) expect(lepesek('novitax')).toContain(`„${nev}”`);
  });

  it('a Kulcs-ZIP pontosan azokat a fájlokat tartalmazza, amelyeket a lépések megneveznek', async () => {
    const fajlok = kicsomagol(await kulcs([], alapBeallitas(), new Map()));
    expect([...fajlok.keys()]).toEqual(Object.values(KULCS_FAJLOK));
    for (const nev of fajlok.keys()) expect(lepesek('kulcs')).toContain(`„${nev}”`);
  });

  it('a ZIP-es programoknál az első lépés a kibontás', () => {
    for (const p of ['novitax', 'kulcs'] as const) expect(BETOLTES[p][0]).toMatch(/^Bontsd ki a letöltött ZIP-et/);
  });
});
