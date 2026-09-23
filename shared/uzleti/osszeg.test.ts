import { describe, expect, test } from 'vitest';
import { ertelmez, formaz } from './osszeg.ts';

/**
 * A vektorok a régi `tests/Unit/OsszegTest.php`-ból származnak, szó szerint.
 * Az értékük épp az, hogy valódi bizonylatokon derültek ki — nem kitalált
 * esetek.
 */

describe('ertelmez — a kétféle írásmód', () => {
  test.each([
    ['magyar, mindkét jellel', '1.612.900,25', '1612900.25'],
    ['angol, mindkét jellel', '1,612,900.25', '1612900.25'],
    ['magyar, csak vessző', '256,50', '256.50'],
    ['sima egész', '1500', '1500.00'],
    ['nem törhető szóköz csoportosít', '1 612 900', '1612900.00'],
    ['keskeny nem törhető szóköz', '1 612 900,25', '1612900.25'],
    ['sima szóköz csoportosít', '1 612 900', '1612900.00'],
    ['vesszős csoportosítás tizedes nélkül', '1,612,900', '1612900.00'],
    ['pontos csoportosítás tizedes nélkül', '1.612.900', '1612900.00'],
    ['negatív sztornó', '-125 000', '-125000.00'],
    ['pénznem a végén', '12 700 Ft', '12700.00'],
  ])('%s', (_nev, nyers, vart) => {
    const eredmeny = ertelmez(nyers);
    expect(eredmeny.ok, `Nem értelmezte: ${nyers}`).toBe(true);
    expect(eredmeny.ertek).toBe(vart);
  });

  test('az üres érték nem hiba, csak üres', () => {
    expect(ertelmez('')).toEqual({ ok: true, ertek: null });
    expect(ertelmez(null)).toEqual({ ok: true, ertek: null });
  });
});

/**
 * Az egyetlen pont a valóban kétes eset: a `100.000` magyarul százezer, a
 * `256.5` viszont tizedes. Ha ezt elrontjuk, **ezerszeres** hiba kerül a
 * könyvelői exportba.
 */
describe('ertelmez — az egyetlen pont feloldása', () => {
  test.each([
    ['100.000', '100000.00'], // ezres csoport
    ['12.500', '12500.00'], // ezres csoport
    ['256.5', '256.50'], // tizedes
    ['0.500', '0.50'], // tizedes: a nullával kezdődő nem csoport
    ['1234.567', '1234.57'], // tizedes, két jegyre kerekítve
  ])('%s → %s', (nyers, vart) => {
    expect(ertelmez(nyers).ertek).toBe(vart);
  });
});

describe('ertelmez — a hibásat nem nyeli le csendben', () => {
  test.each([
    ['betűk', 'tizenkétezer'],
    ['rossz csoportosítás', '12.34.567'],
    ['két tizedesjel', '1,2,3.4'],
    ['szemét', '--'],
  ])('%s', (_nev, nyers) => {
    const eredmeny = ertelmez(nyers);
    expect(eredmeny.ok, `Hibásnak kellett volna lennie: ${nyers}`).toBe(false);
    expect(eredmeny.ertek).toBeNull();
  });
});

/**
 * Ezt a két esetet a PHP-tesztek nem fedték — ott a nyelv viselkedése volt az,
 * ami most megváltozik. A JS `Math.round()` a `+∞` felé kerekít, a PHP
 * `round()` viszont a nullától elfelé; és a `toFixed` a lebegőpontos
 * ábrázoláson csúszik el.
 */
describe('ertelmez — kerekítés a nyelvváltás csapdáin', () => {
  test('a negatív összeg a nullától elfelé kerekül, nem a plusz végtelen felé', () => {
    // Math.round(-2.5) === -2 volna. A sztornó számla összege negatív, tehát
    // ez nem elméleti eltérés.
    expect(ertelmez('-2,505').ertek).toBe('-2.51');
    expect(ertelmez('-125000,555').ertek).toBe('-125000.56');
  });

  test('az 1,005 fölfelé kerekül, nem lefelé', () => {
    // (1.005).toFixed(2) === '1.00' volna.
    expect(ertelmez('1,005').ertek).toBe('1.01');
    expect(ertelmez('2,675').ertek).toBe('2.68');
  });

  test('az átvitel végigfut az egész részen', () => {
    expect(ertelmez('9,999').ertek).toBe('10.00');
    expect(ertelmez('999999,999').ertek).toBe('1000000.00');
  });

  test('a nulla nem lesz negatív nulla', () => {
    expect(ertelmez('-0,001').ertek).toBe('0.00');
  });

  test('számot is elfogad, nem csak sztringet', () => {
    expect(ertelmez(1612900.25).ertek).toBe('1612900.25');
    expect(ertelmez(0).ertek).toBe('0.00');
    expect(ertelmez(-125000).ertek).toBe('-125000.00');
  });
});

describe('formaz — kiírás magyar írásmód szerint', () => {
  test('a régi teszt esetei', () => {
    expect(formaz('1612900.25')).toBe('1 612 900,25');
    expect(formaz('1500.00')).toBe('1 500');
    expect(formaz('12700', 'HUF')).toBe('12 700 HUF');
    expect(formaz(null)).toBe('–');
  });

  test('a negatív érték előjele megmarad', () => {
    expect(formaz('-125000.00')).toBe('-125 000');
    expect(formaz('-1612900.25')).toBe('-1 612 900,25');
  });

  /**
   * A megjelenítés a tárolt értéket mutatja, nem értelmezi újra: a `100.000`
   * tárolt alakban száz, nem százezer. Az emberi értelmező szabálya csak a
   * beviteli mezőre vonatkozik.
   */
  test('a tárolt alakot nem olvassa újra emberi írásmódként', () => {
    expect(formaz('100.000')).toBe('100');
  });
});
