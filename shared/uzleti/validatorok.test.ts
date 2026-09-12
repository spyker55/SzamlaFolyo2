import { describe, expect, test } from 'vitest';
import { bukottak } from './validatorok.ts';

/**
 * A vektorok a régi `tests/Unit/ValidatorokTest.php`-ból származnak.
 *
 * A tesztek a **kulcsok jelenlétét** vizsgálják, nem az üzenetszöveget: az
 * indoklás fogalmazása változhat, az viszont nem, hogy melyik mezőt jelöljük meg.
 */

describe('nettó + ÁFA = bruttó', () => {
  test('a jó összegek átmennek', () => {
    expect(
      bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1270.00' }),
    ).toEqual({});
  });

  test('a rossz bruttó mind a három mezőt jelzi', () => {
    // Nem tudjuk, melyik a rossz — ezért egyiket sem engedjük jelöletlenül.
    const b = bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '9999.00' });

    expect(Object.keys(b).sort()).toEqual(['gross_amount', 'net_amount', 'vat_amount']);
  });

  /** A kerekítés miatt egy egységnyi eltérés még nem hiba. */
  test('egy egységnyi eltérést elvisel', () => {
    expect(
      bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1271.00' }),
    ).toEqual({});
  });

  /** Fordított adózásnál a nulla ÁFA magától átmegy. */
  test('a fordított adózás nulla ÁFÁ-val rendben van', () => {
    expect(
      bukottak({ net_amount: '1000.00', vat_amount: '0.00', gross_amount: '1000.00' }),
    ).toEqual({});
  });
});

describe('adószám', () => {
  test('a hibás adószámot megfogja', () => {
    expect(bukottak({ supplier_tax_number: '12345678-2-42' })).toHaveProperty(
      'supplier_tax_number',
    );
  });

  test('a külföldi adószám átmegy', () => {
    expect(bukottak({ supplier_tax_number: 'ATU12345678' })).toEqual({});
  });
});

describe('dátumok', () => {
  test('a határidő nem előzheti meg a keltet', () => {
    const b = bukottak({ issue_date: '2026-03-14', due_date: '2026-03-01' });

    // Mindkettőt jelezzük: nem tudjuk, melyiket olvasta rosszul.
    expect(b).toHaveProperty('due_date');
    expect(b).toHaveProperty('issue_date');
  });

  test('az értelmezhetetlen dátumot jelzi', () => {
    expect(bukottak({ issue_date: 'valamikor' })).toHaveProperty('issue_date');
  });

  test('az értelmetlen évszámot jelzi', () => {
    expect(bukottak({ issue_date: '1799-03-14' })).toHaveProperty('issue_date');
    expect(bukottak({ issue_date: '2200-03-14' })).toHaveProperty('issue_date');
  });
});

describe('pénznem', () => {
  test('az ismeretlen pénznemkódot jelzi', () => {
    expect(bukottak({ currency: 'XYZ' })).toHaveProperty('currency');
    expect(bukottak({ currency: 'HUF' })).toEqual({});
    expect(bukottak({ currency: 'eur' })).toEqual({});
  });
});

describe('ÁFA-bontás', () => {
  test('a jó bontás átmegy', () => {
    const b = bukottak(
      { net_amount: '5000.00', vat_amount: '1130.00', gross_amount: '6130.00' },
      [
        { kulcs: 27.0, kategoria: 'S', netto: '4000.00', afa: '1080.00' },
        { kulcs: 5.0, kategoria: 'S', netto: '1000.00', afa: '50.00' },
      ],
    );

    expect(b).toEqual({});
  });

  test('a kulcsból ki kell jönnie az ÁFÁ-nak', () => {
    const b = bukottak({ net_amount: '1000.00', vat_amount: '50.00', gross_amount: '1050.00' }, [
      { kulcs: 27.0, kategoria: 'S', netto: '1000.00', afa: '50.00' },
    ]);

    expect(b).toHaveProperty('afa_bontas');
  });

  test('a kerekítést elviseli', () => {
    const b = bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1270.00' }, [
      { kulcs: 27.0, kategoria: 'S', netto: '1000.00', afa: '270.40' },
    ]);

    expect(b).toEqual({});
  });

  test('fordított adózásban nem lehet ÁFA', () => {
    const b = bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1270.00' }, [
      { kulcs: 27.0, kategoria: 'AE', netto: '1000.00', afa: '270.00' },
    ]);

    expect(b).toHaveProperty('afa_bontas');
  });

  test('a fordított adózás nulla ÁFÁ-val rendben van', () => {
    const b = bukottak({ net_amount: '1000.00', vat_amount: '0.00', gross_amount: '1000.00' }, [
      { kulcs: 0.0, kategoria: 'AE', netto: '1000.00', afa: '0.00' },
    ]);

    expect(b).toEqual({});
  });

  test('az ismétlődő kulcsot jelzi', () => {
    const b = bukottak({ net_amount: '2000.00', vat_amount: '540.00', gross_amount: '2540.00' }, [
      { kulcs: 27.0, kategoria: 'S', netto: '1000.00', afa: '270.00' },
      { kulcs: 27.0, kategoria: 'S', netto: '1000.00', afa: '270.00' },
    ]);

    expect(b).toHaveProperty('afa_bontas');
  });

  test('bontás nélkül nem panaszkodik', () => {
    expect(
      bukottak({ net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1270.00' }, null),
    ).toEqual({});
  });

  /**
   * ⚠️ **Ez a bontás legnagyobb haszna.**
   *
   * Pontosan ez a hiba fordult elő élesben: a modell egy tételsor nettóját írta
   * be végösszegnek. A fejlécből magából ez nem derül ki — a bruttó stimmel
   * hozzá, tehát a `nettó + ÁFA = bruttó` átengedné. A sorok összegéből viszont
   * kiderül.
   */
  test('a bontás megfogja a rossz fejléc-végösszeget', () => {
    const b = bukottak(
      // A nettó egy tételsoré, nem a végösszeg — a bruttó viszont stimmel
      // hozzá, tehát a meglévő számtani ellenőrzés átengedné.
      { net_amount: '1000.00', vat_amount: '270.00', gross_amount: '1270.00' },
      [
        { kulcs: 27.0, kategoria: 'S', netto: '4000.00', afa: '1080.00' },
        { kulcs: 5.0, kategoria: 'S', netto: '1000.00', afa: '50.00' },
      ],
    );

    expect(b).toHaveProperty('afa_bontas');
    expect(b).toHaveProperty('net_amount');
    expect(b).toHaveProperty('vat_amount');
  });

  /**
   * A fejlécen talált ellentmondás indoklása erősebb: azt a bontásé nem írja
   * felül. (A régi PHP tömb-unió szemantikája — a bal oldal nyer.)
   */
  test('a fejléc indoklását a bontás nem írja felül', () => {
    const b = bukottak(
      { net_amount: '1000.00', vat_amount: '270.00', gross_amount: '9999.00' },
      [{ kulcs: 27.0, kategoria: 'S', netto: '4000.00', afa: '1080.00' }],
    );

    expect(b['net_amount']).toBe('A nettó és az ÁFA összege nem adja ki a bruttót.');
  });
});
