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
 * ⚠️ **Hézagot és átfedést nem javítunk ki.** Csábító volna: ha a modell
 * kihagyja a 4. oldalt, oda lehetne csapni az előző bizonylathoz. De akkor mi
 * találnánk ki, hova tartozik az az oldal — és a szétszedés pontosan az a
 * művelet, ahol egy néma tévedés a legdrágább: rossz oldalon rossz bizonylat,
 * külön kreditért. Inkább nem szedjük szét; abból nem lesz kár, csak marad a
 * mai állapot.
 */

/** Egy bizonylat helye a fájlban. 1-alapú, mindkét vége zárt. */
export type Hatar = { oldal_tol: number; oldal_ig: number };

export type KotegDontes =
  | { szet: true; hatarok: Hatar[] }
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
 * 4. oldalsorrendbe rendezve **hézagmentesen és átfedés nélkül** lefedik az
 *    egész fájlt — vagyis egyetlen oldal sem vész el és nem számítódik kétszer.
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

  // A lefedés ellenőrzése: az elsőnek az 1. oldalon kell kezdődnie, minden
  // továbbinak pontosan ott, ahol az előző véget ért, és az utolsónak a fájl
  // utolsó oldalán kell zárnia.
  let kovetkezo = 1;

  for (const h of hatarok) {
    if (h.oldal_tol !== kovetkezo) {
      return {
        szet: false,
        indok:
          h.oldal_tol < kovetkezo
            ? 'A bizonylatok oldaltartományai átfednék egymást.'
            : 'A bizonylatok oldaltartományai kihagynának oldalakat.',
      };
    }
    kovetkezo = h.oldal_ig + 1;
  }

  if (kovetkezo !== fajlOldalszam + 1) {
    return { szet: false, indok: 'A bizonylatok nem fedik le a fájl minden oldalát.' };
  }

  return { szet: true, hatarok };
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
