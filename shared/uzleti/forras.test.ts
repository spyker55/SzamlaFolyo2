import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORRASOK, forrasKod } from './forras.ts';

const GYOKER = new URL('../../', import.meta.url).pathname;
const olvas = (ut: string) => readFileSync(GYOKER + ut, 'utf8');

const MIGRACIO = olvas('supabase/migrations/20260924000100_honnan_hallottal.sql');

describe('„Honnan hallottál rólunk?"', () => {
  it('az adatbázis kényszere pontosan ugyanazokat a kódokat engedi, mint a felület', () => {
    const kenyszer = /heard_from in \(([^)]*)\)/.exec(MIGRACIO);
    expect(kenyszer, 'Nem találom a heard_from ellenőrző kényszerét a migrációban.').not.toBeNull();

    const sqlKodok = [...kenyszer![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(sqlKodok).toEqual(FORRASOK.map((f) => f.kod).sort());
  });

  it('a kódok egyediek, a címkék nem üresek', () => {
    expect(new Set(FORRASOK.map((f) => f.kod)).size).toBe(FORRASOK.length);
    for (const f of FORRASOK) expect(f.cimke.trim()).not.toBe('');
  });

  it('listán kívüli értékből – az üreset is beleértve – `null` lesz', () => {
    expect(forrasKod('konyvelo')).toBe('konyvelo');
    for (const rossz of ['', 'Kovács Péter ajánlotta', 'KONYVELO', 'konyvelo ']) expect(forrasKod(rossz)).toBeNull();
  });

  it('a függvény régi aláírása eldobva, az új elhagyható paraméterrel jön létre, és a jogok megmaradnak', () => {
    // A túlterhelés tiltása: két `ceg_letrehozas` mellett a PostgREST nem tudna választani.
    expect(MIGRACIO).toContain('drop function if exists public.ceg_letrehozas(text, text, text);');
    expect(MIGRACIO).toMatch(/create function public\.ceg_letrehozas\(nev text, adoszam text, aszf_verzio text, forras text default null\)/);
    expect(MIGRACIO).toContain('revoke all on function public.ceg_letrehozas(text, text, text, text) from public, anon;');
    expect(MIGRACIO).toContain('grant execute on function public.ceg_letrehozas(text, text, text, text) to authenticated, service_role;');
    expect(MIGRACIO).toContain("nullif(forras, '')");
  });

  it('az oszlop utólag nem írható: a migráció nem ad rá UPDATE-jogot', () => {
    expect(MIGRACIO).not.toMatch(/grant\s+update[^;]*heard_from/i);
  });

  it('a felület a kódot küldi, szabad szöveget nem kér', () => {
    const felulet = olvas('src/kepernyok/CegLetrehozas.tsx');
    expect(felulet).toContain('forras: forrasKod(forras)');
    expect(felulet).not.toMatch(/<textarea|id="forras"[^>]*type="text"/);
  });

  it('a tájékoztató leírja (Adatkezelés 2.)', () => {
    const adatkezeles = olvas('src/oldalak/jogi/Adatkezeles.tsx');
    expect(adatkezeles).toContain('honnan\n              hallott a SzámlaFolyóról');
    expect(adatkezeles).toContain('Kizárólag összesítve használjuk');
  });
});
