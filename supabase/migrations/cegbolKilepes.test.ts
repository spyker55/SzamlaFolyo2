import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A kilépés szerveroldali szabályai a helyükön maradnak.
 *
 * A `cegbol_kilepek()` RPC azért létezik, mert a `20260923000100` kivette a
 * `company_members` politikáiból a `user_id = auth.uid()` ágat — az volt a mért
 * jogosultság-emelés forrása. Az önkiszolgáló művelet ezért egy
 * `security definer` függvénybe került, ahol a szabály **ki van mondva**.
 *
 * ⚠️ A teszt **szöveget** olvas, nem adatbázist, és a legutolsó definíciót
 * nézi: egy későbbi migráció, ami a függvényt visszaírja, itt bukik el.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

function sqlFajlok(): string[] {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/** A `cegbol_kilepek` legkésőbbi törzse a `$$;`-ig. */
function torzs(): string | null {
  let talalat: string | null = null;

  for (const fajl of sqlFajlok()) {
    const sql = readFileSync(MAPPA + fajl, 'utf8');
    const kezdet = sql.lastIndexOf('create or replace function public.cegbol_kilepek()');

    if (kezdet === -1) continue;

    const veg = sql.indexOf('$$;', kezdet);

    if (veg !== -1) talalat = sql.slice(kezdet, veg);
  }

  return talalat;
}

describe('a cegbol_kilepek() szabályai', () => {
  it('egyáltalán megtalálja a függvényt', () => {
    expect(sqlFajlok().length).toBeGreaterThan(20);
    expect(torzs(), 'Nem találtam `cegbol_kilepek()` definíciót egyetlen migrációban sem.').not.toBeNull();
    expect(
      torzs(),
      'A kivágott törzsben nincs benne a tagsági sor törlése — rossz darabot fogtam meg.',
    ).toContain('delete from public.company_members');
  });

  it('security definer, üres search_path-szal', () => {
    expect(
      torzs(),
      'A `cegbol_kilepek()` nem `security definer`. Így a hívó jogán futna — a politikák ' +
        'viszont épp azért nem engedik a saját sor törlését, mert az jogosultság-emelés volt.',
    ).toContain('security definer');

    expect(torzs()).toContain("set search_path = ''");
  });

  it('mindkét tiltás benne van', () => {
    expect(
      torzs(),
      'Kiesett az „egyedül vagy" ellenőrzés (`tagok <= 1`). Enélkül az utolsó tag kiléphetne, ' +
        'és olyan cégsort hagyna hátra, amit soha senki nem tud törölni — az adószáma viszont ' +
        'a `companies_torzsszam_kulcs` miatt örökre foglalt maradna.',
    ).toMatch(/if tagok <= 1 then/);

    expect(
      torzs(),
      'Kiesett az „egyetlen tulajdonos" ellenőrzés. Ezt az ÁSZF 5. pontja ígéri: a cég nem ' +
        'maradhat gazdátlanul, amíg mások dolgoznak benne.',
    ).toMatch(/if sajat_szerep = 'tulajdonos' and not mas_tulajdonos then/);
  });

  /**
   * A sorrend nem stiláris. A tagsági sor a törléssel elszáll, és utána már
   * nincs mihez kötni a naplóbejegyzést — a bent maradó tulajdonos csak annyit
   * venne észre, hogy valaki eltűnt a listából.
   */
  it('a naplósor a törlés ELŐTT megy be', () => {
    const t = torzs() ?? '';
    const naplo = t.indexOf("'tag.kilepett'");
    const torles = t.indexOf('delete from public.company_members');

    expect(naplo, 'Nincs `tag.kilepett` naplósor a kilépésben.').toBeGreaterThan(-1);
    expect(
      naplo,
      'A naplósor a törlés UTÁN megy be. A tagsági sor addigra elszállt, tehát a bejegyzés ' +
        'vagy elmarad, vagy rossz céghez kerül.',
    ).toBeLessThan(torles);
  });

  it('az anon nem hívhatja', () => {
    const sql = sqlFajlok()
      .map((f) => readFileSync(MAPPA + f, 'utf8'))
      .join('\n');

    expect(
      sql,
      'A `cegbol_kilepek()`-ről nincs elvéve a Supabase által automatikusan adott EXECUTE jog. ' +
        'A `revoke`-ot nevesítve kell kimondani, különben az `anon` is hívhatja.',
    ).toContain('revoke all on function public.cegbol_kilepek() from public, anon');

    expect(sql).toContain('grant execute on function public.cegbol_kilepek() to authenticated');
  });
});
