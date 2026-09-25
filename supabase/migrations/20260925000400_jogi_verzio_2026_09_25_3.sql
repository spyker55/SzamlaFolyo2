-- A jogi szövegek 2026-09-25-3 változata.
--
-- - Impresszum: rövidebb, tárgyszerűbb szöveg (a tulajdonos tervezete). A
--   békéltető testület mai elérhetőségei (új ügyek: +36 46 501-091,
--   folyamatban lévő ügyek: +36 46 501-871, bekeltetes@bokik.hu), a
--   tárhelyszolgáltatók adatvédelmi e-mail-címe (Ektv. 4. §), feltételes
--   békéltetés, pontosított szellemi tulajdon.
-- - ÁSZF és Adatkezelés: változatlan, a lenyomatuk ugyanaz, mint a
--   2026-09-25-2-é.
--
-- A lenyomatok a `jogi-archivum/2026-09-25-3/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`). Élesben ekkor is egyetlen cég
-- volt, a tulajdonosé.
--
-- ⚠️ Ennek a sornak élesben **a felület telepítése előtt** kell állnia: a
-- `ceg_letrehozas()` a böngésző küldte változatot a `legal_versions`-ben
-- keresi, és ismeretlen változatra megáll.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-25-3',
  date '2026-09-25',
  '56eca3d5f60a1dc3379a0718b660f597f199783404173d22b29722790938165a',
  '43313313691830df1513a842f1ac675e1c183a79da0d1d05416261c1223fa1cc',
  '47b813eddfc630a0e280a326d7ed06651cce1439db8563e3df19f83bf09286f8'
)
on conflict (version) do nothing;
