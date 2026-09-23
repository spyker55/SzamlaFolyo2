# Tesztadat

Automatikus tesztek bemenetei, **nem** kézi próbára valók (arra a `minta/`
van, ahol minden fájl nulla forintból, a strukturált ágon megy). Az itteni
PDF-ek a modellhez esnének.

| Fájl | Mit mér | Honnan |
|---|---|---|
| `harom-szamla.pdf` | a **szövegréteg oldalankénti** kinyerése (a kötegszétszedő erre épül), magyar ékezetekkel (`ő`, `ű`, `Ő`) | Chromium `page.pdf()`, A4, három számla oldalanként |
| `harom-szamla-rendes.pdf` + `.json` | **a sebességmérés fájlja**: három ellentmondásmentes számla (az összegek kiadják egymást, az adószámok ellenőrző számjegye stimmel), oldalanként egy. A JSON az igazság forrása | `node eszkozok/tesztadat-harom-szamla.mjs` (a JSON-ból) |
| `csak-kep.pdf` | a szövegréteg nélküli, csak képet tartalmazó PDF `kep` jelleget kap | Chromium `page.pdf()`, egy vászonra rajzolt, képként beágyazott oldal |

Mindkettő 2026-09-23-án készült, az unpdf 0.12.1 → 1.8.1 váltás mérésére: a
két változat ezeken (és még nyolc fájlon) **azonos** felderítést adott —
oldalanként ugyanazt a szöveget, ugyanazt az oldalszámot. A tesztek:
`supabase/functions/kiolvas/felderites.test.ts`.

A Chromium azért jó forrás, mert valódi nyomtatási láncot ad: részhalmazolt,
beágyazott betűkészlet, Unicode-leképezés. A `pdf-lib` beépített betűiben
(WinAnsi) nincs `ő` és `ű`, azzal ez nem mérhető.

A számlák kitaláltak; a cégnevek a magyar ékezetpróba mondatai.

## ⚠️ A `harom-szamla.pdf` szándékosan ellentmondásos

A fizetendő (1 234 567 Ft) nem egyezik a tételekkel, és az adószámok ellenőrző
számjegye rossz. A felderítés tesztjének ez mindegy – az oldalankénti szöveget
és az ékezeteket méri –, **élő kiolvasásra viszont ne használd**. Mérve
(2026-09-23): a modell gondolkodása rajta 921–1396 token volt a valódi számlák
303–891-ével szemben, és tíz kísérletből háromszor elszaladt a keret végéig (a
valódiakon egyszer). Egy sebességmérés ezen a fájlon a modell zavarát méri,
nem a rendszert. Élő próbára a `harom-szamla-rendes.pdf` való.
