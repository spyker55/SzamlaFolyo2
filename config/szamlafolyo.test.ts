import { describe, expect, it } from 'vitest';
import { csomagSorrend, szamlafolyo } from './szamlafolyo.ts';

/**
 * Az árazás két szabálya.
 *
 * Ez a teszt egy **valódi elcsúszásból** született. A `csomagok` blokk fejléce
 * évekig azt mondta, hogy az `extraFt` mindig drágább a csomag saját
 * darabáránál (ár ÷ keret), és hogy „erre teszt van" — teszt viszont nem volt,
 * és a 2026 szeptemberi árváltással a szabály **mindhárom csomagon
 * megfordult**. A komment ettől nem lett hangosabb, csak hamis.
 *
 * Amit az a mondat védeni akart, az nem az átlagár-összehasonlítás volt, hanem
 * egy viselkedés: *ne érje meg a kis csomagban maradni és túllépni*. Az viszont
 * **csomagok között** dől el, nem egy csomagon belül — a havi díj
 * elkötelezettség, az átlagár és a határár nem ugyanaz a szám, és a csökkenő
 * határár bevett árazási alak.
 *
 * A számokat innen **nem írjuk be kézzel**: a teszt a configból olvas, tehát a
 * következő árváltásnál is mér, nem csak a mostanit rögzíti.
 */
describe('Árazás', () => {
  /**
   * A létra: egy kisebb csomag túlhasználattal felvitt kerete legyen drágább,
   * mint a következő csomag havi díja.
   *
   * Ez az a szabály, ami nélkül a legkisebb csomagban maradni és túllépni lenne
   * a racionális stratégia — vagyis a csomagok fölé nőni sosem érné meg.
   */
  it('a következő csomagra váltás mindig megéri a túlhasználat helyett', () => {
    for (let i = 0; i < csomagSorrend.length - 1; i += 1) {
      const kisebb = szamlafolyo.csomagok[csomagSorrend[i]!];
      const nagyobb = szamlafolyo.csomagok[csomagSorrend[i + 1]!];

      const tobbDarab = nagyobb.dokumentumok - kisebb.dokumentumok;
      const tulhasznalattal = kisebb.arHavi + tobbDarab * kisebb.extraFt;

      // A hibaüzenet nevezze meg a két csomagot, különben a bukás csak két
      // szám, és újra ki kell számolni, melyik lépcsőn.
      expect(
        { lepcso: `${kisebb.nev} → ${nagyobb.nev}`, dragabb: tulhasznalattal > nagyobb.arHavi },
      ).toEqual(
        { lepcso: `${kisebb.nev} → ${nagyobb.nev}`, dragabb: true },
      );
    }
  });

  /**
   * A darabár csomagról csomagra csökkenjen.
   *
   * Egy nagyobb csomagnak sosem lehet rosszabb a határára: aki többet fizet,
   * ne járjon rosszabbul a keretén felül.
   */
  it('a keret fölötti darabár a nagyobb csomagban olcsóbb', () => {
    for (let i = 0; i < csomagSorrend.length - 1; i += 1) {
      const kisebb = szamlafolyo.csomagok[csomagSorrend[i]!];
      const nagyobb = szamlafolyo.csomagok[csomagSorrend[i + 1]!];

      expect(
        { lepcso: `${kisebb.nev} → ${nagyobb.nev}`, olcsobb: nagyobb.extraFt < kisebb.extraFt },
      ).toEqual(
        { lepcso: `${kisebb.nev} → ${nagyobb.nev}`, olcsobb: true },
      );
    }
  });
});

/**
 * A két megőrzési idő viszonya.
 *
 * Nem esztétika: az eredeti fájl az export **után** megy el, az exportnak
 * pedig azt kell túlélnie. Ha valaki egyszer az `exportNap`-ot a `maxNap` alá
 * vinné, keletkezne egy ablak, amiben már sem az eredeti, sem az export nincs
 * meg — miközben a felhasználó még azt hiszi, hogy visszanézhet valamelyikbe.
 *
 * ⚠️ Amit ez a teszt **nem** tud megfogni: az `exportNap` a migrációban is ott
 * áll számként (`interval '30 days'`), mert egy napi cron nem olvas TS-configot.
 * Azt a tükrözést az SQL-oldali mérés őrzi, nem ez.
 */
describe('Megőrzés', () => {
  it('az export túléli az eredeti fájlt', () => {
    expect(szamlafolyo.megorzes.exportNap).toBeGreaterThan(szamlafolyo.megorzes.maxNap);
  });
});
