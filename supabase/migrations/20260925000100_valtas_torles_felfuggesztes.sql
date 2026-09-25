-- ---------------------------------------------------------------------------
-- Szolgáltatóváltás: az automatikus törlés felfüggesztése
--
-- # Miért
--
-- Az ÁSZF 16. pontja (Data Act 25. cikk) szerint a szolgáltatóváltási kérés
-- beérkezésétől az adat-visszanyerési időszak végéig az adatok megmaradnak.
-- A napi takarítás viszont erről nem tudott: az eredeti fájlok (export után,
-- a türelmi idővel), az exportfájlok (30 nap), a levélnapló, a lezárult
-- meghívók és a nyers modellválasz (90 nap) a váltás alatt is törlődtek
-- volna. A 2026-09-25-i jogi átnézés 6. pontja találta meg; a tulajdonos
-- döntése: kódban függesztjük fel, nem csak szövegben.
--
-- # Hogyan
--
-- Egy cégszintű időpont: `companies.torles_felfuggesztve_eddig`. Amíg a
-- jövőben van, a cég adataiból semmi nem selejtezhető. A Szolgáltató SQL-lel
-- állítja be, amikor váltási kérés érkezik (eszkozok/torles/OLVASS-EL.md,
-- 3. szakasz): az átállási időszak vége + legalább 30 nap.
--
-- ⚠️ **A felületről nem írható.** A `companies` UPDATE-joga oszlopszinten
-- szűkített (`20260914000100_ceg_oszlopjogok.sql`), és az alapértelmezés a
-- tiltás: az új oszlop nem kerül a `grant update (…)` listába. Ha a
-- tulajdonos maga állíthatná, a megőrzési szabályokat kerülhetné meg vele.
--
-- A három törlő függvény betű szerint a legutóbbi változat, egyetlen új
-- feltétellel. A `config/torlesFelfuggesztes.test.ts` méri, hogy mindhárom
-- **legutolsó** definíciójában ott van — egy későbbi újradefiniálás nem
-- hagyhatja ki csendben.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists torles_felfuggesztve_eddig timestamptz;

comment on column public.companies.torles_felfuggesztve_eddig is
  'Szolgaltatovaltas (ASZF 16.): eddig az idopontig a ceg adataibol semmi nem '
  'torlodik automatikusan (eredeti fajlok, exportfajlok, levelnaplo, lezarult '
  'meghivok, nyers modellvalasz). Csak a service_role irja; a feluletrol nem '
  'irhato (oszlopszintu UPDATE-jog).';

-- ---------------------------------------------------------------------------
-- 1. Az eredeti fájlok (a napi futás és az export pillanata is ezt kérdezi)
-- ---------------------------------------------------------------------------

create or replace function belso.selejtezheto(ceg uuid, csak_ezek uuid[] default null)
returns table (id uuid, storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.id, f.storage_path
  from public.files f
  join public.companies c on c.id = f.company_id
  where f.company_id = ceg
    and f.storage_path is not null
    and f.file_deleted_at is null
    -- Szolgáltatóváltás alatt (ÁSZF 10. és 16. pont) semmit nem selejtezünk,
    -- az export pillanatában sem: a kérés beérkezésétől az adat-visszanyerési
    -- időszak végéig a cég fájljai megmaradnak.
    and (c.torles_felfuggesztve_eddig is null or c.torles_felfuggesztve_eddig <= now())
    -- Szűkítés a most exportált bizonylatok fájljaira. `null` esetén az egész
    -- cég — ezt a napi futás használja.
    and (csak_ezek is null or f.id in (
      select d.file_id from public.documents d where d.id = any(csak_ezek)
    ))
    and (
      (
        -- Van rajta bizonylat. Enélkül egy épp most feltöltött fájl — aminek a
        -- bizonylatsora a következő pillanatban születik meg — üres halmazzal
        -- teljesítené a lenti „mind kiment" feltételt.
        exists (
          select 1 from public.documents m where m.file_id = f.id
        )
        -- ⚠️ Egy fájl csak akkor törölhető, ha a benne lévő **összes**
        -- bizonylat kiment. A `duplikatum` sorok nem tartják életben.
        and not exists (
          select 1
          from public.documents m
          where m.file_id = f.id
            and m.status not in ('exportalva', 'duplikatum')
        )
        -- És eltelt a türelmi idő a **legkésőbbi** exporttól.
        and (
          select max(x.created_at)
          from public.documents m
          join public.exports x on x.id = m.export_id
          where m.file_id = f.id
        ) + (c.file_retention_days * interval '1 day') <= now()
      )
      or (
        -- Gazdátlan: egyetlen bizonylat sem mutat rá, és egy napnál régebbi.
        csak_ezek is null
        and not exists (
          select 1 from public.documents m where m.file_id = f.id
        )
        and f.created_at < now() - interval '1 day'
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- 2. Az exportfájlok
-- ---------------------------------------------------------------------------

create or replace function belso.selejtezheto_export(ceg uuid)
returns table (id uuid, file_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select x.id, x.file_path
  from public.exports x
  join public.companies c on c.id = x.company_id
  where x.company_id = ceg
    and x.file_path is not null
    and x.file_deleted_at is null
    and x.created_at + interval '30 days' <= now()
    -- Szolgáltatóváltás alatt nem selejtezünk (ÁSZF 10. és 16. pont).
    and (c.torles_felfuggesztve_eddig is null or c.torles_felfuggesztve_eddig <= now())
$$;

-- ---------------------------------------------------------------------------
-- 3. A napi adattakarítás: a három cégszintű lépés kap feltételt. A cég
-- nélküli fiókok és a megszűnt szerződések bizonyítéka nem cégszintű.
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
      and not exists (
        select 1 from public.companies c
        where c.id = company_invites.company_id and c.torles_felfuggesztve_eddig > now()
      )
    returning 1
  )
  select 'meghivo'::text, count(*)::bigint from torolt;

  -- 2. A beküldött levelek naplója.
  return query
  with torolt as (
    delete from public.inbound_emails
    where created_at < now() - make_interval(days => level_nap)
      and not exists (
        select 1 from public.companies c
        where c.id = inbound_emails.company_id and c.torles_felfuggesztve_eddig > now()
      )
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
      and not exists (
        select 1 from public.companies c
        where c.id = document_extractions.company_id and c.torles_felfuggesztve_eddig > now()
      )
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
