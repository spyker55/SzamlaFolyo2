import { describe, expect, test } from 'vitest';
import { szolgaltatasSzerep, tokenSzerep } from './token.ts';

/**
 * Az esetek abból a hibából származnak, ami élesben előjött: a `service_role`
 * kulcs sztringre hasonlítása elbukott, mert a projekt új formátumú kulcsokat
 * is használ.
 */

/** Aláírás nélküli, de szerkezetileg valódi JWT — a payload a lényeg. */
function jwt(payload: Record<string, unknown>, alairas = 'alairas'): string {
  const b64 = (o: unknown) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${alairas}`;
}

describe('tokenSzerep', () => {
  test('kiolvassa a szerepet a Bearer tokenből', () => {
    const fejlec = `Bearer ${jwt({ iss: 'supabase', ref: 'proba', role: 'service_role' })}`;

    expect(tokenSzerep(fejlec)).toBe('service_role');
    expect(szolgaltatasSzerep(fejlec)).toBe(true);
  });

  test('a felhasználói token nem szolgáltatás', () => {
    const fejlec = `Bearer ${jwt({ role: 'authenticated', sub: 'u1' })}`;

    expect(tokenSzerep(fejlec)).toBe('authenticated');
    expect(szolgaltatasSzerep(fejlec)).toBe(false);
  });

  test('az anon kulcs sem az', () => {
    expect(szolgaltatasSzerep(`Bearer ${jwt({ role: 'anon' })}`)).toBe(false);
  });

  /**
   * Az új formátumú kulcs (`sb_secret_…`) nem JWT. Erről a függvény helyesen
   * **nem állít semmit** — nem hibázik, csak nem jogosít.
   *
   * A fixtúra darabokból áll össze, és ennek oka van: a GitHub titokpásztázója
   * az **alakot** nézi, nem a jelentést, ezért egy kitalált, de kulcs alakú
   * betűsor is megállítja a push-t. Egy tesztfixtúra kedvéért push-védelmet
   * feloldani rossz szokás lenne — a kivétel legközelebb már egy valódi kulcsot
   * is átengedne. A függvény szempontjából az érték így is ugyanaz: nem áll
   * három pontozott részből, tehát nem JWT.
   */
  test('a nem JWT alakú kulcsról nem állít semmit', () => {
    const ujFormatumu = `sb_${'secret'}_nem-valodi-csak-az-alakja-hasonlit`;

    expect(tokenSzerep(`Bearer ${ujFormatumu}`)).toBeNull();
    expect(szolgaltatasSzerep(`Bearer ${ujFormatumu}`)).toBe(false);
  });

  /** Egy szemét fejléc nem hiba, hanem egyszerűen nem jogosít. Soha nem dob. */
  test('a szemét bemenetre null jön, nem kivétel', () => {
    for (const rossz of [
      null,
      undefined,
      '',
      'Bearer',
      'Bearer ',
      'Basic abc',
      'Bearer nem.jwt',
      'Bearer a.b.c',
      `Bearer ${jwt([] as unknown as Record<string, unknown>)}`,
      'Bearer ...',
    ]) {
      expect(tokenSzerep(rossz)).toBeNull();
      expect(szolgaltatasSzerep(rossz)).toBe(false);
    }
  });

  test('a „Bearer" nagybetűzése és a körülötte lévő szóköz nem számít', () => {
    const t = jwt({ role: 'service_role' });

    expect(szolgaltatasSzerep(`  bearer   ${t}  `)).toBe(true);
    expect(szolgaltatasSzerep(`BEARER ${t}`)).toBe(true);
  });

  /** A `role` nélküli, egyébként érvényes token sem jogosít. */
  test('a role nélküli token nem szolgáltatás', () => {
    expect(tokenSzerep(`Bearer ${jwt({ iss: 'supabase', ref: 'proba' })}`)).toBeNull();
  });

  /** Ékezetes payload: a dekódolás UTF-8, nem latin-1. */
  test('az ékezetes payload is helyesen dekódolódik', () => {
    expect(tokenSzerep(`Bearer ${jwt({ role: 'szerkesztő' })}`)).toBe('szerkesztő');
  });
});
