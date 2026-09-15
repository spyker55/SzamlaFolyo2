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

### Csomaggal, ha a CLI nem érhető el

A `kiolvas.bundle.js` **generált** artefakt — a `csomagol.mjs` állítja elő:

```bash
npm run kiolvas:csomag
```

Ez akkor kell, ha a telepítés olyan úton megy, ahol a fájlok a hívásba
ágyazva utaznak (például a Supabase MCP `deploy_edge_function` eszközével): a
forrásfájlok nem férnek el egy hívásban, egy csomag igen. A belépési pont
ilyenkor `supabase/functions/kiolvas/kiolvas.bundle.js`, az import-térkép
változatlanul `supabase/functions/deno.json`.

> ⚠️ **Ez az út drágább, mint amilyennek látszik, és nem gépidőben.** A csomag
> ASCII-tiszta, tehát minden ékezet escape-ként utazik: **854 escape-szekvencia,
> 962 backslash, 1400 idézőjel** — és a hívás JSON-jában mindet újra kell
> escape-elni. Nem fájlmásolás, hanem több ezer karakter hibátlan átírása.
>
> A hangos hiba nem baj: a csomag nem bootol, a percenkénti cron azonnal jelez.
> A **csendes** viszont igen: egy rossz karakter a prompt szövegében átmegy a
> szintaxison, és utána rosszabbul olvasunk ki bizonylatokat, anélkül hogy
> bármelyik mérőeszközünk szólna. Ezért elsődleges a CLI.

**A csomagot soha ne szerkeszd kézzel.** Ami benne változik, az a forrásban
változzon, és futtasd újra a scriptet — a `csomagol.mjs` fejlécében ott az
összes indok, a minifikálástól az ASCII-tisztaságig.

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

- a tartományok hézag és átfedés nélkül fedjék le a fájl **minden** oldalát;
- legalább kettő legyen belőlük, de legfeljebb `koteg.maxDarab`;
- minden szám egész, 1-alapú, a fájlon belül.

Bármelyik feltétel bukik → **nem szedünk szét**, marad a mai viselkedés (egy
bizonylat, `tobb_irat_gyanu` zászlóval). A hézagot nem javítjuk ki: akkor mi
találnánk ki, hova tartozik egy oldal.

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

## Amit a következő kör hoz

- **Beágyazott XML** (Factur-X / ZUGFeRD PDF-ben). A felderítés ma a
  `strukturalt_xml`, a `szovegreteg` és a `kep` ágat ismeri; a PDF-be ágyazott
  XML kinyerése külön munka, és addig az ilyen bizonylat a modellhez megy —
  helyes eredménnyel, csak drágábban.
- **A szétszedés ára.** A szétszedő kör **minden többoldalas PDF-en** lefut,
  akkor is, ha egy háromoldalas számláról van szó. Szövegréteggel ez olcsó
  (csak a szöveg megy át, nem a képek), szkennelt kötegnél viszont egy teljes
  modellhívásnyi. A `document_extractions` sorban `credits = 0`, a `cost`
  viszont valódi — vagyis **mérhető**, mennyibe kerül. Ha a számok azt mutatják,
  hogy sokba, a fék kézenfekvő: a szkennelt ágon a szétszedést a kiolvasás
  `tobb_irat_gyanu` zászlójához lehet kötni, amit amúgy is megfizetünk. Ezt
  most **nem** tettük meg, mert az a zászló még nincs mérve — előbb a számok,
  utána az optimalizálás.
