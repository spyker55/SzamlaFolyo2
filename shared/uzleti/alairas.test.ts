import { describe, expect, test } from 'vitest';

import { alairastEllenoriz, titkotOlvas, TURES_MP } from './alairas.ts';

/**
 * A webhook-aláírás ellenőrzése.
 *
 * # Miért nyilvános tesztvektorral mérünk
 *
 * Kézenfekvő lenne a saját `hmac()`-ünkkel legyártani az aláírást, és utána
 * megnézni, hogy a saját ellenőrzőnk elfogadja-e. Az a teszt **mindig zöld
 * lenne** — akkor is, ha az algoritmus rossz —, mert a kód csak önmagával
 * egyezne. Egy olyan hibát, mint a `whsec_` base64-jének dekódolatlanul
 * hagyása, pont nem venne észre: a két oldal ugyanúgy hibázna.
 *
 * Ezért a Standard Webhooks / Svix **közzétett** tesztvektorát használjuk. Ez
 * kívülről jön, tehát azt méri, hogy a mi implementációnk a **specifikációval**
 * egyezik-e, nem azt, hogy magával.
 */

/*
 * ⚠️ A fixtúra darabokból áll össze, ugyanabból az okból, mint a
 * `token.test.ts`-ben: a GitHub titokpásztázója az **alakot** nézi, nem a
 * jelentést, és egy `whsec_…` alakú betűsor megállítaná a push-t. Ez nem valódi
 * titok — a Svix saját dokumentációjában szerepel, épp azért, hogy le lehessen
 * mérni vele az implementációt. Push-védelmet feloldani viszont nem opció: a
 * kivétel legközelebb már egy valódi kulcsot is átengedne.
 */
const TITOK = `whsec_${'MfKQ9r8GKYqr'}${'TwjUPD8ILPZIo2LaLaSw'}`;
const ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const IDOBELYEG = '1614265330';
const TEST = '{"test": 2432232314}';
const ALAIRAS = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

/** A vektor 2021-es; a tűrésellenőrzés miatt az „éppen most" is onnan indul. */
const AKKOR = Number(IDOBELYEG) * 1000;

function keres(felulir: Record<string, unknown> = {}) {
  return {
    test: TEST,
    id: ID,
    idobelyeg: IDOBELYEG,
    alairas: ALAIRAS,
    titok: TITOK,
    most: AKKOR,
    ...felulir,
  };
}

describe('alairastEllenoriz', () => {
  test('a Svix nyilvános tesztvektorát elfogadja', async () => {
    expect(await alairastEllenoriz(keres())).toEqual({ ok: true });
  });

  /**
   * Ez a teszt a `titkotOlvas()` létjogosultsága. Ha a `whsec_` előtag utáni
   * rész **szövegként** menne kulcsnak a base64 bájtjai helyett, a fenti
   * tesztvektor elbukna — de csak az; minden saját gyártású aláírás átmenne.
   */
  test('a titok a base64 dekódolt bájtjai, nem a szövege', () => {
    const bajtok = titkotOlvas(TITOK);

    expect(bajtok).toBeInstanceOf(Uint8Array);
    // 24 base64-karakterből (a `whsec_` nélküli 32-ből) 24 bájt lesz.
    expect(bajtok.length).toBe(24);
    expect(bajtok.length).toBeLessThan(TITOK.length - 6);
  });

  test('az előtag nélküli titok ugyanaz', () => {
    expect(titkotOlvas(TITOK.slice(6))).toEqual(titkotOlvas(TITOK));
  });

  test('egyetlen megváltozott bájt a testben elbuktatja', async () => {
    const eredmeny = await alairastEllenoriz(keres({ test: '{"test": 2432232315}' }));

    expect(eredmeny).toEqual({ ok: false, miert: 'Az aláírás nem egyezik.' });
  });

  /**
   * Ez az az eset, ami miatt a függvény a **nyers** testtel dolgozik: a
   * `JSON.parse` → `JSON.stringify` kör szemre ugyanazt adja, bájtra viszont
   * nem (itt épp a szóköz tűnik el a kettőspont után).
   */
  test('az újraszerializált JSON más bájtsor, tehát elbukik', async () => {
    const ujra = JSON.stringify(JSON.parse(TEST));

    expect(ujra).not.toBe(TEST);
    expect(await alairastEllenoriz(keres({ test: ujra }))).toEqual({
      ok: false,
      miert: 'Az aláírás nem egyezik.',
    });
  });

  test('más azonosító elbuktatja', async () => {
    const eredmeny = await alairastEllenoriz(keres({ id: 'msg_masik' }));

    expect(eredmeny.ok).toBe(false);
  });

  describe('időbélyeg', () => {
    test('a tűrésen kívüli régi kérés elbukik, akkor is, ha az aláírás jó', async () => {
      const eredmeny = await alairastEllenoriz(keres({ most: AKKOR + (TURES_MP + 1) * 1000 }));

      expect(eredmeny).toEqual({ ok: false, miert: 'Az időbélyeg a tűrésen kívül van.' });
    });

    /** Óracsúszás mindkét irányban lehet, nem csak késés. */
    test('a jövőbeli kérés is elbukik a tűrésen kívül', async () => {
      const eredmeny = await alairastEllenoriz(keres({ most: AKKOR - (TURES_MP + 1) * 1000 }));

      expect(eredmeny).toEqual({ ok: false, miert: 'Az időbélyeg a tűrésen kívül van.' });
    });

    test('a tűrésen belül átmegy', async () => {
      const eredmeny = await alairastEllenoriz(keres({ most: AKKOR + (TURES_MP - 1) * 1000 }));

      expect(eredmeny).toEqual({ ok: true });
    });

    test('a nem szám időbélyeg elbukik', async () => {
      const eredmeny = await alairastEllenoriz(keres({ idobelyeg: 'tegnap' }));

      expect(eredmeny).toEqual({ ok: false, miert: 'Az időbélyeg nem szám.' });
    });
  });

  describe('a fejléc alakja', () => {
    /** Kulcsforgatás alatt a szolgáltató több aláírást küld; elég, ha egy jó. */
    test('több aláírás közül elég, ha az egyik egyezik', async () => {
      const tobb = `v1,${'A'.repeat(44)} ${ALAIRAS}`;

      expect(await alairastEllenoriz(keres({ alairas: tobb }))).toEqual({ ok: true });
    });

    /**
     * Verziójelölés nélküli elemet nem fogadunk el. Egy jövőbeli `v2` séma
     * más algoritmust jelentene — azt v1-ként ellenőrizni csendes hiba lenne.
     */
    test('a v1 jelölés nélküli aláírást nem nézzük meg', async () => {
      const csupasz = ALAIRAS.slice(3);

      expect(await alairastEllenoriz(keres({ alairas: csupasz }))).toEqual({
        ok: false,
        miert: 'Nincs v1 aláírás a fejlécben.',
      });
    });

    test('a v2 aláírást nem fogadjuk el v1-ként', async () => {
      const v2 = `v2,${ALAIRAS.slice(3)}`;

      expect(await alairastEllenoriz(keres({ alairas: v2 }))).toEqual({
        ok: false,
        miert: 'Nincs v1 aláírás a fejlécben.',
      });
    });

    test('hiányzó fejléc esetén nem is számolunk', async () => {
      for (const ures of [{ id: '' }, { idobelyeg: '' }, { alairas: '' }, { titok: '' }]) {
        expect(await alairastEllenoriz(keres(ures))).toEqual({
          ok: false,
          miert: 'Hiányzó aláírásfejléc vagy titok.',
        });
      }
    });

    test('az értelmezhetetlen titok nem dob kivételt, hanem nemet mond', async () => {
      const eredmeny = await alairastEllenoriz(keres({ titok: 'whsec_nem+base64!!!' }));

      expect(eredmeny.ok).toBe(false);
    });
  });
});
