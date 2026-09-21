import { afterEach, describe, expect, test, vi } from 'vitest';
import { argumentumok, egyFutas, KapcsoloHiba, lancon, merj, ProbaHiba } from './meres.ts';
import { VERZIO } from '../shared/uzleti/prompt.ts';
import { FUGGVENY_NEV } from '../shared/uzleti/sema.ts';
import type { Felderites } from '../supabase/functions/kiolvas/felderites.ts';

describe('kapcsolók', () => {
  test('a fájl önmagában elég', () => {
    expect(argumentumok(['szamla.pdf'])).toEqual({
      utvonal: 'szamla.pdf',
      ismetles: 1,
      modell: null,
      json: false,
    });
  });

  test('ismétlés, modell, json', () => {
    expect(argumentumok(['a.pdf', '--ismetles', '5', '--modell', 'x/y', '--json'])).toEqual({
      utvonal: 'a.pdf',
      ismetles: 5,
      modell: 'x/y',
      json: true,
    });
  });

  test.each([
    ['nincs fájl', []],
    ['két fájl', ['a.pdf', 'b.pdf']],
    ['ismeretlen kapcsoló', ['a.pdf', '--gyorsan']],
    ['nulla ismétlés', ['a.pdf', '--ismetles', '0']],
    ['nem szám ismétlés', ['a.pdf', '--ismetles', 'sokszor']],
    ['húsz fölött', ['a.pdf', '--ismetles', '21']],
    // ⚠️ A `--modell --json` némán elnyelné a `--json`-t modellazonosítóként,
    // és a mérés utána mást mérne, mint amit kértek.
    ['modell érték nélkül', ['a.pdf', '--modell', '--json']],
  ])('megáll: %s', (_nev, argv) => {
    expect(() => argumentumok(argv)).toThrow(KapcsoloHiba);
  });
});

/**
 * A négy XML-értelmező **valódi mintafájlon**, a repó saját láncán végig.
 *
 * Ezek a fájlok a kézi próbához készültek; így a tesztkör is őrzi őket — ha
 * egy értelmező elromlik, nem egy böngészős próbán fog kiderülni.
 */
describe('merj — az XML-ág', () => {
  test.each([
    ['minta/ubl-szabalyos.xml', 'xml/ubl'],
    ['minta/cii-szabalyos.xml', 'xml/cii'],
    ['minta/nav-szabalyos.xml', 'xml/nav'],
    ['minta/apeh-szabalyos.xml', 'xml/apeh'],
  ])('%s → %s, nulla forintból', async (utvonal, olvaso) => {
    const meres = await merj({ utvonal, ismetles: 1, modell: null, json: false });
    const futas = meres.futasok[0]!;

    expect(meres.felderites.jelleg).toBe('strukturalt_xml');
    expect(futas.olvaso).toBe(olvaso);
    // A bizonyíték, amit élesben is keresünk: nem modell olvasta ki.
    expect(futas.koltseg).toBeNull();
    expect(futas.promptVerzio).toBeNull();
    expect(futas.eredmeny.mezok['gross_amount']).not.toBeNull();
  });

  test('a hibrid PDF a beágyazott XML-ből olvas, nem a szövegrétegéből', async () => {
    const meres = await merj({
      utvonal: 'minta/factur-x-szabalyos.pdf',
      ismetles: 1,
      modell: null,
      json: false,
    });

    expect(meres.felderites.jelleg).toBe('beagyazott_xml');
    expect(meres.felderites.xmlNev).toBe('factur-x.xml');
    expect(meres.futasok[0]!.olvaso).toBe('xml/cii');
    expect(meres.futasok[0]!.eredmeny.kreditek).toBe(1);
  });

  test('a szándékosan elrontott minta bukott validátort mutat', async () => {
    const meres = await merj({
      utvonal: 'minta/ubl-hibas-osszeg.xml',
      ismetles: 1,
      modell: null,
      json: false,
    });
    const eredmeny = meres.futasok[0]!.eredmeny;

    expect(Object.keys(eredmeny.validatorok)).toContain('gross_amount');
    // A validátor **lefelé húz**: a strukturált adat 1,0-ja sem marad meg.
    expect(eredmeny.konfidencia.combined['gross_amount']).toBeLessThanOrEqual(0.3);
  });

  test('az ismétlés az XML-ágon egy futás marad', async () => {
    const uzenetek: string[] = [];
    const meres = await merj(
      { utvonal: 'minta/ubl-szabalyos.xml', ismetles: 5, modell: null, json: false },
      (u) => uzenetek.push(u),
    );

    expect(meres.futasok).toHaveLength(1);
    expect(uzenetek.join(' ')).toContain('determinisztikus');
  });

  test('amit a feltöltés sem fogadna el, azt a mérés sem', async () => {
    await expect(merj({ utvonal: 'package.json', ismetles: 1, modell: null, json: false })).rejects.toThrow(
      ProbaHiba,
    );
  });
});

/**
 * A modellág — **stubolt hálózattal.**
 *
 * Ez az a kódút, ami valódi pénzbe kerül, és ezért a legritkábban fut le. A
 * stub nem a modellt méri (azt nem lehet), hanem azt, hogy **a szolgáltató
 * válaszából a helyes mezők kerülnek a jelentésbe**: melyik modell felelt
 * valójában, melyik prompt ment ki, hány token és mennyi pénz.
 */
describe('merj — a modellág', () => {
  const KEP: Felderites = {
    jelleg: 'kep',
    xml: null,
    xmlBajt: null,
    xmlNev: null,
    oldalszam: 3,
    szovegHossz: 0,
    oldalSzovegek: null,
    hiba: null,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env['OPENROUTER_API_KEY'];
  });

  function valasz(mezok: Record<string, unknown>) {
    return {
      ok: true,
      json: async () => ({
        // ⚠️ Amit **ténylegesen** futtattak — szándékosan más, mint amit
        // kértünk. Ha a script a kért modellt írná ki mindkét helyre, egy
        // csendes modellcsere észrevétlen maradna.
        model: 'google/gemini-3.8-flash-002',
        choices: [
          {
            message: {
              tool_calls: [
                { function: { name: FUGGVENY_NEV, arguments: JSON.stringify(mezok) } },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 3457,
          completion_tokens: 1194,
          completion_tokens_details: { reasoning_tokens: 891 },
          cost: 0.006703,
        },
      }),
    };
  }

  test('a válaszból a mérőszámok a helyükre kerülnek', async () => {
    process.env['OPENROUTER_API_KEY'] = 'proba-kulcs';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        valasz({
          doc_type: 'szamla',
          supplier_name: 'Teszt Kft.',
          doc_number: 'A-1',
          issue_date: '2026-09-21',
          gross_amount: 127000,
          confidence: { supplier_name: 0.92 },
        }),
      ),
    );

    const futas = await egyFutas(new Uint8Array([1, 2, 3]), 'image/png', 'nyugta.png', KEP, null);

    expect(futas.olvaso).toBe('google/gemini-3.8-flash');
    expect(futas.futtatottModell).toBe('google/gemini-3.8-flash-002');
    expect(futas.promptVerzio).toBe(VERZIO);
    expect(futas.bemenetToken).toBe(3457);
    expect(futas.kimenetToken).toBe(1194);
    expect(futas.gondolkodasToken).toBe(891);
    expect(futas.koltseg).toBe(0.006703);

    // És a lánc tényleg lefutott: a nyers szám tárolási alakot kapott.
    expect(futas.eredmeny.mezok['gross_amount']).toBe('127000.00');
    expect(futas.eredmeny.konfidencia.combined['supplier_name']).toBe(0.92);
    // Három oldal, öt oldal / kredit → egy kredit.
    expect(futas.eredmeny.kreditek).toBe(1);
  });

  test('a --modell felülírása a kérésbe és a jelentésbe is átmegy', async () => {
    process.env['OPENROUTER_API_KEY'] = 'proba-kulcs';
    let elkuldottTorzs = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, opciok: RequestInit) => {
        elkuldottTorzs = String(opciok.body);
        return valasz({ doc_number: 'A-1' });
      }),
    );

    const futas = await egyFutas(
      new Uint8Array([1]),
      'image/png',
      'n.png',
      KEP,
      'google/gemini-3.1-flash-lite',
    );

    expect(futas.olvaso).toBe('google/gemini-3.1-flash-lite');
    // Nem elég, hogy a jelentésben az áll: a **kérésben** is annak kell lennie.
    expect((JSON.parse(elkuldottTorzs) as { model: string }).model).toBe(
      'google/gemini-3.1-flash-lite',
    );
  });

  test('kulcs nélkül megáll, mielőtt bármit elküldene', async () => {
    const hivas = vi.fn();
    vi.stubGlobal('fetch', hivas);

    await expect(egyFutas(new Uint8Array([1]), 'image/png', 'n.png', KEP, null)).rejects.toThrow(
      ProbaHiba,
    );
    expect(hivas).not.toHaveBeenCalled();
  });
});

describe('lancon', () => {
  test('ismeretlen oldalszám egy kredit — bizonytalanságból nem számlázunk többet', () => {
    const felderites = { ...({} as Felderites), oldalszam: null };

    expect(lancon({ doc_number: 'A-1' }, felderites as Felderites).kreditek).toBe(1);
  });
});
