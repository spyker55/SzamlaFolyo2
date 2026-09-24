import type { Program } from './beallitas.ts';
import { KULCS_FAJLOK } from './kulcs.ts';
import { NOVITAX_FAJLOK } from './novitax.ts';

/**
 * Hogyan kerül a letöltött fájl a programba – lépésenként, a felületre.
 *
 * A Novitax és a Kulcs **több fájlt** olvas egy mappából (a számlafájl mellől
 * veszi a partnereket), ezért ZIP-ben töltjük le őket. A ZIP csak csomagolás:
 * ki kell bontani, és a számlafájlt kell kiválasztani. Két külön letöltés
 * rosszabb volna – a böngésző a második exportnál `partner (1).csv`-re
 * nevezné át a partnerfájlt, és a program csendben a *régit* olvasná.
 *
 * A menüutak a gyártói leírásokból (lásd az írók fejlécét); az RLB-é valódi
 * RLB Kettősben kipróbálva.
 */
export const BETOLTES: Record<Program, readonly string[]> = {
  rlb: ['Az RLB Kettősben: Könyvelés → Automatikus könyvelés CSV-ből, és válaszd ki a letöltött .csv fájlt.'],
  novitax: [
    'Bontsd ki a letöltött ZIP-et egy saját mappába (Windowson: jobb klikk → Összes kibontása).',
    `Az NTAX-ban: Feladási modul → Számlák bemásolása külső file-ból, és a mappából a „${NOVITAX_FAJLOK.szamla}” fájlt válaszd.`,
    `A „${NOVITAX_FAJLOK.partner}” maradjon mellette ugyanabban a mappában – a program onnan olvassa a partnereket.`,
  ],
  kulcs: [
    'Bontsd ki a letöltött ZIP-et egy saját mappába (Windowson: jobb klikk → Összes kibontása).',
    'A Főkönyvi Adatimporter Beállításaiban (jobb klikk a címsoron → Beállítások) legyen bepipálva a „Fejléc kihagyása” – a fájlok első sora fejléc. A beállítás csak rendszergazdaként indítva mentődik el.',
    `A Főkönyvi Adatimporterben: Kulcs-Számla felad Kulcs-Könyvelésnek → „Fájlból szeretném a feladást elvégezni”, és a mappából a „${KULCS_FAJLOK.fej}” fájlt tallózd be.`,
    'Egy új vevőt vagy szállítót a Kulcs első alkalommal párosíttat (Adategyeztetés): válaszd ki vagy vedd fel, és pipáld be a „Továbbiakban erre cserélje le…” lehetőséget – enélkül minden számlánál újra kérdez, vele megjegyzi.',
    'Készpénzes számlánál a Kulcs egyszer megkérdezi a forintpénztár főkönyvi számát (pl. 3811 Pénztárszámla) – ugyanígy, pipával.',
    `A „${KULCS_FAJLOK.tetel}” (tételek) és a „${KULCS_FAJLOK.partner}” (partnerek) maradjon mellette ugyanabban a mappában.`,
  ],
};
