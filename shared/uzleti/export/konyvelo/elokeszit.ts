import type { ExportBizonylat } from '../oszlopok.ts';
import { atalakit, type KonyveloiBizonylat } from './atalakit.ts';
import { beallitasHianyai, type AfaFajta, type KontirBeallitas, type Program } from './beallitas.ts';
import { rlbEllenoriz } from './rlb.ts';

/**
 * Az előellenőrzés: melyik tétel mehet programfájlba, melyik nem, és miért.
 *
 * Ez az, amit a képernyő mutat, **mielőtt** bármi kimenne: „14 mehet, 2 nem".
 * Ami nem mehet, az nem kap `export_id`-t – a listán marad, javítható, és
 * táblázatba továbbra is exportálható.
 */

export type Elakadas = { id: string; cimke: string; okok: string[] };
export type Figyelmeztetes = { id: string; cimke: string; szoveg: string };

export type Elokeszites = {
  mehet: KonyveloiBizonylat[];
  elakadt: Elakadas[];
  figyelmeztetesek: Figyelmeztetes[];
  /** Ha nem üres, **semmi** nem mehet ki: a kontír hiányos. */
  beallitasHiany: string[];
};

const PROGRAM_ELLENORZES: Record<Program, (b: KonyveloiBizonylat) => string[]> = {
  rlb: rlbEllenoriz,
  // A Novitax- és a Kulcs-író a következő körben jön; addig a közös szabályok.
  novitax: () => [],
  kulcs: () => [],
};

export function elokeszit(
  tetelek: readonly (ExportBizonylat & { id: string })[],
  program: Program,
  sajatTorzsszam: string,
  beallitas: KontirBeallitas,
): Elokeszites {
  const mehet: KonyveloiBizonylat[] = [];
  const elakadt: Elakadas[] = [];
  const figyelmeztetesek: Figyelmeztetes[] = [];

  for (const t of tetelek) {
    const cimke = cimkeje(t);
    const a = atalakit(t, sajatTorzsszam, beallitas);

    if (!a.ok) {
      elakadt.push({ id: t.id, cimke, okok: a.akadalyok });
      continue;
    }

    const programOkok = PROGRAM_ELLENORZES[program](a.bizonylat);
    if (programOkok.length > 0) {
      elakadt.push({ id: t.id, cimke, okok: programOkok });
      continue;
    }

    mehet.push(a.bizonylat);
    for (const szoveg of a.figyelmeztetesek) figyelmeztetesek.push({ id: t.id, cimke, szoveg });
  }

  const fajtak = new Set<AfaFajta>();
  for (const b of mehet) for (const s of b.sorok) fajtak.add(s.fajta);

  const beallitasHiany =
    mehet.length === 0
      ? []
      : beallitasHianyai(beallitas, program, {
          bejovo: mehet.some((b) => b.irany === 'bejovo'),
          kimeno: mehet.some((b) => b.irany === 'kimeno'),
          fajtak,
        });

  return { mehet, elakadt, figyelmeztetesek, beallitasHiany };
}

/** Egy sorban, hogy a képernyőn felismerhető legyen: „SZ-2026/14 – Példa Kft." */
function cimkeje(t: ExportBizonylat): string {
  const szam = (t.doc_number ?? '').trim() || 'szám nélkül';
  const partner = (t.supplier_name ?? t.customer_name ?? '').trim();
  return partner === '' ? szam : `${szam} – ${partner}`;
}
