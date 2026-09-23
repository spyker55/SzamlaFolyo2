import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A visszaváltás fedezetének elcsúszás-őre (`20260923000300_keret_fedezet.sql`).
 *
 * A döntés tiszta függvény (`hatalyosKeret()`, `shared/uzleti/keret.test.ts`),
 * de **nyersanyag nélkül üresen fut**: ha egy későbbi migráció a két RPC
 * valamelyikét a `fedezetek` mező nélkül írja újra, a TS oldal `undefined`-ot
 * kap, és csendben visszaáll a régi, utólag számlázó viselkedésre. Ez az őr
 * azt méri, hogy mindkét RPC **legutolsó** definíciója még adja a mezőt, és a
 * trigger a helyén van.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

function migraciok(): { nev: string; sql: string }[] {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nev) => ({ nev, sql: readFileSync(join(MAPPA, nev), 'utf8') }));
}

/** A függvény legutolsó `create or replace` törzse, fájlsorrendben. */
function utolsoTorzs(fv: string): { nev: string; torzs: string } | null {
  let talalt: { nev: string; torzs: string } | null = null;
  const minta = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${fv.replace('.', '\\.')}\\s*\\([\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$;`,
    'gi',
  );

  for (const { nev, sql } of migraciok()) {
    for (const m of sql.matchAll(minta)) {
      talalt = { nev, torzs: m[1] ?? '' };
    }
  }

  return talalt;
}

describe('a visszaváltás fedezete a nyersanyagban', () => {
  for (const fv of ['public.keret_adatok', 'public.tulhasznalat_nyersanyag']) {
    it(`a(z) ${fv} legutolsó definíciója adja a \`fedezetek\` mezőt`, () => {
      const t = utolsoTorzs(fv);

      expect(t, `Nem találtam a(z) ${fv} definícióját a migrációkban.`).not.toBeNull();
      expect(
        t?.torzs ?? '',
        `A(z) ${fv} legutolsó definíciója (${t?.nev ?? '?'}) nem adja vissza a ` +
          '`fedezetek` mezőt. Enélkül a hatalyosKeret() üres listát kap, és egy ' +
          'visszaváltás a már elvégzett munkát újra túlhasználatba ejti.',
      ).toMatch(/'fedezetek'[\s\S]*public\.keret_fedezetek/);
    });
  }

  it('a trigger a csomagkulcs átírására fut', () => {
    const osszes = migraciok()
      .map((m) => m.sql)
      .join('\n');

    expect(osszes).toMatch(
      /create\s+trigger\s+keret_fedezet\s+after\s+update\s+of\s+stripe_lookup_key\s+on\s+public\.companies/i,
    );
  });

  it('a trigger a RÉGI időszakkezdettől és a RÉGI kulccsal rögzít', () => {
    const t = utolsoTorzs('belso.keret_fedezet_rogzit');

    expect(t).not.toBeNull();
    expect(t?.torzs ?? '').toContain('old.stripe_lookup_key');
    expect(
      t?.torzs ?? '',
      'A fedezetnek a lezáruló időszakról kell szólnia: ha a váltás és a forduló ' +
        'egy eseménnyel érkezik, a `new.current_period_start` már az új időszak.',
    ).toContain('e.created_at >= old.current_period_start');
  });
});
