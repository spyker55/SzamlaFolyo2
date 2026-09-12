-- SzámlaFolyó — alapséma
--
-- A táblák és oszlopok angolul, az üzleti logika magyarul: ez a régi rendszer
-- gyakorlatának folytatása, nem új döntés.
--
-- Az enum-szerű oszlopok `text` + CHECK alakban állnak, nem Postgres enumként.
-- Egy enum bővítése tranzakción belül korlátozott, egy CHECK cseréje viszont
-- sima migráció — és ezek az értékkészletek fognak bővülni.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Segédfüggvény: updated_at
-- ---------------------------------------------------------------------------

create or replace function public.erinti_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- companies — a bérlő
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  -- A cégnyitás érvényes magyar adószámot követel, és ez nem formaság: a
  -- szolgáltatás kizárólag vállalkozásoknak szól, a fogyasztóvédelmi jog
  -- viszont kógens — hiába köti ki az ÁSZF, ha a rendszer beenged egy
  -- magánszemélyt. A gyakorlati szűrő az adószám, mert fogyasztónak nincs.
  --
  -- Itt szigorúbb a mérce, mint a bizonylatokon: egy külföldi *szállító*
  -- adószáma nem magyar alakú és attól még helyes — az a szabály a partnerre
  -- szól, ez pedig a saját cégünkre.
  tax_number text not null,

  default_currency char(3) not null default 'HUF',

  -- A próbaidő Stripe nélkül fut: kártya nélkül lehet kipróbálni.
  trial_ends_at timestamptz,

  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_status text,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,

  -- 0 = az eredeti fájl az exporttal egy időben törlődik. A plafont a kód
  -- vágja le (7 nap), de itt is ellenőrizzük, hogy a tárolt érték se
  -- hazudhasson arról, mi történik valójában.
  file_retention_days smallint not null default 0
    check (file_retention_days between 0 and 7),

  -- Alapból ki van kapcsolva: váratlan számlát senki ne kapjon attól, hogy egy
  -- hónapban többet dolgozott. A keret megállít.
  overage_enabled boolean not null default false,
  -- NULL = nincs felső határ, és ez csak tudatosan állítható be.
  overage_limit_ft integer check (overage_limit_ft is null or overage_limit_ft >= 0),

  -- Az automatikus jóváhagyás cégenként kapcsolható.
  auto_jovahagyas_be boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- company_members — ki melyik céghez tartozik, milyen szerepben
-- ---------------------------------------------------------------------------

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Szerkeszthet = feltölt, javít, jóváhagy, exportál.
  -- Adminisztrálhat = számlázás, tagok kezelése, végleges törlés (tulajdonos).
  role text not null default 'szerkeszto'
    check (role in ('tulajdonos', 'szerkeszto', 'megtekinto')),

  accepted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, user_id)
);

create index company_members_user_idx on public.company_members (user_id);

create trigger company_members_updated_at
  before update on public.company_members
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- Bérlő-feloldás
--
-- Ezek SECURITY DEFINER függvények, mert az RLS-politikák hívják őket: ha a
-- `company_members` saját politikája hívná vissza önmagát, végtelen rekurzió
-- lenne. A `search_path = ''` kötelező kiegészítés, ezért van minden név
-- sémával kiírva.
-- ---------------------------------------------------------------------------

/**
 * A belépett felhasználó cégei. Elfogadott tagság kell hozzá: egy kiküldött,
 * de el nem fogadott meghívó még nem ad hozzáférést.
 */
create or replace function public.tag_cegei()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = (select auth.uid())
    and cm.accepted_at is not null
$$;

/**
 * A felhasználó „aktuális" cége.
 *
 * A séma több céget elbírna, a termék egyet mutat. A kiválasztás a **legkorábbi
 * tagság**, nem a legkisebb azonosító — azonosító szerint egy később felvett,
 * de kisebb sorszámú cég maga alá húzhatná azt, ahol a felhasználó addig
 * dolgozott, vagyis egy tagfelvétel elvehetné valaki más fiókját.
 * Ez biztonsági döntés, nem kényelmi.
 */
create or replace function public.aktualis_ceg()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = (select auth.uid())
    and cm.accepted_at is not null
  order by cm.created_at, cm.company_id
  limit 1
$$;

/** Szerkeszthet-e a felhasználó az adott cégben (feltölt, javít, jóváhagy, exportál). */
create or replace function public.szerkeszthet(ceg uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = ceg
      and cm.user_id = (select auth.uid())
      and cm.accepted_at is not null
      and cm.role in ('tulajdonos', 'szerkeszto')
  )
$$;

/** Adminisztrálhat-e (számlázás, tagok, végleges törlés). Csak a tulajdonos. */
create or replace function public.adminisztralhat(ceg uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = ceg
      and cm.user_id = (select auth.uid())
      and cm.accepted_at is not null
      and cm.role = 'tulajdonos'
  )
$$;

/**
 * A `company_id` beszúráskori kitöltése.
 *
 * Nem a kliens állítása dönt: ha kifelejtené, a sor a semmibe kerülne, és a
 * bérlő-elkülönítés csendben kilyukadna. Az RLS WITH CHECK ettől függetlenül
 * is ellenőriz — ez a réteg a jóhiszemű hívó hibáját fogja meg, nem a
 * rosszhiszeműét.
 */
create or replace function public.tolti_company_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.company_id is null then
    new.company_id := public.aktualis_ceg();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- files — a feltöltött fájl
--
-- A régi `Document` egyszerre jelentett fájlt és bizonylatot. Ez a két fogalom
-- itt szétválik: **egy fájlban több bizonylat lehet**, és aki lapadagolós
-- szkennerrel dolgozik, annak egy havi köteg egy PDF. Ez a fő eset, nem kivétel.
-- ---------------------------------------------------------------------------

create table public.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  original_filename text,
  -- A MIME a **tartalomból** derül ki, nem a kliens állításából.
  mime_type text,
  size_bytes bigint not null default 0,
  -- A `storage_path` az export után kiürül, a `sha256` marad — abból tudjuk,
  -- hogy ugyanazt a bizonylatot már láttuk.
  sha256 char(64),
  storage_path text,
  file_deleted_at timestamptz,

  -- NULL = nem tudjuk (kép, XML, sérült PDF). Bizonytalanságból nem
  -- számlázunk többet: az egy kredit.
  oldalszam integer check (oldalszam is null or oldalszam > 0),

  -- A feldolgozási lánc melyik fokára esett, olcsótól drágáig.
  forras_jelleg text check (forras_jelleg in (
    'strukturalt_xml', 'beagyazott_xml', 'szovegreteg', 'kep'
  )),
  -- Minden iratról feljegyezzük, mi *lett volna* elérhető benne — ez önmagában
  -- is mérés.
  forras_naplo jsonb,

  -- A megszüntetett e-mailes beérkeztetés előtt érkezett sorok tényleg
  -- e-mailben jöttek; egy megtörtént dolgot nem írunk át utólag.
  source text not null default 'upload' check (source in ('upload', 'email')),

  uploaded_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index files_company_sha_idx on public.files (company_id, sha256);
create index files_company_created_idx on public.files (company_id, created_at desc);

create trigger files_company_id
  before insert on public.files
  for each row execute function public.tolti_company_id();

create trigger files_updated_at
  before update on public.files
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- exports
-- ---------------------------------------------------------------------------

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  format text not null check (format in ('xlsx', 'csv', 'json')),
  -- Megőrzi, kire szűrtünk: utólag ez a bizonyíték arra, mi került bele.
  filters jsonb,
  item_count integer not null default 0,
  file_path text,
  file_name text not null,
  file_bytes bigint not null default 0,
  created_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exports_company_created_idx on public.exports (company_id, created_at desc);

create trigger exports_company_id
  before insert on public.exports
  for each row execute function public.tolti_company_id();

create trigger exports_updated_at
  before update on public.exports
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- documents — a bizonylat
--
-- Egy fájlhoz egy vagy több tartozik. A fájlt **nem vágjuk szét**: elég
-- oldaltartományt tárolni, és az előnézetet a megfelelő oldalra ugratni
-- (PDF-nél `#page=N`). Ez elkerül egy csomó szenvedést, és nem kell hozzá
-- PDF-író könyvtár.
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete cascade,

  -- NULL–NULL = a bizonylat az egész fájl. Egyébként 1-alapú, mindkét vége
  -- zárt oldaltartomány.
  oldal_tol integer check (oldal_tol is null or oldal_tol >= 1),
  oldal_ig integer check (oldal_ig is null or oldal_ig >= 1),
  constraint documents_oldaltartomany check (
    (oldal_tol is null and oldal_ig is null)
    or (oldal_tol is not null and oldal_ig is not null and oldal_ig >= oldal_tol)
  ),

  status text not null default 'feltoltve' check (status in (
    'feltoltve', 'feldolgozas_alatt', 'ellenorzesre_var',
    'jovahagyva', 'exportalva', 'hiba', 'duplikatum'
  )),

  doc_type text check (doc_type in (
    'szamla', 'elolegszamla', 'helyesbito_szamla', 'sztorno_szamla',
    'dijbekero', 'nyugta', 'szallitolevel', 'egyeb'
  )),

  -- Nem „partner": egy bejövő számlán a szállító az idegen fél, egy kimenőn a
  -- vevő — és a könyvelőnek mindkettő kell.
  supplier_name text,
  supplier_tax_number text,
  customer_name text,
  customer_tax_number text,

  doc_number text,
  issue_date date,
  fulfillment_date date,
  due_date date,
  payment_method text,

  currency char(3),
  net_amount numeric(15, 2),
  vat_amount numeric(15, 2),
  gross_amount numeric(15, 2),
  -- EN 16931 BT-115. Csak akkor tér el a bruttótól, ha kerekítés vagy levont
  -- előleg indokolja.
  fizetendo numeric(15, 2),
  afa_bontas jsonb,

  note text,
  tobb_irat_gyanu boolean not null default false,
  nehezen_olvashato boolean not null default false,

  -- Az automatikus jóváhagyás **nem jelent láthatatlanságot**: az így átment
  -- bizonylat jelvényt kap, és mellette egy sorban az indok. Soha ne írjuk ki,
  -- hogy „ellenőrizve", ha senki nem nézte meg.
  auto_jovahagyva boolean not null default false,
  auto_indok text,

  export_id uuid references public.exports (id) on delete set null,
  duplicate_of_id uuid references public.documents (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,

  -- Sorbaállítás worker nélkül: a claim egyetlen feltételes UPDATE. Aki
  -- elsőnek írja át az állapotot, azé a munka — nem kell hozzá sorzár.
  attempts smallint not null default 0,
  claimed_at timestamptz,
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_company_status_idx on public.documents (company_id, status);
create index documents_company_export_idx on public.documents (company_id, export_id);
create index documents_file_idx on public.documents (file_id);
-- A sorkezelő ezen az indexen keresi a felvehető munkát.
create index documents_sor_idx on public.documents (status, claimed_at);

create trigger documents_company_id
  before insert on public.documents
  for each row execute function public.tolti_company_id();

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- document_extractions — a gépi válasz, és a keret alapja
--
-- Három döntés, mindegyik drágán tanult:
--
-- 1. **Soha nem írjuk felül a javított értékkel.** A gépi és az emberi érték
--    külön él, különben nem mérhető, mennyit javult a modell egy prompt- vagy
--    modellcsere után.
--
-- 2. **A sor túléli a dokumentum törlését** (`document_id` → NULL). A keret
--    ebből számol, nem a `documents`-ből: azt a felhasználó a Beérkezőből, az
--    Archívumból vagy egy egész export törlésével elviheti — a modellhívásért
--    viszont már fizettünk. Aki exportált és utána rendet rakott, annál a
--    felhasznált darabszám korábban visszaugrott nullára, és a próbaidős keret
--    gyakorlatilag korlátlan lett.
--
-- 3. **`prompt_version` lehet NULL**, és az tartalmi állítás: ezt nem modell
--    olvasta ki. Az XML-értelmező nem hív modellt, tehát nincs prompt-verziója
--    — odaírni egy olyat, ami nem futott, épp azt az összehasonlítást rontaná
--    el, amiért az oszlop van.
-- ---------------------------------------------------------------------------

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  file_id uuid references public.files (id) on delete set null,

  model text,
  -- Amit a szolgáltató ténylegesen futtatott — nem feltétlenül az, amit kértünk.
  model_version text,
  prompt_version text,

  raw_response jsonb,
  fields jsonb,
  confidence jsonb,

  input_tokens integer,
  output_tokens integer,
  cost numeric(12, 6),
  duration_ms integer,
  error text,

  -- A kredit a **bizonylatra** szól. A kötegbontó futás 0-t kap: a szétszedés
  -- a szolgáltatás része, és használható adatot önmagában nem adott. A régi
  -- rendszerben ez a hiba élt — öt kredit három számláért.
  credits integer not null default 1 check (credits >= 0),

  created_at timestamptz not null default now()
);

create index document_extractions_document_idx on public.document_extractions (document_id);
create index document_extractions_company_created_idx
  on public.document_extractions (company_id, created_at desc);

create trigger document_extractions_company_id
  before insert on public.document_extractions
  for each row execute function public.tolti_company_id();

-- ---------------------------------------------------------------------------
-- document_corrections — a tanuló-adat
--
-- Olcsó tábla, és idővel többet ér, mint maga a szoftver: ebből derül ki, hol
-- téved a modell. Az automatikusan jóváhagyott bizonylat utólagos javítása
-- ugyanígy ide kerül — **ez az egyetlen jel arról, hogy a kapuk jól vannak-e
-- beállítva.** Ha ez a szám kúszik, a kapukat kell szigorítani, nem a
-- felhasználót hibáztatni.
-- ---------------------------------------------------------------------------

create table public.document_corrections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  extraction_id uuid references public.document_extractions (id) on delete set null,

  field text not null,
  machine_value text,
  human_value text,
  -- Igaz, ha a bizonylat automatikusan ment át, és utólag hívta vissza valaki.
  auto_jovahagyott_volt boolean not null default false,
  corrected_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now()
);

create index document_corrections_company_field_idx
  on public.document_corrections (company_id, field);

create trigger document_corrections_company_id
  before insert on public.document_corrections
  for each row execute function public.tolti_company_id();

-- ---------------------------------------------------------------------------
-- overage_charges — a kereten felüli, már kiszámlázott kreditek
--
-- Külön tábla, nem a kiolvasás sorára írt jelölés: egy több oldalas irat több
-- kreditet ér, és épp ráeshet a kerethatárra — a soron jelölve azt kellene
-- eldönteni, hogy a sor „fele" számlázott-e.
--
-- A `period_start` az előfizetési ciklushoz köt, nem naptári hónaphoz.
-- ---------------------------------------------------------------------------

create table public.overage_charges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  period_start timestamptz not null,
  credits integer not null check (credits >= 0),
  stripe_invoice_item_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index overage_charges_company_period_idx
  on public.overage_charges (company_id, period_start);

create trigger overage_charges_updated_at
  before update on public.overage_charges
  for each row execute function public.erinti_updated_at();

-- ---------------------------------------------------------------------------
-- activity_log
--
-- Csak a visszafordíthatatlan lépések: export, fájltörlés, archívumból törlés,
-- visszahívás, tag felvétele/eltávolítása. Nem teljes audit napló — az mindent
-- rögzítene és senki nem olvasná.
-- ---------------------------------------------------------------------------

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,

  action text not null,
  -- Polimorf hivatkozás, szándékosan idegen kulcs nélkül: a napló túléli azt,
  -- amiről szól.
  subject_type text,
  subject_id uuid,
  summary text,
  context jsonb,

  created_at timestamptz not null default now()
);

create index activity_log_company_created_idx
  on public.activity_log (company_id, created_at desc);

create trigger activity_log_company_id
  before insert on public.activity_log
  for each row execute function public.tolti_company_id();
