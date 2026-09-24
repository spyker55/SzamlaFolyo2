# Adatkiadás — eljárás és a kiadott szerkezet leírása

Ez a mappa az **ÁSZF 16. pontja** szerinti kötelezettség teljesítéséhez való. 2026-09-23
óta a pont a Data Act VI. fejezete szerinti idővonalat írja le:

> „**1. Átállási időszak — a kérés beérkezésétől számított harminc nap.** … A Szolgáltató
> ezen időszakon belül díjmentesen kiadja az Előfizető adatait — a … felületről ma nem
> exportálható adatokat is —, géppel olvasható, a Használati útmutató „Adatformátumok"
> fejezetében leírt szerkezetben …"

A „géppel olvasható" részt az `adatkiadas.sql` teljesíti, a „szerkezetében dokumentált"
részt **ez a fájl**. A kettő együtt jár: a JSON kulcsnevei önmagukban nem dokumentáció.

---

## Az eljárás

1. **Azonosítsd a kérelmezőt.** A kiadás a cég minden adatát tartalmazza, a tagok
   e-mail-címeivel és a teljes tevékenységnaplóval együtt. Csak a cég **tulajdonosának**
   adható ki, arra a címre, ami a `company_members` táblában tulajdonosként szerepel — nem
   arra a címre, amiről a kérés érkezett, ha a kettő eltér.
2. **Keresd ki a cég azonosítóját:** `select id, name, tax_number from public.companies;`
3. **Futtasd az `adatkiadas.sql`-t** a Supabase SQL Editorban, az első `select`-ben a cég
   azonosítójával. Nem kell hozzá `service_role` kulcs, és nem kell kulcsot sehova bemásolni.
4. **Ha nulla sort kapsz, állj meg.** Nincs ilyen cég — elgépelted az azonosítót. Ez az őr
   szándékos: enélkül egy rossz azonosító egy tökéletesen szabályos, üres kiadást adna,
   amit ki lehetne küldeni „itt vannak az adataid" címen.
5. **Mentsd a kapott cellát** `szamlafolyo-adatkiadas-<cég>-<dátum>.json` néven.
6. **Ellenőrizd a `darabszamok` szakaszt**: ez az egy pillantás, amivel a fájl teljessége
   igazolható anélkül, hogy több ezer sort számolnál meg.
7. **Küldd el**, és a kísérőlevélben mondd meg:
   - mit tartalmaz (ez a leírás mellékelhető),
   - hogy az **eredeti fájlok** (PDF, kép, XML) nincsenek benne: azokat a felületi export
     adja ZIP-ben, amíg a megőrzési idő alatt megvannak — a `fajlok` szakasz
     `file_deleted_at` mezője mutatja, melyik eredeti törlődött már,
   - hogy a beküldő cím és a meghívó jelek szándékosan kimaradtak (lásd lent).
8. **A határidő: a kérés beérkezésétől számított harminc nap** (átállási időszak). Az
   Előfizető ezt egyszer meghosszabbíthatja. Ha technikailag nem teljesíthető, **tizennégy
   munkanapon belül** jelezni kell, indokolással, és legfeljebb hét hónapot megjelölni.
9. Az átállás sikeres lezárultát **e-mailben vissza kell igazolni** — ezzel szűnik meg a
   szerződés (ÁSZF 16., 2. lépés).
10. Utána legalább **harminc nap adat-visszanyerési időszak** jön az átállási időszak végétől:
    semmit nem törlünk, a kiadás ismételten kérhető. Csak ennek végén jön a törlés, az
    `eszkozok/torles/OLVASS-EL.md` 1. szakasza szerint.
11. A nyilvános formátumleírás a Használati útmutató „Adatformátumok" fejezete. Ha ebben a
    fájlban szakasz változik, ott is változnia kell — a `jogiSzovegek.test.ts` méri.

---

## Amit a kiadás szándékosan nem tartalmaz

| Mi | Miért | Hol érhető el |
|---|---|---|
| `companies.bekuldes_token` | **Élő kulcs**: aki ismeri a beküldő címet, a cég keretéből költ. Egy kiadott fájl e-mailben utazik és másolatokban marad fenn | Beállítások → E-mailes beküldés |
| `company_invites.token` | Élő kulcs: a meghívó jelével be lehet lépni a cégbe | Beállítások → Tagok |
| az eredeti fájlok **tartalma** | Bájtok, nem adat — külön úton megy | felületi export (ZIP), amíg a megőrzési idő tart |
| más cég bármely adata | A lekérdezés minden szakasza `company_id`-ra szűr. **Mérve**: a másik cég azonosítója egyszer sem fordul elő a kimenetben | — |

Mindkét kihagyott kulcs helyén magyarázó szöveg áll, nem `null`: a néma hiány hibának
látszana.

---

## A szerkezet

A kimenet **egyetlen JSON objektum**, 17 szakasszal. Minden időbélyeg **UTC**, ISO 8601
alakban. Az `amount_ft` és az `overage_limit_ft` **forint**, a `cost` **USD**, a `credits`
**darab**.

| Szakasz | Forrás (tábla) | Mit tartalmaz |
|---|---|---|
| `kiadas` | — | A kiadás fejléce: mikor készült, melyik cégről, `sema_verzio` (ma `2`), és ennek a leírásnak a helye |
| `ceg` | `companies` | A cég törzsadatai és **minden beállítása**: megőrzési idő, automatikus jóváhagyás kapcsolója, túlhasználati plafon, beküldés kapcsolói, az előfizetés Stripe-oldali állapota és a számlázási ciklus, a „Honnan hallottál rólunk?" válasz (`heard_from`) és az utoljára kiadott iktatószám (`utolso_iktatoszam`) |
| `tagok` | `company_members` | Ki tagja a cégnek, milyen szerepben (`tulajdonos` / `szerkeszto` / `megtekinto`), mikortól |
| `meghivok` | `company_invites` | Kiküldött meghívók: cím, szerep, kiküldés, lejárat, elfogadás, visszavonás |
| `fajlok` | `files` | A feltöltött fájlok **nyilvántartása**: eredeti fájlnév, MIME, méret, `sha256`, oldalszám, `forras_jelleg` (szövegréteg / szkennelt / strukturált XML / hibrid), `source` (feltöltés vagy e-mail), és a `file_deleted_at` — mikor törölte a megőrzési szabály az eredetit |
| `bizonylatok` | `documents` | **Minden bizonylat, állapottól függetlenül.** Ez a kiadás lényege: a jóváhagyásra váró, a duplikátumnak minősített és a hibára futott bizonylat is, a kiolvasott 16 mezővel, az ÁFA-bontással, a két zászlóval (`tobb_irat_gyanu`, `nehezen_olvashato`), az oldaltartománnyal és a jóváhagyás nyomával |
| `kiolvasasok` | `document_extractions` | Minden kiolvasási futás: mi olvasta ki (`model` — `xml/ubl`, `xml/nav`, `xml/apeh`, `xml/cii` a saját értelmezőké, egyébként a modell azonosítója), a **modell nyers válasza** (`raw_response`), a mezőnkénti magabiztosság, token, költség, időtartam, hiba és a felhasznált kredit |
| `javitasok` | `document_corrections` | Mit írt át ember a gép után: mező, gépi érték, emberi érték |
| `exportok` | `exports` | Az elkészült exportok: formátum, szűrők, tételszám, fájlnév, méret |
| `tulhasznalat` | `overage_charges` | A kereten felüli felhasználás elszámolása időszakonként (kredit, forint, Stripe-tételazonosító) |
| `beerkezo_levelek` | `inbound_emails` | A beküldő címre érkezett levelek nyilvántartása: feladó, tárgy, eredmény és annak indoka, csatolmányszám. **A levelek törzsét nem tároljuk**, tehát nincs is benne |
| `naplo` | `activity_log` | A teljes tevékenységnapló: ki, mikor, mit csinált, emberi mondattal és géppel olvasható `context`-tel |
| `aszf_elfogadasok` | `terms_acceptances` | Ki, mikor, az ÁSZF melyik változatát fogadta el |
| `konyvelo_beallitasok` | `konyvelo_beallitasok` | A könyvelőprogram-export kontírja: főkönyvi számok, Novitax-napló, Kulcs-ÁFA-kódok; cégszinten (`ugyfel_torzsszam: null`) és ügyfelenként |
| `iktatoszamok` | `iktatoszamok` | A könyvelőprogramoknak kiadott belső sorszám bizonylatonként (`document_id`, `szam`) |
| `keret_fedezetek` | `keret_fedezetek` | Csomagváltások nyoma: a váltásig felhasznált kredit és a régi csomag – ebből számol a keret, hogy egy visszaváltás ne ejtse utólag túlhasználatba az elvégzett munkát |
| `darabszamok` | — | Soronkénti darabszám mind a 14 szakaszra, a fájl teljességének ellenőrzéséhez |

### Két dolog, ami magyarázat nélkül félrevezetne

- **A `kiolvasasok` túlélik a bizonylatot.** A `document_extractions` szándékosan marad meg
  a dokumentum törlése után is (a havi keret ebből számol, nem a `documents`-ből), ezért
  lehetnek benne sorok `document_id: null` értékkel. Ez nem hiányzó kapcsolat, hanem az
  audit-nyom.
- **A bizonylat lehet egy fájl egy része.** A köteg szétszedésekor egy fájlhoz több
  bizonylat tartozik, `oldal_tol`–`oldal_ig` tartománnyal; a szétszedő futás kiolvasási
  sora `credits: 0` értékű, mert a köteg maga nem kerül kreditbe.

---

## Méret — mérve, és ahol óvatosnak kell lenni

A 7 bizonylatos próbacégre a kiadás **55 015 bájt** volt, vagyis nagyságrendileg
**5–8 kB bizonylatonként** (a `raw_response` viszi a java részét). Ezer bizonylat így már
5–8 MB, amit az SQL Editor egyetlen cellában kényelmetlenül ad vissza.

⚠️ Ezt **csak a hét bizonylatos eseten mértem.** Nagyobb cégnél a biztos út: a szakaszokat
külön-külön futtatni (a `jsonb_build_object` megfelelő sorait kikommentelve), vagy
`psql`-lel `\copy`-val fájlba írni. Ha ez egyszer tényleg sorra kerül, érdemes a
tapasztalatot ide visszaírni.

---

## Ha a séma változik

A `sema_verzio` a kiadás fejlécében ma `2`. Ha a táblák oszlopai változnak, **a lekérdezés
és ez a leírás együtt lép tovább**, és a verziószám nő — így a címzett tudja, melyik
leírás tartozik a kapott fájlhoz. Egy `to_jsonb(sor)` alapú kiadás magától követi az új
oszlopokat; a leírás viszont nem, és az a rosszabb eset: a fájl teljes lesz, a
dokumentáció meg hazudik.

**Változások.** `2` (2026-09-24): új szakasz a `konyvelo_beallitasok`, az `iktatoszamok`
és a `keret_fedezetek`; a `ceg` sorában új a `heard_from` és az `utolso_iktatoszam`.
