-- Az ÁSZF elfogadása nyomot hagy: melyik szöveget, mikor, ki, melyik cég nevében.
--
-- # A rés
--
-- Az ÁSZF 1. pontja ezt ígéri: „a Szolgáltató nyilvántartja, hogy az Előfizető
-- **melyik időpontban** fogadta el". 2026-09-22-én, a jogi felülvizsgálat 8.
-- pontja nyomán megnéztem az éles adatbázist:
--
--   column_name ilike '%aszf%' | '%terms%' | '%elfogad%' | '%consent%' | '%accept%'
--   → company_invites.accepted_at, company_invites.accepted_by,
--     company_members.accepted_at, inbound_emails.accepted_count
--
-- Mind a négy a **meghívókról** szól. Az ÁSZF elfogadásáról **semmi** nem volt
-- tárolva: sem időpont, sem verzió, sem az eljáró felhasználó. A regisztrációs
-- pipa böngészőbeli állapot volt, a `ceg_letrehozas()` nem írt róla semmit.
--
-- Ez ugyanaz a hibaosztály, amit ez a projekt végig irtott — **ígéret, amit a
-- kód nem tart be** —, csak itt maga az ígéret szól a bizonyíthatóságról.
--
-- # Miért nem elég az időpont
--
-- A felülvizsgálat pontosan fogalmaz: az időpont önmagában nem mutatja meg,
-- **melyik szöveget** fogadta el az ügyfél. Egy ÁSZF, ami évente háromszor
-- változik, öt év múlva nem bizonyít semmit egy puszta időbélyegből. Ezért
-- négy adatot őrzünk: a **verziót**, az **időpontot**, az **eljáró
-- felhasználót** és a **céget**.
--
-- A felhasználó címe külön oszlopban áll, nem csak az azonosítója. A fiók
-- törölhető (`/fiok-torles`), és a törlés a `user_id`-t `null`-ra ejti — a
-- bizonyíték viszont attól még kell. Ugyanaz a megfontolás, amiért a
-- `company_members` is tartja a tag címét.
--
-- # A Ptk. 6:78. § külön kérése
--
-- A szokásos gyakorlattól lényegesen eltérő kikötés csak akkor válik a
-- szerződés részévé, ha a másik felet **külön tájékoztatták** róla, és azt
-- **kifejezetten elfogadta**. Az ÁSZF eddig ezt önmagáról állította (13. pont:
-- „az Előfizető elismeri, hogy külön tájékoztatást kapott") — egy önmagára
-- hivatkozó kijelentés viszont nem bizonyíték.
--
-- A két kikötést maga az ÁSZF nevezi meg: a **felelősség összegszerű korlátja**
-- (13.) és az **eredeti fájlok automatikus törlése** (10.). A cégalapító
-- képernyőn ezek külön, látható figyelemfelhívást és **külön pipát** kapnak, és
-- az elfogadásuk ide, saját oszlopba kerül.
--
-- # Miért van verziótábla
--
-- Mert a verziót a **böngésző küldi**, és amit a kliens állít, azt nem hisszük
-- el vizsgálat nélkül. A `legal_versions` a kiadott változatok zárt listája: a
-- függvény csak olyan verziót fogad el, ami szerepel benne. Egy elgépelt vagy
-- kitalált betűsor így nem tud bizonyítéknak látszó sort csinálni.
--
-- A másik irány — hogy a szerver döntse el, melyik verzió aktuális — rosszabb
-- volna: egy régi, gyorsítótárazott böngésző a **mai** verziót kapná a sorba,
-- pedig a tegnapit olvasta. Inkább mondja meg a kliens, mit mutatott, és a
-- szerver ellenőrizze, hogy az létező szöveg.

create table if not exists public.legal_versions (
  version text primary key,
  effective_from date not null,
  created_at timestamptz not null default now()
);

comment on table public.legal_versions is
  'A kiadott ÁSZF/Adatkezelési tájékoztató változatok zárt listája. A '
  'ceg_letrehozas() csak innen ismert verziót fogad el elfogadásként — a '
  'verziót a kliens küldi, és amit a kliens állít, azt megvizsgáljuk.';

-- A tábla nem ügyféladat, de RLS nélkül a PostgREST kiadná. Politika nincs
-- rajta: így a `security definer` függvényen kívül senki nem olvassa.
alter table public.legal_versions enable row level security;
revoke all on table public.legal_versions from anon, authenticated;

insert into public.legal_versions (version, effective_from)
values ('2026-09-20', date '2026-09-20'),
       ('2026-09-22', date '2026-09-22')
on conflict (version) do nothing;

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- A fiók törlése után is meg kell maradnia a sornak, ezért SET NULL — a
  -- `user_email` viszi tovább, ki volt az.
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  version text not null references public.legal_versions(version),
  -- A Ptk. 6:78. § szerinti, kifejezett elfogadás a két megnevezett kikötésre.
  unusual_terms_ack boolean not null,
  accepted_at timestamptz not null default now()
);

comment on table public.terms_acceptances is
  'Ki, mikor, melyik cég nevében és MELYIK SZÖVEGET fogadott el. Az ÁSZF 1. '
  'pontja ígéri; 2026-09-22 előtt semmi nem tárolta. Kizárólag a '
  'ceg_letrehozas() ír bele, service definer jogon.';

create index if not exists terms_acceptances_company_idx
  on public.terms_acceptances (company_id);

alter table public.terms_acceptances enable row level security;
revoke all on table public.terms_acceptances from anon, authenticated;

-- ⚠️ **A régi, kétparaméteres alakot itt szándékosan NEM dobjuk el**, pedig
-- kell: amíg létezik, a kliens megkerülheti az elfogadás rögzítését azzal,
-- hogy a rövidebb alakot hívja.
--
-- Az ok időzítés, nem elv. A `VITE_` csomag fordításkor készül, és a Vercel
-- telepítése percekig tart — ha a függvényt ezzel a migrációval eldobnánk, az
-- **épp kiszolgált, régi csomag** a telepítés végéig hibára futna a
-- cégalapításon. Fordítva ugyanez: előbb telepíteni, utána migrálni ugyanakkora
-- ablakot nyitna, csak a másik oldalon. A cégalapítás a tölcsér legdrágább
-- lépése — ott egy perc hiba egy elveszett ügyfél.
--
-- A sorrend ezért három lépés, ablak nélkül:
--   1. ez a migráció (a négyparaméteres alak létrejön, a régi megmarad);
--   2. a kód kiadása, és a **mérés**, hogy az élő csomag a négyparaméteres
--      alakot hívja;
--   3. `20260922000300_regi_cegletrehozas_eldobasa.sql` — a régi alak eldobása.
--
-- A 3. lépés nem elhagyható: amíg megvan, a rés megvan.

create or replace function public.ceg_letrehozas(
  nev text,
  adoszam text,
  aszf_verzio text,
  kulon_kikotesek boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim text;
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

  if not exists (select 1 from public.legal_versions v where v.version = aszf_verzio) then
    raise exception 'Ismeretlen ÁSZF-változat: %. Töltsd újra az oldalt.', aszf_verzio;
  end if;

  -- Kapu, nem csak feljegyzés. Enélkül a `true` érték a sorban a **szerver**
  -- állítása volna a felhasználóról — pont az a fajta önmagára hivatkozó
  -- bizonyíték, amit ez a migráció megszüntetni hivatott.
  if kulon_kikotesek is not true then
    raise exception 'A külön kiemelt kikötések elfogadása nélkül a szerződés nem jön létre.';
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  insert into public.companies (name, tax_number, trial_ends_at)
  values (nev, adoszam, now() + interval '14 days')
  returning id into uj_ceg;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (uj_ceg, felhasznalo, 'tulajdonos', now(), cim);

  -- A szerződés az ÁSZF 1. pontja szerint **itt** jön létre, nem a
  -- regisztrációval. Tehát itt is kell nyomot hagynia.
  insert into public.terms_acceptances
    (company_id, user_id, user_email, version, unusual_terms_ack)
  values (uj_ceg, felhasznalo, cim, aszf_verzio, kulon_kikotesek);

  -- A cég születése az audit-nyom első eseménye. A `company_id` itt
  -- szándékosan ki van írva: a `belso.tolti_company_id()` trigger csak akkor
  -- töltene, ha null volna, és nem támaszkodunk arra, hogy az imént beszúrt
  -- tagsági sor már látszik neki.
  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (uj_ceg, felhasznalo, 'ceg.letrejott', 'company', uj_ceg,
          nev || ' (' || adoszam || ') létrehozva');

  return uj_ceg;
end;
$$;

-- Ez a jogosztás **nem no-op**, szemben a 20260922000100-zal: a négyparaméteres
-- alak új függvény, saját ACL-lel. A Supabase minden új `public` függvényre ad
-- nevesített EXECUTE-ot, ezért a `revoke` is nevesítve szól.
revoke all on function public.ceg_letrehozas(text, text, text, boolean) from public, anon;
grant execute on function public.ceg_letrehozas(text, text, text, boolean) to authenticated;
