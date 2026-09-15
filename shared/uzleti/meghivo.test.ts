import { describe, expect, it } from 'vitest';
import {
  allapotCimke,
  cimHelyes,
  cimetNormalizal,
  ferMegTag,
  hatralevoNap,
  helyek,
  meghivoLevel,
  meghivoLink,
} from './meghivo.ts';
import { szamlafolyo } from '../../config/szamlafolyo.ts';

const LEJAR = '2026-09-22T10:00:00.000Z';
const MOST = new Date('2026-09-15T10:00:00.000Z');

function level(felulir: Partial<Parameters<typeof meghivoLevel>[0]> = {}) {
  return meghivoLevel({
    cegNev: 'Nyeste Krisztián e.v.',
    szerep: 'szerkeszto',
    meghivo: 'fonok@example.com',
    token: 'abcdefgh23456789jkmnpqrs',
    lejar: LEJAR,
    ...felulir,
  });
}

describe('cimetNormalizal', () => {
  it('levágja a szóközt és kisbetűsít', () => {
    expect(cimetNormalizal('  Kati@Example.COM ')).toBe('kati@example.com');
  });
});

describe('cimHelyes', () => {
  it.each(['kati@example.com', 'a.b+c@alma.co.uk', '  Kati@Example.COM '])('elfogadja: %s', (c) => {
    expect(cimHelyes(c)).toBe(true);
  });

  it.each(['kati', 'kati@', '@example.com', 'kati@example', 'ka ti@example.com', ''])(
    'elutasítja: %s',
    (c) => {
      expect(cimHelyes(c)).toBe(false);
    },
  );
});

describe('meghivoLink', () => {
  it('a configból veszi a webcímet, nem a kérésből', () => {
    expect(meghivoLink('jelsor')).toBe(`${szamlafolyo.webcim}/meghivo/jelsor`);
  });
});

describe('hatralevoNap', () => {
  it('felfelé kerekít', () => {
    expect(hatralevoNap(LEJAR, MOST)).toBe(7);
  });

  it('a lejárt meghívóra nullát ad, nem negatívat', () => {
    expect(hatralevoNap('2026-09-01T00:00:00.000Z', MOST)).toBe(0);
  });

  it('értelmezhetetlen dátumra nullát ad', () => {
    expect(hatralevoNap('nem dátum', MOST)).toBe(0);
  });
});

describe('meghivoLevel', () => {
  it('a tárgyban ott a cég neve', () => {
    expect(level().targy).toBe('Meghívó a(z) Nyeste Krisztián e.v. SzámlaFolyó-fiókjába');
  });

  it('a linket mindkét alak tartalmazza', () => {
    const l = level();
    const link = `${szamlafolyo.webcim}/meghivo/abcdefgh23456789jkmnpqrs`;

    expect(l.html).toContain(`href="${link}"`);
    expect(l.szoveg).toContain(link);
  });

  it('kiírja a szerepet emberi alakban', () => {
    expect(level({ szerep: 'megtekinto' }).szoveg).toContain('megtekintő szerepben');
  });

  it('megmondja, ki hívott', () => {
    expect(level().szoveg).toContain('fonok@example.com meghívott');
  });

  /*
   * ⚠️ Ez a teszt a levél legfontosabb állítása. A cégnevet a felhasználó írja
   * be, a levél pedig HTML: escape nélkül a saját, hitelesített tartományunkról
   * küldenénk ki tetszőleges jelölést — például egy idegen helyre mutató linket
   * a levél közepén.
   */
  it('escape-eli a cégnevet a HTML-ben', () => {
    const l = level({ cegNev: 'A<script>x</script>"Kft."' });

    expect(l.html).not.toContain('<script>');
    expect(l.html).toContain('A&lt;script&gt;x&lt;/script&gt;&quot;Kft.&quot;');
  });

  it('a tárgyba a nyers cégnév megy — az nem HTML', () => {
    expect(level({ cegNev: 'A & B Kft.' }).targy).toContain('A & B Kft.');
  });

  it('a szöveges alak sem tartalmaz jelölést', () => {
    expect(level().szoveg).not.toContain('<');
  });

  it('a lejárt meghívóról nem állítja, hogy még él', () => {
    const l = meghivoLevel({
      cegNev: 'Teszt Kft.',
      szerep: 'szerkeszto',
      meghivo: 'fonok@example.com',
      token: 'abcdefgh23456789jkmnpqrs',
      lejar: '2000-01-01T00:00:00.000Z',
    });

    expect(l.szoveg).toContain('A link már lejárt.');
    expect(l.szoveg).not.toContain('napig érvényes');
  });

  it('kimondja, hogy melyik címmel lehet elfogadni', () => {
    expect(level().szoveg).toContain('amelyikre ez a levél érkezett');
  });

  it('a véletlen címzettnek nem ad teendőt', () => {
    expect(level().szoveg).toContain('nincs teendőd');
  });
});

describe('allapotCimke', () => {
  it('emberi címkét ad', () => {
    expect(allapotCimke('ervenyes')).toBe('Elküldve');
    expect(allapotCimke('visszavont')).toBe('Visszavonva');
  });
});

describe('helyek', () => {
  it('próbaidőn a próba kerete', () => {
    expect(helyek({ allapot: 'proba', csomagKulcs: null })).toBe(szamlafolyo.proba.felhasznalok);
  });

  it('lejárt előfizetésnél sem tágabb', () => {
    expect(helyek({ allapot: 'lejart', csomagKulcs: null })).toBe(szamlafolyo.proba.felhasznalok);
  });

  it('csomagnál a csomag száma', () => {
    expect(helyek({ allapot: 'elofizetes', csomagKulcs: 'kicsi' })).toBe(
      szamlafolyo.csomagok.kicsi.felhasznalok,
    );
  });

  it('a Pro (nagy) korlátlan', () => {
    expect(helyek({ allapot: 'elofizetes', csomagKulcs: 'nagy' })).toBeNull();
  });
});

describe('ferMegTag', () => {
  const start = { allapot: 'elofizetes', csomagKulcs: 'kicsi' as const };

  it('fér, amíg van hely', () => {
    expect(ferMegTag(start, 1, 0).fer).toBe(true);
  });

  it('a függő meghívó is helyet foglal', () => {
    // Start = 2 hely. Egy tag + egy függő meghívó már betölti.
    const eredmeny = ferMegTag(start, 1, 1);

    expect(eredmeny.fer).toBe(false);
    expect(eredmeny.indok).toContain('Vonj vissza egy meghívót');
  });

  it('meghívó nélkül másik mondatot ad', () => {
    const eredmeny = ferMegTag(start, 2, 0);

    expect(eredmeny.fer).toBe(false);
    expect(eredmeny.indok).toContain('Nagyobb csomaggal');
  });

  it('a korlátlan csomagba mindig fér', () => {
    expect(ferMegTag({ allapot: 'elofizetes', csomagKulcs: 'nagy' }, 99, 99).fer).toBe(true);
  });
});
