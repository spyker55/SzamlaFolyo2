import { createClient } from '@supabase/supabase-js';

import { stripeAlairastEllenoriz } from '../../../shared/uzleti/stripe/alairas.ts';
import { esemenytErtelmez } from '../../../shared/uzleti/stripe/esemeny.ts';

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

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json' },
  });
}
