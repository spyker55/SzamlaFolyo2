-- Az export fájlok selejtezése — 30 nap, nem állítható.
--
-- # Miért kellett ez a kör
--
-- Az eredeti fájlokra van megőrzési idő (`20260914000300`), az **exportokra
-- nem volt semmi**. Mérve: öt export négy napon át a tárolóban, mindegyiken
-- élő `file_path`, és a két ütemezett feladat közül egyik sem nyúlt hozzájuk —
-- a napi selejtező csak a `files.storage_path`-t nézi, az `exports` táblához
-- pedig kizárólag azért, hogy a türelmi időhöz kiolvassa a `max(created_at)`-et.
--
-- Vagyis az export fájl a feltöltése pillanatától **korlátlan ideig** maradt.
-- Ez nem volt hazugság — az Adatkezelési tájékoztató 4. pontja nem is említette
-- az exportot —, de pontosan az a csend volt, amit ebben a projektben nem
-- hagyunk: az export xlsx ugyanazokat a szállítóneveket, adószámokat és
-- összegeket viszi, amikért az eredetire hét napos plafont tettünk.
--
-- # Miért fix 30 nap, és miért nem állítható
--
-- A `file_retention_days` azért cégenkénti, mert ott a rövidebb idő a
-- felhasználó **kényelmét** sérti: az eredeti papírba nem tud visszanézni, ha
-- már nincs meg. Itt nincs mit mérlegelni — az export bármikor újrakészíthető a
-- Tételekből, tehát a hosszabb tárolás senkinek nem ad semmit, csak nekünk
-- kockázatot. Egy kapcsoló, aminek csak rossz állása van, nem választás.
--
-- ⚠️ A 30 a `config/szamlafolyo.ts` `megorzes.exportNap` értékének a tükre. Egy
-- napi cron nem tud TS-configot olvasni, tehát a szám két helyen áll — ugyanaz
-- a tükrözés, mint a `maxNap` és a `file_retention_days` CHECK-je között. Ha
-- változik, **mindkét helyen** változik.

-- ---------------------------------------------------------------------------
-- 1. Az oszlop, ami a félbemaradt törlést láthatóvá teszi
--
-- Szó szerint a `files.file_deleted_at` szerepe, ugyanabból az okból: a
-- selejtezés három lépése (jelöl → tárolóból töröl → mutatót ürít) csak akkor
-- folytatható egy megszakadt futás után, ha az első lépés **nyomot hagy**.
-- Enélkül a sor megkülönböztethetetlen lenne egy még élő exporttól.
-- ---------------------------------------------------------------------------

alter table public.exports
  add column if not exists file_deleted_at timestamptz;

comment on column public.exports.file_deleted_at is
  'Mikor jart le az export fajl megorzese. A sor megmarad (audit-nyom: mi, '
  'mikor, mennyi tetellel ment ki) - csak a bajtok tunnek el.';

-- ---------------------------------------------------------------------------
-- 2. A szabály, egyetlen helyen
--
-- Ugyanaz az alak, mint a `belso.selejtezheto()`-nél, és ugyanazért
-- `security invoker`: a `service_role` eleve mindent lát, egy felhasználó
-- jogán pedig az RLS úgyis a saját cégére szűkít. A `belso` séma nincs
-- közzétéve a PostgREST-en, tehát kívülről közvetlenül nem hívható.
--
-- A `files` párjához képest **egyszerűbb**, és ez nem hanyagság: ott a
-- „minden bizonylata kiment" feltétel és a legkésőbbi exporttól induló óra
-- kellett, mert egy fájl mögött több bizonylat állhat, és egy visszahívás
-- újraindítja az órát. Egy export fájl mögött nincs ilyen: a saját
-- keletkezésétől számol, és kész.
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
  where x.company_id = ceg
    and x.file_path is not null
    and x.file_deleted_at is null
    and x.created_at + interval '30 days' <= now()
$$;

revoke all on function belso.selejtezheto_export(uuid) from public, anon, authenticated;
grant execute on function belso.selejtezheto_export(uuid) to service_role;

comment on function belso.selejtezheto_export(uuid) is
  'Mely export fajlok selejtezhetok: 30 napnal regebbiek. Fix ido, cegenkent '
  'nem allithato - az export barmikor ujrakesziteto a Tetelekbol.';

-- ---------------------------------------------------------------------------
-- 3. A napi futás egyetlen kérdése — a `selejtezendo_fajlok()` párja
-- ---------------------------------------------------------------------------

create or replace function public.selejtezendo_exportok()
returns table (id uuid, company_id uuid, file_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, c.id, s.file_path
  from public.companies c
  cross join lateral belso.selejtezheto_export(c.id) s
$$;

revoke all on function public.selejtezendo_exportok() from public, anon, authenticated;
grant execute on function public.selejtezendo_exportok() to service_role;

comment on function public.selejtezendo_exportok() is
  'A napi export-selejtezes listaja minden cegre. Csak a service_role hivhatja.';

-- ---------------------------------------------------------------------------
-- 4. ⚠️ A rés, ami nélkül a 30 nap csak ajánlás volna
--
-- Az `exports` táblán a szerkesztőnek UPDATE, a tulajdonosnak DELETE politikája
-- volt, és a táblaszintű grant **minden oszlopra** szólt — a `created_at`-re is.
-- Ez ugyanaz a hibaosztály, amit a `companies`-on már egyszer javítottunk
-- (`20260914000100`): az RLS **sorokat** korlátoz, oszlopokat nem.
--
-- Megmérve, nem feltételezve: valódi tulajdonos jogaival, visszagörgetett
-- tranzakcióban a
--
--     update public.exports set created_at = now() + interval '365 days'
--
-- **átment**, és a sor egy évvel későbbre került. Vagyis az ügyfél egyetlen
-- PATCH kéréssel felülírhatta volna azt a megőrzési időt, amit a tájékoztató
-- tényként állít. Egy ígéret, amit a címzettje kikapcsolhat, nem ígéret.
--
-- A DELETE ugyanígy az ígéret ellen dolgozik, csak a másik irányból: a sor
-- eltűnésével a tárolóban lévő objektum **gazdátlanná** válik, és onnantól
-- semmi nem viszi el — pont az marad ott örökre, amit törölni ígérünk.
--
-- Mindkettő elmehet, mert **egyikre sincs szükség**: a kliens az `exports`
-- táblára kizárólag `select`-et futtat (`src/lib/export.ts`), a beszúrást pedig
-- az `export_rogzit` végzi. Az INSERT és a SELECT ezért érintetlen marad.
-- ---------------------------------------------------------------------------

-- ⚠️ A politikákat **nem névre hivatkozva** ejtjük, és ennek mért oka van.
-- Az első próbálkozás `drop policy if exists "Exportot a szerkesztő módosít"`
-- volt — és **némán nem csinált semmit**, mert az élő adatbázisban a politika
-- `Exportot a szerkeszto modosit` néven áll: ékezet nélkül. A hex kiírás
-- eldöntötte (`length = octet_length` minden névre), és nem egyedi eset:
-- a 33 politikából **31 ékezetmentes**, vagyis a korábbi migrációk ékezetei
-- nem élték túl az alkalmazást.
--
-- A név csak címke, viselkedést nem hordoz — a repó és az élő adatbázis
-- eltérése viszont igen, mert pont az ilyen `if exists` csendben hiúsul meg.
-- Ezért itt a **szándékot** mondjuk ki, nem a helyesírást: az `exports` táblán
-- ne maradjon UPDATE vagy DELETE politika, akárhogy is hívják.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'exports' and cmd in ('UPDATE', 'DELETE')
  loop
    execute format('drop policy %I on public.exports', r.policyname);
  end loop;
end;
$$;

-- A politika elvétele önmagában kevés: a jog a grantben is ott ül, és a
-- Supabase minden táblára nevesített jogot ad az `anon`-nak és az
-- `authenticated`-nek — azt csak nevesítve lehet visszavenni. (Ez a sor
-- egyébként **lefutott** akkor is, amikor a fenti két `drop` nem: a mérés
-- szerint a támadás már ezen elbukott, `permission denied for table exports`.)
revoke update, delete on public.exports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. A cron marad, ahol van
--
-- A `szamlafolyo-selejtezes` (03:17) ugyanazt a `selejtez` függvényt hívja;
-- az bővül az export ágával. Új ütemezés nem kell: a megőrzés itt is napokban
-- mérődik, és egy második hajnali futás csak még egy hely lenne, ahol
-- széttarthat a kettő.
-- ---------------------------------------------------------------------------
