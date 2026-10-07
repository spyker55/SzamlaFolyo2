import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Elbukott lekérdezés ≠ üres lista (2026-10-07).
 *
 * A Beérkező és az Export hat napig üres listát mutatott egy HTTP 300 miatt
 * („nincs bizonylatod”, „0 tétel kerül exportba”), mert mindkettő `data ?? []`-t
 * használt az `error` megnézése nélkül. Forrásszintű őr: a két képernyőnek
 * nincs komponenstesztje, a hiba pedig a kódút hiányában volt, nem a logikában.
 */

const olvas = (ut: string) => readFileSync(new URL(ut, import.meta.url), 'utf8');
const beerkezo = olvas('../kepernyok/Beerkezo.tsx');
const exportKepernyo = olvas('../kepernyok/Export.tsx');
const exportLib = olvas('./export.ts');

describe('Beérkező', () => {
  it('a lista hibáját megnézi, és hiba esetén nem írja felül a sorokat', () => {
    const betoltes = beerkezo.slice(beerkezo.indexOf('const betoltes = useCallback'), beerkezo.indexOf('setSorok(normalizalt);'));
    expect(betoltes).toContain('const { data, error } = await lista();');
    expect(betoltes).toMatch(/if \(error !== null\) \{[^}]*setListaHiba\(true\);[^}]*return;/s);
  });

  it('hiba esetén a hibasáv látszik, nem az üres-lista szöveg', () => {
    expect(beerkezo).toContain('{BEERKEZO_LISTA_HIBA}');
    expect(beerkezo).toContain('listaHiba && sorok.length === 0 ? null : sorok.length === 0 ?');
  });
});

describe('Export', () => {
  it('az exportalhatok elbukott lekérdezésre dob, nem üres listát ad', () => {
    const fv = exportLib.slice(exportLib.indexOf('export async function exportalhatok'), exportLib.indexOf('/** Az ügyfélszűrő'));
    expect(fv).toContain('const { data, error } = await kerdes;');
    expect(fv).toMatch(/if \(error !== null\) \{[^}]*throw new Error/s);
  });

  it('a képernyő hiba esetén a hibaszöveget mutatja, nem a „0 tétel”-t', () => {
    expect(exportKepernyo).toMatch(/: listaHiba\s*\?\s*EXPORT_LISTA_HIBA/);
    expect(exportKepernyo).toContain('setListaHiba(lista === null);');
    // Az `exportalhatok` csak az `idoszakBetolt`-on át hívódik: egy közvetlen
    // hívás dobna, és a hibát elnyelné a nem kezelt ígéret.
    expect(exportKepernyo.match(/await exportalhatok\(/g)?.length).toBe(1);
  });
});
