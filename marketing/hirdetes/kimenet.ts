/**
 * A szöveges kimenetek a `szovegek.ts`-ből: a `SZOVEGEK.md` áttekintés és a
 * Google Ads Editorba importálható CSV-k.
 *
 * Tiszta függvények, fájlt nem írnak – azt a `keszit.ts` teszi. Így a
 * `hirdetes.test.ts` össze tudja vetni a repóban álló fájlokat azzal, amit a
 * mai szövegből kapnánk: ha valaki a `szovegek.ts`-t átírja, de a kimenetet
 * nem gyártja újra, a teszt piros.
 */
import {
  GOOGLE_KERESES,
  GOOGLE_KIEMELESEK,
  GOOGLE_KIZARO,
  GOOGLE_PMAX,
  GOOGLE_RESZLETEK,
  GOOGLE_WEBHELYLINKEK,
  KORLAT,
  META,
  WEBOLDAL,
  type KulcsszoEgyezes,
} from './szovegek.ts';

/** Karakterszám, ahogy a platformok számolják: Unicode-kódpontonként. */
export function hossz(szoveg: string): number {
  return [...szoveg].length;
}

const sorSzam = (s: string, max: number) => `${s} _(${hossz(s)}/${max})_`;
const lista = (elemek: readonly string[], max: number) => elemek.map((e) => `- ${sorSzam(e, max)}`).join('\n');
const idezet = (s: string) => s.split('\n').map((sor) => (sor === '' ? '>' : `> ${sor}`)).join('\n');

export function szovegMd(): string {
  const r: string[] = [];
  const g = KORLAT.google;

  r.push(
    '# SzámlaFolyó – hirdetésszövegek',
    '',
    '> ⚙️ **Gyártott fájl, kézzel ne szerkeszd.** Forrás: `marketing/hirdetes/szovegek.ts`,',
    '> újragyártás: `npx vite-node marketing/hirdetes/keszit.ts`. A zárójeles szám a',
    '> mért karakterszám és a korlát.',
    '',
    '---',
    '',
    '## Meta (Facebook, Instagram)',
    '',
    `Korlátok: címsor ${KORLAT.meta.cimsor}, leírás ${KORLAT.meta.leiras}, a fő szöveg kb. ${KORLAT.meta.elsodlegesLatszik} karakter után „Továbbiak" mögé kerül.`,
    '',
  );

  for (const u of META) {
    r.push(
      `### ${u.id} – ${u.kep.jelveny}`,
      '',
      `**Kinek:** ${u.kinek}  `,
      `**Céloldal:** ${WEBOLDAL}${u.celoldal}  `,
      `**Gomb:** ${u.gomb}  `,
      `**Képek:** \`kep/meta/${u.id}_*.png\``,
      '',
      '**Címsorok**',
      lista(u.cimsorok, KORLAT.meta.cimsor),
      '',
      '**Leírások**',
      lista(u.leirasok, KORLAT.meta.leiras),
      '',
      `**Fő szöveg – rövid** _(${hossz(u.elsodlegesRovid)}/${KORLAT.meta.elsodlegesLatszik})_`,
      '',
      idezet(u.elsodlegesRovid),
      '',
      `**Fő szöveg – hosszú** _(${hossz(u.elsodlegesHosszu)} karakter)_`,
      '',
      idezet(u.elsodlegesHosszu),
      '',
    );
  }

  r.push('---', '', '## Google Keresés – reszponzív keresési hirdetések', '');
  r.push(`Korlátok: címsor ${g.cimsor}, leírás ${g.leiras}, útvonal ${g.utvonal}. Importálható: \`google/kereses-hirdetesek.csv\`, \`google/kulcsszavak.csv\`.`, '');

  for (const c of GOOGLE_KERESES) {
    r.push(
      `### ${c.kampany} / ${c.csoport}`,
      '',
      `**Végső URL:** ${c.celoldal}  `,
      `**Megjelenő útvonal:** szamlafolyo.hu/${c.utvonal[0]}/${c.utvonal[1]}`,
      '',
      '**Címsorok (15)**',
      lista(c.cimsorok, g.cimsor),
      '',
      '**Leírások (4)**',
      lista(c.leirasok, g.leiras),
      '',
      '**Kulcsszavak**',
      c.kulcsszavak.map((k) => `- ${kulcsszoAlak(k.szo, k.egyezes)}`).join('\n'),
      '',
    );
  }

  r.push(
    '### Kizáró kulcsszavak (mindkét kampány, kifejezés-egyezés)',
    '',
    GOOGLE_KIZARO.map((k) => `- "${k}"`).join('\n'),
    '',
    '### Webhelylinkek',
    '',
    '| Szöveg | Cél | 1. sor | 2. sor |',
    '|---|---|---|---|',
    ...GOOGLE_WEBHELYLINKEK.map(
      (w) =>
        `| ${w.szoveg} (${hossz(w.szoveg)}/${g.webhelylink}) | ${w.cel} | ${w.sor1} (${hossz(w.sor1)}/${g.webhelylinkLeiras}) | ${w.sor2} (${hossz(w.sor2)}/${g.webhelylinkLeiras}) |`,
    ),
    '',
    '### Kiemelések',
    '',
    lista(GOOGLE_KIEMELESEK, g.kiemeles),
    '',
    `### Kiegészítő részletek – fejléc: „${GOOGLE_RESZLETEK.fejlec}"`,
    '',
    lista(GOOGLE_RESZLETEK.ertekek, g.reszletErtek),
    '',
    '---',
    '',
    '## Google Performance Max – eszközcsoport',
    '',
    `**Cégnév:** ${sorSzam(GOOGLE_PMAX.cegnev, g.cegnev)}  `,
    `**Végső URL:** ${GOOGLE_PMAX.celoldal}  `,
    `**Gomb:** ${GOOGLE_PMAX.gomb}  `,
    '**Képek:** `kep/google/` (fekvő, négyzetes, álló és a két logó)',
    '',
    '**Címsorok**',
    lista(GOOGLE_PMAX.cimsorok, g.cimsor),
    '',
    '**Hosszú címsorok**',
    lista(GOOGLE_PMAX.hosszuCimsorok, g.hosszuCimsor),
    '',
    `**Leírások** (az első a rövid, legfeljebb ${g.rovidLeiras} karakter)`,
    lista(GOOGLE_PMAX.leirasok, g.leiras),
    '',
  );

  return r.join('\n');
}

export function kulcsszoAlak(szo: string, egyezes: KulcsszoEgyezes): string {
  return egyezes === 'pontos' ? `[${szo}]` : egyezes === 'kifejezés' ? `"${szo}"` : szo;
}

/* -------------------------------------------------------------------------
 * CSV a Google Ads Editorhoz
 * ---------------------------------------------------------------------- */

function csv(sorok: readonly (readonly string[])[]): string {
  const mezo = (m: string) => (/[",\n]/.test(m) ? `"${m.replace(/"/g, '""')}"` : m);
  // BOM: az Excel és az Ads Editor így ismeri fel biztosan az UTF-8-at.
  return `﻿${sorok.map((s) => s.map(mezo).join(',')).join('\n')}\n`;
}

export function keresesHirdetesekCsv(): string {
  const fej = [
    'Campaign',
    'Ad Group',
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`),
    'Path 1',
    'Path 2',
    'Final URL',
  ];
  const sorok = GOOGLE_KERESES.map((c) => [
    c.kampany,
    c.csoport,
    ...c.cimsorok,
    ...c.leirasok,
    c.utvonal[0],
    c.utvonal[1],
    c.celoldal,
  ]);
  return csv([fej, ...sorok]);
}

const TIPUS: Record<KulcsszoEgyezes, string> = { pontos: 'Exact', kifejezés: 'Phrase', általános: 'Broad' };

export function kulcsszavakCsv(): string {
  const sorok: string[][] = [['Campaign', 'Ad Group', 'Keyword', 'Criterion Type']];
  for (const c of GOOGLE_KERESES) {
    for (const k of c.kulcsszavak) sorok.push([c.kampany, c.csoport, k.szo, TIPUS[k.egyezes]]);
    for (const k of GOOGLE_KIZARO) sorok.push([c.kampany, '', k, 'Campaign Negative Phrase']);
  }
  return csv(sorok);
}
