import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CSENDES_POLL_MS,
  frissitesiUtem,
  RITKA_POLL_MS,
  SURU_ABLAK_MS,
  SURU_POLL_MS,
} from './frissitesiUtem.ts';

describe('a Beérkező frissítési üteme', () => {
  it('ha semmi nem fut, akkor is figyel – csendesen (az e-mailes út miatt)', () => {
    // 2026-09-23 előtt itt nem volt ütem: az e-mailben érkezett bizonylat csak
    // oldalfrissítésre jelent meg.
    expect(frissitesiUtem(false, 0)).toBe(CSENDES_POLL_MS);
    expect(frissitesiUtem(false, 10 * 60_000)).toBe(CSENDES_POLL_MS);
  });

  it('feldolgozás közben az első fél percben sűrűn', () => {
    expect(frissitesiUtem(true, 0)).toBe(SURU_POLL_MS);
    expect(frissitesiUtem(true, SURU_ABLAK_MS - 1)).toBe(SURU_POLL_MS);
  });

  it('fél perc után ritkábban – egy beragadt sor ne kérdezzen másodpercenként', () => {
    expect(frissitesiUtem(true, SURU_ABLAK_MS)).toBe(RITKA_POLL_MS);
    expect(frissitesiUtem(true, 60 * 60_000)).toBe(RITKA_POLL_MS);
  });

  it('a sebességek sorrendje: sűrű < ritka < csendes', () => {
    // Ha valaki a csendes ütemet a ritka alá venné, a tétlen fül többet
    // kérdezne, mint egy beragadt feldolgozás – fordított prioritás.
    expect(SURU_POLL_MS).toBeLessThan(RITKA_POLL_MS);
    expect(RITKA_POLL_MS).toBeLessThan(CSENDES_POLL_MS);
    // És ne legyen olyan ritka, hogy a felhasználó feladja a várakozást.
    expect(CSENDES_POLL_MS).toBeLessThanOrEqual(30_000);
  });
});

describe('a Beérkező tényleg ezt az ütemet használja', () => {
  // A tiszta függvény csak akkor véd, ha a képernyő őt kérdezi. A régi hiba
  // egy korai `return` volt a hurok elején: tétlen listánál el sem indult.
  const forras = readFileSync(new URL('../kepernyok/Beerkezo.tsx', import.meta.url), 'utf8');

  it('a hurok a frissitesiUtem()-ből veszi az időzítést', () => {
    expect(forras).toContain('frissitesiUtem(dolgozikMeg, Date.now() - kezdet)');
  });

  it('a tétlen lista nem lép ki a hurokból', () => {
    expect(forras).not.toMatch(/if\s*\(\s*!dolgozikMeg\s*\)\s*return/);
  });

  it('rejtett fülön nem kérdez, visszaváltáskor azonnal frissít', () => {
    expect(forras).toContain("document.visibilityState === 'hidden'");
    expect(forras).toContain("addEventListener('visibilitychange'");
    expect(forras).toContain("removeEventListener('visibilitychange'");
  });
});
