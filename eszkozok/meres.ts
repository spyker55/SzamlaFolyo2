import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { ellenoriz } from '../shared/uzleti/fajltipus.ts';
import { feldolgoz, type LancEredmeny } from '../shared/uzleti/lanc.ts';
import {
  type Gondolkodas,
  kiolvas,
  KIOLVASAS_MAX_TOKEN,
  KiolvasasHiba,
} from '../shared/uzleti/openrouter.ts';
import { xmlbolKiolvas } from '../shared/uzleti/xml/beolvasas.ts';
import {
  felderit,
  igenyelModellt,
  type Felderites,
} from '../supabase/functions/kiolvas/felderites.ts';
import type { BukottFutas, Futas, Meres } from './jelentes.ts';

/**
 * A `kiolvasas:proba` **logikája** — a terminál nélkül.
 *
 * A script maga csak argumentumot olvas és szöveget ír; minden döntés itt van,
 * és ezért mérhető tesztből, valódi modellhívás elköltése nélkül.
 */

export type Kapcsolok = {
  utvonal: string;
  ismetles: number;
  modell: string | null;
  json: boolean;
  /** `null`: nincs `reasoning` a kérésben – pontosan úgy, mint élesben. */
  gondolkodas: Gondolkodas | null;
};

/** A `Gondolkodas` olvasható alakja a jelentés fejlécébe. */
export function gondolkodasSzo(g: Gondolkodas | null): string {
  if (g === null) return 'alap (nincs korlátozva – mint élesben)';
  return 'effort' in g ? `effort: ${g.effort}` : `legfeljebb ${g.max_tokens} token`;
}

export class ProbaHiba extends Error {}

/**
 * Parancssori hiba — **külön osztály**, mert csak erre jár a használati
 * útmutató. Egy sikertelen modellhívás után kiírni a kapcsolókat kioktatás:
 * nem a felhasználó gépelt rosszul.
 */
export class KapcsoloHiba extends ProbaHiba {}

/**
 * Egy elbukott modellfutás hibája – a `merj` elkapja és feljegyzi, a mérés
 * megy tovább. Minden más `ProbaHiba` (hiányzó kulcs, rossz fájl) továbbra is
 * megállít: az nem mérési eredmény.
 */
export class FutasHiba extends ProbaHiba {
  constructor(readonly bukott: BukottFutas) {
    super(`A modellhívás nem sikerült: ${bukott.hiba}`);
  }
}

/**
 * Egy fájl végigmérése.
 *
 * `figyelmeztet` a mellékmondatoké: ami nem az eredmény, de tudni kell róla
 * (például hogy a strukturált XML-t egyik értelmezőnk sem ismerte fel, tehát
 * fizetni fogunk érte). Azért paraméter, hogy a `stderr` a scriptben maradjon.
 */
export async function merj(
  kapcsolok: Kapcsolok,
  figyelmeztet: (uzenet: string) => void = () => {},
): Promise<Meres> {
  const bajtok = new Uint8Array(await readFile(kapcsolok.utvonal));
  const nev = basename(kapcsolok.utvonal);

  // ⚠️ A típust a **tartalom** dönti el, nem a kiterjesztés — ugyanazzal a
  // függvénnyel, ami a feltöltésnél is dönt. Ha ez a fájl a Beérkezőben
  // elakadna, itt is akadjon el: egy mérőeszköz, ami elnézőbb a valóságnál,
  // rosszabb a semminél.
  const tipus = ellenoriz(bajtok, bajtok.byteLength, nev);
  if (!tipus.ok) {
    throw new ProbaHiba(tipus.hiba);
  }

  const felderites = await felderit(bajtok, tipus.tipus.mime);
  const futasok: Futas[] = [];
  const bukottFutasok: BukottFutas[] = [];

  for (let i = 0; i < kapcsolok.ismetles; i++) {
    let futas: Futas;

    try {
      futas = await egyFutas(
        bajtok,
        tipus.tipus.mime,
        nev,
        felderites,
        kapcsolok.modell,
        figyelmeztet,
        kapcsolok.gondolkodas,
      );
    } catch (hiba) {
      if (!(hiba instanceof FutasHiba)) throw hiba;

      bukottFutasok.push(hiba.bukott);
      figyelmeztet(`${i + 1}. futás elbukott: ${hiba.bukott.hiba}`);
      continue;
    }

    futasok.push(futas);

    // Az XML-ág determinisztikus: ugyanaz a fa, ugyanaz az értelmező, ugyanaz
    // az eredmény. Az ismétlés ott nem mérés, csak várakozás.
    if (futas.promptVerzio === null && kapcsolok.ismetles > 1) {
      figyelmeztet('Az XML-ág determinisztikus — egy futás elég, az ismétlés kimarad.');
      break;
    }
  }

  return {
    fajl: { nev, bajt: bajtok.byteLength, mime: tipus.tipus.mime },
    beallitas: { modell: kapcsolok.modell, gondolkodas: gondolkodasSzo(kapcsolok.gondolkodas) },
    felderites,
    futasok,
    bukottFutasok,
  };
}

/**
 * Egy futás: a felderítés utáni olvasó, majd a teljes lánc.
 *
 * Az ágválasztás **szó szerint ugyanaz**, mint a `kiolvas` Edge Functionben
 * (`igenyelModellt()` + `xmlbolKiolvas()`), és ez nem véletlen: a közös fél
 * ezért került a `shared/uzleti/xml/beolvasas.ts`-be. Egy mérőeszköz, ami a
 * hasonmását futtatja annak, ami élesben fut, nem azt méri, amit kell.
 */
export async function egyFutas(
  bajtok: Uint8Array,
  mime: string,
  nev: string,
  felderites: Felderites,
  modellFelulirasa: string | null,
  figyelmeztet: (uzenet: string) => void = () => {},
  gondolkodas: Gondolkodas | null = null,
): Promise<Futas> {
  const kezdet = Date.now();

  if (!igenyelModellt(felderites.jelleg) && felderites.xml !== null) {
    const eredmeny = xmlbolKiolvas(felderites.xml, felderites.xmlBajt ?? bajtok.byteLength);

    if (eredmeny !== null) {
      return {
        olvaso: eredmeny.nev,
        futtatottModell: null,
        promptVerzio: null,
        bemenetToken: null,
        kimenetToken: null,
        gondolkodasToken: null,
        koltseg: null,
        idoMs: Date.now() - kezdet,
        eredmeny: lancon(eredmeny.nyers, felderites),
      };
    }

    figyelmeztet('A strukturált XML-t egyik értelmező sem ismerte fel — megy a modellhez.');
  }

  const apiKulcs = process.env['OPENROUTER_API_KEY'] ?? '';
  if (apiKulcs === '') {
    throw new ProbaHiba(
      'Nincs OPENROUTER_API_KEY a környezetben. Tedd a `.env`-be — és ne másold sehova máshova.',
    );
  }

  try {
    const valasz = await kiolvas({
      tartalom: bajtok,
      mime,
      fajlnev: nev,
      // ⚠️ A cégnév és az adószám élesben a saját cég adata, és a prompt ezzel
      // különbözteti meg a szállítót a vevőtől. A mérésben nincs cég, tehát
      // `null` megy — a kiolvasás így **nehezebb**, mint élesben. Kitalált
      // céggel nem azt mérnénk, amit a modell tud, hanem amit súgtunk neki.
      cegNev: null,
      cegAdoszam: null,
      modell: modellFelulirasa,
      apiKulcs,
      gondolkodas,
    });

    return {
      olvaso: valasz.modell,
      futtatottModell: valasz.futtatottModell,
      promptVerzio: valasz.promptVerzio,
      bemenetToken: valasz.bemenetToken,
      kimenetToken: valasz.kimenetToken,
      gondolkodasToken: valasz.gondolkodasToken,
      koltseg: valasz.koltseg,
      idoMs: Date.now() - kezdet,
      eredmeny: lancon(valasz.nyers, felderites),
    };
  } catch (hiba) {
    if (hiba instanceof KiolvasasHiba) {
      throw new FutasHiba({
        hiba: hiba.message,
        reszlet: hiba.reszlet,
        atmeneti: hiba.atmeneti,
        leallas: hiba.nyom?.leallasOka ?? null,
        kimenetToken: hiba.nyom?.kimenetToken ?? null,
        gondolkodasToken: hiba.nyom?.gondolkodasToken ?? null,
        koltseg: hiba.nyom?.koltseg ?? null,
        idoMs: Date.now() - kezdet,
      });
    }
    throw hiba;
  }
}

/**
 * A nyers válasz végig a **valódi** láncon: tisztítás → normalizálás →
 * validátorok → konfidencia → kapuk → kredit.
 *
 * A kapubemenetek szintetikusak, mert adatbázis nincs — és a jelentés ezért
 * nem is írja ki a kapu döntését. A `duplikatum: false` az egyetlen, ami a
 * mérés helyzetéből **igaz**: nincs mihez képest duplikátum.
 */
export function lancon(nyers: Record<string, unknown>, felderites: Felderites): LancEredmeny {
  return feldolgoz({
    nyers,
    oldalszam: felderites.oldalszam,
    duplikatum: false,
    autoJovahagyasBe: false,
    elozmeny: {
      ismertSzallito: false,
      bizonylatszamMarLatott: false,
      osszegKilog: false,
      keltKilog: false,
      penznemSzokatlan: false,
      cegEddigiBizonylatai: 0,
    },
    mintaSorszam: 1,
  });
}

/** Parancssori kapcsolók. Ismeretlen kapcsolóra megáll: a néma elhagyás itt mérési hiba volna. */
export function argumentumok(argv: readonly string[]): Kapcsolok {
  let utvonal: string | null = null;
  let ismetles = 1;
  let modell: string | null = null;
  let json = false;
  let gondolkodas: Gondolkodas | null = null;

  for (let i = 0; i < argv.length; i++) {
    const darab = argv[i]!;

    if (darab === '--json') {
      json = true;
    } else if (darab === '--ismetles') {
      const ertek = Number(argv[++i]);
      if (!Number.isInteger(ertek) || ertek < 1 || ertek > 20) {
        throw new KapcsoloHiba('Az --ismetles egész szám 1 és 20 között.');
      }
      ismetles = ertek;
    } else if (darab === '--modell') {
      const ertek = argv[++i];
      if (ertek === undefined || ertek === '' || ertek.startsWith('--')) {
        throw new KapcsoloHiba('A --modell után modellazonosító kell.');
      }
      modell = ertek;
    } else if (darab === '--gondolkodas') {
      gondolkodas = gondolkodasErtelmez(argv[++i]);
    } else if (darab.startsWith('--')) {
      throw new KapcsoloHiba(`Ismeretlen kapcsoló: ${darab}`);
    } else if (utvonal === null) {
      utvonal = darab;
    } else {
      throw new KapcsoloHiba('Egyszerre egy fájl mérhető.');
    }
  }

  if (utvonal === null) {
    throw new KapcsoloHiba('Melyik fájlt mérjem?');
  }

  return { utvonal, ismetles, modell, json, gondolkodas };
}

/**
 * `low` / `medium` / `high`, vagy egy tokenszám.
 *
 * A tokenszám felső határa hagy helyet a válasznak: a keret
 * (`KIOLVASAS_MAX_TOKEN`) a gondolkodást **és** a választ is fedi, és egy
 * kiolvasás válasza mérve ~300–420 token. Egy nagyobb gondolkodási keret
 * pont azt a helyzetet idézné elő, amit mérni akarunk.
 */
function gondolkodasErtelmez(ertek: string | undefined): Gondolkodas {
  if (ertek === 'low' || ertek === 'medium' || ertek === 'high') {
    return { effort: ertek };
  }

  const felso = KIOLVASAS_MAX_TOKEN - 512;
  const szam = Number(ertek);

  if (ertek !== undefined && ertek !== '' && Number.isInteger(szam) && szam >= 0 && szam <= felso) {
    return { max_tokens: szam };
  }

  throw new KapcsoloHiba(
    `A --gondolkodas után low, medium, high, vagy egy egész tokenszám 0 és ${felso} között.`,
  );
}
