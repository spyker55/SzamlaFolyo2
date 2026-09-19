import { describe, expect, test } from 'vitest';
import { keretAllapot, keretMondat, type CegAllapot } from './keret.ts';
import { szamlafolyo } from '../../config/szamlafolyo.ts';

const MOST = new Date('2026-09-14T10:00:00Z');

/** Próbaidős cég, alapból bőven a kereten belül. */
function proba(felul: Partial<CegAllapot> = {}): CegAllapot {
  return {
    trial_ends_at: '2026-09-28T10:00:00Z',
    stripe_status: null,
    stripe_lookup_key: null,
    stripe_price_id: null,
    current_period_end: null,
    overage_enabled: false,
    ...felul,
  };
}

/** Előfizető cég a Start csomagon. */
function elofizeto(felul: Partial<CegAllapot> = {}): CegAllapot {
  return {
    trial_ends_at: '2026-08-01T10:00:00Z',
    stripe_status: 'active',
    stripe_lookup_key: szamlafolyo.csomagok.kicsi.lookupKulcs,
    stripe_price_id: 'price_proba',
    current_period_end: '2026-10-01T10:00:00Z',
    overage_enabled: false,
    ...felul,
  };
}

describe('próbaidő', () => {
  test('a kereten belül mehet', () => {
    const k = keretAllapot(proba(), 3, MOST);

    expect(k.allapot).toBe('proba');
    expect(k.mehet).toBe(true);
    expect(k.keret).toBe(szamlafolyo.proba.dokumentumok);
    expect(k.maradek).toBe(szamlafolyo.proba.dokumentumok - 3);
    expect(k.hatralevoNap).toBe(14);
    expect(k.indok).toBeNull();
  });

  /**
   * A nap és a darabszám **vagy** kapcsolatban van. Ha „és" lenne, az a cég,
   * amelyik az első napon feltölti az ötven bizonylatot, még tizenhárom napig
   * azt hinné, hogy van kerete.
   */
  test('a darabszám önmagában lezárja, akkor is, ha van még nap', () => {
    const k = keretAllapot(proba(), szamlafolyo.proba.dokumentumok, MOST);

    expect(k.mehet).toBe(false);
    expect(k.allapot).toBe('lejart');
    expect(k.hatralevoNap).toBe(14);
    expect(k.indok).toContain('Elfogyott');
  });

  test('a nap önmagában lezárja, akkor is, ha van még darab', () => {
    const k = keretAllapot(proba({ trial_ends_at: '2026-09-13T10:00:00Z' }), 1, MOST);

    expect(k.mehet).toBe(false);
    expect(k.hatralevoNap).toBe(0);
    expect(k.indok).toContain('próbaidő');
  });

  /**
   * Ha mindkettő elfogyott, a **napot** mondjuk: azon nem tud segíteni az, hogy
   * kevesebbet tölt fel, tehát az a valódi akadály.
   */
  test('ha mindkettő elfogyott, a napról szól az üzenet', () => {
    const k = keretAllapot(
      proba({ trial_ends_at: '2026-09-01T10:00:00Z' }),
      szamlafolyo.proba.dokumentumok + 5,
      MOST,
    );

    expect(k.indok).toContain('próbaidő');
    expect(k.indok).not.toContain('Elfogyott a próbaidős kereted');
  });

  test('az utolsó bizonylat még belefér', () => {
    const k = keretAllapot(proba(), szamlafolyo.proba.dokumentumok - 1, MOST);

    expect(k.mehet).toBe(true);
    expect(k.maradek).toBe(1);
  });

  /** A próbaidőn nincs túlhasználat: ahhoz előbb csomag kell. */
  test('a túlhasználat kapcsolója próbaidőn nem nyit kaput', () => {
    const k = keretAllapot(
      proba({ overage_enabled: true }),
      szamlafolyo.proba.dokumentumok,
      MOST,
    );

    expect(k.mehet).toBe(false);
    expect(k.tulhasznalatban).toBe(false);
  });

  test('a hiányzó trial_ends_at nem zár le semmit', () => {
    const k = keretAllapot(proba({ trial_ends_at: null }), 0, MOST);

    expect(k.mehet).toBe(true);
    expect(k.hatralevoNap).toBe(0);
  });
});

describe('előfizetés', () => {
  test('a csomag kerete az árazonosítóból jön', () => {
    const k = keretAllapot(elofizeto(), 10, MOST);

    expect(k.allapot).toBe('elofizetes');
    expect(k.csomag).toBe(szamlafolyo.csomagok.kicsi.nev);
    expect(k.keret).toBe(szamlafolyo.csomagok.kicsi.dokumentumok);
    expect(k.maradek).toBe(szamlafolyo.csomagok.kicsi.dokumentumok - 10);
    expect(k.mehet).toBe(true);
  });

  test('mindhárom csomag kulcsa a saját keretét adja', () => {
    for (const kulcs of ['kicsi', 'kozepes', 'nagy'] as const) {
      const csomag = szamlafolyo.csomagok[kulcs];
      const k = keretAllapot(elofizeto({ stripe_lookup_key: csomag.lookupKulcs }), 0, MOST);

      expect(k.keret).toBe(csomag.dokumentumok);
      expect(k.csomagKulcs).toBe(kulcs);
      expect(k.ismeretlenCsomag).toBe(false);
    }
  });

  /**
   * ⚠️ A csomagot a `lookup_key` dönti el, **nem** az árazonosító — mert az
   * utóbbi fiókonként más. Ez a teszt azt méri, hogy egy helyes árazonosító
   * önmagában nem elég: ha a kulcs hiányzik, a legkisebb keret jár.
   *
   * Enélkül egy visszafejlődés (a lekeresés visszaállítása árazonosítóra)
   * sandboxban zölden futna, és élesben adna ismeretlen csomagot — vagy
   * fordítva.
   */
  test('az árazonosító önmagában nem azonosít csomagot', () => {
    const k = keretAllapot(
      elofizeto({ stripe_lookup_key: null, stripe_price_id: 'price_1UCO5PV05U28wfjzx5lH1Swk' }),
      0,
      MOST,
    );

    expect(k.ismeretlenCsomag).toBe(true);
    expect(k.keret).toBe(szamlafolyo.csomagok.kicsi.dokumentumok);
  });

  /**
   * A régi rendszerben az ismeretlen csomag `PHP_INT_MAX` keretet adott —
   * épp az AI-költséges oldalon. A hibás irány itt a szigorúbb.
   */
  test('az ismeretlen csomagkulcs a LEGKISEBB keretet kapja, nem korlátlant', () => {
    const k = keretAllapot(elofizeto({ stripe_lookup_key: 'szamlafolyo_nincs_ilyen' }), 0, MOST);

    expect(k.ismeretlenCsomag).toBe(true);
    expect(k.keret).toBe(szamlafolyo.csomagok.kicsi.dokumentumok);
    expect(Number.isFinite(k.keret)).toBe(true);
  });

  test('a hiányzó csomagkulcs ugyanígy viselkedik', () => {
    const k = keretAllapot(elofizeto({ stripe_lookup_key: null }), 0, MOST);

    expect(k.ismeretlenCsomag).toBe(true);
    expect(k.keret).toBe(szamlafolyo.csomagok.kicsi.dokumentumok);
  });

  test('a keret elfogyása megállít, ha nincs túlhasználat', () => {
    const k = keretAllapot(elofizeto(), szamlafolyo.csomagok.kicsi.dokumentumok, MOST);

    expect(k.mehet).toBe(false);
    expect(k.maradek).toBe(0);
    expect(k.indok).toContain('Elfogyott');
  });

  test('a túlhasználat engedéllyel átenged, és ezt jelzi is', () => {
    const k = keretAllapot(
      elofizeto({ overage_enabled: true }),
      szamlafolyo.csomagok.kicsi.dokumentumok + 7,
      MOST,
    );

    expect(k.mehet).toBe(true);
    expect(k.tulhasznalatban).toBe(true);
    // A maradék akkor sem megy mínuszba: a túllépés külön jelzés, nem negatív szám.
    expect(k.maradek).toBe(0);
  });

  /**
   * Egy lejárt bankkártya nem ok arra, hogy valakit a hónap közepén elvágjunk a
   * saját bizonylataitól — a Stripe úgyis újrapróbálja.
   */
  test('a past_due még átmegy', () => {
    const k = keretAllapot(elofizeto({ stripe_status: 'past_due' }), 0, MOST);

    expect(k.allapot).toBe('elofizetes');
    expect(k.mehet).toBe(true);
  });

  test('a canceled visszaesik a próbaidő szabályaira', () => {
    const k = keretAllapot(
      elofizeto({ stripe_status: 'canceled', trial_ends_at: '2026-08-01T10:00:00Z' }),
      0,
      MOST,
    );

    expect(k.allapot).toBe('lejart');
    expect(k.mehet).toBe(false);
  });
});

describe('széljárás', () => {
  test('a negatív és a törtszámú felhasznált nem borít fel semmit', () => {
    expect(keretAllapot(proba(), -5, MOST).felhasznalt).toBe(0);
    expect(keretAllapot(proba(), 3.7, MOST).felhasznalt).toBe(3);
    expect(keretAllapot(proba(), Number.NaN, MOST).felhasznalt).toBe(0);
  });

  test('az értelmezhetetlen dátum nem dob, csak nem ad haladékot', () => {
    const k = keretAllapot(proba({ trial_ends_at: 'nem-dátum' }), 0, MOST);

    expect(k.hatralevoNap).toBe(0);
    expect(k.mehet).toBe(true);
  });
});

describe('keretMondat', () => {
  test('próbaidőn a darabot és a napot is mondja', () => {
    const m = keretMondat(keretAllapot(proba(), 10, MOST));

    expect(m).toContain('40');
    expect(m).toContain('14 nap');
  });

  test('egy napnál nem „1 nap", hanem „egy nap"', () => {
    const m = keretMondat(keretAllapot(proba({ trial_ends_at: '2026-09-15T09:00:00Z' }), 0, MOST));

    expect(m).toContain('egy nap');
  });

  test('előfizetésen a csomag nevét és a maradékot mondja', () => {
    const m = keretMondat(keretAllapot(elofizeto(), 10, MOST));

    expect(m).toContain(szamlafolyo.csomagok.kicsi.nev);
    expect(m).toContain('40');
  });

  test('lejárt keretnél magát az indokot mondja', () => {
    const k = keretAllapot(proba({ trial_ends_at: '2026-09-01T10:00:00Z' }), 0, MOST);

    expect(keretMondat(k)).toBe(k.indok);
  });
});
