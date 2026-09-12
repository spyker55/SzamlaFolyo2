import { AFA_KATEGORIAK, DOKUMENTUM_TIPUSOK } from './enumok.ts';

/**
 * A kiolvasás kötött alakja. Ez egyszerre a modellnek adott JSON Schema és a
 * visszajövő válasz ellenőrzési szabálya — **egy helyen áll, hogy a kettő ne
 * tudjon szétcsúszni.**
 */

/**
 * A skalár mezők, amiket a modell kitölt — és amiket az ember egy-egy beviteli
 * mezőben javít. Az ÁFA-bontás szándékosan **nincs** köztük: az ismétlődő sorok
 * halmaza, és minden itteni ciklus skalárt feltételez.
 */
export const MEZOK = [
  'doc_type',
  'supplier_name',
  'supplier_tax_number',
  'customer_name',
  'customer_tax_number',
  'doc_number',
  'issue_date',
  'fulfillment_date',
  'due_date',
  'payment_method',
  'currency',
  'net_amount',
  'vat_amount',
  'gross_amount',
  'fizetendo',
] as const;

export type Mezo = (typeof MEZOK)[number];

/** Amit összegként kell értelmezni és formázni. */
export const OSSZEG_MEZOK = ['net_amount', 'vat_amount', 'gross_amount', 'fizetendo'] as const;

/** Amit dátumként kell értelmezni és formázni. */
export const DATUM_MEZOK = ['issue_date', 'fulfillment_date', 'due_date'] as const;

/**
 * Ennyi bontássornál többet nem fogadunk el. Egy bizonylaton legfeljebb néhány
 * ÁFA-kulcs van; ennél hosszabb lista azt jelenti, hogy a modell **tételsorokat
 * sorolt fel** — azt nem tároljuk el.
 */
export const BONTAS_MAX_SOR = 12;

export const FUGGVENY_NEV = 'record_extraction';

/** Magyar címkék a felülethez. Az export fejlécei külön állnak. */
export const CIMKEK: Record<string, string> = {
  doc_type: 'Bizonylat típusa',
  supplier_name: 'Szállító',
  supplier_tax_number: 'Szállító adószáma',
  customer_name: 'Vevő',
  customer_tax_number: 'Vevő adószáma',
  doc_number: 'Bizonylatszám',
  issue_date: 'Kelt',
  fulfillment_date: 'Teljesítés',
  due_date: 'Fizetési határidő',
  payment_method: 'Fizetési mód',
  currency: 'Pénznem',
  net_amount: 'Nettó',
  vat_amount: 'ÁFA',
  gross_amount: 'Bruttó',
  fizetendo: 'Fizetendő',
  afa_bontas: 'ÁFA-bontás',
};

export type BontasSor = {
  kulcs: unknown;
  kategoria: string | null;
  netto: unknown;
  afa: unknown;
};

export type TisztaValasz = {
  mezok: Record<Mezo, unknown>;
  bontas: BontasSor[] | null;
  tobb_irat_gyanu: boolean;
  nehezen_olvashato: boolean;
  konfidencia: Record<string, number>;
};

/**
 * A modellnek adott JSON Schema.
 *
 * Szándékosan **szűk**: minden mező egyetlen típusú, és az opcionalitást az
 * fejezi ki, hogy nincs a `required` listán — nem pedig `['string','null']`
 * alakú unió-típus.
 *
 * Ennek szolgáltatói oka van: a Gemini függvényhívása nem támogatja az
 * unió-típusokat, és a null-t tartalmazó enumot sem, tehát az a séma nála
 * **elutasított kérés** lenne, nem rosszabb válasz. Így a modell szabadon
 * cserélhető konfigurációból, és ez a séma a Claude-nak is helyes — csak
 * kevesebbet enged meg.
 */
export function toolSema(): Record<string, unknown> {
  const szoveg = (leiras: string) => ({ type: 'string', description: leiras });
  const szam = (leiras: string) => ({ type: 'number', description: leiras });

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      doc_type: {
        type: 'string',
        enum: [...DOKUMENTUM_TIPUSOK],
        description: 'A bizonylat típusa a megadott listából.',
      },
      supplier_name: szoveg('A kiállító (eladó, szolgáltató) neve, ahogy a bizonylaton szerepel.'),
      supplier_tax_number: szoveg('A kiállító adószáma. Magyar adószám 12345678-2-42 alakban.'),
      customer_name: szoveg('A vevő (címzett) neve. Nyugtán jellemzően nincs ilyen.'),
      customer_tax_number: szoveg('A vevő adószáma, ha szerepel a bizonylaton.'),
      doc_number: szoveg('A bizonylat saját sorszáma (számlaszám).'),
      issue_date: szoveg('A kiállítás kelte, ÉÉÉÉ-HH-NN alakban.'),
      fulfillment_date: szoveg('A teljesítés dátuma, ÉÉÉÉ-HH-NN alakban.'),
      due_date: szoveg('A fizetési határidő, ÉÉÉÉ-HH-NN alakban.'),
      payment_method: szoveg(
        'Fizetési mód, ahogy a bizonylaton áll (átutalás, készpénz, bankkártya).',
      ),
      currency: {
        type: 'string',
        description: 'Három betűs ISO pénznemkód. A „Ft" HUF.',
      },
      net_amount: szam('Nettó végösszeg tizedesponttal, csoportosítás nélkül.'),
      vat_amount: szam('ÁFA végösszeg. Fordított adózásnál 0.'),
      gross_amount: szam('Bruttó végösszeg: nettó + ÁFA.'),
      fizetendo: szam(
        'A ténylegesen fizetendő összeg, ha eltér a bruttótól (kerekítés vagy levont előleg miatt). Ha nem tér el, hagyd ki.',
      ),
      afa_bontas: {
        type: 'array',
        description:
          'ÁFA-kulcsonként egy sor, a tételsorokat kulcsonként összevonva. Soha nem tételsoronként egy sor.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kulcs: {
              type: 'number',
              description: 'Az ÁFA-kulcs százalékban: 27, 18, 5 vagy 0.',
            },
            kategoria: {
              type: 'string',
              enum: [...AFA_KATEGORIAK],
              description: 'Az ÁFA-kategória kódja a megadott listából. Ha nem derül ki, hagyd ki.',
            },
            netto: szam('Az ehhez a kulcshoz tartozó adóalap (nettó) összesen.'),
            afa: szam('Az ehhez a kulcshoz tartozó ÁFA összesen.'),
          },
          // Ugyanaz a két mező, amit a `tisztitBontas()` is megkövetel: kulcs és
          // adóalap nélkül a sor semmire nem használható.
          required: ['kulcs', 'netto'],
        },
      },
      tobb_irat_gyanu: {
        type: 'boolean',
        description: 'Igaz, ha a fájlban több különálló bizonylat van.',
      },
      nehezen_olvashato: {
        type: 'boolean',
        description:
          'Igaz, ha a bizonylat lényegi része kézzel írott, elmosódott, ferdén szkennelt vagy levágott — vagyis ha az átírás bizonytalan.',
      },
      confidence: {
        type: 'object',
        additionalProperties: false,
        description:
          'Mezőnkénti magabiztosság 0 és 1 között. Rossz szkennél legyen alacsony. Csak a kitöltött mezőkhöz add meg.',
        // Szabad kulcsú objektumként (csak `additionalProperties`, `properties`
        // nélkül) ezt a Gemini némán üresen hagyta — mind a három modellje,
        // miközben a Claude kitöltötte. Az üres magabiztosság nem hiba, hanem
        // ennél rosszabb: minden mező a 0,5-ös alapértelmezésre esik, és az
        // ellenőrző képernyő színkódolása pont ott veszíti el az információt,
        // amiért van.
        properties: konfidenciaMezok(),
      },
    },
    // Kötelező mind a kettő: a hallgatás itt nem lehet válasz. „Nehezen
    // olvasható-e ez a papír" sokkal könnyebb kérdés, mint „tévedtem-e", és a
    // modellek éppen ezért tudják megbízhatóbban megválaszolni.
    required: ['tobb_irat_gyanu', 'nehezen_olvashato', 'confidence'],
  };
}

/**
 * A magabiztossági objektum mezői — pontosan azok, amikre a `tisztit()` figyel.
 * A listát nem másoljuk, hanem a `MEZOK`-ból származtatjuk, hogy egy új mező
 * felvételekor ne itt csússzon szét.
 */
function konfidenciaMezok(): Record<string, unknown> {
  const mezok: Record<string, unknown> = {};

  // Leírás nélkül: a kulcs neve megegyezik a fenti mezőével, tehát a magyarázat
  // csak ismételné magát — 16-szor, minden egyes híváson.
  for (const mezo of [...MEZOK, 'afa_bontas']) {
    mezok[mezo] = { type: 'number', minimum: 0, maximum: 1 };
  }

  return mezok;
}

/**
 * A modell válaszának megtisztítása: ismeretlen mező kiesik, a típusok a
 * helyükre kerülnek. Amit nem értünk, azt nem írjuk be — a null itt mindig
 * biztonságosabb, mint a találgatás.
 *
 * **A kihagyott mező ugyanaz, mint a null.** Ezen áll az egész v4-es változás:
 * ha a séma nem enged nullt, a modell a nem látott mezőt kihagyja, és a
 * tisztításnak ugyanoda kell jutnia — különben a hiányzó mező hibává válna.
 */
export function tisztit(nyers: Record<string, unknown>): TisztaValasz {
  const mezok = {} as Record<Mezo, unknown>;

  for (const mezo of MEZOK) {
    let ertek = nyers[mezo] ?? null;

    if (typeof ertek === 'string') {
      ertek = ertek.trim();
      if (ertek === '' || (ertek as string).toLowerCase() === 'null') {
        ertek = null;
      }
    }

    mezok[mezo] = ertek;
  }

  // A típus kötött szótárból jön; amit nem ismerünk fel, azt eldobjuk,
  // különben érvénytelen érték kerülne az adatbázisba.
  const tipus = mezok.doc_type;
  mezok.doc_type =
    typeof tipus === 'string' && (DOKUMENTUM_TIPUSOK as readonly string[]).includes(tipus)
      ? tipus
      : null;

  const konfidencia: Record<string, number> = {};
  const nyersKonfidencia = nyers['confidence'];

  if (nyersKonfidencia !== null && typeof nyersKonfidencia === 'object') {
    for (const [mezo, ertek] of Object.entries(nyersKonfidencia as Record<string, unknown>)) {
      const ismert = (MEZOK as readonly string[]).includes(mezo) || mezo === 'afa_bontas';
      const szam = typeof ertek === 'number' ? ertek : Number(ertek);

      if (ismert && ertek !== null && ertek !== '' && Number.isFinite(szam)) {
        konfidencia[mezo] = Math.max(0, Math.min(1, szam));
      }
    }
  }

  return {
    mezok,
    bontas: tisztitBontas(nyers['afa_bontas'] ?? null),
    tobb_irat_gyanu: Boolean(nyers['tobb_irat_gyanu'] ?? false),
    nehezen_olvashato: Boolean(nyers['nehezen_olvashato'] ?? false),
    konfidencia,
  };
}

/**
 * Az ÁFA-bontás alakra hozása: ismeretlen kulcsok kiesnek, a kategória a kötött
 * szótárból jön. Az **értékek** értelmezése (kulcs számmá, összegek a mi
 * alakunkra) nem itt történik, hanem a kiolvasóban — ugyanott, ahol a többi
 * összegé és dátumé.
 */
export function tisztitBontas(nyers: unknown): BontasSor[] | null {
  if (!Array.isArray(nyers) || nyers.length === 0) {
    return null;
  }

  const sorok: BontasSor[] = [];

  for (const sor of nyers) {
    if (sorok.length >= BONTAS_MAX_SOR) {
      break;
    }

    if (sor === null || typeof sor !== 'object' || Array.isArray(sor)) {
      continue;
    }

    const rekord = sor as Record<string, unknown>;
    const kulcs = rekord['kulcs'] ?? null;
    const netto = rekord['netto'] ?? null;

    // Kulcs vagy adóalap nélkül a sor semmire nem használható: se könyvelni, se
    // ellenőrizni nem lehet. Az üres sor kiesik.
    if (ures(kulcs) || ures(netto)) {
      continue;
    }

    const kategoria = rekord['kategoria'] ?? null;
    const afa = rekord['afa'] ?? null;

    sorok.push({
      kulcs,
      kategoria:
        typeof kategoria === 'string' && (AFA_KATEGORIAK as readonly string[]).includes(kategoria)
          ? kategoria
          : null,
      netto,
      afa: ures(afa) ? null : afa,
    });
  }

  return sorok.length === 0 ? null : sorok;
}

function ures(ertek: unknown): boolean {
  return ertek === null || ertek === undefined || (typeof ertek === 'string' && ertek.trim() === '');
}
