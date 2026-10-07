import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tarolasNelkul } from './tarolasNelkul.ts';

describe('tarolasNelkul', () => {
  it('minden hívás no-store, a többi beállítás megmarad', async () => {
    const kapott: (RequestInit | undefined)[] = [];
    const hamis = (async (_bemenet: RequestInfo | URL, beallitas?: RequestInit) => {
      kapott.push(beallitas);
      return new Response('{}');
    }) as typeof fetch;

    const f = tarolasNelkul(hamis);
    await f('https://pelda.hu/rest/v1/documents', { method: 'PATCH', headers: { a: 'b' } });
    await f('https://pelda.hu/rest/v1/documents');

    expect(kapott[0]).toEqual({ method: 'PATCH', headers: { a: 'b' }, cache: 'no-store' });
    expect(kapott[1]).toEqual({ cache: 'no-store' });
  });

  it('a hívó sem kapcsolhatja vissza a gyorsítótárat', async () => {
    let kapott: RequestInit | undefined;
    const hamis = (async (_b: RequestInfo | URL, beallitas?: RequestInit) => {
      kapott = beallitas;
      return new Response('{}');
    }) as typeof fetch;

    await tarolasNelkul(hamis)('https://pelda.hu', { cache: 'force-cache' });
    expect(kapott?.cache).toBe('no-store');
  });

  it('a Supabase-kliens ezen a fetch-en át hív', () => {
    const forras = readFileSync(new URL('./supabase.ts', import.meta.url), 'utf8');
    expect(forras).toMatch(/global:\s*\{\s*fetch:\s*tarolasNelkul\(\s*\(\.\.\.a\)\s*=>\s*fetch\(\.\.\.a\)\s*\)/);
  });
});
