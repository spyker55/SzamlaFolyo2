import { cp1250 } from './kodolas.ts';

/**
 * A programfájlok közös cellaszabályai.
 *
 * # Miért nem a táblázatos CSV szabályai
 *
 * A `../csv.ts` az Excelnek ír: idézőjelbe tesz, és az `=`-lel kezdődő cella
 * elé aposztrófot tesz (formula-injekció ellen). Egy könyvelőprogram viszont
 * **nem Excel**: az RLB mintájában egyetlen idézőjel sincs, és az aposztrófot
 * a program a partner nevének részeként tárolná. Itt ezért nincs idézés –
 * helyette a cellából **kiszűrjük** azt, ami a sort szétvágná: az
 * elválasztót, a sortörést és az idézőjelet.
 */

/** Szöveges cella: egy sor, elválasztó nélkül, legfeljebb `max` karakter. */
export function szoveg(ertek: string | null | undefined, max: number): string {
  return (ertek ?? '')
    .replace(/;/g, ',')
    .replace(/"/g, "'")
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

/** `2026-09-24` → `2026.09.24` (mindhárom program ezt kéri). */
export function datum(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.');
}

/** A sorok pontosvesszővel, CRLF-fel, Windows-1250-ben – ahogy a gyártói minták. */
export function ansiCsv(sorok: readonly (readonly (string | number)[])[]): Uint8Array {
  return cp1250(sorok.map((s) => s.join(';')).join('\r\n') + '\r\n');
}
