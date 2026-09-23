-- Kilépés a cégből, a fiók megtartásával.
--
-- # A rés
--
-- 2026-09-23-ig egy tagnak két rossz lehetősége volt: törli az **egész
-- fiókját** (`/fiok-torles`), vagy megkéri a tulajdonost, hogy távolítsa el.
-- A kettő nem helyettesíti egymást: a fiók törlése visszafordíthatatlan, a
-- kilépés nem az — aki kilép, holnap új meghívót kaphat ugyanarra a címre.
--
-- Egy könyvelő, aki befejezte a megbízást, nem akarja elveszíteni a fiókját.
-- Eddig mégis ezt kínáltuk neki.
--
-- # Miért RPC, és miért nem egy politika-ág
--
-- Mert a `20260923000100` épp most vette ki a `user_id = auth.uid()` ágat a
-- `company_members` politikáiból — az volt a mért jogosultság-emelés forrása.
-- Az önkiszolgáló műveletnek ezért **itt** a helye: egy `security definer`
-- függvényben, ami a szabályt kimondja, nem egy politikában, ami mindent
-- egyszerre enged.
--
-- # A három kimenetel, és miért nem kettő
--
-- A `shared/uzleti/kilepes.ts` ugyanezt mondja a böngészőnek. A két tiltás:
--
-- * **egyedül** — a kilépés olyan cégsort hagyna hátra, amihez soha senki nem
--   férne hozzá (se törölni, se exportálni nem lehetne), az adószáma viszont a
--   `companies_torzsszam_kulcs` egyedi index miatt **örökre foglalt** maradna.
--   Ugyanaz a vállalkozás nem tudna új céget alapítani. Ott a fióktörlés a
--   helyes út: az a cégsort is elviszi.
-- * **utolsó tulajdonos** — szó szerint az ÁSZF 5. pontja, ugyanaz a mondat,
--   ami a fióktörlés `tiltva` ágán is áll.
--
-- A `belso.gazdatlan_ceg_tiltas()` trigger a másodikat amúgy is megfogná — de
-- egy triggerből jövő hibaüzenet nem az a hely, ahol egy felhasználónak
-- magyarázunk. Itt előbb fut a saját ellenőrzés, a saját mondatával.
--
-- # A naplósor a törlés ELŐTT megy be
--
-- Nem stiláris: a tagsági sor a törléssel elszáll, és a
-- `belso.tolti_company_id()` trigger sem tudná már megmondani, melyik céghez
-- tartozott. Ez pontosan az a hiányosság, amit a fióktörlés köre kimondottan
-- nyitva hagyott: *„A törlés nem ír naplósort a megmaradó cégbe a kilépés
-- ágán."* A bent maradó tulajdonosnak látnia kell, hogy egy felhasználó
-- kilépett — különben csak annyit vesz észre, hogy valaki eltűnt a listából.

create or replace function public.cegbol_kilepek()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  ceg uuid;
  ceg_nev text;
  sajat_szerep text;
  tagok int;
  mas_tulajdonos boolean;
  cim text;
begin
  if felhasznalo is null then
    raise exception 'A kilépéshez be kell jelentkezni.';
  end if;

  ceg := belso.aktualis_ceg();

  if ceg is null then
    raise exception 'Nem tartozol céghez, tehát nincs honnan kilépni.';
  end if;

  select c.name into ceg_nev from public.companies c where c.id = ceg;

  select m.role into sajat_szerep
    from public.company_members m
   where m.company_id = ceg and m.user_id = felhasznalo;

  select count(*), coalesce(bool_or(m.role = 'tulajdonos' and m.user_id <> felhasznalo), false)
    into tagok, mas_tulajdonos
    from public.company_members m
   where m.company_id = ceg;

  if tagok <= 1 then
    raise exception 'Egyedül vagy a(z) % fiókjában, ezért a kilépés nem a helyes út: '
      'a cég adataihoz soha többé senki nem férne hozzá, az adószám viszont foglalt '
      'maradna. Ha meg akarsz válni a cégtől, a Fiók törlése a helyes út.', ceg_nev;
  end if;

  if sajat_szerep = 'tulajdonos' and not mas_tulajdonos then
    raise exception 'Te vagy a(z) % egyetlen tulajdonosa, és rajtad kívül % felhasználó '
      'dolgozik benne. Előbb jelölj ki másik tulajdonost, vagy távolítsd el a többi '
      'felhasználót.', ceg_nev, tagok - 1;
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  -- ⚠️ A naplósor a törlés ELŐTT megy be: utána már nincs mihez kötni.
  insert into public.activity_log
    (company_id, user_id, action, subject_type, subject_id, summary)
  values (ceg, felhasznalo, 'tag.kilepett', 'company_member', ceg,
          coalesce(cim, 'Egy felhasználó') || ' kilépett a cégből.');

  delete from public.company_members
   where company_id = ceg and user_id = felhasznalo;

  return ceg_nev;
end
$$;

comment on function public.cegbol_kilepek() is
  'A hívó kilép a saját cégéből, a fiókja megmarad. Elutasítja, ha egyedül van '
  '(gazdátlan cégsort hagyna), vagy ha ő az egyetlen tulajdonos és mások is bent '
  'vannak (ÁSZF 5.). A törlés előtt naplósort ír.';

-- A Supabase minden új `public` függvényre ad nevesített EXECUTE-ot, ezért a
-- `revoke` is nevesítve szól — ugyanaz a minta, mint a `ceg_letrehozas`-nál.
revoke all on function public.cegbol_kilepek() from public, anon;
grant execute on function public.cegbol_kilepek() to authenticated;
