import { describe, expect, it } from 'vitest';
import { hatarokErtelmez, hatarOldalszam, kotegSema } from './koteg.ts';

/**
 * A kötegszétszedés határainak értelmezése.
 *
 * A modul egyetlen dolgot csinál: **nemet mond mindenre, ami nem hibátlan.** A
 * tesztek ezért nagyrészt a nemekről szólnak — a nem azt jelenti, hogy marad a
 * mai viselkedés (egy bizonylat, `tobb_irat_gyanu` zászlóval), abból pedig nem
 * lesz kár. Egy elfogadott rossz határból viszont igen: rossz oldalakon rossz
 * bizonylat, külön kreditért, és ezt utólag senki nem veszi észre.
 */

const negyOldal = (dokumentumok: unknown) => hatarokErtelmez({ dokumentumok }, 4);

describe('kötegszétszedés — amit elfogadunk', () => {
  it('két bizonylat, hézagmentesen lefedve', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 4 },
    ]);

    expect(d).toEqual({
      szet: true,
      javitas: null,
      hatarok: [
        { oldal_tol: 1, oldal_ig: 2 },
        { oldal_tol: 3, oldal_ig: 4 },
      ],
    });
  });

  it('a sorrendet mi tesszük helyre, nem a modelltől várjuk', () => {
    const d = negyOldal([
      { oldal_tol: 3, oldal_ig: 4 },
      { oldal_tol: 1, oldal_ig: 2 },
    ]);

    expect(d.szet).toBe(true);
    expect(d.szet && d.hatarok[0]).toEqual({ oldal_tol: 1, oldal_ig: 2 });
  });

  it('a sztringként visszaadott egész szám is szám', () => {
    const d = negyOldal([
      { oldal_tol: '1', oldal_ig: '1' },
      { oldal_tol: 2, oldal_ig: 4 },
    ]);

    expect(d.szet).toBe(true);
  });

  it('négy egyoldalas bizonylat', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 1 },
      { oldal_tol: 2, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 3 },
      { oldal_tol: 4, oldal_ig: 4 },
    ]);

    expect(d.szet && d.hatarok).toHaveLength(4);
  });
});

describe('kötegszétszedés — amire nemet mondunk', () => {
  it('egyetlen bizonylat nem szétszedés', () => {
    const d = negyOldal([{ oldal_tol: 1, oldal_ig: 4 }]);

    expect(d).toEqual({ szet: false, indok: 'A fájlban egyetlen bizonylat van.' });
  });

  it('átfedés: a 2. oldal két bizonylathoz tartozna', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 2, oldal_ig: 4 },
    ]);

    expect(d.szet).toBe(false);
    expect(d.szet === false && d.indok).toContain('átfednék');
  });

  it('a fájlon túlnyúló tartomány', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 9 },
    ]);

    expect(d.szet).toBe(false);
    expect(d.szet === false && d.indok).toContain('érvénytelen');
  });

  it('fordított tartomány', () => {
    const d = negyOldal([
      { oldal_tol: 3, oldal_ig: 1 },
      { oldal_tol: 1, oldal_ig: 4 },
    ]);

    expect(d.szet).toBe(false);
  });

  it('nulladik oldal nincs — a számozás 1-alapú', () => {
    const d = negyOldal([
      { oldal_tol: 0, oldal_ig: 1 },
      { oldal_tol: 2, oldal_ig: 4 },
    ]);

    expect(d.szet).toBe(false);
  });

  it('törtszám nem kerekítődik: az a válasz megbízhatatlanságának jele', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2.5 },
      { oldal_tol: 3, oldal_ig: 4 },
    ]);

    expect(d.szet).toBe(false);
  });

  it('a felső korlát fölött nem szedünk szét', () => {
    const sok = Array.from({ length: 40 }, (_, i) => ({ oldal_tol: i + 1, oldal_ig: i + 1 }));
    const d = hatarokErtelmez({ dokumentumok: sok }, 40, 30);

    expect(d.szet).toBe(false);
    expect(d.szet === false && d.indok).toContain('felső korlát 30');
  });

  it('a korláttal pontosan egyenlő darabszám még átmegy', () => {
    const harminc = Array.from({ length: 30 }, (_, i) => ({ oldal_tol: i + 1, oldal_ig: i + 1 }));

    expect(hatarokErtelmez({ dokumentumok: harminc }, 30, 30).szet).toBe(true);
  });

  it('üres vagy hiányzó lista', () => {
    expect(negyOldal([]).szet).toBe(false);
    expect(hatarokErtelmez({}, 4).szet).toBe(false);
    expect(hatarokErtelmez(null, 4).szet).toBe(false);
    expect(negyOldal('nem tömb').szet).toBe(false);
  });

  it('egyoldalas fájlban nincs mit szétszedni', () => {
    const d = hatarokErtelmez({ dokumentumok: [{ oldal_tol: 1, oldal_ig: 1 }] }, 1);

    expect(d.szet).toBe(false);
  });

  it('ismeretlen oldalszámnál nem tudnánk ellenőrizni a lefedést', () => {
    const d = hatarokErtelmez(
      { dokumentumok: [{ oldal_tol: 1, oldal_ig: 1 }, { oldal_tol: 2, oldal_ig: 2 }] },
      null,
    );

    expect(d.szet).toBe(false);
  });
});

/**
 * A hézagkitöltés — **a legdrágább leckéből**.
 *
 * Az első éles köteg (számla, üres oldal, szállítólevél) pont ezen bukott
 * volna el másodszor is: egy üres elválasztó oldalról a modell jogosan nem
 * állítja, hogy bizonylat, a szigorú lefedés-szabály viszont emiatt az egész
 * szétszedést eldobta volna.
 */
describe('kötegszétszedés — a besorolatlan oldal', () => {
  it('a köztes üres oldal a megelőző bizonylathoz kerül', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 4, oldal_ig: 4 },
    ]);

    expect(d.szet && d.hatarok).toEqual([
      { oldal_tol: 1, oldal_ig: 3 },
      { oldal_tol: 4, oldal_ig: 4 },
    ]);
    expect(d.szet && d.javitas).toBe('Besorolatlan oldal: 3. → a(z) 1. bizonylathoz');
  });

  it('a fájl végén maradt oldal az utolsó bizonylathoz kerül', () => {
    const d = negyOldal([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 3 },
    ]);

    expect(d.szet && d.hatarok).toEqual([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 4 },
    ]);
    expect(d.szet && d.javitas).toContain('4. → a(z) 2. bizonylathoz');
  });

  it('a fájl elején maradt oldal az elsőhöz kerül — előtte nincs mihez', () => {
    const d = negyOldal([
      { oldal_tol: 2, oldal_ig: 3 },
      { oldal_tol: 4, oldal_ig: 4 },
    ]);

    expect(d.szet && d.hatarok).toEqual([
      { oldal_tol: 1, oldal_ig: 3 },
      { oldal_tol: 4, oldal_ig: 4 },
    ]);
    expect(d.szet && d.javitas).toContain('1. → az 1. bizonylathoz');
  });

  it('több hézag egyszerre, mindegyik a saját megelőzőjéhez', () => {
    const d = hatarokErtelmez(
      {
        dokumentumok: [
          { oldal_tol: 1, oldal_ig: 1 },
          { oldal_tol: 3, oldal_ig: 3 },
          { oldal_tol: 6, oldal_ig: 6 },
        ],
      },
      8,
    );

    expect(d.szet && d.hatarok).toEqual([
      { oldal_tol: 1, oldal_ig: 2 },
      { oldal_tol: 3, oldal_ig: 5 },
      { oldal_tol: 6, oldal_ig: 8 },
    ]);
  });

  it('a kitöltés után sincs átfedés és nincs kimaradó oldal', () => {
    const d = hatarokErtelmez(
      { dokumentumok: [{ oldal_tol: 2, oldal_ig: 2 }, { oldal_tol: 5, oldal_ig: 5 }] },
      7,
    );

    expect(d.szet).toBe(true);
    if (!d.szet) return;

    const lefedett = d.hatarok.flatMap((h) =>
      Array.from({ length: h.oldal_ig - h.oldal_tol + 1 }, (_, i) => h.oldal_tol + i),
    );

    expect(lefedett).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('kísérők', () => {
  it('a tartomány hossza mindkét végén zárt', () => {
    expect(hatarOldalszam({ oldal_tol: 3, oldal_ig: 4 })).toBe(2);
    expect(hatarOldalszam({ oldal_tol: 2, oldal_ig: 2 })).toBe(1);
  });

  it('a séma minden mezője kötelező — a szűk alakot a Gemini modellek kérik', () => {
    const sema = kotegSema() as Record<string, any>;
    const elem = sema['properties']['dokumentumok']['items'];

    expect(sema['required']).toEqual(['dokumentumok']);
    expect(elem['required']).toEqual(['oldal_tol', 'oldal_ig']);
    expect(elem['properties']['oldal_tol']['type']).toBe('integer');
  });
});
