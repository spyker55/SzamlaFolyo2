import { describe, expect, test } from 'vitest';
import { dontes, type Elozmeny, type KapuBemenet } from './kapuk.ts';

/**
 * Az automatikus jóváhagyás hét kapuja.
 *
 * A vezérelv: **soha ne írjuk ki, hogy „ellenőrizve", ha senki nem nézte meg.**
 * Ezért itt minden teszt azt is nézi, hogy az indok kimondja-e, mi történt.
 */

const TISZTA_ELOZMENY: Elozmeny = {
  ismertSzallito: true,
  bizonylatszamMarLatott: false,
  osszegKilog: false,
  keltKilog: false,
  penznemSzokatlan: false,
  cegEddigiBizonylatai: 50,
};

function be(felulir: Partial<KapuBemenet> = {}): KapuBemenet {
  return {
    mezok: {
      supplier_name: 'Példa Kft.',
      doc_number: 'SZ-2026-0042',
      issue_date: '2026-03-14',
      gross_amount: '6130.00',
    },
    konfidencia: { supplier_name: 0.97, doc_number: 0.95, issue_date: 0.99, gross_amount: 0.98 },
    bukottValidatorok: {},
    nehezenOlvashato: false,
    tobbIratGyanu: false,
    duplikatum: false,
    autoJovahagyasBe: true,
    elozmeny: TISZTA_ELOZMENY,
    mintaSorszam: 7,
    ...felulir,
  };
}

test('minden kapu átmegy → automatikus jóváhagyás, kimondott indokkal', () => {
  const d = dontes(be());

  expect(d.automatikus).toBe(true);
  expect(d.indok).toBe('Minden ellenőrzés rendben, ismert szállító.');
});

describe('a hét kapu', () => {
  test('a) bukott determinisztikus ellenőrzés → ember, és az indok a validátoré', () => {
    const d = dontes(
      be({ bukottValidatorok: { net_amount: 'A nettó és az ÁFA összege nem adja ki a bruttót.' } }),
    );

    expect(d.automatikus).toBe(false);
    expect(d.indok).toBe('A nettó és az ÁFA összege nem adja ki a bruttót.');
  });

  test('b) hiányzó kulcsmező → ember', () => {
    for (const mezo of ['supplier_name', 'doc_number', 'issue_date', 'gross_amount']) {
      const d = dontes(be({ mezok: { ...be().mezok, [mezo]: null } }));
      expect(d.automatikus, `hiányzó: ${mezo}`).toBe(false);
    }
  });

  /** A küszöb az óvatosabb sávba esik: a 0,85 még nem elég. */
  test('c) a küszöbre eső magabiztosság → ember', () => {
    expect(dontes(be({ konfidencia: { supplier_name: 0.85 } })).automatikus).toBe(false);
    expect(dontes(be({ konfidencia: { supplier_name: 0.851 } })).automatikus).toBe(true);
  });

  /**
   * ⚠️ Ez az egyik a két kapu közül, ami a kézzel írott számlát megfogja. A
   * számtan ott hibátlan volt, a szállító nevét viszont a modell kitalálta.
   */
  test('d) nehezen olvasható → ember, akkor is, ha minden más rendben', () => {
    const d = dontes(be({ nehezenOlvashato: true }));

    expect(d.automatikus).toBe(false);
    expect(d.indok).toContain('Kézzel írott');
  });

  test('e) szétszedetlen köteg → ember', () => {
    expect(dontes(be({ tobbIratGyanu: true })).automatikus).toBe(false);
  });

  test('f) duplikátum → ember', () => {
    expect(dontes(be({ duplikatum: true })).automatikus).toBe(false);
  });

  /**
   * ⚠️ A másik kapu a kézzel írott számlához: az **először látott szállító**
   * mindig emberhez megy. A bizalmat ki kell érdemelni — miután egyszer egy
   * ember jóváhagyta, a név onnantól összevethető az előzménnyel.
   */
  test('g) ismeretlen szállító → ember', () => {
    const d = dontes(be({ elozmeny: { ...TISZTA_ELOZMENY, ismertSzallito: false } }));

    expect(d.automatikus).toBe(false);
    expect(d.indok).toContain('még nem láttunk bizonylatot');
  });

  test('g) a többi előzmény-eltérés is emberhez visz', () => {
    const esetek: (keyof Elozmeny)[] = [
      'bizonylatszamMarLatott',
      'osszegKilog',
      'keltKilog',
      'penznemSzokatlan',
    ];

    for (const eset of esetek) {
      const d = dontes(be({ elozmeny: { ...TISZTA_ELOZMENY, [eset]: true } }));
      expect(d.automatikus, eset).toBe(false);
      expect(d.indok.length, eset).toBeGreaterThan(0);
    }
  });
});

describe('a fékek', () => {
  test('a cégenkénti kapcsoló mindent felülír', () => {
    const d = dontes(be({ autoJovahagyasBe: false }));

    expect(d.automatikus).toBe(false);
    expect(d.indok).toContain('ki van kapcsolva');
  });

  /**
   * A cég első 20 bizonylata mindig emberhez megy. Előzmény nélkül a g) pont
   * üresen jár, és a felhasználónak is látnia kell egyszer, mit csinál a
   * rendszer, mielőtt rábízza.
   */
  test('a bemelegítés alatt minden bizonylat emberhez megy', () => {
    for (const eddig of [0, 1, 19]) {
      const d = dontes(be({ elozmeny: { ...TISZTA_ELOZMENY, cegEddigiBizonylatai: eddig } }));
      expect(d.automatikus, `eddigi: ${eddig}`).toBe(false);
      expect(d.indok).toContain('első 20');
    }

    expect(dontes(be({ elozmeny: { ...TISZTA_ELOZMENY, cegEddigiBizonylatai: 20 } })).automatikus).toBe(
      true,
    );
  });

  /**
   * Minden huszadik egyébként átmenő bizonylat mégis ember elé kerül. Két
   * okból: így marad kalibrálva az ember, és **így mérhető az automatikus
   * jóváhagyás tévedési aránya** — enélkül csak reménykednénk.
   */
  test('minden huszadik mintavételre kerül', () => {
    expect(dontes(be({ mintaSorszam: 20 })).automatikus).toBe(false);
    expect(dontes(be({ mintaSorszam: 40 })).automatikus).toBe(false);
    expect(dontes(be({ mintaSorszam: 19 })).automatikus).toBe(true);
    expect(dontes(be({ mintaSorszam: 21 })).automatikus).toBe(true);
  });

  test('a mintavétel indoka kimondja, hogy nem a bizonylattal van baj', () => {
    expect(dontes(be({ mintaSorszam: 20 })).indok).toContain('Mintavétel');
  });
});
