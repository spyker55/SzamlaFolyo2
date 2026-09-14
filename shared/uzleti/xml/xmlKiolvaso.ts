import { apeh } from './apeh.ts';
import { cii } from './cii.ts';
import { nav } from './nav.ts';
import { ubl } from './ubl.ts';
import type { Ertelmezo, NyersValasz } from './ertelmezo.ts';
import type { Dokumentum } from './fa.ts';

/**
 * A feldolgozási lánc **legolcsóbb foka**: ha az adat strukturáltan is megvan,
 * modellhívás nélkül olvassuk ki. Nulla forint, nulla találgatás.
 *
 * # Biztonság
 *
 * Az itt érkező XML **nem megbízható**, és ez az e-mailes beküldés
 * megszüntetése után is így van. Akkor azért, mert bárki küldhetett ilyet
 * hitelesítés nélkül; most azért, mert a feltöltött fájl akkor is idegen fájl,
 * ha belépett felhasználó hozta — a bizonylatot nem ő írta, hanem a szállítója.
 * **A védelem indoka változott, az érvényessége nem.**
 *
 * A régi PHP a libxml flagjeire támaszkodott (`LIBXML_NONET`, a `LIBXML_NOENT`
 * hiánya). Azok nem fordulnak át automatikusan, ezért itt a védelem két
 * egyszerűbb, de erősebb szabályra épül:
 *
 * 1. **A doctype-ot tartalmazó fájlt eldobjuk, még értelmezés előtt.** Külső
 *    entitást csak `<!DOCTYPE>`-ban lehet deklarálni, tehát ezzel az
 *    XXE-támadások egész osztálya kiesik — nem kell bíznunk abban, hogy a
 *    parser jól van beállítva.
 * 2. **A méret felülről korlátozott.** A beágyazott XML tömörítve érkezik, és
 *    egy kicsi PDF-melléklet kicsomagolva is elszabadulhat.
 *
 * A szabványos entitások (`&amp;`, `&lt;` …) feldolgozása ezek után biztonságos:
 * saját entitást deklarálni nincs hol.
 */

/**
 * Ennél nagyobb XML-t nem értelmezünk. Egy e-számla néhány tíz kilobájt; a
 * nagyságrendekkel nagyobb fájl vagy támadás, vagy nem e-számla.
 */
export const MAX_BAJT = 4 * 1024 * 1024;

/**
 * Az értelmezők, sorrendben. Az **első találat nyer** — de a négy
 * `tamogatja()` nem fedi egymást: eltérő gyökérnevekre szűrnek, és az UBL, a
 * NAV meg az APEH ezen felül névtérre is.
 */
const ERTELMEZOK: readonly Ertelmezo[] = [cii, ubl, nav, apeh];

export type XmlEredmeny = {
  nev: string;
  nyers: NyersValasz;
};

/** Tartalmaz-e doctype-deklarációt. Ami igen, azt nem értelmezzük. */
export function vanDoctype(xml: string): boolean {
  // Csak a prológusban lehet, de nem kockáztatunk: bárhol megtaláljuk.
  return /<!DOCTYPE/i.test(xml);
}

/** Túl nagy-e. A hosszt bájtban mérjük, nem karakterben. */
export function tulNagy(bajtHossz: number): boolean {
  return bajtHossz > MAX_BAJT;
}

/**
 * Kiolvasás strukturált XML-ből.
 *
 * A `null` azt jelenti: **ezt nem tudjuk értelmezni — menjen a modellhez.** Ez
 * nem hiba, hanem a lánc következő foka.
 *
 * A parsert a hívó adja (`doc`), mert az futtatókörnyezet-függő; az
 * értelmezés maga viszont itt, semleges fán történik.
 */
export function ertelmez(doc: Dokumentum): XmlEredmeny | null {
  for (const ertelmezo of ERTELMEZOK) {
    if (ertelmezo.tamogatja(doc)) {
      return { nev: ertelmezo.nev, nyers: ertelmezo.ertelmez(doc.gyoker, doc) };
    }
  }

  return null;
}
