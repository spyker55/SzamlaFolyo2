# RLB-import: kiegészítő próba (ideiglenes)

Az első élesben kimért import (2026-09-24) egy bejövő, 27%-os számla volt; a
diagnosztika részletei a `DONTESTORTENET.md`-ben. Ez a fájl a még nem látott
eseteket hozza, a SzámlaFolyó saját generátorával (`rlb.ts`) legyártva:

| Bizonylat | Mit próbál ki |
|---|---|
| `KI-2026/001` | **kimenő** számla (`VF`/`VT`), készpénz, 911 / 467 / 311 |
| `MS-2026/07` | alanyi **mentes** szállító (ÁFA-kód `4`) |
| `PB-2026/0914-S` | **sztornó**, negatív összegekkel |
| `NY-000123` | **nyugta** bankkártyával (fizetési mód `7`), vevő nélkül |

⚠️ Közvetlenül töltsd be (git pull után a mappából) – ne Drive-on, Excelen,
Google Táblázaton keresztül: azok átírják az elválasztót és a kódolást.

A mérés után ez a mappa törlődik.
