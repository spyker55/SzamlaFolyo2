import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { KIMERVE, PROGRAM_NEVEK, PROGRAMOK } from '@uzleti/export/konyvelo/beallitas.ts';
import { Nyitolap } from './Nyitolap.tsx';
import { szolgaltato } from './jogi/adatok.ts';

/**
 * A nyitólap 2026-10-09-i átírásának őre: **a renderelt lapon** mér, nem a
 * forráson. Egy forrásra mért `toContain` átmegy akkor is, ha a mondat egy
 * kommentben vagy egy soha meg nem jelenő ágban áll (ez a hibaosztály egyszer
 * már megfogott minket: `jogiSzovegek.test.ts`, Adatkezelés 3. pont).
 *
 * A három kérés, és amit mindegyikből mérni lehet:
 * 1. **kézzelfogható haszon** – a kimért könyvelőprogramok és az „Excel-táblázat"
 *    már a heróban állnak;
 * 2. **bizalom** – az első képernyőn ott az EU-s tárolás és a név, lent a
 *    „Ki csinálja?", és a név ugyanaz, mint az Impresszumban;
 * 3. **fenntartás lejjebb, nem ki** – a felső szakaszokban nincs „alapbeállítás"
 *   és „nem szűr", a lapon viszont mindkettő megvan, és az Unión kívüli
 *   kiolvasás is.
 */

const html = renderToStaticMarkup(
  <MemoryRouter initialEntries={['/']}>
    <Nyitolap />
  </MemoryRouter>,
);

/** Csak a látható szöveg, címkék nélkül, egy szóközre tömörítve. */
function szoveg(darab: string): string {
  return darab
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** A lap egy darabja két horgony között (a `id="…"` attribútum helyén vágva). */
function szakasz(tol: string | null, ig: string | null): string {
  const eleje = tol === null ? 0 : html.indexOf(`id="${tol}"`);
  const vege = ig === null ? html.length : html.indexOf(`id="${ig}"`);
  expect(eleje, `Nincs ilyen horgony a lapon: ${tol}`).toBeGreaterThanOrEqual(0);
  expect(vege, `Nincs ilyen horgony a lapon: ${ig}`).toBeGreaterThan(eleje);
  return szoveg(html.slice(eleje, vege));
}

const egesz = szoveg(html);
/** A hero és a formátumsáv: minden, ami a „Hogyan működik?" előtt áll. */
const hero = szakasz(null, 'folyamat');
/** A „lelkes" rész: a hero, a folyamat és a bizonylatfajták – az Előnyökig. */
const felso = szakasz(null, 'elonyok');
const kimertek = PROGRAMOK.filter((p) => KIMERVE[p]).map((p) => PROGRAM_NEVEK[p]);
const tulajdonos = szolgaltato.nev.replace(/ egyéni vállalkozó$/, '');

describe('a nyitólap: haszon, bizalom, fenntartások (2026-10-09)', () => {
  it('egyáltalán renderelt (anti-vakság)', () => {
    expect(egesz.length).toBeGreaterThan(5000);
    expect(hero.length).toBeGreaterThan(500);
    expect(kimertek.length).toBeGreaterThan(0);
  });

  it('1. a heróban ott a kézzelfogható haszon: Excel-táblázat és minden kimért program', () => {
    expect(hero).toContain('Excel-táblázat (XLSX) a könyvelődnek');
    for (const nev of kimertek) {
      expect(hero, `${nev} kimérve, de a hero nem nevezi meg.`).toContain(nev);
    }
  });

  it('1. nem kimért programot a lap nem nevez meg', () => {
    for (const p of PROGRAMOK.filter((p) => !KIMERVE[p])) {
      expect(egesz, `${PROGRAM_NEVEK[p]} nincs kimérve, mégis a nyitólapon áll.`).not.toContain(PROGRAM_NEVEK[p]);
    }
  });

  it('2. az első képernyőn ott az EU-s tárolás és a név, a lapon a „Ki csinálja?"', () => {
    expect(hero).toContain('Adattárolás az EU-ban');
    expect(hero).toContain(tulajdonos);
    expect(html).toContain('href="#ki-csinalja"');
    expect(szakasz('ki-csinalja', 'arak')).toContain(tulajdonos);
  });

  it('2. a „Ki csinálja?" címe maga a felcím, nagy cím nélkül (a tulajdonos kérésére)', () => {
    const ki = html.slice(html.indexOf('id="ki-csinalja"'), html.indexOf('id="arak"'));
    expect(ki).toMatch(/<h2[^>]*>Ki csinálja\?<\/h2>/);
    expect(ki.match(/<h2/g)?.length, 'A „Ki csinálja?" szakaszba visszakerült egy nagy cím.').toBe(1);
  });

  it('2. a név az Impresszuméval egyezik, a jogi forma nélkül', () => {
    expect(szolgaltato.nev.startsWith(`${tulajdonos} `)).toBe(true);
    expect(tulajdonos).not.toContain('vállalkozó');
  });

  it('2. a tárolásról nem lesz „az adat az EU-ban marad"', () => {
    expect(egesz).not.toMatch(/EU-ban marad|Unióban marad|végig az Unió|nem hagyja el az (EU|Uniót)/i);
  });

  it('3. a felső szakaszokban nincs fenntartás', () => {
    expect(felso, 'A felső részbe visszakerült az „alapbeállítás” – a „Jó tudni”-ban a helye.').not.toMatch(/alapbeállítás/i);
    expect(felso, 'A felső részbe visszakerült a „nem szűr” – a „Jó tudni”-ban a helye.').not.toMatch(/nem szűr/i);
  });

  it('3. a fenntartások lejjebb kerültek, de a lapon maradtak', () => {
    const joTudni = szakasz('jo-tudni', null);
    expect(joTudni).toContain('Alapbeállítás szerint te: az exportba csak az általad jóváhagyott bizonylatok kerülnek');
    expect(joTudni).toContain('Az automatikus jóváhagyás külön bekapcsolható');
    expect(joTudni).toContain('nem szűrnek ki minden hibát');
    expect(joTudni).toContain('Unión kívüli adatfeldolgozással jár');
  });

  it('9. pont: a lap sehol nem ígér feltétlen emberi jóváhagyást', () => {
    expect(egesz).not.toMatch(/minden bizonylatot te hagysz jóvá/i);
  });
});
