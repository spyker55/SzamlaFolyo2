# SzámlaFolyó – hirdetéscsomag (Meta + Google)

Feltölthető anyag a Meta (Facebook, Instagram) és a Google Ads felületére: képek,
szövegek, címsorok, leírások, kulcsszavak és bővítmények. A szövegek a 2026-09-25-i
nyitólap és Könyvelőknek oldal jóváhagyott szövegét követik.

| Mi | Hol |
|---|---|
| Minden hirdetésszöveg, karakterszámmal | [`SZOVEGEK.md`](SZOVEGEK.md) |
| Meta-képek: 7 üzenet × 4 formátum | `kep/meta/` (28 PNG) |
| Google-képek: 5 üzenet × 3 formátum + 2 logó | `kep/google/` (17 PNG) |
| Google Ads Editor import: hirdetések | `google/kereses-hirdetesek.csv` |
| Google Ads Editor import: kulcsszavak és kizárók | `google/kulcsszavak.csv` |
| Videó (meglévő bemutatók) | `public/bemutato/nyitolap.mp4`, `public/bemutato/konyveloknek.mp4` |

**Egy forrás, minden ebből készül.** A szöveg a `szovegek.ts`-ben él, az árak és a
próba számai a `config/szamlafolyo.ts`-ből jönnek. A képeket, a `SZOVEGEK.md`-t és a
CSV-ket a `keszit.ts` gyártja:

```
npx vite-node marketing/hirdetes/keszit.ts
```

A `hirdetes.test.ts` (az `npm test` része) feltöltés előtt méri:

- **karakterkorlátok:** minden szövegre;
- **tiltott ígéretek:** a lista lent;
- **forintösszegek:** mindegyik a configból való;
- **céloldalak:** az URL-ek és a horgonyok léteznek;
- **könyvelőprogram-export:** csak kimért programot hirdetünk;
- **képek:** csak létező felületet mutatnak (a hibaüzenet, az állapotcímkék és a
  bizonylatlista az alkalmazásé);
- **gyártott fájlok:** naprakészek. Ha a szöveg változik, de az újragyártás
  elmarad, a teszt piros.

---

## ⚠️ Mielőtt egyetlen forintot elköltesz – négy tény

### 1. Az oldalon nincs Meta-pixel és Google-címke, és nem is tehető rá csendben

Az Adatkezelési tájékoztató 2. pontja félkövérrel ígéri:

> „Látogatásmérés nincs, sütit mérésre vagy hirdetésre nem használunk. Hirdetési
> kódrészlet nincs, profilalkotás nincs, és más webhelyeken sem követünk senkit."

Ebből következik:

- **Konverzióra optimalizálni egyik platformon sem tudsz.** A Meta és a Google
  nem látja a regisztrációt.
- **Meta:** a kampánycél *Forgalom → céloldal-megtekintések*.
- **Google:** *Kattintások maximalizálása*, kattintásonkénti felső korláttal.
- **A pixel vagy a címke külön kör, nem egy beillesztett kódrészlet.** Három
  dolgot von maga után:
  - a fenti mondat átírását, új jogi változatban;
  - egy valódi hozzájárulás-kezelőt (süti-ablakot);
  - a hozzájárulás előtti néma állapotot.

### 2. A saját oldalunk semmilyen látogatásmérést nem futtat

A Vercel Analytics 2026-09-23 óta ki van vezetve, és más mérőkód sincs. Az `utm_`
paramétereket semmi nem olvassa, a kampányok szerinti bontás a platformok
felületén marad.

**Van viszont egy saját, sütimentes jelzés.** A cég létrehozásakor adott „Honnan
hallottál rólunk?” válasz. A választható lehetőségek közül a kampányokhoz ez a három
tartozik:

- *Google-keresés*;
- *Online hirdetés*;
- *Facebook*.

A kampány előtti és alatti heteket **összesítve** összevetve látszik, hoz-e
regisztrációt a hirdetés. Egyéni választ nem nézünk: az Adatkezelési
tájékoztató szerint ezt az adatot kizárólag összesítve használjuk.

### 3. Az első hirdetésből érkezők lesznek az első idegen felhasználók

Élesben ma egyetlen cég van, a tulajdonosé. Az első napokban érdemes figyelni, hol
akadnak el a látogatók: a regisztrációnál, a megerősítő levélnél vagy a
cégalapításnál.

### 4. Az e-mailes beküldés alapból ki van kapcsolva

Az `5-email` hirdetés ezért azt mondja, hogy a cím *bekapcsolás után* jár. Ne
rövidítsd le úgy, mintha minden fiók azonnal kapna címet.

---

## Meta (Facebook, Instagram)

### Formátumok

| Fájlvég | Méret | Hol jelenik meg | Megjegyzés |
|---|---|---|---|
| `_4x5` | 1080 × 1350 | Feed | **Ezzel kezdj**: mobilon ez kapja a legnagyobb helyet |
| `_1x1` | 1080 × 1080 | Feed, Marketplace, jobb oldali sáv | Alcím nélkül: mérve nem fér el olvashatóan |
| `_9x16` | 1080 × 1920 | Stories, Reels | Felül 270, alul 360 képpont üres: ott a Meta felülete takar |
| `_1.91x1` | 1200 × 628 | Link, Audience Network | Alcím nélkül, a Meta a szöveget úgyis kiírja |

### Hét üzenet

| Azonosító | Az üzenet | Kinek | Céloldal | Gomb |
|---|---|---|---|---|
| `1-rendezett` | Számlákból rendezett adatok, kevesebb kézi munkával | széles teszt | `/` | További információ |
| `2-jovahagyas` | Minden bizonylatot te hagysz jóvá | aki nem bízza a gépre | `/` | További információ |
| `3-ellenorzes` | Nettó + áfa = bruttó? Ezt kiszámoljuk | akit a pontosság érdekel | `/` | További információ |
| `4-konyvelo` | Ügyfelenkénti export RLB, Novitax és Kulcs számára | könyvelőirodák | `/konyveloknek` | További információ |
| `5-email` | E-mailben kaptad a számlát? Továbbítsd | vállalkozók | `/` | További információ |
| `6-eszamla` | Az e-számla adatait közvetlenül átvesszük | e-számlát kapók | `/` | További információ |
| `7-proba` | 14 nap, 50 dokumentum, bankkártya nélkül | az ajánlat, újracélzásra is | `/` | Regisztráció |

Minden üzenethez 3 címsor, 2 leírás, egy rövid és egy hosszú fő szöveg tartozik:
[`SZOVEGEK.md`](SZOVEGEK.md). A rövid fő szöveg a „Továbbiak” előtti 125 karakterben
önmagában is megáll.

### Videó

A két meglévő bemutató, mindkettő 1920 × 1080 (16:9). A hosszukat és a méretüket az MP4-fejlécből mértem:

- **`nyitolap.mp4`:** 44 mp, 1,3 MB. Az `1-rendezett` mellé.
- **`konyveloknek.mp4`:** 70 mp, 2,3 MB. A `4-konyvelo` mellé. Feliratokkal vezet végig, hang nélkül is követhető.

A Feedben 16:9-ben is futnak. **Álló (9:16) változatuk nincs**, ezért Stories és
Reels helyre a képek mennek.

### Célzás és keret – kiindulópont, nem mérés

Ezeket nem mértem, lefutott kampány nincs mögöttük.

- **Ország:** Magyarország. **Nyelv:** magyar. **Kor:** 25–64.
- **Kampánycél:** Forgalom → *céloldal-megtekintések* (lásd fent, 1. pont).
- **Elhelyezés:** Advantage+ (automatikus). A négy formátum mindent lefed.
- **Szerkezet:** egy kampány, három hirdetéskészlet:
  - (a) könyvelők és könyvelőirodák: `4-konyvelo`, `2-jovahagyas`, `3-ellenorzes`;
  - (b) kisvállalkozás-tulajdonosok: `1-rendezett`, `5-email`, `6-eszamla`;
  - (c) széles célzás, érdeklődés nélkül: `1-rendezett`, `2-jovahagyas`, `7-proba`.
- **Keret:** készletenként napi 2 000–3 000 Ft, legalább 4–5 napig érdemi
  beavatkozás nélkül (tanulási szakasz).
- **Érdeklődési körök** (a hirdetéskezelő keresőjébe írva): Könyvelés
  (Accounting), Könyvvitel (Bookkeeping), Kisvállalkozás (Small business),
  Vállalkozás (Entrepreneurship), Számviteli szoftver (Accounting software).
- **Az első kérdés, amire a kampány választ ad:** a „bizalom/ellenőrzés” (`2`, `3`)
  vagy a „kevesebb kézi munka” (`1`, `5`) üzenet hozza a kattintást.

---

## Google Ads

### Keresési kampányok – ezzel kezdj

Két kampány, mindkettőben egy hirdetéscsoport, egy reszponzív keresési
hirdetéssel (15 címsor, 4 leírás):

| Kampány | Céloldal | Kulcsszavak |
|---|---|---|
| SF Keresés – Vállalkozások | `/` | számlafeldolgozás, számla kiolvasás, bizonylat feldolgozás… |
| SF Keresés – Könyvelők | `/konyveloknek` | könyvelőiroda szoftver, rlb kettős import, novitax import… |

**Beállítás:**

- **Hálózat:** csak Google-keresés. A Display-hálózat és a keresési partnerek
  pipáját vedd ki.
- **Helyszín:** Magyarország. **Nyelv:** magyar.
- **Ajánlattétel:** *Kattintások maximalizálása*, kattintásonkénti felső
  korláttal. Konverzióra nem tud optimalizálni (1. pont).
- **Keret:** kampányonként napi 2 000–3 000 Ft. Ez kiindulópont, nem mérés.
- **Kizáró kulcsszavak:** mindkét kampányra. Ezekkel zárod ki azokat, akik számlát
  **kiállítani** akarnak, mert a SzámlaFolyó nem számlázó program. A lista a
  CSV-ben és a `SZOVEGEK.md`-ben van.

**Importálás a Google Ads Editorba:** *Fiók → Importálás → Fájlból*, előbb a
`kulcsszavak.csv`, utána a `kereses-hirdetesek.csv`. Az Editor hiányzó kampányt és
hirdetéscsoportot a sorokból hoz létre. **A közzététel előtt nézd át az előnézetet**:
a CSV-oszlopok neve az Editor angol felületéhez igazodik, és ezt a konténerből nem
tudtam kipróbálni.

**Bővítmények** (a `SZOVEGEK.md`-ben karakterszámmal): 6 webhelylink, 8 kiemelés,
kiegészítő részletek „Szolgáltatások” fejléccel. A webhelylinkek horgonyait
(`#folyamat`, `#arak`, `/konyveloknek#kalkulator`) az őr ellenőrzi.

### Performance Max – még ne

Az eszközcsoport kész: 5 címsor, 3 hosszú címsor, 4 leírás, 15 kép és 2 logó. A
Performance Max azonban konverziós célra épül, mérés nélkül vakon költ. **Akkor
indítsd, ha a konverziómérés rendezve van** (1. pont). Addig a keresési kampány a
jobb pénz.

A képek a Google ajánlása szerint kevés szöveget visznek: nincs rajtuk jelvény,
alcím és gomb.

| Fájlvég | Méret | Google-név |
|---|---|---|
| `_1.91x1` | 1200 × 628 | Fekvő kép |
| `_1x1` | 1200 × 1200 | Négyzetes kép |
| `_4x5` | 960 × 1200 | Álló kép |
| `logo_1x1` | 1200 × 1200 | Logó |
| `logo_4x1` | 1200 × 300 | Fekvő logó |

A két videót YouTube-ra feltöltve (nem listázottként) a Performance Max és a
videókampányok is használhatják.

---

## ⚠️ Két nyitott kockázat

1. **Harmadik fél védjegyei a hirdetésszövegben.** Az „RLB Kettős”, a „Novitax”
   és a „Kulcs-Könyvelés” név kompatibilitást jelez, ami általában
   megengedett. Ha azonban a jogosult panaszt tesz, a Google korlátozhatja a
   használatukat a hirdetésszövegben. Ha egy hirdetés emiatt elakad, a könyvelős
   csoportban a „Könyvelőprogram-export” általános alak a tartalék.
2. **A Meta az üzleti szolgáltatásokat is ellenőrzi.** Minden állítás mögött
   a céloldal ugyanazon állítása áll. Ha egy hirdetést mégis elutasítanak,
   előbb a céloldalt nézd meg: azt mondja-e szó szerint, amit a hirdetés.

---

## Amit ez a termék nem ígérhet

A `szovegek.ts` `TILTOTT` listája, és az őr mindegyiket keresi. Ha hirdetést kézzel
írsz a felületen, ezt a listát tartsd magad előtt:

| Ne írd | Miért | Ami helyette igaz |
|---|---|---|
| „teljesen automatikus”, „nem kell hozzányúlnod” | Alapból minden bizonylat emberi jóváhagyásra vár | „Te hagyod jóvá, a rendszer megjelöli, amit érdemes átnézni” |
| „hibátlan”, „100%”, „garantált” | A nevekre nincs számítással ellenőrzés | „Amit ki lehet számolni, azt kiszámoljuk” |
| „magyar szerveren” | Az adat Frankfurtban (EU) van | „Adattárolás az EU-ban” |
| „könyvel helyetted”, „elkészíti a bevallást” | A termék adatot ad át, nem könyvel | „Könyveléshez előkészített adat” |
| „NAV-adatszolgáltatás” | Ilyen funkció nincs | Ne szerepeljen |
| „könyvelésre kész” | Az ÁSZF 3. pontja szerint ellenőrzésre előkészített adat | „Rendezett adatok”, „ellenőrzésre előkészít” |
| „percek alatt”, „másodpercek alatt” | Nem mértük, a fájltól függ | „Kevesebb kézi munkával” |
| „ingyenes” a próbán kívül | 14 nap / 50 dokumentum után fizetős; az e-számla is a keretből megy | „14 nap ingyenes próba” |

---

## Ha változik a termék

Egy ígéret változásakor (például a gépi jóváhagyás alapállása vagy egy ár) a
`szovegek.ts`-t írd át, majd futtasd a `keszit.ts`-t. Az árak és a próba számai a
configból jönnek, tehát egy árváltozás a hirdetésben újragyártással magától
követi. **A már futó hirdetéseket a platformon kézzel kell frissíteni**, ezt semmi
nem teszi meg helyetted.
