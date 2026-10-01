-- ---------------------------------------------------------------------------
-- Biztonsági szigorítás a 2026-10-01-i átvilágítás után
--
-- Az átvilágítás (DONTESTORTENET, 2026-10-01) a Supabase-tanácsadókat, az
-- RLS-politikákat, az oszlopjogokat, a SECURITY DEFINER függvényeket, az Edge
-- Functionök hitelesítését és a naplókat nézte végig. Kritikus rést nem
-- talált; amit talált, az mind ugyanabba a családba tartozik: **a politika a
-- cégre szűr, de egy sor a saját cégén belül is mutathat kifelé.** Ezeket
-- zárja le ez a migráció, négy önálló réteggel.
-- ---------------------------------------------------------------------------

-- Az `alter table` kizárólagos zárat kér a `files`-ra és a `documents`-re. Az
-- első kiadás 60 s után időtúllépéssel állt meg, és visszagörgetődött (mérve:
-- egyik eleme sem jött létre). Utána nyitott tranzakciót már nem találtunk, a
-- zárat tehát egy közben lefutott kérés fogta — hogy melyik, nem tudjuk.
-- Inkább bukjon el gyorsan, mint hogy addig minden más kérés mögötte álljon.
set local lock_timeout = '5s';

-- 1. Tagsági sort csak a két RPC hoz létre.
--
--    A `company_members` INSERT politikája (`adminisztralhat(company_id)`) és
--    a tábla szintű INSERT jog együtt megengedte, hogy egy tulajdonos meghívó
--    nélkül, **bármilyen `user_id`-val** sort szúrjon a saját cégébe — a
--    `created_at`-et is ő adta meg. A `belso.aktualis_ceg()` a legkorábbi
--    tagságot választja, tehát egy régi dátummal az idegen felhasználó
--    „aktuális cége" a támadóé lett volna, és a feltöltései oda kerülnek.
--    Feltétele az áldozat UUID-jának ismerete volt, ami cégek között nem
--    látszik — de egy azonosító kiszivárgása nem elméleti (lásd a
--    `20260923000100` fejlécét).
--
--    Jogos közvetlen beszúrás nincs: a kliens egyetlen helyen sem ír ide
--    (mérve: `grep`), a tagság a `ceg_letrehozas()`-ban és a
--    `meghivot_elfogad()`-ban születik, mindkettő SECURITY DEFINER.
drop policy "Tagot a tulajdonos hív meg" on public.company_members;
revoke insert on public.company_members from anon, authenticated;
revoke update on public.company_members from anon;

--    És ha valaha mégis lenne út: egy fiók egy céget kezel. Ezt a két RPC
--    eddig is kimondta (`aktualis_ceg() is not null` → hiba), most az
--    adatbázis is. Mérve 2026-10-01: 0 fiók tartozik egynél több céghez.
create unique index company_members_egy_fiok_egy_ceg on public.company_members (user_id);

-- 2. A tárolóútvonal a saját cég mappájában van.
--
--    A `kiolvas` és a `selejtez` `service_role`-lal tölti le, illetve törli a
--    `files.storage_path`-ot — az RLS-t megkerülve. Az oszlopot viszont a
--    szerkesztő a saját sorában átírhatja, és az exportsor `file_path`-ját
--    (a `created_at`-tel együtt) ő maga adja meg. Egy idegen útvonallal így
--    elvben egy másik cég fájlja lett volna kiolvasható vagy törölhető.
--
--    Mérve 2026-10-01: 30 fájlból és 12 exportból 0 sor sérti a szabályt.
--    A `..` tilalma csak a fájloké: ott az útvonal teljesen szerveroldali
--    (`<cég>/<uuid>.<kiterjesztés>`), az export neve viszont a cégnévből jön.
alter table public.files
  add constraint files_utvonal_a_ceg_mappajaban check (
    storage_path is null
    or (starts_with(storage_path, company_id::text || '/') and strpos(storage_path, '..') = 0)
  );

alter table public.exports
  add constraint exports_utvonal_a_ceg_mappajaban check (
    file_path is null or starts_with(file_path, company_id::text || '/')
  );

-- 3. A bizonylat a saját cégének fájljára mutat.
--
--    Ugyanaz a rés másik ajtón: a `documents.file_id` idegen kulcsát az
--    adatbázis az RLS-től függetlenül ellenőrzi, tehát egy szerkesztő
--    beszúrhatott volna egy bizonylatot egy **más cég** fájljára mutatva — és
--    a kiolvasó azt `service_role`-lal letöltötte volna. Mérve: 0 ilyen sor.
alter table public.files
  add constraint files_id_company_id_key unique (id, company_id);

alter table public.documents
  add constraint documents_fajl_a_sajat_cegbol
  foreign key (file_id, company_id) references public.files (id, company_id) on delete cascade;

-- 4. Naplósort mindenki csak a saját nevében ír.
--
--    Az `activity_log` a cég egyetlen audit-nyoma (lásd `naplozas.test.ts`).
--    A politika eddig csak a céget nézte, a `user_id`-t nem: egy szerkesztő
--    más tag nevében is írhatott bejegyzést. A kliens (`lib/naplo.ts`) mindig
--    a saját azonosítóját küldi, tehát ez semmit nem tör el.
alter policy "Naplóbejegyzést a szerkesztő fűz hozzá" on public.activity_log
  with check (belso.szerkeszthet(company_id) and user_id = (select auth.uid()));

-- 5. Index a jóváhagyás új lekérdezéséhez.
--
--    A `jovahagy()` 2026-10-01 óta minden jóváhagyáskor kiolvassa a bizonylat
--    korábbi javításait (`document_id` + `extraction_id`). Erre a tanácsadó is
--    jelzett: a `document_id` külső kulcsnak nem volt indexe.
create index document_corrections_document_idx
  on public.document_corrections (document_id, extraction_id);
