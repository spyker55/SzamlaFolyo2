-- SzámlaFolyó — export
--
-- Két dolog kell hozzá: egy hely az elkészült export fájloknak, és **egy
-- tranzakció**, ami a tételeket átjelöli.
--
-- Az export sorrendje kötött, mert visszafordíthatatlan lépés van benne:
--
--   1. az export fájl elkészül és felkerül a tárolóba,
--   2. a tételek egy tranzakcióban megkapják az `export_id`-t,
--   3. és **csak ezután** törlődnek az eredeti fájlok.
--
-- Fordított sorrendben egy félbemaradt export után a bizonylat képe is odalenne,
-- és az adat is. Így a legrosszabb eset egy gazdátlan fájl a tárolóban:
-- takarítható, és nem hazudik senkinek.

-- ---------------------------------------------------------------------------
-- Az `exportok` bucket
--
-- Ugyanaz a szerkezet, mint a `bizonylatok`-nál: privát bucket, az útvonal első
-- szegmense a cég azonosítója, és a politika ezt veti össze a belépett
-- felhasználó cégeivel. Kitalálható URL-ből is 403 jön.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exportok',
  'exportok',
  false,
  -- 50 MB. Egy havi export néhány száz kilobájt; ez a felső korlát azért van,
  -- hogy a bucket ne lehessen általános tárhely.
  52428800,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do nothing;

create policy "A tag letolti a ceg exportjait"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exportok'
    and ((storage.foldername(name))[1])::uuid in (select belso.tag_cegei())
  );

create policy "Exportfajlt a szerkeszto tolt fel"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exportok'
    and belso.szerkeszthet(((storage.foldername(name))[1])::uuid)
  );

-- Az export fájl törlése az archívumból való törlést jelenti, az pedig
-- számviteli következménnyel járó lépés — a tulajdonosé.
create policy "Exportfajlt a tulajdonos torol"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exportok'
    and belso.adminisztralhat(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- export_rogzit — a 2. lépés, egyetlen tranzakcióban
--
-- **`security invoker`**, vagyis az RLS a hívóra ugyanúgy érvényes: ez a
-- függvény nem ad több jogot annál, mint amivel a felhasználó amúgy is
-- rendelkezik. Az egyetlen dolog, amit hozzátesz, az az **atomiság** — és az a
-- szabály, hogy melyik fájl törölhető.
--
-- Azonosítókat kap, nem szűrőket, és ez szándékos: a fájl pontosan azokból a
-- sorokból készült, amiket a képernyő mutatott. Ha a függvény újra lekérdezne,
-- a fájl és az átjelölés szétcsúszhatna.
-- ---------------------------------------------------------------------------

create or replace function public.export_rogzit(
  formatum text,
  szurok jsonb,
  fajl_utvonal text,
  fajl_nev text,
  fajl_bajt bigint,
  dokumentum_idk uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  keres integer := coalesce(array_length(dokumentum_idk, 1), 0);
  cegek integer;
  ceg uuid;
  uj_export uuid;
  atjelolt integer;
  torolheto jsonb;
begin
  if formatum not in ('xlsx', 'csv', 'json') then
    raise exception 'Ismeretlen exportformátum: %', formatum;
  end if;

  if keres = 0 then
    raise exception 'Nincs exportálható tétel.';
  end if;

  -- A cég a tételekből derül ki, nem a kliens állításából. Az RLS miatt itt
  -- csak a sajátjai látszanak — ami másé, az nulla sorként jelenik meg, és a
  -- lentebbi darabszám-ellenőrzésen bukik el.
  -- `min()` nincs uuid-re, a `array_agg(distinct …)` viszont rendezve ad vissza.
  select count(distinct d.company_id), (array_agg(distinct d.company_id))[1]
    into cegek, ceg
  from public.documents d
  where d.id = any(dokumentum_idk);

  if cegek <> 1 then
    raise exception 'A tételek nem egy céghez tartoznak.';
  end if;

  insert into public.exports (
    company_id, format, filters, item_count, file_path, file_name, file_bytes, created_by
  )
  values (
    ceg, formatum, szurok, keres, fajl_utvonal, fajl_nev, fajl_bajt, (select auth.uid())
  )
  returning id into uj_export;

  update public.documents d
     set export_id = uj_export,
         status = 'exportalva'
   where d.id = any(dokumentum_idk)
     and d.company_id = ceg
     and d.status = 'jovahagyva'
     and d.export_id is null;

  get diagnostics atjelolt = row_count;

  -- ⚠️ Ez nem formaság. Pont azt fogja meg, ha közben valaki visszaküldött egy
  -- tételt javításra, vagy egy másik fül már exportálta. Ilyenkor **semmi nem
  -- történik** — nem keletkezik olyan export, aminek a tartalma más, mint a
  -- fájl, amit a felhasználó a kezében tart.
  if atjelolt <> keres then
    raise exception
      'Közben megváltozott a lista: % tételből % jelölhető át. Az export nem készült el.',
      keres, atjelolt;
  end if;

  -- A selejtezés szabálya, **egy helyen kimondva**: egy fájl akkor törölhető,
  -- ha a benne lévő összes bizonylat kiment. Ez volt a régi rendszer
  -- hibaosztálya — „az egyik exportja elviszi a többi mögül a papírt".
  --
  -- A `duplikatum` sorok nem tartják életben a fájlt: azok csak azt jelölik,
  -- hogy ugyanezt a tartalmat egyszer már feltöltötték, tartalmuk nincs.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', f.id, 'storage_path', f.storage_path)),
           '[]'::jsonb
         )
    into torolheto
  from public.files f
  where f.company_id = ceg
    and f.storage_path is not null
    and f.file_deleted_at is null
    and f.id in (
      select d.file_id from public.documents d where d.id = any(dokumentum_idk)
    )
    and not exists (
      select 1
      from public.documents m
      where m.file_id = f.id
        and m.status not in ('exportalva', 'duplikatum')
    );

  insert into public.activity_log (
    company_id, user_id, action, subject_type, subject_id, summary, context
  )
  values (
    ceg,
    (select auth.uid()),
    'export.keszult',
    'export',
    uj_export,
    keres || ' tétel · ' || upper(formatum),
    jsonb_build_object('formatum', formatum, 'szurok', szurok)
  );

  return jsonb_build_object(
    'export_id', uj_export,
    'darab', keres,
    'torolheto', torolheto
  );
end;
$$;

-- A `revoke ... from public` önmagában kevés: a Supabase minden új `public`
-- függvényre **nevesített** EXECUTE jogot ad az `anon` és az `authenticated`
-- szerepnek, azt pedig csak nevesítve lehet visszavonni. Exportáláshoz belépés
-- kell — a szerepet ezen belül az RLS dönti el.
revoke all on function public.export_rogzit(text, jsonb, text, text, bigint, uuid[])
  from public, anon;
grant execute on function public.export_rogzit(text, jsonb, text, text, bigint, uuid[])
  to authenticated;

-- A Tételek és az Export képernyő ugyanazt a halmazt kérdezi: jóváhagyott,
-- még nem exportált bizonylatok, beérkezés szerint szűrve.
create index if not exists documents_exportalhato_idx
  on public.documents (company_id, created_at)
  where status = 'jovahagyva' and export_id is null;
