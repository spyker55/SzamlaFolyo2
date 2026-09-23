-- Két megőrzési szabály, amit a 2026-09-23-i jogi felülvizsgálat kért.
--
-- # 1. Az ÁSZF-elfogadás bizonyítéka túléli a cég törlését (5. pont)
--
-- A `terms_acceptances.company_id` eddig `on delete cascade` volt: a cég
-- törlésével az elfogadás nyoma is eltűnt — pontosan akkor, amikor egy
-- utólagos elszámolási vitában a legnagyobb szükség lehet rá. A tájékoztató
-- ezt ki is mondta („de legfeljebb a cég adatainak törléséig"), vagyis a
-- szabály és a kód egyezett; a szabály volt rossz.
--
-- Mostantól:
--
-- - a cég törlésekor a sor **megmarad**, a `company_id` `null`-ra esik, és a
--   cég neve meg adószáma a sorban marad (`company_name`, `company_tax_number`
--   — a létrehozáskor rögzítve, nem a törléskor visszakeresve);
-- - a törlés pillanata a `contract_ended_at`-be kerül (`before delete` trigger);
-- - a sort a napi takarítás a szerződés megszűnésétől számított **öt év**
--   után törli — ez a Ptk. általános elévülési ideje (6:22. §). Utána a
--   bizonyítéknak nincs mire szolgálnia.
--
-- ⚠️ **Ez szűk kivétel, nem általános megőrzés.** Csak az elfogadás nyoma
-- marad: melyik szöveg, mikor, ki (e-mail-cím), melyik cég nevében. A cég
-- bizonylatai, a kiolvasott adatok és minden más a törléssel ugyanúgy megy,
-- mint eddig. A sort semmi más nem olvassa, és más célra — így a próbaidő
-- újranyitásának kiszűrésére (#39) — **nem** használjuk: az más cél volna,
-- más jogalappal.
--
-- # 2. A cég nélküli, régóta nem használt fiókok törlése (8. pont)
--
-- A cég nélküli fiók (aki regisztrált, de céget sosem hozott létre, vagy
-- kilépett a cégéből) eddig csak a felhasználó saját törlésével szűnt meg —
-- vagyis határozatlan ideig élhetett. Mostantól a napi takarítás törli, ha
-- **180 napja** nem volt belépés (belépés hiányában a regisztráció óta).
--
-- A 2026-09-20-i adattakarítás még azt írta, hogy ehhez „az Auth admin API-ja
-- való, nem egy cron SQL-je". Ezt most **megmértük**: a `postgres` szerepkör
-- törölhet az `auth.users`-ből, és a függő sorok az idegen kulcsok szerint
-- mennek (identitások, munkamenetek kaszkáddal; a naplók és az elfogadások
-- `user_id`-ja `null`-ra esik, az e-mail-cím az elfogadásban marad). A
-- mérés a commit üzenetében áll.

-- ---------------------------------------------------------------------------
-- 1/a. A tábla
-- ---------------------------------------------------------------------------

alter table public.terms_acceptances
  add column if not exists company_name text,
  add column if not exists company_tax_number text,
  add column if not exists contract_ended_at timestamptz;

comment on column public.terms_acceptances.company_name is
  'A cég neve az elfogadáskor. A cég törlése után is megmarad (ÁSZF-bizonyíték).';
comment on column public.terms_acceptances.contract_ended_at is
  'A cég törlésének pillanata. Ettől számított öt év után a belso.adattakaritas() törli a sort.';

-- A meglévő sorok pótlása (2026-09-23-án nulla sor van, de egy friss
-- adatbázison is helyes legyen).
update public.terms_acceptances t
set company_name = c.name,
    company_tax_number = c.tax_number
from public.companies c
where c.id = t.company_id
  and t.company_name is null;

alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_company_id_fkey;

alter table public.terms_acceptances
  alter column company_id drop not null;

alter table public.terms_acceptances
  add constraint terms_acceptances_company_id_fkey
  foreign key (company_id) references public.companies(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 1/b. A szerződés vége
--
-- `before delete`: a sor ekkor még hordozza a `company_id`-t. Az idegen kulcs
-- `set null` művelete a törlés UTÁN fut, tehát ez a sorrend biztosan jó.
-- ---------------------------------------------------------------------------

create or replace function belso.aszf_bizonyitek_lezar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.terms_acceptances
  set contract_ended_at = now()
  where company_id = old.id
    and contract_ended_at is null;

  return old;
end;
$$;

revoke all on function belso.aszf_bizonyitek_lezar() from public, anon, authenticated;

drop trigger if exists aszf_bizonyitek_lezar on public.companies;
create trigger aszf_bizonyitek_lezar
  before delete on public.companies
  for each row execute function belso.aszf_bizonyitek_lezar();

-- ---------------------------------------------------------------------------
-- 1/c. A létrehozás rögzíti a cég nevét és adószámát a bizonyítékban
--
-- A törzs a `20260922000400_adoszam_egyedi.sql`-é, egyetlen változással: a
-- `terms_acceptances` beszúrása két oszloppal bővül. Az aláírás ugyanaz,
-- tehát a jogok megmaradnak.
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
        'Ha a kollégád már regisztrálta a céget, kérj tőle meghívót — '
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

revoke all on function public.ceg_letrehozas(text, text, text) from public, anon;
grant execute on function public.ceg_letrehozas(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. A napi takarítás: két új adatkör
--
-- Az első három lépés változatlan (`20260920000400_adattakaritas.sql`). A
-- számok tükrei a `config/szamlafolyo.ts` `megorzes` blokkjának — a
-- `config/megorzes.test.ts` a LEGUTOLSÓ definíciót olvassa, és méri, hogy a
-- kettő együtt mozog.
-- ---------------------------------------------------------------------------

create or replace function belso.adattakaritas()
returns table (mit text, darab bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  meghivo_nap constant integer := 90;
  level_nap   constant integer := 90;
  nyers_nap   constant integer := 90;
  inaktiv_fiok_nap constant integer := 180;
  aszf_bizonyitek_ev constant integer := 5;
begin
  -- 1. Lezárult meghívók. A „lezárult" pillanata az, amelyik bekövetkezett:
  -- elfogadás, visszavonás, vagy a lejárat. Az élő meghívóhoz nem nyúlunk.
  return query
  with torolt as (
    delete from public.company_invites
    where greatest(
            coalesce(accepted_at, 'epoch'::timestamptz),
            coalesce(revoked_at, 'epoch'::timestamptz),
            expires_at
          ) < now() - make_interval(days => meghivo_nap)
      and (accepted_at is not null or revoked_at is not null or expires_at < now())
    returning 1
  )
  select 'meghivo'::text, count(*)::bigint from torolt;

  -- 2. A beküldött levelek naplója.
  return query
  with torolt as (
    delete from public.inbound_emails
    where created_at < now() - make_interval(days => level_nap)
    returning 1
  )
  select 'level_naplo'::text, count(*)::bigint from torolt;

  -- 3. A nyers modellválasz. A sor marad, az oszlop ürül.
  return query
  with uritett as (
    update public.document_extractions
    set raw_response = null
    where raw_response is not null
      and created_at < now() - make_interval(days => nyers_nap)
    returning 1
  )
  select 'nyers_valasz'::text, count(*)::bigint from uritett;

  -- 4. Cég nélküli, régóta nem használt fiókok. „Cég nélküli": semmilyen
  -- tagsági sora nincs — a függő meghívás is tagsági sor, azt nem bántjuk.
  -- A belépés hiányában a regisztráció napja számít.
  return query
  with torolt as (
    delete from auth.users u
    where not exists (select 1 from public.company_members m where m.user_id = u.id)
      and coalesce(u.last_sign_in_at, u.created_at) < now() - make_interval(days => inaktiv_fiok_nap)
    returning 1
  )
  select 'inaktiv_fiok'::text, count(*)::bigint from torolt;

  -- 5. Az ÁSZF-elfogadás bizonyítéka, a szerződés megszűnése után öt évvel.
  -- Élő cég sorához (contract_ended_at is null) nem nyúl.
  return query
  with torolt as (
    delete from public.terms_acceptances
    where contract_ended_at is not null
      and contract_ended_at < now() - make_interval(years => aszf_bizonyitek_ev)
    returning 1
  )
  select 'aszf_bizonyitek'::text, count(*)::bigint from torolt;
end;
$$;

comment on function belso.adattakaritas() is
  'Napi adattakarítás: lezárult meghívók és levélnapló törlése, a nyers modellválasz ürítése, a cég nélküli inaktív fiókok és a lejárt ÁSZF-bizonyítékok törlése. A határidők a config/szamlafolyo.ts megorzes blokkjának tükrei.';
