import { FEJLECEK, KULCSOK, SZAM_OSZLOPOK, type ExportCella } from './oszlopok.ts';

/**
 * CSV a magyar Excelnek.
 *
 * Pontosvessző, tizedesvessző, UTF-8 BOM és CRLF — ez az a négy dolog, amitől a
 * magyar Excel számként nyitja meg a számokat, és nem tolja egy oszlopba az
 * egész sort.
 */

export function ir(sorok: readonly Record<string, unknown>[]): string {
  // BOM: enélkül az Excel latin-1-ként olvassa az ékezeteket.
  let ki = '\uFEFF';
  ki += KULCSOK.map((k) => szoveg(FEJLECEK[k])).join(';') + '\r\n';

  for (const sor of sorok) {
    const cellak = KULCSOK.map((kulcs) => {
      const ertek = (sor[kulcs] ?? null) as ExportCella;

      return SZAM_OSZLOPOK.includes(kulcs)
        ? szam(ertek)
        : szoveg(ertek === null ? '' : String(ertek));
    });

    ki += cellak.join(';') + '\r\n';
  }

  return ki;
}

/**
 * Tizedesvessző, csoportosítás nélkül: a magyar Excel így olvassa számként.
 *
 * A számoszlopot **nem** védjük formula-injekció ellen — ott a sztornó mínusza
 * szöveggé fordulna, és pont a negatív összeg az, amit a könyvelőnek ki kell
 * tudnia vonni.
 */
function szam(ertek: ExportCella): string {
  if (ertek === null || ertek === '') {
    return '';
  }

  const n = typeof ertek === 'number' ? ertek : Number(ertek);

  if (!Number.isFinite(n)) {
    return '';
  }

  return n.toFixed(2).replace('.', ',');
}

/**
 * A szöveges cellák formula-injekció ellen védve.
 *
 * A partner nevét egy modell olvasta ki egy PDF-ből, tehát a tartalom **idegen
 * eredetű**: ha `=`-lel kezdődik, az Excel képletként futtatná.
 */
function szoveg(ertek: string): string {
  let s = ertek;

  if (s !== '' && '=+-@\t\r'.includes(s[0] as string)) {
    s = "'" + s;
  }

  return '"' + s.replace(/"/g, '""') + '"';
}
