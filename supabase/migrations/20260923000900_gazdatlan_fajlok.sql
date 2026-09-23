-- A gazdátlan fájlok selejtezése: amelyikhez már egyetlen bizonylat sem tartozik.
--
-- # Miért most
--
-- A `belso.selejtezheto()` eddig csak olyan fájlt adott ki, amin **van**
-- bizonylat (`20260914000300_selejtezes.sql`: „A gazdátlan fájlok takarítása
-- külön kérdés."). Egy bizonylat nélküli fájl így **soha nem törlődött** – a
-- megőrzési ígéretünkkel szemben. Élesben mérve (2026-09-23) ilyen fájl nincs,
-- de két úton keletkezhet:
--
-- - a Beérkező „Elvetem" gombja egy végleg elbukott (`hiba`) bizonylatnál –
--   ha az volt a fájl utolsó bizonylata;
-- - egy feltöltés, ahol a `files` sor létrejött, a `documents` sor viszont nem
--   (`src/lib/feltoltes.ts`: a két beszúrás két külön kérés).
--
-- # A szabály
--
-- Gazdátlan az a fájl, amelyre **egyetlen** `documents` sor sem mutat, és
-- **egy napnál régebbi**. Az egy nap az eredeti kikötést őrzi: egy épp most
-- feltöltött fájl bizonylatsora a következő pillanatban születik meg, és a
-- selejtező nem viheti el a feltöltő keze alól.
--
-- Csak a napi futásra vonatkozik (`csak_ezek is null`): az exportnál hívott,
-- szűkített alak a most exportált bizonylatok fájljait kérdezi, gazdátlan fájl
-- abban eleve nem lehet.
--
-- Minden más feltétel betű szerint a régi.

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

revoke all on function belso.selejtezheto(uuid, uuid[]) from public, anon;
grant execute on function belso.selejtezheto(uuid, uuid[]) to authenticated, service_role;

comment on function belso.selejtezheto(uuid, uuid[]) is
  'Mely fajlok selejtezhetok: minden bizonylatuk kiment, es eltelt a ceg '
  'turelmi ideje a legkesobbi exportjuk ota; vagy gazdatlanok (egyetlen '
  'bizonylat sem mutat rajuk) es egy napnal regebbiek. Az azonnali torles az '
  'elso szabaly 0 napos hataresete.';
