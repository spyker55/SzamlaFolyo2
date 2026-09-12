import { szamlafolyo } from '../../config/szamlafolyo.ts';
import { MEZOK } from './sema.ts';

/**
 * A két jel összevonása egy számmá.
 *
 * Az irány **egyirányú: a determinisztikus validátor csak lefelé húzhat.** Ez
 * nem ízlés kérdése — két valódi számlán mérve egyik modell önbevallása sem
 * találta el a tényleges hibát: az egyik 0,5-öt adott egy jól kiolvasott
 * mezőre, a másik 0,95-öt a saját tévedésére.
 */

/** Bukott validátor ide húzza a mezőt — biztosan a piros sávba. */
export const BUKAS_PLAFON = 0.3;

/**
 * Amiknek **nincs független fogásuk.** A többinek van: ellenőrző számjegy,
 * `nettó + ÁFA = bruttó`, a bontás összege, dátumsorrend, kötött szótár.
 */
export const ELLENORIZHETETLEN_MEZOK = [
  'supplier_name',
  'customer_name',
  'doc_number',
  'payment_method',
] as const;

export type Sav = 'nincs_adat' | 'biztos' | 'bizonytalan' | 'gyanus';

export type Osszevont = {
  model: Record<string, number>;
  validators: Record<string, string>;
  combined: Record<string, number>;
};

export function osszevon(
  modellSzerint: Record<string, number>,
  bukottValidatorok: Record<string, string>,
  mezok: Record<string, unknown>,
  nehezenOlvashato = false,
): Osszevont {
  const eredmeny: Record<string, number> = {};

  for (const mezo of MEZOK) {
    const ertek = mezok[mezo] ?? null;

    // Az üres mezőnek nincs értelmes magabiztossága: nincs mit ellenőrizni
    // rajta, és nem is szabad pirosnak látszania.
    if (ertek === null || ertek === '') {
      continue;
    }

    // Amiről a modell nem nyilatkozott, azt nem tekintjük biztosnak.
    let pont = modellSzerint[mezo] ?? 0.5;

    if (bukottValidatorok[mezo] !== undefined) {
      pont = Math.min(pont, BUKAS_PLAFON);
    }

    pont = Math.min(pont, kezirasPlafon(mezo, nehezenOlvashato));

    eredmeny[mezo] = kerekit3(pont);
  }

  // Az ÁFA-bontás nem skalár mező, ezért kimarad a fenti ciklusból — de
  // ugyanúgy van magabiztossága, és ugyanúgy lehúzhatja a validátor.
  if ((mezok['afa_bontas'] ?? null) !== null) {
    let pont = modellSzerint['afa_bontas'] ?? 0.5;

    if (bukottValidatorok['afa_bontas'] !== undefined) {
      pont = Math.min(pont, BUKAS_PLAFON);
    }

    eredmeny['afa_bontas'] = kerekit3(pont);
  }

  return {
    model: modellSzerint,
    validators: bukottValidatorok,
    combined: eredmeny,
  };
}

/**
 * Kézzel írott bizonylaton az ellenőrizhetetlen mező nem látszhat biztosnak.
 *
 * Ezt korábban azzal utasítottuk el, hogy egy csupa sárga képernyő semmit nem
 * emel ki. **A mérés mást mondott:** ugyanazt a kézzel írott számlát hatszor
 * kiolvasva *hatféle szállítónév* jött ki, egyik sem helyes, miközben az
 * adószámok, az összegek és a dátumok mind a hatszor ugyanazok és helyesek
 * voltak. A modell magabiztossága ezen a mezőn 0,70-et, 0,85-öt, majd 0,85
 * fölöttit adott — vagyis harmadszorra **jelöletlenül engedte át a hibát.**
 *
 * A plafon ezért nem minden mezőre megy, csak arra a néhányra, aminek nincs
 * független fogása. Ez nem „minden sárga", hanem: az ellenőrizhetetlen mező az
 * ellenőrizhetetlen papíron.
 *
 * A plafon maga a küszöb: a `sav()` a határértéket a szigorúbb sávba sorolja,
 * tehát ez pontosan sárgát jelent, és követi a konfigurációt.
 */
function kezirasPlafon(mezo: string, nehezenOlvashato: boolean): number {
  if (!nehezenOlvashato || !(ELLENORIZHETETLEN_MEZOK as readonly string[]).includes(mezo)) {
    return 1.0;
  }

  return szamlafolyo.kiolvasas.ellenorzesKuszob;
}

/**
 * A négy állapot az ellenőrző képernyőn.
 *
 * A hiányzó magabiztosság **nem** ugyanaz, mint a magas: az egyikért a modell
 * jótállt, a másikról semmit nem tudunk. Korábban a kettő egyformán festett, és
 * így egy néma modell ugyanolyan megnyugtatónak látszott, mint egy magabiztos —
 * épp azt takarva el, amit tudni kellene.
 */
export function sav(pont: number | null | undefined): Sav {
  if (pont === null || pont === undefined) {
    return 'nincs_adat';
  }

  // A határérték az **óvatosabb** sávba esik, ezért `<=` és nem `<`.
  //
  // Nem elméleti finomság: a modellek kerek számokat mondanak, és a 0,85 az
  // egyik kedvencük. Egy kézzel írott számlán a 3.8 Flash pontosan 0,85-öt
  // adott a szállító nevére — a lap legalacsonyabb értékét, és az egyetlen
  // rossz mezőt —, ami szigorú `<`-nál jelöletlen maradt volna. Egy 85%-os
  // állítás nem jótállás: hetente egyszer téved.
  if (pont <= szamlafolyo.kiolvasas.figyelmeztetesKuszob) {
    return 'gyanus';
  }

  if (pont <= szamlafolyo.kiolvasas.ellenorzesKuszob) {
    return 'bizonytalan';
  }

  return 'biztos';
}

/** A sávhoz tartozó CSS-osztály. A kiemelés a bajt jelöli, nem a rendben lévőt. */
export function savOsztaly(s: Sav): string {
  switch (s) {
    case 'nincs_adat':
      return 'mezo-nincs-adat';
    case 'gyanus':
      return 'mezo-gyanus';
    case 'bizonytalan':
      return 'mezo-bizonytalan';
    case 'biztos':
      return 'mezo-biztos';
  }
}

function kerekit3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}
