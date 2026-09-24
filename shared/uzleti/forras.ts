/**
 * „Honnan hallottál rólunk?" – a válaszok zárt listája.
 *
 * # Miért zárt lista, és miért nincs „egyéb, írd be"
 *
 * A szabad szövegbe az kerül, amit a felhasználó beír: „Kovács Péter
 * könyvelő ajánlotta" – vagyis **egy harmadik személy adata**, akiről a
 * tájékoztató semmit nem mond, és akinek nem is tudnánk szólni. A zárt listán
 * ilyen nem jöhet be, és összesíteni is csak listát lehet.
 *
 * # Hol él még a lista
 *
 * A `companies.heard_from` ellenőrző kényszere ugyanezeket a kódokat sorolja
 * (`20260924000100_honnan_hallottal.sql`) – az adatbázis nem tud TS-t olvasni.
 * A `forras.test.ts` méri, hogy a kettő együtt mozog.
 *
 * A **sorrend** a felületé: a könyvelő áll elöl, mert a marketing első
 * csatornája az (`DONTESTORTENET.md`, 2026-09-24).
 */
export const FORRASOK = [
  { kod: 'konyvelo', cimke: 'A könyvelőm ajánlotta' },
  { kod: 'ismeros', cimke: 'Ismerős vagy kolléga ajánlotta' },
  { kod: 'google_kereses', cimke: 'Google-keresés' },
  { kod: 'hirdetes', cimke: 'Online hirdetés' },
  { kod: 'facebook', cimke: 'Facebook' },
  { kod: 'reddit', cimke: 'Reddit' },
  { kod: 'szakmai', cimke: 'Szakmai cikk, portál vagy rendezvény' },
  { kod: 'egyeb', cimke: 'Máshonnan' },
] as const;

export type ForrasKod = (typeof FORRASOK)[number]['kod'];

export function forrasKod(ertek: string): ForrasKod | null {
  return FORRASOK.find((f) => f.kod === ertek)?.kod ?? null;
}
