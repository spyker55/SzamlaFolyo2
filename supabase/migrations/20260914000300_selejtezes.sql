-- Az eredeti fájlok selejtezése — a türelmi idővel együtt.
--
-- # Miért kellett ez a kör
--
-- A Beállítások képernyő felkínálja a 0–7 napos megőrzést, és így érvel
-- mellette: „Ami nincs meg, azt nem is lehet kiszivárogtatni." Ez a mondat
-- eddig **nem volt igaz** minden 0-nál nagyobb értékre.
--
-- Az ok egy komment volt a kliensben (`src/lib/export.ts`), aminek a védelme
-- közben megszűnt:
--
--     // ⚠️ … jelenleg ide nem is juthat senki, mert az alapérték 0 nap,
--     // és a Beállítások képernyő még nem létezik.
--     if (megorzesiNapok > 0) return 0;
--
-- A képernyő azóta létezik, ütemezett selejtezés viszont nem volt: aki türelmi
-- időt állított be, annak az eredeti fájlja **soha nem törlődött**. Ez nem
-- elméleti hiba volt — a próbafiókban egy idegen cég számlája maradt így a
-- tárolóban.
--
-- # A megoldás alakja
--
-- A döntés a **szerverre** kerül, a kliensből eltűnik. A böngésző csak akkor
-- fut, ha valaki épp nézi; egy adatvédelmi ígéretet nem lehet arra bízni.

-- ---------------------------------------------------------------------------
-- belso.selejtezheto — a szabály, egyetlen helyen
--
-- Ez a függvény **egyesíti a két esetet**: az azonnali törlés nem külön ág,
-- hanem a türelmi idő 0 napos esete. Ezért ugyanezt hívja az `export_rogzit`
-- (a most exportált fájlokra szűkítve) és a napi selejtező (az egész cégre) —
-- és így a kettő nem tud széttartani.
--
-- **`security invoker`**, és ez a `ceg` paraméter biztonsága is egyben:
--
--   * az `export_rogzit`-en át a belépett felhasználó jogaival fut, tehát az
--     RLS úgyis csak a saját cége fájljait adja — idegen azonosítóra üres sort;
--   * a napi selejtező `service_role`-lal hív, ami eleve mindent lát.
--
-- Ugyanaz a megfontolás, mint a `keret_adatok(ceg_id)`-nál. A függvény a
-- `belso` sémában él, ami **nincs közzétéve** a PostgREST-en — az EXECUTE
-- viszont megmarad az `authenticated`-nek, különben az `export_rogzit`
-- (`security invoker`) nem tudná meghívni.
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
    -- Szűkítés a most exportált bizonylatok fájljaira. `null` esetén az egész
    -- cég — ezt a napi futás használja.
    and (csak_ezek is null or f.id in (
      select d.file_id from public.documents d where d.id = any(csak_ezek)
    ))
    -- Van rajta bizonylat. Enélkül egy épp most feltöltött fájl — aminek a
    -- bizonylatsora a következő pillanatban születik meg — üres halmazzal
    -- teljesítené a lenti „mind kiment" feltételt, és a selejtező elvinné a
    -- feltöltő keze alól. A gazdátlan fájlok takarítása külön kérdés.
    and exists (
      select 1 from public.documents m where m.file_id = f.id
    )
    -- ⚠️ A régi rendszer hibaosztálya: „az egyik exportja elviszi a többi mögül
    -- a papírt". Egy fájl csak akkor törölhető, ha a benne lévő **összes**
    -- bizonylat kiment. A `duplikatum` sorok nem tartják életben: azok csak azt
    -- jelölik, hogy ugyanezt a tartalmat egyszer már feltöltötték.
    and not exists (
      select 1
      from public.documents m
      where m.file_id = f.id
        and m.status not in ('exportalva', 'duplikatum')
    )
    -- És eltelt a türelmi idő. A **legkésőbbi** exporttól számolunk: ha egy
    -- tételt visszahívtak az Archívumból és újra exportáltak, az óra
    -- újraindul. Ez a „N nappal az export után" helyes olvasata — a fájl attól
    -- kell, hogy vissza lehessen nézni bele, és a visszahívás pont ezt jelenti.
    --
    -- Nulla napnál a feltétel `max(...) <= now()`, ami az exportot rögzítő
    -- tranzakción belül is teljesül. Így lesz az azonnali törlés ugyanennek a
    -- szabálynak a határesete, nem külön kód.
    and (
      select max(x.created_at)
      from public.documents m
      join public.exports x on x.id = m.export_id
      where m.file_id = f.id
    ) + (c.file_retention_days * interval '1 day') <= now()
$$;

-- Az `anon`-tól elvesszük — bejelentkezés nélkül nincs cég, tehát nincs mit
-- kérdezni sem. Az `authenticated` jogát **nem**: azon át hívja az
-- `export_rogzit`, és az RLS úgyis a saját cégére szűkíti.
revoke all on function belso.selejtezheto(uuid, uuid[]) from public, anon;
grant execute on function belso.selejtezheto(uuid, uuid[]) to authenticated, service_role;

comment on function belso.selejtezheto(uuid, uuid[]) is
  'Mely fajlok selejtezhetok: minden bizonylatuk kiment, es eltelt a ceg '
  'turelmi ideje a legkesobbi exportjuk ota. Az azonnali torles ennek a '
  'szabalynak a 0 napos hataresete.';

-- ---------------------------------------------------------------------------
-- public.selejtezendo_fajlok — a napi futás egyetlen kérdése
--
-- A `belso` séma **nincs közzétéve** a PostgREST-en, tehát az Edge Function nem
-- tudja közvetlenül hívni a `selejtezheto()`-t. Ez a vékony burkoló a
-- `public`-ban áll, végigmegy a cégeken, és egyetlen listát ad vissza — így a
-- függvény egy kérdést tesz fel, nem cégenként egyet.
--
-- A jogosultság **csak a `service_role`-é**. A `revoke ... from public`
-- önmagában kevés: a Supabase minden új `public` függvényre nevesített EXECUTE
-- jogot ad az `anon`-nak és az `authenticated`-nek, azt pedig csak nevesítve
-- lehet visszavenni. Egy felhasználónak semmi dolga a selejtezési listával —
-- az övét az export úgyis megkapja.
-- ---------------------------------------------------------------------------

create or replace function public.selejtezendo_fajlok()
returns table (id uuid, company_id uuid, storage_path text)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.id, c.id, s.storage_path
  from public.companies c
  cross join lateral belso.selejtezheto(c.id) s
$$;

revoke all on function public.selejtezendo_fajlok() from public, anon, authenticated;
grant execute on function public.selejtezendo_fajlok() to service_role;

comment on function public.selejtezendo_fajlok() is
  'A napi selejtezes listaja minden cegre. Csak a service_role hivhatja.';

-- ---------------------------------------------------------------------------
-- export_rogzit — a selejtezési blokk lecserélése a közös szabályra
--
-- A függvény többi része változatlan; csak a `torolheto` lekérdezés kerül át a
-- `belso.selejtezheto()`-re. Ezzel az export is **tiszteletben tartja a
-- türelmi időt**, ami eddig a kliens dolga volt (és pont ott hiúsult meg).
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

  -- A selejtezés szabálya egyetlen helyen áll (`belso.selejtezheto`), és a
  -- türelmi idő is benne van. Nulla napos megőrzésnél ez ugyanaz az azonnali
  -- lista, mint korábban; hosszabbnál üres, és a napi selejtező viszi el
  -- később. A kliens nem dönt róla, csak végrehajtja.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', s.id, 'storage_path', s.storage_path)),
           '[]'::jsonb
         )
    into torolheto
  from belso.selejtezheto(ceg, dokumentum_idk) s;

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

revoke all on function public.export_rogzit(text, jsonb, text, text, bigint, uuid[])
  from public, anon;
grant execute on function public.export_rogzit(text, jsonb, text, text, bigint, uuid[])
  to authenticated;

-- ---------------------------------------------------------------------------
-- A napi selejtezés hajtása
--
-- Szó szerint a `belso.sort_hajt()` mintája, és a döntései is ugyanazok:
-- a titkok a **Vaultból** jönnek (egy cron-definíció olvasható, egy ott
-- felejtett kulcs csendben marad ott örökre), és ha a titok hiányzik, a
-- függvény **nem hibázik, hanem nem csinál semmit**.
-- ---------------------------------------------------------------------------

create or replace function belso.selejtezest_hajt()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  alap text;
  kulcs text;
begin
  select decrypted_secret into alap from vault.decrypted_secrets where name = 'projekt_url';
  select decrypted_secret into kulcs from vault.decrypted_secrets where name = 'service_role_kulcs';

  if alap is null or kulcs is null then
    return;
  end if;

  perform net.http_post(
    url := alap || '/functions/v1/selejtez',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || kulcs
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function belso.selejtezest_hajt() from public, anon, authenticated;

-- Naponta egyszer, hajnalban. A türelmi idő napokban mérődik, tehát sűrűbben
-- futtatni értelmetlen; ritkábban viszont az „azonnal" nem lenne azonnal —
-- azt az export maga intézi, ez a futás a türelmi idősöket szedi fel.
select cron.schedule(
  'szamlafolyo-selejtezes',
  '17 3 * * *',
  $$select belso.selejtezest_hajt()$$
);
