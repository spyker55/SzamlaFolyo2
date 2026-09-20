/**
 * A fiók törlése: mi történik, és mi nem.
 *
 * # Miért tiszta modul, és miért ez a legfontosabb közülük
 *
 * Mert ez az **egyetlen visszafordíthatatlan** művelet a rendszerben. Minden
 * más hiba javítható: egy rossz kiolvasás átírható, egy elrontott export
 * újrakészíthető, egy lemondás visszavonható. Ez nem.
 *
 * Ezért a döntés — hogy a törlés a céget is elviszi-e, vagy csak a
 * felhasználót lépteti ki — **egy példányban** létezik, és ugyanazt látja a
 * böngésző (ami figyelmeztet) és az Edge Function (ami végrehajt). Ha a kettő
 * széttartana, a felhasználó egy másik műveletre mondana igent, mint ami
 * lefut.
 *
 * ⚠️ A böngésző oldalán ez **udvariasság, nem védelem**: a szerver a tényeket
 * a saját olvasásából veszi, nem a kliens állításából. A közös modul attól
 * közös, hogy ugyanazt a szabályt mondja ki, nem attól, hogy megbízunk a
 * hívóban.
 *
 * # A négy kimenetel
 *
 * | | Mi történik |
 * |---|---|
 * | `nincs_ceg` | Csak a fiók szűnik meg. Nincs mit még elvinni. |
 * | `kilepes` | A fiók megszűnik, **a cég marad** — más dolgozik benne. |
 * | `ceggel` | A fiók és **a cég mindene** megszűnik. Ez a végleges. |
 * | `tiltva` | Nem indítható. Egyetlen ilyen eset van, lásd lentebb. |
 *
 * # Az egyetlen tiltás, és miért az ÁSZF mondja ki
 *
 * Az egyedüli **tulajdonos** fiókja nem törölhető, amíg más felhasználó van a
 * cégben. Nem szigorúságból: enélkül a cég gazdátlanul maradna — a bent
 * maradók nem tudnának se számlázni, se tagot kezelni, se törölni, mert
 * mindhárom tulajdonosi jog. Ez nem kitalált szabály, az ÁSZF 5. pontja
 * szó szerint ezt ígéri: *„előbb másik tulajdonost kell kijelölni, vagy a
 * többi felhasználót el kell távolítani."*
 *
 * # Amit a modul szándékosan NEM dönt el
 *
 * - **A fizetést.** Ha fut kifizetett időszak, a törlés attól még indítható —
 *   az ÁSZF 9. pontja szerint azonnal hatályos, és a hátralévő idő elvész. A
 *   dolgunk annyi, hogy ezt **hangosan** kiírjuk, ne utólag derüljön ki.
 * - **A türelmi időt.** Nincs: a törlés azonnali és végleges, ahogy az ÁSZF
 *   10. és az Adatkezelési 4. pontja ígéri. Egy „30 napig visszaállítható"
 *   állapot kényelmes volna, de azzal az ígérettel, hogy *„a törölt adatokról
 *   nem tartunk fenn másolatot"*, nem fér össze.
 */

/** A nyers tények a cégről és a fiókról. Az adatbázis adja, a modul értelmezi. */
export type TorlesTenyek = {
  vanCeg: boolean;
  cegNev: string | null;
  /** A hívó szerepe a cégben. */
  szerep: string | null;
  /** Hány **elfogadott** tagsága van a cégnek, a hívóéval együtt. */
  tagokSzama: number;
  /** Van-e a hívón kívül másik tulajdonos. */
  masikTulajdonos: boolean;
  /** Fut-e fizetős előfizetés (a Stripe státusza szerint). */
  elofizetesFut: boolean;
  /** A kifizetett időszak vége, ha van. */
  idoszakVege: string | null;
  bizonylatok: number;
  exportok: number;
  fajlok: number;
};

export type TorlesDontes =
  | {
      fajta: 'nincs_ceg' | 'kilepes' | 'ceggel';
      cim: string;
      kovetkezmenyek: string[];
    }
  | { fajta: 'tiltva'; cim: string; miert: string };

/** Fut-e az előfizetés — ugyanaz a lista, amit a `keret.ts` futónak tekint. */
export function torlesDontes(t: TorlesTenyek, most: Date = new Date()): TorlesDontes {
  if (!t.vanCeg) {
    return {
      fajta: 'nincs_ceg',
      cim: 'A fiókod megszűnik.',
      kovetkezmenyek: [
        'A belépési adataid törlődnek, és ezzel a fiókod megszűnik.',
        'Céghez nem tartozol, tehát nincs más, amit el kellene vinni.',
      ],
    };
  }

  const egyedul = t.tagokSzama <= 1;

  // ⚠️ A tiltás csak akkor áll fenn, ha **marad** valaki a cégben. Aki egyedül
  // van, az attól még tulajdonos — őt nem tiltjuk ki a saját kijáratából.
  if (!egyedul && t.szerep === 'tulajdonos' && !t.masikTulajdonos) {
    return {
      fajta: 'tiltva',
      cim: 'Ez a fiók most nem törölhető.',
      miert:
        `Te vagy a(z) ${t.cegNev ?? 'cég'} egyetlen tulajdonosa, és rajtad kívül ` +
        `${t.tagokSzama - 1} felhasználó dolgozik benne. A törléssel a cég gazdátlan ` +
        'maradna: a bent maradók nem tudnának se számlázni, se tagot kezelni. ' +
        'Előbb jelölj ki másik tulajdonost a Beállításokban, vagy távolítsd el a ' +
        'többi felhasználót.',
    };
  }

  if (!egyedul) {
    return {
      fajta: 'kilepes',
      cim: `A fiókod megszűnik, a(z) ${t.cegNev ?? 'cég'} adatai megmaradnak.`,
      kovetkezmenyek: [
        'A belépési adataid törlődnek, és ezzel a fiókod megszűnik.',
        `A cégben rajtad kívül ${t.tagokSzama - 1} felhasználó dolgozik, ezért a cég ` +
          'bizonylatai, exportjai és beállításai érintetlenek maradnak — azok a céghez ' +
          'tartoznak, nem hozzád.',
        'Az előfizetéshez nem nyúlunk: az a cégé.',
      ],
    };
  }

  return {
    fajta: 'ceggel',
    cim: `A(z) ${t.cegNev ?? 'cég'} és minden adata véglegesen megszűnik.`,
    kovetkezmenyek: kovetkezmenyek(t, most),
  };
}

/**
 * Amit a teljes törlés elvisz — számokkal, nem általánosságban.
 *
 * A számok nem díszítés: „minden adatod törlődik" senkit nem állít meg,
 * „312 bizonylat és 8 export" igen. Amiből nulla van, azt **nem** soroljuk fel:
 * egy üres fiók törlésénél a hosszú lista csak riogatás.
 */
function kovetkezmenyek(t: TorlesTenyek, most: Date): string[] {
  const sorok: string[] = [];

  if (t.elofizetesFut) {
    const nap = hatralevoNap(t.idoszakVege, most);

    sorok.push(
      nap > 0
        ? `Az előfizetésed **azonnal** megszűnik. A kifizetett időszakból ${nap} nap van ` +
            'hátra — ez elvész, és nem téríthető vissza. Ha ki akarod használni, előbb ' +
            'mondd le a számlázási portálon, és csak a fordulónap után törölj.'
        : 'Az előfizetésed azonnal megszűnik. Visszatérítésre nincs mód.',
    );
  }

  const darabok: string[] = [];

  if (t.bizonylatok > 0) darabok.push(`${t.bizonylatok} bizonylat`);
  if (t.fajlok > 0) darabok.push(`${t.fajlok} feltöltött fájl`);
  if (t.exportok > 0) darabok.push(`${t.exportok} export`);

  sorok.push(
    darabok.length > 0
      ? `Törlődik ${darabok.join(', ')}, a kiolvasott adatokkal és a napló minden ` +
          'bejegyzésével együtt.'
      : 'A cégnek nincs bizonylata, tehát nincs mit elvinni — a cég sora és a ' +
          'beállításai szűnnek meg.',
  );

  sorok.push(
    'A törlés **nem vonható vissza**, és a törölt adatokról nem tartunk fenn másolatot. ' +
      'Ha kellenek az adataid, előbb készíts exportot.',
  );

  // Ez nem apróbetű, hanem a törvény: a már kiállított számlákat meg **kell**
  // őriznünk. Jobb itt kimondani, mint egy törlés után magyarázni.
  sorok.push(
    'Egy dolog marad meg: a már kiállított számlák, a számviteli megőrzési idő végéig. ' +
      'Ezt jogszabály írja elő, törlési kérésre sem szüntethető meg.',
  );

  return sorok;
}

/** Hány nap van még hátra — múltbeli vagy hiányzó időpontra 0. */
export function hatralevoNap(vege: string | null, most: Date = new Date()): number {
  if (vege === null) {
    return 0;
  }

  const t = new Date(vege).getTime();

  if (Number.isNaN(t)) {
    return 0;
  }

  return Math.max(0, Math.ceil((t - most.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * A megerősítéshez begépelt cégnév elfogadása.
 *
 * A cél a **szándékosság**, nem a helyesírás: aki egy „Nyeste Krisztián e.v."
 * nevet gépel be telefonon, annak az ékezet és a kisbetű-nagybetű ne legyen
 * akadály — a lényeg, hogy lássa, **melyik** céget írja alá.
 *
 * Ezért a összehasonlítás előtt: kisbetűsítés, az ékezetek leválasztása
 * (NFD + a kombináló jelek eldobása) és a szóközök összevonása. Az ürest
 * sosem fogadjuk el, különben egy névtelen cég egy Enterrel törölhető lenne.
 */
export function nevEgyezik(begepelt: string, cegNev: string | null): boolean {
  const a = egyszerusit(begepelt);
  const b = egyszerusit(cegNev ?? '');

  return a !== '' && a === b;
}

function egyszerusit(szoveg: string): string {
  return szoveg.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
