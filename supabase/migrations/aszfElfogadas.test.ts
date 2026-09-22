import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JOGI_VERZIO } from '../../src/oldalak/jogi/adatok.ts';

/**
 * Az ÁSZF elfogadása bizonyítható marad.
 *
 * # Mit véd, és miért nem elég a kódot egyszer megírni
 *
 * Az ÁSZF 1. pontja **ígéretet tesz**: a Szolgáltató nyilvántartja, melyik
 * időpontban fogadta el az Előfizető a feltételeket. 2026-09-22-ig ezt semmi
 * nem tartotta be — az éles adatbázisban egyetlen oszlop sem tárolta.
 *
 * A javítás három, egymástól független ponton él, és bármelyik kiesése
 * **csendes** volna:
 *
 * 1. a `ceg_letrehozas()` ír `terms_acceptances` sort;
 * 2. a kliens által küldött verziót a szerver **megvizsgálja** a
 *    `legal_versions` táblából — amit a böngésző állít, azt nem hisszük el;
 * 3. a `JOGI_VERZIO` szerepel a `legal_versions` táblában — különben minden
 *    cégalapítás elhasal, és ezt nem élesben akarjuk megtudni.
 *
 * A harmadik a legalattomosabb: aki az `adatok.ts`-ben átírja a dátumot (mert
 * módosult az ÁSZF), az a migrációról **el fog feledkezni**. Ettől a
 * cégalapítás azonnal megáll — a hibaüzenet ugyan magyar és érthető, de ez a
 * teszt hamarabb szól, mint az első felhasználó.
 *
 * ⚠️ A teszt **szöveget** olvas, nem adatbázist. Ha a migrációk alakja
 * változik, elbukik, nem hallgat el — a hibaüzenet megmondja, mit keresett.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

function sqlFajlok(): string[] {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function mindenSql(): string {
  return sqlFajlok()
    .map((f) => readFileSync(MAPPA + f, 'utf8'))
    .join('\n');
}

/** A legkésőbbi `create or replace function <nev>` blokk törzse a `$$;`-ig. */
function utolsoTorzs(nev: string): { fajl: string; torzs: string } | null {
  let talalat: { fajl: string; torzs: string } | null = null;

  for (const fajl of sqlFajlok()) {
    const sql = readFileSync(MAPPA + fajl, 'utf8');
    const kezdet = sql.lastIndexOf(`create or replace function ${nev}`);

    if (kezdet === -1) continue;

    const veg = sql.indexOf('$$;', kezdet);

    if (veg !== -1) talalat = { fajl, torzs: sql.slice(kezdet, veg) };
  }

  return talalat;
}

describe('az ÁSZF elfogadása rögzül', () => {
  const NEV = 'public.ceg_letrehozas';

  /**
   * A „talál-e egyáltalán" állítás. Egy elrontott olvasás nulla fájlt adna, és
   * alatta minden más állítás **üresen menne át** — ez a fajta hamis zöld már
   * kétszer megfogott minket (`FUTO_ALLAPOTOK`, analitika-őr).
   */
  it('egyáltalán lát migrációkat és megtalálja a függvényt', () => {
    expect(sqlFajlok().length).toBeGreaterThan(20);

    const talalat = utolsoTorzs(NEV);

    expect(
      talalat,
      `Nem találtam \`create or replace function ${NEV}\` blokkot egyetlen migrációban sem.`,
    ).not.toBeNull();

    expect(
      talalat?.torzs,
      'A kivágott törzsben nincs benne a cégsor beszúrása — rossz darabot fogtam meg.',
    ).toContain('insert into public.companies');
  });

  it('a legutolsó definíciója ír `terms_acceptances` sort', () => {
    const talalat = utolsoTorzs(NEV);

    expect(
      talalat?.torzs,
      `A(z) ${talalat?.fajl} fájlban a ${NEV} legutolsó kiadása nem rögzíti az ÁSZF ` +
        'elfogadását. Az ÁSZF 1. pontja viszont ígéri, hogy nyilvántartjuk — ' +
        'egy ígéret, amit a kód nem tart be.',
    ).toContain('insert into public.terms_acceptances');
  });

  it('az ismeretlen ÁSZF-változatot elutasítja', () => {
    const talalat = utolsoTorzs(NEV);

    expect(
      talalat?.torzs,
      'A függvény a kliens által küldött verziót vizsgálat nélkül fogadná el. ' +
        'Amit a böngésző állít, azt megnézzük: a `legal_versions` a kiadott ' +
        'változatok zárt listája.',
    ).toContain('public.legal_versions');
  });

  it('a JOGI_VERZIO szerepel a kiadott változatok között', () => {
    const sql = mindenSql();

    // Anti-vakság: a tábla feltöltése egyáltalán létezik-e.
    expect(
      sql,
      'Egyetlen migráció sem tölti fel a `legal_versions` táblát.',
    ).toContain('insert into public.legal_versions');

    expect(
      sql,
      `Az \`adatok.ts\` szerint a hatályos jogi változat "${JOGI_VERZIO}", de ezt ` +
        'egyetlen migráció sem veszi fel a `legal_versions` táblába. Így minden ' +
        'cégalapítás elhasalna: „Ismeretlen ÁSZF-változat". Aki a dátumot átírja, ' +
        'annak a migrációk közé is fel kell vennie egy sort.',
    ).toContain(`'${JOGI_VERZIO}'`);
  });

  it('a cégalapító képernyő átadja a verziót, és kéri az elfogadást', () => {
    const kepernyo = readFileSync(
      new URL('../../src/kepernyok/CegLetrehozas.tsx', import.meta.url).pathname,
      'utf8',
    );

    expect(
      kepernyo,
      'A `ceg_letrehozas` hívása nem hivatkozik a `JOGI_VERZIO`-ra — a szerver így ' +
        'nem tudja, melyik szöveget fogadta el a felhasználó.',
    ).toContain('aszf_verzio: JOGI_VERZIO');

    expect(
      kepernyo,
      'A cégalapító képernyőn nincs ott a feltételek elfogadása. Az ÁSZF 1. pontja ' +
        'szerint a szerződés ITT jön létre — a nyilatkozatnak is itt a helye, nem ' +
        'két képernyővel korábban, a regisztrációnál.',
    ).toContain('<FeltetelekPipa');

    expect(
      kepernyo,
      'A Létrehozás gomb a pipától függetlenül is nyomható.',
    ).toMatch(/disabled=\{kuld \|\| !feltetelek\}/);
  });
});
