import { describe, expect, test } from 'vitest';
import { BONTAS_MAX_SOR, MEZOK, tisztit, tisztitBontas, toolSema } from './sema.ts';

/**
 * A vektorok a régi `SemaBontasTest.php` és `SemaHordozhatosagTest.php`
 * fájlokból származnak.
 */

describe('tisztitBontas', () => {
  test('a jó sor átmegy, az értékek változatlanul', () => {
    const sorok = tisztitBontas([{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }]);

    expect(sorok).toEqual([{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }]);
  });

  test('ismeretlen kategória null lesz, de a sor marad', () => {
    const sorok = tisztitBontas([{ kulcs: 27, kategoria: 'XYZ', netto: 1000, afa: 270 }]);

    // A sor megmarad — a kulcs és az összeg használható. Csak a kitalált
    // kategóriakódot dobjuk el, mert abból hibás könyvelés lenne.
    expect(sorok).not.toBeNull();
    expect(sorok![0]!.kategoria).toBeNull();
    expect(sorok![0]!.kulcs).toBe(27);
  });

  /** Kulcs vagy adóalap nélkül a sor se nem könyvelhető, se nem ellenőrizhető. */
  test('a hiányos sor kiesik', () => {
    const sorok = tisztitBontas([
      { kulcs: null, kategoria: 'S', netto: 1000, afa: 270 },
      { kulcs: 5, kategoria: 'S', netto: null, afa: 50 },
      { kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 },
    ]);

    expect(sorok).not.toBeNull();
    expect(sorok).toHaveLength(1);
    expect(sorok![0]!.kulcs).toBe(27);
  });

  test('a nem objektum sor kiesik', () => {
    const sorok = tisztitBontas(['ez nem sor', { kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }]);

    expect(sorok).toHaveLength(1);
  });

  test('ismeretlen kulcsokat eldob a sorból', () => {
    const sorok = tisztitBontas([
      { kulcs: 27, kategoria: 'S', netto: 1000, afa: 270, valami: 'kitalált' },
    ]);

    // A kulcsok sorrendje is rögzített: az export és az ellenőrző képernyő
    // ugyanebben a sorrendben várja őket.
    expect(Object.keys(sorok![0]!)).toEqual(['kulcs', 'kategoria', 'netto', 'afa']);
  });

  /**
   * Ennél hosszabb lista azt jelenti, hogy a modell tételsorokat sorolt fel
   * kulcsonkénti összesítés helyett — azt nem tároljuk el.
   */
  test('a sorok száma korlátozott', () => {
    const sok = Array.from({ length: 50 }, () => ({
      kulcs: 27,
      kategoria: 'S',
      netto: 10,
      afa: 2.7,
    }));

    expect(tisztitBontas(sok)).toHaveLength(BONTAS_MAX_SOR);
    expect(BONTAS_MAX_SOR).toBe(12);
  });

  test('az üres bontás null', () => {
    expect(tisztitBontas(null)).toBeNull();
    expect(tisztitBontas([])).toBeNull();
    expect(tisztitBontas('nem tömb')).toBeNull();
    // Minden sor kiesik ⇒ null, nem üres tömb.
    expect(tisztitBontas([{ kulcs: null, netto: null }])).toBeNull();
  });
});

describe('tisztit', () => {
  test('a bontás a teljes körön is átjön', () => {
    const tiszta = tisztit({
      doc_type: 'szamla',
      net_amount: 1000,
      afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: 1000, afa: 270 }],
      // Az afa_bontas nem skalár mező, mégis lehet magabiztossága.
      confidence: { afa_bontas: 0.9, 'kitalált_mezo': 0.9 },
    });

    expect(tiszta.bontas).toHaveLength(1);
    expect(tiszta.konfidencia['afa_bontas']).toBe(0.9);
    expect(tiszta.konfidencia).not.toHaveProperty('kitalált_mezo');
  });

  /**
   * ⚠️ Ezen áll az egész v4-es változás: ha a séma nem enged nullt, a modell a
   * nem látott mezőt **kihagyja**. A tisztításnak ugyanoda kell jutnia, mintha
   * nullt kapott volna — különben a hiányzó mező hibává válna.
   */
  test('a kihagyott mező ugyanaz, mint a null', () => {
    const kihagyva = tisztit({ doc_type: 'szamla', tobb_irat_gyanu: false, confidence: {} });
    const nullal = tisztit({
      doc_type: 'szamla',
      supplier_name: null,
      net_amount: null,
      fizetendo: null,
      afa_bontas: null,
      tobb_irat_gyanu: false,
      confidence: {},
    });

    expect(nullal).toEqual(kihagyva);

    for (const mezo of MEZOK) {
      expect(kihagyva.mezok, `hiányzik: ${mezo}`).toHaveProperty(mezo);
    }
    expect(kihagyva.mezok.supplier_name).toBeNull();
    expect(kihagyva.bontas).toBeNull();
    expect(kihagyva.nehezen_olvashato).toBe(false);
  });

  test('az ismeretlen bizonylattípust eldobja', () => {
    expect(tisztit({ doc_type: 'kitalált_tipus' }).mezok.doc_type).toBeNull();
    expect(tisztit({ doc_type: 'nyugta' }).mezok.doc_type).toBe('nyugta');
  });

  test('a „null" szöveget is nullnak veszi', () => {
    expect(tisztit({ supplier_name: 'null' }).mezok.supplier_name).toBeNull();
    expect(tisztit({ supplier_name: 'NULL' }).mezok.supplier_name).toBeNull();
    expect(tisztit({ supplier_name: '  ' }).mezok.supplier_name).toBeNull();
  });

  test('a magabiztosságot 0 és 1 közé vágja', () => {
    const tiszta = tisztit({ confidence: { net_amount: 1.7, vat_amount: -2 } });

    expect(tiszta.konfidencia['net_amount']).toBe(1);
    expect(tiszta.konfidencia['vat_amount']).toBe(0);
  });
});

/**
 * Az eszközséma hordozhatósága szolgáltatók között.
 *
 * A Gemini függvényhívása nem fogadja el az unió-típust (`['string','null']`) és
 * a null-t tartalmazó enumot — az ilyen séma nála **nem rosszabb válasz, hanem
 * elutasított kérés**. Mivel a séma egyetlen helyen áll, egy visszacsúszás itt
 * észrevétlen maradna egészen az első Gemini-hívásig. Ezért a séma teljes fáját
 * végigjárjuk, nem csak a felső szintjét.
 */
describe('a séma hordozhatósága', () => {
  function* csomopontok(
    csomopont: Record<string, unknown>,
    ut = 'gyökér',
  ): Generator<[string, Record<string, unknown>]> {
    yield [ut, csomopont];

    const properties = csomopont['properties'];
    if (properties !== null && typeof properties === 'object') {
      for (const [nev, gyerek] of Object.entries(properties as Record<string, unknown>)) {
        if (gyerek !== null && typeof gyerek === 'object') {
          yield* csomopontok(gyerek as Record<string, unknown>, `${ut}.${nev}`);
        }
      }
    }

    const items = csomopont['items'];
    if (items !== null && typeof items === 'object') {
      yield* csomopontok(items as Record<string, unknown>, `${ut}[]`);
    }
  }

  test('egyetlen mező sem használ unió-típust', () => {
    for (const [ut, csomopont] of csomopontok(toolSema())) {
      if ('type' in csomopont) {
        expect(Array.isArray(csomopont['type']), `A(z) ${ut} típusa tömb — a Gemini ezt elutasítja.`).toBe(
          false,
        );
      }
    }
  });

  test('egyetlen enum sem tartalmaz nullt', () => {
    for (const [ut, csomopont] of csomopontok(toolSema())) {
      const e = csomopont['enum'];
      if (Array.isArray(e)) {
        expect(e, `A(z) ${ut} enumjában null szerepel — a Gemini ezt elutasítja.`).not.toContain(null);
      }
    }
  });

  /**
   * A `required` lista csak létező mezőre hivatkozhat. Enélkül egy átnevezés
   * után a modell egy nem létező mezőt lenne köteles kitölteni.
   */
  test('a required listák létező mezőkre mutatnak', () => {
    for (const [ut, csomopont] of csomopontok(toolSema())) {
      const kotelezo = csomopont['required'];
      if (!Array.isArray(kotelezo)) continue;

      const mezok = Object.keys((csomopont['properties'] ?? {}) as Record<string, unknown>);
      for (const mezo of kotelezo) {
        expect(
          mezok,
          `A(z) ${ut} kötelezőnek jelöli a(z) ${String(mezo)} mezőt, de az nincs a sémában.`,
        ).toContain(mezo);
      }
    }
  });

  /**
   * A bontássor kötelező mezői pontosan azok, amiket a tisztítás is megkövetel.
   * Ha a kettő szétcsúszik, vagy a modellt kérjük olyanra, amit eldobunk, vagy
   * eldobunk olyat, amit sosem kértünk.
   */
  test('a bontás kötelező mezői egyeznek a tisztítással', () => {
    const sema = toolSema() as never as {
      properties: { afa_bontas: { items: { required: string[] } } };
    };

    expect(sema.properties.afa_bontas.items.required).toEqual(['kulcs', 'netto']);

    // Amit a séma nem követel meg, azt a tisztítás is elviseli.
    const sorok = tisztitBontas([{ kulcs: 27, netto: 1000 }]);
    expect(sorok).not.toBeNull();
    expect(sorok![0]!.kategoria).toBeNull();
    expect(sorok![0]!.afa).toBeNull();
  });

  /**
   * A magabiztossági objektum nem lehet szabad kulcsú. Mérve: szabad kulcsúként
   * mind a három Gemini modell **némán üresen hagyta**, miközben a Claude
   * ugyanazon a sémán kitöltötte. Az üres magabiztosság nem hiba, hanem ennél
   * rosszabb: minden mező a 0,5-ös alapértelmezésre esik, és az ellenőrző
   * képernyő színkódolása pont ott veszíti el az információt, amiért van.
   */
  test('a magabiztosság mezői fel vannak sorolva', () => {
    const sema = toolSema() as never as {
      properties: {
        confidence: { additionalProperties: boolean; properties: Record<string, unknown> };
      };
    };

    expect(
      sema.properties.confidence.additionalProperties,
      'A szabad kulcsú magabiztosság-objektumot a Gemini üresen hagyja.',
    ).toBe(false);

    // Pontosan azok a mezők, amikre a tisztítás is figyel — se több, se kevesebb.
    expect(Object.keys(sema.properties.confidence.properties)).toEqual([...MEZOK, 'afa_bontas']);
  });
});
