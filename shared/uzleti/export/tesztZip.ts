import { inflateRawSync } from 'node:zlib';

/**
 * Csak teszteknek: ZIP visszaolvasása (`formatumok.test.ts`, a
 * könyvelőprogram-írók tesztjei). Node-ot használ, a böngészőbe nem kerül –
 * semmi nem importálja teszten kívül.
 */

/**
 * A saját írónk kimenetét a teszt **visszaolvassa**: végigmegy a központi
 * katalóguson, és kicsomagolja a bejegyzéseket. Ez az egyetlen módja annak,
 * hogy egy saját ZIP-íróról kiderüljön, tényleg ZIP-et ír-e.
 */
export function kicsomagol(adat: Uint8Array): Map<string, Uint8Array> {
  const nezet = new DataView(adat.buffer, adat.byteOffset, adat.byteLength);
  const dekodolo = new TextDecoder();

  // A záró rekordot a végéről keressük vissza (megjegyzés nélkül 22 bájt).
  let zaro = adat.length - 22;
  while (zaro >= 0 && nezet.getUint32(zaro, true) !== 0x06054b50) zaro--;
  if (zaro < 0) throw new Error('Nincs záró rekord – ez nem ZIP.');

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
