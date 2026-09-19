import { describe, expect, it } from 'vitest';
import { esemenytErtelmez, FIGYELT_ESEMENYEK } from './esemeny.ts';

/**
 * A fixtúrák a Stripe valódi alakját követik, két ponton szándékosan eltérve
 * egymástól: az `ujTetel()` az **új** API-alakot adja (a ciklus az előfizetés
 * tételén), a `regiElofizetes()` a **régit** (a ciklus az előfizetésen). Ez a
 * modul legkönnyebben elromló pontja, ezért mindkettő külön méretik.
 */

const CEG = '7ee1579c-d684-4851-9dbd-2c768d0adc01';
const MOST = 1789651200;

function esemeny(tipus: string, objektum: unknown, created = MOST): unknown {
  return { id: 'evt_proba', object: 'event', type: tipus, created, data: { object: objektum } };
}

/** Előfizetés az ÚJ alakban: a ciklus a tételen áll. */
function ujElofizetes(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sub_proba',
    object: 'subscription',
    customer: 'cus_proba',
    status: 'active',
    metadata: { company_id: CEG },
    items: {
      object: 'list',
      data: [
        {
          id: 'si_proba',
          current_period_start: MOST,
          current_period_end: MOST + 30 * 24 * 3600,
          price: { id: 'price_proba', lookup_key: 'szamlafolyo_start_havi' },
        },
      ],
    },
    ...extra,
  };
}

describe('esemenytErtelmez — előfizetés', () => {
  it('kiolvassa a csomagot, a státuszt és a ciklust az új alakból', () => {
    const d = esemenytErtelmez(esemeny('customer.subscription.created', ujElofizetes()));

    expect(d.fajta).toBe('frissit');

    if (d.fajta !== 'frissit') return;

    expect(d.cegAzonosito).toBe(CEG);
    expect(d.ugyfelAzonosito).toBe('cus_proba');
    expect(d.valtozas).toEqual({
      stripe_subscription_id: 'sub_proba',
      stripe_status: 'active',
      stripe_customer_id: 'cus_proba',
      stripe_price_id: 'price_proba',
      stripe_lookup_key: 'szamlafolyo_start_havi',
      current_period_start: new Date(MOST * 1000).toISOString(),
      current_period_end: new Date((MOST + 30 * 24 * 3600) * 1000).toISOString(),
    });
  });

  /**
   * ⚠️ A régi API-alak: a ciklus az **előfizetésen** áll, a tételen nincs. Ha a
   * modul csak a tételt nézné, a ciklus csendben `null` maradna, és a keret a
   * cég születésétől számolna — tehát egy fizető ügyfél kaphatna dupla keretet.
   */
  it('a ciklust az előfizetésről is kiolvassa, ha a tételen nincs', () => {
    const elofizetes = ujElofizetes({
      current_period_start: MOST,
      current_period_end: MOST + 30 * 24 * 3600,
      items: {
        data: [{ id: 'si_proba', price: { id: 'price_proba', lookup_key: 'szamlafolyo_pro_havi' } }],
      },
    });

    const d = esemenytErtelmez(esemeny('customer.subscription.updated', elofizetes));

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas.current_period_end).toBe(
      new Date((MOST + 30 * 24 * 3600) * 1000).toISOString(),
    );
    expect(d.valtozas.stripe_lookup_key).toBe('szamlafolyo_pro_havi');
  });

  it('a törölt előfizetés lemondott státuszt kap', () => {
    const d = esemenytErtelmez(
      esemeny('customer.subscription.deleted', ujElofizetes({ status: 'canceled' })),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas.stripe_status).toBe('canceled');
    expect(d.naplo).toContain('megszűnt');
  });

  /** Ha a státusz mező hiányozna, a törlés tényéből írjuk — nem maradhat üres. */
  it('a törlést státusz nélkül is lemondásnak veszi', () => {
    const nincsStatusz = ujElofizetes();
    delete nincsStatusz.status;

    const d = esemenytErtelmez(esemeny('customer.subscription.deleted', nincsStatusz));

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas.stripe_status).toBe('canceled');
  });

  /**
   * Az 1. szabály mérése: tétel nélküli eseményből **nem** kerül ki sem ár, sem
   * ciklus — tehát a hívó nem tud jó értéket nullára írni vele.
   */
  it('tétel nélkül sem árat, sem ciklust nem ír', () => {
    const d = esemenytErtelmez(
      esemeny('customer.subscription.updated', ujElofizetes({ items: { data: [] } })),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas).not.toHaveProperty('stripe_price_id');
    expect(d.valtozas).not.toHaveProperty('stripe_lookup_key');
    expect(d.valtozas).not.toHaveProperty('current_period_end');
    expect(d.valtozas.stripe_status).toBe('active');
  });

  /** Kifejtett (`expand`-olt) ügyfélnél az azonosító az objektumban ül. */
  it('a kifejtett ügyfélobjektumból is kiveszi az azonosítót', () => {
    const d = esemenytErtelmez(
      esemeny(
        'customer.subscription.updated',
        ujElofizetes({ customer: { id: 'cus_kifejtett', object: 'customer' } }),
      ),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.ugyfelAzonosito).toBe('cus_kifejtett');
  });

  it('metadata nélkül nincs cégazonosító, de az ügyfélé megvan', () => {
    const nincsMeta = ujElofizetes();
    delete nincsMeta.metadata;

    const d = esemenytErtelmez(esemeny('customer.subscription.updated', nincsMeta));

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.cegAzonosito).toBeNull();
    expect(d.ugyfelAzonosito).toBe('cus_proba');
  });
});

describe('esemenytErtelmez — checkout', () => {
  const munkamenet = {
    id: 'cs_proba',
    object: 'checkout.session',
    mode: 'subscription',
    payment_status: 'paid',
    customer: 'cus_proba',
    subscription: 'sub_proba',
    metadata: { company_id: CEG },
  };

  /**
   * A checkout **keveset** ír, és ez a lényege: ha a csomagot is írná, egy
   * későn érkező checkout-esemény felülcsapná az előfizetés-eseményből már
   * beírt, frissebb csomagot.
   */
  it('csak az ügyfelet és az előfizetést köti a céghez', () => {
    const d = esemenytErtelmez(esemeny('checkout.session.completed', munkamenet));

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.cegAzonosito).toBe(CEG);
    expect(d.valtozas).toEqual({
      stripe_customer_id: 'cus_proba',
      stripe_subscription_id: 'sub_proba',
    });
  });

  it('a ki nem fizetett checkoutot kihagyja', () => {
    const d = esemenytErtelmez(
      esemeny('checkout.session.completed', { ...munkamenet, payment_status: 'unpaid' }),
    );

    expect(d.fajta).toBe('kihagy');
  });

  it('a nem előfizetéses checkoutot kihagyja', () => {
    const d = esemenytErtelmez(
      esemeny('checkout.session.completed', { ...munkamenet, mode: 'payment' }),
    );

    expect(d.fajta).toBe('kihagy');
  });

  it('előfizetés nélküli checkoutot kihagy', () => {
    const csonka = { ...munkamenet, subscription: null };

    expect(esemenytErtelmez(esemeny('checkout.session.completed', csonka)).fajta).toBe('kihagy');
  });
});

describe('esemenytErtelmez — amit nem értünk', () => {
  /** Nem hiba: a végpont többet küldhet, mint amennyire feliratkoztunk. */
  it('az ismeretlen eseménytípust kihagyja', () => {
    const d = esemenytErtelmez(esemeny('invoice.payment_succeeded', { id: 'in_proba' }));

    expect(d).toEqual({ fajta: 'kihagy', miert: 'Nem figyelt eseménytípus: invoice.payment_succeeded' });
  });

  it('a nem objektum bemenetet kihagyja', () => {
    expect(esemenytErtelmez(null).fajta).toBe('kihagy');
    expect(esemenytErtelmez('szöveg').fajta).toBe('kihagy');
    expect(esemenytErtelmez(42).fajta).toBe('kihagy');
  });

  it('az idő nélküli eseményt kihagyja — a vízjel enélkül nem működne', () => {
    const nincsIdo = { id: 'evt', type: 'customer.subscription.created', data: { object: {} } };

    expect(esemenytErtelmez(nincsIdo).fajta).toBe('kihagy');
  });

  it('az esemény idejét ISO alakban adja vissza', () => {
    const d = esemenytErtelmez(esemeny('customer.subscription.created', ujElofizetes()));

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.esemenyIdo).toBe(new Date(MOST * 1000).toISOString());
  });
});

describe('FIGYELT_ESEMENYEK', () => {
  /**
   * A lista a Stripe dashboardon beállítandó feliratkozással **együtt mozog**.
   * Ha ide kerül egy típus, de a végpont nem küldi, az néma hiba: a kód
   * felkészült valamire, ami sosem jön. A teszt legalább azt rögzíti, hogy
   * mind a négyet valóban értjük is.
   */
  it('minden figyelt eseményt fel is dolgozunk', () => {
    for (const tipus of FIGYELT_ESEMENYEK) {
      const targy = tipus.startsWith('checkout')
        ? {
            mode: 'subscription',
            payment_status: 'paid',
            customer: 'cus_proba',
            subscription: 'sub_proba',
          }
        : ujElofizetes();

      expect(esemenytErtelmez(esemeny(tipus, targy)).fajta).toBe('frissit');
    }
  });
});
