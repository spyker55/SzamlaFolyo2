import { describe, expect, test } from 'vitest';
import {
  bontastUrlapra,
  ellenorzottMezok,
  javitasok,
  type Javitas,
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

    const lista = javitasok(gepi, emberi, null, null, []);

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

    const lista = javitasok({}, uresUrlap() as never, gepi, emberi as never, []);

    expect(lista.map((j) => j.field)).not.toContain('afa_bontas');
  });

  test('a ténylegesen megváltozott bontás viszont bekerül', () => {
    const gepi = [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }];
    const emberi = [{ kulcs: 27, kategoria: 'S', netto: '2000.00', afa: '540.00' }];

    const lista = javitasok({}, uresUrlap() as never, gepi, emberi as never, []);

    expect(lista.map((j) => j.field)).toContain('afa_bontas');
  });

  test('az üres és a null bontás ugyanaz', () => {
    expect(javitasok({}, uresUrlap() as never, null, [], []).map((j) => j.field)).not.toContain(
      'afa_bontas',
    );
  });
});

/**
 * Egy javítás egyszer kerül a naplóba. Mérve 2026-10-01-én: az első külső
 * felhasználó 4 bizonylatát négyszer hagyta jóvá (jóváhagyás → visszaküldés →
 * újra), és 14 különböző (bizonylat, mező) párból 38 sor lett.
 */
describe('javitasok — újrajóváhagyáskor', () => {
  const gepi = { doc_type: 'egyeb', currency: 'EUR', due_date: null };
  const gepiBontas = [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }];
  const emberiBontas = [{ kulcs: 27, kategoria: 'S', netto: '2000.00', afa: '540.00' }] as never;

  function emberi(felulir: Record<string, string> = {}) {
    return { ...uresUrlap(), doc_type: 'szamla', currency: 'HUF', due_date: '2026-10-15', ...felulir } as never;
  }

  /** Egy kör: jóváhagyás a napló és a tárolt bontás aktuális állapotán. */
  function kor(naplo: Javitas[], tarolt: unknown, urlapErtek: never, bontas: never) {
    const lista = javitasok(gepi, urlapErtek, tarolt, bontas, naplo);
    naplo.push(...lista);
    return lista;
  }

  test('a négy kör ugyanazokkal a javításokkal: egyszer kerülnek be', () => {
    const naplo: Javitas[] = [];
    let tarolt: unknown = gepiBontas;

    const korok = [1, 2, 3, 4].map(() => {
      const lista = kor(naplo, tarolt, emberi(), emberiBontas);
      tarolt = emberiBontas;
      return lista.length;
    });

    expect(korok).toEqual([4, 0, 0, 0]);
    expect(naplo.map((j) => j.field).sort()).toEqual(['afa_bontas', 'currency', 'doc_type', 'due_date']);
  });

  test('a későbbi körben tett további javítás bekerül, a gépi értékkel', () => {
    const naplo: Javitas[] = [];
    kor(naplo, gepiBontas, emberi(), emberiBontas);

    const lista = kor(naplo, emberiBontas, emberi({ currency: 'USD' }), emberiBontas);

    expect(lista).toEqual([{ field: 'currency', machine_value: 'EUR', human_value: 'USD' }]);
  });

  test('a visszacsinált javítás is sor, és utána csend', () => {
    const naplo: Javitas[] = [];
    kor(naplo, gepiBontas, emberi(), emberiBontas);

    const vissza = kor(naplo, emberiBontas, emberi({ doc_type: 'egyeb' }), emberiBontas);
    const utana = kor(naplo, emberiBontas, emberi({ doc_type: 'egyeb' }), emberiBontas);

    expect(vissza).toEqual([{ field: 'doc_type', machine_value: 'egyeb', human_value: 'egyeb' }]);
    expect(utana).toEqual([]);
  });

  /**
   * A tárolt bontás a második körben már az emberé — korábban ezt nevezte a
   * napló gépinek.
   */
  test('a bontás gépi értéke a második körben is a gépé, nem az előző emberi', () => {
    const naplo: Javitas[] = [];
    const [elso] = kor(naplo, gepiBontas, emberi(), emberiBontas).filter((j) => j.field === 'afa_bontas');

    const masodik = [{ kulcs: 27, kategoria: 'S', netto: '3000.00', afa: '810.00' }] as never;
    const lista = kor(naplo, emberiBontas, emberi(), masodik).filter((j) => j.field === 'afa_bontas');

    expect(lista).toHaveLength(1);
    expect(lista[0]?.machine_value).toBe(elso?.machine_value);
    expect(lista[0]?.machine_value).toContain('"netto":1000');
  });

  test('ha a bontáshoz nem nyúlt, a második körben sem lesz belőle sor', () => {
    const naplo: Javitas[] = [];
    kor(naplo, gepiBontas, emberi(), gepiBontas as never);

    expect(naplo.map((j) => j.field)).not.toContain('afa_bontas');
    expect(kor(naplo, gepiBontas, emberi(), gepiBontas as never)).toEqual([]);
  });
});
