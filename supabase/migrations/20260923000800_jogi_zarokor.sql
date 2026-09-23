-- A jogi szövegek 2026-09-23-3 változata: a jogi rész zárókörének tartalmi
-- változásai.
--
-- - ÁSZF 9., 12., 13.: a hibás teljesítés (szavatosság, felróhatóságtól
--   függetlenül) és a kártérítés (Ptk. 6:142. §, kimentéssel) egyetlen
--   szabályként, a 13. pontban; a 9. és a 12. pont rá hivatkozik.
-- - Adatkezelés 2.: kikerült a látogatásmérés múltja (tesztidőszak, előfizető
--   nélkül) és a „ha egyszer újra mérnénk" figyelmeztetés.
-- - Impresszum: változatlan, a lenyomat ugyanaz, mint a 2026-09-23-2-é.
--
-- A lenyomatok a `jogi-archivum/2026-09-23-3/` fájlok SHA-256-jai
-- (`npx vite-node eszkozok/jogiArchivum.ts`); a
-- `src/oldalak/jogi/archivum.test.tsx` itt keresi őket. A hatálybalépés napja
-- ugyanaz a nap: előfizető ekkor még nem volt (élesben mérve egyetlen cég, a
-- tulajdonosé), az ÁSZF 15. pontja szerinti előzetes értesítés senkit nem érint.

insert into public.legal_versions
  (version, effective_from, aszf_sha256, adatkezeles_sha256, impresszum_sha256)
values (
  '2026-09-23-3',
  date '2026-09-23',
  'dda4b7eb8336a6c72bb5808bc4c7f0ec6b9bd8dbe618fc07f43d7eea7308d17b',
  'c061a4a93c49c4b2218f33a95cb1be95631ca237d5a579be66f61b3574ff9a7a',
  'f533ccae21d00803f92084d0de5d41cb40bb8b852f34e9f3ae1a6acac44a4ab1'
)
on conflict (version) do nothing;
