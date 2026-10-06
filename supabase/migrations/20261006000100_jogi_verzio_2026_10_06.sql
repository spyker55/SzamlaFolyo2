-- A jogi szövegek 2026-10-06 változata.
--
-- - Adatkezelés: a látogatásmérés visszajön a nyilvános oldalakon, süti-ablak
--   nélkül (a tulajdonos döntése). A 2. pont új táblázatsorral és bekezdéssel
--   kimondja, mit mér, hol fut, és hogy a mérőkód olvassa a böngészőtárolót
--   (`__va_attribution`); az 5. pont Vercel-sora és a 7. pont ehhez igazodik.
-- - ÁSZF és Impresszum: a szöveg nem változott, csak a közös hatálybalépési
--   dátum, ezért a lenyomatuk új.
--
-- A lenyomatok a `jogi-archivum/2026-10-06/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`). Élesben ekkor két cég van.
--
-- ⚠️ Ennek a sornak élesben **a felület telepítése előtt** kell állnia: a
-- `ceg_letrehozas()` a böngésző küldte változatot a `legal_versions`-ben
-- keresi, és ismeretlen változatra megáll.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-10-06',
  date '2026-10-06',
  '4994641e503e2e3bec1fca4e6816aa3f67a3b3b4ed115585be39c3ee8f8bf739',
  '918bd69f40444d24007dafb73b7374159c6e7e0d5c276b2ddcf970872f592d4e',
  '031446ccd327ddef4a1290242ec923837d19c10d19e665bc62306fc6e3f1abd9'
)
on conflict (version) do nothing;
