import { describe, expect, it } from 'vitest';
import { hatralevoNap, nevEgyezik, torlesDontes, type TorlesTenyek } from './fiokTorles.ts';

/**
 * A négy kimenetel mindegyikére áll teszt, és külön a **tiltásra** — az az
 * egyetlen ág, ami nemet mond, és az ÁSZF 5. pontját tartja be.
 */

const MOST = new Date('2026-09-20T12:00:00Z');

function tenyek(extra: Partial<TorlesTenyek> = {}): TorlesTenyek {
  return {
    vanCeg: true,
    cegNev: 'Próba Kft.',
    szerep: 'tulajdonos',
    tagokSzama: 1,
    masikTulajdonos: false,
    elofizetesFut: false,
    idoszakVege: null,
    bizonylatok: 0,
    exportok: 0,
    fajlok: 0,
    ...extra,
  };
}

describe('torlesDontes', () => {
  it('cég nélkül csak a fiók szűnik meg', () => {
    const d = torlesDontes(tenyek({ vanCeg: false, cegNev: null, szerep: null, tagokSzama: 0 }));

    expect(d.fajta).toBe('nincs_ceg');
  });

  it('egyedüli tagként a cég is megszűnik', () => {
    const d = torlesDontes(tenyek());

    expect(d.fajta).toBe('ceggel');
    expect(d.cim).toContain('Próba Kft.');
  });

  it('több tag mellett a cég marad — a fiók csak kilép', () => {
    const d = torlesDontes(tenyek({ szerep: 'szerkeszto', tagokSzama: 3 }));

    expect(d.fajta).toBe('kilepes');

    if (d.fajta === 'tiltva') return;

    expect(d.kovetkezmenyek.join(' ')).toContain('érintetlenek maradnak');
  });

  /**
   * ⚠️ Az ÁSZF 5. pontja: az egyedüli tulajdonos nem léphet ki úgy, hogy a
   * céget gazdátlanul hagyja. Ez az egyetlen eset, amikor nemet mondunk.
   */
  it('az egyedüli tulajdonost nem engedi ki, ha marad valaki a cégben', () => {
    const d = torlesDontes(tenyek({ tagokSzama: 2, masikTulajdonos: false }));

    expect(d.fajta).toBe('tiltva');

    if (d.fajta !== 'tiltva') return;

    expect(d.miert).toContain('másik tulajdonost');
  });

  it('másik tulajdonos mellett viszont kiléphet', () => {
    const d = torlesDontes(tenyek({ tagokSzama: 2, masikTulajdonos: true }));

    expect(d.fajta).toBe('kilepes');
  });

  /**
   * Aki egyedül van, az is tulajdonos — a tiltás rá nem vonatkozhat, különben
   * pont a magányos felhasználó nem tudna megszabadulni a fiókjától.
   */
  it('az egyedül maradt tulajdonost NEM tiltja', () => {
    const d = torlesDontes(tenyek({ tagokSzama: 1, masikTulajdonos: false }));

    expect(d.fajta).toBe('ceggel');
  });
});

describe('torlesDontes — amit a felhasználó elveszít', () => {
  it('kiírja a hátralévő fizetett napokat, és hogy elvesznek', () => {
    const d = torlesDontes(
      tenyek({ elofizetesFut: true, idoszakVege: '2026-10-19T12:00:00Z' }),
      MOST,
    );

    if (d.fajta !== 'ceggel') throw new Error('teljes törlést vártunk');

    const szoveg = d.kovetkezmenyek.join(' ');

    expect(szoveg).toContain('29 nap');
    expect(szoveg).toContain('nem téríthető vissza');
  });

  it('a darabszámokat mondja, nem általánosságokat', () => {
    const d = torlesDontes(tenyek({ bizonylatok: 312, exportok: 8, fajlok: 200 }), MOST);

    if (d.fajta !== 'ceggel') throw new Error('teljes törlést vártunk');

    const szoveg = d.kovetkezmenyek.join(' ');

    expect(szoveg).toContain('312 bizonylat');
    expect(szoveg).toContain('200 feltöltött fájl');
    expect(szoveg).toContain('8 export');
  });

  /** Amiből nulla van, azt nem soroljuk fel — az üres fióknál a lista riogatás. */
  it('üres cégnél nem sorol fel nullákat', () => {
    const d = torlesDontes(tenyek(), MOST);

    if (d.fajta !== 'ceggel') throw new Error('teljes törlést vártunk');

    const szoveg = d.kovetkezmenyek.join(' ');

    expect(szoveg).not.toContain('0 bizonylat');
    expect(szoveg).toContain('nincs bizonylata');
  });

  /**
   * Ami megmarad, az nem apróbetű: a törlés előtt kell kimondani.
   *
   * 2026-09-23 óta **két** dolog marad meg (a számlák és az ÁSZF-elfogadás
   * nyoma), a számláké pedig **adójogi**, nem számviteli megőrzés — a
   * Szolgáltató egyéni vállalkozó. És a képernyő nem állíthatja, hogy nincs
   * másolat: a mentések hét nap alatt futnak ki (jogi felülvizsgálat, 4. pont).
   */
  it('kimondja, mi marad meg, és hogy a mentésekből kifut', () => {
    const d = torlesDontes(tenyek({ bizonylatok: 5 }), MOST);

    if (d.fajta !== 'ceggel') throw new Error('teljes törlést vártunk');

    const szoveg = d.kovetkezmenyek.join(' ');

    expect(szoveg).toContain('adójogi iratmegőrzési idő');
    expect(szoveg).toContain('ÁSZF elfogadásának nyilvántartása');
    expect(szoveg).toContain('hét nap');
    expect(szoveg).not.toContain('számviteli megőrzési idő');
    expect(szoveg).not.toContain('nem tartunk fenn másolatot');
  });
});

describe('hatralevoNap', () => {
  it('a hiányzó és a múltbeli időpontra 0', () => {
    expect(hatralevoNap(null, MOST)).toBe(0);
    expect(hatralevoNap('2026-09-01T00:00:00Z', MOST)).toBe(0);
    expect(hatralevoNap('nem dátum', MOST)).toBe(0);
  });

  it('fölfelé kerekít — a megkezdett nap is nap', () => {
    expect(hatralevoNap('2026-09-21T00:00:00Z', MOST)).toBe(1);
  });
});

describe('nevEgyezik', () => {
  it('elfogadja a pontos nevet', () => {
    expect(nevEgyezik('Próba Kft.', 'Próba Kft.')).toBe(true);
  });

  /**
   * A cél a szándékosság, nem a helyesírás: telefonon az ékezet és a
   * kisbetű-nagybetű ne legyen akadály.
   */
  it('nem akad fenn az ékezeten, a kisbetűn és a szóközön', () => {
    expect(nevEgyezik('  proba   kft. ', 'Próba Kft.')).toBe(true);
    expect(nevEgyezik('NYESTE KRISZTIAN E.V.', 'Nyeste Krisztián e.v.')).toBe(true);
  });

  it('más nevet nem fogad el', () => {
    expect(nevEgyezik('Másik Kft.', 'Próba Kft.')).toBe(false);
    expect(nevEgyezik('Próba', 'Próba Kft.')).toBe(false);
  });

  /** Enterrel ne lehessen céget törölni, akkor se, ha a névmező üres. */
  it('az üreset sosem fogadja el', () => {
    expect(nevEgyezik('', 'Próba Kft.')).toBe(false);
    expect(nevEgyezik('', '')).toBe(false);
    expect(nevEgyezik('   ', null)).toBe(false);
  });
});
