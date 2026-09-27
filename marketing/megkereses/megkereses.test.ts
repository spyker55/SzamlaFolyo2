import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szolgaltato } from '@/oldalak/jogi/adatok.ts';
import { KIMERVE } from '@uzleti/export/konyvelo/beallitas.ts';
import { ft, TILTOTT } from '../hirdetes/szovegek.ts';
import { hossz, linkedinHossz, szovegMd } from './kimenet.ts';
import { ALAIRO, FACEBOOK, FACEBOOK_AR_VALASZ, HELYORZOK, KONYVELO, KORLAT, NYILT_KOZLES } from './szovegek.ts';

/**
 * A megkeresési szövegek őre.
 *
 * Ugyanazt méri, mint a `hirdetes.test.ts`: ne ígérjen többet a terméknél, a
 * számok a configból jöjjenek, a linkek létező oldalra mutassanak. Ehhez jön,
 * ami a személyes megkeresésnél számít: a LinkedIn-jegyzet kiférjen, ne
 * maradjon kitöltetlen vagy ismeretlen helyőrző, a Facebook-bejegyzés
 * nyíltan mondja meg, ki írja, és a levélből ki lehessen szállni.
 */
const ITT = new URL('.', import.meta.url).pathname;

function mindenSzoveg(): string[] {
  const ki: string[] = [];
  const bejar = (x: unknown): void => {
    if (typeof x === 'string') ki.push(x);
    else if (Array.isArray(x)) x.forEach(bejar);
    else if (x !== null && typeof x === 'object') Object.values(x).forEach(bejar);
  };
  bejar([KONYVELO, FACEBOOK, FACEBOOK_AR_VALASZ]);
  return ki;
}

const szovegek = mindenSzoveg();
const osszes = szovegek.join('\n');

describe('hossz (mérve)', () => {
  it('a LinkedIn-jegyzet ingyenes fiókkal is kifér, hosszú névvel is', () => {
    expect(linkedinHossz(KONYVELO.linkedinJegyzet)).toBeLessThanOrEqual(KORLAT.linkedinJegyzet);
    // A személyes mondat nem fér bele – ha valaki beteszi, a mérés hazudna.
    expect(KONYVELO.linkedinJegyzet).not.toContain('[Személyes mondat]');
  });

  it('az e-mail tárgya mobilon sem csonkul', () => {
    expect(hossz(KONYVELO.email.targy)).toBeLessThanOrEqual(KORLAT.emailTargy);
  });
});

describe('tartalom: csak az, amit a termék ma tud', () => {
  it('egyáltalán látja a szövegeket (anti-vakság)', () => {
    expect(szovegek.length).toBeGreaterThan(30);
    expect(FACEBOOK.length).toBeGreaterThanOrEqual(4);
  });

  it.each(TILTOTT.map((t) => [t.minta.source, t] as const))('tiltott ígéret: /%s/', (_, t) => {
    const talalat = szovegek.filter((s) => t.minta.test(s));
    expect(talalat, `${t.miert}\n${talalat.join('\n')}`).toEqual([]);
  });

  it('minden forintösszeg a configból való', () => {
    const csomagok = Object.values(szamlafolyo.csomagok);
    const szabad = new Set([...csomagok.map((c) => ft(c.arHavi)), ...csomagok.map((c) => ft(c.extraFt))]);
    const talalt = [...osszes.matchAll(/\d[\d ]*(?= Ft)/g)].map((m) => `${m[0]} Ft`);
    expect(talalt.length, 'anti-vakság: vannak árak a szövegben').toBeGreaterThan(0);
    for (const osszeg of talalt) expect(szabad.has(osszeg), `Nem a configból való összeg: „${osszeg}"`).toBe(true);
  });

  it('a próba számai a configot követik', () => {
    const { napok, dokumentumok, felhasznalok } = szamlafolyo.proba;
    expect(osszes).toContain(`${napok} nap`);
    expect(osszes).toContain(`${dokumentumok} dokumentum`);
    expect(osszes).toContain(`${felhasznalok} felhasználó`);
  });

  it('a könyvelőprogram-exportot csak kimért programra ígérjük', () => {
    const hirdetett = { rlb: /RLB/, novitax: /Novitax/, kulcs: /Kulcs/ } as const;
    for (const [program, minta] of Object.entries(hirdetett)) {
      if (minta.test(osszes)) {
        expect(KIMERVE[program as keyof typeof KIMERVE], `${program}: nincs kimérve, mégis ígérjük`).toBe(true);
      }
    }
  });

  it('a bemutatóban említett lista a felületen is így hívják', () => {
    const beallitasok = readFileSync(`${ITT}../../src/kepernyok/Beallitasok.tsx`, 'utf8');
    expect(osszes).toContain('Legutóbbi levelek');
    expect(beallitasok).toContain('>Legutóbbi levelek<');
  });
});

describe('helyőrzők', () => {
  it('csak a zárt lista elemei fordulnak elő', () => {
    const talalt = [...osszes.matchAll(/\[[^\]\n]*\]/g)].map((m) => m[0]);
    const ismeretlen = talalt.filter((h) => !(HELYORZOK as readonly string[]).includes(h));
    expect(ismeretlen).toEqual([]);
  });

  it('a lista minden eleme használatban van (nem elavult)', () => {
    for (const h of HELYORZOK) expect(osszes, h).toContain(h);
  });

  it('a Facebook-bejegyzésekben és az árválaszban nincs helyőrző', () => {
    for (const s of [...FACEBOOK.map((b) => b.szoveg), FACEBOOK_AR_VALASZ]) expect(s).not.toMatch(/\[[^\]]*\]/);
  });
});

describe('nyíltság és kiszállás', () => {
  it.each(FACEBOOK.map((b) => [b.id, b] as const))('%s: nyíltan megmondja, ki írja, és egyetlen linket ad', (_, b) => {
    expect(b.szoveg.split(NYILT_KOZLES).length - 1).toBe(1);
    expect(b.szoveg.match(/https:\/\/szamlafolyo\.hu/g) ?? []).toHaveLength(1);
  });

  it('a levélből és az emlékeztetőből ki lehet szállni', () => {
    expect(KONYVELO.email.szoveg).toContain('nem keresem többet');
    expect(KONYVELO.emlekezteto).toContain('nem keresem többet');
  });

  it('az aláírás a jogi oldalak szolgáltatói adataiból jön', () => {
    expect(ALAIRO).not.toBe(szolgaltato.nev);
    expect(szolgaltato.nev.startsWith(ALAIRO)).toBe(true);
    expect(KONYVELO.email.szoveg).toContain(szolgaltato.email);
  });
});

describe('a linkek létező oldalra mutatnak', () => {
  const app = readFileSync(`${ITT}../../src/App.tsx`, 'utf8');
  const nyitolap = readFileSync(`${ITT}../../src/oldalak/Nyitolap.tsx`, 'utf8');
  const konyveloknek = readFileSync(`${ITT}../../src/oldalak/Konyveloknek.tsx`, 'utf8');
  const linkek = [...new Set([...osszes.matchAll(/https:\/\/szamlafolyo\.hu[^\s,)]*/g)].map((m) => m[0]))];

  it('anti-vakság: talál linket', () => {
    expect(linkek.length).toBeGreaterThanOrEqual(3);
  });

  it.each(linkek)('%s', (link) => {
    const url = new URL(link);
    if (url.pathname !== '/') expect(app, `Nincs ilyen útvonal: ${url.pathname}`).toContain(`path="${url.pathname}"`);
    if (url.hash !== '') {
      const lap = url.pathname === '/konyveloknek' ? konyveloknek : nyitolap;
      expect(lap, `Nincs ilyen horgony: ${url.hash}`).toContain(`id="${url.hash.slice(1)}"`);
    }
  });
});

describe('a gyártott fájl naprakész', () => {
  // Újragyártás: npx vite-node marketing/megkereses/keszit.ts
  it('SZOVEGEK.md', () => {
    expect(readFileSync(`${ITT}SZOVEGEK.md`, 'utf8'), 'SZOVEGEK.md elavult – gyártsd újra.').toBe(szovegMd());
  });
});
