/**
 * Windows-1250 („ANSI") kódolás a könyvelőprogramoknak.
 *
 * Az RLB leírása szó szerint „ANSI kódolást" kér, a Novitax és az RLB
 * gyártói mintája is az (a `file` ISO-8859 szövegnek látja, nem UTF-8-nak) –
 * magyar Windowson ez a 1250-es kódlap. A `TextEncoder` csak UTF-8-at tud,
 * ezért a táblát itt tartjuk.
 *
 * # A szabály, amire vigyázni kell
 *
 * **Magyar betű soha nem lehet `?`.** Egy „Kovács és Társa Kft." helyett
 * „Kov?cs" a könyvelő partnertörzsében maradna. Ami a kódlapban nincs benne,
 * azt először ékezet nélküli alakra bontjuk (`ñ` → `n`), és csak ami így sem
 * megy (kínai írásjel, emoji), az lesz kérdőjel. A magyar betűk mind benne
 * vannak – a `kodolas.test.ts` a böngésző saját dekódolójával méri vissza.
 */

/** A 0x80–0xFF bájtok karakterei, sorban. Az `\uFFFD` a kódlap üres helye. */
const FELSO =
  '\u20AC\uFFFD\u201A\uFFFD\u201E\u2026\u2020\u2021\uFFFD\u2030\u0160\u2039\u015A\u0164\u017D\u0179' +
  '\uFFFD\u2018\u2019\u201C\u201D\u2022\u2013\u2014\uFFFD\u2122\u0161\u203A\u015B\u0165\u017E\u017A' +
  '\u00A0\u02C7\u02D8\u0141\u00A4\u0104\u00A6\u00A7\u00A8\u00A9\u015E\u00AB\u00AC\u00AD\u00AE\u017B' +
  '\u00B0\u00B1\u02DB\u0142\u00B4\u00B5\u00B6\u00B7\u00B8\u0105\u015F\u00BB\u013D\u02DD\u013E\u017C' +
  '\u0154\u00C1\u00C2\u0102\u00C4\u0139\u0106\u00C7\u010C\u00C9\u0118\u00CB\u011A\u00CD\u00CE\u010E' +
  '\u0110\u0143\u0147\u00D3\u00D4\u0150\u00D6\u00D7\u0158\u016E\u00DA\u0170\u00DC\u00DD\u0162\u00DF' +
  '\u0155\u00E1\u00E2\u0103\u00E4\u013A\u0107\u00E7\u010D\u00E9\u0119\u00EB\u011B\u00ED\u00EE\u010F' +
  '\u0111\u0144\u0148\u00F3\u00F4\u0151\u00F6\u00F7\u0159\u016F\u00FA\u0171\u00FC\u00FD\u0163\u02D9';

const TABLA: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (let i = 0; i < FELSO.length; i++) {
    const c = FELSO[i] as string;
    if (c !== '\uFFFD') m.set(c, 0x80 + i);
  }
  return m;
})();

/** Egy karakter bájtja, vagy `null`, ha a kódlapban nincs. */
function bajt(c: string): number | null {
  const kod = c.codePointAt(0) ?? 0x3f;
  if (kod < 0x80) return kod;
  return TABLA.get(c) ?? null;
}

/** Szöveg → Windows-1250 bájtok. Lásd a fájl elején a `?` szabályát. */
export function cp1250(szoveg: string): Uint8Array {
  const ki: number[] = [];

  for (const c of szoveg) {
    const b = bajt(c);
    if (b !== null) {
      ki.push(b);
      continue;
    }

    // Ékezet nélküli alak: az NFKD a mellékjelet külön karakterre bontja.
    const alap = c.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    let volt = false;
    for (const a of alap) {
      const ab = bajt(a);
      if (ab !== null) {
        ki.push(ab);
        volt = true;
      }
    }
    if (!volt) ki.push(0x3f);
  }

  return Uint8Array.from(ki);
}
