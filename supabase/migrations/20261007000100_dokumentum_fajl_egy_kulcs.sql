-- ---------------------------------------------------------------------------
-- A bizonylat és a fájl között egyetlen külső kulcs legyen
--
-- A `20261001000200` mellé tette az összetett kulcsot
-- (`documents_fajl_a_sajat_cegbol`: `(file_id, company_id) → files(id,
-- company_id)`), a régi `documents_file_id_fkey`-t viszont meghagyta. Két
-- kapcsolat a két tábla között a PostgREST-nek kétértelmű: minden `files(…)`
-- beágyazás **HTTP 300**-at kapott (PGRST201) — a Beérkező lista, az
-- Ellenőrzés, az Export és a kiolvasó claim-je is. Mérve az API-naplóban
-- 2026-10-07-én: a claim `PATCH`-e percenként 300, a feltöltött bizonylat
-- `feltoltve` állapotban állt, `attempts = 0`.
--
-- A régi kulcs elhagyható, mert az új szigorúan erősebb: a `file_id` és a
-- `company_id` is `NOT NULL`, tehát minden sor, ami az összetett kulcsot
-- teljesíti, a régit is; a törlés mindkettőnél `cascade`.
-- ---------------------------------------------------------------------------

set local lock_timeout = '5s';

alter table public.documents drop constraint documents_file_id_fkey;

-- A PostgREST a sémát gyorsítótárazza; az új kapcsolatkép azonnal éljen.
notify pgrst, 'reload schema';
