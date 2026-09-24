import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { elteresJellege, meresBeolvas, osszevet, probaszamlaElvart, type MeresJson } from './meres-osszevetes.ts';

const ELVART = probaszamlaElvart();

function futas(gondolkodas: number, felulir: Record<string, string> = {}) {
  return {
    kimenetToken: gondolkodas + 300,
    gondolkodasToken: gondolkodas,
    koltseg: 0.005,
    idoMs: 8000,
    eredmeny: { mezok: { ...ELVART, gross_amount: '203200.00', ...felulir }, nehezenOlvashato: false, tobbIratGyanu: false },
  };
}

const ALAP: MeresJson = {
  fajl: { nev: 'egy-szamla-rendes.pdf' },
  beallitas: { modell: null, gondolkodas: 'alap (nincs korlátozva – mint élesben)' },
  futasok: [futas(900), futas(1100)],
  bukottFutasok: [
    { hiba: 'A kiolvasó szolgáltatás átmenetileg túlterhelt (429).', leallas: null, koltseg: null, idoMs: 3000 },
    { hiba: 'A modell üres választ adott.', leallas: 'length / MAX_TOKENS', koltseg: 0.017, idoMs: 39000 },
    { hiba: 'A modell nem a kért függvénnyel válaszolt.', leallas: 'stop', koltseg: 0.001, idoMs: 2000 },
  ],
};
const LOW: MeresJson = {
  fajl: { nev: 'egy-szamla-rendes.pdf' },
  beallitas: { modell: null, gondolkodas: 'effort: low' },
  futasok: [futas(200), futas(250, { vat_amount: '43000' })],
};

describe('a mérések összevetése', () => {
  const szoveg = osszevet([{ nev: 'alap', m: ALAP }, { nev: 'low', m: LOW }], ELVART);

  it('a bukott futásokat okuk szerint számolja', () => {
    expect(szoveg).toMatch(/futás \/ siker \/ bukott\s+5 \/ 2 \/ 3\s+2 \/ 2 \/ 0/);
    expect(szoveg).toMatch(/ebből 429\s+1\s+0/);
    expect(szoveg).toMatch(/ebből keret végéig\s+1\s+0/);
  });

  it('a gondolkodás mediánja és szélsői', () => {
    expect(szoveg).toMatch(/gondolkodás \(med, min–max\)\s+1000 \(900–1100\)\s+225 \(200–250\)/);
  });

  it('az összeg a számra egyezik (203200.00 = 203200), és a hibás mezőt megmutatja', () => {
    expect(szoveg).toMatch(/Bruttó\s+2\/2\s+2\/2/);
    expect(szoveg).toMatch(/ÁFA\s+2\/2\s+1\/2 {2}✗/);
    expect(szoveg).toContain('low · ÁFA: „43000" ×1 (helyes: „43200")');
  });

  it('a bukott futás pénze is benne van a költségben', () => {
    expect(szoveg).toMatch(/költség össz\. \(USD\)\s+0\.0280/);
  });

  it('a fizetendő üresen helyes, ha nem tér el a bruttótól (a séma így kéri)', () => {
    expect(ELVART['fizetendo']).toBeNull();
    expect(szoveg).toMatch(/Fizetendő\s+2\/2\s+2\/2/);

    const kitoltott = osszevet([{ nev: 'x', m: { ...LOW, futasok: [futas(200, { fizetendo: '203200' })] } }], ELVART);
    expect(kitoltott).toMatch(/Fizetendő\s+0\/1 {2}✗/);
  });

  it('az egyéb hibák szövegét kiírja, a zászlókat megszámolja', () => {
    expect(szoveg).toContain('EGYÉB HIBÁK');
    expect(szoveg).toContain('alap: A modell nem a kért függvénnyel válaszolt. [stop] (2000 ms)');
    expect(szoveg).toMatch(/zászló: nehezen olvasható\s+0\/2\s+0\/2/);
  });

  it('valódi számlánál nem ír ki mezőértéket', () => {
    const valodi: MeresJson = {
      ...ALAP,
      fajl: { nev: 'szamla.pdf' },
      futasok: [futas(900, { supplier_name: 'Titkos Partner Kft.' }), futas(900, { supplier_name: 'Titkos Partner Kft' })],
    };
    const t = osszevet([{ nev: 'valodi', m: valodi }], null);

    expect(t).not.toContain('Titkos');
    expect(t).toMatch(/Szállító\s+2 {2}≠/);
    expect(t).toContain('valodi · Szállító: 1+1, csak írásmód');
  });

  it('valódi számlánál az eltérés jellegét írja ki, az értéket nem', () => {
    const valodi: MeresJson = {
      fajl: { nev: 'szamla.pdf' },
      beallitas: null,
      futasok: [
        futas(0, { net_amount: '123456', vat_amount: '33333', customer_tax_number: '11111111-1-11' }),
        futas(0, { net_amount: '123456', vat_amount: '33333', customer_tax_number: '11111111111' }),
        futas(0, { net_amount: '100000', vat_amount: '56789', customer_tax_number: '11111111 1 11' }),
      ].map((f, i) => (i === 2 ? { ...f, eredmeny: { ...f.eredmeny, validatorok: { net_amount: 'x', vat_amount: 'x' } } } : f)),
    };
    const t = osszevet([{ nev: 'low', m: valodi }], null);

    for (const titok of ['123456', '33333', '100000', '56789', '11111111']) expect(t).not.toContain(titok);
    expect(t).toContain('low · Nettó: 2+1, eltérés 19%');
    expect(t).toContain('low · Vevő adószáma: 1+1+1, csak írásmód');
    expect(t).toMatch(/VALIDÁTOR bukott \(futás\)\s+1\/3/);
    expect(t).toContain('low: Nettó ×1, ÁFA ×1');
  });
});

describe('az eltérés jellege', () => {
  it('egyezésnél nincs mit mondani', () => {
    expect(elteresJellege('net_amount', ['100', '100'])).toBeNull();
  });

  it('a kihagyott mező nem „más érték"', () => {
    expect(elteresJellege('fulfillment_date', ['2026-01-01', '2026-01-01', null, ''])).toBe('2+2, üres ×2');
  });

  it('összeg: kerekítés vagy valódi eltérés', () => {
    expect(elteresJellege('vat_amount', ['1000.00', '1001'])).toBe('1+1, kerekítés (≤ 1)');
    expect(elteresJellege('vat_amount', ['1000', '1200', '1000'])).toBe('2+1, eltérés 17%');
  });

  it('dátum: napban', () => {
    expect(elteresJellege('due_date', ['2026-01-01', '2026-01-31'])).toBe('1+1, 30 nap eltérés');
  });

  it('szöveg: írásmód vagy tartalom', () => {
    expect(elteresJellege('supplier_name', ['Minta Kft.', 'MINTA kft'])).toBe('1+1, csak írásmód');
    expect(elteresJellege('supplier_name', ['Minta Kft.', 'Minta Zrt.'])).toBe('1+1, eltérő tartalom');
  });
});

describe('a mérésfájl beolvasása', () => {
  it('átugorja az `npm run` fejlécét (így készült a 2026-09-23-i három mérés)', () => {
    const fajl =
      '\n> szamlafolyo@0.1.0 kiolvasas:proba\n> node --env-file-if-exists=.env eszkozok/kiolvasas-proba.ts x.pdf --json\n\n' +
      JSON.stringify(ALAP, null, 2) +
      '\n';

    expect(meresBeolvas(fajl)).toEqual(ALAP);
  });

  it('fejléc nélkül is', () => {
    expect(meresBeolvas(JSON.stringify(LOW))).toEqual(LOW);
  });

  it('ha nincs benne JSON, érthetően szól', () => {
    expect(() => meresBeolvas('> csak fejléc\n')).toThrow(/--json/);
  });
});

describe('az összevető Node-dal indul', () => {
  it('két fájlból táblázatot ír', () => {
    const mappa = mkdtempSync(join(tmpdir(), 'osszevetes-'));
    // Úgy, ahogy a tulajdonos gépén készült: az npm fejlécével az elején.
    writeFileSync(join(mappa, 'meres-alap.json'), `\n> szamlafolyo@0.1.0 kiolvasas:proba\n> node …\n\n${JSON.stringify(ALAP, null, 2)}\n`);
    writeFileSync(join(mappa, 'meres-low.json'), JSON.stringify(LOW));

    const f = spawnSync(
      process.execPath,
      ['eszkozok/meres-osszevetes.ts', join(mappa, 'meres-alap.json'), join(mappa, 'meres-low.json')],
      { encoding: 'utf8', timeout: 30_000 },
    );

    expect(f.stderr).not.toContain('ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
    expect(f.stdout).toContain('meres-alap');
    expect(f.stdout).toContain('effort: low');
    expect(f.stdout).toContain('MEZŐK – helyes / sikeres');
  });
});
