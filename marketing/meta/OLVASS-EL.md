# SzámlaFolyó — Meta hirdetési csomag

Kész, feltölthető anyag a Meta (Facebook + Instagram) hirdetéskezelőjébe: **20 kép**,
öt üzenethez négy formátumban, és az alábbi szövegkészlet.

Minden állítás, ami ebben a csomagban szerepel, visszavezethető a termék mai
tudására — a nyitólapra, a `config/szamlafolyo.ts`-re vagy a jogi szövegekre. Egy
hirdetés, ami többet ígér a felületnél, ugyanaz a hibaosztály, mint egy valótlan
jogi mondat, csak drágább: a látogató a céloldalon veszi észre.

---

## ⚠️ Mielőtt egyetlen forintot elköltesz — három mért tény

### 1. A tölcsér él — és ez nem feltevés

A Vercel két kapcsolója **2026-09-22 06:18 UTC-kor** billent át („az oldal kikerült a
fejlesztés alól", „a nyilvános regisztráció kinyitva"), az éles telepítés pedig
**11:20-kor** készült el, tehát utána.

Ennél fontosabb, hogy a nyilvános út **végig is ment aznap**: 06:34-kor létrejött egy új
fiók, 06:35-kor megerősítve, 07:11-kor belépve, és ugyanazon a napon egy új cég is
megalakult a rendszerben. A hirdetésből érkező látogató tehát nem fut falba — a
regisztráció, a levélküldés és a cégalapítás mind járható.

Amit érdemes tudni: a próbaidő céghez kötött (14 nap / 50 dokumentum / 3 felhasználó),
és ma **két** cég van a rendszerben. Az első hirdetésből érkező regisztrációk lesznek az
első idegen felhasználók — érdemes az első napokban figyelni, hol akadnak el.

### 2. Nincs Meta-pixel az oldalon, és nem is tehető rá következmény nélkül

Az Adatkezelési tájékoztató **két helyen, félkövérrel** ígéri:

> „Sütiket mérésre vagy hirdetésre nem használunk. Hirdetési kódrészlet nincs,
> profilalkotás nincs, és más webhelyeken sem követünk senkit."

> „…a böngésző az oldal megnyitásakor nem keres meg idegen kiszolgálót. Külső
> betűszolgáltatót és hirdetési kódot nem használunk…"

Ebből két dolog következik a kampányra:

- **konverzióra optimalizálni nem tudsz** (a Meta nem látja a regisztrációt), csak
  *Forgalom → céloldal-megtekintés* vagy *Elérés* célra;
- ha mégis pixelt akarsz, az **három dolgot von maga után**: a fenti két mondat
  átírását, egy valódi hozzájárulás-kezelő ablakot (a pixel sütizik), és a
  hozzájárulás előtti néma állapotot. Ez külön kör, nem egy beillesztett kódrészlet.

A pixel nélküli út teljesen járható: a Meta a kattintásokat és a
céloldal-megtekintéseket így is méri, a regisztrációk számát pedig te látod az
adatbázisban. Az összekötést az alábbi „mit mérj" pont írja le.

### 3. A saját mérőnk az `utm_` paramétereket eldobja

A `src/lib/analitika.ts` szándékosan tiszta címet állít elő, és a kommentje ki is
mondja: *„a lekérdezés és a horgony mindig elvész… egy `?utm_source=…` nem attól
tűnik el, hogy gondoltunk rá."*

Tehát **a Vercel Analyticsben nem fogod látni, melyik hirdetés hozta a látogatót** —
ott csak annyi látszik, hogy hányan jártak a `/` és a `/regisztracio` címen. Az
attribúció a Meta oldalán marad. Ezt nem hibának írom le: a szűrő azért van, hogy a
meghívó-token és a jelszó-visszaállító token ne hagyhassa el a böngészőt.

---

## A képek

`marketing/meta/kreativ/kep/` — 20 PNG, `<üzenet>_<formátum>.png` néven.

| Formátum | Méret | Hol jelenik meg | Megjegyzés |
|---|---|---|---|
| `4x5` | 1080 × 1350 | Feed (Facebook, Instagram) | **Ezzel kezdj.** Mobilon ez kapja a legnagyobb területet |
| `1x1` | 1080 × 1080 | Feed, Marketplace, jobb oldali sáv | Univerzális tartalék |
| `9x16` | 1080 × 1920 | Stories, Reels | A tartalom középre húzva: a felső ~250 és az alsó ~340 képpontot a Meta saját felülete takarja |
| `1.91x1` | 1200 × 628 | Link, Audience Network | Fekvő, kétoszlopos |

Öt üzenet, öt külön hirdetéskészlethez:

| Azonosító | Az üzenet | Kinek szól elsősorban |
|---|---|---|
| `1-igeret` | Dokumentumból könyvelésre kész adat, percek alatt | mindenki — ez a széles teszt |
| `2-te-hagyod-jova` | Minden bizonylatot te hagysz jóvá | aki nem bízik az AI-ban — könyvelők |
| `3-matek` | Nettó + ÁFA = bruttó, ezt kiszámoljuk | akit a pontosság érdekel |
| `4-xml` | Az e-számlát gép olvassa ki, AI nélkül | haladó, e-számlát kapó cégek |
| `5-proba` | 14 nap, 50 dokumentum, bankkártya nélkül | az ajánlat maga — újracélzásra is |

A képeket a `marketing/meta/kreativ/keszit.mjs` állítja elő a repó **saját** színeiből,
betűiből és mintakártyájából. Ha az arculat változik, a képek egy paranccsal újra
legyárthatók: `node marketing/meta/kreativ/keszit.mjs`.

---

## A szövegek

A Meta három mezőt kér. A karakterszámok mérve, nem becsülve:

- **Elsődleges szöveg** (a kép fölött): a Meta kb. **125 karakter** után elvágja és
  „Továbbiak"-ra teszi. Ezért mindenhol van egy rövid, önmagában megálló változat.
- **Címsor** (a kép alatt, vastagon): **40 karakter** alatt biztosan kifér.
- **Leírás** (a címsor alatt, halványan, nem minden helyen látszik): **30 karakter**.

### 1. hirdetéskészlet — „A fő ígéret"

**Rövid címsorok (40 alatt)**
- Számlából könyvelésre kész adat
- Percek alatt, nem órák alatt
- Számlák kiolvasva, ellenőrizve
- A számlázás utáni munka vége

**Hosszú címsorok**
- Dokumentumból ellenőrzött, könyvelésre kész adat percek alatt
- Töltsd fel a számlát — a többit a SzámlaFolyó elvégzi

**Rövid leírások (30 alatt)**
- Számla, nyugta, e-számla XML
- 14 nap ingyenes próba

**Elsődleges szöveg — rövid**
> Töltsd fel a számlát vagy a nyugtát, a SzámlaFolyó kiolvassa. Te csak azt ellenőrzöd,
> amiben nem biztos. 14 napig ingyen.

**Elsődleges szöveg — hosszú**
> A hónap végi adatrögzítés nem attól lassú, hogy sok a számla, hanem attól, hogy
> mindegyiket kézbe kell venni.
>
> A SzámlaFolyó kiolvassa a bizonylataidat — számlát, nyugtát, külföldi bizonylatot,
> fotózott blokkot és e-számla XML-t, egy folyamatban. A mezőket ellenőrzi ott, ahol
> ez matematika: az adószám ellenőrző számjegyét, a nettó + ÁFA = bruttó egyezést, az
> ÁFA-bontást soronként. Amiben bizonytalan, azt megjelöli.
>
> A jóváhagyás a tiéd: semmi nem kerül exportba úgy, hogy egy ember rá ne bólintott
> volna. A végén egy kattintás, és viheted XLSX, CSV vagy JSON formátumban a
> könyvelésbe.
>
> 14 nap, 50 dokumentum, bankkártya megadása nélkül. → szamlafolyo.hu

### 2. hirdetéskészlet — „Az utolsó szó a tiéd"

**Rövid címsorok**
- Minden bizonylatot te hagysz jóvá
- Az AI olvas. Te döntesz.
- Nem hisszük el a gépnek

**Hosszú címsorok**
- Semmi nem kerül exportba emberi jóváhagyás nélkül
- A gép előkészíti a döntést — nem hozza meg helyetted

**Rövid leírások**
- Te hagyod jóvá, nem a gép
- Megjelöljük, ami gyanús

**Elsődleges szöveg — rövid**
> A számlafeldolgozó AI-nál az a kérdés, mit csinál, ha téved. Nálunk: megjelöli, és
> rád vár. Te hagyod jóvá a bizonylatot.

**Elsődleges szöveg — hosszú**
> „És mi van, ha rosszul olvassa ki?"
>
> Ez a helyes kérdés, és a SzámlaFolyó erre épült. Alapértelmezés szerint **minden
> bizonylat jóváhagyásra vár** — semmi nem kerül exportba úgy, hogy egy ember rá ne
> bólintott volna.
>
> A gép addig azt csinálja, amiben jó: kiolvas, és megjelöli, amiben bizonytalan. A
> kézzel írt bizonylatot külön megjelöljük, mert ott a szállító nevét semmilyen
> matematikával nem lehet ellenőrizni — és a modellek pont ilyenkor találnak ki neveket
> a legmagabiztosabban.
>
> Ha később mégis rábíznád a gépre az ellenőrzésen átment bizonylatokat, az egy
> kapcsoló a Beállításokban. Alapból ki van kapcsolva.
>
> 14 nap ingyenes próba, bankkártya nélkül. → szamlafolyo.hu

### 3. hirdetéskészlet — „A matek nem vélemény"

**Rövid címsorok**
- Nettó + ÁFA = bruttó. Kiszámoljuk.
- Az adószámot leellenőrizzük
- Amit ki lehet számolni, azt kiszámoljuk

**Hosszú címsorok**
- Az adószám ellenőrző számjegye vagy stimmel, vagy nem
- Ha a sorok nem adják ki a végösszeget, szólunk

**Rövid leírások**
- Ellenőrzött számok
- Nem a modell mondja meg

**Elsődleges szöveg — rövid**
> A magyar adószám ellenőrző számjegye vagy stimmel, vagy nem. Nem vélemény kérdése, és
> nem a modell mondja meg. Kiszámoljuk.

**Elsődleges szöveg — hosszú**
> Egy rosszul kiállított számla nem attól lesz jó, hogy egy AI magabiztosan olvassa ki.
>
> A SzámlaFolyó ezért a kiolvasás után **külön ellenőrzéseket futtat** — olyanokat,
> amikhez nem kell mesterséges intelligencia, csak matematika:
>
> • a magyar adószám ellenőrző számjegye
> • nettó + ÁFA = bruttó, a kerekítés tűrésével
> • az ÁFA-bontás soronként: ha a sorok nem adják ki a végösszeget, azt jelezzük
> • dátumok, pénznem, ismétlődő bizonylatszám ugyanattól a szállítótól
>
> Ezek akkor is jeleznek, ha a modell magabiztos volt. És amit nem jelöltünk meg, arra
> sem mondjuk, hogy „ellenőrizve" — azt jelenti, hogy nincs okunk gyanakodni.
>
> Próbáld ki a saját bizonylataidon: 14 nap, 50 dokumentum, bankkártya nélkül.

### 4. hirdetéskészlet — „E-számla XML"

**Rövid címsorok**
- Az e-számlát gép olvassa ki
- E-számla AI nélkül, másodperc alatt
- UBL, Factur-X, ZUGFeRD, NAV

**Hosszú címsorok**
- Az e-számla XML-jét gép olvassa ki — modellhívás nélkül
- Strukturált adat érkezett? Akkor nem találgatunk.

**Rövid leírások**
- Másodperc alatt, AI nélkül
- A szállító adatai, átvéve

**Elsődleges szöveg — rövid**
> Ha a szállító e-számlát küld, abban már ott van minden adat. Azt kár kitaláltatni egy
> modellel — mi kiolvassuk belőle.

**Elsődleges szöveg — hosszú**
> Egyre több szállító küld e-számlát: UBL-t, Factur-X vagy ZUGFeRD PDF-et, magyar
> formátumú XML-t. Ezekben az adat **strukturáltan** benne van — a szállító rendszere
> írta ki, pontosan.
>
> A SzámlaFolyó ezeket nem adja modellnek: saját értelmezővel olvassa ki őket,
> másodperc alatt, egyetlen modellhívás nélkül. A mezők így nem gépi olvasatok, hanem
> átvett értékek — és a tartalom nem hagyja el a szervert.
>
> A számtani ellenőrzések ezen az úton is lefutnak: egy rosszul kiállított e-számla
> ugyanúgy elbukik rajtuk.
>
> Papír, szkennelt PDF és fotó esetén jön az AI — ott az olvasás a dolga. A
> Beérkezőben bizonylatonként látod, melyik úton készült.
>
> 14 nap ingyenes próba → szamlafolyo.hu

### 5. hirdetéskészlet — „Az ajánlat" (újracélzásra is)

**Rövid címsorok**
- 14 nap, 50 dokumentum, 0 Ft
- Bankkártya nélkül kipróbálható
- Havi 4 900 Ft-tól

**Hosszú címsorok**
- 14 napig ingyen, a saját bizonylataidon
- Próbáld ki bankkártya megadása nélkül

**Rövid leírások**
- Bankkártya nem kell
- Havi 4 900 Ft-tól

**Elsődleges szöveg — rövid**
> 14 nap, 50 dokumentum, bankkártya megadása nélkül. A saját számláidon próbálod ki, nem
> egy bemutató fiókban.

**Elsődleges szöveg — hosszú**
> A SzámlaFolyót nem bemutató adatokon próbálod ki, hanem a **saját bizonylataidon**:
> 14 napig, 50 dokumentumig, bankkártya megadása nélkül. Ha nem válik be, nem kell
> lemondanod semmit.
>
> Utána havi 4 900 Ft-tól: Start 50, Flow 200, Pro 500 dokumentum havonta. Az árak a
> fizetendő végösszegek — a szolgáltató alanyi adómentes, áfa nem járul hozzájuk.
>
> Nincs bezártság: az adatot XLSX, CSV vagy JSON formátumban viszed, az eredeti fájlokat
> ZIP-ben mellé.
>
> → szamlafolyo.hu

---

## Gomb (CTA)

| Hirdetéskészlet | Javasolt gomb |
|---|---|
| 1., 2., 3., 4. | **További információ** |
| 5. (ajánlat, újracélzás) | **Regisztráció** |

A „Regisztráció" gomb csak ott, ahol a szöveg is az ajánlatról szól: ha a hirdetés még
csak ismerkedés, egy regisztrációs gomb idő előtti.

---

## Kulcsszavak

### A Meta részletes célzásához (érdeklődési kör / munkakör)

Ezeket a hirdetéskezelő keresőjébe beírva találod meg őket. Nem mind létezik magyarul
külön — ahol nem, ott az angol név a használható.

**Elsődleges:** Könyvelés (Accounting) · Könyvvitel (Bookkeeping) · Számvitel ·
Kisvállalkozás (Small business) · Vállalkozó (Entrepreneurship) · Adó (Tax) ·
Pénzügy (Finance) · Számviteli szoftver (Accounting software) · Vállalatirányítás (ERP)

**Szoftvernevek, amikre a versenytárs-közönség rájár:** Számlázz.hu · Billingo ·
KBOSS · NAV Online Számla · Xero · QuickBooks · Zoho Books · Microsoft Excel

**Viselkedés / szerep:** Kisvállalkozás-tulajdonosok (Small business owners) ·
Facebook-oldal rendszergazdái · Új vállalkozás indítói (1–12 hónap)

### Szövegkulcsszavak (a hirdetésbe, a leírásba, és újrahasznosítva SEO-ra)

számlafeldolgozás · számla kiolvasás · bizonylat digitalizálás · OCR számla ·
adatrögzítés automatizálás · könyvelés előkészítés · e-számla · e-számla XML · UBL ·
Factur-X · ZUGFeRD · NAV Online Számla XML · ÁFA-bontás · adószám ellenőrzés ·
nyugta feldolgozás · könyvelőiroda szoftver · számla export XLSX · számla export CSV ·
bizonylatkezelés · havi zárás · mesterséges intelligencia számlázás

---

## Célzási és költési javaslat — kiindulópont, nem mérés

Ezeket **nem** mértem: nincs mögöttük lefutott kampány. Kezdőértéknek adom.

- **Ország:** Magyarország. **Nyelv:** magyar. **Kor:** 25–64.
- **Kampánycél:** Forgalom → *céloldal-megtekintések* (nem kattintás: az olcsóbb, de
  a fele soha nem tölti be az oldalt).
- **Elhelyezések:** Advantage+ (automatikus) — a 20 kép mind a négy formátumot lefedi.
- **Szerkezet:** egy kampány, alatta **három hirdetéskészlet** — (a) könyvelők /
  könyvelőirodák, (b) kisvállalkozás-tulajdonosok, (c) széles célzás érdeklődés
  nélkül. Mindegyikben 2–3 kreatív, **különböző üzenettel**, mert az üzenetet érdemes
  mérni, nem a színt.
- **Keret:** készletenként napi 2 000–3 000 Ft, legalább 4–5 napig érdemben nem
  nyúlva hozzá (a tanulási szakasz alatti kapkodás az egyik leggyakoribb hiba).
- **Első kérdés, amit a kampány megválaszol:** melyik üzenetre kattintanak — az
  „ellenőrzés/bizalom" vagy a „gyorsaság". Ez a nyitólap szövegére is válasz lesz.

### Mit mérj, ha nincs pixel

| Szám | Honnan |
|---|---|
| megjelenés, kattintás, CPC, céloldal-megtekintés | Meta hirdetéskezelő |
| hányan jutottak el a `/` és a `/regisztracio` címre | Vercel Analytics (kampányonként **nem** bontható — lásd fent) |
| hány fiók és cég jött létre, naponta | az adatbázis (`auth.users`, `companies`) |
| hány próbafiók lett fizető | Stripe |

A kiszolgáló oldala készen áll a forgalomra: a projekt fizetős csomagon fut (Micro
compute), az éles Stripe-fizetés, a webhook és a számlázási portál végigmérve működik.

A kampány alatt a napi regisztrációszám a valódi mérce. Ha az nem mozdul, miközben a
céloldal-megtekintések mennek, a probléma a nyitólapon van, nem a hirdetésben.

---

## ⚠️ Amit ez a termék **nem** ígérhet

Ez a lista nem óvatoskodás: mindegyik alatt egy olyan mondat van, amit a felület vagy
a jogi szöveg ma cáfolna — és a Metán a „megtévesztő állítás" elutasítási ok is.

| Amit ne írj | Miért | Ami helyette igaz |
|---|---|---|
| „Teljesen automatikus", „nem kell hozzányúlnod" | Alapból **minden** bizonylat emberi jóváhagyásra vár | „Te hagyod jóvá — a gép megjelöli, amiben bizonytalan" |
| „Hibátlan", „100%-os pontosság", „garantáltan pontos" | A nevekre nincs és nem lehet számtani ellenőrzés | „Amit ki lehet számolni, azt kiszámoljuk" |
| „Magyar szervereken tároljuk" | Az adat **Frankfurtban** van (EU) | „Az adatok az Európai Unióban, Frankfurtban tárolódnak" |
| „Könyvel helyetted", „elkészíti a bevallást" | A termék adatot ad ki, nem könyvel | „Könyvelésre kész adatot adunk át" |
| „NAV-adatszolgáltatást intézi" | Ilyen funkció nincs | — (ne szerepeljen) |
| „Ingyenes" önmagában | 14 nap / 50 dokumentum után fizetős | „14 napig ingyenes próba" |
| „Az e-számla feldolgozása ingyen van" | Az e-számla ugyanúgy beleszámít a havi darabkeretbe | „Az e-számlát modellhívás nélkül olvassuk ki" |
| „Te, könyvelőként…", „Neked, mint vállalkozónak…" | A Meta **személyes tulajdonságokra** vonatkozó szabálya: a hirdetés nem sugallhatja, hogy tudjuk, ki vagy | „Könyvelőirodáknak és vállalkozásoknak" |

---

## Ha változik a termék

A képek szövege a `keszit.mjs`-ben, a hirdetésszövegek ebben a fájlban élnek. Ha egy
ígéret megváltozik — például a gépi jóváhagyás alapállása —, **mindkettőt** javítani
kell, és a képeket újra kell gyártani. Ugyanaz a szabály, mint a jogi szövegeknél: egy
ígéret, amit a kód nem tart be, itt is ígéret marad, csak fizetett terjesztéssel.
