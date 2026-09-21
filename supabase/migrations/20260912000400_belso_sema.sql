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

-- ⚠️ A politikákat **nem névre hivatkozva** ejtjük. Ez a migráció mind a tíz
-- érintett táblán a TELJES politikakészletet lecseréli (a dobások és a
-- létrehozások száma táblánként egyezik), tehát a „mindet" a pontos szándék —
-- és így a név elírása, ékezete vagy későbbi változása nem tud csendben
-- meghiúsítani egy dobást. Ugyanaz a minta, amit a 20260918000100 migráció
-- vezetett be, ott is mérés után: egy `drop policy if exists "…ékezetes…"`
-- némán nem csinált semmit, mert élesben ékezet nélkül állt a név.

-- companies: 2 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'companies'
  loop
    execute format('drop policy %I on public.companies', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cégét"
  on public.companies for select to authenticated
  using (id in (select belso.tag_cegei()));

create policy "A cégadatokat a tulajdonos szerkeszti"
  on public.companies for update to authenticated
  using (belso.adminisztralhat(id))
  with check (belso.adminisztralhat(id));

-- company_members: 4 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'company_members'
  loop
    execute format('drop policy %I on public.company_members', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég tagjait"
  on public.company_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or company_id in (select belso.tag_cegei())
  );

create policy "Tagot a tulajdonos hív meg"
  on public.company_members for insert to authenticated
  with check (belso.adminisztralhat(company_id));

create policy "A tagságot a tulajdonos módosítja, a meghívott elfogadja"
  on public.company_members for update to authenticated
  using (belso.adminisztralhat(company_id) or user_id = (select auth.uid()))
  with check (belso.adminisztralhat(company_id) or user_id = (select auth.uid()));

create policy "Tagot a tulajdonos távolít el, vagy ki-ki magát"
  on public.company_members for delete to authenticated
  using (belso.adminisztralhat(company_id) or user_id = (select auth.uid()));

-- files: 4 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'files'
  loop
    execute format('drop policy %I on public.files', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég fájljait"
  on public.files for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Fájlt a szerkesztő tölt fel"
  on public.files for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Fájlt a szerkesztő módosít"
  on public.files for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Fájlt a szerkesztő töröl"
  on public.files for delete to authenticated
  using (belso.szerkeszthet(company_id));

-- documents: 4 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'documents'
  loop
    execute format('drop policy %I on public.documents', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég bizonylatait"
  on public.documents for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Bizonylatot a szerkesztő hoz létre"
  on public.documents for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Bizonylatot a szerkesztő javít"
  on public.documents for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Bizonylatot a szerkesztő töröl"
  on public.documents for delete to authenticated
  using (belso.szerkeszthet(company_id));

-- document_extractions: 1 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'document_extractions'
  loop
    execute format('drop policy %I on public.document_extractions', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég kiolvasásait"
  on public.document_extractions for select to authenticated
  using (company_id in (select belso.tag_cegei()));

-- document_corrections: 2 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'document_corrections'
  loop
    execute format('drop policy %I on public.document_corrections', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég javításait"
  on public.document_corrections for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Javítást a szerkesztő rögzít"
  on public.document_corrections for insert to authenticated
  with check (belso.szerkeszthet(company_id));

-- exports: 4 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'exports'
  loop
    execute format('drop policy %I on public.exports', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég exportjait"
  on public.exports for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Exportot a szerkesztő készít"
  on public.exports for insert to authenticated
  with check (belso.szerkeszthet(company_id));

create policy "Exportot a szerkesztő módosít"
  on public.exports for update to authenticated
  using (belso.szerkeszthet(company_id))
  with check (belso.szerkeszthet(company_id));

create policy "Exportot a tulajdonos töröl"
  on public.exports for delete to authenticated
  using (belso.adminisztralhat(company_id));

-- overage_charges: 1 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'overage_charges'
  loop
    execute format('drop policy %I on public.overage_charges', r.policyname);
  end loop;
end;
$$;

create policy "A túlhasználatot a tulajdonos látja"
  on public.overage_charges for select to authenticated
  using (belso.adminisztralhat(company_id));

-- activity_log: 2 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'activity_log'
  loop
    execute format('drop policy %I on public.activity_log', r.policyname);
  end loop;
end;
$$;

create policy "A tag látja a cég naplóját"
  on public.activity_log for select to authenticated
  using (company_id in (select belso.tag_cegei()));

create policy "Naplóbejegyzést a szerkesztő fűz hozzá"
  on public.activity_log for insert to authenticated
  with check (belso.szerkeszthet(company_id));

-- objects: 4 politika
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end;
$$;

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
