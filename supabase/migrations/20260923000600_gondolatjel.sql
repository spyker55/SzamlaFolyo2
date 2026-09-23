-- Gondolatjel: hosszú (—) helyett nagykötőjel (–) mindenhol, ahol a
-- felhasználó látja. Tartalmi változás nincs.
--
-- # 1. Három SQL-hibaüzenet
--
-- Ezek a felületen szó szerint megjelennek. A három függvény törzse a
-- legutolsó definíciójuk BETŰRE (élesben md5-tel egyeztetve 2026-09-23-án),
-- egyetlen változással: a karakterlánc-literálokban — és csak ott — a
-- gondolatjel. A kommentek nem látszanak, azok maradnak.
--
-- | Függvény | Előző definíció |
-- |---|---|
-- | `belso.tulhasznalat_ore()` | `20260920000300_tulhasznalat.sql` |
-- | `public.meghivot_elfogad()` | `20260920000200_hely_korlat.sql` |
-- | `public.ceg_letrehozas()` | `20260923000400_megorzes_bizonyitek_inaktiv.sql` |
--
-- Az aláírások nem változnak, tehát a jogok és a trigger-kötés megmaradnak.
--
-- # 2. Új jogi változat: `2026-09-23-2`
--
-- A három jogi szöveg is kapott nagykötőjelet, és egy kiadott változat
-- szövege nem változhat (`archivum.test.tsx`). Ezért új sor, ugyanazzal a
-- hatálybalépési nappal: tartalmilag a reggeli `2026-09-23` szövege, csak a
-- jel más — az archívumok ezt karakterre igazolják (a reggeli archívumban a
-- — jelet –-re cserélve a délutánit kapjuk).

-- ---------------------------------------------------------------------------
-- belso.tulhasznalat_ore()
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
      'A túlhasználat csak futó előfizetés mellett kapcsolható be – próbaidőn nincs kinek számlázni.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- public.meghivot_elfogad()
-- ---------------------------------------------------------------------------

create or replace function public.meghivot_elfogad(jel text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim         text;
  m           record;
  max         integer;
  tagok       integer;
begin
  if felhasznalo is null then
    raise exception 'A meghívó elfogadásához be kell jelentkezni.';
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  select * into m from public.company_invites where token = jel;

  if not found then
    raise exception 'Ez a meghívó nem érvényes.';
  end if;

  if m.revoked_at is not null then
    raise exception 'Ezt a meghívót visszavonták.';
  end if;

  if m.accepted_at is not null then
    raise exception 'Ezt a meghívót már elfogadták.';
  end if;

  if m.expires_at <= now() then
    raise exception 'Ez a meghívó lejárt. Kérj újat a cég tulajdonosától.';
  end if;

  if cim is distinct from m.email then
    raise exception 'Ez a meghívó a % címre szól, te pedig %-ként vagy belépve.', m.email, coalesce(cim, 'ismeretlen');
  end if;

  if belso.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég, márpedig egy fiók egy céget kezel.';
  end if;

  -- Az uj blokk: fer-e meg valaki. A meghivo letrejotte ota a ceg valthatott
  -- kisebb csomagra — ez az egyetlen hely, ahol ez kiderulhet.
  max := belso.helyek(m.company_id);

  if max is not null then
    select count(*) into tagok
    from public.company_members cm
    where cm.company_id = m.company_id and cm.accepted_at is not null;

    if tagok >= max then
      raise exception 'Ebben a cégben most nincs szabad hely (% felhasználó fér a csomagjukba). Szólj a cég tulajdonosának – nagyobb csomaggal vagy egy hely felszabadításával tudsz belépni.', max;
    end if;
  end if;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (m.company_id, felhasznalo, m.role, now(), cim);

  update public.company_invites
     set accepted_at = now(), accepted_by = felhasznalo
   where id = m.id;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (m.company_id, felhasznalo, 'meghivo.elfogadva', 'company_invite', m.id,
          cim || ' belépett a céghez');

  return m.company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- public.ceg_letrehozas()
-- ---------------------------------------------------------------------------

create or replace function public.ceg_letrehozas(nev text, adoszam text, aszf_verzio text)
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
    insert into public.companies (name, tax_number, trial_ends_at)
    values (nev, adoszam, now() + interval '14 days')
    returning id into uj_ceg;
  exception
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

-- ---------------------------------------------------------------------------
-- A jogi változat
-- ---------------------------------------------------------------------------

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-23-2',
  date '2026-09-23',
  '51f42cfedf992a6729b52357b7426bd79b91ace58331066a7cf1eb9b0a38d3b3',
  '10e23e1671d1f84ae7ded772185711d74bbe5162dd5e2f75a80481fd866bd8ed',
  'f533ccae21d00803f92084d0de5d41cb40bb8b852f34e9f3ae1a6acac44a4ab1'
)
on conflict (version) do nothing;
