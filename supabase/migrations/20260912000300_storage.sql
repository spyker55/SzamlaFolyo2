-- SzámlaFolyó — fájltárolás
--
-- A régi rendszerben a feltöltött fájlok a webgyökéren **kívül** voltak, és
-- egyetlen jogosultságellenőrzött útvonalon át lehetett hozzájuk férni. Ennek
-- a Supabase-beli megfelelője: **privát bucket + aláírt URL**.
--
-- Az útvonal első szegmense a cég azonosítója (`<company_id>/<file_id>.<kit>`),
-- és a politika ezt veti össze a belépett felhasználó cégeivel. A bizonylat
-- tehát nem attól védett, hogy az URL kitalálhatatlan — kitalálható URL-ből is
-- 403 jön.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bizonylatok',
  'bizonylatok',
  false,
  -- 20 MB, ugyanaz a szám, mint a `config/szamlafolyo.ts`-ben. A bucket
  -- korlátja a végső fék: a kliensoldali ellenőrzés kényelem, ez a szabály.
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/xml',
    'application/xml'
  ]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ⚠️ Miert ekezet nelkuliek EZEN a tablan a politikanevek
--
-- A 20260921-i korben a tobbi 24 politika ekezetes nevet kapott: a repo es az
-- elo adatbazis addig ket kulonbozo helyesirast hasznalt, es egy
-- `drop policy if exists "…ekezetes…"` emiatt tudott NEMAN meghiusulni.
--
-- A storage.objects negy politikajat viszont **nem lehet atnevezni**. Merve:
-- a tabla tulajdonosa a `supabase_storage_admin`, es az `alter policy … rename`
-- tulajdonosi jogot kivan. Sem az MCP szerepe, sem a `postgres` nem tagja annak
-- a szerepnek — `pg_has_role('postgres','supabase_storage_admin','MEMBER')`
-- mindharom valtozatra `false` —, tehat az SQL-editorbol sem megy.
-- (`ERROR 42501: must be owner of table objects`.)
--
-- Ezert ez a negy nev ASCII marad, es a repo ezt **kimondja**, nem szepiti:
-- a cel az volt, hogy a repo es az eles egyezzen, nem az, hogy szep legyen.
-- Aki egyszer megis atnevezi oket (a dashboard Storage -> Policies felulete
-- eselyes ra, de innen nem mertuk), az ITT is irja at a neveket.
-- ---------------------------------------------------------------------------

create policy "A tag letolti a cege bizonylatait"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bizonylatok'
    and ((storage.foldername(name))[1])::uuid in (select public.tag_cegei())
  );

create policy "Bizonylatot a szerkeszto tolt fel"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

create policy "Bizonylatfajlt a szerkeszto cserel"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

-- A selejtezés (`fajl:selejtez` megfelelője) `service_role`-lal fut, az
-- megkerüli ezt — de az ember is törölhet, ha a cégében szerkesztő.
create policy "Bizonylatfajlt a szerkeszto torol"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );
