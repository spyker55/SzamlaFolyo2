import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Elbukott claim ≠ „más vitte el” (2026-10-07) – forrásszintű őr, mert a
 * `Deno.serve` Node alatt nem fut.
 *
 * Mérve előtte: a claim `PATCH`-e hat napig HTTP 300-at kapott (PGRST201), a
 * függvény a `data === null`-t „kihagyva”-ként adta vissza, és a naplóba egyetlen
 * hibasor sem került.
 */

const FORRAS = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const CLAIM = FORRAS.slice(FORRAS.indexOf('async function claim('), FORRAS.indexOf('class ClaimHiba'));
const FELDOLGOZ = FORRAS.slice(
  FORRAS.indexOf('async function feldolgoz('),
  FORRAS.indexOf('const kezdet = Date.now();', FORRAS.indexOf('async function feldolgoz(')),
);

describe('a claim hibája nem tűnhet el', () => {
  it('anti-vakság: a két szelet megvan', () => {
    expect(CLAIM.length).toBeGreaterThan(300);
    expect(FELDOLGOZ.length).toBeGreaterThan(300);
  });

  it('mindkét claim-lekérdezés hibáját elkapja és dobja', () => {
    expect(CLAIM).toContain('const { data: sorban, error: sorbanHiba } = await db');
    expect(CLAIM).toContain('if (sorbanHiba !== null) throw new ClaimHiba(sorbanHiba);');
    expect(CLAIM).toContain('const { data: ujra, error: ujraHiba } = await db');
    expect(CLAIM).toContain('if (ujraHiba !== null) throw new ClaimHiba(ujraHiba);');
  });

  it('a hibát a feldolgozó naplózza, és nem „kihagyva”-ként adja vissza', () => {
    expect(FELDOLGOZ).toContain("esemeny: 'claim_hiba'");
    expect(FELDOLGOZ).toContain("return { id, allapot: 'claim_hiba', hiba: hiba.message };");
  });

  it('a sorlekérdezés hibája is naplóba kerül', () => {
    const felvehetok = FORRAS.slice(FORRAS.indexOf('async function felvehetok('), FORRAS.indexOf('async function feldolgoz('));
    expect(felvehetok).toContain("esemeny: 'sor_lekerdezes_hiba'");
  });
});
