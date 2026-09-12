import { MEZOK } from '../sema.ts';
import type { Csomopont, Dokumentum } from './fa.ts';

/**
 * Az értelmezők közös alakja.
 *
 * A leszármazottak **ugyanazt az alakot adják vissza, amit a modell** — így a
 * csővezeték egy darab: `tisztit()` → normalizálás → validátorok. Nem két
 * külön út, csak két bemenet.
 */

export type NyersValasz = Record<string, unknown>;

export type Ertelmezo = {
  /** Rövid azonosító a naplóba és a `document_extractions.model` oszlopba. */
  nev: string;
  tamogatja: (doc: Dokumentum) => boolean;
  ertelmez: (gyoker: Csomopont, doc: Dokumentum) => NyersValasz;
};

/**
 * Magabiztosság a strukturált adathoz: minden kitöltött mező **1.0**.
 *
 * A strukturált adat nem találgatás — a szállító gépe írta, nem egy modell
 * olvasta le egy fényképről. A validátorok ettől még lehúzhatják: ha a nettó
 * és az ÁFA nem adja ki a bruttót, az egy rosszul kiállított számla, és azt
 * ugyanúgy jelezni kell.
 */
export function konfidencia(
  mezok: Record<string, unknown>,
  vanBontas: boolean,
): Record<string, number> {
  const eredmeny: Record<string, number> = {};

  for (const mezo of MEZOK) {
    const ertek = mezok[mezo];
    if (ertek !== null && ertek !== undefined && ertek !== '') {
      eredmeny[mezo] = 1.0;
    }
  }

  if (vanBontas) {
    eredmeny['afa_bontas'] = 1.0;
  }

  return eredmeny;
}
