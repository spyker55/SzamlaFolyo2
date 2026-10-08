import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  eselyesUt,
  helyes,
  szetArgumentumok,
  SzetKapcsoloHiba,
  szetJelentes,
  szetMerj,
  vartErtelmez,
  type SzetFutas,
} from './szetszedesMeres.ts';

const H = (tol: number, ig: number) => ({ oldal_tol: tol, oldal_ig: ig });

describe('kapcsolók', () => {
  it('alapból a configban álló modell, három futás', () => {
    expect(szetArgumentumok(['k.pdf'])).toEqual({
      utvonal: 'k.pdf',
      ismetles: 3,
      modellek: [null],
      fajlkent: false,
      vart: null,
      json: false,
    });
  });

  it('több modell egymás mellett, az „alap" a configban álló', () => {
    expect(szetArgumentumok(['k.pdf', '--modell', 'alap', '--modell', 'anthropic/claude-haiku-5.5']).modellek).toEqual([
      null,
      'anthropic/claude-haiku-5.5',
    ]);
  });

  it('a várt határok két írásmódban', () => {
    expect(vartErtelmez('1-2,3-3, 4–6')).toEqual([H(1, 2), H(3, 3), H(4, 6)]);
    expect(vartErtelmez('1,2')).toEqual([H(1, 1), H(2, 2)]);
  });

  it.each([
    ['nincs fájl', []],
    ['ismeretlen kapcsoló', ['k.pdf', '--gyorsan']],
    ['modell érték nélkül', ['k.pdf', '--modell', '--json']],
    ['rossz várt alak', ['k.pdf', '--vart', '1-a']],
    ['fordított tartomány', ['k.pdf', '--vart', '3-1']],
    ['nulladik oldal', ['k.pdf', '--vart', '0-1']],
    ['21 ismétlés', ['k.pdf', '--ismetles', '21']],
  ])('megáll: %s', (_n, argv) => {
    expect(() => szetArgumentumok(argv)).toThrow(SzetKapcsoloHiba);
  });
});

describe('az éles út', () => {
  it('egyoldalas fájl: élesben nincs szétszedés', () => {
    expect(eselyesUt({ jelleg: 'szovegreteg', oldalszam: 1, oldalSzovegek: ['x'] }).ut).toBeNull();
  });

  it('XML: élesben nincs szétszedés', () => {
    expect(eselyesUt({ jelleg: 'beagyazott_xml', oldalszam: 3, oldalSzovegek: ['a', 'b', 'c'] }).ut).toBeNull();
  });

  it('szövegréteg → szöveg; kép → fájl; túl hosszú szöveges → fájl', () => {
    expect(eselyesUt({ jelleg: 'szovegreteg', oldalszam: 3, oldalSzovegek: ['a', 'b', 'c'] }).ut).toBe('szoveg');
    expect(eselyesUt({ jelleg: 'kep', oldalszam: 3, oldalSzovegek: null }).ut).toBe('fajl');
    expect(eselyesUt({ jelleg: 'szovegreteg', oldalszam: 61, oldalSzovegek: Array(61).fill('x') }).ut).toBe('fajl');
  });

  /**
   * A mérőeszköz csak akkor mér valamit, ha **ugyanazon az úton** jár, mint
   * az éles függvény. Ha valaki az `esetlegSzetszed()` feltételét átírja, ez
   * a teszt szól, hogy az `eselyesUt()`-at is igazítani kell.
   */
  it('a feltételek szó szerint egyeznek a kiolvasóéval', () => {
    const index = readFileSync(join(import.meta.dirname, '..', 'supabase', 'functions', 'kiolvas', 'index.ts'), 'utf8');
    const eszkoz = readFileSync(join(import.meta.dirname, 'szetszedesMeres.ts'), 'utf8');
    const normal = (s: string) => s.replace(/\s+/g, ' ');

    for (const feltetel of [
      'if (oldalszam === null || oldalszam < 2 || !igenyelModellt(felderites.jelleg)) {',
      "felderites.jelleg === 'szovegreteg' && felderites.oldalSzovegek !== null && oldalszam <= szamlafolyo.koteg.szovegMaxOldal",
    ]) {
      expect(normal(index)).toContain(feltetel);
      expect(normal(eszkoz)).toContain(feltetel);
    }
  });
});

function futas(felulir: Partial<SzetFutas>): SzetFutas {
  return {
    modell: 'm',
    futtatottModell: null,
    szolgaltato: 'Google',
    szet: true,
    hatarok: [H(1, 1), H(2, 2), H(3, 3)],
    javitas: null,
    indok: null,
    hiba: null,
    bemenetToken: 100,
    kimenetToken: 50,
    gondolkodasToken: 0,
    koltseg: 0.001,
    idoMs: 1000,
    ...felulir,
  };
}

describe('helyes-e', () => {
  const VART = [H(1, 1), H(2, 2), H(3, 3)];

  it('pontos egyezés kell', () => {
    expect(helyes(futas({}), VART)).toBe(true);
    expect(helyes(futas({ hatarok: [H(1, 2), H(3, 3)] }), VART)).toBe(false);
    expect(helyes(futas({ szet: false, hatarok: null, indok: 'x' }), VART)).toBe(false);
    expect(helyes(futas({ hiba: '429' }), VART)).toBe(false);
    // Ugyanannyi bizonylat, rossz helyen húzott határ – ez a legalattomosabb
    // tévedés: a darabszám stimmel, a második számla mégis két oldalt kap.
    expect(helyes(futas({ hatarok: [H(1, 1), H(2, 3)] }), [H(1, 2), H(3, 3)])).toBe(false);
  });

  it('egy várt bizonylatnál a helyes válasz a „nem szedjük szét"', () => {
    expect(helyes(futas({ szet: false, hatarok: null, indok: 'A fájlban egyetlen bizonylat van.' }), [H(1, 2)])).toBe(true);
    expect(helyes(futas({ hatarok: [H(1, 1), H(2, 2)] }), [H(1, 2)])).toBe(false);
  });
});

describe('mérés hamis szolgáltatóval', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function valasz(dokumentumok: unknown[]) {
    return new Response(
      JSON.stringify({
        id: 'gen-1',
        model: 'anthropic/claude-haiku-5.5',
        provider: 'Google',
        choices: [
          {
            finish_reason: 'tool_calls',
            message: { tool_calls: [{ function: { name: 'record_batch', arguments: JSON.stringify({ dokumentumok }) } }] },
          },
        ],
        usage: { prompt_tokens: 900, completion_tokens: 40, cost: 0.0002 },
      }),
      { status: 200 },
    );
  }

  it('a próbafájlon a helyes határokat magától tudja, és a szöveges úton küld', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'teszt');
    const hamis = vi.fn(async () => valasz([H(1, 1), H(2, 2), H(3, 3)]));
    vi.stubGlobal('fetch', hamis);

    const m = await szetMerj(szetArgumentumok(['tesztadat/harom-szamla-rendes.pdf', '--ismetles', '1']));

    expect(m.ut).toBe('szoveg');
    expect(m.vart).toEqual([H(1, 1), H(2, 2), H(3, 3)]);
    expect(helyes(m.futasok[0]!, m.vart!)).toBe(true);

    const torzs = JSON.parse((hamis.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(JSON.stringify(torzs.messages)).toContain('1. oldal');
    expect(JSON.stringify(torzs.messages)).not.toContain('"type":"file"');

    const szoveg = szetJelentes(m);
    expect(szoveg).toMatch(/HELYES\s+1\/1/);
    expect(szoveg).toContain('Google');
    // Csak oldalszám és a mi indokaink: a számla tartalmából semmi.
    expect(szoveg).not.toContain('Tükörfúrógép');
  });

  it('--fajlkent: a fájl megy, nem a szöveg', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'teszt');
    const hamis = vi.fn(async () => valasz([H(1, 2), H(3, 3)]));
    vi.stubGlobal('fetch', hamis);

    const m = await szetMerj(szetArgumentumok(['tesztadat/harom-szamla-rendes.pdf', '--ismetles', '1', '--fajlkent']));

    expect(m.ut).toBe('fajl');
    const torzs = JSON.parse((hamis.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(JSON.stringify(torzs.messages)).toContain('"type":"file"');
    expect(szetJelentes(m)).toMatch(/HELYES\s+0\/1 {2}✗/);
  });

  it('egyoldalas fájlért nem fizet: nincs hívás', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'teszt');
    const hamis = vi.fn();
    vi.stubGlobal('fetch', hamis);

    const m = await szetMerj(szetArgumentumok(['tesztadat/egy-szamla-rendes.pdf']));

    expect(m.ut).toBeNull();
    expect(hamis).not.toHaveBeenCalled();
    expect(szetJelentes(m)).toContain('élesben nincs szétszedés');
  });
});

describe('a script Node-dal indul', () => {
  it('betölt, és kulcs nélkül a saját üzenetével áll meg', () => {
    const f = spawnSync(process.execPath, ['eszkozok/szetszedes-proba.ts', 'tesztadat/harom-szamla-rendes.pdf'], {
      encoding: 'utf8',
      env: { ...process.env, OPENROUTER_API_KEY: '' },
      timeout: 60_000,
    });

    expect(f.stderr).not.toContain('ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
    expect(f.stderr).not.toContain('SyntaxError');
    expect(f.stderr).toContain('Nincs OPENROUTER_API_KEY');
  });
});
