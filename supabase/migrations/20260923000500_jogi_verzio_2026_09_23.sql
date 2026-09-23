-- A 2026-09-23-i jogi szövegváltozat — és mostantól a szövegek lenyomata is.
--
-- # Miért kell lenyomat
--
-- A `terms_acceptances.version` egy dátum. A dátum azt mondja meg, *melyik*
-- változatot fogadta el valaki, de azt nem, *mi állt benne*: a mindenkori
-- weboldal mindig a mai szöveget mutatja (jogi felülvizsgálat, harmadik kör,
-- 5. pont). Ezért minden kiadott változat teljes, renderelt szövege a repóban
-- él (`jogi-archivum/<verzió>/<dokumentum>.html`, gitben, időbélyeggel), és a
-- lenyomatuk itt, a verzió sorában. A lánc: elfogadás → verzió → lenyomat →
-- archivált fájl.
--
-- A `src/oldalak/jogi/archivum.test.tsx` méri mindkét irányt: hogy a mai
-- szöveg egyezik a mai verzió archívumával, és hogy az archívum lenyomatai
-- egyeznek az itt rögzítettekkel.
--
-- # A három verzió
--
-- - `2026-09-20`: archívum nincs. A változathoz **egyetlen elfogadás sem
--   tartozik** (2026-09-23-án a `terms_acceptances` üres), a lenyomat helye
--   ezért `null` marad — kitalálni nem fogunk.
-- - `2026-09-22`: a `82b2b50` commitból renderelve, ami 2026-09-23 reggel az
--   éles oldalt kiszolgálta. ⚠️ A változat szövege 2026-09-22 folyamán a
--   verziódátum módosítása nélkül is változott (a második kör pontjai egy
--   napon mentek ki) — az archívum a **nap végi** állapotot őrzi. Ez az
--   oka annak, hogy 2026-09-23 óta teszt tiltja a verzióváltás nélküli
--   szövegváltozást.
-- - `2026-09-23`: a harmadik kör szövege.
--
-- ⚠️ Egy sort itt nem írunk át és nem törlünk: a meglévő elfogadások
-- hivatkozzák. Új szöveg = új sor.

alter table public.legal_versions
  add column if not exists aszf_sha256 text,
  add column if not exists adatkezeles_sha256 text,
  add column if not exists impresszum_sha256 text;

comment on column public.legal_versions.aszf_sha256 is
  'A jogi-archivum/<version>/aszf.html SHA-256 lenyomata. null = a változatról nincs archívum.';

update public.legal_versions
set aszf_sha256 = 'f17e5502ae9f7e1a9a1434db06999d4227c61ef087738299554bd4399e1d99b6',
    adatkezeles_sha256 = '30d932bc45a872ef6264c816b8b2b7b2c1bd321835ee81d2af46284a79f85a98',
    impresszum_sha256 = '648900544d7e017541de713fbab760fe47876c41c4568c4d37f2f65ca30bdd3c'
where version = '2026-09-22'
  and aszf_sha256 is null;

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-23',
  date '2026-09-23',
  '1b8b1514d3d1d341ffb0a9adba576475cdba93d199c818820e4669c60f3aefae',
  'ed74bc73c2df7e1a5c236804204bdbd164c3aeaac0562f7c681f3ddde6fabf2e',
  '59a5a6125fb3e74dfb75b79b4175b5661efeb10a038c58a182d592e46c54ad21'
)
on conflict (version) do nothing;
