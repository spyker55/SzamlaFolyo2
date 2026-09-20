import { describe, expect, test } from 'vitest';
import { tulhasznalatSzamol } from './tulhasznalat.ts';
import { szamlafolyo } from '../../config/szamlafolyo.ts';

/** A Start csomag számai — ugyanonnan, ahonnan a termék is olvassa őket. */
const START = szamlafolyo.csomagok.kicsi;

function szamol(felhasznalt: number, plafonFt: number | null = null) {
  return tulhasznalatSzamol({
    keret: START.dokumentumok,
    darabAr: START.extraFt,
    felhasznalt,
    plafonFt,
  });
}

describe('mennyi ment a kereten felül', () => {
  test('a kereten belül nincs túlhasználat', () => {
    const t = szamol(START.dokumentumok - 1);

    expect(t.darab).toBe(0);
    expect(t.ft).toBe(0);
  });

  test('pontosan a kereten állva még nincs', () => {
    expect(szamol(START.dokumentumok).darab).toBe(0);
  });

  test('a kereten túl darabra és forintra is megvan', () => {
    const t = szamol(START.dokumentumok + 7);

    expect(t.darab).toBe(7);
    expect(t.szamlazhatoDarab).toBe(7);
    expect(t.ft).toBe(7 * START.extraFt);
  });
});

describe('a plafon', () => {
  /**
   * Ez a kör oka. Az alapplafon 10 000 Ft, a Start darabára 50 Ft — tehát
   * pontosan 200 kredit fér bele, és a 201. már nem.
   */
  test('darabszámra fordul, lefelé kerekítve', () => {
    const fer = Math.floor(szamlafolyo.tulhasznalat.alapPlafonFt / START.extraFt);

    expect(szamol(START.dokumentumok).ferMegDarab).toBe(fer);
    expect(szamol(START.dokumentumok + fer).ferMegDarab).toBe(0);
  });

  test('a nem osztható plafon lefelé kerekít, nem fölfelé', () => {
    // 10 000 / 30 = 333,33 — a plafon felső határ, nem irányszám.
    const t = tulhasznalatSzamol({ keret: 0, darabAr: 30, felhasznalt: 0, plafonFt: 10000 });

    expect(t.ferMegDarab).toBe(333);
  });

  test('a cég saját plafonja felülírja az alapértéket', () => {
    const t = szamol(START.dokumentumok, 2000);

    expect(t.plafonFt).toBe(2000);
    expect(t.ferMegDarab).toBe(Math.floor(2000 / START.extraFt));
  });

  /**
   * ⚠️ A fék azt kérdezi, fér-e még **egy** kredit — az oldalszámot a claim
   * előtt még nem ismeri. Egy többoldalas irat ezért átnyúlhat a plafonon.
   * Ami történt, az `darab`; amit kiszámlázunk, az `szamlazhatoDarab` — és a
   * kettő különbsége a felhasználó javára dől.
   */
  test('a plafonon átnyúló irat nem számlázódik ki', () => {
    const fer = Math.floor(2000 / START.extraFt); // 40 kredit

    const t = szamol(START.dokumentumok + fer + 3, 2000);

    expect(t.darab).toBe(fer + 3);
    expect(t.szamlazhatoDarab).toBe(fer);
    expect(t.ft).toBe(2000);
    expect(t.ft).toBeLessThan(t.darab * START.extraFt);
  });

  test('nulla plafon mellett nincs hely', () => {
    const t = szamol(START.dokumentumok, 0);

    expect(t.ferMegDarab).toBe(0);
    expect(t.ft).toBe(0);
  });

  /**
   * Egy nulla darabár hibás config. Az a kísértés, hogy „ingyen, tehát
   * korlátlan" — de amit nem tudunk beárazni, azt nem tudjuk a plafonhoz sem
   * mérni. A drágább irány a helyes.
   */
  test('nulla darabár nem korlátlan, hanem nulla hely', () => {
    const t = tulhasznalatSzamol({ keret: 0, darabAr: 0, felhasznalt: 10, plafonFt: 10000 });

    expect(t.ferMegDarab).toBe(0);
    expect(t.szamlazhatoDarab).toBe(0);
    expect(t.ft).toBe(0);
  });
});

describe('értelmetlen bemenet', () => {
  test('a negatív felhasználás nem csinál negatív túlhasználatot', () => {
    expect(szamol(-5).darab).toBe(0);
  });

  test('a törtszám lecsonkul', () => {
    expect(szamol(START.dokumentumok + 2.9).darab).toBe(2);
  });
});
