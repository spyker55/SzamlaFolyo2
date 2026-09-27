/**
 * A `SZOVEGEK.md` a `szovegek.ts`-ből: másolható blokkok, mért hosszal.
 *
 * Tiszta függvény, fájlt nem ír – azt a `keszit.ts` teszi. A
 * `megkereses.test.ts` összeveti a repóban álló fájllal: ha valaki a
 * szöveget átírja, de nem gyártja újra, a teszt piros.
 */
import { FACEBOOK, FACEBOOK_AR_VALASZ, HELYORZOK, KONYVELO, KORLAT } from './szovegek.ts';

/** A LinkedIn UTF-16 egységben számol, ezért itt a `.length` a helyes mérték. */
export function linkedinHossz(szoveg: string): number {
  return szoveg.replaceAll('[Név]', 'x'.repeat(KORLAT.nevHelye)).length;
}

/** Karakterszám Unicode-kódpontonként. */
export function hossz(szoveg: string): number {
  return [...szoveg].length;
}

/** Kódblokk, hogy a markdown-nézet ne alakítsa át a felsorolást, és egyben lehessen kimásolni. */
const blokk = (s: string) => ['```text', s, '```'].join('\n');

export function szovegMd(): string {
  const r: string[] = [];
  const k = KONYVELO;

  r.push(
    '# SzámlaFolyó – megkeresési szövegek',
    '',
    '> ⚙️ **Gyártott fájl, kézzel ne szerkeszd.** Forrás: `marketing/megkereses/szovegek.ts`,',
    '> újragyártás: `npx vite-node marketing/megkereses/keszit.ts`. Használat és jogi keret:',
    '> `OLVASS-EL.md`.',
    '',
    `Helyőrzők, kiküldés előtt cseréld le őket: ${HELYORZOK.map((h) => `\`${h}\``).join(', ')}. A \`[Személyes mondat]\``,
    'egy mondat arról, miért épp őt keresed (pl. a honlapjukon láttad, hogy külföldi ügyfeleik is vannak).',
    '',
    '---',
    '',
    '## Könyvelőirodák (magázó)',
    '',
    `### LinkedIn – kapcsolatkérés jegyzete _(${linkedinHossz(k.linkedinJegyzet)}/${KORLAT.linkedinJegyzet}, a névre ${KORLAT.nevHelye} karakterrel számolva)_`,
    '',
    blokk(k.linkedinJegyzet),
    '',
    '### LinkedIn – első üzenet, ha elfogadta',
    '',
    blokk(k.linkedinElsoUzenet),
    '',
    `### E-mail – tárgy _(${hossz(k.email.targy)}/${KORLAT.emailTargy})_`,
    '',
    blokk(k.email.targy),
    '',
    '### E-mail – szöveg',
    '',
    blokk(k.email.szoveg),
    '',
    '### Emlékeztető – kb. egy hét múlva, egyszer, válaszként az első levélre',
    '',
    blokk(k.emlekezteto),
    '',
    '### 10 perces bemutató – vázlat neked, nem kiküldésre',
    '',
    ...k.bemutato.flatMap((l) => [`**${l.perc}. perc – ${l.cim}**`, ...l.pontok.map((p) => `- ${p}`), '']),
    '---',
    '',
    '## Facebook-csoportok (tegező)',
    '',
  );

  for (const b of FACEBOOK) {
    r.push(`### ${b.id} – ${b.hova}`, '', blokk(b.szoveg), '');
  }

  r.push('### Kész válasz, ha az árra kérdeznek', '', blokk(FACEBOOK_AR_VALASZ), '');

  return r.join('\n');
}
