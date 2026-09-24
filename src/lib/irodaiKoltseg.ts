import { csomagSorrend, szamlafolyo, type CsomagKulcs } from '@config/szamlafolyo.ts';

/**
 * Mennyibe kerül egy könyvelőirodának egy hónap – csomagonként.
 *
 * A „Könyvelőknek" oldal kalkulátora ebből számol, és **minden szám a
 * configból jön**: egy áremelés után a lap nem mutathat régi árat. (A
 * beszélgetésben egyszer már elhangzott egy rossz szám – 9 990 Ft a Flow
 * 9 900-a helyett –, fejből. Ez a függvény azért van, hogy fejből ne kelljen.)
 *
 * # Amit a számítás feltételez, és a lap ki is mondja
 *
 * - **A keret fölötti darab csak bekapcsolt túlhasználattal megy át.** Alapból
 *   a feldolgozás a keretnél megáll. Ha az iroda a kereten felül is dolgozik,
 *   azt a Beállításokban kell engednie, forintos plafonnal – ezért jelezzük,
 *   ha a szükséges többlet az alapplafon fölé megy.
 * - **Egy dokumentum = egy bizonylat.** A fair-use szabály szerint egy hosszú,
 *   sokoldalas számla több is lehet; a kalkulátor a szokásos esettel számol.
 */

export type CsomagKoltseg = {
  kulcs: CsomagKulcs;
  nev: string;
  havidij: number;
  keret: number;
  /** A kereten felüli darabszám. */
  tobbletDarab: number;
  /** A kereten felüli darabok díja, forintban. */
  tobbletFt: number;
  osszes: number;
  /** Egy bizonylat átlagos ára, egész forintra kerekítve; `null`, ha nulla a darab. */
  darabar: number | null;
  /** `null` = korlátlan. */
  felhasznalok: number | null;
  /** A többlet meghaladja a túlhasználat alapplafonját – a plafont emelni kell. */
  plafonFelett: boolean;
};

export function csomagKoltsegek(havidarab: number): CsomagKoltseg[] {
  const darab = Number.isFinite(havidarab) ? Math.max(0, Math.floor(havidarab)) : 0;

  return csomagSorrend.map((kulcs) => {
    const cs = szamlafolyo.csomagok[kulcs];
    const tobbletDarab = Math.max(0, darab - cs.dokumentumok);
    const tobbletFt = tobbletDarab * cs.extraFt;
    const osszes = cs.arHavi + tobbletFt;

    return {
      kulcs,
      nev: cs.nev,
      havidij: cs.arHavi,
      keret: cs.dokumentumok,
      tobbletDarab,
      tobbletFt,
      osszes,
      darabar: darab === 0 ? null : Math.round(osszes / darab),
      felhasznalok: cs.felhasznalok,
      plafonFelett: tobbletFt > szamlafolyo.tulhasznalat.alapPlafonFt,
    };
  });
}

/** A legolcsóbb csomag. Egyenlő árnál a kisebb – nem adunk el drágábbat ugyanazért. */
export function legolcsobbCsomag(havidarab: number): CsomagKoltseg {
  return csomagKoltsegek(havidarab).reduce((a, b) => (b.osszes < a.osszes ? b : a));
}
