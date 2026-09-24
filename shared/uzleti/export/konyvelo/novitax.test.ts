import { describe, expect, it } from 'vitest';
import { kicsomagol } from '../tesztZip.ts';
import { alapBeallitas, beallitasHianyai, type KontirBeallitas } from './beallitas.ts';
import type { KonyveloiBizonylat } from './atalakit.ts';
import { novitax, novitaxBizonylatszam, novitaxEllenoriz } from './novitax.ts';

const vissza = (b: Uint8Array | undefined) => new TextDecoder('windows-1250').decode(b);

const K: KontirBeallitas = {
  ...alapBeallitas(),
  koltseg: '5211',
  arbevetel: '911',
  novitax: { naplokodBe: 'SZ', naplokodKi: 'VE', mentesTipus: 'AM' },
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
  megjegyzes: null,
};

const KIMENO_STORNO: KonyveloiBizonylat = {
  ...BEJOVO,
  id: 'd2',
  irany: 'kimeno',
  tipus: 'sztorno',
  partner: { nev: 'Vevő Bt.', adoszam: '11111111-2-41', torzsszam: '11111111' },
  bizonylatszam: 'K-001-S',
  sorok: [{ fajta: 'mentes', netto: -8000, afa: 0 }],
  netto: -8000,
  afa: 0,
  brutto: -8000,
};

const IKT = new Map([
  ['d1', 17],
  ['d2', 18],
]);

/** 40 mezős sor a megadott (1-es alapú) oszlopértékekkel – a leírás számozásával. */
function sor(ertekek: Record<number, string>): string {
  const s = new Array(40).fill('');
  for (const [oszlop, ertek] of Object.entries(ertekek)) s[Number(oszlop) - 1] = ertek;
  return s.join(';');
}

describe('Novitax NTAX számla- és partnerfájl', () => {
  it('aranyminta: bejövő vegyes kulcsos + kimenő mentes sztornó', async () => {
    const fajlok = kicsomagol(await novitax([BEJOVO, KIMENO_STORNO], K, IKT));
    expect([...fajlok.keys()]).toEqual(['szamla.csv', 'partner.csv']);

    const fej = { 1: 'SZ', 2: 'BE', 3: 'SZF17', 4: '2026.09.10', 5: '2026.09.08', 6: '2026.09.18', 7: '2026.09.08', 8: '2026.09.10', 9: '9', 10: '23456787', 11: '15000', 12: '2950', 16: 'SZ-2026/14', 18: '+', 19: '5211', 20: '454' };
    const kimeno = { 1: 'VE', 2: 'KI', 3: 'SZF18', 4: '2026.09.10', 5: '2026.09.08', 6: '2026.09.18', 7: '2026.09.08', 8: '2026.09.08', 9: '9', 10: '11111111', 11: '-8000', 12: '0', 16: 'K-001-S', 18: '-', 19: '311', 20: '911' };

    expect(vissza(fajlok.get('szamla.csv'))).toBe(
      [
        sor({ ...fej, 22: '27', 23: '10000' }),
        sor({ ...fej, 22: '5', 23: '5000' }),
        // Sztornó: a fej előjelhelyes, a tétel abszolút; mentes: típus AM, százalék üres.
        sor({ ...kimeno, 21: 'AM', 23: '8000' }),
        '',
      ].join('\r\n'),
    );

    const partner = (kod: string, nev: string, adoszam: string) => {
      const p = new Array(26).fill('');
      p[0] = kod;
      p[1] = nev;
      p[7] = adoszam;
      p[21] = 'HU';
      return p.join(';');
    };
    expect(vissza(fajlok.get('partner.csv'))).toBe(
      [partner('23456787', 'Példa Beszállító Kft.', '23456787213'), partner('11111111', 'Vevő Bt.', '11111111241'), ''].join('\r\n'),
    );
  });

  it('a gyártói minta sorának alakja: 40 mező, az általános kulcsnál üres típus + százalék', async () => {
    // Minta_ szamla_példa.csv 1. sora (KI napló): „…;+;311;911;;27;1000;…", 40 mező.
    const fajlok = kicsomagol(await novitax([BEJOVO], K, IKT));
    const elso = vissza(fajlok.get('szamla.csv')).split('\r\n')[0]!.split(';');
    expect(elso).toHaveLength(40);
    expect(elso.slice(17, 23)).toEqual(['+', '5211', '454', '', '27', '10000']);
  });

  it('partner csak egyszer kerül a partnerfájlba', async () => {
    const masik = { ...BEJOVO, id: 'd3', bizonylatszam: 'SZ-2026/15' };
    const fajlok = kicsomagol(await novitax([BEJOVO, masik], K, new Map([...IKT, ['d3', 19]])));
    expect(vissza(fajlok.get('partner.csv')).split('\r\n').filter((s) => s !== '')).toHaveLength(1);
  });

  it('a belső bizonylatszám 10 karakteren belül marad hét jegyig', () => {
    expect(novitaxBizonylatszam(9_999_999)).toHaveLength(10);
  });

  it('iktatószám nélkül nem ír fájlt (inkább hiba, mint ütköző bizonylatszám)', async () => {
    await expect(novitax([BEJOVO], K, new Map())).rejects.toThrow('Nincs iktatószáma');
  });

  it('partnerkód csak érvényes magyar adószámból', () => {
    expect(novitaxEllenoriz({ ...BEJOVO, partner: { ...BEJOVO.partner, torzsszam: null } })[0]).toMatch(
      /nincs érvényes magyar adószáma/,
    );
    expect(novitaxEllenoriz(BEJOVO)).toEqual([]);
  });

  it('mentes tételnél AM/TM nélkül a beállítás hiányos', () => {
    const b = { ...K, novitax: { ...K.novitax, mentesTipus: '' as const } };
    expect(beallitasHianyai(b, 'novitax', { bejovo: false, kimeno: true, fajtak: new Set(['mentes' as const]) })).toEqual([
      'Van mentes tétel: add meg, hogy az NTAX-ban alanyi (AM) vagy tárgyi (TM) mentesként menjen.',
    ]);
  });
});
