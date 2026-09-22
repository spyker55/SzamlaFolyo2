import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Az elfogadó nyilatkozat két dolgot nem veszíthet el, és mindkettő némán
 * romlana el.
 *
 * 1. **Egyetlen példányban létezzen.** A mondat azt rögzíti, mibe egyezett
 *    bele a felhasználó; két másolatból előbb-utóbb két különböző szöveg lesz,
 *    és akkor két felhasználó más-más dologra mondott igent. A teszt ezért azt
 *    is méri, hogy az auth-képernyők **nem** tartanak saját jogi linket.
 * 2. **A linkek új lapon nyíljanak.** Ugyanabban a lapon a nyilatkozat
 *    elolvasása megszakítja a regisztrációt: a jogi oldal fejléce a főoldalra
 *    visz, a beírt adatok elvesznek. Aki elolvassa, amit aláír, rosszabbul
 *    járna — ezt egy `target` attribútum tartja, és egy átrendezés csendben
 *    leszedheti róla.
 */
describe('a jogi linkek nem szakítják meg a félig kitöltött űrlapot', () => {
  const ide = (...reszek: string[]) => join(import.meta.dirname, ...reszek);

  const pipa = readFileSync(ide('FeltetelekPipa.tsx'), 'utf8');

  const kepernyok = ['Regisztracio.tsx', 'Meghivo.tsx'].map((nev) => ({
    nev,
    forras: readFileSync(ide('..', 'kepernyok', 'auth', nev), 'utf8'),
  }));

  /** `<Link … to="/aszf" …>` blokkok az attribútumaikkal együtt. */
  function linkek(forras: string): string[] {
    return [...forras.matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]);
  }

  // A „talál-e egyáltalán" őr: egy elromlott regexre nulla állítás bukna meg,
  // és a teszt zölden hazudna.
  it('a komponensben tényleg ott a két jogi link', () => {
    const jogi = linkek(pipa).filter((l) => /\/aszf|\/adatkezeles/.test(l));

    expect(jogi.length, 'Nem találtam a két jogi linket a FeltetelekPipa.tsx-ben.').toBe(2);
  });

  it('mindkét jogi link új lapon nyílik', () => {
    for (const link of linkek(pipa).filter((l) => /\/aszf|\/adatkezeles/.test(l))) {
      expect(
        link,
        'Egy jogi link ugyanabban a lapon nyílna meg — ettől a félbehagyott ' +
          'regisztráció elveszne. Lásd a FeltetelekPipa.tsx fejlécét.',
      ).toMatch(/target="_blank"/);

      expect(link, 'Az új lapon nyíló link `rel` attribútuma hiányzik.').toMatch(/rel="[^"]*noopener/);
    }
  });

  it('egyik auth-képernyő sem tart saját jogi linket', () => {
    for (const { nev, forras } of kepernyok) {
      expect(
        forras.includes('/aszf') || forras.includes('/adatkezeles'),
        `A(z) ${nev} saját jogi linket tart. A nyilatkozat egyetlen példánya a ` +
          'FeltetelekPipa.tsx — különben két felhasználó más szövegre mond igent.',
      ).toBe(false);
    }
  });

  it('mindkét auth-képernyő a közös komponenst használja', () => {
    for (const { nev, forras } of kepernyok) {
      expect(forras, `A(z) ${nev} nem a FeltetelekPipa-t rendereli.`).toMatch(/<FeltetelekPipa\b/);
    }
  });
  /**
   * ⚠️ **Két út vezet ugyanoda.** A nyilatkozat linkjein kívül a lábléc is ott
   * van a belépés előtti képernyőkön, ugyanazokkal a jogi címekkel — és az
   * ugyanúgy elvinné a félig kitöltött űrlapot. Ezt a böngészős mérés hozta
   * elő: a lapon **két** ÁSZF-link volt, nem egy.
   */
  it('a belépés előtti elrendezés láblécének linkjei is új lapon nyílnak', () => {
    const elrendezes = readFileSync(ide('Elrendezes.tsx'), 'utf8');
    const kezdet = elrendezes.indexOf('export function AuthElrendezes');

    expect(kezdet, 'Nem találtam az AuthElrendezes komponenst.').toBeGreaterThan(-1);

    const torzs = elrendezes.slice(kezdet);
    const hivas = /<LablecLinkek\b[^>]*>/.exec(torzs)?.[0] ?? '';

    expect(hivas, 'Az AuthElrendezes nem rendereli a LablecLinkek-et.').not.toBe('');
    expect(
      hivas,
      'A belépés előtti lábléc jogi linkjei ugyanabban a lapon nyílnának — ' +
        'ettől a félbehagyott regisztráció ugyanúgy elveszne, mint a ' +
        'nyilatkozat linkjeinél.',
    ).toMatch(/\bujLapon\b/);
  });
});
