# `email-bekuldes` — a bejövő levél webhookja

A cégnek saját beküldő címe van: `b-<token>@bekuldes.szamlafolyo.hu`. Ami oda
érkezik, annak a mellékleteiből bizonylat lesz — ugyanúgy, mintha a Beérkezőbe
töltötték volna fel.

## A lánc

```
Resend (EU, eu-west-1)
  → webhook: email.received   (CSAK metaadat: feladó, címzett, tárgy, melléklet-lista)
    → aláírás-ellenőrzés       shared/uzleti/alairas.ts
    → címzett → cég            shared/uzleti/bekuldes.ts  cimzettekbolToken()
    → be van-e kapcsolva?      companies.bekuldes_be
    → feladó rendben?          feladotEllenoriz()
    → van-e keret?             shared/uzleti/keret.ts     (a LETÖLTÉS ELŐTT)
    → mit töltsünk le?         mellekletValogat()          ← fejlécekből, olcsó szűrő
    → letöltés                 Resend receiving API
    → típus a BÁJTOKBÓL        shared/uzleti/fajltipus.ts  ellenoriz()  ← a végső szó
    → tároló + files + documents
  → a percenkénti cron (`szamlafolyo-sor`) felveszi a kiolvasásra
```

## ⚠️ `verify_jwt = false` — az egyetlen ilyen függvény

A `kiolvas` és a `selejtez` a platform JWT-ellenőrzése mögött ül, és a
`token.ts` érvelése **arra támaszkodik**, hogy a tokent már hitelesítették.
Webhook-végponton ez nem járható: a levélszolgáltató nem tud Supabase-JWT-t
küldeni.

Ezért itt a hitelesítés **teljes egészében** az `alairas.ts`, és az a **legelső**
dolog, ami lefut. Aláírás nélkül a kód nem olvas adatbázist, nem tölt le semmit
és nem ír naplót.

Ha valaki ezt `true`-ra állítja a `config.toml`-ban, **a beküldés némán megáll**:
a levelek eltűnnek, és a felületen semmi nem jelzi.

## A válaszkódok

| Kód | Mikor | Miért |
|---|---|---|
| **401** | rossz vagy hiányzó aláírás | Ez nem a szolgáltatótól jött. |
| **200** | minden más — ismeretlen címzett, elutasított feladó, elfogyott keret, sőt váratlan hiba is | Ezek a **mi** döntéseink, nem kézbesítési hibák. Egy 4xx csak annyit érne el, hogy a szolgáltató napokig újrapróbálkozzon ugyanazzal. |

## Beállítás

### 1. DNS (a `szamlafolyo.hu` zónájában)

| Cél | Típus | Név | Érték | Pri |
|---|---|---|---|---|
| fogadás | MX | `bekuldes` | `inbound-smtp.eu-west-1.amazonaws.com` | 10 |
| fogadás | TXT | `resend._domainkey.bekuldes` | a Resend DKIM-kulcsa | — |
| küldés | TXT | `resend._domainkey` | a Resend DKIM-kulcsa | — |
| küldés | MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| küldés | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| küldés | CNAME | `rsend` | `send.forge.rmta.net` | — |

> ⚠️ **Az SPF TXT a `send` aldomainre megy, nem a gyökérre.** Ha a
> `szamlafolyo.hu`-n már van SPF rekord, egy **második** SPF az összes levelet
> elrontaná (`permerror`). A gyökér MX-éhez sem nyúlunk: az `info@szamlafolyo.hu`
> érintetlen marad.

A fogadás **tartomány-szintű catch-all**: a Resend mindent elfogad a
`bekuldes.szamlafolyo.hu` alatt, és a címzett szerinti szétosztás a **mi**
dolgunk. Pontosan ez az alak kell a tokenes címzéshez.

### 2. Titkok (Supabase Edge Function secrets)

| Név | Mire |
|---|---|
| `RESEND_API_KEY` | a mellékletek letöltése a receiving API-ról |
| `RESEND_WEBHOOK_SECRET` | az aláírás ellenőrzése (`whsec_…`) |

> **A kulcsokat ne másold beszélgetésbe** — ugyanaz a szabály, mint a
> `service_role` kulcsnál. A Supabase dashboardon vagy
> `npx supabase secrets set`-tel állítsd be.

### 3. Telepítés és webhook

```bash
npx supabase functions deploy email-bekuldes --project-ref mwveyzyxupgccqdnbpwe
```

Utána a Resend webhook a függvény URL-jére mutasson, `email.received` eseményre.

### 4. Mérés telepítés után — ne a `status: ACTIVE`-ot hidd el

Ez a PLACEHOLDER-eset tanulsága (lásd a `kiolvas/README.md`-t). Itt olcsó az
egészségpróba: egy **rossz aláírású** kérés a végpontra **401**-et kell kapjon.

- 401 → a függvény bootolt **és** a kapu áll;
- időtúllépés vagy 5xx → azonnal látszik, és **nulla levél sérül**.

## Amit szándékosan nem csinál

- **Nem tárol ismeretlen címzettnek szóló levelet.** Annak nincs cége, tehát
  nincs, akinek a sora lenne — egy bérlő nélküli sort az RLS nem tud megvédeni.
- **Nem küld választ a feladónak.** Egy visszapattanó levél minden hamisított
  feladójú levélszemétre a mi nevünkben menne ki (backscatter). A felhasználó a
  Beállítások képernyőn látja az elutasított leveleket.
- **Nem indítja el a kiolvasást.** A percenkénti cron úgyis felveszi; egy levél
  amúgy is perceket utazott, mire ideért.
- **Nem tárolja a levél szövegét.** Csak a feladót, a tárgyat és azt, mi lett
  a levéllel.

## Nyitott tételek

- **A `kepMinBajt` (50 kB) heurisztika, nem szabály.** Az aláírásban ülő logót
  a mérete alapján választjuk el a lefotózott nyugtától. Az erősebb szűrő nem
  ez, hanem az, hogy **ha a levélben van PDF vagy XML, a képekhez hozzá sem
  nyúlunk** — és a gyakori esetre ez elég. Ha a szolgáltató jelzi a melléklet
  `inline` elhelyezését, ez a szám **kidobandó**.
- **A feladó-szűrés nem biztonsági határ.** A `From` hamisítható; a határ maga
  a kitalálhatatlan cím. A levél fejlécei között elvileg ott az
  `Authentication-Results` (SPF/DKIM/DMARC), amiből valódi határt lehetne
  csinálni — **nem építünk rá, amíg nem láttuk élő levélen.**
- **Nincs értesítés az elutasításról.** Egy napi összesítő a tulajdonosnak
  logikus folytatás, de külön döntés.
