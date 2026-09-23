import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createHash } from 'node:crypto';
import type { ReactElement } from 'react';
import { Aszf } from './Aszf.tsx';
import { Adatkezeles } from './Adatkezeles.tsx';
import { Impresszum } from './Impresszum.tsx';

/**
 * A jogi szövegek pontosan úgy, ahogy a látogató látja — archiváláshoz.
 *
 * # Miért kell
 *
 * A `terms_acceptances` azt rögzíti, hogy ki, mikor és **melyik változatot**
 * fogadta el. A változat azonosítója viszont csak egy dátum; önmagában nem
 * mondja meg, *mi állt* abban a szövegben. A mindenkori weboldal ezt nem
 * pótolja: az mindig a mai szöveget mutatja, nem azt, amit egy ügyfél két éve
 * elfogadott. (A 2026-09-23-i jogi felülvizsgálat 5. pontja.)
 *
 * Ezért minden kiadott változat **teljes, renderelt szövege** a repóba kerül
 * (`jogi-archivum/<verzió>/`), és a `legal_versions` sora a fájlok SHA-256
 * lenyomatát is tartja. A lánc: adatbázis-sor → lenyomat → gitben őrzött,
 * időbélyeggel ellátott fájl → a fájl szövege.
 *
 * # Miért a renderelt szöveg, és miért nem a forrás
 *
 * Mert a forrás nem a szöveg: az árak, a határidők és a csomagnevek a
 * configból jönnek (`config/szamlafolyo.ts`). Egy árváltás a `Aszf.tsx`
 * érintése nélkül is új ÁSZF-et csinál — és ezt a renderelt kimenet mutatja
 * meg, a forrás nem.
 *
 * ⚠️ Node alatt fut (archiváló eszköz és teszt), a böngészőcsomagba **nem**
 * kerül: semmi nem importálja a `src/` alól.
 */

export const DOKUMENTUMOK = ['aszf', 'adatkezeles', 'impresszum'] as const;

export type Dokumentum = (typeof DOKUMENTUMOK)[number];

const OLDALAK: Record<Dokumentum, () => ReactElement> = {
  aszf: () => <Aszf />,
  adatkezeles: () => <Adatkezeles />,
  impresszum: () => <Impresszum />,
};

/** Egy dokumentum renderelt HTML-je, egy záró sortöréssel. */
export function renderel(dok: Dokumentum): string {
  const oldal = OLDALAK[dok];

  return (
    renderToStaticMarkup(<MemoryRouter initialEntries={[`/${dok}`]}>{oldal()}</MemoryRouter>) +
    '\n'
  );
}

export function lenyomat(szoveg: string): string {
  return createHash('sha256').update(szoveg, 'utf8').digest('hex');
}
