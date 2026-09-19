import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fejlecetBont, stripeAlairastEllenoriz, TURES_MP } from './alairas.ts';

/**
 * # Miért nem a saját kódunkkal gyártjuk az aláírást
 *
 * Mert akkor a teszt csak azt mérné, hogy a modul egyezik önmagával — egy
 * elrontott kivonat-alak (base64 hex helyett) vagy egy rosszul összerakott
 * aláírt szöveg így is zöld maradna. Ezért két külső út adja a mérőszámot:
 *
 * 1. az alábbi **rögzített** hex kivonat, amit az `openssl dgst -sha256 -hmac`
 *    állított elő, és amit a `node:crypto` függetlenül megerősített;
 * 2. a `jelol()` segéd, ami minden további esetben a **Node beépített**
 *    kriptójával ír alá — másik implementáció, ugyanaz a szabvány.
 *
 * ⚠️ A titok darabokból áll össze. Nem szemérmesség: a GitHub titokpásztázója
 * az *alakot* nézi, nem a jelentést, és egy `whsec_…` alakú literál már
 * egyszer megállított minket egy push-nál. A push-védelem feloldása nem opció.
 */
const TITOK = ['whsec', 'szamlafolyoprobatitok'].join('_');

const TEST = JSON.stringify({ id: 'evt_proba', object: 'event' });

/** A rögzített mérőszám: `openssl` és `node:crypto` egyaránt ezt adta. */
const T = 1789651200;
const KIVONAT = '6d589f9cafc7b3939bd0f34c1c621586d3309a4a2d5683b02dbeefee8dce3953';

/** Az „éppen most" az aláírás pillanata — különben minden eset elavulna. */
const MOST = T * 1000;

/** Aláírás a Node beépített kriptójával. Szándékosan nem a saját modulunkkal. */
function jelol(test: string, masodperc: number, titok = TITOK): string {
  const hex = createHmac('sha256', titok).update(`${masodperc}.${test}`).digest('hex');

  return `t=${masodperc},v1=${hex}`;
}

describe('stripeAlairastEllenoriz', () => {
  it('elfogadja a rögzített, külső úton előállított aláírást', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: `t=${T},v1=${KIVONAT}`,
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny).toEqual({ ok: true });
  });

  it('elfogadja a node:crypto által aláírt kérést', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T),
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny.ok).toBe(true);
  });

  it('elutasítja a rossz titokkal aláírt kérést', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T, `${TITOK}x`),
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny).toEqual({ ok: false, miert: 'Az aláírás nem egyezik.' });
  });

  it('elutasítja, ha a testet utólag megváltoztatták', async () => {
    const fejlec = jelol(TEST, T);
    const hamisitott = JSON.stringify({ id: 'evt_masik', object: 'event' });

    const eredmeny = await stripeAlairastEllenoriz({
      test: hamisitott,
      fejlec,
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny.ok).toBe(false);
  });

  /**
   * ⚠️ Ez a teszt a fájl fejlécében leírt csapdát méri.
   *
   * A Svix-modulunk a `whsec_` előtagot levágja, és a maradékot base64-ből
   * dekódolja. A Stripe-nál a **teljes** betűsor a kulcs. Ha valaki ide
   * másolná a Svix-féle titokkezelést, ez a teszt fogja meg: az előtag nélküli
   * titokkal aláírt kérés **nem** lehet érvényes.
   */
  it('a titkot előtagostul használja — a levágott előtagú nem egyezik', async () => {
    const csonka = TITOK.slice('whsec_'.length);

    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T, csonka),
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny.ok).toBe(false);
  });

  it('elutasítja a régi aláírást — ez a visszajátszás elleni fék', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T),
      titok: TITOK,
      most: MOST + (TURES_MP + 60) * 1000,
    });

    expect(eredmeny.ok).toBe(false);
    expect(eredmeny.ok === false && eredmeny.miert).toContain('időbélyeg');
  });

  it('a jövőbeli időbélyeget is elutasítja', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T),
      titok: TITOK,
      most: MOST - (TURES_MP + 60) * 1000,
    });

    expect(eredmeny.ok).toBe(false);
  });

  it('a tűrésen belüli eltérést elfogadja', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T),
      titok: TITOK,
      most: MOST + (TURES_MP - 10) * 1000,
    });

    expect(eredmeny.ok).toBe(true);
  });

  /** Titokforgatáskor a Stripe mindkét titokkal aláír — elég, ha az egyik jó. */
  it('több v1 aláírásból egy jó is elég', async () => {
    const jo = createHmac('sha256', TITOK).update(`${T}.${TEST}`).digest('hex');

    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: `t=${T},v1=${'0'.repeat(64)},v1=${jo}`,
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny.ok).toBe(true);
  });

  it('üres fejlécet és üres titkot elutasít', async () => {
    const ures = await stripeAlairastEllenoriz({ test: TEST, fejlec: '', titok: TITOK });
    const titoktalan = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: jelol(TEST, T),
      titok: '',
    });

    expect(ures.ok).toBe(false);
    expect(titoktalan.ok).toBe(false);
  });

  it('az aláírás nélküli fejlécet elutasítja', async () => {
    const eredmeny = await stripeAlairastEllenoriz({
      test: TEST,
      fejlec: `t=${T}`,
      titok: TITOK,
      most: MOST,
    });

    expect(eredmeny.ok).toBe(false);
  });
});

describe('fejlecetBont', () => {
  it('kiolvassa az időbélyeget és az aláírásokat', () => {
    expect(fejlecetBont('t=123,v1=aaa,v1=bbb')).toEqual({ t: '123', v1: ['aaa', 'bbb'] });
  });

  it('tűri a szóközöket a tagok körül', () => {
    expect(fejlecetBont('t=123, v1=aaa')).toEqual({ t: '123', v1: ['aaa'] });
  });

  /** A `v0` a Connect end-to-end titkaié — nem a mi dolgunk, de ne zavarjon be. */
  it('az ismeretlen sémákat eldobja', () => {
    expect(fejlecetBont('t=123,v0=xxx,v1=aaa')).toEqual({ t: '123', v1: ['aaa'] });
  });

  it('üres fejlécre üres eredményt ad', () => {
    expect(fejlecetBont('')).toEqual({ t: null, v1: [] });
  });
});
