import type { Program } from './konyvelo/beallitas.ts';

/**
 * Az exportfájlok MIME-típusa – ezzel megy fel az `exportok` bucketbe.
 *
 * A bucket `allowed_mime_types` listája **külön él** az adatbázisban; ami itt
 * szerepel, annak ott is szerepelnie kell, különben a feltöltés bukik el
 * (2026-09-24: a Novitax-ZIP pont így akadt el). A `migracio.test.ts` őrzi.
 */
export const EXPORT_MIME: Record<'xlsx' | 'csv' | 'json' | Program, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  json: 'application/json',
  rlb: 'text/csv',
  novitax: 'application/zip',
  kulcs: 'application/zip',
};
