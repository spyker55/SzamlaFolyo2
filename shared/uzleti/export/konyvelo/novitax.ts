import { szamjegyek } from '../../adoszam.ts';
import { zip } from '../zip.ts';
import type { KontirBeallitas } from './beallitas.ts';
import { afaEsedekesseg, type KonyveloiBizonylat } from './atalakit.ts';
import { ansiCsv, datum, szoveg } from './mezok.ts';

/**
 * Novitax NTAX kettős könyvvitel – „Számlák bemásolása külső file-ból".
 *
 * Forrás (2026-09-24-én letöltve):
 * - leírás: https://tudastar.novitax.hu/wp-content/uploads/2016/12/szamla-csv-importalas-3.xls
 *   (sha256 9bef9210ee787a23d1208792386bca27910fc3567855eaa1d6c10155664b126d)
 * - minta:  https://tudastar.novitax.hu/wp-content/uploads/2016/12/szamla_p%C3%A9lda.csv
 *   (sha256 c0de8d5e7f416a529b48ba0db1f791df7c3cb73fc5def48ff437315eb4dfda99)
 * - útmutató: https://tudastar.novitax.hu/szamlak-es-egyeb-bizonylatok-importja-kettos-konyvviteli-rendszerbe/
 *
 * # A szerkezet
 *
 * Két fájl egy mappában (itt: egy ZIP-ben): `szamla.csv` és `partner.csv`,
 * fejléc nélkül, pontosvesszővel, ANSI-ban. A `szamla.csv`-ben **ÁFA-soronként
 * egy sor**, a fej adatai minden sorban ismétlődnek; a bizonylatot a naplókód
 * és a legfeljebb 10 karakteres bizonylatszám azonosítja. Utóbbi a mi
 * iktatószámunk (`SZF` + szám), az eredeti számlaszám a 16. oszlopba megy.
 *
 * A sorok **40 mezősek**, mint a gyártói minta (a leírás 78 oszlopot sorol,
 * a minta a 40. után nem ír semmit; a kettő közül a bizonyítottan beolvasott
 * alakot követjük).
 *
 * Tétel-ÁFA oszlop nincs: a program a nettóból és a kulcsból számolja. A fej
 * összesen-ÁFÁ-ja a bizonylaté.
 *
 * ⚠️ **Nincs kimérve valódi NTAX-ban** – a felületen béta.
 */

const SZAMLA_MEZOK = 40;
const PARTNER_MEZOK = 26;

export function novitaxBizonylatszam(iktatoszam: number): string {
  return `SZF${iktatoszam}`;
}

export function novitaxEllenoriz(b: KonyveloiBizonylat): string[] {
  const ki: string[] = [];
  if (b.partner.torzsszam === null)
    ki.push('A partnernek nincs érvényes magyar adószáma – a Novitax-partnerkód ebből készül.');
  if (b.bizonylatszam.length > 50) ki.push('A bizonylatszám hosszabb 50 karakternél (Novitax-korlát).');
  return ki;
}

export async function novitax(
  bizonylatok: readonly KonyveloiBizonylat[],
  k: KontirBeallitas,
  iktatoszamok: ReadonlyMap<string, number>,
): Promise<Uint8Array> {
  const szamlaSorok: string[][] = [];
  const partnerek = new Map<string, string[]>();

  for (const b of bizonylatok) {
    const ikt = iktatoszamok.get(b.id);
    if (ikt === undefined) throw new Error(`Nincs iktatószáma: ${b.bizonylatszam}`);

    const bejovo = b.irany === 'bejovo';
    const torzs = b.partner.torzsszam as string;
    const negativ = b.netto + b.afa < 0;

    for (const s of b.sorok) {
      const sor: string[] = new Array(SZAMLA_MEZOK).fill('');
      sor[0] = bejovo ? k.novitax.naplokodBe : k.novitax.naplokodKi;
      sor[1] = bejovo ? 'BE' : 'KI';
      sor[2] = novitaxBizonylatszam(ikt);
      sor[3] = datum(b.kelt);
      sor[4] = datum(b.teljesites);
      sor[5] = datum(b.esedekesseg);
      sor[6] = datum(b.teljesites);
      sor[7] = datum(afaEsedekesseg(b));
      // „Általában a bizonylat hónapja" – a leírás szerint.
      sor[8] = String(Number(b.kelt.slice(5, 7)));
      sor[9] = torzs;
      // A fej összesen-összegei előjelhelyesek, a tétel nettója abszolút.
      sor[10] = String(b.netto);
      sor[11] = String(b.afa);
      sor[14] = szoveg(b.megjegyzes, 40);
      sor[15] = szoveg(b.bizonylatszam, 50);
      sor[17] = negativ ? '-' : '+';
      // A sztornó kontírja ugyanaz, mint a normálé – az irányt a ± adja.
      sor[18] = bejovo ? k.koltseg : k.vevo;
      sor[19] = bejovo ? k.szallito : k.arbevetel;
      // Általános szabály: üres típus + százalék; mentesnél a típus a kód.
      sor[20] = s.fajta === 'mentes' ? k.novitax.mentesTipus : '';
      sor[21] = s.fajta === 'mentes' ? '' : s.fajta;
      sor[22] = String(Math.abs(s.netto));
      szamlaSorok.push(sor);
    }

    if (!partnerek.has(torzs)) {
      const p: string[] = new Array(PARTNER_MEZOK).fill('');
      p[0] = torzs;
      p[1] = szoveg(b.partner.nev, 40);
      const jegyek = szamjegyek(b.partner.adoszam);
      p[7] = jegyek.length === 11 ? jegyek : '';
      p[21] = 'HU';
      partnerek.set(torzs, p);
    }
  }

  return zip([
    { nev: 'szamla.csv', tartalom: ansiCsv(szamlaSorok), tomorit: true },
    { nev: 'partner.csv', tartalom: ansiCsv([...partnerek.values()]), tomorit: true },
  ]);
}
