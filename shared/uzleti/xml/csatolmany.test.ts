import { describe, expect, it } from 'vitest';
import { beagyazottXml, type PdfCsatolmany } from './csatolmany.ts';
import { MAX_BAJT } from './xmlKiolvaso.ts';

/**
 * A csatolmányválasztó mérése.
 *
 * A tét nem elméleti: ha ez a modul rosszul választ, a rendszer **csendben**
 * viselkedik rosszul — vagy fizetünk egy modellhívásért, ami fölösleges volt,
 * vagy egy melléklet-XML-t olvasunk ki a bizonylat helyett. Egyik sem hibaüzenet.
 */

function cs(nev: string, tartalom = '<x/>'): PdfCsatolmany {
  return { nev, tartalom: new TextEncoder().encode(tartalom) };
}

describe('beágyazott XML kiválasztása', () => {
  it('nincs melléklet → nincs mit olvasni', () => {
    expect(beagyazottXml([])).toBeNull();
  });

  it('a szabványos Factur-X nevet felismeri, és a tartalmát adja vissza', () => {
    const talalat = beagyazottXml([cs('factur-x.xml', '<rsm:CrossIndustryInvoice/>')]);

    expect(talalat).toEqual({
      nev: 'factur-x.xml',
      xml: '<rsm:CrossIndustryInvoice/>',
      bajtHossz: 27,
    });
  });

  it('a ZUGFeRD 1.0 nagybetűs neve is átmegy — a kisbetűsítés fogja meg', () => {
    expect(beagyazottXml([cs('ZUGFeRD-invoice.xml')])?.nev).toBe('ZUGFeRD-invoice.xml');
  });

  it('az útvonalas név alapneve számít, a Windows-os elválasztóval is', () => {
    expect(beagyazottXml([cs('Attachments\\factur-x.xml')])?.nev).toBe('factur-x.xml');
    expect(beagyazottXml([cs('/tmp/xrechnung.xml')])?.nev).toBe('xrechnung.xml');
  });

  it('a nem XML mellékletek nem jelöltek', () => {
    expect(beagyazottXml([cs('logo.png'), cs('szerzodes.pdf'), cs('README')])).toBeNull();
  });

  it('a szabványos név **megelőzi** az ismeretlen XML-t, akkor is, ha az áll elöl', () => {
    const talalat = beagyazottXml([cs('melleklet.xml'), cs('factur-x.xml')]);

    expect(talalat?.nev).toBe('factur-x.xml');
  });

  it('két szabványos név esetén az elsőbbségi sorrend dönt — ugyanaz a számla áll bennük', () => {
    expect(beagyazottXml([cs('zugferd-invoice.xml'), cs('factur-x.xml')])?.nev).toBe(
      'factur-x.xml',
    );
  });

  it('egyetlen ismeretlen nevű XML-t elfogadunk: rossz tipp esetén a modell jön', () => {
    expect(beagyazottXml([cs('szamla_export.xml'), cs('logo.png')])?.nev).toBe(
      'szamla_export.xml',
    );
  });

  it('**két** ismeretlen nevű XML viszont többértelmű — nem találgatunk', () => {
    expect(beagyazottXml([cs('egyik.xml'), cs('masik.xml')])).toBeNull();
  });

  it('az üres melléklet nem jelölt — a napló ne mondjon beágyazott XML-t üres fájlra', () => {
    expect(beagyazottXml([cs('factur-x.xml', '')])).toBeNull();
  });

  it('a méretkorlát itt is áll: a túl nagy melléklethez hozzá sem nyúlunk', () => {
    const nagy: PdfCsatolmany = {
      nev: 'factur-x.xml',
      tartalom: new Uint8Array(MAX_BAJT + 1),
    };

    expect(beagyazottXml([nagy])).toBeNull();

    // És a korláton **belül** átmegy — enélkül csak azt tudnánk, hogy valamit
    // elutasít, azt nem, hogy a határ a helyén van.
    expect(beagyazottXml([{ nev: 'factur-x.xml', tartalom: new Uint8Array(MAX_BAJT) }])).not.toBeNull();
  });

  it('a túl nagy szabványos melléklet nem viszi magával a jó tartalékot', () => {
    const talalat = beagyazottXml([
      { nev: 'factur-x.xml', tartalom: new Uint8Array(MAX_BAJT + 1) },
      cs('szamla.xml', '<Invoice/>'),
    ]);

    expect(talalat?.nev).toBe('szamla.xml');
  });

  it('a bájthossz bájtban mérődik, nem karakterben — ékezetes tartalomra is', () => {
    // Nyolc ékezetes betű: karakterben 8, UTF-8-ban 16.
    const talalat = beagyazottXml([cs('factur-x.xml', 'őőőőőőőő')]);

    expect(talalat?.xml).toHaveLength(8);
    expect(talalat?.bajtHossz).toBe(16);
  });

  it('az `order-x.xml` nem szabványos számlanév — tartalékként jön, és csak egyedül', () => {
    // Egyedül: jelölt (az értelmezőink fogják elutasítani, nem mi).
    expect(beagyazottXml([cs('order-x.xml')])?.nev).toBe('order-x.xml');

    // Számla mellett: a számla nyer, nem a megrendelés.
    expect(beagyazottXml([cs('order-x.xml'), cs('factur-x.xml')])?.nev).toBe('factur-x.xml');
  });
});
