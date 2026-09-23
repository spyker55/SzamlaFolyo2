import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Az e-mailben érkezett bizonylat kiolvasása azonnal indul (2026-09-23).
 *
 * A `Deno.serve` Node alatt nem fut, ezért ez forrásszintű őr: azt méri, hogy
 * a lánc két vége össze van kötve — az `email-bekuldes` hívja az indítót, és
 * az indító SQL-függvény létezik, csak a `service_role`-nak.
 */

const FUGGVENY = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const MIGRACIOK = new URL('../../migrations/', import.meta.url);
const SQL = readdirSync(MIGRACIOK)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(new URL(f, MIGRACIOK), 'utf8'))
  .join('\n');

describe('az e-mailes bizonylat azonnali kiolvasása', () => {
  it('az email-bekuldes a beszúrt bizonylat azonosítójával indítja', () => {
    expect(FUGGVENY).toContain("db.rpc('kiolvasast_indit', { dokumentum: dokumentumId })");
    expect(FUGGVENY).toMatch(/await kiolvasastIndit\(db, dokumentum\.id as string\)/);
  });

  it('az indítás hibája nem állítja meg a levelet, de naplóba kerül', () => {
    const torzs = FUGGVENY.slice(FUGGVENY.indexOf('async function kiolvasastIndit'));

    expect(torzs).toContain('console.error(');
    expect(torzs.slice(0, torzs.indexOf('\n}\n'))).not.toContain('throw');
  });

  it('az indító SQL-függvény létezik, és csak a service_role hívhatja', () => {
    expect(SQL).toMatch(/create\s+or\s+replace\s+function\s+public\.kiolvasast_indit\(dokumentum uuid\)/);
    expect(SQL).toContain(
      'revoke all on function public.kiolvasast_indit(uuid) from public, anon, authenticated;',
    );
    expect(SQL).toContain('grant execute on function public.kiolvasast_indit(uuid) to service_role;');
  });

  it('a cron kulcsával hív, a megnevezett bizonylatra', () => {
    expect(SQL).toMatch(/name = 'service_role_kulcs'[\s\S]*?jsonb_build_object\('dokumentum_id', dokumentum\)/);
  });
});
