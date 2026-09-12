import { describe, expect, test } from 'vitest';
import { bizonylatOldalszama, feldolgoz, type LancBemenet } from './lanc.ts';
import type { Elozmeny } from './kapuk.ts';
import { xmltFelolvas } from './xml/parser.ts';
import { ertelmez } from './xml/xmlKiolvaso.ts';

/**
 * A teljes lánc, végponttól végpontig — de **hálózat és adatbázis nélkül**.
 *
 * A bemenet egy valódi UBL-számla; innentől minden a mi kódunk: tisztítás,
 * normalizálás, validátorok, konfidencia, kapuk, kredit.
 */

const UBL = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>SZ-2026-0042</ID>
  <IssueDate>2026-03-14</IssueDate>
  <DueDate>2026-03-28</DueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>HUF</DocumentCurrencyCode>
  <AccountingSupplierParty><Party>
    <PartyLegalEntity><RegistrationName>Példa Kereskedelmi Kft.</RegistrationName></PartyLegalEntity>
    <PartyTaxScheme><CompanyID>10773381-2-44</CompanyID></PartyTaxScheme>
  </Party></AccountingSupplierParty>
  <AccountingCustomerParty><Party>
    <PartyLegalEntity><RegistrationName>Vevő Zrt.</RegistrationName></PartyLegalEntity>
    <PartyTaxScheme><CompanyID>10537914-4-44</CompanyID></PartyTaxScheme>
  </Party></AccountingCustomerParty>
  <TaxTotal>
    <TaxAmount>1130.00</TaxAmount>
    <TaxSubtotal>
      <TaxableAmount>4000.00</TaxableAmount><TaxAmount>1080.00</TaxAmount>
      <TaxCategory><ID>S</ID><Percent>27</Percent></TaxCategory>
    </TaxSubtotal>
    <TaxSubtotal>
      <TaxableAmount>1000.00</TaxableAmount><TaxAmount>50.00</TaxAmount>
      <TaxCategory><ID>S</ID><Percent>5</Percent></TaxCategory>
    </TaxSubtotal>
  </TaxTotal>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>5000.00</TaxExclusiveAmount>
    <TaxInclusiveAmount>6130.00</TaxInclusiveAmount>
    <PayableAmount>6130.00</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;

function nyersUbl(): Record<string, unknown> {
  const doc = xmltFelolvas(UBL, UBL.length)!;
  return ertelmez(doc)!.nyers;
}

const BEJARATOTT: Elozmeny = {
  ismertSzallito: true,
  bizonylatszamMarLatott: false,
  osszegKilog: false,
  keltKilog: false,
  penznemSzokatlan: false,
  cegEddigiBizonylatai: 50,
};

function be(felulir: Partial<LancBemenet> = {}): LancBemenet {
  return {
    nyers: nyersUbl(),
    oldalszam: null,
    duplikatum: false,
    autoJovahagyasBe: true,
    elozmeny: BEJARATOTT,
    mintaSorszam: 7,
    ...felulir,
  };
}

describe('egy hibátlan e-számla útja', () => {
  test('a mezők a tárolási alakra jönnek', () => {
    const e = feldolgoz(be());

    expect(e.mezok.doc_type).toBe('szamla');
    expect(e.mezok.doc_number).toBe('SZ-2026-0042');
    expect(e.mezok.issue_date).toBe('2026-03-14');
    expect(e.mezok.currency).toBe('HUF');
    // Sztringként, két tizedessel — ahogy a numeric(15,2) várja.
    expect(e.mezok.net_amount).toBe('5000.00');
    expect(e.mezok.vat_amount).toBe('1130.00');
    expect(e.mezok.gross_amount).toBe('6130.00');
  });

  test('egyetlen validátor sem bukik meg', () => {
    expect(feldolgoz(be()).validatorok).toEqual({});
  });

  /** A strukturált adat nem találgatás: a szállító gépe írta. */
  test('a magabiztosság végig 1.0', () => {
    const k = feldolgoz(be()).konfidencia.combined;

    expect(k['supplier_name']).toBe(1);
    expect(k['gross_amount']).toBe(1);
    expect(k['afa_bontas']).toBe(1);
  });

  test('bejáratott cégnél és ismert szállítónál automatikusan átmegy', () => {
    const e = feldolgoz(be());

    expect(e.allapot).toBe('jovahagyva');
    expect(e.kapu.automatikus).toBe(true);
    expect(e.kapu.indok).toBe('Minden ellenőrzés rendben, ismert szállító.');
  });
});

describe('a kapuk a láncban', () => {
  /**
   * ⚠️ Az **először látott szállító** mindig emberhez megy, akkor is, ha a
   * bizonylat egyébként hibátlan. A bizalmat ki kell érdemelni.
   */
  test('ismeretlen szállítónál ember elé kerül', () => {
    const e = feldolgoz(be({ elozmeny: { ...BEJARATOTT, ismertSzallito: false } }));

    expect(e.allapot).toBe('ellenorzesre_var');
    expect(e.kapu.indok).toContain('még nem láttunk bizonylatot');
  });

  test('új cégnél a bemelegítés miatt ember elé kerül', () => {
    const e = feldolgoz(be({ elozmeny: { ...BEJARATOTT, cegEddigiBizonylatai: 3 } }));

    expect(e.allapot).toBe('ellenorzesre_var');
    expect(e.kapu.indok).toContain('első 20');
  });

  /**
   * ⚠️ A legfontosabb eset: ha a fejléc végösszege egy tételsoré, a
   * `nettó + ÁFA = bruttó` hibátlan marad — a bontás összege buktatja le.
   * Ilyenkor **nem mehet át automatikusan.**
   */
  test('a rossz fejléc-végösszeg megbuktatja az automatikus jóváhagyást', () => {
    const nyers = nyersUbl();
    // A modell egy tételsor nettóját írta végösszegnek; a bruttó stimmel hozzá.
    nyers['net_amount'] = 4000;
    nyers['vat_amount'] = 1080;
    nyers['gross_amount'] = 5080;

    const e = feldolgoz(be({ nyers }));

    expect(e.validatorok).toHaveProperty('afa_bontas');
    expect(e.allapot).toBe('ellenorzesre_var');
  });

  test('a bukott validátor a konfidenciát is lehúzza', () => {
    const nyers = nyersUbl();
    nyers['gross_amount'] = 99999;

    const e = feldolgoz(be({ nyers }));

    expect(e.konfidencia.combined['gross_amount']).toBeLessThanOrEqual(0.3);
  });
});

describe('a kredit a bizonylatra szól', () => {
  test('ismeretlen oldalszám egy kredit', () => {
    expect(feldolgoz(be({ oldalszam: null })).kreditek).toBe(1);
  });

  test('egy normál számla egy kredit', () => {
    expect(feldolgoz(be({ oldalszam: 3 })).kreditek).toBe(1);
  });

  test('hat oldal két kredit', () => {
    expect(feldolgoz(be({ oldalszam: 6 })).kreditek).toBe(2);
  });
});

describe('bizonylatOldalszama', () => {
  /**
   * ⚠️ Ez az a számítás, ami miatt a köteg nem kerül ötször kreditbe: a
   * bizonylat a **saját oldaltartományáért** fizet, nem az egész fájlért.
   */
  test('oldaltartománnyal a tartomány hossza számít, nem a fájlé', () => {
    // 6 oldalas fájl, benne 3 bizonylat: 2+3+1 oldal → 1+1+1 = 3 kredit.
    expect(bizonylatOldalszama(1, 2, 6)).toBe(2);
    expect(bizonylatOldalszama(3, 5, 6)).toBe(3);
    expect(bizonylatOldalszama(6, 6, 6)).toBe(1);

    const kreditek = [
      feldolgoz(be({ oldalszam: bizonylatOldalszama(1, 2, 6) })).kreditek,
      feldolgoz(be({ oldalszam: bizonylatOldalszama(3, 5, 6) })).kreditek,
      feldolgoz(be({ oldalszam: bizonylatOldalszama(6, 6, 6) })).kreditek,
    ];

    expect(kreditek).toEqual([1, 1, 1]);
    expect(kreditek.reduce((a, b) => a + b)).toBe(3);
  });

  test('tartomány nélkül az egész fájl oldalszáma számít', () => {
    expect(bizonylatOldalszama(null, null, 12)).toBe(12);
    expect(bizonylatOldalszama(null, null, null)).toBeNull();
  });
});
