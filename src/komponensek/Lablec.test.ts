import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LABLEC_LINKEK } from './Lablec.tsx';

/**
 * A lábléc linkjei **a belépett felületen is** kirajzolódnak, és a belépés
 * előtti képernyőkön is. Ebből két hibalehetőség következik, és mindkettő
 * némán romlik el:
 *
 * 1. Valaki átnevez egy nyilvános útvonalat az `App.tsx`-ben — a lábléc
 *    linkje ettől a „nincs ilyen oldal" ágra visz, ami a nyitólapra irányít
 *    vissza. Nem hibaüzenet keletkezik, hanem **majdnem működés**.
 * 2. Valaki felvesz ide egy **védett** útvonalat. Az a kilépett látogatónál a
 *    bejelentkezésre dob, a cég nélküli fióknál a cégalapításra — vagyis a
 *    lábléc zsákutcát kínál.
 *
 * Ezért a teszt az **útvonaltáblából** olvas, nem egy kézzel írt másolatból.
 */
describe('a lábléc linkjei és az útvonaltábla együtt mozognak', () => {
  const app = readFileSync(join(import.meta.dirname, '..', 'App.tsx'), 'utf8');
  const utvonalak = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '');

  // A „talál-e egyáltalán" őr: egy elromlott regexre nulla állítás bukna meg,
  // és a teszt zölden hazudna.
  it('az App.tsx-ből tényleg kiolvastunk útvonalakat', () => {
    expect(utvonalak.length).toBeGreaterThanOrEqual(15);
  });

  it('minden lábléclink létező útvonalra mutat', () => {
    for (const elem of LABLEC_LINKEK) {
      expect(utvonalak).toContain(elem.ut);
    }
  });

  /**
   * A védett útvonalak az `App.tsx`-ben **több sorban**, őrkomponensbe
   * (`Vendeg`, `Belepve`, `Ceggel`) csomagolva állnak; a nyilvánosak egyetlen
   * sorban, `element={<Oldal />}` alakban. A teszt ezt az alaki különbséget
   * méri — ez az egyetlen jel, ami forráskódból olvasható.
   */
  it('egyik lábléclink sincs őr mögött', () => {
    for (const elem of LABLEC_LINKEK) {
      const sor = app
        .split('\n')
        .find((s) => s.includes(`path="${elem.ut}"`));

      expect(sor, `${elem.ut} nem szerepel az útvonaltáblában`).toBeDefined();
      expect(sor, `${elem.ut} nem egysoros, vagyis őrbe van csomagolva`).toMatch(
        /element=\{<\w+ \/>\}/,
      );
    }
  });

  it('a Bejelentkezés és a Kapcsolat nincs benne', () => {
    const cimkek = LABLEC_LINKEK.map((e) => e.cimke);
    const utak = LABLEC_LINKEK.map((e) => e.ut);

    expect(cimkek).not.toContain('Bejelentkezés');
    expect(cimkek).not.toContain('Kapcsolat');
    expect(utak).not.toContain('/bejelentkezes');
    // A `mailto:` nem útvonal — ha valaha visszakerülne, itt is látszana.
    expect(utak.every((u) => u.startsWith('/'))).toBe(true);
  });
});
