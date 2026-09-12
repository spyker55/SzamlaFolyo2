# A `kiolvas` Edge Function

A lánc: **claim → felderítés → XML-ág vagy modellhívás → tisztítás →
normalizálás → validátorok → konfidencia → kapuk → állapot + kredit.**

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

```bash
npx supabase functions deploy kiolvas --project-ref mwveyzyxupgccqdnbpwe
```

A `deno.json` az import-térkép: ugyanaz a bare specifier (`fast-xml-parser`,
`unpdf`, `@supabase/supabase-js`) működik Deno alatt és a Vitest-tesztekben is,
így a `shared/uzleti/` egyetlen példányban létezik.

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

Amíg ezek nincsenek meg, a `belso.sort_hajt()` **némán nem csinál semmit** —
egy hiányzó beállítás nem tölti meg percenként a naplót. Hogy megvannak-e:

```sql
select * from belso.sor_allapot();
```

## Amit a következő kör hoz

- **Beágyazott XML** (Factur-X / ZUGFeRD PDF-ben). A felderítés ma a
  `strukturalt_xml`, a `szovegreteg` és a `kep` ágat ismeri; a PDF-be ágyazott
  XML kinyerése külön munka, és addig az ilyen bizonylat a modellhez megy —
  helyes eredménnyel, csak drágábban.
- **Kötegszétszedés.** A `tobb_irat_gyanu` ma emberhez viszi a bizonylatot. A
  modell által adott oldalhatárok szerinti bizonylatonkénti újrafuttatás a
  következő lépés; az adatmodell (`oldal_tol`, `oldal_ig`) és a
  kreditszámítás (`bizonylatOldalszama`) már készen áll rá.
- **Keretellenőrzés.** A kvóta ma nem áll meg a kereten: a `document_extractions`
  már gyűjti a krediteket, de a feldolgozás előtti ellenőrzés a számlázási
  körrel jön.
