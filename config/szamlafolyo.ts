/**
 * A számok egyetlen forrása.
 *
 * A nyitólap árlistája, a Beállítások képernyő és a keretszámolás mind innen
 * olvas. Egy marketingszövegbe kézzel beírt szám előbb-utóbb elcsúszik attól,
 * amit a rendszer valóban ad — az árlistán viszont szerződéses ígéret.
 *
 * Ez a fájl a böngészőbe is bekerül, ezért **titkot nem tartalmaz**: az
 * árazonosítók nem titkok (a Stripe checkout nyilvánosan használja őket), az
 * API-kulcsok viszont sosem kerülnek ide.
 */

export const szamlafolyo = {
  /*
   * Feltöltés
   *
   * A méret- és típuskorlát egy helyen áll. Nem képernyő-beállítás, hanem a
   * rendszer határa. A típus a **tartalomból** derül ki, nem a kliens
   * állításából — a `mimeTipusok` csak azt mondja meg, mit fogadunk el.
   */
  feltoltes: {
    maxBajt: 20 * 1024 * 1024,
    mimeTipusok: {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      // Önálló e-számla (UBL, Factur-X/ZUGFeRD CII). A tartalomból megállapított
      // típus ezekre `text/xml`, de a küldő oldal néha `application/xml`-t mond
      // — mindkettőt elfogadjuk.
      'text/xml': 'xml',
      'application/xml': 'xml',
    },
  } as const,

  /*
   * E-mailes beküldés
   *
   * A cégnek saját beküldő címe van: `b-<token>@bekuldes.szamlafolyo.hu`. A
   * levelet **webhook** hozza, nem IMAP-olvasás — nincs kapcsolat, amit fenn
   * kell tartani, és nincs postafiók-jelszó a folyamatban.
   *
   * ⚠️ A cím **bemutatóra szóló kulcs**: aki ismeri, a cég keretéből költ.
   * Ezért a token kitalálhatatlan, és ezért van a Beállításokban csere-gomb.
   */
  bekuldes: {
    domain: 'bekuldes.szamlafolyo.hu',
    // A helyi rész előtagja. Nem díszítés: enélkül nem lehetne megkülönböztetni
    // egy cégtokent a `postmaster@`-tól és az `abuse@`-tól, amiket egy levelet
    // fogadó tartománynak kezelnie kell.
    elotag: 'b-',
    // Futótűz-fék, a `koteg.maxDarab` mintájára: egy kétszáz mellékletes levél
    // ne csinálhasson kétszáz bizonylatot.
    maxMelleklet: 20,
    /*
     * ⚠️ Ez a szám **heurisztika, nem szabály** — és ezt itt ki kell mondani.
     *
     * Az aláírásokban ülő céglogó ugyanolyan képmelléklet, mint egy lefotózott
     * nyugta; a levélből magából nem derül ki, melyik melyik. A méret az
     * egyetlen jel, ami a kettőt elválasztja: egy logó jellemzően pár tíz
     * kilobájt, egy telefonnal készült fotó több száz.
     *
     * A másik, erősebb szűrő nem itt van, hanem a `mellekletValogat()`-ban:
     * ha a levélben van PDF vagy XML, a képekhez **hozzá sem nyúlunk**. Ez az
     * eset — szállítói számla PDF-ben, logó az aláírásban — a gyakori, és arra
     * ez a küszöb nem is kell.
     *
     * Ha a szolgáltató a mellékleten jelzi az `inline` elhelyezést, ez a szám
     * kidobható, és ki is kell dobni. Addig marad, megnevezve annak, ami.
     */
    kepMinBajt: 50 * 1024,
  } as const,

  /*
   * Kiolvasás
   *
   * A `ellenorzesKuszob` **fölött** a mező jelöletlen marad (a kiemelés a bajt
   * jelöli, nem a rendben lévőt), a `figyelmeztetesKuszob`-ig piros, a kettő
   * között sárga. A bukott validátor mindig a piros sávba húz.
   *
   * Maga a határérték az óvatosabb sávba esik (`<=`, nem `<`): a modellek kerek
   * számokat mondanak, és a határra eső 0,85 nem jótállás. Egy kézzel írott
   * számlán a 3.8 Flash pontosan 0,85-öt adott a szállító nevére — a lap
   * legalacsonyabb értékét, és az egyetlen rossz mezőt.
   */
  /*
   * Kötegszétszedés
   *
   * Egy PDF-ben több bizonylat is lehet — a könyvelő egyben szkenneli be a havi
   * paksamétát. A rendszer ilyenkor megkérdezi a modellt, hol vannak a
   * bizonylathatárok, és **külön bizonylatot csinál mindegyikből**,
   * oldaltartománnyal. A fájlt nem vágjuk szét, csak a tartományt tároljuk.
   *
   * Kredit: **bizonylatonként**, a saját oldalszáma szerint. A szétszedő futás
   * maga nulla kredit — a szétszedés a szolgáltatás része, nem külön tétel
   * (ezt az ÁSZF 8. pontja is kimondja).
   */
  koteg: {
    // Futótűz-fék. Minden darab külön modellhívás és külön kredit, ezért egy
    // elszabadult válasz ("minden oldal külön bizonylat") ne tudjon egy
    // százoldalas kötegből száz kiolvasást csinálni. E fölött nem szedjük szét:
    // marad egy bizonylat, a `tobb_irat_gyanu` zászlóval, ahogy eddig.
    maxDarab: 30,
    // Ennyi oldalig küldjük a **szövegréteget** a szétszedőnek a PDF helyett.
    // Sokkal olcsóbb, és a határok felismeréséhez a szöveg elég — a képet csak
    // akkor kell nézni, ha nincs szövegréteg.
    szovegMaxOldal: 60,
  },

  kiolvasas: {
    ellenorzesKuszob: 0.85,
    figyelmeztetesKuszob: 0.5,
    maxProbalkozas: 3,
    claimIdokorlatPerc: 5,
  },

  /*
   * Modell
   *
   * ⚠️ A régi `env.example` a `google/gemini-3.1-flash-lite`-ot ajánlotta, a
   * README viszont a 3.8 Flash-t — és **a README-t méréssel indokolta**: a Lite
   * ugyanazt a kézzel írott számlát háromszor kiolvasva három kitalált
   * szállítónevet adott, az egyikre 1,00 magabiztossággal, és **egyszer sem**
   * kapcsolta be a `nehezen_olvashato` zászlót. A 3.8 Flash mindháromszor
   * bekapcsolta.
   *
   * Vagyis a Lite pont azt a védelmet kapcsolja ki, amiért a v6-os prompt
   * megszületett. Ez a sor ne másszon vissza egy „olcsóbb lesz" mozdulattal.
   */
  modell: {
    alapertelmezett: 'google/gemini-3.8-flash',
    alapUrl: 'https://openrouter.ai/api/v1',
    idokorlatMp: 90,
  },

  /*
   * Próbaidő — Stripe nélkül fut, bankkártya nélkül lehet kipróbálni.
   *
   * A nap és a darabszám **vagy** kapcsolatban van: amelyik előbb elfogy, az
   * zárja le. Húsz dokumentum volt itt korábban, abból viszont egy
   * könyvelőiroda egy óra alatt kifut, és úgy sosem jut el a termék lényegéig:
   * a kötegig, az ellenőrzésig, a havi exportig. A szűkítés indoka („az ingyen
   * keret AI-költséget generál") ezen a modellen nem áll — egy kiolvasás
   * nagyságrendileg fillér. A visszaélés ellen az véd, hogy a próba céghez
   * kötött, és a fájlok hét nap után törlődnek.
   */
  proba: {
    napok: 14,
    dokumentumok: 50,
    // Három fő. A költséget a darabszám fogja meg, nem a fejszám — egy
    // könyvelőiroda pedig ne egyedül kényszerüljön kipróbálni a terméket.
    felhasznalok: 3,
  },

  /*
   * Kredit
   *
   * A vevő „dokumentumot" vásárol, a költségünk viszont oldalarányos: egy
   * nyolcvan oldalas köteg nem egy nyugta.
   *
   * A szabály szándékosan egyszerű, mert **ki van írva a felületre**: egy normál
   * számla (1–3 oldal) így biztosan egy marad. A fair-use szabály nem érintheti
   * a hétköznapi használatot, különben nem fair-use, hanem rejtett áremelés.
   *
   * ⚠️ A mértékegység a **bizonylat**, nem a feltöltött fájl. Ha egy fájlban
   * több bizonylat van, a rendszer szétszedi őket, és mindegyik külön számít —
   * de **a köteg maga nem kerül külön kreditbe**, a szétszedés a szolgáltatás
   * része. A régi rendszerben ez a hiba élt: a köteg oldalarányosan fogyasztott,
   * aztán az ember szétvágva újra feltöltötte, és másodszor is fizetett.
   */
  kredit: {
    oldalPerKredit: 5,
  },

  /*
   * Automatikus jóváhagyás
   *
   * **Alapból ki van kapcsolva**: minden bizonylat emberi jóváhagyásra vár, és
   * a nyilvános szövegek is ezt ígérik. Aki kifejezetten kéri, a Beállítások
   * képernyőn bekapcsolhatja — onnantól a `kapuk.ts` hét kapuja dönt, és az
   * így átment bizonylat jelvényt kap, indokkal, exportig visszahívhatóan.
   *
   * ⚠️ **Az alapállás nem itt lakik, hanem a sémában**: a
   * `companies.auto_jovahagyas_be` oszlop `default false`-a mondja ki
   * (`20260915000100_auto_jovahagyas_alapbol_ki.sql`). Állt itt korábban egy
   * `alapbolBe` mező is — **senki nem olvasta**, tehát a kódban semmit nem
   * jelentett. Egy konfigérték, ami mögött nincs viselkedés, ugyanaz a hamis
   * ígéret, mint a sokáig sehol nem használt `fejlesztesAlatt` kapcsoló volt.
   *
   * Az alábbi két szám viszont **valóban** hat: a `kapuk.ts` olvassa őket.
   */
  automatikusJovahagyas: {
    // A cég első ennyi bizonylata **mindig** emberhez megy, akkor is, ha minden
    // kapu átmenne. Előzmény nélkül az „eltér-e a cég szokásaitól" kapu üresen
    // jár, és a felhasználónak is látnia kell egyszer, mit csinál a rendszer,
    // mielőtt rábízza.
    bemelegitesDarab: 20,
    // Minden ennyiedik automatikusan jóváhagyható bizonylat mégis ember elé
    // kerül. Két okból: így marad kalibrálva az ember, és **így mérhető az
    // automatikus jóváhagyás tévedési aránya** — enélkül csak reménykednénk.
    mintavetelMinden: 20,
  },

  /*
   * Túlhasználat
   *
   * Alapból ki van kapcsolva: váratlan számlát senki ne kapjon attól, hogy egy
   * hónapban többet dolgozott. A keret megállít.
   *
   * És az engedély sem nyitott végű: van **forintban** mért plafon. A plafon
   * nem opcionális kényelmi mező — a bekapcsolás magától beírja ezt az értéket,
   * mert aki nem tud a mezőről, azt is védenie kell. Forintban mér, nem
   * kreditben, mert a darabár csomagonként más.
   */
  tulhasznalat: {
    alapPlafonFt: 10000,
  },

  /*
   * Megőrzés
   *
   * Az eredeti fájl a kiolvasás után már nem kell semmihez — az adat az
   * adatbázisban van, a könyvelő az exportot kapja. Amíg viszont ott van, addig
   * idegen cégek számláit tároljuk. Ami nincs meg, azt nem is lehet
   * kiszivárogtatni.
   */
  megorzes: {
    maxNap: 7,
    probaFajlNap: 7,
  },

  /*
   * Csomagok
   *
   * **Éves fizetés nincs, és ez szándékos.** A keret a Stripe számlázási
   * ciklusára szól; egy éves előfizetésnél ez a ciklus tizenkét hónap — az éves
   * ár így nem havi keretet adna, hanem évit, vagyis egytizenketted terméket.
   * Havi keret + éves számlázás csak külön forgó ablakkal működne.
   *
   * Az `extraFt` a keret fölötti darabár, és **mindig drágább**, mint az adott
   * csomag saját darabára (ár ÷ darabszám: 39,8 / 24,95 / 19,98) — különben azt
   * tanítanánk, hogy megéri a kis csomagban maradni és túllépni. Erre teszt van.
   *
   * Az árazonosítók a Stripe éles fiókjából valók, és pontosan ezeket a
   * számokat hordozzák. **Ismeretlen árazonosító nem „korlátlan"**, hanem a
   * legkisebb csomag keretét kapja, és a naplóba kerül — a régiben ez
   * `PHP_INT_MAX` volt, épp az AI-költséges oldalon.
   */
  csomagok: {
    kicsi: {
      nev: 'Start',
      dokumentumok: 50,
      // Két fő, nem egy. A költségünk oldalarányos, a fejszám nem kerül
      // semmibe — egy egyszemélyes cégnél viszont majdnem mindig van egy
      // könyvelő is, aki be akar nézni. Az egyfős keret nem bevételt hoz, hanem
      // közös jelszót, ami biztonsági kockázat.
      felhasznalok: 2,
      arHavi: 1990,
      extraFt: 49,
      arazonosito: 'price_1UCO5PV05U28wfjzx5lH1Swk',
      arazonositoExtra: 'price_1UCO5JV05U28wfjzSkoFKiKy',
    },
    kozepes: {
      nev: 'Flow',
      dokumentumok: 200,
      felhasznalok: 5,
      arHavi: 4990,
      extraFt: 29,
      arazonosito: 'price_1UCO5OV05U28wfjzVC3xfvIz',
      arazonositoExtra: 'price_1UCO5MV05U28wfjzCk96wSra',
    },
    nagy: {
      nev: 'Pro',
      dokumentumok: 500,
      // `null` = korlátlan, és ez **szándékos**, nem elmaradt beállítás. A
      // felhasználó nem kerül nekünk semmibe: a költség oldalarányos, azt a
      // darabszám fogja meg. A korlátlan *dokumentum* volt az, ami véletlenül
      // keletkezett és tilos; a fejszám más kérdés.
      felhasznalok: null,
      arHavi: 9990,
      extraFt: 24,
      arazonosito: 'price_1UCO5JV05U28wfjz4FXUyHhe',
      arazonositoExtra: 'price_1UCO5JV05U28wfjzSPeyjMa1',
    },
  },
} as const;

export type CsomagKulcs = keyof typeof szamlafolyo.csomagok;
export type Csomag = (typeof szamlafolyo.csomagok)[CsomagKulcs];

/** A csomagok a megjelenítés sorrendjében. */
export const csomagSorrend: readonly CsomagKulcs[] = ['kicsi', 'kozepes', 'nagy'] as const;
