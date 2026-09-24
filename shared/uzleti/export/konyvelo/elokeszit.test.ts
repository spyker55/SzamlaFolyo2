import { describe, expect, it } from 'vitest';
import { alapBeallitas } from './beallitas.ts';
import { elokeszit } from './elokeszit.ts';

const SAJAT = '12345676';

const jo = {
  id: 'jo',
  doc_type: 'szamla',
  supplier_name: 'Példa Kft.',
  supplier_tax_number: '23456787-2-13',
  customer_tax_number: '12345676-2-42',
  doc_number: 'A-1',
  issue_date: '2026-09-10',
  due_date: '2026-09-18',
  payment_method: 'átutalás',
  currency: 'HUF',
  net_amount: 1000,
  vat_amount: 270,
  gross_amount: 1270,
  afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }],
};

describe('előellenőrzés', () => {
  it('szétválogat: ami mehet, ami nem, és miért', () => {
    const e = elokeszit(
      [jo, { ...jo, id: 'dij', doc_type: 'dijbekero' }, { ...jo, id: 'eur', currency: 'EUR' }],
      'rlb',
      SAJAT,
      { ...alapBeallitas(), koltseg: '5211' },
    );
    expect(e.mehet.map((b) => b.id)).toEqual(['jo']);
    expect(e.elakadt.map((x) => x.id)).toEqual(['dij', 'eur']);
    expect(e.elakadt[0]!.cimke).toBe('A-1 – Példa Kft.');
    expect(e.beallitasHiany).toEqual([]);
  });

  it('hiányos kontírnál a beállítás hiánya külön jön – a tételek ettől még átmentek', () => {
    const e = elokeszit([jo], 'rlb', SAJAT, alapBeallitas());
    expect(e.mehet).toHaveLength(1);
    expect(e.beallitasHiany).toEqual(['Add meg a(z) költség főkönyvi számát.']);
  });

  it('a program saját korlátja is akadály (RLB: 30 karakteres bizonylatszám)', () => {
    const e = elokeszit([{ ...jo, doc_number: 'X'.repeat(31) }], 'rlb', SAJAT, alapBeallitas());
    expect(e.mehet).toEqual([]);
    expect(e.elakadt[0]!.okok).toEqual(['A bizonylatszám hosszabb 30 karakternél (RLB-korlát).']);
  });

  it('programonként a saját korlát: a Kulcsnál a sztornó, a Novitaxnál a külföldi partner akad el', () => {
    const sztorno = { ...jo, id: 'st', doc_type: 'sztorno_szamla', net_amount: -1000, vat_amount: -270, gross_amount: -1270, afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: -1000, afa: -270 }] };
    expect(elokeszit([sztorno], 'kulcs', SAJAT, alapBeallitas()).elakadt[0]!.okok[0]).toMatch(/eredeti számla számát/);
    expect(elokeszit([sztorno], 'rlb', SAJAT, alapBeallitas()).mehet).toHaveLength(1);

    const kulfoldi = { ...jo, id: 'kf', supplier_tax_number: 'ATU23456787' };
    expect(elokeszit([kulfoldi], 'novitax', SAJAT, alapBeallitas()).elakadt[0]!.okok[0]).toMatch(/Novitax-partnerkód/);
    expect(elokeszit([kulfoldi], 'rlb', SAJAT, alapBeallitas()).mehet).toHaveLength(1);
  });

  it('a figyelmeztetés nem akadály, de látszik', () => {
    const e = elokeszit([{ ...jo, payment_method: null }], 'rlb', SAJAT, alapBeallitas());
    expect(e.mehet).toHaveLength(1);
    expect(e.figyelmeztetesek[0]!.szoveg).toBe('Nincs fizetési mód – az alapértelmezettet írtuk.');
  });
});
