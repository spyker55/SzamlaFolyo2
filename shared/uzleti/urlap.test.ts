import { describe, expect, test } from 'vitest';
import {
  bontastUrlapra,
  ellenorzottMezok,
  javitasok,
  parseoltBontas,
  urlapraTolt,
  uresUrlap,
} from './urlap.ts';

function urlap(felulir: Record<string, string> = {}) {
  return {
    ...uresUrlap(),
    doc_type: 'szamla',
    supplier_name: 'Példa Kft.',
    doc_number: 'SZ-1',
    issue_date: '2026-03-14',
    net_amount: '5000',
    vat_amount: '1350',
    gross_amount: '6350',
    ...felulir,
  };
}

describe('ellenorzottMezok — az ember írásmódja', () => {
  /** Az ember úgy gépel, ahogy a papíron látja. */
  test('a magyar írásmódú összeget a tárolási alakra hozza', () => {
    const e = ellenorzottMezok(urlap({ gross_amount: '1 270,50' }));

    expect(e.ok).toBe(true);
    expect(e.ok && e.mezok.gross_amount).toBe('1270.50');
  });

  test('a magyar dátumírást elfogadja', () => {
    const e = ellenorzottMezok(urlap({ issue_date: '2026. 03. 14.' }));

    expect(e.ok && e.mezok.issue_date).toBe('2026-03-14');
  });

  test('az adószámot tagolja, a pénznemet nagybetűsíti', () => {
    const e = ellenorzottMezok(
      urlap({ supplier_tax_number: '107733812 44', currency: 'huf' }),
    );

    expect(e.ok && e.mezok.supplier_tax_number).toBe('10773381-2-44');
    expect(e.ok && e.mezok.currency).toBe('HUF');
  });

  test('az üres mező null lesz, nem üres sztring', () => {
    const e = ellenorzottMezok(urlap({ customer_name: '   ' }));

    expect(e.ok && e.mezok.customer_name).toBeNull();
  });
});

describe('ellenorzottMezok — ami megállít', () => {
  /**
   * ⚠️ Rosszabb csendben nullát menteni, mint visszakérdezni. Ez a **bevitel**
   * ellenőrzése — a bukott validátor ettől függetlenül nem blokkol, mert az a
   * papírról szól, és a papír az emberé.
   */
  test('az értelmezhetetlen összeg megállít', () => {
    const e = ellenorzottMezok(urlap({ gross_amount: 'tizenkétezer' }));

    expect(e.ok).toBe(false);
    expect(!e.ok && e.hibak.gross_amount).toContain('nem tudjuk értelmezni');
  });

  test('az értelmezhetetlen dátum megállít', () => {
    const e = ellenorzottMezok(urlap({ issue_date: '2026-02-31' }));

    expect(e.ok).toBe(false);
    expect(!e.ok && e.hibak.issue_date).toContain('dátum');
  });

  test('a bizonylattípus kötelező, és csak ismert lehet', () => {
    expect(ellenorzottMezok(urlap({ doc_type: '' })).ok).toBe(false);
    expect(ellenorzottMezok(urlap({ doc_type: 'kitalált' })).ok).toBe(false);
  });
});

describe('parseoltBontas', () => {
  test('a jó sor átmegy, a tárolási alakon', () => {
    const { sorok, hibak } = parseoltBontas([
      { kulcs: '27%', kategoria: 'S', netto: '1 000,50', afa: '270' },
    ]);

    expect(hibak).toEqual({});
    expect(sorok).toEqual([{ kulcs: 27, kategoria: 'S', netto: '1000.50', afa: '270.00' }]);
  });

  /** A törléshez ne kelljen gombot keresni. */
  test('a teljesen üres sor némán kiesik', () => {
    const { sorok, hibak } = parseoltBontas([
      { kulcs: '', kategoria: '', netto: '', afa: '' },
      { kulcs: '27', kategoria: 'S', netto: '1000', afa: '270' },
    ]);

    expect(hibak).toEqual({});
    expect(sorok).toHaveLength(1);
  });

  /** A félig kitöltött viszont hiba: se nem könyvelhető, se nem ellenőrizhető. */
  test('a félig kitöltött sor hibát ad', () => {
    const { sorok, hibak } = parseoltBontas([{ kulcs: '', kategoria: 'S', netto: '1000', afa: '' }]);

    expect(hibak['0.kulcs']).toBeDefined();
    expect(sorok).toHaveLength(0);
  });

  test('az adóalap nélküli sor hibát ad', () => {
    const { hibak } = parseoltBontas([{ kulcs: '27', kategoria: 'S', netto: '', afa: '270' }]);

    expect(hibak['0.netto']).toBeDefined();
  });

  test('az ismeretlen kategória null lesz, de a sor marad', () => {
    const { sorok } = parseoltBontas([
      { kulcs: '27', kategoria: 'XYZ', netto: '1000', afa: '270' },
    ]);

    expect(sorok[0]?.kategoria).toBeNull();
    expect(sorok[0]?.kulcs).toBe(27);
  });
});

describe('urlapra töltés', () => {
  test('a tárolt sorból űrlapalak lesz, a null üres sztring', () => {
    const u = urlapraTolt({ doc_type: 'nyugta', supplier_name: null, gross_amount: '6130.00' });

    expect(u.doc_type).toBe('nyugta');
    expect(u.supplier_name).toBe('');
    expect(u.gross_amount).toBe('6130.00');
  });

  test('a tárolt bontásból szerkeszthető sorok lesznek', () => {
    const sorok = bontastUrlapra([{ kulcs: 27, kategoria: 'S', netto: '1000.00', afa: null }]);

    expect(sorok).toEqual([{ kulcs: '27', kategoria: 'S', netto: '1000.00', afa: '' }]);
  });
});

describe('javitasok — a mérőeszköz', () => {
  test('csak a ténylegesen átírt mező kerül be', () => {
    const gepi = { supplier_name: 'Pelda Kft', gross_amount: '6130.00' };
    const emberi = { ...uresUrlap(), supplier_name: 'Példa Kft.', gross_amount: '6130.00' } as never;

    const lista = javitasok(gepi, emberi, null, null);

    expect(lista.map((j) => j.field)).toContain('supplier_name');
    expect(lista.map((j) => j.field)).not.toContain('gross_amount');
  });

  /**
   * ⚠️ A `JSON.stringify(27.0)` „27"-et ír, tehát a tárolt kulcs számként jön
   * vissza. A nyers egyezésvizsgálat **minden jóváhagyáskor fantomjavítást
   * szülne** — és akkor a mérőszám, amiért a tábla van, használhatatlan lenne.
   */
  test('a változatlan bontás nem szül fantomjavítást', () => {
    const gepi = [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }];
    const emberi = [{ kulcs: 27, kategoria: 'S', netto: '1000.00', afa: '270.00' }];

    const lista = javitasok({}, uresUrlap() as never, gepi, emberi as never);

    expect(lista.map((j) => j.field)).not.toContain('afa_bontas');
  });

  test('a ténylegesen megváltozott bontás viszont bekerül', () => {
    const gepi = [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }];
    const emberi = [{ kulcs: 27, kategoria: 'S', netto: '2000.00', afa: '540.00' }];

    const lista = javitasok({}, uresUrlap() as never, gepi, emberi as never);

    expect(lista.map((j) => j.field)).toContain('afa_bontas');
  });

  test('az üres és a null bontás ugyanaz', () => {
    expect(javitasok({}, uresUrlap() as never, null, []).map((j) => j.field)).not.toContain(
      'afa_bontas',
    );
  });
});
