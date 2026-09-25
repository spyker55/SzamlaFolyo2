-- A jogi szövegek 2026-09-25 változata.
--
-- - ÁSZF, negyedik jogi kör (mind a 17 pont): Ptk. 6:152. § (szándékos
--   szerződésszegés), a felelősségi korlát alsó határa (a legkisebb csomag
--   hathavi díja), a szolgáltatóváltás alatti törlésfelfüggesztés
--   (`20260925000100_valtas_torles_felfuggesztes.sql`), a módosítás
--   elutasításának külön útja, a szerződés iktatása és kérésre megküldése,
--   a költési korlát pontos leírása, kisebb csomag és felhasználószám.
-- - Adatkezelés 4. és 6.: a felfüggesztés és a negyedik megszűnési mód; a
--   gépi jóváhagyás felelősségi mondata az ÁSZF 4. pontjához igazítva.
-- - Impresszum: változatlan, a lenyomat ugyanaz, mint a 2026-09-24-é.
--
-- A lenyomatok a `jogi-archivum/2026-09-25/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`). Élesben mérve ekkor egyetlen
-- cég volt, a tulajdonosé: az ÁSZF 15. pontja szerinti előzetes értesítés
-- senkit nem érint.
--
-- ⚠️ Ennek a sornak élesben **a felület telepítése előtt** kell állnia: a
-- `ceg_letrehozas()` a böngésző küldte változatot a `legal_versions`-ben
-- keresi, és ismeretlen változatra megáll.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-25',
  date '2026-09-25',
  '56eca3d5f60a1dc3379a0718b660f597f199783404173d22b29722790938165a',
  '4835a347cf42af6dbeadd815518d47a4e07417a3e5af15a2aaf7c9e9ffa66cd5',
  'f533ccae21d00803f92084d0de5d41cb40bb8b852f34e9f3ae1a6acac44a4ab1'
)
on conflict (version) do nothing;
