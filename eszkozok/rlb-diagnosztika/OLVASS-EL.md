# RLB-import diagnosztika (ideiglenes)

Az RLB Kettős a SzámlaFolyó RLB-fájlját „A mezőelválasztások vagy adatok
hibásak! Hibás sor: 1" hibával utasította el, a gyártói mintát
(`Minta_tobbsoros_2021.csv`) viszont beolvasta. A keret (fejléc, elválasztó,
Windows-1250, CRLF, 22 mező) bájtra azonos, tehát egy **adat** a hibás.

Mindegyik fájl egyetlen számla, és egy dologban tér el a `2_sajat.csv`-től:

| Fájl | Mit próbál ki |
|---|---|
| `1_gyartoi_szallito_2026.csv` | A gyártói minta szállítói számlája 2026-os dátumokkal – a könyvelési év |
| `2_sajat.csv` | A SzámlaFolyó mai kimenete |
| `3_cimmel.csv` | + partner irányítószám, város, cím |
| `4_adoszam_nelkul.csv` | adószám üresen |
| `5_adoszam_kotojel_nelkul.csv` | adószám `23456787213` alakban |
| `6_tafadat_nelkul.csv` | tényleges teljesítés (TAFADAT) üresen |
| `7_bevallasi_sorral.csv` | tételsorban bevallási sor `66` |
| `8_minta_fokonyvei.csv` | főkönyvi számok 511 / 466 / 4541 (454 és 5211 helyett) |
| `9_minden_elteres_visszaforditva.csv` | az összes fenti eltérés egyszerre |

A mérés után ez a mappa törlődik; az eredmény a `DONTESTORTENET.md`-be kerül.
