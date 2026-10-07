import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A 2026-10-01-i biztonsági szigorítás (`20261001000200`) őre.
 *
 * Mind a négy réteg ugyanazt a családot zárja: a politika a cégre szűr, de
 * egy sor a saját cégén belül is mutathatott kifelé — egy idegen fiókra, egy
 * idegen tárolóútvonalra, egy idegen fájlra, egy idegen nevére írt naplósorra.
 * Élesben, visszagörgetett tranzakcióban mérve: előtte mind az öt támadás
 * sikerült, utána mind elbukik, a kontroll (saját naplósor) pedig átmegy.
 *
 * Az őr a migrációs **lánc végét** nézi: egy réteg akkor él, ha a legutolsó
 * rá vonatkozó utasítás a létrehozása, és nem egy későbbi eldobás.
 */

const MAPPA = new URL('.', import.meta.url).pathname;

/** Az összes migráció, sorrendben, megjegyzések nélkül. */
const lanc = readdirSync(MAPPA)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => ({ fajl: f, sql: readFileSync(MAPPA + f, 'utf8').replace(/--[^\n]*/g, '') }));

/** Az utolsó utasítás, ami illeszkedik valamelyik mintára — a lánc sorrendjében. */
function utolso(...mintak: RegExp[]): { fajl: string; utasitas: string } | null {
  let talalat: { fajl: string; utasitas: string } | null = null;

  for (const { fajl, sql } of lanc) {
    for (const utasitas of sql.split(';')) {
      const tiszta = utasitas.replace(/\s+/g, ' ').trim();
      if (mintak.some((m) => m.test(tiszta))) talalat = { fajl, utasitas: tiszta };
    }
  }

  return talalat;
}

describe('1. tagsági sort csak az RPC-k hoznak létre', () => {
  it('az INSERT politika utoljára eldobva', () => {
    const u = utolso(/policy "Tagot a tulajdonos hív meg"/);
    expect(u?.utasitas, `${u?.fajl}: a közvetlen tagbeszúrás politikája újra él.`).toMatch(/^drop policy/);
  });

  it('az INSERT jog utoljára elvéve', () => {
    const u = utolso(/^(grant|revoke) [a-z, ]*\binsert\b[a-z, ]* on (table )?public\.company_members\b/);
    expect(u?.utasitas, `${u?.fajl}: az INSERT jog a company_members-en visszakerült.`).toMatch(/^revoke/);
    expect(u?.utasitas).toContain('authenticated');
  });

  it('egy fiók egy céget kezel: egyedi index a user_id-n', () => {
    const u = utolso(/company_members_egy_fiok_egy_ceg/);
    expect(u?.utasitas).toBe(
      'create unique index company_members_egy_fiok_egy_ceg on public.company_members (user_id)',
    );
  });
});

describe('2–3. idegen útvonalra és idegen fájlra nem mutathat sor', () => {
  it.each([
    ['files_utvonal_a_ceg_mappajaban', "starts_with(storage_path, company_id::text || '/')"],
    ['exports_utvonal_a_ceg_mappajaban', "starts_with(file_path, company_id::text || '/')"],
    ['documents_fajl_a_sajat_cegbol', 'foreign key (file_id, company_id) references public.files (id, company_id)'],
  ])('%s él a lánc végén', (nev, tartalom) => {
    const u = utolso(new RegExp(`\\b${nev}\\b`));
    expect(u?.utasitas, `${u?.fajl}: a(z) ${nev} kényszert eldobták.`).toMatch(/^alter table .* add constraint/);
    expect(u?.utasitas).toContain(tartalom);
  });

  it('a fájlútvonalban nincs „..”', () => {
    expect(utolso(/\bfiles_utvonal_a_ceg_mappajaban\b/)?.utasitas).toContain("strpos(storage_path, '..') = 0");
  });

  /**
   * ⚠️ 2026-10-01 és 10-07 között két külső kulcs kötötte a `documents`-et a
   * `files`-hoz, és ettől minden `files(…)` beágyazás HTTP 300-at kapott a
   * PostgREST-től — a Beérkező üres maradt, a kiolvasó nem vett fel semmit.
   * A két tábla között **egy** kapcsolat lehet: az összetett.
   */
  it('a documents → files között egyetlen külső kulcs él: a régi egyoszlopos eldobva', () => {
    const u = utolso(/\bdocuments_file_id_fkey\b/);
    expect(u?.utasitas, `${u?.fajl}: a régi documents_file_id_fkey újra él — a files(…) beágyazás kétértelmű.`).toMatch(
      /^alter table public\.documents drop constraint documents_file_id_fkey$/,
    );
  });
});

describe('4. naplósor csak a saját nevedben', () => {
  it('az activity_log INSERT politikája a user_id-t is nézi', () => {
    const u = utolso(/policy "Naplóbejegyzést a szerkesztő fűz hozzá"/);
    expect(u?.utasitas, `${u?.fajl}: a naplópolitika legutolsó alakja nem köti meg a user_id-t.`).toContain(
      'user_id = (select auth.uid())',
    );
  });
});
