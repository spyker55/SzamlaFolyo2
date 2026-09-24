-- Könyvelőprogram-export: a kontír-beállítás táblája és az új formátumok.
--
-- # Mit és miért
--
-- A táblázatos export (xlsx, csv, json) mellé könyvelőprogramba tölthető
-- fájlok jönnek: RLB Kettős, Novitax NTAX, Kulcs-Könyvelés
-- (`shared/uzleti/export/konyvelo/`). Mindhárom főkönyvi számokat kér, amit
-- **a könyvelő** dönt el, nem mi – ezt tárolja a `konyvelo_beallitasok`.
--
-- # A beállítás hatóköre
--
-- Ügyfelenként egy sor (`ugyfel_torzsszam`), és egy cégszintű alapsor
-- (`ugyfel_torzsszam is null`). Egy iroda ügyfelenként más számlatükröt
-- vezethet; akinek egy cége van, annak az alapsor elég. **Nem programonként:**
-- a főkönyvi számok ugyanazok, akármelyik programba megy a fájl; a
-- program-specifikus részek (Novitax-napló, Kulcs-ÁFA-kódok) a `jsonb` saját
-- ágaiban vannak. A szerkezetet a TS oldal tisztítja (`beallitas.ts`,
-- `tisztit()`); itt csak azt tartjuk kint, ami biztosan szemét.
--
-- Írni a `konyvelo_beallitas_ment()` ír – a PostgREST-es upsert az összes
-- küldött oszlopra UPDATE-jogot kérne, a cégazonosítóra is, azt pedig nem
-- adunk.
--
-- # Az export formátumlistája
--
-- A kényszer és az `export_rogzit()` ellenőrzése bővül. A függvény törzse
-- betű szerint a `20260914000300_selejtezes.sql` változata, csak a lista
-- más. (Élesben a korábbi változat megjegyzések nélkül ment ki – md5
-- f19dd743fea9331e6052b131882c9d0e, 1963 karakter –, a logikája a repóéval
-- azonos; ez a migráció a megjegyzésekkel együtt cseréli le.)
-- A lista a TS-ben: `src/lib/export.ts` (`Formatum`) és `beallitas.ts`
-- (`PROGRAMOK`); a `konyvelo/migracio.test.ts` méri, hogy együtt mozognak.

create table if not exists public.konyvelo_beallitasok (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ugyfel_torzsszam text check (ugyfel_torzsszam ~ '^[0-9]{8}$'),
  beallitas jsonb not null
    check (jsonb_typeof(beallitas) = 'object' and pg_column_size(beallitas) <= 8192),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint konyvelo_beallitasok_egyedi unique nulls not distinct (company_id, ugyfel_torzsszam)
);

comment on table public.konyvelo_beallitasok is
  'A könyvelőprogram-export kontírja (főkönyvi számok, napló- és ÁFA-kódok) '
  'cégenként és ügyfelenként. Szerkezete: shared/uzleti/export/konyvelo/beallitas.ts. '
  'Csak a konyvelo_beallitas_ment() ír bele.';

alter table public.konyvelo_beallitasok enable row level security;
revoke all on table public.konyvelo_beallitasok from anon, authenticated;

grant select, delete on table public.konyvelo_beallitasok to authenticated;
grant insert (company_id, ugyfel_torzsszam, beallitas) on table public.konyvelo_beallitasok to authenticated;
grant update (beallitas) on table public.konyvelo_beallitasok to authenticated;

create policy "A tag látja a cége könyvelőprogram-beállítását" on public.konyvelo_beallitasok
  for select to authenticated using (company_id in (select belso.tag_cegei()));

create policy "Könyvelőprogram-beállítást a szerkesztő ír" on public.konyvelo_beallitasok
  for insert to authenticated with check (belso.szerkeszthet(company_id));

create policy "Könyvelőprogram-beállítást a szerkesztő módosít" on public.konyvelo_beallitasok
  for update to authenticated
  using (belso.szerkeszthet(company_id)) with check (belso.szerkeszthet(company_id));

create policy "Könyvelőprogram-beállítást a szerkesztő töröl" on public.konyvelo_beallitasok
  for delete to authenticated using (belso.szerkeszthet(company_id));

create or replace function belso.konyvelo_beallitas_szerzo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function belso.konyvelo_beallitas_szerzo() from public, anon, authenticated;

drop trigger if exists konyvelo_beallitas_szerzo on public.konyvelo_beallitasok;
create trigger konyvelo_beallitas_szerzo
  before insert or update on public.konyvelo_beallitasok
  for each row execute function belso.konyvelo_beallitas_szerzo();

create or replace function public.konyvelo_beallitas_ment(ugyfel text, beallitas jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ceg uuid := belso.aktualis_ceg();
begin
  if ceg is null then
    raise exception 'Ehhez a fiókhoz nem tartozik cég.';
  end if;

  -- Az RLS is megfogná, de angolul és érthetetlenül.
  if not belso.szerkeszthet(ceg) then
    raise exception 'Megtekintő szerepben a könyvelőprogram-beállítást nem módosíthatod.';
  end if;

  insert into public.konyvelo_beallitasok (company_id, ugyfel_torzsszam, beallitas)
  values (ceg, nullif(ugyfel, ''), beallitas)
  on conflict on constraint konyvelo_beallitasok_egyedi
  do update set beallitas = excluded.beallitas;
end;
$$;

revoke all on function public.konyvelo_beallitas_ment(text, jsonb) from public, anon;
grant execute on function public.konyvelo_beallitas_ment(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Az export formátumlistája
-- ---------------------------------------------------------------------------

alter table public.exports drop constraint if exists exports_format_check;
alter table public.exports add constraint exports_format_check
  check (format in ('xlsx', 'csv', 'json', 'rlb', 'novitax', 'kulcs'));

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
  if formatum not in ('xlsx', 'csv', 'json', 'rlb', 'novitax', 'kulcs') then
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
