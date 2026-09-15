-- E-mailes beküldés: a cég saját beküldő címe.
--
-- # Miért webhook, és miért nem IMAP
--
-- A régi rendszer egy postafiókot olvasott (`PostafiokOlvaso`), percenként,
-- IMAP-on. Annak három baja volt, és mindhárom élesben sült el: a kapcsolat
-- elhalt és senki nem vette észre; a „melyik levelet láttuk már" állapot a
-- postafiókban élt, tehát egy kézi olvasás elrontotta; és a futás ideje alatt
-- a teljes postafiók jelszava ott volt a processzben.
--
-- A webhook mindhármat megszünteti: nincs kapcsolat, amit fenn kell tartani;
-- az állapot nálunk van (`provider_email_id`, lásd lentebb); és nincs
-- postafiók-jelszó, csak egy aláírás-ellenőrző titok.
--
-- # A cím mint bemutatóra szóló kulcs
--
-- Aki a címre ír, az a cég keretéből költ. A cím tehát **titok**, nem
-- azonosító: kitalálhatatlan tokenből áll, nem a cég nevéből. Ez az a réteg,
-- ami tényleg véd.
--
-- A feladó-szűrés (lásd `bekuldes_barkitol`) **nem** ezt a réteget pótolja: a
-- `From` fejléc hamisítható, tehát biztonsági határnak nem alkalmas. Az a
-- véletlen ellen véd — hírlevél, automata válasz, aláírásból kiszivárgott cím
-- —, és ezt a különbséget itt ki kell mondani, mert egy „feladó-ellenőrzés"
-- nevű dolog könnyen látszik többnek, mint ami.

-- ---------------------------------------------------------------------------
-- A token
-- ---------------------------------------------------------------------------

/**
 * Beküldési token: 16 karakter, félreolvashatatlan ábécéből.
 *
 * Az ábécéből hiányzik a `0`/`o`, az `1`/`l`/`i` és a `u` — mert ezt a címet
 * emberek fogják **felolvasni telefonban** és kézzel átgépelni. 16 karakter a
 * 30-as ábécéből ~79 bit: végtelenül több, mint amit egy levélszemét-küldő
 * végigpróbálhat, miközben még leírható egy papírra.
 *
 * `gen_random_bytes` a forrás (pgcrypto), nem a `random()`: az utóbbi
 * megjósolható, és egy megjósolható cím nem titok.
 *
 * ⚠️ Az oszlop alapértéke **volatile** függvény, és ez nem mindegy: ha a
 * Postgres egyszer értékelné ki és minden meglévő sorra ugyanazt írná be, az
 * alábbi egyedi index a **második** cégnél hasalna el — az elsőnél csendben
 * átmenne. Ezt nem feltételeztük, hanem megmértük: öt meglévő sorra öt
 * különböző érték született, tehát a volatile alapérték soronként fut.
 *
 * ⚠️ A `set search_path = ''` és az `extensions.` minősítés sem díszítés. A
 * pgcrypto ebben a projektben az `extensions` sémában ül, nem a `public`-ban.
 * Enélkül a függvény **oszlop-alapértékként működne** (ott a hívó search_path-ja
 * normális), de a `bekuldes_token_cserel()`-ből hívva — ami `search_path = ''`
 * mellett fut — `gen_random_bytes does not exist` hibára futna. Vagyis a
 * cégalapítás jó lenne, a csere-gomb viszont nem: pont az a fajta hiba, ami a
 * ritkábban járt úton lapul meg. Ezt sem feltételeztük — a jogosultsági mérés
 * negyedik pontja mutatta meg.
 */
create or replace function public.bekuldes_token_general()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  abc  constant text := 'abcdefghjkmnpqrstvwxyz23456789';
  jel  text := '';
  i    integer;
begin
  for i in 1..16 loop
    jel := jel || substr(abc, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(abc)), 1);
  end loop;

  return jel;
end;
$$;

alter table public.companies
  add column bekuldes_token text not null default public.bekuldes_token_general(),
  -- **Alapból kikapcsolva.** Ugyanaz a döntés, mint a gépi jóváhagyásnál és a
  -- túlhasználatnál: egy élő, levelet fogadó végpont a cég nevében olyasmi,
  -- amit a tulajdonosnak ki kell mondania. Attól, hogy a token megvan, a cím
  -- még nem fogad el semmit.
  add column bekuldes_be boolean not null default false,
  -- Kikapcsolva csak a cég tagjainak e-mail címéről fogadunk el levelet — ez a
  -- fő használat: a könyvelő a saját postafiókjából küldi tovább a szállítói
  -- számlát. Bekapcsolva bárkitől, aki ismeri a címet: így a szállító
  -- közvetlenül is küldhet.
  add column bekuldes_barkitol boolean not null default false;

create unique index companies_bekuldes_token_idx
  on public.companies (bekuldes_token);

comment on column public.companies.bekuldes_token is
  'A cég beküldő címének titkos része: b-<token>@bekuldes.szamlafolyo.hu. '
  'Bemutatóra szóló kulcs — aki ismeri, a cég keretéből költ. Ezért NEM '
  'írható a REST API-n át (lásd a jogosztást lentebb); cserélni a '
  'public.bekuldes_token_cserel() függvénnyel lehet.';

comment on column public.companies.bekuldes_barkitol is
  'Kikapcsolva csak a cég tagjainak címéről fogadunk el levelet. Ez NEM '
  'biztonsági határ — a From hamisítható —, hanem a véletlen elleni szűrő. '
  'A biztonsági határ maga a kitalálhatatlan cím.';

/**
 * A token cseréje.
 *
 * Miért külön függvény, és miért nem sima UPDATE: a `bekuldes_token` oszlopra
 * szándékosan **nincs** írási jog a REST API-n. Egy szabad szöveges mezőben a
 * tulajdonos beírhatna rövid, kitalálható tokent is — és ezzel csendben
 * megszüntetné az egyetlen réteget, ami itt tényleg véd. A csere így mindig a
 * generátoron megy át.
 *
 * `security definer`, mert az oszlopra nincs jog; a jogosultságot maga a
 * függvény ellenőrzi (`adminisztralhat`), ugyanúgy, ahogy az RLS tenné.
 */
create or replace function public.bekuldes_token_cserel(ceg uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uj text;
begin
  if not belso.adminisztralhat(ceg) then
    raise exception 'Nincs jogosultságod a cég beküldő címének cseréjéhez.';
  end if;

  uj := public.bekuldes_token_general();

  update public.companies set bekuldes_token = uj where id = ceg;

  insert into public.activity_log (company_id, user_id, action, subject_type, subject_id, summary)
  values (ceg, (select auth.uid()), 'bekuldes.token_csere', 'company', ceg,
          'A beküldő cím lecserélve. A régi cím azonnal érvénytelen.');

  return uj;
end;
$$;

revoke execute on function public.bekuldes_token_cserel(uuid) from public, anon;
grant execute on function public.bekuldes_token_cserel(uuid) to authenticated;

-- A két kapcsoló a Beállítások képernyőről állítható; a token nem.
--
-- ⚠️ A `grant update (...)` **felülírja** a korábbi oszloplistát, nem bővíti —
-- ezért áll itt mind a nyolc oszlop, nem csak a két új. A
-- 20260914000100 migráció indoklása változatlanul érvényes: az alapértelmezés
-- a tiltás, tehát egy új oszlop nem válik magától írhatóvá.
grant update (
  name,
  default_currency,
  file_retention_days,
  auto_jovahagyas_be,
  overage_enabled,
  overage_limit_ft,
  bekuldes_be,
  bekuldes_barkitol
) on public.companies to authenticated;

-- ---------------------------------------------------------------------------
-- inbound_emails — mi történt a beérkezett levelekkel
-- ---------------------------------------------------------------------------

/*
 * Ez a tábla **nem** a levelek tárolója: a levél szövegét, a feladó címén és a
 * tárgyon túl, nem őrizzük meg. Azt rögzíti, hogy egy levéllel mi történt, és
 * két dologra kell.
 *
 * 1. **Idempotencia.** A webhookot a szolgáltató újraküldi, ha a válasz
 *    elakad — és ez nem kivételes eset, hanem a normál működés része. A
 *    `provider_email_id` egyedi indexe az, ami miatt egy kétszer kézbesített
 *    levél nem lesz két bizonylat. A fájl `sha256`-szűrője ezt nem váltaná ki:
 *    az duplikátum-sort *csinálna*, vagyis zajt.
 *
 * 2. **Az elutasítás látható legyen.** Ha egy szállítói számla azért nem
 *    érkezett meg, mert a feladó nincs engedélyezve, azt a felhasználónak
 *    látnia kell. Egy csendben eldobott levél a legrosszabb fajta hiba: nem
 *    történik semmi, és senki nem tudja, hogy nem történt semmi.
 *
 * Amit szándékosan **nem** tárolunk: az ismeretlen címzettnek szóló levelet.
 * Annak nincs cége, tehát nincs, akinek a sora lenne — egy bérlő nélküli sort
 * pedig az RLS nem tud megvédeni. Az ilyen levél a függvény naplójába kerül,
 * és 200-as választ kap, hogy a szolgáltató ne próbálkozzon újra.
 */
create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- A szolgáltató levélazonosítója. Ez az idempotencia kulcsa.
  provider_email_id text not null,

  from_address text,
  subject text,

  -- feldolgozva = legalább egy mellékletből bizonylat lett
  -- ures         = a levél rendben volt, de nem volt benne feldolgozható melléklet
  -- elutasitva   = nem fogadtuk el (feladó, kikapcsolt beküldés, elfogyott keret)
  status text not null check (status in ('feldolgozva', 'ures', 'elutasitva')),
  -- Emberi mondat, ami a felületen is megjelenik. Nem hibakód.
  reason text,

  attachment_count integer not null default 0,
  accepted_count integer not null default 0,

  created_at timestamptz not null default now()
);

create unique index inbound_emails_provider_idx
  on public.inbound_emails (provider_email_id);

create index inbound_emails_company_created_idx
  on public.inbound_emails (company_id, created_at desc);

alter table public.inbound_emails enable row level security;

-- Olvasni a cég tagjai tudnak. Írási politika **nincs**, és ez nem hiányosság:
-- ezt a táblát kizárólag a webhook írja, a `service_role` kulcsával — ami
-- megkerüli az RLS-t. Nem tiltás kell hozzá, hanem az, hogy ne adjunk jogot.
create policy "A tag látja a cég beérkezett leveleit"
  on public.inbound_emails for select to authenticated
  using (company_id in (select belso.tag_cegei()));

grant select on public.inbound_emails to authenticated;

comment on table public.inbound_emails is
  'Mi történt a beküldő címre érkezett levelekkel. A levél tartalmát nem '
  'tárolja. A provider_email_id egyedi indexe adja az idempotenciát: egy '
  'újraküldött webhook nem csinál második bizonylatot.';
