-- A jogi szövegek 2026-10-08 változata.
--
-- - Adatkezelés 3. pont: a kiolvasó modell a Google Gemini 3.8 Flash helyett
--   az Anthropic Claude Haiku 5.5, a Google Cloud Vertex AI végpontján. A
--   mondat a feldolgozót (Google) és a gyártót (a configból) külön mondja ki,
--   és azt is, hogy a kérést a Google kezeli, és a Google közzétett vállalása
--   szerint a tartalmat a gyártóval nem osztja meg.
-- - ÁSZF: a szöveg nem változott, csak a közös hatálybalépési dátum, ezért a
--   lenyomata új. Impresszum: szó szerint azonos, a lenyomata is az.
--
-- A lenyomatok a `jogi-archivum/2026-10-08/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`). Élesben ekkor három cég van.
--
-- ⚠️ Ennek a sornak élesben **a felület telepítése előtt** kell állnia: a
-- `ceg_letrehozas()` a böngésző küldte változatot a `legal_versions`-ben
-- keresi, és ismeretlen változatra megáll.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-10-08',
  date '2026-10-08',
  '670a0c3913aa04b4cfc4aaebe0263c654722bdb7367b59b4b13cf74652cbf44c',
  'c743324bb8f0d6bd88553618766b06bf73405d63d6971f1866ea84c47555c8f9',
  '031446ccd327ddef4a1290242ec923837d19c10d19e665bc62306fc6e3f1abd9'
)
on conflict (version) do nothing;
