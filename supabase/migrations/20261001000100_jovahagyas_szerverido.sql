-- ---------------------------------------------------------------------------
-- A jóváhagyás ideje a szerver órájából
--
-- # Mi történt
--
-- Az `approved_at` eddig a **böngésző órájából** jött: az ellenőrző képernyő
-- `new Date().toISOString()`-t küldött. 2026-10-01-én az első külső
-- felhasználó négy bizonylatán az `approved_at` 00:57 UTC lett, holott a
-- jóváhagyás 08:41 UTC körül történt — mind a négynél ugyanannyi, 27 822
-- másodperc (7:43:42) volt az eltérés, vagyis a gépe órája volt elállítva. A
-- bizonylat így előbb volt jóváhagyva, mint ahogy feltöltötték.
--
-- Az időbélyeg a mi tényállításunk arról, mikor mi történt, ezért a mi
-- óránkból kell jönnie, nem a felhasználóéból.
--
-- # Hogyan
--
-- BEFORE trigger: ha egy írás az `approved_at`-et nem-NULL értékre **állítja
-- át**, az értéket a tranzakció ideje (`now()`) váltja fel. A kliens küldhet
-- bármit, csak azt jelzi vele, *hogy* jóváhagyás történt — a *mikor* itt dől
-- el. A NULL-ra állítás (visszaküldés) és a változatlanul visszaírt érték
-- érintetlen marad.
--
-- A kiolvasó Edge Function automatikus jóváhagyása szintén kap pecsétet: az ő
-- órája ugyan a szerveré, de így egyetlen forrás van, nem kettő.
-- ---------------------------------------------------------------------------

-- 1. A hibás sorok helyreállítása — a trigger ELŐTT, különben a trigger a
--    javítás pillanatát pecsételné rájuk.
--
--    Mérve (2026-10-01): 35 bizonylatból pontosan 4-nél `approved_at <
--    created_at`, mind `jovahagyva` állapotú. Náluk az `updated_at` (amit a
--    `documents_updated_at` trigger a szerver órájából ír) 66–173 ms-mal az
--    utolsó `document_corrections` sor után áll: a jóváhagyás volt az utolsó
--    írás, tehát az `updated_at` a jóváhagyás szerveridője. A jobb oldalon az
--    `updated_at` még a régi érték — a trigger csak a sor írásakor lép.
update public.documents
   set approved_at = updated_at
 where approved_at < created_at
   and status = 'jovahagyva';

-- 2. A trigger.
create or replace function belso.jovahagyas_szerverido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.approved_at is not null
     and (tg_op = 'INSERT' or new.approved_at is distinct from old.approved_at) then
    new.approved_at := now();
  end if;

  return new;
end;
$$;

create trigger documents_approved_at
  before insert or update of approved_at on public.documents
  for each row execute function belso.jovahagyas_szerverido();
