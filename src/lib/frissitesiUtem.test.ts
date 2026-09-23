import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CSENDES_POLL_MS,
  FIGYELO_ABLAK_MS,
  FIGYELO_POLL_MS,
  frissitesiUtem,
  frissitoHurok,
  RITKA_POLL_MS,
  SURU_ABLAK_MS,
  SURU_POLL_MS,
} from './frissitesiUtem.ts';

describe('a Beérkező frissítési üteme', () => {
  it('ha semmi nem fut, akkor is figyel – csendesen (az e-mailes út miatt)', () => {
    // 2026-09-23 előtt itt nem volt ütem: az e-mailben érkezett bizonylat csak
    // oldalfrissítésre jelent meg.
    expect(frissitesiUtem(false, 0, 10 * 60_000)).toBe(CSENDES_POLL_MS);
    expect(frissitesiUtem(false, 10 * 60_000, 10 * 60_000)).toBe(CSENDES_POLL_MS);
  });

  it('feldolgozás közben az első fél percben sűrűn', () => {
    expect(frissitesiUtem(true, 0, 10 * 60_000)).toBe(SURU_POLL_MS);
    expect(frissitesiUtem(true, SURU_ABLAK_MS - 1, 10 * 60_000)).toBe(SURU_POLL_MS);
  });

  it('fél perc után ritkábban – egy beragadt sor ne kérdezzen másodpercenként', () => {
    expect(frissitesiUtem(true, SURU_ABLAK_MS, 10 * 60_000)).toBe(RITKA_POLL_MS);
    expect(frissitesiUtem(true, 60 * 60_000, 10 * 60_000)).toBe(RITKA_POLL_MS);
  });

  it('ha épp visszajöttél (figyelő ablak), 5 másodpercenként néz', () => {
    // 2026-09-23: a levél után a Beérkező 0,2 s-mal lekéste a bizonylat
    // sorát, és a következő 15 s-os kör 6 s-mal a kész bizonylat után jött.
    expect(frissitesiUtem(false, 0, 0)).toBe(FIGYELO_POLL_MS);
    expect(frissitesiUtem(false, 0, FIGYELO_ABLAK_MS - 1)).toBe(FIGYELO_POLL_MS);
  });

  it('a figyelő ablak után visszalassul – a naplókeret miatt', () => {
    // Minden kérés ~4,2 KB naplósor; a Pro naplókerete havi 5 GB. Egy
    // mindig 5 s-os tétlen ütem egy egész nap nyitva hagyott fülön ~530 MB/hó.
    expect(frissitesiUtem(false, 0, FIGYELO_ABLAK_MS)).toBe(CSENDES_POLL_MS);
    expect(FIGYELO_ABLAK_MS).toBeLessThanOrEqual(5 * 60_000);
  });

  it('feldolgozás közben a figyelem nem számít – a sűrű ütem viszi', () => {
    expect(frissitesiUtem(true, 0, 0)).toBe(SURU_POLL_MS);
    expect(frissitesiUtem(true, SURU_ABLAK_MS, 0)).toBe(RITKA_POLL_MS);
  });

  it('a sebességek sorrendje: sűrű < ritka < csendes', () => {
    // Ha valaki a csendes ütemet a ritka alá venné, a tétlen fül többet
    // kérdezne, mint egy beragadt feldolgozás – fordított prioritás.
    expect(SURU_POLL_MS).toBeLessThan(RITKA_POLL_MS);
    expect(RITKA_POLL_MS).toBeLessThan(CSENDES_POLL_MS);
    // És ne legyen olyan ritka, hogy a felhasználó feladja a várakozást.
    expect(CSENDES_POLL_MS).toBeLessThanOrEqual(30_000);
  });
});

describe('a Beérkező tényleg ezt az ütemet használja', () => {
  // A tiszta függvény csak akkor véd, ha a képernyő őt kérdezi. A régi hiba
  // egy korai `return` volt a hurok elején: tétlen listánál el sem indult.
  const forras = readFileSync(new URL('../kepernyok/Beerkezo.tsx', import.meta.url), 'utf8');

  it('a hurok a frissitesiUtem()-ből veszi az időzítést', () => {
    expect(forras).toContain(
      'frissitesiUtem(dolgozikMeg, Date.now() - kezdet, Date.now() - figyelem.current)',
    );
  });

  it('a tétlen lista nem lép ki a hurokból', () => {
    expect(forras).not.toMatch(/if\s*\(\s*!dolgozikMeg\s*\)\s*return/);
  });

  it('fül- és ablakváltásra is figyel (a Gmail külön ablakban is lehet)', () => {
    expect(forras).toContain("document.addEventListener('visibilitychange', figyel)");
    expect(forras).toContain("window.addEventListener('focus', figyel)");
    expect(forras).toContain("document.removeEventListener('visibilitychange', figyel)");
    expect(forras).toContain("window.removeEventListener('focus', figyel)");
  });

  it('a figyelem az időt is újraindítja, és azonnal frissít', () => {
    const figyel = forras.slice(forras.indexOf('function figyel()'));
    const torzs = figyel.slice(0, figyel.indexOf('\n    }\n'));

    expect(torzs).toContain('figyelem.current = Date.now();');
    expect(torzs).toContain('hurok.most()');
  });

  it('a hatás takarításkor leállítja a hurkot', () => {
    expect(forras).toContain('hurok.leallit();');
  });
});

describe('a frissítő hurok (álórával)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Egy `frissit`, ami számolja a hívásokat, és kézzel oldható fel. */
  function hamisFrissit() {
    const nyitott: (() => void)[] = [];
    let hivas = 0;

    return {
      frissit: () =>
        new Promise<void>((kesz) => {
          hivas += 1;
          nyitott.push(kesz);
        }),
      hivasok: () => hivas,
      /** Minden úton lévő kérés visszaér; `forditva`: a legutóbbi elsőként. */
      mindKesz: async (forditva = false) => {
        while (nyitott.length > 0) (forditva ? nyitott.pop() : nyitott.shift())?.();
        await vi.advanceTimersByTimeAsync(0);
      },
    };
  }

  it('az ütem szerint kérdez', async () => {
    const f = hamisFrissit();
    const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 5000, lathato: () => true });

    await vi.advanceTimersByTimeAsync(4999);
    expect(f.hivasok()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.hivasok()).toBe(1);

    await f.mindKesz();
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.hivasok()).toBe(2);

    hurok.leallit();
  });

  it('rejtett fülön nem kérdez', async () => {
    const f = hamisFrissit();
    const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 5000, lathato: () => false });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.hivasok()).toBe(0);

    hurok.leallit();
  });

  it('a most() azonnal kérdez, és eldobja a lassú időzítőt', async () => {
    const f = hamisFrissit();
    const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 15_000, lathato: () => true });

    await vi.advanceTimersByTimeAsync(10_000);
    hurok.most();
    expect(f.hivasok()).toBe(1);

    // A régi, 15 s-os időzítő (a 15. másodpercnél) nem futhat le.
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.hivasok()).toBe(1);

    hurok.leallit();
  });

  for (const forditva of [false, true]) {
    it(`úton lévő kérés közbeni most() után sem fut két hurok (${forditva ? 'fordított' : 'rendes'} sorrend)`, async () => {
      const f = hamisFrissit();
      const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 5000, lathato: () => true });

      await vi.advanceTimersByTimeAsync(5000);
      expect(f.hivasok()).toBe(1); // az első kör kérése úton van

      hurok.most(); // közben visszaváltás
      expect(f.hivasok()).toBe(2);

      await f.mindKesz(forditva);

      // Két hurok esetén 5 s múlva 2 új kérés jönne.
      await vi.advanceTimersByTimeAsync(5000);
      expect(f.hivasok()).toBe(3);
      await f.mindKesz();
      await vi.advanceTimersByTimeAsync(5000);
      expect(f.hivasok()).toBe(4);

      hurok.leallit();
    });
  }

  it('két gyors most() (visibilitychange + focus) után is egy hurok fut', async () => {
    const f = hamisFrissit();
    const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 5000, lathato: () => true });

    hurok.most();
    hurok.most();
    expect(f.hivasok()).toBe(2);

    await f.mindKesz();

    await vi.advanceTimersByTimeAsync(5000);
    expect(f.hivasok()).toBe(3);

    hurok.leallit();
  });

  it('a hibás kérés után sem áll meg', async () => {
    let hivas = 0;
    const hurok = frissitoHurok({
      frissit: () => {
        hivas += 1;
        return Promise.reject(new Error('hálózat'));
      },
      utem: () => 5000,
      lathato: () => true,
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(hivas).toBe(3);

    hurok.leallit();
  });

  it('leállítás után semmi nem fut', async () => {
    const f = hamisFrissit();
    const hurok = frissitoHurok({ frissit: f.frissit, utem: () => 5000, lathato: () => true });

    hurok.leallit();
    hurok.most();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f.hivasok()).toBe(0);
  });
});
