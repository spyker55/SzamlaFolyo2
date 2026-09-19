-- ---------------------------------------------------------------------------
-- A lemondás tárolása — mert a lemondás NEM státusz
--
-- # A rés, amit ez zár be
--
-- A számlázási portál alapbeállítása szerint a lemondás **a ciklus végére**
-- szól. Ezt nem feltételezzük: a sandbox portál-konfigurációjából mérve
-- (`bpc_1UCOdX…`, 2026-09-19) `subscription_cancel.mode = "at_period_end"`.
--
-- Ilyenkor a Stripe egyetlen dolgot változtat az előfizetésen: kitölti a
-- `cancel_at` mezőt. A `status` marad `active`, a csomag és a ciklus is marad.
-- Vagyis a mai oszlopainkban a lemondás **nyom nélkül** menne át:
--
--   1. a felhasználó lemond a portálon,
--   2. visszatér a Beállításokra, és ugyanazt a futó csomagot látja,
--   3. azt hiszi, nem sikerült — és lemond még egyszer, vagy ír egy levelet.
--
-- Ez ugyanaz a hibaosztály, amit ebben a projektben végig irtunk: nem
-- hibaüzenet keletkezik, hanem **majdnem működés**.
--
-- # A tárolás alakja: egy dátum, nem egy jelölő
--
-- `boolean` helyett `timestamptz`, mert a felületen a kérdés nem az, hogy „le
-- van-e mondva", hanem hogy **meddig fut még**. A `null` jelenti azt, hogy
-- nincs lemondás — ugyanaz az érték, ami a visszavonás után visszaáll.
--
-- ⚠️ **Ez az egyetlen oszlop, aminek a `null`-ja is beírandó.** A többinél a
-- szabály az, hogy ami nincs az eseményben, az nem íródik
-- (`coalesce(valtozas->>'x', c.x)`) — itt viszont a „mégsem mondom le"
-- ugyanolyan érvényes hír, mint a lemondás, és azt egy `coalesce` csendben
-- elnyelné: a cég örökre lemondottnak látszana.
--
-- A megoldás nem az értéken múlik, hanem a **kulcs jelenlétén**:
--
--   valtozas ? 'stripe_cancel_at'   →  írjuk, akkor is, ha NULL
--   nincs benne a kulcs             →  hozzá sem nyúlunk
--
-- Így a checkout-esemény — ami ezt a kulcsot soha nem küldi — nem tudja
-- letörölni a portálon leadott lemondást. Ugyanaz a védekezés, mint a
-- vízjelnél (`20260919000200`), csak a másik irányból: ott az számított, hogy
-- egy esemény mit NEM tud, itt az, hogy mit MOND KI.
-- ---------------------------------------------------------------------------

alter table public.companies add column if not exists stripe_cancel_at timestamptz;

comment on column public.companies.stripe_cancel_at is
  'Mikor er veget a lemondott elofizetes. NULL = nincs lemondas. A portal a '
  'ciklus vegere mond le, ilyenkor a stripe_status ACTIVE marad — a lemondas '
  'egyedul ebben az oszlopban latszik. Ezt az oszlopot az esemeny kulcsanak '
  'JELENLETE irja, nem az erteke: a NULL is beirodik.';

-- ---------------------------------------------------------------------------
-- A beíró függvény: egy sorral bővül, minden más változatlan
--
-- A függvény egészét újraírjuk (`create or replace` nem tud részt cserélni), de
-- a vízjel-logika szó szerint a `20260919000200` migrációé. Amit hozzátesz: a
-- `stripe_cancel_at` kulcs-jelenlét szerinti írása.
--
-- Az oszlopra **továbbra sincs írási jog** az `authenticated` szerepnek: a
-- `20260914000100` oszlopszintű jogosztása hat ártalmatlan mezőre szól, és ez
-- nincs közöttük. Aki a REST API-n át próbálná törölni a saját lemondását,
-- `permission denied`-et kap.
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

  -- A vizjel csak az allapot-esemenyekre vonatkozik (20260919000200).
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
    -- Itt a KULCS JELENLETE dont, nem az ertek. Lasd a fejlecet: enelkul a
    -- lemondas visszavonasa csendben elveszne.
    stripe_cancel_at =
      case
        when valtozas ? 'stripe_cancel_at' then (valtozas->>'stripe_cancel_at')::timestamptz
        else c.stripe_cancel_at
      end,
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
  'Ami nincs a valtozasban, az nem irodik — kiveve a stripe_cancel_at-ot, '
  'amit a kulcs jelenlete ir, mert ott a NULL is hir.';
