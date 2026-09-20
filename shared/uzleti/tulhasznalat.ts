import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * A kereten felüli használat: mennyi ment túl, mennyibe kerül, és fér-e még.
 *
 * # Miért külön modul, és miért most
 *
 * Mert a plafon eddig **dísz volt**. A Beállítások képernyő ezt ígéri:
 *
 * > „A keret fölött is feldolgozunk, a lent megadott forintösszegig. Afölött
 * > megállunk." — és alatta: „A plafon **nem opcionális**: a nyitott végű
 * > engedély váratlan számlát jelentene."
 *
 * A `keret.ts` viszont egyetlen helyen sem olvasta az `overage_limit_ft`-et:
 * a döntés `mehet: !elfogyott || overage_enabled` volt. Vagyis aki bekapcsolta
 * a túlhasználatot, az **nyitott végű engedélyt** adott — pontosan azt, amit a
 * képernyő szerint nem lehet adni. Ez a modul azt a mondatot teszi igazzá.
 *
 * # Egy számítás, két irány — és ez a lényeg
 *
 * Ugyanez a függvény mondja meg, hogy **beengedjünk-e még egy bizonylatot**
 * (a `kiolvas` fékje a claim előtt), és hogy **mennyit számlázzunk a ciklus
 * végén** (a `stripe-webhook` túlhasználati ága). A kettő csak abban tér el,
 * melyik időszak felhasználását kapja.
 *
 * Ez nem kényelem. Ha a beeresztő és a számlázó oldal két külön számítás
 * lenne, előbb-utóbb széttartanának — és a széttartás mindkét iránya rossz:
 * vagy olyat számláznánk, amit beengedtünk és nem ígértünk, vagy olyat
 * engednénk be, amiért soha nem kérünk pénzt.
 *
 * # A plafon darabszámra fordul, nem fordítva
 *
 * A felhasználó **forintban** mér — helyesen, mert a darabár csomagonként más,
 * és a számlán is forint áll. A rendszer viszont **kreditet** számol. A váltás
 * lefelé kerekít (`floor`): a plafon felső határ, nem irányszám. Egy 10 000
 * Ft-os plafon 50 Ft-os darabáron 200 kredit, nem 200,4.
 *
 * ⚠️ **Egy bizonylat túlléphet a plafonon, és ez tudatos.** A fék azt kérdezi,
 * fér-e még **legalább egy** kredit — de egy többoldalas irat `⌈oldalak/5⌉`
 * kreditet ér, és az oldalszámot a fék még nem ismeri (a claim előtt áll,
 * szándékosan). Ugyanez a tűrés áll a keretnél is: ott az `elfogyott` feltétel
 * `felhasznalt >= keret`, tehát az utolsó bizonylat ugyanígy túlnyúlhat. A
 * túlnyúlást **nem számlázzuk ki**: a `szamlazhatoDarab` a plafonra van vágva.
 * A tévedés iránya így mindig a felhasználó javára dől.
 */

/** Amit a túlhasználatról tudni kell. Minden mező kredit vagy forint, nem arány. */
export type Tulhasznalat = {
  /** Hány kredit ment a kereten felül. Ennyi **történt**. */
  darab: number;
  /**
   * Ebből mennyi fér a plafonba. Ennyit **számlázunk** — a kettő akkor tér el,
   * ha egy többoldalas irat átnyúlt a plafonon.
   */
  szamlazhatoDarab: number;
  /** A számlázható darabok ára forintban. */
  ft: number;
  /** A csomag kereten felüli darabára. */
  darabAr: number;
  /** A cég plafonja forintban — a beállított érték, vagy az alapérték. */
  plafonFt: number;
  /** Hány további kredit fér még a plafonba. Nulla = megállunk. */
  ferMegDarab: number;
};

export function tulhasznalatSzamol(bemenet: {
  /** A csomag havi kerete darabban. */
  keret: number;
  /** A csomag kereten felüli darabára forintban. */
  darabAr: number;
  /** Az időszakban elhasznált kreditek száma — a keretet is beleértve. */
  felhasznalt: number;
  /** A cég plafonja, vagy `null`, ha nem állított be sajátot. */
  plafonFt: number | null;
}): Tulhasznalat {
  const keret = Math.max(0, Math.trunc(bemenet.keret) || 0);
  const darabAr = Math.max(0, Math.trunc(bemenet.darabAr) || 0);
  const felhasznalt = Math.max(0, Math.trunc(bemenet.felhasznalt) || 0);

  const plafonFt = Math.max(
    0,
    Math.trunc(bemenet.plafonFt ?? szamlafolyo.tulhasznalat.alapPlafonFt) || 0,
  );

  // ⚠️ A nulla darabár nem „ingyen korlátlan", hanem **nulla hely**. Egy ilyen
  // config hibás, és a hibás configból nem engedünk át munkát: amit nem tudunk
  // beárazni, azt nem is tudjuk a plafonhoz mérni. A drágább irány a helyes.
  const ferPlafonba = darabAr > 0 ? Math.floor(plafonFt / darabAr) : 0;

  const darab = Math.max(0, felhasznalt - keret);
  const szamlazhatoDarab = Math.min(darab, ferPlafonba);

  return {
    darab,
    szamlazhatoDarab,
    ft: szamlazhatoDarab * darabAr,
    darabAr,
    plafonFt,
    ferMegDarab: Math.max(0, ferPlafonba - darab),
  };
}
