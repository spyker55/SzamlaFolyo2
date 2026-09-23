/**
 * Kilépés a cégből — a fiók megmarad.
 *
 * # Miért külön művelet, és miért nem elég a fióktörlés
 *
 * 2026-09-23-ig egy tagnak két rossz lehetősége volt: **törli az egész
 * fiókját** (`/fiok-torles`), vagy megkéri a tulajdonost, hogy távolítsa el.
 * A kettő nem helyettesíti egymást: a fiók törlése **visszafordíthatatlan**, a
 * kilépés nem az — aki kilép, holnap új meghívót kaphat ugyanarra a címre.
 *
 * Egy könyvelő, aki befejezte a megbízást, nem akarja elveszíteni a fiókját.
 * Eddig mégis ezt kínáltuk neki.
 *
 * # Miért tiszta modul
 *
 * Ugyanazért, amiért a `fiokTorles.ts` az: a felület **megmondja előre**, mi
 * fog történni, a szerver pedig **végrehajtja**. Ha a kettő széttartana, a
 * felhasználó egy másik műveletre mondana igent, mint ami lefut.
 *
 * ⚠️ A böngésző oldalán ez itt is **udvariasság, nem védelem**: a
 * `cegbol_kilepek()` RPC a tényeket a saját olvasásából veszi. A közös modul
 * attól közös, hogy ugyanazt a szabályt mondja ki, nem attól, hogy megbízunk
 * a hívóban.
 *
 * # A három kimenetel
 *
 * | | Mikor |
 * |---|---|
 * | `mehet` | Van más is a cégben, és marad tulajdonos utánad. |
 * | `egyedul` | Egyedül vagy — a kilépés gazdátlan cégsort hagyna hátra. |
 * | `utolso_tulajdonos` | Mások is bent vannak, de rajtad kívül nincs tulajdonos. |
 *
 * Az `egyedul` eset **nem formalitás**. Aki egyedül lép ki, az olyan cégsort
 * hagyna hátra, amihez soha senki nem férne hozzá — se törölni, se exportálni
 * nem tudná —, az adószáma viszont a `companies_torzsszam_kulcs` egyedi index
 * miatt **örökre foglalt** maradna. Ugyanaz a vállalkozás nem tudna új céget
 * alapítani. Ezért ott a fióktörlés a helyes út: az legalább kimondja, mi vész
 * el, és a cégsort is elviszi.
 *
 * Az `utolso_tulajdonos` eset szó szerint az ÁSZF 5. pontja, ugyanaz a
 * mondat, ami a fióktörlés `tiltva` ágán is áll.
 */

/** A nyers tények. Az adatbázis adja, a modul értelmezi. */
export type KilepesTenyek = {
  cegNev: string | null;
  /** A hívó szerepe a cégben. */
  szerep: string | null;
  /** Hány **elfogadott** tagsága van a cégnek, a hívóéval együtt. */
  tagokSzama: number;
  /** Van-e a hívón kívül másik tulajdonos. */
  masikTulajdonos: boolean;
};

export type KilepesDontes =
  | { fajta: 'mehet'; cim: string; kovetkezmenyek: string[] }
  | { fajta: 'egyedul' | 'utolso_tulajdonos'; cim: string; miert: string };

export function kilepesDontes(t: KilepesTenyek): KilepesDontes {
  const ceg = t.cegNev ?? 'cég';

  if (t.tagokSzama <= 1) {
    return {
      fajta: 'egyedul',
      cim: 'Egyedül vagy a cégben, ezért a kilépés nem a helyes út.',
      miert:
        `Rajtad kívül senki nem dolgozik a(z) ${ceg} fiókjában. Ha kilépnél, a cég ` +
        'adataihoz soha többé senki nem férne hozzá – törölni és exportálni sem lehetne ' +
        'őket –, az adószám viszont foglalt maradna, tehát ugyanez a vállalkozás nem ' +
        'tudna új céget alapítani. Ha meg akarsz válni a cégtől, a **Fiók törlése** a ' +
        'helyes út: az megmondja, mi vész el, és a cégsort is elviszi.',
    };
  }

  if (t.szerep === 'tulajdonos' && !t.masikTulajdonos) {
    return {
      fajta: 'utolso_tulajdonos',
      cim: 'Most nem tudsz kilépni.',
      miert:
        `Te vagy a(z) ${ceg} egyetlen tulajdonosa, és rajtad kívül ${t.tagokSzama - 1} ` +
        'felhasználó dolgozik benne. A kilépéssel a cég gazdátlan maradna: a bent ' +
        'maradók nem tudnának se számlázni, se tagot kezelni. Előbb jelölj ki másik ' +
        'tulajdonost, vagy távolítsd el a többi felhasználót.',
    };
  }

  return {
    fajta: 'mehet',
    cim: `Kilépsz a(z) ${ceg} fiókjából. A saját fiókod megmarad.`,
    kovetkezmenyek: [
      'A hozzáférésed azonnal megszűnik: a cég bizonylatait, exportjait és beállításait ' +
        'többé nem látod.',
      'A cég adataiból **semmi nem törlődik** – azok a céghez tartoznak, nem hozzád. ' +
        'Amit feltöltöttél vagy jóváhagytál, a helyén marad.',
      'A fiókod megmarad, a belépési adataid változatlanok. Ha újra hívnak, ugyanezzel ' +
        'a címmel visszatérhetsz.',
      'A cég naplójába bekerül, hogy kiléptél – a bent maradók lássák, mi történt.',
    ],
  };
}
