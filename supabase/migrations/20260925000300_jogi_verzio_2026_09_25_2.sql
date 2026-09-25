-- A jogi szövegek 2026-09-25-2 változata.
--
-- - Adatkezelési tájékoztató: teljes átírás. Két táblázat (saját
--   adatkezelés és az Előfizető megbízásából végzett adatfeldolgozás), az
--   OpenRouter-szerződés szerepei és „Sensitive Data" kikötése, a két
--   Google-végpont és a nulla adatmegőrzés feltétele, három törlési szint,
--   a soha nem exportált bizonylat, a tagság vége és a 180 napos fiókszabály,
--   a Vercel kiszolgálónaplója, GDPR 22. cikk, feltételes érintetti jogok.
-- - ÁSZF és Impresszum: változatlan, a lenyomatuk ugyanaz, mint a
--   2026-09-25-é.
--
-- A lenyomatok a `jogi-archivum/2026-09-25-2/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`). Élesben ekkor is egyetlen cég
-- volt, a tulajdonosé.
--
-- ⚠️ Ennek a sornak élesben **a felület telepítése előtt** kell állnia: a
-- `ceg_letrehozas()` a böngésző küldte változatot a `legal_versions`-ben
-- keresi, és ismeretlen változatra megáll.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-25-2',
  date '2026-09-25',
  '56eca3d5f60a1dc3379a0718b660f597f199783404173d22b29722790938165a',
  '43313313691830df1513a842f1ac675e1c183a79da0d1d05416261c1223fa1cc',
  'f533ccae21d00803f92084d0de5d41cb40bb8b852f34e9f3ae1a6acac44a4ab1'
)
on conflict (version) do nothing;
