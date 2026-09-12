import { describe, expect, test } from 'vitest';
import { BUKAS_PLAFON, osszevon, sav } from './konfidencia.ts';
import { MEZOK } from './sema.ts';

/**
 * A vektorok a régi `tests/Unit/KonfidenciaTest.php`-ból származnak.
 */

describe('sav — a négy állapot', () => {
  /**
   * A hiányzó magabiztosság nem magas magabiztosság. Korábban mindkettő
   * „biztos"-nak látszott, így egy néma modell ugyanolyan megnyugtató volt,
   * mint egy magabiztos.
   */
  test('a hiányzó pontszám külön állapot', () => {
    expect(sav(null)).toBe('nincs_adat');
    expect(sav(undefined)).toBe('nincs_adat');
    expect(sav(1.0)).toBe('biztos');
  });

  test('a küszöbök szerint sávol', () => {
    expect(sav(0.2)).toBe('gyanus');
    expect(sav(0.7)).toBe('bizonytalan');
    expect(sav(0.9)).toBe('biztos');
  });

  /**
   * ⚠️ A határérték az óvatosabb sávba esik. A modellek kerek számokat
   * mondanak, és a 0,85 az egyik kedvencük — egy kézzel írott számlán a 3.8
   * Flash pontosan ennyit adott a szállító nevére, ami a lap legalacsonyabb
   * értéke és az **egyetlen rossz mező** volt. Szigorú `<` mellett ez
   * jelöletlenül ment volna át.
   */
  test('a határon álló érték a szigorúbb sávba esik', () => {
    expect(sav(0.85)).toBe('bizonytalan');
    expect(sav(0.851)).toBe('biztos');
    expect(sav(0.5)).toBe('gyanus');
  });
});

describe('osszevon — a validátor csak lefelé húzhat', () => {
  test('a bukott validátor a magabiztos mezőt is a piros sávba húzza', () => {
    const { combined } = osszevon(
      { net_amount: 0.99 },
      { net_amount: 'A nettó és az ÁFA összege nem adja ki a bruttót.' },
      { net_amount: '1000.00' },
    );

    expect(combined['net_amount']).toBeLessThanOrEqual(BUKAS_PLAFON);
    expect(sav(combined['net_amount'])).toBe('gyanus');
  });

  /** Felfelé viszont soha: a hibátlan ellenőrzés nem tesz biztossá semmit. */
  test('a validátor nem emel', () => {
    const { combined } = osszevon({ net_amount: 0.4 }, {}, { net_amount: '1000.00' });

    expect(combined['net_amount']).toBe(0.4);
  });

  /**
   * Az üres mezőnek nincs értelmes magabiztossága: nincs mit ellenőrizni
   * rajta, és nem is szabad pirosnak látszania.
   */
  test('az üres mező kimarad', () => {
    const { combined } = osszevon({ doc_number: 0.9 }, {}, { doc_number: null });

    expect(combined).not.toHaveProperty('doc_number');
  });

  /** Amiről a modell nem nyilatkozott, azt nem tekintjük biztosnak. */
  test('a nem értékelt mező középre esik', () => {
    const { combined } = osszevon({}, {}, { doc_number: 'SZ-1' });

    expect(combined['doc_number']).toBe(0.5);
  });
});

describe('osszevon — a kézírás plafonja', () => {
  /**
   * ⚠️ A mérés, amiből ez a szabály lett: ugyanazt a kézzel írott számlát
   * **hatszor kiolvasva hatféle szállítónév** jött ki, egyik sem helyes —
   * miközben az adószámok, az összegek és a dátumok mind a hatszor ugyanazok
   * és helyesek voltak. A modell magabiztossága erre a mezőre 0,70-et,
   * 0,85-öt, majd 0,85 fölöttit adott, tehát harmadszorra jelöletlenül
   * engedte át a hibát.
   */
  test('a kézírásos iraton a név nem lehet biztos', () => {
    const { combined } = osszevon(
      { supplier_name: 0.99 },
      {},
      { supplier_name: 'Siklósi László E.V.' },
      true,
    );

    expect(sav(combined['supplier_name'])).toBe('bizonytalan');
  });

  /**
   * De nem minden mező: ez nem „csupa sárga képernyő". Aminek van független
   * fogása — az adószámnak ellenőrző számjegye, az összegeknek a
   * `nettó + ÁFA = bruttó` — az a kéziráson is maradhat jelöletlen.
   */
  test('a kézírásos iraton az ellenőrizhető mező érintetlen', () => {
    const { combined } = osszevon(
      { supplier_tax_number: 0.98, gross_amount: 0.99 },
      {},
      { supplier_tax_number: '66242422-1-36', gross_amount: '145000.00' },
      true,
    );

    expect(sav(combined['supplier_tax_number'])).toBe('biztos');
    expect(sav(combined['gross_amount'])).toBe('biztos');
  });

  /** A plafon csak lehúz: egy amúgy is alacsony pontszámot nem emel meg. */
  test('a kézírás plafonja nem emel', () => {
    const { combined } = osszevon(
      { doc_number: 0.2 },
      {},
      { doc_number: 'SEASA7371803' },
      true,
    );

    expect(combined['doc_number']).toBe(0.2);
  });

  /** Jól olvasható iraton semmi nem változik. */
  test('a jól olvasható iraton nincs plafon', () => {
    const { combined } = osszevon({ supplier_name: 0.99 }, {}, { supplier_name: 'Példa Kft.' });

    expect(sav(combined['supplier_name'])).toBe('biztos');
  });
});

describe('osszevon — az ÁFA-bontás', () => {
  /** Az ÁFA-bontás nem skalár, ezért külön kerül be — de ugyanúgy bekerül. */
  test('az ÁFA-bontás is kap pontszámot', () => {
    const { combined } = osszevon(
      { afa_bontas: 0.8 },
      {},
      { afa_bontas: [{ kulcs: 27, netto: '1000.00' }] },
    );

    expect(combined['afa_bontas']).toBe(0.8);
    // A `MEZOK` szándékosan nem tartalmazza: ismétlődő sorok halmaza, és
    // minden skalárt feltételező ciklus megbotlana rajta.
    expect(MEZOK).not.toContain('afa_bontas');
  });

  test('a bontást is lehúzza a bukott validátor', () => {
    const { combined } = osszevon(
      { afa_bontas: 0.95 },
      { afa_bontas: 'A bontás sorai nem adják ki a nettó végösszeget.' },
      { afa_bontas: [{ kulcs: 27, netto: '1000.00' }] },
    );

    expect(combined['afa_bontas']).toBeLessThanOrEqual(BUKAS_PLAFON);
  });
});
