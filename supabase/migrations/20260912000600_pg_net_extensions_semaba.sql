-- A pg_net a `public` sémába került, mert a `create extension` oda teszi
-- alapértelmezésben. A Supabase linterének igaza van: a `public` a
-- PostgREST-en át közzétett séma, és ami oda kerül, az bővíti a nyilvános
-- felületet. A kiterjesztéseknek külön helyük van.
--
-- A pg_net saját függvényei a `net` sémában élnek (azt maga hozza létre),
-- tehát a `net.http_post` hívás a mozgatás után is ugyanoda mutat — a
-- `belso.sort_hajt()` nevet old fel futásidőben, nem oid-ot.

drop extension if exists pg_net;
create extension pg_net with schema extensions;
