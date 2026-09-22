import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { torzsszam } from '../../shared/uzleti/adoszam.ts';

/**
 * Egy adóalany egy cég — és a kulcs mindkét oldalon ugyanaz a nyolc jegy.
 *
 * # Mit véd
 *
 * A `companies` táblán 2026-09-22-ig egyetlen egyedi kényszer állt, a
 * `stripe_customer_id`-é. Az adószámon semmi: ugyanaz a vállalkozás más-más
 * cégnévvel tetszőleges számú céget alapíthatott, mindegyiket saját 14 napos
 * próbaidővel. A próbaidő így nem korlát volt, hanem egy újratölthető adag.
 *
 * A javítás egy kifejezésre épülő egyedi index az adószám **első nyolc
 * számjegyén** (törzsszám). Ez a szám két külön helyen él:
 *
 * 1. az SQL-ben (`left(regexp_replace(tax_number, '\D', '', 'g'), 8)`),
 * 2. a `shared/uzleti/adoszam.ts` `torzsszam()` függvényében, amire az export
 *    ügyfélszűrője épül.
 *
 * Ha a kettő elcsúszik, az **csendes**: a szűrő és a cégazonosság két külön
 * dolgot fog jelenteni ugyanazon a néven. Ez a teszt a migráció szövegét
 * olvassa, és összeveti a TS-oldallal.
 *
 * ⚠️ A teszt **nem adatbázist** kérdez, hanem fájlt olvas. Ha a migrációk
 * alakja változik, elbukik, nem hallgat el — a hibaüzenet megmondja, mit
 * keresett.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

function mindenSql(): string {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(MAPPA + f, 'utf8'))
    .join('\n');
}

describe('az adószám egyedisége', () => {
  it('van egyedi index a törzsszámra', () => {
    const sql = mindenSql();

    expect(
      /create unique index[^;]*companies_torzsszam_kulcs/i.test(sql),
      'Nem találtam a `companies_torzsszam_kulcs` egyedi indexet a migrációk között. ' +
        'Enélkül ugyanaz a vállalkozás több néven, több próbaidővel is regisztrálhat.',
    ).toBe(true);
  });

  it('az index a számjegyekre megy, nem a beírt szövegre', () => {
    const sql = mindenSql();
    const index = /create unique index[^;]*companies_torzsszam_kulcs[^;]*;/i.exec(sql)?.[0] ?? '';

    // A `regexp_replace` az, ami a kötőjeleket és a szóközöket leszedi. Nélküle
    // a `12345678-2-42` és a `12345678242` két külön érték volna — ugyanaz az
    // adószám két cégként.
    expect(
      index.includes('regexp_replace'),
      'Az index a nyers `tax_number` szövegre megy. Így egy másképp formázott ' +
        'adószám (kötőjel nélkül, szóközökkel) megkerüli az egyediséget.',
    ).toBe(true);
  });

  it('ugyanazt a nyolc jegyet veszi, mint a `torzsszam()`', () => {
    const sql = mindenSql();
    const index = /create unique index[^;]*companies_torzsszam_kulcs[^;]*;/i.exec(sql)?.[0] ?? '';
    const hossz = /left\(regexp_replace\([^)]*\)[^,]*,\s*(\d+)\s*\)/i.exec(index)?.[1];

    expect(hossz, 'Nem találtam a `left(..., N)` hosszt az index kifejezésében.').toBeDefined();

    // A TS-oldal ugyanennyit vesz: a `torzsszam()` a `slice(0, 8)`-cal dolgozik.
    const tsHossz = (torzsszam('12345678-2-42') ?? '').length;

    expect(
      Number(hossz),
      `Az SQL az adószám első ${hossz} jegyét veszi kulcsnak, a torzsszam() viszont ` +
        `${tsHossz}-et. A cégazonosság és az export ügyfélszűrője így két külön dolgot jelent.`,
    ).toBe(tsHossz);
  });

  it('a cégalapítás magyarul szól az ütközésről', () => {
    const sql = mindenSql();

    // A `CegLetrehozas.tsx` a nyers `error.message`-t írja a képernyőre. Ha a
    // függvény nem fogja el a `unique_violation`-t, a felhasználó egy angol
    // Postgres-hibát kap a cégalapításkor.
    expect(
      /when unique_violation then[\s\S]{0,200}Ehhez az adószámhoz már tartozik cég/i.test(sql),
      'A `ceg_letrehozas()` nem fordítja magyarra az adószám-ütközést. ' +
        'Így a felhasználó a nyers `duplicate key value violates unique constraint` ' +
        'mondatot látná a cégalapító képernyőn.',
    ).toBe(true);
  });
});
