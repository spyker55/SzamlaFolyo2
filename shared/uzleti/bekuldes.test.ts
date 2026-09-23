import { describe, expect, test } from 'vitest';

import {
  bekuldesiCim,
  cimetKibont,
  cimzettToken,
  cimzettekbolToken,
  feladotEllenoriz,
  mellekletValogat,
  type MellekletFej,
} from './bekuldes.ts';
import { szamlafolyo } from '../../config/szamlafolyo.ts';

/**
 * Az e-mailes beküldés döntései.
 *
 * Ezek a függvények azért kapnak ilyen sűrű tesztet, mert **csendben romlanak
 * el**: egy rossz címzett-értelmezés idegen cég keretéből költene, egy rossz
 * melléklet-válogatás pedig minden aláírásképből bizonylatot csinálna — és
 * mindkettő úgy hibázik, hogy közben 200-as választ adunk a szolgáltatónak, és
 * senki nem néz oda.
 */

const DOMAIN = szamlafolyo.bekuldes.domain;
const TOKEN = 'abcdefghjkmnpqrs';

describe('cimzettToken', () => {
  test('a csupasz címből kiolvassa a tokent', () => {
    expect(cimzettToken(`b-${TOKEN}@${DOMAIN}`)).toBe(TOKEN);
  });

  /** `"Név" <cím>` alak — a továbbküldő levelezők ezt írják. */
  test('a megjelenített nevet tartalmazó alakot is érti', () => {
    expect(cimzettToken(`"Számlák" <b-${TOKEN}@${DOMAIN}>`)).toBe(TOKEN);
  });

  /**
   * A helyi rész kis/nagybetűje elvileg számíthatna, de a gyakorlatban egyetlen
   * levelező sem tesz különbséget — egy nagybetűs továbbküldés miatt elveszett
   * számlát viszont nem lehet megmagyarázni senkinek.
   */
  test('a nagybetűs cím ugyanaz a cím', () => {
    expect(cimzettToken(`B-${TOKEN.toUpperCase()}@${DOMAIN.toUpperCase()}`)).toBe(TOKEN);
  });

  /**
   * ⚠️ Ez a legfontosabb negatív eset. Egy `Cc:` sorban bármilyen cím
   * érkezhet; ha a tartományt nem néznénk, egy idegen tartományra címzett
   * levél a **mi** cégünkhöz kerülne, és a mi keretünkből költene.
   */
  test('idegen tartomány nem a miénk, akkor sem, ha a helyi rész stimmel', () => {
    expect(cimzettToken(`b-${TOKEN}@tamado.hu`)).toBeNull();
    expect(cimzettToken(`b-${TOKEN}@bekuldes.szamlafolyo.hu.tamado.hu`)).toBeNull();
  });

  test('előtag nélkül nem token', () => {
    expect(cimzettToken(`${TOKEN}@${DOMAIN}`)).toBeNull();
  });

  /** `postmaster@` és `abuse@` — ezeket egy levelet fogadó tartománynak kezelnie kell. */
  test('a kötelező szereptcímek nem tokenek', () => {
    expect(cimzettToken(`postmaster@${DOMAIN}`)).toBeNull();
    expect(cimzettToken(`abuse@${DOMAIN}`)).toBeNull();
  });

  /** A plusz-címzés ne csússzon át: a token pontosan 16 karakter, semmi utána. */
  test('a plusz-címzés nem tágítja a tokent', () => {
    expect(cimzettToken(`b-${TOKEN}+valami@${DOMAIN}`)).toBeNull();
  });

  test('rossz hosszúságú vagy ábécén kívüli token nem token', () => {
    expect(cimzettToken(`b-${TOKEN.slice(0, 15)}@${DOMAIN}`)).toBeNull();
    expect(cimzettToken(`b-${TOKEN}x@${DOMAIN}`)).toBeNull();
    // `o`, `l`, `i`, `u`, `0`, `1` szándékosan nincs az ábécében.
    expect(cimzettToken(`b-oooooooooooooooo@${DOMAIN}`)).toBeNull();
  });

  test('a szemét nem dönti el', () => {
    for (const rossz of ['', '   ', 'nem-cim', '@', `b-${TOKEN}@`, 'a@b@c']) {
      expect(cimzettToken(rossz)).toBeNull();
    }
  });
});

describe('cimzettekbolToken', () => {
  test('a listából azt választja, amelyik hozzánk szól', () => {
    const cimek = ['konyveles@ugyfel.hu', `b-${TOKEN}@${DOMAIN}`, 'masik@valahol.hu'];

    expect(cimzettekbolToken(cimek)).toBe(TOKEN);
  });

  test('ha egyik sem a miénk, nincs találat', () => {
    expect(cimzettekbolToken(['a@b.hu', 'c@d.hu'])).toBeNull();
    expect(cimzettekbolToken([])).toBeNull();
  });
});

describe('bekuldesiCim', () => {
  test('a cím visszaolvasható ugyanazzá a tokenné', () => {
    const cim = bekuldesiCim(TOKEN);

    expect(cim).toBe(`b-${TOKEN}@${DOMAIN}`);
    expect(cimzettToken(cim)).toBe(TOKEN);
  });
});

describe('feladotEllenoriz', () => {
  const tagok = ['Konyvelo@ugyfel.hu', 'masik.tag@ugyfel.hu'];

  test('a cég tagja átmegy, kis/nagybetűtől függetlenül', () => {
    expect(feladotEllenoriz('konyvelo@ugyfel.hu', tagok, false)).toEqual({ ok: true });
    expect(feladotEllenoriz('"Könyvelő" <KONYVELO@UGYFEL.HU>', tagok, false)).toEqual({ ok: true });
  });

  test('idegen feladót alapból nem fogadunk el, és megmondjuk, mit lehet tenni', () => {
    const eredmeny = feladotEllenoriz('szallito@masik.hu', tagok, false);

    expect(eredmeny.ok).toBe(false);
    expect(eredmeny.ok === false && eredmeny.indok).toContain('szallito@masik.hu');
    expect(eredmeny.ok === false && eredmeny.indok).toContain('Beállításokban');
  });

  test('bekapcsolt kapcsolóval bárki átmegy', () => {
    expect(feladotEllenoriz('szallito@masik.hu', tagok, true)).toEqual({ ok: true });
  });

  /**
   * A bekapcsolt kapcsoló **nem** jelenti azt, hogy bármit elfogadunk: az
   * értelmezhetetlen feladó továbbra sem cím. A `barkitol` a listát kapcsolja
   * ki, nem az értelmezést.
   */
  test('értelmezhetetlen feladó kikapcsolt kapcsolónál elbukik', () => {
    const eredmeny = feladotEllenoriz('nem egy cím', tagok, false);

    expect(eredmeny).toEqual({ ok: false, indok: 'A feladó címe nem értelmezhető.' });
  });

  test('üres taglistával senki nem megy át, amíg a kapcsoló ki van kapcsolva', () => {
    expect(feladotEllenoriz('barki@valahol.hu', [], false).ok).toBe(false);
    expect(feladotEllenoriz('barki@valahol.hu', [], true).ok).toBe(true);
  });
});

describe('mellekletValogat', () => {
  const pdf = (n: string, meret = 120_000): MellekletFej => ({
    id: n,
    filename: `${n}.pdf`,
    content_type: 'application/pdf',
    size: meret,
  });

  const kep = (n: string, meret: number): MellekletFej => ({
    id: n,
    filename: `${n}.png`,
    content_type: 'image/png',
    size: meret,
  });

  test('a PDF-et átengedi', () => {
    const { elfogadott, mellozott } = mellekletValogat([pdf('szamla')]);

    expect(elfogadott.map((m) => m.id)).toEqual(['szamla']);
    expect(mellozott).toEqual([]);
  });

  /**
   * ⚠️ A kör legfontosabb szabálya. Ez a gyakori eset: szállítói számla
   * PDF-ben, céglogó az aláírásban. A logó nem méret alapján esik ki, hanem
   * azért, mert **van a levélben bizonylat** — méretküszöbre itt nem kell
   * támaszkodni.
   */
  test('ha van PDF, a képekhez hozzá sem nyúlunk — a nagy logó is kiesik', () => {
    const { elfogadott, mellozott } = mellekletValogat([pdf('szamla'), kep('logo', 900_000)]);

    expect(elfogadott.map((m) => m.id)).toEqual(['szamla']);
    expect(mellozott).toEqual([
      { nev: 'logo.png', indok: 'A levélben van PDF vagy XML, a képeket ilyenkor kihagyjuk.' },
    ]);
  });

  test('az XML ugyanúgy bizonylat, mint a PDF', () => {
    const xml: MellekletFej = {
      id: 'ubl',
      filename: 'szamla.xml',
      content_type: 'text/xml',
      size: 4_000,
    };

    const { elfogadott } = mellekletValogat([xml, kep('logo', 900_000)]);

    expect(elfogadott.map((m) => m.id)).toEqual(['ubl']);
  });

  /** A „lefotóztam a nyugtát" eset: nincs bizonylat-alakú melléklet. */
  test('bizonylat nélkül a nagy kép átmegy, a kicsi nem', () => {
    const { elfogadott, mellozott } = mellekletValogat([kep('nyugta', 800_000), kep('logo', 4_000)]);

    expect(elfogadott.map((m) => m.id)).toEqual(['nyugta']);
    expect(mellozott[0]?.indok).toContain('aláíráskép');
  });

  test('a nem feldolgozható típus soha nem megy át', () => {
    const doc: MellekletFej = {
      id: 'szerzodes',
      filename: 'szerzodes.docx',
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 80_000,
    };

    const { elfogadott, mellozott } = mellekletValogat([doc]);

    expect(elfogadott).toEqual([]);
    expect(mellozott).toEqual([{ nev: 'szerzodes.docx', indok: 'Nem feldolgozható típus.' }]);
  });

  /**
   * Sok levelezőprogram `application/octet-stream`-et mond mindenre. A
   * kiterjesztés ilyenkor az egyetlen jel — a bájtok úgyis eldöntik később.
   */
  test('a kiterjesztés elég, ha a deklarált típus semmitmondó', () => {
    const talany: MellekletFej = {
      id: 'talany',
      filename: 'SZAMLA-2026-01.PDF',
      content_type: 'application/octet-stream',
      size: 90_000,
    };

    expect(mellekletValogat([talany]).elfogadott.map((m) => m.id)).toEqual(['talany']);
  });

  test('a deklarált típus elég, ha a fájlnévnek nincs kiterjesztése', () => {
    const nevtelen: MellekletFej = {
      id: 'nevtelen',
      filename: 'melleklet',
      content_type: 'application/pdf',
      size: 90_000,
    };

    expect(mellekletValogat([nevtelen]).elfogadott.map((m) => m.id)).toEqual(['nevtelen']);
  });

  test('a paraméteres content-type is felismerhető', () => {
    const csatolt: MellekletFej = {
      id: 'csatolt',
      filename: 'szamla',
      content_type: 'application/pdf; name="szamla.pdf"',
      size: 90_000,
    };

    expect(mellekletValogat([csatolt]).elfogadott.map((m) => m.id)).toEqual(['csatolt']);
  });

  test('a méretkorlát fölötti melléklet meg sem indul', () => {
    const nagy = pdf('nagy', szamlafolyo.feltoltes.maxBajt + 1);
    const { elfogadott, mellozott } = mellekletValogat([nagy]);

    expect(elfogadott).toEqual([]);
    expect(mellozott[0]?.indok).toContain('20 MB');
  });

  test('az üres melléklet kiesik', () => {
    const { elfogadott, mellozott } = mellekletValogat([pdf('ures', 0)]);

    expect(elfogadott).toEqual([]);
    expect(mellozott).toEqual([{ nev: 'ures.pdf', indok: 'Üres.' }]);
  });

  /**
   * Futótűz-fék, a `koteg.maxDarab` mintájára: minden elfogadott melléklet
   * külön bizonylat és külön kredit.
   */
  test('a darabszám-korlát fölött a többit megnevezve hagyjuk ki', () => {
    const sok = Array.from({ length: szamlafolyo.bekuldes.maxMelleklet + 3 }, (_, i) =>
      pdf(`sz${i}`),
    );

    const { elfogadott, mellozott } = mellekletValogat(sok);

    expect(elfogadott).toHaveLength(szamlafolyo.bekuldes.maxMelleklet);
    expect(mellozott).toHaveLength(3);
    expect(mellozott[0]?.indok).toContain(String(szamlafolyo.bekuldes.maxMelleklet));
  });

  test('melléklet nélküli levélből nincs semmi, és ez nem hiba', () => {
    expect(mellekletValogat([])).toEqual({ elfogadott: [], mellozott: [] });
  });

  /*
   * ⚠️ Ez a blokk egy élesben elbukott levél miatt született.
   *
   * A webhook payloadja a mellékletről csak azonosítót, nevet és típust ad —
   * **méretet nem**. A válogatás `size ?? 0`-val számolt, így egy valódi,
   * 173 kB-os PDF-számla „Üres." indokkal esett ki, és a levélből nem lett
   * bizonylat.
   *
   * A hiba azért jutott át a tesztjeimen, mert **mindegyik fixtúra adott
   * méretet**. Az ismeretlen méret nem szélsőséges eset volt, hanem a valódi
   * bemenet — csak én nem mértem meg, mit küld a szolgáltató.
   *
   * A szabály innentől: a `null`/hiányzó méret azt jelenti, hogy **nem
   * tudjuk**, és hiányzó információra nem utasítunk el. Ugyanaz az elv, mint
   * az ismeretlen oldalszámnál (1 kredit) és a lekérdezhetetlen keretnél
   * (átengedjük).
   */
  /*
   * A `content_disposition` — mérve, ugyanazon a valódi levélen.
   *
   * A payload ezt adta: az aláírás-logó `"inline"`, a számla `"attachment"`.
   * Ez sokkal erősebb jel, mint a méret: a logó **194 kB** volt, vagyis a
   * „valószínűleg aláíráskép" küszöb négyszerese — méret alapján bizonylat
   * lett volna belőle, ha nem lett volna mellette PDF.
   */
  describe('törzsbe ágyazott kép (content_disposition)', () => {
    const kepD = (n: string, disp: string, meret = 194_014): MellekletFej => ({
      id: n,
      filename: `${n}.png`,
      content_type: 'image/png',
      size: meret,
      content_disposition: disp,
    });

    test('a csatolt kép mellett a beágyazott kiesik', () => {
      const { elfogadott, mellozott } = mellekletValogat([
        kepD('logo', 'inline'),
        kepD('nyugta', 'attachment'),
      ]);

      expect(elfogadott.map((m) => m.id)).toEqual(['nyugta']);
      expect(mellozott).toEqual([
        { nev: 'logo.png', indok: 'A levél törzsébe ágyazott kép – valószínűleg aláírás.' },
      ]);
    });

    /**
     * Ha MINDEN kép beágyazott, nincs mihez képest dísznek lennie: valaki
     * beillesztette a nyugtát a levél törzsébe. Ilyenkor a méret dönt — és egy
     * nagy kép átmegy.
     */
    test('ha minden kép beágyazott, a nagy átmegy', () => {
      const { elfogadott } = mellekletValogat([kepD('beillesztett', 'inline')]);

      expect(elfogadott.map((m) => m.id)).toEqual(['beillesztett']);
    });

    test('ha minden kép beágyazott, a kicsi továbbra is kiesik', () => {
      const { mellozott } = mellekletValogat([kepD('logo', 'inline', 4_000)]);

      expect(mellozott[0]?.indok).toContain('aláíráskép');
    });

    /** A PDF-szabály erősebb marad: az `inline` PDF is bizonylat. */
    test('a beágyazottnak jelölt PDF is bizonylat', () => {
      const { elfogadott } = mellekletValogat([
        {
          id: 'sz',
          filename: 'sz.pdf',
          content_type: 'application/pdf',
          size: 120_000,
          content_disposition: 'inline',
        },
      ]);

      expect(elfogadott.map((m) => m.id)).toEqual(['sz']);
    });

    /** Hiányzó jelzés nem jelent beágyazottságot — nincs elutasítás hiányból. */
    test('a jelzés nélküli kép nem számít beágyazottnak', () => {
      const { elfogadott } = mellekletValogat([
        { id: 'k', filename: 'k.png', content_type: 'image/png', size: 200_000 },
        kepD('csatolt', 'attachment'),
      ]);

      expect(elfogadott.map((m) => m.id)).toEqual(['k', 'csatolt']);
    });
  });

  describe('ismeretlen méret (a webhook payload nem ad méretet)', () => {
    const meretNelkul = (n: string, tipus: string): MellekletFej => ({
      id: n,
      filename: n,
      content_type: tipus,
    });

    test('a méret nélküli PDF átmegy — nem „üres"', () => {
      const { elfogadott, mellozott } = mellekletValogat([
        meretNelkul('szamla.pdf', 'application/pdf'),
      ]);

      expect(elfogadott.map((m) => m.id)).toEqual(['szamla.pdf']);
      expect(mellozott).toEqual([]);
    });

    test('a null méretű PDF is átmegy', () => {
      const { elfogadott } = mellekletValogat([
        { id: 'sz', filename: 'sz.pdf', content_type: 'application/pdf', size: null },
      ]);

      expect(elfogadott.map((m) => m.id)).toEqual(['sz']);
    });

    /** Pontosan az a levél, ami élesben elbukott: számla PDF + aláíráskép. */
    test('a valódi eset: méret nélküli PDF és kép — a PDF megy, a kép nem', () => {
      const { elfogadott, mellozott } = mellekletValogat([
        meretNelkul('image.png', 'image/png'),
        meretNelkul('Dinavill Kft._DV-2025-1170_2025.03.06..pdf', 'application/pdf'),
      ]);

      expect(elfogadott.map((m) => m.filename)).toEqual([
        'Dinavill Kft._DV-2025-1170_2025.03.06..pdf',
      ]);
      expect(mellozott).toEqual([
        { nev: 'image.png', indok: 'A levélben van PDF vagy XML, a képeket ilyenkor kihagyjuk.' },
      ]);
    });

    /**
     * Méret nélküli kép, bizonylat nélkül: átengedjük. A küszöb heurisztika,
     * és egy heurisztika nem utasíthat el olyasmit, amiről semmit nem tudunk —
     * egy elveszett nyugta rosszabb, mint egy fölösleges bizonylat, amit a
     * felhasználó egy kattintással eldob.
     */
    test('a méret nélküli kép átmegy, ha nincs mellette bizonylat', () => {
      const { elfogadott } = mellekletValogat([meretNelkul('nyugta.jpg', 'image/jpeg')]);

      expect(elfogadott.map((m) => m.id)).toEqual(['nyugta.jpg']);
    });

    /** A KIFEJEZETT nulla továbbra is elutasítás — az tény, nem hiány. */
    test('a kifejezett 0 méret továbbra is „Üres."', () => {
      const { elfogadott, mellozott } = mellekletValogat([
        { id: 'u', filename: 'u.pdf', content_type: 'application/pdf', size: 0 },
      ]);

      expect(elfogadott).toEqual([]);
      expect(mellozott).toEqual([{ nev: 'u.pdf', indok: 'Üres.' }]);
    });

    test('a méret nélküli, túl nagy melléklet nem ismerhető fel — a bájtok fogják meg', () => {
      const { elfogadott } = mellekletValogat([meretNelkul('nagy.pdf', 'application/pdf')]);

      // Itt nem tudjuk elutasítani; a letöltés utáni `ellenoriz()` viszont igen.
      expect(elfogadott).toHaveLength(1);
    });
  });
});

describe('cimetKibont', () => {
  test('a szokásos alakokat kibontja, kisbetűsen', () => {
    expect(cimetKibont('  Valaki@Pelda.HU ')).toBe('valaki@pelda.hu');
    expect(cimetKibont('Nagy Béla <bela@pelda.hu>')).toBe('bela@pelda.hu');
    expect(cimetKibont('"Nagy, Béla" <bela@pelda.hu>')).toBe('bela@pelda.hu');
  });

  test('ami nem cím, arra null', () => {
    for (const rossz of ['', 'bela', '@pelda.hu', 'bela@', 'a@b@c', 'be la@pelda.hu']) {
      expect(cimetKibont(rossz)).toBeNull();
    }
  });
});
