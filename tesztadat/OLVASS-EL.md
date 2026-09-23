# Tesztadat

Automatikus tesztek bemenetei, **nem** kézi próbára valók (arra a `minta/`
van, ahol minden fájl nulla forintból, a strukturált ágon megy). Az itteni
PDF-ek a modellhez esnének.

| Fájl | Mit mér | Honnan |
|---|---|---|
| `harom-szamla.pdf` | a **szövegréteg oldalankénti** kinyerése (a kötegszétszedő erre épül), magyar ékezetekkel (`ő`, `ű`, `Ő`) | Chromium `page.pdf()`, A4, három számla oldalanként |
| `csak-kep.pdf` | a szövegréteg nélküli, csak képet tartalmazó PDF `kep` jelleget kap | Chromium `page.pdf()`, egy vászonra rajzolt, képként beágyazott oldal |

Mindkettő 2026-09-23-án készült, az unpdf 0.12.1 → 1.8.1 váltás mérésére: a
két változat ezeken (és még nyolc fájlon) **azonos** felderítést adott —
oldalanként ugyanazt a szöveget, ugyanazt az oldalszámot. A tesztek:
`supabase/functions/kiolvas/felderites.test.ts`.

A Chromium azért jó forrás, mert valódi nyomtatási láncot ad: részhalmazolt,
beágyazott betűkészlet, Unicode-leképezés. A `pdf-lib` beépített betűiben
(WinAnsi) nincs `ő` és `ű`, azzal ez nem mérhető.

A számlák kitaláltak; a cégnevek a magyar ékezetpróba mondatai.
