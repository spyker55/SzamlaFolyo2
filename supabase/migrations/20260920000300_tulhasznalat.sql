-- ---------------------------------------------------------------------------
-- Túlhasználat: a próbaidős zár, és a ciklus végi számlázás nyersanyaga.
--
-- # Mi hiányzott, és miért ez a három darab
--
-- Az `overage_charges` tábla **az első migráció óta** itt áll, és egyetlen sor
-- sem írta. A darabárak a configban, a plafon a cég során, a kapcsoló a
-- Beállításokon — csak épp a keret fölötti munkáért soha senki nem fizetett.
--
-- Ez a migráció három dolgot tesz:
--
-- 1. **Bezárja a próbaidős kaput.** A kapcsolót ma a tulajdonos a REST API-n
--    át is átírhatja (`20260914000100`, oszlopszintű jog az `overage_enabled`-re)
--    — vagyis a felületi tiltás megkerülhető. Próbaidőn viszont nincs Stripe-
--    ügyfél, akinek számlázni lehetne: a bekapcsolt túlhasználat ott **ígéret
--    fedezet nélkül**, ami ebben a projektben a legdrágább hibafajta.
--
-- 2. **Kimondja, hogy egy időszakot csak egyszer lehet lezárni.** Egyedi index
--    a `(company_id, period_start)` páron. A Stripe az eseményeket
--    újraküldheti; ettől a számla nem lehet kétszeres.
--
-- 3. **Ad nyersanyagot a számlázáshoz** — és csak nyersanyagot. Hogy hány
--    kredit ment a kereten felül és az mennyi forint, azt a
--    `shared/uzleti/tulhasznalat.ts` mondja meg, ugyanaz a modul, ami a
--    `kiolvas` fékjét is hajtja. Ez szándékos: ha a beeresztő és a számlázó
--    oldal két külön számítás lenne, széttartanának — és a széttartás mindkét
--    iránya rossz.
--
-- ⚠️ **A csomag keretét és darabárát ez a fájl NEM ismeri**, és ez a lényeg. A
-- helykorlát körében (`20260920000200`) a fejszámot muszáj volt SQL-be
-- másolni, mert az írás maga itt történik — ott egy drift-teszt őrzi a két
-- példányt. Itt nincs rá szükség: a számítás az Edge Functionben fut, a
-- configból. Egy szám, egy hely.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. A próbaidős zár
--
-- Trigger, nem `check` kényszer: a feltétel **két oszlopot** néz (a kapcsolót
-- és a Stripe-státuszt), és csak az **átbillenésre** szól. Egy `check` a már
-- bekapcsolt túlhasználatú céget akkor is elutasítaná, amikor a webhook a
-- lemondást írja be — vagyis a lemondás nem menne át. Az a hibaosztály
-- rosszabb, mint amit javít.
--
-- A meglévő beállítást ezért **nem bántjuk**: aki előfizetőként bekapcsolta,
-- annál a kapcsoló bekapcsolva marad az előfizetés megszűnése után is. Nem
-- hat semmire (a `keret.ts` a próbaidős ágon mindig `tulhasznalatban: false`-t
-- ad), és ha a cég újra előfizet, a saját korábbi döntése áll vissza — nem egy
-- általunk csendben átbillentett érték.
-- ---------------------------------------------------------------------------

create or replace function belso.tulhasznalat_ore()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Csak a **bekapcsolás** érdekel. A kikapcsolás mindig szabad, és az sem
  -- gond, ha egy már bekapcsolt sort más okból írnak át.
  if new.overage_enabled
     and (tg_op = 'INSERT' or not coalesce(old.overage_enabled, false))
     -- A futó előfizetés definíciója. Ugyanez a három státusz áll a
     -- `shared/uzleti/keret.ts` `elofizetesFut()`-jában és három korábbi
     -- migrációban; a négy példány egyezését a `keret.test.ts` drift-tesztje
     -- méri, mert egy elcsúszott lista csendben rossz keretet adna.
     and coalesce(new.stripe_status, '') not in ('active', 'trialing', 'past_due') then
    raise exception
      'A túlhasználat csak futó előfizetés mellett kapcsolható be — próbaidőn nincs kinek számlázni.';
  end if;

  return new;
end;
$$;

drop trigger if exists companies_tulhasznalat_ore on public.companies;

create trigger companies_tulhasznalat_ore
  before insert or update on public.companies
  for each row execute function belso.tulhasznalat_ore();

comment on function belso.tulhasznalat_ore() is
  'A tulhasznalat csak futo elofizetes mellett kapcsolhato be. Probaidon nincs '
  'Stripe-ugyfel, akinek szamlazni lehetne — a kapcsolo ott fedezet nelkuli igeret.';

-- ---------------------------------------------------------------------------
-- 2. Az `overage_charges` tábla kiegészítése
--
-- A `credits` eddig is megvolt. Két dolog hiányzott belőle:
--
-- - **`amount_ft`** — amit ténylegesen kiszámláztunk. Nem származtatható
--   utólag a configból: a darabár változhat (2026 szeptemberében változott is),
--   és akkor a régi sorok visszamenőleg más összeget mutatnának. Egy számlázási
--   nyilvántartás nem számol újra, hanem **rögzít**.
-- - **`period_end`** — hogy a sor önmagában megmondja, melyik időszakról szól.
--
-- Az egyedi index a `(company_id, period_start)` páron az idempotencia: a
-- Stripe egy eseményt újraküldhet (a lemondásnál élesben kétszer is küldött),
-- és ettől a számla nem lehet kétszeres.
-- ---------------------------------------------------------------------------

alter table public.overage_charges
  add column if not exists period_end timestamptz,
  add column if not exists amount_ft integer
    check (amount_ft is null or amount_ft >= 0);

create unique index if not exists overage_charges_egy_idoszak
  on public.overage_charges (company_id, period_start);

comment on column public.overage_charges.amount_ft is
  'Amit tenylegesen kiszamlaztunk, forintban. Rogzitett ertek: a darabar '
  'valtozhat, a mar kiallitott szamla nem.';

comment on column public.overage_charges.stripe_invoice_item_id is
  'A Stripe invoice item azonositoja. NULL = a sor rogzult, de meg nincs '
  'kiszamlazva — vagy mert most fut a szamlazas, vagy mert nem is lesz '
  '(megszunt elofizetes zaro idoszaka).';

-- ---------------------------------------------------------------------------
-- 3. A számlázás három lépése
--
-- Külön függvények, mert a **közepükön egy Stripe-hívás van**, és az a hívás
-- elbukhat. A sorrend ezért: előbb rögzítünk (a sor a mi könyvelésünk), aztán
-- hívunk, végül beírjuk a Stripe azonosítóját. Egy félbemaradt futás így
-- pontosan a befejezetlen munka listáját hagyja hátra — `stripe_invoice_item_id
-- is null` —, nem egy kitalálhatatlan állapotot. Ugyanaz a sorrendi elv, mint
-- a selejtezésnél (`file_deleted_at` → tárolóból törlés → `storage_path`).
-- ---------------------------------------------------------------------------

-- 3/a. Nyersanyag: mit tudunk a cégről és az imént lezárult időszakról.
create or replace function public.tulhasznalat_nyersanyag(
  ugyfel text,
  kezdet timestamptz,
  veg timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'ceg', c.id,
    'overage_enabled', c.overage_enabled,
    'overage_limit_ft', c.overage_limit_ft,
    'stripe_lookup_key', c.stripe_lookup_key,
    'stripe_status', c.stripe_status,
    -- Ugyanabbol a tablabol, ahonnan a keret is szamol: a
    -- `document_extractions` **tuleli a dokumentumot**, a `documents` sort
    -- viszont a felhasznalo torolheti. Amit el lehet tuntetni, abbol nem lehet
    -- szamlazni sem.
    'felhasznalt', coalesce((
      select sum(e.credits)
      from public.document_extractions e
      where e.company_id = c.id
        and e.created_at >= kezdet
        and e.created_at < veg
    ), 0),
    -- Ha mar van sorunk erre az idoszakra, a hivo azonnal megall.
    'rogzitve', (
      select jsonb_build_object('id', o.id, 'stripe_tetel', o.stripe_invoice_item_id)
      from public.overage_charges o
      where o.company_id = c.id and o.period_start = kezdet
    )
  )
  from public.companies c
  where c.stripe_customer_id = ugyfel
$$;

revoke all on function public.tulhasznalat_nyersanyag(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.tulhasznalat_nyersanyag(text, timestamptz, timestamptz)
  to service_role;

comment on function public.tulhasznalat_nyersanyag(text, timestamptz, timestamptz) is
  'A ciklus vegi szamlazas nyersanyaga: a ceg allapota es az idoszakban '
  'elhasznalt kreditek. A dontest a shared/uzleti/tulhasznalat.ts hozza.';

-- 3/b. A rögzítés. Idempotens: egy időszak egyszer záródik le.
create or replace function public.tulhasznalast_rogzit(
  ceg uuid,
  kezdet timestamptz,
  veg timestamptz,
  kreditek integer,
  forint integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  sor public.overage_charges%rowtype;
begin
  insert into public.overage_charges (company_id, period_start, period_end, credits, amount_ft)
  values (ceg, kezdet, veg, greatest(0, kreditek), greatest(0, forint))
  on conflict (company_id, period_start) do nothing
  returning * into sor;

  if sor.id is not null then
    return jsonb_build_object('id', sor.id, 'uj', true,
                              'kreditek', sor.credits, 'forint', sor.amount_ft);
  end if;

  -- Mar volt sor erre az idoszakra: ujrakuldott esemeny, vagy egy felbemaradt
  -- elozo futas. A meglevo ertekeket **nem** irjuk felul, es a hivo is azokkal
  -- szamlaz tovabb — az elso lezaras az igaz. Ha egy ujraszamolas mast adna
  -- (peldaul mert kozben valtozott a darabar a configban), a mar rogzitett
  -- osszeg akkor is az, amit a felhasznalonak igertunk.
  select * into sor
  from public.overage_charges o
  where o.company_id = ceg and o.period_start = kezdet;

  return jsonb_build_object('id', sor.id, 'uj', false,
                            'kreditek', sor.credits, 'forint', sor.amount_ft);
end;
$$;

revoke all on function public.tulhasznalast_rogzit(uuid, timestamptz, timestamptz, integer, integer)
  from public, anon, authenticated;
grant execute on function public.tulhasznalast_rogzit(uuid, timestamptz, timestamptz, integer, integer)
  to service_role;

comment on function public.tulhasznalast_rogzit(uuid, timestamptz, timestamptz, integer, integer) is
  'Egy idoszak tulhasznalatanak lezarasa. Idempotens: masodik hivasra a meglevo '
  'sort adja vissza, felulirni nem irja. A hivo MINDIG a visszaadott ertekekkel '
  'szamlazzon, ne a sajat ujraszamolasaval.';

-- 3/c. A Stripe-tétel azonosítójának beírása.
create or replace function public.tulhasznalat_szamlazva(
  tetel uuid,
  stripe_tetel text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  -- A `stripe_invoice_item_id is null` feltetel nem disz: ha egy ujrafutas
  -- masodik tetelt hozna letre a Stripe-nal, azt itt **nem** irjuk felul — az
  -- elso azonosito marad, es az elteres lathato lesz a Stripe oldalan.
  update public.overage_charges o
  set stripe_invoice_item_id = stripe_tetel
  where o.id = tetel and o.stripe_invoice_item_id is null
  returning true
$$;

revoke all on function public.tulhasznalat_szamlazva(uuid, text)
  from public, anon, authenticated;
grant execute on function public.tulhasznalat_szamlazva(uuid, text) to service_role;

comment on function public.tulhasznalat_szamlazva(uuid, text) is
  'A Stripe invoice item azonositojanak beirasa. Csak ures mezobe ir.';
