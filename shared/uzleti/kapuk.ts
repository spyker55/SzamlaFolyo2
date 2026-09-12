import { szamlafolyo } from '../../config/szamlafolyo.ts';
import type { Mezo } from './sema.ts';

/**
 * Az automatikus jóváhagyás kapui.
 *
 * A régi rendszerben **minden** dokumentum az Ellenőrzés képernyőre ment, és az
 * ember mindegyiket jóváhagyta. Az új verzióban csak az kerüljön elé, amivel
 * baj van — de az automatikus jóváhagyás **nem jelent láthatatlanságot**: az
 * így átment bizonylat jelvényt kap, mellette egy sorban az indok, és exportig
 * visszahívható javításra.
 *
 * Soha ne írjuk ki, hogy „ellenőrizve", ha senki nem nézte meg. A felület
 * mondja meg őszintén, mi történt.
 */

/** Ezek nélkül nincs mit könyvelni — hiányuk mindig emberhez visz. */
export const KULCSMEZOK: readonly Mezo[] = [
  'supplier_name',
  'doc_number',
  'issue_date',
  'gross_amount',
];

/**
 * Amit a cég saját előzményeiről tudunk. Mind **olcsó, magyarázható SQL**,
 * nulla AI — és pont ez az, amit a régi rendszer nem tudott.
 */
export type Elozmeny = {
  /** Látta-e már ez a cég ezt a szállítói adószámot jóváhagyott bizonylaton. */
  ismertSzallito: boolean;
  /** Volt-e már ugyanettől a szállítótól ilyen bizonylatszám. */
  bizonylatszamMarLatott: boolean;
  /** Erősen kilóg-e a végösszeg az ugyanettől a szállítótól látott nagyságrendből. */
  osszegKilog: boolean;
  /** Túl régi vagy jövőbeli-e a kelt az eddigiekhez képest. */
  keltKilog: boolean;
  /** Szokatlan-e a pénznem ennél a cégnél. */
  penznemSzokatlan: boolean;
  /** Hány bizonylatot hagyott már jóvá ez a cég (a bemelegítéshez). */
  cegEddigiBizonylatai: number;
};

export type KapuBemenet = {
  mezok: Record<string, string | null>;
  /** A `Konfidencia.osszevon()` `combined` ága. */
  konfidencia: Record<string, number>;
  /** A `Validatorok.bukottak()` eredménye. */
  bukottValidatorok: Record<string, string>;
  nehezenOlvashato: boolean;
  tobbIratGyanu: boolean;
  duplikatum: boolean;
  /** A cég kapcsolója. Kikapcsolva minden bizonylat emberhez megy. */
  autoJovahagyasBe: boolean;
  elozmeny: Elozmeny;
  /**
   * A mintavételhez: hányadik automatikusan jóváhagyható bizonylat ez a cégnél.
   * Minden huszadik **mégis** ember elé kerül.
   */
  mintaSorszam: number;
};

export type KapuDontes = {
  /** Igaz, ha minden kapu átment és a mintavétel sem szólt közbe. */
  automatikus: boolean;
  /**
   * Egy sor, ami a jelvény mellett olvasható. Automatikus jóváhagyásnál azt
   * mondja meg, mi alapján ment át; egyébként azt, mi buktatta el.
   */
  indok: string;
};

/**
 * A hét kapu. **Mindnek teljesülnie kell** az automatikus jóváhagyáshoz.
 *
 * A `d)` és a `g)` együtt fogja meg azt az esetet, amiért ez az egész van: a
 * kézzel írott számlát, amin hat kiolvasás **hat különböző, kitalált
 * szállítónevet** adott, miközben minden szám hatszor helyes volt. A nevekre
 * nincs és nem lehet determinisztikus ellenőrzésünk — de a „kézzel írott-e ez a
 * papír" ellenőrizhető tény, és az „láttuk-e már ezt a szállítót" is az.
 */
export function dontes(be: KapuBemenet): KapuDontes {
  if (!be.autoJovahagyasBe) {
    return { automatikus: false, indok: 'Az automatikus jóváhagyás ki van kapcsolva.' };
  }

  // A cég első N bizonylata **mindig** emberhez megy. Előzmény nélkül a
  // g) pont üresen jár, és a felhasználónak is látnia kell egyszer, mit csinál
  // a rendszer, mielőtt rábízza.
  if (be.elozmeny.cegEddigiBizonylatai < szamlafolyo.automatikusJovahagyas.bemelegitesDarab) {
    return {
      automatikus: false,
      indok: `Az első ${szamlafolyo.automatikusJovahagyas.bemelegitesDarab} bizonylatot mindig ember nézi át.`,
    };
  }

  // f) Duplikátum
  if (be.duplikatum) {
    return { automatikus: false, indok: 'Ez a fájl már bent van.' };
  }

  // a) Determinisztikus ellenőrzések
  const bukott = Object.values(be.bukottValidatorok);
  if (bukott.length > 0) {
    return { automatikus: false, indok: bukott[0]! };
  }

  // b) Minden kulcsmező megvan
  const hianyzo = KULCSMEZOK.filter((mezo) => {
    const ertek = be.mezok[mezo];
    return ertek === null || ertek === undefined || ertek === '';
  });
  if (hianyzo.length > 0) {
    return { automatikus: false, indok: 'Hiányzik egy kulcsmező a bizonylatról.' };
  }

  // c) Minden mező magabiztossága a küszöb fölött
  const bizonytalan = Object.entries(be.konfidencia).filter(
    ([, pont]) => pont <= szamlafolyo.kiolvasas.ellenorzesKuszob,
  );
  if (bizonytalan.length > 0) {
    return { automatikus: false, indok: 'Van mező, amiben a kiolvasás nem biztos.' };
  }

  // d) Kézírás, rossz minőség
  if (be.nehezenOlvashato) {
    return { automatikus: false, indok: 'Kézzel írott vagy nehezen olvasható bizonylat.' };
  }

  // e) Szétszedetlen köteg
  if (be.tobbIratGyanu) {
    return { automatikus: false, indok: 'Több bizonylat lehet a fájlban.' };
  }

  // g) Eltérés a cég előzményeitől
  const elteres = elozmenyKifogas(be.elozmeny);
  if (elteres !== null) {
    return { automatikus: false, indok: elteres };
  }

  // Mintavétel: minden huszadik egyébként átmenő bizonylat **mégis** ember elé
  // kerül. Két okból: így marad kalibrálva az ember, és **így mérhető az
  // automatikus jóváhagyás tévedési aránya** — enélkül csak reménykednénk.
  const minden = szamlafolyo.automatikusJovahagyas.mintavetelMinden;
  if (minden > 0 && be.mintaSorszam > 0 && be.mintaSorszam % minden === 0) {
    return { automatikus: false, indok: 'Mintavétel: minden huszadik bizonylatot átnézünk.' };
  }

  return {
    automatikus: true,
    indok: 'Minden ellenőrzés rendben, ismert szállító.',
  };
}

function elozmenyKifogas(e: Elozmeny): string | null {
  // Az **először látott szállító** mindig emberhez megy. Miután egyszer egy
  // ember jóváhagyta, a neve onnantól összevethető az előzménnyel — az
  // automatikus jóváhagyás így nem az első naptól működik teljes sebességgel,
  // hanem ahogy a cég története épül. Ez helyes: a bizalmat ki kell érdemelni.
  if (!e.ismertSzallito) {
    return 'Ettől a szállítótól még nem láttunk bizonylatot.';
  }

  if (e.bizonylatszamMarLatott) {
    return 'Ugyanettől a szállítótól már volt ilyen bizonylatszám.';
  }

  if (e.osszegKilog) {
    return 'A végösszeg eltér a szállítótól megszokottól.';
  }

  if (e.keltKilog) {
    return 'A kelt kilóg az eddigi bizonylatok időszakából.';
  }

  if (e.penznemSzokatlan) {
    return 'Szokatlan pénznem ennél a cégnél.';
  }

  return null;
}
