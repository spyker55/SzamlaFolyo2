import { ertelmez } from '../osszeg.ts';
import { nap } from '../ido.ts';
import { vodrok, type BontasSor } from '../afaBontas.ts';
import { szamviteli, tipusCimke, type DokumentumTipus } from '../enumok.ts';

/**
 * Az export egyetlen igazsága: mi a fejléc, és mi kerül a cellába.
 *
 * Mindhárom formátum (xlsx, csv, json) **ugyanezt** olvassa. Ha külön
 * számolnának, előfordulhatna, hogy a könyvelő más számot lát az Excelben, mint
 * a JSON-ban — és a kettő közül nem tudná, melyik a valóság.
 */

/** kulcs → magyar fejléc. A kulcs egyben a JSON mezőneve is. */
export const FEJLECEK = {
  tipus: 'Típus',
  szallito: 'Szállító',
  szallito_adoszam: 'Szállító adószáma',
  vevo: 'Vevő',
  vevo_adoszam: 'Vevő adószáma',
  bizonylatszam: 'Bizonylatszám',
  kelt: 'Kelt',
  teljesites: 'Teljesítés',
  fizetesi_hatarido: 'Fizetési határidő',
  netto: 'Nettó',
  afa: 'ÁFA',
  brutto: 'Bruttó',
  fizetendo: 'Fizetendő',
  netto_27: 'Nettó 27',
  afa_27: 'ÁFA 27',
  netto_18: 'Nettó 18',
  afa_18: 'ÁFA 18',
  netto_5: 'Nettó 5',
  afa_5: 'ÁFA 5',
  netto_0: 'Nettó 0',
  netto_egyeb: 'Nettó egyéb',
  afa_egyeb: 'ÁFA egyéb',
  penznem: 'Pénznem',
  fizetesi_mod: 'Fizetési mód',
  konyvelendo: 'Könyvelendő',
  megjegyzes: 'Megjegyzés',
  beerkezes: 'Beérkezés',
  forras: 'Forrás',
  // ⚠️ Új oszlop, és **szándékosan a lista végén**: a meglévő oszlopok
  // sorrendje nem mozdulhat, mert a könyvelő Excel-sablonja arra épül.
  //
  // A fájl és a bizonylat szétválása óta egy köteg harmadik számlája semmiben
  // nem különböztethető meg a sorban. Az oldaltartomány teszi visszakereshetővé
  // — egész fájlnál üres marad, mert ott nincs mit mondani.
  oldalak: 'Oldalak',
} as const;

export type Kulcs = keyof typeof FEJLECEK;

/** A kulcsok a fejlécek sorrendjében. Minden író ezen megy végig. */
export const KULCSOK = Object.keys(FEJLECEK) as Kulcs[];

/**
 * Melyik oszlop szám — ezeket az xlsx számként, a csv tizedesvesszővel írja.
 *
 * A kulcsonkénti oszlopok is ide tartoznak: **az az egész értelmük**, hogy a
 * könyvelő össze tudja adni őket az Excelben.
 */
export const SZAM_OSZLOPOK: readonly Kulcs[] = [
  'netto',
  'afa',
  'brutto',
  'fizetendo',
  'netto_27',
  'afa_27',
  'netto_18',
  'afa_18',
  'netto_5',
  'afa_5',
  'netto_0',
  'netto_egyeb',
  'afa_egyeb',
];

/** A bizonylat azon mezői, amikből az export sora összeáll. */
export type ExportBizonylat = {
  doc_type?: string | null;
  supplier_name?: string | null;
  supplier_tax_number?: string | null;
  customer_name?: string | null;
  customer_tax_number?: string | null;
  doc_number?: string | null;
  issue_date?: string | null;
  fulfillment_date?: string | null;
  due_date?: string | null;
  payment_method?: string | null;
  currency?: string | null;
  net_amount?: unknown;
  vat_amount?: unknown;
  gross_amount?: unknown;
  fizetendo?: unknown;
  afa_bontas?: unknown;
  note?: string | null;
  created_at?: string | null;
  oldal_tol?: number | null;
  oldal_ig?: number | null;
  /** A `files.source` — a bizonylat nem hordozza, a fájlja igen. */
  forras?: string | null;
};

export type ExportCella = string | number | null;

/**
 * Egy bizonylat exportsora.
 *
 * A visszaadott objektum az `afa_bontas` kulcson a bontás **beágyazott** alakját
 * is viszi. Az nincs benne a `FEJLECEK`-ben, tehát a csv és az xlsx nem látja —
 * egyedül a JSON írja ki.
 */
export function sor(d: ExportBizonylat): Record<string, ExportCella | unknown> {
  const tipus = d.doc_type ?? null;

  // A kulcsonkénti oszlopok a bontásból számolódnak, nem külön tárolt adatból:
  // így nem tudnak elcsúszni attól, amit az Ellenőrzés képernyő mutat.
  const vodor = vodrok(bontasa(d.afa_bontas));

  return {
    ...vodor,
    tipus: tipus === null ? null : tipusCimke(tipus),
    szallito: uresNull(d.supplier_name),
    szallito_adoszam: uresNull(d.supplier_tax_number),
    vevo: uresNull(d.customer_name),
    vevo_adoszam: uresNull(d.customer_tax_number),
    bizonylatszam: uresNull(d.doc_number),
    kelt: datumNap(d.issue_date),
    teljesites: datumNap(d.fulfillment_date),
    fizetesi_hatarido: datumNap(d.due_date),
    netto: szam(d.net_amount),
    afa: szam(d.vat_amount),
    brutto: szam(d.gross_amount),
    fizetendo: szam(d.fizetendo),
    penznem: uresNull(d.currency),
    fizetesi_mod: uresNull(d.payment_method),
    // A díjbekérő és a rá kiállított számla együtt kétszer vinné be ugyanazt a
    // költséget, ezért az összesítés csak a számviteli bizonylatokra megy — ez
    // az oszlop pedig ugyanarra a kérdésre felel, hogy az Excelben rászűrve
    // ugyanaz jöjjön ki.
    konyvelendo: konyvelendoE(tipus) ? 'igen' : 'nem',
    megjegyzes: uresNull(d.note),
    beerkezes: nap(d.created_at),
    forras: d.forras === 'email' ? 'e-mail' : 'feltöltés',
    oldalak: oldalak(d.oldal_tol ?? null, d.oldal_ig ?? null),
    afa_bontas: bontasa(d.afa_bontas),
  };
}

export type Osszesitesek = Record<
  string,
  { netto: number; afa: number; brutto: number; darab: number }
>;

/**
 * Pénznemenkénti összesítés a **könyvelendő** sorokra.
 *
 * ⚠️ Pénznemek soha nem adódnak össze — egy 100 EUR és egy 100 HUF nem
 * 200 semmi.
 */
export function osszesites(bizonylatok: readonly ExportBizonylat[]): Osszesitesek {
  const ki: Osszesitesek = {};

  for (const d of bizonylatok) {
    if (!konyvelendoE(d.doc_type ?? null)) {
      continue;
    }

    const penznem = d.currency === null || d.currency === undefined || d.currency === ''
      ? '—'
      : d.currency;

    const eddig = ki[penznem] ?? { netto: 0, afa: 0, brutto: 0, darab: 0 };

    ki[penznem] = {
      netto: eddig.netto + (szam(d.net_amount) ?? 0),
      afa: eddig.afa + (szam(d.vat_amount) ?? 0),
      brutto: eddig.brutto + (szam(d.gross_amount) ?? 0),
      darab: eddig.darab + 1,
    };
  }

  // A lebegőpontos összeadás sodródását itt egyszer visszavágjuk, ugyanazon a
  // sztringes úton, mint mindenhol máshol.
  for (const penznem of Object.keys(ki)) {
    const ertekek = ki[penznem];
    if (ertekek === undefined) continue;

    ki[penznem] = {
      netto: kerekit(ertekek.netto),
      afa: kerekit(ertekek.afa),
      brutto: kerekit(ertekek.brutto),
      darab: ertekek.darab,
    };
  }

  return ki;
}

// ---------------------------------------------------------------------------
// Belső segédek
// ---------------------------------------------------------------------------

/**
 * Könyvelendő-e, vagyis bekerül-e a könyvelésbe.
 *
 * A **díjbekérő nem**: a rá kiállított számla ugyanazt az összeget hozza, a
 * kettő együtt duplán vinné be a költséget.
 *
 * Típus nélkül szintén nem — a régi rendszer is így viselkedett. Ez nem
 * adatvesztés: a bizonylat benne van az exportban, csak az összesítésből marad
 * ki, és a képernyő külön kiírja, hány tételből hány a könyvelendő. Egy
 * ismeretlen típusú papírt beleszámolni csendes hazugság lenne.
 */
function konyvelendoE(tipus: string | null): boolean {
  if (tipus === null || tipus === '') {
    return false;
  }
  return szamviteli(tipus as DokumentumTipus);
}

/**
 * Az oldaltartomány kiírási alakja: `3–4`, vagy `2`, ha egy oldal.
 *
 * Exportálva is, a felületen is ugyanez — a Beérkező és az Ellenőrzés is ezt
 * hívja. Egy kötegből szétszedett bizonylatnál ez az egyetlen jel arról, hogy
 * a fájl melyik részéről van szó; két helyen kétféleképpen írva zavarba ejtő
 * lenne.
 */
export function oldalak(tol: number | null, ig: number | null): string | null {
  if (tol === null || ig === null) {
    return null;
  }
  return tol === ig ? String(tol) : `${tol}–${ig}`;
}

function bontasa(ertek: unknown): BontasSor[] | null {
  return Array.isArray(ertek) ? (ertek as BontasSor[]) : null;
}

/** A dátum ISO alakban. A tárolt `date` már az, a `timestamptz` nem. */
function datumNap(ertek: string | null | undefined): string | null {
  if (ertek === null || ertek === undefined || ertek === '') {
    return null;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(ertek) ? ertek.slice(0, 10) : nap(ertek);
}

function uresNull(ertek: string | null | undefined): string | null {
  return ertek === null || ertek === undefined || ertek === '' ? null : ertek;
}

/**
 * Összeg számmá.
 *
 * A PostgREST a `numeric` oszlopot hol számként, hol sztringként adja vissza —
 * a `shared/uzleti` értelmezője mindkettőt elviseli, és amit nem ért, arra
 * `null`-t ad, **nem nullát**.
 */
function szam(ertek: unknown): number | null {
  if (ertek === null || ertek === undefined || ertek === '') {
    return null;
  }

  if (typeof ertek !== 'number' && typeof ertek !== 'string') {
    return null;
  }

  const eredmeny = ertelmez(ertek);
  return eredmeny.ok && eredmeny.ertek !== null ? Number(eredmeny.ertek) : null;
}

function kerekit(n: number): number {
  return Number(ertelmez(n).ertek ?? '0.00');
}
