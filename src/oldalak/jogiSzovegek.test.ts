import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

  it('13. pont: a látogatásmérésnek van sora a jogalap-táblázatban', () => {
    expect(
      adatkezeles,
      'Az Adatkezelési tájékoztató 2. pontjának táblázatából eltűnt a látogatásmérés sora. ' +
        'Mérés van (Vercel Web Analytics, a nyilvános oldalakon), tehát jogalapot is kell ' +
        'megjelölni — ma jogos érdek, érdekmérlegeléssel.',
    ).toContain('Látogatásmérés a nyilvános oldalakon');
  });
});
