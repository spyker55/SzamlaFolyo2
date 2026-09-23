import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { felderit, naplo, SZOVEG_KUSZOB } from './felderites.ts';
import { xmltFelolvas } from '../../../shared/uzleti/xml/parser.ts';
import { ertelmez } from '../../../shared/uzleti/xml/xmlKiolvaso.ts';
import { bukottak } from '../../../shared/uzleti/validatorok.ts';

/**
 * A **hibrid e-számla** felderítésének mérése — telepítés előtt.
 *
 * Ez a fájl azért létezik, mert a lépés két olyan dolgon áll, amit nem
 * feltételezni akarunk, hanem tudni:
 *
 * 1. hogy a `unpdf` (pdf.js) `getAttachments()`-e **létezik és működik** az
 *    általunk használt verzión, és mit ad vissza melléklet nélküli PDF-re (az
 *    1.8.1-re váltáskor ez az API megváltozott – `Map`, és a tartalom külön
 *    hívással –, és az alábbi tesztek közül hat pontosan erre lett piros;
 *    lásd a `csatolmanyok()` docblockját);
 * 2. hogy a kinyert bájtokból a repó **saját** lánca (`xmltFelolvas` →
 *    `ertelmez`) valóban kiolvassa a számlát.
 *
 * A PLACEHOLDER-eset óta az ilyet nem telepítjük mérés nélkül — és a
 * `unpdf` épp ezért került a `package.json`-be: enélkül ez a fájl a felderítést
 * csak élesben látná először.
 *
 * ⚠️ A fixtúra PDF-jét a `pdf-lib` állítja elő, nem egy valódi Factur-X kiadó.
 * Ami ettől **mérve** van: a `Names/EmbeddedFiles` névfa, amit a pdf.js olvas
 * (a `pdf-lib` `attach()`-e pontosan oda ír). Ami **nincs** mérve: egy valódi
 * gyártó PDF/A-3 állománya, a tömörített mellékletfolyammal. Az az első valódi
 * hibrid számlán derül ki.
 */

const CII = readFileSync('minta/cii-szabalyos.xml', 'utf8');

async function pdfCsatolmannyal(
  mellekletek: { nev: string; tartalom: string }[],
  oldalak = 1,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (let i = 0; i < oldalak; i++) doc.addPage([595, 842]);

  for (const m of mellekletek) {
    doc.attach(new TextEncoder().encode(m.tartalom), m.nev, {
      mimeType: 'application/xml',
      description: m.nev,
    });
  }

  return await doc.save();
}

describe('felderítés: PDF-be ágyazott e-számla', () => {
  it('a `factur-x.xml` mellékletet megtalálja, és `beagyazott_xml`-t ad', async () => {
    const bajtok = await pdfCsatolmannyal([{ nev: 'factur-x.xml', tartalom: CII }]);

    const f = await felderit(bajtok, 'application/pdf');

    expect(f.jelleg).toBe('beagyazott_xml');
    expect(f.xml).toBe(CII);
    expect(f.xmlNev).toBe('factur-x.xml');
    expect(f.oldalszam).toBe(1);

    // A bájthossz a **mellékleté**, nem a PDF-é — ez az a szám, amit a 4 MB-os
    // korlát mér. A kettő közti különbség itt látszik is.
    expect(f.xmlBajt).toBe(Buffer.byteLength(CII, 'utf8'));
    expect(f.xmlBajt).not.toBe(bajtok.byteLength);
  });

  it('**a kinyert XML-ből a repó saját lánca kiolvassa a számlát** — ez a kör lényege', async () => {
    const bajtok = await pdfCsatolmannyal([{ nev: 'factur-x.xml', tartalom: CII }]);
    const f = await felderit(bajtok, 'application/pdf');

    const doc = xmltFelolvas(f.xml!, f.xmlBajt!);
    const eredmeny = doc === null ? null : ertelmez(doc);

    expect(eredmeny?.nev).toBe('xml/cii');
    expect(eredmeny?.nyers['net_amount']).toBe(280000);
    expect(eredmeny?.nyers['vat_amount']).toBe(69000);
    expect(eredmeny?.nyers['gross_amount']).toBe(349000);
  });

  it('melléklet nélküli PDF-en semmi nem változik', async () => {
    const f = await felderit(await pdfCsatolmannyal([]), 'application/pdf');

    // A `pdf-lib` üres lapjain nincs szövegréteg, tehát `kep` — a lényeg, hogy
    // **nem** `beagyazott_xml`, és nem is hibázik a hiányzó névfától.
    expect(f.jelleg).toBe('kep');
    expect(f.xml).toBeNull();
    expect(f.xmlBajt).toBeNull();
    expect(f.xmlNev).toBeNull();
    expect(f.hiba).toBeNull();
  });

  it('a nem XML melléklet nem tereli el a PDF-et az útjáról', async () => {
    const f = await felderit(
      await pdfCsatolmannyal([{ nev: 'logo.png', tartalom: 'nem xml' }]),
      'application/pdf',
    );

    expect(f.jelleg).toBe('kep');
    expect(f.xml).toBeNull();
  });

  it('több melléklet közül a szabványos nevűt veszi, és ezt a napló is rögzíti', async () => {
    const bajtok = await pdfCsatolmannyal([
      { nev: 'kiseroleve.xml', tartalom: '<egyeb/>' },
      { nev: 'factur-x.xml', tartalom: CII },
    ]);

    const f = await felderit(bajtok, 'application/pdf');

    expect(f.xmlNev).toBe('factur-x.xml');
    expect(naplo(f)).toMatchObject({
      jelleg: 'beagyazott_xml',
      xml_nev: 'factur-x.xml',
      xml_bajt: Buffer.byteLength(CII, 'utf8'),
      oldalszam: 1,
    });
  });

  it('**a felderítés nem teszi tönkre a bemenetét** — a pdf.js átveszi a puffert', async () => {
    const bajtok = await pdfCsatolmannyal([{ nev: 'factur-x.xml', tartalom: CII }]);
    const elotte = bajtok.byteLength;

    await felderit(bajtok, 'application/pdf');

    // Másolat nélkül ez **0** lenne: a pdf.js a kapott `ArrayBuffer`-t átadja
    // a feldolgozójának, és leválasztja. A `kiolvas` viszont a felderítés után
    // is ugyanebből a tömbből vágja ki a bizonylat oldalait, és ezt küldi a
    // modellnek — egy leválasztott puffer üres bizonylatot jelentene,
    // hibaüzenet nélkül.
    expect(bajtok.byteLength).toBe(elotte);
    expect(bajtok.byteLength).toBeGreaterThan(0);
  });

  it('a valódi mintafájl a szövegrétegénél **erősebb** ágra kerül', async () => {
    const bajtok = new Uint8Array(readFileSync('minta/factur-x-szabalyos.pdf'));

    const f = await felderit(bajtok, 'application/pdf');

    // Ez a fájl a kör értelme egyetlen sorban: **van** szövegrétege, bőven a
    // küszöb fölött, tehát a kör előtt `szovegreteg` lett volna és a modellhez
    // ment volna. A melléklet ezt megelőzi.
    expect(f.szovegHossz).toBeGreaterThan(SZOVEG_KUSZOB);
    expect(f.jelleg).toBe('beagyazott_xml');
    expect(f.xmlNev).toBe('factur-x.xml');
  });

  it('a többoldalas hibrid számla is egy bizonylat marad', async () => {
    const f = await felderit(
      await pdfCsatolmannyal([{ nev: 'zugferd-invoice.xml', tartalom: CII }], 3),
      'application/pdf',
    );

    // Az oldalszám megmarad (a kredit ebből számol), a jelleg viszont kizárja
    // a kötegszétszedést — lásd az `esetlegSzetszed` fékjét.
    expect(f.jelleg).toBe('beagyazott_xml');
    expect(f.oldalszam).toBe(3);
  });
});

describe('felderítés: szövegréteg oldalanként (Chromiumban nyomtatott PDF)', () => {
  // A kötegszétszedő az oldalankénti szöveget küldi a modellnek, nem a fájlt.
  // Ha a szöveg egybefolyna, vagy az ékezet elveszne, a bizonylathatárok
  // felismerése romlana – hibaüzenet nélkül. Lásd `tesztadat/OLVASS-EL.md`.

  it('három oldal, három külön szöveg, mindegyikben csak a saját számlája', async () => {
    const f = await felderit(
      new Uint8Array(readFileSync('tesztadat/harom-szamla.pdf')),
      'application/pdf',
    );

    expect(f.jelleg).toBe('szovegreteg');
    expect(f.oldalszam).toBe(3);
    expect(f.oldalSzovegek).toHaveLength(3);

    f.oldalSzovegek!.forEach((szoveg, i) => {
      for (let j = 1; j <= 3; j++) {
        const sorszam = `SZ-2026/000${j}`;
        if (j === i + 1) expect(szoveg).toContain(sorszam);
        else expect(szoveg).not.toContain(sorszam);
      }
    });
  });

  it('a magyar ékezetek épen jönnek ki (ő, ű, Ő)', async () => {
    const f = await felderit(
      new Uint8Array(readFileSync('tesztadat/harom-szamla.pdf')),
      'application/pdf',
    );
    const elso = f.oldalSzovegek![0]!;

    expect(elso).toContain('Árvíztűrő Tükörfúrógép Kft.');
    expect(elso).toContain('Őrült Ügyvitel Bt.');
    expect(elso).toContain('Fizetendő: 1 234 567,00 Ft');
  });

  it('a csak képet tartalmazó PDF `kep`, és az oldalszáma megvan', async () => {
    const f = await felderit(
      new Uint8Array(readFileSync('tesztadat/csak-kep.pdf')),
      'application/pdf',
    );

    expect(f.jelleg).toBe('kep');
    expect(f.oldalszam).toBe(1);
    expect(f.szovegHossz).toBeLessThan(SZOVEG_KUSZOB);
    expect(f.hiba).toBeNull();
  });
});

describe('a rendes háromszámlás próbafájl tényleg ellentmondásmentes', () => {
  // A 2026-09-23-i `harom-szamla.pdf` szándékosan hibás volt, és mérve ez a
  // modell gondolkodását nagyjából megduplázta (921–1396 vs. 303–891 token), az
  // elszaladását megháromszorozta. A sebességmérés erre a fájlra épül: ha
  // egyszer ellentmondás csúszik bele, újra a modell zavarát mérnénk.
  const ADAT = JSON.parse(readFileSync('tesztadat/harom-szamla-rendes.json', 'utf8')) as {
    szamlak: (Record<string, unknown> & {
      tetelek: { netto: number }[];
      net_amount: number;
      vat_amount: number;
      gross_amount: number;
    })[];
  };
  const ft = (n: number) => `${n.toLocaleString('hu-HU').replace(/\s/g, ' ')} Ft`;

  it('a saját validátorunk egyetlen mezőn sem jelez', () => {
    for (const { tetelek: _t, ...mezok } of ADAT.szamlak) {
      expect(bukottak({ ...mezok, fizetendo: mezok.gross_amount })).toEqual({});
    }
  });

  it('a tételek kiadják az összesent', () => {
    for (const sz of ADAT.szamlak) {
      const netto = sz.tetelek.reduce((o, t) => o + t.netto, 0);
      const afa = sz.tetelek.reduce((o, t) => o + Math.round(t.netto * 0.27), 0);
      expect([netto, afa, netto + afa]).toEqual([sz.net_amount, sz.vat_amount, sz.gross_amount]);
    }
  });

  it('a PDF oldalai pontosan ezt hordozzák, oldalanként egy számlát', async () => {
    const f = await felderit(
      new Uint8Array(readFileSync('tesztadat/harom-szamla-rendes.pdf')),
      'application/pdf',
    );

    expect(f.jelleg).toBe('szovegreteg');
    expect(f.oldalSzovegek).toHaveLength(ADAT.szamlak.length);

    ADAT.szamlak.forEach((sz, i) => {
      const oldal = f.oldalSzovegek![i]!;
      for (const masik of ADAT.szamlak) {
        if (masik === sz) expect(oldal).toContain(String(masik['doc_number']));
        else expect(oldal).not.toContain(String(masik['doc_number']));
      }
      expect(oldal).toContain(String(sz['supplier_tax_number']));
      expect(oldal).toContain(String(sz['customer_tax_number']));
      expect(oldal).toContain(`Fizetendő: ${ft(sz.gross_amount)}`);
      expect(oldal).toContain(`Összesen ${ft(sz.net_amount)} ${ft(sz.vat_amount)} ${ft(sz.gross_amount)}`);
    });
  });
});

describe('felderítés: az önálló XML ága nem változott', () => {
  it('a feltöltött XML `strukturalt_xml`, és a bájthossza a sajátja', async () => {
    const bajtok = new TextEncoder().encode(CII);

    const f = await felderit(bajtok, 'application/xml');

    expect(f.jelleg).toBe('strukturalt_xml');
    expect(f.xml).toBe(CII);
    expect(f.xmlBajt).toBe(bajtok.byteLength);
    expect(f.xmlNev).toBeNull();
    expect(f.oldalszam).toBeNull();
  });

  it('a `naplo()` nem ír `xml_nev`-et oda, ahol nincs melléklet', async () => {
    const f = await felderit(new TextEncoder().encode(CII), 'application/xml');

    expect(naplo(f)).not.toHaveProperty('xml_nev');
    expect(naplo(f)).toHaveProperty('xml_bajt');
  });
});
