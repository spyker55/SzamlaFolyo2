-- „Honnan hallottál rólunk?" – a cég létrehozásakor adott, nem kötelező válasz.
--
-- # Mit és miért
--
-- A marketing csatornáit (könyvelők, keresés, hirdetés, Facebook, Reddit)
-- sütis konverziómérés nélkül akarjuk összevetni: az a jogi csomagot
-- nyitná újra (hozzájárulás, sütiablak). Egy önkéntes, **zárt listás**
-- válasz a cég sorában ugyanezt megadja, összesítve:
--
--     select heard_from, count(*) as ceg,
--            count(*) filter (where stripe_status = 'active') as fizeto
--     from public.companies group by 1 order by 2 desc;
--
-- # A szabályok
--
-- - **Zárt lista, szabad szöveg nélkül.** Egy „egyéb, írd be" mezőbe
--   harmadik személy neve kerülhetne („X könyvelő ajánlotta"). A kódok
--   listája a `shared/uzleti/forras.ts`-é; a kényszer ugyanazt sorolja, és a
--   `forras.test.ts` méri, hogy együtt mozognak.
-- - **`null` = nem válaszolt.** Nem kötelező, és nem is lesz az.
-- - **Utólag nem írható.** A `companies` táblán az `authenticated` szerepnek
--   oszlopszintű UPDATE-joga van, felsorolt oszlopokra; az új oszlop nincs
--   köztük, és nem is kerül bele. A válasz a csatornát méri, nem profil.
-- - **A cég törlésével törlődik** – a sorral együtt, külön szabály nélkül.
--   (A `terms_acceptances` a törlést túléli, de oda ez nem kerül.)
--
-- # A függvény
--
-- A `ceg_letrehozas()` negyedik, elhagyható paramétert kap. Új paraméterlista
-- új függvény volna (túlterhelés), a PostgREST pedig a három névvel hívott
-- változatnál nem tudna választani – ezért a régi aláírást **eldobjuk**, és
-- az újat hozzuk létre. A régi, háromparaméteres hívás a `default null`
-- miatt változatlanul működik: a már kint lévő felület a telepítés alatt sem
-- törik el.
--
-- Minden más a törzsben betű szerint a `20260923000600_gondolatjel.sql`
-- változata (élesben mérve: md5 3a10bc80c5bf78b2038cfdabeecf5fdd, 2439 bájt).

alter table public.companies
  add column if not exists heard_from text
  constraint companies_heard_from_check check (heard_from in (
    'konyvelo', 'ismeros', 'google_kereses', 'hirdetes',
    'facebook', 'reddit', 'szakmai', 'egyeb'
  ));

comment on column public.companies.heard_from is
  'Honnan hallott a cég a SzámlaFolyóról (önkéntes, zárt lista: shared/uzleti/forras.ts). '
  'null = nem válaszolt. Csak összesítve használjuk; az Adatkezelési tájékoztató 2. pontja írja le.';

drop function if exists public.ceg_letrehozas(text, text, text);

create function public.ceg_letrehozas(nev text, adoszam text, aszf_verzio text, forras text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim text;
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

  if not exists (select 1 from public.legal_versions v where v.version = aszf_verzio) then
    raise exception 'Ismeretlen ÁSZF-változat: %. Töltsd újra az oldalt.', aszf_verzio;
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  begin
    insert into public.companies (name, tax_number, trial_ends_at, heard_from)
    values (nev, adoszam, now() + interval '14 days', nullif(forras, ''))
    returning id into uj_ceg;
  exception
    -- A beszúráson egyetlen ellenőrző kényszer sülhet el, a `heard_from`
    -- listája: a többi oszlop itt az alapértékét kapja. Ez egy elavult
    -- böngésző jele (a lista változott), nem a felhasználó hibája.
    when check_violation then
      raise exception 'Ismeretlen válasz a „Honnan hallottál rólunk?" kérdésre. Töltsd újra az oldalt.';
    -- Ezen a beszúráson egyetlen egyedi kényszer sülhet el: a törzsszámé. A
    -- `stripe_customer_id` ilyenkor még `null`, a `null`-ok pedig nem
    -- ütköznek egymással.
    when unique_violation then
      raise exception 'Ehhez az adószámhoz már tartozik cég a SzámlaFolyóban. '
        'Ha a kollégád már regisztrálta a céget, kérj tőle meghívót – '
        'egy vállalkozás egy céget vezet, több felhasználóval.';
  end;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (uj_ceg, felhasznalo, 'tulajdonos', now(), cim);

  -- A szerződés az ÁSZF 1. pontja szerint **itt** jön létre, nem a
  -- regisztrációval. Tehát itt is kell nyomot hagynia — és a nyomnak a cég
  -- törlését is túl kell élnie, ezért a cég neve és adószáma is a sorba kerül.
  insert into public.terms_acceptances
    (company_id, user_id, user_email, version, company_name, company_tax_number)
  values (uj_ceg, felhasznalo, cim, aszf_verzio, nev, adoszam);

  -- A cég születése az audit-nyom első eseménye. A `company_id` itt
  -- szándékosan ki van írva: a `belso.tolti_company_id()` trigger csak akkor
  -- töltene, ha null volna, és nem támaszkodunk arra, hogy az imént beszúrt
  -- tagsági sor már látszik neki.
  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (uj_ceg, felhasznalo, 'ceg.letrejott', 'company', uj_ceg,
          nev || ' (' || adoszam || ') létrehozva');

  return uj_ceg;
end;
$$;

revoke all on function public.ceg_letrehozas(text, text, text, text) from public, anon;
grant execute on function public.ceg_letrehozas(text, text, text, text) to authenticated, service_role;
