-- A bérlő-feloldó segédfüggvények külön, nem publikált sémába kerülnek.
--
-- Miért: a PostgREST a `public` séma minden függvényét közzéteszi
-- `/rest/v1/rpc/<nev>` alatt, és a Supabase minden új `public` függvényre
-- nevesített EXECUTE jogot ad az `anon` és az `authenticated` szerepnek. A
-- `tolti_company_id` egy trigger-függvény — annak semmi keresnivalója egy
-- nyilvános API-felületen.
--
-- A kézenfekvő javítás (vedd el az EXECUTE-ot) itt **nem járható**: az
-- RLS-politika kifejezése a hívó jogaival fut, tehát ha az `authenticated`
-- nem hívhatja a `szerkeszthet`-et, az egész politika elszáll. A megoldás
-- ezért a séma, nem a jog: a `belso` nincs a közzétett sémák között, de az
-- EXECUTE megmarad, így a politikák változatlanul működnek.
--
-- A `ceg_letrehozas` marad a `public`-ban — azt **szándékosan** hívja a kliens
-- —, de az `anon` jogát nevesítve vesszük el: cégalapításhoz belépés kell.

create schema if not exists belso;

-- A séma használatához jog kell, különben a politika nem tudja feloldani a
-- függvény nevét. Ez nem gyengíti a védelmet: a függvények maguk döntik el,
-- mit adnak vissza, és mind a hívó `auth.uid()`-jára szűkítenek.
grant usage on schema belso to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A függvények új helye
-- ---------------------------------------------------------------------------

create or replace function belso.erinti_updated_at()
returns trigger
language plpgsql
-- Rögzített search_path: enélkül a függvény azt a sémát olvasná, amit a hívó
-- session épp beállított.
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function belso.tag_cegei()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = (select auth.uid())
    and cm.accepted_at is not null
$$;

-- A kiválasztás a LEGKORÁBBI TAGSÁG, nem a legkisebb azonosító — azonosító
-- szerint egy később felvett, de kisebb sorszámú cég maga alá húzhatná azt,
-- ahol a felhasználó addig dolgozott. Biztonsági döntés, nem kényelmi.
create or replace function belso.aktualis_ceg()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = (select auth.uid())
    and cm.accepted_at is not null
  order by cm.created_at, cm.company_id
  limit 1
$$;

create or replace function belso.szerkeszthet(ceg uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = ceg
      and cm.user_id = (select auth.uid())
      and cm.accepted_at is not null
      and cm.role in ('tulajdonos', 'szerkeszto')
  )
$$;

create or replace function belso.adminisztralhat(ceg uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = ceg
      and cm.user_id = (select auth.uid())
      and cm.accepted_at is not null
      and cm.role = 'tulajdonos'
  )
$$;

create or replace function belso.tolti_company_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.company_id is null then
    new.company_id := belso.aktualis_ceg();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- A politikák átkötése az új sémára
-- ---------------------------------------------------------------------------

drop policy "A tag latja a ceget" on public.companies;
drop policy "A cegadatokat a tulajdonos szerkeszti" on public.companies;

create policy "A tag latja a ceget"
  on public.companies for select to authenticated
  using (id in (select belso.tag_cegei()));

create policy "A cegadatokat a tulajdonos szerkeszti"
  on public.companies for update to authenticated
  using (belso.adminisztralhat(id))
  with check (belso.adminisztralhat(id));

drop policy "A tag latja a ceg tagjait" on public.company_members;
drop policy "Tagot a tulajdonos hiv meg" on public.company_members;
drop policy "A tagsagot a tulajdonos modositja, a meghivott elfogadja" on public.company_members;
drop policy "Tagot a tulajdonos tavolit el, vagy ki-ki magat" on public.company_members;

create policy "A tag latja a ceg tagjait"
  on public.company_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or company_id in (select belso.tag_cegei())
  );

create policy "Tagot a tulajdonos hiv meg"
  on public.company_members for insert to authenticated
  with check (belso.adminisztralhat(company_id));

create policy "A tagsagot a tulajdonos modositja, a meghivott elfogadja"
  on public.company_members for update to authenticated
  using (belso.adminisztralhat(company_id) or user_id = (select auth.uid()))
  with check (belso.adminisztralhat(company_id) or user_id = (select auth.uid()));

create policy "Tagot a tulajdonos tavolit el, vagy ki-ki magat"
  on public.company_members for delete to authenticated
  using (belso.adminisztralhat(company_id) or user_id = (select auth.uid()));

drop policy "A tag latja a ceg fajljait" on public.files;
drop policy "Fajlt a szerkeszto tolt fel" on public.files;
drop policy "Fajlt a szerkeszto modosit" on public.files;
drop policy "Fajlt a szerkeszto torol" on public.files;

create policy "A tag latja a ceg fajljait"
  on public.files for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Fajlt a szerkeszto tolt fel"
  on public.files for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Fajlt a szerkeszto modosit"
  on public.files for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Fajlt a szerkeszto torol"
  on public.files for delete to authenticated
  using (belso.szerkeszthet(company_id));

drop policy "A tag latja a ceg bizonylatait" on public.documents;
drop policy "Bizonylatot a szerkeszto hoz letre" on public.documents;
drop policy "Bizonylatot a szerkeszto javit" on public.documents;
drop policy "Bizonylatot a szerkeszto torol" on public.documents;

create policy "A tag latja a ceg bizonylatait"
  on public.documents for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Bizonylatot a szerkeszto hoz letre"
  on public.documents for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Bizonylatot a szerkeszto javit"
  on public.documents for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Bizonylatot a szerkeszto torol"
  on public.documents for delete to authenticated
  using (belso.szerkeszthet(company_id));

drop policy "A tag latja a ceg kiolvasasait" on public.document_extractions;

create policy "A tag latja a ceg kiolvasasait"
  on public.document_extractions for select to authenticated
  using (company_id in (select belso.tag_cegei()));

drop policy "A tag latja a ceg javitasait" on public.document_corrections;
drop policy "Javitast a szerkeszto rogzit" on public.document_corrections;

create policy "A tag latja a ceg javitasait"
  on public.document_corrections for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Javitast a szerkeszto rogzit"
  on public.document_corrections for insert to authenticated
  with check (belso.szerkeszthet(company_id));

drop policy "A tag latja a ceg exportjait" on public.exports;
drop policy "Exportot a szerkeszto keszit" on public.exports;
drop policy "Exportot a szerkeszto modosit" on public.exports;
drop policy "Exportot a tulajdonos torol" on public.exports;

create policy "A tag latja a ceg exportjait"
  on public.exports for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Exportot a szerkeszto keszit"
  on public.exports for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Exportot a szerkeszto modosit"
  on public.exports for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Exportot a tulajdonos torol"
  on public.exports for delete to authenticated
  using (belso.adminisztralhat(company_id));

drop policy "A tulhasznalatot a tulajdonos latja" on public.overage_charges;

create policy "A tulhasznalatot a tulajdonos latja"
  on public.overage_charges for select to authenticated
  using (belso.adminisztralhat(company_id));

drop policy "A tag latja a ceg naplojat" on public.activity_log;
drop policy "Naplobejegyzest a szerkeszto fuz hozza" on public.activity_log;

create policy "A tag latja a ceg naplojat"
  on public.activity_log for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Naplobejegyzest a szerkeszto fuz hozza"
  on public.activity_log for insert to authenticated
  with check (belso.szerkeszthet(company_id));

drop policy "A tag letolti a cege bizonylatait" on storage.objects;
drop policy "Bizonylatot a szerkeszto tolt fel" on storage.objects;
drop policy "Bizonylatfajlt a szerkeszto cserel" on storage.objects;
drop policy "Bizonylatfajlt a szerkeszto torol" on storage.objects;

create policy "A tag letolti a cege bizonylatait"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bizonylatok'
    and ((storage.foldername(name))[1])::uuid in (select belso.tag_cegei())
  );

create policy "Bizonylatot a szerkeszto tolt fel"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bizonylatok'
    and belso.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

create policy "Bizonylatfajlt a szerkeszto cserel"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'bizonylatok'
    and belso.szerkeszthet(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'bizonylatok'
    and belso.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

create policy "Bizonylatfajlt a szerkeszto torol"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bizonylatok'
    and belso.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- A triggerek átkötése, majd a régi függvények eltávolítása
-- ---------------------------------------------------------------------------

drop trigger companies_updated_at on public.companies;
drop trigger company_members_updated_at on public.company_members;
drop trigger files_updated_at on public.files;
drop trigger exports_updated_at on public.exports;
drop trigger documents_updated_at on public.documents;
drop trigger overage_charges_updated_at on public.overage_charges;

create trigger companies_updated_at before update on public.companies
  for each row execute function belso.erinti_updated_at();
create trigger company_members_updated_at before update on public.company_members
  for each row execute function belso.erinti_updated_at();
create trigger files_updated_at before update on public.files
  for each row execute function belso.erinti_updated_at();
create trigger exports_updated_at before update on public.exports
  for each row execute function belso.erinti_updated_at();
create trigger documents_updated_at before update on public.documents
  for each row execute function belso.erinti_updated_at();
create trigger overage_charges_updated_at before update on public.overage_charges
  for each row execute function belso.erinti_updated_at();

drop trigger files_company_id on public.files;
drop trigger exports_company_id on public.exports;
drop trigger documents_company_id on public.documents;
drop trigger document_extractions_company_id on public.document_extractions;
drop trigger document_corrections_company_id on public.document_corrections;
drop trigger activity_log_company_id on public.activity_log;

create trigger files_company_id before insert on public.files
  for each row execute function belso.tolti_company_id();
create trigger exports_company_id before insert on public.exports
  for each row execute function belso.tolti_company_id();
create trigger documents_company_id before insert on public.documents
  for each row execute function belso.tolti_company_id();
create trigger document_extractions_company_id before insert on public.document_extractions
  for each row execute function belso.tolti_company_id();
create trigger document_corrections_company_id before insert on public.document_corrections
  for each row execute function belso.tolti_company_id();
create trigger activity_log_company_id before insert on public.activity_log
  for each row execute function belso.tolti_company_id();

drop function public.tolti_company_id();
drop function public.erinti_updated_at();
drop function public.szerkeszthet(uuid);
drop function public.adminisztralhat(uuid);
drop function public.tag_cegei();

-- ---------------------------------------------------------------------------
-- A cégalapítás marad a publikált API-n, de belépéshez kötve
-- ---------------------------------------------------------------------------

create or replace function public.ceg_letrehozas(nev text, adoszam text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  uj_ceg uuid;
begin
  if felhasznalo is null then
    raise exception 'Cégalapításhoz be kell jelentkezni.';
  end if;

  -- Egy fiók egy céget kezel. A séma többet elbírna, de a termék egyet mutat,
  -- és a könyvelőiroda az ügyfeleit egy fiókban dolgozza fel — a
  -- szétválasztást az export adószámszűrője adja, nem cégadminisztráció.
  if belso.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég.';
  end if;

  insert into public.companies (name, tax_number, trial_ends_at)
  values (nev, adoszam, now() + interval '14 days')
  returning id into uj_ceg;

  insert into public.company_members (company_id, user_id, role, accepted_at)
  values (uj_ceg, felhasznalo, 'tulajdonos', now());

  return uj_ceg;
end;
$$;

drop function public.aktualis_ceg();

-- A `revoke ... from public` önmagában kevés: a Supabase minden új `public`
-- függvényre **nevesített** EXECUTE jogot ad az `anon` és az `authenticated`
-- szerepnek, azt pedig csak nevesítve lehet visszavonni.
revoke all on function public.ceg_letrehozas(text, text) from public, anon;
grant execute on function public.ceg_letrehozas(text, text) to authenticated;
