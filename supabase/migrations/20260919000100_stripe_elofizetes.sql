-- ---------------------------------------------------------------------------
-- Stripe-előfizetés: a webhook beíró útja
--
-- A `companies` Stripe-oszlopai az első migráció óta ott ülnek, használatlanul:
-- `stripe_customer_id`, `stripe_subscription_id`, `stripe_status`,
-- `stripe_price_id`, `current_period_start`, `current_period_end`. Ez a
-- migráció kettőt tesz hozzá, és megadja az egyetlen utat, amin át beíródnak.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. stripe_lookup_key — a csomag azonosítása árazonosító helyett
--
-- Eddig a `keret.ts` a `stripe_price_id`-ből kereste vissza a csomagot, a
-- configba írt hat árazonosítóval összevetve. Ez **fiókonként más**: a sandbox
-- és az éles fiók ugyanazokat a csomagokat más azonosítón tartja, tehát a
-- configban álló hat sor csak az egyik fiókban ér valamit.
--
-- A Stripe `lookup_key`-e ezt oldja meg: ugyanaz a kulcs
-- (`szamlafolyo_start_havi`) mindkét fiókban ugyanarra a csomagra mutat, és
-- egy jövőbeli árcsere sem nyúl a repóhoz. Az árazonosítót **így is tároljuk**
-- — az a Stripe felé a hivatkozás, és egy hibakereséskor ez az első, amit
-- megnéz az ember.
-- ---------------------------------------------------------------------------

alter table public.companies add column if not exists stripe_lookup_key text;

comment on column public.companies.stripe_lookup_key is
  'A Stripe ar lookup_key-e (pl. szamlafolyo_start_havi). A csomagot a '
  'shared/uzleti/keret.ts EBBOL keresi vissza, nem a stripe_price_id-bol: az '
  'arazonosito fiokonkent mas, a lookup_key nem.';

-- ---------------------------------------------------------------------------
-- 2. stripe_event_at — a vízjel
--
-- ⚠️ **A Stripe nem garantál eseménysorrendet.** Egy késve kézbesített, régi
-- `customer.subscription.updated` visszaléptetné az állapotot: lemondott
-- előfizetést tenne újra aktívvá, vagy egy frissen váltott csomagot írna
-- vissza a régire. Ez nem elméleti kockázat, hanem a Stripe dokumentált
-- viselkedése — az újrapróbálkozás pedig napokig tart.
--
-- A védelem egyetlen oszlop: a legutóbb feldolgozott esemény ideje. Régebbi
-- esemény nem ír. Ez egyben az **idempotencia** is: az újraküldött esemény
-- ugyanazt írja újra, kárt nem tesz.
-- ---------------------------------------------------------------------------

alter table public.companies add column if not exists stripe_event_at timestamptz;

comment on column public.companies.stripe_event_at is
  'A legutobb feldolgozott Stripe-esemeny ideje. Vizjel: ennel regebbi '
  'esemeny nem ir. A Stripe nem garantal esemenysorrendet.';

-- ---------------------------------------------------------------------------
-- 3. A beíró függvény
--
-- ⚠️ **Az oszlopokra szándékosan NINCS írási jog** az `authenticated`
-- szerepnek. A `20260914000100_ceg_oszlopjogok.sql` oszlopszintű jogot ad hat
-- ártalmatlan mezőre, és csak azokra — az ott mért rés pont az volt, hogy a
-- tulajdonos egy PATCH kéréssel Pro csomagra tehette magát. Az új két oszlop
-- ebbe a felsorolásba **nem** kerül bele, tehát a REST API-n át írhatatlan.
--
-- Írni egyedül ez a függvény tud, és azt is csak a `service_role` hívhatja —
-- vagyis kizárólag a `stripe-webhook` Edge Function, aláírás-ellenőrzés után.
--
-- A `coalesce(valtozas->>'x', c.x)` alak nem stílus, hanem a szabály: **ami
-- nincs az eseményben, az nem íródik**. Egy hiányzó kulcsból a `->>` NULL-t
-- ad, a `coalesce` pedig megtartja a régi értéket. Így egy hiányos esemény
-- legrosszabb esetben nem frissít — de nem töröl ki egy élő ciklust sem.
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
    stripe_event_at = esemeny_ido
  where c.id = ceg
    and (c.stripe_event_at is null or c.stripe_event_at <= esemeny_ido);

  get diagnostics erintett = row_count;

  if erintett = 0 then
    return jsonb_build_object('ceg', ceg, 'frissult', false, 'miert', 'regi_esemeny');
  end if;

  return jsonb_build_object('ceg', ceg, 'frissult', true);
end;
$$;

revoke all on function public.stripe_allapot_frissit(uuid, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.stripe_allapot_frissit(uuid, text, jsonb, timestamptz)
  to service_role;

comment on function public.stripe_allapot_frissit(uuid, text, jsonb, timestamptz) is
  'A Stripe-webhook egyetlen beiro utja. Csak a service_role hivhatja. '
  'Vizjel: regebbi esemeny nem ir. Ami nincs a valtozasban, az nem irodik.';

-- ---------------------------------------------------------------------------
-- 4. Az ügyfélazonosító lefoglalása a checkout indításakor
--
-- A `stripe_customer_id`-t a checkout-függvény írja be, még a fizetés előtt —
-- különben minden indítás új Stripe-ügyfelet hozna létre ugyanannak a cégnek,
-- és a második fizetés már egy másik ügyfélhez tartozna.
--
-- Külön függvény kell rá, mert az oszlop az `authenticated` szerepnek
-- írhatatlan (lásd fent), és ez így is helyes: a cég tulajdonosa se írhassa
-- kézzel. A `where stripe_customer_id is null` feltétel a verseny elleni fék —
-- két egyszerre indított checkout közül pontosan az egyik nyer, a másik a már
-- beírt azonosítót kapja vissza. Ugyanaz az alak, mint a `kiolvas` claimje.
-- ---------------------------------------------------------------------------

create or replace function public.stripe_ugyfel_rogzit(ceg uuid, ugyfel text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  meglevo text;
begin
  update public.companies c
     set stripe_customer_id = ugyfel
   where c.id = ceg
     and c.stripe_customer_id is null;

  select c.stripe_customer_id into meglevo
  from public.companies c
  where c.id = ceg;

  return meglevo;
end;
$$;

revoke all on function public.stripe_ugyfel_rogzit(uuid, text)
  from public, anon, authenticated;
grant execute on function public.stripe_ugyfel_rogzit(uuid, text) to service_role;

comment on function public.stripe_ugyfel_rogzit(uuid, text) is
  'A Stripe ugyfelazonosito lefoglalasa a checkout inditasakor. Csak akkor ir, '
  'ha meg ures — a mar beirt azonositot adja vissza. Csak a service_role.';
