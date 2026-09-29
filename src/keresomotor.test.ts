import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A `public/robots.txt` és a `public/sitemap.xml` őre.
 *
 * A kettő kézzel írt lista, az útvonalak viszont az `App.tsx`-ben élnek. Ha
 * egy új nyilvános oldal nem kerül be a sitemapbe, a Google később találja
 * meg; ha egy új belső képernyő nem kerül a tiltólistára, a keresőben üres
 * belépőoldalként jelenhet meg. Ez az őr a kettőt együtt tartja.
 *
 * Élesben mérve (2026-09-29): a Vercel a `public/` fájljait a `vercel.json`
 * mindent `index.html`-re irányító szabálya **előtt** szolgálja ki (a
 * `/bemutato/…jpg` `image/jpeg`-ként jön), így a két fájl a helyén lesz.
 * Előtte a `/robots.txt` címen az `index.html` jött vissza.
 */
const GYOKER = new URL('..', import.meta.url).pathname;
const WEBOLDAL = 'https://szamlafolyo.hu';

const app = readFileSync(`${GYOKER}src/App.tsx`, 'utf8');
const robots = readFileSync(`${GYOKER}public/robots.txt`, 'utf8');
const sitemap = readFileSync(`${GYOKER}public/sitemap.xml`, 'utf8');

/** Az `App.tsx` összes útvonala, a `*` nélkül. */
const utvonalak = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '').filter((p) => p !== '*');

/** A `{/* Nyilvános *\/}` blokk útvonalai – a következő kommentblokkig. */
function nyilvanosak(): string[] {
  const eleje = app.indexOf('{/* Nyilvános */}');
  const vege = app.indexOf('{/*', eleje + 1);
  expect(eleje, 'Nincs „Nyilvános” blokk az App.tsx-ben').toBeGreaterThan(-1);
  return [...app.slice(eleje, vege).matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '');
}

const sitemapUtak = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1] ?? '').pathname);
const tiltott = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1] ?? '');

describe('sitemap.xml', () => {
  it('anti-vakság: látja az útvonalakat', () => {
    expect(utvonalak.length).toBeGreaterThan(10);
    expect(nyilvanosak().length).toBeGreaterThanOrEqual(5);
  });

  it('pontosan a nyilvános oldalakat sorolja fel', () => {
    expect([...sitemapUtak].sort()).toEqual([...nyilvanosak()].sort());
  });

  it('minden cím a saját domainünkre mutat', () => {
    for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) expect(m[1]?.startsWith(`${WEBOLDAL}/`)).toBe(true);
  });
});

describe('robots.txt', () => {
  it('a sitemapre mutat', () => {
    expect(robots).toMatch(new RegExp(`^Sitemap: ${WEBOLDAL}/sitemap\\.xml$`, 'm'));
  });

  it('nyilvános oldalt nem tilt', () => {
    for (const ut of nyilvanosak()) {
      // A robots.txt előtagot illeszt: a `Disallow: /export` az `/exportok`-at is tiltaná.
      const tiltja = tiltott.filter((t) => ut.startsWith(t));
      expect(tiltja, ut).toEqual([]);
    }
  });

  it('minden más útvonalat tilt', () => {
    const nyilvanos = new Set(nyilvanosak());
    for (const ut of utvonalak.filter((u) => !nyilvanos.has(u))) {
      // A paraméteres útvonal (`/meghivo/:token`) az előtagjával van tiltva.
      const cel = ut.includes('/:') ? ut.slice(0, ut.indexOf(':')) : ut;
      expect(tiltott, `A robots.txt nem tiltja: ${ut}`).toContain(cel);
    }
  });

  it('nincs olyan tiltás, amihez nem tartozik útvonal', () => {
    const elotagok = utvonalak.map((u) => (u.includes('/:') ? u.slice(0, u.indexOf(':')) : u));
    for (const t of tiltott) expect(elotagok, `Elavult tiltás: ${t}`).toContain(t);
  });
});

describe('Google Search Console', () => {
  // A tulajdon ellenőrzése ezzel a fájllal történt (2026-09-29). Ha kikerül,
  // a Google egy idő után visszavonja az ellenőrzést, és a Search Console
  // adatai elérhetetlenné válnak. Kódot a lapra nem tesz: a Google időnként
  // újra letölti a fájlt, a látogatókról semmit nem gyűjt.
  it('az ellenőrző fájl megvan, és a tartalma a Google által adott alak', () => {
    const fajlok = readdirSync(`${GYOKER}public`).filter((f) => /^google[0-9a-f]+\.html$/.test(f));
    expect(fajlok).toEqual(['google8c85458d0ccfd79f.html']);
    const tartalom = readFileSync(`${GYOKER}public/${fajlok[0]}`, 'utf8');
    expect(tartalom).toBe(`google-site-verification: ${fajlok[0]}`);
  });
});
