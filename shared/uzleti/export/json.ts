import { KULCSOK, SZAM_OSZLOPOK, type ExportCella } from './oszlopok.ts';

/**
 * JSON gépi feldolgozásra: a szám szám marad, a dátum ISO alakú, a hiányzó
 * érték `null` — nem üres sztring.
 *
 * **Egyedül itt fér el az ÁFA-bontás teljes alakja.** A táblázatos formátumok
 * kulcsonkénti oszlopokra lapítják (27/18/5/0/egyéb), mert egy sor egy
 * bizonylat; a beágyazott lista viszont megőrzi a kategóriakódot is, ami nélkül
 * egy nulla százalékos sor értelmezhetetlen — nem derül ki, fordított adózás,
 * mentesség vagy közösségi értékesítés-e.
 */

export function ir(
  sorok: readonly Record<string, unknown>[],
  meta: Record<string, unknown> = {},
): string {
  const tetelek = sorok.map((sor) => {
    const tetel: Record<string, unknown> = {};

    for (const kulcs of KULCSOK) {
      const ertek = (sor[kulcs] ?? null) as ExportCella;

      if (SZAM_OSZLOPOK.includes(kulcs)) {
        tetel[kulcs] = ertek === null || ertek === '' ? null : Number(ertek);
        continue;
      }

      tetel[kulcs] = ertek === '' ? null : ertek;
    }

    if (Array.isArray(sor['afa_bontas'])) {
      tetel['afa_bontas'] = sor['afa_bontas'];
    }

    return tetel;
  });

  return JSON.stringify({ ...meta, tetelek }, null, 2);
}
