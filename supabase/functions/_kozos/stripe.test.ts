import { afterEach, describe, expect, it, vi } from 'vitest';
import { STRIPE_API, stripe, stripeKeres } from './stripe.ts';

/**
 * A közös Stripe-hívó mérése.
 *
 * Négy telepített függvény hívja, és mind a négy **pénzt mozgató** úton — egy
 * csendes elromlás itt egy elmaradt lemondás vagy egy kiszámlázatlan
 * túlhasználat. Ezért van saját tesztje, pedig „csak egy `fetch`".
 *
 * A két réteget külön mérjük, mert a különbségük a lényeg: a `stripe()` dob,
 * a `stripeKeres()` nem. A `fiok-torles` az utóbbira épül — ott egy 404 azt
 * jelenti, hogy nincs mit lemondani, nem azt, hogy baj van.
 */

const KULCS = 'sk_test_' + 'peldakulcs';

/** A `fetch` lecserélése, a rögzített hívásokkal együtt. */
function hivasokat_rogzit(valasz: () => Response): { init: () => RequestInit; cim: () => string } {
  const hivasok: { cim: string; init: RequestInit }[] = [];

  vi.stubGlobal('fetch', (cim: string, init: RequestInit) => {
    hivasok.push({ cim, init });
    return Promise.resolve(valasz());
  });

  return {
    init: () => hivasok[hivasok.length - 1]!.init,
    cim: () => hivasok[hivasok.length - 1]!.cim,
  };
}

const jo = () => new Response(JSON.stringify({ id: 'sub_123' }), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('stripe() — a dobó réteg', () => {
  it('mezők nélkül GET, és test sem megy ki', async () => {
    const rogzitett = hivasokat_rogzit(jo);

    await stripe(KULCS, '/subscriptions/sub_123');

    expect(rogzitett.cim()).toBe(`${STRIPE_API}/subscriptions/sub_123`);
    expect(rogzitett.init().method).toBe('GET');
    // Nem `undefined` értékkel szerepel — egyáltalán nincs benne.
    expect('body' in rogzitett.init()).toBe(false);
    expect(rogzitett.init().headers).not.toHaveProperty('Content-Type');
  });

  it('mezőkkel POST, űrlapkódolva', async () => {
    const rogzitett = hivasokat_rogzit(jo);

    await stripe(KULCS, '/invoiceitems', new URLSearchParams({ customer: 'cus_1', quantity: '12' }));

    expect(rogzitett.init().method).toBe('POST');
    expect(rogzitett.init().body).toBe('customer=cus_1&quantity=12');
    expect(rogzitett.init().headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Authorization: `Bearer ${KULCS}`,
    });
  });

  it('az extra fejléc kimegy — ezen áll a túlhasználat idempotenciája', async () => {
    const rogzitett = hivasokat_rogzit(jo);

    await stripe(KULCS, '/invoiceitems', new URLSearchParams(), {
      'Idempotency-Key': 'tulhasznalat-ceg-2026-09-20',
    });

    expect(rogzitett.init().headers).toMatchObject({
      'Idempotency-Key': 'tulhasznalat-ceg-2026-09-20',
    });
  });

  it('a JSON visszajön értelmezve', async () => {
    hivasokat_rogzit(jo);

    await expect(stripe<{ id: string }>(KULCS, '/x')).resolves.toEqual({ id: 'sub_123' });
  });

  it('hibás státuszra dob, a státusszal együtt', async () => {
    hivasokat_rogzit(() => new Response('{"error":{"message":"No such customer"}}', { status: 404 }));

    await expect(stripe(KULCS, '/customers/hiányzik')).rejects.toThrow(/Stripe 404.*No such customer/s);
  });

  it('a hosszú hibaüzenet 500 karakterre vágódik', async () => {
    hivasokat_rogzit(() => new Response('x'.repeat(2000), { status: 500 }));

    const hiba = await stripe(KULCS, '/x').catch((h: Error) => h);

    expect((hiba as Error).message).toHaveLength('Stripe 500: '.length + 500);
  });
});

describe('stripeKeres() — a nem dobó réteg', () => {
  it('404-re NEM dob, hanem visszaadja a választ', async () => {
    hivasokat_rogzit(() => new Response('nincs ilyen', { status: 404 }));

    const felelet = await stripeKeres(KULCS, '/subscriptions/sub_nincs');

    expect(felelet.status).toBe(404);
    expect(felelet.ok).toBe(false);
  });

  it('a DELETE módot kimondva lehet kérni', async () => {
    const rogzitett = hivasokat_rogzit(jo);

    await stripeKeres(KULCS, '/subscriptions/sub_123', { mod: 'DELETE' });

    expect(rogzitett.init().method).toBe('DELETE');
    expect('body' in rogzitett.init()).toBe(false);
  });
});
