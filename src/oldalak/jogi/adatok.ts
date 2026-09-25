import { szamlafolyo } from '@config/szamlafolyo.ts';

/**
 * A szolgáltató azonosító adatai — egy helyen.
 *
 * Mind a három jogi oldal hivatkozik rájuk, és az Impresszum, az ÁSZF 1. pontja
 * meg az Adatkezelési tájékoztató 1. pontja **ugyanazt** a céget nevezi meg. Ha
 * három helyre írnánk le, előbb-utóbb kettő maradna igaz.
 *
 * ⚠️ **Ezek a szövegek nem estek át jogi felülvizsgálaton.** Az eredetit egy
 * megszűnt rendszerből hozzuk át, a mostani körben pedig azokat a pontokat
 * írtuk újra, amelyek a mai működéssel ellentmondásba kerültek. A tartalom
 * szakmai ellenőrzése külön feladat, és nem ez a fájl végzi el.
 */

export const szolgaltato = {
  nev: 'Nyeste Krisztián egyéni vállalkozó',
  szekhely: '3000 Hatvan, István király utca 7.',
  hatosag: 'Nemzeti Adó- és Vámhivatal (NAV)',
  nyilvantartasiSzam: '62574956',
  adoszam: '92220155-1-30',
  kamara: 'Heves Vármegyei Kereskedelmi és Iparkamara (HKIK)',
  kamaraCim: '3300 Eger, Faiskola út 15.',
  // Ugyanaz a cím, mint a felület „írj nekünk" linkjén és a kimenő levelek
  // feladójában — egy betűsor, a configban. A külön név itt szándékos: ez az
  // adatkezelő **hivatalos** elérhetősége, nem ügyfélszolgálati cím.
  email: szamlafolyo.kapcsolatEmail,
  telefon: '+36 70 604 3043',
  telefonHivas: '+36706043043',
  weboldal: 'szamlafolyo.hu',
} as const;

/**
 * A hatálybalépés napja.
 *
 * Egy dátum, nem három: a három szöveg együtt változik, mert ugyanarra a
 * működésre vonatkozik. Ha egyszer külön kell válniuk, az külön mezőt kap —
 * addig a közös dátum az igazat mondja.
 */
export const hatalyos = '2026. szeptember 25.';

/**
 * Ugyanaz a nap, **gépnek olvasható alakban** — és ez nem kényelmi másolat.
 *
 * Ezt a betűsort küldi a böngésző a `ceg_letrehozas()`-nak, ez kerül a
 * `terms_acceptances.version` oszlopba, és a szerver **ellenőrzi**, hogy
 * szerepel-e a `legal_versions` táblában. Vagyis aki itt új dátumot ír, annak
 * a `supabase/migrations/` alatt is fel kell vennie egy sort — enélkül a
 * cégalapítás magyar hibaüzenettel áll meg, nem csendben hibázik.
 *
 * ⚠️ **Egy verzió nem vonható vissza.** A `legal_versions` sorai azt mondják
 * meg, milyen szövegek léteztek; a régi sorokat a meglévő elfogadások
 * hivatkozzák. Törölni tehát nem szabad, csak hozzáírni.
 *
 * ⚠️ **És a szöveg sem írható át verzióváltás nélkül** (2026-09-23 óta). Minden
 * kiadott változat teljes, renderelt szövege a `jogi-archivum/<verzió>/`
 * alatt él, a lenyomata a `legal_versions` sorában — és az
 * `archivum.test.tsx` pirosra vált, ha a mai szöveg eltér a mai verzió
 * archívumától. Új szöveg = új dátum itt, új sor a migrációban, és
 * `npx vite-node eszkozok/jogiArchivum.ts`.
 *
 * # Két változat egy napon: `-2` utótag
 *
 * Ha ugyanazon a napon jön új szöveg, a dátum nem lehet az azonosító — a
 * reggeli változat már ki van adva. Ilyenkor a betűsor `<dátum>-<sorszám>`, a
 * `hatalyos` pedig ugyanaz a nap marad, mert a hatálybalépés napja tényleg
 * az. Az első ilyen: `2026-09-23-2`, amelyben a gondolatjel hosszúról (—)
 * nagykötőjelre (–) változott, tartalmi változás nélkül. A `2026-09-23-3`
 * már tartalmi: a hibás teljesítés és a kártérítés egységesítése (ÁSZF 9., 12.,
 * 13.), és a látogatásmérés múltjának kivétele (Adatkezelés 2.). Előfizető
 * ekkor még nem volt, a 15. pont szerinti előzetes értesítés senkit nem érint.
 *
 * `2026-09-24`: az Adatkezelés 2. pontjának táblázata egy sorral bővült – a
 * „Honnan hallottál rólunk?" önkéntes, zárt listás válasza
 * (`20260924000100_honnan_hallottal.sql`). Az ÁSZF és az Impresszum szövege
 * nem változott, csak a közös hatálybalépési dátum. Élesben mérve ekkor is
 * egyetlen cég volt, a tulajdonosé.
 *
 * `2026-09-25`: az ÁSZF negyedik jogi köre (mind a 17 pont: Ptk. 6:152. §,
 * a felelősségi korlát alsó határa, a szolgáltatóváltás alatti
 * törlésfelfüggesztés, a módosítás elutasításának külön útja, a szerződés
 * iktatása), és hozzá igazítva az Adatkezelés 4. és 6. pontja. Az Impresszum
 * nem változott. Élesben mérve ekkor is egyetlen cég volt, a tulajdonosé: a
 * 15. pont szerinti előzetes értesítés senkit nem érint.
 */
export const JOGI_VERZIO = '2026-09-25';

/**
 * Az illetékes békéltető testület.
 *
 * # Miért nem a székhely szerinti kamara
 *
 * A szövegek eddig azt mondták, hogy „az illetékes békéltető testület a
 * Szolgáltató székhelye szerinti kereskedelmi és iparkamara mellett működik",
 * és a Heves vármegyei kamarát nevezték meg. **2024. január 1-je óta ez nem
 * igaz**: a békéltető testületek regionális alapon működnek, és Heves vármegye
 * a Borsod-Abaúj-Zemplén vármegyei, **miskolci** székhelyű testülethez
 * tartozik — a testület illetékességi területe Borsod-Abaúj-Zemplén, Heves és
 * Nógrád vármegye.
 *
 * A kamarai tagság (HKIK, Eger) ettől külön kérdés, és változatlanul igaz:
 * az Impresszum azt a saját helyén tartja.
 *
 * # 2026. szeptember 23. — nem minden ügyfélnek ez az illetékes
 *
 * A jogi felülvizsgálat harmadik köre jelezte: a szöveg úgy szólt, mintha
 * *minden* ügyfélre ez a testület volna illetékes. Nem az: az illetékesség a
 * fogyasztónak minősülő ügyfél lakóhelyéhez, tartózkodási helyéhez, illetve
 * székhelyéhez igazodik (Fgytv. 20. §), nem a Szolgáltatóéhoz. Ez a testület
 * **a saját illetékességi területén** az illetékes — a szövegek ezért előbb
 * az általános szabályt mondják, és csak utána ezt a testületet.
 */
export const bekeltetoTestulet = {
  nev: 'Borsod-Abaúj-Zemplén Vármegyei Békéltető Testület',
  szekhely: '3525 Miskolc, Szentpáli u. 1.',
  levelcim: '3501 Miskolc, Pf. 376.',
  telefon: '+36 46 501-090',
  weboldal: 'bekeltetes.borsodmegye.hu',
  illetekesseg: 'Borsod-Abaúj-Zemplén, Heves és Nógrád vármegye',
} as const;

/**
 * Az adatfeldolgozók — az Adatkezelési tájékoztató 5. pontjának melléklete.
 *
 * ⚠️ **Ez a lista szerződéses ígéret.** Az ÁSZF 11. pontja szerint új
 * al-adatfeldolgozó belépése előtt tizenöt nappal értesíteni kell az
 * Előfizetőket. Aki ide sort vesz fel, annak ez a kötelezettsége is keletkezik
 * — ezért áll a lista itt, kódban, és nem egy szerkeszthető szövegdobozban.
 *
 * # 2026. szeptember 20. — a jogi felülvizsgálat 1., 2. és 19. pontja
 *
 * A lista eddig **nevet és régiót** tartott, jogi személyt és székhelyet nem;
 * a kiolvasás mögött pedig egy megnevezetlen sor állt („A kiolvasást végző
 * modell szolgáltatója"). Ez két dolgot sértett egyszerre: az ÁSZF 11. pontja
 * **név szerinti** felsorolást ígér, az Eker. tv. 4. § h) pontja pedig a
 * tényleges tárhelyszolgáltató megnevezését kéri az Impresszumban.
 *
 * Amit ez a kör megoldott, és amit nem — mert a kettő szétválasztása többet
 * ér, mint egy magabiztosnak látszó táblázat:
 *
 * - ✅ **A modellszolgáltató neve mérve van.** Az OpenRouter nyilvános API-ja
 *   szerint (`/models/google/gemini-3.8-flash/endpoints`, 2026-09-20) a
 *   modellt **hat végpont** szolgálja ki, és **mind a hat a Google**. A kérés
 *   azóta kódból is csak ezt a két szolgáltatói azonosítót engedi
 *   (`szolgaltatoiKikotes()`), tartalék útvonal nélkül — tehát a táblázat nem
 *   pillanatkép, hanem kikényszerített állapot.
 * - ⚠️ **A székhelyek forrása nyilvános cégadat, nem a szolgáltató velünk
 *   kötött szerződése.** Ezért van a `szekhely` mező nullázható: ahol nem
 *   találtam olyan forrást, amit vállalni tudok, ott **nincs beírva semmi** —
 *   egy kitalált cím rosszabb, mint egy hiányzó.
 * - ⛔ **A konkrét továbbítási mechanizmus szolgáltatónként nincs igazolva.**
 *   Hogy melyik cég az EU–USA adatvédelmi keret résztvevője és melyik
 *   általános szerződési feltételekkel dolgozik, azt az általad elfogadott
 *   adatfeldolgozási szerződés mondja meg — ezt innen nem tudom megmérni, és
 *   nem is találgatom. A táblázat ezért **a garancia forrására mutat**
 *   (`garanciaUrl`): a tájékoztatónak azt kell megmondania, *hogyan ismerhető
 *   meg* a garancia. Az egyes szerződések elfogadása és a bizonyítékuk
 *   megőrzése viszont a te feladatod, nem a kódé.
 *
 * A `hol` mező az a hely, ahol az adat **feldolgozódik**; az `unionBelul`
 * viszont azt mondja meg, hogy a szolgáltató Unión kívüli hozzáférése
 * kizárható-e. A kettő nem ugyanaz: a Resend fiókja EU-régióban áll, a cég
 * mégis amerikai — egy adatkezelési tájékoztatóban a gyengébb állítás a
 * helyes állítás.
 *
 * # 2026. szeptember 23. — a szerződések felől, nem a nyilvános cégadatok felől
 *
 * A tulajdonos 2026-09-22-én elmentette a szolgáltatók adatfeldolgozási
 * szerződéseit (Drive: „DPA 2026 09 22"). A szerződő fél, a cím és a
 * továbbítás alapja **ezekből** jön — és két helyen ki is javította a
 * táblázatot:
 *
 * - ⚠️ **Supabase.** A szerződő fél a **Supabase Pte. Ltd** (Szingapúr), és a
 *   szerződés általános szerződési feltételekkel (SCC) számol Unión kívüli
 *   továbbítással. A tárolás attól még Frankfurtban van — de az `unionBelul:
 *   true` („az Unión kívüli hozzáférés kizárható") **nem volt igaz**. Most
 *   `false`. Ugyanez a hibaosztály, mint a Resendnél: a régió a tárolás
 *   helyét mondja meg, nem azt, ki férhet hozzá.
 * - **Stripe.** A szerződés szerint az EGT-s fiók szerződő fele a Stripe
 *   Payments Europe, Limited, és az adatot a **Stripe, LLC**-hez (USA)
 *   továbbítja — nem a „Stripe, Inc."-hez, ahogy eddig itt állt.
 *
 * Ahol a szerződés **nem ad meg** címet (Stripe, Google), ott a `szekhely`
 * továbbra is `null` — és a felület ezt ki is mondja, nem hallgat róla.
 */
export type Adatfeldolgozo = {
  /** A szolgáltatás neve, ahogy a felhasználó ismeri. */
  ki: string;
  /** A szerződő jogi személy, ha eltér a szolgáltatás nevétől. */
  jogiSzemely?: string;
  /** Székhely — `null`, ha nincs vállalható forrás rá. Kitalálni tilos. */
  szekhely: string | null;
  /** Mit végez nekünk. */
  mit: string;
  /** Milyen adathoz fér hozzá közben. */
  adatkor: string;
  /** Hol dolgozza fel. */
  hol: string;
  /** Kizárható-e az Unión kívüli hozzáférés. */
  unionBelul: boolean;
  /** Hol olvasható a szolgáltató adatvédelmi kötelezettségvállalása. */
  garanciaUrl: string;
  /**
   * Az Unión kívüli továbbítás alapja, **a szolgáltató adatfeldolgozási
   * szerződéséből kiolvasva** (a 2026-09-22-én mentett példányokból). `null`,
   * ha nincs Unión kívüli továbbítás.
   */
  tovabbitasAlapja: string | null;
};

export const adatfeldolgozok: readonly Adatfeldolgozo[] = [
  {
    ki: 'Supabase',
    jogiSzemely: 'Supabase Pte. Ltd (Szingapúr)',
    szekhely: '65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513, Szingapúr',
    mit: 'Adatbázis, fájltárolás, felhasználókezelés',
    adatkor: 'Minden tárolt adat: fiókadatok, bizonylatok és a belőlük kiolvasott mezők',
    hol:
      'Tárolás: Európai Unió (Frankfurt). A szerződő fél szingapúri, ezért az Unión ' +
      'kívüli hozzáférés nem zárható ki',
    unionBelul: false,
    garanciaUrl: 'https://supabase.com/legal/customer-resources/data-processing-addendum',
    tovabbitasAlapja: 'Általános szerződési feltételek (az Európai Bizottság 2021/914/EU határozata)',
  },
  {
    ki: 'Vercel',
    jogiSzemely: 'Vercel Inc.',
    szekhely: '440 N. Barranca Ave #4133, Covina, CA 91723, Amerikai Egyesült Államok',
    mit: 'A weboldal kiszolgálása',
    adatkor:
      'A kiszolgáláshoz a böngésző kérésének adatai (IP-cím, böngészőazonosító). ' +
      'Bizonylat nem megy át rajta',
    hol: 'Amerikai Egyesült Államok (a kiszolgálás európai élhálózatról)',
    unionBelul: false,
    garanciaUrl: 'https://vercel.com/legal/dpa',
    tovabbitasAlapja: 'Általános szerződési feltételek (2021/914/EU)',
  },
  {
    ki: 'OpenRouter',
    jogiSzemely: 'OpenRouter, Inc.',
    szekhely: '169 Madison Ave #2404, New York, NY 10016, Amerikai Egyesült Államok',
    mit: 'A kiolvasási kérés továbbítása a modellhez',
    adatkor: 'A bizonylat tartalma, valamint a saját cég neve és adószáma',
    hol: 'Amerikai Egyesült Államok',
    unionBelul: false,
    garanciaUrl: 'https://openrouter.ai/terms',
    tovabbitasAlapja: 'Általános szerződési feltételek (2021/914/EU, 2. modul)',
  },
  {
    ki: 'Google (al-adatfeldolgozó)',
    jogiSzemely: 'Google LLC – a Google AI Studio, illetve a Google Cloud Vertex AI végpontjai',
    szekhely: null,
    mit: 'A bizonylat gépi kiolvasása, az OpenRouter megbízásából',
    adatkor: 'A bizonylat tartalma, valamint a saját cég neve és adószáma',
    hol: 'Amerikai Egyesült Államok',
    unionBelul: false,
    // ⚠️ Itt **nem** a Google Cloud saját adatfeldolgozási mellékletére mutatunk,
    // mert azt nem mi fogadtuk el: a Szolgáltatónak nincs szerződése a
    // Google-lel. A lánc az OpenRouteren át vezet — ő veszi igénybe a Google
    // végpontjait al-adatfeldolgozóként —, tehát a ránk vonatkozó garancia is
    // az ő feltételeiből ered. Egy olyan szerződésre hivatkozni, aminek nem
    // vagyunk részesei, pontosan az a hibaosztály, amit ez a lista irt.
    garanciaUrl: 'https://openrouter.ai/terms',
    tovabbitasAlapja:
      'Az OpenRouter adatfeldolgozási szerződése, amely az al-adatfeldolgozóra ugyanazokat ' +
      'a kötelezettségeket telepíti',
  },
  {
    ki: 'Resend',
    jogiSzemely: 'Plus Five Five, Inc.',
    szekhely: '2261 Market Street #5039, San Francisco, CA 94114, Amerikai Egyesült Államok',
    mit: 'A cég beküldő címére érkező levelek fogadása és a rendszer leveleinek kiküldése',
    adatkor:
      'A levelek feladója, tárgya, TELJES SZÖVEGE és melléklete; a kimenő levelek ' +
      'címzettje és tartalma. Abból, hogy a Szolgáltató a levél szövegét nem tárolja, ' +
      'nem következik, hogy a levélküldő sem kezeli',
    // A fogadás és a küldés útvonala EU-régióban (Írország) fut, a szolgáltató
    // saját leírása szerint viszont az üzenettartalmat és a naplókat az
    // Egyesült Államokban tárolja. A régióválasztás az útvonalat szabályozza,
    // nem a tárolás helyét — a tájékoztatóban a gyengébb állítás a helyes.
    hol: 'Az útvonal: Európai Unió (Írország). A tárolás és a naplózás: Amerikai Egyesült Államok',
    unionBelul: false,
    garanciaUrl: 'https://resend.com/legal/dpa',
    tovabbitasAlapja:
      'EU–USA adatvédelmi keret (a szolgáltató tanúsítvánnyal rendelkezik), mellette ' +
      'általános szerződési feltételek (2021/914/EU)',
  },
  {
    ki: 'Stripe',
    jogiSzemely:
      'Stripe Payments Europe, Limited (Írország) – a szerződő fél; az adatot a Stripe, LLC ' +
      '(Amerikai Egyesült Államok) részére továbbítja',
    szekhely: null,
    mit: 'Bankkártyás fizetés, előfizetés-kezelés',
    adatkor:
      'A fizető neve, számlázási címe és bankkártyaadatai. A TELJES KÁRTYAADATOT a ' +
      'Szolgáltató nem látja és nem tárolja; a nevet és a számlázási címet viszont ' +
      'igen – abból állítja ki a magyar számlát',
    hol: 'Írország / Amerikai Egyesült Államok',
    unionBelul: false,
    garanciaUrl: 'https://stripe.com/legal/dpa',
    tovabbitasAlapja:
      'A Stripe adattovábbítási melléklete (Data Transfers Addendum): EU–USA adatvédelmi ' +
      'keret, illetve általános szerződési feltételek (2021/914/EU)',
  },
  {
    ki: 'Billingo',
    jogiSzemely: 'Billingo Technologies Zrt. (cégjegyzékszám: 01-10-140802)',
    szekhely: '1133 Budapest, Árbóc utca 6., Magyarország',
    mit: 'Az előfizetési díjról kiállított számla elkészítése és megőrzése',
    adatkor: 'Az Előfizető számlázási adatai és a számla tételei',
    hol: 'Európai Unió (Magyarország)',
    unionBelul: true,
    garanciaUrl: 'https://www.billingo.hu/adatkezelesi-tajekoztato',
    tovabbitasAlapja: null,
  },
];

/**
 * Amit a tájékoztató a hiányzó székhely helyére ír. Nem üres hely: a „név
 * szerint, székhellyel" ígéret mellett a néma hiány elírásnak látszana.
 */
export const NINCS_SZEKHELY =
  'A székhelyet a szolgáltató adatfeldolgozási szerződése nem tartalmazza; a ' +
  'kapcsolattartás az adatvédelmi feltételeiben megadott címen történik.';

/** Hány közreműködőnél van Unión kívüli feldolgozás — a szöveg ezt a számot mondja. */
export const unionKivuliDarab = adatfeldolgozok.filter((a) => !a.unionBelul).length;
