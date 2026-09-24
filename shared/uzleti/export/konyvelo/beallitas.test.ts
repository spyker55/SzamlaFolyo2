import { describe, expect, it } from 'vitest';
import { alapBeallitas, beallitasHianyai, KULCS_ALAP_KODOK, tisztit, type AfaFajta } from './beallitas.ts';

const semmi = new Set<AfaFajta>();

describe('kontír-beállítás', () => {
  it('a költség- és az árbevételszámlának nincs alapértéke – nem találgatunk', () => {
    const a = alapBeallitas();
    expect(a.koltseg).toBe('');
    expect(a.arbevetel).toBe('');
    expect(a.szallito).toBe('454');
    expect(a.elozetesAfa).toBe('466');
  });

  it('a tárolt szemétből is teljes, típushelyes beállítás lesz', () => {
    const t = tisztit({
      koltseg: ' 5211 ',
      penzforgalmi: 'igen',
      alapFizmod: 'barter',
      novitax: { mentesTipus: 'XX', naplokodBe: 'BEJ' },
      kulcs: { afakodok: { '27': { kod: 'A27X', nev: 42 } } },
    });
    expect(t.koltseg).toBe('5211');
    expect(t.penzforgalmi).toBe(false);
    expect(t.alapFizmod).toBe('atutalas');
    expect(t.novitax).toEqual({ naplokodBe: 'BE', naplokodKi: '', mentesTipus: '' });
    // Érvénytelen kód („A27X”) helyett a Kulcs alapkódja – üresen a fájl el sem készülne.
    expect(t.kulcs.afakodok.kimeno['27']).toBe('1');
    expect(t.kulcs.afakodok.bejovo.mentes).toBe('6');
    expect(tisztit(null)).toEqual(alapBeallitas());
  });

  it('csak azt kéri, ami ezekhez a bizonylatokhoz kell', () => {
    const csakBejovo = beallitasHianyai(alapBeallitas(), 'rlb', { bejovo: true, kimeno: false, fajtak: semmi });
    expect(csakBejovo).toEqual(['Add meg a(z) költség főkönyvi számát.']);

    const mindketto = beallitasHianyai(alapBeallitas(), 'rlb', { bejovo: true, kimeno: true, fajtak: semmi });
    expect(mindketto).toContain('Add meg a(z) árbevétel főkönyvi számát.');
  });

  it('a főkönyvi szám csak számjegy, a Novitaxnál legfeljebb 7', () => {
    const b = { ...alapBeallitas(), koltseg: '52-11' };
    expect(beallitasHianyai(b, 'rlb', { bejovo: true, kimeno: false, fajtak: semmi })).toEqual([
      'A(z) költség főkönyvi száma csak 1–8 számjegy lehet.',
    ]);

    const nyolc = { ...alapBeallitas(), koltseg: '52110001', novitax: { naplokodBe: 'BE', naplokodKi: '', mentesTipus: '' as const } };
    expect(beallitasHianyai(nyolc, 'rlb', { bejovo: true, kimeno: false, fajtak: semmi })).toEqual([]);
    expect(beallitasHianyai(nyolc, 'novitax', { bejovo: true, kimeno: false, fajtak: semmi })).toEqual([
      'A Novitax legfeljebb 7 jegyű főkönyvi számot fogad (költség).',
    ]);
  });

  it('Kulcs: az alapkódok betű szerint a demóban mért „Kód” oszlop (2026-09-24)', () => {
    // Törzskarbantartás → Kimenő/Bejövő áfa-kulcsok, „Kód” oszlop – mindkét
    // listában ugyanez. Az 1-es kóddal a 27% kérdés nélkül ment be.
    expect(KULCS_ALAP_KODOK).toEqual({ '27': '1', '18': '2', '5': '8', '0': '5', mentes: '6' });
    expect(alapBeallitas().kulcs.afakodok).toEqual({ kimeno: KULCS_ALAP_KODOK, bejovo: KULCS_ALAP_KODOK });
  });

  it('Kulcs: a régi alak (fajtánként kód + név) kódja mindkét irányba átjön', () => {
    const t = tisztit({ kulcs: { afakodok: { '27': { kod: '21', nev: 'x' }, '5': { kod: '', nev: '' } } } });
    expect(t.kulcs.afakodok.kimeno['27']).toBe('21');
    expect(t.kulcs.afakodok.bejovo['27']).toBe('21');
    expect(t.kulcs.afakodok.bejovo['5']).toBe('8');
  });

  it('Kulcs: az új alak irányonként külön olvasódik', () => {
    const t = tisztit({ kulcs: { afakodok: { kimeno: { '27': '31' }, bejovo: { '27': '41' } } } });
    expect(t.kulcs.afakodok.kimeno['27']).toBe('31');
    expect(t.kulcs.afakodok.bejovo['27']).toBe('41');
  });

  it('Kulcs: csak a használt irány és fajta kódját nézi, és az csak 1–3 számjegy lehet', () => {
    const b = { ...alapBeallitas(), koltseg: '5211' };
    const igeny = { bejovo: true, kimeno: false, fajtak: new Set<AfaFajta>(['27', 'mentes']) };
    expect(beallitasHianyai(b, 'kulcs', igeny)).toEqual([]);

    const rossz = {
      ...b,
      kulcs: { afakodok: { kimeno: { ...KULCS_ALAP_KODOK, '27': 'K27' }, bejovo: { ...KULCS_ALAP_KODOK, mentes: '' } } },
    };
    const hiany = beallitasHianyai(rossz, 'kulcs', igeny);
    // A kimenő 27%-os rossz kódja nem számít: nincs kimenő bizonylat.
    expect(hiany).toHaveLength(1);
    expect(hiany[0]).toMatch(/mentes bejövő ÁFA-kulcs Kulcs-kódja 1–3 számjegy/);
    expect(hiany[0]).toMatch(/Bejövő áfa-kulcsok „Kód” oszlopából/);
  });

  it('Kulcs: egy irányon belül két használt fajta nem kaphatja ugyanazt a kódot', () => {
    // A Kulcs a rossz kódot szó nélkül elfogadja (27%-os tétel 5%-os kóddal
    // átment) – a dupla kód az egyetlen elírás, amit mi láthatunk.
    const b = {
      ...alapBeallitas(),
      arbevetel: '911',
      kulcs: { afakodok: { kimeno: { ...KULCS_ALAP_KODOK, '5': '1' }, bejovo: { ...KULCS_ALAP_KODOK } } },
    };
    const mindketto = { bejovo: false, kimeno: true, fajtak: new Set<AfaFajta>(['27', '5']) };
    expect(beallitasHianyai(b, 'kulcs', mindketto)).toEqual([
      'A(z) 1 Kulcs-kód két kimenő ÁFA-kulcsnál is szerepel – mindegyik kulcsnak a sajátja kell (Kimenő áfa-kulcsok, „Kód” oszlop).',
    ]);
    // Ha csak az egyik fajta szerepel a bizonylatokon, nincs ütközés.
    expect(beallitasHianyai(b, 'kulcs', { ...mindketto, fajtak: new Set<AfaFajta>(['5']) })).toEqual([]);
  });
});
