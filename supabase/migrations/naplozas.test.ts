import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A cég születése is esemény — és nyomot kell hagynia.
 *
 * # Miért kapott őrt épp ez az egy függvény
 *
 * Az `activity_log` a cég **audit-nyoma**: minden állapotváltó művelet ír bele
 * egy sort — export, selejtezés, beküldés, meghívó, helykorlát, előfizetés,
 * beállítás. Egyetlen kivétel volt, és épp az első esemény: a cégalapítás. Egy
 * napló, aminek hiányzik a nyitósora, arra a kérdésre nem tud válaszolni, hogy
 * *mikor és ki hozta létre ezt a céget*.
 *
 * Ez 2026-09-22-én lett súlyosabb, mint amilyennek látszott: kiderült, hogy az
 * `auth.audit_log_entries` tábla a platform oldalán **üres — nulla sor,
 * valaha**. A Supabase ezen a projekten nem tart saját hitelesítési nyomot,
 * tehát a mi `activity_log`-unk nem egy a nyomok közül, hanem **az egyetlen**.
 *
 * # Miért szövegre mér, és miért a legutolsó definícióra
 *
 * A `ceg_letrehozas` a repóban **háromszor** van kiadva (`rls`, `belso_sema`,
 * `meghivo`), mert a `create or replace` a migrációk bevett eszköze. Élesben
 * mindig az utolsó számít — ezért ez a teszt is azt olvassa ki, nem az elsőt,
 * amit talál. A védett hibaosztály pont ez: valaki egy negyedik
 * `create or replace`-szel átírja a függvényt, és a naplósor csendben lemarad.
 *
 * ⚠️ Ha a függvény alakja változik (például a törzs kiszervezése egy
 * `belso.*` segédbe), ez a teszt **elbukik, nem hallgat el** — a hibaüzenet
 * megmondja, mit keresett. Egy néma őr rosszabb a hiányzónál.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

/** Egy `create or replace function <nev>` blokk törzse a záró `$$;`-ig. */
function torzs(sql: string, nev: string): string | null {
  const kezdet = sql.lastIndexOf(`create or replace function ${nev}`);

  if (kezdet === -1) {
    return null;
  }

  const veg = sql.indexOf('$$;', kezdet);

  return veg === -1 ? null : sql.slice(kezdet, veg);
}

/** A legkésőbbi migráció törzse, amelyik a függvényt kiadja. */
function utolsoDefinicio(nev: string): { fajl: string; torzs: string } | null {
  const fajlok = readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let talalat: { fajl: string; torzs: string } | null = null;

  for (const fajl of fajlok) {
    const t = torzs(readFileSync(MAPPA + fajl, 'utf8'), nev);

    if (t !== null) {
      talalat = { fajl, torzs: t };
    }
  }

  return talalat;
}

describe('a cégalapítás nyomot hagy', () => {
  const NEV = 'public.ceg_letrehozas';

  it('egyáltalán megtalálja a függvényt', () => {
    const talalat = utolsoDefinicio(NEV);

    expect(
      talalat,
      `Nem találtam \`create or replace function ${NEV}\` blokkot egyetlen migrációban sem. ` +
        'Ha a függvény neve vagy a migrációk alakja változott, ezt a tesztet is igazítani kell.',
    ).not.toBeNull();

    // Anti-vakság: a kivágott törzs tényleg a cégalapításé, nem egy fél blokk.
    expect(
      talalat?.torzs,
      'A kivágott törzsben nincs benne a cégsor beszúrása — rossz darabot fogtam meg.',
    ).toContain('insert into public.companies');
  });

  it('a legutolsó definíciója ír `activity_log` sort', () => {
    const talalat = utolsoDefinicio(NEV);

    expect(
      talalat?.torzs,
      `A(z) ${talalat?.fajl} fájlban a ${NEV} legutolsó kiadása nem ír naplósort. ` +
        'A cég születése az audit-nyom első eseménye, és a platform oldalán ' +
        '(auth.audit_log_entries) nincs másik nyom — ez az egyetlen.',
    ).toContain('insert into public.activity_log');
  });
});
