# Mintabizonylatok a kézi próbához

Ezek a fájlok a **végponttól végpontig** próba korpusza: feltöltés → kiolvasás →
ellenőrzés → tételek → export. Nem eldobható segédanyag, ezért vannak a repóban:
minden további körben (kvóta, Beállítások, Stripe) újra kellenek.

Mind a hat fájlt a repó **saját** értelmezőjén és validátorán engedtük át, nem
csak ránézésre jó — az alábbi táblázat mért eredmény.

## Mi van bennük

| Fájl | Értelmező | Típus | Összeg | Mit mér |
|---|---|---|---|---|
| `ubl-szabalyos.xml` | `xml/ubl` | számla | 160 000 + 34 400 = **194 400** | Az alapeset. Két ÁFA-kulcs (27% és 5%), minden mező megvan |
| `cii-szabalyos.xml` | `xml/cii` | számla | 280 000 + 69 000 = **349 000** | A másik strukturált ág (Factur-X / ZUGFeRD belső alakja), nyolcjegyű dátumokkal |
| `ubl-hibas-osszeg.xml` | `xml/ubl` | számla | 100 000 + 27 000 ≠ **130 000** | **Szándékosan elrontva.** A validátor mindhárom összeg-mezőn jelez |
| `ubl-sztorno.xml` | `xml/ubl` | **sztornó** | −160 000 + −34 400 = **−194 400** | A `CreditNote` gyökér típuskód nélkül is sztornó; és hogy a mínuszjel túléli-e az exportot |
| `nav-szabalyos.xml` | `xml/nav` | számla | 300 000 + 48 200 = **348 200** | **A magyar alapeset.** Három ÁFA-sor: 27%, 5% és tárgyi mentes (TAM) |
| `apeh-szabalyos.xml` | `xml/apeh` | számla | 120 000 + 28 000 = **148 000** | **A másik magyar alak.** Három tételsor, két ÁFA-rovat — a névütközés csapdája |

Az `ubl-hibas-osszeg.xml`-t **ne javítsd ki**: pontosan attól hasznos. Egy
rendszerről, amit csak a jó eseten próbáltunk ki, annyit tudunk, hogy a jó eset
jó — azt nem, hogy a rosszat elkapja-e.

A szállítók és a vevő adószáma **érvényes ellenőrző számjegyű** (a repó
`shared/uzleti/adoszam.ts` függvényével generálva és ellenőrizve). Ha azt
szeretnéd, hogy a vevő a saját céged legyen — mert az export ügyfélszűrője
adószám-**törzsszámra** szűr —, írd át a `CompanyID` / `ram:ID schemeID="VA"`
értékét a saját adószámodra.

## Amit a próbán látni kell

1. **Nulla forint.** A strukturált ág nem hív modellt. Az adatbázisban a
   `document_extractions` soron `cost` és `model_version` **`null`** — ez a
   bizonyíték, hogy tényleg az XML-ág futott.
2. **Ember elé kerül.** A cég **első 20 bizonylata mindig** ellenőrzésre megy
   (bemelegítési fék), tehát automatikus jóváhagyást ne várj — az később, 20
   bizonylat után jelenik meg.
3. Az `ubl-hibas-osszeg.xml`-nél az Ellenőrzés képernyőn a nettó, az ÁFA és a
   bruttó mező mellett ott a magyarázat: *„A nettó és az ÁFA összege nem adja ki
   a bruttót."*

## Honnan szerezz valódi mintát

Ha ezeknél élethűbb kell:

- **Peppol BIS Billing 3.0** — az OpenPEPPOL nyilvános példa-számlái (UBL). Ez az
  EU-s e-számla de facto alakja.
- **Factur-X / ZUGFeRD** — a francia FNFE-MPE és a német FeRD hivatalos
  példafájljai; PDF-ek, amikbe a CII XML be van ágyazva.
- A saját könyvelt cégeid számlázóprogramja: sok rendszerben van „e-számla
  export" vagy „UBL/XML letöltés".

> A linkeket nem tudom innen ellenőrizni (ez a környezet nem éri el a
> nyílt internetet), ezért forrásokat nevezek meg, nem URL-eket.

## Két magyar XML-alak, nem egy

A magyar számlázóprogramok **kétféle** XML-t adnak ki, és a kettő nem
ugyanaz. Ezt nem feltételezzük, hanem megmértük: az első valódi importunk
(Billingo-számla) a régebbi, APEH-alakú volt.

| Alak | Gyökér | Névtér | Értelmező |
|---|---|---|---|
| APEH 2005 „számla adatexport" | `szamla` | `http://www.apeh.hu/2005/szamla` | `xml/apeh` |
| NAV Online Számla 3.0 | `InvoiceData` / `Invoices` | `http://schemas.nav.gov.hu/OSA/3.0/data` | `xml/nav` |

> Az Online Számla **portáljáról** bizonylatonkénti XML nem tölthető le: a
> „Lista export" csak `.xlsx`-et és `.csv`-t kínál, és az nem bizonylat, hanem
> egy adattábla sok bizonylatról. A NAV-sémájú XML a *számlázóprogramoktól*
> jön, az adatszolgáltatás alakjaként.

## Az APEH 2005 alak

Csupa magyar elemnév: `fejlec` (`elado`, `vevo`, `szamlainfo`), `tetelek`,
`osszesites`. Két dolog, amit tudni kell róla:

1. ⚠️ **A tételsorok és az ÁFA-rovatok elemnevei szó szerint azonosak** —
   `afakulcs`, `nettoar`, `afaertek`, `bruttoar` mindkettő alatt. Egy
   leszármazott-keresés nem hasonló nevet találna el, hanem pontosan ugyanazt,
   és a tételsorok értékeit írná a bizonylat ÁFA-bontásába. Az
   `apeh-szabalyos.xml` ezért **három tételsort és két ÁFA-rovatot** tartalmaz:
   ha a keresés elcsúszik, a szám azonnal más lesz.
2. **A dátum pontos magyar alakú** (`2026.09.08`), nem ISO.

Amit a formátum **nem** tartalmaz: ÁFA-kategóriát (`S`, `E`, `AE`…). Ezt nem
következtetjük ki — a bontássorok `kategoria`-ja `null` marad. A
`szamlatipusa` pedig szabad szöveg, nem kódlista: amit nem ismerünk fel, arra
nem tippelünk, az ember választ.

## A NAV Online Számla XML — felismerve

A magyar számlázóprogramok jellemzően **NAV Online Számla** (OSA 3.0) sémájú
XML-t adnak ki. Ezt korábban a rendszer **nem ismerte fel**, vagyis egy
magyar bizonylat csendben pénzbe került: strukturált adat volt a kezünkben, és
mégis a modell olvasta ki.

Ma felismeri (`shared/uzleti/xml/nav.ts`), a `nav-szabalyos.xml` pedig ennek a
mért bizonyítéka. A `document_extractions` soron `model: 'xml/nav'`, a `cost`
és a `model_version` pedig `null`.

**Két dolog, ami ebben a formátumban meglepő**, és amit érdemes tudni, ha
valaha hozzá kell nyúlni:

1. **A `vatPercentage` tört, nem százalék.** A NAV XSD-je szerint `0.27`, és a
   `27` séma szerint *érvénytelen*. Az értelmező szorozza százzal — enélkül 27
   százalékból csendben 27 forint lenne.
2. **A bizonylatszám és a kelt a gyökér közvetlen gyereke**, nem az
   `invoiceHead` alatt. A 2.0-s séma emelte ki őket; a netes példák jó része
   még a régi helyüket mutatja.

### Amit a formátum nem árul el

**Sztornó és részleges helyesbítés nem különböztethető meg.** Az
`invoiceOperation` (CREATE / MODIFY / STORNO) nincs a számla XML-jében — csak
a NAV-nak küldött *kérés borítékában*, ami a könyvelőhöz eljutó fájlból
hiányzik. Az egyetlen jel az `invoiceReference` megléte.

Ezért minden ilyen okirat **helyesbítő számla** lesz, ami a pontos
gyűjtőfogalom: a sztornó ennek a teljes esete. Szűkíteni veszélyes volna —
egy helyesbítést sztornónak minősíteni egy egész számlát érvénytelenítene. Az
Ellenőrzés képernyőn egy kattintás szűkíteni.

És ami ebből következik: a helyesbítő okirat összegei **különbözetek**, nem új
végösszegek, és rendszerint negatívak. Ez könyvelésileg helyes — a
különbözet a könyvelendő tétel —, de meglepő, ha valaki új számlaértéket vár.

### Ami nyitva maradt

- **A base64/gzip API-boríték** (`ManageInvoiceRequest`,
  `QueryInvoiceDataResponse`): a könyvelőnek átadott export sima XML, a
  boríték hibakeresési melléktermék. Ilyen fájl ugyanúgy a modellhez esik,
  mint bármi más fel nem ismert alak.
- **A `K` (közösségi) és `G` (export) ÁFA-kategória**: a NAV ezeket szöveges
  `case` kóddal teszi a mentes/hatályon kívüli ágba, és egy kódszótárat
  valódi minták nélkül kitalálni találgatás volna.
- **A több számlás `Invoices` gyökér** (az Online Számla felület exportja)
  védekezően van megírva, mert **nincs rá kiadott XSD**. Az értelmező nem
  feltételez fix mélységet: azt keresi, aminek `invoiceMain` gyereke van.
  Ilyenkor az **első** számla adatai jönnek ki, és a bizonylat a „több
  különálló bizonylat" jelzéssel emberhez kerül.
