-- ---------------------------------------------------------------------------
-- A fiók törlése: a tények lekérdezése
--
-- # Mit csinál, és mit nem
--
-- **Semmit nem töröl.** Ez a függvény csak megmondja, mi történne — a
-- törlést az Edge Function végzi, `service_role`-lal.
--
-- A szétválasztás oka nem szépészeti: a képernyőnek azelőtt kell pontosan
-- kiírnia a következményt, hogy a felhasználó igent mond. Egy „minden adatod
-- törlődik" mondat senkit nem állít meg; egy „312 bizonylat és 8 export" igen.
--
-- # Miért nincs paramétere
--
-- Ugyanaz az elv, mint a `varo_meghivo()`-nál: a felhasználó a munkamenetből
-- jön (`auth.uid()`), sosem a hívó állításából. Egy `fiok_torles_tenyek(uuid)`
-- alak azt engedné meg, hogy bárki megnézze, mekkora cége van másnak.
--
-- # Amit a számok jelentenek
--
-- A `tagok_szama` **csak az elfogadott** tagságokat számolja: egy kiküldött,
-- de el nem fogadott meghívó nem tart életben egy céget. (A meghívó sorok a
-- cég törlésekor amúgy is elszállnak a kaszkáddal.)
--
-- A `fajlok` a **tárolóban ténylegesen ott lévő** fájlokat számolja
-- (`storage_path is not null`), nem a `files` sorokat: egy exportált és már
-- selejtezett bizonylat fájlja nincs meg, azt nem ígérjük törlésre.
-- ---------------------------------------------------------------------------

create or replace function public.fiok_torles_tenyek()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hivo uuid := (select auth.uid());
  ceg uuid;
  sor public.companies%rowtype;
  sajat_szerep text;
  tagok integer;
  masik_tulaj boolean;
begin
  if hivo is null then
    return jsonb_build_object('vanCeg', false);
  end if;

  ceg := belso.aktualis_ceg();

  if ceg is null then
    return jsonb_build_object(
      'vanCeg', false,
      'cegNev', null,
      'szerep', null,
      'tagokSzama', 0,
      'masikTulajdonos', false,
      'elofizetesFut', false,
      'idoszakVege', null,
      'bizonylatok', 0,
      'exportok', 0,
      'fajlok', 0
    );
  end if;

  select * into sor from public.companies c where c.id = ceg;

  select cm.role into sajat_szerep
  from public.company_members cm
  where cm.company_id = ceg and cm.user_id = hivo and cm.accepted_at is not null;

  select count(*) into tagok
  from public.company_members cm
  where cm.company_id = ceg and cm.accepted_at is not null;

  select exists (
    select 1 from public.company_members cm
    where cm.company_id = ceg
      and cm.accepted_at is not null
      and cm.role = 'tulajdonos'
      and cm.user_id <> hivo
  ) into masik_tulaj;

  return jsonb_build_object(
    'vanCeg', true,
    'cegNev', sor.name,
    'szerep', sajat_szerep,
    'tagokSzama', tagok,
    'masikTulajdonos', masik_tulaj,
    -- Ugyanaz a harom statusz, amit a shared/uzleti/keret.ts futonak tekint.
    -- A past_due is futo: egy lejart kartya nem jelenti azt, hogy nincs mit
    -- elveszteni.
    'elofizetesFut', coalesce(sor.stripe_status in ('active', 'trialing', 'past_due'), false),
    'idoszakVege', sor.current_period_end,
    'bizonylatok', (select count(*) from public.documents d where d.company_id = ceg),
    'exportok', (select count(*) from public.exports e where e.company_id = ceg),
    'fajlok', (
      select count(*) from public.files f
      where f.company_id = ceg and f.storage_path is not null
    )
  );
end;
$$;

-- A Supabase minden uj public fuggvenyre nevesitett EXECUTE-ot ad; azt csak
-- nevesitve lehet elvenni.
revoke all on function public.fiok_torles_tenyek() from public, anon;
grant execute on function public.fiok_torles_tenyek() to authenticated;

comment on function public.fiok_torles_tenyek() is
  'Mi tortenne a fiok torlesekor. NEM torol semmit — a dontest a '
  'shared/uzleti/fiokTorles.ts hozza, a vegrehajtast a fiok-torles Edge '
  'Function. Parametere nincs: a felhasznalo a munkamenetbol jon.';
