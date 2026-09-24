-- SzámlaFolyó — az `exportok` bucket fogadja a ZIP-et is
--
-- A Novitax (`szamla.csv` + `partner.csv`) és a Kulcs (`feladas.csv` + `.001`
-- + `.002`) exportja egyetlen ZIP. A bucket `allowed_mime_types` listája a
-- 20260912000700-as migráció óta csak XLSX-et, CSV-t és JSON-t engedett, így
-- a feltöltés „mime type application/zip is not supported" hibával bukott el
-- – még az átjelölés előtt, tehát egyetlen tétel sem kapott `export_id`-t.
--
-- A lista a TS oldalon `shared/uzleti/export/mime.ts`-ben él; a
-- `migracio.test.ts` őrzi, hogy itt is minden szerepeljen belőle.
--
-- Méret, láthatóság és politikák változatlanok.

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/json',
  'application/zip'
]
where id = 'exportok';
