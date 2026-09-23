-- A tagsági sor nem a felhasználóé: a cégé.
--
-- # A rés
--
-- 2026-09-23-ig a `company_members` UPDATE politikája így szólt:
--
--   using       (belso.adminisztralhat(company_id) or user_id = auth.uid())
--   with check  (belso.adminisztralhat(company_id) or user_id = auth.uid())
--
-- A második ág azt engedte meg, hogy **bárki a saját tagsági sorát írja**. Az
-- `authenticated` szerep pedig tábla szintű UPDATE jogot kapott, tehát a
-- `role` és a `company_id` oszlopra is (`has_column_privilege` szerint).
--
-- A kettő együtt jogosultság-emelés. Visszagörgetett tranzakcióban mérve, egy
-- `megtekinto` szerepű felhasználó jogaival — a kontrollal együtt, hogy
-- előtte az idegen cégből **0 sort látott és 0 sort írt**:
--
--   A) `update company_members set role = 'tulajdonos' where user_id = <ő>`
--      → megtekinto -> tulajdonos
--   B) `update company_members set company_id = <idegen cég>`
--      → a tagsága átkerült egy másik cégbe, ahol soha nem volt keresnivalója
--   C) utána látta az idegen céget, és átírta a nevét `ELFOGLALVA`-ra
--
-- Az A) UUID ismerete nélkül elérhető bárkinek, aki egy többfős cégben van.
-- A B)–C) a cél cég azonosítójának ismeretéhez kötött — de egy azonosító
-- kiszivárgása nem elméleti: képernyőképen, hibaüzenetben, támogatási
-- levélben is elmegy.
--
-- # A másik fele: a gazdátlan cég
--
-- Ugyanez az ág a DELETE politikában is ott állt, és ettől az **egyedüli
-- tulajdonos** is kiléphetett egy többfős cégből. Mérve: utána 0 tulajdonos
-- maradt. A bent maradók így nem tudnának se tagot kezelni, se előfizetést
-- mondani, se törölni — mindhárom tulajdonosi jog.
--
-- Ezt az ÁSZF 5. pontja és a `shared/uzleti/fiokTorles.ts` `tiltva` ága
-- kimondja — csakhogy **egyedül a fióktörlés útján**. A REST API-n nem állt
-- semmi az útjában, és a felület hallgatása nem védelem.
--
-- # Amit ez a migráció csinál
--
-- Három réteg, és mindhárom önmagában is véd:
--
-- 1. **A politikákból kiesik a `user_id = auth.uid()` ág.** Sem írni, sem
--    törölni nem lehet a saját tagsági sort a REST-en át. A meghívó
--    elfogadása ettől nem sérül: a `meghivot_elfogad()` `security definer`,
--    tehát megkerüli az RLS-t (mérve).
-- 2. **Oszlopszintű jog: az `authenticated` csak a `role`-t írhatja.** A
--    `company_id`-t és a `user_id`-t így akkor sem lehetne átírni, ha egy
--    politika valaha visszalazulna. Ugyanaz a minta, mint a
--    `20260914000100` a `companies` hat mezőjén.
-- 3. **Trigger a gazdátlanság ellen.** A politika a tulajdonost továbbra is
--    engedi — ő pedig **saját magát** is eltávolíthatná. A trigger ezt
--    akkor is megfogja, ha tulajdonos csinálja, és akkor is, ha az utolsó
--    tulajdonost csak lefokozzák.
--
-- ⚠️ Amit ez a migráció NEM ad: kijáratot a bent maradóknak. Kilépni a
-- `20260923000200` RPC-jén lehet, ami ugyanezt a szabályt mondja ki, csak
-- magyar mondattal és naplósorral. A kettő egy körben készült.

-- 1. A politikák

drop policy if exists "A tagságot a tulajdonos módosítja, a meghívott elfogadja"
  on public.company_members;

create policy "A tagságot csak a tulajdonos módosítja"
  on public.company_members
  for update
  using (belso.adminisztralhat(company_id))
  with check (belso.adminisztralhat(company_id));

drop policy if exists "Tagot a tulajdonos távolít el, vagy ki-ki magát"
  on public.company_members;

create policy "Tagot a tulajdonos távolít el"
  on public.company_members
  for delete
  using (belso.adminisztralhat(company_id));

-- 2. Oszlopszintű jog
--
-- A tábla szintű UPDATE elvétele után nevesítve adjuk vissza azt az egy
-- oszlopot, amit a felület ténylegesen ír (`szerepetMent()`). Az
-- `accepted_at`-et a `meghivot_elfogad()` írja, `security definer` jogon —
-- annak ez a revoke nem akadály.

revoke update on table public.company_members from authenticated;
grant update (role) on table public.company_members to authenticated;

-- 3. A gazdátlanság tiltása

create or replace function belso.gazdatlan_ceg_tiltas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  erintett uuid := old.company_id;
  maradok int;
  tulajok int;
begin
  -- A cég törlése kaszkádban viszi a tagságokat. Olyankor nincs kit
  -- gazdátlanul hagyni — és ha itt hibáznánk, a cégtörlés hasalna el.
  if not exists (select 1 from public.companies c where c.id = erintett) then
    return null;
  end if;

  select count(*), count(*) filter (where m.role = 'tulajdonos')
    into maradok, tulajok
    from public.company_members m
   where m.company_id = erintett;

  -- Aki egyedül volt, az nem hagy maga után senkit. Őt nem tiltjuk ki a saját
  -- kijáratából — ugyanaz a döntés, mint a `torlesDontes()` `egyedul` ága.
  if maradok = 0 then
    return null;
  end if;

  if tulajok = 0 then
    raise exception 'A cégnek nem maradhatnak felhasználói tulajdonos nélkül. '
      'Előbb jelölj ki másik tulajdonost, vagy távolítsd el a többi felhasználót.';
  end if;

  return null;
end
$$;

comment on function belso.gazdatlan_ceg_tiltas() is
  'Megakadályozza, hogy egy cégben felhasználók maradjanak tulajdonos nélkül. '
  'Az ÁSZF 5. pontja ezt ígéri; 2026-09-23 előtt csak a fióktörlés útján állt, '
  'a REST API-n nem.';

drop trigger if exists ceg_ne_maradjon_gazdatlan on public.company_members;

create trigger ceg_ne_maradjon_gazdatlan
  after delete or update of role, company_id on public.company_members
  for each row execute function belso.gazdatlan_ceg_tiltas();
