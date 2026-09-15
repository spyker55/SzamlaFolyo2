-- A meghívó levél kiküldésének nyoma.
--
-- # Miért kellett ez egy körrel később
--
-- Az első verzió a listában „Elküldve" címkét írt minden függő meghívóra —
-- **függetlenül attól, hogy a levél tényleg kiment-e.** Élesben ez azonnal el is
-- sült: a böngésző a CORS-elővizsgálaton elbukott, a Resendhez egyetlen kérés
-- sem ment, a felület mégis azt mondta, hogy elküldve.
--
-- Ez a projekt cardinal sinje: **ígéret, amit a kód nem tart be.** A címke csak
-- akkor mondhatja azt, hogy elküldtük, ha van róla feljegyzés — ezért kap a sor
-- egy `sent_at` mezőt, amit kizárólag a sikeres kiküldés ír be.
--
-- A `null` itt nem hiányzó adat, hanem **állítás**: ennél a meghívónál nem
-- tudunk kiküldött levélről. A felület pontosan ezt írja ki, és a tulajdonos
-- tudja, hogy a linket kézzel kell átadnia, vagy újra kell próbálnia.

alter table public.company_invites
  add column sent_at timestamptz;

comment on column public.company_invites.sent_at is
  'Mikor ment ki sikeresen a meghívó levél. NULL = nem tudunk kiküldött '
  'levélről — a felület ezt ki is írja, mert a csendben elmaradt levél a '
  'legrosszabb kimenetel.';

/**
 * A kiküldés rögzítése.
 *
 * A `meghivo-kuld` Edge Function hívja, **a hívó jogával**, közvetlenül azután,
 * hogy a Resend elfogadta a levelet. Külön függvény, mert a táblára nincs
 * UPDATE joga a felhasználónak (`20260915000300`), és ez így is marad: egy
 * kézzel átírható „elküldve" jelzés semmit nem érne.
 *
 * Idempotens: az első kiküldés ideje marad. Egy „Küldd újra" nem hazudja
 * frissebbnek a meghívót, mint amilyen.
 */
create or replace function public.meghivo_kikuldve(meghivo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ceg uuid;
begin
  select company_id into ceg from public.company_invites where id = meghivo;

  if ceg is null then
    raise exception 'Nincs ilyen meghívó.';
  end if;

  if not belso.adminisztralhat(ceg) then
    raise exception 'Nincs jogosultságod ehhez a meghívóhoz.';
  end if;

  update public.company_invites
     set sent_at = coalesce(sent_at, now())
   where id = meghivo;
end;
$$;

revoke all on function public.meghivo_kikuldve(uuid) from public, anon;
grant execute on function public.meghivo_kikuldve(uuid) to authenticated;
