import { xmltFelolvas, XmlHiba } from './parser.ts';
import { ertelmez, type XmlEredmeny } from './xmlKiolvaso.ts';

/**
 * A strukturált ág **egyetlen hívásban**: nyers XML → kiolvasott mezők.
 *
 * A két fél eddig is megvolt (`xmltFelolvas` a parser-adapter, `ertelmez` a
 * diszpécser), de a **köztük lévő döntés** — mikor essen a bizonylat a
 * modellhez — a `kiolvas` Edge Functionben ült, egyetlen példányban. Amint egy
 * másik hívó is kell (a `kiolvasas:proba` mérőscript), abból két példány lesz,
 * és két példány előbb-utóbb széttart.
 *
 * Egy mérőeszköznél ez nem stílushiba: ha a script a *hasonmását* futtatja
 * annak, ami élesben fut, akkor nem azt méri, amit mérni akarunk.
 *
 * ## A `null` jelentése: „menjen a modellhez"
 *
 * Három különböző dolog vezet ide, és **mind a három ugyanaz a válasz**:
 *
 * 1. az XML értelmezhető, de nincs benne elem (`xmltFelolvas` → `null`);
 * 2. egyik értelmezőnk sem ismeri fel a sémát (`ertelmez` → `null`);
 * 3. az XML-hez **biztonsági okból nem nyúlunk** (`XmlHiba`): doctype-ot
 *    tartalmaz, vagy nagyobb a megengedettnél.
 *
 * A harmadik a legkevésbé magától értetődő, ezért ki van mondva: egy
 * doctype-os fájl XML-ként veszélyes, a tartalmát viszont a modell nyugodtan
 * *nézheti* — nem értelmezzük, csak elküldjük. Ezért nem hiba, hanem `null`.
 *
 * ⚠️ Minden más hiba **átmegy**. Egy váratlan kivétel a parserből vagy egy
 * értelmezőből valódi hiba, és nem szabad csendben modellhívássá változnia:
 * abból egy néma, forintos regresszió lenne.
 */
export function xmlbolKiolvas(xml: string, bajtHossz: number): XmlEredmeny | null {
  try {
    const doc = xmltFelolvas(xml, bajtHossz);

    return doc === null ? null : ertelmez(doc);
  } catch (hiba) {
    if (hiba instanceof XmlHiba) {
      return null;
    }

    throw hiba;
  }
}
