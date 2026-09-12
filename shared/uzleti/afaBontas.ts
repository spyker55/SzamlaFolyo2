import { ertelmez } from './osszeg.ts';

/**
 * A bontás számtana.
 *
 * Három hívója van — a kiolvasó, az ellenőrző képernyő és az export —, és
 * pontosan azért egy modul, hogy a három ne számolhasson másképp. Ha külön
 * számolnának, a könyvelő más számot látna az Excelben, mint a képernyőn.
 *
 * **A soronkénti bruttót nem tároljuk.** Az EN 16931 sem tárol mást, mint
 * adóalapot és adóösszeget; a származtatott érték idővel elcsúszik.
 */

/** A magyar törvényes kulcsok. Minden más (külföldi 19%, 21%) az „egyéb" vödörbe megy. */
export const KULCSOK = [27, 18, 5] as const;

/** Az export oszlopai, ebben a sorrendben. A nulla kulcsnak **nincs** ÁFA-oszlopa. */
export const OSZLOPOK = [
  'netto_27',
  'afa_27',
  'netto_18',
  'afa_18',
  'netto_5',
  'afa_5',
  'netto_0',
  'netto_egyeb',
  'afa_egyeb',
] as const;

export type Oszlop = (typeof OSZLOPOK)[number];

export type BontasSor = {
  kulcs?: unknown;
  kategoria?: unknown;
  netto?: unknown;
  afa?: unknown;
};

export type MegjelenitendoSor = {
  kulcs: string;
  kategoria: string | null;
  netto: string | null;
  afa: string | null;
  brutto: string | null;
};

/** Megjelenítési sorok az ellenőrző képernyőnek. */
export function sorok(bontas: readonly BontasSor[] | null | undefined): MegjelenitendoSor[] {
  if (!Array.isArray(bontas)) {
    return [];
  }

  const eredmeny: MegjelenitendoSor[] = [];

  for (const sor of bontas) {
    if (sor === null || typeof sor !== 'object') {
      continue;
    }

    const netto = szoveg(sor.netto);
    const afa = szoveg(sor.afa);

    eredmeny.push({
      kulcs: kulcsKiiras(sor.kulcs),
      kategoria: typeof sor.kategoria === 'string' ? sor.kategoria : null,
      netto,
      afa,
      brutto: brutto(netto, afa),
    });
  }

  return eredmeny;
}

/**
 * Az ÁFA-kulcs számmá. A „27%", a „27,0" és a 27 is 27.
 *
 * Ugyanez az értelmező szolgálja ki a modellt és az embert: a papírról gépelő
 * ember ugyanúgy odaírja a százalékjelet, mint a modell. Amit nem értünk, az
 * `null` — **nem nulla.** A nulla kulcs értelmes állítás.
 */
export function kulcsErtelmez(ertek: unknown): number | null {
  if (typeof ertek === 'number') {
    return Number.isFinite(ertek) ? ertek : null;
  }

  if (typeof ertek !== 'string') {
    return null;
  }

  const tiszta = ertek.trim().replace(/ /g, '').replace(/%/g, '').replace(/,/g, '.');

  if (tiszta === '' || !/^[+-]?\d*\.?\d+$/.test(tiszta)) {
    return null;
  }

  const szam = Number(tiszta);
  return Number.isFinite(szam) ? szam : null;
}

/**
 * A sor bruttója: adóalap + adóösszeg. ÁFA nélkül a nettó önmaga a bruttó
 * (fordított adózás, mentesség) — **adóalap nélkül viszont nincs mit kiírni**,
 * mert a puszta ÁFA-összeg nem sor.
 */
export function brutto(netto: unknown, afa: unknown): string | null {
  const alap = szam(netto);

  if (alap === null) {
    return null;
  }

  return kerekit2(alap + (szam(afa) ?? 0));
}

/**
 * Kulcsonkénti összegzés az exporthoz.
 *
 * **Kulcsonként** ad össze, nem soronként: emberi szerkesztés után ugyanaz a
 * kulcs több sorban is szerepelhet, és két 27%-os sor összege továbbra is
 * egyetlen 27%-os adóalap.
 *
 * Amihez nincs sor, az `null` marad — nem nulla. A nulla azt állítaná, hogy
 * volt ilyen kulcs, és éppen semmi nem esett rá.
 */
export function vodrok(bontas: readonly BontasSor[] | null | undefined): Record<Oszlop, number | null> {
  const eredmeny = Object.fromEntries(OSZLOPOK.map((o) => [o, null])) as Record<
    Oszlop,
    number | null
  >;

  if (!Array.isArray(bontas)) {
    return eredmeny;
  }

  for (const sor of bontas) {
    if (sor === null || typeof sor !== 'object') {
      continue;
    }

    const netto = szam(sor.netto);
    const afa = szam(sor.afa);

    if (netto === null && afa === null) {
      continue;
    }

    const v = vodor(kulcsErtelmez(sor.kulcs), afa);

    const nettoOszlop = `netto_${v}` as Oszlop;
    eredmeny[nettoOszlop] = (eredmeny[nettoOszlop] ?? 0) + (netto ?? 0);

    // A nulla vödörnek nincs ÁFA-oszlopa, és nem is kerülhet ide olyan sor,
    // amin van adó — a `vodor()` az ilyet már átirányította.
    if (v !== '0') {
      const afaOszlop = `afa_${v}` as Oszlop;
      eredmeny[afaOszlop] = (eredmeny[afaOszlop] ?? 0) + (afa ?? 0);
    }
  }

  // A lebegőpontos összeadás sodródását itt egyszer visszavágjuk.
  for (const oszlop of OSZLOPOK) {
    const ertek = eredmeny[oszlop];
    eredmeny[oszlop] = ertek === null ? null : Number(kerekit2(ertek));
  }

  return eredmeny;
}

/**
 * Melyik vödörbe tartozik a sor.
 *
 * ⚠️ **A nulla kulcson talált ÁFA az „egyéb"-be megy, egészében.** Nullától nem
 * keletkezik adó; ha mégis van a soron, akkor vagy a kulcs rossz, vagy az
 * összeg — nem tudjuk, melyik, de a nulla oszlopban egyik sem fér el, és pénzt
 * csendben elnyelni nem szabad. Ez a szabály könnyen visszafejlődik, ezért van
 * rá külön teszt.
 */
export function vodor(kulcs: number | null, afa: number | null): string {
  if (kulcs === null) {
    return 'egyeb';
  }

  for (const ismert of KULCSOK) {
    if (Math.abs(kulcs - ismert) < 0.001) {
      return String(ismert);
    }
  }

  if (Math.abs(kulcs) < 0.001) {
    // A tárolási pontosság két tizedes, ezért ami ez alatt van, az nulla.
    return afa !== null && Math.abs(afa) >= 0.005 ? 'egyeb' : '0';
  }

  return 'egyeb';
}

// ---------------------------------------------------------------------------
// Belső segédek
// ---------------------------------------------------------------------------

/** A kulcs kijelzési alakja: 27, nem 27,00 — de 7,5 marad 7,5. */
function kulcsKiiras(ertek: unknown): string {
  const szamErtek = kulcsErtelmez(ertek);

  if (szamErtek === null) {
    return '—';
  }

  if (szamErtek === Math.floor(szamErtek)) {
    return String(Math.trunc(szamErtek));
  }

  return kerekit2(szamErtek).replace('.', ',').replace(/0+$/, '');
}

/** Összeg számmá; amit nem értünk, az `null` — nem nulla. */
function szam(ertek: unknown): number | null {
  if (ertek === null || ertek === undefined || ertek === '') {
    return null;
  }

  if (typeof ertek === 'number') {
    return Number.isFinite(ertek) ? ertek : null;
  }

  if (typeof ertek !== 'string') {
    return null;
  }

  const eredmeny = ertelmez(ertek);

  return eredmeny.ok && eredmeny.ertek !== null ? Number(eredmeny.ertek) : null;
}

function szoveg(ertek: unknown): string | null {
  if (ertek === null || ertek === undefined || ertek === '') {
    return null;
  }
  return String(ertek);
}

/** Két tizedes, a nullától elfelé kerekítve — ugyanazon a sztringes úton, mint az `Osszeg`. */
function kerekit2(n: number): string {
  return ertelmez(n).ertek ?? '0.00';
}
