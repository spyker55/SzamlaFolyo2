import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { KIMERVE } from '@uzleti/export/konyvelo/beallitas.ts';
import { hossz, keresesHirdetesekCsv, kulcsszavakCsv, szovegMd } from './kimenet.ts';
import {
  ft,
  GOOGLE_KEP_UZENETEK,
  GOOGLE_KERESES,
  GOOGLE_KIEMELESEK,
  GOOGLE_PMAX,
  GOOGLE_RESZLETEK,
  GOOGLE_WEBHELYLINKEK,
  KORLAT,
  META,
  TILTOTT,
} from './szovegek.ts';
import { GOOGLE_MERETEK, META_MERETEK } from './meretek.ts';
import { BEERKEZO_SOROK, MEZOK, VALIDATOR_UZENET } from './minta.ts';
import { ervenyes } from '@uzleti/adoszam.ts';

/**
 * A hirdetéscsomag őre.
 *
 * A Meta és a Google a túl hosszú szöveget csonkolja vagy elutasítja, a túl
 * sokat ígérőt pedig „megtévesztő" okkal tiltja le – a céloldalon pedig a
 * látogató veszi észre. Ez a teszt mindhármat méri, feltöltés előtt.
 */
const ITT = new URL('.', import.meta.url).pathname;
const G = KORLAT.google;

/** Minden szöveg a csomagból, rekurzívan – a `TILTOTT` mintái nélkül. */
function mindenSzoveg(): string[] {
  const ki: string[] = [];
  const bejar = (x: unknown): void => {
    if (typeof x === 'string') ki.push(x);
    else if (Array.isArray(x)) x.forEach(bejar);
    else if (x !== null && typeof x === 'object' && !(x instanceof RegExp)) Object.values(x).forEach(bejar);
  };
  bejar([META, GOOGLE_KERESES, GOOGLE_KIEMELESEK, GOOGLE_PMAX, GOOGLE_RESZLETEK, GOOGLE_WEBHELYLINKEK]);
  return ki;
}

describe('karakterkorlátok (mérve)', () => {
  it('Meta: címsor, leírás és a rövid fő szöveg kifér', () => {
    for (const u of META) {
      for (const c of u.cimsorok) expect(hossz(c), `${u.id} címsor: „${c}"`).toBeLessThanOrEqual(KORLAT.meta.cimsor);
      for (const l of u.leirasok) expect(hossz(l), `${u.id} leírás: „${l}"`).toBeLessThanOrEqual(KORLAT.meta.leiras);
      expect(hossz(u.elsodlegesRovid), `${u.id} rövid fő szöveg`).toBeLessThanOrEqual(KORLAT.meta.elsodlegesLatszik);
      expect(u.kep.kiemelt, `${u.id}: a kiemelt sor nem létezik`).toBeLessThan(u.kep.cim.length);
    }
  });

  it('Google Keresés: 15 címsor, 4 leírás, útvonal – mind a korláton belül', () => {
    for (const c of GOOGLE_KERESES) {
      expect(c.cimsorok, c.csoport).toHaveLength(15);
      expect(c.leirasok, c.csoport).toHaveLength(4);
      expect(new Set(c.cimsorok).size, `${c.csoport}: ismétlődő címsor`).toBe(15);
      for (const s of c.cimsorok) expect(hossz(s), `„${s}"`).toBeLessThanOrEqual(G.cimsor);
      for (const s of c.leirasok) expect(hossz(s), `„${s}"`).toBeLessThanOrEqual(G.leiras);
      for (const u of c.utvonal) expect(hossz(u), `útvonal: ${u}`).toBeLessThanOrEqual(G.utvonal);
    }
  });

  it('Google-bővítmények és a Performance Max eszközei', () => {
    for (const w of GOOGLE_WEBHELYLINKEK) {
      expect(hossz(w.szoveg), w.szoveg).toBeLessThanOrEqual(G.webhelylink);
      expect(hossz(w.sor1), w.sor1).toBeLessThanOrEqual(G.webhelylinkLeiras);
      expect(hossz(w.sor2), w.sor2).toBeLessThanOrEqual(G.webhelylinkLeiras);
    }
    for (const k of GOOGLE_KIEMELESEK) expect(hossz(k), k).toBeLessThanOrEqual(G.kiemeles);
    for (const e of GOOGLE_RESZLETEK.ertekek) expect(hossz(e), e).toBeLessThanOrEqual(G.reszletErtek);

    expect(hossz(GOOGLE_PMAX.cegnev)).toBeLessThanOrEqual(G.cegnev);
    expect(GOOGLE_PMAX.cimsorok.length).toBeGreaterThanOrEqual(3);
    for (const s of GOOGLE_PMAX.cimsorok) expect(hossz(s), s).toBeLessThanOrEqual(G.cimsor);
    for (const s of GOOGLE_PMAX.hosszuCimsorok) expect(hossz(s), s).toBeLessThanOrEqual(G.hosszuCimsor);
    for (const s of GOOGLE_PMAX.leirasok) expect(hossz(s), s).toBeLessThanOrEqual(G.leiras);
    expect(hossz(GOOGLE_PMAX.leirasok[0] ?? ''), 'rövid leírás').toBeLessThanOrEqual(G.rovidLeiras);
  });

  it('Google-címsorban nincs felkiáltójel és emoji (szerkesztési irányelv)', () => {
    const cimsorok = [...GOOGLE_KERESES.flatMap((c) => c.cimsorok), ...GOOGLE_PMAX.cimsorok];
    for (const s of cimsorok) {
      expect(s, `„${s}"`).not.toMatch(/!/);
      expect(s, `„${s}"`).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('tartalom: csak az, amit a termék ma tud', () => {
  const szovegek = mindenSzoveg();

  it('egyáltalán látja a szövegeket (anti-vakság)', () => {
    expect(szovegek.length).toBeGreaterThan(150);
  });

  it.each(TILTOTT.map((t) => [t.minta.source, t] as const))('tiltott ígéret: /%s/', (_, t) => {
    const talalat = szovegek.filter((s) => t.minta.test(s));
    expect(talalat, `${t.miert}\n${talalat.join('\n')}`).toEqual([]);
  });

  it('minden forintösszeg a configból való', () => {
    const csomagok = Object.values(szamlafolyo.csomagok);
    const szabad = new Set([
      ...csomagok.map((c) => ft(c.arHavi)),
      ...csomagok.map((c) => ft(c.extraFt)),
      ft(szamlafolyo.tulhasznalat.alapPlafonFt),
    ]);
    for (const s of szovegek) {
      for (const m of s.matchAll(/\d[\d ]*(?= Ft)/g)) {
        expect(szabad.has(`${m[0]} Ft`), `Nem a configból való összeg: „${m[0]} Ft" – ${s}`).toBe(true);
      }
    }
  });

  it('a könyvelőprogram-exportot csak kimért programra hirdetjük', () => {
    // Ha egy program kimérése visszavonódik, a hirdetés nem ígérheti tovább.
    const hirdetett = { rlb: /RLB/, novitax: /Novitax/, kulcs: /Kulcs/ } as const;
    for (const [program, minta] of Object.entries(hirdetett)) {
      if (szovegek.some((s) => minta.test(s))) {
        expect(KIMERVE[program as keyof typeof KIMERVE], `${program}: nincs kimérve, mégis hirdetjük`).toBe(true);
      }
    }
  });

  it('a próba és a csomagok számai a configot követik', () => {
    const osszes = szovegek.join('\n');
    expect(osszes).toContain(`${szamlafolyo.proba.napok} nap`);
    expect(osszes).toContain(`${szamlafolyo.proba.dokumentumok} dokumentum`);
    expect(osszes).toContain(`${szamlafolyo.proba.felhasznalok} felhasználó`);
  });
});

describe('céloldalak és horgonyok léteznek', () => {
  const app = readFileSync(`${ITT}../../src/App.tsx`, 'utf8');
  const nyitolap = readFileSync(`${ITT}../../src/oldalak/Nyitolap.tsx`, 'utf8');
  const konyveloknek = readFileSync(`${ITT}../../src/oldalak/Konyveloknek.tsx`, 'utf8');

  const celok = [
    ...META.map((u) => `https://szamlafolyo.hu${u.celoldal}`),
    ...GOOGLE_KERESES.map((c) => c.celoldal),
    ...GOOGLE_WEBHELYLINKEK.map((w) => w.cel),
    GOOGLE_PMAX.celoldal,
  ];

  it.each([...new Set(celok)])('%s', (cel) => {
    const url = new URL(cel);
    if (url.pathname !== '/') expect(app, `Nincs ilyen útvonal: ${url.pathname}`).toContain(`path="${url.pathname}"`);
    if (url.hash !== '') {
      const lap = url.pathname === '/konyveloknek' ? konyveloknek : nyitolap;
      expect(lap, `Nincs ilyen horgony: ${url.hash}`).toContain(`id="${url.hash.slice(1)}"`);
    }
  });
});

describe('a gyártott fájlok naprakészek', () => {
  // Aki a szövegen változtat, de nem gyárt újra, annál a feltöltött anyag
  // és a repó szövege szétcsúszik. Újragyártás: npx vite-node marketing/hirdetes/keszit.ts
  it.each([
    ['SZOVEGEK.md', szovegMd],
    ['google/kereses-hirdetesek.csv', keresesHirdetesekCsv],
    ['google/kulcsszavak.csv', kulcsszavakCsv],
  ] as const)('%s', (fajl, gyart) => {
    expect(readFileSync(`${ITT}${fajl}`, 'utf8'), `${fajl} elavult – gyártsd újra.`).toBe(gyart());
  });

  it('minden kép megvan', () => {
    const hianyzik: string[] = [];
    for (const u of META) {
      for (const m of META_MERETEK) if (!existsSync(`${ITT}kep/meta/${u.id}_${m.id}.png`)) hianyzik.push(`meta/${u.id}_${m.id}`);
    }
    for (const id of GOOGLE_KEP_UZENETEK) {
      expect(META.some((u) => u.id === id), `Ismeretlen üzenet: ${id}`).toBe(true);
      for (const m of GOOGLE_MERETEK) if (!existsSync(`${ITT}kep/google/${id}_${m.id}.png`)) hianyzik.push(`google/${id}_${m.id}`);
    }
    for (const logo of ['logo_1x1', 'logo_4x1']) if (!existsSync(`${ITT}kep/google/${logo}.png`)) hianyzik.push(`google/${logo}`);
    expect(hianyzik).toEqual([]);
  });
});

describe('a képek csak létező felületet mutatnak', () => {
  it('a validátor mondata szó szerint az alkalmazásé', () => {
    const validatorok = readFileSync(`${ITT}../../shared/uzleti/validatorok.ts`, 'utf8');
    expect(validatorok).toContain(`'${VALIDATOR_UZENET}'`);
  });

  it('a bizonylatlista sorai a nyitólap mintájával egyeznek', () => {
    const nyitolap = readFileSync(`${ITT}../../src/oldalak/Nyitolap.tsx`, 'utf8');
    for (const sor of BEERKEZO_SOROK) {
      expect(nyitolap, sor.fajl).toContain(`fajl: '${sor.fajl}'`);
      expect(nyitolap, sor.mit).toContain(`mit: '${sor.mit}'`);
    }
  });

  it('a mintakártyán csak a bruttó hibás: a kitalált adószám is átmegy a valódi ellenőrzésen', () => {
    const adoszam = MEZOK.find((m) => m.cimke === 'Szállító adószáma');
    expect(ervenyes(adoszam?.ertek ?? '')).toBe(true);
    expect(MEZOK.filter((m) => m.gyanus).map((m) => m.cimke)).toEqual(['Bruttó']);
  });
});
