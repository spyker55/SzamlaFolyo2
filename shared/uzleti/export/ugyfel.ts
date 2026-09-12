import { torzsszam } from '../adoszam.ts';

/**
 * Az export ügyfélszűrője.
 *
 * **Ez a képesség tartja egy fiókban a könyvelőirodát**: a szétválasztás az
 * exportnál történik, nem cégek adminisztrálásával. Ha ez elromlik, a termék
 * visszakerül oda, hogy a felhasználónak fogalmakat kell kezelnie ahhoz, hogy
 * szétválasszon valamit.
 *
 * A szűrő **adószámra** megy, azon belül is a **törzsszámra** (első nyolc jegy):
 * ugyanaz a cég szerepelhet `12345678-2-41` és `HU12345678` alakban is
 * ugyanabban a hónapban — az ÁFA-kód és a megyekód változhat, az adóalanyt az
 * első nyolc jegy azonosítja. Névre szűrni még rosszabb volna: a „Példa Kft.",
 * „Példa Kft" és „PÉLDA KFT" ugyanaz a cég, három sztring.
 */

export type UgyfelSzurheto = {
  supplier_name?: string | null;
  supplier_tax_number?: string | null;
  customer_name?: string | null;
  customer_tax_number?: string | null;
};

/**
 * Ehhez az ügyfélhez tartozik-e a bizonylat.
 *
 * **Mindkét oldalt nézzük.** A könyvelő ügyfele a bejövő számlán a vevő, a
 * kimenőn viszont a szállító — ugyanannak az ügyfélnek a papírjai. Aki az
 * ügyfelét választja ki, mindkettőt várja, nem a felét.
 */
export function ugyfele(d: UgyfelSzurheto, torzs: string): boolean {
  return (
    torzsszam(d.customer_tax_number) === torzs || torzsszam(d.supplier_tax_number) === torzs
  );
}

export type UgyfelOpcio = { torzsszam: string; cimke: string };

/**
 * A választható ügyfelek: a **vevő** oldal törzsszámai.
 *
 * Csak a vevő oldaláról gyűjtünk, mert a könyvelő ügyfelei ott állnak
 * ismétlődően; a szállítók listája minden beszállítót tartalmazna, és
 * használhatatlanul hosszú lenne. A kiválasztott ügyfél kimenő számlái ettől
 * még bejönnek — azt az `ugyfele()` intézi.
 */
export function ugyfelek(bizonylatok: readonly UgyfelSzurheto[]): UgyfelOpcio[] {
  const ki = new Map<string, string>();

  for (const d of bizonylatok) {
    const torzs = torzsszam(d.customer_tax_number);

    if (torzs === null || ki.has(torzs)) {
      continue;
    }

    const nev = (d.customer_name ?? '').trim();
    const adoszam = d.customer_tax_number ?? torzs;

    ki.set(torzs, nev === '' ? adoszam : `${nev} (${adoszam})`);
  }

  return [...ki.entries()]
    .map(([torzs, cimke]) => ({ torzsszam: torzs, cimke }))
    .sort((a, b) => a.cimke.localeCompare(b.cimke, 'hu'));
}
