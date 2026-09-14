-- A keret adatai: mit tudunk a cégről, és mennyit használt el eddig.
--
-- # Miért egy függvény, és miért csak adatot ad vissza
--
-- A **döntést** (fér-e még bele, mikor jár le, mit írjunk ki) a
-- `shared/uzleti/keret.ts` hozza meg, egyetlen példányban — ugyanaz a modul
-- szolgálja a Beérkezőt, a Beállításokat és a `kiolvas` Edge Functiont. Ha a
-- szabály itt is meg ott is le lenne írva, előbb-utóbb két különböző választ
-- adnának, és a kettő közül a megengedőbb mindig AI-költséget jelent.
--
-- Ez a függvény tehát **nyersanyagot** ad: a számlázási állapotot és az
-- elhasznált darabszámot. A logika nincs benne.
--
-- # Miért a `document_extractions`-ből számolunk
--
-- Mert az **túléli a dokumentumot** (`document_id` ON DELETE SET NULL), a
-- `documents` sort viszont a felhasználó törölheti. Amit el lehet tüntetni,
-- abból nem lehet keretet számolni.
--
-- És ez nem elvi óvatosság: a jogosultságok ma is így állnak. A
-- `document_extractions`-ön **csak SELECT** politika van, INSERT/UPDATE/DELETE
-- nincs — vagyis a kliens olvashatja, de egyetlen sorát sem írhatja át. A
-- `credits` oszlop, amiből a keret számol, a felhasználó számára elérhetetlen.
--
-- A hibába futott kiolvasás `credits = 0`-t ír, tehát **nem fogyaszt keretet**:
-- nem a felhasználó hibája, és jórészt nem is került pénzbe.

-- A `ceg` paraméter **nem biztonsági rés**, hanem az egyetlen forrás ára: a
-- `kiolvas` Edge Function is ezt a függvényt hívja, hogy az időszak határát ne
-- kelljen másodszor is leírni. Aki bejelentkezett felhasználóként hív, annak a
-- `security invoker` miatt az RLS úgyis csak a saját cégét adja — idegen
-- azonosítóra üres sort kap. A `service_role` (az Edge Function) megkerüli az
-- RLS-t, de az már eleve mindent lát; ott a paraméter csak kényelem.
create or replace function public.keret_adatok(ceg_id uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with ceg as (
    select c.*
    from public.companies c
    where c.id = coalesce(ceg_id, belso.aktualis_ceg())
  ),
  ablak as (
    select
      ceg.id,
      -- Az időszak kezdete. Futó előfizetésnél a Stripe-ciklus eleje; egyébként
      -- a cég születése, mert a próbaidő keretét a teljes próbára mérjük.
      case
        when ceg.stripe_status in ('active', 'trialing', 'past_due')
             and ceg.current_period_start is not null
        then ceg.current_period_start
        else ceg.created_at
      end as kezdet
    from ceg
  )
  select to_jsonb(ceg) - 'name' - 'tax_number' - 'stripe_customer_id'
         - 'stripe_subscription_id' - 'created_at' - 'updated_at'
      || jsonb_build_object(
           'felhasznalt',
           coalesce((
             select sum(e.credits)
             from public.document_extractions e, ablak
             where e.company_id = ablak.id
               and e.created_at >= ablak.kezdet
           ), 0),
           'idoszak_kezdete', (select kezdet from ablak)
         )
  from ceg
$$;

-- A PostgREST minden `public` függvényt kiajánl, a Supabase pedig alapból
-- EXECUTE jogot ad az `anon`-nak és az `authenticated`-nek. Az `anon`-tól
-- elvesszük: bejelentkezés nélkül nincs cég, tehát nincs mit kérdezni sem.
revoke execute on function public.keret_adatok(uuid) from public, anon;
grant execute on function public.keret_adatok(uuid) to authenticated;

comment on function public.keret_adatok(uuid) is
  'A keretszamolas nyersanyaga: a ceg szamlazasi allapota es az idoszakban '
  'elhasznalt kreditek szama. A dontest a shared/uzleti/keret.ts hozza.';
