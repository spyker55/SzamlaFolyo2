import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TILTOTT } from '../../marketing/hirdetes/szovegek.ts';
import { ALAP, OLDALFEJEK, oldalfej } from './oldalfej.ts';

/**
 * Az oldalankénti cím és leírás őre.
 *
 * A keresőben ez az első mondat, amit valaki a SzámlaFolyóról olvas – ugyanaz
 * a mérce vonatkozik rá, mint a hirdetésekre: ne ígérjen többet a terméknél,
 * és férjen ki. Ehhez jön, hogy minden útvonalnak legyen sora, és hogy az
 * `index.html` (amit a kódot nem futtató linkelőnézetek látnak) a főoldallal
 * egyezzen.
 */
const GYOKER = new URL('../..', import.meta.url).pathname;
const app = readFileSync(`${GYOKER}src/App.tsx`, 'utf8');
const index = readFileSync(`${GYOKER}index.html`, 'utf8');

const utvonalak = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '').filter((p) => p !== '*');

function nyilvanosak(): string[] {
  const eleje = app.indexOf('{/* Nyilvános */}');
  const vege = app.indexOf('{/*', eleje + 1);
  return [...app.slice(eleje, vege).matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '');
}

/** Karakterszám kódpontonként. */
const hossz = (s: string) => [...s].length;

describe('minden útvonalnak van fejléce', () => {
  it('anti-vakság: látja az útvonalakat', () => {
    expect(utvonalak.length).toBeGreaterThan(10);
    expect(nyilvanosak().length).toBeGreaterThanOrEqual(5);
  });

  it('a tábla pontosan az App.tsx útvonalait tartalmazza', () => {
    expect(Object.keys(OLDALFEJEK).sort()).toEqual([...utvonalak].sort());
  });

  it('a paraméteres és az ismeretlen cím is a helyes fejlécet kapja', () => {
    expect(oldalfej('/ellenorzes/8f1c2d')).toBe(OLDALFEJEK['/ellenorzes/:id']);
    expect(oldalfej('/meghivo/abc')).toBe(OLDALFEJEK['/meghivo/:token']);
    expect(oldalfej('/ellenorzes/')).toBe(ALAP);
    expect(oldalfej('/nincs-ilyen')).toBe(ALAP);
  });
});

describe('a címek és a leírások', () => {
  const fejek = Object.values(OLDALFEJEK);

  it('minden cím egyedi, a márkanevet hordozza, és kb. 60 karakter alatt marad', () => {
    const cimek = fejek.map((f) => f.cim);
    expect(new Set(cimek).size).toBe(cimek.length);
    for (const c of cimek) {
      expect(c, c).toContain('SzámlaFolyó');
      expect(hossz(c), c).toBeLessThanOrEqual(60);
    }
  });

  it('a nyilvános oldalak leírása egyedi, és a találati listában sem csonkul', () => {
    const leirasok = nyilvanosak().map((u) => OLDALFEJEK[u]?.leiras ?? '');
    expect(new Set(leirasok).size).toBe(leirasok.length);
    for (const l of leirasok) {
      expect(hossz(l), l).toBeGreaterThanOrEqual(70);
      expect(hossz(l), l).toBeLessThanOrEqual(155);
    }
  });

  it.each(TILTOTT.map((t) => [t.minta.source, t] as const))('tiltott ígéret: /%s/', (_, t) => {
    const talalat = fejek.flatMap((f) => [f.cim, f.leiras]).filter((s) => t.minta.test(s));
    expect(talalat, t.miert).toEqual([]);
  });
});

describe('az index.html a főoldallal egyezik', () => {
  // A kódot nem futtató linkelőnézetek (pl. Facebook) ezt látják.
  it('cím', () => {
    expect(index).toContain(`<title>${ALAP.cim}</title>`);
  });

  it('leírás', () => {
    expect(index).toContain(`content="${ALAP.leiras}"`);
    expect(index.match(/name="description"/g)).toHaveLength(1);
  });
});
