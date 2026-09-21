-- A kiolvasás mérőeszköze: hová megy el az idő, és mennyit gondolkodik a modell.
--
-- Az indok egy mérés, aminek nem volt folytatása. Egy valódi, egyoldalas PDF
-- kiolvasása 9,0 másodperc volt (2026-09-20, `kiolvas` v14) — ebből a tárolt
-- nyers válasz mindössze **836 karakter**, nagyjából 250-300 token. A
-- szolgáltató viszont **1096 kimeneti tokent** számlázott. A különbség, úgy
-- 800 token, nincs benne a válaszban.
--
-- A valószínű magyarázat a modell **gondolkodása**: a Gemini 3.x alapból
-- gondolkodik, és a szolgáltató ezeket a tokeneket a `completion_tokens`-be
-- számolja bele. Ha így van, a generálási idő kétharmada-háromnegyede olyasmire
-- megy el, amit soha nem látunk — egy olyan feladatnál, ahol a séma amúgy is
-- kikényszeríti a válasz alakját.
--
-- ⚠️ De ez eddig **következtetés volt, nem mérés**, és pont ezért nem
-- csinálunk belőle semmit. Ez a migráció (a hozzá tartozó kódváltozással
-- együtt) nem gyorsít semmin: azt teszi lehetővé, hogy a következő lassú
-- bizonylat **megmondja**, hol ment el az idő, ahelyett hogy találgatnánk.
-- A gondolkodás korlátozása utána jöhet szóba — és akkor is a pontosságot
-- kell mérni hozzá, nem a stopperórát: a `gemini-3.1-flash-lite` pontosan
-- azon bukott meg, hogy magabiztosan talált ki szállítóneveket.
--
-- Két oszlop, két külön kérdés:
--
--   * `reasoning_tokens` — saját oszlop, mert ezt össze fogjuk mérni az
--     `output_tokens`-szel, csomagonként és modellenként. `null` akkor marad,
--     ha a szolgáltató nem küldte (régi sorok, XML-ág, nem gondolkodó modell) —
--     és a `null` itt tartalmi állítás: nem tudjuk, nem pedig nulla.
--
--   * `szakaszok_ms` — jsonb, mert diagnosztika: a szakaszok neve és száma
--     változhat anélkül, hogy migrációt kérne. A `duration_ms` marad a teljes
--     lánc ideje; ez a bontása.
--
-- A megőrzési takarítás (`belso.adattakaritas()`) a `raw_response`-t nullázza
-- 90 nap után, mert az bizonylattartalom. Ez a két oszlop **marad**: ezredmásodpercek
-- és darabszámok, nincs bennük ügyféladat — és pont az a dolguk, hogy hosszú
-- távon összemérhetők legyenek.

alter table public.document_extractions
  add column if not exists reasoning_tokens integer,
  add column if not exists szakaszok_ms jsonb;

comment on column public.document_extractions.reasoning_tokens is
  'A modell gondolkodására elment tokenek (usage.completion_tokens_details.reasoning_tokens). Az output_tokens RÉSZE, nem afölött van. NULL = a szolgáltató nem küldte (pl. XML-ág), nem pedig nulla.';

comment on column public.document_extractions.szakaszok_ms is
  'A duration_ms bontása szakaszonként, ezredmásodpercben: letoltes, felderites, szetszedes, kiolvasas, elozmeny, iras. Diagnosztika — a megőrzési takarítás szándékosan nem nyúl hozzá, mert nincs benne bizonylattartalom.';
