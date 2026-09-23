import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * A látható szövegben nagykötőjel (–) áll gondolatjelként, nem hosszú (—).
 *
 * 2026-09-23-án egy lépésben cserélődött minden felületi szövegben, levélben,
 * szerveroldali hibaüzenetben és a három jogi szövegben (utóbbi új változat:
 * `2026-09-23-2`). A kommentekben a hosszú jel marad — azt senki nem látja,
 * és ez az őr pont ezért kell: ami a kommentekben megszokott, az egy új
 * felületi mondatba is könnyen becsúszik.
 *
 * # Mit néz, és mit nem
 *
 * A TypeScript szintaxisfáját járja be, tehát **csak szöveget** lát:
 * karakterlánc- és sablonliterált, JSX-szöveget. Kommentet nem. Kivétel:
 *
 * - a `console.*` argumentuma — napló, nem felület;
 * - a modellnek szóló szöveg (`prompt.ts`, `sema.ts`) — azt a modell olvassa,
 *   és egy írásjel-csere ott a kiolvasás viselkedéséhez nyúlna, nem a
 *   megjelenéshez.
 *
 * Az SQL-oldalon minden függvény **legutolsó** definíciójának nem komment
 * sorait nézi: a `raise exception` szövege szó szerint a felületre kerül.
 */

const GYOKER = new URL('../', import.meta.url).pathname;
const HOSSZU = '—';

const MAPPAK = ['src', 'shared', 'config', 'supabase/functions'];
const MODELLNEK = new Set(['shared/uzleti/prompt.ts', 'shared/uzleti/sema.ts']);

function fajlok(mappa: string): string[] {
  const ki: string[] = [];

  for (const nev of readdirSync(join(GYOKER, mappa))) {
    const ut = join(mappa, nev);

    if (statSync(join(GYOKER, ut)).isDirectory()) {
      ki.push(...fajlok(ut));
    } else if (/\.tsx?$/.test(nev) && !/\.test\.tsx?$/.test(nev) && !nev.endsWith('.d.ts')) {
      ki.push(ut);
    }
  }

  return ki;
}

const SZOVEG = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

function naploba(n: ts.Node, sf: ts.SourceFile): boolean {
  for (let p = n.parent, i = 0; p !== undefined && i < 8; p = p.parent, i += 1) {
    if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))) {
      return true;
    }
  }

  return false;
}

type Lelet = { hol: string; szoveg: string };

function szovegek(ut: string): { hosszu: Lelet[]; osszes: number; nagy: number } {
  const forras = readFileSync(join(GYOKER, ut), 'utf8');
  const sf = ts.createSourceFile(
    ut,
    forras,
    ts.ScriptTarget.Latest,
    true,
    ut.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const hosszu: Lelet[] = [];
  let osszes = 0;
  let nagy = 0;

  const bejar = (n: ts.Node): void => {
    if (SZOVEG.has(n.kind) && !naploba(n, sf)) {
      const t = n.getText(sf);
      osszes += 1;
      nagy += t.split('–').length - 1;

      if (t.includes(HOSSZU)) {
        const sor = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        hosszu.push({ hol: `${ut}:${sor}`, szoveg: t.replace(/\s+/g, ' ').slice(0, 80) });
      }
    }

    ts.forEachChild(n, bejar);
  };

  bejar(sf);

  return { hosszu, osszes, nagy };
}

describe('gondolatjel a látható szövegben', () => {
  const vizsgalt = MAPPAK.flatMap(fajlok).filter((f) => !MODELLNEK.has(f));
  const eredmenyek = vizsgalt.map(szovegek);

  it('egyáltalán lát szöveget (anti-vakság)', () => {
    // Egy rossz mappanév vagy egy elrontott szűrő üres listát adna, és az üres
    // lista hibátlan. A számok 2026-09-23-i mérésből jönnek, bő tartalékkal.
    expect(vizsgalt.length).toBeGreaterThan(100);
    expect(eredmenyek.reduce((s, e) => s + e.osszes, 0)).toBeGreaterThan(3000);
    expect(eredmenyek.reduce((s, e) => s + e.nagy, 0)).toBeGreaterThan(300);
  });

  it('a TypeScript-szövegekben nincs hosszú gondolatjel', () => {
    const leletek = eredmenyek.flatMap((e) => e.hosszu);

    expect(
      leletek,
      'Hosszú gondolatjel (—) látható szövegben. A felületen nagykötőjel (–) ' +
        'áll; a kommentekben maradhat a hosszú.\n' +
        leletek.map((l) => `  ${l.hol}  ${l.szoveg}`).join('\n'),
    ).toEqual([]);
  });

  it('az index.html leírásában sincs (a kereső ezt mutatja)', () => {
    const html = readFileSync(join(GYOKER, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

    expect(html).toContain('content="');
    expect(html).not.toContain(HOSSZU);
  });
});

describe('gondolatjel az SQL-hibaüzenetekben', () => {
  const MIGRACIOK = join(GYOKER, 'supabase/migrations');

  /** Függvénynév → a legutolsó `create or replace` törzse, fájlsorrendben. */
  const utolso = new Map<string, { fajl: string; torzs: string }>();

  for (const fajl of readdirSync(MIGRACIOK).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRACIOK, fajl), 'utf8');
    const minta =
      /create\s+or\s+replace\s+function\s+([\w.]+)\s*\([\s\S]*?as\s+\$\$([\s\S]*?)\$\$;/gi;

    for (const m of sql.matchAll(minta)) {
      utolso.set((m[1] ?? '').toLowerCase(), { fajl, torzs: m[2] ?? '' });
    }
  }

  it('egyáltalán lát függvényeket (anti-vakság)', () => {
    expect(utolso.size).toBeGreaterThan(20);
    expect(utolso.has('public.ceg_letrehozas')).toBe(true);
  });

  it('egyetlen függvény legutolsó definíciójában sincs hosszú jel a kódsorokban', () => {
    const leletek: string[] = [];

    for (const [nev, { fajl, torzs }] of utolso) {
      for (const sor of torzs.split('\n')) {
        // A `--` utáni rész komment. Egy sztringben álló `--` itt tévesen
        // kommentnek látszana — ilyen ma nincs, és a hiba iránya a
        // megengedő, nem a téves riasztás.
        const kod = sor.split('--')[0] ?? '';

        if (kod.includes(HOSSZU)) {
          leletek.push(`  ${nev} (${fajl}): ${sor.trim().slice(0, 80)}`);
        }
      }
    }

    expect(
      leletek,
      'Hosszú gondolatjel egy SQL-függvény kódsorában. A `raise exception` szövege ' +
        'szó szerint a felületre kerül — nagykötőjel (–) kell.\n' +
        leletek.join('\n'),
    ).toEqual([]);
  });
});
