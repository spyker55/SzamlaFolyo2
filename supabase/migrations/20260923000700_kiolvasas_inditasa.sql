-- Az e-mailben érkezett bizonylat kiolvasása azonnal indul, nem a percfordulón.
--
-- # Miért
--
-- A böngészős feltöltés a sor beszúrása után maga hívja a `kiolvas`-t. Az
-- e-mailes útnál ilyen nem volt: a bizonylat `feltoltve` állapotban várta a
-- percenkénti cront (`szamlafolyo-sor`), tehát a levél befogadása után 0–60
-- másodpercet (átlagosan ~30-at) állt, mielőtt bármi történt vele. A tulajdonos
-- tesztjében (2026-09-23) ez épp 3 másodperc volt, mert a levél a percforduló
-- előtt érkezett — szerencse, nem tervezés.
--
-- # Miért SQL-ből, és nem függvényből függvénybe
--
-- A `kiolvas` `verify_jwt: true`-val fut: csak érvényes JWT-vel hívható. Az
-- Edge Functionökbe injektált `SUPABASE_SERVICE_ROLE_KEY` viszont **nem
-- ugyanaz** a betűsor, mint az örökölt `service_role` JWT (`token.ts`
-- docblockja — a cron emiatt kapott percenként 403-at), és lehet, hogy nem is
-- JWT. Arra építeni azt jelentené, hogy élesben derül ki, átmegy-e.
--
-- A cron útja viszont **percenként bizonyítottan átmegy**: a vaultban álló
-- kulccsal, pg_net-en (a naplóban `role: service_role`, `HS256`). Ez a
-- függvény ugyanazt az utat járja, egyetlen különbséggel: nem a sort kéri
-- (`limit`), hanem a megnevezett dokumentumot (`dokumentum_id`) — így egy
-- többmellékletes levél bizonylatai párhuzamosan futnak, ahogy a böngészős
-- feltöltésnél is.
--
-- # Ami nem romolhat el tőle
--
-- - A `net.http_post` **sorba tesz**, nem vár: a kérést a pg_net háttérfolyamata
--   küldi el a tranzakció után. A levél befogadása nem lassul.
-- - Ha az indítás bármiért nem megy át, a bizonylat `feltoltve` marad, és a
--   cron a következő percfordulón felveszi — ahogy eddig. Az azonnali indítás
--   gyorsítás, nem új függőség.
-- - A kettős indítás (ez + a cron ugyanabban a másodpercben) nem gond: a
--   `kiolvas` claim-je atomikus, a második hívó üres kézzel távozik. A
--   böngészős út ugyanígy él együtt a cronnal 2026-09-12 óta.
--
-- # Ki hívhatja
--
-- Csak a `service_role` (az `email-bekuldes`). A Supabase az új `public`
-- függvényekre alapból végrehajtási jogot ad az `anon` és az `authenticated`
-- szerepnek — ezt itt kifejezetten visszavonjuk, és a telepítés után mérjük.

create or replace function public.kiolvasast_indit(dokumentum uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  alap text;
  kulcs text;
begin
  -- Csak a még el nem kezdett bizonylatot indítjuk. Minden más állapotban
  -- (már fut, kész, duplikátum, hiba) a hívás semmit nem tesz.
  if not exists (
    select 1 from public.documents d where d.id = dokumentum and d.status = 'feltoltve'
  ) then
    return;
  end if;

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
    body := jsonb_build_object('dokumentum_id', dokumentum),
    timeout_milliseconds := 120000
  );
end;
$$;

comment on function public.kiolvasast_indit(uuid) is
  'Egy feltoltve állapotú bizonylat kiolvasásának azonnali indítása pg_net-en, a cron kulcsával. Csak service_role hívhatja (email-bekuldes).';

revoke all on function public.kiolvasast_indit(uuid) from public, anon, authenticated;
grant execute on function public.kiolvasast_indit(uuid) to service_role;
