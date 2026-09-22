import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIMKEK, ERTELMEZO_ELOTAG, kiolvasoForras } from './kiolvasoForras.ts';

const XML = new URL('./xml/', import.meta.url).pathname;

describe('kiolvasoForras', () => {
  it('a saját értelmezőt értelmezőnek mondja, a nevén', () => {
    const jel = kiolvasoForras('xml/ubl');

    expect(jel.forras).toBe('ertelmezo');
    expect(jel.rovid).toBe('UBL e-számla');
    expect(jel.mondat).toContain('nem hagyta el a szervert');
  });

  it('a modellt modellnek mondja', () => {
    const jel = kiolvasoForras('google/gemini-3.8-flash');

    expect(jel.forras).toBe('modell');
    expect(jel.mondat).toContain('olvasat');
  });

  /**
   * ⚠️ Ez a biztonságos irány, és a modul egyik fő állítása: egy ismeretlen
   * `xml/…` név **nem** eshet a modell ágra. Ha esne, a felület rosszabb
   * minőségűnek mutatná a bizonylatot, mint amilyen, és azt is állítaná róla,
   * hogy a tartalma elhagyta a szervert — pedig nem.
   */
  it('a térképből hiányzó értelmezőt is értelmezőnek mondja', () => {
    const jel = kiolvasoForras('xml/valami-uj');

    expect(jel.forras).toBe('ertelmezo');
    expect(jel.rovid).toBe('xml/valami-uj');
  });

  it('a hiányzó kiolvasás nem modell, hanem „nem tudjuk”', () => {
    for (const ures of [null, undefined, '', '   ']) {
      expect(kiolvasoForras(ures).forras, JSON.stringify(ures)).toBe('ismeretlen');
    }
  });
});

/**
 * Elcsúszás-őr: a `CIMKEK` térkép és a ténylegesen bejegyzett értelmezők.
 *
 * Az igazság forrása a kód, nem ez a fájl: a `xmlKiolvaso.ts` `ERTELMEZOK`
 * tömbje mondja meg, mit ismerünk fel, és minden értelmező a saját moduljában
 * mondja meg, milyen néven kerül a `document_extractions.model` oszlopba.
 * Ezt a kettőt olvassuk ki — így egy ötödik értelmező **itt** akad meg, nem
 * egy ügyfélnél, egy címke nélküli nyers `xml/…` betűsor alakjában.
 */
describe('a CIMKEK térkép együtt mozog az értelmezőkkel', () => {
  /** Az értelmezők azonosítói a tömbből: `[cii, ubl, nav, apeh]`. */
  function azonositok(): string[] {
    const forras = readFileSync(XML + 'xmlKiolvaso.ts', 'utf8');
    const talalat = /const ERTELMEZOK: readonly Ertelmezo\[\] = \[([^\]]+)\]/.exec(forras);

    expect(
      talalat,
      'Nem találtam az `ERTELMEZOK` tömböt a xmlKiolvaso.ts-ben. Ha a modul alakja ' +
        'változott, ezt a tesztet is igazítani kell.',
    ).not.toBeNull();

    return (talalat?.[1] ?? '')
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r !== '');
  }

  /** Az értelmező saját, kiírt neve — nem az azonosítóból tippelve. */
  function nev(azonosito: string): string | null {
    const forras = readFileSync(`${XML}${azonosito}.ts`, 'utf8');
    return /\bnev: '([^']+)'/.exec(forras)?.[1] ?? null;
  }

  // Anti-vakság: nulla találatra nulla állítás bukna meg.
  it('egyáltalán talál értelmezőket', () => {
    expect(azonositok().length).toBeGreaterThan(2);
  });

  it('mindegyik neve az xml/ előtaggal kezdődik', () => {
    for (const azonosito of azonositok()) {
      expect(
        nev(azonosito),
        `A(z) \`${azonosito}\` értelmező neve nem a(z) "${ERTELMEZO_ELOTAG}" előtaggal ` +
          'kezdődik. A besorolás kizárólag ezen az előtagon áll: enélkül a felület ' +
          'modellnek mutatná a saját értelmezőnk munkáját, és azt állítaná a bizonylatról, ' +
          'hogy a tartalma elhagyta a szervert.',
      ).toMatch(new RegExp('^' + ERTELMEZO_ELOTAG));
    }
  });

  it('mindegyikhez van címke', () => {
    for (const azonosito of azonositok()) {
      const n = nev(azonosito) ?? '';

      expect(
        CIMKEK[n],
        `A(z) \`${n}\` értelmezőnek nincs címkéje a kiolvasoForras.ts CIMKEK térképében. ` +
          'Új értelmező került a rendszerbe: vedd fel, különben a felületen a nyers ' +
          'betűsor jelenik meg a formátum neve helyett.',
      ).toBeDefined();
    }
  });

  it('nincs a térképben olyan címke, amihez nem tartozik értelmező', () => {
    const nevek = azonositok().map((a) => nev(a));

    for (const kulcs of Object.keys(CIMKEK)) {
      expect(
        nevek,
        `A(z) \`${kulcs}\` címke a CIMKEK térképben áll, de ilyen nevű értelmező nincs ` +
          'bejegyezve. Elavult sor — vagy egy értelmező kikerült a rendszerből.',
      ).toContain(kulcs);
    }
  });
});
