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
 *    ideje 16:47:56) és a `customer.subscription.created` (16:47:55) egyszerre
 *    érkezett. A checkout nyert, a vízjelet a saját, **későbbi** idejére
 *    állította, és ezzel az egy másodperccel régebbi előfizetés-eseményt
 *    teljes egészében elutasította: a felhasználó fizetett, és próbaidőn
 *    maradt.
 *
 *    > A 16:47:53 — ami egy korábbi leírásban szerepelt — nem az esemény, hanem
 *    > az **előfizetés objektum** születése; ezt a Stripe azóta is így adja
 *    > vissza (`sub_1UHRQd…`, `created: 1789836473`). Az esemény ideje a
 *    > beírt vízjelből 16:47:55 volt. A verseny egy másodperces volt, nem
 *    > három; a következtetés változatlan. A két esemény órája nem összemérhető, mert **más mezőkről**
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
 * 5. **Egyetlen mező van, aminek a `null`-ja is üzenet: a `stripe_cancel_at`.**
 *    A lemondás ugyanis **nem státusz**. Aki a számlázási portálon a ciklus
 *    végére mond le, annak az előfizetése a fordulónapig `active` marad — a
 *    `status` mezőben semmi nem változik, csak a `cancel_at` töltődik ki. Ha
 *    ezt nem írnánk be, a felhasználó lemondana, a Beállítások pedig
 *    változatlanul a futó csomagot mutatná: azt hinné, nem sikerült, és
 *    lemondana újra.
 *
 *    Ezért ezt a mezőt az előfizetés-események **mindig** beírják, `null`-lal
 *    is — a „mégsem mondom le" ugyanolyan érvényes hír, mint a lemondás. Az
 *    1. szabály nem sérül: a hívó oldalon a kulcs **jelenléte** dönt, nem az
 *    értéke (`stripe_allapot_frissit`, `20260919000300`). A checkout-esemény
 *    ehhez a mezőhöz soha nem nyúl.
 *
 * # A modul második feladata: a ciklus végi túlhasználat
 *
 * A fenti öt szabály arról szól, mit írjunk a cég **állapotába**. Van egy
 * hatodik eseményfajta, ami nem állapotot hoz, hanem **alkalmat**: az
 * `invoice.created`. Ez az a pillanat, amit a Stripe maga jelöl ki arra, hogy
 * „mi kerüljön még erre a számlára" — a frissen készült piszkozathoz még
 * hozzá lehet adni tételt, a véglegesítés utána jön.
 *
 * 6. **A lezárult időszakot a számla mondja meg, nem a saját ciklusállapotunk.**
 *    A Stripe szabálya (mérve, nem feltételezve): *az Invoice mindig az
 *    **előző** időszakra szól, a rajta lévő előfizetés-tételsor viszont a
 *    következőre.* Vagyis egy elsején kelt havi számlán a `period_start` és a
 *    `period_end` pont az imént lezárult hónap.
 *
 *    Ez azért számít, mert a másik út **versenyhelyzet**: a
 *    `customer.subscription.updated` (ami az új ciklust hozza) és az
 *    `invoice.created` sorrendje nem garantált, tehát a saját sorunkból
 *    olvasva hol a régi, hol az új időszakot látnánk. A számla objektum
 *    viszont önmagában hordozza a választ.
 *
 *    ⚠️ **És ez a verseny nem elméleti — test clockon lemértük (2026-09-20),
 *    és a rossz irányba dőlt.** A cég sorába az új ciklus (10-20 → 11-20)
 *    már 13:08:24-kor beíródott, a túlhasználatot pedig 13:08:25-kor
 *    számoltuk — vagyis a saját sorunkból olvasva az **imént kezdődött, üres**
 *    időszakra számláztunk volna nullát, a lezárult hónap helyett. A számlából
 *    olvasva a `period_start` helyesen a 09-20-at adta.
 *
 *    ⚠️ Az **első** számlán a `period_start` és a `period_end` megegyezik (nincs
 *    „előző" időszak). Ezt a `billing_reason` szűrése amúgy is kizárja, de a
 *    dátumegyezésre külön is megállunk — két háló egy lyukra, mert a tévedés
 *    ára itt egy hibás számla.
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
  /**
   * Mikor ér véget a lemondott előfizetés — `null`, ha nincs lemondva.
   *
   * ⚠️ Az **egyetlen** mező, aminek a `null`-ja is beíródik. Lásd az 5.
   * szabályt: a lemondás nem státusz, és a visszavonása sem az.
   */
  stripe_cancel_at?: string | null;
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
  | {
      /**
       * Egy lezárult időszak túlhasználata számlázható — a piszkozat számlára
       * még rá lehet tenni. A **mennyit** nem ez a modul dönti el: ahhoz a
       * felhasznált kreditek kellenek az adatbázisból, és a
       * `shared/uzleti/tulhasznalat.ts` számítása.
       */
      fajta: 'tulhasznalat';
      ugyfelAzonosito: string;
      /** A piszkozat számla, amire a tételt tesszük. */
      szamlaAzonosito: string;
      /** Az imént lezárult időszak — a számla saját `period_*` mezőiből. */
      idoszakKezdete: string;
      idoszakVege: string;
      esemenyIdo: string;
    }
  | { fajta: 'kihagy'; miert: string };

/** Az eseménytípusok, amikre ez a kör feliratkozik. */
export const FIGYELT_ESEMENYEK: readonly string[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // A ciklus végi túlhasználat alkalma. **A Stripe-végponton is fel kell rá
  // iratkozni** — enélkül a kód kész, de soha nem fut le.
  'invoice.created',
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

  if (tipus === 'invoice.created') {
    return szamlabol(objektum, esemenyIdo);
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

  // Az 5. szabály: ez a mező **mindig** megy, `null`-lal is. A lemondás és a
  // visszavonása ugyanabban a `customer.subscription.updated` eseményben
  // érkezik, státuszváltozás nélkül — ha csak a nem üres értéket írnánk be, a
  // lemondást vissza lehetne vonni, de a rendszer örökre lemondottnak látná.
  valtozas.stripe_cancel_at = lemondasIdeje(elofizetes, tetel);

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
        }${
          typeof valtozas.stripe_cancel_at === 'string'
            ? `, lemondva ${valtozas.stripe_cancel_at.slice(0, 10)}-ig`
            : ''
        }`,
  };
}

/**
 * A frissen készült piszkozat számla: számlázható-e rá a lezárult időszak
 * túlhasználata.
 *
 * Négy kapu, és mind a négy mögött egy konkrét rossz kimenetel áll:
 *
 * 1. **Csak `subscription_cycle`.** A `subscription_create` az első számla
 *    (nincs mögötte lezárult időszak), a `subscription_update` egy menet
 *    közbeni arányosítás, a `manual` pedig a mi saját, kézzel készített
 *    számlánk. Egyikhez sem tartozik „most telt le egy hónap".
 *
 * 2. **Csak piszkozathoz.** Tételt hozzáadni csak `draft` állapotú számlához
 *    lehet. Egy későn érkező vagy újrajátszott esemény ilyenkor már
 *    véglegesített számlát találna, és a Stripe-hívás hibára futna — jobb itt
 *    megállni, mint 500-zal visszadobni egy eseményt, amit a Stripe utána
 *    napokig újraküld.
 *
 * 3. **Valódi időszak kell.** Az első számlán a `period_start` és a
 *    `period_end` megegyezik. Ha egy ilyen átcsúszna, üres ablakra
 *    számolnánk — ami nem hibázna, csak csendben nullát adna, és soha nem
 *    derülne ki, hogy a szűrő rossz.
 *
 * 4. **Ügyfél és számlaazonosító nélkül nincs mit tenni.** A céget az
 *    ügyfélazonosítóról találjuk meg — itt nincs `metadata.company_id`, és ez
 *    jó: a számlát nem mi hoztuk létre, tehát nem is írtunk bele semmit.
 */
function szamlabol(szamla: Rekord, esemenyIdo: string): Dontes {
  const ok = szoveg(szamla.billing_reason);

  if (ok !== 'subscription_cycle') {
    return { fajta: 'kihagy', miert: `A számla oka nem ciklusforduló: ${ok ?? 'ismeretlen'}` };
  }

  if (szoveg(szamla.status) !== 'draft') {
    return { fajta: 'kihagy', miert: 'A számla már nem piszkozat.' };
  }

  const ugyfel = azonosito(szamla.customer);
  const szamlaAzonosito = szoveg(szamla.id);

  if (ugyfel === null || szamlaAzonosito === null) {
    return { fajta: 'kihagy', miert: 'A számlából hiányzik az ügyfél vagy az azonosító.' };
  }

  const kezdet = idobol(szamla.period_start);
  const veg = idobol(szamla.period_end);

  if (kezdet === null || veg === null || kezdet >= veg) {
    return { fajta: 'kihagy', miert: 'A számlán nincs értelmezhető lezárult időszak.' };
  }

  return {
    fajta: 'tulhasznalat',
    ugyfelAzonosito: ugyfel,
    szamlaAzonosito,
    idoszakKezdete: kezdet,
    idoszakVege: veg,
    esemenyIdo,
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

/**
 * Mikor ér véget a lemondott előfizetés — vagy `null`, ha nincs lemondva.
 *
 * A Stripe a `cancel_at` mezőt tölti, amikor a lemondás a ciklus végére szól.
 * Nem bízunk rá vakon: ha a `cancel_at_period_end` igaz, de a `cancel_at`
 * üres, a ciklus végét adjuk vissza. Ugyanaz a védekező olvasás, mint a
 * ciklusdátumoknál — és ugyanaz az indok: a hiba csendes volna.
 *
 * A **törölt** előfizetésnél nem vizsgálódunk külön: amit az objektum mond, azt
 * írjuk. A felület a lemondás-jelzést úgyis csak futó előfizetésre mutatja, egy
 * megszűnt előfizetésen pedig a státusz mondja meg az igazat.
 */
function lemondasIdeje(elofizetes: Rekord, tetel: Rekord | null): string | null {
  const veg = idobol(elofizetes.cancel_at);

  if (veg !== null) {
    return veg;
  }

  if (elofizetes.cancel_at_period_end !== true) {
    return null;
  }

  return idobol(tetel?.current_period_end) ?? idobol(elofizetes.current_period_end);
}

/**
 * Beírja a mezőt, ha van értéke. A `null` kimarad — lásd az 1. szabályt.
 *
 * A `stripe_cancel_at` **szándékosan nincs** a kezelhető kulcsok között: annak
 * a `null`-ja is beírandó (5. szabály), tehát nem eshet ugyanabba a kihagyó
 * ágba. Ezt a típus kényszeríti ki, nem a figyelmem.
 */
function toltsd(
  hova: CegValtozas,
  kulcs: Exclude<keyof CegValtozas, 'stripe_cancel_at'>,
  ertek: string | null,
): void {
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
