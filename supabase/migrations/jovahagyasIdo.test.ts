import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A jóváhagyás ideje a szerver órájából jön, nem a böngészőéből.
 *
 * 2026-10-01-én az első külső felhasználó gépének órája 7:43:42-vel késett, és
 * a négy bizonylata „előbb lett jóváhagyva, mint feltöltve" — mert az
 * `approved_at` a böngészőből jött. A javítás egy BEFORE trigger
 * (`20261001000100_jovahagyas_szerverido.sql`), ez az őr pedig azt méri, hogy
 * a lánc végén még mindig ott van, és még mindig a szerver idejét írja.
 *
 * Élesben mérve, visszagörgetett tranzakcióban: lásd a DONTESTORTENET
 * 2026-10-01-i szakaszát.
 */

const MAPPA = new URL('.', import.meta.url).pathname;
const FUGGVENY = 'belso.jovahagyas_szerverido';
const TRIGGER = 'documents_approved_at';

const fajlok = readdirSync(MAPPA)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => ({ fajl: f, sql: readFileSync(MAPPA + f, 'utf8') }));

/** A függvény legutolsó kiadásának törzse a záró `$$;`-ig — élesben az számít. */
function utolsoTorzs(): { fajl: string; torzs: string } | null {
  let talalat: { fajl: string; torzs: string } | null = null;

  for (const { fajl, sql } of fajlok) {
    const kezdet = sql.lastIndexOf(`create or replace function ${FUGGVENY}()`);
    if (kezdet === -1) continue;

    const veg = sql.indexOf('$$;', kezdet);
    if (veg !== -1) talalat = { fajl, torzs: sql.slice(kezdet, veg) };
  }

  return talalat;
}

/** A trigger-utasítások (létrehozás és eldobás) a lánc sorrendjében. */
function triggerEsemenyek(): { fajl: string; utasitas: string }[] {
  const minta = new RegExp(`(create trigger ${TRIGGER}\\b[^;]*;|drop trigger (if exists )?${TRIGGER}\\b[^;]*;)`, 'g');
  return fajlok.flatMap(({ fajl, sql }) =>
    [...sql.matchAll(minta)].map((m) => ({ fajl, utasitas: (m[0] ?? '').replace(/\s+/g, ' ') })),
  );
}

describe('az approved_at a szerver órájából', () => {
  it('a függvény megvan, és a tranzakció idejét írja', () => {
    const talalat = utolsoTorzs();

    expect(talalat, `Nincs \`create or replace function ${FUGGVENY}()\` egyetlen migrációban sem.`).not.toBeNull();
    expect(talalat?.torzs, 'A függvény nem a szerver idejét írja az approved_at-be.').toContain(
      'new.approved_at := now()',
    );
  });

  it('csak a ténylegesen átállított, nem-NULL értéket pecsételi', () => {
    const torzs = utolsoTorzs()?.torzs ?? '';

    // A visszaküldés NULL-t ír: azt nem szabad pecsétre cserélni.
    expect(torzs).toContain('new.approved_at is not null');
    // A változatlanul visszaírt érték sem kap új időt.
    expect(torzs).toContain('new.approved_at is distinct from old.approved_at');
  });

  it('a trigger a lánc végén is él, és a documents táblán, beszúráskor és módosításkor fut', () => {
    const esemenyek = triggerEsemenyek();
    const utolso = esemenyek.at(-1);

    expect(utolso, `Nincs \`create trigger ${TRIGGER}\` egyetlen migrációban sem.`).toBeDefined();
    expect(utolso?.utasitas, `A(z) ${utolso?.fajl} fájl eldobja a triggert, és nem hozza létre újra.`).toMatch(
      /^create trigger/,
    );
    expect(utolso?.utasitas).toContain('before insert or update of approved_at on public.documents');
    expect(utolso?.utasitas).toContain(`execute function ${FUGGVENY}()`);
  });
});
