import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { szamlafolyo } from '../../../config/szamlafolyo.ts';

/**
 * A szétszedett testvérbizonylatok azonnali indítása (2026-09-23) –
 * forrásszintű őr, mert a `Deno.serve` Node alatt nem fut.
 *
 * Mérve előtte: egy háromszámlás kötegnél a testvérek a percenkénti cronra
 * vártak, és a cron egymás után dolgozta fel őket (a harmadik ~60 s-mal a
 * szétszedés után indult).
 */

const FORRAS = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const SZETSZED = FORRAS.slice(
  FORRAS.indexOf('async function esetlegSzetszed'),
  FORRAS.indexOf('async function testvereketIndit'),
);
const INDITO = FORRAS.slice(
  FORRAS.indexOf('async function testvereketIndit'),
  FORRAS.indexOf('\n}\n', FORRAS.indexOf('async function testvereketIndit')),
);
const HIVAS = 'await testvereketIndit(db, testverek.slice(0, szamlafolyo.koteg.azonnaliInditasMax));';

describe('a testvérbizonylatok indítása', () => {
  it('a beszúrás visszaadja az új sorok azonosítóját', () => {
    expect(SZETSZED).toContain(".select('id');");
    expect(SZETSZED).toContain('testverek = (beszurt ?? []).map((sor) => sor.id as string);');
  });

  it('a szétszedés el is indítja őket – a plafonig', () => {
    expect(SZETSZED).toContain(HIVAS);
  });

  it('az indítás a saját tartomány beírása után jön, a visszatérés előtt', () => {
    const tartomany = SZETSZED.indexOf('.update({ oldal_tol: elso.oldal_tol, oldal_ig: elso.oldal_ig })');
    const hivas = SZETSZED.indexOf(HIVAS);
    const vissza = SZETSZED.lastIndexOf('return elso;');

    expect(tartomany).toBeGreaterThan(0);
    expect(hivas).toBeGreaterThan(tartomany);
    expect(vissza).toBeGreaterThan(hivas);
  });

  it('párhuzamosan indít, nem egymás után, és ugyanazon az SQL-indítón', () => {
    expect(INDITO).toContain('Promise.all(');
    expect(INDITO).toContain("db.rpc('kiolvasast_indit', { dokumentum: id })");
    expect(INDITO).not.toMatch(/for\s*\(/);
  });

  it('a plafon több mint egy, de kisebb a darabszám-féknél', () => {
    expect(szamlafolyo.koteg.azonnaliInditasMax).toBeGreaterThan(1);
    expect(szamlafolyo.koteg.azonnaliInditasMax).toBeLessThan(szamlafolyo.koteg.maxDarab);
  });
});

describe('a szétszedés átmeneti hibára egyszer újrapróbál', () => {
  it('a szetszed() hívás az atmenetiHibanUjra-n át megy, a configbeli várakozással', () => {
    const hivas = FORRAS.slice(FORRAS.indexOf('valasz = await atmenetiHibanUjra(() => szetszed({'));
    expect(FORRAS).toContain('valasz = await atmenetiHibanUjra(() => szetszed({');
    expect(hivas.slice(0, hivas.indexOf('} catch'))).toContain(
      '}), szamlafolyo.koteg.ujraprobalasVarakozasMs);',
    );
    expect(szamlafolyo.koteg.ujraprobalasVarakozasMs).toBeGreaterThan(0);
    expect(szamlafolyo.koteg.ujraprobalasVarakozasMs).toBeLessThanOrEqual(5000);
  });
});
