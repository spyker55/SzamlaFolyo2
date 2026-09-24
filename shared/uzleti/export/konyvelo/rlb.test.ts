import { describe, expect, it } from 'vitest';
import { alapBeallitas, type KontirBeallitas } from './beallitas.ts';
import type { KonyveloiBizonylat } from './atalakit.ts';
import { afaEsedekesseg, RLB_FEJLEC, rlb, rlbEllenoriz } from './rlb.ts';

const vissza = (b: Uint8Array) => new TextDecoder('windows-1250').decode(b);

const K: KontirBeallitas = { ...alapBeallitas(), koltseg: '5211', arbevetel: '911' };

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

const KIMENO: KonyveloiBizonylat = {
  ...BEJOVO,
  id: 'd2',
  irany: 'kimeno',
  partner: { nev: 'Vevő Bt.', adoszam: '11111111-2-41', torzsszam: '11111111' },
  bizonylatszam: 'K-001',
  fizmod: 'keszpenz',
  sorok: [{ fajta: 'mentes', netto: 8000, afa: 0 }],
  netto: 8000,
  afa: 0,
  brutto: 8000,
  megjegyzes: 'Első; második\r\nsor',
};

describe('RLB többsoros CSV', () => {
  it('a fejléc betű szerint a gyártói mintáé (Minta_tobbsoros_2021.csv, 1. sor)', () => {
    // A mintából kimásolva, nem a konstansból összerakva.
    const minta =
      'Verzio;Naplo;KeltAkod;Teljbevsor;AfadNetto;Fhatafa;FmodBrt;BizNettod;MszAfad;PnevBrtd;PirszNfok;PvarNtk;PcimAfok;AdoszAtk;MegjBfok;DnemBtk;arfolyam;kadomsz;evaonyt;okodonys;kiegybiz;TAFADAT';
    expect(RLB_FEJLEC.join(';')).toBe(minta);
    expect(vissza(rlb([], K)).split('\r\n')[0]).toBe(minta);
  });

  it('aranyminta: bejövő vegyes kulcsos + kimenő mentes, bájtra', () => {
    const vart = [
      RLB_FEJLEC.join(';'),
      'V1.1;SF;2026.09.10;2026.09.08;2026.09.10;2026.09.18;1;SZ-2026/14;;Példa Beszállító Kft.;;;;23456787-2-13;;;;;;;;2026.09.08',
      ';ST;11;;10000;2700;12700;;;;5211;;466;;454;;;;;;;',
      ';ST;3;;5000;250;5250;;;;5211;;466;;454;;;;;;;',
      ';VF;2026.09.10;2026.09.08;2026.09.08;2026.09.18;2;K-001;;Vevő Bt.;;;;11111111-2-41;Első, második sor;;;;;;;2026.09.08',
      ';VT;4;;8000;0;8000;;;;911;;467;;311;;;;;;;',
      '',
    ].join('\r\n');

    const bajtok = rlb([BEJOVO, KIMENO], K);
    expect(vissza(bajtok)).toBe(vart);
    // Egy bájt / betű: tényleg ANSI, nem UTF-8.
    expect(bajtok.length).toBe(vart.length);
  });

  it('minden sor pontosan 22 oszlop – a leírás szerint minden oszlopnak szerepelnie kell', () => {
    const sorok = vissza(rlb([BEJOVO, KIMENO], K)).split('\r\n').filter((s) => s !== '');
    for (const s of sorok) expect(s.split(';')).toHaveLength(22);
  });

  it('pénzforgalmi ügyfélnél az ÁFA esedékessége üres (így jelzi az RLB)', () => {
    const fej = vissza(rlb([BEJOVO], { ...K, penzforgalmi: true })).split('\r\n')[1] as string;
    expect(fej.split(';')[4]).toBe('');
  });

  it('bejövőn az ÁFA esedékessége a kelt és a teljesítés közül a későbbi, kimenőn a teljesítés', () => {
    expect(afaEsedekesseg(BEJOVO)).toBe('2026-09-10');
    expect(afaEsedekesseg({ ...BEJOVO, teljesites: '2026-09-12' })).toBe('2026-09-12');
    expect(afaEsedekesseg(KIMENO)).toBe('2026-09-08');
  });

  it('a sztornó negatív összegei változatlanul mennek', () => {
    const sztorno = { ...BEJOVO, tipus: 'sztorno' as const, sorok: [{ fajta: '27' as const, netto: -10000, afa: -2700 }] };
    expect(vissza(rlb([sztorno], K)).split('\r\n')[2]).toBe(';ST;11;;-10000;-2700;-12700;;;;5211;;466;;454;;;;;;;');
  });

  it('azonosítót nem csonkol: túl hosszú bizonylatszám akadály', () => {
    expect(rlbEllenoriz({ ...BEJOVO, bizonylatszam: 'X'.repeat(31) })).toEqual([
      'A bizonylatszám hosszabb 30 karakternél (RLB-korlát).',
    ]);
    expect(rlbEllenoriz(BEJOVO)).toEqual([]);
  });

  it('a partner neve 60 karakterre vágva, elválasztó nélkül', () => {
    const hosszu = { ...BEJOVO, partner: { ...BEJOVO.partner, nev: 'A;B ' + 'x'.repeat(80) } };
    const nev = vissza(rlb([hosszu], K)).split('\r\n')[1]!.split(';')[9] as string;
    expect(nev).toHaveLength(60);
    expect(nev.startsWith('A,B ')).toBe(true);
  });
});
