import type { DokumentumTipus } from '../enumok.ts';

/**
 * Az e-számlákban használt ENSZ kódlisták fordítása a mi szótárainkra.
 *
 * Mindkét formátum (CII és UBL) ugyanezeket a kódlistákat használja, ezért egy
 * helyen állnak.
 */

/**
 * Bizonylattípus az UNCL1001 kódlistából.
 *
 * Amit nem ismerünk fel, arra **nem tippelünk**: a `null` azt jelenti, hogy az
 * ellenőrző képernyőn az embernek kell kiválasztania. Egy rossz típus rosszabb,
 * mint egy üres — a díjbekérő és a számla összekeverése **duplán viszi be
 * ugyanazt a költséget**.
 */
export function bizonylattipus(kod: string | null | undefined): DokumentumTipus | null {
  switch (kod) {
    case '380':
    case '389':
    case '393':
    case '575':
    case '623':
    case '780':
      return 'szamla';
    case '386':
      return 'elolegszamla';
    case '384':
    case '396':
      return 'helyesbito_szamla';
    case '381':
      return 'sztorno_szamla';
    case '325':
    case '326':
      return 'dijbekero';
    default:
      return null;
  }
}

/**
 * Fizetési mód az UNCL4461 kódlistából, magyarul.
 *
 * Ez **szabad szöveges mező** nálunk, ezért az ismeretlen kódot magát adjuk
 * vissza — így legalább látszik a bizonylaton szereplő érték.
 */
export function fizetesiMod(kod: string | null | undefined): string | null {
  if (kod === null || kod === undefined || kod === '') {
    return null;
  }

  switch (kod) {
    case '10':
      return 'készpénz';
    case '20':
      return 'csekk';
    case '30':
    case '31':
      return 'átutalás';
    case '42':
      return 'bankszámlára fizetés';
    case '48':
    case '54':
    case '55':
      return 'bankkártya';
    case '49':
      return 'csoportos beszedés';
    case '58':
      return 'SEPA átutalás';
    case '59':
      return 'SEPA csoportos beszedés';
    case '97':
      return 'kompenzáció';
    default:
      return kod;
  }
}
