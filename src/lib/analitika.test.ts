import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MERT_UTVONALAK, esemenytSzur, utvonalJel } from './analitika.ts';

describe('utvonalJel — a nyilvános tölcsér átmegy', () => {
  it.each(MERT_UTVONALAK)('a(z) %s mérhető', (ut) => {
    expect(utvonalJel(`https://szamlafolyo.hu${ut}`)).toBe(`https://szamlafolyo.hu${ut}`);
  });

  it('a relatív címet is érti, és abszolútat ad vissza', () => {
    expect(utvonalJel('/aszf')).toBe('https://szamlafolyo.hu/aszf');
  });

  it('a záró perjel nem csinál külön oldalt', () => {
    expect(utvonalJel('https://szamlafolyo.hu/aszf/')).toBe('https://szamlafolyo.hu/aszf');
  });

  it('az előnézeti telepítés saját originját megtartja', () => {
    expect(utvonalJel('https://szamla-folyo2.vercel.app/impresszum')).toBe(
      'https://szamla-folyo2.vercel.app/impresszum',
    );
  });
});

describe('utvonalJel — amit soha nem engedünk ki', () => {
  /**
   * ⚠️ Ez a teszt a kör oka. A meghívó tokenje **bemutatóra szóló kulcs**: aki
   * ismeri, beléphet a cégbe. A jelszó-visszaállító token a horgonyban
   * érkezik. Egyik sem mehet ki, semmilyen alakban.
   */
  it('a meghívó tokenje nem megy ki', () => {
    expect(utvonalJel('https://szamlafolyo.hu/meghivo/abcd1234efgh5678')).toBeNull();
  });

  it('a jelszó-beállítás képernyője nem megy ki', () => {
    expect(utvonalJel('https://szamlafolyo.hu/jelszo-beallitas')).toBeNull();
  });

  it.each([
    '/beerkezo',
    '/ellenorzes/8e17a705-e791-49eb-b72b-524fffa1d253',
    '/tetelek',
    '/export',
    '/archivum',
    '/beallitasok',
    '/ceg-letrehozas',
    '/fiok-torles',
  ])('a belépés mögötti %s nem megy ki', (ut) => {
    expect(utvonalJel(`https://szamlafolyo.hu${ut}`)).toBeNull();
  });

  it('az ismeretlen útvonal is néma — ez a fehérlista lényege', () => {
    expect(utvonalJel('https://szamlafolyo.hu/valami-jovobeli-oldal')).toBeNull();
  });

  it('az értelmezhetetlen cím nem dob, hanem hallgat', () => {
    expect(utvonalJel('http://[')).toBeNull();
  });
});

describe('utvonalJel — a lekérdezés és a horgony mindig elvész', () => {
  it('a kampányparaméter nem megy ki', () => {
    expect(utvonalJel('https://szamlafolyo.hu/?utm_source=hirlevel&utm_id=42')).toBe(
      'https://szamlafolyo.hu/',
    );
  });

  /**
   * A tokent itt egy **engedélyezett** útvonalra akasztom rá. Ha csak a tiltott
   * útvonalakon néznénk, a levágást magát sosem mérnénk — azokat a teljes cím
   * eldobása amúgy is megvédi.
   */
  it('a horgonyban lévő token nem szivárog át egy mérhető oldalon sem', () => {
    const eredmeny = utvonalJel('https://szamlafolyo.hu/aszf#access_token=nagyon-titkos-ertek');

    expect(eredmeny).toBe('https://szamlafolyo.hu/aszf');
    expect(eredmeny).not.toContain('nagyon-titkos-ertek');
    expect(eredmeny).not.toContain('access_token');
  });
});

describe('esemenytSzur', () => {
  it('a mérhető oldalt megtisztítva engedi tovább', () => {
    expect(
      esemenytSzur({ type: 'pageview', url: 'https://szamlafolyo.hu/aszf?a=1#b' }),
    ).toEqual({ type: 'pageview', url: 'https://szamlafolyo.hu/aszf' });
  });

  it('a tiltott oldalon null-t ad — vagyis az esemény el sem indul', () => {
    expect(esemenytSzur({ type: 'pageview', url: 'https://szamlafolyo.hu/beerkezo' })).toBeNull();
  });
});

/**
 * # A fehérlista elcsúszása ellen
 *
 * Két irányba romolhat el, és mindkettő némán:
 *
 * 1. Valaki átnevez egy nyilvános útvonalat az `App.tsx`-ben, és a mérés
 *    csendben leáll — a lista egy nem létező címre mutat.
 * 2. Valaki felvesz egy azonosítót hordozó útvonalat, és az valahogy
 *    bekerül a listába.
 *
 * Ezért a teszt az **útvonaltáblából** olvas, nem egy kézzel írt másolatból.
 */
describe('a mért útvonalak és az útvonaltábla együtt mozognak', () => {
  const app = readFileSync(join(import.meta.dirname, '..', 'App.tsx'), 'utf8');
  const utvonalak = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '');

  // A „talál-e egyáltalán" őr: egy elromlott regexre nulla állítás bukna meg,
  // és a teszt zölden hazudna. Ezt a leckét a FUTO_ALLAPOTOK köre tanította.
  it('az App.tsx-ből tényleg kiolvastunk útvonalakat', () => {
    expect(utvonalak.length).toBeGreaterThanOrEqual(15);
  });

  it('minden mért útvonal létezik az útvonaltáblában', () => {
    for (const ut of MERT_UTVONALAK) {
      expect(utvonalak).toContain(ut);
    }
  });

  it('paraméteres útvonal soha nem mérhető', () => {
    const parameteresek = utvonalak.filter((u) => u.includes(':'));

    expect(parameteresek.length).toBeGreaterThan(0);

    for (const minta of parameteresek) {
      expect(utvonalJel(minta.replace(/:[^/]+/g, 'barmilyen-ertek'))).toBeNull();
    }
  });
});
