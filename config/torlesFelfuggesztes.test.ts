import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Szolgáltatóváltás alatt az automatikus törlés áll (ÁSZF 10. és 16. pont).
 *
 * A szabály egy cégszintű időpont (`companies.torles_felfuggesztve_eddig`), és
 * három SQL-függvény tartja be: az eredeti fájlok, az exportfájlok és a napi
 * adattakarítás (`20260925000100_valtas_torles_felfuggesztes.sql`). Az ÁSZF
 * erre ígéretet tesz — ha egy későbbi migráció újradefiniálja valamelyik
 * függvényt, és a feltétel kimarad, az ígéret **csendben** hamissá válik.
 *
 * Ezért a teszt mindhárom függvény **legutolsó** definícióját olvassa,
 * fájlsorrendben – ugyanazért, amiért a `megorzes.test.ts`: egy rögzített
 * fájlnév a régi törzset mérné.
 *
 * Élesben mérve (2026-09-25, visszagörgetett tranzakcióban): felfüggesztés
 * nélkül egy gazdátlan fájl, egy 40 napos exportfájl és egy 100 napos
 * levélnapló-sor selejtezhető; felfüggesztés alatt egyik sem.
 */
const MAPPA = 'supabase/migrations/';

function legutolso(fuggveny: string): { fajl: string; sql: string } {
  let talalt: { fajl: string; sql: string } | null = null;
  const minta = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+belso\\.${fuggveny}\\([\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$;`,
    'gi',
  );

  for (const fajl of readdirSync(MAPPA).filter((f) => f.endsWith('.sql')).sort()) {
    for (const m of readFileSync(MAPPA + fajl, 'utf8').matchAll(minta)) {
      talalt = { fajl, sql: m[1] ?? '' };
    }
  }

  expect(talalt, `Nem találtam a belso.${fuggveny}() definícióját a migrációkban.`).not.toBeNull();

  return talalt ?? { fajl: '?', sql: '' };
}

/** A kommentek nélküli törzs – egy megjegyzés ne hitelesíthesse a szabályt. */
function kod(sql: string): string {
  return sql.replace(/--.*$/gm, '');
}

describe('szolgáltatóváltás alatt az automatikus törlés áll', () => {
  it.each(['selejtezheto', 'selejtezheto_export'])('belso.%s() kihagyja a felfüggesztett céget', (fuggveny) => {
    const { fajl, sql } = legutolso(fuggveny);
    expect(
      kod(sql),
      `A belso.${fuggveny}() legutolsó definíciójából (${fajl}) hiányzik a felfüggesztés feltétele.`,
    ).toMatch(/torles_felfuggesztve_eddig\s+is\s+null\s+or\s+c\.torles_felfuggesztve_eddig\s*<=\s*now\(\)/);
  });

  it('belso.adattakaritas() mindhárom cégszintű lépése kihagyja a felfüggesztett céget', () => {
    const { fajl, sql } = legutolso('adattakaritas');
    const tiszta = kod(sql);

    for (const tabla of ['company_invites', 'inbound_emails', 'document_extractions']) {
      expect(
        tiszta,
        `A belso.adattakaritas() (${fajl}) a(z) ${tabla} takarításánál nem nézi a felfüggesztést.`,
      ).toMatch(new RegExp(`c\\.id\\s*=\\s*${tabla}\\.company_id\\s+and\\s+c\\.torles_felfuggesztve_eddig\\s*>\\s*now\\(\\)`));
    }
  });
});
