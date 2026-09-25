<!--
  ⛔ OLVASD EL, MIELŐTT BÁRMIT KIOLVASNÁL EBBŐL A FÁJLBÓL.
  Ez a blokk 2026-09-23-án került ide, és a fájl egészéről szól.

  2026-09-23: a fájl átköltözött a repóba (`DONTESTORTENET.md`). Addig az
  ügynök `.claude/plans/` könyvtárában élt: nem volt gitben, nem volt mentve,
  és a tulajdonos meg sem tudta nyitni. A régi helyén már csak egy ide mutató
  jegyzet áll — ha valaha mégis két példány lenne, EZ az igazi.
-->

# ⛔ Ez a fájl DÖNTÉSTÖRTÉNET, nem teendőlista

**Utolsó mért állapot: 2026-09-23.**

A fájl alatta következő ~4700 sora kronologikusan nőtt: minden kör beírta a
maga „Context — megoldás — verifikáció" szakaszát, és a szakaszok **a saját
idejükben igazak**. Ami elavul, az nem a döntés, hanem a **jelen idő**: a
„most következő lépés", a „hátravan", a „nyitva hagy" fordulatok mind egy
akkori jelenre mutatnak, ami azóta elmúlt.

> **Ez már egyszer kárt okozott.** 2026-09-22-én a Meta hirdetési csomag első
> változatába innen került be, hogy a projekt „még ingyenes csomagon van" és
> hogy egy próbaregisztráció a kampány feltétele. Egyik sem volt igaz — a
> tervből olvastam ki, mérés helyett. Ez a blokk azért van itt, hogy ez
> másodszor ne történjen meg.

## A szabály

1. **A nyitott tételek egyetlen hiteles forrása a feladatlista** (az ügynök
   `TaskList`-je), nem ez a fájl. Ha a kettő ellentmond, a feladatlistának van
   igaza. Embernek, aki nem látja a feladatlistát: a `git log` az, ami nem
   tud hazudni — ott minden kör a maga commitjával és indoklásával áll.
2. **Az élő állapoté a szolgáltatók API-ja és a git története**, nem ez a
   fájl. Mérj, ne olvass.
3. Ebből a fájlból **a miérteket** vedd el: miért OpenRouter és nem Vertex,
   miért `security invoker` a `belso.selejtezheto()`, miért nem számoljuk ki a
   hiányzó bruttót. Ezek nem avulnak — ezekért készült.

## Mért állapot, 2026-09-23

| | |
|---|---|
| ág | `claude/awesome-volta-kh12af`, `65ef57b` |
| élő cím | `szamlafolyo.hu` — 200, Vercel (fra1) |
| regisztráció | **nyitva** (2026-09-22 06:18 óta), a fejlesztői sáv **kikapcsolva** |
| Supabase | a projekt **kikerült** a „Free projects" szervezetből (a `list_projects` nem látja, miközben a projekthívások mennek) → az átvitel a `Leltarium` fizetős szervezetbe megtörtént. ⚠️ A célszervezet csomagját a hozzáférésem nem látja; a **Pro** a tulajdonos állítása |
| Vercel | **Pro** — szintén a tulajdonos állítása (a csomagot az API nem adja vissza) |
| Edge Functionök | **kilenc, mind ACTIVE**: `kiolvas` v20 · `email-bekuldes` v9 · `selejtez` v8 · `meghivo-kuld` v8 · `stripe-webhook` v6 · `meghivo-fiok` v5 · `stripe-checkout` v4 · `stripe-portal` v4 · `fiok-torles` v4 |
| árak | **4 900 / 9 900 / 19 900 Ft**, extra **50 / 40 / 30 Ft** — a `config/szamlafolyo.ts` a forrás |
| éles adatbázis | 2 fiók · 2 cég · 10 bizonylat · 11 kiolvasás · 3 export · 0 beérkező levél |

## Amit a fájl lezáratlanként tárgyal, pedig LEZÁRULT

Ezek a szakaszok „hátravan" vagy „nyitva hagy" alatt sorolják, és mind
elkészült 2026-09-20 és 09-22 között:

- a Supabase Pro-ra emelése és a szervezetváltás;
- az éles Stripe-fiók hat `lookup_key`-e és az éles webhook végpont;
- a `kiolvas.bundle.js` + `csomagol.mjs` nyugdíjazása;
- a beágyazott XML (Factur-X PDF-ben);
- a repó ↔ éles adatbázis ékezet-elcsúszása;
- az `info@szamlafolyo.hu` cím két példánya;
- a `kiolvasas:proba` mérőeszköz;
- a `/fiok-torles`, a szerveroldali helykorlát és a túlhasználat számlázása;
- a saját számlázás kérdése (**eldőlt: kézi Billingo, alanyi adómentesen**).

## Két konkrét csapda a fájl elején

A lentebbi „**Ellenőrzött tények a fiókokban**" blokk két állítása ma hamis,
és azért veszélyes, mert a szakasz címe szerint *ellenőrzött*:

- a felsorolt **1990 / 4990 / 9990 Ft** és a **49 / 29 / 24 Ft** darabárak az
  **eredeti** árazás; a maiak fent, a táblázatban;
- a „⚠️ **A Free tier fejlesztésre jó, élesítésre nem**" figyelmeztetés a maga
  idejében helyes volt, de **a projekt már nincs Free csomagon** — a
  felfüggesztés-kockázat elmúlt.

---

# SzámlaFolyó 2 — átvételi és újraépítési terv

## Context

A SzámlaFolyó magyar számlafeldolgozó SaaS Laravel + nethely változata megszűnt: a
tárhely, az adatbázis és a webcím 2026. szeptember 12-én törölve. Ami megmaradt, az a
`szamlafolyo-atadas` csomag — és az a csomag nem leírás, hanem **indoklás**: kb. tizenöt
olyan döntés, amit élesben fizettek meg egyszer, és amit egy új kódbázis magától nem tud
visszaszerezni.

Az újraépítés stackje: **React + TypeScript + Vite + Tailwind 4 + Supabase + Vercel + Stripe**.
A cél nem egy funkcióról funkcióra másolás, hanem: a **döntéseket** visszük át, a
Laravel/nethely-specifikus szenvedést (cron-vadászat, `php8.4` felderítés, WAF, „a böngésző a
worker") nem. Két ponton pedig a termék **változik**, és ezt az átadócsomag maga írja elő
(`00-OLVASS-EL.md`, „Két változás a működésben"): a kredit bizonylatra szól, nem fájlra, és
nem minden bizonylat kerül ember elé.

Az első mérföldkő a **működő gerinc**: belépéstől exportig egy valódi számla végigmegy.

---

## Amit együtt eldöntöttünk

| Kérdés | Döntés |
|---|---|
| Hol fut a kiolvasás | **Supabase Edge Function** (Deno), az adatbázis és a Storage mellett |
| Modellhozzáférés | **OpenRouter marad**, `provider.data_collection = "deny"`-vel. Indok: a Vertex AI utólag számláz felső határ nélkül (a költségkeret ott riasztás, nem fék), az OpenRouter viszont **előre feltöltött kredit** — ami nincs a számlán, azt nem tudja elkölteni |
| E-mailes beküldés | **Későbbre**; az adatmodell viszont már most számol vele (`documents.source`) |
| Első mérföldkő | **Gerinc**: auth + cég + feltöltés + kiolvasás + ellenőrzés + tételek + export + RLS + kredit |
| Névadás | **Magyar domain-szókincs marad** (`kredit.ts`, `afaBontas.ts`, `adoszam.ts`), táblák angolul |
| A tudatosan kihagyottak | **Kint maradnak**: éves fizetés, korlátlan keret, többcéges mód/cégváltó, „idegen bizonylat" jelzés |

**Ellenőrzött tények a fiókokban** — ⚠️ **2026-09-12-i állapot.** Az árak azóta
változtak (ma 4 900 / 9 900 / 19 900 Ft, extra 50 / 40 / 30 Ft), és a Supabase-projekt
már nem a „Free projects" szervezetben van. Lásd a fájl tetején a mért állapotot.
- Stripe éles fiók (`acct_1UCME2V05U28wfjz`) — **mind a hat ár megvan és pontos**: Start
  `price_1UCO5PV05U28wfjzx5lH1Swk` 1990 Ft/hó, Flow `price_1UCO5OV05U28wfjzVC3xfvIz` 4990 Ft/hó,
  Pro `price_1UCO5JV05U28wfjz4FXUyHhe` 9990 Ft/hó; extrák egyszeri árként 49/29/24 Ft
  (`…SkoFKiKy`, `…Ck96wSra`, `…SPeyjMa1`). Nem kell újat létrehozni.
- Supabase: **a projekt létrejött** — `szamlafolyo`, ref **`mwveyzyxupgccqdnbpwe`**, szervezet
  „Free projects" (`qcijejgirudmeongwdxd`), régió **`eu-central-1`** (Frankfurt). Az EU-régió nem
  kényelmi kérdés, hanem az adatkezelési tájékoztató 5. pontjának feltétele.
  (A `leltarium` a „Leltarium Paid" szervezetben marad, ahhoz nem nyúlunk.)

> ✅ **LEZÁRULT (2026-09-21): a projekt már nincs Free csomagon** — átkerült a
> `Leltarium` fizetős szervezetbe, tehát az alábbi felfüggesztés-kockázat elmúlt.
> Az érvelés attól még érvényes, ezért marad itt.
>
> ⚠️ **A Free tier fejlesztésre jó, élesítésre nem.** Egy hét inaktivitás után a projekt
> felfüggesztődik, és szervezetenként legfeljebb két aktív ingyenes projekt lehet — a
> „Free projects" szervezetben ezt a keretet a `szamlafolyo` és a `zsebgarazs` most **ki is
> tölti** (a `havio-penzugy` felfüggesztett; ha felébreszted, valamelyiknek mennie kell). A
> felfüggesztést **nem éli túl** a pg_cron ütemezés, az e-mailes beküldés webhookja és egyetlen
> fizető előfizető sem. Fejlesztés alatt ez rendben van — de **az élesítés feltétele, hogy ez a
> projekt Pro csomagra kerüljön.** Ezt a lépést az indulási ellenőrzőlistára kell írni, nem az
> első felfüggesztéskor felfedezni.

---

## Mit viszünk át, és mit nem

### Változatlanul át (a csomag legértékesebb rétege)

| Forrás | Cél | Megjegyzés |
|---|---|---|
| `03-kiolvasas/Prompt.php` | `shared/uzleti/prompt.ts` | **A csomag legértékesebb fájlja.** A v6 szöveg és a teljes verziótörténet kommentként is átjön. `VERZIO` konstans marad |
| `Sema.php` | `shared/uzleti/sema.ts` | A szűk séma (nincs unió-típus, nincs null-t tartalmazó enum) **marad úgy** — Vertexen is ez a helyes alak, és így a modell konfigurációs kapcsoló marad |
| `Validatorok.php` | `shared/uzleti/validatorok.ts` | Mind a 10 szabály, **a tűrésekkel szó szerint**: ±1 egység a nettó+ÁFA=bruttó-ra, `max(1, |nettó|*0.005)` soronként, `max(1, sorok száma)` a bontásösszegre |
| `Konfidencia.php` | `shared/uzleti/konfidencia.ts` | `BUKAS_PLAFON=0.3`, `ELLENORIZHETETLEN_MEZOK`, a kézírás-plafon, és a `<=` a sávhatáron (nem `<` — a 0,85 a modellek kedvenc száma) |
| `AfaBontas.php` | `shared/uzleti/afaBontas.ts` | `vodrok()`, `vodor()`: a 0%-os soron talált ÁFA az **egyéb** vödörbe. `is_numeric` → `typeof`-mentes numerikus vizsgálat, mert a kulcs JSON-on át int/float |
| `Adoszam.php` | `shared/uzleti/adoszam.ts` | Súlyozás `[9,7,3,1,9,7,3]`, `torzsszam()` (első 8 jegy), `biztosanRossz()` megengedő viselkedése |
| `Osszeg.php`, `Ido.php` | `shared/uzleti/osszeg.ts`, `ido.ts` | Az `Osszeg` döntési táblája regex-nehéz — **tesztvezérelten portoljuk**, az `OsszegTest` eseteivel előbb |
| `Kredit.php` | `shared/uzleti/kredit.ts` | `szabaly()` egy helyről szolgálja a nyitólapot, a Beállításokat és a keretszámolást |
| `Xml/*` | `shared/uzleti/xml/` | Az XPath-ok (`local-name()` alapúak) szó szerint. **A libxml biztonsági flagek nem fordulnak át** — lásd lentebb |
| `04-dizajn/app.css` | `src/app.css` | `@theme` blokk + `@layer components` **szó szerint**. Kivesszük a `@source '…/vendor/laravel/…'` sorokat és az `[x-cloak]` szabályt |
| `04-dizajn/logo/*` | `public/` | Változatlanul |
| `02-szovegek/*.md` | `src/oldalak/jogi/` | 2. mérföldkő; a számok a configból, a szövegben két érdemi módosítással (lásd lent) |
| `06-adatmodell/Enums/*` | `shared/uzleti/enumok.ts` | TS union type + címke-map. `cimkeje()` ismeretlennél **magát az értéket** adja, nem „Egyéb"-et |

### Átalakítva át

| Régi | Új | Miért |
|---|---|---|
| `CompanyScope` + `BelongsToCompany` trait + `resolveRouteBinding` | **Row Level Security** | Ugyanaz a szigor, de a „middleware sorrend" hibaosztály eltűnik. A `BerloElkulonitesTest` állításai RLS-tesztként kellenek |
| `Sorkezelo` claim | **feltételes `UPDATE … WHERE status='feltoltve' RETURNING`** | A logika jó volt, csak a kényszer tűnik el mögüle. Nem kell sorzár |
| `DokumentumFeldolgoz` cron | **pg_cron + pg_net**, percenként | Az elakadt és a félbemaradt futásokra. Az élő utat a feltöltés utáni közvetlen függvényhívás hajtja |
| `DokumentumFajlController` | **privát bucket + aláírt URL** | A fájl a webgyökéren kívül volt; Supabase-ben ez a megfelelője |
| `OpenRouterKliens` | **`shared/uzleti/openrouter.ts`**, gyakorlatilag 1:1 | OpenAI-kompatibilis végpont, nincs SDK — egy `fetch`. A kikényszerített függvényhívás (`tool_choice`), a `provider.data_collection = "deny"` és a PDF/kép szétválasztás (`file` vs `image_url`) változatlanul jön. **A `deny` továbbra sem kapcsolható ki env-ből** — az adatkezelési tájékoztató ígéretet tesz rá, és egy átbillenthető ígéret rosszabb a semminél |
| `@fontsource*` a Blade-ben | ugyanaz Vitében | **Adatvédelmi döntés, nem teljesítménybeli.** `dm-sans/opsz` + `archivo` 800, latin-ext-tel (`ő`, `ű`) |

### Nem visszük át

- Minden nethely-specifikum: `deploy.sh`, PHP-felderítés, `.htaccess`, WAF-tanácsok, a három
  crontab-sor, `CsendesCron`, `kornyezet:ellenoriz`.
- `Livewire/*`, Blade-nézetek kódként (a **szerkezet** referencia marad a `04-dizajn/views/` alatt).
- IMAP-olvasás (`PostafiokOlvaso`) — helyette webhook, a `CimzettToken` **logikája** viszont átjön.
- Éves fizetés, korlátlan keret, többcéges mód, „idegen bizonylat" jelzés — mind indokolt nem.

---

## A két érdemi termékváltozás

### 1. A bizonylat a mértékegység, nem a fájl

Ez az adatmodell legnagyobb változása: a régi `Document` **egyszerre volt fájl és bizonylat**.
Szétválasztjuk:

- **`files`** — a feltöltött fájl: `storage_path`, `sha256`, `mime_type`, `size_bytes`,
  `oldalszam`, `forras_jelleg`, `forras_naplo`, `file_deleted_at`, `uploaded_by`, `source`.
- **`documents`** — a bizonylat: `file_id`, **`oldal_tol` / `oldal_ig`**, a kiolvasott mezők,
  állapot, `export_id`, jóváhagyás.

**A fájlt nem vágjuk szét** — oldaltartományt tárolunk, az előnézet `#page=N&view=FitH`-sel
ugrik a helyére. A modell adja a bizonylathatárokat, a rendszer bizonylatonként futtat külön
kiolvasást ugyanarra a fájlra.

Kredit ebből:
- **A köteg maga nem kerül kreditbe** — a szétszedő futás `credits = 0`.
- Bizonylatonként `⌈oldalak/5⌉`, minimum 1.
- **Bizonytalanságból nem számlázunk többet**: ismeretlen oldalszám → 1 kredit; ha nem tudjuk
  biztosan, hány bizonylat van benne, **nem szedjük szét** — egy dokumentum, egy jóváhagyás.
- Selejtezés: az eredeti fájl csak akkor törölhető, ha a benne lévő **összes** bizonylat
  exportálva van.

### 2. Csak az kerül ember elé, amivel baj van

Három kimenetel kettő helyett: **automatikusan jóváhagyva** / **ellenőrzésre vár** / **hiba**.
Az automatikus jóváhagyáshoz **mind a hét kapunak** át kell mennie:

a) minden determinisztikus validátor rendben · b) minden kulcsmező megvan · c) minden mező
magabiztossága 0,85 fölött · d) nincs `nehezen_olvashato` · e) nincs szétszedetlen
`tobb_irat_gyanu` · f) nem duplikátum · g) **nem tér el a cég előzményeitől** (ismeretlen
szállító adószáma, kilógó végösszeg, kilógó kelt, szokatlan pénznem, ismétlődő bizonylatszám
ugyanattól a szállítótól) — mind olcsó SQL, nulla AI.

A `d)` és a `g)` együtt fogja meg azt az esetet, amiért ez az egész van: a kézzel írott számlát,
amin **hat kiolvasás hat különböző, kitalált szállítónevet** adott, miközben minden szám
hatszor helyes volt. A nevekre nincs és nem lehet determinisztikus ellenőrzés.

Fékek: jelvény („automatikusan jóváhagyva" + egysoros indok), **soha ne írjuk ki, hogy
„ellenőrizve", ha senki nem nézte meg**; minden huszadik mégis emberhez; a cég **első 20
bizonylata mindig** emberhez; cégenkénti kapcsoló; és az automatikusan jóváhagyott bizonylat
utólagos javítása ugyanúgy `document_corrections` sort ír — **ez az egyetlen jel arról, hogy a
küszöbök jól állnak-e.**

> Feltételezés, amit jelzek: a kapcsolót **alapból bekapcsolva** hozom (ez a termék ígérete), a
> 20 bizonylatos bemelegítéssel és az 1/20 mintavétellel együtt. Ha inkább alapból kikapcsolva
> akarod, egy sor a migrációban.

---

## Architektúra

```
Vercel (statikus SPA)            Supabase (eu-central-1)
  React + TS + Vite                Postgres + RLS
  @supabase/supabase-js            Storage (privát bucket, aláírt URL)
                                   Auth (e-mail + jelszó, meghívó)
                                   Edge Functions:
                                     kiolvas        (claim → felderítés → modell → validátorok → kapuk)
                                     stripe-webhook (2. mérföldkő)
                                   pg_cron → pg_net → kiolvas   (elakadt/újrapróbálandó)
                                     ↓
                                   OpenRouter (data_collection: deny)
                                     → google/gemini-3.8-flash
```

> ⚠️ **Modellválasztás — a csomag két lapja ellentmond egymásnak, és az egyik veszélyes.**
> Az `env.example` a `google/gemini-3.1-flash-lite`-ot írja; a `README-eredeti.md` viszont a
> `google/gemini-3.8-flash`-t nevezi meg alapértelmezésként, **és ugyanott méréssel indokolja,
> hogy a Lite az, amelyik megbukott**: három futásból három kitalált szállítónév, az egyikre
> 1,00 magabiztossággal, és **egyszer sem** kapcsolta be a `nehezen_olvashato` zászlót. A 3.8
> Flash ugyanazon a papíron mindháromszor bekapcsolta.
> **A README az erősebb: `google/gemini-3.8-flash` az alapértelmezés**, és az indok a config
> mellé kommentbe kerül — enélkül ez a sor csendben visszamászik egy „olcsóbb lesz" mozdulattal.

**Repó-szerkezet** — egy dolog számít benne: a tiszta üzleti logika **egyetlen példányban**
létezzen, és a böngésző is, az Edge Function is ugyanazt importálja.

```
shared/uzleti/       tiszta TS, nulla függőség — prompt, sema, validatorok, konfidencia,
                     afaBontas, adoszam, osszeg, ido, kredit, enumok, xml/, kapuk.ts
src/                 React SPA (path alias: @uzleti → shared/uzleti)
supabase/migrations/ SQL migrációk
supabase/functions/  Deno függvények (relatív import a shared/uzleti-ből)
config/szamlafolyo.ts  a számok egyetlen forrása (árak, keret, küszöbök, próbaidő, megőrzés)
```

### Két technikai pont, ami külön figyelmet kér

**PDF-felderítés Deno alatt.** A `Felderito` a `Smalot\PdfParser`-re épült: oldalszám,
szövegréteg-hossz (`SZOVEG_KUSZOB = 200`), beágyazott XML (`factur-x.xml`, `zugferd-invoice.xml`,
…). Deno-ban ezt **`unpdf`** adja (pdf.js-alapú, szerver nélküli környezetre); a beágyazott
fájlok kinyerése a `getAttachments()` hívás. Ez a port legkockázatosabb pontja — külön
teszteset PDF-fixtúrákkal.

**XML-biztonság.** A libxml flagek (`LIBXML_NONET`, `NOENT` hiánya, doctype-tiltás, 4 MB korlát)
nem fordulnak át automatikusan. Deno-ban: `fast-xml-parser` `processEntities: false`-szal,
**a doctype-ot tartalmazó fájl eldobva**, a 4 MB korlát explicit. Az indok változatlan: *egy
feltöltött számla akkor is olyan fájl, amit nem a feltöltője írt.*

---

## Adatmodell (Postgres)

`companies` · `company_members` (a régi `company_user`; `role` ∈ tulajdonos/szerkeszto/megtekinto,
`accepted_at`) · **`files`** · **`documents`** (`file_id`, `oldal_tol`, `oldal_ig`,
`auto_jovahagyva`, `auto_indok`) · `document_extractions` · `document_corrections` · `exports` ·
`overage_charges` · `activity_log`.

Négy szabály, amit a migrációban ki kell mondani:

1. **`document_extractions` túléli a dokumentumot** (`document_id` ON DELETE SET NULL). A keret
   ebből számol, nem a `documents`-ből: amit a felhasználó el tud tüntetni, abból nem lehet
   keretet számolni. Ez egyben az audit-nyom.
2. **Nincs számláló, csak lekérdezés** az aktuális Stripe-ciklusra. Egy számláló elcsúszhat.
3. **Ismeretlen árazonosító = a legkisebb csomag kerete**, `warning` a naplóba. Soha nem
   „korlátlan" — a régiben ez `PHP_INT_MAX` volt, épp az AI-költséges oldalon.
4. **`User::ceg()` a legkorábbi tagságot választja**, nem a legkisebb cégazonosítót — különben
   egy tagfelvétel elvehetné valaki más fiókját. Ez biztonsági döntés, nem kényelmi.

**RLS minden cégfüggő táblán**: olvasás és írás csak akkor, ha `auth.uid()` tagja a sor
`company_id`-jéhez tartozó cégnek; a `company_id` beszúráskor **trigger tölti**, nem a kliens
állítása. A Storage bucket privát, aláírt URL-lel, ugyanezzel a tagsági feltétellel.

---

## Mérföldkő 1 — a gerinc

1. **Váz**: Vite + React + TS + Tailwind 4, `app.css` átemelve, logó, helyi betűk, útvonalak.
   A `config/szamlafolyo.ts` már itt megszületik.
2. **Supabase projekt** (EU) + migrációk + RLS + a privát bucket.
3. **Auth**: regisztráció (kapcsolóval zárható), belépés, jelszó-emlékeztető, cégalapítás
   **érvényes magyar adószámmal** (a fogyasztóvédelmi szűrő — itt szigorúbb a mérce, mint a
   bizonylatokon), meghívó.
4. **`shared/uzleti` portolása tesztvezérelten**: minden modul Vitest-tel, a régi
   `tests/Unit/` eseteiből indulva.
5. **Beérkező**: feltöltés (20 MB, tartalomból megállapított MIME), duplikátumszűrés `sha256`-ra,
   sor, állapotjelvények.
6. **`kiolvas` Edge Function**: claim → `Felderito` → XML-ág vagy Vertex-hívás → `Sema.tisztit`
   → normalizálás → validátorok → `Konfidencia.osszevon` → **kapuk** → állapot + kredit.
   Bizonylathatárok esetén bizonylatonkénti újrafutás oldaltartománnyal.
7. **Ellenőrzés képernyő**: kétoszlopos, élő validátor-újrafuttatás a **jelenlegi**
   űrlapállapoton, három színsáv + „nincs adat", szerkeszthető ÁFA-bontás, jóváhagyáskor
   `document_corrections`.
8. **Tételek** + **Export** (xlsx/csv/json, `Oszlopok` egy forrásból, adószám-**törzsszám**
   alapú ügyfélszűrő mindkét oldalra) + **Archívum**.
   Az `ExportKeszito` sorrendje kötött: **export fájl → tételek átjelölése → csak ezután törlés.**
9. **Kvóta próbaidőn** (14 nap / 50 dokumentum, amelyik előbb elfogy) — Stripe nélkül fut,
   ezért a gerinc önmagában kipróbálható.

Utána, külön körben: Stripe + túlhasználat · nyitólap + jogi oldalak · e-mail beküldés webhookkal.

---

## ✅ Megtörtént: a `kiolvas` telepítve (2-es verzió)

A függvény **fut** a `mwveyzyxupgccqdnbpwe` projekten, `verify_jwt: true`-val.
Ami eddig csak papíron létezett, most valóban válaszol.

**Az ingyenes csomag elbírja**: egy Edge Function a 25-ből, a percenkénti cron
~43 200 hívás az 500 000-ből. A Free tier korlátja továbbra sem ez, hanem az egy
hét inaktivitás utáni felfüggesztés — ez a telepítés kipróbálhatóvá tette a
projektet, nem élesíthetővé.

### Hogyan ment, és mit tanultunk belőle

1. **A repógyökér-relatív útvonalak működnek.** Egy kétfájlos próbával mértem
   meg: `entrypoint_path: supabase/functions/kiolvas/…` és egy `../../../shared/…`
   import — a válasz `{"proba":"utvonal-rendben"}` volt. Semmit nem kell átírni
   ahhoz, hogy a `shared/uzleti` egyetlen példányban maradjon.
2. **De a huszonnégy fájl nem fér egyetlen MCP-hívásba.** Ez az én kimeneti
   korlátom, nem a Supabase-é. Ezért lett a telepített artefakt egy **generált
   csomag** (`kiolvas.bundle.js`, 39 kB), amit a
   `supabase/functions/kiolvas/csomagol.mjs` állít elő — megismételhetően,
   `npm run kiolvas:csomag`-gal. Kézzel szerkesztett másolat nincs, és nem is lesz.
3. **A csomag ASCII-tiszta**, mert az esbuild `\uXXXX`-re írja a nem ASCII
   karaktereket; az egyetlen kivételt (a `€` jelet egy regex-literálban) a
   csomagoló script cseréli le a saját escape-jére. A mérésből derült ki, hogy ez
   a védelem jogos: a repóban egy **láthatatlan** nem törhető szóköz ült egy
   regexben (`osszeg.ts`), amit ugyanez a kör escape-elt alakra cserélt.

> Amit a visszaolvasás mutatott: a szerveren tárolt fájlban a `\u0151` alakú
> escape-ek **literál karakterként** jelennek meg, a `\xE9` alakúak escape-ként.
> JavaScriptben a kettő ugyanaz a sztring — a telepített kód jelentésében azonos
> a repóbelivel, és a próbák ezt meg is erősítik.

### Amit a telepítés után mértem

| Próba | Eredmény |
|---|---|
| Hitelesítés nélkül | **401** `UNAUTHORIZED_NO_AUTH_HEADER` — a `verify_jwt` kapu áll |
| `anon` kulccsal, `{"limit":1}` | **403** „A kötegelt feldolgozás csak belső hívásból indítható." |
| `anon` kulccsal, idegen `dokumentum_id` | **403** „Nincs jogosultságod ehhez a bizonylathoz." |

A két 403 többet bizonyít a jogosultságnál: a **kód lefutott**, tehát a csomag
boot-ol — vagyis a három `npm:` függőség (köztük a legkockázatosabb `unpdf`, a
pdf.js-sel) feloldódott az Edge Runtime alatt. Ez volt a telepítés fő kockázata,
és elhárult.

A próbákat `pg_net`-tel, **az adatbázisból** indítottam: ez a környezet nem éri
el a `*.supabase.co`-t és az `api.supabase.com`-ot sem (mindkettő 403 a proxyn),
a Postgres viszont a Supabase oldalán fut.

---

## ➤ Most következő lépés: a kör lezárása és a cron feléledése

### 1. A repó rendbetétele — ✅ kész (`b81f637`)

| Fájl | Mi |
|---|---|
| `supabase/functions/kiolvas/csomagol.mjs` | **új**: a csomagoló, a miértjével együtt |
| `supabase/functions/kiolvas/kiolvas.bundle.js` | **új, generált**: a ténylegesen telepített artefakt — azért kerül a repóba, hogy auditálható és diffelhető legyen |
| `package.json` | `kiolvas:csomag` script |
| `shared/uzleti/osszeg.ts` | a láthatatlan nem törhető szóközök escape-elt alakra cserélve (viselkedésben azonos, a 29 összeg-teszt zöld) |
| `supabase/functions/kiolvas/README.md` | a telepítés valósága: az MCP-s út és a csomag; a `supabase functions deploy` továbbra is járható, ha valakinek van CLI-je |

232 teszt zöld, tiszta typecheck és build, feltolva a
`claude/awesome-volta-kh12af` ágra.

### 2. A Vault-titkok — ✅ kész

Mindkét titok a helyén (`belso.sor_allapot()` szerint). A `service_role` kulcsot
te írtad be az SQL-editorban, tehát nem ment át ezen a beszélgetésen.

### 2b. A guard javítása — ✅ kész (`7e5adf1`)

A cron a titok beírása **után is** percenként 403-at kapott. Az ok nem a kulcs
volt: a függvény a kapott `Authorization` fejlécet a
`SUPABASE_SERVICE_ROLE_KEY` környezeti változóval hasonlította **sztringre**, a
projekt viszont új formátumú API-kulcsokat is használ, így a befecskendezett
érték nem ugyanaz a betűsor, mint a dashboardon látható, örökölt `service_role`
JWT — pedig a kettő ugyanazt a jogosultságot jelenti.

A hiba osztálya a rosszul feltett kérdés: nem az érdekel, hogy a hívó **ugyanazt
a betűsort** küldte-e, hanem hogy **szolgáltatás-jogosultsággal** hív-e. Az új
`shared/uzleti/token.ts` a token `role` állítását olvassa (8 teszt).

Ez azért biztonságos, mert a platform a tokent addigra **már hitelesítette** — és
ezt nem feltételeztem, hanem **megmértem**: egy `service_role` szerepű, de hamis
aláírású token **401**-et kap (`UNAUTHORIZED_LEGACY_JWT`), el sem jut a kódig.
Az érvelés a `verify_jwt: true`-ra támaszkodik, ezért a figyelmeztetés a
`token.ts` fejlécében áll, nem a commit-üzenetben: ha valaha kikapcsolnánk, a
hívást másképp kell hitelesíteni.

> **Mellékesen egy tanulság a push-védelemről.** A teszt fixtúrája eredetileg egy
> `sb_secret_…` alakú betűsor volt, amit a **publikus** kulcs végéből raktam
> össze — a GitHub titokpásztázója viszont az *alakot* nézi, nem a jelentést, és
> megállította a push-t. Valódi titok nem szivárgott (a publishable kulcs
> szándékosan publikus, benne van a kiszállított bundle-ben), de a fixtúra így is
> rossz volt: most darabokból áll össze. A push-védelem feloldása nem opció — a
> kivétel legközelebb már egy valódi kulcsot is átengedne.

### 3. A valódi kötegelt próba — ✅ kész, a 3-as verzión mérve

| Próba | Eredmény |
|---|---|
| Üres sor, cron- és kézi futás | **200** `{"feldolgozva":[]}` — a 16:59-es futás még 403 volt, a 17:00-s már 200. **A cron feléledt.** |
| Hiányzó fájlú bizonylat, 1. és 2. futás | `ujraprobalhato`, „A bizonylat fájlja nem tölthető le." |
| Ugyanaz, 3. futás | `hiba` — `attempts: 3`, `claimed_at` kiürítve |
| Az audit-nyom utána | **3** `document_extractions` sor, **0 kredit, 0 forint** |
| Két egyszerre indított hívás ugyanarra a bizonylatra | egyik `kihagyva`, másik `ujraprobalhato` — **pontosan egy nyert** |

Az utolsó sor nem volt betervezve: két hívás véletlenül egyszerre futott le, és
ezzel élesben igazolta a claim atomiságát — azt a feltételes `UPDATE`-et, ami a
régi `Sorkezelo` sorzárját váltotta ki. A tervben ez integrációs tesztként
szerepelt; most ingyen megvan.

A próbaadatok (cég, fájl, bizonylat) törölve; az adatbázis újra üres.

### 4. Végponttól végpontig — ⛔ elakadt, és itt a feloldás

**Ez a terv aktív része.** A telepített alkalmazás fut, de a nyitólap
**zsákutca**: a helyőrzőn nincs egyetlen link sem, tehát nincs út a
bejelentkezésig. Ezt látja a felhasználó, amikor ki akarja próbálni.

#### Context — mi akadt el, és miért

Amit mértem, mielőtt bármihez hozzányúltam volna:

| Amit ellenőriztem | Állapot |
|---|---|
| A telepítés él-e | ✅ `szamla-folyo2.vercel.app`, a **7e5adf1** commitból — a legfrissebb |
| A SPA-átirányítás | ✅ a `/regisztracio` is az `index.html`-t kapja (`vercel.json` rewrites) |
| A Supabase-kulcsok a Vercelen | ✅ be vannak állítva — különben a `src/lib/supabase.ts` modulbetöltéskor dobna, és fehér lap fogadna, nem a nyitólap |
| Melyik ágból épül a production | ✅ **`claude/awesome-volta-kh12af`** — nincs `main`; egy push automatikusan élesít |
| `auth.users` | ⛔ **0 sor** — nincs kivel belépni |
| A `/` útvonal | ⛔ `Vazlat` helyőrző, **nulla linkkel** |

Tehát nincs hiba a kódban: két hiányzó dolog van. A kettő közül **csak az egyik
kódkérdés**.

Külön érdemes megjegyezni egy harmadikat, mert ez egy csendes hazugság a
configban: a `src/lib/kornyezet.ts` exportálja a `fejlesztesAlatt` kapcsolót, a
`.env.example` kommentje pedig **ígéri**, hogy „a belépés előtti képernyőkön
figyelmeztetés fogadja a látogatót" — a kapcsolót viszont **sehol nem használjuk**
(`grep -rn fejlesztesAlatt src/` egyetlen találata a definíciója). Ez pont az a
fajta rés, amit ebben a projektben nem hagyunk: vagy kimondjuk a kódban is, vagy
a kapcsoló megy a kukába. Itt kimondjuk — a bekapcsolt fejlesztői mód egy
valóban hasznos dolog indulás előtt.

#### A döntések (veled egyeztetve)

- **Minimális belépő**, nem a valódi nyitólap. A rendes nyitólap a 2.
  mérföldkőben marad, a jogi szövegekkel együtt — az egy külön kör, és a
  Beállítások meg a kvóta előbbre való.
- **Az első fiókot te hozod létre** a Supabase dashboardon. A jelszó így nem megy
  át ezen a beszélgetésen (ugyanaz a megfontolás, mint a `service_role` kulcsnál),
  a nyilvános regisztráció **zárva marad**, és megkerüljük az e-mail-megerősítést
  — a beépített Supabase-levélküldő óránként kevés levelet enged, és ezen a ponton
  nem azt akarjuk mérni.

#### A kódváltozás — ✅ kész (`72f9566`)

**1. Új: `src/kepernyok/Nyitolap.tsx`**

A kilépett látogató belépője. Szándékosan **külön fájl**, nem az `App.tsx`-be
írt helyőrző: a 2. mérföldkőben a valódi nyitólap ezt az egy fájlt váltja le,
nem egy útvonaltáblát kell majd szétszedni.

Tartalma szűk, és minden eleme indokolt:

- `LogoSor` (`src/komponensek/Logo.tsx`) — ugyanaz a logó, amit a `Vazlat` és az
  `AppElrendezes` is használ, nem egy negyedik változat;
- egyetlen őszinte mondat arról, mit csinál a termék. A forrása adott: az
  `index.html` `<meta name="description">` tartalma, ami már most is ezt mondja —
  **egy szöveg, két helyen ne térjen el**;
- **„Bejelentkezés"** gomb a `/bejelentkezes`-re (`btn btn-primary`, az `app.css`
  meglévő osztálya);
- „Regisztrálok" link **csak akkor**, ha `regisztracioNyitva` — pontosan az a
  szabály, ami a `Bejelentkezes.tsx:86`-ban már áll. Nem két viselkedés, egy;
- `FejlesztesAlattSav` (lentebb), ha a kapcsoló áll.

**2. Új: `src/komponensek/FejlesztesAlatt.tsx`**

Egy apró sáv, ami a `fejlesztesAlatt` kapcsolóra hallgat, és `null`-t ad, ha az
ki van kapcsolva. Három helyen ül: a Nyitólapon, a `Bejelentkezes`-en és a
`Regisztracio`-n — vagyis pontosan azon a három „belépés előtti képernyőn",
amit a `.env.example` ígér. Ezzel a komment igazzá válik, egyetlen komponens
árán.

Stílus: a meglévő `alert` osztályokból, nem új CSS-ből. Az `app.css` `@layer
components` blokkja szó szerint a régi rendszerből jött — **nem bővítjük** egy
ilyen apróságért.

**3. `src/App.tsx`**

- a `/` a `Kezdolap`-on át már a `Nyitolap`-ot adja a kilépett látogatónak (a
  belépettet továbbra is a Beérkezőre viszi — az a logika jó, marad);
- a `Vazlat` **megmarad** a `/aszf`, `/adatkezeles`, `/impresszum` útvonalakhoz.
  Azok tényleg nem készültek el, és a helyőrző ott igazat mond.

Amihez **nem nyúlunk**: az útvonalvédelem (`src/komponensek/Vedett.tsx`), az
auth-képernyők logikája, a `vercel.json`. Mind a helyén van, és mind mérve.

#### Amit a böngészőben mértem, telepítés előtt

Mockolt hálózattal, **mindkét kapcsoló mindkét állásában** — mert egy kapcsoló,
amit csak az egyik állásában néztünk meg, fél kapcsoló:

| Állítás | Eredmény |
|---|---|
| A `/`-on van Bejelentkezés gomb | ✅ |
| A gomb a `/bejelentkezes`-re visz, és ott áll az űrlap | ✅ |
| „Regisztrálok" link **nyitott** regisztrációnál | ✅ megjelenik |
| „Regisztrálok" link **zárt** regisztrációnál | ✅ eltűnik |
| A fejlesztői sáv `VITE_FEJLESZTES_ALATT=true` mellett | ✅ ott van a Nyitólapon **és** a Bejelentkezésen |
| Ugyanaz `false` mellett | ✅ eltűnik |
| A jogi helyőrzőről a logó visszavisz a `/`-ra | ✅ |
| JS-hiba a konzolon | ✅ nincs |

240 teszt zöld, tiszta typecheck és build.

#### Amit neked kell megtenni — egyszer

Supabase → **Authentication → Users → Add user**:

- e-mail + jelszó a sajátod,
- **„Auto Confirm User" bepipálva** — enélkül megerősítő levélre várnál.

A jelszót ne írd ide. Ha megvan, `select count(*) from auth.users;` — egy sor, és
mehetünk tovább.

#### Verifikáció

Helyben, telepítés előtt:

- `npm test` (240 teszt), `npm run typecheck`, `npm run build` — a szokásos kör;
- böngészőben, `npm run dev` mellett, **hálózati mockkal** (ugyanaz a
  `ctx.route()`-os módszer, amivel az Export képernyőt néztem meg): a `/` mutassa
  a Bejelentkezés gombot; a gomb vigyen a `/bejelentkezes`-re; a „Regisztrálok"
  link a kapcsoló **mindkét** állásában a helyesen viselkedjen.

Telepítés után, a te böngésződben — **ez a valódi próba**:

1. `szamla-folyo2.vercel.app` → Bejelentkezés → a dashboardon létrehozott fiók;
2. a cégfal a `/ceg-letrehozas`-ra visz → cégalapítás **érvényes magyar
   adószámmal** (itt szigorúbb a mérce, mint a bizonylatokon);
3. `/beerkezo` → egy **UBL XML** feltöltése → modellhívás **nélkül** fut végig, és
   megjelenik az Ellenőrzésen. **Nulla forint**, és ez méri végig a láncot;
4. utána egy **PDF** — ez lesz az első alkalom, hogy a `v6` prompt élesben fut. A
   `document_extractions` sorban három dolgot érdemes megnézni: `model_version`
   (mit futtatott az OpenRouter *valójában*), `cost`, és hogy a
   `nehezen_olvashato` zászló hogyan viselkedik;
5. végül Tételek → Export → Archívum, és az eredeti fájl sorsa a megőrzési idő
   szerint.

A 3–5. lépés adatbázis-oldalát innen tudom nézni a Supabase MCP-vel, ahogy a
kötegelt próbánál is tettem.

### 5. Mintabizonylatok a próbához — ✅ kész (`c5b7ab8`)

Mind a négy fájl átment a repó **saját** értelmezőjén és validátorán, tehát nem
„elvileg jó", hanem mérve az:

| Fájl | Értelmező | Típus | Validátor |
|---|---|---|---|
| `minta/ubl-szabalyos.xml` | `xml/ubl` | számla | tiszta |
| `minta/cii-szabalyos.xml` | `xml/cii` | számla | tiszta |
| `minta/ubl-hibas-osszeg.xml` | `xml/ubl` | számla | **a három összeg-mezőn bukik, máshol nem** |
| `minta/ubl-sztorno.xml` | `xml/ubl` | **sztorno_szamla** | tiszta, −194 400 |

A sztornót a **gyökérnév** alapján ismerte fel, típuskód nélkül — pontosan ahogy
a `ubl.ts:75` ígéri.

#### Context

A fiók megvan, a belépő megvan — hiányzik, **amit fel lehet tölteni**. A repóban
ma **nulla** minta van (`find . -name '*.xml'` üres): az XML-értelmező tesztjei
a fixtúrákat a `shared/uzleti/xml/xml.test.ts`-be ágyazva, sztringként tartják.
Egy egységteszthez ez jó, egy böngészős próbához nem: ott **fájl** kell.

Ezért egy kis mintakészlet készül a `minta/` könyvtárban. Nem eldobható
segédanyag: ez a kézi végigpróbálás korpusza, ami minden további körben (kvóta,
Beállítások, Stripe) újra kell — ezért kerül a repóba, nem a scratchpadbe.

#### Amit a mérés mutatott, és amiért ez nem csak fájlmásolás

- A rendszer **két** e-számla sémát ismer fel: UBL (`xml/ubl.ts:32` — a névtérre
  is szűr, mert a puszta `Invoice` gyökérnév túl gyakori) és CII/ZUGFeRD
  (`xml/cii.ts`).
- A fel nem ismert XML **nem hibázik**: a `kiolvas` szándékosan továbbejti a
  modellhez (`supabase/functions/kiolvas/index.ts:415-419`). Ez jó tervezés —
  de azt is jelenti, hogy egy rossz sémájú XML **csendben pénzbe kerül**.
- A feltöltés elfogadja az XML-t (`Beerkezo.tsx:150` és
  `shared/uzleti/fajltipus.ts:51`), és a MIME-et a **tartalomból** állapítja meg,
  nem a kiterjesztésből.

#### A fájlok

Mind a négy magyar adatokkal, **érvényes ellenőrző számjegyű** adószámokkal — és
ezeket nem kézzel számolom, hanem a repó saját `shared/uzleti/adoszam.ts`
függvényével generálom és ellenőrzöm. Egy minta, ami a saját validátorunkon
elbukik, félrevezető.

| Fájl | Mit mér |
|---|---|
| `minta/ubl-szabalyos.xml` | Az alapeset: UBL, két ÁFA-kulcs (27% és 5%), konzisztens összegek. **Modellhívás nélkül**, nulla forint — ez méri végig a láncot a feltöltéstől az Ellenőrzésig |
| `minta/cii-szabalyos.xml` | A másik ág (CII / Factur-X / ZUGFeRD alak). Ugyanaz a számtartalom, más séma — ha csak az egyiket próbáljuk, a másik ág mérés nélkül marad |
| `minta/ubl-hibas-osszeg.xml` | Szándékosan elrontva: nettó + ÁFA ≠ bruttó, a tűrésnél (±1 egység, `validatorok.ts:71`) nagyobb eltéréssel. Ettől az Ellenőrzés képernyőn **látszania kell a bukott validátornak** — enélkül csak azt tudnánk, hogy a jó eset jó |
| `minta/ubl-sztorno.xml` | `CreditNote` gyökér, negatív összegekkel. Két dolgot mér egyszerre: a sztornó felismerését típuskód nélkül is (`ubl.ts:75`), és hogy az **export a mínuszjelet nem nyeli el** — a CSV képlet-injekció elleni védelem szándékosan nem nyúl a számokhoz (`export/csv.ts`), és pont ez az a hely, ahol ez visszafejlődhet |

Mellé `minta/OLVASS-EL.md`: mit mér melyik, honnan lehet **valódi** mintát
szerezni (Peppol BIS 3.0 és Factur-X hivatalos példafájljai), és a NAV-megjegyzés
lentebb.

#### Amit a README-ben ki kell mondani, mert pénzbe kerül

A magyar számlázóprogramok jellemzően **NAV Online Számla** sémájú XML-t adnak ki,
és azt a rendszer ma **nem ismeri fel** — vagyis továbbesik a modellhez, és
fizetsz érte, pedig strukturált adat van a kezedben. Ez nem hiba, hanem egy
hiányzó értelmező; a döntésed szerint most **csak feljegyezzük**, külön körnek.

> Ezt méréssel érdemes eldönteni, nem találgatással: nézd meg, a te forrásaid
> (a könyvelt cégek számlázói) **ténylegesen** milyen formátumot adnak ki. Ha
> tényleg NAV-alak, akkor egy `shared/uzleti/xml/nav.ts` a UBL/CII mintájára
> nagyjából egy kör munka, és a magyar piac leggyakoribb XML-je az ingyenes ágra
> kerül.

#### Verifikáció

Helyben:

- a négy fájlt átengedem a repó **saját** értelmezőjén (`xmltFelolvas` +
  `xmlErtelmez`, `shared/uzleti/xml/`), és kiírom, mit olvasott ki belőlük —
  így a fájl nem „elvileg jó", hanem mérve az;
- a `ubl-hibas-osszeg.xml`-re külön megnézem, hogy a `bukottak()`
  (`validatorok.ts:30`) tényleg jelez-e, és mit;
- `npm test`, `npm run typecheck`.

A böngészőben, nálad — ez a lényeg:

1. `minta/ubl-szabalyos.xml` feltöltése a Beérkezőbe → **nulla forint**, és
   megjelenik az Ellenőrzésen. A cég **első 20 bizonylata mindig emberhez megy**
   (ez a bemelegítési fék), tehát automatikus jóváhagyást ne várj;
2. az adatbázis-oldalt innen nézem a Supabase MCP-vel: a `document_extractions`
   sorban `credits`, `cost: null` és `model_version: null` — ez bizonyítja, hogy
   az XML-ág futott, nem a modell;
3. `ubl-hibas-osszeg.xml` → az Ellenőrzésen látszik a bukott validátor;
4. végül Tételek → Export (xlsx **és** csv) → Archívum, a sztornóval együtt.

A fájlokat a beszélgetésben is átadom, hogy a böngésződbe le tudd tölteni.

### 6. ✅ A gerinc végigment — élesben, valódi bizonylattal

**2026-09-14. A lánc zárt.** Két bizonylat ment át, egy mindkét ágon:

#### A PDF-ág (fizetős) — és ez volt a `v6` prompt első éles futása

Egy valódi Paddle-számla (UK szolgáltató, fordított adózás), feltöltéstől
exportig **68 másodperc alatt**:

| Lépés | Időpont | Mi történt |
|---|---|---|
| Feltöltés | 06:55:49 | `szovegreteg`, 1 oldal, 44 kB |
| Kiolvasás | 06:56:13 | `google/gemini-3.8-flash`, `v6-2026-09-04`, 10,1 s |
| Export | 06:57:01.06 | xlsx, 1 tétel |
| Az eredeti törlése | 06:57:01.11 | **53 ezredmásodperccel az export után** |

Az utolsó két sor a `ExportKeszito` kötött sorrendjét igazolja élesben:
**export fájl → tételek átjelölése → csak ezután törlés.** A `storage_path`
kiürült, a `file_deleted_at` beíródott — pontosan az az invariáns, amit az
`export.ts` kimond.

**Nulla `document_corrections` sor.** A jóváhagyó ember egyetlen mezőt sem
írt át: a modell egy külföldi, fordított adózású számlát elsőre pontosan
olvasott ki, az `AE` ÁFA-kategóriával együtt. Egy bizonylat nem pontossági
mérés — de a javítások hiánya **pont az a jel**, amiről a terv azt mondja,
hogy az egyetlen visszajelzés a küszöbök helyességéről. Most nulla, és ez jó
hír.

#### Az XML-ág (ingyenes)

`minta/ubl-szabalyos.xml` → `forras_jelleg: strukturalt_xml`, és a
`document_extractions` soron **`model_version: null`, `cost: null`,
`input_tokens: null`**. Ez a bizonyíték, amit kerestünk: nem a modell olvasta.

**436 ezredmásodperc** a PDF 10,1 másodpercével szemben — huszonháromszor
gyorsabb, és nulla forint. Mind a tizenhat mező pontos, a kétkulcsos
ÁFA-bontással (27% és 5%) együtt.

#### A kapuk

Mindkét bizonylat `auto_jovahagyva: false`, az indok mindkettőn:
*„Az első 20 bizonylatot mindig ember nézi át."* A bemelegítési fék áll,
ahogy kell — nem azért ment emberhez, mert baj volt vele.

#### Amit az árazásról megtudtunk — az első valódi szám

A PDF kiolvasása **0,006429 USD** volt (3457 be- + 1023 kimeneti token).
Nagyságrendileg **2–3 forint** bizonylatonként.

| Csomag | Bevétel / bizonylat | AI-költség | Arány |
|---|---|---|---|
| Start (1990 Ft / 50) | 39,8 Ft | ~2,4 Ft | ~6% |
| Pro (9990 Ft / 500) | 19,98 Ft | ~2,4 Ft | ~12% |
| A legolcsóbb túlhasználat | 24 Ft | ~2,4 Ft | ~10% |

> A forintos szám a dollár/forint árfolyamtól függ — a **mérés** a dolláré,
> a forint átszámítás.

Ez azt a mondatot igazolja, ami eddig feltételezésként állt a
`config/szamlafolyo.ts`-ben: *„egy kiolvasás nagyságrendileg fillér"*. A 14
napos / 50 dokumentumos próbaidő teljes AI-költsége így nagyjából **120 Ft**
cégenként — a próba szűkítése tényleg nem költségkérdés, ahogy a komment
állítja.

**És ez adja meg a NAV-értelmező üzleti súlyát is**: minden XML-ágra terelt
bizonylat 2-3 forintot spórol *és* huszonháromszor gyorsabb, miközben a vevő
ugyanúgy egy kreditet fizet érte. Ha a magyar piac bizonylatainak érdemi része
NAV-formátumú XML-ként is elérhető, az nem kényelmi funkció, hanem árrés.

### 7. ✅ A gerinc kész: Beállítások + kvóta (`9239104`, `kiolvas` v5)

#### Egy mért jogosultsági rés, ami a kvóta feltétele volt

Az RLS **sorokat** korlátoz, oszlopokat nem. A `companies` UPDATE politikája jól
mondta meg, melyik sort lehet írni — de a táblaszintű `grant update` után a
tulajdonos a saját sorának bármelyik oszlopát átírhatta a REST API-n át, köztük
a `stripe_price_id`-t és a `trial_ends_at`-ot.

**Megmértem**, nem feltételeztem: a valódi tulajdonos jogosultságával,
visszagörgetett tranzakcióban az UPDATE átment, és a sor
`csomag=…4FXUyHhe statusz=active proba_vege=2099-01-01` lett. Vagyis egy PATCH
kéréssel bárki Pro csomagra tehette magát.

Javítás: oszlopszintű jogosztás (`20260914000100`), hat ártalmatlan mezőre. A
javítás után ugyanaz a próba `permission denied`-et kap, a legitim
beállításírás viszont megy — ezt is mértem, ugyanúgy visszagörgetve.

A hibaosztályt végignéztem a többi táblán: ott rendben van. A
`document_extractions`-ön **csak SELECT** politika áll, tehát a `credits`
oszlop — amiből a keret számol — a felhasználó számára elérhetetlen. Ez nem
szerencse: a terv 1. szabálya pont ezért tette oda a keretszámolást.

#### A keret

`shared/uzleti/keret.ts`, 21 teszttel. A nyersanyagot a `keret_adatok(uuid)`
SQL-függvény adja, a döntést ez a modul hozza, és **ugyanez a kettő szolgálja a
böngészőt és az Edge Functiont**.

A fék a `kiolvas`-ban áll, a **claim előtt** — mérve:

| Próba | Eredmény |
|---|---|
| Lejárt próbaidejű cég várakozó bizonylattal | `keret_elfogyott`, „Lejárt a 14 napos próbaidő…" |
| A bizonylat állapota utána | `feltoltve`, **`attempts: 0`**, `claimed_at: null`, nulla kiolvasás-sor |

Az `attempts: 0` a lényeg: ha a fék a claim *után* állna, a cron három perc
alatt `hiba` állapotba vinne minden várakozó iratot — pedig egy elfogyott keret
nem a bizonylat hibája.

#### ⚠️ Egy hiba, amit én okoztam

A telepítés során először egy **helyőrzőt** küldtem ki (`// PLACEHOLDER`), és
ezzel a 4-es verzió öt percre megállította a feldolgozást: a függvényben nem
volt `Deno.serve`, így a cron kérései 120 másodperces időtúllépésbe futottak.

Kár nem keletkezett — a sor üres volt, mindkét valódi bizonylat `exportalva`
maradt, `attempts: 1`-gyel —, de a hiba az enyém volt, és nem a csomag méretén
múlt: rosszul állítottam össze a hívást.

A tanulság a folyamatra szól: **a telepítés után azonnal mérni kell**, nem a
válasz `status: ACTIVE` mezőjét elhinni. Az 5-ös verziót ezért nem csak
telepítettem, hanem végig is futtattam — a magyar, ékezetes hibaüzenet
visszaolvasása egyben azt is igazolja, hogy a csomag `\xE1` és `\u0151` alakú
escape-jei épen mentek át.

### Ami ezután jön a gerincből

**Beállítások** (megőrzési idő, az automatikus jóváhagyás kapcsolója, tagok) és a
**kvóta a próbaidőn**. A `kiolvas` README-je három továbbra is nyitott dolgot
sorol fel, mind a következő körökre: beágyazott XML (Factur-X PDF-ben),
kötegszétszedés, keretellenőrzés.
---

## ✅ A három jogi oldal kész (`d6c38e4`)

TSX-ben, nem markdown-renderelővel (három statikus oldalért nincs új
függőség), a számok a configból. Öt ponton **nem másolat**, hanem javítás: a
magyarországi tárolás, az elavult modellnév, a „soha nem kerül automatikusan
jóváhagyásra", a munkamenet-süti és a „nem kerülhető meg a felületről" mind
valótlan volt. Az ÁSZF 3/4/8. pontja átírva a gépi jóváhagyásra és a
bizonylat-alapú kreditre.

Nyitva maradt: a **fiók törlése** három helyen ígért, felületről indítható
művelet volt, a `/fiok-torles` viszont ma is helyőrző. A szöveg ezért azt
mondja, ami igaz (e-mailben kérhető) — a gomb helye a Stripe-kör mellett van,
mert a törléshez az előfizetés lemondása is hozzátartozik.

---

## ➤ Most következő kör: a nyitólap

### Context

A `/` ma a **minimális belépő** (`src/kepernyok/Nyitolap.tsx`, `72f9566`): logó,
egy mondat, egy Bejelentkezés gomb. Szándékosan ennyi volt — akkor az volt a
feladat, hogy a telepített alkalmazás ne legyen zsákutca. A valódi nyitólap a
2. mérföldkőre maradt, a jogi oldalakkal együtt; azok most elkészültek, tehát a
nyitólapnak van mire hivatkoznia.

Az anyag megvan az átadócsomagban (`02-szovegek/nyitolap.md` és a Blade
eredeti): hero, „A munkafolyamat" négy lépése, „Nem hisszük el a gépnek, amit
mond" öt kártyája, árazás három csomaggal, lábléc. A szakaszhorgonyok
(`#folyamat`, `#elonyok`, `#arak`) onnan jönnek.

**De az a nyitólap egy másik terméket hirdetett**, és két állítása ma valótlan:

1. A lábléc azt írja: **„Az adatok magyar szervereken tárolódnak."** Ez ugyanaz
   a hibaosztály, amit az imént javítottunk a jogi szövegekben — az adat
   Frankfurtban van.
2. A régi termékben **minden** bizonylat emberhez került. Ma nem. Az ÁSZF 3.
   pontja ezt most kimondja; ha a nyitólap elhallgatná, a két szöveg
   széttartana.

**Eldöntve (veled):** a gépi jóváhagyás nem lábjegyzet, hanem **a fő ígéret**.
A hero mondja ki — „csak azt kapod kézhez, amivel tényleg dolgod van" —, a
fékek pedig közvetlenül alatta.

### A megoldás alakja

**Egy fájl kerül a helyére:** `src/oldalak/Nyitolap.tsx`, és a mai
`src/kepernyok/Nyitolap.tsx` megszűnik. A `kepernyok/` a belépés mögötti
képernyőké, az `oldalak/` a nyilvános lapoké — a jogi hármas már ott ül.

**Amit újrahasznosítunk, nem újraírunk:**

| Mit | Honnan |
|---|---|
| Logó | `komponensek/Logo.tsx` (`LogoSor`) |
| „Fejlesztés alatt" sáv | `komponensek/FejlesztesAlatt.tsx` |
| Árak, keretek, próbaidő, plafon, 20 MB, 7 nap | `config/szamlafolyo.ts` + `csomagSorrend` |
| A fair-use mondat | `@uzleti/kredit.ts` → `szabaly()` |
| Forintformázás | `@uzleti/osszeg.ts` → `formaz()` — **nem** `toLocaleString` |
| Kapcsolati e-mail | `oldalak/jogi/adatok.ts` → `szolgaltato.email` |
| Kártya, gomb, jelvény, sáv | `app.css` `@layer components` |

**A két kísérőszín végre használatba kerül.** Az `app.css` definiálja a
`--color-zsalya`-t és a `--color-mustar`-t ezzel a kommenttel: „A nyilvános
oldal két kísérőszíne." Ma **egyetlen hivatkozás sincs rájuk** — a
dizájnrendszer előre számolt ezzel az oldallal. Új CSS tehát nem kell, csak
elővenni, ami már ott van.

**A szakaszok:**

1. **Fejléc** — logó, horgonyok (`#folyamat`, `#elonyok`, `#arak`), Bejelentkezés.
2. **Hero** — a fő ígéret, a két gomb, a három próbaidő-adat a configból, és
   mellette egy **valódi** Ellenőrzés-kártya kicsiben: a `mezo-gyanus`
   osztállyal és a tényleges validátorüzenettel („A nettó és az ÁFA összege nem
   adja ki a bruttót."). Nem kitalált képernyőkép — az, amit a termék mutat.
3. **A munkafolyamat** (`#folyamat`) — a négy lépés. A 3. lépés szövege
   („Amit nem jelöltünk meg, azzal nincs dolgod") **most lett igazzá**.
4. **Miért bízhatsz benne** (`#elonyok`) — az eredeti öt kártyája (adószám
   ellenőrző számjegye, nettó+ÁFA=bruttó, kézírás, vegyes bizonylatok,
   rendszerfüggetlenség) **plusz egy hatodik**: a gépi jóváhagyás fékei.
5. **Árak** (`#arak`) — három csomag a configból, „Ajánlott" a Flow-n, alatta a
   túlhasználat szabálya és a fair-use mondat.
6. **Lábléc** — a jogi hármas, kapcsolat, és az EU-s tárolás **helyes** alakja.

**A zárt regisztráció nem lehet zsákutca.** A `regisztracioNyitva` ma `false`.
A „Kipróbálom ingyen" gombok ilyenkor **nem** vezethetnek egy csukott ajtóhoz:
zárva a hero elsődleges gombja a Bejelentkezés, az árkártyák gombjai eltűnnek,
és egy sor megmondja, hogy a regisztráció még nem nyitott. Ugyanaz a szabály,
ami a `Bejelentkezes.tsx:86`-ban és a mai nyitólapon már áll — harmadszor is,
egy helyről.

**Az `index.html` leírása is változik.** A mai `<meta name="description">` a
régi ígéretet hordozza, és a mai nyitólap szándékosan **abból** idéz. Ha az
ígéret változik, a kettő együtt változik — különben pont az a széttartás
keletkezik, amit a mostani fájl kommentje elkerülni akart.

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `src/oldalak/Nyitolap.tsx` | **új** — a nyitólap, helyi alkomponensekkel |
| `src/kepernyok/Nyitolap.tsx` | **törlés** — a helyére lép a fenti |
| `src/App.tsx` | az import útvonala |
| `index.html` | a `<meta name="description">` az új ígéretre |

### Verifikáció

Helyben: `npm test`, `npm run typecheck`, `npm run build`.

Böngészőben (Playwright, mockolt hálózattal, **390 px és 1280 px** szélességen):

- a három horgony (`#folyamat`, `#elonyok`, `#arak`) létezik, és a fejléc
  linkjei odagörgetnek;
- **zárt** regisztrációnál egyetlen `/regisztracio` link sincs a lapon, és a
  hero elsődleges gombja a Bejelentkezés; **nyitott**nál megjelennek — mindkét
  állás mérve, mert egy kapcsoló, amit csak az egyik állásában néztünk meg,
  fél kapcsoló;
- a configból jövő számok a helyükön (1 990 / 4 990 / 9 990 Ft, 50/200/500
  dokumentum, 14 nap, a fair-use mondat);
- **nem szerepel a lapon**: „magyar szerver", és szerepel az EU-s alak;
- vízszintes görgetés sehol, JS-hiba a konzolon nincs;
- a lábléc mindhárom jogi linkje a megfelelő oldalra visz.

---

## Amit a jogi szövegekben át kell vezetni (2. mérföldkő, de nem hagyható ki)

- **Adatkezelési 5. pont**: a „tárhely és adatbázis Magyarországon" táblázat **nem lesz igaz**.
  Új sorok: Supabase Inc. (EU-régió), Vercel Inc. **Az OpenRouter és a modellszolgáltató sora
  marad** (USA, `data_collection: deny`), a Stripe is. **A Nethely sora kiesik** — és vele az a
  mondat, hogy „a kiszolgálók, az adatbázis és a levelezés Magyarországon üzemelnek".
- **ÁSZF 3. pont**: mondja ki, hogy a rendszer a saját ellenőrzésein átment bizonylatokat
  **emberi jóváhagyás nélkül is továbbengedheti**, és hogy ez kapcsolható.
- **ÁSZF 4. pont**: a felelősség az Előfizetőé — ez most **fontosabb**, mint volt.
- **ÁSZF 8. pont**: a kreditszabály **bizonylatra** szól, nem fájlra; a köteg szétszedése a
  szolgáltatás része, és nem kerül külön kreditbe.
- **Nyitólap**: az ígéret őszinte alakja nem „mindent ellenőrzünk helyetted", hanem **„csak azt
  kapod a kezedbe, amivel tényleg dolgod van"**.
- Az ÁSZF 11. pontja 15 nap előzetes értesítést ígér alvállalkozó-váltás előtt. **Élő előfizető
  nincs**, tehát ez most szabadon átírható — de ha lenne, be kellene tartani.

> Változatlanul áll: **a jogi szövegek nem estek át jogi felülvizsgálaton.**

---

## Verifikáció

**Egységteszt (Vitest, `shared/uzleti`)** — a régi `tests/Unit/` eseteiből:
`osszeg` (a döntési tábla minden ága), `adoszam` (ellenőrző számjegy, megengedő `biztosanRossz`),
`afaBontas` (**a 0%-os sor ÁFA-val az egyéb vödörbe** — ez könnyen visszafejlődik), `kredit`,
`konfidencia` (**a validátor csak lefelé húzhat**; a hiányzó pontszám külön állapot), `validatorok`
(mind a 10 szabály a tűréseivel), `sema.tisztit`, `ido.datumErtelmez` (`2026-02-31` bukjon),
`xml` (UBL + CII fixtúrák, **és külön az XXE/doctype/méretkorlát**), `arlepcso`
(extra darabár > csomag saját darabára; a saját darabár csomagról csomagra csökken).

**Integrációs (Supabase branch vagy lokális stack):**
- **RLS**: a `BerloElkulonitesTest` állításai SQL-ben — másik cég sorát sem lekérdezni, sem
  aláírt URL-en elérni nem lehet; a `company_id` akkor is helyes, ha a kliens mást állít.
- **Claim**: két párhuzamos `kiolvas` hívás ugyanarra a dokumentumra — pontosan egy nyeri.
- **Kredit**: 6 oldalas PDF 3 bizonylattal → **3 kredit**, nem 5. A köteg futása 0.
- **Kapuk**: ismeretlen szállító → ember; `nehezen_olvashato` → ember; minden kapu átmegy és a
  cégnek 20+ előzménye van → automatikusan jóváhagyva, jelvénnyel és indokkal.

**Végponttól végpontig, kézzel:** regisztráció → cégalapítás → egy valódi PDF feltöltése → a
Beérkezőben végigfut → ellenőrzés (vagy automatikus jóváhagyás) → Tételek → xlsx export → az
eredeti fájl törlődik a türelmi idő szerint. Ugyanez egy UBL XML-lel, **modellhívás nélkül**.

**Kiolvasás próbája**: a régi `kiolvasas:proba` megfelelője scriptként (`npm run kiolvasas:proba
<fájl>`) — kiírja a felismert mezőket, a sávokat, a bukott validátorokat, a tokent, a költséget,
a **ténylegesen futtatott modellt** és a **prompt verzióját**. Ez a mérőeszköz prompt- vagy
modellcsere után; enélkül nem lehet megmondani, javult-e a pontosság.

---

## Nyitott kérdés, amit menet közben tisztázunk

A `files`/`documents` szétválasztás után az **export ügyfélszűrője** a bizonylaton áll (vevő és
szállító adószáma), a **selejtezés** viszont a fájlon. A kettő metszete az a szabály, hogy egy
fájl csak akkor törölhető, ha minden benne lévő bizonylat kiment. Ezt a `ExportKeszito`
megfelelőjében egyetlen helyen kell kimondani, és tesztelni — a régi rendszerben ez a hiba
osztálya volt („az egyik exportja elviszi a többi mögül a papírt").

> **Eldöntve az export körében:** a szabály az `export_rogzit` RPC-ben mondódik ki,
> ugyanabban a tranzakcióban, ami a tételeket átjelöli — a függvény maga adja vissza a
> törölhetővé vált fájlok listáját. A kliens nem dönt róla, csak végrehajtja. Külön
> teszt áll rá, hogy egy részben exportált fájl **nem** kerül a listára.

---

## ✅ Két apró kör, lezárva (2026-09-14 délelőtt)

**`df5f73f` — az xlsx pénzoszlopai számformátumot kaptak.** A számok eddig is
számként kerültek a cellába, csak `General` formátummal: a `280000` nyersen
jelent meg. Most a beépített 4-es formátum (`#,##0.00`) fut rajtuk — azért a
beépített, mert azt az Excel a **saját nyelvi beállítása szerint** jeleníti meg,
tehát magyarul magától tizedesvessző lesz belőle. Pénznemjel nincs benne: az
export vegyes pénznemű lehet, és aznap fel is töltöttél egy EUR-os számlát.
A pénzoszlopok 14 karakteres szélességet is kaptak — enélkül a formátum
**rontott** volna: `280 000,00` nem fér el az alapértelmezett oszlopban, és ott
az Excel `#######`-et mutat. A dátumok szándékosan ISO szövegek maradtak, és
most már teszt is áll rá, hogy ez döntés volt.

**`8ab0440` — a duplikátumsor elvethető.** A `duplikatum` bizonylat zsákutca
volt: ott állt a Beérkezőben, és semmit nem lehetett vele kezdeni. Nem a jog
tartotta bent (a `documents` DELETE politikája megvan), hanem az, hogy a felület
nem tette ki a gombot. A törlés feltétele a lekérdezésben áll
(`status = 'duplikatum'`), a `duplicate_of_id` oszlop pedig — ami a kezdetektől
üresen állt — végre kitöltődik. Az „eredetire ugró link" méréssel kimaradt: a
PostgREST nem tudja feloldani a `documents` → `documents` önhivatkozást
(`PGRST200`), egy külön lekérdezés hibája pedig a teljes listát vinné.

---

## ✅ A megőrzési ígéret megjavítva (`a643a7d`)

Kész, élesben, mérve. A `bizonylatok` bucket **üres**, a beragadt fájl elment,
és a napi cron (`szamlafolyo-selejtezes`, 03:17) áll. Amit az éles futás adott:
`{"befejezett":0,"selejtezett":1}`, és utána a tároló tényleg üres — nem a
válasz mezőjét hittem el.

A szabály öt esetét SQL-ben mértem, visszagörgetve: 0 nap → esedékes; 3 nap →
még nem; részben exportált fájl → soha; **újabb export ugyanarra a fájlra →
újraindítja az órát**; duplikátumsor nem tartja életben. A módosított
`export_rogzit` valódi felhasználó jogaival: 0 napnál `torolheto=1`, 3 napnál
`torolheto=0`.

Egy döntés, ami menet közben derült ki: a `belso.selejtezheto()` **nem lehet**
`security definer` + revoke, mert a `belso` függvényeket ebben a projektben a
séma védi, nem a jog — úgy az `export_rogzit` (`security invoker`) nem tudná
meghívni. `security invoker` lett, és ettől a `ceg` paraméter sem rés.

### Context

A Beállítások képernyő (`Beallitasok.tsx`, „Eredeti fájlok megőrzése") felkínálja
a 0–7 napot, és így érvel mellette: **„Ami nincs meg, azt nem is lehet
kiszivárogtatni."** Ez ma **nem igaz** minden 0-nál nagyobb értékre.

Az ok egy komment, aminek a védelme megszűnt (`src/lib/export.ts:293`):

```ts
// ⚠️ … jelenleg ide nem is juthat senki, mert az alapérték 0 nap,
// és a Beállítások képernyő még nem létezik.
if (megorzesiNapok > 0) {
  return 0;
}
```

A Beállítások képernyő azóta létezik (`9239104`), ütemezett selejtezés viszont
**nincs**: a `cron.job` táblában egyetlen feladat fut, a `szamlafolyo-sor`. Aki
tehát türelmi időt állít be, annak az eredeti fájlja **soha nem törlődik**.

És ez nem elméleti: a próbafiókban a `Lumentron Electronic Kft._L-250084-V…pdf`
**most is a bucketben ül**, `file_deleted_at is null`, pedig a bizonylata
`exportalva`. Egy idegen cég számlája, amit a rendszer ígérete szerint már
törölnie kellett volna.

Ez a projekt egyik alapszabályát sérti: **ígéret, amit a kód nem tart be.**
Ugyanaz az osztály, mint a `provider.data_collection = "deny"` nem
kapcsolhatósága vagy a `fejlesztesAlatt` kapcsoló, ami semmit nem csinált.

### A megoldás alakja

**A döntés a szerverre kerül, a kliensből pedig eltűnik.** Ma a kliens dönt
(`if (megorzesiNapok > 0) return 0`), és ez a rossz hely: a böngésző csak akkor
fut, ha valaki épp nézi.

**1. Egy közös SQL-predikátum — `belso.selejtezheto(ceg, csak_ezek)`**
(új migráció, `supabase/migrations/`). Visszaad `(id, storage_path)` sorokat
azokra a fájlokra, amelyekre mind igaz:

- `storage_path is not null and file_deleted_at is null`;
- van rajta legalább egy bizonylat, és **mind** `exportalva` vagy `duplikatum`
  — ez szó szerint a `export_rogzit` mai `not exists` feltétele
  (`20260912000700_export.sql:164`);
- **és eltelt a türelmi idő**:
  `max(exports.created_at) + file_retention_days * interval '1 day' <= now()`.

A `max()` a lényeg: ha egy tételt visszahívtak és újra exportáltak, a türelmi
idő **újraindul**. Ez a „N nappal az export után" helyes olvasata.

Ez a predikátum egyben **egyesíti a két esetet**: az azonnali törlés nem külön
ág, hanem a türelmi idő 0 napos esete. Ezért:

- az `export_rogzit` a saját inline `not exists` blokkját erre cseréli
  (`csak_ezek` = a most exportált bizonylatok fájljai);
- az `export.ts`-ből a `megorzesiNapok > 0` korai `return` **kikerül**, és vele
  a `eredetiketTorol` `megorzesiNapok` paramétere is. A kliens már csak
  végrehajt.

**2. Egy új Edge Function: `supabase/functions/selejtez/index.ts`.**
Nem kell hozzá csomagoló: a `shared/uzleti`-ből semmit nem importál, egyetlen
függősége a `@supabase/supabase-js` az import-térképből — tehát **egyetlen kis
fájl**, nem a `kiolvas` 41 kB-os bundle-je. Ez szándékos: a `kiolvas`
újracsomagolása és MCP-n át telepítése ma a legkockázatosabb lépésünk (lásd a
PLACEHOLDER-esetet), és egy selejtezőnek semmi köze a kiolvasáshoz.

A függvény: `service_role`-lal fut, a hívót a meglévő
`szolgaltatasSzerep()`-elvvel szűri (`verify_jwt: true` + a token `role`
állítása — ugyanaz a minta, mint a `kiolvas` kötegelt ágán), végigmegy a
cégeken, `belso.selejtezheto()`-t hív, és a már bevált **három lépést** futtatja:
`file_deleted_at` → tárolóból törlés → `storage_path := null`. A sorrend
indoka változatlan (`export.ts:270` kommentje): a félbemaradt törlés így
**pontosan a befejezetlen munka listája** marad.

Minden törlés `activity_log` sort ír (`fajl.selejtezve`).

**3. Napi cron** (ugyanabban a migrációban), a `belso.sort_hajt()` mintájára:
Vaultból olvasott `projekt_url` + `service_role_kulcs`, `net.http_post`, és
**néma, ha a titok hiányzik** — ugyanaz a döntés, ugyanabból az okból. Napi,
nem percenkénti: a türelmi idő napokban mérődik.

**4. Két hiányzó naplóbejegyzés** (kis kísérő javítás):
- `visszahiv()` (`src/lib/export.ts:473`) ma **nyomtalan**. Emiatt néz ki
  adatromlásnak, hogy egy export `item_count`-ja nem egyezik a rámutató
  bizonylatok számával. Írjon `export.visszahivas` sort.
- a megőrzési idő és az automatikus jóváhagyás átállítása
  (`src/lib/beallitasok.ts`) szintén nyomtalan — `beallitas.modosult` sor,
  a régi és az új értékkel.

### Amihez nem nyúlunk

Az `item_count` marad, ahogy van: azt rögzíti, mi került *bele* az exportba, és
ez utólag is igaz. A visszahívás nem írhatja át.

### Kritikus fájlok és a haladás

Az első lépés megírva, de **semmi nincs élesben**: a migráció a lemezen áll,
nincs alkalmazva, és nincs belőle commit (`git status`: egyetlen `??` sor).

| Fájl | Mi történik vele | Állapot |
|---|---|---|
| `supabase/migrations/20260914000300_selejtezes.sql` | `belso.selejtezheto()`, a REST-en hívható `public.selejtezendo_fajlok()` burkoló, az `export_rogzit` átírása a közös szabályra, `belso.selejtezest_hajt()` + napi cron | ✍️ **megírva, nincs alkalmazva** |
| `supabase/functions/selejtez/index.ts` | **új**: a selejtező, csomagoló nélkül | ⬜ hátravan |
| `src/lib/export.ts` | a `megorzesiNapok > 0` korai `return` kivezetése; `visszahiv()` naplóz | ⬜ hátravan |
| `src/lib/beallitasok.ts` | a `cegetMent()` naplóz | ⬜ hátravan |
| `src/kepernyok/Beallitasok.tsx` | a megőrzés-kártya szövege pontosítva (mikor fut a selejtezés) | ⬜ hátravan |

**Egy döntés, ami menet közben derült ki, és bekerült a migrációba.** A
`belso.selejtezheto()` eredetileg `security definer`-nek indult, de az
**elbukott volna** az `export_rogzit`-ből hívva: a `belso` függvényeket a
séma védi, nem a jog (`20260912000400_belso_sema.sql` fejléce mondja ki), és
az EXECUTE elvétele az `authenticated`-től ellehetetlenítette volna a hívást.
Így `security invoker` lett — ettől a `ceg` paraméter sem rés: a felhasználó
jogán az RLS úgyis csak a saját cégét adja, a `service_role` pedig eleve
mindent lát. Ugyanaz az érvelés, mint a `keret_adatok(ceg_id)`-nál.

Ezért kellett a `public.selejtezendo_fajlok()` burkoló is: a `belso` séma
**nincs közzétéve** a PostgREST-en, tehát az Edge Function nem érné el
közvetlenül. A burkolót csak a `service_role` hívhatja.

### Verifikáció

**Egységteszt.** A `belso.selejtezheto()` szabályára SQL-próbák, visszagörgetett
tranzakcióban (a `DO $$ … RAISE EXCEPTION $$` minta, amivel az oszlopjogokat is
mértük): (a) részben exportált fájl **nem** jön elő; (b) 0 nap → azonnal;
(c) 3 nap → ma nem, négy nap múlva igen; (d) visszahívott és újraexportált
tételnél a **későbbi** exporttól számol; (e) `duplikatum` sor nem tartja életben
a fájlt.

**Élesben, mérhetően.** A próbafiókban most **pontosan egy** beragadt fájl van
(a Lumentron-PDF). Ha a javítás jó, a **kézzel indított első futás elviszi** — és
ez a legjobb fajta próba: nem én gyártom hozzá az esetet, hanem a hiba hagyta
itt. Utána `select count(*) from files where storage_path is not null` → 0.

**A telepítés után azonnal mérni**, nem a `status: ACTIVE` mezőt elhinni — ez a
PLACEHOLDER-eset tanulsága. Egy `net.http_post` a `selejtez`-re, és a válasz
visszaolvasása a `net._http_response`-ból.

**Böngészőben.** Beállítások → 3 nap → export → a fájl **marad**, és a képernyő
ezt mondja is; vissza 0-ra → a következő futás elviszi.

---

## ➤ A `VITE_REGISZTRACIO_NYITVA` a Vercelen: Secret helyett Config

### Context

A regisztráció a Supabase-ben nyitva van, és nyitva is marad — a domain még
ideiglenes. A telepített oldal viszont **zárva** volt: az élő JS-csomagban a
„A nyilvános regisztráció még nem nyitott" szöveg szerepel, a nyitott ág
szövegei (`Ingyenes próba`, `Kipróbálom`, `Kiválasztom`) **nincsenek benne** —
a Vite fordításkor kidobta a holt ágat. A `/regisztracio` cím sem kerülő út: a
képernyő maga is elutasít (`Regisztracio.tsx:17`).

A Vercel szerkesztőablakából viszont kiderült valami más: a
`VITE_REGISZTRACIO_NYITVA` **`Secret` típusú**. A Vercel figyelmeztet is rá
(„Public prefixes expose values to the browser"), és a `Config` rádiógomb **le
van tiltva**: *„Saved secrets are write-only, so this variable can't be changed
to Config."*

⚠️ **Nem állítom, hogy a zárt csomag ezen múlt.** A Vercel dokumentációja
szerint a „sensitive" változót a build **megkapja** — vagyis az is lehet, hogy
egyszerűen `false` volt az érték, és most írod át. A két tény külön áll: a
telepített csomag mérve zárt, a változó típusa pedig mérve rossz. Hogy a kettő
összefügg-e, azt az újratelepítés utáni mérés dönti el, nem én.

Két külön baj van ebben, és a fontosabb nem a biztonsági:

1. **A titkosság hamis ígéret.** A `VITE_` előtagú változó értékét a Vite
   fordításkor **beleírja a böngészőbe letöltött JS-be** — ahogy az imént ki is
   olvastam belőle. Egy `VITE_` változó tehát soha nem titok, akárminek is
   jelöljük a felületen. (A Vercel dokumentációja szerint a „sensitive"
   változó a dashboardon rejtett, de a build megkapja — vagyis pontosan az a
   rész marad nyilvános, ami számít.)
2. **Cserébe elveszik a visszaolvashatóság.** A mentett titok write-only:
   soha többé nem lehet megnézni a dashboardon, hogy nyitva van-e a
   regisztráció, és **átalakítani sem lehet** Configgá. Ma is ezért kellett az
   élő csomagot grepelnem ahhoz, hogy megválaszoljam a kérdést.

Ebben a projektben **egyetlen `VITE_` változó sem titok**: a Supabase URL és a
publishable kulcs szándékosan nyilvános (az adatot az RLS védi, nem a kulcs
rejtése — ezt a `.env.example` ki is mondja), a két kapcsoló értéke pedig a
felület viselkedéséből amúgy is leolvasható. Az igazi titkok
(`OPENROUTER_API_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`) nem is a
Vercelen élnek, hanem Supabase Edge Function secretként. Vagyis a Vercelen
ebben a projektben **semminek nem kellene `Secret` típusúnak lennie**.

### A lépések

**1. A Vercel dashboardon (ez a te lépésed, nekem nincs rá eszközöm).**
A nyitott szerkesztőablakban a `Save` nem elég: a típus nem billenthető át.
A változót **törölni kell, és újra létrehozni** `Config` típussal,
`VITE_REGISZTRACIO_NYITVA=true` értékkel, Production (és Preview) célra —
majd egy újratelepítés, mert a `VITE_` változók fordításkor égnek bele, nem
futásidőben olvasódnak.

Érdemes ugyanitt megnézni a másik két `VITE_` változót is
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`): ha azok is `Secret`
típusúak, ugyanez a kezelés jár nekik. Ha egy érték nem olvasható vissza a
dashboardon, az már önmagában a jele.

**2. A repóban egyetlen fájl: `.env.example`.**
Ma elmondja, hogy a `VITE_` előtag mit jelent, és hogy a publishable kulcs nem
titok — de nem mondja el, hogy **a Vercel felületén ezeket `Config`-ként kell
felvenni, `Secret`-ként soha**. Ez a csapda ma egyszer már elsült, és a
következő deploy-nál ugyanúgy elsülne. A meglévő fejléckomment alá kerül egy
rövid blokk, ugyanabban a hangnemben: miért nem titok egy `VITE_` változó, mit
veszítünk a `Secret` típussal (write-only, nem konvertálható), és hogy a
valódi titkok a Supabase secretjei közé valók.

Kódváltozás nincs: a `src/lib/kornyezet.ts` alapértékei helyesek maradnak
(`regisztracioNyitva` alapból **hamis**, `fejlesztesAlatt` alapból **igaz**) —
mindkettő a biztonságos irányba dől, ha a változó hiányzik.

### Amit ez élesít, és amivel számolni kell

Ha a felületen tényleg megnyílik a regisztráció, életbe lép a **Supabase
beépített levélküldője**: óránként néhány levél, fejlesztésre szánva. A
megerősítő levél és a jelszó-emlékeztető is ezen megy
(`src/kepernyok/auth/Jelszo.tsx:22`). Amíg a domaint senki nem ismeri, ez
elvi probléma; a `szamlafolyo.hu` felcsatolásakor viszont ez lesz az első,
ami eltörik. A **Resend + SMTP** tétel ezért a domainváltás *elé* tartozik,
nem utána.

### Verifikáció

1. Az újratelepítés után visszaolvasom az élő JS-csomagot
   (`mcp__Vercel__web_fetch_vercel_url`), és ugyanazzal a módszerrel mérem,
   ami ma a zárt állapotot bizonyította:
   - **meg kell jelennie**: `Kipróbálom`, `Ingyenes próba`, `Kiválasztom`;
   - **el kell tűnnie**: „A nyilvános regisztráció még nem nyitott";
   - kontrollként végig ott marad: „Nézzük, hogyan működik".
2. Böngészőből: a `/regisztracio` cím az űrlapot adja, nem az elutasítást.
3. Egy valódi próbaregisztráció a saját címeddel — ez méri meg egyben azt is,
   hogy a megerősítő levél megérkezik-e.

---

## ➤ Most következő kör: a NAV Online Számla értelmező

### Context

A `minta/OLVASS-EL.md` (55–72. sor) egy ⚠️-gyel jelölt hiányt hagyott hátra, és
ez a kör azt zárja le:

> A magyar számlázóprogramok jellemzően **NAV Online Számla** sémájú XML-t adnak
> ki. Azt a rendszer ma **nem ismeri fel**: csak UBL-t és CII-t. […] egy
> NAV-formátumú XML **csendben pénzbe kerül**, pedig strukturált adat van benne.

A „csendben" szó szerint értendő: a `kiolvas` a fel nem ismert XML-t
szándékosan továbbejti a modellhez (`supabase/functions/kiolvas/index.ts`
`kiolvasas()`, a `eredmeny === null` ág), és ez jó tervezés — egy ismeretlen
alak nem akad el. De egy magyar számlázóprogram exportja nem ismeretlen alak:
strukturált adat, amiből ingyen és találgatás nélkül kiolvasható minden.

**Az üzleti súlyát a 6. pont mérése adja meg**, nem becslés: egy PDF kiolvasása
0,006429 USD volt és 10,1 másodperc; az XML-ág ugyanazon a napon 436
ezredmásodperc és **nulla forint**. Huszonháromszor gyorsabb, miközben a vevő
ugyanúgy egy kreditet fizet érte. Ha a magyar bizonylatok érdemi része
NAV-formátumban is elérhető, ez nem kényelmi funkció, hanem **árrés**.

### Amit a felderítés mért — és amiből a terv alakja következik

Négy tény a mai kódból, mindegyik ellenőrizve:

1. **A csatlakozási pont egy tömb.** `shared/uzleti/xml/xmlKiolvaso.ts:39` —
   `const ERTELMEZOK: readonly Ertelmezo[] = [cii, ubl];`. Egy új értelmező
   **egy import és egy tömbelem**. Az `Ertelmezo` szerződés
   (`ertelmezo.ts:14-19`) három mezőt kér: `nev`, `tamogatja`, `ertelmez`.
2. **A felderítés már ma is átengedi a NAV-fájlt.** A `felderit()`
   (`supabase/functions/kiolvas/felderites.ts:30`) minden `<?xml`-lel kezdődő
   tartalmat `strukturalt_xml`-nek minősít, tehát a NAV-XML **már eljut** az
   `xmlErtelmez`-ig — csak `null`-t kap vissza. A felderítéshez, a
   `forras_jelleg`-hez, az adatbázishoz és a felülethez **nem kell nyúlni**.
3. **A biztonsági réteg öröklődik.** A doctype-eldobás és a 4 MB-os korlát a
   `parser.ts:44-63`-ban ül, az értelmező elé. Egy új értelmező soha nem lát
   nyers XML-t, csak kész fát — **biztonsági kód nem kerül a `nav.ts`-be**.
4. **⚠️ A névtérfelismerés ma lyukas, és ez a NAV-on el is sülne.** Mérve, a
   repó saját parser-beállításaival: a `<ns2:InvoiceData xmlns:ns2="…">`
   alakú gyökérnél a `doc.nevter` **`null`**, mert a `nevterOlvas()`
   (`parser.ts:66`) csak az alapértelmezett `xmlns` attribútumot olvassa, az
   `attributumok()` pedig az `xmlns:ns2` kulcsot addigra `ns2`-vé rövidítette.
   A gyökér helyi neve (`InvoiceData`) viszont **helyesen** jön ki.

   Ez nem elméleti: a Java-alapú magyar számlázók rendszeresen prefixes
   gyökeret írnak. Ugyanez a lyuk az UBL-t is érinti (`ubl.ts:32`), csak ott
   eddig nem sült el.

### A megoldás alakja

**Egy új fájl, egy tömbelem, és egy apró javítás a parserben.**

#### 1. `shared/uzleti/xml/nav.ts` — az értelmező

`export const nav: Ertelmezo`, `nev: 'xml/nav'` (ez kerül a
`document_extractions.model` oszlopba, a `'xml/ubl'` / `'xml/cii'` mintájára).

A záró alak **szó szerint a meglévő kettőé** (`ubl.ts:35-67`): előbb a `mezok`
objektum a 15 `MEZOK` kulccsal, aztán `bontas`, végül a négy kísérő
(`afa_bontas`, `tobb_irat_gyanu`, `nehezen_olvashato`, `confidence`). Egy
csővezeték van, nem kettő — a `tisztit()` → `normalizal()` → validátorok lánc
ugyanúgy fut rá, mint a modell válaszára.

#### 2. A névtér-javítás a `parser.ts`-ben

A `Dokumentum` egyetlen `nevter: string | null` mezője helyett **az összes
deklarált névtér-URI**. A `parser.ts` `alakit()`-ja még látja a nyers
attribútumneveket, tehát ott kigyűjthető, mielőtt az `attributumok()`
lerövidíti őket.

A `nevter` egyetlen fogyasztója az `ubl.ts:32` — tehát ez **két sor**
változás, és az UBL-detektálás ugyanezzel a mozdulattal megjavul prefixes
gyökérre is. A meglévő `'névtér nélkül nem UBL'` teszt (`xml.test.ts:183`)
változatlanul megy: névtér-deklaráció nélküli `<Invoice>` esetén a lista üres.

#### 3. A többszámlás fájl: kiolvassuk az elsőt, és **emberhez küldjük**

A mai lánc egy fájl = egy bizonylat (`kiolvasas()` egyetlen `NyersValasz`-t
ad vissza), a NAV-exportok viszont gyakran több számlát tesznek egy fájlba.

Ilyenkor az értelmező az **első** számlát olvassa ki, és bekapcsolja a
`tobb_irat_gyanu` zászlót. Ez nem új mechanizmus, hanem a meglévő kettő:

- a **kapu** kizárja az automatikus jóváhagyást (`kapuk.ts:131`, „e)
  Szétszedetlen köteg" → *„Több bizonylat lehet a fájlban."*);
- az **Ellenőrzés képernyő** már ma is pontosan a helyes mondatot mondja
  (`src/kepernyok/Ellenorzes.tsx:256`): *„Úgy tűnik, ebben a fájlban több
  különálló bizonylat van. Az alábbi adatok az elsőre vonatkoznak — a többit
  külön érdemes feltölteni."*

Tehát **sem a kapukhoz, sem a felülethez nem kell hozzányúlni**. A választás
indoka: nulla forint, ember elé kerül, és nem hazudik teljességet. A másik két
út rosszabb — a modellhez ejtve fizetünk érte és találgat, a
kötegszétszedésre várva pedig addig is fizetünk.

**Három alak, egy szabály.** A NAV háromféleképpen tesz több számlát egy
fájlba, és mindhármat ugyanaz a kezelés fedi le:

| Alak | Hol |
|---|---|
| `InvoiceData` egy `invoice`-szal | az alapeset, egy bizonylat |
| `InvoiceData` több `batchInvoice`-szal | „több számla módosítása egy okirattal" |
| `Invoices` gyökér, több `invoice` gyerekkel | az Online Számla felület saját exportja |

Az értelmező ezért nem a gyökérre épít, hanem megkeresi azokat a
csomópontokat, amiknek **közvetlen `invoiceMain` gyerekük van** — ez mind a
három alakban pontosan a „számla-egység". Ha egynél több van, az első megy ki,
a zászlóval.

> ⚠️ Az `Invoices` gyökérre **nincs kiadott XSD** — a NAV saját GitHub-ján
> ez nyitott kérdés (#727 issue), a `dto/invoices` névtér egy belső JAXB-alak.
> Ezért nem feltételezünk fix mélységet: a fenti „közvetlen `invoiceMain`
> gyerek" keresés akkor is működik, ha a `&lt;invoice&gt;` gyerek nem pontosan
> `InvoiceDataType`. **A te valódi exportod ezt eldönti** — ez az egyik dolog,
> amit a mintafájlodon mérni fogok.

### A mezőtérkép

A NAV-séma 3.0-ból, a NAV saját XSD-iből és példafájljaiból. Minden útvonal a
számla-egységtől indul, helyi nevekkel.

| A mi mezőnk | NAV-útvonal | Megjegyzés |
|---|---|---|
| `doc_number` | `invoiceNumber` | **a gyökér közvetlen gyereke**, nem az `invoiceHead` alatt |
| `issue_date` | `invoiceIssueDate` | szintén a gyökéren; szigorúan `YYYY-MM-DD` |
| `fulfillment_date` | `…/invoiceDetail/invoiceDeliveryDate` | |
| `due_date` | `…/invoiceDetail/paymentDate` | a NAV-ban nincs más fizetési határidő |
| `currency` | `…/invoiceDetail/currencyCode` | |
| `payment_method` | `…/invoiceDetail/paymentMethod` | NAV-enum, **nem** UNCL4461 |
| `supplier_name` | `…/supplierInfo/supplierName` | |
| `supplier_tax_number` | `…/supplierTaxNumber/{taxpayerId,vatCode,countyCode}` | **három elemből** összerakva |
| `customer_name` | `…/customerInfo/customerName` | 3.0-ban **elhagyható** (magánszemély) |
| `customer_tax_number` | `…/customerVatData/customerTaxNumber/…` \| `communityVatNumber` \| `thirdStateTaxId` | `xs:choice`: pontosan egy |
| `net_amount` | `invoiceSummary/summaryNormal/invoiceNetAmount` | |
| `vat_amount` | `invoiceSummary/summaryNormal/invoiceVatAmount` | |
| `gross_amount` | `invoiceSummary/summaryGrossData/invoiceGrossAmount` | **`summaryNormal` testvére, nem gyereke** |
| `fizetendo` | — | a NAV-ban nincs külön fizetendő; marad `null` |
| `afa_bontas` | `summaryNormal/summaryByVatRate*` | lásd lent |

**Két csapda, ami a CII-nél élesben már megvolt**, és itt még élesebb:

- a `summaryGrossData` **nem** a `summaryNormal` alatt van, hanem mellette —
  egy leszármazott-keresés a `summaryByVatRate/vatRateGrossData/…`-ba
  csúszna, vagyis egy kulcssor bruttóját írná a bizonylat végösszegébe;
- a `vatAmountMismatch` **saját `vatRate` gyereket tartalmaz**, tehát
  `vatRate/vatAmountMismatch/vatRate` — egy rekurzív `vatRate`-keresés
  mindkettőt megtalálja. Közvetlen gyerek-bejárás (`ut`) kell.

#### Az ÁFA-bontás: a `VatRateType` nyolcágú választása

A NAV nem százalékot ír minden sorba: a `vatRate` egy **nyolcágú `xs:choice`**.
A leképezés a mi `AFA_KATEGORIAK` kódjainkra:

| NAV-ág | `kulcs` | `kategoria` |
|---|---|---|
| `vatPercentage` (`0.27`) | **27** | `S` |
| `vatExemption` (AAM, TAM) | 0 | `E` |
| `vatOutOfScope` (ATK) | 0 | `O` |
| `vatDomesticReverseCharge` | 0 | `AE` |
| `vatAmountMismatch/vatRate` | ×100 | `S` |
| `marginSchemeIndicator` | 0 | `null` |
| `noVatCharge` | 0 | `null` |
| `vatContent` | — | egyszerűsített számla, lásd lent |

> ⚠️ **A `vatPercentage` tört, nem százalék.** Az XSD `RateType`-ja
> `maxInclusive="1"` — vagyis `0.27`, és a `27` séma szerint **érvénytelen**.
> Százzal kell szorozni. Ez az a hiba, ami csendben 27 forintot csinálna
> 27 százalékból.

A `kulcs: 0` a mentes és hatályon kívüli soroknál nem kozmetika: a
`tisztitBontas()` **kulcs nélkül eldobja a sort** (`sema.ts:287`), tehát
`null`-lal egy AAM-számla egész ÁFA-bontása csendben eltűnne. A nulla kulcs
elsőrangú fogalom nálunk, saját export-oszloppal (`afaBontas.ts:25`).

A `K` (közösségi) és `G` (export) kategóriát **nem** találgatjuk: a NAV ezeket
`vatExemption`/`vatOutOfScope` alá teszi szöveges `case` kóddal, és egy
kódszótárat valódi minták nélkül kitalálni pont az a találgatás, amit ez a
projekt nem csinál.

#### A bizonylattípus — és egy tény, ami felülírja a kézenfekvő megoldást

⚠️ **Az `invoiceOperation` (CREATE / MODIFY / STORNO) nincs benne a számla
XML-jében.** Csak az `invoiceApi.xsd` borítékában él — vagyis abban a
pillanatban elvész, ahogy a bizonylatot kicsomagolják a NAV-nak küldött
kérésből. Egy könyvelőnek átadott fájlból **nem olvasható ki**, hogy sztornó-e
vagy részleges helyesbítés.

Amit olvasni lehet: az `invoiceReference` megléte (`originalInvoiceNumber`,
`modifyWithoutMaster`, `modificationIndex`).

A szabály ezért:

- **nincs `invoiceReference`** → `szamla`;
- **van `invoiceReference`** → `helyesbito_szamla`.

A második nem tippelés, hanem a **pontos gyűjtőfogalom**: minden
`invoiceReference`-es okirat helyesbítő okirat, a sztornó ennek a teljes
esete. A `kodok.ts` érvelése (*„egy rossz típus rosszabb, mint egy üres"*) itt
azt mondja, hogy **ne szűkítsünk sztornóra**: egy helyesbítést sztornónak
minősíteni egy egész számlát érvénytelenítene. Az ellenőrző képernyőn az ember
egy kattintással szűkítheti.

#### Az összegek előjele: a helyesbítő okirat **különbözetet** ír

A NAV saját példájában (`ZZZ000009`, a `ZZZ000001` helyesbítése) az
`invoiceNetAmount` **`-2200000`** — nem a számla új értéke, hanem a változás.
Ez könyvelésileg helyes, és a mi tárolásunkkal egyezik: a helyesbítő
bizonylaton a különbözet a könyvelendő tétel. Előjelet tehát **nem
módosítunk**; az `osszeg.ts` a negatív számokat eleve kezeli (nullától elfelé
kerekít, épp a sztornók miatt), és az `ubl-sztorno.xml` minta már ma is őrzi,
hogy a mínusz túléli az exportot.

#### Amit szándékosan **nem** számolunk ki

A `summaryGrossData` elhagyható, és az egyszerűsített számlán (`SIMPLIFIED`)
**se nettó, se ÁFA nincs sehol a dokumentumban** — csak bruttó és `vatContent`.

Kísértés volna kiszámolni: bruttó = nettó + ÁFA, illetve ÁFA = bruttó ×
`vatContent`. **Nem tesszük**, két okból:

1. A `fa.ts:145` szabálya: *„Amit nem értünk, azt eldobjuk — inkább üres mező,
   mint egy odaírt nulla, ami úgy néz ki, mintha tudnánk."* A származtatott
   érték nem kiolvasás.
2. **Elrontaná a saját ellenőrzésünket.** A „nettó + ÁFA = bruttó" validátor
   azért létezik, hogy a rosszul kiállított számlát elkapja. Ha a bruttót mi
   magunk számoljuk nettó + ÁFÁ-ból, ez a validátor **soha többé nem bukhat
   meg** — egy mérőeszközt cserélnénk le egy tautológiára.

A hiányzó bruttó következménye a meglévő gépezetben pontosan a helyes: a
`gross_amount` **kulcsmező** (`kapuk.ts:18`), tehát a bizonylat emberhez megy
(b kapu). Egyszerűsített számlánál ugyanez történik — és egy egyszerűsített
számlát amúgy is ember elé való vinni.

#### Amit ez a kör szándékosan kihagy: a base64-es API-boríték

A `ManageInvoiceRequest` / `QueryInvoiceDataResponse` borítékban a számla
base64-ben, gyakran gzippelve utazik. Ezt **most nem kezeljük**, és ez nem
feledékenység:

- a könyvelőnek átadott export sima XML; a boríték hibakeresési melléktermék;
- a kicsomagoláshoz **aszinkron** API kell (`DecompressionStream`), az
  `Ertelmezo.ertelmez` viszont szinkron — az egész diszpécsert át kellene
  írni egyetlen ritka alakért;
- a gzip **kicsomagolási bomba** felület: a 4 MB-os korlátot a kicsomagolás
  *után* újra meg kellene mérni.

Egy ilyen fájl ugyanúgy a modellhez esik, mint ma — nincs visszalépés. Ha a
te forrásod mégis ilyet ad, az a mérésből ki fog derülni, és külön kör lesz.

### Amit a meglévő kódból újrahasznosítunk, nem újraírunk

| Mit | Honnan | Miért pont az |
|---|---|---|
| Fabejárás (`keres`, `keresOsszes`, `ut`, `utSzoveg`, `keresSzam`) | `xml/fa.ts` | A `keresOsszes` első neve leszármazott-keresés, a többi közvetlen gyerek — pont ez kell a „fejléc-összesítő kontra tételsor" csapdához |
| Dátum | `fa.ts` → `datummaAlakit()` | A NAV ISO-dátumot ír (`2026-03-14`), amit a második ág már ma elkap |
| Adószám összerakása | `@uzleti/adoszam.ts` → `formaz()` | A NAV **három elemre bontja** az adószámot; a `formaz()` a 11 jegyből `12345678-2-42`-t csinál |
| Magabiztosság | `xml/ertelmezo.ts` → `konfidencia()` | Minden kitöltött mező 1.0 — a strukturált adat nem találgatás |
| ÁFA-kategóriák | `@uzleti/enumok.ts` → `AFA_KATEGORIAK` | `S / AE / Z / E / K / G / O`; a `tisztitBontas()` **csak ezeket** engedi át (`sema.ts:296`) |
| Összeg- és dátumértelmezés | `normalizal.ts` | Az értelmező `number`-t ad, a tárolási alakot ez csinálja |

Amit **nem** tudunk újrahasznosítani: a `kodok.ts` két függvénye. Az UNCL1001
és UNCL4461 ENSZ-kódlisták, a NAV viszont saját enumokat használt
(`TRANSFER`, `CASH`, `CARD`, `VOUCHER`, `OTHER`). Ezért a fizetési mód
leképezése a `nav.ts`-be kerül, **a `fizetesiMod()` doktrínájával**: az
ismeretlen kódot magát adjuk vissza, mert nálunk ez szabad szöveges mező, és
így legalább látszik, mi állt a bizonylaton.

**Egy csapda, amit előre ki kell kerülni:** a `tisztitBontas()`
(`sema.ts:287`) **eldobja azt a bontássort, amiben nincs `kulcs`**. A NAV
mentes (AAM/TAM) és hatályon kívüli sorain nincs százalék — ha ott `null`-t
adnánk vissza, az egész ÁFA-bontás csendben eltűnne. Ezekre `kulcs: 0` megy,
a megfelelő `kategoria` kóddal: a nulla kulcs elsőrangú fogalom a
rendszerben, saját export-oszlopa van (`afaBontas.ts:25` → `netto_0`).

### Kritikus fájlok

| Fájl | Mi történik vele |
|---|---|
| `shared/uzleti/xml/nav.ts` | **új** — az értelmező, a `ubl.ts`/`cii.ts` alakjában |
| `shared/uzleti/xml/xmlKiolvaso.ts` | egy import + egy tömbelem (`ERTELMEZOK`) |
| `shared/uzleti/xml/parser.ts` | a névtér-gyűjtés javítása (`nevterOlvas` → az összes deklarált URI) |
| `shared/uzleti/xml/fa.ts` | a `Dokumentum` típus névtér-mezője |
| `shared/uzleti/xml/ubl.ts` | egy sor: az új névtér-mezőre áll át |
| `shared/uzleti/xml/xml.test.ts` | új `describe('NAV', …)` blokk, beágyazott fixtúrával |
| `minta/nav-szabalyos.xml` | **új** mintafájl a kézi próbához |
| `minta/OLVASS-EL.md` | a ⚠️ NAV-szakasz (55–72. sor) átírása: a hiányból mért tény lesz |
| `supabase/functions/kiolvas/kiolvas.bundle.js` | **generált** — `npm run kiolvas:csomag` |

A csomagoló nem igényel beállítást: az esbuild a `index.ts`-től követi az
import-gráfot (`csomagol.mjs:43`), tehát a `nav.ts` magától bekerül, amint a
`xmlKiolvaso.ts` importálja. Új npm-függőség **nem** jöhet — a
`shared/uzleti` szabálya a nulla függőség, és a csomag három `external`
csomagja kötött.

### Verifikáció

**Helyben, egységteszttel** — a meglévő `xml.test.ts` konvenciói szerint:
beágyazott fixtúra template literalként, a csapdáit megnevező docblokkal, a
változatok `String.replace()`-szel az alapfixtúrából (`xml.test.ts:188`),
bontás-állítás egész objektumra (`toEqual`), hogy a kulcshalmaz is rögzüljön.

Amit mérni kell:

1. **a mezők a helyükre kerülnek** — mind a 15;
2. **a bizonylatszám és a kelt a gyökérről jön**, nem az `invoiceHead` alól —
   a fixtúra tegyen egy csapda-`invoiceNumber`-t lejjebb is;
3. **a bruttó a `summaryGrossData`-ból jön, nem egy kulcssor bruttójából** —
   a fixtúrában legyen `vatRateGrossData` is, más értékkel (ez a csapda a
   CII-nél élesben megvolt, `cii.ts:66-71`);
4. **a `vatPercentage` tört → százalék**: `0.27` → `kulcs: 27`;
5. **az adószám három darabból áll össze**, és a `formaz()` alakjában jön ki;
6. **a mentes sor nem esik ki** — `kulcs: 0` + `kategoria: 'E'`, vagyis a
   `tisztitBontas()` átengedi (`null` kulccsal eltűnne);
7. **az `invoiceReference` helyesbítővé teszi**, és a negatív különbözet
   előjelestül megy át;
8. **a `vatAmountMismatch` beágyazott `vatRate`-je nem zavar össze** — a
   közvetlen gyerek-bejárás bizonyítéka;
9. **hiányzó `summaryGrossData` → `gross_amount: null`**, nem kiszámolt érték;
10. **egyszerűsített számla**: bruttó megvan, nettó és ÁFA `null`;
11. **több számla egy fájlban** → az első mezői + `tobb_irat_gyanu: true`
    (mindhárom alakra: `batchInvoice` és `Invoices` gyökér);
12. **prefixes gyökér is NAV** (`ns2:InvoiceData`) — ez az a lyuk, amit a
    felderítés mért;
13. **dispatcher-negatív**: NAV-nak látszó, de névtér nélküli XML → `null`,
    vagyis megy a modellhez (a `'névtér nélkül nem UBL'` teszt mintájára);
14. **az UBL nem tört el**: a meglévő UBL- és CII-tesztek a névtér-javítás
    után is zöldek.

Utána a szokásos kör: `npm test`, `npm run typecheck`, `npm run build`.

**A minta a repó saját értelmezőjén**, ahogy a négy meglévőnél is: a
`minta/nav-szabalyos.xml`-t átengedem az `xmltFelolvas` + `ertelmez` páron, és
kiírom, mit olvasott ki — így a táblázat a `minta/OLVASS-EL.md`-ben **mért
eredmény**, nem ránézés. Az adószámok itt is a repó saját
`shared/uzleti/adoszam.ts`-ével generált, **érvényes ellenőrző számjegyűek**.

> A NAV **31 hivatalos példaszámlát** publikál a saját GitHub-ján
> (`nav-gov-hu/Online-Invoice`, `sample/Data sample/`), és pont a nekünk kellő
> eseteket fedik le: egyszerűsített, devizás, többféle ÁFA-típus, gyűjtő,
> helyesbítés, `batchInvoice`, magánszemély vevő. Ezek a referenciák a
> fixtúrához.
>
> ⚠️ **De a NAV saját példafájljaiban számtani hibák vannak** — a „több ÁFA
> típus" példában a 18%-os sor HUF-bruttója egy nullával több, a fordított
> adózású soron pedig nettó 600 000 mellett bruttó 500 000 áll. Ezekre tehát
> **nem építünk kerekítés-ellenőrző állítást**; a fixtúrát magunk írjuk,
> konzisztens számokkal. (Élesben ez a mi validátorunk dolga: jelezze, ne
> omoljon össze tőle.)

**Élesben, a te böngésződben** — ez a valódi próba:

1. `minta/nav-szabalyos.xml` feltöltése a Beérkezőbe;
2. az adatbázis-oldalt innen nézem a Supabase MCP-vel: a
   `document_extractions` soron **`model: 'xml/nav'`**, és `cost`,
   `model_version`, `input_tokens` mind **`null`** — ez a bizonyíték, hogy nem
   a modell olvasta;
3. a valódi NAV-exportod ugyanezen az úton — ez az egyetlen, ami a
   számlázóprogramok eltéréseit megmutatja;
4. többszámlás fájl esetén: az Ellenőrzésen ott a „több különálló bizonylat"
   figyelmeztetés, és a bizonylat **nem** kap automatikus jóváhagyást.

**A telepítés után azonnal mérni**, nem a `status: ACTIVE` mezőt elhinni — ez
a PLACEHOLDER-eset tanulsága (4. pont). Egy `net_http_post` a `kiolvas`-ra, és
a válasz visszaolvasása a `net._http_response`-ból.

### A sorrend

1. `nav.ts` + a névtér-javítás + tesztek — **a repóban, telepítés nélkül**.
   Idáig minden visszafordítható, és a teljes tesztkör zölden fut.
2. **A te valódi NAV-exportod** átengedése ugyanezen az úton. Ez az egyetlen
   lépés, amit a séma nem tud kiváltani: a gyártók (Számlázz.hu, Billingo,
   KBOSS) abban térnek el, hogy az **elhagyható** elemek közül melyiket írják
   ki egyáltalán. Ha kell igazítás, itt derül ki — még telepítés előtt.
3. `minta/nav-szabalyos.xml` + a `minta/OLVASS-EL.md` ⚠️-szakaszának átírása.
4. `npm run kiolvas:csomag`, commit, push a `claude/awesome-volta-kh12af` ágra.
5. Telepítés MCP-vel, **és utána azonnal mérés** — a fenti élesben-pont.

### Amit ez a kör nyitva hagy — kimondva

- **A base64/gzip API-boríték** (fent indokolva).
- **Az `Invoices` gyökér belső szerkezete** hivatalos séma nélkül, védekezően
  megírva; a te fájlod fogja igazolni vagy cáfolni.
- **A `K` / `G` ÁFA-kategória** nem jön ki a NAV `case` kódjaiból, nem
  találgatjuk.
- **Az előlegszámla** (`elolegszamla`) felismerése: a NAV `invoiceCategory`-ja
  ezt nem különbözteti meg, a tételszintű `advanceData` pedig a *végszámlán*
  is ott áll. Marad `szamla`, amíg valódi mintán nem látom a különbséget.
- **A kötegszétszedés** továbbra is külön kör: most jelezzük a több iratot,
  nem szedjük szét.

> A `kiolvas` README-je három nyitott tételt sorolt fel: beágyazott XML
> (Factur-X PDF-ben), kötegszétszedés, keretellenőrzés. A keretellenőrzés a 7.
> pontban elkészült; ez a kör egyiket sem zárja le, de a **NAV-hiányt igen** —
> és a `minta/OLVASS-EL.md` ⚠️-szakasza a repó legrégebbi kimondott adóssága.

---

## ➤ Következő kör: a README igazzá tétele + egy **harmadik** magyar XML-alak

### Context

Két dolog futott össze:

1. Kérted, hogy javítsam a `kiolvas/README.md`-ben a keretellenőrzést.
2. Végigvittél egy valódi XML-importot, és megnéztem, mi történt vele.

A második mérése **felülírt egy feltevést**, ami az előző kör alapja volt.

### Amit az import mérése mutatott

A `ZSG-2026-1.xml` (1794 bájt, `forras_jelleg: strukturalt_xml`) **a modellhez
ment**:

| | |
|---|---|
| `model` | `google/gemini-3.8-flash` |
| `cost` | **0,005605 USD** (≈ 2 Ft) |
| `duration_ms` | 5496 |
| `credits` | 1 |

Vagyis pontosan az az eset, amiről az egész kör szól: **strukturált adat volt a
kezünkben, és mégis a modell olvasta ki, pénzért.** A telepített függvény az
5-ös verzió, ami még nem ismeri a NAV-ot — de ahogy kiderült, ez nem is
segített volna.

**A fájl ugyanis nem NAV Online Számla formátumú.** Mérve, a fájl fejlécéből:

```xml
<szamla xmlns="http://www.apeh.hu/2005/szamla">
```

Ez a régebbi **APEH 2005 „számla adatexport"** alak — csupa magyar elemnév
(`fejlec`, `elado`, `vevo`, `szamlainfo`, `tetelek`, `osszesites`), és a
számlázóprogramok ezt teszik az e-számla mellé csatolmányként. **Se az
`ubl.ts`, se a `cii.ts`, se az új `nav.ts` nem ismeri fel**: a gyökér `szamla`,
a névtér `apeh.hu`, tehát mindhárom `tamogatja()` elutasítja.

> A fájl a **Billingo**-ból származik (te jelezted). Ez nem mellékes: ha egy
> ekkora magyar szolgáltató ezt az alakot adja ki, akkor a könyvelőhöz eljutó
> magyar XML-ek érdemi része **nem** NAV-séma, hanem ez.

Két apróság, ami ugyanebből a mérésből jött:

- A szállító adószáma `92220155-1-30`, és az **ÁFA-kódja 1 = alanyi
  adómentes** — ezért 0%-os a bizonylat. A modell `kategoria: null`-t adott a
  bontássorra; egy értelmező ebből a formátumból sem tudná kikövetkeztetni a
  kategóriát (nincs benne), tehát ez így is marad.
- A `payment_method` a modelltől **„Bankkártya"** nagy kezdőbetűvel, míg a mi
  saját szótáraink kisbetűvel írják (`bankkártya`). Az APEH-alakban ez
  szabad szöveg, tehát úgy megy tovább, ahogy a bizonylaton áll — ez a
  `fizetesiMod()` doktrínája, nem eltérés.

### Amit ez nem érvénytelenít

A `nav.ts` **nem felesleges**: az Online Számla felület exportja és a
NAV-sémát kiadó programok továbbra is azon mennek át, és a kód mérve
működik. Csak nem ez volt az az alak, amit *ez* a fájl hozott.

### 1. A README igazzá tétele — két elavult állítás

Mindkettőt **ellenőriztem a kódban**, nem feltételezem:

| Hol | Mi az elavult állítás | A valóság |
|---|---|---|
| `README.md` 3. sor | „A lánc: **claim** → felderítés → …" | A keretellenőrzés a **claim előtt** fut (`index.ts:151-162`) |
| `README.md`, „Amit a következő kör hoz" | „**Keretellenőrzés.** A kvóta ma nem áll meg a kereten… a számlázási körrel jön." | Elkészült (`9239104`): `keretEllenoriz()` + `keretAllapot()`, a claim elé kötve |

A javítás: a lánc leírásába bekerül a keretellenőrzés a claim elé, a „következő
kör" listából pedig kiesik a tétel. A másik két tétel (**beágyazott XML**,
**kötegszétszedés**) mérve **továbbra is igaz** — a `felderites.ts` ma sem
állít elő `beagyazott_xml` jelleget, és a `tobb_irat_gyanu` ma is emberhez visz
szétszedés helyett —, azok maradnak.

> Miért nem elég a tételt törölni: a claim-előtti sorrend **nem stiláris**. A
> claim növeli az `attempts`-et, három próbálkozás után a bizonylat `hiba`
> lesz. Ha a fék a claim után állna, egy elfogyott keret három perc alatt
> tönkretenné az összes várakozó iratot — pedig az nem a bizonylat hibája. Ez
> a kódban le van írva (`index.ts:152-158`), a README-ben eddig nem látszott.

### ⚠️ Egy mérés, ami átrendezi a fontossági sorrendet

Az Online Számla felületének **„Lista export"** ablaka csak `.xlsx (szabvány
táblázat)` és `.csv (pontosvesszővel tagolt)` alakot kínál — XML-t nem. Ez a
képernyőképen látszik, és a dialógus szövege meg is mondja, mi ez: *„a
szűrőfeltételeknek megfelelő … számla adatait tartalmazza. A számlák soronkénti
felosztásban jelennek meg."*

Vagyis ez **lista**, nem bizonylat. Ennek két következménye van, és mindkettőt
ki kell mondani:

1. **A `nav.ts` továbbra is csak sémán mérve áll, élő fájlon nem.** A NAV
   saját XSD-iből épült, a saját fixtúráin és a minifikált csomagon átment —
   de valódi, gyártótól származó NAV-sémájú fájlt **nem láttunk**. Ez nem
   hiba, csak egy őszintén nyitva hagyott kockázat: az OSA-alakot a
   *számlázóprogramok* adják ki a NAV-nak küldött adatszolgáltatáshoz, nem a
   portál exportja. Ha egyszer kerül a kezünkbe ilyen fájl, azt egy körben
   végigmérem.
2. **Az APEH-alak lett a bizonyított igény.** Abból van valódi fájlunk, valódi
   importunk és valódi költségünk. A NAV-alak marad felkészülés, az APEH-alak
   viszont **ma is pénzbe kerül**.

Ezért a sorrend megfordul: **az APEH-értelmező megy előre.**

> Az xlsx/csv lista **nem ennek a körnek a feladata**, és nem is
> értelmezőkérdés: az nem bizonylat, hanem egy adattábla sok bizonylatról. A
> rendszer ma bizonylatokat dolgoz fel, egyesével, kredittel és emberi
> jóváhagyással — egy táblázatos tömegimport ettől külön termékdöntés. Ha
> kell, külön körben szívesen megnézem, mi lenne belőle.
>
> Amit viszont érdemes megnézned, mielőtt lemondunk a NAV-alakról: a **lista**
> exportján kívül a portálon egy-egy **számla saját adatlapján** szokott lenni
> XML-letöltés is. Innen nem tudom ellenőrizni (a `onlineszamla.nav.gov.hu`-t
> a proxy tiltja), de ha ott van, az pont az az OSA-sémájú fájl, amivel a
> `nav.ts`-t élesben lehetne mérni.

### 2. Az APEH-alak értelmezője — ez a kör érdemi munkája

A `shared/uzleti/xml/apeh.ts` a `nav.ts` mintájára, `nev: 'xml/apeh'`. A
formátum-térkép így áll most:

| Alak | Gyökér + névtér | Állapot |
|---|---|---|
| UBL | `Invoice` / `CreditNote`, `oasis:…ubl` | ✅ kész |
| CII / Factur-X | `CrossIndustryInvoice`, UN/CEFACT | ✅ kész |
| NAV Online Számla | `InvoiceData` / `Invoices`, `schemas.nav.gov.hu` | ✅ kész, **telepítésre vár** |
| **APEH 2005** | **`szamla`, `apeh.hu/2005/szamla`** | ⬜ **mérve hiányzik** |

#### A mezőtérkép

A valódi Billingo-fájlból mérve. Minden útvonal a `szamla` gyökértől indul.

| A mi mezőnk | APEH-útvonal |
|---|---|
| `doc_number` | `fejlec/szamlainfo/sorszam` |
| `issue_date` | `fejlec/szamlainfo/kialldatum` |
| `fulfillment_date` | `fejlec/szamlainfo/teljdatum` |
| `due_date` | `fejlec/szamlainfo/fizhatarido` |
| `payment_method` | `fejlec/szamlainfo/fizmod` (szabad szöveg, úgy megy, ahogy jött) |
| `currency` | `fejlec/szamlainfo/penznem` |
| `doc_type` | `fejlec/szamlainfo/szamlatipusa` + `hivatkozottszamla` |
| `supplier_name` | `fejlec/elado/nev` |
| `supplier_tax_number` | `fejlec/elado/adoszam` |
| `customer_name` | `fejlec/vevo/nev` |
| `customer_tax_number` | `fejlec/vevo/adoszam` (üresen `null` — az `utSzoveg` ezt már ma is így kezeli) |
| `net_amount` | `osszesites/vegosszeg/nettoarossz` |
| `vat_amount` | `osszesites/vegosszeg/afaertekossz` |
| `gross_amount` | `osszesites/vegosszeg/bruttoarossz` |
| `fizetendo` | — (nincs külön fizetendő) |
| `afa_bontas` | `osszesites/afarovat*` → `afakulcs` / `nettoar` / `afaertek` |

Az ÁFA-kategória (`S`, `E`, `AE`…) **nincs benne a formátumban**, tehát
`null` marad — nem következtetjük ki. A mért fájl 0%-os, és a szállító
adószámának ÁFA-kódja `1` (alanyi adómentes), de ez az adószámból jön, nem a
bontásból; egy ilyen következtetés pont az a találgatás, amit a strukturált
ág elkerülni hivatott.

#### A csapdák, amiket a valódi fájl mutatott

⚠️ **A tételsorok és az ÁFA-bontás elemnevei SZÓ SZERINT azonosak**
(`nettoar`, `afakulcs`, `afaertek`, `bruttoar` mindkettő alatt). Ez ugyanaz a
hibaosztály, ami a CII-nél és az UBL-nél is megvolt, csak itt élesebb: egy
leszármazott-keresés a **tételsor** értékeit írná a bizonylat
ÁFA-bontásába. Közvetlen gyerek-bejárás kell az `osszesites` alól.

⚠️ **A dátum `2026.07.17` alakú**, és a `fa.ts` `datummaAlakit()`-ja ezt
**`null`-ra fordítaná** — csak a nyolcjegyű és az ISO alakot ismeri. A
`ido.ts` `datumErtelmez()`-e viszont már ma helyesen kezeli a pontos alakot.
A javítás egy harmadik ág a `datummaAlakit()`-ban, hogy minden értelmező
ugyanazt a függvényt használhassa.

⚠️ **A `szamlatipusa` szabad magyar szöveg** („Számla"), nem kódlista. Amit
nem ismerünk fel, arra nem tippelünk — `null`, és az ember választ; ez a
`kodok.ts` kimondott doktrínája.

A `kulcs` elsősorban számként megy (`utSzam`), de ha egy gyártó `27%`-ot ír,
a nyers szöveg megy tovább — a `afaBontas.kulcsErtelmez()` azt is érti. Az ok
nem finomkodás: kulcs nélkül a `tisztitBontas()` **eldobja az egész sort**,
tehát egy százalékjel némán elvinné a bizonylat ÁFA-bontását.

### Kritikus fájlok

| Fájl | Mi történik vele |
|---|---|
| `supabase/functions/kiolvas/README.md` | a lánc leírása + a „következő kör" lista igazzá tétele |
| `shared/uzleti/xml/apeh.ts` | **új** — az APEH 2005 értelmező |
| `shared/uzleti/xml/xmlKiolvaso.ts` | egy import + egy tömbelem |
| `shared/uzleti/xml/fa.ts` | `datummaAlakit()`: harmadik ág a pontos magyar dátumra |
| `shared/uzleti/xml/xml.test.ts` | új `describe('APEH 2005', …)` |
| `minta/apeh-szabalyos.xml` | **új** minta + sor a `minta/OLVASS-EL.md` táblázatában |
| `supabase/functions/kiolvas/kiolvas.bundle.js` | **generált** — `npm run kiolvas:csomag` |

### Verifikáció

A README-javításnál: mindkét állítás a kód ellen olvasva (`index.ts:151-162`,
`felderites.ts`), és a másik két nyitott tétel **meghagyva**, mert mérve
igazak — nem söpörjük be a javítást oda, ahová nem tartozik.

Az értelmezőnél ugyanaz a kör, mint a NAV-nál:

1. beágyazott fixtúra, benne **a névütközés csapdája**: olyan tételsor, aminek
   `nettoar`/`afakulcs` értéke eltér az `afarovat`-étól — így a teszt bukna,
   ha leszármazott-keresésre váltanánk;
2. a **valódi Billingo-fájl** átengedése a repó saját láncán (`xmltFelolvas` →
   `ertelmez` → `tisztit` → `normalizal` → `bukottak`), és az eredmény
   kiírása — ez a mérés, nem a ránézés;
3. a négy meglévő minta változatlan viselkedése, a szándékosan hibás is;
4. `npm test`, `npm run typecheck`, `npm run build`;
5. **a minifikált csomagon is mérés**, mielőtt bármi telepítésre kerül — ez a
   PLACEHOLDER-eset tanulsága, és a NAV-körben már egyszer megfogott volna.

Élesben, a telepítés után: a `ZSG-2026-1.xml` újrafuttatása. A `sha256`
duplikátumszűrő miatt új feltöltésként `duplikatum` lenne, ezért a meglévő
bizonylatot mérem újra közvetlen `dokumentum_id`-s hívással — és a bizonyíték
ugyanaz, mint mindig: `model: 'xml/apeh'`, `cost: null`, `model_version:
null`. Ugyanaz a fájl, ami ma 0,005605 USD-be került, akkor **nullába**.

### A sorrend

1. README-javítás (ez önmagában kész, telepítést nem igényel). ✅ `abf2ae1`
2. `apeh.ts` + `datummaAlakit()` + tesztek + minta — **a repóban**. ✅ `abf2ae1`
3. A harmadik gyártó exportja: **elmarad, és ez válasz, nem hiány** — a
   számlázóban egyetlen XML-letöltés van, az APEH-alak. Lásd lentebb.
4. `npm run kiolvas:csomag`, commit, push. ✅ `abf2ae1`
5. Telepítés (a NAV- és az APEH-értelmező **együtt**, egy körben), és utána
   **azonnal mérés**. ⬅️ **ez van hátra**

---

## ➤ Az utolsó lépés: telepítés és mérés

### Context

A formátumkutatás lezárult, és nem azért, mert elfogyott a türelem, hanem mert
**megjött a válasz**: a számlázóprogram egyetlen XML-letöltést kínál, és az az
APEH 2005 alak — ugyanaz a fájl, ami átment a rendszeren. Az Online Számla
portál pedig bizonylatonkénti XML-t egyáltalán nem ad, csak xlsx/csv **listát**.

Ebből két dolog következik, és mindkettőt ki kell mondani:

- **Az `apeh.ts` a bizonyított nyereség.** Valódi fájl, valódi import, valódi
  költség — és a mérés szerint ugyanazt olvassa ki, mint a modell, nulla
  forintból.
- **A `nav.ts` sémán mérve áll, élő fájlon nem.** Nem hiba és nem felesleges:
  a NAV saját XSD-iből épült, a fixtúráin és a minifikált csomagon átment, és
  más gyártó adhat ilyet. De **nincs valódi mintánk rá**, és ezt a
  dokumentációnak is így kell mondania, nem többnek.

Ezen a ponton a kód kész, tesztelt és feltolva — de a telepített függvény
**még mindig a v5**, ami egyik új értelmezőt sem ismeri. A munka addig nem ér
semmit, amíg ez így van.

### A telepítés

Egy `deploy_edge_function` hívás a `mwveyzyxupgccqdnbpwe` projektre:

| | |
|---|---|
| `name` | `kiolvas` |
| `entrypoint_path` | `supabase/functions/kiolvas/kiolvas.bundle.js` |
| `import_map_path` | `supabase/functions/deno.json` |
| `verify_jwt` | **`true`** — marad bekapcsolva |
| fájlok | a 46 446 bájtos csomag + a deno.json |

A `verify_jwt` nem opcionális: a `token.ts` érvelése **arra támaszkodik**, hogy
a platform a tokent már hitelesítette, mielőtt a kód megnézi a `role`
állítását. Ha kikapcsolnánk, a kötegelt hívás védtelen maradna.

### A mérés — nem a `status: ACTIVE` mezőt hisszük el

Ez a PLACEHOLDER-eset tanulsága: akkor egy hibás telepítés öt percre
megállította a feldolgozást, és a válasz mezője közben `ACTIVE`-ot mutatott.

Három lépcső, **ebben a sorrendben**:

1. **Visszaolvasás** (`get_edge_function`): a verzió `6`, és a feltöltött
   forrásban ott a `Deno.serve`, az `xml/apeh` és az `xml/nav` — vagyis a
   csomag nem csonkult a hívás közben. (A `Deno.serve` a csomag 40 745.
   bájtjánál áll, nem a végén: az esbuild a függvénydeklarációkat utána emeli
   — ezt megnéztem, hogy a „hiányzik a belépési pont" téves riasztás elkerülhető
   legyen.)
2. **Élő egészségpróba, ingyen és kockázat nélkül.** A `szamlafolyo-sor` cron
   percenként hívja a függvényt, és a sor **üres**. Elég megvárni a következő
   percet, és visszaolvasni a `net._http_response` legfrissebb sorát: ha
   `200` és `{"feldolgozva":[]}`, a csomag bootolt — tehát a három `npm:`
   függőség (köztük a legkockázatosabb `unpdf`) feloldódott az Edge Runtime
   alatt. Ha időtúllépés vagy 5xx jön, azonnal látszik, és **nulla bizonylat
   sérül**, mert nincs mit feldolgozni.
   > Ez azért jobb próba, mint egy kézi hívás: nem kell hozzá hozzányúlnom a
   > `service_role` kulcshoz, és pont azt az utat méri, amit a cron használ.
3. **Végponttól végpontig, nálad.** Feltöltöd a `minta/apeh-szabalyos.xml`-t
   (átküldtem). Új `sha256`, tehát a duplikátumszűrő nem fogja meg — a
   `ZSG-2026-1.xml` újrafeltöltése viszont igen, ezért nem azzal mérünk.
   Az adatbázis-oldalt innen nézem, és a bizonyíték ugyanaz, mint mindig:

   ```
   document_extractions.model         = 'xml/apeh'
   document_extractions.cost          = null
   document_extractions.model_version = null
   ```

   A `ZSG-2026-1` meglévő bizonylatát **nem** futtatom újra: `jovahagyva`
   állapotban van, a claim pedig csak `feltoltve`-t vesz fel (`index.ts`
   `claim()`). Az állapotát átírni egy valódi, jóváhagyott számlán nem mérés,
   hanem kozmetika.

### Ha elromlik

A visszaállás egy korábbi csomag újratelepítése:
`git show 9239104:supabase/functions/kiolvas/kiolvas.bundle.js` — ez a ma futó
v5 forrása (41 713 bájt, `Deno.serve` benne). Nem elméleti kijárat:
megnéztem, hogy a fájl a történetben megvan és ép.

### ⛔ A telepítés útja megváltozott — és ennek mért oka van

Az MCP-s telepítés **elakadt, mielőtt kárt okozott volna**, és jól tette.

A `deploy_edge_function` a fájl tartalmát a hívásba ágyazva kéri, vagyis a
46 446 bájtos csomagot **kézzel kell átmásolnom** — JSON-ba escape-elve.
Megszámoltam, mert a becslés itt nem elég:

| | |
|---|---|
| backslash-escape szekvencia (`\xE1`, `ő`) | **854** |
| összes backslash | **962** |
| idézőjel | **1400** |

A csomag szándékosan **ASCII-tiszta** (ezt a `csomagol.mjs` kényszeríti ki), így
minden ékezetes betű escape-ként utazik — és mindegyiket újra kell escape-elni a
hívás JSON-jában. Ez nem nagy fájl másolása, hanem **több ezer escape-karakter
hibátlan átírása**.

Ez pontosan a PLACEHOLDER-eset hibaosztálya, és az első próbálkozásom meg is
mutatta élesben: a hívást hiányosan állítottam össze. A szerver **elutasította**
(`Entrypoint path does not exist`), a függvény érintetlen maradt a v5-ön —
mérve, `list_edge_functions`-szel ellenőrizve.

A veszélyes eset nem ez lett volna, hanem a **csendes** elgépelés: egy rossz
karakter a prompt szövegében átmegy a szintaxison, bootol, a cron 200-at ad, és
utána hónapokig rosszabbul olvasunk ki bizonylatokat. Erre a mérőeszközeim közül
egyik sem szólna.

A CLI-út innen nem járható: `api.supabase.com` → **403** a proxyn (mérve,
`CONNECT tunnel failed`). Tehát a telepítés **a te gépedről** megy, ahol nincs
átmásolás: a csomag és a forrás is ott van a gitben.

### ⚠️ Amit közben találtam: a README egy nem működő parancsot ígér

A `kiolvas/README.md` „CLI-vel, ha van" szakasza ezt adja:

```bash
npx supabase functions deploy kiolvas --project-ref mwveyzyxupgccqdnbpwe
```

**Ez ma nem fut le**, mert a repóban **nincs `supabase/config.toml`** — a CLI
pedig abból ismeri fel a projektgyökeret. Ugyanaz a hibaosztály, amit ebben a
körben már kétszer javítottunk: ígéret, amit a kód nem tart be. A CLI-út eddig
elméleti volt, mert mindig az MCP-s ment.

### A repóváltozás: két fájl

**1. `supabase/config.toml` — új.** Enélkül a CLI el sem indul. Mindkét
függvényt rögzíti, hogy egy telepítés **ne írja át csendben** a másik
beállításait:

```toml
project_id = "szamlafolyo"

[functions.kiolvas]
verify_jwt = true
import_map = "./functions/deno.json"
entrypoint = "./functions/kiolvas/index.ts"

[functions.selejtez]
verify_jwt = true
import_map = "./functions/deno.json"
entrypoint = "./functions/selejtez/index.ts"
```

A `verify_jwt = true` **nem díszítés**: a `token.ts` érvelése arra támaszkodik,
hogy a platform a tokent már hitelesítette, mielőtt a kód megnézi a `role`
állítását. Ha egy telepítés ezt kikapcsolná, a kötegelt hívás védtelen maradna.

> **A belépési pont a forrás (`index.ts`), nem a csomag** — és ez tudatos. A
> `kiolvas.bundle.js` azért létezett, mert az MCP-hívásba nem fér be sok fájl;
> a CLI-nak viszont **nem kell csomag**, maga oldja fel a `../../../shared/…`
> importokat a `deno.json` szerint. Ha a CLI mégis elakadna rajtuk, egyetlen sor
> a kijárat: `entrypoint = "./functions/kiolvas/kiolvas.bundle.js"` — az a
> **ma is futó v5 artefaktja**, tehát bizonyítottan működik.
>
> Ha a forrás-út beválik, egy későbbi körben a `csomagol.mjs` és vele az egész
> ASCII-escape gépezet nyugdíjazható. Ezt most **nem** tesszük: előbb lássuk
> működni.

**2. `kiolvas/README.md` — a CLI-szakasz igazzá tétele.** Kerüljön bele a
`supabase login`, a `config.toml` szerepe, és hogy a CLI a forrásból dolgozik.
Mellesleg a szakasz „huszonnégy forrásfájlt" ír, a csomagoló ma **28**-at jelent
— szám helyett maradjon „a forrásfájlokat", hogy ne avuljon el újra.

### Amit te futtatsz

A saját gépeden, a repó gyökerében:

```bash
git fetch origin claude/awesome-volta-kh12af
git checkout claude/awesome-volta-kh12af
git pull

npx supabase login          # böngészős belépés
npx supabase functions deploy kiolvas --project-ref mwveyzyxupgccqdnbpwe
```

> A hozzáférési tokent **ne másold ide** — ugyanaz a szabály, mint a
> `service_role` kulcsnál. A `login` böngészőben intézi; ha inkább környezeti
> változót használnál, az is a te gépeden marad (`SUPABASE_ACCESS_TOKEN`).

Sikeres telepítésnél a CLI kiírja a függvény nevét és egy dashboard-linket. Ha
a `../../../shared/…` importokon elakadna, írd meg a hibaüzenetet — akkor a
fenti egysoros csomag-kijárat jön, és az biztosan megy.

### A mérés — ezt innen csinálom, telepítés után

Három lépcső, ebben a sorrendben:

1. **`list_edge_functions`**: a verzió **6**, a `verify_jwt` **true**, és az
   entrypoint az, amit vártunk. Ez mondja meg, hogy a telepítés egyáltalán
   megtörtént-e — nem a CLI kimenetét hisszük el.
2. **Élő egészségpróba, ingyen.** A `szamlafolyo-sor` cron **percenként** hívja
   a függvényt, és a sor **üres** (0 függő bizonylat, mérve). Elég visszaolvasni
   a `net._http_response` legfrissebb sorát: ha `200` és `{"feldolgozva":[]}`,
   a csomag bootolt — tehát mindhárom `npm:` függőség (köztük a legkockázatosabb
   `unpdf`) feloldódott az Edge Runtime alatt. Ha 5xx vagy időtúllépés jön,
   **nulla bizonylat sérül**, mert nincs mit feldolgozni.
3. **Végponttól végpontig, nálad.** Feltöltöd a Beérkezőbe:
   - **`minta/apeh-szabalyos.xml`** → `model: 'xml/apeh'`, `cost: null`;
   - **`minta/nav-szabalyos.xml`** → `model: 'xml/nav'`, `cost: null`. **Ez
     lesz a NAV-értelmező első éles futása** — élő gyártói fájlunk ugyan nincs,
     de a deployolt kódút így legalább egyszer valóban lefut.

   Mindkettő friss `sha256`, tehát a duplikátumszűrő nem fogja meg őket. A
   `ZSG-2026-1`-et **nem** futtatom újra: `jovahagyva` állapotban van, a claim
   pedig csak `feltoltve`-t vesz fel — egy valódi, jóváhagyott számla állapotát
   átírni nem mérés, hanem kozmetika.

### Ha elromlik

`git show 9239104:supabase/functions/kiolvas/kiolvas.bundle.js` a ma futó v5
forrása (41 713 bájt, `Deno.serve` benne, ellenőrizve). Visszaállás:
`entrypoint` átállítása erre a fájlra a `config.toml`-ban, és újra `deploy`.

### Egy mondat a dokumentációba

A `minta/OLVASS-EL.md` ma úgy mutatja be a két magyar alakot, mintha egyformán
mérve volnának. Nem azok. Egy rövid, pontos kiegészítés kell: a **NAV-alakra
nincs valódi mintánk**, mert sem a portál, sem a mért számlázóprogram nem ad
ilyet — az értelmező a NAV saját sémájából és példafájljaiból épült. Ez nem
lekicsinylés, hanem a különbség kimondása mérés és felkészülés között; pont az
a fajta állítás, amit ez a projekt nem hagy elhallgatva.

Kódváltozás ehhez nincs.

---

## ✅ A telepítés megtörtént és mérve van (v6, CLI-ről)

A `kiolvas` a **6-os verzión** fut, `verify_jwt: true`, az entrypoint a
**forrás** (`supabase/functions/kiolvas/index.ts`), nem a csomag — vagyis a
`config.toml`-os CLI-út bevált. Amit mértem, nem a CLI kimenetéből:

| Próba | Eredmény |
|---|---|
| `list_edge_functions` | v6, `verify_jwt: true`, forrás-entrypoint, `selejtez` érintetlenül v1 |
| Telepítés ideje | 2026-09-14 18:02:58.266 UTC |
| Cron 18:03:00 és 18:04:00 | **200** `{"feldolgozva":[]}` — a csomag bootolt, az `unpdf` feloldódott |
| A telepített 29 fájl a repóhoz mérve | **29 egyezik bájtra, 0 eltérés** — köztük az `apeh.ts` és a `nav.ts` |

Ami ebből következik, és most **nyitva marad, mert nem ennek a körnek a
feladata**: a `kiolvas.bundle.js` (46 446 bájt) és a `csomagol.mjs` a
production felől nézve **halott súly** — a telepített csomagban 0 hivatkozás
van rájuk. Vagy nyugdíjazzuk, vagy kapjon elavulás-őrt; a döntés a tiéd, külön
körben.

---

## ➤ Ez a kör: minden bizonylat emberhez kerül — és a szövegek is ezt mondják

### Context

Végigvitted a folyamatot, és azt láttad, hogy **minden beolvasott számlát jóvá
kell hagyni** — és úgy döntöttél, hogy **ez a helyes működés**. A nyitólap
viszont ma az ellenkezőjét hirdeti („Csak azt kapod kézhez, amivel tényleg
dolgod van"), és ugyanezt mondja az ÁSZF 3. pontja, az Adatkezelési 6. pontja
és az `index.html` leírása is.

Két külön dolog van ebben, és mérve mindkettő:

1. **A szöveg egy másik terméket hirdet, mint amit használsz.** A gépi
   jóváhagyást a lap **fő ígéretté** tettük egy korábbi körben. Vissza az
   eredeti hero-szövegre — a csatolt képernyőkép szerint.
2. **A kód ma még az ígéret felé dől.** A `companies.auto_jovahagyas_be`
   alapértéke `true` (`20260912000100_alap.sql:69`); hogy eddig mégis minden
   bizonylat hozzád került, azt **kizárólag a 20 bizonylatos bemelegítés**
   intézte (`kapuk.ts:90`). A 21. bizonylattól a rendszer magától kezdett volna
   jóváhagyni. Ha csak a szöveget írnánk át, épp azt a hibaosztályt állítanánk
   elő fordítva, amit ebben a projektben eddig mindig javítottunk: **ígéret,
   amit a kód nem tart be.**

**A döntésed (egyeztetve):** a gépi jóváhagyás gépezete **marad**, de
**alapból kikapcsolva**, és **egyetlen nyilvános szöveg sem ígéri**. Aki
kifejezetten kéri, a Beállításokban bekapcsolhatja — a bemelegítéssel, a
mintavétellel és a jelvénnyel együtt, ahogy ma is működik. Semmit nem törlünk:
a `kapuk.ts`, a mintavétel és a tévedési arány mérőgépezete a helyén marad.

### 1. A kód: az alapérték átbillentése

**Új migráció** — `supabase/migrations/20260915000100_auto_jovahagyas_alapbol_ki.sql`:

```sql
alter table public.companies alter column auto_jovahagyas_be set default false;
update public.companies set auto_jovahagyas_be = false;
```

Az `update` nem felülírja senki döntését: **soha senki nem kapcsolta be** — az
érték minden soron a migráció alapértéke, nem választás. Élő előfizető nincs,
a táblában a saját próbacéged áll. A `comment on column` is átíródik, hogy a
séma maga mondja meg, mi az alapállás és miért.

**`config/szamlafolyo.ts`** — az `automatikusJovahagyas.alapbolBe: true`
**kikerül**. Nem átállítjuk: ezt a mezőt `grep`-pel mérve **senki nem olvassa**
(egyetlen találat a definíciója), az igazság a `default` az SQL-ben. Egy
konfigérték, ami mögött nincs viselkedés, pontosan az a hamis kapcsoló, ami a
`fejlesztesAlatt` volt. A helyére komment kerül, ami a migrációra mutat. A
`bemelegitesDarab` és a `mintavetelMinden` **marad** — azok valóban működnek.

**`supabase/functions/kiolvas/index.ts:379`** — `?? true` → `?? false`. Ha a
cég-join valamiért üresen jön vissza, a rendszer **ne** automatikus
jóváhagyás felé dőljön. Ez a sor ma nem sül el (a join megvan), tehát a
telepítés nem sürgős — de a dőlés iránya számít, és a következő deployjal
kimegy.

**`shared/uzleti/kapuk.ts`** — a fejléc-docblock első bekezdése ma azt mondja:
„Az új verzióban csak az kerüljön elé, amivel baj van." Ez lesz: alapból
minden bizonylat emberhez kerül; a gépi jóváhagyás **kérésre bekapcsolható**
kiegészítés. A függvények egy sorral sem változnak.

### 2. A nyitólap — vissza az eredeti heróra

`src/oldalak/Nyitolap.tsx`, a csatolt képernyőkép szerint:

| Elem | Új szöveg |
|---|---|
| Jelvény | **A legtisztább számlafeldolgozó munkafolyamat** |
| H1 | **Dokumentumból ellenőrzött, könyvelésre kész adat percek alatt.** |
| Alcím | **Töltsd fel a számlát vagy a nyugtát. A SzámlaFolyó kiolvassa.** Te csak azt ellenőrzöd, amiben nem biztos. Export, és kész. Nem funkciókat halmozunk, hanem a legkisebb, leggyorsabb munkafolyamatot adjuk. |
| Gombok | változatlanok — „Kipróbálom ingyen" / „Nézzük, hogyan működik" |

**Két ponton eltérek a képernyőképtől, mindkettő mérésből:**

- ⚠️ **„Küldd tovább a számlát vagy nyugtát" → „Töltsd fel…"**. Az eredeti
  szöveg az e-mailes beküldésre utalt, ami a régi termékben működött — **ebben
  még nincs meg** (a terv szerint webhookkal jön, később). A mondat többi része
  szó szerint marad.
- ⚠️ **A „könyvelésre kész adat" színe.** A képen a szó két színű
  (terrakotta + mustár). A mustár **mérve olvashatatlan** ezen a háttéren:
  `#dfb671` a `#f6ede4` vásznon ~1,6:1 kontraszt, a WCAG nagy betűre is 3:1-et
  kér. Ezért a **meglévő terrakotta színátmenet** viszi mindkét szót
  (`from-blue-700 #9e5537 → to-blue-500 #c66c47`) — ránézésre ugyanaz a
  kétszínű hatás, csak olvasható. A mustár marad ott, ahol dísz: a foltokban és
  az árszakasz „Ajánlott" jelvényén.

**Ami a heróból kikerül:** a gépi jóváhagyás **fékeit** felsoroló kártya
(`FekSor`-ok). Nincs mit fékezni, ha nincs ígéret — a helyén a képernyőkép
szerinti három próbaidő-adat (`ProbaAdatok`) áll, ami már ma is ott van.

**Ami a lapon máshol változik:**

| Hol | Ma | Ezután |
|---|---|---|
| `Folyamat`, 3. lépés | „Amit nem jelöltünk meg, azzal nincs dolgod." | „**Minden bizonylatot te hagysz jóvá** — de csak azzal van dolgod, amit megjelöltünk: a bizonytalan és az ellentmondásos mezőkkel." |
| `Elonyok`, 4. kártya | „A gépi jóváhagyásnak fékei vannak" | „**Az utolsó szó a tiéd**" — semmi nem kerül exportba emberi jóváhagyás nélkül; a gép előkészíti a döntést, nem hozza meg |
| `BeerkezoMinta`, 3. sor | „Külföldi, fordított adózás • **automatikusan**" | „Külföldi, fordított adózás • minden mező átment az ellenőrzéseken" — a `jovahagyva` jelvény marad, mert azt ember adta |
| `Lablec` szlogen | „Csak azt kapod kézhez, amivel tényleg dolgod van." | „Dokumentumból könyvelésre kész adat, percek alatt." |
| A fájl fejléc-docblockja | a „fő ígéret" indoklása | a mostani döntés és a két szándékos eltérés a képernyőképtől |

**`index.html`** — a `<meta name="description">` a hero új mondatát viszi
tovább. Ugyanaz a szabály, amiért a mai leírás a mai heróval egyezik: **egy
ígéret, két helyen, ne térjen el.**

**Amihez nem nyúlunk:** az `EllenorzesMinta` kártya. A képen ott
`12345678-2-42` áll — annak **hibás az ellenőrző számjegye**, a lapon ma
`12345676-2-42` van, ami a repó saját `adoszam.ts`-ével érvényes. Nem cseréljük
vissza egy olyan adószámra, amit a saját validátorunk elbuktatna. A kártya
szerkezete, a `mezo-gyanus` mező és a valódi validátorüzenet marad.

### 3. A jogi szövegek és a Beállítások

| Fájl | Mi változik |
|---|---|
| `src/oldalak/jogi/Aszf.tsx` **3. pont** | Ma: „A rendszer nem minden bizonylatot tesz ember elé…". Ezután: **minden bizonylat jóváhagyásra vár**; a gépi jóváhagyás létező, de **alapból kikapcsolt**, kérésre bekapcsolható lehetőség. A többi garancia (jelvény, indok, exportig visszahívható, „soha nem írjuk ki, hogy ellenőrizve") szó szerint marad — bekapcsolt állapotra vonatkozik |
| `Aszf.tsx` **4. pont** | A felelősségi bekezdés **marad**; a „ha a bizonylat a 3. pont szerinti gépi jóváhagyással ment át" fordulat az opt-in alakra áll |
| `Aszf.tsx` docblock | az 1. pont („a gépi jóváhagyás") indoklása erre a körre frissül — a fájl fejléce ma azt magyarázza, miért tértünk el a régi szövegtől; most visszatérünk hozzá, és ezt is indokolni kell |
| `src/oldalak/jogi/Adatkezeles.tsx` **6. pont** | Cím: „Gépi jóváhagyás — **alapból kikapcsolva**". A lista marad, de az első pont mondja ki: alapértelmezés szerint minden bizonylat emberhez kerül, automatikus döntés csak kifejezett bekapcsolás után születik. (GDPR-oldalról ez **erősebb** állítás, mint a mai) |
| `src/kepernyok/Beallitasok.tsx` | A kártya `leiras`-a: ma „Ha egy bizonylat minden ellenőrzésen átmegy, ne várjon rád fölöslegesen." → mondja ki, hogy **alapból ki van kapcsolva**, és mit vállalsz a bekapcsolással. A két opció címkéje, a `Valasztas` és a három magyarázó sor **változatlan** — azok ma is pontosak |

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `supabase/migrations/20260915000100_auto_jovahagyas_alapbol_ki.sql` | **új** — alapérték `false`, a meglévő sorok is |
| `src/oldalak/Nyitolap.tsx` | a hero visszaírása, a fékek kártya kivétele, három szakaszszöveg, lábléc |
| `index.html` | `<meta name="description">` |
| `src/oldalak/jogi/Aszf.tsx` | 3. és 4. pont + docblock |
| `src/oldalak/jogi/Adatkezeles.tsx` | 6. pont |
| `src/kepernyok/Beallitasok.tsx` | a kártya leírása |
| `config/szamlafolyo.ts` | az `alapbolBe` halott kapcsoló kivétele + komment |
| `shared/uzleti/kapuk.ts` | a fejléc-docblock |
| `supabase/functions/kiolvas/index.ts` | `?? true` → `?? false` |

Új CSS, új komponens és új függőség **nincs**. A `FekSor` helyi segéd a
kivett kártyával együtt megy.

### Verifikáció

**Helyben:** `npm test` (a `kapuk.test.ts` és a `lanc.test.ts` explicit
`autoJovahagyasBe: true`-val dolgozik, tehát a kapulogika tesztjei
változatlanul mérnek — ez szándékos: a gépezet nem tűnik el, csak alapból
áll), `npm run typecheck`, `npm run build`.

**Böngészőben** (Playwright, mockolt hálózattal, **390 px és 1280 px**):

- a heróban ott az új H1 és az alcím, és **nincs** a lapon a „magától
  jóváhagyásra kerül" fordulat;
- `grep` a lefordított csomagra: az „automatikusan" és a „gépi jóváhagyás"
  kifejezés a **nyitólap** szakaszaiból eltűnt (a Beállítások és a jogi oldalak
  szövegében szándékosan **megmarad**);
- a három horgony és a zárt/nyitott regisztráció két állása változatlanul jó —
  a hero gombjaihoz nem nyúlunk, de a szakasz átírása után újra mérendő;
- vízszintes görgetés sehol, JS-hiba a konzolon nincs.

**Adatbázisban, a migráció után** (Supabase MCP-vel, innen):

```sql
select name, auto_jovahagyas_be from public.companies;
-- minden sor: false
select column_default from information_schema.columns
 where table_name = 'companies' and column_name = 'auto_jovahagyas_be';
-- 'false'
```

**Élesben, nálad:** tölts fel még egy bizonylatot. Az `auto_jovahagyva`
`false`, az `auto_indok` pedig innentől **„Az automatikus jóváhagyás ki van
kapcsolva."** — nem a bemelegítés mondata. Ez a különbség a bizonyíték arra,
hogy most már a kapcsoló tartja vissza, nem a 20 darabos türelmi idő.

> A `kiolvas` újratelepítése (`?? false`) **nem feltétele** ennek a körnek: a
> döntést az adatbázis értéke hozza, és az a migráció után mindenhol `false`.
> A következő CLI-deployjal megy ki, együtt bármi mással.

---

## ➤ Most: a szet-v2 mérése a valódi kötegen

### Context

A kötegszétszedés (`c7b7e8e`) élesben megbukott az első valódi fájlon, és a
mérés megmutatta, hogy **a prompt hibájából**: a v1 szó szerint azt írta, hogy
a szállítólevél ahhoz a bizonylathoz tartozik, amelyik mellett áll — miközben
az `enumok.ts`-ben a `szallitolevel` önálló bizonylattípus. A modell a
promptnak engedelmeskedett, és egyetlen 1–4-es tartományt adott vissza.

A javítás megvan és fel van tolva (`447e22e`): **szet-v2** prompt, plusz a
`koteg.ts`-ben a besorolatlan oldal kitöltése (a fájlban **üres elválasztó
oldal** van, amitől a szigorú lefedés-szabály másodszor is eldobta volna a
szétszedést). Telepítve: **`kiolvas` v8**, mérve.

Ami hátravan: **megmérni a javítást ugyanazon a valódi fájlon.** A felhasználó
ehhez hozzájárult („mehet").

### Miért nem elég újra feltölteni

A fájl `sha256`-ja változatlan, tehát egy újbóli feltöltés `duplikatum` sort
csinálna, nem feldolgozást. A meglévő bizonylat pedig `jovahagyva` állapotban
van, a `claim()` viszont csak `feltoltve`-t vesz fel — egy valódi, jóváhagyott
számla állapotát átírni nem mérés, hanem kozmetika.

Ezért **új feldolgozási sor** készül ugyanarra a fájlra, a mérés végén törölve.

### Az adatok, amikre a lépések épülnek (mérve, most)

| | |
|---|---|
| fájl | `92efe799-a3e5-4d9d-b7e5-74d3577784a6`, 4 oldal, szkennelt (`szoveg_hossz: 0`), a tárolóban **megvan** |
| cég | `7ee1579c-d684-4851-9dbd-2c768d0adc01` — Nyeste Krisztián e.v. |
| meglévő bizonylat | `96b6d057-…`, `jovahagyva`, `oldal_tol: null` |
| keret | 10 / 50 felhasznált, próbaidő 2026-09-28-ig |
| telepített függvény | `kiolvas` **v8**, `verify_jwt: true`, forrás-entrypoint |

A meglévő bizonylat `oldal_tol`-ja `null`, tehát a szétszedő **testvér-őre** nem
fog beleakadni a próbasorba.

### A lépések

1. **Egy `documents` sor beszúrása** ugyanarra a fájlra:
   `company_id`, `file_id`, `status = 'feltoltve'`, oldaltartomány nélkül.
2. **Megvárni a cront** (`szamlafolyo-sor`, percenként). Nem hívom kézzel a
   függvényt: ehhez a `service_role` kulcs kellene, és ez a környezet a
   `*.supabase.co`-t sem éri el — a cron viszont pont azt az utat járja, amit
   élesben is.
3. **Visszaolvasni az eredményt**, és ez a bizonyíték:
   - hány `documents` sor lett a fájlra, és milyen `oldal_tol`–`oldal_ig`
     tartományokkal;
   - a szétszedő kiolvasás-sor: `prompt_version = 'szet-v2-2026-09-15'`,
     `credits = 0`, a `raw_response` a modell nyers határai, a `fields` a
     végleges tartományok és a `javitas` (hol toldottunk hozzá besorolatlan
     oldalt);
   - bizonylatonként egy-egy kiolvasás-sor, saját `credits`-szel;
   - a szállítólevélre `doc_type = 'szallitolevel'` — ez zárja a kört a
     prompthibával.
4. **Takarítás**: a próbasorok (a beszúrt sor és a belőle született testvérek)
   törlése. A jóváhagyott eredeti bizonylathoz **nem nyúlok**.

### Amit ez elhasznál, kimondva

Bizonylatonként egy kredit, tehát a szétszedés sikerétől függően **2-3 kredit**
a próbakeretből (10/50 → 12-13/50), és nagyságrendileg 5-10 Ft modellköltség.
A `document_extractions` sorok **szándékosan túlélik** a dokumentum törlését —
a keret azokból számol —, tehát a takarítás a keretet nem adja vissza. Ez nem
mellékhatás, hanem a terv 1. szabálya: amit a felhasználó el tud tüntetni,
abból nem lehet keretet számolni.

### Ha a szétszedés megint nemet mond

A `raw_response` megőrzi a modell nyers válaszát, tehát **látható lesz, mit
mondott**, nem csak az, hogy nem sikerült. Három eset, három irány:

- egyetlen 1–4-es tartomány → a prompt még mindig nem elég erős; a következő
  kör a szkennelt ágon oldalankénti képmegjelölés vagy erősebb modell;
- hézagos, de többelemű válasz → a kitöltés dolgozik, a szétszedés **sikerül**;
- átfedés → elutasítás, és az marad a helyes válasz.

⚠️ Amit **nem** teszek: nem írom át a `koteg.ts` szabályait azért, hogy egy
konkrét válasz átmenjen. Az átfedés elutasítása és a darabszám-korlát marad.

---

## ✅ A szet-v2 mérése megtörtént — a szétszedés működik

A valódi 4 oldalas kötegen, `kiolvas` v8-on, élesben:

| Oldalak | Típus | Bizonylatszám | Bruttó |
|---|---|---|---|
| 1–2 | `szamla` | 044431/25-ES | 9 684 Ft |
| 3–4 | **`szallitolevel`** | **057609/25-KE** | — |

A szállítólevélnek **saját bizonylatszáma van** — pontosan az az érv, amire a
szet-v2 épült, és amit a v1 felülírt a „melléklet ahhoz a bizonylathoz tartozik"
mondattal. A nyom: `szet-v2-2026-09-15`, `credits: 0`, `cost: 0,004137`,
modellhatárok `[{1,2},{3,4}]`, `javitas: null`; a két bizonylat 1-1 kredit,
0,006888 és 0,005233 USD.

Két dolog kimondva: **a hézagkitöltőnek nem kellett dolgoznia** (a modell magától
a számlához sorolta az üres oldalt), tehát az a kódút **élesben nem mért**, csak
egységtesztelt. És a szétszedés összköltsége (0,0043 USD) **kevesebb, mint egy
kiolvasásé** — a szkennelt ágon is megérte.

Takarítás kész; a keret 10 → 12/50. A felhasználó eredeti, jóváhagyott
bizonylata érintetlen: az **még mindig az egész fájlt jelenti**. Hogy azt a
helyes felosztással újrajátsszuk-e, a felhasználó döntése — valódi, jóváhagyott
bizonylat törléséhez nem nyúlok kérés nélkül.

---

## ➤ Ez a kör: e-mailes beküldés (Resend) + a levélküldés beállítása

### Context

Két dolog, ami egy körbe tartozik, mert ugyanaz a szolgáltató adja.

**1. A beküldés.** A `files.source` oszlop **az első migráció óta** ismeri az
`'email'` értéket (`20260912000100_alap.sql:249`) — az adatmodell a kezdetektől
számolt ezzel, csak a bejövő út hiányzott. A nyitólap hero-szövegét emiatt
kellett megváltoztatni: az eredeti „**Küldd tovább** a számlát vagy nyugtát"
helyett ma „Töltsd fel…" áll, és a `Nyitolap.tsx:59` docblockja meg is mondja,
hogy miért — *„ebben még nincs meg (webhookkal jön, később)"*. Ez a kör az, ami
azt a mondatot újra igazzá teszi.

**2. A levélküldés.** Ma a jelszó-emlékeztető (`auth/Jelszo.tsx`) és minden
hitelesítési levél a **Supabase beépített küldőjén** megy, ami óránként néhány
levelet enged, és kifejezetten fejlesztésre szánt. A Beállítások „Tagok"
kártyája pedig egy figyelmeztetést tart a helyén: *„A meghívás még nem elérhető.
Ahhoz levélküldés kell…"* Ez a kör a küldést állítja be; **a meghívó maga külön
kör marad** (a felhasználó döntése).

### A három eldöntött kérdés

| Kérdés | Döntés |
|---|---|
| Hol fogadjuk a levelet | **`bekuldes.szamlafolyo.hu`** — valódi DNS, aldomainen, hogy a gyökér MX-e (az `info@szamlafolyo.hu`) érintetlen maradjon |
| Ki küldhet | **Alapból csak a cég tagjai**, kapcsolóval nyitható bárkire |
| Meghívó | **Nem ebben a körben** |

### Amit mérve tudunk (nem feltételezés)

- A Resend-fiók **üres volt**: 0 domain, 0 webhook. Most **két** domain áll
  benne, mindkettő **`eu-west-1`** régióban — ez nem kényelmi választás, az
  Adatkezelési tájékoztató 5. pontja ígéri az EU-s tárolást.
- **A Resend fogadása tartomány-szintű catch-all**: a címzett szerinti
  szétosztás az *alkalmazás* dolga. Ez pontosan az a forma, amire a régi
  `CimzettToken` épült — nem kell hozzá címenkénti kiépítés.
- **A webhook csak metaadatot hoz.** Az `email.received` payloadban nincs
  levéltörzs és nincs mellékletbájt: azok külön API-hívásból jönnek
  (`GET /emails/receiving/{id}`, `…/attachments`, majd az aláírt `download_url`).
  Ez nem részletkérdés — ettől lesz **kétlépcsős** a melléklet-szűrés.
- **Az aláírás Svix/Standard Webhooks alak**: HMAC-SHA256 base64-ben az
  `<id>.<timestamp>.<nyers test>` fölött; a `whsec_` előtag után a maradék
  base64, amit **dekódolni kell** kulcsnak. Ez a lépés az, ami leggyakrabban
  kimarad, és akkor az aláírás sosem egyezik.
- ⚠️ **A DNS-t innen nem tudom megmérni**: a proxy a `dig`-et és a
  DNS-over-HTTPS-t is tiltja (`CONNECT tunnel failed, 403`). A rekordok
  megérkezését a Resend `verify-domain` hívása fogja megmondani, nem én.

### A DNS-rekordok — ezeket a felhasználó írja be

A `szamlafolyo.hu` zónájában:

| Cél | Típus | Név | Érték | Pri |
|---|---|---|---|---|
| küldés | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDG5Vjh0g5xfaNsU2LyRcQwrpyVCSmdsTazZ8cTJKHXXRx4usdWlxibH+Winohm+mTqr+47Np8knu3mbLLQIkvbDtN6RomaGGkgss07MnKMqMzK05nIVvy1YD1fVkpmLWa1jikSbQeFGP6/adIyek5Msg4kVlNAMbImEZMVVvwvUQIDAQAB` | — |
| küldés | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| küldés | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| küldés | CNAME | `rsend` | `send.forge.rmta.net` | — |
| fogadás | TXT | `resend._domainkey.bekuldes` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCdpJsOTVFgtvh7norK0S/fH4G4OAfk/r9MYzgG13ei2cu0hlQuHc+6/Q35kyOf0Qu0a0dIPNDPAaGqH/ebkEW+qzOrgEl6mOF4mGDuY9DUCW5cq9qWWVZOi5pul3T9jCXRbJQecDC3p4gGwX3LyctlICSiuuMw5RHlVLipBOGx7wIDAQAB` | — |
| fogadás | MX | `bekuldes` | `inbound-smtp.eu-west-1.amazonaws.com` | 10 |

> ⚠️ **Az SPF TXT a `send` aldomainre megy, nem a gyökérre.** Ha a
> `szamlafolyo.hu`-n már van SPF rekord, egy második SPF **az összes levelet
> elrontaná** (`permerror`). Így nincs ütközés, és a gyökér MX-éhez sem nyúlunk.

### Az architektúra: négy kérdés egy levélre

A webhook-függvény vékony; a döntések tiszta modulokban ülnek, mert **ezek azok,
amik csendben romlanak el**. Egy rossz címzett-értelmezés idegen cég keretéből
költene; egy rossz melléklet-válogatás minden aláírásból bizonylatot csinálna —
és mindkettő úgy hibázik, hogy közben 200-as választ adunk.

1. **Kinek szól?** `cimzettToken()` — a `b-<token>@bekuldes.szamlafolyo.hu`
   alakból a token. A tartományt is ellenőrzi: enélkül egy `Cc:` sorban érkező
   idegen cím a saját cégünkhöz kerülne.
2. **Elfogadjuk a feladót?** `feladotEllenoriz()`.
3. **Melyik mellékletet töltsük le?** `mellekletValogat()` — lásd lentebb.
4. **Mit írunk ki róla?** Az `inbound_emails.reason` emberi mondata.

#### A cím mint bemutatóra szóló kulcs

Aki a címre ír, az a cég keretéből költ. A cím tehát **titok**, nem azonosító:
16 karakter félreolvashatatlan ábécéből (`0/o`, `1/l/i`, `u` kihagyva — ezt a
címet emberek olvassák fel telefonban), `gen_random_bytes`-ból, ~79 bit.

⚠️ **A feladó-szűrés ezt nem pótolja.** A `From` hamisítható, tehát biztonsági
határnak alkalmatlan. Az a *véletlen* ellen véd: hírlevél, automata válasz,
aláírásból kiszivárgott cím. Ezt ki kell mondani, mert egy „feladó-ellenőrzés"
nevű dolog könnyen látszik többnek, mint ami. Ha a cím kiszivárog, a válasz a
**token cseréje**, nem ez a lista.

#### A melléklet-szűrés két lépcsője

A webhook csak metaadatot hoz, a bájtokért külön kell menni — ebből
következik a forma:

- **1. lépcső (fejlécekből):** `mellekletValogat()`. Ez **olcsóbb, nem
  szigorúbb**: azt dönti el, mit érdemes egyáltalán áthozni.
  - **Ha a levélben van PDF vagy XML, a képekhez hozzá sem nyúlunk.** Ez fedi
    le a gyakori esetet — szállítói számla PDF-ben, céglogó az aláírásban —
    minden méretküszöb nélkül.
  - Kép csak akkor jön szóba, ha nincs bizonylat-alakú melléklet (a
    „lefotóztam a nyugtát" eset); ott a `kepMinBajt` (50 kB) dönt, és ez
    **bevallottan heurisztika**. Ha a szolgáltató jelzi az `inline`
    elhelyezést, ez a szám kidobható — és ki is kell dobni.
  - `maxMelleklet: 20` futótűz-fék, a `koteg.maxDarab` mintájára.
- **2. lépcső (bájtokból):** a meglévő `fajltipus.ts` `ellenoriz()` — **ugyanaz
  a függvény, ami a böngészős feltöltésnél is dönt**. A típus a tartalomból
  derül ki, nem a küldő állításából; itt ez különösen igaz, mert a fájlt nem a
  feltöltője írta.

#### Idempotencia

A webhookot a szolgáltató **újraküldi**, ha a válasz elakad — ez a normál
működés része, nem kivétel. Az `inbound_emails.provider_email_id` egyedi indexe
az, amitől egy kétszer kézbesített levél nem lesz két bizonylat. A fájl
`sha256`-szűrője ezt **nem** váltaná ki: az duplikátum-sort *csinálna*, vagyis
zajt a Beérkezőben.

#### Amit szándékosan nem tárolunk, és amit szándékosan nem küldünk

- **Ismeretlen címzettnek szóló levél**: semmi. Annak nincs cége, tehát nincs,
  akinek a sora lenne — egy bérlő nélküli sort az RLS nem tud megvédeni. Megy a
  függvény naplójába, és **200-as választ kap**, hogy a szolgáltató ne
  próbálkozzon újra.
- **A levél törzse**: nem tároljuk. A feladó, a tárgy és az eredmény elég.
- **Automatikus válasz a feladónak**: nincs. Egy visszapattanó levél minden
  hamisított feladójú levélszemétre a mi nevünkben menne ki (backscatter). A
  felhasználó a felületen látja az elutasított sorokat — ez a v1 ára, kimondva.

### A biztonsági alak: az első `verify_jwt = false` ebben a projektben

A `kiolvas` és a `selejtez` is `verify_jwt: true` mögött ül, és a `token.ts`
érvelése **arra támaszkodik**, hogy a platform a tokent már hitelesítette.
Webhook-végponton ez nem járható: a levélszolgáltató nem tud Supabase-JWT-t
küldeni. Ezért ott a hitelesítés **teljes egészében** az aláírás-ellenőrzés —
ami a `token.ts`-ben második réteg volt, itt az első és az utolsó.

Ennek megfelelően az `alairas.ts` szigorú: a **nyers** kérés-testtel dolgozik
(egy `JSON.parse` → `stringify` kör megváltoztatja a bájtokat), **időbélyeget is
néz** (különben egy elfogott kérés örökre újrajátszható), és **állandó idejű**
összehasonlítást használ (a korai kilépés karakterenként szivárogtatja a helyes
aláírást).

### Kritikus fájlok

**Már lemezen** (a plan mód előtt készült, nincs commitolva):

| Fájl | Mi |
|---|---|
| `supabase/migrations/20260915000200_email_bekuldes.sql` | `bekuldes_token` + a két kapcsoló, a `bekuldes_token_cserel()` RPC, az `inbound_emails` tábla RLS-sel, az oszlopjogok bővítése |
| `shared/uzleti/alairas.ts` | Svix aláírás-ellenőrzés, tiszta, nulla függőség |
| `shared/uzleti/bekuldes.ts` | a négy döntés: címzett, feladó, melléklet-válogatás, cím-előállítás |
| `config/szamlafolyo.ts` | `bekuldes` blokk (domain, előtag, `maxMelleklet`, `kepMinBajt` a heurisztika kimondásával) |

**Hátravan:**

| Fájl | Mi |
|---|---|
| `shared/uzleti/alairas.test.ts` | **új** — a Svix **nyilvános tesztvektorával**, hogy a teszt ne tautológia legyen |
| `shared/uzleti/bekuldes.test.ts` | **új** — címzett-alakok, tartomány-csere, feladó mindkét kapcsolóállásban, a melléklet-szabály minden ága |
| `supabase/functions/email-bekuldes/index.ts` | **új** — a webhook. `service_role`, explicit `company_id` (a `tolti_company_id()` trigger `auth.uid()`-ra épül, ami itt üres) |
| `supabase/config.toml` | új `[functions.email-bekuldes]` blokk, `verify_jwt = false`, **a miértjével** |
| `src/kepernyok/Beallitasok.tsx` | új „E-mailes beküldés" kártya: kapcsoló, a cím másolható alakban, a „bárkitől" kapcsoló, token-csere gomb, és az utolsó elutasított levelek |
| `src/lib/beallitasok.ts` | a két kapcsoló mentése + `bekuldes.modosult` naplósor (a meglévő minta szerint) |
| `src/kepernyok/Beerkezo.tsx` | `source` jelzés a soron — látszódjon, mi jött levélben |
| `src/oldalak/Nyitolap.tsx` | a hero mondata visszaáll: „**Küldd tovább** a számlát vagy a nyugtát" — a `:59` docblock megjegyzése kivezetve |
| `index.html` | a `<meta name="description">` együtt mozog a heróval |
| `src/oldalak/jogi/Adatkezeles.tsx` | **kötelező**: a Resend mint új adatfeldolgozó az 5. pont táblázatába (EU-régió), és a beküldött levelek kezelése |
| `src/oldalak/jogi/Aszf.tsx` | a beküldési csatorna megnevezése |

**Nem a repóban** (a felhasználó lépései): a DNS-rekordok; a Supabase Auth
**Custom SMTP** beállítása (`smtp.resend.com`, 465, felhasználó `resend`, jelszó
a Resend API-kulcs, feladó `noreply@szamlafolyo.hu`); és két Edge
Function-titok (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`) — **a kulcsokat nem
másoljuk ide**, ugyanaz a szabály, mint a `service_role`-nál.

### Verifikáció

**Egységteszt.** Az aláírásnál a Svix **nyilvános tesztvektorát** használom, nem
a saját implementációmmal generált aláírást — különben a teszt csak azt mérné,
hogy a kód egyezik önmagával. A titok-fixtúra **darabokból áll össze**, mert a
GitHub titokpásztázója az alakot nézi, nem a jelentést; push-védelmet feloldani
nem opció (ez a szabály egyszer már megfogott minket). A `bekuldes.ts`-nél: a
`"Név" <cím>` alak, a nagybetűs cím, az **idegen tartomány** (ez a fontos
negatív eset), a plusz-címzés, és a melléklet-szabály mindkét ága.

**Adatbázisban**, a migráció után, Supabase MCP-vel innen:
- a token megvan, egyedi, és az ábécé szerinti alakú;
- **a `bekuldes_token` oszlopra nincs írási jog** a REST API-n — ugyanazzal a
  visszagörgetett, valódi tulajdonosi jogú próbával mérve, amivel a
  `stripe_price_id` rését is (`20260914000100`);
- a `bekuldes_token_cserel()` idegen cégre `raise exception`-t ad.

**Élesben, a felhasználónál — ez a valódi próba:**
1. a DNS beírása után `verify-domain` mindkét domainre (innen hívom);
2. a webhook felvétele a telepített függvény URL-jére (innen hívom);
3. **valódi levél** a `b-<token>@bekuldes.szamlafolyo.hu` címre, PDF-fel;
4. a bizonyíték: `files.source = 'email'`, `uploaded_by is null`, és egy
   `inbound_emails` sor `feldolgozva` állapottal;
5. **a levélszűrés próbája**: ugyanaz a levél egy aláírás-logóval — a logó
   **nem** lesz bizonylat, és a `mellozott` indoka látszik;
6. **idempotencia**: a webhook újraküldése (`replay-webhook-event`) — a
   második kézbesítés **nem** csinál második bizonylatot;
7. **a feladó-szűrés**: idegen címről küldött levél → `elutasitva` sor,
   olvasható indokkal; a kapcsoló átbillentése után ugyanaz átmegy.

**A telepítés után azonnal mérni**, nem a `status: ACTIVE` mezőt elhinni — ez a
PLACEHOLDER-eset tanulsága. Itt van rá egy olcsó eszköz: egy **rossz aláírású**
kérés a végpontra 401-et kell kapjon. Ha 401 jön, a függvény bootolt **és** a
kapu áll; ha időtúllépés, azonnal látszik, és nulla levél sérül.

### Amit ez a kör nyitva hagy — kimondva

- **A meghívó** (a felhasználó döntése): külön kör, `service_role`-os
  `inviteUserByEmail` Edge Functionnel.
- **A `kepMinBajt` heurisztika**: ha a szolgáltató jelzi az `inline`
  elhelyezést, ez a szám kidobandó. Addig megnevezve marad annak, ami.
- **Nincs értesítés az elutasításról**: a felhasználó a felületen látja. Egy
  napi összesítő levél a tulajdonosnak logikus folytatás, de külön döntés.
- **SPF/DKIM/DMARC eredmény**: a `headers`-ben elvileg ott az
  `Authentication-Results`, amiből a feladó-szűrés valódi határrá erősíthető.
  **Nem építek rá, amíg nem láttam** — ez mérés kérdése, nem feltételezésé.
- **A `kiolvas.bundle.js` + `csomagol.mjs`** továbbra is halott súly a
  production felől; a döntés a felhasználóé.

---

## ✅ Supabase Auth: Site URL és Redirect URLs — beállítva, a meghívó végigment

Mérve (adatbázis + Resend napló, nem képernyőről):

| Időpont (UTC) | Esemény | Nyom |
|---|---|---|
| 06:18:36 | meghívó létrejött | `meghivo.letrejott` |
| 06:18:42 | **levél kiment** | Resend `delivered`, `sent_at` beíródott |
| 06:19:21 | megerősítő levél | Resend `delivered` — az Auth a **Resend SMTP-jén** megy |
| 06:19:28 | cím megerősítve | `email_confirmed_at` |
| 06:19:30 | **meghívó elfogadva** | `meghivo.elfogadva`, `company_members` 2. sor |

Az elfogadás **2 másodperccel** a megerősítés után: ez bizonyítja, hogy a
megerősítő link a `/meghivo/<token>` címre hozott vissza, nem a nyitólapra —
pontosan az, amit a Redirect URLs beállítás csinál. A CORS-javítás is áll.

### A régi szakasz (a beállítandó értékek)

#### Context

A meghívó köre két új levélbeli visszaútat hozott létre, és ezekhez a Supabase
Auth **URL-konfigurációja** eddig nem volt beállítva. Amíg nincs, a
jelszó-emlékeztető és a meghívóból indított regisztráció megerősítő linkje
**csendben rossz helyre visz**: a Supabase a nem engedélyezett `redirectTo`-t
nem hibának tekinti, hanem **a Site URL-re irányít** — a meghívó tokenje ezzel
elveszik, és a felhasználó a nyitólapon köt ki, minden magyarázat nélkül.

Ez ugyanaz a hibaosztály, amit a CORS-nál most javítottunk: nem hibaüzenet
keletkezik, hanem *majdnem működés*.

### Amit a kód ténylegesen kér (mérve, `grep redirectTo|emailRedirectTo`)

| Hol | Cél-URL | Mikor |
|---|---|---|
| `src/kepernyok/auth/Jelszo.tsx:22` | `${origin}/jelszo-beallitas` | jelszó-emlékeztető |
| `src/kepernyok/auth/Meghivo.tsx:151` | `window.location.href` → `${origin}/meghivo/<token>` | meghívóból nyitott fiók megerősítése |
| `src/kepernyok/auth/Regisztracio.tsx` | *nincs megadva* → **a Site URL** | nyilvános regisztráció megerősítése |

A harmadik sor miatt a **Site URL önmagában is működő cím kell legyen**, nem
csak formalitás.

### A beállítandó értékek

**Authentication → URL Configuration**

**Site URL**

```
https://szamla-folyo2.vercel.app
```

Pontosan ez, mert a `config/szamlafolyo.ts` `webcim` értéke is ez — a meghívó
linkje ebből épül. Ha a kettő eltér, a levélben lévő link és a levél utáni
visszaút két különböző helyre visz.

**Redirect URLs** (soronként egy)

```
https://szamla-folyo2.vercel.app/**
http://localhost:5173/**
```

A `/**` nem pongyolaság: a Supabase mintaillesztésében a `*` **nem lép át**
útvonal-elválasztón, a `**` igen. A meghívó visszaútja `/meghivo/<token>`,
vagyis két szegmens — egy `*` nem fogná meg.

A `localhost` sor a helyi fejlesztésé. Enélkül `npm run dev` mellett minden
megerősítő link az élesre dobna át, és a helyben tesztelt folyamat sosem érne
véget.

**Opcionális, ha Vercel-előnézeten is akarsz belépni:**

```
https://szamla-folyo2-*-spyker55s-projects.vercel.app/**
```

**A domain felcsatolásakor** ehhez a háromhoz jön a `https://szamlafolyo.hu` mint
Site URL és `https://szamlafolyo.hu/**` a listába — a `config/szamlafolyo.ts`
`webcim` átírásával és a `meghivo-kuld` újratelepítésével együtt. Ez a három
lépés egy csomag; külön-külön megcsinálva mindegyik csendben elrontja a másikat.

### A repóváltozás: egyetlen fájl

`.env.example` — ez a projektben már ma is az a hely, ahol a **dashboardon
elkövethető csapdák** ki vannak írva (a Vercel `Config` kontra `Secret`
története). Alá kerül egy rövid blokk:

- mit kell a Supabase Auth URL-konfigurációjába beírni, pontosan;
- miért `**` és nem `*`;
- hogy a **nem engedélyezett redirect nem hibázik, hanem a Site URL-re esik** —
  vagyis a tünet „majdnem működik", nem „hibaüzenet";
- hogy a Site URL és a `config/szamlafolyo.ts` `webcim` **együtt mozog**.

Kódváltozás nincs. A `window.location.href` és a `${origin}/jelszo-beallitas`
helyes úgy, ahogy van: az origin a böngészőé, tehát helyi fejlesztésen és
élesben is magától a jót adja — amíg az engedélyezőlistán rajta van.

### Verifikáció

1. **Jelszó-emlékeztető**: `/elfelejtett-jelszo` → a levélben lévő link a
   `/jelszo-beallitas` képernyőre visz (nem a nyitólapra), és új jelszót lehet
   megadni.
2. **A meghívó teljes útja**: a `krisztian.nyeste@centervill.net` meghívóján
   „Küldd újra" → a levél linkjén fiókot nyitni → ha a projekt megerősítést kér,
   a megerősítő link **vissza a `/meghivo/<token>` címre** hozzon, ne a
   nyitólapra. Ez az egyetlen próba, ami a beállítást ténylegesen méri.
3. Utána innen: `company_members` **két sor**, valódi címekkel, és a meghívó
   sora `accepted_at`-tel; `activity_log` → `meghivo.elfogadva`.

---

## ➤ Ez a kör: a meghívó zsákutcája — az árva fiók visszatalál

### Context

A meghívó működik, de a mérés közben előjött egy fiók, ami **beragadt**:

```
krisztian.nyeste@centervill.net   létrejött 09-15 13:25
                                  megerősítve 13:25:32
                                  belépett 13:28:06
                                  tagságok: 0
```

Ez a tegnapi, Redirect URL nélküli próba maradványa: fiókot nyitott a meghívóból,
megerősítette a címét, belépett — és **sosem jutott el a meghívó elfogadásáig**,
mert a megerősítő link akkor még nem hozta vissza a `/meghivo/<token>` címre.

**A beállítás azóta megvan, a rés viszont nem a beállításon múlik.** A meghívott
a levelét bármikor elveszítheti, kitörölheti, vagy egyszerűen később léphet be
egy másik gépről. Onnantól a kód így viselkedik, mérve:

| Lépés | Hol | Mi történik |
|---|---|---|
| belép, nincs cége | `Vedett.tsx:54` (`Ceggel`) | átirányít a `/ceg-letrehozas`-ra |
| ott áll | `CegLetrehozas.tsx` | **egy szót sem tud a meghívóról** |
| céget alapít | `meghivot_elfogad` 3. kapu | *„Ehhez a fiókhoz már tartozik cég"* — **végleg** kizárva |

Ez egyirányú ajtó, és nincs mögötte kijárat: a `/fiok-torles` ma is helyőrző,
tehát a beragadt felhasználó **saját magától sem tud visszalépni**. A tulajdonos
pedig hiába küld új meghívót — a fiók már cégestül áll.

Ugyanaz a hibaosztály, amit ebben a projektben végig javítottunk: nem
hibaüzenet keletkezik, hanem **egy csendben rossz irányba vivő út**.

### A megoldás alakja

**Egy kérdést teszünk fel a cégalapítás előtt: „vár rád meghívó?"** Ha igen, azt
mutatjuk meg először. Az őr (`Ceggel`) marad, ahogy van — az minden cég nélküli
fiókot ugyanoda terel, tehát **pontosan egy hely van**, ahol ezt ki kell írni.

#### 1. Új RPC: `public.varo_meghivo()`

Új migráció: `supabase/migrations/20260916000100_varo_meghivo.sql`.

```sql
returns table (jel text, ceg_nev text, szerep text, lejar timestamptz)
language plpgsql security definer set search_path = ''
```

A belépett fiók **saját** címére szóló, még élő meghívót adja vissza (legfeljebb
egyet, a legfrissebbet), vagy nulla sort. A négy feltétel ugyanaz, amit a
`meghivo_adatok` is számol: `revoked_at is null`, `accepted_at is null`,
`expires_at > now()` — és `auth.uid() is not null`.

⚠️ **Nincs paramétere, és ez a lényege.** Egy `varo_meghivo(cim text)` alak
**cím-kitalálós orákulum** volna: bárki végigkérdezhetné, kit hívtak meg hova.
A cím a munkamenetből jön (`auth.users.email`), sosem a kliens állításából —
ugyanaz az elv, amiért a `belso.aktualis_ceg()` sem kap felhasználó-azonosítót.

Második kapu: ha `belso.aktualis_ceg() is not null`, **nulla sort ad**. Akinek
már van cége, annak a meghívó úgysem fogadható el (`meghivot_elfogad` 3. kapuja)
— egy kártya, ami egy biztosan elbukó gombhoz vezet, rosszabb a semminél.

Jogok a bevált minta szerint (a Supabase minden új `public` függvényre
nevesített EXECUTE-ot ad, azt csak nevesítve lehet elvenni):

```sql
revoke all on function public.varo_meghivo() from public, anon;
grant execute on function public.varo_meghivo() to authenticated;
```

#### 2. `src/lib/meghivo.ts` — `varoMeghivo()`

A meglévő `meghivoAdatok()` mintájára: hibánál és üres eredménynél `null`, mert
a hívó oldalon a kettő ugyanaz a döntés (ne mutassunk kártyát).

#### 3. `src/kepernyok/CegLetrehozas.tsx` — a kártya az űrlap **fölött**

Betöltéskor egy `varoMeghivo()` hívás. Ha van találat, az űrlap fölé kerül:

- „Meghívtak a(z) **<cég>** SzámlaFolyó-fiókjába — <szerep> szerepben.”
- **„Belépek a céghez"** gomb → `/meghivo/<jel>` (ott már minden kapu a helyén
  van, és a `Meghivo.tsx` a `session !== null` + `ceg === null` ágon rögtön az
  elfogadó gombot adja — **nem kell hozzányúlni**);
- a hátralévő idő a meglévő `hatralevoNap()`-pal (`@uzleti/meghivo.ts`);
- és a mondat, ami nélkül a kártya féligazság volna: **„Ha most saját céget
  alapítasz, ezt a meghívót már nem tudod elfogadni — egy fiók egy céget
  kezel."**

**Az űrlap marad alatta, és nem tűnik el.** Van legitim eset: valakit meghívtak,
de mégis a saját cégét akarja. A választást nem vesszük el — csak láthatóvá
tesszük, hogy melyik ajtó csukódik be.

Amíg a hívás fut, a kártya helye **üres** (nem villog, nincs helyőrző): az
űrlap azonnal használható marad, a kártya megjelenik, ha van mit mutatni.

#### 4. Egy apró csapda ugyanezen az úton: „Fiókot készítek", ha már van fiók

`Meghivo.tsx` `Belepes` — aki már regisztrált (mint az árva fiók), kilépve
kattint a linkre, és az első gomb a **„Fiókot készítek"**. A Supabase ilyenkor
szándékosan nem árulja el, hogy a cím már foglalt (cím-kitalálás elleni
védelem), tehát a képernyő „nézd meg a postafiókod"-ot ír — **és nem jön levél**.

**Nem** próbáljuk kitalálni a `data.user.identities` hosszából, hogy létezik-e
már a fiók: az dokumentálatlan mellékjelenség, és pont az a fajta feltevés,
amire ebben a projektben nem építünk. Helyette a `kesz` üzenet kiegészül egy
mondattal és egy linkkel: *ha ehhez a címhez már tartozik fiók, nem érkezik új
levél — lépj be, és a meghívó itt vár rád.* A bejelentkezés link már ma is
viszi magával a `honnan: /meghivo/<token>` állapotot.

### Az élő árva fiók — DB-műtét nélkül

A javítás **magától megoldja**: küldesz új meghívót a
`krisztian.nyeste@centervill.net` címre (a két korábbi vissza van vonva, tehát
az egyedi index nem ütközik), az illető belép a meglévő jelszavával, és a
`/ceg-letrehozas`-on ott a kártya.

⚠️ **Az `auth.users` sorhoz nem nyúlok.** Valódi fiók törlése visszafordíthatatlan,
és nincs is rá szükség — ha mégis azt akarod, szólj, de az külön kérés.

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `supabase/migrations/20260916000100_varo_meghivo.sql` | **új** — `varo_meghivo()` + jogok |
| `src/lib/meghivo.ts` | `varoMeghivo()` a meglévő minta szerint |
| `src/kepernyok/CegLetrehozas.tsx` | a kártya az űrlap fölé, a figyelmeztető mondattal |
| `src/kepernyok/auth/Meghivo.tsx` | a `Belepes` `kesz` üzenete + bejelentkezés link |

Új CSS, új komponens és új függőség **nincs**: a kártya a meglévő `alert`
osztályokból és a `btn btn-primary`-ból áll, a napszámolás a meglévő
`hatralevoNap()`.

### Verifikáció

**Adatbázisban**, a migráció után, visszagörgetett tranzakcióban — ugyanaz a
`DO $$ … RAISE EXCEPTION $$` minta, amivel az oszlopjogokat és a meghívó kilenc
állítását is mértük:

1. munkamenet nélkül → **nulla sor**;
2. a meghívott fiókjával, élő meghívóval → **egy sor**, helyes cégnévvel;
3. ugyanaz a fiók, miután céget alapított → **nulla sor** (a második kapu);
4. visszavont / lejárt / már elfogadott meghívó → **nulla sor**, mindhárom külön;
5. **idegen cím meghívója sosem jön elő** — ez a fontos negatív eset;
6. `anon` szerepnek **nincs** EXECUTE joga (`information_schema.role_routine_grants`).

**Helyben:** `npm test`, `npm run typecheck`, `npm run build`.

**Böngészőben** (Playwright, mockolt hálózattal, 390 px és 1280 px): a
`/ceg-letrehozas`-on a kártya **megjelenik**, ha az RPC ad sort, és **nincs ott**,
ha nem ad — mindkét állás mérve, mert egy kapcsoló, amit csak az egyik állásában
néztünk meg, fél kapcsoló. A gomb a `/meghivo/<jel>` címre visz, és az űrlap
mindkét esetben használható marad.

**Élesben, nálad — ez a valódi próba:** új meghívó a
`krisztian.nyeste@centervill.net` címre → az illető belép a **meglévő**
jelszavával → a cégalapítás helyett a kártyát látja → „Belépek a céghez”. Utána
innen mérem: `company_members` **három sor**, és `activity_log` →
`meghivo.elfogadva`.

### Amit ez a kör nyitva hagy — kimondva

- **A `/fiok-torles` továbbra is helyőrző.** Ez a kör azt éri el, hogy ne
  lehessen bezáródni; a kijáratot a Stripe-kör hozza (a törléshez az előfizetés
  lemondása is hozzátartozik).
- **Szerveroldali helykorlát**: a `ferMegTag()` ma csak a felületen fog — a
  `varo_meghivo()` nem változtat ezen, és nem is kellene neki. Marad a
  Stripe-körnek.
- **Cégváltó nincs**, és ez továbbra is szándékos: egy fiók egy céget kezel.

---

## ✅ Élesítés: domain + zárt regisztráció — mérve

| Amit ellenőriztem | Eredmény |
|---|---|
| `szamlafolyo.hu` | **200**, Vercel (fra1), a saját `index.html`-ünk |
| `www.szamlafolyo.hu` | 200, átirányít a csupasz címre |
| `szamla-folyo2.vercel.app` | 200 — a régi levelek linkjei **nem törtek el** |
| `meghivo-fiok` | **v1**, `verify_jwt: false`, forrás-entrypoint |
| `meghivo-kuld` | **v4** (újratelepítve az új `webcim`-mel) |
| `disable_signup` | **`true`** — a nyilvános regisztráció szerveroldalon zárva |

A `meghivo-fiok` életjele a döntő, és három dolgot mond egyszerre: egy
**Authorization-fejléc nélküli GET** a mi saját, magyar
`405 {"hiba":"Csak POST."}` válaszunkat kapta vissza, `access-control-allow-origin: *`
fejléccel. Vagyis (1) a függvény bootol, (2) a `verify_jwt = false` tényleg áll —
a platform nem szólt közbe —, és (3) **a CORS-fejléc a hibaválaszon is ott van**,
pont az, ami a `meghivo-kuld` első verziójából hiányzott.

Az élő JS-csomagból mérve az is látszik, hogy az új kód kint van:
`meghivo-fiok` ✅, `varo_meghivo` ✅, „Meghívtak a(z)" ✅, „saját céget" ✅, és
a fejlesztői sáv szövege **nincs** benne (`VITE_FEJLESZTES_ALATT=false`).

---

## ➤ Ez a kör: a nyitólap még nyitott regisztrációt hirdet

### Context

A szerveroldali kapu bezárult (`disable_signup: true`), a **böngészőbe kiadott
csomag viszont nem tud róla**. Az élő
`szamlafolyo.hu/assets/index-DHhsBnFD.js`-ből mérve:

| Szövegjel | A csomagban | Mit jelent |
|---|---|---|
| „Ingyenes próba", „Kiválasztom", „Kipróbálom" | **benne van** | a nyitott ág fordult bele |
| „A nyilvános regisztráció még nem nyitott" | **nincs benne** | a zárt ág kiesett |

Vagyis a Vercelen `VITE_REGISZTRACIO_NYITVA=true` áll. A nyitólap hirdeti az
ingyenes próbát, az árkártyákon ott a „Kiválasztom", a `/regisztracio` kiadja az
űrlapot — és a `signUp()` a végén a Supabase **angol** hibaüzenetébe fut
(`Regisztracio.tsx:47` a nyers `error.message`-t írja ki):

> Signups not allowed for this instance

Egy magyar termék nyilvános főoldalán, az élesítés napján. Ez ugyanaz a
hibaosztály, amit ebben a projektben végig javítunk — **ígéret, amit a kód nem
tart be** —, csak most a legláthatóbb helyen.

### A megoldás: egy kapcsoló és egy háló

**1. A valódi javítás a Vercelen, kód nélkül.**

`VITE_REGISZTRACIO_NYITVA` → **`false`**, majd **újratelepítés** (a `VITE_`
értékek fordításkor égnek bele, nem futásidőben olvasódnak).

⚠️ Ellenőrizendő ugyanitt, hogy a változó típusa **`Config`**, ne `Secret`: a
mentett titok write-only, soha többé nem olvasható vissza, és Configgá sem
alakítható — ez a csapda ebben a projektben egyszer már elsült, és akkor az élő
JS-csomag visszafejtésével kellett megválaszolni, hogy nyitva van-e a
regisztráció.

Ezután a nyitólapról eltűnnek az árkártyák gombjai és a hero elsődleges gombja a
Bejelentkezés lesz — ezt a viselkedést egy korábbi kör **mindkét kapcsolóállásban
megmérte**, tehát nem újdonság, csak visszaáll.

**2. Egy háló, mert a két kapcsoló újra szét fog csúszni.**

A `VITE_REGISZTRACIO_NYITVA` (böngésző) és a `disable_signup` (Supabase) két
külön helyen él, és a `.env.example` már ma figyelmeztet, hogy külön is romlanak
el. Ma a széttartás **némán** derül ki: a látogató eljut az űrlapig, és egy angol
mondatot kap.

`src/kepernyok/auth/Regisztracio.tsx`:

- a zárt ág mai szövege (**„Új fiókot jelenleg nem lehet nyitni… írj: {email}"**)
  kiemelve egy helyi alkomponensbe — ma ez a mondat egy példányban létezik, és
  maradjon is úgy;
- a `signUp()` hibájánál: ha a Supabase azt mondja, hogy a regisztráció tiltott
  (`error.code === 'signup_disabled'`, illetve tartalékként a `422` + a
  `signup.*not allowed` minta), **ugyanaz a képernyő** jelenjen meg, mint a zárt
  ágon. Nem új szöveg, nem hibasáv: a látogató ugyanazt az egy igaz mondatot
  kapja, akármelyik kapcsoló miatt zárt a kapu;
- minden más hiba marad, ahogy van (a nyers üzenet ott hasznos).

Ez **nem a kapcsoló helyettesítése**, hanem az, hogy a széttartás ne egy angol
platformüzenet formájában érjen földet.

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `src/kepernyok/auth/Regisztracio.tsx` | a zárt-ág szöveg egy helyre, és a `signup_disabled` hiba oda fut be |

Új komponens, CSS és függőség nincs; a `kapcsolatEmail` és az `AuthElrendezes`
már megvan.

### Verifikáció

**Helyben:** `npm test`, `npm run typecheck`, `npm run build`.

**Böngészőben** (Playwright, mockolt hálózattal, 390 és 1280 képponton),
**mindkét kapcsolóállásban** — mert egy kapcsoló, amit csak az egyik állásában
néztünk meg, fél kapcsoló:

- `VITE_REGISZTRACIO_NYITVA=false` → a `/regisztracio` a zárt képernyőt adja, és
  a nyitólapon egyetlen `/regisztracio` link sincs;
- `=true` + a `signUp` mockolt `signup_disabled` hibája → **ugyanaz** a zárt
  képernyő, nem angol hibasáv;
- `=true` + sikeres `signUp` → a mai viselkedés változatlan.

**Élesben, a telepítés után innen:** az élő JS-csomagból ugyanaz a
szövegjel-mérés, ami ma a széttartást kimondta — a „Kipróbálom" / „Ingyenes
próba" / „Kiválasztom" **tűnjön el**, és a „A nyilvános regisztráció még nem
nyitott" **jelenjen meg**.

### ⚠️ Egy dolog, ami nem kód, és most a legnagyobb kockázat

**A Supabase projekt Free csomagon van.** Egy hét inaktivitás után a platform
**felfüggeszti** — és ezt nem éli túl a pg_cron (a sor és a napi selejtezés), az
e-mailes beküldés webhookja, sem egyetlen előfizető. Amíg fejlesztettünk, ez
elviselhető volt; egy nyilvános domainen már nem az.

Ez az egyetlen élesítési tétel, amit innen nem tudok elvégezni, és amit a terv
az elejétől az indulási ellenőrzőlistára írt. A **Pro csomagra emelés** a
következő valódi lépés, még a Stripe-kör előtt.

---

## ➤ Ez a kör: felugró ablak a nyitólapon — „az oldal fejlesztés alatt áll"

### Context

A `szamlafolyo.hu` nyilvános, de a termék **nem indult el**: a regisztráció
szerveroldalon zárva (`disable_signup: true`). A nyitólap viszont ma egy kész
szolgáltatás képét mutatja — hero, árazás, „Kipróbálom ingyen" —, és semmi nem
mondja meg az érkezőnek, hogy ez még nem az.

A mai vékony sáv (`FejlesztesAlattSav`) ezt hivatott kimondani, de két baja van:
a hero **tetején** ül, tehát könnyen átsiklik rajta a szem, és — mérve az élő
`index-BsOszvDr.js`-ből — **jelenleg meg sem jelenik**.

⚠️ **A két Vercel-kapcsoló ma a „kész, nyitott" álláson áll**, és ez a kérés
szempontjából döntő:

| Kapcsoló | Mai érték (mérve az élő csomagból) | Aminek lennie kell |
|---|---|---|
| `VITE_FEJLESZTES_ALATT` | **`false`** — a sáv szövege nincs a csomagban | **`true`** |
| `VITE_REGISZTRACIO_NYITVA` | **`true`** — „Ingyenes próba" a csomagban | **`false`** |

Vagyis a felület ma azt hirdeti, hogy kész és nyitott, a szerver meg azt mondja,
hogy zárva. Ez a kör a felületet hozza szinkronba — de a **kapcsolók
átbillentése nélkül az ablak meg sem jelenik**, mert szándékosan a
`fejlesztesAlatt`-ra van kötve. Egy mindig látszó, kódból törlendő ablak pont az
a hamis ígéret volna, amit ebben a projektben végig irtunk.

### A megoldás alakja

**Új komponens: `src/komponensek/FejlesztesAlattAblak.tsx`**, a meglévő
`FejlesztesAlatt.tsx` mellé, ugyanarra a kapcsolóra kötve. A nyitólap
(`src/oldalak/Nyitolap.tsx`) rendereli — így magától csak a **kilépett**
látogató kapja meg, hiszen a belépettet a `Kezdolap` a Beérkezőre viszi.

**Eldöntve (veled):**

- **böngészőmenetenként egyszer** jön fel (`sessionStorage`). Aki az árazást,
  majd az ÁSZF-et nézi meg, ne kapja háromszor ugyanazt;
- a **vékony sáv marad** a hero tetején. Az ablak egyszer, hangosan kimondja; a
  sáv utána is igaz marad, és a bejelentkező képernyőn is ott marad, ahol ma.

**Elutasítható, és ez nem gyengeség.** Egy be nem zárható ablak elzárná az
ÁSZF-et és az Adatkezelési tájékoztatót — egy nyilvános oldalon elérhetetlen
jogi szöveg rosszabb, mint a hiányzó figyelmeztetés. Bezárás: gomb, `Esc`, és
kattintás a háttérre.

**A szöveg egy forrásból.** Ugyanaz a három állítás, ami a sávban és a zárt
regisztrációs képernyőn is áll: fejlesztés alatt · regisztrálni még nem lehet ·
`kapcsolatEmail` (`src/lib/kornyezet.ts`). Nem írunk negyedik változatot.

#### Amit a komponens csinál, és amit szándékosan nem

| | |
|---|---|
| `role="dialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby` | a képernyőolvasó is ablaknak lássa |
| a fókusz megnyitáskor a gombra, bezáráskor **vissza oda, ahonnan jött** | enélkül a billentyűzetes látogató a lap elejére esik |
| `Esc` és háttérkattintás zár | a háttérkattintás csak a vásznon, nem a panelen belül |
| görgetészár, **a görgetősáv szélességének kipótlásával** | enélkül a lap megnyitáskor odébb ugrik |
| finom áttűnés Tailwind `transition`-nel, `motion-reduce:transition-none`-nal | a csökkentett mozgás ebben a projektben nem ízlés kérdése (`gorgetes.ts`) |
| **nincs új CSS** | a `.card`, `.card-pad`, `.btn btn-primary` és a `@theme` színek megvannak; az `app.css` `@layer components` blokkja a régi rendszerből jött, és nem bővítjük egy ablakért |
| **nincs fókuszcsapda** (Tab-hurok) | egy elutasítható, egygombos ablaknál a `Tab` kivezetése nem okoz kárt, a hurok viszont saját hibaosztályt hoz — ha később kell, külön kör |

⚠️ A `sessionStorage` minden olvasása és írása `try/catch`-ben: privát ablakban
és letiltott tárolásnál dobhat. Hiba esetén az ablak **megjelenik** — a
biztonságos irány az, ha inkább kétszer mondjuk el, mint egyszer sem.

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `src/komponensek/FejlesztesAlattAblak.tsx` | **új** — az ablak |
| `src/oldalak/Nyitolap.tsx` | egy import és egy elem a `Nyitolap()`-ban |

Új függőség, új CSS és új komponenskönyvtár nincs. Újrahasznosítva: `LogoSor`
(`komponensek/Logo.tsx`), `fejlesztesAlatt` és `kapcsolatEmail`
(`lib/kornyezet.ts`), a `@theme` színei és a `.card` / `.btn` osztályok.

### Verifikáció

**Egységteszt nincs, és ezt kimondom:** a Vitest-kör a `shared/uzleti` tiszta
üzleti logikájára szól, itt pedig környezeti kapcsoló és böngészőtárolás dönt —
egy ilyen modul odatolása csak látszatfedezet volna. A mérés a böngészőben van.

**Helyben:** `npm test` (409), `npm run typecheck`, `npm run build`.

**Böngészőben** (Playwright, mockolt hálózattal, **390 px és 1280 px**),
a kapcsoló **mindkét állásában** — mert egy kapcsoló, amit csak az egyik
állásában néztünk meg, fél kapcsoló:

- `VITE_FEJLESZTES_ALATT=true` → az ablak feljön a `/`-on; a gomb, az `Esc` és a
  háttérkattintás **külön-külön** bezárja; a panelen belüli kattintás **nem**;
- bezárás után: a vékony sáv **ott van**, az ÁSZF és az Adatkezelés linkje
  elérhető, és a lap görgethető (a zár feloldódott);
- **ugyanabban a böngészőmenetben** újratöltve **nem** jön fel újra; **friss
  kontextusban** igen;
- `VITE_FEJLESZTES_ALATT=false` → az ablak **soha** nem jelenik meg;
- vízszintes görgetés sehol, JS-hiba a konzolon nincs, és képernyőkép mindkét
  szélességen a ránézésre.

**Élesben, a telepítés után innen:** ugyanaz a szövegjel-mérés az élő
JS-csomagon, ami ma a széttartást kimondta — az ablak címe **jelenjen meg**, az
„Ingyenes próba" / „Kiválasztom" **tűnjön el**.

### Amit neked kell megtenned — és enélkül a kör nem látszik

Vercel → Environment Variables, mindkettő **`Config` típusú**, nem `Secret`
(az a csapda itt egyszer már elsült), majd **újratelepítés** — a `VITE_`
értékek fordításkor égnek bele:

```
VITE_FEJLESZTES_ALATT=true
VITE_REGISZTRACIO_NYITVA=false
```

A második a korábbi kör nyitva maradt tétele: ezzel tűnnek el a nyitólapról az
„Ingyenes próba" / „Kiválasztom" gombok, és a `/regisztracio` a zárt képernyőt
adja — vagyis a felület végre ugyanazt mondja, amit a szerver.

---

## ➤ Ez a kör: az új árak — és egy kimondott szabály, ami közben megfordult

### Context

Új árazás, a Stripe-ban már beállítva (sandboxban és élesben is; **tesztelni a
sandboxot** használjuk):

| Csomag | Havi díj | Extra dokumentum |
|---|---|---|
| Start | 1 990 → **4 900 Ft** | 49 → **50 Ft** |
| Flow | 4 990 → **9 900 Ft** | 29 → **40 Ft** |
| Pro | 9 990 → **19 900 Ft** | 24 → **30 Ft** |

A keretek (50 / 200 / 500 dokumentum) és a fejszámok (2 / 5 / korlátlan) nem
változnak — erről nem esett szó, és a Stripe oldalán sem mozdult semmi.

**A jó hír, hogy ez majdnem semmi munka.** A felderítés megerősítette, amit a
`config/szamlafolyo.ts` fejléce ígér: az `arHavi` és az `extraFt` mezőt a
**teljes kódbázisban két hely** olvassa — a nyitólap árszakasza
(`Nyitolap.tsx:807, 826`) és az ÁSZF 7. pontjának táblázata (`Aszf.tsx:209, 212`)
—, és mindkettő a configból. Nincs kézzel beírt ár sehol a felületen, nincs ár
migrációban, `.env.example`-ben, tesztben. A hat szám átírása **magától**
végigmegy a weboldalon.

### ⚠️ Amit viszont az átírás felborít — és ez a kör érdemi része

A `config/szamlafolyo.ts:276-278` kimond egy szabályt:

> Az `extraFt` a keret fölötti darabár, és **mindig drágább**, mint az adott
> csomag saját darabára (ár ÷ darabszám: 39,8 / 24,95 / 19,98) — különben azt
> tanítanánk, hogy megéri a kis csomagban maradni és túllépni. **Erre teszt van.**

Az új árakkal ez **mindhárom csomagon megfordul**:

| Csomag | Saját darabár (ár ÷ keret) | `extraFt` | A régi szabály |
|---|---|---|---|
| Start | 4900 / 50 = **98 Ft** | 50 Ft | ✗ megbukik |
| Flow | 9900 / 200 = **49,5 Ft** | 40 Ft | ✗ megbukik |
| Pro | 19900 / 500 = **39,8 Ft** | 30 Ft | ✗ megbukik |

A túlhasználat innentől **olcsóbb**, mint a csomag saját átlagos darabára. Ez
közgazdaságilag teljesen rendben van — a havi díj elkötelezettség, az átlagár és
a határköltség nem ugyanaz a szám, és a csökkenő határár bevett árazási alak. A
kimondott szabály viszont **így, ebben a formában hamis lesz**, és ha
változatlanul hagynánk, pontosan azt a hibaosztályt állítanánk elő, amit ebben a
projektben végig irtunk: állítás, amit a számok nem támasztanak alá.

**És a „Erre teszt van" mondat már ma sem igaz**: `grep`-pel mérve az `extraFt`
és az `arHavi` **egyetlen tesztfájlban sem szerepel**. A szabály eddig is csak
kommentként létezett.

Tehát nem azt kérdezem, jó-e az árazás — az a te döntésed, kétszer be is
állítottad a Stripe-ban. Azt javítjuk, hogy a kód **igazat mondjon róla**.

#### A helyére kerülő szabály — ez az, ami valóban számít

Amit a régi mondat védeni akart, az nem az átlagár-összehasonlítás volt, hanem
egy viselkedés: *ne érje meg a kis csomagban maradni és túllépni.* Ez a
kérdés **csomagok között** dől el, nem egy csomagon belül — és így **áll** az új
árakkal is:

> Egy kisebb csomag túlhasználattal felvitt kerete legyen **drágább**, mint a
> következő csomag havi díja.

| Lépcső | Számítás | Eredmény |
|---|---|---|
| Start → Flow kerete (200 db) | 4900 + 150 × 50 = **12 400 Ft** | > 9 900 Ft ✅ |
| Flow → Pro kerete (500 db) | 9900 + 300 × 40 = **21 900 Ft** | > 19 900 Ft ✅ |

Mellé egy második, ugyanilyen olcsón mérhető szabály: **a darabár csomagról
csomagra csökkenjen** (50 > 40 > 30) — egy nagyobb csomagnak sose legyen
rosszabb a határára.

**Amit a teljesség kedvéért kimondok, mert a mérésből kijött, és a te döntésed
súlya van rajta:** a váltópont kijjebb csúszott. Régen a Start túlhasználattal
~111 dokumentumnál érte utol a Flow árát, most **150**-nél; a Flow ~372-nél a
Próét, most **450**-nél. Mindkettő továbbra is a következő csomag keretén belül
van (200, illetve 500), tehát a létra ép — csak laposabb. Ez nem hiba, csak
tény, amit érdemes tudni.

A túlhasználati plafont (`alapPlafonFt: 10000`) **nem nyúlom meg**: Starton
50 Ft-os darabárral 200 extra dokumentumot enged, ami a régi 49 Ft-tal 204 volt
— érdemben változatlan, és a havi díjhoz mérve **biztonságosabb** lett (a számla
a korábbi ~6× helyett ~3×-ra futhat fel a plafonig).

### A kódváltozás

**1. `config/szamlafolyo.ts` — a hat szám és a fölötte lévő komment**

A hat érték (`arHavi` / `extraFt` a `kicsi` / `kozepes` / `nagy` blokkban), és a
`csomagok` blokk fejléc-kommentje (276–283. sor) átírva: az új szabály a
lépcsők közti összehasonlítás, a levezetéssel; a „mindig drágább" mondat és az
elavult `39,8 / 24,95 / 19,98` levezetés kikerül.

Ugyanennek a kommentnek a második fele ma azt állítja, hogy *„az árazonosítók a
Stripe éles fiókjából valók, és **pontosan ezeket a számokat hordozzák**"* — ez
az árváltással valótlanná válik, ezért ez a mondat is átíródik (lásd lentebb).

**2. `config/szamlafolyo.test.ts` — új, és ettől lesz igaz a „teszt van"**

A két fenti szabály `csomagSorrend` mentén, szomszédos párokra. Nem kézzel
beírt számokra állít: a configból olvas, tehát a következő árváltásnál is mér.
Ha egy jövőbeli ár megfordítaná a létrát, ez a teszt pirosra vált — ma ez a
visszajelzés hiányzott, és épp ezért csúszhatott el a komment.

> ⚠️ **Egy apró tooling-lépés kell hozzá:** a `vitest.config.ts` `include`
> listája ma `shared/`, `src/` és `supabase/functions/` alatt keres — a
> `config/` mappát **nem nézi**, tehát egy ide tett teszt némán sosem futna le.
> Egy sor kerül bele: `'config/**/*.test.ts'`. A teszt szándékosan a számok
> mellé kerül, nem a `shared/uzleti/`-be: aki egy árat átír, annak ott, abban a
> mappában akadjon meg a szeme rajta.

**3. Két elavuló komment-példa** — mindkettő a `formaz()` melletti érvelést
illusztrálja a Start árával, ami innentől nem létező szám:

| Hol | Ma | Ezután |
|---|---|---|
| `src/oldalak/Nyitolap.tsx:802` | „a szöveg `1 990Ft`-ként állt össze" | `4 900Ft` |
| `src/oldalak/jogi/Aszf.tsx:36` | „`1990 Ft` jött ki `1 990 Ft` helyett" | `4900 Ft` / `4 900 Ft` |

### Kritikus fájlok

| Fájl | Mi |
|---|---|
| `config/szamlafolyo.ts` | a hat ár + a `csomagok` blokk fejléc-kommentje |
| `config/szamlafolyo.test.ts` | **új** — a két árazási szabály |
| `vitest.config.ts` | egy sor az `include` listába |
| `src/oldalak/Nyitolap.tsx` | egy komment-példa (802. sor) |
| `src/oldalak/jogi/Aszf.tsx` | egy komment-példa (36. sor) |

Új komponens, új CSS, új függőség **nincs**. A megjelenítéshez egyetlen sort sem
kell írni: a nyitólap `Arak()` szakasza és az ÁSZF 7. pontja a configból olvas.

### Amihez nem nyúlunk — és miért

- **A Stripe ár-azonosítók** (`arazonosito`, `arazonositoExtra`) — a döntésed
  szerint maradnak, csak a fölöttük lévő hamis mondat javul. Ez ma **kockázat
  nélküli**: az `arazonositoExtra`-t a kódbázisban **senki nem olvassa**, az
  `arazonosito`-t is egyedül a `keret.ts:97` lépteti be a csomag-lekeresésbe, és
  **élő előfizető nincs**. A csere a Stripe-kör dolga, a checkouttal együtt.
  > ⚠️ Egy dolgot előre érdemes tudni arra a körre: a Stripe `price` objektum
  > összege **nem módosítható**, tehát a dashboardos „átírás" a háttérben **új
  > `price` objektumokat** hozott létre — a configban álló hat azonosító
  > innentől a **régi** árakat hordozza. Amikor a csere sorra kerül, egy még
  > régi azonosítón ülő előfizetést a `keret.ts` a legkisebb csomag keretére ejt
  > (`legkisebb()`), naplózva. Ez szándékos irány, de ismerni kell.
- **`supabase/migrations/**`, `.env.example`, `.env`** — mérve egyetlen ár és
  egyetlen árazonosító sincs bennük. Az `overage_charges` tábla **kreditet**
  tárol, nem forintot; a `companies.overage_limit_ft` ügyfelenkénti plafon, nem
  díjszabás.
- **`src/kepernyok/Beallitasok.tsx`** — csomagárat nem jelenít meg, csak a
  plafont és a csomag **nevét**. A súgószövege (*„a darabár csomagonként más"*)
  szándékosan nem idéz számot, tehát változatlanul igaz marad.
- **`shared/uzleti/kredit.ts`, `keret.ts`, `osszeg.ts`** — forintösszeg nincs
  bennük; a `keret.test.ts` és a `meghivo.test.ts` szimbolikusan olvassa a
  configot, tehát **egyetlen meglévő teszt sem törik el**.
- **`supabase/functions/**` — nincs újratelepítés.** A telepített `kiolvas` (v8)
  a forrásból fut, és mérve **egyetlen ármezőt sem olvas** (csak
  `kredit.oldalPerKredit`-et és a kereteket). A committolt
  `kiolvas.bundle.js`-ben benne ül a config egy elavuló másolata, de az a
  production felől **halott súly** — ahogy a v6 telepítése óta jeleztük. A
  nyugdíjazása továbbra is külön kör.
- **`extraFt` formázása** — a nyitólap és az ÁSZF nyersen interpolálja
  (`{cs.extraFt} Ft`), nem a `formaz()`-on át. Az új értékek kétjegyűek, a
  csoportosítás négy számjegynél kezdődik, tehát ez ma nem okoz eltérést. Nem
  csomagolom bele ebbe a körbe.

### Verifikáció

**Helyben:** `npm test` (409 + az új teszt), `npm run typecheck`, `npm run build`.

Az új teszt a mérés lényege: **előbb a régi szabállyal futtatom** (hogy lássam,
tényleg pirosra vált az új árakon — egy teszt, ami sosem bukott meg, nem
mérőeszköz), és csak utána írom meg a helyeset.

**Böngészőben** (Playwright, mockolt hálózattal, **390 px és 1280 px**):

- a nyitólap `#arak` szakasza **4 900 / 9 900 / 19 900 Ft**-ot mutat, a három
  kártyán rendre **50 / 40 / 30 Ft** extra dokumentumárral;
- a `19 900 Ft` **csoportosítva** jelenik meg (szóközzel), és nem törik ki a
  kártyából 390 px-en — ez az egyetlen valódi tördelési kockázat, mert ez az
  első **ötjegyű** ár a lapon;
- az `/aszf` 7. pontjának táblázata ugyanezt a hat számot adja;
- a régi számok (`1 990`, `4 990`, `9 990`) **egyik lapon sem** maradnak;
- JS-hiba a konzolon nincs.

> A nyitólap **320 px-es vízszintes görgetése** egy korábbi körből ismert,
> **meglévő** hiba, nem ez a változás okozza — ha az ötjegyű ár mégis rontana
> rajta, azt külön jelzem.

**Élesben, telepítés után innen:** ugyanaz a szövegjel-mérés az élő
JS-csomagon, amivel a két `VITE_` kapcsolót is ellenőriztük — a `4900` /
`19900` / `extraFt:30` jelenjen meg, az `1990` / `9990` / `extraFt:24`
tűnjön el. A Vercel automatikusan telepít az ágra érkező push-ra, tehát ehhez
nem kell külön lépésed.

### Amit ez a kör nyitva hagy — kimondva

- **A Stripe ár-azonosítók cseréje** (fent indokolva) — a Stripe-kör része.
- **A Stripe MCP-kapcsolat ebben a munkamenetben nem használható**: a connector
  `connected`-et mutat, de az eszközei a munkamenet indulásakor regisztrálódnak,
  tehát csak egy **friss munkamenetben** jönnének elő. Az azonosítókat így sem
  most, sem a jelen körben nem tudom magamtól kiolvasni.
- **A Supabase Free → Pro** továbbra is a legnagyobb élesítési kockázat, és
  ettől a körtől független.

---

## ➤ Most: a `selejtez` v4 boot-próbája

### Context

Az export-selejtezés köre (`2c6088a`) kész: a migráció él, a jogi szövegek és
az Archívum ki vannak tolva, a felhasználó pedig **telepítette a `selejtez`
függvényt**. Amit ebből eddig mértem, mind rendben:

| | |
|---|---|
| verzió / kapu | **v4**, `verify_jwt: true`, forrás-entrypoint |
| a telepített forrás | mind a négy új függvény, a bővített válasz, a `selejtezendo_exportok` hívás |
| repó ↔ telepítés | a helyi fájl tiszta a `2c6088a`-hoz képest, a `config.toml` egyezik |
| esedékes most | **0 export, 0 fájl** — egy futás ma no-op |
| első valódi lejárat | **2026-10-14** |
| a napi cron | ma 03:17-kor `succeeded` (még a v3-on) |

**Egy dolog viszont nincs megmérve: hogy a v4 bootol-e.** Ez a PLACEHOLDER-eset
tanulsága — akkor a válasz `ACTIVE`-ot mutatott, miközben a függvény
időtúllépésbe futott, és öt percre megállította a feldolgozást. A forrás
visszaolvasása ezt nem dönti el; a `deno check` a típusokat nézte, nem a
futtatókörnyezet feloldását.

### A lépés

**Hitelesítés nélküli hívás a `selejtez` végpontra, `pg_net`-tel, az
adatbázisból** — ugyanaz a módszer, amivel a `meghivo-fiok`-ot is igazoltuk (ez
a környezet nem éri el a `*.supabase.co`-t, a Postgres viszont igen).

A várt válasz a **saját magyar 403-unk**:

```json
{"hiba":"A selejtezés csak belső hívásból indítható."}
```

Ez a válasz a `szolgaltatasKulcs()` őrből jön, **mielőtt** a `service_role`
kliens létrejönne — tehát egyszerre bizonyítja, hogy (1) a csomag bootol, (2) a
`@supabase/supabase-js` és a `token.ts` import feloldódott az Edge Runtime
alatt, és (3) a kapu áll. **Nulla bájtot töröl.**

⚠️ A `pg_net` aszinkron: a `net.http_get()` egy azonosítót ad, a választ a
`net._http_response`-ból kell visszaolvasni egy várakozás után. Az alapértelmezett
5000 ms-os időkorlátot a DNS egyszer már megette — `timeout_milliseconds := 20000`.

### Verifikáció

- **403** és a magyar üzenet → a v4 bootol, kész a kör;
- **időtúllépés vagy 5xx** → a telepítés hibás, és ez most derül ki, nem
  október 14-én. Visszaállás: `git show 9239104:…` mintájára az előző verzió
  újratelepítése a felhasználó gépéről. Kár így sem keletkezne — nulla tétel
  esedékes —, de a hibát nem hagyjuk a sorsára.

Utána a `net._http_response` sorát kiírom, és ezzel a kör lezárul. Kódváltozás
ehhez **nincs**.

---

## ➤ Ez a kör: a Pro-emelés kérdése — a döntés **elhalasztva**, de kimérve

### Context

Felmerült a kérdés, hogy emeljük-e a Supabase projektet Pro csomagra. A terv ezt
a kezdetektől az indulási ellenőrzőlistán tartja, és a legutóbbi körök is
ismételték. Most megmértem, mi jár vele — **és a döntésed az lett, hogy most még
marad a Free.**

Ez így rendben van, és nem is hagy nyitott kódmunkát: a teendő ettől
**pillanatnyi** marad (egy dashboard-kattintás, nincs átfutási idő). Amit ez a
kör elvégez, az annyi, hogy a mérés ne vesszen el — különben fél év múlva újra
ki kell számolni ugyanazt, valószínűleg épp akkor, amikor sietni kell.

### Amit mértem (nem feltételezés)

**A Supabase szervezetre számláz, nem projektre.** Ez az egyetlen tény, ami az
egész kérdést átrendezi, és eddig egyik tervdarab sem mondta ki:

| | Mérve |
|---|---|
| szervezet | **`Free projects`** (`qcijejgirudmeongwdxd`), csomag: **`free`** — ez az egyetlen szervezet, amit a jelenlegi hozzáférésem lát |
| projektek benne | `szamlafolyo` (aktív), `zsebgarazs` (aktív), `havio-penzugy` (**felfüggesztve**) |
| adatbázis mérete | **15 MB** (Free korlát: 500 MB) |
| tároló | 11 objektum, **1,4 MB** (Free korlát: 1 GB) |
| cron | 2 feladat: `szamlafolyo-sor` percenként, `szamlafolyo-selejtezes` 03:17 |
| valódi forgalom | 3 felhasználó, 1 cég, az utolsó bizonylat 2026-09-15 |

Vagyis a Free **kvótái** meg sem közelítőek — a kérdés nem a méret, hanem
kizárólag a **felfüggesztés**.

**A két költségalak** (a Supabase saját számlázási dokumentációjából, nem
becslés: Pro 25 USD/szervezet + ~10 USD/projekt Micro compute − 10 USD
compute-kredit):

| | Pro díj | Compute | Kredit | Havonta |
|---|---|---|---|---|
| **a `Leltarium` már fizetős szervezetébe átvive** | 0 (már fizetve) | 10 | 0 (a `leltarium` elhasználta) | **~10 USD** ⬅️ **a te döntésed** |
| a `szamlafolyo` egy **saját** szervezetben | 25 | 10 | −10 | **25 USD** |
| a **mostani** szervezet Pro-ra | 25 | 20 | −10 | **35 USD** |

A felfüggesztett `havio-penzugy` egyik alakban sem kerül pénzbe: *„Paused
projects do not count towards Compute usage."*

**Az első sor a választott irány**, és aritmetikailag helyes: a 25 USD Pro-díjat
az a szervezet már fizeti, a 10 USD compute-kreditet pedig a `leltarium` már
elhasználja — a `szamlafolyo` így csak a saját Micro compute-ját teszi hozzá.

> ⚠️ Két dolgot ez a sor nem tud megmérni, mert a `Leltarium` szervezetét a
> jelenlegi Supabase-hozzáférésem **nem látja** (a `list_organizations` egyedül a
> `Free projects`-et adja vissza). Az átvitel előtt ezt a kettőt ott kell
> megnézni: (1) a szervezet csomagja **Pro vagy Team**, (2) a **Spend Cap**
> állása — kikapcsolt spend cap mellett a túlhasználat felső határ nélkül
> számlázódik, bekapcsolt mellett viszont a túllépés **korlátozást** hoz.
>
> És a kimondandó ár, amit a 25 helyett 10 USD-ért fizetünk: a `szamlafolyo`
> **sorsközösségbe kerül a `leltarium`-mal**. A Fair Use korlátozás (lejárt
> számla, lejárt kártya, spend cap melletti tartós túlhasználat) a Supabase saját
> szövege szerint *„generally applied to all projects of the restricted
> organization"* — vagyis egy másik projekt számlázási baja megállíthatja az
> éles rendszert is. Ez nem ellenérv, csak a különbség neve.

### A kockázat, amit ezzel vállalunk — pontosan, nem ijesztgetve

A dokumentáció szövege szűkebb, mint ahogy a tervben eddig szerepelt:

> A Free plan project is considered inactive if it does not receive sufficient
> **user database activity** over the past week. […] Typically a few user
> requests to the database each day over the previous week is enough to keep the
> project from being paused.

Két dolgot érdemes ebből kiolvasni:

1. ⚠️ **A percenkénti `szamlafolyo-sor` cron nem bizonyítottan véd.** Az a
   `pg_net`-en át valóban HTTP-kérést küld a projekt saját végpontjára, de hogy
   ez „user database activity"-nek számít-e, arra **nincs kiadott garancia**, és
   innen nem is mérhető — csak egy valódi csendes hét döntené el. Nem építünk rá.
2. **Van előzetes figyelmeztetés**: a Supabase a felfüggesztés előtt nagyjából
   egy héttel levelet küld a projekt tulajdonosának, és a felfüggesztés után is.
   Ez a valódi háló, amíg Free-n vagyunk — feltéve, hogy az a cím olyan
   postafiók, amit **olvasol is**. Felfüggesztés után 90 nap áll rendelkezésre a
   visszaállításra, adatvesztés nélkül.

Amit a Free így is elvesz, és amit érdemes tudni: **nincs automatikus mentés**
(a Pro napi mentést ad 7 napos megőrzéssel), és a naplók **1 napig** maradnak
meg a Pro 7 napja helyett — ez utóbbi minket konkrétan érint, mert az Edge
Function-hibák utólagos felderítése ebben a projektben végig naplóból ment.

### A kiváltó esemény — mikortól nem halasztható tovább

Bármelyik ezek közül, és a halasztás véget ér:

- **az első fizető előfizető** (a Stripe-kör élesítése);
- az e-mailes beküldés címének kiadása bárkinek rajtad kívül;
- **egy felfüggesztési figyelmeztető levél** a Supabase-től.

### A kör egyetlen kódváltozása: `.env.example`

A fájl 154–158. sora ma egy mondatban említi a Pro-emelést. Az állítás **igaz
marad**, csak szegényebb, mint amit most tudunk — és pont az a fajta hely, ahol
ez a projekt a dashboard-csapdákat tartja (a Vercel `Config` kontra `Secret`
története is itt él).

A mondat helyére egy rövid, mért blokk kerül:

- **a Supabase szervezetre számláz, nem projektre** — ezért a kérdés nem „Pro
  vagy nem", hanem **„melyik szervezet"**;
- a három költségalak a fenti táblázat szerint, és hogy **a választott út a
  `Leltarium` már fizetős szervezetébe való átvitel (~10 USD/hó)**, a
  sorsközösség kimondott árával együtt;
- **a projektátvitel előfeltételei** (a Supabase kiadott listája): a
  forrásszervezetnek (`Free projects`) tulajdonosa vagy, a célszervezetnek
  legalább tagja, **nincs aktív GitHub-integráció** a projekten, nincs
  projekt-hatókörű szerepkör, és nincs log drain. A projekt **ref-je
  (`mwveyzyxupgccqdnbpwe`) és minden URL változatlan marad** — az átvitel csak
  azt dönti el, melyik szervezet számlájára kerül, tehát a Vercel
  környezeti változóihoz, a Resend webhookjához és az Edge Function-címekhez
  **nem kell hozzányúlni**;
- **a régió nem változik**: *„project transfers […] cannot be used to transfer
  between different regions"* — a `szamlafolyo` Frankfurtban marad, tehát az
  Adatkezelési tájékoztató 5. pontja sértetlen. Ez nem mellékes: egy régióváltás
  jogi szövegmódosítás volna;
- ⚠️ **a compute Nano marad** a Free-ről emelt projekteken, és a Pro azt is
  Micro áron számlázza. A Nano→Micro váltás **újraindítással jár**, tehát csendes
  időszakban való — de ingyen több erőforrást ad;
- **a Spend Cap maradjon bekapcsolva** (alapból az): különben a túlhasználat
  felső határ nélkül számlázódik. Ugyanaz az elv, amiért az OpenRouter és nem a
  Vertex AI lett a modellszolgáltató — *ami nincs a számlán, azt nem tudja
  elkölteni*;
- a kiváltó események listája fentről.

Ez az **egyetlen** fájl, ami változik. Nincs migráció, nincs Edge
Function-telepítés, nincs felületi változás.

> Ha inkább azt szeretnéd, hogy ez a kör **semmit** ne írjon a repóba, és a mérés
> maradjon a tervben: az is rendben — szólj, és a `.env.example` érintetlen marad.

### Verifikáció

- `npm test`, `npm run typecheck`, `npm run build` — nem érintett kódút, de a
  kör nem zárul le zöld nélkül;
- a blokk minden állítása visszavezethető a fenti mérésre vagy a Supabase kiadott
  dokumentációjára; szám nincs benne, ami ne onnan jönne;
- **amikor az átvitel sorra kerül**, a bizonyíték innen mérhető:
  `list_projects` → a `szamlafolyo` **`ACTIVE_HEALTHY`**, és az
  `organization_id` már a `Leltarium` szervezeté; `get_organization` arra az
  azonosítóra → `"plan": "pro"`; végül egy `execute_sql` a `cron.job`-ra, hogy a
  **két ütemezés** átvitel után is a helyén van. A dashboard kimenetét nem
  hisszük el — ez a PLACEHOLDER-eset szabálya.
  > Ha az átvitel után a `list_organizations` továbbra sem látja a célszervezetet,
  > az a hozzáférés hatóköre, nem hiba — akkor a `list_projects` sorának
  > `organization_id`-ja a bizonyíték.

### Amit ez a kör nyitva hagy — kimondva

- **Az átvitel a `Leltarium` szervezetébe**, a te időzítésedre várva. Az irány
  eldőlt, csak a pillanat nem — a Stripe-kör **előtt** vissza kell térni rá.
- A **hat Stripe árazonosító** cseréje (a configban a régi árakat hordozzák).
- A repó ↔ éles adatbázis **ékezet-elcsúszása** (33 politikanévből 31 ASCII-ra
  hajtva).
- Változatlanul: szerveroldali helykorlát, `/fiok-torles`, a `kiolvas.bundle.js`
  + `csomagol.mjs` nyugdíjazása, beágyazott XML, `kiolvasas:proba`.

---

## ✅ A Stripe-gerinc megvan és mérve van (`1115095`)

### Context

A Stripe-kör négy dolgot ölelt fel (előfizetés, túlhasználat, szerveroldali
helykorlát, `/fiok-torles`), és ez **egy körnek túl nagy falat** volt. A
felosztás megtörtént, és a döntésed a **gerinc**: checkout + webhook. A
tesztelés **sandboxban** megy, élesbe semmi nem kerül ki ebben a körben.

### Két mérés, ami átrendezte a kört, mielőtt kód született volna

1. **A Stripe MCP ebben a munkamenetben él** — a korábbi tervdarab azt írta,
   hogy nem használható. Mindkét fiók látszik: `acct_1UCME2V05U28wfjz` (éles,
   írásra **nem** jogosult a kapcsolat) és `acct_1UCMEoV05xTzbt9V` (sandbox,
   írható).

2. **A hat éles árazonosító jó volt.** A terv ⚠️-je — hogy a dashboardos
   árátírás új `price` objektumokat hozott létre, tehát a configban a *régi*
   árak azonosítói állnak — **feltevés volt, nem mérés**. Mind a hat
   változatlan, `active`, és pontosan a 4900/9900/19900 Ft-ot és az 50/40/30
   Ft-os darabárakat hordozza. Az éles fiókban **pontosan hat** aktív ár van,
   duplikátum nincs. A tervezett csere tehát elmaradt, mert fölösleges volt.

### Amit viszont a sandbox-döntés felszínre hozott

Az árazonosító **fiókhoz kötött** — a különbség magában a betűsorban is
látszik (`…V05U28wfjz…` kontra `…V05xTzbt9V…`). Hat beírt azonosító mindig csak
az egyik fiókban ér valamit; a másikban csendben ismeretlen csomag lenne belőle.

Ezért a config innentől a Stripe **`lookup_key`**-eit tartja
(`szamlafolyo_{start,flow,pro}_{havi,extra}`), és **egyetlen árazonosító sincs
a repóban**. Hogy melyik fiókban futunk, azt egyedül a `STRIPE_SECRET_KEY`
titok dönti el.

| | Állapot |
|---|---|
| sandbox hat ára | ✅ mind a hat címkézve, visszaolvasva |
| éles hat ára | ⬜ dashboard-lépés — a kapcsolat élesre csak olvas |
| két elárvult sandbox ár (archivált termékeken) | érintetlen, `lookup_key: null` |

### Az ÁFA: a repó megválaszolta, nem kellett kérdezni

`Nyitolap.tsx:854` és az adószám (`92220155-**1**-30`) is kimondja: a
szolgáltató **alanyi adómentes**, az árak a fizetendő végösszegek. Tehát a
Stripe `tax_behavior` nem döntés, hanem nem-kérdés: **a Stripe Taxot nem
kapcsoljuk be**. (Az éles árakon `unspecified`, a sandboxban `inclusive` áll;
automatikus adószámítás nélkül ez nem változtat a terhelt összegen. A mező
**egyszer állítható**, ezért nem bolygatjuk.)

⚠️ Amit a terv sehol nem sorolt fel, és ide tartozik: **a Stripe nyugtája nem
magyar számla.** A NAV Online Számla adatszolgáltatáshoz magyar
számlázóprogram kell. Nem kódkérdés, de az első fizető ügyfél előtt el kell
dőlnie.

### Ami elkészült

**Tiszta, tesztelhető magok (31 új teszt):**

- `shared/uzleti/stripe/alairas.ts` — a Stripe aláírása **három ponton** tér el
  a Svixétől: az aláírt szövegben nincs benne az esemény azonosítója, a kivonat
  hex és nem base64, és a titok **teljes betűsora** a HMAC-kulcs, a `whsec_`
  előtaggal együtt (a Svixnél levágjuk és base64-ből dekódoljuk). Aki a meglévő
  modult másolná ide, annál csendben soha nem egyezne — **külön teszt méri ezt
  a csapdát**. A mérőszámot nem a saját kódunk gyártja: `openssl` és
  `node:crypto` egymástól függetlenül ugyanazt adta.
- `shared/uzleti/stripe/esemeny.ts` — mit írjunk egy eseményből. Négy szabály:
  `null`-t soha egy ismert érték fölé; az esemény ideje **vízjel**; az
  ismeretlen eseménytípus nem hiba; a cégazonosítót nem a kérésből hisszük el.
  ⚠️ A ciklus dátumait a **tételről és az előfizetésről is** olvassa: az újabb
  API-verziókban elköltöztek, és a hiba csendes volna — a ciklus `null`
  maradna, a keret pedig a cég születésétől számolna.

**Szerveroldal** (`20260919000100_stripe_elofizetes.sql`, **alkalmazva és
mérve**): `stripe_lookup_key` és `stripe_event_at` oszlop,
`stripe_allapot_frissit()` és `stripe_ugyfel_rogzit()` — mindkettőt csak a
`service_role` hívhatja, és az `authenticated` nyolc írható oszlopa közé
**egyik új sem** került be.

**Edge Functionök** (megírva, **telepítésre várnak**): `stripe-checkout`
(`verify_jwt = true`, csak tulajdonos, és elutasít, ha már fut előfizetés —
enélkül egy második checkout **második** előfizetést hozna létre ugyanannak a
cégnek) és `stripe-webhook` (`verify_jwt = false`, a harmadik ilyen végpont).

**Felület:** Előfizetés kártya a Beállításokon. A gombok nem írnak semmit, a
Stripe oldalára visznek; a `?fizetes=kesz` udvariasság, nem állapot.

### A mérés, ami megtörtént

| Mit | Eredmény |
|---|---|
| teljes tesztkör | **444 teszt** (+32), tiszta typecheck és build |
| böngésző (Playwright, mockolt hálózat) | **20 állítás**, négy állapotban: próbaidő és futó előfizetés, tulajdonos és szerkesztő, 390 és 1280 képponton |
| SQL, visszagörgetett tranzakcióban | vízjel áll (régebbi esemény **nem** ír, a státusz marad); részleges esemény **nem nullázza** a kulcsot és a ciklust; ügyfél/cég ütközés elutasítva; ismeretlen ügyfél `nincs_ceg`; a kétszeri ügyfél-lefoglalás az **első** azonosítót adja vissza |

A böngészős próbában a „Flow" felirat külön bizonyít valamit: a `lookup_key` →
csomag feloldás végigment a `keret.ts`-en az új oszloppal.

---

## ➤ Most következő lépés: a gerinc élesztése **sandboxban**

Kódmunka **nincs benne**. Ez a kör a telepítésről és a mérésről szól — és a
PLACEHOLDER-eset szabálya szerint a telepítés után **azonnal mérünk**, nem a
`status: ACTIVE` mezőt hisszük el.

### ✅ A telepítés megtörtént, és mérve van (2026-09-19)

A próba a **`szamlafolyo.hu` domain alatt** megy, nem helyben — tehát a
`success_url`/`cancel_url` production-re mutatása nem gond, és nem is kell
hozzányúlni.

| Amit ellenőriztem | Eredmény |
|---|---|
| `stripe-checkout` | **v1**, `verify_jwt: true`, forrás-entrypoint |
| `stripe-webhook` | **v1**, `verify_jwt: false`, forrás-entrypoint |
| a másik öt függvény | `updated_at` változatlan — egyiket sem írta felül a telepítés |
| az élő JS-csomag (`index-OIfBwdON.js`) | „Előfizetés", „Kiválasztom", „Átirányítás", „tulajdonosa indíthatja", „alanyi adómentes", `stripe-checkout` ✅; a `?fizetes=` **mindkét ága** nyersen visszaolvasva; a régi árak (1 990 / 4 990 / 9 990) **nincsenek** benne |
| sandbox webhook végpont | cím pontos, `status: enabled`, és **pontosan** a négy figyelt esemény |
| **éles** webhook végpont | **nulla** — nincs mód rá, hogy éles titok keveredjen a Supabase-be |
| `companies` | még nincs ügyfél, nincs előfizetés — fizetés nem történt |

⚠️ **A végpont `api_version`-je `2026-08-26.dahlia`.** Ez közvetlenül megerősíti
azt a csapdát, ami ellen az `esemeny.ts` védekezik: ebben a verzióban a
számlázási ciklus **az előfizetés tételén** áll, nem az előfizetésen. A modul a
tételt olvassa előbb — a fizetési próba ezt méri majd élesben.

> Egy saját mérési hiba, javítva: elsőre a `fizetes=kesz` betűsorra kerestem az
> élő csomagban, és „hiányzik"-ot kaptam. A kódban ez **két külön literál**,
> összefűzve sosem szerepel — a hiba a keresésben volt, nem a kódban.

### Ami még hátravan a fizetés előtt

**1. Életjel a webhookra — ezt én csinálom**, `pg_net`-tel az adatbázisból (ez a
környezet nem éri el a `*.supabase.co`-t):

- egy **rossz aláírású** POST → a saját magyar **401** `{"hiba":"Érvénytelen
  aláírás."}`-unk. Ez egyszerre bizonyítja, hogy a csomag bootol (a
  `@supabase/supabase-js` és a két `shared/uzleti/stripe/` modul feloldódott az
  Edge Runtime alatt) **és** hogy a kapu áll;
- egy `GET` ugyanide → `405 {"hiba":"Csak POST."}`.

Nulla bájtot ír, nulla forintba kerül.

⚠️ Amit ez **nem** bizonyít: hogy a `STRIPE_WEBHOOK_SECRET` a *helyes* titok.
Azt csak egy valódi, a Stripe által aláírt esemény dönti el — ha a titok téves,
minden esemény 401-et kap, a Stripe újrapróbálkozik, és a cég sora üres marad.
Ez a fizetési próbában fog kiderülni, és a javítás egy titok-újramásolás.

**2. A fizetés — ez a tiéd.** `szamlafolyo.hu` → Beállítások → egy csomag →
Stripe teszt-bankkártya: `4242 4242 4242 4242`, bármilyen jövőbeli lejárat és
CVC, tetszőleges név és irányítószám.

### A mérés — ezt innen csinálom, a telepítés után

1. **`list_edge_functions`**: mindkét függvény megvan, a `verify_jwt` a
   `config.toml` szerinti (checkout `true`, webhook `false`), és a többi öt
   függvény verziója **nem változott**.
2. **Olcsó életjel a webhookra**, `pg_net`-tel az adatbázisból (ez a környezet
   nem éri el a `*.supabase.co`-t): egy **rossz aláírású** POST a végpontra
   **401**-et kell kapjon. Ha 401 jön, a függvény bootolt **és** a kapu áll; ha
   időtúllépés, azonnal látszik, és nulla adat sérül. Egy `GET` ugyanide a saját
   magyar `405 {"hiba":"Csak POST."}` válaszunkat adja.
3. **Végponttól végpontig, nálad** — ez a valódi próba: Beállítások → egy
   csomag → **Stripe teszt-bankkártya** (`4242 4242 4242 4242`, bármilyen
   jövőbeli lejárat és CVC). Utána innen mérem:

```sql
select stripe_status, stripe_lookup_key, stripe_price_id,
       current_period_start, current_period_end, stripe_event_at
from public.companies;
```

   A bizonyíték: `stripe_status = 'active'`, a `stripe_lookup_key` a választott
   csomagé, a ciklus **nem null** (ez méri a fejlécben leírt „a dátumok
   elköltöztek" csapdát élesben), és egy `activity_log` sor
   `elofizetes.valtozott` művelettel. A Beállításokon a Keret kártya a csomag
   nevét és keretét mutatja.
4. **Idempotencia és a vízjel élesben**: a Stripe dashboardjáról az esemény
   újraküldése (`Resend`) — a cég sora **nem változik**, és a webhook 200-at ad.

### Ha elromlik

A telepítés visszafordítható: mindkét függvény új, tehát a visszaállás a
törlésük. A migráció tisztán bővítő (két nullázható oszlop és két új függvény),
élő adatot nem érint — a `keret.ts` a `stripe_lookup_key` nélkül ugyanúgy
próbaidőt számol, ahogy eddig.

### Amit ez a kör nyitva hagy — kimondva

- **Az éles fiók hat `lookup_key`-e** és az éles webhook — a `.env.example`-ben
  lépésről lépésre kiírva. Ezekhez akkor nyúlunk, ha a sandbox végigment.
- **2. szelet: számlázási portál** (csomagváltás, lemondás, kártyacsere) — és
  vele a **`/fiok-torles`** kijárata, mert a törléshez a lemondás is hozzátartozik.
  A Beállítások kártyája ma e-mail címet ad helyette, és ezt ki is mondja.
- **3. szelet: szerveroldali helykorlát** — a `ferMegTag()` ma csak a felületen
  fog. Stripe-független, bármikor beszúrható.
- **4. szelet: túlhasználat** — `overage_charges` + `invoice_item` a ciklus
  végén. A tábla megvan, egyetlen sor sem írja.
- **A NAV-számlázás** kérdése (fent).
- **Egy apró ismétlés, amit észrevettem, de nem javítottam**: az
  `info@szamlafolyo.hu` cím két helyen él — `src/lib/kornyezet.ts`
  (`kapcsolatEmail`) és `src/oldalak/jogi/adatok.ts` (`szolgaltato.email`). Ma
  egyeznek. Külön, apró kör.
- Változatlanul: a Supabase-átvitel a `Leltarium` szervezetbe (**az első éles
  fizetés előtt**), a repó ↔ éles adatbázis ékezet-elcsúszása, a
  `kiolvas.bundle.js` nyugdíjazása, beágyazott XML, `kiolvasas:proba`.

---

## ✅ A gerinc végigment élesben — és egy hiba, amit ez tanított (`96edf7a`)

### Az első fizetés félig ment át

2026-09-19, sandbox, a `szamlafolyo.hu` domain alatt. Az ügyfél- és az
előfizetés-azonosító beíródott, a státusz, a csomag és a ciklus `null` maradt:
**a felhasználó fizetett, és próbaidőn maradt.**

A napló kimondta, mi történt:

```
16:47:56.844  POST /rpc/stripe_allapot_frissit
16:47:56.902  POST /rpc/stripe_allapot_frissit      ← 58 ms-mal később
16:47:57.335  „A Stripe-esemény nem frissített: regi_esemeny"
```

Két esemény érkezett egyszerre, nem összemérhető órákkal:

| Esemény | Stripe-ideje | Mit hordoz |
|---|---|---|
| `checkout.session.completed` | **16:47:56** | csak ügyfél- és előfizetés-azonosító |
| `customer.subscription.created` | **16:47:55** | státusz, csomag, ár, ciklus |

A checkout nyerte a versenyt, a vízjelet a **saját, későbbi** idejére állította,
és ezzel a nála régebbi előfizetés-eseményt **teljes egészében** elutasította.

> Egy pontosítás a saját diagnózisomhoz: elsőre 16:47:53-at mondtam az
> előfizetés-eseményre — az az *előfizetés objektum* születése. Magának az
> **eseménynek** az ideje 16:47:55 volt (a beírt vízjelből látszik). A verseny
> egy másodperces volt, nem három; a következtetés változatlan.

### A tervezési hiba, és a helyes szabály

Az eredeti vízjel azt feltételezte, hogy **minden esemény ugyanarról beszél**,
tehát az idejük összemérhető. Nem így van: a két eseményfajta **más mezőkről**
szól, és egy checkout-esemény, ami a státuszhoz hozzá sem nyúl, nem
mérgezheti meg a státusz vízjelét.

> **A vízjel az ELŐFIZETÉS ÁLLAPOTÁT őrzi.** Amelyik esemény nem hoz
> `stripe_status`-t, az nem mozdítja a vízjelet, és nem is akad fenn rajta.

A feltétel pontosan a két eseményfajtát választja szét, nem véletlenül: a
`checkoutbol()` soha nem ad státuszt, az `elofizetesbol()` pedig mindig —
státusz nélkül `kihagy`-ot ad vissza.

⚠️ Ha valaha kerül ide olyan eseményfajta, ami előfizetés-állapotot hoz
**státusz nélkül**, ez a feltétel csendben rossz oldalra sorolná. Akkor a
vízjel-jelzést a tiszta modulnak kell kimondania, nem a mezők jelenlétéből
következtetni. Ez a `20260919000200` migráció fejlécében is ott áll.

A migráció a **megmérgezett vízjelet** is visszaállítja ott, ahol áll, de
előfizetés-állapot soha nem érkezett — enélkül az újraküldés sem segítene.
A webhook-függvényt **nem kellett újratelepíteni**: a szabály az SQL-ben él.

### A mérés, visszagörgetve — a valódi sorrenddel és időbélyegekkel

| Lépés | Eredmény |
|---|---|
| checkout (16:47:56) | ír, de a vízjel **NULL marad** |
| előfizetés (16:47:55, **régebbi**) | **beír** — ez bukott el élesben |
| valódi régi állapot-esemény (16:40) | `regi_esemeny`, státusz marad — **a vízjel továbbra is véd** |
| újabb állapot-esemény (17:10) | ír, és a korábbi csomagot **nem nullázza** |
| kései checkout-ismétlés (18:00) | nem mozdítja a vízjelet, nem ront el semmit |

### A második fizetés: a teljes életciklus, kézi beavatkozás nélkül

Lemondás **azonnalira** (nem a ciklus végére — különben a státusz `active`
marad, és a `stripe-checkout` szándékosan elutasítja a második indítást), majd
új előfizetés egy **másik** csomagra:

| Idő | Esemény | Előfizetés | Státusz |
|---|---|---|---|
| 16:47:57 | checkout lezárult | `sub_…QdV0` | — |
| 16:56:40 | előfizetés aktív | `sub_…QdV0` | `active` (Start) |
| 16:58:51 | az előfizetés megszűnt | `sub_…QdV0` | `canceled` |
| 16:59:23 | előfizetés aktív | **`sub_…bhV0`** | `active` (**Flow**) |
| 16:59:24 | checkout lezárult | `sub_…bhV0` | — |

Végállapot: `active`, `szamlafolyo_flow_havi`, ciklus 2026-09-19 → 2026-10-19,
és a **Stripe-ügyfél ugyanaz maradt** (`cus_VI1TEOrv02gf21`) — a cégnek egy
ügyfele van a Stripe-ban, két előfizetéssel a történetében.

A vízjel **16:59:22** maradt (az előfizetés-esemény saját ideje), pedig a
checkout egy másodperccel később futott le. Pontosan ez a javítás.

> **Amit ez NEM bizonyít, kimondva:** ebben a körben a sorrend fordított volt
> az eredeti hibához képest (előbb az előfizetés-esemény ért célba). Az eredeti
> versenyhelyzet nem ismétlődött meg — az véletlenszerű, melyik nyer. A
> versenylogikát a fenti, visszagörgetett SQL-próba méri determinisztikusan; ez
> a futás azt igazolja, hogy a lánc végpontól végpontig tiszta és a
> csomagváltás átmegy.

Amit külön figyeltem, és **nem** következett be: a lemondott előfizetésnek nem
érkezett kései eseménye a friss `active` után. A vízjel cégre szól, nem
előfizetésre — ha egy régi előfizetés eseménye az újénál későbbi időbélyeggel
érkezne, visszaírná `canceled`-re. Ez a kockázat megmarad, csak most nem sült
el.

### A `dahlia` csapda élesben igazolva

A `current_period_end` **beíródott** (2026-10-19). Ez az érték a végpont
`api_version`-jében (`2026-08-26.dahlia`) **az előfizetés tételén** ül, az
előfizetésen nincs is ott. Ha a modul csak az előfizetést nézte volna, itt
`null` állna, és a keret a cég születésétől számolt volna — egy fizető
ügyfélnek csendben dupla keretet adva.

---

## ➤ Most következő kör: a 2. szelet — számlázási portál + `/fiok-torles`

A gerinc áll, a következő darab a Stripe **Customer Portal**: csomagváltás,
lemondás, kártyacsere — ma mindezt a Beállítások kártyája egy e-mail címmel
helyettesíti, és ezt ki is mondja. Vele jön a **`/fiok-torles`** kijárata, mert
a fiók törléséhez az előfizetés lemondása is hozzátartozik (a jogi szövegek ezt
három helyen ígérik, a képernyő pedig ma helyőrző).

A tapasztalat a gerincből, ami ide is érvényes: a portálon végzett változás
**ugyanazon a webhookon** jön vissza (`customer.subscription.updated` /
`deleted`), tehát a beíró út kész — az új munka a portál-munkamenet indítása és
a felület.

---

## ✅ A 2. szelet első fele: a számlázási portál (`96621a7`)

A beíró út tényleg kész volt — a portálon végzett változás ugyanazon a
webhookon jön vissza. Az új munka a portál-munkamenet indítása és a felület.

### Amit a portál konfigurációjának mérése hozott, és amitől ez nem csak gombozás

A sandbox portál-konfigurációja (`bpc_1UCOdX…`) **mérve**, nem feltételezve:

| Beállítás | Érték |
|---|---|
| csomagváltás | bekapcsolva, `default_allowed_updates: ["price"]` |
| **lemondás** | bekapcsolva, **`mode: "at_period_end"`** |
| kártyacsere, számlatörténet | bekapcsolva |
| arányosítás | `proration_behavior: "none"`, a ciklus horgonya változatlan |
| `default_return_url` | **nincs** — tehát a `return_url` kötelező minden munkamenetnél |

A második sor a lényeg. **A ciklus végére szóló lemondás nem státusz**: a
Stripe a `status`-hoz hozzá sem nyúl (marad `active`), a csomag és a ciklus is
marad — egyedül a `cancel_at` töltődik ki. A mai oszlopainkban ez **nyom
nélkül** ment volna át:

1. a felhasználó lemond a portálon,
2. visszatér a Beállításokra, és ugyanazt a futó csomagot látja,
3. azt hiszi, nem sikerült — és lemond még egyszer, vagy ír egy levelet.

Ugyanaz a hibaosztály, amit végig irtunk: nem hibaüzenet keletkezik, hanem
**majdnem működés**.

### A szabály, ami ebből lett

> **A `stripe_cancel_at` az egyetlen mező, aminek a `null`-ja is beírandó.** A
> „mégsem mondom le" ugyanolyan érvényes hír, mint a lemondás — és azt egy
> `coalesce` csendben elnyelné.

A megoldás nem az értéken múlik, hanem a **kulcs jelenlétén**
(`20260919000300`):

```sql
stripe_cancel_at = case
    when valtozas ? 'stripe_cancel_at' then (valtozas->>'stripe_cancel_at')::timestamptz
    else c.stripe_cancel_at
  end
```

Így a checkout-esemény — ami ezt a kulcsot soha nem küldi — nem tudja letörölni
a portálon leadott lemondást. Ugyanaz a védekezés, mint a vízjelnél, a másik
irányból: ott az számított, hogy egy esemény mit **nem tud**, itt az, hogy mit
**mond ki**. A tiszta modulban ez az 5. szabály (`esemeny.ts`), és a típus
kényszeríti ki: a `toltsd()` — ami a `null`-t kihagyja — ezt a kulcsot nem is
fogadja el.

### A mérés, visszagörgetve

| Lépés | Eredmény |
|---|---|
| portálos lemondás (17:30) | ír · `statusz=active` · `cancel_at=2026-10-19` · vízjel 17:30 |
| **kései checkout-esemény** (17:31) | ír · a `cancel_at` **megmarad** · a vízjel nem mozdul |
| régi állapot-esemény (16:30) | `regi_esemeny` · a lemondás érintetlen — **a vízjel az új mezőt is védi** |
| a lemondás visszavonása (17:32) | ír · `cancel_at=NULL` |

A cég sora utána változatlan. Az alkalmazott függvény törzse **ujjlenyomatra
egyezik** a repóbelivel (`md5` a megjegyzések és a szóközök nélkül) — ez az a
lépés, ami a kézzel átmásolt SQL csendes elgépelését fogná meg.

### A felület

40 böngészős állítás, hét állapotban, 390 és 1280 képponton — köztük: a
lemondás-sáv a dátummal; a portálgomb valóban **POST**-tal hívja a függvényt és
a kapott URL-re navigál; a régi `info@szamlafolyo.hu` kerülőút **eltűnt**; a
szerkesztő se portált, se csomagváltást nem lát; és a portálgomb ott van annak
is, akinek **már nem fut** előfizetése — a számlái attól még ott vannak.

> Egy saját mérési hiba, javítva: a kattintós esetben előbb kattintottam, aztán
> olvastam a lap szövegét — vagyis a céloldalét. A mérő hibája volt, nem a kódé.

### Amit ez a kör szándékosan nyitva hagy

- **A portál viselkedése a repóból nem látszik.** Konfiguráció-azonosítót
  szándékosan nem adunk meg (az ugyanúgy fiókhoz kötött lenne, mint az
  árazonosító), tehát a fiók alapértelmezett beállítása dönt. A `.env.example`
  ezt kimondja, és élesben külön dashboard-lépés.
- ⚠️ **A csomagváltáshoz a portálon ki kell jelölni a termékeket.** A sandbox
  konfigurációjának API-válaszában a `subscription_update.products` **nem
  szerepel**. Ez lehet a dashboardon kezelt alapértelmezett konfiguráció
  sajátossága, de **nem mértem meg** — az első valódi portálnyitás dönti el. Ha
  a „Csomag módosítása" mögött nincs mire váltani, ez az ok.
- **Arányosítás nincs** (`proration_behavior: "none"`): aki a ciklus elején vált
  Pro-ra, a nagyobb keretet azonnal megkapja, és a különbözetet csak a
  fordulónapon fizeti meg. Ez a te dashboard-döntésed, most csak felírom.
- **A vízjel továbbra is cégre szól, nem előfizetésre** — változatlan kockázat.

---

## ➤ Most következő kör: a `/fiok-torles`

A 2. szelet másik fele. **Szándékosan nem került ebbe a körbe**, és ez nem
elmaradás: a fiók törlése visszafordíthatatlan művelet, aminek legalább öt
külön döntése van (mi törlődik és mi marad meg, mi lesz a futó előfizetéssel,
mi a többi taggal, van-e türelmi idő, és mit ígér róla a három jogi szöveg).
Egy ilyet a portál mellé csapva vagy a portál lenne elnagyolt, vagy a törlés —
ugyanaz a „nagy falat" szabály, ami a Stripe-kört négyfelé vágta.

Ami a mai helyzet: a `/fiok-torles` **helyőrző** (`VazlatAlkalmazasban`), a
jogi szövegek viszont három helyen ígérik. A portál ehhez megvan — a lemondás
ott már elvégezhető —, tehát a törlés köre most tisztán a törlésről szólhat.

### ✅ A portál élesben: a csomagváltás átment (2026-09-19, sandbox)

Flow → Start, a portálon. Amit a mérés mutat:

| | |
|---|---|
| `stripe-portal` | **v1**, `verify_jwt: true`, forrás-entrypoint |
| csomag | `szamlafolyo_start_havi`, ár `price_1UGf9x…` (a Start ára) |
| **a ciklus** | **2026-09-19 16:59 → 2026-10-19 16:59 — nem mozdult** |
| vízjel | 17:23:21, a naplósor 17:23:29-kor |

A harmadik sor az, ami külön értéket ad: a portál konfigurációjából mért
`billing_cycle_anchor: "unchanged"` **élesben is igazolódott** — a csomagváltás
nem indítja újra a számlázási ciklust, tehát a keret sem kezdődik elölről.

⚠️ **Amit ez a csomagváltás nem érintett, de tudni kell**: a lefelé váltás a
keretet **azonnal** csökkenti (200 → 50), miközben a ciklus marad, és
arányosítás sincs. Aki addigra már 50 fölött járna, a váltás pillanatában
kereten kívülre kerülne — a `keretMondat()` ezt ki is mondaná („Elfogyott a
havi kereted… Válts nagyobb csomagra"). Most nulla volt a felhasználás, tehát
nem sült el. Ez nem hiba, hanem a `proration_behavior: "none"` következménye;
felírva, hogy ne mérésből kelljen újra felfedezni.

### ⛔ Egy hiányos telepítési utasítás — az enyém

A csomagváltás azért ment át, mert azt a kódutat nem érintette a kör. A
**lemondás viszont még mindig nem látszana**: a telepített `stripe-webhook`
forrását visszaolvasva a benne lévő `esemeny.ts` **a négyszabályos, régi
változat** — nincs benne `stripe_cancel_at`, és a legfrissebb naplósor
`context`-jében sincs ott a kulcs.

Az ok egyszerű, és nem a Supabase-é: a webhook a **tiszta modult importálja**,
tehát a `shared/uzleti/stripe/esemeny.ts` változása **a webhook
újratelepítését is** megköveteli. Én egyetlen parancsot adtam
(`stripe-portal`), pedig kettő kellett volna.

> A tanulság a folyamatra: ha egy kör a `shared/uzleti` alatt módosít, a
> telepítési lista **minden olyan függvény**, ami azt a modult importálja — nem
> csak az, amelyik újonnan készült.

### ✅ A lemondás élesben — a rés bezárult

A webhook újratelepítése után, a portálon leadott lemondás (2026-09-19 17:26):

| Mező | Érték |
|---|---|
| `stripe_status` | **`active`** — pontosan ahogy a mérés ígérte: a Stripe hozzá sem nyúl |
| `stripe_cancel_at` | **2026-10-19 16:59:19** |
| `current_period_end` | 2026-10-19 16:59:19 — a kettő **egyezik** |
| vízjel | 17:26:42 |
| napló | „Az előfizetés állapota: active (szamlafolyo_start_havi), **lemondva 2026-10-19-ig**" |

Ez az a pont, ami e nélkül a kör nélkül **nyom nélkül** maradt volna: a státusz
változatlan, a csomag változatlan, a ciklus változatlan — a lemondás egyedül az
új oszlopban látszik. A felületen a sáv a helyes dátumot mondja, és a keret
tényleg megmarad (a `keret.ts` a `cancel_at`-ot szándékosan nem nézi: aki
kifizette a hónapot, annak jár a hónap).

⚠️ **Egy apróság, amit a napló mutatott**: a Stripe **két** `subscription.updated`
eseményt küldött a lemondásra, 212 ezredmásodperc különbséggel (két külön POST,
mindkettő 200 — az edge-naplóból mérve). Mindkettő ugyanazt írta, tehát kár
nincs: a vízjel `<=` feltétele szándékosan átengedi az azonos idejű
újraküldést, épp az idempotencia kedvéért. A látható következmény annyi, hogy a
cég naplójában **két azonos sor** áll.

Ez nem hiba, csak zaj. Ha zavar, egy külön apró kör megoldja: a
`stripe_allapot_frissit` meg tudná mondani, hogy **ténylegesen változott-e**
bármi (`is distinct from` a régi értékekre), és a webhook csak akkor írna
naplósort. Az eseményazonosító naplózása ugyanitt jönne — ma a naplóból nem
derül ki, melyik Stripe-esemény írta a sort.

### ✅ …és a visszavonás: a `null` is átment (17:28:45)

Ez volt az utolsó ág, ami eddig csak visszagörgetett SQL-ben látszott:

| Mező | Érték |
|---|---|
| `stripe_cancel_at` | **`null`** — törlődött, nem „maradt, ahogy volt" |
| `stripe_status` | `active`, a csomag `szamlafolyo_start_havi` |
| `current_period_end` | 2026-10-19 16:59:19 — érintetlen |
| napló | „Az előfizetés állapota: active (szamlafolyo_start_havi)" — a „lemondva" **eltűnt** a mondatból |

Ezzel a kör szabálya végig **élesben** is igazolt: a `stripe_cancel_at` az
egyetlen mező, aminek a `null`-ja is beíródik, és ezt a hívó oldalon a **kulcs
jelenléte** intézi, nem az értéke. Ha a `coalesce` alak maradt volna, a lemondás
visszavonható lett volna a Stripe-nál, de a rendszerünk örökre lemondottnak
látná a céget.

Mellékes megfigyelés: a **visszavonásra egyetlen** esemény érkezett, a
lemondásra kettő. A duplázás tehát a lemondás sajátja (a Stripe a
`cancellation_details`-szel együtt küld még egyet), nem általános.

### A teljes életciklus, végponttól végpontig mérve

| Idő | Mi történt | Hol dőlt el |
|---|---|---|
| 16:59 | checkout → `active`, Flow | Stripe Checkout |
| 17:23 | csomagváltás Flow → **Start**, a ciklus nem mozdul | portál |
| 17:26 | lemondás a ciklus végére — `status` marad `active` | portál |
| 17:28 | a lemondás **visszavonva**, `cancel_at` → `null` | portál |

A 2. szelet első fele ezzel kész: telepítve, mérve, és minden ág látott valódi
eseményt.

---

## ✅ A 2. szelet másik fele: a `/fiok-torles` kijárata (`28bff13`)

A repó legrégebbi kimondott adóssága a felület oldalán: három jogi szöveg
ígérte, a képernyő helyőrző volt.

### A szabályt nem én találtam ki — a szövegek már leírták

Ez a kör ezért volt gyors: az ÁSZF 5. pontja mondja ki az egyetlen tiltást, a
9. az azonnali hatályt, a 10. és az Adatkezelési 4. pontja a véglegességet. A
két nyitott kérdést (fut-e még kifizetett időszak; legyen-e türelmi idő) te
döntötted el, és **mindkettő a jogi szöveg mai ígérete lett** — tehát a
szövegeken csak azt kellett javítani, ami a hiányzó képernyőről szólt.

### Négy kimenetel, egy tiszta modulból

`shared/uzleti/fiokTorles.ts` (16 teszt), és ugyanazt futtatja a böngésző és az
Edge Function — ha a kettő széttartana, a felhasználó **egy másik műveletre
mondana igent, mint ami lefut**.

| | Mi történik |
|---|---|
| `nincs_ceg` | csak a fiók szűnik meg |
| `kilepes` | a fiók megszűnik, **a cég adatai maradnak** |
| `ceggel` | a fiók és a cég mindene megszűnik |
| `tiltva` | az egyedüli tulajdonos, akire mások is számítanak (ÁSZF 5.) |

### Amit a kaszkád intéz — mérve, nem feltételezve

⚠️ Ezt egyszer **rosszul** állítottam: az `information_schema` elrejtette az
`auth` sémát, és abból arra jutottam, hogy nincs idegen kulcs az `auth.users`-re.
A `pg_constraint` megmutatta az igazat:

- `company_members.user_id` → **CASCADE**: a fiók törlése viszi a tagságot;
- `files.uploaded_by`, `exports.created_by`, `documents.approved_by`,
  `document_corrections.corrected_by`, `activity_log.user_id` → **SET NULL**.

Vagyis a kilépés ága **szinte magától helyes**: a cég adata marad, a személyes
kapcsolat elvágódik. Kézzel csak az maradt, amit semmilyen idegen kulcs nem
visz: a tárolóban lévő fájlok (a Storage nem ismeri az idegen kulcsainkat) és a
`company_invites.email`, ami sima szöveg.

### A sorrend, és miért pont ez

Stripe-lemondás → tároló → cégsor → fiók. Nem stiláris: minden lépés
megszakadhat, és a sorrendet az szabta meg, milyen állapotot hagy hátra egy
félbemaradt futás. A lemondás azért első, mert az az egyetlen lépés, ami
**pénzt** érint és amit nem mi tartunk nyilván — ha az elbukik, inkább ne
töröljünk semmit. Egy törölt fiók mellett tovább terhelt bankkártya a lehető
legrosszabb kimenetel. Mind a négy lépés újrafuttatható, és a következő futás a
már elvégzettet kihagyja (a lemondás előbb **megnézi** az előfizetés állapotát).

### A mérés

- 464 teszt (+16), tiszta typecheck és build;
- **32 böngészős állítás nyolc állapotban**, 390 és 1280 képponton: a gomb a
  helyes név beírásáig tiltva; rossz névre nem indul semmi; a kilépés ágán pipa
  van cégnév helyett és **nem** ígér bizonylat-törlést; a tiltott eset
  megmondja, miért; a futó előfizetésnél kiírja a hátralévő napokat;
- az RPC **valódi adaton**, visszagörgetve: munkamenet nélkül `{"vanCeg": false}`,
  `anon` szerepnek `permission denied`;
- az alkalmazott függvény törzse ujjlenyomatra egyezik a repóbelivel.

> Két piros a böngészős körben **a mérő hibája** volt, nem a kódé: az
> `addInitScript` minden navigációnál visszaírta a JWT-t (tehát a záróüzenetet
> belépve mértem), és a cég nélküli esetben a tagság-mock még adott céget. A
> záróüzenet külön, munkamenet nélküli mérést kapott.

### Amit élesben most látni fogsz

A saját fiókodra a tények: `tagokSzama: 2`, `masikTulajdonos: false`, szerep
`tulajdonos` — tehát a képernyő **nemet fog mondani**, és a meghívott tag
eltávolítását vagy egy másik tulajdonos kijelölését fogja kérni. Ez nem hiba:
pontosan az ÁSZF 5. pontja.

### Amit ez a kör nyitva hagy

- **Nincs „kilépek a cégből, de a fiókom marad" művelet.** Ma ezt a tulajdonos
  tudja elvégezni (tag eltávolítása). Külön, apró kör lehet belőle.
- A törlés **nem** ír naplósort a megmaradó cégbe a kilépés ágán — a tagsági sor
  a kaszkáddal elszáll. Ha kell nyom, azt külön kell beírni a törlés előtt.

### ✅ A törlés élesben — 2026-09-20, végrehajtva a saját fiókon

A felhasználó eltávolította a tagot (ezzel a `tiltva` ág feloldódott), majd
végigvitte a teljes törlést. Amit utána mértem:

| Amit néztem | Eredmény |
|---|---|
| `public` séma mind a 11 táblája | **0 sor** — cég, tagság, bizonylat, kiolvasás, fájl, export, napló, meghívó, levél, túlhasználat, javítás |
| `storage.objects` | **0** — mindkét bucket üres |
| a saját `auth.users` sora | **nincs** |
| a Stripe-előfizetés | **`canceled`**, `canceled_at = ended_at` → **azonnali**, nem a ciklus végére |
| a Stripe-ügyfél és a számlák | **megvannak** — ez a számviteli megőrzés, ahogy a szöveg ígéri |

A `canceled_at` és az `ended_at` egyezése a bizonyíték arra, hogy a törlés
**azonnal** mondott le, nem a fordulónapra — pontosan az ÁSZF 9. pontja, és
pontosan az, amiben a portál lemondásától különbözik.

Külön érdemes kimondani, mert a kaszkádból következik, de meglepetés lehet: a
`document_extractions` **is elment**. Máshol ez a tábla szándékosan túléli a
dokumentumot (abból számol a keret), itt viszont nincs már mit számolni — a cég
maga szűnt meg.

#### Ami megmaradt, és miért helyes

**Két cég nélküli fiók**: `krisztian.nyeste@centervill.net` (09-15) és
`foinacomputer@gmail.com` (09-16). A tag eltávolítása szándékosan **nem** törli
a felhasználó fiókját — az a saját fiókja, nem a cégé. Mindkettő beléphet, és a
cégfal a `/ceg-letrehozas`-ra viszi; ha meg akarnak szűnni, a most elkészült
képernyő `nincs_ceg` ága pontosan erre való. (Ez egyben az egyetlen ág, ami
élesben még nem futott le.)

#### A gyakorlati következmény

Az adatbázis **üres**, és a törléssel a fejlesztői fiók is elment. A nyilvános
regisztráció szerveroldalon zárva (`disable_signup: true`), tehát a következő
belépéshez vagy a Supabase dashboardján kell fiókot nyitni (Authentication →
Users → Add user, „Auto Confirm User" bepipálva — ugyanaz a lépés, mint a
legelején), vagy a két megmaradt fiók valamelyikével belépni.

---

## ✅ 3. szelet: szerveroldali helykorlát (`cbdf1b8`)

A `ferMegTag()` eddig **csak a felületen** fogott, és ezt a saját fejléce ki is
mondta. Ez a kör azt a mondatot törölte.

### Két pont, két szabály — és miért nem ugyanaz

| Hol | A feltétel |
|---|---|
| `meghivot_letrehoz()` | tagok + **függő meghívók** < max |
| `meghivot_elfogad()` | tagok < max |

A függő meghívó **foglalás**: kiküldéskor számít, különben öt meghívóval át
lehetne lépni egy kétfős csomagot, és a túllépés csak a meghívottnál derülne ki.
Elfogadáskor viszont már nem — aki két embert hívott egy szabad helyre, az
elsőt ne büntesse a második meghívó léte.

⚠️ **Az elfogadás ága a fontosabb, és nem a megkerülésről szól.** Egy meghívó
akkor is elfogadható maradt, ha a cég közben **kisebb csomagra váltott** — a
portálon ez két kattintás, és a 2. szelet óta bárki megteheti. A felület ezt nem
tudja megelőzni: abban a pillanatban a meghívott gépe fut, nem a tulajdonosé, és
a taglétszámot az RLS előle elrejti. Ez a szabály ezért **csak SQL-ben** él.

### A két igazság gondja — és hogy miért nem kommentárral oldottuk meg

A fejszámok a `config/szamlafolyo.ts`-ben születnek, az SQL-nek viszont tudnia
kell őket: a szabály ott ér valamit, ahol az írás történik (ezt a Stripe-vízjel
köre tanította meg). A csendes elcsúszást a **`config/hely.test.ts`** fogja meg
— az a migrációs fájlból olvassa ki a tényleges `when … then` ágakat, és
összeveti a configgal.

A tesztet **szándékosan megbuktattam** (Flow 5 → 8), mert egy teszt, ami sosem
bukott meg, nem mérőeszköz. Az üzenet: *„A(z) Flow fejszáma a configban 5, az
SQL-ben 8. … a nyitólap az egyiket hirdeti, a meghívó a másikat kényszeríti ki."*

### A mérés — visszagörgetve, valódi fixtúrákkal

| Ág | Eredmény |
|---|---|
| próbaidő fejszáma | 3 |
| 2 meghívó próbaidőn (1 tag + 2 függő = 3) | átment |
| a **harmadik** meghívó | elutasítva |
| **újraküldés ugyanarra a címre** | **átment** — a saját foglalását felszabadítja |
| Start fejszáma | 2 |
| elfogadás 1 tag mellett | átment (1 < 2) |
| meghívó betelt cégbe | elutasítva |
| **Flow-n kiküldve → Start-ra váltva → elfogadás** | **elutasítva**, a tulajdonoshoz irányítva |
| Pro (korlátlan) | `NULL`, ugyanaz a meghívó átment |

A negyedik sor nem volt betervezve, és ez lett volna a legkönnyebb regresszió: a
„küldd újra" ugyanarra a címre egy betelt cégben soha nem menne át, ha az
ellenőrzés a régi meghívó visszavonása **elé** kerül. Ezért áll utána.

Mind a négy függvény törzse ujjlenyomatra egyezik a repóbelivel.

### ✅ Eldőlt: a NAV-számlázás kézzel, Billingóval

Hónapok óta nyitott kérdés volt („a Stripe nyugtája nem magyar számla"), és a
felhasználó döntése: **kézi számlázás a Billingóval**. Bekerült a
`.env.example` Stripe-blokkjába, a kimondott következménnyel: a rendszer **nem
tartja nyilván**, melyik Stripe-fizetésről készült már számla, és nem is
emlékeztet rá. Egy „kiszámlázva" jelölő akkor lesz indokolt, ha a kézi kör
terhessé válik.

---

## ➤ Ami a Stripe-körből hátravan

**4. szelet: a túlhasználat.** Az `overage_charges` tábla az első migráció óta
ott van, és **egyetlen sor sem írja**. A darabárak a configban élnek (50/40/30
Ft), a plafon cégenként (`overage_limit_ft`), a kapcsoló a Beállításokon — a
számlázó út hiányzik: a ciklus végén `invoice_item`-et kell írni a Stripe-nál.

Ami ehhez már megvan: a keretszámolás tudja, mikor van túlhasználat
(`keret.tulhasznalatban`), a ciklus dátumai a cég során ülnek, és a webhook
minden ciklusfordulót lát.

⚠️ A NAV-döntés ezt **érinti**: ha a túlhasználat is Stripe-on át számlázódik,
arról is kézi Billingo-számla kell majd.

**Élesítés előtt, változatlanul:** a Supabase-projekt átvitele a `Leltarium`
fizetős szervezetbe, az éles fiók hat `lookup_key`-e, az éles webhook végpont és
a portál bekapcsolása az éles fiókban.

---

## ✅ 4. szelet: a túlhasználat (`d20acd1`)

Az `overage_charges` tábla az első migráció óta üresen állt. A kör három dolgot
zárt le — és a legnagyobb **nem** a hiányzó számlázás volt.

### 1. A plafon eddig dísz volt

A `keret.ts` döntése `mehet: !elfogyott || overage_enabled` volt; az
`overage_limit_ft` oszlopot **egyetlen sor sem olvasta**. Közben két nyilvános
szöveg is ígérte:

- Beállítások: *„a lent megadott forintösszegig. Afölött megállunk."*
- Nyitólap: *„az általad megadott forintos határig: váratlan számla nem érhet."*
- ÁSZF 8.: *„A plafon elérése után a feldolgozás megáll."*

Vagyis a bekapcsolt túlhasználat **nyitott végű engedély** volt. Az új
`shared/uzleti/tulhasznalat.ts` teszi igazzá mindhármat; a jogi és marketing
szövegeken emiatt **nem kellett javítani** — a kód ért utol egy ígéretet.

A tesztet szándékosan megbuktattam a régi szabállyal: két állítás vált pirosra.

### 2. Próbaidőn a kapcsoló zárva — szerveroldalon is

A felhasználó kérése. Nem elég a felületen: az `overage_enabled` oszlopra a
tulajdonosnak **írási joga van a REST API-n át** (`20260914000100`).

**Trigger, nem `check` kényszer** — és ez mérés eredménye: egy `check` a már
bekapcsolt túlhasználatú cégnél a *lemondás beírását* is elutasítaná, mert a
webhook ott `stripe_status = 'canceled'`-et ír. A trigger csak az
**átbillenésre** szól.

A meglévő beállítást nem billentjük át csendben: aki előfizetőként bekapcsolta,
annál a kapcsoló bekapcsolva marad az előfizetés megszűnése után is. Nem hat
semmire, és újra-előfizetéskor a saját korábbi döntése áll vissza.

### 3. A számlázó út: `invoice.created`

**Mért tény, nem feltevés** (Stripe doksi): *az Invoice mindig az **előző**
időszakra szól, a rajta lévő előfizetés-tételsor viszont a következőre.* Tehát
a lezárult időszakot maga a számla mondja meg — nem kell a saját
ciklusállapotunkra hagyatkozni, ami versenyhelyzet volna a
`customer.subscription.updated`-tel szemben.

⚠️ **A `dahlia` API-verzión a paraméter `pricing[price]`, nem `price`.**
Megmérve az API leírásában. Egy sima `price=` nem hibaüzenetet adna, hanem ár
nélküli tételt — ugyanaz a csendes csapda, mint a ciklusdátumok elköltözése.

**Egy számítás, két irány.** Ugyanaz a `tulhasznalatSzamol()` mondja meg, hogy
beengedjünk-e még egy bizonylatot (a `kiolvas` fékje) és hogy mennyit
számlázzunk (a webhook). Csak a kapott időszak más.

**Sorrend:** rögzítés → Stripe-hívás → az azonosító beírása. Egy félbemaradt
futás pontosan a befejezetlen munka listáját hagyja: `stripe_invoice_item_id is
null`. Ugyanaz az elv, mint a selejtezésnél.

### Két aszimmetria, kimondva

| | Keretszámolás | Számlázás |
|---|---|---|
| **ismeretlen csomagkulcs** | a legkisebb csomag kerete (szigorúbb irány) | **nem számlázunk** — ugyanez *többet* számlázna |
| **a plafonon átnyúló irat** | a fék „fér-e még egy kredit"-et kérdez, az oldalszámot a claim előtt nem ismeri | `szamlazhatoDarab` a plafonra vágva — a különbség a felhasználó javára |

### A mérés (visszagörgetve, tíz ág)

```
1. tulhasznalat BE probaidon        : elutasitva
2. tulhasznalat BE elofizetesen     : atment
3. lemondas beirasa (mar bekapcsolt): atment      ← a `check` itt bukna
4. tulhasznalat KI probaidon        : atment
5. ismeretlen ugyfel                : NULL
6. felhasznalt az ablakban          : 60  (az ablakon kivuli 999 nem szamit)
7. elso rogzites                    : uj=true  kreditek=10 forint=500
8. masodik rogzites (mas szamokkal) : uj=false kreditek=10 forint=500, ugyanaz az id, 1 sor
9. szamlazva elso hivas             : true
10. szamlazva masodszor             : nem irt felul (tetel=ii_elso)
```

Mind a négy függvény törzse **bájtra és md5-re egyezik** a repóbelivel.

> Egy saját mérési hiba, javítva: elsőre a `length(prosrc)`-ot hasonlítottam
> bájtszámhoz. A Postgres `length()`-e **karaktert** számol — az ékezetes
> kommentek miatt három függvény „eltérőnek" látszott, pedig az md5 mind a
> négyen egyezett. `octet_length()` a helyes.

### Mellékesen: a negyedik példány

A `('active','trialing','past_due')` lista az új triggerrel **négy** SQL-helyen
él. A `keret.ts` ezért mostantól exportálja (`FUTO_ALLAPOTOK`), és egy
drift-teszt a migrációs fájlokból olvasva méri az egyezést — a `config/hely.test.ts`
mintájára, de **minden** példányra.

> Az első, szűkebb regexem a saját új triggeremet nem látta
> (`coalesce(...) not in`), és némán háromra csökkent a mért példányok száma.
> Ezért áll alatta a „tényleg talál-e egyáltalán" állítás — nulla találatra
> nulla állítás bukna meg.

### ⚠️ A telepítési lista — HÁROM függvény, nem egy

A `keret.ts` megváltozott, és azt **három** Edge Function importálja. Ha csak a
webhookot telepítenénk, a plafon a feldolgozási kapukon **nem fogna**:

```bash
npx supabase functions deploy stripe-webhook  --project-ref mwveyzyxupgccqdnbpwe
npx supabase functions deploy kiolvas         --project-ref mwveyzyxupgccqdnbpwe
npx supabase functions deploy email-bekuldes  --project-ref mwveyzyxupgccqdnbpwe
```

Ez a portál-kör tanulsága, alkalmazva: ha egy kör a `shared/uzleti` alatt
módosít, a telepítési lista **minden** függvény, ami azt a modult importálja.

### Ami elkészült a repón kívül

- A **sandbox webhook végpont** (`we_1UCOKOV05xTzbt9V43kRMq3n`) mostantól az
  `invoice.created` eseményre is feliratkozott — öt esemény. A válasz nem
  hozta vissza a titkot (az csak létrehozáskor jön).
- A migráció **alkalmazva**, ujjlenyomattal ellenőrizve.
- Az éles fiókban **továbbra sincs** webhook végpont.

### Amit ez a kör nyitva hagy — kimondva

- ⚠️ **A megszűnt előfizetés záró időszaka nem számlázódik ki.** Lemondás után
  nincs több ciklusforduló, tehát `invoice.created` sincs. A tévedés iránya a
  felhasználó javára dől, és az elmaradt összeg látszik: `overage_charges` sor
  üres `stripe_invoice_item_id`-vel. Kimondva a `.env.example` 6. pontjában.
- **Az újraküldésnek ablaka van**: a piszkozat számla kb. egy óra múlva
  véglegesül, utána a `szamlabol()` kapuja `kihagy`-ot ad. A Stripe az első
  újrapróbálkozásokat perceken belül intézi, tehát a gyakorlatban elég.
- **Nulla sort nem rögzítünk** — az ablak zárt, az újraszámolás determinisztikus.
- **A `stripe()` fetch-segéd három példányban** él (checkout, portal, webhook).
  Ha negyedik lesz, `supabase/functions/_kozos/` a válasz.
- **Élesben még semmi nem futott le**: a kódút valódi ciklusfordulót nem látott.
  Az első valódi mérés egy sandbox ciklusforduló lesz — vagy egy Stripe
  test clock.

### Élesítés előtt, változatlanul

Supabase-projekt átvitele a `Leltarium` fizetős szervezetbe · az éles fiók hat
`lookup_key`-e · az éles webhook végpont (**öt** eseménnyel, az
`invoice.created`-del együtt) · a portál bekapcsolása az éles fiókban.

### ✅ A három telepítés megtörtént és mérve van (2026-09-20 08:10 UTC)

Nem a telepítő kimenetét hittem el — ez a PLACEHOLDER-eset szabálya.

| Amit ellenőriztem | Eredmény |
|---|---|
| verziók | `stripe-webhook` **v3**, `kiolvas` **v13**, `email-bekuldes` **v7** |
| `verify_jwt` | webhook `false`, kiolvas `true`, email-bekuldes `false` — mind a `config.toml` szerint |
| a másik hat függvény | `updated_at` **változatlan** — egyiket sem írta felül a telepítés |
| a telepített fájlok a repóhoz mérve | **bájtra azonosak** mind a háromban (`keret.ts`, `tulhasznalat.ts`, `osszeg.ts`, `esemeny.ts`, `config`, és a webhook `index.ts`-e) |
| a plafon-fék sora a telepített `keret.ts`-ben | megvan mind a háromban |
| `stripe-webhook` életjel (rossz aláírású POST) | **401** `{"hiba":"Érvénytelen aláírás."}` |
| `email-bekuldes` életjel (GET) | **401** `{"hiba":"Érvénytelen aláírás."}` |
| `kiolvas` a telepítés **után** (cron 08:11, 08:12, 08:13) | **200** `{"feldolgozva":[]}` — az `unpdf` feloldódott |

A `stripe-webhook` csomagjában ott a `shared/uzleti/tulhasznalat.ts` — egy
fájl, ami a kör előtt nem is létezett. Ez a döntő jel: a portál körében pont
az derült ki a visszaolvasásból, hogy a webhook a **régi** `esemeny.ts`-t
vitte, mert csak a `stripe-portal`-t telepítettük.

**Ami ettől még nem futott le: maga a számlázás.** A kódút valódi
ciklusfordulót nem látott. Az első éles mérés egy sandbox ciklusforduló lesz,
vagy egy Stripe **test clock** (az a gyorsabb: előreugratja az órát, és a
`invoice.created` valódi eseményként érkezik).

---

## ✅ A túlhasználat számlázása lefutott — test clockon, valódi eseményből (2026-09-20)

A `d20acd1` kör egyetlen nyitva hagyott tétele volt: *„élesben még semmi nem
futott le"*. Most lefutott.

**A felállás**: egy test clock, rajta **három** ügyfél — egy léptetés, három
esemény, három külön ág. A felhasználás szintetikus `document_extractions`
sorokból, nulla AI-költséggel. A cégsorok az előfizetések **előtt** készültek,
hogy a státuszt és a ciklust a webhook maga írja be.

| Cég | Csomag | Plafon | Használt | Túl | Számlázva | Számla |
|---|---|---|---|---|---|---|
| A | Start | alap (10 000 Ft) | 62 | 12 | **12 → 600 Ft** | 4 900 + 600 = **5 500 Ft**, `paid` |
| B | Flow | **500 Ft** | 215 | **15** | **12 → 480 Ft** | 9 900 + 480 = **10 380 Ft**, `paid` |
| C | Start | alap | 30 | 0 | **nincs sor** | egyetlen soros számla |

### Amit ez bizonyított, és eddig csak papíron állt

1. **A `pricing[price]` tényleg árat ad.** A tételsor `price_details.price`-a a
   `szamlafolyo_start_extra` (`unit_amount_decimal: "5000"`), `quantity: 12`,
   `amount: 60000`. Egy sima `price=` itt ár nélküli tételt hagyott volna,
   hibaüzenet nélkül.
2. **A két időszak aszimmetriája, egy számlán egymás alatt**: a mi sorunk
   09-20 → 10-20 (a lezárult hónap), az előfizetés sora 10-20 → 11-20.
3. **A plafon vág**: B-nél 15 ment a kereten felül, 12 lett számlázva.
4. **Nulla sort nem rögzítünk**: C-nek se `overage_charges` sora, se tétele.
5. **Az ablakszűrő**: mindhárom cégnek volt egy 500 kredites kontrollsora a
   ciklus **előtt** — a nyersanyag 62/215/30-at adott, nem 562/715/530.
6. **Az első számla kihagyása** ingyen jött: C `subscription_create` számláján
   `period_start == period_end`, és a kapunk kihagyta.
7. **Idempotencia**: az `invoice.created` újraküldése után ügyfelenként
   **pontosan egy** `invoiceitem`, az `overage_charges.updated_at` nem mozdult,
   és nincs duplikált naplósor.

### ⚠️ A legfontosabb: a versenyhelyzet nem elméleti, és a rossz irányba dőlt

| Idő (valós) | Mi történt |
|---|---|
| 13:08:24 | a cég sorába beíródott az **új** ciklus (10-20 → 11-20) |
| 13:08:25.97 | a túlhasználat kiszámolva és rögzítve, `period_start` = **09-20** |

A `customer.subscription.updated` **megelőzte** az `invoice.created` feldolgozását.
Ha a lezárult időszakot a saját cégsorunkból olvasnánk, az imént kezdődött,
**üres** hónapra számláztunk volna nullát. A számlából olvasva a helyes hónap
jött. Ez a `esemeny.ts` 6. szabályának eddigi „versenyhelyzet **volna**"
megfogalmazását mért ténnyé tette — a docblock javítva (`8229e79`).

### A piszkozat-ablak: pontosan egy óra

`automatically_finalizes_at` = a számla létrehozása **+ 3600 másodperc**, nem
„nagyjából egy óra". A teljes utunk másodpercek alatt lefut benne. A
`webhooks_delivered_at` a létrehozás idejével egyezik — a test clock megvárta a
kézbesítést, mielőtt továbblépett.

### A kör kódváltozása: két docblock (`8229e79`)

Viselkedés nem változott, csak két becslés lett mért tény (a fenti kettő).
493 teszt zöld, tiszta typecheck és build.

⚠️ **Következmény a telepítésre**: a `shared/uzleti/stripe/esemeny.ts`
megváltozott — kizárólag kommentben. A telepített három függvény ettől
**viselkedésben azonos** marad, de a „telepített fájlok bájtra egyeznek a
repóval" ellenőrzés mostantól eltérést mutat erre az egy fájlra. Nem sürgős;
a következő telepítéskor szinkronba kerül.

### Takarítás

A három cég, 310 kiolvasás, 2 terhelés és 8 naplósor törölve — az adatbázis
újra **üres** (0/0/0/0). A Stripe-oldali objektumokat a **test clock törlése**
viszi egy mozdulattal; az óra `clock_1UHkPVV05xTzbt9Vinko7g35`.

### Amit a Stripe MCP-kapcsolatról megtudtunk

Két külön korlát, és a hibaüzenetek **alakja** választotta szét őket:

- `PostTestHelpersTestClocks` → *„does not have the required permissions"* —
  a művelet megvan, a `billing_clock_write` jog hiányzik;
- `PostTestHelpersTestClocksTestClockAdvance` → *„is not available"* — **nincs
  is kiajánlva**, tehát a jog megadása sem segítene.

Ügyfelet és előfizetést viszont írhatunk (`No such ...` válasz hibás
azonosítókra, nulla létrejött objektummal). A test clock felállítása és
léptetése ezért marad dashboard- vagy CLI-lépés.

---

## ✅ Látogatásmérés — a nyilvános tölcsérre szűkítve (`e8f3ba2`)

A Vercel Web Analytics bekapcsolása után a beépítés kérése érkezett. A kör
nem az lett, aminek indult: a kód mellett **két jogi mondatot** is javítani
kellett, mert a kapcsoló átbillentésével azonnal valótlanná váltak.

### Amit a felderítés talált

| Hol | Mit ígért | Állapot a kapcsoló után |
|---|---|---|
| Adatkezelési **2.** | „A weboldalon **nincs látogatásmérő**… nincs mihez hozzájárulni." | valótlan |
| Adatkezelési **7.** | „Külső betűszolgáltatót, **látogatásmérőt** és hirdetési kódot nem használunk." | valótlan |

A második példányt csak `grep` találta meg — emlékezetből kimaradt volna.

### A veszély, ami miatt ez nem egy `<Analytics />` sor

Az útvonaltáblában **három** cím hordoz titkot vagy ügyféladatot:

- `/meghivo/:token` — a token **bemutatóra szóló kulcs**: aki ismeri, beléphet
  a cégbe;
- `/jelszo-beallitas` — a helyreállító token a URL **horgonyában** érkezik
  (`#access_token=…`), a Supabase kliense szedi ki onnan;
- `/ellenorzes/:id` — bizonylatazonosító.

A `beforeSend` egy teljes **URL**-t kap, és hogy abba a lekérdezés és a horgony
beleszámít-e, azt **nem a telepített csomag dönti el**: az csak betölti a
`/_vercel/insights/script.js`-t és átadja neki a függvényt. Az összeállítás a
távoli scriptben történik, amit innen nem látunk — tehát nem feltételezzük,
hanem felülírjuk.

### A megoldás: fehérlista, nem feketelista

`src/lib/analitika.ts` — csak a nevesített nyilvános címekről indul esemény
(nyitólap, jogi hármas, bejelentkezés, regisztráció, elfelejtett jelszó).
Minden más `null`, tehát **el sem indul**.

Az irány indoka: egy feketelista némán romlik el. Aki jövőre felvesz egy
azonosítót hordozó útvonalat, annak eszébe kellene jutnia, hogy ezt a fájlt is
bővítse — nem fog. Megfordítva a szabály magától tart: **egy új útvonal
alapértelmezésben néma.**

A lekérdezés és a horgony nincs „szűrve": a címet magunk állítjuk össze
(`origin` + tiszta `pathname`), tehát egy `#access_token=…` nem attól tűnik el,
hogy gondoltunk rá.

### A mérés

**29 teszt**, és mindkét irányban megbuktatva próbálva:

| A rontás | Eredmény |
|---|---|
| `/beerkezo` felvétele a fehérlistára | **2 piros** („a belépés mögötti /beerkezo nem megy ki") |
| a teljes `href` visszaadása a tiszta cím helyett | **4 piros**, köztük a horgony-teszt: `…/aszf#access_to…` |

Köztük egy **elcsúszás-őr**, ami az `App.tsx` útvonaltáblájából olvas: minden
mért útvonalnak léteznie kell a táblában, és minden paraméteres útvonalnak
némának kell lennie. Alatta a „talál-e egyáltalán" állítás — a
`FUTO_ALLAPOTOK` körének leckéje.

Böngészőben 16 állítás két szélességen (390/1280), JS-hiba nélkül.

### Egy mérés, ami a jogi szöveget igazolta

A 7. pont azt állítja, hogy a böngésző nem keres meg idegen kiszolgálót. Ez
**mérve igaz az éles csomagra**: a `detectEnvironment()` a Vite optimalizálása
után feltétel nélkül `"production"`-t ad (a `NODE_ENV`-es ág eltűnt a
bundle-ből), tehát a `va.vercel-scripts.com`-os ág holt, és a script a
`/_vercel/insights/script.js`-ről tölt. **Fejlesztői módban viszont él** — ez
a `analitika.ts` fejlécében fel van írva, hogy ne tűnjön hibának.

⚠️ Két állítás a tájékoztatóban **a Vercel kiadott leírásán** nyugszik, nem a
saját mérésünkön: hogy a mérés süti nélkül működik, és hogy nem épít tartós
azonosítót. Ez a szövegben is ki van mondva.

### Amit ez a kör nyitva hagy

- **A süti-mentesség élő ellenőrzése.** A telepítés után érdemes egy valódi
  böngészővel megnézni, hogy a nyilvános oldalak megnyitása után a
  `document.cookie` üres marad-e. Innen ez nem mérhető: a proxy a
  `szamlafolyo.hu`-t tiltja.
- **A mérés bekapcsolása nem hozott hozzájárulás-kezelést**, és a szöveg
  szerint nincs is rá szükség (nincs süti, nincs eszköztárolás). Ez az az
  állítás, amit egy jogi felülvizsgálatnak érdemes megerősítenie — a jogi
  szövegek változatlanul nem estek át ilyenen.

### ⚠️ Javítás a fenti szakaszhoz: a kiszolgált scriptet visszaolvastam (`ad1f777`)

A telepítés után lehúztam a `/_vercel/insights/script.js`-t, és ezzel **két
saját állításom avult el** a fenti szakaszban:

1. „a távoli scriptben történik, amit innen nem látunk" — **látható**, és ez
   igazolja, hogy a fehérlista nem óvatoskodás volt:

   ```js
   function e(e){let t=location.href; … return t}   // a TELJES href
   let v=a({type:t,url:p,…}); if(!1===v||null===v)return;  // a beforeSend kapu
   ```

   Szűrés nélkül tehát a `/meghivo/<token>` cím és a `#access_token=…` horgony
   **szó szerint elhagyná a böngészőt**.

2. „a süti-mentesség a Vercel leírásán nyugszik" — **mérhető**: a script nem ír
   `document.cookie`-t, munkamenet-sütit csak a `va('enableCookie')` kapcsolna
   be, amit sehol nem hívunk. A tájékoztató fejlécében most szét van választva
   a mért és az elhitt; az utóbbi egyetlen dologra szűkült (hogy a beérkezett
   adatból a kiszolgáló nem épít tartós azonosítót — az a szerveroldalon dől
   el).

**És egy negatív eredmény, ami megspórol egy hiábavaló kört:** a script kilép,
ha `navigator.webdriver` igaz vagy a user agent `Headless`-t tartalmaz. A fenti
„nyitva hagyott" pont tehát — böngészővel ellenőrizni a `document.cookie`-t —
**nem elvégezhető**: Playwrighttal akkor is „semmi sem történik" jönne ki, ha a
szűrőnk egyáltalán nem működne. A szűrő bizonyítéka az egységteszt marad.

## ✅ Gondolatjel: hosszú (—) helyett nagykötőjel (–) a látható szövegben (2026-09-23)

A tulajdonos kérése: minden látható szövegben a hosszú gondolatjel helyett rövid.
Két döntés az övé volt:

- **A jel: nagykötőjel (–)**, nem kiskötőjel (-). Ez a magyar helyesírás szerinti
  gondolatjel, és a szövegben 39 helyen (számtartományok) már ez állt.
- **A jogi szövegek új változatot kaptak** (`2026-09-23-2`), a hatálybalépés
  napja marad szeptember 23. A reggel bevezetett szabály (kiadott változat
  szövege nem változik) így ép maradt. Tartalmi változás nincs: a reggeli
  archívumban a —-t –-re cserélve karakterre a délutánit kapjuk.

### Hol cserélődött, és hol nem

A csere a TypeScript szintaxisfáján ment, tehát **csak szövegben**: karakterlánc-,
sablonliterál és JSX-szöveg, 321 helyen, plusz az `index.html` leírása és három
SQL-hibaüzenet (`tulhasznalat_ore`, `meghivot_elfogad`, `ceg_letrehozas`; az
élő függvényeken mérve pontosan ez a három volt). A diff minden sora csak a
jelben tér el az előzőtől, ezt szkript ellenőrizte.

**Nem cserélődött**, szándékosan:

- a kommentek (kb. 1400 jel) — nem látszanak;
- a `console.*` szövegei — napló;
- a `prompt.ts` és a `sema.ts` — **a modell olvassa**, egy írásjel-csere ott a
  kiolvasás bemenetét változtatná, nem a megjelenést;
- az `eszkozok/` mérőeszközei — belső riportok, ügyfél nem látja.

### Az őr

`src/gondolatjel.test.ts`: ugyanaz a szintaxisfa-bejárás, plusz minden
SQL-függvény legutolsó definíciójának kódsorai. Szándékosan elrontva mindhárom
irányban piros lett (egy JSX-szöveg, a modell-kivétel levétele, a migráció
elvétele — utóbbinál pontosan az élesben mért három függvényt jelezte).

### Telepítés

A migráció (`20260923000600_gondolatjel.sql`) a push **előtt** ment élesre: a
frontend már a `2026-09-23-2` verziót küldi, és a sora nélkül a cégalapítás
megállna. Élesben a három függvény md5-je egyezik a repóval. Az érintett Edge
Functionök: `email-bekuldes`, `fiok-torles`, `kiolvas`, `meghivo-kuld` (a
meghívólevél HTML-je), `stripe-webhook`.

## ✅ Az e-mailben érkezett bizonylat magától megjelenik — és azonnal indul (2026-09-23)

A tulajdonos tesztje: „a beküldött email lassan jelent meg a Beérkezőben". Mérve
**nem a szerver volt lassú**: a levél befogadásától (`email-bekuldes`, 4 s) a kész
bizonylatig ~5–10 s telt el. A lassúság két, egymásra rakódó hiányból jött.

### 1. A képernyő nem nézett oda

A Beérkező csak akkor kérdezte újra az adatbázist, ha a listán **már volt**
feldolgozás alatt álló sor (egy korai `return` a hurok elején). Feltöltésnél
ez nem tűnt fel — a sort a saját feltöltésed hozza létre —, az e-mailben érkező
bizonylatról viszont a böngésző nem tud. Oldalfrissítés nélkül soha nem jelent
meg.

Most a hurok mindig fut, három sebességgel (`src/lib/frissitesiUtem.ts`): 1 s
a feldolgozás első fél percében, 5 s utána, **15 s tétlenül**. Rejtett fülön
egyik ütemben sem kérdez, visszaváltáskor azonnal frissít.

### 2. A kiolvasás a percfordulót várta

A böngészős feltöltés maga indítja a `kiolvas`-t; az e-mailes út nem, a
bizonylat 0–60 s-ot várt a cronra. A tulajdonos tesztjében ez 3 s volt — mert
a levél a percforduló előtt érkezett.

Most az `email-bekuldes` minden befogadott bizonylatra meghívja a
`public.kiolvasast_indit()` SQL-függvényt, ami **a cron útját járja**
(vault-kulcs + pg_net), csak a megnevezett bizonylatra. Nem függvényből
függvénybe: az Edge Functionbe injektált service-kulcs nem az a betűsor, amit a
`kiolvas` `verify_jwt`-je bizonyítottan elfogad, és erre építeni azt jelentette
volna, hogy élesben derül ki, átmegy-e.

**Mérés visszagörgetéssel, élesítés előtt:** kész bizonylatra 0 kérés a pg_net
sorában, `feltoltve` bizonylatra pontosan 1, helyes címmel, törzzsel és JWT-vel
(`Bearer ey…`); jogok: `anon=false`, `authenticated=false`, `service_role=true`.
Élesen a törzs md5-je egyezik a repóval.

**Ami nem romolhat el tőle:** az indítás hibája nem állítja meg a levelet — a
bizonylat `feltoltve` marad, a cron felveszi —, de naplóba kerül, mert egy
csendben elbukó gyorsítást a tartalék út hónapokig eltakarhat (a böngészős út
tanulsága, `feltoltes.ts`). A kettős indítás (ez + a cron) nem gond: a claim
feltételes `UPDATE … WHERE status = 'feltoltve'`, atomikus.

### Őrök

`src/lib/frissitesiUtem.test.ts` (az ütem, és hogy a Beérkező tényleg ezt
használja, korai `return` nélkül) és `supabase/functions/email-bekuldes/inditas.test.ts`
(a hívás, a naplózott hiba, az SQL-függvény jogai). Szándékosan elrontva mind
piros: a tétlen ütem „soha"-ra állítva, a korai `return` visszatéve, a hívás
kivéve.

## ✅ Az elbukott kiolvasás nyomot hagy, azonnal újrapróbál, és nem ijeszt (2026-09-23)

Az e-mailes teszt a gyors indítás után is fél perc volt, és egy hibaüzenet
jelent meg a bizonylaton. Mérve: az azonnali indítás működött (12:12:35,7), de
az első kiolvasás elbukott, és a második a percfordulót várta.

Az okot **mi nem tudtuk megmondani**: a hibás válaszból semmit nem mentettünk.
A tulajdonos az OpenRouter naplójából hozta: a Google (Vertex) **200-as, de üres**
választ adott — 0 → 0 token, nincs `finish_reason`, $0 —, egy perccel később
ugyanaz a kérés hibátlan volt. Szolgáltatói, átmeneti hiba; nem a mi
feldolgozásunk, nem a prompt.

Három javítás, a tulajdonos döntése szerint mind:

1. **Nyom.** A `KiolvasasHiba` a válasz nyomát viszi (`ValaszNyom`:
   generációazonosító, futtatott modell, leállás oka, tokenek, teljes boríték).
   A `kiolvas` a kiolvasási sorba írja (`raw_response` = boríték,
   `model_version`, tokenek), a naplóba pedig `kiolvasas_hiba` sort
   generációazonosítóval. Az üres válasz saját üzenetet kap („A modell üres
   választ adott."). Útközben egy `catch` a `kiolvas`-ban a hibát sima
   `Error`-rá alakította — ez a nyomot is eldobta volna; kivéve.
2. **Azonnali második kísérlet**, ugyanazzal az SQL-indítóval, mint az e-mail.
   Csak az első kudarc után: a harmadik a percfordulón jön, hogy egy percekig
   tartó kiesés ne égesse el fél perc alatt mindhárom próbálkozást.
3. **Semleges jelzés újrapróbálás közben** (`src/lib/kiolvasasJelzes.ts`);
   piros csak a végleges `hiba`.

Őrök: `openrouter.test.ts` (álcázott `fetch`-csel a teljes lánc, a 09-23-i
üres válasz alakjával), `kiolvas/hibaNyom.test.ts`, `kiolvasasJelzes.test.ts`.
Szándékosan elrontva mind az öt irányban piros.

## ✅ Figyelő ablak: 5 s, amikor nézed — és a naplókeret, ami miatt nem mindig (2026-09-23)

Az e-mailes teszt ~37 s-a mérve: ~18 s a Gmail és a Resend között (nem a mi
rendszerünk), ~15 s a mi feldolgozásunk (hiba nélkül, azonnali indítással), és
**6 s a képernyőn**: a 15 s-os tétlen frissítés 0,2 s-mal lekéste a bizonylat
sorát (a böngésző kérései az API-átjáró naplójában látszanak).

A tulajdonos 5 s-ot kért, **„ha nem eszi meg a keretet"**. Mérve:

- **Vercel: nem érinti.** A kérés a böngészőből közvetlenül a Supabase-hez megy.
- **Supabase-forgalom (250 GB/hó): nem érinti érdemben.** Üres Beérkezőnél a
  válasz 2 bájt, egy sor ~0,5 KB.
- **Supabase-naplóbevitel (5 GB/hó, a számlázása most indul): ez a szűk keret.**
  Minden kérés ~4,2 KB naplósort ír, akármilyen kicsi a válasz. A mai
  alapfogyasztás ~16 MB/nap (~0,5 GB/hó). Egy napi 8 órán át nyitva hagyott
  fül: 15 s-mal ~180 MB/hó (~25 ilyen felhasználó fér a keretbe), **mindig
  5 s-mal ~530 MB/hó (~8)**.

A sima 5 s tehát nem felelt meg a feltételnek. Helyette **figyelő ablak**: az
oldal megnyitásakor, fül- vagy ablakváltáskor (`visibilitychange`, `focus`)
azonnal frissít, és 2 percig 5 s-onként néz; utána vissza 15 s-ra. A levélküldés
pont ilyen: visszajössz a Gmailből, és figyelsz. Egy ablak 24 kérés, ~100 KB.

⚠️ **A 15 s-os alapütem is fogyaszt**: ~25 egész nap nyitott fül fölött a
naplókeret betelik. Túllépésnél 0,50 $/GB (felhasználónként havi ~0,1 $), vagy
— ha a Spend Cap be van kapcsolva — korlátozás. Ha a felhasználószám erre
tart, a valós idejű értesítés (Supabase Realtime) a skálázható út: ott nincs
lekérdezgetés.

A hurok kikerült egy React nélküli függvénybe (`frissitoHurok()`), és álórával
(fake timers) fut a tesztben. Ennek volt ára: az első változatban három,
egymást átfedő őr állt a „két hurok soha" szabály mögött, és bármelyiket
kivéve a teszt zöld maradt — nem mért semmit. A felesleges réteg kiment, a
teszt pedig megkapta a két valós helyzetet, ami a megmaradt őröket igényli
(fordított sorrendben visszaérő kérések; szinte egyszerre érkező
`visibilitychange` + `focus`). Azóta mind az öt szabály külön-külön piros, ha
kivesszük.

## ✅ A dátummezők nem vágódnak le az ellenőrző képernyőn (2026-09-23)

A tulajdonos 27 colos monitoron „2026. 09. 1”-et és „éééé. hh. n”-et látott a
kelt / teljesítés / határidő mezőkben. A monitor mérete itt nem számít: az
oldal legfeljebb `max-w-6xl` (1152 px), abból a menü után a fél kártya, abból
a három oszlop – **mérve 119 px** egy dátumra, 1280 és 2560 px széles ablakban
egyaránt.

Mérve (Chromium, magyar nyelv, a buildelt CSS-sel): 120 px-en pontosan a
képernyőképen látott levágás, 130 px-en a szöveg a naptárikonba ér, **140 px-től
tiszta**. A rács ezért nem fix három oszlop, hanem `auto-fit` +
`minmax(10rem, 1fr)` (160 px: 20 px tartalék más böngészőkre). Fél kártyában
2 + 1 (186 px-es mezők), egy oszlopos elrendezésben és telefonon változatlan.

Az osztálynév egy konstansban áll (`src/lib/datumRacs.ts`), betű szerint, mert
a Tailwind a forrásból generál; a teszt a mért minimumot, az `auto-fit`-et és
azt őrzi, hogy a képernyő tényleg ezt használja – mindhárom külön-külön piros,
ha elrontjuk. Az Export dátumszűrői teljes szélességű kártyában ülnek,
asztali nézetben ~270 px-esek; ott nem volt baj.

## ✅ Jogi zárókör: egy szabály a hibás teljesítésre, és a látogatásmérés múltja kikerült (2026-09-23, `2026-09-23-3`)

A tulajdonos két kiegészítése, amivel a jogi rész lezárult.

**1. Adatkezelés 2.** Kikerült a látogatásmérés múltja (szeptember 20–23.,
Vercel Web Analytics) és a „ha egyszer újra mérnénk” figyelmeztetés. Az a
néhány nap tesztidőszak volt, előfizető nélkül: élesben mérve egyetlen cég van,
a tulajdonosé, és az a `terms_acceptances` előtt jött létre (09-20 vs. 09-22),
ezért nincs elfogadási sora. A figyelmeztetés *szabálya* a kód docblockjában él
tovább: nem feltétlenül szükséges eszköztárolás csak hozzájárulással, és a
szakasz előtte változik.

**2. ÁSZF 9., 12., 13.** A 9. pont a visszatérítés alóli kivételt *felróható*
szolgáltatói okhoz kötötte, a 13. pedig az általános hibás teljesítési
szabályokat vállalta – két szabály egy helyett, ráadásul rossz mércével. Most a
13. pont mondja ki egyszer: a szavatossági igény (kijavítás, arányos
díjleszállítás) felróhatóságtól független; a kártérítés alól a Ptk. 6:142. §
szerinti kimentés ad mentességet, és arra vonatkozik az összegszerű korlát. A
9. és a 12. pont erre hivatkozik. Ugyanezt a keveredést hordozta még két mondat,
azok is igazodtak: az adatvesztés „neki felróható” fordulata, és a 12. pont
„nem felel”-je, ami a díjleszállítást is kizárhatta volna.

Új változat, mert tartalmi: `2026-09-23-3`, a hatálybalépés napja ugyanaz. Az
archívum diffje a `-2`-höz képest pontosan ez az öt bekezdés; az impresszum
lenyomata változatlan. A `legal_versions` sora **a push előtt** került élesbe
(MCP), mert a böngésző ezt a verziót küldi a cégalapításkor.

## ✅ unpdf 0.12.1 → 1.8.1 – és a beágyazott e-számla, ami csendben eltört volna (2026-09-23)

**A mérés elkapta, ami élesben hibaüzenet nélkül ment volna el.** A pdf.js 5
(unpdf 1.x) `getAttachments()`-e már **`Map`-et** ad, és benne csak a nevet
és a leírást; a tartalmat mellékletenként a `getAttachmentContent(kulcs)`
hozza. A régi kód erre üres listát adott (`Object.entries(Map)` → `[]`), és
**minden Factur-X / ZUGFeRD számla a modellhez esett volna** – pénzért,
tízszer lassabban, hibaüzenet nélkül. A `felderites.test.ts` hat tesztje is
piros volt rá. Javítva: `csatolmanyok()` két lépésben, mellékletenkénti
hibatűréssel.

Mérve, tíz PDF-en (Chromiumban nyomtatott magyar számla 1, 3 és 30 oldalon;
csak képet tartalmazó PDF; a `minta/factur-x-szabalyos.pdf`; három pdf-lib-es
mellékletes; egy csonkolt és egy hamis PDF), a felderítés teljes kimenetét
összevetve (jelleg, oldalszám, oldalankénti szöveg hash-e, XML hash-e,
hibaüzenet, a bemenet épsége):

| Összevetés | Eredmény |
|---|---|
| Node, 0.12.1 → 1.8.1, régi kód | **3 eltérés** – mindhárom mellékletes PDF elveszti az XML-t |
| Node, 0.12.1 → 1.8.1, javított kód | 10/10 azonos |
| Node 0.12.1 ↔ **Deno 2.1.4** 0.12.1 | 10/10 azonos |
| **Deno 2.1.4**, 0.12.1 régi kód → 1.8.1 új kód | 10/10 azonos |

A Deno-verzió élesből mérve: a függvénynapló szerint `supabase-edge-runtime-1.76.0
(compatible with Deno v2.1.4)`; a Deno 2.1.4 npm-ből futott itt (eddig ebben a
környezetben nem volt Deno). A `deno check` a teljes `kiolvas`-ra mindkét
változaton hibátlan. Hidegindítás (import + első PDF, 5 futás): ~62 → ~73 ms.

Mellékhatások: a 0.12.1 opcionális natív `canvas`-lánca kiesett a lockfile-ból
(61 csomag), és vele az `npm audit` 6 találatról (1 kritikus, 3 magas) 2
közepesre ment; a Deno-oldali „lifecycle scripts" figyelmeztetés is eltűnt.

Új őr: a szövegréteg oldalankénti kinyerésére eddig nem volt teszt, pedig a
kötegszétszedő arra épül. A `tesztadat/` alá két Chromium-PDF került (három
számla oldalanként, ékezetekkel; egy csak képes), három teszttel – mindhárom
külön piros, ha az oldalak egybefolynak (`mergePages: true`), ha az ékezet
szétesik (NFD), vagy ha a küszöb elcsúszik.

⚠️ **Élesben még nincs mérve**: a `kiolvas` újratelepítése után egy valódi
PDF-es és egy Factur-X feltöltés `forras_naplo`-ja dönti el.

## ✅ A kiolvasás tokenkerete 2048 → 4096: az elszaladt gondolkodás (2026-09-23)

Az unpdf-váltás utáni élő próbán egy egyoldalas PDF első két kísérlete
elbukott. Az első egy 429-es hiba volt: a Google átmenetileg korlátozta a
modellt az OpenRouter közös keretén (*„temporarily rate-limited upstream”*),
ez nem a mi hibánk. A második **a mi keretünkbe ütközött**: 1965 token
gondolkodás a 2048-ból, `finish_reason: length` / `MAX_TOKENS`, válasz és
függvényhívás nélkül, kifizetve (~$0,01). A harmadik kísérlet ugyanazon a
fájlon 548 token gondolkodással ment át.

Az addigi 14 kiolvasásból a sikeresek kimenete legfeljebb 1194 token volt
(ebből 891 gondolkodás), tehát a 2048 papíron 1,7-szeres tartalék volt – a
gondolkodás hossza viszont nem a bizonylattól függ, hanem időnként elszalad.

A keret 4096 lett (`KIOLVASAS_MAX_TOKEN`). A rendes esetben ez semmibe nem
kerül, mert csak a legyártott tokent fizetjük; az elszaladt esetben egy
drágább, de sikeres hívás lesz belőle két fizetett kísérlet helyett. Két őr
védi, mindkettő külön piros: a konstans fedi-e a mért elszaladást a
legnagyobb válasszal együtt másfélszeres tartalékkal, és a kérés tényleg ezt
küldi-e (`max_tokens`, álfetch-csel).

⚠️ A kötegszétszedő 1024-es kerete ugyanígy ki van téve ennek, de ott a
gondolkodás **nincs mérve**: a sikertelen szétszedés csak a függvénynaplóba
kerül, és a bizonylat ilyenkor egyben olvasódik ki. Ha egyszer többbizonylatos
fájl marad szétszedetlen, ez az első gyanúsított.

## ✅ A szöveges szétszedés 30 s-os korlátot kap, és a korlát a választörzsre is vonatkozik (2026-09-23)

Élő próba (`tesztadat/harom-szamla.pdf`, `kiolvas` v26): a bizonylat 102 s-ig
állt „feldolgozás alatt". Ebből 90 s a kötegszétszedő OpenRouter-kérése volt,
amire **nem jött válasz**, és a mi időkorlátunk vágta el; utána a tartalék út
dolgozott (egyben kiolvasás, 11,7 s, `tobb_irat_gyanu`), ahogy terveztük.

Hogy mi akadt el, azt a tulajdonos OpenRouter-naplója döntötte el: 15:35:48
körül **sem a Generations, sem az Upstream Requests fülön nincs sor** – a kérés
el sem jutott a Google-ig. Helyben a kérés rendben van (4,6 KB, ugyanazok a
szolgáltatói kikötések, mint a kiolvasásé); a modell gondolkodása sem
magyarázza, mert az 1024-es keret ~160 tok/s-mal ~6,5 s alatt elfogyna.

Két javítás:

- **A szöveges szétszedés korlátja 30 s** (`koteg.szovegIdokorlatMp`). Kiegészítő
  lépés, aminek a kiesését a tartalék út kezeli; a várakozás csak késleltet. A
  fájlos szétszedés (szövegréteg nélkül a modell végiglapozza a fájlt) marad a
  kiolvasás 90 s-án, mert annak az idejét élesben még nem mértük.
- **A korlát a teljes hívásra vonatkozik.** Eddig az időzítő a fejléc
  megérkezésekor leállt, és a `valasz.json()` korlát nélkül futott: egy fejléc
  után elakadó törzs a függvényt az Edge Runtime saját határáig tartotta volna.
  Most nem ez történt (az időzítő elsült, tehát fejléc sem jött), de ugyanaz a
  hibacsalád. A hibaüzenet a másodperceket is kiírja.

Négy szándékos törés, mindegyik a saját tesztjén piros: a szétszedő nem adja át
a rövid korlátot; a hívás figyelmen kívül hagyja; a rövid korlát átszivárog a
kiolvasásra; az időzítő a fejlécnél leáll (álórával, a valódi `fetch`-hez
hasonlóan a jelre megszakadó kéréssel és törzzsel).

## ✅ A szétszedett testvérbizonylatok azonnal és párhuzamosan indulnak (2026-09-23)

A háromszámlás köteg második élő próbáján a szétszedés maga gyors volt – **3,3 s,
1807 → 157 token (100 gondolkodás), $0,002**, az első élő mérés szövegréteges
fájlon. A lassúság utána jött: a két testvérbizonylat `feltoltve` sorként a
percenkénti cronra várt, és a cron **egymás után** dolgozta fel őket (a
`for … await feldolgoz` egyetlen hívásban). A harmadik számla így ~60 s-mal a
szétszedés után indult, és csak azután, hogy a második (egy elszaladt, 39 s-os
kísérlettel) végzett.

Most a szétszedés a testvérek beszúrása és a saját tartomány beírása után
**mindegyiket azonnal elindítja** ugyanazon az SQL-indítón, mint az e-mail és
az azonnali újrapróbálás (`kiolvasast_indit`, vault-kulcs + pg_net), mindegyik
saját `kiolvas`-futást kap. A claim atomi, a cronnal való ütközés ártalmatlan,
az elbukott indítást a cron felveszi.

Plafon: legfeljebb 10 indul azonnal (`koteg.azonnaliInditasMax`), a többi a
cronra vár, mint eddig. Ez nem mérés, hanem óvatosság egy 30 darabos köteg
ellen.

⚠️ A keretellenőrzés nem atomi (lekérdez, aztán dönt), tehát párhuzamos
testvérek egyszerre is átjuthatnak rajta. Ez **nem új**: a böngészős többfájlos
feltöltés és az e-mail mellékletei ma is párhuzamosan indulnak, korlát nélkül.
A kár korlátos (legfeljebb a párhuzamos darabok száma mínusz egy bizonylat), és
ha a túlhasználat be van kapcsolva, ezek túlhasználatként számlázódnak.

Őr: `testverInditas.test.ts` (forrásszintű, mert a `Deno.serve` Node alatt nem
fut); négy szándékos törés – nincs indítás, a tartomány előtt indít, egymás
után indít, a plafon eléri a darabszám-féket – mindegyik piros.

## ✅ A szétszedés egy 429 vagy 5xx után egyszer újrapróbál (2026-09-23)

A párhuzamos indítás első élő próbáján (`kiolvas` v28, bájtra azonos a
`968e40a`-val) a szétszedő kérés **429-et kapott** (*„google/gemini-3.8-flash is
temporarily rate-limited upstream"*), és a fájl a tartalék úton egyben maradt –
**végleg**, mert a szétszedésnek nincs más újrapróbálása. Aznap ~22
modellhívásból ez volt a második 429; az első után ugyanaz a fájl 18 s múlva
átment.

Most a `KiolvasasHiba` megmondja, **átmeneti-e** (`atmeneti`): igen a 429-re,
az 5xx-re és a hálózati hibára; nem az időtúllépésre (a türelmi idő már
elfogyott, egy újabb kör megduplázná a várakozást) és nem az üres vagy
értelmezhetetlen válaszra (az a modell viselkedése – az elszaladt gondolkodás –,
amire egy azonnali újrahívás csak újra fizet). Az `atmenetiHibanUjra()`
átmeneti hibára 2,5 s múlva **egyszer** újrapróbál, és ezt naplózza
(`atmeneti_hiba_ujra`); minden más hiba és a második kudarc változatlanul
továbbmegy a tartalék útra.

Hogy a 2,5 s elég-e, azt a mérés nem bizonyítja (18 s múlva ment át); az
esélyt javítja, és egy felhasználót alig késleltet. A tartós megoldás a 429-re
a saját Google-kulcs az OpenRouterben (BYOK) – az viszont az adatkezelési láncot
és a jogi szövegeket is érinti, ezért külön döntés.

Hét szándékos törés, mindegyik a saját tesztjén piros: a 429 / a hálózati hiba
nem átmeneti; az időtúllépés átmeneti; mindenre újrapróbál; nem vár; harmadik
kört is fut; a szétszedés nem használja.

## ✅ A 200-as válaszba csomagolt 429, és egy próbafájl, ami a modellt zavarta (2026-09-23)

A `harom-szamla-4.pdf` élő próbája (`kiolvas` v29) több percig tartott, és egy
bizonylat „A modell üres választ adott." hibával állt meg. A nyers
válaszborítékok két dolgot mutattak.

**1. Az „üres válaszok" valójában 429-ek voltak.** Mindhárom
`finish_reason: "error"`, 0 token, $0 – és a választás `error` mezőjében:
`{"code":429,"message":"google/gemini-3.8-flash is temporarily rate-limited
upstream…","metadata":{"error_type":"rate_limit_exceeded"}}`. Az OpenRouter a
szolgáltató 429-ét itt **200-as HTTP-válaszban** adta vissza; a kód ezt nem
nézte, ezért lett belőle „üres válasz", ezért nem volt átmeneti, és ezért
látta a felhasználó a félrevezető szöveget. Aznap így **öt** 429 volt (kettő
HTTP-ben, három csomagolva), nem kettő.

Javítva: az `argumentumok()` előbb a választás `error` mezőjét nézi, és abból
ugyanazt a hibát adja, mint egy HTTP-429 (átmeneti a 429 és az 5xx). A
felhasználó elé magyar üzenet kerül („A kiolvasó szolgáltatás átmenetileg
túlterhelt (429)."); a szolgáltató nyers, angol szövege – benne az OpenRouter
saját ajánlatával, „add your own key…" – a `reszlet` mezőben csak az
audit-sorba és a naplóba megy. Ez a HTTP-429-es utat is javította, ami eddig
is angolul írt a Beérkezőbe.

**2. A próbafájlom zavarta a modellt.** A `harom-szamla.pdf` szándékosan
ellentmondásos (a fizetendő nem egyezik a tételekkel, az adószámok ellenőrző
számjegye rossz). Mérve rajta a gondolkodás 921–1396 token volt (valódi
számlákon 303–891), és tíz kísérletből háromszor elszaladt a keret végéig
(valódiakon egyszer). Az aznapi sebességmérések tehát részben a modell
zavarát mérték. Új fájl: `tesztadat/harom-szamla-rendes.pdf`, a JSON-jából
generálva, és a teszt azt is őrzi, hogy a saját validátorunk egyetlen mezőn
sem jelez rajta.

Ami a próbán **működött**: a 30 s-os szétszedési korlát elsült; az azonnali
újrapróbálás szétszedte a fájlt; a testvérek a szétszedés után azonnal és
egyszerre indultak.

Szándékos törések: csomagolt 429 ellenőrzés nélkül; a továbbdobás elveszti az
átmeneti jelzőt, illetve a részletet; minden csomagolt hiba átmeneti; az angol
szöveg az üzenetbe kerül; a dokumentum sora a részletes szöveget kapja; a
próbafájlban rossz adószám, elcsúszott összeg, illetve a régi PDF – mind
piros.

## ✅ A mérőeszköz méri a gondolkodás korlátozását – és az elbukott futást is (2026-09-23)

Előkészület egy döntéshez, nem döntés. Az elszaladó gondolkodás (a keret
végéig, válasz nélkül) élesben a leglassabb és legdrágább hibánk, és a keret
emelése csak drágította. A valódi javítás a gondolkodás korlátozása lehet –
az viszont a kiolvasás pontosságára is hathat, tehát előbb mérni kell.

- **`kiolvasas:proba --gondolkodas <low|medium|high|N>`**: az OpenRouter
  `reasoning` mezőjét tölti ki (`{effort}` vagy `{max_tokens}`). **Élesben
  semmi nem változik**: a mező opcionális, a `kiolvas` nem adja át, és egy teszt
  őrzi, hogy egyetlen Edge Function se adja át. Hogy a Gemini melyik alakot
  fogadja el, azt innen nem tudtuk ellenőrizni (az `openrouter.ai` ebből a
  környezetből nem érhető el) – a mérés dönti el: a jelentés minden futás
  gondolkodási tokenjét kiírja, egy hatástalan beállítás ott rögtön látszik.
- **Az elbukott futás mérési eredmény.** Eddig egy elbukott futás az egész
  mérést leállította – pont az esetet tüntetve el, amit mérni akarunk. Most
  feljegyződik (ok, leállás, tokenek, költség, idő), a mérés megy tovább, és
  az összesítés kimondja, hány futás gondolkodott a keret végéig. A hiányzó
  kulcs és a rossz fájl továbbra is megállít: az nem mérési eredmény.
- **`tesztadat/egy-szamla-rendes.pdf`**: a rendes köteg első számlája egyedül –
  élesben a szétszedés után is egyoldalas darabot olvasunk ki.

Hét szándékos törés, mindegyik piros (mindig küld `reasoning`-et; a
`kiolvas()` nem adja tovább; élesben is korlátoz; az elbukott futás megállítja
a mérést; a hiányzó kulcs „mérési eredmény"; az elbukott futás pénze kimarad
az összegből; nincs felső határ a gondolkodási keretre).

## ✅ A hibás bizonylat nem zsákutca, a gazdátlan fájl nem marad örökre, és a mérőscript Node-dal is indul (2026-09-23)

**1. A `hiba` sor a Beérkezőben.** A tulajdonos jelezte: egy végleg elbukott
bizonylat ott maradt, és „nem lehet eltüntetni sehogy". Így volt – a felület
a duplikátumnál kínált elvetést, a hibás sornál semmit. Most két gomb van
(csak szerkesztőnek): **Újrapróbálom** és **Elvetem** (megerősítéssel).

- Az újrapróbálás a sort visszateszi a sorba **nullázott kísérletszámmal**, és
  azonnal indít. A nullázás nem kényelem: a cron csak a `maxProbalkozas` alatti
  sorokat veszi fel, tehát nélküle egy elbukott böngészős indítás után a sor
  örökre `feltoltve` állna. A hibás kísérlet keretet nem fogyaszt.
- Mindkét művelet `status = 'hiba'` feltétellel fut: egy közben másképp
  alakult sort nem indít újra és nem töröl.

**2. A gazdátlan fájlok selejtezése** (`20260923000900_gazdatlan_fajlok.sql`).
Az elvetés mellé ez kellett: a `belso.selejtezheto()` eddig csak olyan fájlt
adott ki, amin **van** bizonylat (az eredeti migráció szavaival: „A gazdátlan
fájlok takarítása külön kérdés."). Egy bizonylat nélküli fájl tehát soha nem
törlődött volna – az elvetésből és egy félbemaradt feltöltésből is keletkezhet
ilyen. Most gazdátlan az a fájl, amelyre egyetlen bizonylat sem mutat, és egy
napnál régebbi (az egy nap a feltöltés közbeni pillanatot védi); csak a napi
futásban, az exportos szűkített alakban nem.

Élesben mérve, visszagörgetett blokkban: előtte 0 fájl selejtezhető; egy
kétnapos és egy friss gazdátlan próbasorral a lista pontosan a kétnapost adta,
a szűkített alak 0-t, és a próba nem hagyott nyomot. Az élő függvénytörzs md5-je
betűre egyezik a repóval (`6de59193…`).

**3. A mérőscript nem indult el a tulajdonos gépén.** Mindhárom mérés
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`-szal állt meg: a `FutasHiba`
`constructor(readonly bukott…)` paramétertulajdonságát a Node saját
TypeScript-futtatása (csak típustörlés) nem ismeri, a Vitest viszont
lefordítja – a tesztkör ezért zöld volt. Most kiírt mező, és egy új teszt
(`kiolvasasProba.test.ts`) a scriptet **valódi Node-folyamatként** indítja,
kulcs nélkül: a teljes importlánc betöltődik, hálózatot nem ér. A régi alakkal
piros.

Szándékos törések (mind piros): nem nulláz; újraindítás, illetve elvetés
státuszfeltétel nélkül; elvetés rákérdezés nélkül; nincs gazdátlan ág; nincs
egynapos türelem; paramétertulajdonság a mérőscriptben.

## 📏 A gondolkodás korlátozásának első mérése (2026-09-23, próbaszámlán)

A tulajdonos gépén, `tesztadat/egy-szamla-rendes.pdf`, beállításonként 10
futás (`eszkozok/meres-osszevetes.ts`):

| | alap (mint élesben) | `effort: low` | `max_tokens: 1024` |
|---|---|---|---|
| siker / bukott | 8 / 2 | 7 / 3 | 9 / 1 |
| ebből 429 | 2 | 2 | 1 |
| keret végéig | 0 | 0 | 0 |
| egyéb hiba | 0 | 1 | 0 |
| gondolkodás (medián, min–max) | 483 (355–783) | **0** | **0** |
| kimenet | 857 (774–1160) | 374 (mind) | 374 (mind) |
| idő (medián) | 8,4 s | **4,3 s** | 26,4 s |
| költség / sikeres futás | ~$0,0060 | **~$0,0039** | ~$0,0039 |
| helyes mező | 15/15 minden futásban | 15/15 | 15/15 |

Amit ebből tudunk – és amit nem:

- **A beállítás hat.** Mindkét alakra a gondolkodás 0 token lett (a
  tokenkeretes alakra is – a Gemini ezt láthatóan nem keretként, hanem
  kikapcsolásként kezeli). Ahol nincs gondolkodás, nincs mi elszaladjon.
- **A próbaszámlán a pontosság nem romlott**: mind a 15 mező minden sikeres
  futásban helyes. (Az első összevetés a „Fizetendő"-t hibásnak mutatta – az
  összevető várt rosszat: a séma szerint üres, ha nem tér el a bruttótól.)
- **Az 1024-es oszlop ideje nem a beállításé.** A kimenete betűre ugyanakkora,
  mint a `low`-é (374 token, 0 gondolkodás), mégis 26 s a medián – ez a
  szolgáltató aznapi terhelése, nem a modell munkája. Ugyanez okból a `low`
  4,3 s-a is csak egy mérés.
- **A 429 gyakori**: 30 hívásból 5 (~17%). Ez a BYOK melletti érv.
- ⚠️ **Egy tiszta, digitális próbaszámla nem a nehéz eset.** A modellválasztás
  indoka (`config/szamlafolyo.ts`) épp az volt, hogy a nehezen olvasható,
  kézírásos papíron a 3.8 Flash bekapcsolja a `nehezen_olvashato` zászlót.
  Hogy gondolkodás nélkül is bekapcsolja-e, azt ez a mérés nem mondja meg –
  ahhoz egy-két nehéz, valódi számla kell, alap és `low` mellett.

## 📏 A második mérés: fényképezett, kétoldalas valódi számla (2026-09-24)

A tulajdonos gépén, egy fényképezett, kétoldalas valódi számlán, 5–5 futás:

| | alap | `effort: low` |
|---|---|---|
| siker / bukott | 5 / 0 | 5 / 0 |
| gondolkodás (medián) | 1200 (1059–1334) | **0** |
| kimenet (medián) | 1467 | 303 |
| idő (medián) | 11,0 s | **4,2 s** |
| költség össz. | $0,0377 | **$0,0158** (–58%) |
| „nehezen olvasható" | 0/5 | 0/5 |
| mezők, amik futásonként eltértek | Szállító, Vevő, Határidő | Vevő adószáma, Teljesítés, Határidő, **Nettó, ÁFA** |

⚠️ **Itt még nem döntöttünk.** A `low` mellett a **nettó és az ÁFA** is
ingadozott, miközben a bruttó mind az öt futásban ugyanaz volt; az alapnál
csak nevek és a határidő. A „2 különböző érték" viszont nem mondja meg, hogy
kerekítés, egy kimaradt mező vagy egy rossz szám-e – ezért az összevető most
kiírja az eltérés **jellegét** (megoszlás, kimaradt-e, összegnél százalék,
dátumnál nap, névnél csak írásmód-e) és a **bukott validátorokat**, értékek
nélkül. A döntés ezen múlik: ha a rossz nettót a `nettó + ÁFA = bruttó`
validátor megfogja, az a jóváhagyásnál pirosan az ember elé kerül; ha nem,
csendben menne tovább.

A zászló itt egyik beállításnál sem kapcsolt be – a fénykép tehát nem volt
„nehezen olvasható" a modell szerint, erre a kérdésre ez a mérés sem felel.

### ✅ Döntés (2026-09-24): a gondolkodás élesben **nem korlátozott**

Az eltérések jellege ugyanarra a két mérésre (értékek nélkül):

| | alap | `effort: low` |
|---|---|---|
| Nettó | mind az 5 futás ugyanazt adta | **4 futás üresen hagyta** (4+1) |
| ÁFA | mind az 5 ugyanaz | **4 futás üresen hagyta** (4+1) |
| Teljesítés | egyező | 3 futás üres |
| Vevő adószáma | egyező | 2 futás üres |
| Határidő | 3 üres | 4 üres |
| Szállító / Vevő | 3+2 / 4+1, eltérő tartalom | egyező |
| bukott validátor | 0/5 | 0/5 |

A `low` tehát nem rossz számot ír, hanem **kihagyja**, amit a kétoldalas
papíron keresni kellene – a nettó és az ÁFA összesítője jellemzően a második
oldalon van. És ⚠️ ezt **semmi nem fogja meg**: a `nettó + ÁFA = bruttó`
validátor csak akkor fut, ha mindhárom ki van töltve, a kulcsmezők
(`kapuk.ts`: szállító, bizonylatszám, kelt, bruttó) között pedig a nettó és az
ÁFA nincs benne. Bekapcsolt automatikus jóváhagyásnál egy ilyen bizonylat ÁFA
nélkül menne a könyvelésbe – az ÁFA-levonáshoz épp az kell.

A megtakarítás (fele idő, –58% költség, nulla elszaladás) ezt nem éri meg: az
alap ezen a számlán ~$0,0075 futásonként. A `gondolkodas` kapcsoló a
mérőeszközben marad, élesben nincs használva; az elszaladás költségét továbbra
is a 4096-os `max_tokens` fogja be.

Az alap mellett a szállító nevénél 3+2 tartalmi eltérés látszott – valószínűleg
két, a papíron egyaránt szereplő cégnév (márkanév vs. cégjegyzékbeli név). Ez
jóváhagyáskor látszik, és a mérés cégadat nélkül futott (`cegNev: null`), ami
élesben segít a szállító és a vevő elválasztásában.

**Mellékdöntés (2026-09-24):** a nettó és az ÁFA **nem** kerül a kulcsmezők
közé (`kapuk.ts`). Az ÁFA-bontás nélküli bizonylatok – nyugta, alanyi
adómentes számla – különben mindig ember elé kerülnének. A tulajdonos döntése.

## ✅ Zárások (2026-09-24)

- **Saját Google-kulcs (BYOK): nem lesz.** A tulajdonos döntése: a Google Cloud
  számlázása követhetetlen. A kiolvasás marad az OpenRouter saját kulcsán; a
  429-ekre (a mérésekben ~17%) a meglévő védelem felel: az azonnali egy
  újrapróbálás (`atmenetiHibanUjra`), a cron következő köre, és a Beérkező
  „Újrapróbálom" gombja.
- **A jogi csomag végleges.** Az ÁSZF, az Adatkezelési tájékoztató és a
  mellékletek a `2026-09-23-3` változatban (`JOGI_VERZIO`) lezárva. Új változat
  csak új jogi kör – és az mindig új archívum + `legal_versions` sor.
- **Élesben igazolva:** a Beérkező „Újrapróbálom" / „Elvetem" gombja működik
  (a beragadt hibás sort a tulajdonos eltüntette), és a
  `tesztadat/harom-szamla-rendes.pdf` rendben háromfelé szedődött.

## 🔓 #39 – Próbaidő a törlés után: tudatosan nyitva hagyva (2026-09-24)

**A rés:** aki a fióktörléssel megszünteti a cégét, ugyanazzal az adószámmal
újra alapíthat, és új 14 napos próbaidőt kap – a cégsor eltűnt, nincs mivel
ütköznie. (A párhuzamos esetet az adószám egyedi kényszere már lezárta,
`20260922000400`.)

**A döntés: nem zárjuk be.** A tulajdonosé, ezekkel az indokokkal:

1. A zárás megőrzés volna a törlés után – új cél és jogalap (jogos érdek, a
   visszaélés megelőzése) az Adatkezelési tájékoztatóban, vagyis új jogi
   változat egy nappal a jogi csomag véglegesítése után.
2. Egyéni vállalkozónál az adószám személyes adat, és a hasítás nem segít:
   egy 8 jegyű törzsszám hash-éből a teljes kulcstér másodpercek alatt
   végigpróbálható.
3. A visszaélés drága a csalónak: minden kör 14 nap, és minden törléssel
   elveszik minden adata. Egy kitalált, de ellenőrző számjegyre érvényes
   adószám pedig a zárat ma is megkerülné – azt csak a NAV törzsadat-lekérdezése
   fogná meg.

⚠️ **Amit nem szabad jelzésnek használni:** a `terms_acceptances` a törlés
után is őrzi a cég adószámát – de a `20260923000400` migráció kimondja, hogy
**kizárólag** az ÁSZF-elfogadás bizonyítéka, és a próbaidő-visszaélés
kiszűrésére **nem** használjuk. Aki ebből akarná „megnézni, visszajött-e
valaki", célhoz kötöttséget sért. (Egy korábbi válaszban ezt tévesen az admin
felület egyik jeleként javasoltuk – itt helyesbítve.)

**Mikor kell elővenni:**

- ha jön a NAV-integráció (törzsadat-lekérdezés) – akkor a kitalált adószám
  rése is bezárható, és egy körben érdemes mindkettőt;
- ha az **összesített** számok jeleznek: sok új próbaidő, arányaiban kevés
  előfizetés – ez személyes adat nélkül is látszik;
- ha konkrét bejelentés vagy észlelés érkezik visszaélésről.

**Ha sorra kerül, egy kör:** külön tábla (a törzsszám és a próbaidő
felhasználásának dátuma), a `ceg_letrehozas()` ebből dönt, a tájékoztató 3.
pontja új céllal és megőrzési idővel, új jogi változat, és teszt.

## 📣 A „Könyvelőknek" oldal (2026-09-24)

`/konyveloknek` – a marketing első csatornája a könyvelőiroda, nem a
vállalkozó: egy iroda 20–100 ügyfél bizonylatait rögzíti. A nyitólap
fejlécéből (széles kijelzőn) és láblécéből érhető el.

A lap szerkezete: a NAV-kérdés („minek, megvan a NAV-ból") → a munkafolyamat
egy irodában → **kalkulátor** (ügyfélszám × bizonylat, a legolcsóbb csomagot
kiemeli) → adatvédelem és szerepek → az őszinte határok → bemutatókérés
(`mailto:`, a kapcsolati címre).

Amit **szándékosan nem** állít, és a `jogiSzovegek.test.ts` őrzi:

- **könyvelőprogram nevét** – hogy melyik olvassa be az exportot, nincs
  kimérve. Amíg nincs, a lap formátumot mond (XLSX, CSV, JSON), nem programot;
- **kézzel írt árat** – minden forint a configból jön (`src/lib/irodaiKoltseg.ts`);
- feltétel nélküli emberi jóváhagyást, és hogy az adat „végig az Unióban
  marad" – ugyanazok a tiltások, mint a nyitólapon;
- viszont **kimondja**, hogy az ügyfélszűrő nem jogosultság (Adatkezelés 1.).

⚠️ A NAV-oszlop azt mutatja, amit **a vevő lekérdezhet** az Online Számlából,
nem azt, amit a NAV tud: a nyugta adata a pénztárgépből eljut a NAV-hoz, de a
vevő onnan nem kapja meg. A kézzel kiállított belföldi számla adata is bekerül
– ezért a táblázat a bizonylat *képét* választja szét, nem „a papírt".

Nyitott: a `KONYVELO` kuponkód (Stripe-kupon + a checkoutban a promóciós kód
engedélyezése) és a „Honnan hallottál rólunk?" mező – egyik sincs még kész.

## 📣 „Honnan hallottál rólunk?" (2026-09-24)

A cég létrehozásakor egy **nem kötelező, zárt listás** kérdés
(`shared/uzleti/forras.ts`): könyvelő, ismerős, Google-keresés, online
hirdetés, Facebook, Reddit, szakmai cikk/rendezvény, máshonnan – vagy „Nem
szeretném megmondani" (`null`). A válasz a `companies.heard_from`-ba kerül.

- **Miért itt, és nem a regisztrációnál:** a szerződés a cég létrehozásával
  jön létre (ÁSZF 1.), és a válasz a céget írja le, nem a fiókot. A cég
  törlésével együtt törlődik.
- **Miért nincs szabad szöveg:** egy „egyéb, írd be" mezőbe harmadik személy
  neve kerülne („X könyvelő ajánlotta"), akiről a tájékoztató nem szól.
- **Utólag nem írható:** a `companies` oszlopszintű UPDATE-jogai közé nem
  került be (élesben mérve: `has_column_privilege` → false).
- **Sütis konverziómérés helyett:** az a jogi csomagot a hozzájárulással és
  a sütiablakkal nyitotta volna újra; ez egy sor a tájékoztatóban.

Jogi változat: `2026-09-24` – az Adatkezelés 2. pontjában egy új sor (cél:
összesített csatornamérés; jogalap: jogos érdek; tiltakozásra töröljük). Az
ÁSZF-ben csak a dátum változott, az Impresszum lenyomata ugyanaz.

Élesben alkalmazva a push **előtt** (a `ceg_letrehozas()` az új
jogiverzió-sort keresi). A régi háromparaméteres aláírás eldobva, az új
negyedik paramétere elhagyható – a kint lévő régi felület a telepítésig is
működik. Visszagörgetett mérés négy próbafelhasználóval: listabeli válasz →
eltárolva; régi, háromparaméteres hívás → `null`; listán kívüli szöveg →
„Ismeretlen válasz…" hibaüzenet; üres szöveg → `null`. Utána nem maradt
semmi.

**A kiértékelés** (a Supabase SQL-szerkesztőjében):

    select heard_from, count(*) as ceg,
           count(*) filter (where stripe_status = 'active') as fizeto
    from public.companies group by 1 order by 2 desc;

## 🧾 Export könyvelőprogramba: RLB, Novitax, Kulcs – béta (2026-09-24)

A tulajdonos összegyűjtötte a hazai könyvelőprogramok gyártói leírásait és
mintáit (RLB, Novitax, Kulcs, Infotéka, Forint-Soft, WebTax, Makrodigit,
Armada, Hessyn). **Az első kör: RLB Kettős, Novitax NTAX, Kulcs-Könyvelés**
– tulajdonosi döntés. Próbaimportra még nincs könyvelő, ezért mindhárom
**béta**, és kapott egy **Próbafájl** gombot, ami nem jelöl át semmit.

**Ami mindhárom programnál hiányzott belőlünk, és honnan lett:**

- **Irány** (bejövő/kimenő): a kiválasztott ügyfél törzsszámából, ügyfél
  nélkül a fiókéból. Vevő-adószám nélkül bejövőnek vesszük, figyelmeztetéssel.
- **Főkönyvi számok**: a könyvelő adja meg (`konyvelo_beallitasok`,
  ügyfelenként vagy cégszinten). A 454/466/311/467 felkínált, a költség- és
  az árbevételszámla **üres** – „valami 5-ös" találgatás volna. Első fájl
  előtt menteni kell.
- **Egész forint**: fillérben számolunk, soronként kerekítünk; a legfeljebb
  soronként 1 Ft-os különbözet a legnagyobb sor nettójára kerül.
- **Belső sorszám** a Novitaxnak (≤10 karakter) és a Kulcsnak
  (iktatószám): `iktatoszamok` tábla, egyszer adjuk, megmarad, nem adjuk
  újra. Külön táblában, mert a `documents`-en táblaszintű UPDATE-jog van.

**Amit nem tippelünk, hanem akadály** (a tétel a listán marad, táblázatba
exportálható): deviza (árfolyamot nem olvasunk ki); fordított adózás (a
programok ügylettípus szerint kódolják, mi nem tudjuk, melyik); közösségi,
export, ÁFA-körön kívüli sor; 0%-os sor kategória nélkül; a Kulcsnál sztornó
és helyesbítő (az eredeti számla számát kéri – nem olvassuk ki); a
Novitaxnál és a Kulcsnál partner érvényes magyar adószám nélkül (a
partnerkód a törzsszám).

**Kérdéses pontok, amiket csak a próbaimport dönt el:** a Kulcs kódolása (a
leírás nem mondja; ANSI-t írunk, mint a másik kettőnél), a Kulcs
fizetésimód-nevei (a magyar címkéket írjuk), a Novitax 40 mezős sora (a
leírás 78-at sorol, a minta 40-et – a mintát követjük), és hogy az RLB a
sztornó negatív összegét elfogadja-e.

**Nem most:** Infotéka XML (XSD van hozzá), egyéni oszloprendes sablon
(WebTax, Makrodigit), Forint-Soft DBF csak fizető igényre, Armada és Hessyn
csak gyártói séma után, szállítónként megjegyzett költségfőkönyv, deviza
MNB-árfolyammal, szállítói cím kiolvasása.

A „Könyvelőknek" oldal őre („nem nevez meg könyvelőprogramot, amíg nincs
kimérve") **marad** – az első valódi próbaimport oldja fel. Az ÁSZF nem
változott: az adathordozhatóság formátumai (XLSX, CSV, JSON) a garantáltak,
a programfájl kényelmi többlet. Az adatkiadás `sema_verzio` 2 lett (új
szakaszok: `konyvelo_beallitasok`, `iktatoszamok`, és a korábban kimaradt
`keret_fedezetek`).

### 📏 Az első valódi RLB-import (2026-09-24)

Az első próbánál az RLB Kettős azt írta: „A mezőelválasztások vagy adatok
hibásak! Hibás sor: 1". A gyártói mintát (sha256 `ce469d0b…`) ugyanez a
telepítés beolvasta, ez volt a kontroll.

Mérés: kilenc egyszámlás próbafájl, mindegyik egyetlen eltéréssel a
mintához képest (partnercím, adószám és alakja, TAFADAT, bevallási sor,
4541/511 főkönyv, 2026-os év). **Mind átment**, a mai kimenetünk is. Az
elutasított éles fájlt az adatbázisból bájtra újragyártottuk (357 bájt,
egyezik).

**Az ok nem a formátum volt:** a fájl a Google Drive-on át jutott a
Windowsos gépre, és a Drive átalakította (elválasztó, kódolás). Az
Archívumból közvetlenül letöltve ugyanaz a fájl **átment** – az `52`-es
gyűjtő költségszámlával együtt.

Következmény: az Export képernyő és az Útmutató kimondja, hogy a
programfájlt megnyitás és újramentés nélkül kell betölteni. Az RLB
állapota: bejövő 27%-os számlával kimérve. A kimenő, a mentes, a sztornó
és a nyugta esetét a `eszkozok/rlb-diagnosztika/12_kiegeszito.csv` méri,
utána a mappa törlődik. A Novitax és a Kulcs még egyáltalán nincs
kimérve.

### ✅ RLB: kimérve, béta le (2026-09-24)

A kiegészítő próba (kimenő `VF/VT` készpénzzel, alanyi mentes `4`-es
kóddal, sztornó negatív összegekkel, nyugta bankkártyával vevő nélkül) is
**átment** a valódi RLB Kettősben. Ezzel minden eset, amit az RLB-író ma
gyárt, egyszer beolvasódott. A diagnosztikai mappa törölve.

- **Egy igazság a kimértségre:** `KIMERVE` (`shared/uzleti/export/konyvelo/beallitas.ts`),
  ma `{ rlb: true, novitax: false, kulcs: false }`. Az Export képernyő
  béta-jelvénye és a „Könyvelőknek" oldal őre is ebből olvas. Igazra csak
  valódi próbaimport után állítható.
- **A „Könyvelőknek" oldal őre új szabályt kapott:** a lap csak kimért
  programot nevezhet meg, és a kimértet nem hallgathatja el. Ma: „vagy
  közvetlenül az RLB Kettős könyvelőprogramba". Eltörés-próba: Novitax a
  lapon → piros; `KIMERVE.rlb = false` → piros; az RLB kivéve a lapról →
  piros.
- A Novitax és a Kulcs béta marad, amíg valódi példány be nem olvassa.

### 🧱 Novitax: a ZIP a tárolón akadt el (2026-09-24)

Az első Novitax-exportnál a gomb ezt írta: „Az export fájl feltöltése nem
sikerült: mime type application/zip is not supported". Az `exportok` bucket
`allowed_mime_types` listája a 20260912000700-as migráció óta csak XLSX-et,
CSV-t és JSON-t engedett. Az RLB azért ment át, mert az CSV. A Novitax és a
Kulcs viszont ZIP, így ez a kettő az első élő próbáig egyszer sem juthatott
el a tárolóig.

- **Kár nem keletkezett.** A feltöltés az 1. lépés, tehát egyetlen tétel sem
  kapott `export_id`-t. Élőben mérve nincs `exports`-sor és nincs gazdátlan
  objektum. Egy iktatószám kiment (SZF1), de ez szándékos: az újrapróbálás
  ugyanazt a számot adja ugyanannak a bizonylatnak.
- **Javítás:** a `20260924000500_exportok_zip.sql` az `application/zip`-et is
  beveszi a bucket listájába. Élőben alkalmazva és visszamérve.
- **Őr:** a MIME-tábla a `shared/uzleti/export/mime.ts`-be költözött. A
  `migracio.test.ts` ellenőrzi, hogy a bucket-listát utoljára definiáló
  migráció (akár `insert`, akár `update`) minden export-MIME-et befogad.
  Ugyanez a hiányzó őr volt a hiba gyökere: a formátumlistára volt őr, a
  tároló listájára nem. Két eltörés-próbát is futtattam, mindkettő piros
  lett:
  - az új migráció nélkül a régi `insert` bukik;
  - a ZIP-et kivéve az `update` bukik.

### 📦 A ZIP csak csomagolás (2026-09-24)

A tároló-javítás után a Novitax-export már letöltődött, csak épp ZIP-ként.
Az NTAX „Számlák bemásolása külső file-ból” funkciója CSV-t kér. A
tulajdonos feltöltötte a gyártói mintát és a leírást. Mindkettő **bájtra
ugyanaz**, amiből az író készült (a sha256 megegyezik a `novitax.ts`
fejlécével), tehát a formátumon nincs mit javítani. A leírás 10. mezője
(„Partner kódja”) így szól: „Megegyezve PARTNER.csv-ben találttal”. Két
fájl kell tehát, egy mappában, és a ZIP csak csomagolás.

A hiány az volt, hogy **sehol nem mondtuk meg**, hogy ki kell bontani, és
melyik fájlt kell kiválasztani.

- **Miért nem két külön letöltés?** A böngésző a második exportnál
  `partner (1).csv`-re nevezné át a fájlt, és az NTAX csendben a *régi*
  `partner.csv`-t olvasná. A Windows „Összes kibontása” viszont saját,
  exportnevű mappát nyit, ott nincs keveredés. Az Archívum is exportonként
  egy fájlt tárol.
- **Betöltési lépések programonként:** `shared/uzleti/export/konyvelo/betoltes.ts`.
  Az Export képernyő sorszámozott listaként mutatja őket, az Útmutató röviden.
  A fájlnevek egy helyen élnek (`NOVITAX_FAJLOK`, `KULCS_FAJLOK`), a ZIP és a
  szöveg is ezekből dolgozik.
- **Őr:** a `betoltes.test.ts` ellenőrzi, hogy a ZIP pontosan azokat a
  fájlokat tartalmazza, amelyeket a lépések megneveznek. Két eltörés-próba,
  mindkettő piros lett:
  - átnevezett ZIP-bejegyzés;
  - a Kulcs partnerfájl-lépése kivéve.
- A Novitax béta marad, amíg a kibontott `szamla.csv` be nem olvasódik egy
  valódi NTAX-ban.

### 📏 Az első valódi NTAX-import (2026-09-24)

A tulajdonos a kibontott `szamla.csv`-t egy **demó** NTAX-ba töltötte be.
Élőben mérve az exportban egyetlen bizonylat volt: bejövő, 27%-os, új
partnerrel, tehát a `partner.csv`-ből. A demó csak **02.28. előtti**
számlát fogad, ezért a dátumokat kézzel írta át. Ezzel az NTAX elfogadta a
fájlt.

- **A béta marad.** A kimenő (`KI`), a mentes (`AM`/`TM`) és a sztornó (`-`
  jel, abszolút tételösszeg) még nem futott át. Ez a kettő a
  legbizonytalanabb a leírás alapján. Az RLB-nél is csak a kiegészítő fájl
  után jött le a béta, a mérce ugyanaz.
- A felület (Export, Útmutató) pontosan ezt mondja: „egy bejövő, 27%-os
  számlát egy valódi NTAX már beolvasott”.
- **Kiegészítő próbafájl** a tulajdonosnak, kitalált adatokkal, 2026
  februári dátumokkal (a demó miatt), az ő kontírjával (napló `12`,
  `52/491/454/311`) és `AM`-mel. Tartalma:
  - kimenő 27%;
  - kimenő mentes;
  - kimenő sztornó;
  - bejövő vegyes 27% + 5%.

  Iktatószámok `SZF9001–9004`, hogy ne ütközzenek. Ha átmegy,
  `KIMERVE.novitax = true`. A repóba nem kerül.

### ✅ Novitax: kimérve, béta le (2026-09-24)

A kiegészítő próbafájl is **átment** a demó NTAX-ban:
- kimenő 27%;
- kimenő mentes `AM`;
- kimenő sztornó (`-` jel, abszolút tételösszeg);
- bejövő vegyes 27% + 5%.

Az éles bejövő számlával együtt ez minden eset, amit a Novitax-író ma gyárt.
A mérce ugyanaz, mint az RLB-nél, a béta lejön: `KIMERVE.novitax = true`.
A Kulcs béta marad.

- A „Könyvelőknek” oldal mostantól így szól: „…vagy közvetlenül az RLB
  Kettős vagy a Novitax NTAX könyvelőprogramba”. Az Útmutató formátumtáblájában
  a `(béta)` helyére `(Kulcs-Könyvelés: béta)` került. Ez az RLB óta elavult
  volt.
- **Az őr egy gyenge pontja kiderült.** A „kimértet nem hallgatjuk el”
  szabályt általánosítottam: minden `KIMERVE`-s programot meg kell nevezni.
  Az eltörés-próbánál viszont a Novitaxot a lapról kivéve az őr **zöld
  maradt**, mert a lap fejléc-megjegyzése is említette a Novitaxot, az őr
  pedig a nyers forrást olvasta. Mostantól a program-őrök a megjegyzésektől
  megtisztított szöveget nézik. Három eltörés-próba, mindhárom piros:
  - Novitax le a lapról;
  - `KIMERVE.novitax = false`, a lapon marad;
  - béta Kulcs a lapon.
- Aki újra mér: a demó NTAX csak 02.28. előtti számlát fogad (`novitax.ts`
  fejléce).

### 📏 Az első Kulcs-import: a fejléc-pipa (2026-09-24)

A tulajdonos demó Főkönyvi Adatimportert (2.2601.1.833) telepített. Az első
szerkezeti próba egyetlen kimenő számla volt, fejléc nélkül, és a program
ezzel állt meg: „A .CSV, a .001 vagy a .002 állományok valamelyike nem
tartalmaz adatot”. A két társfájl ott volt mellette.

A gyártói használati útmutató 4. oldala megadja az okot: „Fejléc kihagyása
… ha ez az opció be van pipálva és nincs fejléc, a program az első sorban
található számlaadatot nem fogja beolvasni!” Fájlonként egy sor volt, így
mindhárom üresnek látszott.

- **Mindhárom fájl fejlécsorral kezdődik** (`KULCS_FEJLECEK`, a
  struktúraleírás mezőnevei betű szerint).
- **Miért fejléc, és nem az, hogy „vedd ki a pipát”?** A két rossz eset nem
  egyformán rossz:
  - fejléc nélkül, pipával: több számlánál az **első csendben kimarad**,
    ami adatvesztés;
  - fejléccel, pipa nélkül: a tallózásnál **hibaüzenet** jön (útmutató, 12.
    oldal).

  A hangos hibát választjuk.
- **A betöltési lépések** kimondják, hogy a pipa kell (jobb klikk a címsoron
  → Beállítások). A beállítás csak rendszergazdaként futtatva mentődik el.
  A tallózás menüútja az útmutató 5. oldala szerint.
- **Eltörés-próba:** a `.001` fejlécét kivéve piros lett.
- Következik a fejléces próba (`kulcs-proba-2-fejleccel.zip`), utána a
  teljes próba a tulajdonos saját ÁFA-kódjaival.

**Mérve (2026-09-24, demó Adatimporter):**
- kikapcsolt „Fejléc kihagyása” mellett az 1. próba (fejléc nélkül) **átment**;
- bekapcsolt pipával a 2. próba (fejléccel, a mostani export alakja) is
  **átment**.

A magyarázat igaz volt. Egy kimenő, 27%-os számlával ezek is átmentek:
- a szerkezet, a kódolás és a partnerfájl;
- a fizetési mód neve („Átutalás”);
- a gyártói minta ÁFA-kódja (`1` / „27%-os fiz.ÁFA”).

A teljes próba (bejövő, vegyes, mentes, előleg) a tulajdonos ÁFA-kulcs-
listájára vár.

### 📏 Kulcs: a Kód oszlop, a név nem számít, a mentes és az „áfás” mező (2026-09-24)

A demó Adatimporterrel diagnosztikai fájlok sorozatát mértük:

| Mi ment ki | Eredmény |
|---|---|
| ÁFA-kód = a lista „Azonosító”-ja (18), vagy a főkönyvi szám (467) | Adategyeztetés: „A fogadott Áfa kulcs nem található” |
| betűs kód (`K27`) | hiba: „1. sor 7. oszlop (afakod)”, **csak szám** mehet |
| Kód `1` (Törzskarbantartás → Kimenő/Bejövő áfa-kulcsok, **Kód** oszlop) | ✅ kérdés nélkül, mindkét irányban |
| bejövő, Kód `1`, de „fiz.” névvel | ✅ **a név nem számít** |
| csak mentes számla, „áfás” = 0 + kódos tétel | ❌ „az áfás mező 0, ennek ellenére a tétel tartalmaz áfakódot” |
| ugyanez „áfás” = 1-gyel (18a), illetve „áfás” = 0 + üres tétel-ÁFÁ-val (18b) | ✅ mindkettő |
| 27%-os tétel az 5%-os kulcs kódjával (`8`) | ✅ **szó nélkül átment** |
| „Bankkártya”, ami a listában nincs | ✅ kérdés nélkül |

A partnert az első Adategyeztetés után a Kulcs megjegyzi.

- **A beállítás irányonként kódot kér** (`KULCS_ALAP_KODOK`, alapérték
  1 / 2 / 8 / 5 / 6, a demó Kód oszlopa). Nevet nem kér, a fájlba a Kulcs
  alapneve kerül irány szerint (`KULCS_AFANEVEK`). A régi alak kódja mindkét
  irányba átjön.
- **„Áfás” = 1 minden számlán, a mentesen is (18a).** A 18b is működne, de
  akkor a mentes értékesítés kimaradna a Kulcs ÁFA-analitikájából, pedig a
  bevallásba kell.
- **A rossz kód néma.** A Kulcs nem veti össze a kulcs százalékát a kóddal.
  Amit mi láthatunk, az a dupla kód egy irányon belül, ez most akadály. A
  súgó a „Kód” oszlopot nevezi meg, és hangsúlyosan kimondja, hogy nem az
  Azonosítót.
- Eltörés-próbák, mindhárom piros lett:
  - a bejövő kódot a kimenő táblából olvasva;
  - a régi „áfás” szabály;
  - a dupla-kód ellenőrzés nélkül.
- Következik a teljes próba az alapbeállítással:
  - kimenő 27%;
  - mentes;
  - bejövő vegyes;
  - **előleg (típus 4)**;
  - készpénzes 18%.

**A teljes próba (2026-09-24):** öt bizonylat, alapkódokkal. Három dolog
derült ki:
- **Partner:** pipa nélkül a Kulcs minden számlánál újra kérdez, pipával
  megjegyzi. A betöltési lépés ezt most kimondja.
- **Előleg (4-es típus):** a Kulcs nem a sima 27%-os kulcsot keresi, hanem a
  „Kapott előleg (27%)”-ot, vagyis a Kimenő speciális lista „Előleg áfa 27%”
  kulcsát, amelynek Kódja `12`. Új mező: `kulcs.elolegKod`, alapértéke `12`.
  Csak kimenő előlegnél kötelező. Az alaptáblában csak 27%-os előleg-kulcs
  van, ezért a más kulcsú kimenő előleg akadály.
- **Készpénz:** „A HUF pénztár főkönyvi szám nem állapítható meg
  automatikusan”. A mi formátumunkban erre nincs mező, a Kulcs egyszer
  megkérdezi (pl. 3811), és pipával megjegyzi. Ez is betöltési lépés lett.

Eltörés-próbák, mindkettő piros lett:
- az előleg a sima kóddal;
- a nem 27%-os előleg átengedve.

A 20-as (rossz kód) próbánál nem tudjuk, mit könyvelt a Kulcs, ezt nem
mértük vissza. A felület ezért csak annyit állít, amennyit tudunk: a rossz
kódot a Kulcs nem jelzi.

### ✅ Kulcs: kimérve, béta le (2026-09-24)

A 2. ellenőrző próbában az előleg a `12`-es kóddal már ÁFA-kérdés nélkül
ment át. A vevő és a pénztár viszont újra előjött, mert az előző kört a
tulajdonos a pénztárnál megszakította. **A Kulcs a párosítást csak a
feladás végén menti el.** A végigvitt 2. próba után a 3. (előleg +
készpénz) **egyetlen kérdés nélkül** átment.

Ezzel minden eset beolvasódott, amit a Kulcs-író ma gyárt:
- kimenő 27% és 18%;
- mentes;
- bejövő vegyes kulccsal;
- előleg;
- készpénz.

Az alap ÁFA-kódokkal, kézi kódbeírás nélkül. A sztornó és a helyesbítő
szándékosan akadály. Így `KIMERVE.kulcs = true`, és mindhárom program
kimért.

- A „Könyvelőknek” oldal szövege: „…vagy közvetlenül az RLB Kettős, a
  Novitax NTAX vagy a Kulcs-Könyvelés könyvelőprogramba”.
- Az Útmutató a Kulcsot kipróbáltként említi. A „kódját és nevét” mondat
  helyett ez áll benne: a kódot előre kitöltjük, és a partner, illetve a
  pénztár egyszeri párosítása pipával és végigvitt feladással megmarad. A
  formátumtábla „(béta)” jelölése lekerült.
- A betöltési lépés kimondja: „a párosítás a feladás végén mentődik”.
- Eltörés-próbák, mindkettő piros lett:
  - a Kulcs lekerül a lapról;
  - `KIMERVE.kulcs = false`, miközben a lapon rajta marad.

### 🎬 Élő bemutató helyett videó (2026-09-24)

A Könyvelőknek oldal két helyen ígért élő bemutatót: „Kérek egy 15 perces
bemutatót”, illetve „írj, és végigmegyünk rajta együtt negyedóra alatt”.
Mindkettő `mailto:` link volt. **A tulajdonos nem akar egyeztetett
bemutatót tartani**, és egy ígéret, amit senki nem tart meg, rosszabb a
semminél. Helyette egy kb. 70 másodperces, **hang nélküli, feliratos**
videó jött:
- feltöltés;
- kiolvasás;
- egy megjelölt, elírt adószám javítása;
- a köteg darabjainak jóváhagyása;
- Tételek;
- Export a Kulcs-Könyvelésbe, és az eredetik ZIP-je.

Döntések:
- **A valódi felületről készül, kitalált adatokkal.** A
  `scripts/bemutato-video/felvetel.mjs` egy Vite dev szervert hajt,
  memóriabeli Supabase-álszerverrel. Az adószámok a projekt próbaszámai,
  vagy nyolc egyforma jegy. Így újra lehet venni, ha a felület változik.
- **Nem a Playwright `recordVideo`-ja.** Az alacsony bitrátájú VP8, azon a
  kis betű elmosódik. Helyette a CDP képernyőközvetítés JPG-kockáiból fűzi
  össze az ffmpeg, a valódi időzítéssel: 1080p H.264 (2,3 MB), mellé egy
  VP9 WebM (2,0 MB).
- **Miért két forrás.** Mérve: a Playwright nyílt forrású Chromiuma H.264-et
  nem játszik le (`canPlayType('avc1…')` üres). A Linuxos Chromium és a
  rendszerkodek nélküli Firefox ugyanígy jár. Az MP4 áll elöl, mert a
  Safari azt biztosan viszi, a WebM a tartalék. A buildelt lapon a
  tartalék ág lejátszva ellenőrizve (1440 és 390 px): `currentSrc` =
  `.webm`, 3 mp alatt 3 mp-t haladt. Az MP4-et hiba nélkül végigdekódolja
  az ffmpeg, a `moov` az elején van (faststart).
- **Felirat, nem gépi hang.** A magyar gépi hang gyenge, és a legtöbben
  némítva néznek.
- **Saját tárhely (`public/`), nem YouTube.** A beágyazott lejátszó
  harmadik féltől jövő sütit hozna, az pedig a sütiablakot és az
  Adatkezelést is érintené.
- **Szám nincs a videóban.** A próbanapok száma és az ár configból jön. A
  videóba égetett szám egy áremelés után hazudna.
- **Az e-mail-cím maradt, de csak így:** „Kérdésed van? Írj:”. Időpontot
  és hívást nem ígér.

Mérve, nem feltételezve:
- a fejetlen Chromium PDF-nézője megjeleníti a köteget;
- a dátummezők magyar formátumához a `LANG` környezeti változó kell, a
  `locale` és a `--lang` nem elég.

Őrök (`jogiSzovegek.test.ts`), mindhárom eltörve piros lett:
- a lap nem ígér „perces bemutatót”, „negyedórát” vagy „bemutató kérést”;
- a hivatkozott `/bemutato/…` fájlok ott vannak a `public/`-ban (a WebM
  bekötése után, felvétel előtt magától is piros lett);
- a lap „egy perc alatt”-ot mond, ezért a videó hosszát az MP4 `mvhd`
  fejlécéből mérjük (69,5 mp), és 40–90 mp között engedjük.

### 📱 Mobil fejléc: egy linklista mindkét elrendezésnek (2026-09-24)

A tulajdonos mobilon vette észre a hiányzó linkeket:
- a nyitólap mobil fejlécéből hiányzott a **Könyvelőknek** link;
- a Könyvelőknek oldal mobil fejlécéből hiányzott az **„A nyitólapra”**.

Az ok: a mobil sor a horgonylistából épült, a Könyvelőknek linket pedig csak
a széles menübe írták be kézzel. A Könyvelőknek oldalnak mobilon második
sora sem volt.

A javítás:
- lapszintenként egy `FEJLEC_LINKEK` lista, amiből a széles
  (`SzelesLinkek`) és a mobil (`MobilLinkek`) menü is rajzol, így nem
  csúszhatnak szét újra;
- a Könyvelőknek oldal menüje: „A nyitólapra”, „Bemutató”, „Kalkulátor”.

A mérés két régi hibát is kifogott, ezek is javítva:
- **768 px:** a széles menü a nyitólapon nem fért ki, az „Ingyenes próba”
  50 px-t kilógott. A váltás ezért `md` helyett `lg`-nél van, tabletig a
  kétsoros fejléc marad, és a `scroll-margin` is `lg`-nél vált.
- **320 px:** a Bejelentkezés gomb 9 px-t kilógott. Kisebb képernyőn
  keskenyebb a padding és a hézag.

Playwright a buildelt lapon, mindkét oldalon, 320, 360, 390, 768, 1024 és
1440 px szélesen:
- minden elvárt link látszik;
- egyik sem törik két sorba;
- nincs túllógás;
- a horgonyra ugráskor a szakaszcím a fejléc alatt van;
- oda-vissza navigáció mobilon.

### 🎬 Nyitólap: a mintakártya helyén valódi felvétel (2026-09-24)

A nyitólap hero részében eddig egy rajzolt „Dokumentum jóváhagyása” kártya
állt: egy piros „nettó + ÁFA ≠ bruttó” jelzés és egy lebegő „Sikeres
export” jelvény. A helyére egy 44 mp-es felvétel került a valódi felületről
(`scripts/bemutato-video/`, `nyitolap` változat). Egy vállalkozó
(Próba Kft.):
- feltölt egy fotózott nyomdaszámlát;
- a modell a bruttót 127 000 helyett 121 000-nek olvassa, és ugyanaz a
  „nettó + ÁFA ≠ bruttó” jelzés szól, amit a kártya mutatott;
- kijavítja és jóváhagyja;
- Excelbe exportál, az export az Archívumba kerül.

Mindez kitalált adatokkal.

A tulajdonos döntése: **magától induljon**. Ezért:
- **némítva, ismétlődve** indul (a böngésző csak némítva enged
  automatikus indítást);
- van **szünet gomb** (WCAG 2.2.2);
- **csökkentett mozgás** beállításnál nem indul el magától, a poszter áll;
- **„Megnézem nagyban”**: natív `<dialog>`, elejéről, vezérlőkkel. Kicsiben
  a felület betűi apróak, ezért a felirat itt nagyobb (30 px a 22 helyett).

Ára: minden látogatónál kb. 1 MB (az 1,3 MB-os MP4 vagy az 1,0 MB-os WebM).

A poszter a piros bruttós pillanat. A forgatókönyv jelöli meg (`jelol()`),
nem egy rögzített időpont, így újravételnél is ott marad.

Ellenőrizve a buildelt lapon, 1440 és 390 px szélesen, csökkentett
mozgással is:
- magától fut, a szünet megállítja;
- csökkentett mozgásnál áll, a gombbal elindul;
- a nagy ablak középen nyílik, elejéről játszik, közben a kicsi áll;
- Esc-re bezárul, és a nagy videó megáll;
- nincs túllógás és nincs JS-hiba.

Őr: a nyitólap hivatkozott MP4-e, WebM-je és posztere ott van a
`public/`-ban. A WebM-et kivéve piros lett.

A felvevő szkript két változatú lett (`felvetel.mjs konyveloknek|nyitolap`).
A könyvelős változatot egy próbamappába újra felvettük, hogy az átírás nem
törte-e el.

### 📝 Nyitólap: új szövegek, közös funkciók egyszer (2026-09-25)

A tulajdonos átírta a nyitólap minden szövegét (szakaszról szakaszra, a
fejléctől a láblécig). A szöveg mind az ő fájljából jön, két házszabály
szerint igazítva:
- **Nagykötőjel (–) a hosszú gondolatjel (—) helyett.** A látható szövegben
  ezt a `gondolatjel.test.ts` őrzi, és a fájl három helyén piros is lett.
- **A számok nem íródnak be kézzel:**
  - a próba napjai és dokumentumai, a csomagárak, a keretek és a kereten
    felüli díjak a `config/szamlafolyo.ts`-ből jönnek;
  - a „Mi számít egy dokumentumnak?” példáinak oldalhatárai a `hatar()`-ból
    („1–5”, „6–10”).

**Szerkezeti változás az áraknál:**
- a csomagkártyán csak a három választási szempont áll: a havi keret, a
  felhasználók száma és a kereten felüli díj;
- a hat közös funkció **egyszer** áll, a kártyák alatt, „Mindhárom csomag
  tartalmazza” címmel. Addig mindhárom kártyán megismétlődött;
- alatta három kérdés-válasz blokk:
  - mennyit fizetsz;
  - mi van, ha elfogy a keret;
  - mi számít egy dokumentumnak;
- mindhárom gomb „Kipróbálom ingyen”;
- a jellemzés két sornyi helyet kap, így a hosszabb Pro-szöveg sem tolja
  lejjebb az árat (mérve).

**Egyéb:**
- A hero bemutatóvideója látható leírást kapott, ugyanez az `aria-label`
  is.
- A „Milyen bizonylatokat kezel?” szakasz felcímet kapott.
- Az Előnyök alá került a „nem szűrnek ki minden hibát” mondat.
- A lábléc linkjei a szövegfájlban kiírt névvel álltak („Általános
  szerződési feltételek”, „Adatkezelési tájékoztató”). Egy körig így is
  voltak a nyitólapon, aztán a tulajdonos visszakérte a rövid neveket
  („ÁSZF”, „Adatkezelés”). A közös `LABLEC_LINKEK` így minden láblécben
  ugyanaz maradt.
- Az `index.html` keresőleírása a régi herót idézte („te csak azt
  ellenőrzöd, amiben nem biztos”), ez is az új szövegre állt.
- A fejléc „Ingyenes próba” gombja marad: a szövegfájl csak a menüt
  sorolta.

Őr: a nyitólap forrásában nincs beégetett havidíj, `Havi N dokumentum` és
`N Ft / dokumentum`. Mindhárom rontásra piros lett.

Ellenőrizve a buildelt lapon (390, 1024, 1280 és 1440 px):
- minden kulcsmondat a lapon van;
- a kártyák soronként 3 sort mutatnak, a közös lista egyszer szerepel;
- nincs túllógás és nincs JS-hiba;
- a hero oszlopai 1440 px-en 641/551 px magasak.

### 📝 Könyvelőknek: új szövegek, feladatközpontú NAV-tábla, kalkulátortábla (2026-09-25)

A tulajdonos átírta a „Könyvelőknek” oldal szövegeit, három elvvel:
1. **A könyvelőprogramok elöl.** Az RLB Kettős, a Novitax NTAX és a
   Kulcs-Könyvelés már a heróban áll, kiemelt sorban.
2. **Tárgyilagos, nem védekező hang.** Kikerült a „nem hiányzó funkció”, a
   „Jobb, ha most tudod meg” és az „Idegen cégek számláiról van szó. Tudjuk.”
   A helyükre leírás került arról, hogyan használható a rendszer.
3. **A működési feltételek egyértelműen a lapon maradnak:**
   - a munkaterület tagjai minden ügyfél bizonylatát látják, az ügyfélként
     meghívottak is;
   - a fájlok az export után törlődnek.

**A NAV-tábla feladatközpontú lett.** Eddig „NAV: igen/nem – SzámlaFolyó:
igen” volt, most „Mivel dolgozol? – Miben segít a SzámlaFolyó?”.

**A tábla egy mondata a kódhoz igazodott.** A szövegfájl azt írta: „nyomon
követhetővé teszi, ki hagyta jóvá a bizonylatot”:
- a rendszer ezt rögzíti (`documents.approved_by`), de ma **sehol nem
  mutatja**, sem a felületen, sem az exportban;
- a régi lap „Jóváhagyás: ki nézte át” sora ugyanezt ígérte, ez régi adósság
  volt;
- a tulajdonos döntése: a mondat íródik át („exportba csak a jóváhagyott
  bizonylat kerül”), a funkció nem készül el.

**A kalkulátor táblázat lett:**
- széles nézetben összehasonlító tábla hét sorral, a legolcsóbb oszlop
  kiemelve „A megadott mennyiséghez a legkedvezőbb havi díj” jelöléssel;
- mobilon kártyák ugyanazokkal a sorokkal: egy `KALK_SOROK` lista rajzolja
  mindkettőt;
- `table-fixed`, mert a hosszú jelölés a kiemelt oszlopot kétszer olyan
  szélesre húzta (mérve);
- a korábbi feltételes figyelmeztetés („nálatok ennél több kell”) helyett a
  szöveg szerinti állandó mondat áll: a költési korlátnak fedeznie kell a
  kereten felüli díjat.

A példa (25 ügyfél × 30 bizonylat) a lapon ugyanazt adja, mint a
szövegfájl:
- havidíj: 39 900 / 31 900 / 27 400 Ft;
- bizonylatonként: 53 / 43 / 37 Ft.

A számok a configból jönnek; az őr („árat nem ír kézzel”) zöld.

**Egyéb:**
- A fejléc linkjei: Főoldal · Bemutató · Költségkalkulátor. 320 px-en
  mindhárom egy sorban fér el.
- A lábléc közös, ezért a tárolási mondat **mindkét lapon** az új lett: „Az
  adatbázist és a bizonylatfájlokat frankfurti kiszolgálón tároljuk. A
  feldolgozásban részt vevő szolgáltatókról az adatkezelési tájékoztatóban
  olvashatsz.” A tájékoztatóra link mutat.
- A linknevek rövidek maradtak (ÁSZF, Adatkezelés).
- Az őrök az új megfogalmazást figyelik, az állítás ugyanaz:
  - „Alapbeállítás szerint … jóváhagyására vár”;
  - a Google-hez kerülés **és** az „Unión kívüli adatfeldolgozással jár”;
  - „a hozzáférést nem korlátozza” **és** hogy ez az ügyfélként
    meghívottra is igaz.

  Mindhárom rontásra piros lett.

Ellenőrizve a buildelt lapon (320, 390, 768, 1024 és 1440 px):
- nincs túllógás, nincs JS-hiba;
- a „Költségkalkulátor” horgony a fejléc alá érkezik.

A bemutatóvideó zárókártyája („Próbáld ki egy ügyfél egy hónapjával.”) a régi
zárómondatot idézi. Szándékosan nem vettük újra: a videó a folyamatot
mutatja, a mondat pedig nem valótlan.

### 📝 Használati útmutató: új szöveg, alfejezetek, lenyitható mezőlisták (2026-09-25)

A tulajdonos átírta az útmutatót, három elvvel:
- a felület nevei maradnak;
- az ismétlődő magyarázatok összevonva: a beküldési cím titkossága eddig két
  figyelmeztetésben állt, most egy alfejezet;
- a technikai leírás külön alfejezetekben.

13 fejezet és 51 alfejezet (h3) lett; a tartalomjegyzék és a sorszámok
továbbra is egy `FEJEZETEK` listából jönnek.

**Lenyitható mezőlisták.** „Az export mezői” (29 sor) és „A teljes
adatkiadás szakaszai” (17 sor) `<details>` részbe került:
- csukva 46 px, nyitva kb. 1200 px (mérve);
- mindkettő a Data Act 26. cikke szerinti online formátumleírás része, ezért
  a lapon marad, és a böngésző keresése a csukott részben is talál.

**Hat felületi név nem egyezett a képernyővel.** A szövegfájl, és részben a
régi útmutató is, rövidített nevet használt. Most a gomb valódi felirata áll:

| Szövegfájl | Felület |
|---|---|
| „Próbafájl” | **Próbafájl letöltése** |
| „Jóváhagyás és következő” | **Jóváhagyás**, és csak ha van még sorban álló bizonylat, **Jóváhagyás és következő** |
| „letöltsd ZIP-ben” | **Eredeti bizonylatok letöltése (ZIP)** |
| „visszaküldheted” | **Javításra** (Tételek) |
| „Hívd vissza” | **Visszahívom** (Archívum) |
| „bárkitől” | **Bárkitől, aki ismeri a címet** |

Ezen felül nevesítve lett az **Új cím** gomb és a **Fiók törlése** link a
Beállítások alján.

**Új őr: „az útmutató a felület valódi neveit idézi”.** 16 név mindkét
helyen:
- az útmutató szövegében, kommentek nélkül;
- a képernyő forrásában.

Két irányból rontottuk el:
- a felületen átnevezett „Visszahívom”: piros;
- az útmutatóban rövidített „Próbafájl”: **elsőre zöld maradt**, mert a
  fejkomment idézte a nevet. Ugyanaz a csapda, mint a Könyvelőknek oldal
  őrénél; az őr azóta a kommentek nélküli szöveget olvassa, és így piros.

**Az adatkiadás-őr is fogott egyet.** Az új állapottábla `['feltoltve', '…']`
alakú sorai szakasznak látszottak neki. Az állapottábla objektumlista lett,
az őr nem változott.

A számok a configból jönnek:
- méret- és mellékletkorlát, próbálkozások, próba, csomagok, plafon;
- megőrzési napok, ÁSZF-bizonyíték és inaktív fiók;
- a „3 oldalas = 1, 8 oldalas = 2 dokumentum” példa a `hatar()` és az
  `oldalakbol()` függvényből.

A mélylinkek (Beállítások → `#keret`, ÁSZF → `#adatformatumok`) élnek, és a
fejléc alá érkeznek.

Ellenőrizve a buildelt lapon (390 és 1440 px): nincs túllógás, nincs
JS-hiba, és a tartalomjegyzék mind a 13 célja létezik.

### ⚖️ ÁSZF, negyedik jogi kör + törlés felfüggesztése szolgáltatóváltáskor (2026-09-25)

A tulajdonos átnézést kapott az ÁSZF mind a 17 pontjáról, jogszabályhelyekkel
és célzott szövegjavaslatokkal. Ahol a szöveg a kódról állít valamit, ott a
kód döntött, és egy helyen **a kód változott**.

**A tulajdonos döntései:**
1. **Felelősségi korlát (13. pont):** a megfizetett hathavi díj, de legalább
   a legkisebb csomag hathavi díja (configból: 6 × 4 900 Ft). A „megfizetett
   díj” próbaidőben 0 Ft, így a képlet ott teljes kizárást adott volna.
2. **Ptk. 6:78. §:** marad az egy általános pipa. A véleményező újra külön
   tájékoztatást és kifejezett elfogadást javasolt; ez nyitott jogi kockázat,
   **az ügyvédnek jelezni kell**.
3. **Az utolsó időszak túlhasználata** a munkaterület törlésekor továbbra sem
   kerül kiszámlázásra. A visszaélést a költési korlát behatárolja.
4. **Szolgáltatóváltás:** az automatikus törlés **kódban** áll meg.

**A kód** (`20260925000100_valtas_torles_felfuggesztes.sql`):
- **Új mező:** `companies.torles_felfuggesztve_eddig`. Amíg ez a jövőben van,
  semmi nem selejtezhető:
  - az eredeti fájlok (a napi futás és az export pillanata is);
  - az exportfájlok;
  - a levélnapló, a lezárult meghívók és a nyers modellválasz.
- **A felületről nem írható.** Mérve: `has_column_privilege` UPDATE = false,
  SELECT = true, így az export olvasása nem törik el.
- **A tulajdonos állítja be SQL-lel,** az `eszkozok/torles/OLVASS-EL.md` 3.
  szakasza szerint.
- **Élesben mérve,** visszagörgetett tranzakcióban (a blokk szándékos hibával
  zárult, semmi nem maradt): felfüggesztés nélkül egy gazdátlan fájl, egy 40
  napos exportfájl és egy 100 napos levélnapló-sor selejtezhető, felfüggesztés
  alatt egyik sem.
- **A repó és az élő adatbázis betű szerint egyezik:** a három függvény
  lenyomata azonos.
- **Új őr:** a `config/torlesFelfuggesztes.test.ts` a három függvény
  legutolsó definícióját olvassa. Egy későbbi, feltétel nélküli migrációval
  elrontva piros lett.

**Szöveg (ÁSZF, a pontszámok nem változtak):**
- **1. pont:**
  - A szerződést iktatjuk, és kérésre megküldjük (Eker. tv. 5. §). Kikerült a
    „nem kereshető elő” és az „írásba foglalás nélkül”.
  - Az ÁSZF-et elfogadja, a tájékoztatót megismeri. **A pipa szövege is
    változott:** „Elfogadom az ÁSZF-et, és megismertem az Adatkezelési
    tájékoztatót.”
- **3–4. pont:**
  - Ellenőrzésre előkészített adat, nem „könyvelésre alkalmas”.
  - A három könyvelőprogram, a korlátaival; nincs önálló kontírozás.
  - **Ügyfél** adószáma szerinti szűrés.
  - A 4. pont nem érinti a 13. pont szerinti felelősséget.
- **5. pont:** következetes fogalmak: felhasználói fiók, Előfizető, céges
  munkaterület.
- **6–7. pont:** a próba vége egyértelmű; „további áfa nem kerül
  felszámításra”.
- **8. pont:** a költési korlát nem kapcsolható ki, csak a kereten felüli
  feldolgozás. A régi szöveg szerint a plafon „kikapcsolható” volt, a
  Beállítások szerint viszont „nem opcionális”.
- **9. pont:** kisebb csomagnál a meglévő felhasználók maradnak, új meghívó
  nem megy át (a `20260920000200` két szabálya).
- **10. pont:** a felfüggesztés, és negyedik megszűnési módként a módosítás
  elutasítása.
- **11. pont:** visszaadás vagy törlés az adatkezelő dokumentált utasítása
  szerint (GDPR 28. cikk (3) g)).
- **12. pont:** díjleszállítás kimaradáskor. A képlet (havidíj × kiesés órái
  ÷ az időszak órái), a 30 napos igénybejelentés és a jóváírás **javasolt
  alapérték**.
- **13. pont:** Ptk. 6:152. §: *szándékos szerződésszegés*. Négyelemű
  kivétellista, és a szavatossági igények külön állnak.
- **14. pont:** az előfizető és harmadik személyek jogai maradnak, a
  jogosultságért az Előfizető felel.
- **15. pont:** külön út a fizetős előfizetés lemondására és a szerződés
  e-mailes megszüntetésére a módosítás elutasítása miatt.
- **16. pont:** a „semmit nem töröl” helyett a felfüggesztés. Az XML-ek és a
  titkos beküldési cím úgy szerepelnek, ahogy az adatkiadás ténylegesen adja.
- **17. pont:** a panaszkezelés és a jogvita külön bekezdésben.
- **Nyelv:** kikerültek a tanácsadó fordulatok. Menet közben kiderült, hogy
  négy helyen „a info@…” állt „az info@…” helyett, az 5. és a 16. pontban
  régóta.

**Az Adatkezelési tájékoztató** 4. és 6. pontja hozzá van igazítva.

**Új jogi változat: `2026-09-25`.**
- Az archívum és a `legal_versions` sor élesben van, még a felület telepítése
  előtt. A lenyomatok egyeznek.
- Élesben egyetlen cég van, a tulajdonosé, így a 15. pont szerinti előzetes
  értesítés senkit nem érint.

**A böngészős ellenőrzés talált egy hibát.** A lap tetején még
„Hatályos: 2026. szeptember 24.” állt, mert a `hatalyos` külön érték, és
eddig senki nem figyelte, hogy együtt mozogjon a `JOGI_VERZIO`-val. Javítva,
és új őr figyeli (`archivum.test.tsx`); elrontva piros lett.

**Őrök** (`jogiSzovegek.test.ts`, kommentek nélküli szövegen). Mind az öt
szándékos rontásra piros lett:
- szándékos szerződésszegés;
- a korlát alsó határa a configból, kézzel írt „29 400” nincs;
- a költési korlát nem kapcsolható ki;
- nincs „semmit nem töröl”;
- a pipa „megismertem” alakja.

A `gazdatlanFajlok.test.ts` eddig a `selejtezheto` legutolsó definíciójának
**pontos fájlnevét** is rögzítette, ezért a jogos újradefiniálásra elbukott.
Most „legalább a 0900-as” a feltétel, a tartalmi ellenőrzés maradt.

## 🔏 Adatkezelési tájékoztató, ötödik kör (2026-09-25-2)

A tulajdonos új vázlata és egy hatpontos bírálat alapján a tájékoztató
teljesen újra lett írva. A pontszámozás maradt (1–9.), mert az ÁSZF, az
Impresszum, az Útmutató és a Könyvelőknek oldal ezekre hivatkozik.

**A tulajdonos döntései:**
- **OpenRouter: „szöveg most + levélvázlat”.**
  - A DPA a Szolgáltatót „Customer = Controller”-ként kezeli, SCC 2.
    modullal.
  - A „Sensitive Data” fogalmába az adóazonosító („tax file number … or
    similar identifier”) és a pénzügyi információ is beletartozik. A DPA
    2.6. pontja szerint ezt csak kifejezett megállapodás alapján vállalja.
  - A szöveg ezt ma is így mondja ki. A módosítást (3. modul, Sensitive
    Data, EU-Only Processing Addendum) a tulajdonos kéri az OpenRoutertől,
    levélvázlattal.
  - ⚠️ **Nyitott szerződéses kockázat.** Az 5. pont „kezdeményezzük” mondata
    csak addig igaz, amíg a levél tényleg elmegy.
- **Google: „csak szövegben”.**
  - A kód továbbra is mindkét végpontot engedi (`google-ai-studio`,
    `google-vertex`).
  - A szöveg ezt mondja. Azt is, hogy `zdr: true` mellett az OpenRouter
    nyilvántartása dönti el, melyik szolgálhat ki, és hogy ez nem az
    OpenRouter garanciája.
  - A ZDR és a tanítási tilalom két külön feltétel.
- **Fogalom: „munkaterület”**, nem „munkatér”.

**A hat pont:**
1. **Két táblázat.**
   - 2.1.: a saját adatkezelésünk.
   - 2.2.: az Előfizető megbízásából végzett adatfeldolgozás, „Kinek az
     utasítására?” oszloppal.
   - A munkamenetnél külön áll a böngészőtárolás indoka és a GDPR-jogalap.
2. **OpenRouter-szerepek** és a „Sensitive Data” kikötés, lásd fent.
3. **A Google-útvonal** pontosan.
4. **Kikerült az „aki nincs rajta, az nem fér hozzá” mondat.** Helyette:
   - a közreműködők al-adatfeldolgozói;
   - hatósági megkeresés, az Előfizető értesítésével, ha jogszabály nem
     tiltja.
5. **Megőrzés három szinten:** aktív rendszer, mentés (hét nap), külső
   szolgáltató.
   - **Soha nem exportált bizonylat:** nincs rá automatikus határidő. A
     felületről csak a duplikátum és a hibás vethető el
     (`src/lib/feltoltes.ts`), a fájl gazdátlanként egy napon belül törlődik.
   - **Tagság vége:** a fiók cég nélküli fiókként marad, és 180 nap belépés
     nélkül törlődik.
   - **Vercel kiszolgálónapló:** új sor. A megőrzési idejét nem tudtuk
     megmérni, ezért a szöveg a szempontot mondja, nem egy számot.
6. **A gépi jóváhagyás nem GDPR 22. cikk szerinti döntés.**
   - A jogok „az adott adatkezelésre vonatkozó feltételek szerint” járnak.
   - A hordozhatóság szűk.

**Új jogi változat: `2026-09-25-2`.** Ugyanazon a napon ez a második, ezért
`-2` utótagos, a `hatalyos` marad „2026. szeptember 25.”.
- Az ÁSZF és az Impresszum lenyomata változatlan.
- A `legal_versions` sor a push előtt élesben van
  (`20260925000300_jogi_verzio_2026_09_25_2.sql`).

**Őrök** (`jogiSzovegek.test.ts`, kommentek nélküli, egy szóközre húzott
szövegen). Mind a tíz szándékos rontásra piros lett, a Google-végpontoké a
`config/szamlafolyo.ts` rontására is.

A `gondolatjel.test.ts` anti-vakság korlátja 300-ról 150-re került. A
látható nagykötőjelek száma 287-re esett, mert az átírások sok közbevetést
kivettek. A korlát dolga csak az, hogy egy üresen futó bejárás elbukjon.

## 🪪 Impresszum: rövidebb, tárgyszerűbb (2026-09-25-3)

Az Impresszum a tulajdonos tervezete szerint készült. A látogató gyorsan
megtalálja, ki működteti a szolgáltatást, hogyan éri el, és hová fordulhat.

**Tartalmi javítások (a bírálat négy pontja):**
- **Békéltető testület.** A korábbi +36 46 501-090 nem a hivatalos szám. A
  helyes elérhetőségek:
  - új ügyekben +36 46 501-091;
  - folyamatban lévő ügyekben +36 46 501-871;
  - e-mail: bekeltetes@bokik.hu.

  A testület oldala a konténerből nem érhető el. Az adatokat a bírálat és a
  keresőindex egybehangzóan adja.
- **Tárhelyszolgáltatók.** A link mellett látható adatvédelmi e-mail-cím is
  áll (Ektv. 4. §). A címek a szolgáltatók saját DPA-jából, a 2026-09-22-i
  mentésből származnak:
  - Supabase: privacy@supabase.io;
  - Vercel: privacy@vercel.com.

  Új mezők: `adatvedelmiEmail` és `tarolasiRegio`. Csak ott vannak
  kitöltve, ahol a forrás megvan.
- **Békéltetés feltételesen.** A KKV-minőség önmagában nem tesz minden vitát
  békéltethetővé. Kikerült a regionális rendszer ismételt magyarázata és a
  ⚠️ jel.
- **Szellemi tulajdon.** A jogok a szolgáltatót vagy az adott jogosultat
  illetik meg. A licencek és a törvény által megengedett felhasználás is
  szerepel.

**Két eltérés a tervezettől:**
- Az Adatkezelési tájékoztatóra mutató linkek pontszámot kaptak (5. és 8.
  pont).
- A testület címe „Szentpáli u. 1.” maradt, mert az ÁSZF is ezt az értéket
  használja.

**Új jogi változat: `2026-09-25-3`.**
- Csak az Impresszum lenyomata új.
- A `legal_versions` sor a push előtt élesben van.

**Őrök.**
- A régi „Melyik testület illetékes.” őr az Impresszumnál a tervezet
  főszabály-mondatát nézi, és azt is, hogy a konkrét testület csak utána jön.
- Új őrök figyelik:
  - a testület számait és e-mail-címét, valamint a régi szám tilalmát;
  - a két adatvédelmi címet;
  - a feltételes békéltetést;
  - a szellemi tulajdon szövegét;
  - az emoji hiányát.
- Minden rontásra piros lett. Egy kivétel volt: a látható telefonszám
  kivétele forrásszinten zöld maradt, mert a `href` még hivatkozott a
  mezőre. Ezért egy új őr a **renderelt HTML-en** is ellenőrzi a két számot
  és a három e-mail-címet. Ez már piros lett.

### 📨 OpenRouter: a megkeresés elment (2026-09-25)

A tulajdonos elküldte a levelet az OpenRouternek. Három kérdésben kér
választ:
- szerződésmódosítás a „Sensitive Data” miatt (adóazonosító, pénzügyi adat);
- SCC 3. modul (adatfeldolgozó → adatfeldolgozó);
- EU-Only Processing Addendum: elérhető-e, és milyen feltételekkel.

Az Adatkezelési tájékoztató 5. pontjának „kezdeményezzük” mondata ezzel
igaz. **Nyitott:** a válasz még nem jött meg. Ha megjön, az 5. pontot a
tényleges eredményhez kell igazítani, új jogi változatban.

## 📣 Új hirdetéscsomag: Meta + Google (2026-09-25)

A régi `marketing/meta/` csomag törölve. A szövegei a 2026-09-22-i
nyitólapra épültek, és több helyen elavultak:
- „könyvelésre kész adat”, „percek alatt”;
- a Vercel Analytics még szerepelt benne;
- a nyitólap mintakártyája azóta kikerült;
- a könyvelőprogram-export még nem volt benne.

Az új csomag: `marketing/hirdetes/`.

**Egy forrás, minden ebből gyártva.** A `szovegek.ts` tartalma:
- **Meta:** 7 üzenet, mindegyikhez címsorok, leírások, rövid és hosszú fő
  szöveg.
- **Google Keresés:** 2 kampány (vállalkozások, könyvelők), 15 címsor és 4
  leírás hirdetésenként, kulcsszavak, kizárók, webhelylinkek, kiemelések és
  kiegészítő részletek.
- **Performance Max:** egy eszközcsoport.

Az árak és a próba számai a configból jönnek. A `keszit.ts` gyártja a
képeket, a `SZOVEGEK.md`-t és a két Google Ads Editor CSV-t:
- 28 Meta-kép;
- 15 Google-kép és 2 logó.

**Mérve, nem becsülve** (`hirdetes.test.ts`, 31 teszt, az `npm test` része):
- Karakterkorlát minden szövegre. Az első futás négy túl hosszú szöveget
  fogott meg: három Meta fő szöveg 130–131 karakteres volt a 125 helyett, egy
  Google-kiemelés 26 a 25 helyett.
- Tiltott ígéretek.
- Minden forintösszeg a configból való.
- A céloldalak és a horgonyok léteznek.
- A könyvelőprogram-exportot csak kimért programra hirdetjük (`KIMERVE`).
- A képek felületszövegei az alkalmazásból valók: a validátor mondata, az
  állapotcímkék és a nyitólap bizonylatlistája. A kitalált adószám a valódi
  `ervenyes()`-en is átmegy.
- A gyártott fájlok naprakészek.

Mind a tíz szándékos rontásra piros lett.

**A képek illesztése mérésből jön.** A fekvő formátumban az első futás 52–69%-ra
kicsinyített. A fekvő elrendezés azóta alcím nélküli, sűrű kártyás, és
kicsinyítés nélkül fér el. A 9:16-os képeken felül 270, alul 360 képpont
szabad marad, mert ott a Meta felülete takar.

**Amit a csomag nem old meg, és ezért az OLVASS-EL elöl mondja:**
- **Nincs pixel és nincs Google-címke.** Az Adatkezelési tájékoztató 2. pontja
  ígéri, hogy nincs hirdetési kód. A kampánycél ezért:
  - Meta: céloldal-megtekintés;
  - Google: kattintások maximalizálása.

  A Performance Max anyaga kész, de mérés nélkül nem ajánlott indítani.
- **Az oldal semmilyen látogatásmérést nem futtat.** A kampányhatás saját
  jelzése a „Honnan hallottál rólunk?” válasz, összesítve (*Google-keresés*,
  *Online hirdetés*, *Facebook*).
- **Harmadik fél védjegyei** (RLB, Novitax, Kulcs) a hirdetésszövegben:
  jogosulti panasz esetén a Google korlátozhatja őket.
- A két bemutatóvideó 16:9-es (44 és 70 mp, az MP4-fejlécből mérve), álló
  változat nincs.
- A CSV-oszlopnevek az Ads Editor angol felületéhez igazodnak. A konténerből
  nem tudtam kipróbálni, ezért közzététel előtt az előnézetet át kell nézni.
