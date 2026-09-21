import { describe, expect, it } from 'vitest';
import { hasznalatOlvas, szolgaltatoiKikotes } from './openrouter.ts';
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
