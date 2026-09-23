import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A gazdátlan fájlok selejtezésének elcsúszás-őre
 * (`20260923000900_gazdatlan_fajlok.sql`): a `belso.selejtezheto()`
 * **legutolsó** definíciója a gazdátlan fájlt is kiadja, és közben a régi
 * három feltétel sem kopott ki belőle.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

function utolsoTorzs(): { nev: string; torzs: string } | null {
  let talalt: { nev: string; torzs: string } | null = null;
  const minta = /create\s+or\s+replace\s+function\s+belso\.selejtezheto\s*\([\s\S]*?as\s+\$\$([\s\S]*?)\$\$;/gi;

  for (const nev of readdirSync(MAPPA).filter((f) => f.endsWith('.sql')).sort()) {
    for (const m of readFileSync(join(MAPPA, nev), 'utf8').matchAll(minta)) {
      talalt = { nev, torzs: (m[1] ?? '').replace(/--.*$/gm, '').replace(/\s+/g, ' ') };
    }
  }

  return talalt;
}

describe('a selejtezés a gazdátlan fájlt is elviszi', () => {
  const t = utolsoTorzs();

  it('a legutolsó definíció a gazdátlan ágat is tartalmazza, egynapos türelemmel, csak a napi futásra', () => {
    expect(t?.nev).toBe('20260923000900_gazdatlan_fajlok.sql');
    expect(t?.torzs).toContain(
      "csak_ezek is null and not exists ( select 1 from public.documents m where m.file_id = f.id ) and f.created_at < now() - interval '1 day'",
    );
  });

  it('a régi szabály három feltétele megmaradt', () => {
    expect(t?.torzs).toContain('exists ( select 1 from public.documents m where m.file_id = f.id ) and not exists');
    expect(t?.torzs).toContain("m.status not in ('exportalva', 'duplikatum')");
    expect(t?.torzs).toContain("+ (c.file_retention_days * interval '1 day') <= now()");
  });
});
