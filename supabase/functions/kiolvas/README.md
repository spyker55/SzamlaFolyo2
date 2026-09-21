# A `kiolvas` Edge Function

A lánc: **keretellenőrzés → claim → felderítés → kötegszétszedés → XML-ág vagy
modellhívás → tisztítás → normalizálás → validátorok → konfidencia → kapuk →
állapot + kredit.**

A keret a **claim előtt** áll, és ennek oka van: a claim megnöveli az
`attempts` számlálót, három próbálkozás után pedig a bizonylat `hiba` állapotba
kerül. Egy elfogyott keret viszont nem hiba, és nem is a bizonylattal van baj —
ha itt fogyasztana próbálkozást, a cron három perc alatt véglegesen elrontana
minden várakozó iratot, mielőtt a felhasználó csomagot választhatna.

A tényleges üzleti logika nem itt van, hanem a `shared/uzleti/` alatt — ez a
mappa csak az adatbázis- és tárolóhuzalozás. A lánc tiszta magja
(`shared/uzleti/lanc.ts`) hálózat és adatbázis nélkül tesztelhető, és
tesztelve is van.

## Két hívási mód

| Mód | Ki hívja | Jogosultság |
|---|---|---|
| `{ "dokumentum_id": "…" }` | a böngésző, feltöltés után | a **hívó tokenjével** ellenőrizzük, hogy láthatja-e a dokumentumot (RLS dönt) |
| `{ "limit": 5 }` | a `pg_cron` percenként | csak `service_role` kulccsal |

A függvény `service_role`-lal dolgozik, tehát megkerüli az RLS-t. Ezért a
dokumentum-azonosítós hívásnál **külön ellenőrizzük a hívó jogosultságát** —
enélkül bármely belépett felhasználó elindíthatná más cég bizonylatának
feldolgozását, és a költséget is más cég keretére terhelné.

## Telepítés

Két út van, és **ugyanaz a kód megy fel mindkettőn**.

### CLI-vel — ez az elsődleges út

```bash
npx supabase login
npx supabase functions deploy kiolvas --project-ref mwveyzyxupgccqdnbpwe
```

Ez a forrásfájlokat küldi fel úgy, ahogy vannak. A `deno.json` az
import-térkép: ugyanaz a bare specifier (`fast-xml-parser`, `unpdf`,
`@supabase/supabase-js`) működik Deno alatt és a Vitest-tesztekben is, így a
`shared/uzleti/` egyetlen példányban létezik.

A belépési pontot és a `verify_jwt`-t a repógyökér `supabase/config.toml`-ja
rögzíti. **Ez a fájl nem elhagyható**: a CLI ebből ismeri fel a
projektgyökeret, és ami nincs benne leírva, azt egy telepítés csendben
visszaállíthatja az alapértékre.

> Az access tokent a `login` böngészőben intézi. Ha inkább környezeti változót
> használnál (`SUPABASE_ACCESS_TOKEN`), az **maradjon a gépeden** — ugyanaz a
> megfontolás, mint a `service_role` kulcsnál.

### A generált csomag — nyugdíjazva (2026-09-21)

Itt korábban egy `kiolvas.bundle.js` állt, amit a `csomagol.mjs` gyártott
(`npm run kiolvas:csomag`). Az MCP-s telepítéshez kellett: oda a fájlok a
hívásba ágyazva utaznak, és a forrásfájlok nem férnek el egy hívásban.

**Mindkettő törölve**, három mért okból:

1. **A production nem használta.** A `config.toml` a v6 óta a forrásra mutat,
   és azóta tizenegy verzió ment ki így — a telepített fájlokat többször
   vetettük össze a repóval, bájtra egyeztek.
2. **A commitolt példány elcsúszott, és pont a fékek maradtak ki belőle.** Hat
   nap, húsz commit: hiányzott belőle a `keretEllenoriz` és a teljes
   túlhasználati plafon. Aki sietségből arra állítja a belépési pontot, keret
   nélkül futó kiolvasást telepít — és az nem hibázik, csak dolgozik.
3. **A csomagoló be nem jelentett függőségen állt**: az `esbuild` nincs a
   `package.json`-ban, csak a Vite húzta be tranzitívan. Egy Vite-frissítés
   bármikor elvihette volna, és csak a kijárat használatakor derült volna ki.

Ha valaha mégis kell egy egyfájlos csomag, a recept megvan a történetben:

```bash
git show c29c23a:supabase/functions/kiolvas/csomagol.mjs > csomagol.mjs
```

> ⚠️ **És ha elővennéd, tudd, mit veszel elő.** A csomag ASCII-tiszta, tehát
> minden ékezet escape-ként utazik — a legutóbbi mérés szerint 854
> escape-szekvencia, 962 backslash és 1400 idézőjel, amit a hívás JSON-jában
> mind újra kell escape-elni. A hangos hiba nem baj: a csomag nem bootol, a
> percenkénti cron azonnal jelez. A **csendes** viszont igen: egy rossz
> karakter a prompt szövegében átmegy a szintaxison, és utána rosszabbul
> olvasunk ki bizonylatokat, anélkül hogy bármelyik mérőeszközünk szólna.
> Ezért elsődleges a CLI.

> A `verify_jwt` **maradjon bekapcsolva**. Mindkét valódi hívó érvényes JWT-t
> küld (a böngésző a felhasználóét, a cron a `service_role` kulcsot), a függvény
> pedig ezen **túl** is ellenőriz — lásd a két hívási módot fent.

### Titkok

A függvény egyetlen titka az OpenRouter-kulcs:

```bash
npx supabase secrets set OPENROUTER_API_KEY=... --project-ref mwveyzyxupgccqdnbpwe
```

A `SUPABASE_URL`, a `SUPABASE_ANON_KEY` és a `SUPABASE_SERVICE_ROLE_KEY`
magától rendelkezésre áll az Edge Function környezetében.

### A sorkezelő cron

A percenkénti cron az elakadt és a félbemaradt futásokat szedi fel (az élő
utat a feltöltés utáni közvetlen hívás hajtja). A hívásához két titok kell a
**Vaultban** — nem a cron-parancsba írva, mert a `cron.job` tábla tartalma
olvasható:

```sql
select vault.create_secret('https://mwveyzyxupgccqdnbpwe.supabase.co', 'projekt_url');
select vault.create_secret('<service_role kulcs>', 'service_role_kulcs');
```

A `projekt_url` **nem titok** — az a nyilvános végpont; azért van mégis a
Vaultban, mert a `sort_hajt()` egy helyről olvassa mindkettőt, és a `cron.job`
táblában így semmi nem áll. A `service_role` kulcs viszont megkerüli az RLS-t:
azt **az SQL-editorban** érdemes beírni, ne egy chatablakon vagy egy
eszköznaplón át.

Jelenleg a `projekt_url` megvan, a `service_role_kulcs` **nincs** — vagyis a
cron él, de nem csinál semmit.

Amíg ezek nincsenek meg, a `belso.sort_hajt()` **némán nem csinál semmit** —
egy hiányzó beállítás nem tölti meg percenként a naplót. Hogy megvannak-e:

```sql
select * from belso.sor_allapot();
```

## Kötegszétszedés

Egy PDF-ben gyakran több bizonylat van. A `felderit()` után a függvény
megkérdezi a modellt, **hol vannak a bizonylathatárok** (külön prompt, külön
verziószám: `szet-v1`), és a választ a `shared/uzleti/koteg.ts` ellenőrzi:

- a tartományok **nem fedhetnek át** — egy oldal nem tartozhat két bizonylathoz;
- legalább kettő legyen belőlük, de legfeljebb `koteg.maxDarab`;
- minden szám egész, 1-alapú, a fájlon belül.

Bármelyik bukik → **nem szedünk szét**, marad a mai viselkedés (egy bizonylat,
`tobb_irat_gyanu` zászlóval).

**A besorolatlan oldal viszont nem bukás, hanem kitöltendő hézag.** Az első
éles köteg tanította meg: számla, **üres elválasztó oldal**, szállítólevél — és
egy üres oldalról a modell jogosan nem állítja, hogy bizonylat. A kimaradt
oldal a **megelőző** bizonylathoz kerül (a fájl elején a következőhöz), vagyis
a kód ugyanazt a szabályt tartatja be, amit a prompt is kér. Hogy hol tettük
ezt, az a kiolvasás-sor `fields` oszlopába kerül — utólag megkülönböztethető,
melyik tartomány a modellé és melyik a miénk.

Az átfedés azért marad elutasítás, mert ott nem hiányzik egy oldal, hanem
**kétszer számítana be** — és nincs szabály, amivel el lehetne dönteni, melyik
bizonylaté.

Ha szétszedünk, minden bizonylat **külön `documents` sort** kap saját
oldaltartománnyal, és mindegyik **külön kreditet** fogyaszt a saját oldalszáma
szerint. A szétszedő futás maga nulla kredit — a szétszedés a szolgáltatás
része (ÁSZF 8. pont), a dollárköltsége viszont beíródik.

⚠️ **A fájlt nem vágjuk szét, a modellnek küldött másolatot viszont igen.** Ha
a modell az egész köteget kapná, és csak a promptban kérnénk, hogy „a 3–4.
oldalt olvasd", minden darabra ugyanazt az első bizonylatot olvasná ki. A
`pdf.ts` ezért kivág egy tartományt tartalmazó PDF-et a hívás idejére — az
sehova nem kerül mentésre. A tárolt fájl érintetlen marad, és az előnézet
`#page=N`-nel ugrik a helyére.

A szétszedés a **saját sor tartományát azonnal beírja**, még a kiolvasás előtt.
Enélkül egy félbemaradt futás után az újrapróbálás úgy találná a sort, hogy
neki nincs tartománya, a testvéreinek van — és az egész fájlt küldené el.

## Hová megy el az idő — mérve

Egy valódi, egyoldalas PDF (2026-09-21), a szakaszmérés első éles futása:

| Szakasz | Idő |
|---|---|
| letöltés (a bájtok kiolvasásával) | 922 ms |
| felderítés (PDF-értelmezés) | 76 ms |
| szétszedés (egyoldalas, kihagyva) | 0 ms |
| **kiolvasás (modellhívás)** | **9 942 ms** |
| előzmény-lekérdezés | 101 ms |
| *teljes lánc* | *11 096 ms* |

A modell tehát a lánc **90%-a**. Az üres sorú cron-futások 0,5–2,0 s-ban
lefutnak, vagyis hidegindítás nincs — a percenkénti cron melegen tartja.

### A gondolkodás: a gyanúból tény lett

`output_tokens: 1194`, ebből **`reasoning_tokens: 891`** — a kimenet **74,6%-a**
gondolkodás. A tényleges válasz nagyjából 300 token. Vagyis a tízmásodperces
modellhívás háromnegyede olyasmire megy el, amit soha nem használunk fel.

Ez a szám most már mérés, nem becslés, és a korlátozás ettől **reális** lépés —
de továbbra is a pontossággal együtt mérendő.

### ⚠️ És egy nagyobb tétel, amit ugyanez a mérés hozott elő

A bizonylat létrejöttétől a kiolvasás végéig **62 másodperc** telt el, miközben
a lánc 11. A különbség — **~51 másodperc** — tiszta sorbanállás volt: a
feltöltés utáni közvetlen hívás nem ment át, és a bizonylatot a percenkénti
cron szedte fel.

Az ok a hiányzó CORS-elővizsgálat volt ebben a függvényben (lásd a `CORS`
konstans fejlécét az `index.ts`-ben). A böngésző el sem küldte a POST-ot, a
hívó oldal pedig a hibát elnyelte — így a rendszer *majdnem működött*, csak
minden feltöltés ötven másodperccel lassabban.

### ✅ A javítás után, ugyanazon a napon

| | Előtte (03:07) | Utána, hidegen (03:16) | Utána, melegen (03:21) |
|---|---|---|---|
| sorbanállás | **51,3 s** | 3,6 s | **1,2 s** |
| letöltés | 922 ms | 314 ms | 174 ms |
| teljes idő a feltöltéstől | 62,4 s | 9,4 s | **6,5 s** |

A sorbanállás eltűnése egyértelműen a CORS-javításé: a böngésző hívása
megérkezik, nem kell a percfordulóra várni.

⚠️ **Amit viszont NEM írunk a javítás javára:** a modellhívás 9 942 → 5 333 ms
változását. A két futás **két különböző PDF** (44 kB kontra 34 kB, 1194 kontra
716 kimeneti token) — a modell azért volt gyorsabb, mert kevesebbet írt, nem
mert bármit gyorsítottunk volna rajta.

A 03:16-os futás 3,6 másodperces sorbanállása **hidegindítás volt**, és ezt a
következő feltöltés igazolta: a telepítés 03:16:31-kor történt, az a feltöltés
03:16:56-kor — az első hívás az új verzión, még az első cron előtt. Melegen a
sorbanállás **1,2 másodperc**, a letöltés pedig 922 → 314 → 174 ms-ra esett.

Ennél lejjebb nincs értelme menni: az 1,2 másodperc a hívás körútja, a
keretellenőrzés és a claim együtt — ugyanaz a 0,5–2,0 s, amit az üres sorú
cron-futások is mutatnak. A sorbanállásból nem maradt kergetnivaló.

A gondolkodás aránya a két mérésen 74,6% és 55,7% — dokumentumonként változik,
de mindkétszer érdemi.

### A gondolkodás korlátozása: megmérve, és szándékosan nem lépünk

A lehetőség adott és megnevezhető: `reasoning.effort` / `max_tokens` az
OpenRouteren, Gemini 3-on a Google `thinkingLevel`-jére képezve. A mért
arányok alapján a modellhívás érdemi részét vihetné le.

**Mégsem csináljuk meg** (a felhasználó döntése, 2026-09-21), és ez nem
halasztás: a CORS-javítás után a teljes folyamat pár másodperc, vagyis a
maradék nyereség nem éri meg a kockázatot. A kockázat pedig konkrét: a termék
egész ígérete azon áll, hogy a modell **észreveszi, ha bizonytalan** — a
`nehezen_olvashato` zászlón és a mezőnkénti magabiztosságon. A
`gemini-3.1-flash-lite` pontosan ezen bukott meg: magabiztosan talált ki
szállítóneveket, és a zászlót egyszer sem kapcsolta be.

Ha egyszer mégis előkerül, a feltétel ugyanaz marad: **pontosságot mérni
hozzá, nem stopperórát.** A sebességet egy futásból meg lehet mérni, a
pontosságot nem. A `reasoning_tokens` oszlop addig is gyűjti a számokat.

**A tanulság sorrendje számít:** a modell 10 másodperce valódi, de mellette egy
50 másodperces várakozás állt, amiről senki nem tudott. Előbb a mérés, utána az
optimalizálás — enélkül a gondolkodás korlátozásán dolgoztunk volna, és a
felhasználó továbbra is egy percet várt volna.

## Hibrid e-számla: a beágyazott XML

A Factur-X és a ZUGFeRD egyetlen fájl két olvasattal — ember által olvasható
PDF, és **ugyanaz a számla** géppel olvasható XML-ként a mellékletei között. A
`felderit()` ezért a PDF-ágon megnézi a mellékleteket, és ha talál e-számla
XML-t, a jelleg **`beagyazott_xml`** lesz: onnantól ugyanaz az út fut, mint egy
önállóan feltöltött XML-nél, nulla modellköltséggel.

A **döntés** — hogy melyik melléklet az e-számla — a `shared/uzleti/xml/csatolmany.ts`-ben
él, nem itt. Nem stiláris: ez az egyetlen része a műveletnek, ami hibázhat úgy,
hogy közben látszólag működik, és így telepítés nélkül, egységteszttel mérhető.
A `felderites.ts` dolga annyi, hogy a pdf.js válaszát erre az alakra képezze.

Négy dolog, ami mérve van (`felderites.test.ts`, `csatolmany.test.ts`):

- **a pdf.js a `Names/EmbeddedFiles` névfát olvassa, az `/AF` bejegyzéseket
  nem.** A PDF/A-3 — és vele a Factur-X meg a ZUGFeRD — mindkettőt előírja,
  tehát a szabványos hibrid számla átjön; egy csak `/AF`-et író kiadó
  bizonylata a modellhez esik. Az irány jó: rosszabb kiolvasás helyett drágább.
- **a `getAttachments()` melléklet nélküli PDF-re `null`-t ad**, nem üres
  objektumot;
- ⚠️ **a pdf.js átveszi a kapott puffert**, és leválasztja: a hívás után a
  `bajtok.byteLength` **0** lenne. A `kiolvas` viszont a felderítés **után** is
  ugyanebből vág ki oldalakat és ezt küldi a modellnek — ezért másolattal
  hívjuk. Élesben ez eddig nem sült el, és ez tény; hogy *miért* nem, az
  feltevés (valószínűleg az Edge Runtime álfeldolgozója nem ad át puffert), és
  **innen nem mérhető** — ebben a környezetben nincs Deno. Egy feltevésre pedig
  nem támaszkodunk;
- **a melléklet saját bájthossza** megy a 4 MB-os XML-korláthoz, nem a fájlé. A
  kettő önálló XML-nél ugyanaz; egy 5 MB-os PDF-be ágyazott 10 kB-os XML-t a
  régi alak elutasított volna.

**A hibrid számla nem kerül kötegszétszedésre**: a szabvány fájlonként egy
bizonylatot ír elő, és a melléklet maga mondja meg, mi van a fájlban — egy
szétszedő modellhívás ugyanazt az egy számlát találná meg, fizetős áron. A
határeset az `esetlegSzetszed()` fejlécében ki van mondva.

Mintafájl a kézi próbához: `minta/factur-x-szabalyos.pdf` — **711 karakteres
szövegréteggel**, tehát e kör előtt `szovegreteg` lett volna és a modellhez ment
volna.

## Amit a következő kör hoz

- ⚠️ **A `supabase/` alatti kód nincs típusellenőrizve.** Mérve: a
  `tsconfig.app.json` `include`-ja `src`, `shared` és `config` — a `npm run
  typecheck` tehát **egyetlen Edge Function-fájlt sem** néz meg, és egy
  szándékosan beírt típushibát nem talált meg. A hálót ma a Vitest-tesztek és a
  telepítéskor futó `deno check` adják. Ez nem ennek a körnek a hibája és nem is
  sürgős, de addig nem szabad elfelejteni, amíg a `typecheck` zöldjét
  bizonyítéknak vesszük a telepített kódra.
- **A szétszedés ára.** A szétszedő kör **minden többoldalas PDF-en** lefut,
  akkor is, ha egy háromoldalas számláról van szó. Szövegréteggel ez olcsó
  (csak a szöveg megy át, nem a képek), szkennelt kötegnél viszont egy teljes
  modellhívásnyi. A `document_extractions` sorban `credits = 0`, a `cost`
  viszont valódi — vagyis **mérhető**, mennyibe kerül. Ha a számok azt mutatják,
  hogy sokba, a fék kézenfekvő: a szkennelt ágon a szétszedést a kiolvasás
  `tobb_irat_gyanu` zászlójához lehet kötni, amit amúgy is megfizetünk. Ezt
  most **nem** tettük meg, mert az a zászló még nincs mérve — előbb a számok,
  utána az optimalizálás.
