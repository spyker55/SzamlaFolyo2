import { describe, expect, test } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import { ir as csvIr } from './csv.ts';
import { ir as jsonIr } from './json.ts';
import { fajl as xlsxFajl, oszlopBetu } from './xlsx.ts';
import { egyediNev, zip } from './zip.ts';
import { KULCSOK } from './oszlopok.ts';

/**
 * A régi `tests/Unit/ExportFormatumTest.php` esetei, plusz ami a saját ZIP- és
 * xlsx-íróval jött be.
 */

function sorok(felul: Record<string, unknown> = {}): Record<string, unknown>[] {
  return [
    {
      tipus: 'Számla',
      szallito: 'Példa Kft.',
      szallito_adoszam: '10773381-2-44',
      vevo: null,
      vevo_adoszam: null,
      bizonylatszam: 'SZ-1',
      kelt: '2026-03-14',
      teljesites: null,
      fizetesi_hatarido: '2026-03-28',
      netto: 100000,
      afa: 27000,
      brutto: 127000,
      fizetendo: 127000,
      netto_27: 100000,
      afa_27: 27000,
      penznem: 'HUF',
      fizetesi_mod: 'átutalás',
      konyvelendo: 'igen',
      megjegyzes: null,
      beerkezes: '2026-03-15',
      forras: 'feltöltés',
      oldalak: '3–4',
      afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: '100000.00', afa: '27000.00' }],
      ...felul,
    },
  ];
}

describe('csv', () => {
  test('a magyar Excel nyelvjárása', () => {
    const csv = csvIr(sorok());

    expect(csv.startsWith('\uFEFF')).toBe(true); // BOM nélkül elromlanak az ékezetek
    expect(csv).toContain('"Szállító adószáma"');
    expect(csv).toContain(';');
    expect(csv).toContain('\r\n');
    // Tizedesvessző, csoportosítás nélkül — így olvassa számként a magyar Excel.
    expect(csv).toContain('127000,00');
    expect(csv).not.toContain('127 000');
  });

  /**
   * A partner nevét egy modell olvasta ki egy idegen PDF-ből: ha `=`-lel
   * kezdődik, az Excel képletként futtatná.
   */
  test('védi a szöveges cellát formula-injekció ellen', () => {
    const csv = csvIr(sorok({ szallito: '=HYPERLINK("http://rossz.hu","kattints")' }));

    expect(csv).toContain('"\'=HYPERLINK');
  });

  /** A számoszlopot viszont nem: ott a sztornó mínusza szöveggé fordulna. */
  test('nem rontja el a negatív összeget', () => {
    const csv = csvIr(sorok({ brutto: -127000 }));

    expect(csv).toContain('-127000,00');
    expect(csv).not.toContain("'-127000");
  });

  test('számként írja a kulcsonkénti oszlopokat', () => {
    const csv = csvIr(sorok());

    expect(csv).toContain('"Nettó 27"');
    expect(csv).toContain('"ÁFA egyéb"');
    expect(csv).toContain('27000,00');
    // Amire nincs sor, az üres marad — nem nulla.
    expect(csv).not.toContain('0,00;0,00');
  });

  /** A beágyazott lista csak a JSON-ban fér el, a táblázat nem látja. */
  test('nem írja ki a beágyazott bontást', () => {
    const csv = csvIr(sorok());

    expect(csv).not.toContain('kategoria');
    expect(csv).not.toContain('afa_bontas');
  });

  test('az idézőjelet megkettőzi', () => {
    expect(csvIr(sorok({ szallito: 'A "Nagy" Kft.' }))).toContain('"A ""Nagy"" Kft."');
  });
});

describe('json', () => {
  /**
   * A kategóriakód nélkül egy nulla százalékos sor értelmezhetetlen: nem derül
   * ki, fordított adózás, mentesség vagy közösségi értékesítés-e.
   */
  test('viszi a teljes bontást kategóriakóddal', () => {
    const json = JSON.parse(jsonIr(sorok()));
    const tetel = json.tetelek[0];

    expect(tetel.afa_bontas[0].kategoria).toBe('S');
    expect(tetel.afa_bontas[0].netto).toBe('100000.00');

    // A lapos oszlopok emellett is ott vannak: aki csak azokat olvassa,
    // ugyanazt a számot kapja.
    expect(tetel.afa_27).toBe(27000);
    expect(tetel.fizetendo).toBe(127000);
  });

  test('a szám szám, a hiányzó érték null', () => {
    const nyers = jsonIr(sorok(), { ceg: 'Teszt' });
    const json = JSON.parse(nyers);

    expect(json.ceg).toBe('Teszt');
    expect(json.tetelek[0].vevo).toBeNull();
    expect(json.tetelek[0].kelt).toBe('2026-03-14');
    expect(typeof json.tetelek[0].brutto).toBe('number');
    expect(nyers).toMatch(/"brutto":\s*127000/);
    expect(nyers).not.toContain('"brutto": "');
  });

  test('minden oszlop szerepel, üres bemenetnél is', () => {
    const json = JSON.parse(jsonIr([{}]));

    expect(Object.keys(json.tetelek[0])).toEqual([...KULCSOK]);
  });
});

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/**
 * A saját írónk kimenetét a teszt **visszaolvassa**: végigmegy a központi
 * katalóguson, és kicsomagolja a bejegyzéseket. Ez az egyetlen módja annak,
 * hogy egy saját ZIP-íróról kiderüljön, tényleg ZIP-et ír-e.
 */
function kicsomagol(adat: Uint8Array): Map<string, Uint8Array> {
  const nezet = new DataView(adat.buffer, adat.byteOffset, adat.byteLength);
  const dekodolo = new TextDecoder();

  // A záró rekordot a végéről keressük vissza (megjegyzés nélkül 22 bájt).
  let zaro = adat.length - 22;
  while (zaro >= 0 && nezet.getUint32(zaro, true) !== 0x06054b50) zaro--;
  if (zaro < 0) throw new Error('Nincs záró rekord — ez nem ZIP.');

  const darab = nezet.getUint16(zaro + 10, true);
  let hol = nezet.getUint32(zaro + 16, true);
  const ki = new Map<string, Uint8Array>();

  for (let i = 0; i < darab; i++) {
    if (nezet.getUint32(hol, true) !== 0x02014b50) throw new Error('Sérült katalógus.');

    const mod = nezet.getUint16(hol + 10, true);
    const tomorMeret = nezet.getUint32(hol + 20, true);
    const nevHossz = nezet.getUint16(hol + 28, true);
    const extraHossz = nezet.getUint16(hol + 30, true);
    const megjegyzesHossz = nezet.getUint16(hol + 32, true);
    const helyiEltolas = nezet.getUint32(hol + 42, true);
    const nev = dekodolo.decode(adat.slice(hol + 46, hol + 46 + nevHossz));

    const helyiNevHossz = nezet.getUint16(helyiEltolas + 26, true);
    const helyiExtraHossz = nezet.getUint16(helyiEltolas + 28, true);
    const adatKezdet = helyiEltolas + 30 + helyiNevHossz + helyiExtraHossz;
    const nyers = adat.slice(adatKezdet, adatKezdet + tomorMeret);

    ki.set(nev, mod === 8 ? new Uint8Array(inflateRawSync(nyers)) : nyers);
    hol += 46 + nevHossz + extraHossz + megjegyzesHossz;
  }

  return ki;
}

describe('zip', () => {
  test('a kicsomagolt tartalom az eredeti', async () => {
    const kodolo = new TextEncoder();
    const csomag = await zip([
      { nev: 'elso.txt', tartalom: kodolo.encode('Árvíztűrő tükörfúrógép') },
      { nev: 'mappa/masodik.txt', tartalom: kodolo.encode('x'.repeat(5000)), tomorit: true },
    ]);

    const vissza = kicsomagol(csomag);
    const dekodolo = new TextDecoder();

    expect([...vissza.keys()]).toEqual(['elso.txt', 'mappa/masodik.txt']);
    expect(dekodolo.decode(vissza.get('elso.txt'))).toBe('Árvíztűrő tükörfúrógép');
    expect(dekodolo.decode(vissza.get('mappa/masodik.txt'))).toBe('x'.repeat(5000));
  });

  /** Ami már tömörített, azon a deflate csak CPU-t égetne. */
  test('tömörítés nélkül is érvényes ZIP', async () => {
    const tartalom = new Uint8Array([1, 2, 3, 4, 5]);
    const csomag = await zip([{ nev: 'a.bin', tartalom }]);

    expect([...kicsomagol(csomag).get('a.bin')!]).toEqual([1, 2, 3, 4, 5]);
  });

  /** Az üres ZIP is nyitható — nulla tétel esetén nem szabad elszállni. */
  test('az üres ZIP is érvényes', async () => {
    expect(kicsomagol(await zip([])).size).toBe(0);
  });

  test('az ütköző neveket megkülönbözteti', () => {
    const hasznalt = new Set<string>();

    expect(egyediNev('SZ-1.pdf', hasznalt)).toBe('SZ-1.pdf');
    expect(egyediNev('SZ-1.pdf', hasznalt)).toBe('SZ-1_2.pdf');
    expect(egyediNev('SZ-1.pdf', hasznalt)).toBe('SZ-1_3.pdf');
    expect(egyediNev('masik.pdf', hasznalt)).toBe('masik.pdf');
  });
});

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------

describe('xlsx', () => {
  test('huszonöt fölött is helyes az oszlopbetű', () => {
    expect(oszlopBetu(0)).toBe('A');
    expect(oszlopBetu(25)).toBe('Z');
    expect(oszlopBetu(26)).toBe('AA');
    expect(oszlopBetu(28)).toBe('AC');
  });

  test('a csomag minden kötelező része megvan', async () => {
    const reszek = kicsomagol(await xlsxFajl(sorok()));

    expect([...reszek.keys()].sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  /**
   * ⚠️ Ez az egész export értelme: a könyvelő számolni akar a cellákkal.
   * Szövegként (`t="inlineStr"`) kiírva használhatatlanok lennének.
   */
  test('a számokat számként írja, a szöveget szövegként', async () => {
    const reszek = kicsomagol(await xlsxFajl(sorok()));
    const lap = new TextDecoder().decode(reszek.get('xl/worksheets/sheet1.xml'));

    // A „Bruttó" a 12. oszlop (L), az adatsor a 2.
    expect(lap).toContain('<c r="L2"><v>127000</v></c>');
    expect(lap).toContain('<is><t xml:space="preserve">Példa Kft.</t></is>');
    // A fejléc félkövér stílust kap.
    expect(lap).toContain('<c r="A1" s="1" t="inlineStr">');
  });

  test('a hiányzó értéket ki sem írja', async () => {
    const reszek = kicsomagol(await xlsxFajl(sorok()));
    const lap = new TextDecoder().decode(reszek.get('xl/worksheets/sheet1.xml'));

    // A „Vevő" (D) és a „Nettó 5" (R) oszlopban nincs adat — cella sincs.
    expect(lap).not.toContain('r="D2"');
    expect(lap).not.toContain('r="R2"');
  });

  /** Egy vezérlőkarakter nem ér meg egy megnyithatatlan exportot. */
  test('a vezérlőkaraktert és az XML-jeleket megszelídíti', async () => {
    const reszek = kicsomagol(await xlsxFajl(sorok({ szallito: 'A\u0007B & C <d>' })));
    const lap = new TextDecoder().decode(reszek.get('xl/worksheets/sheet1.xml'));

    expect(lap).toContain('AB &amp; C &lt;d&gt;');
    expect(lap).not.toContain('\u0007');
  });

  test('a negatív és a törtes összeg is átmegy', async () => {
    const reszek = kicsomagol(await xlsxFajl(sorok({ brutto: -1270.5 })));
    const lap = new TextDecoder().decode(reszek.get('xl/worksheets/sheet1.xml'));

    expect(lap).toContain('<c r="L2"><v>-1270.50</v></c>');
  });
});
