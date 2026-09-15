import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * A köteg szétszedése — **a határok értelmezése**, modellhívás nélkül.
 *
 * Egy PDF-ben gyakran több bizonylat van: a könyvelő egyben szkenneli be a havi
 * paksamétát. Eddig ilyenkor a rendszer az **elsőt** olvasta ki, és a
 * `tobb_irat_gyanu` zászlóval emberhez küldte — a többi bizonylat adata
 * elveszett, és a felhasználónak kézzel kellett szétvágnia a fájlt.
 *
 * Ez a modul azt a választ értelmezi, amit a szétszedő modellhívás ad: egy
 * oldaltartomány-listát. **Semmit nem talál ki** — ellenőriz, és ha bármi nem
 * stimmel, nemet mond. A nem azt jelenti, hogy marad a mai viselkedés: egy
 * bizonylat, zászlóval. Ez a helyes fallback, mert nem ront el semmit.
 *
 * # Hézag: kitöltjük. Átfedés: elbuktatjuk.
 *
 * A kettő nem ugyanaz a kérdés, és az első kiadásban mindkettőt elutasítottam.
 * Az első éles köteg megmutatta, hogy a hézag **normális**: a beszkennelt
 * paksamétában üres elválasztó oldal van a számla és a szállítólevél között, és
 * egy ilyen oldalról a modell jogosan nem állítja, hogy bizonylat.
 *
 * A hézagra ezért **ugyanaz a szabály fut a kódban, amit a prompt is kér**: a
 * besorolatlan oldal a **megelőző** bizonylathoz kerül (az első oldalak a
 * következőhöz, mert előttük nincs mihez). Ez nem találgatás, hanem a kimondott
 * szabály betartatása — és a rosszabbik eset is jobb a mainál: ha az az oldal
 * mégis a következő irathoz tartozott volna, a kár ugyanaz, mint ha nem
 * szedtük volna szét, viszont a többi határ helyes marad. Minden bizonylat
 * emberi jóváhagyásra vár, az oldaltartománya ki van írva, és az előnézet
 * odaugrik — tehát ez látható tévedés, nem néma.
 *
 * ⚠️ **Az átfedés viszont marad elutasítás.** Ott nem hiányzik egy oldal,
 * hanem **két bizonylathoz tartozna ugyanaz** — az összeg kétszer számítódna
 * be, és nincs olyan szabály, amivel el lehetne dönteni, melyiké. Ugyanígy
 * elbuktat minden érvénytelen szám (nulladik oldal, fájlon túlnyúló, törtszám):
 * az nem hiányos válasz, hanem megbízhatatlan.
 */

/** Egy bizonylat helye a fájlban. 1-alapú, mindkét vége zárt. */
export type Hatar = { oldal_tol: number; oldal_ig: number };

export type KotegDontes =
  | {
      szet: true;
      hatarok: Hatar[];
      /**
       * Ha a modell hagyott besorolatlan oldalakat, itt áll, mit toldottunk
       * hozzá és hova. Az audit-nyomba megy: enélkül utólag nem lehetne
       * megmondani, hogy egy oldaltartomány a modelltől vagy tőlünk származik.
       */
      javitas: string | null;
    }
  /** Nem szedjük szét — az `indok` a naplóba és a `forras_naplo`-ba megy. */
  | { szet: false; indok: string };

/** A kikényszerített függvényhívás neve a szétszedő körben. */
export const KOTEG_FUGGVENY_NEV = 'record_batch';

/**
 * A szétszedő eszközséma.
 *
 * Ugyanaz a szűk alak, mint a kiolvasásé (`sema.ts`): nincs unió-típus, minden
 * mező kötelező. A Gemini modellek a bonyolultabb sémát csendben elrontják.
 */
export function kotegSema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      dokumentumok: {
        type: 'array',
        description:
          'A fájlban található különálló bizonylatok, oldalsorrendben. ' +
          'Minden oldal pontosan egy bizonylathoz tartozzon.',
        items: {
          type: 'object',
          properties: {
            oldal_tol: { type: 'integer', description: 'Az első oldala, 1-alapú.' },
            oldal_ig: { type: 'integer', description: 'Az utolsó oldala, 1-alapú, beleértve.' },
          },
          required: ['oldal_tol', 'oldal_ig'],
        },
      },
    },
    required: ['dokumentumok'],
  };
}

/**
 * A modell válaszából a határok — vagy egy indok, amiért nem szedjük szét.
 *
 * A feltételek **mind** teljesülnek, különben nemet mondunk:
 *
 * 1. van legalább két bizonylat (egy bizonylat nem szétszedés);
 * 2. nincs több, mint a felső korlát (a futótűz-fék: minden darab külön
 *    modellhívás és külön kredit);
 * 3. minden határ egész szám, `1 <= tol <= ig <= oldalszam`;
 * 4. oldalsorrendbe rendezve **nem fednek át** — egyetlen oldal sem tartozhat
 *    két bizonylathoz.
 *
 * Ami kimarad, azt a `hezagotToltd()` a megelőző bizonylathoz sorolja, és a
 * döntés `javitas` mezője megmondja, hol tettük ezt.
 */
export function hatarokErtelmez(
  nyers: unknown,
  fajlOldalszam: number | null,
  maxDarab: number = szamlafolyo.koteg.maxDarab,
): KotegDontes {
  if (fajlOldalszam === null || !Number.isInteger(fajlOldalszam) || fajlOldalszam < 2) {
    // Egyoldalas fájlban nincs mit szétszedni, ismeretlen oldalszámú fájlban
    // pedig nem tudnánk ellenőrizni a lefedést.
    return { szet: false, indok: 'A fájl oldalszáma alapján nincs mit szétszedni.' };
  }

  const lista = (nyers as Record<string, unknown> | null)?.['dokumentumok'];

  if (!Array.isArray(lista) || lista.length === 0) {
    return { szet: false, indok: 'A szétszedés nem adott vissza bizonylatokat.' };
  }

  if (lista.length === 1) {
    return { szet: false, indok: 'A fájlban egyetlen bizonylat van.' };
  }

  if (lista.length > maxDarab) {
    return {
      szet: false,
      indok: `A fájlban ${lista.length} bizonylat lenne, a felső korlát ${maxDarab}.`,
    };
  }

  const hatarok: Hatar[] = [];

  for (const elem of lista) {
    const tol = egesz((elem as Record<string, unknown> | null)?.['oldal_tol']);
    const ig = egesz((elem as Record<string, unknown> | null)?.['oldal_ig']);

    if (tol === null || ig === null || tol < 1 || ig < tol || ig > fajlOldalszam) {
      return { szet: false, indok: 'A szétszedés érvénytelen oldaltartományt adott.' };
    }

    hatarok.push({ oldal_tol: tol, oldal_ig: ig });
  }

  hatarok.sort((a, b) => a.oldal_tol - b.oldal_tol);

  // Átfedés: ott nem hiányzik egy oldal, hanem kétszer számítana be. Nincs
  // szabály, amivel el lehetne dönteni, melyik bizonylaté — tehát nem szedünk
  // szét.
  for (let i = 1; i < hatarok.length; i++) {
    if (hatarok[i]!.oldal_tol <= hatarok[i - 1]!.oldal_ig) {
      return { szet: false, indok: 'A bizonylatok oldaltartományai átfednék egymást.' };
    }
  }

  return { szet: true, hatarok, javitas: hezagotToltd(hatarok, fajlOldalszam) };
}

/**
 * A besorolatlan oldalak elhelyezése — **a megelőző bizonylathoz**.
 *
 * Ugyanaz a szabály, amit a prompt is kér az üres elválasztó oldalra. A
 * tömböt helyben módosítja, és visszaadja, mit toldott hozzá; `null`, ha nem
 * volt mit.
 *
 * A lista ekkor már rendezett és átfedésmentes, tehát csak három hely marad,
 * ahol oldal kimaradhat: az első bizonylat előtt, két bizonylat között, és az
 * utolsó után.
 */
function hezagotToltd(hatarok: Hatar[], fajlOldalszam: number): string | null {
  const elso = hatarok[0];
  const utolso = hatarok[hatarok.length - 1];

  if (elso === undefined || utolso === undefined) {
    return null;
  }

  const javitasok: string[] = [];

  // A fájl eleje: itt nincs megelőző bizonylat, tehát a **következőhöz** megy.
  if (elso.oldal_tol > 1) {
    javitasok.push(`${elso.oldal_tol - 1 === 1 ? '1.' : `1–${elso.oldal_tol - 1}.`} → az 1. bizonylathoz`);
    elso.oldal_tol = 1;
  }

  for (let i = 1; i < hatarok.length; i++) {
    const elozo = hatarok[i - 1]!;
    const mostani = hatarok[i]!;

    if (mostani.oldal_tol > elozo.oldal_ig + 1) {
      const tol = elozo.oldal_ig + 1;
      const ig = mostani.oldal_tol - 1;
      javitasok.push(`${tol === ig ? `${tol}.` : `${tol}–${ig}.`} → a(z) ${i}. bizonylathoz`);
      elozo.oldal_ig = ig;
    }
  }

  // A fájl vége.
  if (utolso.oldal_ig < fajlOldalszam) {
    const tol = utolso.oldal_ig + 1;
    javitasok.push(
      `${tol === fajlOldalszam ? `${tol}.` : `${tol}–${fajlOldalszam}.`} → a(z) ${hatarok.length}. bizonylathoz`,
    );
    utolso.oldal_ig = fajlOldalszam;
  }

  return javitasok.length === 0 ? null : `Besorolatlan oldal: ${javitasok.join(', ')}`;
}

/** Hány oldal a tartomány. A `kredit.oldalakbol()` ezt kapja meg. */
export function hatarOldalszam(h: Hatar): number {
  return h.oldal_ig - h.oldal_tol + 1;
}

function egesz(ertek: unknown): number | null {
  if (typeof ertek === 'number' && Number.isInteger(ertek)) {
    return ertek;
  }

  // A modellek néha sztringként adják vissza a számot. Ami nem tiszta egész,
  // azt **nem** kerekítjük — a „2.5. oldal" nem félreírás, hanem jel arról,
  // hogy a válasz nem megbízható.
  if (typeof ertek === 'string' && /^\d+$/.test(ertek.trim())) {
    return Number(ertek.trim());
  }

  return null;
}
