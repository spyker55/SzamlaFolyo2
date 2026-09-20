-- Adattakarítás: három kísérő adatkör, konkrét határidővel
-- =========================================================
--
-- A jogi felülvizsgálat 12. pontja kifogásolta, hogy a tájékoztató három
-- adatkörre is „a szerződés megszűnéséig" megőrzést mondott. Egy előfizetés
-- évekig él; egy lejárt meghívó nyoma nem kell évekig.
--
-- Három sor, mindhárom kilencven nap (`config/szamlafolyo.ts` → `megorzes`):
--
--   1. lezárult meghívók        — elfogadott, visszavont vagy lejárt
--   2. beküldött levelek naplója — feladó, tárgy, eredmény
--   3. a modell nyers válasza    — a kiolvasás sora MEGMARAD, csak kiürül
--
-- ⚠️ A harmadik a lényeges, és külön indokot kér. A `document_extractions`
-- sorai **szándékosan túlélik a dokumentumot**: abból számol a havi keret (a
-- terv 1. szabálya — amit a felhasználó el tud tüntetni, abból nem lehet
-- keretet számolni). Ezért itt nem sort törlünk, hanem a `raw_response`
-- oszlopot nullázzuk: a darabszám és a kredit megmarad, a bizonylat tartalmát
-- hordozó nyers válasz elmegy.
--
-- ⚠️ Ez a takarítás **pusztán SQL**, nincs mögötte Edge Function. Nem
-- egyszerűsítés: ennek a három műveletnek semmi dolga a hálózattal, és egy
-- telepítendő függvény csak újabb hely volna, ahol elromolhat. A selejtezés
-- azért más, mert a Storage-ből is törölnie kell.
--
-- Amit ez a kör **nem** old meg, és ezt ki kell mondani: a **cég nélküli,
-- tartósan inaktív fiókok** törlését. Az `auth.users` sorához az Auth admin
-- API-ja való, nem egy cron SQL-je — az külön kör. Ezért az Adatkezelési
-- tájékoztató sem ígér rá határidőt.

create or replace function belso.adattakaritas()
returns table (mit text, darab bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  meghivo_nap constant integer := 90;
  level_nap   constant integer := 90;
  nyers_nap   constant integer := 90;
begin
  -- 1. Lezárult meghívók. A „lezárult" pillanata az, amelyik bekövetkezett:
  -- elfogadás, visszavonás, vagy a lejárat. Az élő meghívóhoz nem nyúlunk.
  return query
  with torolt as (
    delete from public.company_invites
    where greatest(
            coalesce(accepted_at, 'epoch'::timestamptz),
            coalesce(revoked_at, 'epoch'::timestamptz),
            expires_at
          ) < now() - make_interval(days => meghivo_nap)
      and (accepted_at is not null or revoked_at is not null or expires_at < now())
    returning 1
  )
  select 'meghivo'::text, count(*)::bigint from torolt;

  -- 2. A beküldött levelek naplója.
  return query
  with torolt as (
    delete from public.inbound_emails
    where created_at < now() - make_interval(days => level_nap)
    returning 1
  )
  select 'level_naplo'::text, count(*)::bigint from torolt;

  -- 3. A nyers modellválasz. A sor marad, az oszlop ürül.
  return query
  with uritett as (
    update public.document_extractions
    set raw_response = null
    where raw_response is not null
      and created_at < now() - make_interval(days => nyers_nap)
    returning 1
  )
  select 'nyers_valasz'::text, count(*)::bigint from uritett;
end;
$$;

comment on function belso.adattakaritas() is
  'Napi adattakarítás: lezárult meghívók és levélnapló törlése, a nyers modellválasz ürítése. A határidők a config/szamlafolyo.ts megorzes blokkjának tükrei.';

-- Napi futás, hajnalban — de nem a selejtezés percében (03:17), hogy a két
-- feladat naplója szétválasztható maradjon.
select cron.unschedule('szamlafolyo-adattakaritas')
where exists (select 1 from cron.job where jobname = 'szamlafolyo-adattakaritas');

select cron.schedule(
  'szamlafolyo-adattakaritas',
  '41 3 * * *',
  $cron$select belso.adattakaritas()$cron$
);
