import { describe, expect, test } from 'vitest';
import { allandosag, jelentes, jsonAlak, type Futas, type Meres } from './jelentes.ts';
import { lancon } from './meres.ts';
import type { Felderites } from '../supabase/functions/kiolvas/felderites.ts';

const KEP: Felderites = {
  jelleg: 'kep',
  xml: null,
  xmlBajt: null,
  xmlNev: null,
  oldalszam: 2,
  szovegHossz: 0,
  oldalSzovegek: null,
  hiba: null,
};

function modellFutas(nyers: Record<string, unknown>): Futas {
  return {
    olvaso: 'google/gemini-3.8-flash',
    futtatottModell: 'google/gemini-3.8-flash-002',
    promptVerzio: 'v6-2026-09-04',
    bemenetToken: 3457,
    kimenetToken: 1194,
    gondolkodasToken: 891,
    koltseg: 0.006703,
    idoMs: 9012,
    eredmeny: lancon(nyers, KEP),
  };
}

const ALAP = {
  doc_type: 'szamla',
  supplier_name: 'Első Kft.',
  doc_number: 'A-1',
  issue_date: '2026-09-21',
  gross_amount: 127000,
};

/**
 * ⚠️ **Ez a script létjogosultsága**, és ezért a legfontosabb teszt.
 *
 * A projekt legdrágább leckéje az volt, hogy ugyanazt a kézzel írott számlát
 * hatszor kiolvasva hat különböző, kitalált szállítónév jött ki, miközben
 * minden szám hatszor helyes volt. Aki egyszer futtat, egy nevet lát — és
 * elhiszi. Az `allandosag()` az a függvény, ami ezt megmutatja; ha ő téved,
 * a mérőeszköz **megnyugtat**, ahelyett hogy figyelmeztetne.
 */
describe('állandóság', () => {
  test('egy futásból nincs mit összehasonlítani', () => {
    expect(allandosag([modellFutas(ALAP)])).toEqual({});
  });

  test('két azonos futás: semmi nem ingadozik', () => {
    expect(allandosag([modellFutas(ALAP), modellFutas(ALAP)])).toEqual({});
  });

  test('az eltérő szállítónév előkerül, az összes látott értékkel', () => {
    const ingadozo = allandosag([
      modellFutas(ALAP),
      modellFutas({ ...ALAP, supplier_name: 'Második Kft.' }),
    ]);

    expect(ingadozo).toEqual({ supplier_name: ['Első Kft.', 'Második Kft.'] });
  });

  /**
   * A **harmadik** futás az igazi próba: egy összehasonlítás, ami csak az első
   * kettőt nézi, ezen a soron csúszik el — pedig a kitalált nevek épp így
   * jöttek elő, futásról futásra másként.
   */
  test('három futás, három név — mind a három látszik', () => {
    const ingadozo = allandosag([
      modellFutas(ALAP),
      modellFutas(ALAP),
      modellFutas({ ...ALAP, supplier_name: 'Harmadik Kft.' }),
    ]);

    expect(ingadozo['supplier_name']).toEqual(['Első Kft.', 'Harmadik Kft.']);
  });

  test('a hiányzó mező is érték: a „néha kitölti" ingadozás', () => {
    const ingadozo = allandosag([
      modellFutas(ALAP),
      modellFutas({ ...ALAP, customer_name: 'Vevő Zrt.' }),
    ]);

    expect(ingadozo['customer_name']).toEqual(['—', 'Vevő Zrt.']);
  });

  test('az ÁFA-bontás is összehasonlításra kerül, nem csak a skalárok', () => {
    const ingadozo = allandosag([
      modellFutas({ ...ALAP, afa_bontas: [{ kulcs: 27, netto: 100000, afa: 27000 }] }),
      modellFutas({ ...ALAP, afa_bontas: [{ kulcs: 5, netto: 100000, afa: 5000 }] }),
    ]);

    expect(Object.keys(ingadozo)).toContain('afa_bontas');
  });
});

describe('jelentés', () => {
  const meres: Meres = {
    fajl: { nev: 'nyugta.png', bajt: 12345, mime: 'image/png' },
    felderites: KEP,
    futasok: [modellFutas(ALAP)],
  };

  const szoveg = jelentes(meres);

  test('megmondja, melyik modell felelt valójában, és melyik prompt ment ki', () => {
    expect(szoveg).toContain('google/gemini-3.8-flash-002');
    expect(szoveg).toContain('v6-2026-09-04');
  });

  test('a költség dollárban áll — a forint átszámítás volna, nem mérés', () => {
    expect(szoveg).toContain('0.006703 USD');
    expect(szoveg).not.toMatch(/Ft\b/);
  });

  test('a gondolkodási token a kimenet része, és ezt ki is mondja', () => {
    expect(szoveg).toContain('891 gondolkodás');
    expect(szoveg).toContain('a kimenet része, nem afölött');
  });

  test('a kapuk hiánya nincs elhallgatva', () => {
    expect(szoveg).toContain('A kapuk döntése nincs itt');
  });

  test('a tárolt alak látszik, nem a formázott', () => {
    expect(szoveg).toContain('127000.00');
    expect(szoveg).not.toContain('127 000');
  });

  test('a hiányzó mező „nincs adat", nem gyanús', () => {
    expect(szoveg).toMatch(/·\s+—\s+nincs adat\s+Vevő /);
  });

  /**
   * ⚠️ A `--json` kimenet fájlba szokott menni. A bizonylat teljes szövegének
   * és XML-jének semmi keresnivalója benne: a felderítésből csak az megy ki,
   * amit az adatbázis is eltárolna.
   */
  test('a --json alak nem viszi magával a bizonylat tartalmát', () => {
    const teljes: Meres = {
      ...meres,
      felderites: {
        ...KEP,
        jelleg: 'strukturalt_xml',
        xml: '<Invoice>TITKOS ÜGYFÉLADAT</Invoice>',
        xmlBajt: 37,
        oldalSzovegek: ['TITKOS ÜGYFÉLADAT'],
      },
    };

    const szoveg = JSON.stringify(jsonAlak(teljes));

    expect(szoveg).not.toContain('TITKOS');
    // De ami a naplóba menne, az benne van.
    expect(JSON.parse(szoveg)).toMatchObject({
      felderites: { jelleg: 'strukturalt_xml', xml_bajt: 37 },
    });
  });

  test('XML-ágon a költség nem nulla szám, hanem „nem modell olvasta ki"', () => {
    const xmlFutas: Futas = {
      ...modellFutas(ALAP),
      olvaso: 'xml/ubl',
      futtatottModell: null,
      promptVerzio: null,
      bemenetToken: null,
      kimenetToken: null,
      gondolkodasToken: null,
      koltseg: null,
    };

    expect(jelentes({ ...meres, futasok: [xmlFutas] })).toContain('nem modell olvasta ki');
  });
});
