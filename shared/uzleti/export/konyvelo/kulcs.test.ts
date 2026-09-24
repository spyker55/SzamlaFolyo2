import { describe, expect, it } from 'vitest';
import { kicsomagol } from '../tesztZip.ts';
import { alapBeallitas, KULCS_ALAP_KODOK, type KontirBeallitas } from './beallitas.ts';
import type { KonyveloiBizonylat } from './atalakit.ts';
import { KULCS_FAJLOK, KULCS_FEJLECEK, kulcs, kulcsEllenoriz, napok } from './kulcs.ts';

const vissza = (b: Uint8Array | undefined) => new TextDecoder('windows-1250').decode(b);

const K: KontirBeallitas = {
  ...alapBeallitas(),
  koltseg: '5211',
  arbevetel: '911',
  // A bejövő kódok szándékosan mások, mint a kimenők: így látszik, ha az író
  // rossz irányból olvas.
  kulcs: {
    afakodok: {
      kimeno: { ...KULCS_ALAP_KODOK },
      bejovo: { '27': '11', '18': '12', '5': '18', '0': '15', mentes: '16' },
    },
  },
};

const BEJOVO: KonyveloiBizonylat = {
  id: 'd1',
  irany: 'bejovo',
  tipus: 'szamla',
  partner: { nev: 'Példa Beszállító Kft.', adoszam: '23456787-2-13', torzsszam: '23456787' },
  bizonylatszam: 'SZ-2026/14',
  kelt: '2026-09-10',
  teljesites: '2026-09-08',
  esedekesseg: '2026-09-18',
  fizmod: 'atutalas',
  sorok: [
    { fajta: '27', netto: 10000, afa: 2700 },
    { fajta: '5', netto: 5000, afa: 250 },
  ],
  netto: 15000,
  afa: 2950,
  brutto: 17950,
  megjegyzes: 'Irodaszer',
};

const KIMENO: KonyveloiBizonylat = {
  ...BEJOVO,
  id: 'd2',
  irany: 'kimeno',
  partner: { nev: 'Vevő Bt.', adoszam: '11111111-2-41', torzsszam: '11111111' },
  bizonylatszam: 'K-001',
  fizmod: 'keszpenz',
  esedekesseg: '2026-09-10',
  sorok: [{ fajta: 'mentes', netto: 8000, afa: 0 }],
  netto: 8000,
  afa: 0,
  brutto: 8000,
  megjegyzes: null,
};

const IKT = new Map([
  ['d1', 17],
  ['d2', 18],
]);

/** n mezős sor a megadott (1-es alapú) pozíciókkal – a leírás számozásával. */
function sor(n: number, ertekek: Record<number, string>): string {
  const s = new Array(n).fill('');
  for (const [poz, ertek] of Object.entries(ertekek)) s[Number(poz) - 1] = ertek;
  return s.join(';');
}

describe('Kulcs-Könyvelés Főkönyvi Adatimporter (új_03)', () => {
  it('három, azonos alapnevű fájl', async () => {
    const fajlok = kicsomagol(await kulcs([BEJOVO], K, IKT));
    expect([...fajlok.keys()]).toEqual(['feladas.csv', 'feladas.001', 'feladas.002']);
  });

  it('aranyminta: fejek (33 mező), tételek (22), ügyfelek (21)', async () => {
    const fajlok = kicsomagol(await kulcs([BEJOVO, KIMENO], K, IKT));

    const kozos = { 13: 'HUF', 14: '1', 22: '0', 23: '0', 25: '0', 29: '0', 30: '0' };
    expect(vissza(fajlok.get('feladas.csv'))).toBe(
      [
        KULCS_FEJLECEK.fej.join(';'),
        sor(33, { ...kozos, 1: '2', 2: 'Példa Beszállító Kft.', 3: '454', 4: 'SZF17', 5: '17', 6: 'SZ-2026/14', 7: 'Átutalás', 8: '2026.09.08', 9: '2026.09.10', 10: '2026.09.18', 12: '17950', 17: 'B', 18: '8', 19: '1', 20: '15000', 21: '17950', 26: '23456787', 28: 'Irodaszer' }),
        sor(33, { ...kozos, 1: '1', 2: 'Vevő Bt.', 3: '311', 4: 'SZF18', 6: 'K-001', 7: 'Készpénz', 8: '2026.09.08', 9: '2026.09.10', 10: '2026.09.10', 12: '8000', 17: 'K', 18: '0', 19: '1', 20: '8000', 21: '8000', 26: '11111111' }),
        '',
      ].join('\r\n'),
    );

    expect(vissza(fajlok.get('feladas.001'))).toBe(
      [
        KULCS_FEJLECEK.tetel.join(';'),
        // Bejövő: a bejövő lista kódja és „lev.” neve.
        sor(22, { 1: '1', 2: '5211', 3: '10000', 4: '27', 5: 'SZF17', 6: '466', 7: '11', 8: '27%-os lev.ÁFA', 9: '0', 15: '0' }),
        sor(22, { 1: '2', 2: '5211', 3: '5000', 4: '5', 5: 'SZF17', 6: '466', 7: '18', 8: '5%-os lev.ÁFA', 9: '0', 15: '0' }),
        // Csak mentes kimenő: „áfás = 1” fej és a mentes kulcs kódja (mérve: 18a).
        sor(22, { 1: '3', 2: '911', 3: '8000', 4: '0', 5: 'SZF18', 6: '467', 7: '6', 8: 'fiz.ÁFA mentes', 9: '0', 15: '0' }),
        '',
      ].join('\r\n'),
    );

    expect(vissza(fajlok.get('feladas.002'))).toBe(
      [
        KULCS_FEJLECEK.partner.join(';'),
        sor(21, { 1: '23456787', 2: '23456787-2-13', 9: 'HU', 10: 'Magyarország', 20: '1' }),
        sor(21, { 1: '11111111', 2: '11111111-2-41', 9: 'HU', 10: 'Magyarország', 20: '1' }),
        '',
      ].join('\r\n'),
    );
  });

  it('a gyártói minta 002-es sora ugyanígy áll: kód, adószám, …, HU, Magyarország, …, 1 (ÁFA-alany)', () => {
    // Minta lap: „200;12345678-2-42;;;;;;;HU;Magyarország;1016;Budapest;Mészáros;utca;13.;;;;;1;;"
    const minta = '200;12345678-2-42;;;;;;;HU;Magyarország;1016;Budapest;Mészáros;utca;13.;;;;;1;;'.split(';');
    expect([minta[8], minta[9], minta[19]]).toEqual(['HU', 'Magyarország', '1']);
  });

  it('sztornó és helyesbítő akadály – az eredeti számla száma kellene', () => {
    expect(kulcsEllenoriz({ ...BEJOVO, tipus: 'sztorno' })[0]).toMatch(/eredeti számla számát/);
    expect(kulcsEllenoriz({ ...BEJOVO, tipus: 'helyesbito' })[0]).toMatch(/eredeti számla számát/);
    expect(kulcsEllenoriz(BEJOVO)).toEqual([]);
  });

  it('mindhárom fájl a saját fejlécével kezdődik, és alatta ott az adat – egy bizonylatnál is', async () => {
    // A „Fejléc kihagyása" pipával az első sort a program eldobja; fejléc
    // nélkül egyetlen számlánál „nem tartalmaz adatot" (2026-09-24, demó).
    const fajlok = kicsomagol(await kulcs([KIMENO], K, IKT));
    const parok = [
      [KULCS_FAJLOK.fej, KULCS_FEJLECEK.fej, 33],
      [KULCS_FAJLOK.tetel, KULCS_FEJLECEK.tetel, 22],
      [KULCS_FAJLOK.partner, KULCS_FEJLECEK.partner, 21],
    ] as const;
    for (const [nev, fejlec, mezok] of parok) {
      const sorok = vissza(fajlok.get(nev)).split('\r\n').filter((s) => s !== '');
      expect(fejlec, nev).toHaveLength(mezok);
      expect(sorok[0], nev).toBe(fejlec.join(';'));
      expect(sorok, nev).toHaveLength(2);
      expect(sorok[1]!.split(';'), nev).toHaveLength(mezok);
    }
  });

  it('csak mentes számla: „áfás = 1” fej és kódos tétel – a demóban mért (18a) alak', async () => {
    // „áfás = 0” + kódos tétel = hiba az Adatimporterben (diag-18, 2026-09-24).
    const f = kicsomagol(await kulcs([KIMENO], K, IKT));
    const fej = vissza(f.get('feladas.csv')).split('\r\n')[1]!.split(';');
    const tetel = vissza(f.get('feladas.001')).split('\r\n')[1]!.split(';');
    expect(fej[18]).toBe('1');
    expect(tetel.slice(3, 8)).toEqual(['0', 'SZF18', '467', '6', 'fiz.ÁFA mentes']);
  });

  it('kimenő előlegszámla a 4-es típus', async () => {
    const eloleg = { ...KIMENO, tipus: 'eloleg' as const };
    const fej = vissza(kicsomagol(await kulcs([eloleg], K, IKT)).get('feladas.csv')).split('\r\n')[1]!.split(';');
    expect(fej[0]).toBe('4');
  });

  it('esedékesség napokban, a kelttől; hónaphatáron és visszafelé is', () => {
    expect(napok('2026-09-10', '2026-09-18')).toBe(8);
    expect(napok('2026-01-31', '2026-03-02')).toBe(30);
    expect(napok('2026-03-28', '2026-03-30')).toBe(2); // téli–nyári átállás hete
    expect(napok('2026-09-10', '2026-09-01')).toBe(0);
  });
});
