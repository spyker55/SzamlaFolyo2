import { describe, expect, test } from 'vitest';
import { oldalakbol, szabaly } from './kredit.ts';

/**
 * Az oldalalapú fair-use szabály.
 *
 * Ez pénzt mozgat, ezért a határok mindkét oldalát külön állítjuk: a `<=` és a
 * `<` közti tévedés itt azt jelenti, hogy egy hétköznapi számla hirtelen két
 * kreditet fogyaszt.
 */
describe('oldalakbol', () => {
  /** A hétköznapi eset: a fair-use szabály nem érintheti a normál számlát. */
  test('a normál számla egy kredit', () => {
    for (const oldal of [1, 2, 3, 4, 5]) {
      expect(oldalakbol(oldal), `${oldal} oldal`).toBe(1);
    }
  });

  /** A határon túl az első megkezdett oldal is új kreditet nyit. */
  test('a határ fölött növekszik', () => {
    expect(oldalakbol(6)).toBe(2);
    expect(oldalakbol(10)).toBe(2);
    expect(oldalakbol(11)).toBe(3);
  });

  /** A doksi példája: nyolcvan oldal nem lehet egy kredit. */
  test('a nyolcvan oldalas köteg', () => {
    expect(oldalakbol(80)).toBe(16);
  });

  /** Amiről nem tudjuk, az egy: bizonytalanságból nem számlázunk többet. */
  test('az ismeretlen oldalszám egy kredit', () => {
    expect(oldalakbol(null)).toBe(1);
    expect(oldalakbol(undefined)).toBe(1);
    expect(oldalakbol(0)).toBe(1);
    expect(oldalakbol(-3)).toBe(1);
  });

  test('a határ átállítható', () => {
    expect(oldalakbol(10, 10)).toBe(1);
    expect(oldalakbol(80, 10)).toBe(8);
  });

  /** Nullás beállítás nullával osztana — a `hatar()` ezért véd. */
  test('a nullás beállítás nem ejti el', () => {
    expect(oldalakbol(80, 0)).toBe(80);
  });
});

describe('szabaly', () => {
  /**
   * Ez a mondat az árlistán is ott áll. Egy forrásból olvassa a nyitólap, a
   * Beállítások és a keretszámolás — marketingszövegbe kézzel beírt szám
   * előbb-utóbb elcsúszik attól, amit a rendszer valóban ad.
   */
  test('a felületre kiírt mondat a beállított határt mondja', () => {
    expect(szabaly()).toBe(
      'Az első 5 oldal egy dokumentum; e fölött minden megkezdett 5 oldal még egy.',
    );
    expect(szabaly(10)).toContain('Az első 10 oldal');
  });
});
