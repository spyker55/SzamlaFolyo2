-- ---------------------------------------------------------------------------
-- A vízjel javítása: a checkout-esemény nem foghatja ki a szelet az
-- előfizetés-esemény vitorlájából
--
-- # A hiba, ahogy élesben megmutatkozott
--
-- Az első valódi sandbox-fizetés (2026-09-19) **félig ment át**: az ügyfél- és
-- az előfizetés-azonosító beíródott, a státusz, a csomag és a ciklus viszont
-- `null` maradt — a felhasználó fizetett, és próbaidőn maradt.
--
-- A napló kimondta:
--
--   16:47:56.844  POST /rpc/stripe_allapot_frissit
--   16:47:56.902  POST /rpc/stripe_allapot_frissit
--   16:47:57.335  „A Stripe-esemény nem frissített: regi_esemeny"
--
-- A két esemény egyszerre érkezett, és az óráik nem egyeztek:
--
--   checkout.session.completed      ideje 16:47:56 — csak azonosítókat hoz
--   customer.subscription.created   ideje 16:47:53 — státuszt, csomagot, ciklust
--
-- A checkout nyerte a versenyt, a vízjelet 16:47:56-ra állította, és ezzel a
-- nála három másodperccel régebbi előfizetés-eseményt **teljes egészében**
-- elutasította.
--
-- # Amit az eredeti vízjel rosszul feltételezett
--
-- Azt, hogy minden esemény ugyanarról beszél, tehát az idejük összemérhető.
-- Nem így van: a két eseményfajta **különböző mezőkről** szól. Egy
-- checkout-esemény, ami a státuszhoz hozzá sem nyúl, nem mérgezheti meg a
-- státusz vízjelét.
--
-- # A helyes szabály
--
-- **A vízjel az előfizetés állapotát őrzi.** Amelyik esemény nem hoz
-- státuszt, az nem is mozdítja — és nem is akad fenn rajta.
--
-- A feltétel pontosan a két eseményfajtát választja szét, nem véletlenül: a
-- `checkoutbol()` soha nem ad `stripe_status`-t (csak azonosítókat köt a
-- céghez), az `elofizetesbol()` pedig mindig ad — státusz nélkül `kihagy`-ot
-- ad vissza. Lásd `shared/uzleti/stripe/esemeny.ts`.
--
-- ⚠️ Ha valaha kerül ide olyan eseményfajta, ami előfizetés-állapotot hoz
-- státusz nélkül, ez a feltétel **csendben** rossz oldalra sorolná. Akkor a
-- vízjel-jelzést a tiszta modulnak kell kimondania, nem a mezők jelenlétéből
-- következtetni.
-- ---------------------------------------------------------------------------

create or replace function public.stripe_allapot_frissit(
  ceg_jelolt uuid,
  ugyfel text,
  valtozas jsonb,
  esemeny_ido timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ceg_ugyfelrol uuid;
  ceg uuid;
  erintett integer;
  allapot_esemeny boolean;
begin
  if ugyfel is not null then
    select c.id into ceg_ugyfelrol
    from public.companies c
    where c.stripe_customer_id = ugyfel;
  end if;

  -- A metadata.company_id oda kerul, ahova mi magunk irtuk a checkout
  -- inditasakor — de ettol meg a hivo allitasa. Ha az ugyfelhez mar tartozik
  -- ceg, es az esemeny mast allit, nem valasztunk kozuluk: nem irunk.
  if ceg_ugyfelrol is not null
     and ceg_jelolt is not null
     and ceg_ugyfelrol <> ceg_jelolt then
    return jsonb_build_object('frissult', false, 'miert', 'ugyfel_ceg_utkozes');
  end if;

  ceg := coalesce(ceg_ugyfelrol, ceg_jelolt);

  if ceg is null then
    return jsonb_build_object('frissult', false, 'miert', 'nincs_ceg');
  end if;

  if not exists (select 1 from public.companies c where c.id = ceg) then
    return jsonb_build_object('frissult', false, 'miert', 'nincs_ceg');
  end if;

  -- Ez a sor a javitas magja: a vizjel csak az allapot-esemenyekre vonatkozik.
  allapot_esemeny := valtozas ? 'stripe_status';

  update public.companies c set
    stripe_customer_id = coalesce(valtozas->>'stripe_customer_id', c.stripe_customer_id),
    stripe_subscription_id =
      coalesce(valtozas->>'stripe_subscription_id', c.stripe_subscription_id),
    stripe_status = coalesce(valtozas->>'stripe_status', c.stripe_status),
    stripe_price_id = coalesce(valtozas->>'stripe_price_id', c.stripe_price_id),
    stripe_lookup_key = coalesce(valtozas->>'stripe_lookup_key', c.stripe_lookup_key),
    current_period_start =
      coalesce((valtozas->>'current_period_start')::timestamptz, c.current_period_start),
    current_period_end =
      coalesce((valtozas->>'current_period_end')::timestamptz, c.current_period_end),
    stripe_event_at =
      case when allapot_esemeny then esemeny_ido else c.stripe_event_at end
  where c.id = ceg
    and (
      not allapot_esemeny
      or c.stripe_event_at is null
      or c.stripe_event_at <= esemeny_ido
    );

  get diagnostics erintett = row_count;

  if erintett = 0 then
    return jsonb_build_object('ceg', ceg, 'frissult', false, 'miert', 'regi_esemeny');
  end if;

  return jsonb_build_object('ceg', ceg, 'frissult', true);
end;
$$;

comment on function public.stripe_allapot_frissit(uuid, text, jsonb, timestamptz) is
  'A Stripe-webhook egyetlen beiro utja. Csak a service_role hivhatja. '
  'A vizjel az ELOFIZETES ALLAPOTAT orzi: amelyik esemeny nem hoz statuszt, '
  'az nem mozditja a vizjelet, es nem is akad fenn rajta. '
  'Ami nincs a valtozasban, az nem irodik.';

-- ---------------------------------------------------------------------------
-- A megmérgezett vízjel visszaállítása
--
-- Ahol a vízjel áll, de előfizetés-állapot **soha nem érkezett**, ott a
-- vízjelet egy checkout-esemény írta — pontosan a fenti hiba. Az ilyen sor
-- máskülönben örökre elutasítaná a régebbi előfizetés-eseményt, tehát az
-- újraküldés sem segítene rajta.
--
-- A `null` vízjel azt jelenti, hogy „a következő esemény jöhet" — ez a
-- biztonságos irány. Ahol van státusz, ahhoz nem nyúlunk: ott a vízjel valódi.
-- ---------------------------------------------------------------------------

update public.companies
   set stripe_event_at = null
 where stripe_status is null
   and stripe_event_at is not null;
