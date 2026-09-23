/**
 * Mit mondjon a Beérkező egy sor `error` mezőjéről.
 *
 * # Miért nem elég kiírni
 *
 * A `kiolvas` egy elbukott kísérlet után a hibát a bizonylat sorába írja, és
 * — amíg van még próbálkozás — visszateszi a sorba (`feltoltve`). A képernyő
 * eddig ezt pirossal mutatta, mintha a bizonylat elveszett volna, pedig csak
 * a következő kísérletre várt. 2026-09-23-án a tulajdonos pont ezt látta: egy
 * átmeneti, üres szolgáltatói válasz után ~20 másodpercig piros hiba állt egy
 * bizonylaton, ami utána hibátlanul elkészült.
 *
 * Ezért: **amíg a rendszer még próbálkozik, a jelzés semleges**, és azt mondja,
 * ami történik. Piros csak akkor, ha a bizonylat megállt (`hiba`), vagy más,
 * nem feldolgozás alatti állapotban maradt hibaüzenet — ott a hiba a hír.
 */

export type HibaJelzes = { szoveg: string; sulyos: boolean };

export const UJRAPROBALAS_SZOVEG = 'Egy kiolvasási kísérlet nem sikerült – újrapróbáljuk.';

export function kiolvasasJelzes(allapot: string, hiba: string | null): HibaJelzes | null {
  if (hiba === null || hiba.trim() === '') {
    return null;
  }

  if (allapot === 'feltoltve' || allapot === 'feldolgozas_alatt') {
    return { szoveg: UJRAPROBALAS_SZOVEG, sulyos: false };
  }

  return { szoveg: hiba, sulyos: true };
}
