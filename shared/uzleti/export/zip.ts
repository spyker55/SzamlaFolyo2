/**
 * ZIP-írás idegen könyvtár nélkül.
 *
 * Két helyen kell: az `xlsx` maga egy ZIP-be csomagolt XML-halom, és az eredeti
 * bizonylatok letöltése is ZIP. Egyik sem indokol új futásidejű függőséget —
 * a formátum régi és egyszerű, a tömörítést pedig a futtatókörnyezet adja
 * (`CompressionStream`, amit a böngésző, a Deno és a Node 18+ is ismer).
 *
 * **STORE vagy deflate, bejegyzésenként.** A PDF és a JPEG már tömörített: ott
 * a deflate csak CPU-t égetne, néha nagyobb fájlért. Az XML viszont tizedére
 * megy össze.
 *
 * ZIP64 nincs. A határokat **kimondjuk és megállunk**: egy csendben rossz ZIP
 * rosszabb, mint egy beszédes hiba.
 */

export type ZipBejegyzes = {
  /** A név a ZIP-ben. Mindig `/`-rel, soha nem `\`-sel. */
  nev: string;
  tartalom: Uint8Array;
  /** Alapból nincs tömörítés — az már tömörített tartalomra a helyes döntés. */
  tomorit?: boolean;
};

/** ZIP64 nélkül ennyi fér el. Fölötte megállunk. */
const MAX_BAJT = 0xffffffff;
const MAX_BEJEGYZES = 0xffff;

export async function zip(
  bejegyzesek: readonly ZipBejegyzes[],
  ido: Date = new Date(),
): Promise<Uint8Array> {
  if (bejegyzesek.length > MAX_BEJEGYZES) {
    throw new Error(
      `Egy ZIP-be legfeljebb ${MAX_BEJEGYZES} fájl fér (ZIP64 nélkül). Szűkíts az időszakon.`,
    );
  }

  const kodolo = new TextEncoder();
  const { ido: dosIdo, datum: dosDatum } = dosIdobelyeg(ido);

  const darabok: Uint8Array[] = [];
  const katalogus: Uint8Array[] = [];
  let eltolas = 0;

  for (const bejegyzes of bejegyzesek) {
    const nev = kodolo.encode(bejegyzes.nev);
    const nyers = bejegyzes.tartalom;
    const tomoritett = bejegyzes.tomorit === true ? await deflate(nyers) : null;

    // Ha a tömörítés nem hozott nyereséget, STORE marad. Így a kimenet soha nem
    // lesz nagyobb attól, hogy tömöríteni próbáltuk.
    const tomor = tomoritett !== null && tomoritett.length < nyers.length;
    const adat = tomor ? (tomoritett as Uint8Array) : nyers;
    const mod = tomor ? 8 : 0;
    const crc = crc32(nyers);

    const fej = new Uint8Array(30 + nev.length);
    const fejNezet = new DataView(fej.buffer);
    fejNezet.setUint32(0, 0x04034b50, true);
    fejNezet.setUint16(4, 20, true); // ehhez a verzióhoz kell kicsomagoló
    fejNezet.setUint16(6, 0x0800, true); // 11. bit: a név UTF-8
    fejNezet.setUint16(8, mod, true);
    fejNezet.setUint16(10, dosIdo, true);
    fejNezet.setUint16(12, dosDatum, true);
    fejNezet.setUint32(14, crc, true);
    fejNezet.setUint32(18, adat.length, true);
    fejNezet.setUint32(22, nyers.length, true);
    fejNezet.setUint16(26, nev.length, true);
    fejNezet.setUint16(28, 0, true);
    fej.set(nev, 30);

    const katalogusSor = new Uint8Array(46 + nev.length);
    const katalogusNezet = new DataView(katalogusSor.buffer);
    katalogusNezet.setUint32(0, 0x02014b50, true);
    katalogusNezet.setUint16(4, 20, true);
    katalogusNezet.setUint16(6, 20, true);
    katalogusNezet.setUint16(8, 0x0800, true);
    katalogusNezet.setUint16(10, mod, true);
    katalogusNezet.setUint16(12, dosIdo, true);
    katalogusNezet.setUint16(14, dosDatum, true);
    katalogusNezet.setUint32(16, crc, true);
    katalogusNezet.setUint32(20, adat.length, true);
    katalogusNezet.setUint32(24, nyers.length, true);
    katalogusNezet.setUint16(28, nev.length, true);
    katalogusNezet.setUint32(42, eltolas, true);
    katalogusSor.set(nev, 46);

    darabok.push(fej, adat);
    katalogus.push(katalogusSor);
    eltolas += fej.length + adat.length;

    if (eltolas > MAX_BAJT) {
      throw new Error('A ZIP 4 GB fölé nőne (ZIP64 nélkül). Szűkíts az időszakon.');
    }
  }

  const katalogusMeret = katalogus.reduce((ossz, r) => ossz + r.length, 0);

  const zaro = new Uint8Array(22);
  const zaroNezet = new DataView(zaro.buffer);
  zaroNezet.setUint32(0, 0x06054b50, true);
  zaroNezet.setUint16(8, bejegyzesek.length, true);
  zaroNezet.setUint16(10, bejegyzesek.length, true);
  zaroNezet.setUint32(12, katalogusMeret, true);
  zaroNezet.setUint32(16, eltolas, true);

  return osszefuz([...darabok, ...katalogus, zaro]);
}

/** Ütközésmentes név a ZIP-ben: ami foglalt, az `_2`, `_3` … utótagot kap. */
export function egyediNev(nev: string, hasznalt: Set<string>): string {
  if (!hasznalt.has(nev)) {
    hasznalt.add(nev);
    return nev;
  }

  const pont = nev.lastIndexOf('.');
  const alap = pont > 0 ? nev.slice(0, pont) : nev;
  const kiterjesztes = pont > 0 ? nev.slice(pont) : '';

  let n = 2;
  let jelolt = `${alap}_${n}${kiterjesztes}`;

  while (hasznalt.has(jelolt)) {
    n++;
    jelolt = `${alap}_${n}${kiterjesztes}`;
  }

  hasznalt.add(jelolt);
  return jelolt;
}

// ---------------------------------------------------------------------------
// Belső segédek
// ---------------------------------------------------------------------------

async function deflate(adat: Uint8Array): Promise<Uint8Array | null> {
  // Nincs `CompressionStream`? Akkor STORE marad. A ZIP így is érvényes, csak
  // nagyobb — egy hiányzó böngészőképesség ne akadályozza meg az exportot.
  if (typeof CompressionStream === 'undefined') {
    return null;
  }

  const folyam = new Blob([adat as BlobPart]).stream().pipeThrough(
    new CompressionStream('deflate-raw'),
  );

  return new Uint8Array(await new Response(folyam).arrayBuffer());
}

const CRC_TABLA = (() => {
  const tabla = new Uint32Array(256);

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[i] = c >>> 0;
  }

  return tabla;
})();

export function crc32(adat: Uint8Array): number {
  let c = 0xffffffff;

  for (let i = 0; i < adat.length; i++) {
    c = (CRC_TABLA[((c ^ (adat[i] as number)) & 0xff) as number] as number) ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

/** A DOS-időbélyeg 1980-tól számol, és két másodperces felbontású. */
function dosIdobelyeg(d: Date): { ido: number; datum: number } {
  const ev = Math.max(1980, d.getFullYear());

  return {
    ido: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    datum: ((ev - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function osszefuz(darabok: readonly Uint8Array[]): Uint8Array {
  const meret = darabok.reduce((ossz, d) => ossz + d.length, 0);
  const ki = new Uint8Array(meret);
  let hol = 0;

  for (const darab of darabok) {
    ki.set(darab, hol);
    hol += darab.length;
  }

  return ki;
}
