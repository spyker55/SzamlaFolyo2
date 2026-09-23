import { describe, expect, test } from 'vitest';
import { datumErtelmez, datum, datumIdo } from './ido.ts';

describe('datumErtelmez', () => {
  test('elfogadja a kétféle dátumírást', () => {
    expect(datumErtelmez('2026-03-14')).toBe('2026-03-14');
    expect(datumErtelmez('2026.03.14.')).toBe('2026-03-14');
    expect(datumErtelmez('2026. 03. 14.')).toBe('2026-03-14');
    expect(datumErtelmez('2026.3.4')).toBe('2026-03-04');
    expect(datumErtelmez('2026/03/14')).toBe('2026-03-14');
  });

  /** A nem létező nap nem dátum — a `2026-02-31` némán március 3-ává válna. */
  test('a nem létező napot elutasítja', () => {
    expect(datumErtelmez('2026-02-31')).toBeNull();
    expect(datumErtelmez('2026-13-01')).toBeNull();
    expect(datumErtelmez('nincs dátum')).toBeNull();
    expect(datumErtelmez('')).toBeNull();
    expect(datumErtelmez(null)).toBeNull();
  });

  test('a szökőnapot viszont ismeri', () => {
    expect(datumErtelmez('2024-02-29')).toBe('2024-02-29');
    expect(datumErtelmez('2026-02-29')).toBeNull();
  });
});

describe('megjelenítés budapesti idő szerint', () => {
  test('a dátum magyar alakban jön', () => {
    expect(datum('2026-03-14T10:00:00Z')).toBe('2026. 03. 14.');
    expect(datum(null)).toBe('–');
  });

  /**
   * Az adatbázisban minden idő UTC, a képernyőn budapesti. Nyáron ez +2 óra:
   * a 23:30 UTC már a következő nap 01:30 Budapesten.
   */
  test('az UTC-ből budapesti időt csinál, a napváltással együtt', () => {
    expect(datumIdo('2026-07-14T23:30:00Z')).toBe('2026. 07. 15. 01:30');
    // Télen +1 óra.
    expect(datumIdo('2026-01-14T23:30:00Z')).toBe('2026. 01. 15. 00:30');
  });
});
