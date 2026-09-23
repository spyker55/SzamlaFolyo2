import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A tagsági sor nem írható vissza a felhasználó kezébe.
 *
 * # Mit véd
 *
 * A `20260923000100` migráció egy mért jogosultság-emelést zárt le: a
 * `company_members` UPDATE és DELETE politikájában ott állt a
 * `user_id = auth.uid()` ág, és ettől egy `megtekinto` szerepű felhasználó
 * **tulajdonossá tehette magát**, sőt a saját tagsági sorát átvihette egy
 * idegen céghez is.
 *
 * Ez a fajta ág **kényelmes**: első ránézésre azt mondja, hogy „ki-ki a
 * magáét". A következő ember, aki egy önkiszolgáló műveletet ír (kilépés,
 * profil, értesítési beállítás), könnyen visszateszi ugyanezt — és a
 * következmény újra csendes lesz.
 *
 * ⚠️ A teszt **szöveget** olvas, nem adatbázist, és a migrációk **legutolsó**
 * kiadását nézi: egy későbbi migráció, ami visszalazítja a politikát, itt bukik
 * el. Ha a migrációk alakja változik, elbukik, nem hallgat el.
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

/** A `company_members`-re vonatkozó `create policy` blokkok, fájlsorrendben. */
function politikak(): string[] {
  const talalatok: string[] = [];

  for (const fajl of sqlFajlok()) {
    const sql = readFileSync(MAPPA + fajl, 'utf8');

    for (const blokk of sql.split('create policy').slice(1)) {
      const vege = blokk.indexOf(';');
      const teljes = vege === -1 ? blokk : blokk.slice(0, vege);

      if (teljes.includes('public.company_members')) talalatok.push(teljes);
    }
  }

  return talalatok;
}

/** A legutolsó politika az adott műveletre — ez az, ami élesben áll. */
function utolso(muvelet: 'update' | 'delete'): string | null {
  const talalok = politikak().filter((p) => p.includes(`for ${muvelet}`));

  return talalok.length === 0 ? null : (talalok[talalok.length - 1] ?? null);
}

describe('a tagsági sort csak a tulajdonos írja', () => {
  /**
   * A „talál-e egyáltalán" állítás. Egy elrontott olvasás nulla blokkot adna,
   * és alatta minden más állítás **üresen menne át**.
   */
  it('egyáltalán talál company_members politikákat', () => {
    expect(sqlFajlok().length).toBeGreaterThan(20);
    expect(
      politikak().length,
      'Egyetlen `create policy` blokkot sem találtam a `company_members`-re — rossz alakot keresek.',
    ).toBeGreaterThanOrEqual(4);

    expect(utolso('update'), 'Nincs UPDATE politika a `company_members`-en.').not.toBeNull();
    expect(utolso('delete'), 'Nincs DELETE politika a `company_members`-en.').not.toBeNull();
  });

  for (const muvelet of ['update', 'delete'] as const) {
    it(`a legutolsó ${muvelet.toUpperCase()} politika nem engedi a saját sort`, () => {
      expect(
        utolso(muvelet),
        `A \`company_members\` legutolsó ${muvelet.toUpperCase()} politikájában megint ott a ` +
          '`auth.uid()` — vagyis a felhasználó a **saját tagsági sorát** írhatja. Ez mérve ' +
          'jogosultság-emelés volt: egy `megtekinto` tulajdonossá tette magát, és a sorát ' +
          'átvitte egy idegen céghez. Az önkiszolgáló műveleteknek `security definer` RPC ' +
          'a helyük, nem egy politika-ág.',
      ).not.toContain('auth.uid()');
    });
  }

  it('az authenticated csak a szerepet írhatja', () => {
    const sql = mindenSql();

    expect(
      sql,
      'Egyetlen migráció sem veszi el az `authenticated` tábla szintű UPDATE jogát a ' +
        '`company_members`-en. Enélkül egy visszalazult politika mellett a `company_id` is írható.',
    ).toContain('revoke update on table public.company_members from authenticated');

    expect(
      sql,
      'A nevesített UPDATE jog nem csak a `role` oszlopra szól. A `company_id` és a `user_id` ' +
        'írhatósága a bérlő-elkülönítést nyitja ki.',
    ).toContain('grant update (role) on table public.company_members to authenticated');
  });

  it('a gazdátlanság ellen trigger áll, nem csak a felület', () => {
    const sql = mindenSql();

    expect(
      sql,
      'Nincs `belso.gazdatlan_ceg_tiltas()` függvény. A tulajdonos a politika szerint ' +
        'eltávolíthatja **saját magát** is — enélkül a cég felhasználókkal, de tulajdonos ' +
        'nélkül maradhat, amit az ÁSZF 5. pontja kizár.',
    ).toContain('function belso.gazdatlan_ceg_tiltas()');

    expect(
      sql,
      'A trigger nem figyeli a `role` oszlop módosítását. Az utolsó tulajdonos **lefokozása** ' +
        'ugyanúgy gazdátlanná teszi a céget, mint a törlése.',
    ).toMatch(/after delete or update of role, company_id on public\.company_members/);
  });
});
