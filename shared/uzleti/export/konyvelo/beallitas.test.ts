import { describe, expect, it } from 'vitest';
import { alapBeallitas, beallitasHianyai, tisztit, type AfaFajta } from './beallitas.ts';

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
    expect(t.kulcs.afakodok['27']).toEqual({ kod: 'A27', nev: '' });
    expect(t.kulcs.afakodok.mentes).toEqual({ kod: '', nev: '' });
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

  it('Kulcs: a használt ÁFA-fajták kódja és neve kell, a többi nem', () => {
    const b = { ...alapBeallitas(), koltseg: '5211' };
    const hiany = beallitasHianyai(b, 'kulcs', { bejovo: true, kimeno: false, fajtak: new Set<AfaFajta>(['27', 'mentes']) });
    expect(hiany).toHaveLength(2);
    expect(hiany[0]).toMatch(/27%-os ÁFA-kulcs/);
    expect(hiany[1]).toMatch(/mentes ÁFA-kulcs/);
  });
});
