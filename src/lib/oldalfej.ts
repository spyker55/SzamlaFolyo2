/**
 * Oldalankénti cím (`<title>`) és leírás (`<meta name="description">`).
 *
 * # Miért egy tábla, és nem minden oldal maga
 *
 * Mert így egy helyen látszik, mit mutat a kereső a hat nyilvános oldalról, és
 * az őr (`oldalfej.test.ts`) egy helyen méri: minden `App.tsx`-útvonalnak van
 * sora, a címek egyediek, a leírások kiférnek, és nem ígérnek többet, mint a
 * hirdetések. A jogi oldalak komponensei ráadásul archivált lenyomatot
 * hordoznak (`jogi-archivum/`) – a fejléc miatt nem kell hozzájuk nyúlni.
 *
 * # Mit lát, és mit nem
 *
 * Az oldal egy React-alkalmazás: a címet és a leírást böngészőben futó kód
 * állítja be (`OldalFej` az `App.tsx`-ben). A Google a JavaScriptet lefuttatja,
 * tehát ő az itteni szöveget látja. Ami **nem** futtat kódot – például a
 * Facebook linkelőnézete –, az az `index.html` alapértékét kapja, ezért az a
 * főoldal sorával szó szerint egyezik (az őr ezt is méri).
 *
 * A leírás ~155 karakter fölött a találati listában csonkul, ezért a nyilvános
 * oldalaké ennyi alatt marad. A belépéshez kötött képernyők a `robots.txt`
 * szerint nem kerülnek a keresőbe: ott csak a böngészőfül címe számít.
 */

export type Oldalfej = { cim: string; leiras: string };

const MARKA = 'SzámlaFolyó';
const fej = (oldal: string) => `${oldal} – ${MARKA}`;

/** A főoldalé, és minden olyan útvonalé, aminek nincs saját leírása. */
export const ALAP: Oldalfej = {
  cim: `${MARKA} – számlákból rendezett adatok`,
  leiras:
    'Töltsd fel vagy továbbítsd e-mailben a számlákat és nyugtákat: a SzámlaFolyó kiolvassa az adatokat, megjelöli, amit érdemes átnézni, és exportálja őket.',
};

/** Útvonal (az `App.tsx` alakjában) → fejléc. */
export const OLDALFEJEK: Readonly<Record<string, Oldalfej>> = {
  // Nyilvános
  '/': ALAP,
  '/konyveloknek': {
    cim: fej('Könyvelőirodáknak'),
    leiras:
      'Ügyfelektől érkező számlák, nyugták, fotózott blokkok: kiolvassuk az adatokat, te jóváhagyod, és ügyfelenként exportálod RLB, Novitax vagy Kulcs felé.',
  },
  '/utmutato': {
    cim: fej('Használati útmutató'),
    leiras:
      'Feltöltés és e-mailes beküldés, ellenőrzés és jóváhagyás, export a könyvelőprogramba, csomagok és beállítások: így használd a SzámlaFolyót.',
  },
  '/aszf': {
    cim: fej('Általános Szerződési Feltételek'),
    leiras:
      'A SzámlaFolyó általános szerződési feltételei: a szerződés létrejötte, a díjak és keretek, a felmondás, a szolgáltatóváltás és a felelősség.',
  },
  '/adatkezeles': {
    cim: fej('Adatkezelési tájékoztató'),
    leiras:
      'Milyen adatot kezel a SzámlaFolyó, milyen célból és jogalapon, meddig őrzi, kik az adatfeldolgozók, és milyen jogaid vannak.',
  },
  '/impresszum': {
    cim: fej('Impresszum'),
    leiras:
      'A SzámlaFolyó üzemeltetőjének adatai, a tárhelyszolgáltatók, az elérhetőségek, a panaszkezelés és a békéltető testület.',
  },

  // Belépés és fiók
  '/meghivo/:token': { cim: fej('Meghívó'), leiras: ALAP.leiras },
  '/bejelentkezes': { cim: fej('Bejelentkezés'), leiras: ALAP.leiras },
  '/regisztracio': { cim: fej('Regisztráció'), leiras: ALAP.leiras },
  '/elfelejtett-jelszo': { cim: fej('Elfelejtett jelszó'), leiras: ALAP.leiras },
  '/jelszo-beallitas': { cim: fej('Új jelszó beállítása'), leiras: ALAP.leiras },
  '/ceg-letrehozas': { cim: fej('Cég létrehozása'), leiras: ALAP.leiras },
  '/fiok-torles': { cim: fej('Fiók törlése'), leiras: ALAP.leiras },

  // Az alkalmazás – a nevek a menüéi (`Elrendezes.tsx`)
  '/beerkezo': { cim: fej('Beérkező'), leiras: ALAP.leiras },
  '/ellenorzes/:id': { cim: fej('Ellenőrzés'), leiras: ALAP.leiras },
  '/tetelek': { cim: fej('Tételek'), leiras: ALAP.leiras },
  '/export': { cim: fej('Export'), leiras: ALAP.leiras },
  '/archivum': { cim: fej('Archívum'), leiras: ALAP.leiras },
  '/beallitasok': { cim: fej('Beállítások'), leiras: ALAP.leiras },
};

/** Egy tényleges címhez (`/ellenorzes/123`) tartozó fejléc. Ismeretlen címre az alap. */
export function oldalfej(pathname: string): Oldalfej {
  const pontos = OLDALFEJEK[pathname];
  if (pontos !== undefined) return pontos;

  const darabok = pathname.split('/');
  for (const [minta, ertek] of Object.entries(OLDALFEJEK)) {
    const mdarabok = minta.split('/');
    if (mdarabok.length === darabok.length && mdarabok.every((d, i) => d.startsWith(':') ? darabok[i] !== '' : d === darabok[i])) {
      return ertek;
    }
  }
  return ALAP;
}
