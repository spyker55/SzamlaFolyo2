# `meghivo-kuld` — a meghívó levél kiküldése

Egy dolgot csinál: elküldi a meghívó levelet. A meghívót **nem** ez hozza
létre, és ez a szétválasztás a lényeg.

## A lánc

```
Beállítások → meghivot_letrehoz()  (SQL RPC, a böngészőből)
                     ↓  a sor létrejött, a token megvan
            meghivo-kuld           (ez a függvény)
                     ↓
              Resend /emails       → a meghívott postafiókja
                     ↓
            /meghivo/<token>       → meghivot_elfogad()  (SQL RPC)
```

**Ha a levél nem megy ki, a meghívó akkor is létezik.** A Beállításokban ott a
sor, a lejárati dátum, a link és a „Küldd újra" gomb. A régi rendszer
legrosszabb hibaosztálya épp a fordítottja volt: a felület sikert jelentett, a
másik fél meg nem kapott semmit.

## Miért a hívó jogával olvas

A meghívó sorát a `company_invites` RLS-politikája csak a cég **tulajdonosának**
adja oda. Ha a hívó nem az, a lekérdezés üresen jön vissza — ez pontosan a
helyes válasz, és nem kell hozzá `service_role`. A függvénynek egyetlen
kiemelt jogosultsága van: a `RESEND_API_KEY` ismerete.

## `verify_jwt = true`

Szemben az `email-bekuldes`-szel, ezt a végpontot belépett felhasználó hívja,
tehát van érvényes JWT-je. A függvény **támaszkodik is rá**: a levélbe írt „ki
hívott" a token `email` állításából jön (`shared/uzleti/token.ts`), és azt
csak azért olvashatjuk ellenőrzés nélkül, mert a platform a tokent addigra már
hitelesítette.

## ⚠️ CORS — ezen bukott el az első verzió

Ez **a projekt első böngészőből hívott Edge Functionje**. A `kiolvas` és a
`selejtez` szerverről jön, az `email-bekuldes`-t a Resend hívja — egyiknek sem
kell CORS, tehát semmi nem kényszerítette ki, és az első verzióból kimaradt.

Élesben így nézett ki: a meghívó **létrejött**, a levél **soha nem indult el**,
és a Resend naplójában egyetlen kérés sem volt. A böngésző a `supabase.functions
.invoke` előtt elővizsgálatot (`OPTIONS`) küld; azt a függvény 405-tel és
CORS-fejléc nélkül utasította el, tehát a POST el sem indult.

A mérés, ami kimondta — két `pg_net` hívás válaszfejléce ugyanarra a végpontra:

| Ki válaszolt | `access-control-allow-origin` |
|---|---|
| a platform 401-ese (a kód előtt) | `*` |
| a mi 404-esünk (a kódból) | **nincs** |

**A böngészős próba ezt nem foghatta meg: mockolt hálózaton nincs CORS.** Aki
legközelebb böngészőből hívott függvényt ír, ezt a bekezdést olvassa el előbb.

## Titkok

| Név | Mire |
|---|---|
| `RESEND_API_KEY` | A levél kiküldése. Ugyanaz a kulcs, amit a beküldés használ. |

A `SUPABASE_URL` és a `SUPABASE_ANON_KEY` befecskendezett érték, nem kell
beállítani.

## A levél

A szövegét a `shared/uzleti/meghivo.ts` `meghivoLevel()` állítja elő, és
**egységtesztelt** — Deno nélkül. Ez nem túlbuzgóság: a levél kimegy, és utána
nem lehet visszaszívni. A cégnevet a felhasználó írja be, a levél pedig HTML,
tehát escape-elve megy bele; erre külön teszt áll.

Feladó: `config/szamlafolyo.ts` → `levelFelado`. Szándékosan valódi postafiók,
nem `noreply@` — aki ismeretlen rendszertől kap meghívót, annak az első
mozdulata a Válasz gomb.

## ⚠️ A linkbe égő webcím

A levélbe kerülő link a `config/szamlafolyo.ts` `webcim` értékéből épül, **nem
a kérés `Origin` fejlécéből**. Az a hívó állítása lenne, a levél viszont a mi
nevünkben megy ki: egy rossz irányba mutató link a saját, DKIM-aláírt
tartományunkról küldött adathalász levél volna.

Ennek ára van: **a domain felcsatolásakor a configot át kell írni, és ezt a
függvényt újratelepíteni.** Addig a linkek a Vercel-címre mutatnak — ami
ugyanaz az alkalmazás, csak csúnyább.

## Telepítés

```bash
npx supabase functions deploy meghivo-kuld --project-ref mwveyzyxupgccqdnbpwe
```

A `verify_jwt` a `supabase/config.toml`-ból jön, nem kell kapcsoló.

### Utána azonnal mérni

Nem a `status: ACTIVE` mezőt hisszük el — ez a PLACEHOLDER-eset tanulsága.
Három lépcső:

1. **Hitelesítés nélkül** → **401** a platformtól (`verify_jwt`), a kód előtt.
   Ez a kaput méri, nem a függvényt.
2. **Érvényes kulccsal, nem létező meghívóra** → **404** és a *saját* magyar
   üzenetünk (`{"hiba":"Nincs ilyen meghívó."}`). Ez bizonyítja, hogy a kód
   elindult és az importok feloldódtak.
3. **A 2. válasz fejlécei között ott az `access-control-allow-origin`.** Enélkül
   a böngésző soha nem jut el a függvényig — pontosan ez volt az első verzió
   hibája, és ez az egyetlen olcsó próba, ami megfogja.

## Amit ez a kör szándékosan nyitva hagy

- **A csomagonkénti felhasználószám nincs szerveroldalon kikényszerítve.** A
  számok a `config/szamlafolyo.ts`-ben élnek, egyetlen példányban, és azokat az
  adatbázisba másolni két igazságot csinálna. A felület tiltja a túllépést
  (`ferMegTag()`), az SQL-függvény nem. Ez a **Stripe-körre** tartozik, a többi
  csomagkorláttal együtt. Pénzbe nem kerül: a kreditkeretet a `kiolvas`
  szerveroldalon őrzi, és egy fejszám nem növeli az AI-költséget.
- **Nincs emlékeztető levél** a lejárat előtt.
- **A `sent_at` a mi állításunk, nem kézbesítési visszaigazolás.** Azt rögzíti,
  hogy a Resend **átvette** a levelet — nem azt, hogy meg is érkezett. A
  kézbesítési események (bounce, spam) webhookja külön kör lenne; addig a
  „Küldd újra" gomb és a kimásolható link a kijárat.
- **A tulajdonos nem kap értesítést** az elfogadásról. A naplóban ott a sor
  (`meghivo.elfogadva`), a tagok listájában ott az új sor — levelet nem küldünk.
