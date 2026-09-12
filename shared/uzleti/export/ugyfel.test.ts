import { describe, expect, test } from 'vitest';
import { ugyfele, ugyfelek } from './ugyfel.ts';
import { bizonylatFajlnev, biztonsagos, exportFajlnev } from './nevek.ts';

/**
 * Az esetek a régi `tests/Feature/ExportUgyfelSzuroTest.php`-ból.
 *
 * Ez az a képesség, ami miatt egy könyvelőiroda **egyetlen** fiókban tudja
 * feldolgozni az összes ügyfelét.
 */

describe('ugyfele', () => {
  /**
   * A törzsszám dönt, nem a leírt alak: ugyanaz a cég szerepelhet
   * `11176165-2-10` és `HU11176165` alakban is ugyanabban a hónapban.
   */
  test('a törzsszám dönt, nem a leírt alak', () => {
    expect(ugyfele({ customer_tax_number: '11176165-2-10' }, '11176165')).toBe(true);
    expect(ugyfele({ customer_tax_number: 'HU11176165' }, '11176165')).toBe(true);
    expect(ugyfele({ customer_tax_number: '11176165-4-13' }, '11176165')).toBe(true);
    expect(ugyfele({ customer_tax_number: '10773381-2-44' }, '11176165')).toBe(false);
  });

  /**
   * A könyvelő ügyfele a bejövő számlán a vevő, a kimenőn a szállító —
   * ugyanannak az ügyfélnek a papírjai. Aki az ügyfelét választja, mindkettőt
   * várja, nem a felét.
   */
  test('a kimenő számla is bekerül', () => {
    expect(
      ugyfele(
        { supplier_tax_number: '11176165-2-10', customer_tax_number: '10773381-2-44' },
        '11176165',
      ),
    ).toBe(true);
  });

  test('adószám nélküli bizonylat senkihez nem tartozik', () => {
    expect(ugyfele({ customer_tax_number: null, supplier_tax_number: null }, '11176165')).toBe(
      false,
    );
  });
});

describe('ugyfelek', () => {
  /**
   * A lista a **vevő** oldalról áll össze. A szállítókat is felvenni azt
   * jelentené, hogy minden beszállító megjelenik benne — a lista
   * használhatatlanul hosszú lenne, és nem az ügyfeleket mutatná.
   */
  test('a lista a vevő oldalról áll össze', () => {
    const lista = ugyfelek([
      { customer_tax_number: '11176165-2-10', customer_name: 'Ügyfél Kft.' },
      {
        supplier_tax_number: '10773381-2-44',
        supplier_name: 'Beszállító Zrt.',
        customer_tax_number: '11176165-2-10',
        customer_name: 'Ügyfél Kft.',
      },
    ]);

    expect(lista).toEqual([{ torzsszam: '11176165', cimke: 'Ügyfél Kft. (11176165-2-10)' }]);
  });

  test('ugyanaz az ügyfél egyszer szerepel, akárhány alakban jött', () => {
    const lista = ugyfelek([
      { customer_tax_number: '11176165-2-10', customer_name: 'Ügyfél Kft.' },
      { customer_tax_number: 'HU11176165', customer_name: 'ÜGYFÉL KFT' },
    ]);

    expect(lista.length).toBe(1);
  });

  test('név nélkül az adószám a címke', () => {
    expect(ugyfelek([{ customer_tax_number: '11176165-2-10', customer_name: null }])[0]?.cimke).toBe(
      '11176165-2-10',
    );
  });

  test('a lista névsorban áll', () => {
    const lista = ugyfelek([
      { customer_tax_number: '10773381-2-44', customer_name: 'Zebra Kft.' },
      { customer_tax_number: '11176165-2-10', customer_name: 'Alma Kft.' },
    ]);

    expect(lista.map((u) => u.torzsszam)).toEqual(['11176165', '10773381']);
  });
});

describe('nevek', () => {
  /**
   * Egy fájlnév átmegy egy böngészőn, egy letöltési mappán és néha egy Windows
   * könyvtáron — a lánc egyik szeme biztosan nem bírja az ékezetet.
   */
  test('az ékezeteket leszedi', () => {
    expect(biztonsagos('Árvíztűrő Kft.')).toBe('Arvizturo-Kft');
    expect(biztonsagos('  ')).toBe('');
  });

  test('az export fájlneve a cégből és az időpontból áll', () => {
    const nev = exportFajlnev('Példa Kft.', 'xlsx', new Date(2026, 2, 14, 9, 32));

    expect(nev).toBe('szamlafolyo-Pelda-Kft-2026-03-14-0932.xlsx');
  });

  test('név nélküli cégnél is marad használható fájlnév', () => {
    expect(exportFajlnev('...', 'csv', new Date(2026, 0, 1, 0, 0))).toBe(
      'szamlafolyo-export-2026-01-01-0000.csv',
    );
  });

  /** A bizonylatszám a beszédes név — az eredeti gyakran `scan0012.pdf`. */
  test('a ZIP-ben a bizonylatszám a fájlnév', () => {
    expect(bizonylatFajlnev('SZ-2026/1', 'scan0012.pdf', 'abcdef12-0000')).toBe('SZ-2026-1.pdf');
    expect(bizonylatFajlnev(null, 'scan.jpg', 'abcdef12-0000')).toBe('irat-abcdef12.jpg');
    expect(bizonylatFajlnev('SZ-1', null, 'abcdef12-0000')).toBe('SZ-1.pdf');
  });
});
