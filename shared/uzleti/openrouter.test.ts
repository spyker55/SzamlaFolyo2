import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  argumentumok,
  hasznalatOlvas,
  kiolvas,
  KIOLVASAS_MAX_TOKEN,
  KiolvasasHiba,
  szolgaltatoiKikotes,
  valaszNyom,
} from './openrouter.ts';
import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * A szolgáltatói kikötés tesztje.
 *
 * Ez a modul egyébként hálózatot hív, tehát nem tesztelhető olcsón — a
 * kikötés viszont tiszta függvény, és **pont az a rész, ami csendben
 * elromolhat**: egy `allow_fallbacks` törlése nem hibaüzenetet ad, hanem
 * néma bővülést a címzettek körében. Onnantól az Adatkezelési tájékoztató
 * hazudik, és semmi nem szól.
 *
 * Ezért állít a teszt **mind a négy mezőre külön**, nem az objektum egészére
 * egyetlen `toEqual`-lal: ha valaki kivesz egyet, a piros sor megmondja,
 * melyik ígéretet vette ki.
 */
describe('szolgáltatói kikötés', () => {
  const kikotes = szolgaltatoiKikotes();

  it('csak nevesített szolgáltató szolgálhatja ki', () => {
    expect(kikotes.only).toEqual(szamlafolyo.modell.szolgaltatok);
    // „Találunk-e egyáltalán valamit" — egy üres lista jelentése az
    // OpenRouternél nem „senki", hanem „nincs szűrés".
    expect(kikotes.only.length).toBeGreaterThanOrEqual(1);
  });

  it('és senki más: nincs csendes tartalék útvonal', () => {
    expect(kikotes.allow_fallbacks).toBe(false);
  });

  it('nulla adatmegőrzésű végpont', () => {
    expect(kikotes.zdr).toBe(true);
  });

  it('és tanításra sem használható', () => {
    expect(kikotes.data_collection).toBe('deny');
  });

  it('a nevesített szolgáltatók mind a Google végpontjai', () => {
    // A tájékoztató 5. pontja egyetlen céget nevez meg a kiolvasás mögött. Ha
    // ide bekerülne egy negyedik gyártó, a szöveg attól még a Google-t
    // mondaná — ez a sor az, ami ilyenkor megszólal.
    for (const szolgaltato of szamlafolyo.modell.szolgaltatok) {
      expect(szolgaltato.startsWith('google-')).toBe(true);
    }
  });
});

/**
 * A használat-olvasó tesztje.
 *
 * Ez a függvény a **mérőeszközünk**: belőle derül ki, mennyi ment el a modell
 * gondolkodására. Egy mérőeszközt pedig meg kell mérni, különben csak hisszük,
 * hogy mér.
 *
 * A fixtúra alakja a szolgáltató valódi válaszából jön: a `usage` blokkban a
 * `completion_tokens_details.reasoning_tokens` mező hordozza a gondolkodást,
 * és az a `completion_tokens` **része**. A mért esetünk számaival dolgozunk
 * (1096 kimenet, ebből ~800 gondolkodás), hogy a teszt ne elvont legyen.
 */
describe('használat-olvasó', () => {
  const valasz = {
    usage: {
      prompt_tokens: 3457,
      completion_tokens: 1096,
      completion_tokens_details: { reasoning_tokens: 800 },
      cost: 0.006703,
    },
  };

  it('kiolvassa a gondolkodási tokent a részletekből', () => {
    expect(hasznalatOlvas(valasz).gondolkodasToken).toBe(800);
  });

  it('a többi mezőt nem rontja el', () => {
    const h = hasznalatOlvas(valasz);

    expect(h.bemenetToken).toBe(3457);
    expect(h.kimenetToken).toBe(1096);
    expect(h.koltseg).toBe(0.006703);
  });

  it('a gondolkodás a kimenet RÉSZE, nem afölött', () => {
    const h = hasznalatOlvas(valasz);

    // Ez nem kozmetikai állítás. Aki a kettőt összeadja, az a kimenetet
    // másfélszer számolja el — és pont akkor téved, amikor a gondolkodás
    // korlátozásának a hasznát akarja kiszámolni.
    expect(h.gondolkodasToken!).toBeLessThanOrEqual(h.kimenetToken!);
  });

  it('hiányzó részletek esetén null, nem nulla', () => {
    // A különbség tartalmi: a `null` azt mondja, *nem tudjuk*. Egy odaírt
    // nulla úgy nézne ki, mintha a modell nem gondolkodott volna — vagyis
    // mintha egy jövőbeli korlátozás már hatna.
    const gondolkodasNelkul = { usage: { prompt_tokens: 10, completion_tokens: 20 } };

    expect(hasznalatOlvas(gondolkodasNelkul).gondolkodasToken).toBeNull();
    expect(hasznalatOlvas(gondolkodasNelkul).kimenetToken).toBe(20);
  });

  it('usage nélküli válasz nem dob, csak nullákat ad', () => {
    // Az XML-ág és a hibás válaszok is ide futnak be: a mérés hiánya nem
    // lehet hiba, különben a mérőeszköz állítaná meg a feldolgozást.
    const h = hasznalatOlvas({});

    expect(h.bemenetToken).toBeNull();
    expect(h.kimenetToken).toBeNull();
    expect(h.gondolkodasToken).toBeNull();
    expect(h.koltseg).toBeNull();
  });
});

/**
 * Az elbukott válasz nyoma (2026-09-23).
 *
 * A Google (Vertex) egy kiolvasásra 200-as, de **üres** választ adott: 0 → 0
 * token, függvényhívás nélkül. Mi csak annyit mentettünk, hogy „nem a kért
 * függvénnyel válaszolt" — az okot az OpenRouter naplójából kellett
 * kikeresni. Ezek a tesztek azt mérik, hogy a válasz nyoma mostantól a
 * hibával együtt utazik.
 */
const URES_VALASZ = {
  id: 'gen-1790165557-teszt',
  model: 'google/gemini-3.8-flash',
  choices: [
    {
      finish_reason: null,
      native_finish_reason: null,
      message: { role: 'assistant', content: '' },
    },
  ],
  usage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
};

describe('a függvényhívás argumentumai', () => {
  it('a rendes válaszból kiveszi az argumentumokat', () => {
    expect(
      argumentumok({
        choices: [
          {
            finish_reason: 'tool_calls',
            message: { tool_calls: [{ function: { name: 'x', arguments: '{"a":1}' } }] },
          },
        ],
      }),
    ).toEqual({ a: 1 });
  });

  it('az üres válasz saját üzenetet kap – nem „nem a kért függvénnyel"', () => {
    expect(() => argumentumok(URES_VALASZ)).toThrow('A modell üres választ adott.');
    expect(() => argumentumok({ choices: [] })).toThrow('A modell üres választ adott.');
    expect(() => argumentumok({})).toThrow('A modell üres választ adott.');
  });

  it('a szöveges válasz függvényhívás helyett: nem a kért függvénnyel', () => {
    expect(() =>
      argumentumok({ choices: [{ message: { content: 'Íme a számla adatai: …' } }] }),
    ).toThrow('A modell nem a kért függvénnyel válaszolt.');
  });

  it('a hibás JSON-argumentum: nem értelmezhető', () => {
    expect(() =>
      argumentumok({ choices: [{ message: { tool_calls: [{ function: { arguments: '{' } }] } }] }),
    ).toThrow('A modell válasza nem értelmezhető.');
  });
});

describe('a válasz nyoma', () => {
  it('kiolvassa a generációazonosítót, a modellt és a tokeneket', () => {
    const nyom = valaszNyom(URES_VALASZ);

    expect(nyom.generacioId).toBe('gen-1790165557-teszt');
    expect(nyom.futtatottModell).toBe('google/gemini-3.8-flash');
    expect(nyom.kimenetToken).toBe(0);
    expect(nyom.leallasOka).toBeNull();
    expect(nyom.nyers).toBe(URES_VALASZ);
  });

  it('a leállás okát a szolgáltató sajátjával együtt adja', () => {
    expect(
      valaszNyom({ choices: [{ finish_reason: 'stop', native_finish_reason: 'MALFORMED_FUNCTION_CALL' }] })
        .leallasOka,
    ).toBe('stop / MALFORMED_FUNCTION_CALL');
    expect(valaszNyom({ choices: [{ finish_reason: 'stop', native_finish_reason: 'stop' }] }).leallasOka).toBe(
      'stop',
    );
  });
});

describe('a teljes hívás: a nyom a hibával együtt utazik', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('üres 200-as válaszra KiolvasasHiba, rajta a válasz nyomával', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(URES_VALASZ), { status: 200 })),
    );

    const hiba = await kiolvas({
      tartalom: new Uint8Array([37, 80, 68, 70]),
      mime: 'application/pdf',
      fajlnev: 'teszt.pdf',
      apiKulcs: 'teszt',
    }).catch((h: unknown) => h);

    expect(hiba).toBeInstanceOf(KiolvasasHiba);
    expect((hiba as KiolvasasHiba).message).toBe('A modell üres választ adott.');
    expect((hiba as KiolvasasHiba).nyom?.generacioId).toBe('gen-1790165557-teszt');
    expect((hiba as KiolvasasHiba).nyom?.nyers).toEqual(URES_VALASZ);
  });

  it('a hálózati hibának nincs nyoma – nem volt válasz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    const hiba = await kiolvas({
      tartalom: new Uint8Array([37, 80, 68, 70]),
      mime: 'application/pdf',
      fajlnev: 'teszt.pdf',
      apiKulcs: 'teszt',
    }).catch((h: unknown) => h);

    expect(hiba).toBeInstanceOf(KiolvasasHiba);
    expect((hiba as KiolvasasHiba).nyom).toBeNull();
  });
});

describe('a kiolvasás tokenkerete', () => {
  // Mérve, 2026-09-23: egy elszaladt gondolkodás 1965 token volt, és a 2048-as
  // keretben nem maradt hely a válasznak (`finish_reason: length`). A
  // legnagyobb mért válasz a gondolkodás nélkül 1194 − 891 = 303 token.
  const MERT_ELSZALADT_GONDOLKODAS = 1965;
  const MERT_LEGNAGYOBB_VALASZ = 1194 - 891;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a mért elszaladt gondolkodás és a legnagyobb válasz együtt, másfélszeres tartalékkal elfér', () => {
    expect(KIOLVASAS_MAX_TOKEN).toBeGreaterThanOrEqual(
      1.5 * (MERT_ELSZALADT_GONDOLKODAS + MERT_LEGNAGYOBB_VALASZ),
    );
  });

  it('a kérés tényleg ezt a keretet küldi', async () => {
    const fetchHamis = vi.fn(async () => new Response(JSON.stringify(URES_VALASZ), { status: 200 }));
    vi.stubGlobal('fetch', fetchHamis);

    await kiolvas({
      tartalom: new Uint8Array([37, 80, 68, 70]),
      mime: 'application/pdf',
      fajlnev: 'teszt.pdf',
      apiKulcs: 'teszt',
    }).catch(() => undefined);

    const [, opciok] = fetchHamis.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(opciok.body as string).max_tokens).toBe(KIOLVASAS_MAX_TOKEN);
  });
});
