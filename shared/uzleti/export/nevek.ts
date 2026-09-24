/**
 * Fájlnevek.
 *
 * Egy magyar cégnév ékezetes, szóközös, pontos — egy fájlnév pedig átmegy egy
 * böngészőn, egy letöltési mappán, egy levélmellékleten és néha egy Windows
 * könyvtáron. Az ékezeteket ezért **leszedjük**, nem azért, mert a rendszer nem
 * bírná, hanem mert a lánc egyik szeme biztosan nem bírja.
 */

/** Ékezetek nélkül, csak a megengedett karakterekkel. */
export function biztonsagos(nyers: string, maxHossz = 40): string {
  const ascii = nyers
    // Az `NFKD` szétszedi az `ő`-t `o` + mellékjelre, a mellékjeleket pedig
    // eldobjuk. Ez a magyar ékezetek mindegyikére működik.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ascii.slice(0, maxHossz).replace(/-+$/, '');
}

/** `szamlafolyo-pelda-kft-2026-03-14-0932.xlsx` */
export function exportFajlnev(cegNev: string, formatum: string, most: Date): string {
  const ceg = biztonsagos(cegNev);
  const ev = most.getFullYear();
  const ho = ketJegy(most.getMonth() + 1);
  const nap = ketJegy(most.getDate());
  const ora = ketJegy(most.getHours());
  const perc = ketJegy(most.getMinutes());

  return `szamlafolyo-${ceg === '' ? 'export' : ceg}-${ev}-${ho}-${nap}-${ora}${perc}.${formatum}`;
}

/**
 * Könyvelőprogram-fájl: `szamlafolyo-pelda-kft-rlb-2026-09-24-0932.csv`.
 *
 * A név az **ügyfélé**, ha kiválasztották: egy iroda ügyfelenként tölti be a
 * fájlokat, és a letöltési mappában a cégnév mondja meg, melyik melyik. A
 * próbafájl `-proba` jelet kap, hogy ne keveredjen össze egy valódi exporttal.
 */
export function programFajlnev(
  nev: string,
  program: string,
  kiterjesztes: string,
  most: Date,
  proba = false,
): string {
  const ceg = biztonsagos(nev);
  const ido = `${most.getFullYear()}-${ketJegy(most.getMonth() + 1)}-${ketJegy(most.getDate())}-${ketJegy(most.getHours())}${ketJegy(most.getMinutes())}`;

  return `szamlafolyo-${ceg === '' ? 'export' : ceg}-${program}-${ido}${proba ? '-proba' : ''}.${kiterjesztes}`;
}

/**
 * Egy eredeti bizonylat neve a ZIP-ben.
 *
 * A bizonylatszám a beszédes név — az eredeti fájlnév gyakran `scan0012.pdf`.
 * Ha nincs bizonylatszám, marad az azonosító: az legalább egyedi.
 */
export function bizonylatFajlnev(
  bizonylatszam: string | null | undefined,
  eredetiFajlnev: string | null | undefined,
  id: string,
): string {
  const alapNyers = (bizonylatszam ?? '').trim();
  const alap = alapNyers === '' ? `irat-${id.slice(0, 8)}` : biztonsagos(alapNyers, 60);
  const kiterjesztes = kiterjesztese(eredetiFajlnev);

  return `${alap === '' ? `irat-${id.slice(0, 8)}` : alap}.${kiterjesztes}`;
}

function kiterjesztese(fajlnev: string | null | undefined): string {
  const pont = (fajlnev ?? '').lastIndexOf('.');

  if (pont < 0) {
    return 'pdf';
  }

  const kiterjesztes = (fajlnev as string).slice(pont + 1).toLowerCase();

  return /^[a-z0-9]{1,8}$/.test(kiterjesztes) ? kiterjesztes : 'pdf';
}

function ketJegy(n: number): string {
  return String(n).padStart(2, '0');
}
