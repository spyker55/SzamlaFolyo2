import { AFA_KATEGORIAK, DOKUMENTUM_TIPUSOK } from './enumok.ts';
import { kulcsErtelmez } from './afaBontas.ts';
import { datumErtelmez } from './ido.ts';
import { ertelmez as osszegErtelmez } from './osszeg.ts';
import { formaz as adoszamFormaz } from './adoszam.ts';
import { BONTAS_MAX_SOR, DATUM_MEZOK, MEZOK, OSSZEG_MEZOK, type Mezo } from './sema.ts';

/**
 * Az ellenőrző képernyő űrlapja: a beírt értékek értelmezése és ellenőrzése.
 *
 * **Ugyanez a modul szolgálja ki a képernyőt és a mentést** — hogy a jelzés ne
 * másról szóljon, mint ami mentődni fog. A régiben ez a `parseoltBontas()` és az
 * `ellenorzottMezok()` volt, ott is ugyanezzel az indokkal.
 *
 * Az űrlapon minden **sztring**, mert az ember úgy gépel, ahogy a papíron látja
 * („1 270,50"), nem ahogy tárolni fogjuk. Az értelmezés itt történik.
 */

export type UrlapMezok = Record<Mezo, string>;

export type UrlapBontasSor = {
  kulcs: string;
  kategoria: string;
  netto: string;
  afa: string;
};

export type TarolhatoBontasSor = {
  kulcs: number;
  kategoria: string | null;
  netto: string;
  afa: string | null;
};

export type MezokEredmeny =
  | { ok: true; mezok: Record<Mezo, string | null> }
  | { ok: false; hibak: Partial<Record<Mezo, string>> };

/** Üres űrlap: minden mező üres sztring. */
export function uresUrlap(): UrlapMezok {
  return Object.fromEntries(MEZOK.map((m) => [m, ''])) as UrlapMezok;
}

/** Egy tárolt bizonylatsorból űrlapalak. A `null` üres sztring lesz. */
export function urlapraTolt(sor: Partial<Record<Mezo, unknown>>): UrlapMezok {
  const urlap = uresUrlap();

  for (const mezo of MEZOK) {
    const ertek = sor[mezo];
    urlap[mezo] = ertek === null || ertek === undefined ? '' : String(ertek);
  }

  return urlap;
}

/** Egy tárolt ÁFA-bontásból szerkeszthető sorok. */
export function bontastUrlapra(bontas: unknown): UrlapBontasSor[] {
  if (!Array.isArray(bontas)) return [];

  return bontas.map((sor) => {
    const rekord = (sor ?? {}) as Record<string, unknown>;
    const szoveg = (e: unknown) => (e === null || e === undefined ? '' : String(e));

    return {
      kulcs: szoveg(rekord['kulcs']),
      kategoria: szoveg(rekord['kategoria']),
      netto: szoveg(rekord['netto']),
      afa: szoveg(rekord['afa']),
    };
  });
}

export function uresBontasSor(): UrlapBontasSor {
  return { kulcs: '', kategoria: '', netto: '', afa: '' };
}

export function hozzaadhatoSor(sorok: readonly UrlapBontasSor[]): boolean {
  // Ugyanaz a felső határ, amit a gépi út is betart: az ember ne tudjon olyat
  // előállítani, amit a séma nem fogadna el.
  return sorok.length < BONTAS_MAX_SOR;
}

/**
 * A szerkesztett bontás értelmezése.
 *
 * A **teljesen üres sor némán kiesik**: a törléshez ne kelljen gombot keresni.
 * Ami félig kitöltött, az viszont hiba — a kulcs és az adóalap nélküli sor se
 * nem könyvelhető, se nem ellenőrizhető (ugyanezt a két mezőt követeli meg a
 * gépi úton a `tisztitBontas()` is).
 */
export function parseoltBontas(sorok: readonly UrlapBontasSor[]): {
  sorok: TarolhatoBontasSor[];
  hibak: Record<string, string>;
} {
  const eredmeny: TarolhatoBontasSor[] = [];
  const hibak: Record<string, string> = {};

  sorok.forEach((sor, i) => {
    const nyers = {
      kulcs: sor.kulcs.trim(),
      kategoria: sor.kategoria.trim(),
      netto: sor.netto.trim(),
      afa: sor.afa.trim(),
    };

    if (nyers.kulcs + nyers.kategoria + nyers.netto + nyers.afa === '') {
      return;
    }

    const kulcs = kulcsErtelmez(nyers.kulcs);
    const netto = osszegErtelmez(nyers.netto);
    const afa = osszegErtelmez(nyers.afa);

    if (kulcs === null) {
      hibak[`${i}.kulcs`] = 'Az ÁFA-kulcsot százalékban kell megadni.';
    }

    if (!netto.ok || netto.ertek === null) {
      hibak[`${i}.netto`] = netto.ok
        ? 'Az adóalapot meg kell adni.'
        : 'Ezt az összeget nem tudjuk értelmezni.';
    }

    if (!afa.ok) {
      hibak[`${i}.afa`] = 'Ezt az összeget nem tudjuk értelmezni.';
    }

    if (kulcs === null || netto.ertek === null || !afa.ok) {
      return;
    }

    eredmeny.push({
      kulcs,
      kategoria: (AFA_KATEGORIAK as readonly string[]).includes(nyers.kategoria)
        ? nyers.kategoria
        : null,
      netto: netto.ertek,
      afa: afa.ertek,
    });
  });

  return { sorok: eredmeny, hibak };
}

/**
 * A beírt értékek ellenőrzése és a mi alakunkra hozása.
 *
 * Ha valamit nem értünk, **itt megállunk**: rosszabb csendben nullát menteni,
 * mint visszakérdezni. A bukott *validátor* viszont nem áll meg — az a papírról
 * szól, és a papír az emberé.
 */
export function ellenorzottMezok(urlap: UrlapMezok): MezokEredmeny {
  const hibak: Partial<Record<Mezo, string>> = {};
  const eredmeny = {} as Record<Mezo, string | null>;

  for (const mezo of MEZOK) {
    const ertek = (urlap[mezo] ?? '').trim();
    eredmeny[mezo] = ertek === '' ? null : ertek;
  }

  if (eredmeny.doc_type === null) {
    hibak.doc_type = 'A bizonylat típusát meg kell adni.';
  } else if (!(DOKUMENTUM_TIPUSOK as readonly string[]).includes(eredmeny.doc_type)) {
    hibak.doc_type = 'Ismeretlen bizonylattípus.';
  }

  for (const mezo of DATUM_MEZOK) {
    if (eredmeny[mezo] === null) continue;

    const datum = datumErtelmez(eredmeny[mezo]);

    if (datum === null) {
      hibak[mezo] = 'Ez nem értelmezhető dátum (ÉÉÉÉ-HH-NN).';
      continue;
    }

    eredmeny[mezo] = datum;
  }

  for (const mezo of OSSZEG_MEZOK) {
    if (eredmeny[mezo] === null) continue;

    const osszeg = osszegErtelmez(eredmeny[mezo]);

    if (!osszeg.ok) {
      hibak[mezo] = 'Ezt az összeget nem tudjuk értelmezni.';
      continue;
    }

    eredmeny[mezo] = osszeg.ertek;
  }

  if (eredmeny.currency !== null) {
    eredmeny.currency = eredmeny.currency.toUpperCase().slice(0, 3);
  }

  for (const mezo of ['supplier_tax_number', 'customer_tax_number'] as const) {
    if (eredmeny[mezo] !== null) {
      eredmeny[mezo] = adoszamFormaz(eredmeny[mezo]);
    }
  }

  return Object.keys(hibak).length === 0 ? { ok: true, mezok: eredmeny } : { ok: false, hibak };
}

/**
 * A javítások kigyűjtése: mit írt át az ember a gépi értékhez képest.
 *
 * **Ez az egyetlen jel arról, hogy a küszöbök jól vannak-e beállítva.** Ha ez a
 * szám kúszik, a kapukat kell szigorítani, nem a felhasználót hibáztatni.
 */
export type Javitas = {
  field: string;
  machine_value: string | null;
  human_value: string | null;
};

export function javitasok(
  gepi: Record<string, unknown>,
  emberi: Record<Mezo, string | null>,
  gepiBontas: unknown,
  emberiBontas: TarolhatoBontasSor[] | null,
): Javitas[] {
  const lista: Javitas[] = [];

  for (const mezo of MEZOK) {
    const gepiErtek = gepi[mezo] ?? null;
    const emberiErtek = emberi[mezo];

    if (szoveg(gepiErtek) === szoveg(emberiErtek)) continue;

    lista.push({
      field: mezo,
      machine_value: gepiErtek === null ? null : String(gepiErtek),
      human_value: emberiErtek,
    });
  }

  // A bontás nincs a MEZOK között (a fenti ciklus skalárt feltételez), a
  // javítását viszont ugyanúgy el akarjuk tenni — egyetlen sorban, mindkét
  // oldalt JSON alakban.
  //
  // Az összehasonlítás **normalizált**: a `JSON.stringify(27.0)` „27"-et ír,
  // tehát a tárolt kulcs számként jön vissza, és a nyers egyezésvizsgálat
  // minden jóváhagyáskor fantomjavítást szülne.
  const gepiSzoveg = bontasSzoveg(gepiBontas);
  const emberiSzoveg = bontasSzoveg(emberiBontas);

  if (gepiSzoveg !== emberiSzoveg) {
    lista.push({
      field: 'afa_bontas',
      machine_value: gepiSzoveg,
      human_value: emberiSzoveg,
    });
  }

  return lista;
}

function szoveg(ertek: unknown): string {
  return ertek === null || ertek === undefined ? '' : String(ertek);
}

/** A bontás összehasonlítható és tárolható szövege. Az üres és a null egy. */
function bontasSzoveg(bontas: unknown): string | null {
  if (!Array.isArray(bontas) || bontas.length === 0) {
    return null;
  }

  const rendezett = bontas.map((sor) => {
    const rekord = (sor ?? {}) as Record<string, unknown>;
    return {
      kulcs: Number(rekord['kulcs'] ?? 0),
      kategoria: rekord['kategoria'] ?? null,
      netto: szam(rekord['netto']),
      afa: rekord['afa'] === null || rekord['afa'] === undefined ? null : szam(rekord['afa']),
    };
  });

  return JSON.stringify(rendezett);
}

function szam(ertek: unknown): number {
  const n = Number(ertek);
  return Number.isFinite(n) ? n : 0;
}
