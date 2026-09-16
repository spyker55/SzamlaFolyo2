-- „Vár rád meghívó?" — a kérdés, amit a cégalapítás előtt fel kell tenni.
--
-- # A rés, amit ez betöm
--
-- A meghívott fiókot nyit, megerősíti a címét, és a linket elveszíti: kitörli a
-- levelet, más gépről lép be, vagy egyszerűen csak később. Onnantól a kód
-- **csendben rossz irányba viszi**:
--
--   belép, nincs cége  →  a `Ceggel` őr a /ceg-letrehozas-ra küldi
--   ott áll            →  a képernyő egy szót sem tud a meghívóról
--   céget alapít       →  a `meghivot_elfogad` 3. kapuja **véglegesen** kizárja
--
-- És nincs mögötte kijárat: a /fiok-torles ma is helyőrző, tehát a beragadt
-- felhasználó saját magától sem tud visszalépni. Az élesben mért eset egy
-- valódi fiók volt, nulla tagsággal.
--
-- Nem hibaüzenet keletkezik, hanem egy egyirányú ajtó — ugyanaz a hibaosztály,
-- amit ebben a projektben végig javítottunk.

/**
 * A belépett fiókra váró, még élő meghívó — vagy nulla sor.
 *
 * # Miért nincs paramétere
 *
 * ⚠️ Egy `varo_meghivo(cim text)` alak **cím-kitalálós orákulum** volna: bárki
 * végigkérdezhetné, kit hívtak meg és hova. A cím ezért a munkamenetből jön
 * (`auth.users.email`), sosem a kliens állításából — ugyanaz az elv, amiért a
 * `belso.aktualis_ceg()` sem kap felhasználó-azonosítót.
 *
 * # Két kapu
 *
 * 1. Van-e munkamenet. Enélkül nincs cím, amire nézni lehetne.
 * 2. **Van-e már cége a fióknak.** Ha van, a meghívó úgysem fogadható el
 *    (`meghivot_elfogad` 3. kapuja) — egy kártya, ami egy biztosan elbukó
 *    gombhoz vezet, rosszabb a semminél.
 *
 * Az élő állapot négy feltétele szó szerint ugyanaz, amit a `meghivo_adatok()`
 * is számol. Legfeljebb egy sort ad: ha valakit többször hívtak, a legfrissebb
 * meghívó az érvényes — a régebbieket a „Küldd újra" amúgy is visszavonja.
 */
create or replace function public.varo_meghivo()
returns table (jel text, ceg_nev text, szerep text, lejar timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  felhasznalo uuid := (select auth.uid());
  cim         text;
begin
  if felhasznalo is null then
    return;
  end if;

  if belso.aktualis_ceg() is not null then
    return;
  end if;

  select lower(u.email) into cim from auth.users u where u.id = felhasznalo;

  if cim is null then
    return;
  end if;

  return query
  select mi.token::text, c.name::text, mi.role::text, mi.expires_at
  from public.company_invites mi
  join public.companies c on c.id = mi.company_id
  where mi.email = cim
    and mi.accepted_at is null
    and mi.revoked_at is null
    and mi.expires_at > now()
  order by mi.created_at desc
  limit 1;
end;
$$;

-- A `revoke ... from public` önmagában kevés: a Supabase minden új `public`
-- függvényre nevesített EXECUTE jogot ad az `anon` és az `authenticated`
-- szerepnek, azt pedig csak nevesítve lehet visszavonni.
revoke all on function public.varo_meghivo() from public, anon;
grant execute on function public.varo_meghivo() to authenticated;
