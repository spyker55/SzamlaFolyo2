import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';

/**
 * A migrációlánc másik elcsúszás-őre: a **verziószámoké**.
 *
 * A `politikanevek.test.ts` azt méri, hogy a lánc *tartalma* lejátszható-e.
 * Ez azt, hogy a lánc *egyáltalán sorba rendezhető-e* — és a kettő külön is
 * el tud romlani.
 *
 * # Mit fog meg, és miért pont ezt
 *
 * 2026-09-21-én egy átvizsgálás megtalálta, hogy **két fájlpár ugyanazt a
 * verziószámot viselte**:
 *
 *   20260920000100_adattakaritas.sql   +  20260920000100_fiok_torles_tenyek.sql
 *   20260921000100_kiolvasas_meres.sql +  20260921000100_politikanevek_ekezetesitese.sql
 *
 * A Supabase CLI a migrációkat a fájlnév **számelőtagjára** kulcsolja: azt írja
 * be a `supabase_migrations.schema_migrations` táblába, és azt nézi meg, hogy
 * lefutott-e már. Két azonos előtagú fájlból tehát az egyik lefutása a másikat
 * is „lefutottnak" jelentheti — és a kimaradt migráció **némán** hiányzik majd
 * a friss adatbázisból.
 *
 * ⚠️ Élesben ez sosem sült el, és nem is fog: erre a projektre a migrációk az
 * MCP-n át mentek ki, saját időbélyeggel (lásd `OLVASS-EL.md`). Pont ez teszi
 * csendessé — az élő adatbázis állapota **semmit nem mond** arról, hogy a repó
 * lejátszható-e. Egy `supabase db reset`, egy új branch vagy egy
 * visszaállítás az első hely, ahol kiderülne, és az a lehető legrosszabb
 * pillanat.
 *
 * A sorrend maga nem ellenőrizhető innen (ahhoz tudni kellene, mi volt a
 * *szándékolt* sorrend), az **egyediség** viszont igen — és a kár ebből ered.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

/** `20260912000100_alap.sql` → `{ verzio: '20260912000100', nev: 'alap' }` */
const ALAK = /^(\d{14})_([a-z0-9_]+)\.sql$/;

function fajlok(): string[] {
  return readdirSync(MAPPA)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

describe('a migrációk verziószámai', () => {
  /**
   * A „talál-e egyáltalán" állítás. Egy elrontott olvasás nulla fájlt adna, és
   * alatta minden más állítás **üresen menne át** — ez a fajta hamis zöld már
   * egyszer megfogott minket a `FUTO_ALLAPOTOK` körében.
   */
  it('egyáltalán lát migrációkat', () => {
    expect(fajlok().length).toBeGreaterThan(20);
  });

  it('mindegyik a `YYYYMMDDHHMMSS_nev.sql` alakot követi', () => {
    const rosszak = fajlok().filter((f) => !ALAK.test(f));

    expect(rosszak, `Nem a várt alakú migrációs fájlnév: ${rosszak.join(', ')}`).toEqual([]);
  });

  it('mind egyedi — két fájl nem viselheti ugyanazt a verziót', () => {
    const hol = new Map<string, string[]>();

    for (const fajl of fajlok()) {
      const verzio = ALAK.exec(fajl)?.[1] ?? fajl;
      hol.set(verzio, [...(hol.get(verzio) ?? []), fajl]);
    }

    const utkozok = [...hol.entries()]
      .filter(([, fajlok]) => fajlok.length > 1)
      .map(([verzio, fajlok]) => `${verzio}: ${fajlok.join(' + ')}`);

    expect(
      utkozok,
      `Ütköző migrációs verziószám — a CLI erre kulcsol, tehát az egyik fájl ` +
        `némán kimaradhat egy friss adatbázisból:\n  ${utkozok.join('\n  ')}`,
    ).toEqual([]);
  });
});
