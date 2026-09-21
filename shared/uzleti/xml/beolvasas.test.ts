import { describe, expect, test } from 'vitest';
import { xmlbolKiolvas } from './beolvasas.ts';
import { MAX_BAJT } from './xmlKiolvaso.ts';

function bajt(xml: string): number {
  return new TextEncoder().encode(xml).length;
}

function olvas(xml: string) {
  return xmlbolKiolvas(xml, bajt(xml));
}

const UBL = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>SZ-2026-0042</ID>
  <IssueDate>2026-03-14</IssueDate>
  <LegalMonetaryTotal><TaxInclusiveAmount>127000</TaxInclusiveAmount></LegalMonetaryTotal>
</Invoice>`;

describe('xmlbolKiolvas', () => {
  test('a felismert sémát kiolvassa, és megmondja, melyik értelmező volt', () => {
    const eredmeny = olvas(UBL);

    expect(eredmeny?.nev).toBe('xml/ubl');
    expect(eredmeny?.nyers['doc_number']).toBe('SZ-2026-0042');
  });

  test('a fel nem ismert séma null — nem hiba, hanem a lánc következő foka', () => {
    expect(olvas('<?xml version="1.0"?><hazi-szamla><osszeg>100</osszeg></hazi-szamla>')).toBeNull();
  });

  test('az üres XML null', () => {
    expect(olvas('')).toBeNull();
  });

  /**
   * ⚠️ Ez a kör lényege: a `XmlHiba` **nem** szivároghat ki a hívóhoz.
   *
   * A `kiolvas` Edge Function eddig a saját `try`-jában nyelte el, és pont ez
   * az a tíz sor, amit egy második hívó lemásolt volna — rosszul. Ha
   * kiszivárogna, a doctype-os fájl nem a modellhez esne, hanem a bizonylat
   * három próbálkozás után `hiba` állapotba kerülne.
   */
  test('a doctype-os XML null, nem kivétel — a modell még megnézheti', () => {
    const doctype =
      '<?xml version="1.0"?><!DOCTYPE Invoice [<!ENTITY x SYSTEM "file:///etc/passwd">]><Invoice/>';

    expect(() => olvas(doctype)).not.toThrow();
    expect(olvas(doctype)).toBeNull();
  });

  test('a méreten túli XML is null, ugyanebből az okból', () => {
    // A tartalom érvényes UBL; egyedül a **bejelentett** hossz viszi a korlát fölé.
    expect(xmlbolKiolvas(UBL, MAX_BAJT + 1)).toBeNull();
  });

  /**
   * A másik irány: ami **nem** `XmlHiba`, az nem lehet csendes modellhívás.
   * Egy elnyelt programhiba itt forintos regresszió volna — minden strukturált
   * bizonylat fizetőssé válna, hibaüzenet nélkül.
   */
  test('a nem XmlHiba kivétel átmegy', () => {
    const robbano = {
      toString() {
        throw new Error('sajat hiba');
      },
    };

    expect(() => xmlbolKiolvas(robbano as unknown as string, 10)).toThrow('sajat hiba');
  });
});
