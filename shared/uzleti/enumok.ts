/**
 * A rendszer értékkészletei.
 *
 * TypeScriptben union type + címke-map, nem `enum`: az adatbázisban `text` +
 * CHECK áll, a JSON-ban sztring utazik, tehát a nyers érték az igazság.
 *
 * Egy közös szabály mindegyikre: **a `cimkeje()` ismeretlen értéknél magát az
 * értéket adja vissza**, nem „Egyéb"-et. Egy ismeretlen kódot „Egyéb"-nek
 * mutatni néma félrecímkézés lenne — a felület mondja meg őszintén, mit nem ért.
 */

// ---------------------------------------------------------------------------
// Bizonylattípus
// ---------------------------------------------------------------------------

export const DOKUMENTUM_TIPUSOK = [
  'szamla',
  'elolegszamla',
  'helyesbito_szamla',
  'sztorno_szamla',
  'dijbekero',
  'nyugta',
  'szallitolevel',
  'egyeb',
] as const;

export type DokumentumTipus = (typeof DOKUMENTUM_TIPUSOK)[number];

const TIPUS_CIMKEK: Record<DokumentumTipus, string> = {
  szamla: 'Számla',
  elolegszamla: 'Előlegszámla',
  helyesbito_szamla: 'Helyesbítő számla',
  sztorno_szamla: 'Sztornó számla',
  dijbekero: 'Díjbekérő',
  nyugta: 'Nyugta',
  szallitolevel: 'Szállítólevél',
  egyeb: 'Egyéb',
};

/**
 * Számviteli bizonylat-e, vagyis bekerül-e a könyvelésbe.
 *
 * A **díjbekérő nem**: a rá kiállított számla ugyanazt az összeget hozza, a
 * kettő együtt duplán vinné be a költséget.
 */
export function szamviteli(tipus: DokumentumTipus): boolean {
  return (
    tipus === 'szamla' ||
    tipus === 'elolegszamla' ||
    tipus === 'helyesbito_szamla' ||
    tipus === 'sztorno_szamla' ||
    tipus === 'nyugta'
  );
}

// ---------------------------------------------------------------------------
// Dokumentumállapot
// ---------------------------------------------------------------------------

export const DOKUMENTUM_ALLAPOTOK = [
  'feltoltve',
  'feldolgozas_alatt',
  'ellenorzesre_var',
  'jovahagyva',
  'exportalva',
  'hiba',
  'duplikatum',
] as const;

export type DokumentumAllapot = (typeof DOKUMENTUM_ALLAPOTOK)[number];

const ALLAPOT_CIMKEK: Record<DokumentumAllapot, string> = {
  // „Sorban áll", nem „Feltöltve": a felhasználót az érdekli, mi történik
  // vele, nem az, hogy mi történt.
  feltoltve: 'Sorban áll',
  feldolgozas_alatt: 'Feldolgozás alatt',
  ellenorzesre_var: 'Ellenőrzésre vár',
  jovahagyva: 'Jóváhagyva',
  exportalva: 'Exportálva',
  hiba: 'Hiba',
  duplikatum: 'Duplikátum',
};

/** Amire ember kell. */
export const EMBERRE_VAR: readonly DokumentumAllapot[] = ['ellenorzesre_var', 'hiba'];

/** Ami a Beérkezőben látszik. */
export const BEERKEZO_ALLAPOTOK: readonly DokumentumAllapot[] = [
  'feltoltve',
  'feldolgozas_alatt',
  'ellenorzesre_var',
  'hiba',
  'duplikatum',
];

// ---------------------------------------------------------------------------
// ÁFA-kategória (EN 16931 / UNCL5305)
// ---------------------------------------------------------------------------

export const AFA_KATEGORIAK = ['S', 'AE', 'Z', 'E', 'K', 'G', 'O'] as const;

export type AfaKategoria = (typeof AFA_KATEGORIAK)[number];

const KATEGORIA_CIMKEK: Record<AfaKategoria, string> = {
  S: 'Normál',
  AE: 'Fordított adózás',
  Z: 'Nulla kulcsos',
  E: 'Mentes (AAM, TAM)',
  K: 'Közösségi értékesítés',
  G: 'Export',
  O: 'ÁFA hatályán kívül',
};

/** Nulla ÁFÁ-val járó kategória-e. A normálon kívül mindegyik az. */
export function nullaAfa(kategoria: AfaKategoria): boolean {
  return kategoria !== 'S';
}

// ---------------------------------------------------------------------------
// Szerepkör
// ---------------------------------------------------------------------------

export const SZEREPEK = ['tulajdonos', 'szerkeszto', 'megtekinto'] as const;

export type Szerep = (typeof SZEREPEK)[number];

const SZEREP_CIMKEK: Record<Szerep, string> = {
  tulajdonos: 'Tulajdonos',
  szerkeszto: 'Szerkesztő',
  megtekinto: 'Megtekintő',
};

/** Feltölt, javít, jóváhagy, exportál. */
export function szerkeszthet(szerep: Szerep): boolean {
  return szerep !== 'megtekinto';
}

/** Számlázás, tagok kezelése, végleges törlés. Csak a tulajdonos. */
export function adminisztralhat(szerep: Szerep): boolean {
  return szerep === 'tulajdonos';
}

// ---------------------------------------------------------------------------
// Címkék
// ---------------------------------------------------------------------------

function cimkezo<T extends string>(cimkek: Record<T, string>) {
  return (ertek: string | null | undefined): string => {
    if (ertek === null || ertek === undefined || ertek === '') {
      return '—';
    }
    // Ismeretlen érték esetén magát az értéket adjuk vissza: „Egyéb"-nek
    // mutatni néma félrecímkézés lenne.
    return cimkek[ertek as T] ?? ertek;
  };
}

export const tipusCimke = cimkezo(TIPUS_CIMKEK);
export const allapotCimke = cimkezo(ALLAPOT_CIMKEK);
export const kategoriaCimke = cimkezo(KATEGORIA_CIMKEK);
export const szerepCimke = cimkezo(SZEREP_CIMKEK);

/** Legördülő listákhoz: érték + címke, a definiálás sorrendjében. */
export function opciok<T extends string>(
  ertekek: readonly T[],
  cimke: (ertek: string) => string,
): { ertek: T; cimke: string }[] {
  return ertekek.map((ertek) => ({ ertek, cimke: cimke(ertek) }));
}
