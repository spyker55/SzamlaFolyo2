-- A visszaváltás nem számlázza újra a múltat.
--
-- # A hiba
--
-- A ciklus végi túlhasználat (`stripe-webhook` → `tulhasznalat_nyersanyag`) a
-- lezárult időszak TELJES felhasználását mérte a számlázás pillanatában
-- érvényes csomag keretéhez. Aki a Pro keretén (500) belül feldolgozott 300
-- bizonylatot, majd Startra (50) váltott, annál a fordulón 250 bizonylat esett
-- túlhasználatba — utólag, olyan munkáért, ami elvégzésekor szabályosan a
-- keretén belül volt. Bekapcsolt túlhasználatnál ez pénz.
--
-- A 2026-09-23-i jogi felülvizsgálat 10. pontja kérdezett rá („egyértelműsítsd,
-- hogy a korábban szabályosan felhasznált keretből keletkezik-e utólag
-- túlfogyasztási díj"). Mérve: keletkezett — `shared/uzleti/keret.test.ts`,
-- „visszaváltás" blokk, a javítás előtt 250-et adott 0 helyett.
--
-- # A javítás
--
-- A csomagváltás pillanatában az adatbázis rögzíti, mennyi fogyott addig az
-- időszakban és melyik csomag terhére (`keret_fedezetek`). A döntést a
-- `hatalyosKeret()` hozza (`shared/uzleti/keret.ts`): az addig felhasznált rész
-- a régi keretig fedezve marad. Új helyet ez nem ad — a fedezet sosem nagyobb a
-- már felhasználtnál —, csak a múltat nem számlázza újra.
--
-- # Miért trigger, és miért nem a webhook írja
--
-- Mert a csomagváltás **egyetlen helyen** történik meg az adatbázisban: a
-- `companies.stripe_lookup_key` átírásakor. Bárki írja át (webhook, kézi
-- javítás, egy jövőbeli új út), a nyom ugyanúgy keletkezik. Ha a webhook
-- írná, egy második író út csendben fedezet nélkül váltana.
--
-- ⚠️ A felhasznált mennyiséget a trigger a **régi** időszakkezdettől számolja
-- (`old.current_period_start`): ha egy esemény a váltást és a fordulót egyszerre
-- hozná, a fedezet akkor is a lezáruló időszakról szól, nem az újról.

create table if not exists public.keret_fedezetek (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- A váltás ELŐTTI csomag `lookup_key`-e. Szöveg, nem idegen kulcs: a
  -- csomagok a configban élnek, nem táblában.
  regi_kulcs text,
  felhasznalt_addig integer not null check (felhasznalt_addig >= 0),
  created_at timestamptz not null default now()
);

comment on table public.keret_fedezetek is
  'Csomagváltások nyoma: a váltásig az időszakban felhasznált kredit és a régi '
  'csomag. Ebből a hatalyosKeret() (shared/uzleti/keret.ts) számol, hogy egy '
  'visszaváltás ne ejtse utólag túlhasználatba a már elvégzett munkát. Csak a '
  'belso.keret_fedezet_rogzit() trigger ír bele.';

create index if not exists keret_fedezetek_ceg_ido_idx
  on public.keret_fedezetek (company_id, created_at);

alter table public.keret_fedezetek enable row level security;
revoke all on table public.keret_fedezetek from anon, authenticated;

-- A `keret_adatok()` `security invoker`, tehát a böngészőből hívva a tag saját
-- jogán olvas. Csak olvasás, csak a saját cégé; írni kizárólag a trigger ír.
grant select on table public.keret_fedezetek to authenticated;

create policy "A tag látja a cége keretfedezeteit" on public.keret_fedezetek
  for select using (company_id in (select belso.tag_cegei()));

create or replace function belso.keret_fedezet_rogzit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Csak futó előfizetés csomagváltása hagy nyomot. A próbaidő nem csomag, és
  -- az első előfizetés (null → kulcs) nem váltás.
  if old.stripe_lookup_key is null
     or new.stripe_lookup_key is not distinct from old.stripe_lookup_key
     or old.current_period_start is null
     or coalesce(old.stripe_status, '') not in ('active', 'trialing', 'past_due') then
    return new;
  end if;

  insert into public.keret_fedezetek (company_id, regi_kulcs, felhasznalt_addig)
  values (
    old.id,
    old.stripe_lookup_key,
    coalesce((
      select sum(e.credits)
      from public.document_extractions e
      where e.company_id = old.id
        and e.created_at >= old.current_period_start
    ), 0)
  );

  return new;
end;
$$;

revoke all on function belso.keret_fedezet_rogzit() from public, anon, authenticated;

drop trigger if exists keret_fedezet on public.companies;
create trigger keret_fedezet
  after update of stripe_lookup_key on public.companies
  for each row execute function belso.keret_fedezet_rogzit();

-- A két nyersanyag-RPC ugyanazt az új mezőt kapja: a keretszámolás (böngésző,
-- `kiolvas`, `email-bekuldes`) és a számlázás (`stripe-webhook`) ugyanabból a
-- fedezetből dönt. „Egy számítás, két irány" — `tulhasznalat.ts`.

create or replace function public.keret_adatok(ceg_id uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ceg as (
    select c.*
    from public.companies c
    where c.id = coalesce(ceg_id, belso.aktualis_ceg())
  ),
  ablak as (
    select
      ceg.id,
      case
        when ceg.stripe_status in ('active', 'trialing', 'past_due')
             and ceg.current_period_start is not null
        then ceg.current_period_start
        else ceg.created_at
      end as kezdet
    from ceg
  )
  select to_jsonb(ceg) - 'name' - 'tax_number' - 'stripe_customer_id'
         - 'stripe_subscription_id' - 'created_at' - 'updated_at'
      || jsonb_build_object(
           'felhasznalt',
           coalesce((
             select sum(e.credits)
             from public.document_extractions e, ablak
             where e.company_id = ablak.id
               and e.created_at >= ablak.kezdet
           ), 0),
           'idoszak_kezdete', (select kezdet from ablak),
           'fedezetek',
           coalesce((
             select jsonb_agg(
                      jsonb_build_object('kulcs', f.regi_kulcs, 'felhasznalt', f.felhasznalt_addig)
                      order by f.created_at
                    )
             from public.keret_fedezetek f, ablak
             where f.company_id = ablak.id
               and f.created_at >= ablak.kezdet
           ), '[]'::jsonb)
         )
  from ceg
$$;

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
    -- Az idoszak csomagvaltasai: a valtas elotti munka nem esik utolag
    -- tulhasznalatba (hatalyosKeret, shared/uzleti/keret.ts).
    'fedezetek', coalesce((
      select jsonb_agg(
               jsonb_build_object('kulcs', f.regi_kulcs, 'felhasznalt', f.felhasznalt_addig)
               order by f.created_at
             )
      from public.keret_fedezetek f
      where f.company_id = c.id
        and f.created_at >= kezdet
        and f.created_at < veg
    ), '[]'::jsonb),
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

-- A `create or replace` megtartja a meglévő jogokat; a szigorítást azért
-- megismételjük, mert egy friss adatbázison (`db reset`) ez a sor is lefut.
revoke execute on function public.keret_adatok(uuid) from public, anon;
grant execute on function public.keret_adatok(uuid) to authenticated;

revoke all on function public.tulhasznalat_nyersanyag(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.tulhasznalat_nyersanyag(text, timestamptz, timestamptz)
  to service_role;
