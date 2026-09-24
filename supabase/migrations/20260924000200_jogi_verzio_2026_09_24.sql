-- A jogi szövegek 2026-09-24 változata.
--
-- - Adatkezelés 2.: új sor a táblázatban – a cég létrehozásakor adott,
--   önkéntes, zárt listás „Honnan hallottál rólunk?" válasz (cél: a
--   marketingcsatornák összesített mérése sütis mérés nélkül; jogalap: jogos
--   érdek; megőrzés: a cég adataival együtt törlődik). A mező maga:
--   `20260924000100_honnan_hallottal.sql`.
-- - ÁSZF: szövege változatlan, csak a közös hatálybalépési dátum.
-- - Impresszum: változatlan, a lenyomat ugyanaz, mint a 2026-09-23-3-é.
--
-- A lenyomatok a `jogi-archivum/2026-09-24/` fájlok SHA-256-jai
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
  '2026-09-24',
  date '2026-09-24',
  '4e4a59b401025fdc75b0be56ec557c31e105b01eec23005b127cf77e1f9b5eb9',
  'c1c7c0d6081b67ced7d015901ac19c8e1b3095ab571044dded086fd7c2f74024',
  'f533ccae21d00803f92084d0de5d41cb40bb8b852f34e9f3ae1a6acac44a4ab1'
)
on conflict (version) do nothing;
