import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Az Edge Function-kód benne marad a typecheckben.
 *
 * # Mit véd, és miért nem elég egyszer beállítani
 *
 * 2026-09-23-ig a `supabase/functions/` **egyáltalán nem volt
 * typecheckelve**: a `tsconfig.app.json` a `src`, `shared`, `config` és
 * `eszkozok` mappákat nézte, a Deno alatt futó kódot senki. A hibák így csak a
 * telepítés `deno check`-jén vagy élesben derültek ki.
 *
 * A beállítás maga egy sor a `tsconfig.json` referenciái között — és **pont
 * ezért törékeny**. Aki egyszer belefut egy kellemetlen Deno-típushibába,
 * annak egyetlen sor törlése a kijárat, és onnantól minden zöld marad,
 * miközben a fedezet nyomtalanul elszállt. Ez a teszt azt a sort őrzi.
 *
 * ⚠️ A teszt **szöveget és beállítást** olvas, nem típusokat ellenőriz. Nem
 * helyettesíti a `npm run typecheck`-et; azt védi meg attól, hogy csendben
 * kevesebbet nézzen.
 */

const GYOKER = new URL('../../', import.meta.url).pathname;

function olvas(fajl: string): string {
  return readFileSync(GYOKER + fajl, 'utf8');
}

/** A `tsconfig.deno.json` JSONC: egész soros `//` megjegyzésekkel. */
function jsoncErtelmez(szoveg: string): Record<string, unknown> {
  const tisztitott = szoveg
    .split('\n')
    .filter((sor) => !sor.trim().startsWith('//'))
    .join('\n');

  return JSON.parse(tisztitott) as Record<string, unknown>;
}

/** A szigorúsági kapcsolók, amiknek a két projektben egyezniük kell. */
const SZIGOR = [
  'strict',
  'noUnusedLocals',
  'noUnusedParameters',
  'noFallthroughCasesInSwitch',
  'noUncheckedIndexedAccess',
  'exactOptionalPropertyTypes',
] as const;

type Konfig = { compilerOptions?: Record<string, unknown>; include?: string[] };

describe('a Deno-kód benne van a typecheckben', () => {
  /**
   * A „talál-e egyáltalán" állítás. Egy elrontott útvonal üres objektumot
   * adna, és alatta minden más állítás **üresen menne át** — ez a fajta hamis
   * zöld ebben a projektben már háromszor megfogott minket.
   */
  it('egyáltalán látja a gyökér tsconfigot', () => {
    const gyokerKonfig = JSON.parse(olvas('tsconfig.json')) as {
      references?: { path: string }[];
    };

    expect(
      gyokerKonfig.references,
      'A `tsconfig.json`-ban nincs `references` tömb — rossz fájlt olvasok.',
    ).toBeDefined();

    expect(gyokerKonfig.references?.length).toBeGreaterThanOrEqual(3);
  });

  it('a gyökér tsconfig hivatkozik a Deno-projektre', () => {
    const gyokerKonfig = JSON.parse(olvas('tsconfig.json')) as {
      references?: { path: string }[];
    };
    const utvonalak = (gyokerKonfig.references ?? []).map((r) => r.path);

    expect(
      utvonalak,
      'A `tsconfig.deno.json` kiesett a `tsconfig.json` referenciái közül. ' +
        'Ettől az `npm run typecheck` és az `npm run build` **némán** nem nézi ' +
        'többé a `supabase/functions/` alatti kódot — zöld marad, és közben ' +
        'nem mér semmit.',
    ).toContain('./tsconfig.deno.json');
  });

  it('a Deno-projekt tényleg a függvényeket nézi', () => {
    const denoKonfig = jsoncErtelmez(olvas('tsconfig.deno.json')) as Konfig;

    expect(
      denoKonfig.include,
      'A `tsconfig.deno.json` `include` listájából kiesett a ' +
        '`supabase/functions` — a projekt ott van, csak nem néz semmit.',
    ).toContain('supabase/functions');
  });

  /**
   * A `shared/uzleti` modulokat a böngésző **és** az Edge Functionök is
   * importálják. Ha a két projekt mércéje szétcsúszik, ugyanarra a kódra két
   * szabály vonatkozna — és a gyakorlatban a lazább nyerne.
   */
  it('a szigorúsága azonos a böngésző projektjéével', () => {
    const app = (jsoncErtelmez(olvas('tsconfig.app.json')) as Konfig).compilerOptions ?? {};
    const deno = (jsoncErtelmez(olvas('tsconfig.deno.json')) as Konfig).compilerOptions ?? {};

    for (const kapcsolo of SZIGOR) {
      expect(
        deno[kapcsolo],
        `A \`${kapcsolo}\` a böngésző projektjében ${String(app[kapcsolo])}, a Deno-projektben ` +
          `${String(deno[kapcsolo])}. A két projekt ugyanazokat a ` +
          '`shared/uzleti` modulokat fordítja — két mérce mellett a lazább nyer.',
      ).toBe(app[kapcsolo]);
    }
  });

  /**
   * A `lib`-ből szándékosan hiányzik a DOM: a Deno nem böngésző. DOM-mal egy
   * `document.querySelector` némán átmenne a typecheckn, és élesben hasalna el.
   */
  it('nem ígér DOM-ot egy szerveroldali futtatókörnyezetnek', () => {
    const deno = (jsoncErtelmez(olvas('tsconfig.deno.json')) as Konfig).compilerOptions ?? {};
    const lib = (deno['lib'] ?? []) as string[];

    expect(lib.length, 'A `lib` lista üres — rossz helyen keresem.').toBeGreaterThan(0);

    expect(
      lib.some((l) => l.toUpperCase().startsWith('DOM')),
      'A `tsconfig.deno.json` `lib` listájába bekerült a DOM. A Deno nem ' +
        'böngésző: nincs benne `document` és `window`, a rájuk hivatkozó kód ' +
        'viszont innentől átmenne a typechecken.',
    ).toBe(false);
  });
});
