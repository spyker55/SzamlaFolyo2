import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  keretAllapot,
  keretMondat,
  hatalyosKeret,
  FUTO_ALLAPOTOK,
  type CegAllapot,
} from './keret.ts';
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
    overage_limit_ft: null,
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
    overage_limit_ft: null,
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
   * A kör oka: a plafon sokáig **dísz volt**. A döntés `mehet: !elfogyott ||
   * overage_enabled` volt, tehát a bekapcsolt túlhasználat nyitott végű
   * engedélyt jelentett — pont azt, amit a Beállítások szerint nem lehet adni.
   */
  test('a plafon elérése megállít, engedélyezett túlhasználat mellett is', () => {
    const plafon = 500;
    const fer = Math.floor(plafon / szamlafolyo.csomagok.kicsi.extraFt);

    const k = keretAllapot(
      elofizeto({ overage_enabled: true, overage_limit_ft: plafon }),
      szamlafolyo.csomagok.kicsi.dokumentumok + fer,
      MOST,
    );

    expect(k.mehet).toBe(false);
    expect(k.tulhasznalat?.ferMegDarab).toBe(0);
  });

  test('a plafon alatt egy hellyel még átenged', () => {
    const plafon = 500;
    const fer = Math.floor(plafon / szamlafolyo.csomagok.kicsi.extraFt);

    const k = keretAllapot(
      elofizeto({ overage_enabled: true, overage_limit_ft: plafon }),
      szamlafolyo.csomagok.kicsi.dokumentumok + fer - 1,
      MOST,
    );

    expect(k.mehet).toBe(true);
  });

  /**
   * Két elakadás, két teendő. Aki a plafonra futott, annak a plafont kell
   * emelnie — egy közös „elfogyott a kereted" mondat a Beállítások rossz
   * kapcsolójához küldené.
   */
  test('a plafon indoka nem a keret indoka', () => {
    const betelt = keretAllapot(
      elofizeto({ overage_enabled: true, overage_limit_ft: 0 }),
      szamlafolyo.csomagok.kicsi.dokumentumok,
      MOST,
    );

    const keretVege = keretAllapot(
      elofizeto(),
      szamlafolyo.csomagok.kicsi.dokumentumok,
      MOST,
    );

    expect(betelt.indok).toContain('plafont');
    expect(keretVege.indok).toContain('Elfogyott');
    expect(betelt.indok).not.toBe(keretVege.indok);
  });

  test('próbaidőn a túlhasználat nem értelmezett', () => {
    expect(keretAllapot(proba({ overage_enabled: true }), 3, MOST).tulhasznalat).toBeNull();
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

/**
 * # A visszaváltás (2026-09-23)
 *
 * A jogi felülvizsgálat harmadik köre kérdezte meg, és a válasz **mérve rossz
 * volt**: aki a nagyobb csomag keretén belül dolgozott, aztán kisebbre váltott,
 * annak a fordulón a ciklus *teljes* felhasználását mérte a rendszer az *új*,
 * kisebb kerethez. A váltás előtt szabályosan elvégzett munka utólag
 * túlhasználatba esett — bekapcsolt túlhasználatnál pénzért.
 *
 * A javítás: a váltás pillanatában rögzítjük, mennyi fogyott addig
 * (`keret_fedezetek`), és az a régi keretig **fedezve marad**. Új keretet ez
 * nem ad — a fedezet sosem nagyobb a már felhasználtnál —, csak a múltat nem
 * számlázza újra.
 */
describe('visszaváltás: a már elvégzett munka nem esik utólag túlhasználatba', () => {
  const pro = szamlafolyo.csomagok.nagy;
  const start = szamlafolyo.csomagok.kicsi;

  test('Pro → Start 300 feldolgozott bizonylat után: nincs utólagos túlhasználat', () => {
    const k = keretAllapot(
      elofizeto({
        overage_enabled: true,
        overage_limit_ft: 1_000_000,
        fedezetek: [{ kulcs: pro.lookupKulcs, felhasznalt: 300 }],
      }),
      300,
      MOST,
    );

    expect(
      k.tulhasznalat?.darab,
      'A váltás előtt a Pro keretén belül feldolgozott 300 bizonylatból ' +
        `${k.tulhasznalat?.darab ?? '?'} esett túlhasználatba a Start ${start.dokumentumok}-as ` +
        'keretéhez mérve. Ez utólagos díj szabályosan elvégzett munkáért.',
    ).toBe(0);
  });

  test('a váltás UTÁNI munka viszont túlhasználat, ha a keret már elfogyott', () => {
    const k = keretAllapot(
      elofizeto({
        overage_enabled: true,
        overage_limit_ft: 1_000_000,
        fedezetek: [{ kulcs: pro.lookupKulcs, felhasznalt: 300 }],
      }),
      312,
      MOST,
    );

    expect(k.tulhasznalat?.darab).toBe(12);
    // A fedezet nem ad új helyet: a keret továbbra is elfogyott.
    expect(k.maradek).toBe(0);
    expect(k.tulhasznalatban).toBe(true);
  });

  test('ha a váltáskor még az új kereten belül volt, a fedezet nem számít', () => {
    const k = keretAllapot(
      elofizeto({ fedezetek: [{ kulcs: pro.lookupKulcs, felhasznalt: 10 }] }),
      30,
      MOST,
    );

    expect(k.maradek).toBe(start.dokumentumok - 30);
    expect(k.mehet).toBe(true);
  });

  test('a fedezet a régi keretnél nem nagyobb: a régi csomag túlhasználata megmarad', () => {
    // A Pro keretén (500) felül már 20 túlhasználat volt, aztán Startra váltott.
    expect(hatalyosKeret(start.dokumentumok, [{ kulcs: pro.lookupKulcs, felhasznalt: 520 }])).toBe(
      pro.dokumentumok,
    );
  });

  test('felfelé váltás nem változtat semmin', () => {
    expect(hatalyosKeret(pro.dokumentumok, [{ kulcs: start.lookupKulcs, felhasznalt: 40 }])).toBe(
      pro.dokumentumok,
    );
  });

  test('több váltásnál a legnagyobb fedezet számít', () => {
    const flow = szamlafolyo.csomagok.kozepes;

    expect(
      hatalyosKeret(start.dokumentumok, [
        { kulcs: pro.lookupKulcs, felhasznalt: 300 },
        { kulcs: flow.lookupKulcs, felhasznalt: 350 },
      ]),
    ).toBe(300);
  });

  test('ismeretlen régi csomagnál a felhasznált rész fedezve marad — ez sem ad új helyet', () => {
    expect(hatalyosKeret(start.dokumentumok, [{ kulcs: 'eltunt_kulcs', felhasznalt: 90 }])).toBe(
      90,
    );
  });

  test('hiányzó fedezetlista (régi RPC) = nincs fedezet', () => {
    expect(hatalyosKeret(start.dokumentumok, undefined)).toBe(start.dokumentumok);
    expect(hatalyosKeret(start.dokumentumok, null)).toBe(start.dokumentumok);
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

  test('túlhasználatban a forintot mondja, nem csak a tényt', () => {
    const m = keretMondat(
      keretAllapot(
        elofizeto({ overage_enabled: true }),
        szamlafolyo.csomagok.kicsi.dokumentumok + 4,
        MOST,
      ),
    );

    expect(m).toContain('4');
    // 4 × 50 Ft = 200 Ft — ez az a szám, ami a következő számlán megjelenik.
    expect(m).toContain(String(4 * szamlafolyo.csomagok.kicsi.extraFt));
  });

  test('lejárt keretnél magát az indokot mondja', () => {
    const k = keretAllapot(proba({ trial_ends_at: '2026-09-01T10:00:00Z' }), 0, MOST);

    expect(keretMondat(k)).toBe(k.indok);
  });
});

/**
 * A „fut-e az előfizetés" kérdést négy SQL-migráció is felteszi, mindegyik az
 * **írás helyén** — a kvóta, a helykorlát, a fióktörlés tényei és a
 * túlhasználat őre. Ez nem szépséghiba: a szabály ott ér valamit, ahol az írás
 * történik, és egy SQL-függvény nem tud TS-configot olvasni.
 *
 * Amit viszont nem hagyunk: hogy a példányok **csendben elcsússzanak**. Egy
 * kimaradt `past_due` azt jelentené, hogy egy lejárt bankkártyájú cég a
 * kvótánál még előfizetőnek számít, a helykorlátnál viszont már próbaidősnek —
 * és a kettő közül a megengedőbb mindig pénzbe kerül.
 *
 * Ugyanaz a fajta mérőeszköz, mint a `config/hely.test.ts`: a migrációs
 * fájlokból olvas, nem egy kézzel karbantartott listából.
 */
describe('a futó előfizetés definíciója', () => {
  const mappa = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');

  /**
   * Minden `stripe_status … in ('…', '…')` lista a migrációkból — a
   * `coalesce(new.stripe_status, '') not in (…)` alakot is beleértve. Ez a
   * kiegészítés a teszt írásakor derült ki: az első, szűkebb regex a
   * túlhasználat saját trigger-őrét **nem látta**, és némán háromra csökkent a
   * mért példányok száma. Pont ezért áll alatta a „tényleg talál-e
   * egyáltalán" állítás.
   */
  function sqlListak(): { fajl: string; allapotok: string[] }[] {
    const talalt: { fajl: string; allapotok: string[] }[] = [];

    for (const fajl of readdirSync(mappa).filter((f) => f.endsWith('.sql'))) {
      const szoveg = readFileSync(join(mappa, fajl), 'utf8');

      for (const egyezes of szoveg.matchAll(/stripe_status[^;]{0,40}?\bin\s*\(([^)]*)\)/gi)) {
        const allapotok = [...(egyezes[1] ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '');

        if (allapotok.length > 0) {
          talalt.push({ fajl, allapotok });
        }
      }
    }

    return talalt;
  }

  test('a migrációk tényleg tartalmaznak ilyen listát', () => {
    // Enélkül egy elrontott regex némán „mindent rendben"-t mondana: nulla
    // találatra nulla állítás bukik meg.
    expect(sqlListak().length).toBeGreaterThanOrEqual(4);
  });

  test('minden SQL-példány egyezik a keret.ts listájával', () => {
    const vart = [...FUTO_ALLAPOTOK].sort();

    for (const { fajl, allapotok } of sqlListak()) {
      expect(
        [...allapotok].sort(),
        `${fajl}: az SQL a(z) [${allapotok.join(', ')}] listát írja, ` +
          `a keret.ts viszont a(z) [${FUTO_ALLAPOTOK.join(', ')}] listát. ` +
          'Az egyiknek követnie kell a másikat — a megengedőbb mindig pénzbe kerül.',
      ).toEqual(vart);
    }
  });
});
