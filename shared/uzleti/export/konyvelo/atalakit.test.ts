import { describe, expect, it } from 'vitest';
import { atalakit, fizetesiMod, magyarTorzsszam } from './atalakit.ts';
import { alapBeallitas } from './beallitas.ts';

// Érvényes (ellenőrző számjegyes) magyar adószámok.
const SAJAT = '12345676';
const SAJAT_ADOSZAM = '12345676-2-42';
const SZALLITO = '23456787-2-13';
const VEVO = '11111111-2-41';

const b = alapBeallitas();

/** Egy rendes, 27%-os bejövő számla – minden teszt ebből tér el egy ponton. */
function bejovo(felulir: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    doc_type: 'szamla',
    supplier_name: 'Példa Beszállító Kft.',
    supplier_tax_number: SZALLITO,
    customer_name: 'Saját Kft.',
    customer_tax_number: SAJAT_ADOSZAM,
    doc_number: 'SZ-2026/14',
    issue_date: '2026-09-10',
    fulfillment_date: '2026-09-08',
    due_date: '2026-09-18',
    payment_method: 'Átutalás',
    currency: 'HUF',
    net_amount: '10000.00',
    vat_amount: '2700.00',
    gross_amount: '12700.00',
    afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: 10000, afa: 2700 }],
    note: null,
    ...felulir,
  };
}

function akadalyai(d: ReturnType<typeof bejovo>): string[] {
  const a = atalakit(d, SAJAT, b);
  return a.ok ? [] : a.akadalyok;
}

describe('irány és partner', () => {
  it('a vevő az ügyfél → bejövő, a partner a szállító', () => {
    const a = atalakit(bejovo(), SAJAT, b);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.bizonylat.irany).toBe('bejovo');
    expect(a.bizonylat.partner).toEqual({
      nev: 'Példa Beszállító Kft.',
      adoszam: SZALLITO,
      torzsszam: '23456787',
    });
  });

  it('a szállító az ügyfél → kimenő, a partner a vevő', () => {
    const a = atalakit(
      bejovo({ supplier_tax_number: 'HU12345676', customer_tax_number: VEVO, customer_name: 'Vevő Bt.' }),
      SAJAT,
      b,
    );
    expect(a.ok && a.bizonylat.irany).toBe('kimeno');
    expect(a.ok && a.bizonylat.partner.nev).toBe('Vevő Bt.');
  });

  it('vevő adószám nélkül bejövőnek vesszük, de kimondjuk', () => {
    const a = atalakit(bejovo({ customer_tax_number: null }), SAJAT, b);
    expect(a.ok && a.bizonylat.irany).toBe('bejovo');
    expect(a.ok && a.figyelmeztetesek).toContain('A vevő adószáma nem szerepel – bejövőnek vettük.');
  });

  it('másik cég bizonylata akadály, nem tipp', () => {
    expect(akadalyai(bejovo({ customer_tax_number: VEVO }))).toContain(
      'Se a szállító, se a vevő adószáma nem az ügyfélé.',
    );
  });

  it('külföldi adószámból nem lesz magyar partnerkód', () => {
    expect(magyarTorzsszam('DE123456789')).toBeNull();
    // Osztrák ÁFA-szám: a nyolc jegye véletlenül magyar ellenőrző számjegyes.
    expect(magyarTorzsszam('ATU23456787')).toBeNull();
    expect(magyarTorzsszam('HU23456787')).toBe('23456787');
    expect(magyarTorzsszam('23456787-2-13')).toBe('23456787');
    expect(magyarTorzsszam('23456788-2-13')).toBeNull();
  });
});

describe('akadályok', () => {
  it('díjbekérő: egyetlen, érthető ok', () => {
    expect(akadalyai(bejovo({ doc_type: 'dijbekero', due_date: null }))).toEqual([
      'Díjbekérő – nem könyvelendő, a rá kiállított számla megy a könyvelésbe.',
    ]);
  });

  it('devizás bizonylat nem megy (árfolyamot nem találunk ki)', () => {
    expect(akadalyai(bejovo({ currency: 'EUR' }))[0]).toMatch(/^Devizás \(EUR\)/);
  });

  it('fordított adózás nem megy – nem tudjuk, melyik ügylettípus', () => {
    const okok = akadalyai(bejovo({ afa_bontas: [{ kulcs: 0, kategoria: 'AE', netto: 10000, afa: 0 }], vat_amount: 0, gross_amount: 10000 }));
    expect(okok[0]).toMatch(/^Fordított adózású sor/);
  });

  it('0%-os sor kategória nélkül: mentes vagy nulla kulcsos? nem tippelünk', () => {
    const okok = akadalyai(bejovo({ afa_bontas: [{ kulcs: 0, netto: 10000, afa: 0 }], vat_amount: 0, gross_amount: 10000 }));
    expect(okok[0]).toMatch(/^0%-os sor ÁFA-kategória nélkül/);
  });

  it('a mentes (E) sor átmegy, mentes fajtaként', () => {
    const a = atalakit(
      bejovo({ afa_bontas: [{ kulcs: 0, kategoria: 'E', netto: 10000, afa: 0 }], vat_amount: 0, gross_amount: 10000 }),
      SAJAT,
      b,
    );
    expect(a.ok && a.bizonylat.sorok).toEqual([{ fajta: 'mentes', netto: 10000, afa: 0 }]);
  });

  it('külföldi kulcs (19%) nem megy', () => {
    const okok = akadalyai(bejovo({ afa_bontas: [{ kulcs: 19, netto: 10000, afa: 1900 }], vat_amount: 1900, gross_amount: 11900 }));
    expect(okok).toContain('19%-os ÁFA-kulcs – nem magyar kulcs.');
  });

  it('nettó + ÁFA ≠ bruttó (több mint 1 Ft) akadály', () => {
    expect(akadalyai(bejovo({ gross_amount: '12800.00' }))).toContain(
      'A nettó és az ÁFA összege nem adja ki a bruttót.',
    );
  });

  it('átutalásos számla határidő nélkül nem megy; készpénzesnél a kelt a határidő', () => {
    expect(akadalyai(bejovo({ due_date: null }))[0]).toMatch(/^Nincs fizetési határideje/);

    const kp = atalakit(bejovo({ due_date: null, payment_method: 'készpénz' }), SAJAT, b);
    expect(kp.ok && kp.bizonylat.esedekesseg).toBe('2026-09-10');
  });

  it('bizonylatszám és kelt nélkül nem megy', () => {
    const okok = akadalyai(bejovo({ doc_number: ' ', issue_date: null }));
    expect(okok).toContain('Nincs bizonylatszáma.');
    expect(okok).toContain('Nincs kelte.');
  });
});

describe('dátumok és fizetési mód', () => {
  it('teljesítés nélkül a kelt a teljesítés (Áfa tv. 169. § g)', () => {
    const a = atalakit(bejovo({ fulfillment_date: null }), SAJAT, b);
    expect(a.ok && a.bizonylat.teljesites).toBe('2026-09-10');
    expect(a.ok && a.figyelmeztetesek).toEqual([]);
  });

  it('a fizetési mód szövegéből kód lesz; ismeretlennél alapérték + figyelmeztetés', () => {
    expect(fizetesiMod('Előre utalás')).toBe('atutalas');
    expect(fizetesiMod('Banki átutalás')).toBe('atutalas');
    expect(fizetesiMod('KP')).toBe('keszpenz');
    expect(fizetesiMod('Bankkártya')).toBe('bankkartya');
    expect(fizetesiMod('Utánvét')).toBe('utanvet');
    expect(fizetesiMod('SZÉP-kártya')).toBe('bankkartya');
    expect(fizetesiMod('barter')).toBeNull();

    const a = atalakit(bejovo({ payment_method: 'barter' }), SAJAT, b);
    expect(a.ok && a.bizonylat.fizmod).toBe('atutalas');
    expect(a.ok && a.figyelmeztetesek[0]).toMatch(/^Ismeretlen fizetési mód/);
  });
});

describe('összegek egész forintban', () => {
  it('vegyes kulcsos számla: kulcsonként egy sor, azonos kulcsok összevonva', () => {
    const a = atalakit(
      bejovo({
        net_amount: '15000.00',
        vat_amount: '2950.00',
        gross_amount: '17950.00',
        afa_bontas: [
          { kulcs: 27, kategoria: 'S', netto: 5000, afa: 1350 },
          { kulcs: '5%', kategoria: 'S', netto: 5000, afa: 250 },
          { kulcs: 27, kategoria: 'S', netto: 5000, afa: 1350 },
        ],
      }),
      SAJAT,
      b,
    );
    expect(a.ok && a.bizonylat.sorok).toEqual([
      { fajta: '27', netto: 10000, afa: 2700 },
      { fajta: '5', netto: 5000, afa: 250 },
    ]);
    expect(a.ok && a.bizonylat.brutto).toBe(17950);
  });

  it('filléres sorok: a kerekítési különbözet a legnagyobb sor nettójára kerül', () => {
    // 1000,40 + 270,11 = 1270,51 → bruttó 1271; soronként 1000 + 270 = 1270.
    const a = atalakit(
      bejovo({
        net_amount: '1000.40',
        vat_amount: '270.11',
        gross_amount: '1270.51',
        afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: '1000.40', afa: '270.11' }],
      }),
      SAJAT,
      b,
    );
    expect(a.ok && a.bizonylat.sorok).toEqual([{ fajta: '27', netto: 1001, afa: 270 }]);
    expect(a.ok && a.bizonylat.brutto).toBe(1271);
  });

  it('sztornó: az előjel marad, a kerekítés szimmetrikus', () => {
    const a = atalakit(
      bejovo({
        doc_type: 'sztorno_szamla',
        net_amount: '-10000.00',
        vat_amount: '-2700.00',
        gross_amount: '-12700.00',
        afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: -10000, afa: -2700 }],
      }),
      SAJAT,
      b,
    );
    expect(a.ok && a.bizonylat.tipus).toBe('sztorno');
    expect(a.ok && a.bizonylat.sorok).toEqual([{ fajta: '27', netto: -10000, afa: -2700 }]);
  });

  it('bontás nélkül csak akkor egy kulcsos, ha a végösszegekből egyértelmű', () => {
    const jo = atalakit(bejovo({ afa_bontas: null }), SAJAT, b);
    expect(jo.ok && jo.bizonylat.sorok).toEqual([{ fajta: '27', netto: 10000, afa: 2700 }]);

    expect(akadalyai(bejovo({ afa_bontas: [], vat_amount: '1000.00', gross_amount: '11000.00' }))).toContain(
      'Nincs ÁFA-bontása, és a végösszegekből sem egyértelmű a kulcs.',
    );
  });

  it('a bontás nettója nem egyezik a végösszeggel → akadály', () => {
    expect(akadalyai(bejovo({ net_amount: '11000.00', gross_amount: '13700.00' }))).toContain(
      'Az ÁFA-bontás nettója nem egyezik a nettó végösszeggel.',
    );
  });
});
