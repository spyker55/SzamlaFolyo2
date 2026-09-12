import { describe, expect, test } from 'vitest';
import { brutto, kulcsErtelmez, OSZLOPOK, vodrok } from './afaBontas.ts';

/**
 * A vektorok a régi `tests/Unit/AfaBontasTest.php`-ból származnak.
 */

describe('kulcsErtelmez', () => {
  /**
   * Ugyanez az értelmező kapja a modell válaszát és az ember gépelését. Az
   * ember odaírja a százalékjelet, és vesszővel tizedesel.
   */
  test('a kulcsot mindenféle alakban érti', () => {
    expect(kulcsErtelmez('27%')).toBe(27);
    expect(kulcsErtelmez('27,0')).toBe(27);
    expect(kulcsErtelmez(27)).toBe(27);
    expect(kulcsErtelmez('7,5 %')).toBe(7.5);
    expect(kulcsErtelmez('0')).toBe(0);
  });

  /** Amit nem értünk, az null — nem nulla. A nulla kulcs értelmes állítás. */
  test('az értelmezhetetlen kulcs null', () => {
    expect(kulcsErtelmez('huszonhét')).toBeNull();
    expect(kulcsErtelmez('')).toBeNull();
    expect(kulcsErtelmez(null)).toBeNull();
  });

  /**
   * A `JSON.stringify(27.0)` „27"-et ír, tehát az egész kulcs egészként jön
   * vissza az adatbázisból, a törtes törtként. Egyik sem téveszthet meg — és
   * sztringként sem.
   */
  test('a JSON-körút utáni alakok sem zavarják', () => {
    const korut = JSON.parse(JSON.stringify([{ kulcs: 27.0, netto: '1000.00', afa: '270.00' }]));
    expect(vodrok(korut).netto_27).toBe(1000);
    expect(kulcsErtelmez('27')).toBe(27);
  });
});

describe('brutto', () => {
  /**
   * A bruttót sosem tároljuk (az EN 16931 sem), soronként itt áll elő. ÁFA
   * nélkül a nettó önmaga a bruttó — fordított adózásnál ez a normális.
   */
  test('a bruttó számolt érték', () => {
    expect(brutto('1000.00', '270.00')).toBe('1270.00');
    expect(brutto('1000.00', null)).toBe('1000.00');
    expect(brutto('1 000,50', '270')).toBe('1270.50');
  });

  /** Adóalap nélkül nincs sor: a puszta ÁFA-összeg nem bontássor. */
  test('adóalap nélkül nincs bruttó', () => {
    expect(brutto(null, '270.00')).toBeNull();
    expect(brutto('', '270.00')).toBeNull();
  });
});

describe('vodrok', () => {
  test('kulcsonkénti oszlopokba sorol', () => {
    const v = vodrok([
      { kulcs: 27, netto: '1000.00', afa: '270.00' },
      { kulcs: 5, netto: '500.00', afa: '25.00' },
    ]);

    expect(v.netto_27).toBe(1000);
    expect(v.afa_27).toBe(270);
    expect(v.netto_5).toBe(500);
    expect(v.afa_5).toBe(25);
    // Amihez nincs sor, az üres marad — nem nulla. A nulla azt állítaná, hogy
    // volt ilyen kulcs, és éppen semmi nem esett rá.
    expect(v.netto_18).toBeNull();
    expect(v.netto_egyeb).toBeNull();
  });

  /**
   * Emberi szerkesztés után ugyanaz a kulcs több sorban is szerepelhet — két
   * 27%-os sor összege továbbra is egyetlen 27%-os adóalap.
   */
  test('az azonos kulcsú sorokat összevonja', () => {
    const v = vodrok([
      { kulcs: 27, netto: '1000.00', afa: '270.00' },
      { kulcs: 27, netto: '2000.00', afa: '540.00' },
    ]);

    expect(v.netto_27).toBe(3000);
    expect(v.afa_27).toBe(810);
  });

  /** A nem magyar kulcs (külföldi számla 19%-a) az „egyéb" párba megy. */
  test('az ismeretlen kulcs az egyébbe kerül', () => {
    const v = vodrok([{ kulcs: 19, netto: '1000.00', afa: '190.00' }]);

    expect(v.netto_egyeb).toBe(1000);
    expect(v.afa_egyeb).toBe(190);
  });

  /**
   * ⚠️ A nulla vödörnek nincs ÁFA-oszlopa — nullától nem keletkezik adó. Ha
   * mégis van a soron, akkor vagy a kulcs rossz, vagy az összeg: a sor
   * egészében az „egyéb"-be megy, mert **pénzt csendben elnyelni nem szabad.**
   *
   * Ez a szabály könnyen visszafejlődik, ezért van rá külön teszt.
   */
  test('a nulla kulcson lévő ÁFA nem tűnik el', () => {
    const v = vodrok([{ kulcs: 0, netto: '1000.00', afa: '80.00' }]);

    expect(v.netto_0).toBeNull();
    expect(v.netto_egyeb).toBe(1000);
    expect(v.afa_egyeb).toBe(80);
  });

  /** A valódi nulla kulcsos sor viszont a helyén marad. */
  test('a nulla kulcsos sor a nulla oszlopba megy', () => {
    const v = vodrok([{ kulcs: 0, netto: '1000.00', afa: null }]);

    expect(v.netto_0).toBe(1000);
    expect(v.netto_egyeb).toBeNull();
  });

  test('bontás nélkül minden oszlop üres', () => {
    const v = vodrok(null);

    expect(Object.keys(v)).toEqual([...OSZLOPOK]);
    expect(Object.values(v).every((e) => e === null)).toBe(true);
  });

  test('a nulla oszlopnak nincs ÁFA-párja', () => {
    expect(OSZLOPOK).not.toContain('afa_0');
  });
});
