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
   * A webhely címe
   *
   * Egyetlen dolog miatt kell: a **meghívó levélbe** kerülő link. Minden más
   * helyen a böngésző a saját címét ismeri, egy levelet viszont a szerver
   * állít össze, és ott nincs `window.location`.
   *
   * ⚠️ Szándékosan **nem** a kérés `Origin` fejlécéből vesszük. Az a hívó
   * állítása, és a levél a **mi** nevünkben megy ki: egy rossz irányba mutató
   * link a saját, hitelesített tartományunkról küldött adathalász levél lenne.
   * Egy kézzel karbantartott konstans itt kevésbé kényelmes, de nem hazudható.
   *
   * ⚠️ **Ez az érték és a Supabase Auth Site URL-je együtt mozog.** A levélbe
   * kerülő link ebből épül, a levél utáni visszaút (megerősítés,
   * jelszó-emlékeztető) pedig a Site URL-ből — ha a kettő eltér, a felhasználó
   * két különböző helyre kerül. Az átírás után a `meghivo-kuld` függvényt
   * **újra kell telepíteni**: az érték a levélbe fordításkor ég bele.
   *
   * A régi Vercel-cím (`szamla-folyo2.vercel.app`) ugyanazt az alkalmazást
   * szolgálja ki, tehát a már kiküldött linkek nem törnek el — de az új
   * levelek innentől a saját tartományra mutatnak, ami a levél hitelességének
   * is része.
   */
  webcim: 'https://szamlafolyo.hu',

  /*
   * A rendszer leveleinek feladója.
   *
   * Szándékosan **valódi postafiók**, nem `noreply@`. Aki meghívót kap egy
   * ismeretlen rendszertől, annak az első mozdulata a Válasz gomb — és egy
   * megválaszolhatatlan levél pont abban a pillanatban hallgat el, amikor a
   * címzett bizalmatlan. A tartomány DKIM-aláírt, tehát a levél hitelesen a
   * miénk.
   */
  levelFelado: 'SzámlaFolyó <info@szamlafolyo.hu>',

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

    /*
     * **Az engedélyezett szolgáltatók zárt listája.**
     *
     * Eddig a kérés csak *politikát* írt elő (`data_collection: "deny"`): ami
     * vállalja, hogy nem tárol és nem tanít, az kiszolgálhatja. Ez két dolgot
     * nem adott meg. Egyrészt az Adatkezelési tájékoztató nem tudott konkrét
     * céget megnevezni — csak annyit, hogy „a kiolvasást végző modell
     * szolgáltatója" —, miközben az ÁSZF 11. pontja azt ígéri, hogy az
     * al-adatfeldolgozók **név szerint** szerepelnek. Másrészt az OpenRouter
     * saját leírása szerint a `deny` az ő **legjobb tudásuk**, nem garancia.
     *
     * A lista tehát nem óvatoskodás: enélkül a tájékoztató nem lehet igaz.
     *
     * A két szolgáltató nem találgatás. A modell végpontjait lekérdeztük az
     * OpenRouter nyilvános API-járól (`/models/google/gemini-3.8-flash/
     * endpoints`, 2026-09-20): **hat végpont van, és mind a hat a Google** —
     * három a Google AI Studio, három a Vertex oldalán. A lista ezért nem
     * szűkíti a választékot, csak kimondja, ami amúgy is igaz, és bezárja az
     * ajtót egy későbbi, csendes bővülés előtt.
     */
    szolgaltatok: ['google-ai-studio', 'google-vertex'],
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
   *
   * # Az export fájl ugyanez a kérdés, egy lépéssel arrébb
   *
   * Az export xlsx **ugyanazokat az adatokat viszi**, amikért az eredeti fájlra
   * hét napos plafont tettünk: szállítónevek, adószámok, összegek. Sokáig
   * korlátlan ideig állt a tárolóban — mérve: öt export négy napon át, és
   * semmi nem vitte volna el soha. Ez a kapcsoló zárja le.
   *
   * ⚠️ **Az `exportNap` nem állítható cégenként, és ez szándékos.** A
   * `file_retention_days` azért lett cégenkénti, mert ott a rövidebb idő a
   * felhasználó *kényelmét* sérti (nem tud visszanézni a papírba) — ott van mit
   * mérlegelnie. Itt nincs: az export bármikor újrakészíthető a Tételekből,
   * tehát a hosszabb tárolás senkinek nem ad semmit, csak nekünk kockázatot.
   * Egy kapcsoló, aminek csak rossz állása van, nem választás.
   *
   * ⚠️ **A számot az SQL is ismeri** (`20260918000100_export_selejtezes.sql`,
   * `belso.selejtezheto_export`), mert egy napi cron nem tud TS-configot
   * olvasni — ugyanaz a tükrözés, mint a `maxNap` és a `file_retention_days`
   * `check (… between 0 and 7)` között. Ha ez a szám változik, **a migráció is
   * változik**; az Adatkezelési tájékoztató innen olvassa.
   */
  megorzes: {
    maxNap: 7,
    probaFajlNap: 7,
    exportNap: 30,

    /*
     * # A három kísérő megőrzési idő (2026. szeptember 20.)
     *
     * A jogi felülvizsgálat 12. pontja jogosan kifogásolta, hogy a tájékoztató
     * három adatkörre is „a szerződés megszűnéséig" határidőt mondott —
     * vagyis évekig, egy olyan nyomnak, aminek hetek múlva már nincs dolga.
     *
     * Mindhárom **kilencven nap**, és ez nem lustaság: ennyi idő alatt egy
     * negyedéves könyvelési kör egyszer végigfut, tehát aki visszakeres,
     * addigra megtette. Ami ennél régebbi, az nem visszakeresés, hanem
     * felhalmozás.
     *
     * ⚠️ **A számokat az SQL is ismeri** (`20260920000100_adattakaritas.sql`),
     * mert a napi takarítás nem tud TS-configot olvasni — ugyanaz a tükrözés,
     * mint az `exportNap`-nál. Ha ez a három szám változik, a migráció is
     * változik; a `config/megorzes.test.ts` méri, hogy a kettő együtt mozog.
     */

    /** Lezárult (elfogadott, visszavont, lejárt) meghívó sora ennyi nap után törlődik. */
    meghivoNap: 90,
    /** A beküldő címre érkezett levelek nyilvántartása ennyi nap után törlődik. */
    levelNaploNap: 90,
    /**
     * A modell **nyers válasza** ennyi nap után törlődik a kiolvasás sorából.
     *
     * A sor maga megmarad, és ez szándékos: abból számol a havi keret
     * (a terv 1. szabálya), tehát a darabszámnak túl kell élnie. Ami elmegy,
     * az a bizonylat tartalmát hordozó nyers válasz — épp az, aminek a
     * megőrzésére kilencven nap után már nincs indok.
     */
    nyersValaszNap: 90,
  },

  /*
   * Csomagok
   *
   * **Éves fizetés nincs, és ez szándékos.** A keret a Stripe számlázási
   * ciklusára szól; egy éves előfizetésnél ez a ciklus tizenkét hónap — az éves
   * ár így nem havi keretet adna, hanem évit, vagyis egytizenketted terméket.
   * Havi keret + éves számlázás csak külön forgó ablakkal működne.
   *
   * # Az `extraFt` és a csomagok viszonya
   *
   * Itt **állt egy szabály, ami elavult**, és érdemes tudni, hogyan: sokáig az
   * volt kimondva, hogy az `extraFt` mindig drágább a csomag saját darabáránál
   * (ár ÷ keret) — „és erre teszt van". Teszt nem volt, a 2026 szeptemberi
   * árváltás pedig mindhárom csomagon **megfordította** az állítást (a saját
   * darabár ma 98 / 49,5 / 39,8 Ft, az `extraFt` 50 / 40 / 30). A komment ettől
   * nem lett hangosabb, csak hamis.
   *
   * Az az összehasonlítás amúgy sem a helyes kérdés volt: a havi díj
   * elkötelezettség, az átlagár és a határár nem ugyanaz a szám, és a csökkenő
   * határár bevett árazási alak. Amit a mondat védeni akart — *ne érje meg a
   * kis csomagban maradni és túllépni* —, az **csomagok között** dől el:
   *
   * 1. egy kisebb csomag túlhasználattal felvitt kerete legyen **drágább**,
   *    mint a következő csomag havi díja (Start → 200 db: 12 400 > 9 900;
   *    Flow → 500 db: 21 900 > 19 900);
   * 2. a keret fölötti darabár csomagról csomagra **csökkenjen** — aki többet
   *    fizet, ne járjon rosszabbul a keretén felül.
   *
   * **Erre most valóban teszt van**, a számok mellett: `szamlafolyo.test.ts`.
   * A configból olvas, tehát a következő árváltásnál is mér.
   *
   * # Miért `lookupKulcs`, és miért nem árazonosító
   *
   * Itt **állt még egy elavult figyelmeztetés**, és ezt is érdemes tudni: azt
   * mondta, hogy a dashboardos árátírás a háttérben új `price` objektumokat
   * hozott létre, tehát az itteni azonosítók a *régi* árakat hordozzák.
   * Megmérve **nem így történt**: a hat éles azonosító változatlan, aktív, és
   * pontosan a fenti hat számot hordozza. A figyelmeztetés feltevés volt, nem
   * mérés — és a feltevés drága lett volna, mert egy fölösleges cseréhez
   * vezetett volna.
   *
   * Az árazonosítók helyett mégis a Stripe **`lookup_key`**-e áll itt, és ennek
   * más oka van: az árazonosító **fiókhoz kötött**. A sandbox és az éles fiók
   * ugyanazt a hat csomagot más-más azonosítón tartja (a különbség magában a
   * betűsorban is látszik), tehát hat beírt azonosító mindig csak az egyik
   * fiókban ér valamit — a másikban csendben ismeretlen csomag lenne belőle.
   *
   * A `lookup_key` ugyanaz mindkét fiókban. Ebből három dolog következik:
   *
   * 1. **ugyanaz a kód fut sandboxban és élesben** — hogy melyik fiókban,
   *    azt egyedül a `STRIPE_SECRET_KEY` titok dönti el, nem a repó;
   * 2. a `stripe-checkout` az árat **futásidőben** oldja fel a kulcsból, tehát
   *    egy jövőbeli árcsere nem nyúl ehhez a fájlhoz;
   * 3. a csomagot a `keret.ts` a `companies.stripe_lookup_key` oszlopból keresi
   *    vissza, nem az árazonosítóból.
   *
   * ⚠️ A kulcsokat **mindkét Stripe-fiókban be kell állítani**. A sandboxban
   * megvannak; az éles hat ár címkézése dashboard-lépés. Amelyik fiókban
   * hiányzik, ott a checkout nem találja meg az árat — és ez jó hír: hangosan
   * bukik, nem csendben rossz árat számláz.
   *
   * **Ismeretlen csomagkulcs nem „korlátlan"**, hanem a legkisebb csomag
   * keretét kapja, és a naplóba kerül — a régiben ez `PHP_INT_MAX` volt, épp
   * az AI-költséges oldalon.
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
      arHavi: 4900,
      extraFt: 50,
      lookupKulcs: 'szamlafolyo_start_havi',
      lookupKulcsExtra: 'szamlafolyo_start_extra',
    },
    kozepes: {
      nev: 'Flow',
      dokumentumok: 200,
      felhasznalok: 5,
      arHavi: 9900,
      extraFt: 40,
      lookupKulcs: 'szamlafolyo_flow_havi',
      lookupKulcsExtra: 'szamlafolyo_flow_extra',
    },
    nagy: {
      nev: 'Pro',
      dokumentumok: 500,
      // `null` = korlátlan, és ez **szándékos**, nem elmaradt beállítás. A
      // felhasználó nem kerül nekünk semmibe: a költség oldalarányos, azt a
      // darabszám fogja meg. A korlátlan *dokumentum* volt az, ami véletlenül
      // keletkezett és tilos; a fejszám más kérdés.
      felhasznalok: null,
      arHavi: 19900,
      extraFt: 30,
      lookupKulcs: 'szamlafolyo_pro_havi',
      lookupKulcsExtra: 'szamlafolyo_pro_extra',
    },
  },
} as const;

export type CsomagKulcs = keyof typeof szamlafolyo.csomagok;
export type Csomag = (typeof szamlafolyo.csomagok)[CsomagKulcs];

/** A csomagok a megjelenítés sorrendjében. */
export const csomagSorrend: readonly CsomagKulcs[] = ['kicsi', 'kozepes', 'nagy'] as const;
