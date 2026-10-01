import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A `vercel.json` biztonsági fejléceinek őre.
 *
 * 2026-10-01-ig az éles oldal a HSTS-en kívül semmilyen biztonsági fejlécet
 * nem küldött (mérve: `web_fetch_vercel_url`). A legsúlyosabb hiány a
 * keretezés tiltása volt: enélkül egy idegen oldal láthatatlan keretbe
 * töltheti a SzámlaFolyót, és rákattinthatja a belépett felhasználót a saját
 * gombjaira — a fióktörlésre is.
 *
 * # Miért nem teljes CSP
 *
 * A `frame-ancestors`, a `base-uri` és az `object-src` semmit nem tilt, amit
 * az alkalmazás használ: nem korlátozza a szkripteket, a stílusokat és a
 * Supabase-hívásokat. A teljes tartalombiztonsági szabályzat (`script-src`,
 * `connect-src` …) ennél sokkal érzékenyebb — egy kihagyott forrás élesben
 * törne —, ezért az csak böngészőben mérve kerülhet be, külön körben.
 *
 * Az előnézet `<iframe>`-je (`Ellenorzes.tsx`) a Supabase-domain aláírt
 * URL-jét tölti be; a saját válaszunk keretezési tilalma ezt nem érinti.
 */

type Fejlec = { key: string; value: string };
type Szabaly = { source: string; headers: Fejlec[] };

const GYOKER = new URL('..', import.meta.url).pathname;
const vercel = JSON.parse(readFileSync(`${GYOKER}vercel.json`, 'utf8')) as { headers?: Szabaly[] };

/** A minden útvonalra érvényes szabály fejlécei, kisbetűs kulccsal. */
function mindenhol(): Map<string, string> {
  const szabaly = vercel.headers?.find((s) => s.source === '/(.*)');
  return new Map((szabaly?.headers ?? []).map((f) => [f.key.toLowerCase(), f.value]));
}

describe('biztonsági fejlécek minden útvonalon', () => {
  it('anti-vakság: van minden útvonalra szóló szabály', () => {
    expect(mindenhol().size).toBeGreaterThanOrEqual(5);
  });

  it('keretbe tölteni tilos — régi és új böngészőben is', () => {
    expect(mindenhol().get('x-frame-options')).toBe('DENY');
    expect(mindenhol().get('content-security-policy')).toMatch(/(^|;\s*)frame-ancestors 'none'(;|$)/);
  });

  it('a CSP csak olyat tilt, amit az alkalmazás nem használ', () => {
    // Ha valaki szkript- vagy kapcsolati korlátot tesz ide, azt mérje meg
    // böngészőben, és írja át ezt a tesztet tudatosan.
    const csp = mindenhol().get('content-security-policy') ?? '';
    expect(csp).not.toMatch(/\b(default|script|style|connect|img|font|frame|media|worker)-src\b/);
  });

  it('a többi fejléc', () => {
    expect(mindenhol().get('x-content-type-options')).toBe('nosniff');
    expect(mindenhol().get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(mindenhol().get('permissions-policy')).toContain('camera=()');
  });
});
