import type { AfaFajta, FizetesiMod, KontirBeallitas } from './beallitas.ts';
import { afaEsedekesseg, type KonyveloiBizonylat } from './atalakit.ts';
import { ansiCsv, datum, szoveg } from './mezok.ts';

/**
 * RLB Kettős könyvvitel – „Automatikus könyvelés CSV-ből", többsoros formátum.
 *
 * Forrás (2026-09-24-én letöltve):
 * - leírás: https://www.rlb.hu/LETOLT/SEGEDPRG/tobbsoros_struct_20200901120000.xls
 *   (sha256 9f2fb77c05191cc928354102667710fd47b70cc7c417b692659aa439c30f99a4)
 * - minta:  https://www.rlb.hu/LETOLT/SEGEDPRG/Minta_tobbsoros_2021.csv
 *   (sha256 ce469d0b0a221febe52f3ea017be8540e3a8688939fd29192a84217f81dc30e9)
 * - dokumentáció: https://docs.rlb.hu/dokumentacio/kettos-konyvvitel/automatikus-konyveles-csv-bol
 *
 * A gyártói fájlokat nem tesszük a repóba; a fejléc alább betű szerint a
 * mintáé.
 *
 * # A szerkezet
 *
 * Pontosvesszős, ANSI, **minden oszlop minden sorban**. Egy számla egy
 * fejlécsor (`SF` szállító / `VF` vevő) és alatta ÁFA-kulcsonként egy
 * tételsor (`ST` / `VT`). Ugyanaz az oszlop a fejléc- és a tételsorban mást
 * jelent – innen a furcsa, összevont oszlopnevek (`AfadNetto` = fejlécben az
 * ÁFA esedékessége, tételsorban a nettó).
 *
 * ⚠️ **Nincs kimérve valódi RLB-ben** – a formátum a leírás és a minta
 * szerint készül, a felületen béta.
 */

export const RLB_FEJLEC = [
  'Verzio', 'Naplo', 'KeltAkod', 'Teljbevsor', 'AfadNetto', 'Fhatafa', 'FmodBrt',
  'BizNettod', 'MszAfad', 'PnevBrtd', 'PirszNfok', 'PvarNtk', 'PcimAfok', 'AdoszAtk',
  'MegjBfok', 'DnemBtk', 'arfolyam', 'kadomsz', 'evaonyt', 'okodonys', 'kiegybiz', 'TAFADAT',
] as const;

/** A leírás „ÁFA-kódok" táblája. */
const AFAKOD: Record<AfaFajta, number> = { '27': 11, '18': 10, '5': 3, '0': 5, mentes: 4 };

/** A leírás „Fizetési módok" táblája. */
const FIZMOD: Record<FizetesiMod, number> = {
  atutalas: 1,
  keszpenz: 2,
  csekk: 3,
  inkasszo: 4,
  utanvet: 5,
  kompenzacio: 6,
  bankkartya: 7,
};

/** Az RLB saját korlátai, a leírás mezőhosszai szerint. */
export function rlbEllenoriz(b: KonyveloiBizonylat): string[] {
  const ki: string[] = [];
  // Azonosítót nem csonkolunk: egy levágott számlaszám egy másik számla.
  if (b.bizonylatszam.length > 30) ki.push('A bizonylatszám hosszabb 30 karakternél (RLB-korlát).');
  if (b.partner.adoszam !== null && b.partner.adoszam.length > 13)
    ki.push('A partner adószáma hosszabb 13 karakternél (RLB-korlát).');
  return ki;
}

export function rlb(bizonylatok: readonly KonyveloiBizonylat[], k: KontirBeallitas): Uint8Array {
  const sorok: (string | number)[][] = [[...RLB_FEJLEC]];

  for (const b of bizonylatok) {
    const bejovo = b.irany === 'bejovo';

    const fej: (string | number)[] = new Array(RLB_FEJLEC.length).fill('');
    fej[1] = bejovo ? 'SF' : 'VF';
    fej[2] = datum(b.kelt);
    fej[3] = datum(b.teljesites);
    // Üres ÁFA-esedékesség = pénzforgalmi elszámolás (a leírás szerint).
    fej[4] = k.penzforgalmi ? '' : datum(afaEsedekesseg(b));
    fej[5] = datum(b.esedekesseg);
    fej[6] = FIZMOD[b.fizmod];
    fej[7] = szoveg(b.bizonylatszam, 30);
    fej[9] = szoveg(b.partner.nev, 60);
    fej[13] = b.partner.adoszam ?? '';
    fej[14] = szoveg(b.megjegyzes, 40);
    fej[21] = datum(b.teljesites);
    sorok.push(fej);

    for (const s of b.sorok) {
      const tetel: (string | number)[] = new Array(RLB_FEJLEC.length).fill('');
      tetel[1] = bejovo ? 'ST' : 'VT';
      tetel[2] = AFAKOD[s.fajta];
      tetel[4] = s.netto;
      tetel[5] = s.afa;
      tetel[6] = s.netto + s.afa;
      tetel[10] = bejovo ? k.koltseg : k.arbevetel;
      tetel[12] = bejovo ? k.elozetesAfa : k.fizetendoAfa;
      tetel[14] = bejovo ? k.szallito : k.vevo;
      sorok.push(tetel);
    }
  }

  // A verziójel a minta szerint egyetlen helyen áll: az első adatsorban.
  if (sorok.length > 1) (sorok[1] as (string | number)[])[0] = 'V1.1';

  return ansiCsv(sorok);
}
