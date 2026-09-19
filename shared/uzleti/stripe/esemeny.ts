/**
 * Mit írjunk a cég sorába egy Stripe-eseményből.
 *
 * # Miért tiszta modul, és miért itt
 *
 * Ez a rendszer egyetlen pontja, ahol egy **külső fél** állítása a fizetési
 * állapotunkká válik. A döntést ezért ugyanúgy kiemeljük a hálózati kódból,
 * ahogy a keretszámolást is: a webhook-függvény csak fogad, ellenőriz és ír, a
 * jelentést ez a modul adja — tehát tesztelhető anélkül, hogy bármit
 * telepítenénk, vagy bárkit megterhelnénk egy valódi bankkártyával.
 *
 * # Négy szabály, amit ez a modul kimond
 *
 * 1. **Csak azt írjuk, amit az esemény ténylegesen hordoz — `null`-t soha egy
 *    ismert érték fölé.** A Stripe **nem garantál sorrendet**: a
 *    `checkout.session.completed` megérkezhet a `customer.subscription.created`
 *    *után* is. Ha a checkout-esemény teljes sort írna, kitörölné az
 *    előfizetés-eseményből már beírt csomagot és ciklust. Ezért a `CegValtozas`
 *    minden mezője elhagyható, és a hiányzó adat **kimarad**, nem nullázódik.
 *
 * 2. **Az esemény ideje vízjel — de csak az előfizetés állapotára.** A hívó
 *    egy állapot-eseményt csak akkor ír be, ha nem régebbi a legutóbb
 *    feldolgozottnál (`stripe_event_at`). Enélkül egy késve érkező, régi
 *    `subscription.updated` visszaléptetné az állapotot. Ez egyben az
 *    **idempotencia**: az újraküldött esemény ugyanazt írja újra, kárt nem tesz.
 *
 *    ⚠️ A vízjel **eseményfajtánként** értendő, és ezt élesben tanultuk meg. Az
 *    első valódi fizetésnél a `checkout.session.completed` (Stripe szerinti
 *    ideje 16:47:56) és a `customer.subscription.created` (16:47:53) egyszerre
 *    érkezett. A checkout nyert, a vízjelet a saját, **későbbi** idejére
 *    állította, és ezzel a három másodperccel régebbi előfizetés-eseményt
 *    teljes egészében elutasította: a felhasználó fizetett, és próbaidőn
 *    maradt. A két esemény órája nem összemérhető, mert **más mezőkről**
 *    beszélnek. A szabály ezért: amelyik esemény nem hoz `stripe_status`-t, az
 *    nem mozdítja a vízjelet, és nem is akad fenn rajta
 *    (`20260919000200_stripe_vizjel_javitas.sql`).
 *
 * 3. **Ismeretlen eseménytípus nem hiba.** A Stripe végpontja több eseményt is
 *    küldhet, mint amennyire feliratkoztunk. Amit nem értünk, azt kihagyjuk —
 *    és **200-zal** válaszolunk rá, különben a Stripe napokig újrapróbálja.
 *
 * 4. **A cég azonosítóját nem a kérésből hisszük el.** A `metadata.company_id`
 *    onnan jön, ahová mi magunk írtuk (a checkout indításakor), de ettől még a
 *    hívó állítása. A hívó oldalon ez **ellenőrizendő** az ügyfélazonosító
 *    ellen — lásd a `stripe-webhook` függvényben.
 *
 * ⚠️ **A ciklus dátumai elköltöztek.** A `current_period_start` / `_end` a
 * 2025 tavaszi API-verziótól kezdve nem az előfizetésen, hanem az **előfizetés
 * tételén** (`items.data[]`) áll. Régebbi verziókon viszont még az előfizetésen.
 * Ezért mindkét helyen megnézzük — ez a modul legkönnyebben elromló része, és
 * a hiba csendes: a ciklus `null` marad, a keret pedig a cég születésétől
 * számolna.
 */

/** Amit egy eseményből a `companies` sorba írhatunk. Minden mező elhagyható. */
export type CegValtozas = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_status?: string;
  stripe_price_id?: string;
  stripe_lookup_key?: string;
  current_period_start?: string;
  current_period_end?: string;
};

export type Dontes =
  | {
      fajta: 'frissit';
      /** A `metadata`-ból, ha volt. A hívó ezt ellenőrzi az ügyfélazonosító ellen. */
      cegAzonosito: string | null;
      /** A Stripe ügyfélazonosítója — ezen keresztül is megtalálható a cég. */
      ugyfelAzonosito: string | null;
      valtozas: CegValtozas;
      /** Az esemény ideje ISO alakban. Ez a vízjel. */
      esemenyIdo: string;
      /** Egy emberi mondat a naplóba. */
      naplo: string;
    }
  | { fajta: 'kihagy'; miert: string };

/** Az eseménytípusok, amikre ez a kör feliratkozik. */
export const FIGYELT_ESEMENYEK: readonly string[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

type Rekord = Record<string, unknown>;

export function esemenytErtelmez(esemeny: unknown): Dontes {
  const e = rekord(esemeny);

  if (e === null) {
    return { fajta: 'kihagy', miert: 'Az esemény nem objektum.' };
  }

  const tipus = szoveg(e.type);
  const objektum = rekord(rekord(e.data)?.object);
  const esemenyIdo = idobol(e.created);

  if (tipus === null || objektum === null) {
    return { fajta: 'kihagy', miert: 'Hiányzó eseménytípus vagy tárgy.' };
  }

  if (esemenyIdo === null) {
    return { fajta: 'kihagy', miert: 'Az esemény ideje hiányzik vagy értelmezhetetlen.' };
  }

  if (tipus === 'checkout.session.completed') {
    return checkoutbol(objektum, esemenyIdo);
  }

  if (
    tipus === 'customer.subscription.created' ||
    tipus === 'customer.subscription.updated' ||
    tipus === 'customer.subscription.deleted'
  ) {
    return elofizetesbol(objektum, esemenyIdo, tipus === 'customer.subscription.deleted');
  }

  return { fajta: 'kihagy', miert: `Nem figyelt eseménytípus: ${tipus}` };
}

/**
 * A checkout lezárulta.
 *
 * Szándékosan **keveset** ír: az ügyfelet és az előfizetést köti a céghez, a
 * csomagot és a ciklust az előfizetés-eseményre hagyja. Nem azért, mert innen
 * nem lenne kiolvasható, hanem mert az 1. szabály szerint egy esemény csak azt
 * írhatja, amit biztosan tud — a checkout tárgya a `line_items` kifejtése
 * nélkül nem hordozza az árat.
 *
 * A **ki nem fizetett** munkamenetet eldobjuk: a `completed` állapot azt
 * jelenti, hogy a felhasználó végigment az űrlapon, nem azt, hogy a pénz
 * megérkezett (késleltetett fizetési módoknál a kettő elválik).
 */
function checkoutbol(munkamenet: Rekord, esemenyIdo: string): Dontes {
  if (szoveg(munkamenet.mode) !== 'subscription') {
    return { fajta: 'kihagy', miert: 'A checkout nem előfizetés volt.' };
  }

  const fizetes = szoveg(munkamenet.payment_status);

  if (fizetes !== 'paid' && fizetes !== 'no_payment_required') {
    return { fajta: 'kihagy', miert: `A checkout fizetési állapota: ${fizetes ?? 'ismeretlen'}` };
  }

  const ugyfel = azonosito(munkamenet.customer);
  const elofizetes = azonosito(munkamenet.subscription);
  const ceg = szoveg(rekord(munkamenet.metadata)?.company_id);

  if (ugyfel === null || elofizetes === null) {
    return { fajta: 'kihagy', miert: 'A checkoutból hiányzik az ügyfél vagy az előfizetés.' };
  }

  return {
    fajta: 'frissit',
    cegAzonosito: ceg,
    ugyfelAzonosito: ugyfel,
    valtozas: { stripe_customer_id: ugyfel, stripe_subscription_id: elofizetes },
    esemenyIdo,
    naplo: 'A checkout lezárult, az előfizetés a céghez kötve.',
  };
}

/** Az előfizetés állapota: ez hordozza a csomagot, a státuszt és a ciklust. */
function elofizetesbol(elofizetes: Rekord, esemenyIdo: string, torolt: boolean): Dontes {
  const ugyfel = azonosito(elofizetes.customer);
  const ceg = szoveg(rekord(elofizetes.metadata)?.company_id);
  const azonositoja = szoveg(elofizetes.id);

  if (azonositoja === null) {
    return { fajta: 'kihagy', miert: 'Az előfizetésnek nincs azonosítója.' };
  }

  // A törölt előfizetés státusza a Stripe-nál `canceled`, de nem bízunk rá:
  // ha a mező hiányozna, a törlés tényéből írjuk. A `keret.ts` ezt már nem
  // tekinti futónak, tehát a cég `lejart` állapotba kerül.
  const statusz = szoveg(elofizetes.status) ?? (torolt ? 'canceled' : null);

  if (statusz === null) {
    return { fajta: 'kihagy', miert: 'Az előfizetésnek nincs státusza.' };
  }

  const tetel = elsoTetel(elofizetes);
  const ar = rekord(tetel?.price);

  const valtozas: CegValtozas = {
    stripe_subscription_id: azonositoja,
    stripe_status: statusz,
  };

  // Az 1. szabály: ami nincs az eseményben, az nem íródik. Egy hiányos vagy
  // szokatlan alakú esemény így legrosszabb esetben **nem frissít** — de nem
  // is töröl ki egy jó csomagot vagy egy élő ciklust a cég sorából.
  toltsd(valtozas, 'stripe_customer_id', ugyfel);
  toltsd(valtozas, 'stripe_price_id', szoveg(ar?.id));
  toltsd(valtozas, 'stripe_lookup_key', szoveg(ar?.lookup_key));

  // ⚠️ Lásd a fájl fejlécét: a ciklus előbb a tételen, aztán az előfizetésen.
  toltsd(
    valtozas,
    'current_period_start',
    idobol(tetel?.current_period_start) ?? idobol(elofizetes.current_period_start),
  );
  toltsd(
    valtozas,
    'current_period_end',
    idobol(tetel?.current_period_end) ?? idobol(elofizetes.current_period_end),
  );

  return {
    fajta: 'frissit',
    cegAzonosito: ceg,
    ugyfelAzonosito: ugyfel,
    valtozas,
    esemenyIdo,
    naplo: torolt
      ? 'Az előfizetés megszűnt.'
      : `Az előfizetés állapota: ${statusz}${
          valtozas.stripe_lookup_key !== undefined ? ` (${valtozas.stripe_lookup_key})` : ''
        }`,
  };
}

/**
 * Az előfizetés első tétele.
 *
 * Mi mindig **egy** tétellel hozunk létre előfizetést, tehát az első a miénk.
 * Ha valaha több lenne (kézi dashboard-szerkesztés, kiegészítő termék), akkor
 * is a fő csomag az első — de ez a feltevés itt legyen kimondva, ne rejtve.
 */
function elsoTetel(elofizetes: Rekord): Rekord | null {
  const tetelek = rekord(elofizetes.items)?.data;

  if (!Array.isArray(tetelek) || tetelek.length === 0) {
    return null;
  }

  return rekord(tetelek[0]);
}

/** Beírja a mezőt, ha van értéke. A `null` kimarad — lásd az 1. szabályt. */
function toltsd(hova: CegValtozas, kulcs: keyof CegValtozas, ertek: string | null): void {
  if (ertek !== null) {
    hova[kulcs] = ertek;
  }
}

/** Objektum vagy `null` — külső adatot értelmezünk, nem a sajátunkat. */
function rekord(ertek: unknown): Rekord | null {
  return typeof ertek === 'object' && ertek !== null && !Array.isArray(ertek)
    ? (ertek as Rekord)
    : null;
}

/** Nem üres sztring, vagy `null`. */
function szoveg(ertek: unknown): string | null {
  return typeof ertek === 'string' && ertek !== '' ? ertek : null;
}

/**
 * Stripe-hivatkozás azonosítója.
 *
 * A hivatkozott objektum **vagy azonosító, vagy kifejtett objektum** — attól
 * függ, kértünk-e `expand`-ot. Mindkettőt elfogadjuk, különben egy kifejtett
 * válasznál csendben elveszne az azonosító.
 */
function azonosito(ertek: unknown): string | null {
  return szoveg(ertek) ?? szoveg(rekord(ertek)?.id);
}

/** Unix másodperc → ISO. A `null` és a nem szám `null` marad. */
function idobol(ertek: unknown): string | null {
  if (typeof ertek !== 'number' || !Number.isFinite(ertek)) {
    return null;
  }

  const d = new Date(ertek * 1000);

  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
