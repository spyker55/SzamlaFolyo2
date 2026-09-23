import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A `kiolvas` hibaága (2026-09-23) — forrásszintű őr, mert a `Deno.serve`
 * Node alatt nem fut. Két dolgot rögzít, amiről a tiszta modul
 * (`openrouter.ts`) nem tud: hogy a nyom **el is jut** a kiolvasási sorig, és
 * hogy az azonnali újrapróbálás csak az első kudarc után indul.
 */

const FORRAS = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const CATCH = FORRAS.slice(
  FORRAS.indexOf("const nyom = hiba instanceof KiolvasasHiba ? hiba.nyom : null;"),
  FORRAS.indexOf('async function azonnalUjra'),
);

describe('a kiolvasás hibaága', () => {
  it('a KiolvasasHiba típusa nem vész el útközben', () => {
    // Egy korábbi `catch` sima Error-rá alakította, és vele a nyomot is eldobta.
    expect(FORRAS).not.toMatch(/instanceof KiolvasasHiba\)\s*throw new Error\(/);
  });

  it('a válasz nyoma a kiolvasási sorba kerül', () => {
    expect(CATCH.length).toBeGreaterThan(500);
    expect(CATCH).toContain('raw_response: nyom?.nyers ?? null');
    expect(CATCH).toContain('model_version: nyom?.futtatottModell ?? null');
    expect(CATCH).toContain('output_tokens: nyom?.kimenetToken ?? null');
  });

  it('a napló a generációazonosítót viszi, a választ nem', () => {
    expect(CATCH).toContain("esemeny: 'kiolvasas_hiba'");
    expect(CATCH).toContain('generacio: nyom?.generacioId ?? null');
    expect(CATCH).not.toMatch(/console\.\w+\([^)]*nyom\??\.nyers/);
  });

  it('azonnal csak az első kudarc után próbál újra', () => {
    expect(CATCH).toMatch(/if \(ujra && dokumentum\.attempts === 1\) \{\s*await azonnalUjra\(db, dokumentum\.id\);/);
  });
});
