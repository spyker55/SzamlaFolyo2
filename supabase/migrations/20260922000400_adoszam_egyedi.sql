-- =============================================================================
--  Egy adószám — egy cég
-- =============================================================================
--
--  Eddig a `companies` táblán egyetlen egyedi kényszer állt, a
--  `stripe_customer_id`-é. Az adószámon nem volt semmi, vagyis ugyanaz a
--  vállalkozás **más-más cégnévvel** tetszőleges számú céget alapíthatott —
--  mindegyiket saját 14 napos próbaidővel. A próbaidő így nem korlát volt,
--  hanem egy újratölthető adag.
--
--  # Miért a törzsszám a kulcs, és nem a beírt szöveg
--
--  Két külön ok, és mindkettő megkerülhetővé tenné a nyers szövegre tett
--  egyedi indexet:
--
--  1. **Az adatbázis nem normalizál.** A `ceg_letrehozas()` azt írja be, amit a
--     kliens küld. A felület ugyan a `formaz()`-on átengedi (`12345678-2-42`),
--     de a REST-végpontot közvetlenül is meg lehet hívni — és `12345678242`
--     vagy `1234 5678 2 42` a szöveg szintjén más érték, ugyanaz az adószám.
--     Ezért az index a **számjegyeken** dolgozik, nem a leíráson.
--
--  2. **A törzsszám az adóalany állandó azonosítója.** A 9. jegy (áfakód) és az
--     utolsó kettő (megyekód) élete során változhat: egy alanyi adómentes
--     vállalkozó áfakörbe lép (1 → 2), egy cég székhelyet vált. A törzsszám
--     nem változik. A `12345678-1-30` és a `12345678-2-42` ugyanaz a
--     vállalkozás, és az első nyolc jegy ezt ki is mondja — a `shared/uzleti/
--     adoszam.ts` `torzsszam()`-a ugyanezt a nyolc jegyet veszi, és az export
--     ügyfélszűrője is ezen áll.
--
--  # Amit ez lezár, és amit nem — kimondva
--
--  ✅ Lezárja: ugyanaz a vállalkozás **nem tud párhuzamosan** több céget
--     vinni a rendszerben, más néven, több próbaidővel.
--
--  ❌ Nem zárja le: aki **törli a cégét**, utána ugyanazzal az adószámmal újra
--     alapíthat — és új próbaidőt kap. A törléskor a sor eltűnik, tehát nincs
--     mivel ütköznie. Ehhez a próbaidő-előzménynek túl kellene élnie a
--     törlést, az viszont megőrzést jelent a törlés után, amit az Adatkezelési
--     tájékoztatóban is ki kellene mondani. Külön döntés, nem ennek a
--     migrációnak a dolga.
--
--  ❌ Nem zárja le: aki **kitalál** egy ellenőrző számjegyre érvényes, de nem
--     a sajátját. Ezt csak a NAV törzsadat-lekérdezése fogná meg.
-- =============================================================================

-- A kifejezésre épülő egyedi index. `immutable` függvények kellenek hozzá — a
-- `regexp_replace` és a `left` az.
create unique index if not exists companies_torzsszam_kulcs
  on public.companies ((left(regexp_replace(tax_number, '\D', '', 'g'), 8)));

comment on index public.companies_torzsszam_kulcs is
  'Egy adóalany egy cég. A kulcs az adószám első nyolc számjegye (törzsszám), '
  'mert az áfakód és a megyekód változhat, a törzsszám nem — és mert a beírt '
  'szöveg formázása nem tekinthető állandónak.';

-- -----------------------------------------------------------------------------
-- A cégalapítás magyarul mondja meg, mi történt
-- -----------------------------------------------------------------------------
--
-- Az index önmagában is véd, de a felhasználó egy `duplicate key value violates
-- unique constraint "companies_torzsszam_kulcs"` mondatot kapna a képernyőre —
-- a `CegLetrehozas.tsx` a nyers `error.message`-t írja ki. Az üzenet ezért itt
-- készül, és azt is megmondja, mit tegyen: a leggyakoribb eset nem visszaélés,
-- hanem hogy a kolléga már regisztrálta a céget.
create or replace function public.ceg_letrehozas(nev text, adoszam text, aszf_verzio text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim text;
  uj_ceg uuid;
begin
  if felhasznalo is null then
    raise exception 'Cégalapításhoz be kell jelentkezni.';
  end if;

  -- Egy fiók egy céget kezel. A séma többet elbírna, de a termék egyet mutat,
  -- és a könyvelőiroda az ügyfeleit egy fiókban dolgozza fel — a
  -- szétválasztást az export adószámszűrője adja, nem cégadminisztráció.
  if belso.aktualis_ceg() is not null then
    raise exception 'Ehhez a fiókhoz már tartozik cég.';
  end if;

  if not exists (select 1 from public.legal_versions v where v.version = aszf_verzio) then
    raise exception 'Ismeretlen ÁSZF-változat: %. Töltsd újra az oldalt.', aszf_verzio;
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  begin
    insert into public.companies (name, tax_number, trial_ends_at)
    values (nev, adoszam, now() + interval '14 days')
    returning id into uj_ceg;
  exception
    -- Ezen a beszúráson egyetlen egyedi kényszer sülhet el: a törzsszámé. A
    -- `stripe_customer_id` ilyenkor még `null`, a `null`-ok pedig nem
    -- ütköznek egymással.
    when unique_violation then
      raise exception 'Ehhez az adószámhoz már tartozik cég a SzámlaFolyóban. '
        'Ha a kollégád már regisztrálta a céget, kérj tőle meghívót — '
        'egy vállalkozás egy céget vezet, több felhasználóval.';
  end;

  insert into public.company_members (company_id, user_id, role, accepted_at, email)
  values (uj_ceg, felhasznalo, 'tulajdonos', now(), cim);

  -- A szerződés az ÁSZF 1. pontja szerint **itt** jön létre, nem a
  -- regisztrációval. Tehát itt is kell nyomot hagynia.
  insert into public.terms_acceptances (company_id, user_id, user_email, version)
  values (uj_ceg, felhasznalo, cim, aszf_verzio);

  -- A cég születése az audit-nyom első eseménye. A `company_id` itt
  -- szándékosan ki van írva: a `belso.tolti_company_id()` trigger csak akkor
  -- töltene, ha null volna, és nem támaszkodunk arra, hogy az imént beszúrt
  -- tagsági sor már látszik neki.
  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (uj_ceg, felhasznalo, 'ceg.letrejott', 'company', uj_ceg,
          nev || ' (' || adoszam || ') létrehozva');

  return uj_ceg;
end;
$$;
