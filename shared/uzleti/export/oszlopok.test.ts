import { describe, expect, test } from 'vitest';
import { FEJLECEK, KULCSOK, osszesites, sor, SZAM_OSZLOPOK } from './oszlopok.ts';

/**
 * Az esetek a régi `tests/Unit/ExportFormatumTest.php`-ból és az
 * `ExportUgyfelSzuroTest`-ből származnak, kiegészítve azzal, ami a fájl és a
 * bizonylat szétválása óta új.
 */

const SZAMLA = {
  doc_type: 'szamla',
  supplier_name: 'Példa Kft.',
  supplier_tax_number: '10773381-2-44',
  customer_name: null,
  customer_tax_number: null,
  doc_number: 'SZ-1',
  issue_date: '2026-03-14',
  fulfillment_date: null,
  due_date: '2026-03-28',
  currency: 'HUF',
  payment_method: 'átutalás',
  net_amount: '100000.00',
  vat_amount: '27000.00',
  gross_amount: '127000.00',
  fizetendo: '127000.00',
  afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: '100000.00', afa: '27000.00' }],
  note: null,
  created_at: '2026-03-15T08:00:00Z',
  oldal_tol: null,
  oldal_ig: null,
  forras: 'upload',
};

describe('fejlécek', () => {
  test('a kulcsok és a fejlécek egy listából jönnek', () => {
    expect(KULCSOK.length).toBe(Object.keys(FEJLECEK).length);
    expect(KULCSOK[0]).toBe('tipus');
  });

  /**
   * Az új oszlop **a lista végén** áll: a meglévők sorrendje nem mozdulhat,
   * mert a könyvelő Excel-sablonja arra épül.
   */
  test('az Oldalak oszlop a lista végén van', () => {
    expect(KULCSOK[KULCSOK.length - 1]).toBe('oldalak');
    expect(KULCSOK[KULCSOK.length - 2]).toBe('forras');
  });

  test('minden kulcsonkénti oszlop szám oszlop', () => {
    for (const kulcs of ['netto_27', 'afa_27', 'netto_0', 'netto_egyeb', 'afa_egyeb'] as const) {
      expect(SZAM_OSZLOPOK).toContain(kulcs);
    }
  });
});

describe('sor', () => {
  test('a mezőket a helyükre teszi', () => {
    const s = sor(SZAMLA);

    expect(s['tipus']).toBe('Számla');
    expect(s['szallito']).toBe('Példa Kft.');
    expect(s['bizonylatszam']).toBe('SZ-1');
    expect(s['kelt']).toBe('2026-03-14');
    expect(s['brutto']).toBe(127000);
    expect(s['penznem']).toBe('HUF');
    expect(s['forras']).toBe('feltöltés');
  });

  /**
   * A kulcsonkénti oszlopok a bontásból számolódnak, nem külön tárolt adatból —
   * így nem tudnak elcsúszni attól, amit az Ellenőrzés képernyő mutat.
   */
  test('a kulcsonkénti oszlopok a bontásból jönnek', () => {
    const s = sor(SZAMLA);

    expect(s['netto_27']).toBe(100000);
    expect(s['afa_27']).toBe(27000);
  });

  /**
   * Amelyik kulcsra nincs sor, az `null` marad — **nem nulla**. A nulla azt
   * állítaná, hogy volt ilyen adóalap, és éppen semmi nem esett rá.
   */
  test('amire nincs bontássor, az null marad', () => {
    const s = sor(SZAMLA);

    expect(s['netto_5']).toBeNull();
    expect(s['netto_0']).toBeNull();
    expect(s['afa_egyeb']).toBeNull();
  });

  /** A díjbekérő nem könyvelendő: a rá kiállított számla ugyanazt hozza. */
  test('a díjbekérő nem könyvelendő', () => {
    expect(sor(SZAMLA)['konyvelendo']).toBe('igen');
    expect(sor({ ...SZAMLA, doc_type: 'dijbekero' })['konyvelendo']).toBe('nem');
    expect(sor({ ...SZAMLA, doc_type: 'nyugta' })['konyvelendo']).toBe('igen');
    expect(sor({ ...SZAMLA, doc_type: null })['konyvelendo']).toBe('nem');
  });

  /**
   * A fájl és a bizonylat szétválása óta egy köteg harmadik számlája semmiben
   * nem különböztethető meg a sorban — az oldaltartomány teszi visszakereshetővé.
   */
  test('az oldaltartomány kiírása', () => {
    expect(sor(SZAMLA)['oldalak']).toBeNull();
    expect(sor({ ...SZAMLA, oldal_tol: 3, oldal_ig: 4 })['oldalak']).toBe('3–4');
    expect(sor({ ...SZAMLA, oldal_tol: 2, oldal_ig: 2 })['oldalak']).toBe('2');
  });

  /**
   * A beérkezés a **budapesti** nap, nem az UTC-é: a felhasználó a saját
   * naptárában keresi vissza. Márciusban még téli idő van (UTC+1), tehát a
   * 23:30 UTC már a következő nap.
   */
  test('a beérkezés budapesti nap, ISO alakban', () => {
    expect(sor(SZAMLA)['beerkezes']).toBe('2026-03-15');
    expect(sor({ ...SZAMLA, created_at: '2026-03-15T22:30:00Z' })['beerkezes']).toBe('2026-03-15');
    expect(sor({ ...SZAMLA, created_at: '2026-03-15T23:30:00Z' })['beerkezes']).toBe('2026-03-16');
  });

  /** A PostgREST a `numeric`-et hol számként, hol sztringként adja vissza. */
  test('a számot számként adja, akárhogy jön az adatbázisból', () => {
    expect(sor({ ...SZAMLA, gross_amount: 127000 })['brutto']).toBe(127000);
    expect(sor({ ...SZAMLA, gross_amount: '127000.00' })['brutto']).toBe(127000);
    expect(sor({ ...SZAMLA, gross_amount: null })['brutto']).toBeNull();
  });

  /** Az üres sztring nem üres cella, hanem hiányzó érték. */
  test('az üres sztringből null lesz', () => {
    expect(sor({ ...SZAMLA, supplier_name: '' })['szallito']).toBeNull();
  });

  /** A beágyazott bontás külön kulcson utazik — csak a JSON írja ki. */
  test('a beágyazott bontás a soron marad', () => {
    expect(sor(SZAMLA)['afa_bontas']).toEqual(SZAMLA.afa_bontas);
    expect(sor({ ...SZAMLA, afa_bontas: null })['afa_bontas']).toBeNull();
  });
});

describe('osszesites', () => {
  /** ⚠️ Egy 100 EUR és egy 100 HUF nem 200 semmi. */
  test('a pénznemek soha nem adódnak össze', () => {
    const ossz = osszesites([
      SZAMLA,
      { ...SZAMLA, currency: 'EUR', net_amount: '100.00', vat_amount: '27.00', gross_amount: '127.00' },
    ]);

    expect(Object.keys(ossz).sort()).toEqual(['EUR', 'HUF']);
    expect(ossz['HUF']?.brutto).toBe(127000);
    expect(ossz['EUR']?.brutto).toBe(127);
  });

  test('csak a könyvelendő sorokat számolja', () => {
    const ossz = osszesites([SZAMLA, { ...SZAMLA, doc_type: 'dijbekero' }]);

    expect(ossz['HUF']?.darab).toBe(1);
    expect(ossz['HUF']?.brutto).toBe(127000);
  });

  /** A lebegőpontos sodródást egyszer, a végén vágjuk vissza. */
  test('a lebegőpontos sodródás nem szivárog ki', () => {
    const tized = {
      ...SZAMLA,
      net_amount: '0.10',
      vat_amount: '0.20',
      gross_amount: '0.30',
      afa_bontas: null,
    };

    const ossz = osszesites([tized, tized, tized]);

    expect(ossz['HUF']?.netto).toBe(0.3);
    expect(ossz['HUF']?.afa).toBe(0.6);
  });

  test('pénznem nélkül külön vödör, nem keveredik', () => {
    const ossz = osszesites([{ ...SZAMLA, currency: null }]);

    expect(ossz['—']?.darab).toBe(1);
  });
});
