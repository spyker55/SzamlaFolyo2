-- SzámlaFolyó — Row Level Security
--
-- Ez a fájl váltja ki a Laravel globális scope-ját (`CompanyScope`), a
-- `BelongsToCompany` traitet és a `resolveRouteBinding` felülírását. A régi
-- rendszerben ez volt a legfontosabb teszt az egész alkalmazásban
-- (`BerloElkulonitesTest`), és élesben egyszer el is romlott: a `ceg`
-- middleware csak az első oldalbetöltéskor futott.
--
-- Az RLS-nek egy előnye van a middleware-rel szemben, és pont az, ami ott
-- elromlott: **nincs sorrend**. A politika az adatbázisban ül, nem a kérés
-- útján — nem lehet „még nem futott le".
--
-- A `service_role` (az Edge Functionök kulcsa) megkerüli az RLS-t. Ezért ami
-- kizárólag gépi úton íródik — kiolvasás, túlhasználat elszámolása —, annak
-- nincs is felhasználói írási politikája: nem tiltás kell hozzá, hanem az,
-- hogy ne adjunk rá engedélyt.

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.files enable row level security;
alter table public.documents enable row level security;
alter table public.document_extractions enable row level security;
alter table public.document_corrections enable row level security;
alter table public.exports enable row level security;
alter table public.overage_charges enable row level security;
alter table public.activity_log enable row level security;

-- ---------------------------------------------------------------------------
-- companies
--
-- Nincs INSERT politika, és ez szándékos: a cégalapítás a `ceg_letrehozas`
-- függvényen át megy, ami a céget és az alapító tulajdonosi tagságát **egy
-- tranzakcióban** hozza létre. Közvetlen beszúrással keletkezhetne olyan cég,
-- amihez senki nem tartozik — fizető, de gazdátlan.
-- ---------------------------------------------------------------------------

create policy "A tag látja a cégét"
  on public.companies for select to authenticated
  using (id in (select public.tag_cegei()));

create policy "A cégadatokat a tulajdonos szerkeszti"
  on public.companies for update to authenticated
  using (public.adminisztralhat(id))
  with check (public.adminisztralhat(id));

-- ---------------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------------

create policy "A tag látja a cége tagjait"
  on public.company_members for select to authenticated
  using (
    -- A saját tagsági sorát az is látja, akinek a meghívója még függőben van —
    -- különben nem tudná elfogadni.
    user_id = (select auth.uid())
    or company_id in (select public.tag_cegei())
  );

create policy "Tagot a tulajdonos hív meg"
  on public.company_members for insert to authenticated
  with check (public.adminisztralhat(company_id));

create policy "A tagságot a tulajdonos módosítja, a meghívott elfogadja"
  on public.company_members for update to authenticated
  using (public.adminisztralhat(company_id) or user_id = (select auth.uid()))
  with check (public.adminisztralhat(company_id) or user_id = (select auth.uid()));

create policy "Tagot a tulajdonos távolít el, vagy ki-ki magát"
  on public.company_members for delete to authenticated
  using (public.adminisztralhat(company_id) or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- files
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég fájljait"
  on public.files for select to authenticated
  using (company_id in (select public.tag_cegei()));

create policy "Fájlt a szerkesztő tölt fel"
  on public.files for insert to authenticated
  with check (public.szerkeszthet(company_id));

create policy "Fájlt a szerkesztő módosít"
  on public.files for update to authenticated
  using (public.szerkeszthet(company_id))
  with check (public.szerkeszthet(company_id));

create policy "Fájlt a szerkesztő töröl"
  on public.files for delete to authenticated
  using (public.szerkeszthet(company_id));

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég bizonylatait"
  on public.documents for select to authenticated
  using (company_id in (select public.tag_cegei()));

create policy "Bizonylatot a szerkesztő hoz létre"
  on public.documents for insert to authenticated
  with check (public.szerkeszthet(company_id));

create policy "Bizonylatot a szerkesztő javít"
  on public.documents for update to authenticated
  using (public.szerkeszthet(company_id))
  with check (public.szerkeszthet(company_id));

create policy "Bizonylatot a szerkesztő töröl"
  on public.documents for delete to authenticated
  using (public.szerkeszthet(company_id));

-- ---------------------------------------------------------------------------
-- document_extractions
--
-- Csak olvasható. A sorokat a kiolvasó Edge Function írja `service_role`-lal.
-- Ha a felhasználó írhatná, a keretszámolás alapja lenne hamisítható — épp az,
-- amiért ez a tábla túléli a dokumentum törlését.
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég kiolvasásait"
  on public.document_extractions for select to authenticated
  using (company_id in (select public.tag_cegei()));

-- ---------------------------------------------------------------------------
-- document_corrections
--
-- Beszúrható (jóváhagyáskor keletkezik), de nem módosítható és nem törölhető:
-- ez a mérőeszközünk arról, hol téved a modell. Egy javítható mérés nem mérés.
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég javításait"
  on public.document_corrections for select to authenticated
  using (company_id in (select public.tag_cegei()));

create policy "Javítást a szerkesztő rögzít"
  on public.document_corrections for insert to authenticated
  with check (public.szerkeszthet(company_id));

-- ---------------------------------------------------------------------------
-- exports
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég exportjait"
  on public.exports for select to authenticated
  using (company_id in (select public.tag_cegei()));

create policy "Exportot a szerkesztő készít"
  on public.exports for insert to authenticated
  with check (public.szerkeszthet(company_id));

create policy "Exportot a szerkesztő módosít"
  on public.exports for update to authenticated
  using (public.szerkeszthet(company_id))
  with check (public.szerkeszthet(company_id));

create policy "Exportot a tulajdonos töröl"
  on public.exports for delete to authenticated
  using (public.adminisztralhat(company_id));

-- ---------------------------------------------------------------------------
-- overage_charges
--
-- Csak olvasható, és csak a tulajdonosnak: ez számlázási adat. Írni a napi
-- elszámoló feladat írja, `service_role`-lal.
-- ---------------------------------------------------------------------------

create policy "A túlhasználatot a tulajdonos látja"
  on public.overage_charges for select to authenticated
  using (public.adminisztralhat(company_id));

-- ---------------------------------------------------------------------------
-- activity_log
--
-- Hozzáfűzhető, de nem módosítható és nem törölhető. Egy napló, amit át lehet
-- írni, nem napló.
-- ---------------------------------------------------------------------------

create policy "A tag látja a cég naplóját"
  on public.activity_log for select to authenticated
  using (company_id in (select public.tag_cegei()));

create policy "Naplóbejegyzést a szerkesztő fűz hozzá"
  on public.activity_log for insert to authenticated
  with check (public.szerkeszthet(company_id));

-- ---------------------------------------------------------------------------
-- Cégalapítás
--
-- A cég és az alapító tulajdonosi tagsága egy tranzakcióban keletkezik.
-- A próbaidő itt kezdődik, Stripe nélkül.
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
  if public.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég.';
  end if;

  insert into public.companies (name, tax_number, trial_ends_at)
  values (
    nev,
    adoszam,
    -- 14 nap. A darabkeretet (50) a keretszámolás nézi, nem ez az oszlop: a
    -- kettő **vagy** kapcsolatban van, amelyik előbb elfogy, az zárja le.
    now() + interval '14 days'
  )
  returning id into uj_ceg;

  insert into public.company_members (company_id, user_id, role, accepted_at)
  values (uj_ceg, felhasznalo, 'tulajdonos', now());

  return uj_ceg;
end;
$$;

revoke all on function public.ceg_letrehozas(text, text) from public;
grant execute on function public.ceg_letrehozas(text, text) to authenticated;
