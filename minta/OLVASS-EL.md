# Mintabizonylatok a kézi próbához

Ezek a fájlok a **végponttól végpontig** próba korpusza: feltöltés → kiolvasás →
ellenőrzés → tételek → export. Nem eldobható segédanyag, ezért vannak a repóban:
minden további körben (kvóta, Beállítások, Stripe) újra kellenek.

Mind a négy fájlt a repó **saját** értelmezőjén és validátorán engedtük át, nem
csak ránézésre jó — az alábbi táblázat mért eredmény.

## Mi van bennük

| Fájl | Értelmező | Típus | Összeg | Mit mér |
|---|---|---|---|---|
| `ubl-szabalyos.xml` | `xml/ubl` | számla | 160 000 + 34 400 = **194 400** | Az alapeset. Két ÁFA-kulcs (27% és 5%), minden mező megvan |
| `cii-szabalyos.xml` | `xml/cii` | számla | 280 000 + 69 000 = **349 000** | A másik strukturált ág (Factur-X / ZUGFeRD belső alakja), nyolcjegyű dátumokkal |
| `ubl-hibas-osszeg.xml` | `xml/ubl` | számla | 100 000 + 27 000 ≠ **130 000** | **Szándékosan elrontva.** A validátor mindhárom összeg-mezőn jelez |
| `ubl-sztorno.xml` | `xml/ubl` | **sztornó** | −160 000 + −34 400 = **−194 400** | A `CreditNote` gyökér típuskód nélkül is sztornó; és hogy a mínuszjel túléli-e az exportot |

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

## ⚠️ Amit a NAV Online Számla XML-ről tudni kell

A magyar számlázóprogramok jellemzően **NAV Online Számla** sémájú XML-t adnak
ki. Azt a rendszer ma **nem ismeri fel**: csak UBL-t (`shared/uzleti/xml/ubl.ts`)
és CII-t (`cii.ts`).

Egy fel nem ismert XML nem hibázik — a `kiolvas` szándékosan **továbbejti a
modellhez** (`supabase/functions/kiolvas/index.ts`). Ez jó tervezés, mert így egy
ismeretlen alak nem akad el. De azt is jelenti, hogy **egy NAV-formátumú XML
csendben pénzbe kerül**, pedig strukturált adat van benne, amiből ingyen és
találgatás nélkül ki lehetne olvasni mindent.

Ez nem hiba, hanem egy hiányzó értelmező. Mielőtt megírnánk, érdemes **megnézni**,
hogy a te forrásaid ténylegesen milyen formátumot adnak ki — egy harmadik
értelmező találgatásra építve rosszabb, mint a mai őszinte hiány. Ha tényleg
NAV-alak, egy `shared/uzleti/xml/nav.ts` a meglévő kettő mintájára nagyjából egy
kör munka.
