import { describe, expect, test } from 'vitest';
import { biztosanRossz, ervenyes, formaz, torzsszam } from './adoszam.ts';

describe('ervenyes', () => {
  /** Valódi, nyilvános adószámok — az algoritmust ezeken kötjük le. */
  test('valódi adószámokat elfogad', () => {
    expect(ervenyes('10773381-2-44')).toBe(true);
    expect(ervenyes('10537914-4-44')).toBe(true);
    expect(ervenyes('10773381')).toBe(true);
  });

  test('elrontott ellenőrző számjegyet elutasít', () => {
    expect(ervenyes('10773382-2-44')).toBe(false);
    expect(ervenyes('12345678-2-42')).toBe(false);
  });

  test('érvénytelen ÁFA-kódot elutasít', () => {
    // Ugyanaz a törzsszám, de a 9. jegy nem lehet 0 vagy 6.
    expect(ervenyes('10773381-0-44')).toBe(false);
    expect(ervenyes('10773381-6-44')).toBe(false);
  });
});

describe('formázás és törzsszám', () => {
  test('a tagolást helyreteszi', () => {
    expect(formaz('107733812 44')).toBe('10773381-2-44');
    expect(formaz('   ')).toBeNull();
  });

  /**
   * A törzsszám azonosítja az adóalanyt: ugyanaz a cég szerepelhet
   * `11176165-2-10` és `HU11176165` alakban is ugyanabban a hónapban.
   */
  test('a törzsszám az első nyolc jegy', () => {
    expect(torzsszam('10773381-2-44')).toBe('10773381');
    expect(torzsszam('HU10773381')).toBe('10773381');
    expect(torzsszam('123')).toBeNull();
  });
});

describe('biztosanRossz — csak azt jelöli, ami biztosan rossz', () => {
  /**
   * Külföldi vagy EU-s azonosító nem magyar alakú — egy téves validátor soha
   * ne álljon egy valódi partner útjába.
   */
  test('külföldi azonosítót nem minősít rossznak', () => {
    expect(biztosanRossz('ATU12345678')).toBe(false);
    expect(biztosanRossz('DE 811 122 233')).toBe(false);
    expect(biztosanRossz(null)).toBe(false);
    expect(biztosanRossz('')).toBe(false);
  });

  test('magyar alakú rossz számot megjelöl', () => {
    expect(biztosanRossz('12345678-2-42')).toBe(true);
    expect(biztosanRossz('10773381-2-44')).toBe(false);
  });
});
