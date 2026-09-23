import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DATUM_MIN_PX, DATUM_RACS } from './datumRacs.ts';

/** Chromiumban, magyar nyelven mérve ennyitől látszik a „2026. 09. 15.” (2026-09-23). */
const MERT_MINIMUM_PX = 140;

describe('a dátummezők rácsa', () => {
  it('egy dátum legalább a mért minimumot kapja, tartalékkal', () => {
    expect(DATUM_MIN_PX).toBeGreaterThanOrEqual(MERT_MINIMUM_PX + 10);
    expect(DATUM_RACS).toContain(`minmax(${DATUM_MIN_PX / 16}rem,1fr)`);
  });

  it('nem fix oszlopszám – ami nem fér el, átcsúszik', () => {
    expect(DATUM_RACS).toContain('repeat(auto-fit,');
    expect(DATUM_RACS).not.toMatch(/grid-cols-\d/);
  });
});

describe('az ellenőrző képernyő tényleg ezt a rácsot használja', () => {
  const forras = readFileSync(new URL('../kepernyok/Ellenorzes.tsx', import.meta.url), 'utf8');

  it('a három dátum a DATUM_RACS-ban ül', () => {
    const datumok = forras.indexOf("(['issue_date', 'fulfillment_date', 'due_date'] as const)");
    expect(datumok).toBeGreaterThan(0);

    const elotte = forras.slice(0, datumok);
    const szulo = elotte.slice(elotte.lastIndexOf('<div className='));
    expect(szulo).toMatch(/^<div className=\{DATUM_RACS\}>/);
  });
});
