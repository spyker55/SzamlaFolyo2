-- Meghívó: kollégát a cég tulajdonosa hív be, levélben.
--
-- # Miért külön tábla, és miért nem a `company_members`
--
-- Mert a `company_members.user_id` **nem null**, és `auth.users`-re hivatkozik:
-- egy tagsági sor addig nem létezhet, amíg a meghívottnak nincs fiókja. A régi
-- terv az `accepted_at is null` sorral akarta jelölni a függő meghívást — az
-- viszont csak akkor működne, ha a fiók már megvolna. Egy meghívó élettartama
-- **megelőzi a fiókot**, tehát saját táblát kap.
--
-- Ettől a `company_members` jelentése is letisztul: ami ott sor, az **elfogadott
-- tagság**. Ezt a `belso.aktualis_ceg()` eddig is feltételezte (`accepted_at is
-- not null`), csak eddig senki nem mondta ki.
--
-- # A meghívó link bemutatóra szóló kulcs — de kevésbé, mint a beküldő cím
--
-- A token kitalálhatatlan (24 karakter, ~118 bit), **és** a meghívó a címzett
-- e-mail címéhez van kötve: elfogadni csak az tudja, aki azzal a címmel lépett
-- be. Ez tudatosan szigorúbb, mint a beküldő címnél: ott a cím maga az egyetlen
-- réteg, itt van egy második, és ha van, akkor éljünk vele.
--
-- Ennek ára van, és ezt ki kell mondani: **a linket nem lehet továbbadni.** Ha
-- a könyvelő más címről dolgozik, a tulajdonos küld egy új meghívót — ez egy
-- gombnyomás, szemben azzal, hogy egy továbbküldött link bárkit beengedne.

-- ---------------------------------------------------------------------------
-- Egy generátor, két helyen
-- ---------------------------------------------------------------------------

/**
 * Véletlen jelsor a félreolvashatatlan ábécéből.
 *
 * Eddig ez a `public.bekuldes_token_general()` belsejében ült, 16 karakterre
 * rögzítve. A meghívónak hosszabb kell (a linket nem gépeli be senki, tehát a
 * hossz ingyen van), ezért a generátor kiköltözik ide, hosszparaméterrel — és a
 * beküldő token generátora **ezt hívja**, hogy ne legyen két ábécénk, ami
 * egyszer majd széttart.
 *
 * ⚠️ `extensions.gen_random_bytes`, nem `random()`: az utóbbi megjósolható, és
 * egy megjósolható token nem titok. A séma-minősítés sem díszítés — a pgcrypto
 * ebben a projektben az `extensions` sémában ül, és ez a függvény
 * `search_path = ''` mellett fut.
 */
create or replace function belso.veletlen_jel(hossz integer)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  abc  constant text := 'abcdefghjkmnpqrstvwxyz23456789';
  jel  text := '';
  i    integer;
begin
  for i in 1..hossz loop
    jel := jel || substr(abc, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(abc)), 1);
  end loop;

  return jel;
end;
$$;

-- A `create or replace` megtartja a függvény azonosítóját, tehát a
-- `companies.bekuldes_token` oszlop alapértéke változatlanul működik: ugyanaz a
-- függvény, csak a belseje költözött.
create or replace function public.bekuldes_token_general()
returns text
language sql
volatile
set search_path = ''
as $$
  select belso.veletlen_jel(16)
$$;

-- ---------------------------------------------------------------------------
-- A tag e-mail címe
-- ---------------------------------------------------------------------------

-- Eddig a Beállítások „Tag · a1b2c3d4" alakban mutatta a kollégákat, mert az
-- `auth.users` a kliens elől zárva van — és az helyes is így. A cím ezért
-- **belépéskor** másolódik a tagsági sorra: nem lekérdezzük, hanem tároljuk,
-- abban a pillanatban, amikor amúgy is hozzáférünk.
--
-- Ez nem új adatkezelés: ugyanaz a cím, ugyanannak a cégnek a tagjai látják,
-- akik eddig is együtt dolgoztak a bizonylatokon.
alter table public.company_members
  add column email text;

update public.company_members cm
   set email = u.email
  from auth.users u
 where u.id = cm.user_id;

comment on column public.company_members.email is
  'A tag belépési címe, a tagság keletkezésekor másolva. Azért tároljuk, mert '
  'az auth.users a klienstől zárva van, a cég tagjainak viszont látniuk kell, '
  'ki fér hozzá a bizonylataikhoz.';

-- A cégalapító sora is kapja meg a címét — különben az első tag maradna az
-- egyetlen, akit nem lehet néven nevezni.
create or replace function public.ceg_letrehozas(nev text, adoszam text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  uj_ceg uuid;
begin
  if felhasznalo is null then
    raise exception 'Cégalapításhoz be kell jelentkezni.';
  end if;

  -- Egy fiók egy céget kezel. A séma többet elbírna, de a termék egyet mutat,
  -- és a könyvelőiroda az ügyfeleit egy fiókban dolgozza fel — a
  -- szétválasztást az export adószámszűrője adja, nem cégadminisztráció.
  if belso.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég.';
  end if;

  insert into public.companies (name, tax_number, trial_ends_at)
  values (nev, adoszam, now() + interval '14 days')
  returning id into uj_ceg;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (uj_ceg, felhasznalo, 'tulajdonos', now(),
          (select lower(u.email) from auth.users u where u.id = felhasznalo));

  return uj_ceg;
end;
$$;

-- ---------------------------------------------------------------------------
-- company_invites
-- ---------------------------------------------------------------------------

create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- Kisbetűsítve és levágva tároljuk, mert a tábla **egyediséget** épít rá: a
  -- „Kati@…" és a „kati@…" ugyanaz a postafiók, és két élő meghívó ugyanarra a
  -- címre csak zavart csinálna.
  email text not null,
  role text not null check (role in ('tulajdonos', 'szerkeszto', 'megtekinto')),

  -- A linkbe kerülő titok. 24 karakter a 30-as ábécéből ~118 bit — a linket
  -- senki nem gépeli be, tehát a hossz ingyen van.
  token text not null default belso.veletlen_jel(24),

  invited_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  -- A lejárat **itt** dől el, nem a configban: egy meghívó annyi ideig érvényes,
  -- amennyi a sorára van írva, és a felület ezt a dátumot mutatja. Így nincs két
  -- igazság, ami széttarthat.
  expires_at timestamptz not null default now() + interval '7 days',

  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);

create unique index company_invites_token_idx
  on public.company_invites (token);

-- Egy címre egyszerre egy élő meghívó. A visszavont és az elfogadott sorok
-- megmaradnak — azok a nyom, nem az állapot.
create unique index company_invites_elo_idx
  on public.company_invites (company_id, email)
  where accepted_at is null and revoked_at is null;

create index company_invites_company_idx
  on public.company_invites (company_id, created_at desc);

alter table public.company_invites enable row level security;

-- Olvasni **csak a tulajdonos** tud, nem minden tag: a soron ott a token, ami a
-- linket érvényessé teszi. Írni senki nem tud a REST API-n — a három művelet
-- (küldés, visszavonás, elfogadás) mind függvényen megy, mert mindhárom olyan
-- szabályt kényszerít ki, amit egy politika nem tud kimondani.
create policy "A meghívókat a tulajdonos látja"
  on public.company_invites for select to authenticated
  using (belso.adminisztralhat(company_id));

grant select on public.company_invites to authenticated;

-- ⚠️ A `grant select` önmagában **nem szűkít semmit**, és ezt megmértük: a
-- Supabase alapértelmezett jogosztása minden új táblára teljes jogot ad az
-- `anon` és az `authenticated` szerepnek. A közvetlen INSERT ezért nem
-- „permission denied"-ot adott, hanem „violates row-level security policy" —
-- vagyis az írást eddig **egyedül a politikák hiánya** tartotta vissza.
--
-- Az eredmény ugyanaz, a tartóssága nem: egy később, figyelmetlenül felvett
-- insert-politika azonnal nyitna. A szándék legyen a jogokban is benne.
revoke all on public.company_invites from anon;
revoke insert, update, delete on public.company_invites from authenticated;

comment on table public.company_invites is
  'Függő és lezárt meghívók. A tokent tartalmazó linket a meghívott kapja meg '
  'levélben; elfogadni csak a meghívott címével belépve lehet. Írni csak a '
  'meghivot_letrehoz / meghivot_visszavon / meghivot_elfogad függvényekkel.';

-- ---------------------------------------------------------------------------
-- A három művelet
-- ---------------------------------------------------------------------------

/**
 * Meghívó létrehozása.
 *
 * `security definer`, mert két dolgot is meg kell néznie, amihez a hívónak
 * nincs joga: hogy a cím **nem tagja már** a cégnek (ehhez az `auth.users` kell),
 * és hogy a token a generátoron át születik, nem a kliens állításából.
 *
 * A levelet **nem ez küldi**. Az a `meghivo-kuld` Edge Function dolga, és ez a
 * szétválasztás szándékos: ha a levélküldés elakad, a meghívó **akkor is
 * létrejött** — a felületen ott a sor, a link és az „Küldd újra" gomb. Egy
 * kézbesítési hiba ne vigye el magát a meghívást.
 */
create or replace function public.meghivot_letrehoz(ceg uuid, cim text, szerep text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tiszta text := lower(trim(cim));
  uj     uuid;
begin
  if not belso.adminisztralhat(ceg) then
    raise exception 'Nincs jogosultságod meghívót küldeni ehhez a céghez.';
  end if;

  if tiszta !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Ez nem érvényes e-mail cím: %', cim;
  end if;

  if szerep not in ('tulajdonos', 'szerkeszto', 'megtekinto') then
    raise exception 'Ismeretlen szerep: %', szerep;
  end if;

  if exists (
    select 1
    from public.company_members cm
    join auth.users u on u.id = cm.user_id
    where cm.company_id = ceg
      and lower(u.email) = tiszta
  ) then
    raise exception 'Ez a cím már a cég tagja.';
  end if;

  -- Ha volt élő meghívó ugyanarra a címre, azt **visszavonjuk**. Nem azért, hogy
  -- az egyedi index ne akadjon meg, hanem mert a régi link ettől érvénytelen
  -- lesz: egy „küldd újra" ne hagyjon két érvényes belépőt a világban.
  update public.company_invites
     set revoked_at = now()
   where company_id = ceg
     and email = tiszta
     and accepted_at is null
     and revoked_at is null;

  insert into public.company_invites (company_id, email, role, invited_by)
  values (ceg, tiszta, szerep, (select auth.uid()))
  returning id into uj;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (ceg, (select auth.uid()), 'meghivo.letrejott', 'company_invite', uj,
          tiszta || ' meghívva (' || szerep || ')');

  return uj;
end;
$$;

/** Meghívó visszavonása. A link ettől azonnal érvénytelen. */
create or replace function public.meghivot_visszavon(meghivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ceg uuid;
  cim text;
begin
  select company_id, email into ceg, cim
  from public.company_invites
  where id = meghivo;

  if ceg is null then
    raise exception 'Nincs ilyen meghívó.';
  end if;

  if not belso.adminisztralhat(ceg) then
    raise exception 'Nincs jogosultságod ehhez a meghívóhoz.';
  end if;

  update public.company_invites
     set revoked_at = now()
   where id = meghivo
     and accepted_at is null
     and revoked_at is null;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (ceg, (select auth.uid()), 'meghivo.visszavonva', 'company_invite', meghivo,
          cim || ' meghívója visszavonva');
end;
$$;

/**
 * Mit mutasson a meghívó oldal, mielőtt bárki belépne.
 *
 * `anon` is hívhatja — muszáj: a meghívott jellemzően **nincs belépve**, amikor
 * a linkre kattint. A token birtokosa megtudja a cég nevét és azt, melyik címre
 * szól a meghívó; ez nem szivárgás, hanem pont az, amiért a link létezik.
 *
 * Mindig **egy sort** ad vissza, akkor is, ha a token ismeretlen: az oldalnak
 * különbséget kell tudnia mondani „lejárt", „visszavonták" és „ilyen meghívó
 * nincs" között. Egy üres eredményhalmazból ez nem derülne ki.
 */
create or replace function public.meghivo_adatok(jel text)
returns table (allapot text, ceg_nev text, cim text, szerep text, lejar timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select mi.*, c.name as ceg
  into m
  from public.company_invites mi
  join public.companies c on c.id = mi.company_id
  where mi.token = jel;

  if not found then
    return query select 'ismeretlen'::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  return query
  select
    case
      when m.revoked_at is not null then 'visszavont'
      when m.accepted_at is not null then 'elfogadott'
      when m.expires_at <= now()     then 'lejart'
      else 'ervenyes'
    end::text,
    m.ceg::text,
    m.email::text,
    m.role::text,
    m.expires_at;
end;
$$;

/**
 * A meghívó elfogadása.
 *
 * Négy kaput zár, és mindegyik külön mondatot érdemel, mert mindegyik más
 * hibát fog meg:
 *
 * 1. **Él-e még** (nem visszavont, nem elfogadott, nem lejárt).
 * 2. **A címzett-e az** — a belépési cím egyezzen a meghívóéval. Ez az, amitől
 *    a továbbküldött link nem enged be senkit.
 * 3. **Nincs-e már cége** a belépett fióknak. Egy fiók egy céget kezel
 *    (`ceg_letrehozas` ugyanezt mondja), és cégváltó szándékosan nincs — egy
 *    második tagság ezért nem „bónusz", hanem egy láthatatlan cég.
 * 4. A tagsági sor **elfogadottként** születik: ami a `company_members`-ben
 *    sor, az valódi hozzáférés.
 */
create or replace function public.meghivot_elfogad(jel text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim         text;
  m           record;
begin
  if felhasznalo is null then
    raise exception 'A meghívó elfogadásához be kell jelentkezni.';
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  select * into m from public.company_invites where token = jel;

  if not found then
    raise exception 'Ez a meghívó nem érvényes.';
  end if;

  if m.revoked_at is not null then
    raise exception 'Ezt a meghívót visszavonták.';
  end if;

  if m.accepted_at is not null then
    raise exception 'Ezt a meghívót már elfogadták.';
  end if;

  if m.expires_at <= now() then
    raise exception 'Ez a meghívó lejárt. Kérj újat a cég tulajdonosától.';
  end if;

  if cim is distinct from m.email then
    raise exception 'Ez a meghívó a % címre szól, te pedig %-ként vagy belépve.', m.email, coalesce(cim, 'ismeretlen');
  end if;

  if belso.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég, márpedig egy fiók egy céget kezel.';
  end if;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (m.company_id, felhasznalo, m.role, now(), cim);

  update public.company_invites
     set accepted_at = now(), accepted_by = felhasznalo
   where id = m.id;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (m.company_id, felhasznalo, 'meghivo.elfogadva', 'company_invite', m.id,
          cim || ' belépett a céghez');

  return m.company_id;
end;
$$;

-- A `revoke ... from public` önmagában kevés: a Supabase minden új `public`
-- függvényre nevesített EXECUTE jogot ad az `anon` és az `authenticated`
-- szerepnek, azt pedig csak nevesítve lehet visszavonni.
revoke all on function public.meghivot_letrehoz(uuid, text, text) from public, anon;
revoke all on function public.meghivot_visszavon(uuid) from public, anon;
revoke all on function public.meghivot_elfogad(text) from public, anon;
revoke all on function public.meghivo_adatok(text) from public;

grant execute on function public.meghivot_letrehoz(uuid, text, text) to authenticated;
grant execute on function public.meghivot_visszavon(uuid) to authenticated;
grant execute on function public.meghivot_elfogad(text) to authenticated;
-- Ez az egyetlen, amit a be nem lépett látogató is hívhat: a meghívó oldalnak
-- működnie kell fiók nélkül is.
grant execute on function public.meghivo_adatok(text) to anon, authenticated;
