-- A cégalapítás nyomot hagy a cég saját naplójában.
--
-- # Mi hiányzott
--
-- Az `activity_log` a cég audit-nyoma, és minden állapotváltó művelet ír bele:
-- export, selejtezés, beküldés, meghívó, helykorlát, előfizetés, beállítás.
-- Egyetlen esemény maradt ki, és épp az első: maga a cégalapítás. Egy napló,
-- aminek nincs nyitósora, arra a kérdésre nem tud válaszolni, hogy *mikor és
-- ki hozta létre ezt a céget*.
--
-- # Miért most, és miért nem kozmetika
--
-- 2026-09-22-én, az első nyilvános regisztráció mérésekor derült ki, hogy az
-- `auth.audit_log_entries` tábla a platform oldalán **üres — nulla sor,
-- valaha**. A Supabase ezen a projekten nem tart saját hitelesítési nyomot.
-- Vagyis a mi `activity_log`-unk nem egy a nyomok közül, hanem az egyetlen —
-- és eddig pont a kezdőpont hiányzott belőle.
--
-- # Amihez nem nyúlunk
--
-- A függvény minden más sora **változatlan**: ugyanaz a két kapu (belépés,
-- „egy fiók egy céget kezel"), ugyanaz a 14 napos próbaidő, és a tagsági sor
-- továbbra is megkapja a tag címét (`20260915000300`). A törzset ezért nem
-- kézzel másoltam át, hanem az előző kiadásból emeltem ki — egy `create or
-- replace` a teljes függvényt felülírja, tehát egy kifelejtett sor itt
-- **csendes visszafejlődés** volna.
--
-- Erre őr is áll: `supabase/migrations/naplozas.test.ts` a legkésőbbi
-- definíciót olvassa ki, és elbukik, ha az nem ír naplósort.

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

-- A jogok újbóli kimondása szándékos. Egy `create or replace` megtartja a
-- meglévő ACL-t, tehát ez ma no-op — de így a migráció önmagában is igazat
-- mond arról, ki hívhatja a függvényt, és egy friss adatbázison sem múlik
-- azon, hogy két korábbi migráció sorrendben lefutott-e.
revoke all on function public.ceg_letrehozas(text, text) from public, anon;
grant execute on function public.ceg_letrehozas(text, text) to authenticated;
