import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kiolvasasJelzes, UJRAPROBALAS_SZOVEG } from './kiolvasasJelzes.ts';

describe('a kiolvasási hiba jelzése a Beérkezőben', () => {
  const HIBA = 'A modell üres választ adott.';

  it('hiba nélkül nincs jelzés', () => {
    expect(kiolvasasJelzes('feltoltve', null)).toBeNull();
    expect(kiolvasasJelzes('ellenorzesre_var', '')).toBeNull();
  });

  it('újrapróbálás közben semleges, és nem a nyers hibát mutatja', () => {
    // 2026-09-23: egy átmeneti szolgáltatói hiba után ~20 s-ig piros hiba
    // állt egy bizonylaton, ami utána hibátlanul elkészült.
    for (const allapot of ['feltoltve', 'feldolgozas_alatt']) {
      expect(kiolvasasJelzes(allapot, HIBA)).toEqual({ szoveg: UJRAPROBALAS_SZOVEG, sulyos: false });
    }
  });

  it('végleges hibánál piros, a valódi üzenettel', () => {
    expect(kiolvasasJelzes('hiba', HIBA)).toEqual({ szoveg: HIBA, sulyos: true });
  });

  it('a Beérkező ezt a döntést használja, nem a nyers mezőt', () => {
    const forras = readFileSync(new URL('../kepernyok/Beerkezo.tsx', import.meta.url), 'utf8');

    expect(forras).toContain('kiolvasasJelzes(sor.status, sor.error)');
    expect(forras).not.toMatch(/\{sor\.error\}/);
  });
});
