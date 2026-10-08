import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bizonylatszamKulcs, bizonylatszamSzerepelt } from './bizonylatszam.ts';

describe('a bizonylatszám összevetési kulcsa', () => {
  it.each([
    // A 2026-10-08-i eset alakja (kitalált szám): rés a betűk és a számok között.
    ['ABCDE 1234567', 'ABCDE1234567'],
    ['abcde1234567', 'ABCDE1234567'],
    ['SZ-2026/0042', 'SZ20260042'],
    ['SZ 2026 / 0042', 'SZ20260042'],
    ['SZ–2026_0042', 'SZ20260042'],
    ['SZ.2026.0042', 'SZ20260042'],
    // nem törő szóköz és teljes szélességű számjegy (NFKC)
    ['ABC １２３', 'ABC123'],
    ['ő-123', 'Ő123'],
  ])('%s → %s', (be, ki) => {
    expect(bizonylatszamKulcs(be)).toBe(ki);
  });

  it('a vezető nulla számít: a 0012 és a 12 két szám', () => {
    expect(bizonylatszamKulcs('0012')).not.toBe(bizonylatszamKulcs('12'));
  });

  it('a csupa elválasztó és az üres nem kulcs', () => {
    expect(bizonylatszamKulcs(' - / ')).toBeNull();
    expect(bizonylatszamKulcs('')).toBeNull();
    expect(bizonylatszamKulcs(null)).toBeNull();
    expect(bizonylatszamKulcs(undefined)).toBeNull();
  });
});

describe('szerepelt-e már', () => {
  it('a szóközben eltérő szám ugyanaz', () => {
    expect(bizonylatszamSzerepelt('ABCDE1234567', ['XYZ-1', 'ABCDE 1234567'])).toBe(true);
  });

  it('a más szám más', () => {
    expect(bizonylatszamSzerepelt('ABCDE1234568', ['ABCDE 1234567'])).toBe(false);
  });

  it('üres mostani szám soha nem „már látott" – két hiányzó szám nem egyezés', () => {
    expect(bizonylatszamSzerepelt(null, [null, ''])).toBe(false);
    expect(bizonylatszamSzerepelt('', [''])).toBe(false);
  });
});

describe('az előzménykapu ezt használja', () => {
  const forras = readFileSync(
    join(import.meta.dirname, '..', '..', 'supabase', 'functions', 'kiolvas', 'elozmeny.ts'),
    'utf8',
  );

  it('a bizonylatszámot írásmód nélkül veti össze', () => {
    expect(forras).toMatch(/bizonylatszamMarLatott: bizonylatszamSzerepelt\(\s*mezok\.doc_number,/);
  });

  it('betű szerinti doc_number-összevetés nincs benne', () => {
    expect(forras).not.toMatch(/doc_number\s*===|===\s*\w+\.doc_number/);
  });
});
