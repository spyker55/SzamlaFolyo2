-- =============================================================================
--  ADATKIADÁS — az ÁSZF 16. pontja szerinti kötelezettség teljesítése
-- =============================================================================
--
--  Mit ad ki, és miért pont ezt
--  ----------------------------
--  Az ÁSZF 16. pontja kimondja, hogy a felületi export a *jóváhagyott*
--  tételekre és az eredeti fájlokra szól, és tételesen felsorolja, mit NEM visz
--  el: a jóváhagyásra váró vagy hibára futott bizonylat kiolvasott adatát, a
--  cég beállításait, a tevékenységnaplót és a beküldött levelek
--  nyilvántartását. Ugyanott a Szolgáltató vállalja, hogy ezeket kérésre,
--  **géppel olvasható, szerkezetében dokumentált formátumban** kiadja, a
--  szerződés megszűnésétől számított harminc napon belül.
--
--  Ez a lekérdezés az a teljesítés. Egyetlen JSON dokumentumot ad vissza, a
--  cég MINDEN sorával a 15 cégfüggő táblából — állapottól függetlenül, tehát a
--  félbemaradt és a hibára futott bizonylatok is benne vannak.
--
--  A szerkezet leírása: `eszkozok/adatkiadas/OLVASS-EL.md`. A két fájl együtt
--  jár: a „szerkezetében dokumentált" ígéretet a leírás teljesíti, nem a JSON
--  kulcsnevei.
--
--  Hogyan futtasd
--  --------------
--  Supabase → SQL Editor. Az első sorban írd át a cég azonosítóját, futtasd,
--  és a kapott egyetlen cellát mentsd `.json` néven. Nem kell hozzá
--  `service_role` kulcs, és nem kell a kulcsot sehova bemásolni.
--
--  ⚠️ Ha a lekérdezés NULLA SORT ad vissza, akkor nincs ilyen cég — ilyenkor
--  nem kiadható fájl készült, hanem elgépelted az azonosítót. Ne küldj ki
--  semmit. (Az őr indoka a `kiadando` CTE fölött áll.)
--
--  ⚠️ Ez a lekérdezés CSAK OLVAS. Nincs benne insert, update, delete — a
--  kiadás nem változtathat azon, amit kiad.
--
--  ⚠️ Két mezőt szándékosan NEM ad ki: a `companies.bekuldes_token`-t és a
--  `company_invites.token`-t. Ezek nem adatok, hanem **élő kulcsok**: aki a
--  beküldő címet ismeri, a cég keretéből költ, aki a meghívó jelét ismeri,
--  beléphet a cégbe. Egy kiadott fájl e-mailben utazik és másolatokban marad
--  fenn; egy bemutatóra szóló kulcsnak nincs helye benne. Mindkettő elérhető a
--  felületen annak, akit illet (Beállítások → E-mailes beküldés, illetve
--  Tagok). A helyükön `null` áll és egy megjegyzés, hogy a hiány szándékos —
--  enélkül a hiányzó mező hibának látszana.
--
--  ⚠️ Amit ez NEM tartalmaz: az eredeti fájlok TARTALMÁT (PDF-ek, képek,
--  XML-ek). Azok a tárolóban vannak, és a felületi exporttal ZIP-ben
--  letölthetők, amíg a megőrzési idő alatt megvannak. A `fajlok` szakasz a
--  nyilvántartásukat adja — köztük a `file_deleted_at`-ot, amiből látszik,
--  melyik eredeti fájl törlődött már a megőrzési szabály szerint.
-- =============================================================================

with megadott as (
  -- ⬇️ ITT írd át: a cég azonosítója (companies.id)
  select '00000000-0000-0000-0000-000000000000'::uuid as ceg_id
),

-- ⚠️ Ez a `join` az egyetlen őr ezen a lekérdezésen, és nem formaság.
-- Mérve: ha a CTE csak egy beírt azonosítót tartalmaz, egy ELGÉPELT azonosító
-- nem hibát ad, hanem egy tökéletesen szabályos JSON-t — `ceg: null`-lal és
-- csupa üres tömbbel. Azt ki lehetne küldeni „itt vannak az adataid" címen,
-- és a címzett nem tudná megkülönböztetni egy valóban üres cégtől.
-- A `companies`-hoz kötve ismeretlen azonosítóra a lekérdezés NULLA SORT ad:
-- nincs mit félreérteni, és nincs mit kiküldeni.
kiadando as (
  select m.ceg_id
    from megadott m
    join public.companies c on c.id = m.ceg_id
)

select jsonb_pretty(jsonb_build_object(

  -- A kiadás maga: mikor készült, miről, és melyik szerkezet szerint.
  -- A `sema_verzio` nem díszítés: ha a táblák változnak, a leírás és a JSON
  -- együtt lép tovább, és a címzett tudja, melyik leírást kell olvasnia.
  'kiadas', jsonb_build_object(
    'keszult', now(),
    'ceg_id', k.ceg_id,
    'sema_verzio', '2',
    'leiras', 'eszkozok/adatkiadas/OLVASS-EL.md',
    'idozona', 'Minden időbélyeg UTC, ISO 8601 alakban.',
    'penznem', 'Az amount_ft és az overage_limit_ft forint. A cost USD. A credits darab.'
  ),

  -- A cég és a beállításai. A beküldő token helyén szándékos `null`.
  'ceg', (
    select to_jsonb(c) - 'bekuldes_token'
           || jsonb_build_object('bekuldes_token',
                to_jsonb('[kihagyva: élő kulcs, lásd Beállítások → E-mailes beküldés]'::text))
      from public.companies c
     where c.id = k.ceg_id
  ),

  'tagok', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb)
      from public.company_members t
     where t.company_id = k.ceg_id
  ),

  -- A meghívó jele ugyanúgy élő kulcs, mint a beküldő token.
  'meghivok', (
    select coalesce(jsonb_agg(
             (to_jsonb(m) - 'token'
              || jsonb_build_object('token', to_jsonb('[kihagyva: élő kulcs]'::text)))
             order by m.created_at), '[]'::jsonb)
      from public.company_invites m
     where m.company_id = k.ceg_id
  ),

  'fajlok', (
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]'::jsonb)
      from public.files f
     where f.company_id = k.ceg_id
  ),

  -- MINDEN bizonylat, állapottól függetlenül: a jóváhagyásra váró és a hibára
  -- futott is. Pontosan ez az, amit a felületi export nem visz el.
  'bizonylatok', (
    select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at), '[]'::jsonb)
      from public.documents d
     where d.company_id = k.ceg_id
  ),

  -- A kiolvasások, a modell nyers válaszával együtt. A `document_extractions`
  -- szándékosan túléli a bizonylat törlését (a keret ebből számol), ezért
  -- lehetnek benne olyan sorok, amiknek a `document_id`-ja már `null`.
  'kiolvasasok', (
    select coalesce(jsonb_agg(to_jsonb(ki) order by ki.created_at), '[]'::jsonb)
      from public.document_extractions ki
     where ki.company_id = k.ceg_id
  ),

  'javitasok', (
    select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at), '[]'::jsonb)
      from public.document_corrections j
     where j.company_id = k.ceg_id
  ),

  'exportok', (
    select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at), '[]'::jsonb)
      from public.exports e
     where e.company_id = k.ceg_id
  ),

  'tulhasznalat', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb)
      from public.overage_charges t
     where t.company_id = k.ceg_id
  ),

  'beerkezo_levelek', (
    select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at), '[]'::jsonb)
      from public.inbound_emails l
     where l.company_id = k.ceg_id
  ),

  'naplo', (
    select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]'::jsonb)
      from public.activity_log n
     where n.company_id = k.ceg_id
  ),

  'aszf_elfogadasok', (
    select coalesce(jsonb_agg(to_jsonb(a) order by a.accepted_at), '[]'::jsonb)
      from public.terms_acceptances a
     where a.company_id = k.ceg_id
  ),

  -- A könyvelőprogram-export kontírja: főkönyvi számok, napló- és ÁFA-kódok,
  -- cégszinten (`ugyfel_torzsszam: null`) és ügyfelenként.
  'konyvelo_beallitasok', (
    select coalesce(jsonb_agg(to_jsonb(b) order by b.updated_at), '[]'::jsonb)
      from public.konyvelo_beallitasok b
     where b.company_id = k.ceg_id
  ),

  -- A könyvelőprogramoknak kiadott belső sorszámok (Novitax bizonylatszám,
  -- Kulcs iktatószám). A bizonylattal együtt törlődnek.
  'iktatoszamok', (
    select coalesce(jsonb_agg(to_jsonb(i) order by i.szam), '[]'::jsonb)
      from public.iktatoszamok i
     where i.company_id = k.ceg_id
  ),

  -- A csomagváltások nyoma: a váltásig felhasznált kredit és a régi csomag.
  'keret_fedezetek', (
    select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]'::jsonb)
      from public.keret_fedezetek f
     where f.company_id = k.ceg_id
  ),

  -- Darabszámok. Nem a JSON kedvéért van benne: ez az, amivel a címzett (és a
  -- kiadó) egy pillantással ellenőrizni tudja, hogy a fájl teljes-e, anélkül
  -- hogy több ezer sort számolna meg kézzel.
  'darabszamok', (
    select jsonb_build_object(
      'tagok', (select count(*) from public.company_members x where x.company_id = k.ceg_id),
      'meghivok', (select count(*) from public.company_invites x where x.company_id = k.ceg_id),
      'fajlok', (select count(*) from public.files x where x.company_id = k.ceg_id),
      'bizonylatok', (select count(*) from public.documents x where x.company_id = k.ceg_id),
      'kiolvasasok', (select count(*) from public.document_extractions x where x.company_id = k.ceg_id),
      'javitasok', (select count(*) from public.document_corrections x where x.company_id = k.ceg_id),
      'exportok', (select count(*) from public.exports x where x.company_id = k.ceg_id),
      'tulhasznalat', (select count(*) from public.overage_charges x where x.company_id = k.ceg_id),
      'beerkezo_levelek', (select count(*) from public.inbound_emails x where x.company_id = k.ceg_id),
      'naplo', (select count(*) from public.activity_log x where x.company_id = k.ceg_id),
      'aszf_elfogadasok', (select count(*) from public.terms_acceptances x where x.company_id = k.ceg_id),
      'konyvelo_beallitasok', (select count(*) from public.konyvelo_beallitasok x where x.company_id = k.ceg_id),
      'iktatoszamok', (select count(*) from public.iktatoszamok x where x.company_id = k.ceg_id),
      'keret_fedezetek', (select count(*) from public.keret_fedezetek x where x.company_id = k.ceg_id)
    )
  )

)) as adatkiadas
  from kiadando k;
