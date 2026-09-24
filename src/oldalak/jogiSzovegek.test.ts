import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KIMERVE, PROGRAM_NEVEK, PROGRAMOK, type Program } from '@uzleti/export/konyvelo/beallitas.ts';

/**
 * A nyilvános szövegek elcsúszás-őre.
 *
 * # Mit véd, és miért szövegre mér
 *
 * A jogi felülvizsgálat 2026-09-21-i köre tizennégy pontot talált, és a
 * tizennégyből **nyolc ugyanaz a hibaosztály** volt: két szöveg ugyanarról
 * mást mondott, vagy egy szöveg a kódnál többet ígért. Nem hiba keletkezett,
 * hanem **csendes széttartás** — pont az, ami magától nem derül ki.
 *
 * Amit a kódból mérni lehet, azt a kódból mérjük (lásd a támogatott
 * XML-alakokat lentebb). Amit nem — például hogy egy marketingmondat feltétel
 * nélkül ígér-e emberi jóváhagyást —, arra a **szöveg** az egyetlen
 * mérőeszköz, és egy negatív állítás ott többet ér, mint a semmi.
 *
 * ⚠️ **Ez a teszt a szövegek átfogalmazásakor el fog bukni, és ez a dolga.**
 * A hibaüzenet minden esetben megmondja, melyik felülvizsgálati pont áll
 * mögötte — aki átírja a mondatot, döntsön tudatosan, ne véletlenül.
 */

const GYOKER = new URL('.', import.meta.url).pathname;

function olvas(ut: string): string {
  return readFileSync(GYOKER + ut, 'utf8');
}

const aszf = olvas('jogi/Aszf.tsx');
const adatkezeles = olvas('jogi/Adatkezeles.tsx');
const impresszum = olvas('jogi/Impresszum.tsx');
const utmutato = olvas('Utmutato.tsx');
const nyitolap = olvas('Nyitolap.tsx');

describe('a támogatott XML-alakok mindhárom helyen ugyanazok', () => {
  /**
   * A kód az igazság forrása: a `xmlKiolvaso.ts` `ERTELMEZOK` tömbje mondja
   * meg, mit ismerünk fel. A két nyilvános szöveg ezt sorolja fel — és ha
   * valaki ötödik értelmezőt vesz fel, itt akad meg, nem egy ügyfélnél.
   */
  const KIOLVASO = readFileSync(GYOKER + '../../shared/uzleti/xml/xmlKiolvaso.ts', 'utf8');

  /** Az értelmezők neve a tömbből: `[cii, ubl, nav, apeh]`. */
  function ertelmezok(): string[] {
    const talalat = /const ERTELMEZOK: readonly Ertelmezo\[\] = \[([^\]]+)\]/.exec(KIOLVASO);

    expect(
      talalat,
      'Nem találtam az `ERTELMEZOK` tömböt a xmlKiolvaso.ts-ben. Ha a modul alakja ' +
        'változott, ezt a tesztet is igazítani kell.',
    ).not.toBeNull();

    return (talalat?.[1] ?? '').split(',').map((r) => r.trim()).filter((r) => r !== '');
  }

  /** Melyik értelmezőt melyik szó nevezi meg a nyilvános szövegekben. */
  const SZAVAK: Record<string, string> = {
    cii: 'ZUGFeRD',
    ubl: 'UBL',
    nav: 'NAV Online Számla',
    apeh: 'APEH',
  };

  it('egyáltalán talál értelmezőket', () => {
    expect(ertelmezok().length).toBeGreaterThan(2);
  });

  it('mindegyiket megnevezi az ÁSZF és az útmutató is', () => {
    for (const nev of ertelmezok()) {
      const szo = SZAVAK[nev];

      expect(
        szo,
        `A(z) \`${nev}\` értelmezőhöz nincs szó rendelve ebben a tesztben. Új értelmező ` +
          'került a rendszerbe: vedd fel a SZAVAK térképbe, és nevezd meg a nyilvános ' +
          'szövegekben is.',
      ).toBeDefined();

      expect(
        aszf,
        `Az ÁSZF nem nevezi meg a(z) \`${nev}\` értelmező alakját ("${szo}"). A 3. pont ` +
          'felsorolja a feltölthető formátumokat — ha a kód többet ismer, mint a szöveg, ' +
          'a felhasználó nem tudja, mit tölthet fel ingyen.',
      ).toContain(szo ?? '');

      expect(
        utmutato,
        `A Használati útmutató nem nevezi meg a(z) \`${nev}\` értelmező alakját ("${szo}").`,
      ).toContain(szo ?? '');
    }
  });
});

describe('a kiolvasás forrása a felületen is látszik', () => {
  /**
   * Ez a kör legkényesebb állítása, mert **a szöveg a kódra hivatkozik**.
   *
   * Az Adatkezelési tájékoztató 3. pontja 2026-09-22-ig azt mondta, hogy a
   * felület nem jelzi, saját értelmező vagy modell olvasta-e ki a bizonylatot.
   * Most az ellenkezőjét mondja — és ez csak addig igaz, amíg a két képernyő
   * tényleg meg is mutatja. Ha valaki kiveszi a jelzést, a jogi szöveg némán
   * hamissá válna: pontosan az a hibaosztály, amiért ez az egész teszt van.
   */
  const ellenorzes = olvas('../kepernyok/Ellenorzes.tsx');
  const beerkezo = olvas('../kepernyok/Beerkezo.tsx');

  it('egyáltalán elolvasta a két képernyőt', () => {
    expect(ellenorzes.length).toBeGreaterThan(3000);
    expect(beerkezo.length).toBeGreaterThan(3000);
  });

  it('mindkét képernyő kiírja, ki olvasta ki a bizonylatot', () => {
    for (const [nev, szoveg] of Object.entries({ ellenorzes, beerkezo })) {
      expect(
        szoveg,
        `A(z) ${nev} képernyő nem hívja a \`kiolvasoForras()\`-t. Az Adatkezelési ` +
          'tájékoztató 3. pontja viszont azt ígéri, hogy mindkét helyen látszik, a saját ' +
          'értelmezőnk vagy a modell olvasta-e ki a bizonylatot. Vagy a jelzés kerüljön ' +
          'vissza, vagy a tájékoztató mondja megint azt, ami igaz.',
      ).toContain('kiolvasoForras');
    }
  });

  it('a tájékoztató nem állítja újra, hogy a felület nem jelzi', () => {
    expect(
      adatkezeles,
      'Visszatért az a mondat, hogy a felület „nem jelzi külön", melyik út olvasta ki a ' +
        'bizonylatot. 2026-09-22 óta jelzi — ha a jelzés mégis kikerült volna, a fenti ' +
        'teszt is bukna, és akkor a kódot kell visszatenni, nem ezt a mondatot.',
    ).not.toContain('nem jelzi külön');
  });
});

describe('a felülvizsgálat után nem térhetnek vissza a valótlan mondatok', () => {
  /**
   * Anti-vakság: ha az olvasás elromlana, minden `not.toContain` **üresen
   * menne át**. Ez a fajta hamis zöld már kétszer megfogott minket.
   */
  it('egyáltalán elolvasta az öt szöveget', () => {
    for (const [nev, szoveg] of Object.entries({
      aszf,
      adatkezeles,
      impresszum,
      utmutato,
      nyitolap,
    })) {
      expect(szoveg.length, `A(z) ${nev} szöveg üresen jött vissza.`).toBeGreaterThan(3000);
    }
  });

  it('3. pont: a csomagváltásnál VAN időarányos elszámolás', () => {
    expect(
      aszf,
      'Az ÁSZF 9. pontja megint azt állítja, hogy nincs időarányos elszámolás. ' +
        'Mérve nem így van: a Stripe portál-konfigurációja mindkét fiókban ' +
        '`subscription_update.proration_behavior: "create_prorations"`. Ha a beállítás ' +
        'tényleg megváltozott, előbb mérd meg, és az útmutató 7. fejezetét is írd át.',
    ).not.toContain('időarányos elszámolás nem történik');
  });

  it('4. pont: a megszűnés utáni törlésnek konkrét határideje van', () => {
    expect(
      aszf,
      'Az ÁSZF 10. pontjában visszatért az „ésszerű időn belül" fordulat. A ' +
        'felülvizsgálat 4. pontja kifejezetten konkrét határidőt kért — ma harminc nap, ' +
        'ami az ÁSZF 16. pontjának adatkiadási ablakához igazodik.',
    ).not.toContain('adatait ésszerű időn belül törli');
  });

  it('9. pont: a nyitólap nem ígér feltétlen emberi jóváhagyást', () => {
    expect(
      nyitolap,
      'A nyitólapon megint feltétel nélkül áll, hogy „Minden bizonylatot te hagysz jóvá". ' +
        'A gépi jóváhagyás létező, bekapcsolható funkció (Adatkezelés 6.), ezért a mondat ' +
        'csak „alapértelmezés szerint" alakban igaz.',
    ).not.toMatch(/Minden bizonylatot\s+<strong[^>]*>\s*te hagysz/);
  });

  it('14. pont: az ÁSZF az adatkimentésnél a 16. pontra mutat', () => {
    expect(
      aszf,
      'Az ÁSZF 15. pontja megint a 17. pontra hivatkozik az adatkimentés kapcsán. ' +
        'A 16. az Adatkimentés, a 17. a Panasz — a számok a 16. pont beszúrásakor ' +
        'csúsztak el egyszer már.',
    ).not.toContain('a 17. pont szerint mentheti ki');
  });

  it('11. pont: a békéltetés nem a székhely szerinti kamarához kötődik', () => {
    for (const [nev, szoveg] of Object.entries({ aszf, impresszum })) {
      expect(
        szoveg,
        `A(z) ${nev} megint a Szolgáltató székhelye szerinti kamara mellett működő ` +
          'békéltető testületre hivatkozik. A testületek 2024-től regionálisak: Heves ' +
          'vármegye a miskolci székhelyű BAZ vármegyei testülethez tartozik.',
      ).not.toContain('székhelye szerinti kereskedelmi és iparkamara mellett működik');
    }
  });

  it('13. pont (2026-09-23 óta): látogatásmérés nincs, és a szöveg sem ígéri', () => {
    // A mérés kikerült, mert a mérőkód a localStorage-ot olvasta (harmadik kör).
    // Ha valaki visszahozza, a jogalapot (hozzájárulás) kell előbb rendezni —
    // ez az őr ott akad meg, ahol a csomag vagy a komponens visszakerül.
    const app = olvas('../App.tsx');
    const csomag = readFileSync(GYOKER + '../../package.json', 'utf8');

    expect(app, 'Az App.tsx megint betölti a Vercel Analyticset.').not.toContain('@vercel/analytics');
    expect(csomag, 'A package.json megint tartalmazza a @vercel/analytics csomagot.').not.toContain(
      '@vercel/analytics',
    );
    expect(adatkezeles).not.toContain('Látogatásmérés azonban van');
  });
});

/**
 * # A harmadik kör (2026-09-23, ügyvéd)
 *
 * Minden állítás egy konkrét pontra mutat. A mondatok, amik itt tiltva vannak,
 * **élesben álltak** — nem elképzelt hibák.
 */
describe('a harmadik felülvizsgálat után sem térhetnek vissza', () => {
  it('1. pont: a böngészős feltöltés nem „marad végig az Unión belül"', () => {
    // A docblokk története idézi a régi mondatot; a látható szövegben nem állhat.
    expect(
      adatkezeles.slice(adatkezeles.indexOf('export function Adatkezeles')),
      'Visszatért a „végig az Unión belül marad" ígéret. Nem igaz: a modellhez (USA) ' +
        'kerül, és a tárhelyszolgáltató szerződő fele szingapúri. A böngészős feltöltés ' +
        'csak a Resendet kerüli el.',
    ).not.toContain('végig az Unión belül marad');
  });

  it('1. pont: a tájékoztató nem állítja, hogy a bizonylatot senkinek nem adjuk tovább', () => {
    expect(adatkezeles).not.toMatch(/nem elemzi más célra, nem adja\s+tovább/);
    expect(adatkezeles).toContain('kizárólag az 5. pontban ismertetett közreműködőknek');
  });

  it('2. pont: az XML-mondat csak a felismert XML-re szól, és nincs „ingyenes" átértelmezés', () => {
    expect(aszf).not.toContain('Az e-számla XML feldolgozása modellhívás nélkül történik.');
    expect(aszf).toContain('felismert e-számla XML feldolgozása modellhívás');
    expect(aszf).not.toContain('„ingyenes" vagy „modellhívás nélkül"');
  });

  it('3. pont: a szolgáltatóváltás három külön szakasz', () => {
    for (const szakasz of ['Átállási időszak', 'A szerződés megszűnése', 'Adat-visszanyerési időszak']) {
      expect(aszf, `Az ÁSZF 16. pontjából hiányzik: „${szakasz}"`).toContain(szakasz);
    }
    expect(aszf).not.toContain('az adat-visszanyerés legrövidebb ideje');
  });

  it('3. pont: az Útmutató adatformátum-leírása ugyanazokat a szakaszokat sorolja, mint az SQL', () => {
    const sql = readFileSync(GYOKER + '../../eszkozok/adatkiadas/adatkiadas.sql', 'utf8');
    // A fő objektum kulcsai pontosan két szóközzel kezdődnek; a `darabszamok`
    // belső kulcsai hattal — azokat nem akarjuk szakasznak számolni.
    const sqlSzakaszok = new Set([...sql.matchAll(/^ {2}'([a-z_]+)',/gm)].map((m) => m[1] ?? ''));
    const utmutatoSzakaszok = new Set(
      [...utmutato.matchAll(/^ {2}\['([a-z_]+)', '/gm)].map((m) => m[1] ?? ''),
    );

    expect(sqlSzakaszok.size, 'Az SQL-ből nem olvasott ki szakaszokat.').toBeGreaterThan(10);
    expect([...utmutatoSzakaszok].sort()).toEqual([...sqlSzakaszok].sort());
  });

  it('4. pont: nincs „nem tart fenn másolatot", és a saját számla adójogi', () => {
    expect(aszf).not.toContain('nem tart fenn másolatot');
    expect(aszf).not.toContain('a számviteli előírások szerinti ideig megőrzi');
    expect(aszf).toContain('legfeljebb hét napig');
    expect(adatkezeles).not.toContain('és a Szolgáltató sem tudja visszaállítani');
  });

  it('4. pont: nincs olyan törlés, ami „magától lefut", ha nincs mögötte kód', () => {
    expect(
      aszf,
      'Visszatért a „magától lefut" törlés. Megszűnés utáni automatikus cégtörlés NINCS a ' +
        'kódban — a Szolgáltató végzi, az eszkozok/torles/OLVASS-EL.md szerint.',
    ).not.toContain('a törlés magától lefut');
  });

  it('5. pont: az elfogadás bizonyítéka nem szűnik meg a cég törlésével', () => {
    expect(adatkezeles).not.toContain('de legfeljebb a cég adatainak');
    expect(aszf).toContain('a cég törlése után is megőrzi');
  });

  it('7. pont: a békéltetésnél az általános szabály áll elöl', () => {
    for (const [nev, szoveg] of Object.entries({ aszf, impresszum })) {
      expect(szoveg, `${nev}: hiányzik az általános illetékességi szabály.`).toContain(
        'Melyik testület illetékes.',
      );
    }
    expect(impresszum).not.toContain('Hatvan (Heves vármegye) a fenti');
  });

  it('9. pont: a belépési naplónál nincs „saját megőrzési ideje szerint"', () => {
    expect(adatkezeles).not.toContain('biztonsági célú megőrzési ideje szerint');
  });

  it('9. pont: az incidens a jogosulatlan hozzáférést és a megváltoztatást is lefedi', () => {
    expect(adatkezeles).toContain('megváltoztatását');
    expect(adatkezeles).toContain('jogosulatlan hozzáférést');
    expect(adatkezeles).toContain('hetvenkét órán belül');
  });

  it('10. pont: nincs „kiejti egymást"', () => {
    expect(aszf).not.toContain('kiejti egymást');
    expect(utmutato).not.toContain('kiejtik egymást');
  });

  it('10. pont: a szöveg ígéri, hogy a visszaváltás nem számláz utólag — és a kód tartja', () => {
    const keret = readFileSync(GYOKER + '../../shared/uzleti/keret.ts', 'utf8');
    const webhook = readFileSync(
      GYOKER + '../../supabase/functions/stripe-webhook/index.ts',
      'utf8',
    );

    expect(aszf).toContain('A váltás előtt felhasznált keretből utólag nem keletkezik');
    expect(
      keret,
      'Az ÁSZF 9. pontja ígéri, hogy a visszaváltás nem számláz utólag, de a keret.ts ' +
        'nem használja a hatalyosKeret()-et. Vagy a kód kerüljön vissza, vagy a mondat.',
    ).toMatch(/keret:\s*hatalyosKeret\(/);
    expect(webhook).toMatch(/keret:\s*hatalyosKeret\(/);
  });

  it('kisebb javítások: nincs „cégalapítás" az ÁSZF-ben, és a 13. pont a tájékoztatóra mutat', () => {
    // A docblokk története ezt a szót idézheti; a látható szöveg nem.
    const lathato = aszf.slice(aszf.indexOf('export function Aszf'));

    expect(lathato).not.toMatch(/cégalapít/i);
    expect(lathato).not.toContain('Az 5. pont szerinti');
  });

  it('kisebb javítások: a fiókadatokat nem küldjük, de a bizonylat tartalmazhat neveket', () => {
    expect(adatkezeles).not.toContain('Felhasználói nevet, e-mail címet, jelszót nem küldünk.');
    expect(adatkezeles).toContain('A fiók adatait');
  });
});

/**
 * # A „Könyvelőknek" oldal (2026-09-24)
 *
 * Marketinglap, tehát ugyanaz a kísértés, mint a nyitólapon: érvnek hangzó
 * mondat, ami a kódnál többet ígér. Az őrök ugyanazok, plusz kettő, ami erre
 * a lapra jellemző.
 */
describe('a Könyvelőknek oldal sem ígér többet, mint a kód', () => {
  const konyveloknek = olvas('Konyveloknek.tsx');
  // A lap *szövege*, megjegyzések nélkül. A fejléc-dokumentáció megnevezheti a
  // programokat (miért nem ígérjük őket) – ha az őr azt is olvasná, egy
  // megjegyzés hitelesíthetné a lapot. 2026-09-24-én pont ez történt: a
  // Novitaxot a lapról kivéve az őr zöld maradt, mert a fejléc említette.
  const konyvelokSzoveg = konyveloknek.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('egyáltalán elolvasta', () => {
    expect(konyveloknek.length).toBeGreaterThan(3000);
  });

  it('nem ígér feltétlen emberi jóváhagyást, és nem ígéri, hogy az adat végig az Unióban marad', () => {
    expect(konyveloknek).not.toMatch(/Minden bizonylatot\s+(<strong[^>]*>\s*)?te hagysz/);
    expect(konyveloknek).toContain('Alapértelmezés szerint minden bizonylat rád vár');
    expect(konyveloknek).not.toContain('végig az Unión belül');
    expect(konyveloknek).toContain('a bizonylat a Google modelljéhez kerül');
  });

  it('kimondja, hogy az ügyfélszűrő nem jogosultság (Adatkezelés 1. pont)', () => {
    expect(konyveloknek).toContain('Az ügyfélszűrő nem jogosultság');
  });

  it('csak olyan könyvelőprogramot nevez meg, amit valódi példány beolvasott (KIMERVE)', () => {
    // A lapon előforduló névből → melyik program kimértsége kell hozzá.
    // Ami nem a mi programunk (Forint-Soft, TenSoft, Infotéka), az soha.
    const nevek: [string, Program | null][] = [
      ['RLB', 'rlb'],
      ['Novitax', 'novitax'],
      ['Kulcs-Könyvelés', 'kulcs'],
      ['Kulcs-Soft', 'kulcs'],
      ['Forint-Soft', null],
      ['TenSoft', null],
      ['Infotéka', null],
    ];
    for (const [nev, program] of nevek) {
      if (!konyvelokSzoveg.includes(nev)) continue;
      expect(
        program !== null && KIMERVE[program],
        `A lap a(z) ${nev} programot nevezi meg, de nincs kimérve – valódi próbaimport előtt nem ígérhetjük.`,
      ).toBe(true);
    }
  });

  it('minden kimért programot megnevez – a kimértet nem hallgatjuk el', () => {
    for (const p of PROGRAMOK.filter((p) => KIMERVE[p])) {
      expect(konyvelokSzoveg, `${PROGRAM_NEVEK[p]} kimérve, de a lap nem nevezi meg.`).toContain(PROGRAM_NEVEK[p]);
    }
  });

  it('árat nem ír kézzel: minden forintösszeg a configból jön', () => {
    expect(konyveloknek, 'Kézzel beírt forintösszeg a lapon – a configból kell jönnie (irodaiKoltseg.ts).').not.toMatch(
      /\d[\d\s]*\s?Ft\b/,
    );
  });

  // 2026-09-24: élő bemutató helyett videó. A tulajdonos nem tart egyeztetett
  // bemutatót – a lap ne ígérjen olyat, amit senki nem fog megtartani.
  it('nem ígér élő, egyeztetett bemutatót', () => {
    expect(konyvelokSzoveg).not.toMatch(/perces bemutató/i);
    expect(konyvelokSzoveg).not.toMatch(/negyedór/i);
    expect(konyvelokSzoveg).not.toMatch(/bemutató(t)? kér/i);
  });

  it('a bemutatóvideó és a posztere ott van a public/-ban, és a videó tényleg kb. egy perc', () => {
    const utak = [...new Set(konyvelokSzoveg.match(/\/bemutato\/[\w.-]+/g) ?? [])];
    expect(utak.length, 'A lap nem hivatkozik bemutatófájlra.').toBeGreaterThanOrEqual(2);
    const publikus = new URL('../../public', import.meta.url).pathname;
    for (const ut of utak) {
      expect(existsSync(publikus + ut), `Hiányzik: public${ut} (scripts/bemutato-video/)`).toBe(true);
    }

    // A lap „egy perc alatt”-ot mond: az MP4 fejlécéből (mvhd) mérjük, nem hisszük.
    const mp4 = utak.find((u) => u.endsWith('.mp4'));
    expect(mp4).toBeDefined();
    const b = readFileSync(publikus + mp4);
    const i = b.indexOf('mvhd');
    expect(i).toBeGreaterThan(0);
    const v1 = b[i + 4] === 1;
    const skala = b.readUInt32BE(i + (v1 ? 24 : 16));
    const hossz = Number(v1 ? b.readBigUInt64BE(i + 28) : BigInt(b.readUInt32BE(i + 20)));
    const mp = hossz / skala;
    expect(mp, `A videó ${mp.toFixed(1)} mp – a lap „egy perc alatt”-ot ígér.`).toBeGreaterThan(40);
    expect(mp, `A videó ${mp.toFixed(1)} mp – a lap „egy perc alatt”-ot ígér.`).toBeLessThanOrEqual(90);
  });
});
