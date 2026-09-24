import { describe, expect, it } from 'vitest';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { csomagKoltsegek, legolcsobbCsomag } from './irodaiKoltseg.ts';

const { kicsi, kozepes, nagy } = szamlafolyo.csomagok;

describe('egy könyvelőiroda havi díja', () => {
  it('a kereten belül a havidíj, többlet nélkül', () => {
    const [start] = csomagKoltsegek(kicsi.dokumentumok);
    expect(start).toMatchObject({ osszes: kicsi.arHavi, tobbletDarab: 0, tobbletFt: 0 });
  });

  it('a kereten felül darabonként a csomag saját extra díja', () => {
    const darab = nagy.dokumentumok + 250;
    const pro = csomagKoltsegek(darab).find((c) => c.kulcs === 'nagy')!;

    expect(pro.tobbletDarab).toBe(250);
    expect(pro.tobbletFt).toBe(250 * nagy.extraFt);
    expect(pro.osszes).toBe(nagy.arHavi + 250 * nagy.extraFt);
    expect(pro.darabar).toBe(Math.round(pro.osszes / darab));
  });

  it('a példa az oldalról: 25 ügyfél × 30 bizonylat → a legolcsóbb a Pro', () => {
    // Mai árakon: Start 39 900, Flow 31 900, Pro 27 400. Ha az árak
    // megváltoznak, ez a teszt a számokat nem, csak a sorrendet őrzi.
    const k = csomagKoltsegek(750);
    const legjobb = legolcsobbCsomag(750);

    expect(legjobb.kulcs).toBe('nagy');
    for (const c of k) expect(legjobb.osszes).toBeLessThanOrEqual(c.osszes);
  });

  it('egy kis irodának nem a legnagyobb csomagot ajánlja', () => {
    expect(legolcsobbCsomag(kicsi.dokumentumok).kulcs).toBe('kicsi');
    expect(legolcsobbCsomag(kozepes.dokumentumok).kulcs).toBe('kozepes');
  });

  it('jelzi, ha a többlet az alapplafon fölé megy', () => {
    const sok = csomagKoltsegek(10_000).find((c) => c.kulcs === 'nagy')!;
    expect(sok.tobbletFt).toBeGreaterThan(szamlafolyo.tulhasznalat.alapPlafonFt);
    expect(sok.plafonFelett).toBe(true);
    expect(csomagKoltsegek(nagy.dokumentumok)[2]!.plafonFelett).toBe(false);
  });

  it('értelmetlen bemenetre nem ad NaN-t', () => {
    for (const rossz of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      const [start] = csomagKoltsegek(rossz);
      expect(start!.osszes).toBe(kicsi.arHavi);
      expect(start!.darabar).toBeNull();
    }
    expect(csomagKoltsegek(10.7)[0]!.tobbletDarab).toBe(0);
  });
});
