import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/**
 * A `kiolvasas:proba` **valódi Node-dal** indul – ez a teszt azt méri, amit a
 * többi nem: hogy a script a Node saját TypeScript-futtatásával (csak
 * típustörlés, `--experimental-strip-types` nélkül is) egyáltalán elindul-e.
 *
 * 2026-09-23: a tesztkör zöld volt, a tulajdonos gépén mégis mindhárom mérés
 * `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`-szal állt meg – egy
 * `constructor(readonly …)` paramétertulajdonság miatt, amit a Vitest
 * lefordít, a Node viszont nem ismer. A mérés kulcs nélkül fut: a teljes
 * importlánc betöltődik, a kulcs hiányánál megáll, hálózatot nem ér.
 */
describe('a mérőscript Node-dal indul', () => {
  it('betölt, és kulcs nélkül a saját üzenetével áll meg', () => {
    const futas = spawnSync(
      process.execPath,
      ['eszkozok/kiolvasas-proba.ts', 'tesztadat/egy-szamla-rendes.pdf', '--gondolkodas', 'low'],
      { encoding: 'utf8', env: { ...process.env, OPENROUTER_API_KEY: '' }, timeout: 60_000 },
    );

    expect(futas.stderr).not.toContain('ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
    expect(futas.stderr).not.toContain('SyntaxError');
    expect(futas.stderr).toContain('Nincs OPENROUTER_API_KEY');
  });
});
