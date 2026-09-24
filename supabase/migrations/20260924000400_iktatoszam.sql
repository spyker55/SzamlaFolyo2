-- Iktatószám: a bizonylat belső sorszáma a könyvelőprogramoknak.
--
-- # Mire kell
--
-- A Novitax NTAX a bizonylatot naplókód + legfeljebb 10 karakteres
-- bizonylatszám szerint azonosítja – egy szállító számlaszáma ennél
-- hosszabb is lehet, és két szállítónál ugyanaz is. A Kulcs-Könyvelés a
-- bejövő számlához iktatószámot kér. Mindkettőhöz egy **cégen belül
-- egyedi, soha újra ki nem adott** egész szám kell.
--
-- # A szabályok
--
-- - **Egyszer adjuk, és megmarad.** Ha egy exportált tételt visszahívnak és
--   újra exportálnak, ugyanaz a szám megy ki – a célprogram így
--   duplikátumként ismeri fel, nem új bizonylatként.
-- - **Nem lehet újra kiadni.** A számláló a `companies` sorában áll, nem a
--   `max()+1`-ből jön: egy törölt bizonylat száma nem kerülhet egy másikra,
--   mert a régi már bent lehet a könyvelőprogramban.
-- - **Külön táblában**, nem a `documents` oszlopaként: a `documents`-en az
--   `authenticated` szerepnek táblaszintű UPDATE-joga van (mérve
--   2026-09-24), egy új oszlopot tehát a kliens is átírhatna. Az
--   `iktatoszamok` táblára írási jog nincs, és a `companies` oszlopszintű
--   jogai közé a számláló nem kerül be.
-- - Csak szerkesztő adhat számot: a kiosztás állapotváltozás, a megtekintő
--   nem változtat semmin.

alter table public.companies
  add column if not exists utolso_iktatoszam bigint not null default 0
  constraint companies_utolso_iktatoszam_check check (utolso_iktatoszam >= 0);

comment on column public.companies.utolso_iktatoszam is
  'Az utoljára kiadott iktatószám (public.iktatoszamok). Csak az iktatoszam_kioszt() lépteti.';

create table if not exists public.iktatoszamok (
  document_id uuid primary key references public.documents(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  szam bigint not null check (szam > 0),
  created_at timestamptz not null default now(),
  constraint iktatoszamok_ceg_szam_egyedi unique (company_id, szam)
);

comment on table public.iktatoszamok is
  'A bizonylatok belső sorszáma a könyvelőprogram-exporthoz (Novitax bizonylatszám, '
  'Kulcs iktatószám). Egyszer adjuk, nem változik, és nem adjuk ki újra. '
  'Csak az iktatoszam_kioszt() ír bele.';

alter table public.iktatoszamok enable row level security;
revoke all on table public.iktatoszamok from anon, authenticated;
grant select on table public.iktatoszamok to authenticated;

create policy "A tag látja a cége iktatószámait" on public.iktatoszamok
  for select to authenticated using (company_id in (select belso.tag_cegei()));

create or replace function public.iktatoszam_kioszt(dokumentum_idk uuid[])
returns table (id uuid, szam bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ceg uuid := belso.aktualis_ceg();
  keres integer := coalesce(array_length(dokumentum_idk, 1), 0);
  sajat integer;
  utolso bigint;
  uj integer;
begin
  if ceg is null then
    raise exception 'Ehhez a fiókhoz nem tartozik cég.';
  end if;

  if not belso.szerkeszthet(ceg) then
    raise exception 'Megtekintő szerepben iktatószámot nem adhatsz ki.';
  end if;

  -- Security definer: az RLS itt nem véd, a cég-ellenőrzés a miénk. Ha
  -- egyetlen azonosító is másé (vagy nem létezik), semmit nem adunk ki.
  select count(*) into sajat
  from public.documents d
  where d.id = any(dokumentum_idk) and d.company_id = ceg;

  if sajat <> keres then
    raise exception 'A tételek között van, ami nem ehhez a céghez tartozik.';
  end if;

  -- A cég sorának zárolása sorba állítja a párhuzamos kiosztásokat.
  select c.utolso_iktatoszam into utolso
  from public.companies c
  where c.id = ceg
  for update;

  insert into public.iktatoszamok (document_id, company_id, szam)
  select u.id, ceg, utolso + row_number() over (order by u.issue_date nulls last, u.created_at, u.id)
  from public.documents u
  where u.id = any(dokumentum_idk)
    and not exists (select 1 from public.iktatoszamok i where i.document_id = u.id);

  get diagnostics uj = row_count;

  if uj > 0 then
    update public.companies c set utolso_iktatoszam = utolso + uj where c.id = ceg;
  end if;

  return query
    select i.document_id, i.szam
    from public.iktatoszamok i
    where i.document_id = any(dokumentum_idk);
end;
$$;

revoke all on function public.iktatoszam_kioszt(uuid[]) from public, anon;
grant execute on function public.iktatoszam_kioszt(uuid[]) to authenticated;
