import { describe, expect, it } from 'vitest';
import { szolgaltatoiKikotes } from './openrouter.ts';
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
