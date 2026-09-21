-- ---------------------------------------------------------------------------
-- A politikanevek ekezetesitese: az eles oldal igazodik a repohoz
--
-- 2026-09-21-ig 29 elo politika ekezet nelkuli neven allt, mikozben a repo
-- migracioi rendes magyar neveket irnak. Nem a szallitas rontotta el: az
-- ALKALMAZOTT `rls` migracio szovegeben is ASCII all a politikaneveknel, pedig
-- ugyanabban a migracioban van ekezetes szoveg. A neveket annak idejen ASCII-val
-- irtak be, a repofajlok kesobb kaptak helyes magyar neveket, es a kettot soha
-- senki nem egyeztette.
--
-- A 20260918000100 migracio ezt mar megmerte: egy
-- `drop policy if exists "…ekezetes…"` NEMAN nem csinalt semmit. A nev csak
-- cimke, viselkedest nem hordoz — a repo es az eles eltarese viszont igen,
-- mert pont az ilyen `if exists` hiusul meg csendben.
--
-- Az atnevezes tisztan metaadat: a USING es a WITH CHECK kifejezesekhez nem nyul.
--
-- ⚠️ Friss adatbazison ez NO-OP: ott a 20260912000400 mar ekezetes neven hozza
-- letre a politikakat, tehat a regi nevek nem leteznek. Ezert all minden
-- atnevezes `if exists` mogott — es ezert ellenorzi a blokk a vegen, hogy a
-- regi nev tenyleg eltunt-e.
--
-- ⚠️ A storage.objects NEGY atnevezese kulon kezet kivan. Merve: az MCP
-- `apply_migration` szerepe nem tulajdonosa a storage.objects tablanak
-- (`ERROR 42501: must be owner of table objects`), es az `alter policy …
-- rename` tulajdonosi jogot kivan. A `do` blokk atomi, tehat az elso
-- probalkozas TELJESEN visszagorgult — felkesz allapot nem keletkezett.
-- Elesben ezert a public resz ment MCP-n (22 atnevezes), a negy tarolos pedig
-- a Supabase SQL-editorbol, postgres szerepkent. Friss adatbazison ez a
-- kerdes fel sem merul: ott a regi nevek nem leteznek, tehat egyetlen rename
-- sem fut le.
-- ---------------------------------------------------------------------------

do $$
declare
  p record;
  db int := 0;
begin
  for p in
    select * from (values
      ('public', 'companies', 'A tag latja a ceget', 'A tag látja a cégét'),
      ('public', 'companies', 'A cegadatokat a tulajdonos szerkeszti', 'A cégadatokat a tulajdonos szerkeszti'),
      ('public', 'company_members', 'A tag latja a ceg tagjait', 'A tag látja a cég tagjait'),
      ('public', 'company_members', 'Tagot a tulajdonos hiv meg', 'Tagot a tulajdonos hív meg'),
      ('public', 'company_members', 'A tagsagot a tulajdonos modositja, a meghivott elfogadja', 'A tagságot a tulajdonos módosítja, a meghívott elfogadja'),
      ('public', 'company_members', 'Tagot a tulajdonos tavolit el, vagy ki-ki magat', 'Tagot a tulajdonos távolít el, vagy ki-ki magát'),
      ('public', 'files', 'A tag latja a ceg fajljait', 'A tag látja a cég fájljait'),
      ('public', 'files', 'Fajlt a szerkeszto tolt fel', 'Fájlt a szerkesztő tölt fel'),
      ('public', 'files', 'Fajlt a szerkeszto modosit', 'Fájlt a szerkesztő módosít'),
      ('public', 'files', 'Fajlt a szerkeszto torol', 'Fájlt a szerkesztő töröl'),
      ('public', 'documents', 'A tag latja a ceg bizonylatait', 'A tag látja a cég bizonylatait'),
      ('public', 'documents', 'Bizonylatot a szerkeszto hoz letre', 'Bizonylatot a szerkesztő hoz létre'),
      ('public', 'documents', 'Bizonylatot a szerkeszto javit', 'Bizonylatot a szerkesztő javít'),
      ('public', 'documents', 'Bizonylatot a szerkeszto torol', 'Bizonylatot a szerkesztő töröl'),
      ('public', 'document_extractions', 'A tag latja a ceg kiolvasasait', 'A tag látja a cég kiolvasásait'),
      ('public', 'document_corrections', 'A tag latja a ceg javitasait', 'A tag látja a cég javításait'),
      ('public', 'document_corrections', 'Javitast a szerkeszto rogzit', 'Javítást a szerkesztő rögzít'),
      ('public', 'exports', 'A tag latja a ceg exportjait', 'A tag látja a cég exportjait'),
      ('public', 'exports', 'Exportot a szerkeszto keszit', 'Exportot a szerkesztő készít'),
      ('public', 'exports', 'Exportot a szerkeszto modosit', 'Exportot a szerkesztő módosít'),
      ('public', 'exports', 'Exportot a tulajdonos torol', 'Exportot a tulajdonos töröl'),
      ('public', 'overage_charges', 'A tulhasznalatot a tulajdonos latja', 'A túlhasználatot a tulajdonos látja'),
      ('public', 'activity_log', 'A tag latja a ceg naplojat', 'A tag látja a cég naplóját'),
      ('public', 'activity_log', 'Naplobejegyzest a szerkeszto fuz hozza', 'Naplóbejegyzést a szerkesztő fűz hozzá'),
      ('storage', 'objects', 'A tag letolti a cege bizonylatait', 'A tag letölti a cége bizonylatait'),
      ('storage', 'objects', 'Bizonylatot a szerkeszto tolt fel', 'Bizonylatot a szerkesztő tölt fel'),
      ('storage', 'objects', 'Bizonylatfajlt a szerkeszto cserel', 'Bizonylatfájlt a szerkesztő cserél'),
      ('storage', 'objects', 'Bizonylatfajlt a szerkeszto torol', 'Bizonylatfájlt a szerkesztő töröl')
    ) as t(sema, tabla, regi, uj)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = p.sema and tablename = p.tabla and policyname = p.regi
    ) then
      execute format('alter policy %I on %I.%I rename to %I', p.regi, p.sema, p.tabla, p.uj);
      db := db + 1;

      if exists (
        select 1 from pg_policies
        where schemaname = p.sema and tablename = p.tabla and policyname = p.regi
      ) then
        raise exception 'Az atnevezes nem fogott: %.% / %', p.sema, p.tabla, p.regi;
      end if;
    end if;
  end loop;

  raise notice 'Atnevezve: % politika', db;
end;
$$;
