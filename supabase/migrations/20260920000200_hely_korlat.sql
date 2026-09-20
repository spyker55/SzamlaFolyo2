-- ---------------------------------------------------------------------------
-- Szerveroldali helykorlát: a csomag fejszáma végre állítás, nem ígéret
--
-- # A rés, ahogy eddig állt
--
-- A `shared/uzleti/meghivo.ts` `ferMegTag()`-je eddig **csak a felületen**
-- fogott, és ezt a saját fejléce ki is mondta: „aki megkerüli a felületet, több
-- helyet vehet fel". A nyitólap árkártyái és az ÁSZF 5. pontja viszont
-- csomagonkénti felhasználószámot hirdet — vagyis egy ígéret állt szemben egy
-- nyitott API-val.
--
-- Két pont van, ahol hely foglalódik, és eddig egyiket sem őrizte semmi:
--
--   meghivot_letrehoz()  — a meghívó kiküldése (a hely lefoglalása)
--   meghivot_elfogad()   — a hely tényleges elfoglalása
--
-- ⚠️ **A második a súlyosabb, és nem is a megkerülésről szól.** Egy meghívó
-- akkor is elfogadható marad, ha közben a cég **kisebb csomagra váltott** — és
-- a portálon ez két kattintás. A kárt nem az szenvedi el, aki a csomagot
-- váltotta, hanem a meghívott, aki a legkevésbé tehet róla. A felület ezt nem
-- tudja megelőzni: az elfogadás pillanatában a meghívott gépe fut, nem a
-- tulajdonosé.
--
-- # A két szabály — és miért nem ugyanaz
--
--   kiküldéskor:   tagok + függő meghívók  <  max
--   elfogadáskor:  tagok                   <  max
--
-- A függő meghívó **foglalás**: kiküldéskor számít, különben öt meghívóval át
-- lehetne lépni egy kétfős csomagot, és a túllépés csak a meghívottnál derülne
-- ki. Elfogadáskor viszont már nem: ha két embert hívtak meg egy szabad helyre,
-- az elsőt nem büntethetjük azért, mert a másodikat is meghívták. A helyet az
-- veszi el, aki belép.
--
-- # A számok: egy igazság, két példány, és egy teszt, ami őrzi
--
-- A fejszámok a `config/szamlafolyo.ts`-ben élnek — ott, ahol az árak és a
-- keretek is. Az SQL-nek viszont **tudnia kell őket**, különben a szabály nem
-- tud a helyén lenni: a kikényszerítés oda való, ahol az írás történik (ezt a
-- Stripe-vízjel köre tanította meg).
--
-- A két példány veszélye a csendes elcsúszás. Ezt nem kommentárral kezeljük,
-- hanem **méréssel**: a `config/hely.test.ts` kiolvassa az alábbi `when` ágakat
-- ebből a fájlból, és összeveti a configgal. Ha valaki az egyiket átírja, a
-- teszt pirosra vált, és megmondja, melyik számot hagyta el.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. A csomag fejszáma a Stripe lookup_key-éből
--
-- A `null` **korlátlant** jelent (Pro). Az ismeretlen kulcs a legkisebb csomag
-- fejszámát kapja — soha nem korlátlant. Ez szó szerint a `keret.ts` 3.
-- szabálya: „a hibás irány itt a szigorúbb".
-- ---------------------------------------------------------------------------

create or replace function belso.csomag_helyek(kulcs text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case kulcs
    when 'szamlafolyo_start_havi' then 2
    when 'szamlafolyo_flow_havi'  then 5
    when 'szamlafolyo_pro_havi'   then null   -- korlatlan
    else 2                                    -- ismeretlen kulcs: a legkisebb
  end
$$;

comment on function belso.csomag_helyek(text) is
  'Hany felhasznalo fer a csomagba. NULL = korlatlan. A szamok masolatai a '
  'config/szamlafolyo.ts-nek; az elcsuszast a config/hely.test.ts fogja meg.';

-- ---------------------------------------------------------------------------
-- 2. A cég fejszáma
--
-- Futó előfizetésnél a csomagé, egyébként a próbaidőé. A „lejárt" eset
-- szándékosan **nem** tágabb, ugyanaz a mondat, mint a `meghivo.ts`-ben: aki
-- nem fizet, ne tudjon csapatot építeni.
--
-- A három futó státusz ugyanaz, amit a `keret.ts` futónak tekint — a `past_due`
-- is, mert egy lejárt bankkártya nem ok arra, hogy a csapatot szétszedjük.
-- ---------------------------------------------------------------------------

create or replace function belso.helyek(ceg uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when c.stripe_status in ('active', 'trialing', 'past_due')
      then belso.csomag_helyek(c.stripe_lookup_key)
    else 3   -- probaido: config.proba.felhasznalok
  end
  from public.companies c
  where c.id = ceg
$$;

comment on function belso.helyek(uuid) is
  'A ceg fejszama. NULL = korlatlan. Futo elofizetesnel a csomage, egyebkent '
  'a probaidoe — a lejart eset szandekosan nem tagabb.';

-- ---------------------------------------------------------------------------
-- 3. A meghívó kiküldése — a foglalás szabályával
--
-- A teljes függvény újraíródik (`create or replace` nem tud részt cserélni);
-- a `20260915000300` migrációhoz képest **egyetlen** blokk az új, a
-- „Nincs szabad hely" ág.
--
-- ⚠️ Az ellenőrzés **a régi meghívó visszavonása után** áll. Ez nem sorrendi
-- véletlen: a „küldd újra" ugyanarra a címre előbb felszabadítja a saját
-- foglalását, különben egy újraküldés a betelt cégben soha nem menne át.
-- ---------------------------------------------------------------------------

create or replace function public.meghivot_letrehoz(ceg uuid, cim text, szerep text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tiszta text := lower(trim(cim));
  uj     uuid;
  max    integer;
  foglalt integer;
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

  -- Az uj blokk: a hely. NULL = korlatlan, akkor nincs mit vizsgalni.
  max := belso.helyek(ceg);

  if max is not null then
    select
      (select count(*) from public.company_members cm
        where cm.company_id = ceg and cm.accepted_at is not null)
      + (select count(*) from public.company_invites mi
          where mi.company_id = ceg
            and mi.accepted_at is null
            and mi.revoked_at is null
            and mi.expires_at > now())
    into foglalt;

    if foglalt >= max then
      raise exception 'A csomagotokba % felhasználó fér, és a függő meghívókkal együtt már ennyi van. Vonj vissza egy meghívót, vagy válts nagyobb csomagra.', max;
    end if;
  end if;

  insert into public.company_invites (company_id, email, role, invited_by)
  values (ceg, tiszta, szerep, (select auth.uid()))
  returning id into uj;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (ceg, (select auth.uid()), 'meghivo.letrejott', 'company_invite', uj,
          tiszta || ' meghívva (' || szerep || ')');

  return uj;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. A meghívó elfogadása — a hely tényleges elfoglalása
--
-- Itt **csak a tagokat** számoljuk, a függő meghívókat nem: lásd a fejlécet.
--
-- A hibaüzenet szándékosan a **tulajdonoshoz** irányít. Ezt a mondatot az
-- olvassa, aki nem tud rajta segíteni — egy „válts nagyobb csomagra" itt
-- értelmetlen volna, mert nem ő fizet.
-- ---------------------------------------------------------------------------

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
  max         integer;
  tagok       integer;
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

  -- Az uj blokk: fer-e meg valaki. A meghivo letrejotte ota a ceg valthatott
  -- kisebb csomagra — ez az egyetlen hely, ahol ez kiderulhet.
  max := belso.helyek(m.company_id);

  if max is not null then
    select count(*) into tagok
    from public.company_members cm
    where cm.company_id = m.company_id and cm.accepted_at is not null;

    if tagok >= max then
      raise exception 'Ebben a cégben most nincs szabad hely (% felhasználó fér a csomagjukba). Szólj a cég tulajdonosának — nagyobb csomaggal vagy egy hely felszabadításával tudsz belépni.', max;
    end if;
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
