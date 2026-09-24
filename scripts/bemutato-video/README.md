# A bemutatóvideók

Két videó készül innen, mindkettő MP4, WebM és poszter (`public/bemutato/`):

- `konyveloknek`: a Könyvelőknek oldal videója (könyvelőiroda, Kulcs-export);
- `nyitolap`: a nyitólap hero videója (vállalkozó, egy számla, Excel-export).

A nyitólapon ismétlődve fut.
Egy UI-változás után újra kell venni, különben a videó mást mutat, mint az
alkalmazás.

```sh
FFMPEG=/út/az/ffmpeg node scripts/bemutato-video/felvetel.mjs konyveloknek
FFMPEG=/út/az/ffmpeg node scripts/bemutato-video/felvetel.mjs nyitolap
```

- **ffmpeg libx264-gyel kell.** Ha nincs a gépen:
  `pip install --target /tmp/ff imageio-ffmpeg`, és a `FFMPEG` a
  `/tmp/ff/imageio_ffmpeg/binaries/ffmpeg-…` fájlra mutasson.
- `CHROMIUM=…`: ha a Playwright saját Chromiuma nincs letöltve.
- `MEGTART=1`: a munkamappa (kockák, hibakép) nem törlődik.
- `BEMUTATO_KIMENET=/mappa`: próbafelvétel máshová, a kitett videót nem írja
  felül.

## Mit csinál

- Elindítja a Vite dev szervert a `5288`-as porton. A Supabase-címe
  `https://bemutato.supabase.co`, és erre egy memóriabeli álszerver
  válaszol, a böngészőből semmi nem megy ki.
- Az adatok kitaláltak (`adatok.mjs`). A feltöltött számlafotó és a
  pékségi köteg-PDF futás közben készül HTML-ből. **Valódi számlaadat ide
  soha nem kerülhet**, mert a videó nyilvános.
- A Chromium képernyőközvetítésének kockáiból az ffmpeg a valódi időzítéssel
  fűzi össze a videót: 1920×1080, H.264 MP4 és VP9 WebM (a nyílt forrású
  Chromium H.264-et nem játszik le), hang nélkül.

## Ha változik

- **A hossz:** a Könyvelőknek lap „egy perc alatt”-ot mond. A
  `jogiSzovegek.test.ts` az MP4 fejlécéből méri, és 40–90 mp között
  engedi.
- **A feliratok:** a `konyvelokFelvesz()` és a `nyitolapFelvesz()` függvényben
  vannak. Csak olyat
  állítsanak, amit a program tényleg tud.
- **A nézőnek:** a videót a böngésző gyorsítótárazhatja. Új felvételnél
  érdemes új fájlnevet adni, és a lapon a `BEMUTATO_VIDEO`-t átírni.
