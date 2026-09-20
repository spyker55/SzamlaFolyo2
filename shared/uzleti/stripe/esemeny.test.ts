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

/**
 * Ciklusforduló számlája.
 *
 * ⚠️ A `period_start`/`period_end` az **imént lezárult** időszak — ez a Stripe
 * kimondott szabálya, és a modul erre épül. A számlán lévő előfizetés-tételsor
 * a **következő** időszakra szólna; azt itt szándékosan nem is szerepeltetjük,
 * hogy a fixtúra ne sugallja, mintha onnan olvasnánk.
 */
function ujSzamla(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'in_proba',
    object: 'invoice',
    customer: 'cus_proba',
    status: 'draft',
    billing_reason: 'subscription_cycle',
    period_start: MOST - 30 * 24 * 3600,
    period_end: MOST,
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
      // Az 5. szabály: a lemondás mezője **mindig** ott van, itt üresen. Ez az
      // állítás egész objektumra szól, tehát egy csendben megjelenő vagy
      // eltűnő mező is megbuktatja.
      stripe_cancel_at: null,
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

    // A `stripe_cancel_at` viszont **itt is ott van**, üresen: az 5. szabály
    // kivétel az 1. alól, és ezt a kettőt egy helyen érdemes egymás mellett
    // látni — különben a következő olvasó egyiket a másik ellen javítja.
    expect(d.valtozas).toHaveProperty('stripe_cancel_at', null);
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

/**
 * A lemondás mérése.
 *
 * ⚠️ A számlázási portál alapbeállítása szerint a lemondás **a ciklus végére**
 * szól (sandboxban mérve: `subscription_cancel.mode = "at_period_end"`). Ilyenkor
 * a Stripe egyetlen dolgot változtat: kitölti a `cancel_at` mezőt. A `status`
 * marad `active`, a csomag és a ciklus is marad — vagyis ha ezt az egy mezőt
 * nem olvasnánk, a lemondás **nyom nélkül** menne át a rendszeren.
 */
describe('esemenytErtelmez — lemondás a ciklus végére', () => {
  const VEG = MOST + 30 * 24 * 3600;

  it('kiolvassa a lemondás dátumát, és a státusz közben aktív marad', () => {
    const d = esemenytErtelmez(
      esemeny(
        'customer.subscription.updated',
        ujElofizetes({ cancel_at: VEG, cancel_at_period_end: true }),
      ),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas.stripe_cancel_at).toBe(new Date(VEG * 1000).toISOString());
    expect(d.valtozas.stripe_status).toBe('active');
    expect(d.naplo).toContain('lemondva');
  });

  /**
   * A visszavonás ugyanilyen eseményben jön, és **semmi más nem változik**. Ha
   * a modul csak a nem üres értéket írná be, a lemondást vissza lehetne vonni,
   * de a rendszer örökre lemondottnak látná a céget — ezért `null` megy.
   */
  it('a visszavont lemondást üres mezővel írja felül, nem hagyja ki', () => {
    const d = esemenytErtelmez(
      esemeny(
        'customer.subscription.updated',
        ujElofizetes({ cancel_at: null, cancel_at_period_end: false }),
      ),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas).toHaveProperty('stripe_cancel_at', null);
  });

  /**
   * Védekező olvasás: ha a `cancel_at` üres, de a `cancel_at_period_end` igaz,
   * a ciklus vége a lemondás napja. Ugyanaz a minta, mint a ciklusdátumoknál —
   * a hiba itt is csendes volna: a felületen semmi nem jelezné a lemondást.
   */
  it('cancel_at nélkül a ciklus végét veszi, ha a lemondás a ciklus végére szól', () => {
    const d = esemenytErtelmez(
      esemeny('customer.subscription.updated', ujElofizetes({ cancel_at_period_end: true })),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas.stripe_cancel_at).toBe(new Date(VEG * 1000).toISOString());
  });

  /**
   * ⚠️ A checkout-esemény ehhez a mezőhöz **soha nem nyúl**. Ha hozzányúlna, egy
   * későn érkező checkout letörölné a portálon leadott lemondást — pontosan az
   * a hibaosztály, amit a vízjel-javítás egyszer már megtanított.
   */
  it('a checkout-esemény nem írja a lemondás mezőjét', () => {
    const d = esemenytErtelmez(
      esemeny('checkout.session.completed', {
        id: 'cs_proba',
        object: 'checkout.session',
        mode: 'subscription',
        payment_status: 'paid',
        customer: 'cus_proba',
        subscription: 'sub_proba',
        metadata: { company_id: CEG },
      }),
    );

    if (d.fajta !== 'frissit') throw new Error('frissítést vártunk');

    expect(d.valtozas).not.toHaveProperty('stripe_cancel_at');
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
        : tipus.startsWith('invoice')
          ? ujSzamla()
          : ujElofizetes();

      // Nem mind ugyanazt a döntést hozza: az `invoice.created` nem állapotot
      // ír, hanem számlázási alkalmat jelent. Amit ez a teszt őriz: egyik
      // figyelt típus sem esik a `kihagy` ágra.
      expect(esemenytErtelmez(esemeny(tipus, targy)).fajta).not.toBe('kihagy');
    }
  });
});

describe('esemenytErtelmez — ciklus végi túlhasználat', () => {
  it('a ciklusforduló piszkozat számlájából az imént lezárult időszakot olvassa', () => {
    const d = esemenytErtelmez(esemeny('invoice.created', ujSzamla()));

    if (d.fajta !== 'tulhasznalat') throw new Error('túlhasználatot vártunk');

    expect(d.szamlaAzonosito).toBe('in_proba');
    expect(d.ugyfelAzonosito).toBe('cus_proba');
    expect(d.idoszakKezdete).toBe(new Date((MOST - 30 * 24 * 3600) * 1000).toISOString());
    expect(d.idoszakVege).toBe(new Date(MOST * 1000).toISOString());
  });

  /**
   * A négy kapu. Mindegyik mögött egy konkrét rossz kimenetel áll — ezért
   * külön méretnek, nem egyetlen „rossz számla" esetként.
   */
  it('az első számlát nem számlázza meg: nincs mögötte lezárult időszak', () => {
    const d = esemenytErtelmez(
      esemeny('invoice.created', ujSzamla({ billing_reason: 'subscription_create' })),
    );

    expect(d.fajta).toBe('kihagy');
  });

  it('az arányosítás sem ciklusforduló', () => {
    const d = esemenytErtelmez(
      esemeny('invoice.created', ujSzamla({ billing_reason: 'subscription_update' })),
    );

    expect(d.fajta).toBe('kihagy');
  });

  it('a véglegesített számlához már nem adunk tételt', () => {
    const d = esemenytErtelmez(esemeny('invoice.created', ujSzamla({ status: 'open' })));

    expect(d.fajta).toBe('kihagy');
  });

  /**
   * Az első számlán a két dátum megegyezik. A `billing_reason` ezt amúgy is
   * kizárja — ez a második háló ugyanarra a lyukra, mert egy üres ablakra
   * számolt nulla **nem hibázna**, csak csendben rossz lenne.
   */
  it('a nulla hosszú időszakot elutasítja', () => {
    const d = esemenytErtelmez(esemeny('invoice.created', ujSzamla({ period_start: MOST })));

    expect(d.fajta).toBe('kihagy');
  });

  it('a visszafelé álló időszakot is elutasítja', () => {
    const d = esemenytErtelmez(
      esemeny('invoice.created', ujSzamla({ period_start: MOST, period_end: MOST - 3600 })),
    );

    expect(d.fajta).toBe('kihagy');
  });

  it('ügyfél nélkül nincs kit megtalálni', () => {
    const d = esemenytErtelmez(esemeny('invoice.created', ujSzamla({ customer: null })));

    expect(d.fajta).toBe('kihagy');
  });

  /**
   * A számlát nem mi hoztuk létre, tehát nincs benne `metadata.company_id` —
   * a céget az ügyfélazonosítóról találjuk meg. A kifejtett ügyfélobjektumot
   * ugyanúgy el kell fogadni, mint az azonosítót (`expand`).
   */
  it('a kifejtett ügyfélobjektumból is kiolvassa az azonosítót', () => {
    const d = esemenytErtelmez(
      esemeny('invoice.created', ujSzamla({ customer: { id: 'cus_kifejtett' } })),
    );

    if (d.fajta !== 'tulhasznalat') throw new Error('túlhasználatot vártunk');

    expect(d.ugyfelAzonosito).toBe('cus_kifejtett');
  });
});
