import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { szamlafolyo } from '../../../config/szamlafolyo.ts';
import { csomagKulcsbol } from '../../../shared/uzleti/keret.ts';
import { tulhasznalatSzamol } from '../../../shared/uzleti/tulhasznalat.ts';
import { stripeAlairastEllenoriz } from '../../../shared/uzleti/stripe/alairas.ts';
import { esemenytErtelmez, type Dontes } from '../../../shared/uzleti/stripe/esemeny.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

/**
 * A Stripe webhookja: innen — és **csak innen** — íródik a cég számlázási
 * állapota.
 *
 * # A harmadik végpont, ahol a `verify_jwt` KI van kapcsolva
 *
 * Kényszerből, mint az `email-bekuldes`-nél: a Stripe nem tud Supabase-JWT-t
 * küldeni. A hitelesítés ezért teljes egészében az **aláírás-ellenőrzés**
 * (`shared/uzleti/stripe/alairas.ts`) — ami máshol második réteg, itt az első
 * és az utolsó. Aláírás nélkül ez a végpont azt jelentené, hogy bárki Pro
 * csomagra teheti magát egy HTTP-kéréssel.
 *
 * # Miért 200 arra is, amit nem dolgozunk fel
 *
 * Mert a nem 2xx válaszra a Stripe **napokig újrapróbálkozik**, és a végpont
 * több eseményt is küldhet, mint amennyire feliratkoztunk. Egy ismeretlen
 * típusra adott 400 nem védene semmit, cserébe napokig tartó, mérgező zajt
 * csinálna a naplóban — és elfedné a valódi hibákat.
 *
 * **Kivétel az aláírás**: arra 401 jár. Az nem „nem érdekel", hanem „nem te
 * vagy". Ott az újrapróbálkozás a helyes viselkedés.
 *
 * # Ami itt szándékosan nincs
 *
 * - **Nincs CORS-fejléc.** Ezt a végpontot nem böngésző hívja. Egy
 *   `Access-Control-Allow-Origin: *` itt csak azt sugallná, hogy szabad.
 * - **Nincs döntés.** Mit jelent egy esemény, azt a tiszta
 *   `shared/uzleti/stripe/esemeny.ts` mondja meg, tesztek alatt; ez a fájl
 *   fogad, ellenőriz és ír.
 * - **Nincs sorrend-feltételezés.** A vízjelet az SQL tartja
 *   (`stripe_allapot_frissit`), mert a Stripe nem garantál eseménysorrendet.
 *
 * # A második ág: a ciklus végi túlhasználat
 *
 * Ez a végpont 2026-09-20 óta **kétféle** eseményt dolgoz fel. Az
 * `invoice.created` nem a cég állapotát írja, hanem egy **alkalmat** hoz: a
 * frissen készült piszkozat számlához még hozzá lehet adni tételt.
 *
 * Miért itt, és miért nem egy napi cronban: egy „függő" (`pending`) tétel a
 * **következő** számlára kerülne, vagyis a szeptemberi túlhasználat a
 * novemberi számlán jelenne meg. A piszkozathoz közvetlenül hozzáadva ott
 * van, ahol lennie kell — a most készülő számlán.
 *
 * ⚠️ **A megszűnt előfizetés záró időszaka így nem számlázódik ki**, mert
 * lemondás után nincs több ciklusforduló, tehát nincs `invoice.created` sem.
 * Ez tudatos v1-es határ: a tévedés iránya a felhasználó javára dől, és a
 * kimaradt összeg a `overage_charges` táblából utólag látszik. Kimondva a
 * `.env.example`-ben is.
 */

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method !== 'POST') {
    return valasz({ hiba: 'Csak POST.' }, 405);
  }

  const titok = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  if (titok === '') {
    console.error('Nincs STRIPE_WEBHOOK_SECRET — a végpont nem tud hitelesíteni.');

    // 503, nem 200: ez a mi hibánk, és az újrapróbálkozás **helyes** — a titok
    // beírása után a Stripe magától bepótolja az elmaradt eseményeket.
    return valasz({ hiba: 'A végpont nincs beállítva.' }, 503);
  }

  // ⚠️ A **nyers** test kell, nem az értelmezett JSON. Egy `JSON.parse` →
  // `stringify` kör megváltoztatja a bájtokat, és attól az aláírás soha nem
  // egyezne. Ezért olvassuk előbb szövegként, és csak az ellenőrzés után
  // értelmezzük.
  const test = await keres.text();

  const ellenorzes = await stripeAlairastEllenoriz({
    test,
    fejlec: keres.headers.get('Stripe-Signature') ?? '',
    titok,
  });

  if (!ellenorzes.ok) {
    // Az ok a naplóba megy, nem a válaszba: a hívónak semmi dolga azzal, hogy
    // az aláírás vagy az időbélyeg bukott-e el.
    console.warn(`Elutasított Stripe-webhook: ${ellenorzes.miert}`);

    return valasz({ hiba: 'Érvénytelen aláírás.' }, 401);
  }

  let esemeny: unknown;

  try {
    esemeny = JSON.parse(test);
  } catch {
    // Aláírt, de értelmezhetetlen test. Az újraküldés nem segítene rajta.
    console.error('Aláírt, de értelmezhetetlen Stripe-esemény.');

    return valasz({ rendben: true, kihagyva: 'ertelmezhetetlen' }, 200);
  }

  const dontes = esemenytErtelmez(esemeny);

  if (dontes.fajta === 'kihagy') {
    return valasz({ rendben: true, kihagyva: dontes.miert }, 200);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  if (dontes.fajta === 'tulhasznalat') {
    return await tulhasznalast(db, dontes);
  }

  const { data, error } = await db.rpc('stripe_allapot_frissit', {
    ceg_jelolt: dontes.cegAzonosito,
    ugyfel: dontes.ugyfelAzonosito,
    valtozas: dontes.valtozas,
    esemeny_ido: dontes.esemenyIdo,
  });

  if (error !== null) {
    // 500: a Stripe próbálja újra. Egy adatbázis-hiba múló is lehet, és az
    // esemény elvesztése itt valódi kárt okozna — a cég fizetne, de nem kapna
    // keretet.
    console.error('A Stripe-állapot írása nem sikerült:', error);

    return valasz({ hiba: 'Az állapot írása nem sikerült.' }, 500);
  }

  const eredmeny = (data ?? {}) as { ceg?: string; frissult?: boolean; miert?: string };

  if (eredmeny.frissult !== true) {
    // Nem hiba, és **nem is szabad** újrapróbálni: a régi esemény szándékosan
    // nem ír (vízjel), a párosítatlan ügyfél pedig nem lesz párosított attól,
    // hogy a Stripe még ötször elküldi.
    console.warn(`A Stripe-esemény nem frissített: ${eredmeny.miert ?? 'ismeretlen ok'}`);

    return valasz({ rendben: true, kihagyva: eredmeny.miert ?? 'nem_frissult' }, 200);
  }

  // A napló a **visszafordíthatatlan** lépéseké — egy csomagváltás vagy egy
  // lemondás az. Ha ez elhasal, az előfizetés attól még rendben van: a naplót
  // nem engedjük a fizetés útjába állni.
  const { error: naploHiba } = await db.from('activity_log').insert({
    company_id: eredmeny.ceg,
    action: 'elofizetes.valtozott',
    subject_type: 'stripe',
    summary: dontes.naplo,
    context: dontes.valtozas,
  });

  if (naploHiba !== null) {
    console.error('Az előfizetés naplózása nem sikerült:', naploHiba);
  }

  return valasz({ rendben: true }, 200);
});

/** Amit a lezárult időszakról az adatbázis tud. Számot és döntést nem tartalmaz. */
type Nyersanyag = {
  ceg: string;
  overage_enabled: boolean;
  overage_limit_ft: number | null;
  stripe_lookup_key: string | null;
  stripe_status: string | null;
  felhasznalt: number;
  rogzitve: { id: string; stripe_tetel: string | null } | null;
};

/**
 * A lezárult időszak túlhasználatának rátétele a most készülő számlára.
 *
 * # A sorrend, és miért pont ez
 *
 * **Előbb rögzítünk, aztán hívjuk a Stripe-ot, végül beírjuk az azonosítót.**
 * A középső lépés az, ami elbukhat — és ha elbukik, a félbemaradt futás
 * pontosan a befejezetlen munka listáját hagyja hátra: `overage_charges` sor
 * `stripe_invoice_item_id is null`-lal. Ugyanaz a sorrendi elv, mint a
 * selejtezésnél; a fordított sorrend egy kiszámlázott, de sehol nem
 * nyilvántartott tételt hagyna, és az a rosszabb irány.
 *
 * A rögzített sor **felülírhatatlan**: egy újrafutás a tárolt darabszámmal és
 * összeggel számláz tovább, nem egy friss újraszámolással. Ha közben változna
 * a darabár a configban, a felhasználó akkor is azt fizeti, amit a lezáráskor
 * ígértünk.
 *
 * # Mikor adunk 200-at, és mikor 5xx-et
 *
 * 200 mindenre, amin az újraküldés nem segítene: ismeretlen ügyfél, nincs
 * engedély, nincs túlhasználat, ismeretlen csomag. 5xx arra, ami múló lehet
 * (adatbázis- vagy Stripe-hiba) — ott az újraküldés a **helyes** viselkedés,
 * mert a sor ilyenkor számlázatlanul áll.
 *
 * ⚠️ Az újraküldésnek van egy ablaka, és az **pontosan egy óra**: a
 * ciklusforduló számláján az `automatically_finalizes_at` a létrehozás ideje
 * **+ 3600 másodperc** (test clockon mérve, 2026-09-20 — korábban ez itt
 * „nagyjából egy óra" volt, becslésként). Utána a `szamlabol()` kapuja már
 * `kihagy`-ot ad, mert a számla nem piszkozat többé.
 *
 * Ugyanaz a mérés azt is megmutatta, hogy ez az egész út — nyersanyag,
 * rögzítés, ár-feloldás, tételírás — **másodpercek** alatt lefut. Az ablak
 * tehát bőven elég; de nem végtelen, és ezt jobb kimondva tudni.
 */
async function tulhasznalast(
  db: SupabaseClient,
  d: Extract<Dontes, { fajta: 'tulhasznalat' }>,
): Promise<Response> {
  const kulcs = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

  if (kulcs === '') {
    console.error('Nincs STRIPE_SECRET_KEY — a túlhasználat nem számlázható.');

    return valasz({ hiba: 'A végpont nincs beállítva.' }, 503);
  }

  const { data, error } = await db.rpc('tulhasznalat_nyersanyag', {
    ugyfel: d.ugyfelAzonosito,
    kezdet: d.idoszakKezdete,
    veg: d.idoszakVege,
  });

  if (error !== null) {
    console.error('A túlhasználat nyersanyaga nem olvasható:', error);

    return valasz({ hiba: 'Az olvasás nem sikerült.' }, 500);
  }

  if (data === null || data === undefined) {
    // Nem a mi ügyfelünk. A Stripe-végpont több eseményt is küldhet, mint
    // amennyire feliratkoztunk — ettől még nem hiba.
    return valasz({ rendben: true, kihagyva: 'nincs_ceg' }, 200);
  }

  const ny = data as unknown as Nyersanyag;

  if (ny.rogzitve !== null && ny.rogzitve.stripe_tetel !== null) {
    return valasz({ rendben: true, kihagyva: 'mar_szamlazva' }, 200);
  }

  if (!ny.overage_enabled) {
    // Nem kapcsolta be. Ilyenkor a `keret.ts` meg is állította a kereten —
    // nincs mit számlázni, és nem is ígértünk semmi ilyet.
    return valasz({ rendben: true, kihagyva: 'nincs_engedely' }, 200);
  }

  const csomagKulcs = csomagKulcsbol(ny.stripe_lookup_key);

  if (csomagKulcs === null) {
    // ⚠️ Itt **nem** esünk a legkisebb csomagra, pedig a keretszámolás azt
    // teszi. Ott a szigorúbb irány a helyes; itt ugyanaz *többet* számlázna,
    // mert a kisebb kerethez képest több esne túlhasználatba. Ismeretlen
    // csomag mellett tehát nem számlázunk — és hangosan naplózunk.
    console.error(
      `Ismeretlen csomagkulcs a túlhasználat számlázásakor: ${ny.stripe_lookup_key ?? 'nincs'}`,
    );

    return valasz({ rendben: true, kihagyva: 'ismeretlen_csomag' }, 200);
  }

  const csomag = szamlafolyo.csomagok[csomagKulcs];

  const szamitott = tulhasznalatSzamol({
    keret: csomag.dokumentumok,
    darabAr: csomag.extraFt,
    felhasznalt: Number(ny.felhasznalt) || 0,
    plafonFt: ny.overage_limit_ft,
  });

  // Nulla sort **nem rögzítünk**. Az ablak le van zárva, tehát az újraszámolás
  // determinisztikus: egy újraküldött esemény ugyanezt a nullát kapja, és
  // ugyanígy megáll. Cserébe a tábla csak valódi terheléseket tartalmaz.
  if (ny.rogzitve === null && szamitott.szamlazhatoDarab <= 0) {
    return valasz({ rendben: true, kihagyva: 'nincs_tulhasznalat' }, 200);
  }

  const { data: rogzites, error: rogzitesHiba } = await db.rpc('tulhasznalast_rogzit', {
    ceg: ny.ceg,
    kezdet: d.idoszakKezdete,
    veg: d.idoszakVege,
    kreditek: szamitott.szamlazhatoDarab,
    forint: szamitott.ft,
  });

  if (rogzitesHiba !== null) {
    console.error('A túlhasználat rögzítése nem sikerült:', rogzitesHiba);

    return valasz({ hiba: 'A rögzítés nem sikerült.' }, 500);
  }

  const sor = (rogzites ?? {}) as { id?: string; kreditek?: number; forint?: number };
  const darab = sor.kreditek ?? 0;
  const forint = sor.forint ?? 0;

  if (sor.id === undefined || darab <= 0) {
    return valasz({ rendben: true, kihagyva: 'nincs_tulhasznalat' }, 200);
  }

  let tetelAzonosito: string;

  try {
    const ar = await arKulcsbol(kulcs, csomag.lookupKulcsExtra);

    if (ar === null) {
      // A sor rögzítve maradt, számlázatlanul. Az 500 miatt a Stripe
      // újrapróbálja — és mire visszajön, a hiányzó címke pótolható.
      console.error(`A ${csomag.lookupKulcsExtra} lookup_key nincs a Stripe-fiókban.`);

      return valasz({ hiba: 'A túlhasználati ár nincs beállítva.' }, 500);
    }

    tetelAzonosito = await tetelt(kulcs, {
      ugyfel: d.ugyfelAzonosito,
      szamla: d.szamlaAzonosito,
      ar,
      darab,
      ceg: ny.ceg,
      kezdet: d.idoszakKezdete,
      veg: d.idoszakVege,
    });
  } catch (hiba) {
    console.error('A túlhasználati tétel létrehozása nem sikerült:', hiba);

    return valasz({ hiba: 'A számlatétel létrehozása nem sikerült.' }, 502);
  }

  const { error: jeloloHiba } = await db.rpc('tulhasznalat_szamlazva', {
    tetel: sor.id,
    stripe_tetel: tetelAzonosito,
  });

  if (jeloloHiba !== null) {
    // A tétel a Stripe-nál **létrejött**, csak a jelölés hiányzik. Az 500-ra
    // érkező újraküldés ugyanazzal az idempotencia-kulccsal ugyanazt a tételt
    // kapja vissza, tehát nem lesz belőle második terhelés.
    console.error('A túlhasználat kiszámlázottnak jelölése nem sikerült:', jeloloHiba);

    return valasz({ hiba: 'A jelölés nem sikerült.' }, 500);
  }

  const { error: naploHiba } = await db.from('activity_log').insert({
    company_id: ny.ceg,
    action: 'tulhasznalat.szamlazva',
    subject_type: 'stripe',
    summary:
      `Túlhasználat kiszámlázva: ${darab} bizonylat, ${forint} Ft ` +
      `(${d.idoszakKezdete.slice(0, 10)} – ${d.idoszakVege.slice(0, 10)}).`,
    context: {
      credits: darab,
      amount_ft: forint,
      invoice: d.szamlaAzonosito,
      invoice_item: tetelAzonosito,
    },
  });

  if (naploHiba !== null) {
    console.error('A túlhasználat naplózása nem sikerült:', naploHiba);
  }

  return valasz({ rendben: true, szamlazva: darab }, 200);
}

/** Az árazonosító a `lookup_key`-ből. Csak **aktív** árat fogadunk el. */
async function arKulcsbol(kulcs: string, lookupKulcs: string): Promise<string | null> {
  const valaszok = await stripe<{ data: { id: string }[] }>(
    kulcs,
    `/prices?active=true&lookup_keys[]=${encodeURIComponent(lookupKulcs)}`,
  );

  return valaszok.data[0]?.id ?? null;
}

/**
 * A számlatétel létrehozása, a piszkozat számlára téve.
 *
 * ⚠️ **`pricing[price]`, nem `price`.** A végpont API-verziója
 * (`2026-08-26.dahlia`) alatt az ár a `pricing` objektumba költözött — ezt
 * megmértem az API leírásában, nem emlékezetből írtam. Ugyanaz a csendes
 * csapda, mint a ciklusdátumok elköltözése: egy `price=` mező nem hibaüzenetet
 * adna, hanem ár nélküli tételt.
 *
 * Az összeget **nem mi mondjuk meg**: a darabár a Stripe árobjektumán áll, mi
 * a darabszámot adjuk. Így a számlán a termék neve is a helyes, és a pénznem
 * sem itt dől el.
 *
 * A `period` nem díszítés: enélkül a számlasoron a mai nap állna, nem az az
 * időszak, amiben a munka történt.
 */
async function tetelt(
  kulcs: string,
  t: {
    ugyfel: string;
    szamla: string;
    ar: string;
    darab: number;
    ceg: string;
    kezdet: string;
    veg: string;
  },
): Promise<string> {
  const mezok = new URLSearchParams();

  mezok.set('customer', t.ugyfel);
  mezok.set('invoice', t.szamla);
  mezok.set('pricing[price]', t.ar);
  mezok.set('quantity', String(t.darab));
  mezok.set('period[start]', String(Math.floor(Date.parse(t.kezdet) / 1000)));
  mezok.set('period[end]', String(Math.floor(Date.parse(t.veg) / 1000)));
  mezok.set(
    'description',
    `Túlhasználat: ${t.darab} bizonylat a kereten felül ` +
      `(${t.kezdet.slice(0, 10)} – ${t.veg.slice(0, 10)})`,
  );
  mezok.set('metadata[company_id]', t.ceg);
  mezok.set('metadata[period_start]', t.kezdet);

  // Az idempotencia-kulcs a cégből és az időszakból áll össze, tehát egy
  // újraküldött esemény **ugyanazt** a tételt kapja vissza, nem egy másodikat.
  // A Stripe 24 órán át emlékszik rá — a piszkozat számla ennél jóval hamarabb
  // véglegesül, tehát a fedezet elég.
  const tetel = await stripe<{ id: string }>(kulcs, '/invoiceitems', mezok, {
    'Idempotency-Key': `tulhasznalat-${t.ceg}-${t.kezdet}`,
  });

  return tetel.id;
}

/**
 * Egy Stripe-hívás.
 *
 * ⚠️ Ugyanez a segédfüggvény ott áll a `stripe-checkout`-ban és a
 * `stripe-portal`-ban is. A három példány **tudatos**: ezek külön telepített
 * Deno-függvények, a `shared/uzleti` pedig szándékosan nulla függőségű, tiszta
 * kód — egy `fetch`-elő segéd nem való bele. Ha valaha négy lesz belőle,
 * érdemes egy `supabase/functions/_kozos/` mappát nyitni.
 */
async function stripe<T>(
  kulcs: string,
  ut: string,
  mezok?: URLSearchParams,
  extraFejlec: Record<string, string> = {},
): Promise<T> {
  const felelet = await fetch(`${STRIPE_API}${ut}`, {
    method: mezok === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${kulcs}`,
      ...(mezok === undefined
        ? {}
        : { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }),
      ...extraFejlec,
    },
    // A `body` **kimarad**, ha nincs — nem `undefined` értékkel szerepel. A
    // testvérfüggvények `body: mezok?.toString()`-et írnak; az futásidőben
    // ugyanaz, típusra viszont nem az (`exactOptionalPropertyTypes`). Ezt a
    // `supabase/functions/` mappa nem is méri — a `tsconfig.app.json` csak a
    // `src`, `shared` és `config` mappákat nézi.
    ...(mezok === undefined ? {} : { body: mezok.toString() }),
  });

  if (!felelet.ok) {
    throw new Error(`Stripe ${felelet.status}: ${(await felelet.text()).slice(0, 500)}`);
  }

  return (await felelet.json()) as T;
}

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json' },
  });
}
