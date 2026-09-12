-- A feldolgozási sor hajtása.
--
-- A régi rendszerben ezt két dolog hajtotta: a böngésző (amíg valaki nézte a
-- Beérkezőt) és a cron. Mindkettő kényszer volt — osztott tárhelyen nem futhat
-- hosszú életű folyamat. Itt a felosztás szándékos:
--
--   * az **élő utat** a feltöltés utáni közvetlen függvényhívás hajtja
--     (`src/lib/feltoltes.ts`), mert az a leggyorsabb visszajelzés;
--   * az **elakadt és a félbemaradt** futásokat ez a cron szedi fel.
--
-- A claim mindkét úton ugyanaz az egyetlen feltételes UPDATE, ezért a kettő nem
-- tud egymásra taposni: aki elsőnek írja át az állapotot, azé a munka.

create extension if not exists pg_cron;
create extension if not exists pg_net;

/**
 * A kiolvasó meghívása kötegelt módban.
 *
 * A service_role kulcsot a **Vaultból** olvassa, nem a parancsba írva: egy
 * cron-definíció bárki számára olvasható, aki a `cron.job` táblát látja, és egy
 * ott felejtett kulcs csendben marad ott örökre.
 *
 * Ha a titok nincs beállítva, a függvény **nem hibázik, hanem nem csinál
 * semmit** — így egy hiányzó beállítás nem tölti meg percenként a naplót. A
 * hiánya a `belso.sor_allapot()`-ból derül ki.
 */
create or replace function belso.sort_hajt()
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
    url := alap || '/functions/v1/kiolvas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || kulcs
    ),
    body := jsonb_build_object('limit', 5),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function belso.sort_hajt() from public, anon, authenticated;

/**
 * Beállítottuk-e már a sorkezeléshez szükséges titkokat.
 *
 * Erre azért van szükség, mert a `sort_hajt()` szándékosan néma: egy hiányzó
 * titok így nem tölti meg a naplót, viszont kell egy hely, ahol ez kiderül.
 */
create or replace function belso.sor_allapot()
returns table (titok text, megvan boolean)
language sql
security definer
set search_path = ''
as $$
  select v.nev,
         exists (select 1 from vault.decrypted_secrets s where s.name = v.nev)
  from (values ('projekt_url'), ('service_role_kulcs')) as v(nev)
$$;

revoke all on function belso.sor_allapot() from public, anon, authenticated;

-- Percenként. A kiolvasás másodpercekig tart, tehát ennél sűrűbbnek nincs
-- értelme; ritkábbnál viszont egy elakadt bizonylat sokáig állna.
select cron.schedule(
  'szamlafolyo-sor',
  '* * * * *',
  $$select belso.sort_hajt()$$
);
