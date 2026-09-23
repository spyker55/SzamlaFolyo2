import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { meresBeolvas, osszevet, probaszamlaElvart, type MeresJson } from './meres-osszevetes.ts';

const ELVART = probaszamlaElvart();

function futas(gondolkodas: number, felulir: Record<string, string> = {}) {
  return {
    kimenetToken: gondolkodas + 300,
    gondolkodasToken: gondolkodas,
    koltseg: 0.005,
    idoMs: 8000,
    eredmeny: { mezok: { ...ELVART, gross_amount: '203200.00', ...felulir } },
  };
}

const ALAP: MeresJson = {
  fajl: { nev: 'egy-szamla-rendes.pdf' },
  beallitas: { modell: null, gondolkodas: 'alap (nincs korlátozva – mint élesben)' },
  futasok: [futas(900), futas(1100)],
  bukottFutasok: [
    { hiba: 'A kiolvasó szolgáltatás átmenetileg túlterhelt (429).', leallas: null, koltseg: null, idoMs: 3000 },
    { hiba: 'A modell üres választ adott.', leallas: 'length / MAX_TOKENS', koltseg: 0.017, idoMs: 39000 },
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
    expect(szoveg).toMatch(/futás \/ siker \/ bukott\s+4 \/ 2 \/ 2\s+2 \/ 2 \/ 0/);
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
    expect(szoveg).toMatch(/költség össz\. \(USD\)\s+0\.0270/);
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
