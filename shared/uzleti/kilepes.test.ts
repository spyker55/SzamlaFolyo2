import { describe, expect, it } from 'vitest';
import { kilepesDontes, type KilepesTenyek } from './kilepes.ts';

/**
 * A kilépés három kimenetele.
 *
 * A két tiltás nem formalitás, és nem is ugyanaz:
 *
 * - **egyedül**: a kilépés olyan cégsort hagyna hátra, amihez soha senki nem
 *   férne hozzá, az adószáma viszont a `companies_torzsszam_kulcs` miatt
 *   örökre foglalt maradna;
 * - **utolsó tulajdonos**: szó szerint az ÁSZF 5. pontja.
 *
 * Ugyanezt a két szabályt mondja ki a `cegbol_kilepek()` RPC is. Ha a kettő
 * széttartana, a felhasználó egy másik műveletre mondana igent, mint ami
 * lefut — ezért létezik ez a modul egy példányban.
 */

function tenyek(t: Partial<KilepesTenyek> = {}): KilepesTenyek {
  return {
    cegNev: 'Példa Kft.',
    szerep: 'szerkeszto',
    tagokSzama: 3,
    masikTulajdonos: true,
    ...t,
  };
}

describe('kilepesDontes', () => {
  it('a szerkesztő kiléphet, ha marad tulajdonos', () => {
    const d = kilepesDontes(tenyek());

    expect(d.fajta).toBe('mehet');
    expect(d.cim).toContain('Példa Kft.');
  });

  it('a tulajdonos is kiléphet, ha van másik tulajdonos', () => {
    expect(kilepesDontes(tenyek({ szerep: 'tulajdonos', masikTulajdonos: true })).fajta).toBe(
      'mehet',
    );
  });

  it('az egyetlen tulajdonos nem léphet ki, ha mások is bent vannak', () => {
    const d = kilepesDontes(tenyek({ szerep: 'tulajdonos', masikTulajdonos: false }));

    expect(d.fajta).toBe('utolso_tulajdonos');
    expect(d.fajta === 'utolso_tulajdonos' ? d.miert : '').toContain('2 felhasználó');
  });

  /**
   * ⚠️ Ez az eset fontosabb, mint amilyennek látszik. Aki egyedül lép ki, az
   * olyan cégsort hagy hátra, amit **soha senki nem tud törölni**, az adószáma
   * viszont foglalt marad — ugyanaz a vállalkozás nem tud új céget alapítani.
   */
  it('aki egyedül van, azt a fióktörlés felé küldjük', () => {
    const d = kilepesDontes(tenyek({ tagokSzama: 1, masikTulajdonos: false }));

    expect(d.fajta).toBe('egyedul');
    expect(d.fajta === 'egyedul' ? d.miert : '').toContain('Fiók törlése');
  });

  it('az egyedüllét erősebb szabály, mint a tulajdonosi szerep', () => {
    // Egyetlen tulajdonos, aki egyben az egyetlen tag is: nem az ÁSZF 5.
    // mondata jár neki, hanem az árva cégsoré.
    expect(
      kilepesDontes(tenyek({ szerep: 'tulajdonos', tagokSzama: 1, masikTulajdonos: false })).fajta,
    ).toBe('egyedul');
  });

  it('cégnév nélkül sem ír ki „null"-t', () => {
    for (const t of [
      tenyek({ cegNev: null }),
      tenyek({ cegNev: null, tagokSzama: 1, masikTulajdonos: false }),
      tenyek({ cegNev: null, szerep: 'tulajdonos', masikTulajdonos: false }),
    ]) {
      const d = kilepesDontes(t);
      const szoveg = d.cim + (d.fajta === 'mehet' ? d.kovetkezmenyek.join(' ') : d.miert);

      expect(szoveg).not.toContain('null');
      expect(szoveg).toContain('cég');
    }
  });
});
