-- A `companies` írható oszlopainak leszűkítése.
--
-- # A rés
--
-- Az RLS **sorokat** korlátoz, oszlopokat nem. A „A cégadatokat a tulajdonos
-- szerkeszti" politika helyes abban, hogy *melyik* sort engedi — de a
-- `grant update on public.companies to authenticated` után a tulajdonos a saját
-- sorának **bármelyik** oszlopát átírhatta a REST API-n át. Köztük ezeket:
--
--   stripe_price_id, stripe_status, trial_ends_at, current_period_*
--
-- Vagyis egy PATCH kéréssel bárki Pro csomagra tehette magát, vagy 2099-ig
-- meghosszabbíthatta a próbaidejét. Ezt nem feltételeztük: **megmértük**, a
-- valódi tulajdonos jogosultságával, visszagörgetett tranzakcióban — az UPDATE
-- átment, és a sor `csomag=price_…4FXUyHhe statusz=active proba_vege=2099-01-01`
-- lett.
--
-- Ez azért most derült ki, mert a keretszámolás pont ezekből az oszlopokból
-- olvas. **Egy kvóta, ami a kliens által írható mezőkre épül, nem kvóta.**
--
-- # A javítás
--
-- Oszlopszintű jogosztás. Ez a Postgres saját, deklaratív válasza a kérdésre,
-- és van egy tulajdonsága, amit külön értékelünk: **az alapértelmezés a
-- tiltás.** Ha valaki holnap új oszlopot vesz fel a `companies`-ba, az nem
-- válik magától írhatóvá — észre kell venni és kimondani.
--
-- A számlázási oszlopokat ezután kizárólag a Stripe-webhook írja, a
-- `service_role` kulcsával, az Edge Functionből — tehát onnan, ahová a
-- felhasználó nem lát be.
--
-- # Amit szándékosan NEM engedünk
--
-- A `tax_number` kimarad. Egy elgépelt adószám javítása jogos igény, de az
-- adószám nem kozmetika: az export ügyfélszűrője és az automatikus jóváhagyás
-- „eltér-e a cég szokásaitól" kapuja is ebből dolgozik. Egy csendes átírás
-- visszamenőleg sorolná át, hogy melyik bizonylat kié. Ha kell, külön,
-- ellenőrzött úton adjuk meg — nem egy szabad szöveges mezőben.

-- Először mindent el, aztán vissza, pontosan. A `revoke` az `anon`-ra is szól:
-- annak ma sincs egyetlen politikája sem a `companies`-on, tehát nem veszít
-- semmit — viszont így nem marad ott egy jog, ami egy jövőbeli politika mellett
-- hirtelen jelentést kapna.
revoke insert, update, delete on public.companies from anon, authenticated;

-- Amit a tulajdonos tényleg állít a Beállítások képernyőn.
--
-- Hogy *ki* állíthatja, azt továbbra is az RLS politika dönti
-- (`public.adminisztralhat(id)`); ez a jogosztás csak azt mondja meg, hogy
-- **mit** lehet egyáltalán átírni. A kettő együtt ad teljes választ.
grant update (
  name,
  default_currency,
  file_retention_days,
  auto_jovahagyas_be,
  overage_enabled,
  overage_limit_ft
) on public.companies to authenticated;

comment on table public.companies is
  'A cég. Az UPDATE jog oszlopszinten szűkített: a számlázási oszlopokat '
  '(stripe_*, trial_ends_at, current_period_*) kizárólag a service_role írja. '
  'Lásd a 20260914000100 migrációt — ez egy mért, élesben igazolt rés javítása.';
