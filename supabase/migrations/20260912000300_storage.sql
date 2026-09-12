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

create policy "A tag letölti a cége bizonylatait"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bizonylatok'
    and ((storage.foldername(name))[1])::uuid in (select public.tag_cegei())
  );

create policy "Bizonylatot a szerkesztő tölt fel"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

create policy "Bizonylatfájlt a szerkesztő cserél"
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
create policy "Bizonylatfájlt a szerkesztő töröl"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bizonylatok'
    and public.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );
