/**
 * A Meta- és a Google-hirdetések **összes** szövege, egy helyen.
 *
 * # Miért kód, és miért nem egy táblázat
 *
 * Egy hirdetés, ami többet ígér a céloldalnál, ugyanaz a hibaosztály, mint egy
 * valótlan jogi mondat, csak fizetett terjesztéssel. Ezért:
 *
 * - az árak és a próba számai a `config/szamlafolyo.ts`-ből jönnek, nem kézzel
 *   beírva;
 * - a karakterkorlátokat a `hirdetes.test.ts` **méri**, nem becsüli;
 * - a tiltott ígéreteket (lásd `TILTOTT`) ugyanaz a teszt keresi minden
 *   szövegben;
 * - a képek (`keszit.ts`), a szöveges áttekintés (`SZOVEGEK.md`) és a Google
 *   Ads Editor CSV-k **ebből** készülnek, így nem csúszhatnak el egymástól.
 *
 * A megfogalmazás a 2026-10-09-i nyitólapot és a Könyvelőknek oldalt követi:
 * „Ne gépeld be a számlákat", „Excel-táblázat a könyvelődnek", „ügyfelenkénti
 * importfájl", „a jóváhagyás nálad marad", „Adattárolás az EU-ban", „áfa"
 * kisbetűvel. A „könyvelésre kész" és a „percek alatt" szándékosan hiányzik:
 * az előbbit az ÁSZF 3. pontja 2026-09-25 óta nem mondja, az utóbbit nem
 * mértük.
 *
 * # A nyitólap szerkezete a hirdetésben is (2026-10-09)
 *
 * Elöl a haszon és a bizalom, a fenntartás („alapbeállítás szerint", „nem
 * szűr ki minden hibát") a hosszú szöveg végére kerül – ott is ott van, csak
 * nem a lelkesedés helyén. A címsor és a kép nem ígér feltétel nélküli emberi
 * jóváhagyást („Minden bizonylatot te hagysz jóvá" 2026-10-09-ig a képen
 * állt): a gépi jóváhagyás létező, bekapcsolható funkció.
 */
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szolgaltato } from '../../src/oldalak/jogi/adatok.ts';

/** Forintösszeg sima szóközös ezres tagolással („4 900 Ft"). */
export function ft(osszeg: number): string {
  return `${String(osszeg).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Ft`;
}

const { proba } = szamlafolyo;
const { kicsi, kozepes, nagy } = szamlafolyo.csomagok;
const alapar = ft(kicsi.arHavi);

/**
 * A nyitólap „Ki csinálja?" szakaszának két adata, szó szerint. A név az
 * Impresszumból jön (jogi forma nélkül), a tapasztalat a tulajdonos saját
 * közlése – a `hirdetes.test.ts` méri, hogy a nyitólap ma is ugyanezt mondja.
 */
export const TULAJDONOS = szolgaltato.nev.replace(/ egyéni vállalkozó$/, '');
export const TAPASZTALAT = '10 év rendszergazdai és IT-biztonsági tapasztalattal';

/** A céloldal. A horgonyokat az `App.tsx` `horgonyraUgrik()`-ja görgeti oda. */
export const WEBOLDAL = 'https://szamlafolyo.hu';

/*
 * Karakterkorlátok. A Google-éi kemények (a felület nem engedi túllépni), a
 * Metáé a látható hossz: a fő szöveget kb. 125 karakter után „Továbbiak" mögé
 * teszi, a címsor és a leírás mobilon ennyi fölött csonkul.
 */
export const KORLAT = {
  meta: { elsodlegesLatszik: 125, cimsor: 40, leiras: 30 },
  google: {
    cimsor: 30,
    leiras: 90,
    rovidLeiras: 60,
    hosszuCimsor: 90,
    utvonal: 15,
    webhelylink: 25,
    webhelylinkLeiras: 35,
    kiemeles: 25,
    reszletErtek: 25,
    cegnev: 25,
  },
} as const;

/* =========================================================================
 * Meta (Facebook, Instagram)
 * ====================================================================== */

export type Vizual = 'beerkezo' | 'kartya' | 'programok' | 'email' | 'xml' | 'szamok' | 'bizalom';

export type MetaUzenet = {
  /** Fájlnév-előtag és hirdetésazonosító. */
  id: string;
  /** Kinek szól elsősorban – a célzáshoz, nem a hirdetésbe. */
  kinek: string;
  celoldal: '/' | '/konyveloknek';
  gomb: 'További információ' | 'Regisztráció';
  kep: {
    jelveny: string;
    /** A kép címe soronként; a `kiemelt` indexű sor terrakotta. */
    cim: readonly string[];
    kiemelt: number;
    alcim: string;
    vizual: Vizual;
  };
  cimsorok: readonly string[];
  leirasok: readonly string[];
  /** Önmagában megálló, a „Továbbiak" előtt is teljes változat. */
  elsodlegesRovid: string;
  elsodlegesHosszu: string;
};

export const META: readonly MetaUzenet[] = [
  {
    id: '1-gepeles',
    kinek: 'Széles: vállalkozók és könyvelők együtt – a nyitólap fő üzenete',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'Vállalkozóknak és könyvelőknek',
      cim: ['Ne gépeld be', 'a számlákat.', 'Töltsd fel őket.'],
      kiemelt: 2,
      alcim: 'Fotó, PDF vagy e-számla: a SzámlaFolyó kiolvassa, megjelöli, amit érdemes megnézned, te jóváhagyod, és viszed tovább.',
      vizual: 'beerkezo',
    },
    cimsorok: ['Ne gépeld be a számlákat', 'Töltsd fel, és viszed tovább', 'Excel-táblázat a könyvelődnek'],
    leirasok: [`${proba.napok} nap ingyenes próba`, 'Bankkártya nélkül'],
    elsodlegesRovid:
      'Ne gépeld be a számlákat. Töltsd fel vagy továbbítsd őket e-mailben: a SzámlaFolyó kiolvassa, te jóváhagyod.',
    elsodlegesHosszu: [
      'A számlák adatait valakinek be kell gépelnie. Vagy mégsem?',
      'Fotó, PDF vagy e-számla: töltsd fel, vagy továbbítsd e-mailben. A SzámlaFolyó kiolvassa az adatokat, és megjelöli, amit érdemes megnézned. Te jóváhagyod, és viszed tovább:',
      '• Vállalkozóként: Excel-táblázat (XLSX) a könyvelődnek.\n• Könyvelőként: ügyfelenkénti importfájl – RLB Kettős, Novitax NTAX vagy Kulcs-Könyvelés.',
      `Adattárolás az EU-ban. A SzámlaFolyót ${TULAJDONOS} fejleszti, ${TAPASZTALAT}.`,
      `${proba.napok} napos ingyenes próba, ${proba.dokumentumok} dokumentum, bankkártya nélkül. → szamlafolyo.hu`,
    ].join('\n\n'),
  },
  {
    id: '2-jovahagyas',
    kinek: 'Aki nem bízza a gépre: könyvelők, óvatos vállalkozók',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'A jóváhagyás nálad marad',
      cim: ['A gép kiolvas.', 'Te jóváhagyod.'],
      kiemelt: 1,
      alcim: 'A rendszer megjelöli a bizonytalan adatokat és az eltéréseket, így rögtön látod, mire érdemes figyelned.',
      vizual: 'kartya',
    },
    cimsorok: ['A gép kiolvas, te jóváhagyod', 'A jóváhagyás nálad marad', 'Megjelöljük, amit érdemes átnézni'],
    leirasok: ['A jóváhagyás nálad marad', `${proba.napok} nap ingyenes próba`],
    elsodlegesRovid:
      'A SzámlaFolyó kiolvassa a számlákat, és megjelöli a bizonytalan adatokat és az eltéréseket. A jóváhagyás nálad marad.',
    elsodlegesHosszu: [
      '„És mi van, ha rosszul olvassa ki?"',
      'Jogos kérdés. A SzámlaFolyó ezért megjelöli a bizonytalan adatokat és az észlelt eltéréseket, a kézzel írt bizonylatokat pedig külön jelzi, így rögtön látod, hol érdemes alaposabban átnézned.',
      'Ha kell, javítasz, aztán jóváhagyod. Az exportba a jóváhagyott bizonylatok kerülnek.',
      'Jó tudni: alapbeállítás szerint minden bizonylat a te jóváhagyásodra vár. Az automatikus jóváhagyás külön bekapcsolható, de alapból ki van kapcsolva.',
      `${proba.napok} napos ingyenes próba, bankkártya nélkül. → szamlafolyo.hu`,
    ].join('\n\n'),
  },
  {
    id: '3-ellenorzes',
    kinek: 'Akit a pontosság érdekel: könyvelők, pénzügyesek',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'Ellenőrzés számítással',
      cim: ['Nettó + áfa = bruttó?', 'Ezt kiszámoljuk.'],
      kiemelt: 1,
      alcim: 'Az adószám ellenőrző számjegyét és az áfabontás sorait is vizsgáljuk. Ha eltérést találunk, jelezzük.',
      vizual: 'kartya',
    },
    cimsorok: ['Nettó + áfa = bruttó? Kiszámoljuk.', 'Ellenőrizzük az adószámot', 'Jelezzük az összegek eltérését'],
    leirasok: ['Ellenőrzés számítással', 'A jóváhagyás nálad marad'],
    elsodlegesRovid:
      'A magyar adószám ellenőrző számjegyét és a nettó, áfa, bruttó összefüggését számítással vizsgáljuk. Ha nem stimmel, jelezzük.',
    elsodlegesHosszu: [
      'A kiolvasás csak az első lépés.',
      'A SzámlaFolyó a kiolvasott adatokat külön szabályok alapján is ellenőrzi:',
      '• a magyar adószám ellenőrző számjegyét számítással vizsgálja,\n• összeveti a nettó, az áfa- és a bruttó összegeket,\n• ellenőrzi az áfabontás sorait: ha nem adják ki a végösszeget, figyelmeztet.',
      'Jó tudni: az ellenőrzések segítik az átnézést, de nem szűrnek ki minden hibát. A neveket és más szöveges adatokat érdemes összevetni az eredetivel.',
      `Próbáld ki a saját bizonylataiddal: ${proba.napok} nap, ${proba.dokumentumok} dokumentum, bankkártya nélkül. → szamlafolyo.hu`,
    ].join('\n\n'),
  },
  {
    id: '4-konyvelo',
    kinek: 'Könyvelők, könyvelőirodák',
    celoldal: '/konyveloknek',
    gomb: 'További információ',
    kep: {
      jelveny: 'Könyvelőirodáknak',
      cim: ['Ügyfelenkénti export', 'RLB, Novitax és Kulcs', 'számára.'],
      kiemelt: 1,
      alcim: 'RLB Kettős, Novitax NTAX és Kulcs-Könyvelés importfájl, vagy Excel (XLSX), CSV és JSON.',
      vizual: 'programok',
    },
    cimsorok: ['Ügyfelenkénti export könyvelőknek', 'Export RLB, Novitax és Kulcs számára', 'Kevesebb kézi rögzítés az irodában'],
    leirasok: ['RLB, Novitax, Kulcs export', `${proba.felhasznalok} felhasználó a próbában`],
    elsodlegesRovid:
      'Külföldi számlák, nyugták, fotózott blokkok: kiolvassuk, te jóváhagyod, ügyfelenként exportálod RLB, Novitax vagy Kulcs felé.',
    elsodlegesHosszu: [
      'A NAV-ból átvett számlaadatok sok munkát megtakarítanak. A külföldi számlák, nyugták és fotózott bizonylatok feldolgozása viszont továbbra is feladat.',
      'A SzámlaFolyó kiolvassa a beküldött bizonylatok adatait, megjelöli az ellenőrzést igénylő mezőket, és ügyfelenként exportálhatóvá teszi a jóváhagyott tételeket.',
      'Export az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára, valamint Excel (XLSX), CSV és JSON formátumban. Az eredeti bizonylatokat ZIP-ben is letöltheted.',
      'Az iroda közös munkaterületén dolgozhattok, az ügyfelek pedig e-mailben is beküldhetik a bizonylataikat, ha engedélyezed.',
      `Adattárolás az EU-ban. A SzámlaFolyót ${TULAJDONOS} fejleszti, ${TAPASZTALAT}.`,
      `${proba.napok} nap, ${proba.dokumentumok} dokumentum, ${proba.felhasznalok} felhasználó, bankkártya nélkül. → szamlafolyo.hu/konyveloknek`,
    ].join('\n\n'),
  },
  {
    id: '5-email',
    kinek: 'Akihez a számlák e-mailben érkeznek: vállalkozók',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'Beküldés e-mailben',
      cim: ['E-mailben kaptad', 'a számlát?', 'Továbbítsd.'],
      kiemelt: 2,
      alcim: 'Bekapcsolás után a munkaterületed saját beküldési címet kap. A továbbított számla a Beérkezőbe kerül.',
      vizual: 'email',
    },
    cimsorok: ['E-mailben jött a számla? Továbbítsd.', 'Saját beküldési cím a cégednek', 'Továbbítod, és már olvassuk is'],
    leirasok: ['Beküldés e-mailben is', `${proba.napok} nap ingyenes próba`],
    elsodlegesRovid:
      'A céged saját beküldési címet kaphat. Továbbítsd rá a számlát, és a melléklet a Beérkezőbe kerül. Ott átnézed és jóváhagyod.',
    elsodlegesHosszu: [
      'A legtöbb számla ma e-mailben érkezik. Letölteni, átnevezni, feltölteni: ezt kihagyhatod.',
      'A SzámlaFolyóban a céges munkaterülethez saját beküldési e-mail-cím kapcsolható. Továbbítsd rá a számlát, a melléklet a Beérkezőbe kerül, és a rendszer kiolvassa az adatokat. Te átnézed és jóváhagyod.',
      'A beküldés alapból ki van kapcsolva; a munkaterület tulajdonosa kapcsolja be, és a cím bármikor lecserélhető.',
      `${proba.napok} napos ingyenes próba, bankkártya nélkül. → szamlafolyo.hu`,
    ].join('\n\n'),
  },
  {
    id: '6-eszamla',
    kinek: 'E-számlát kapó cégek, könyvelők',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'E-számla XML',
      cim: ['Az e-számla adatait', 'közvetlenül átvesszük.'],
      kiemelt: 1,
      alcim: 'UBL, Factur-X, ZUGFeRD és a támogatott magyar XML-formátumok: képfelismerés nélkül.',
      vizual: 'xml',
    },
    cimsorok: ['E-számla XML közvetlen átvétel', 'UBL, Factur-X, ZUGFeRD', 'Az e-számlát nem kell kitalálni'],
    leirasok: ['Képfelismerés nélkül', `${proba.napok} nap ingyenes próba`],
    elsodlegesRovid:
      'Az e-számlában már benne van minden adat. A támogatott XML-formátumokból közvetlenül átvesszük őket, képfelismerés nélkül.',
    elsodlegesHosszu: [
      'Egyre több szállító küld e-számlát. Ebben az adat strukturáltan benne van: a szállító rendszere írta ki.',
      'A támogatott XML-formátumokból a SzámlaFolyó közvetlenül olvassa ki az adatokat, képfelismerés nélkül. Ide tartozik az UBL, a CII – köztük a Factur-X és a ZUGFeRD –, valamint a támogatott magyar XML-formátumok.',
      'A fotózott és szkennelt bizonylatok adatait mesterséges intelligencia ismeri fel, és a két út egy exportban találkozik. Az XML-fájlok feldolgozása is beleszámít a dokumentumkeretbe.',
      `${proba.napok} napos ingyenes próba → szamlafolyo.hu`,
    ].join('\n\n'),
  },
  {
    id: '7-proba',
    kinek: 'Az ajánlat maga – újracélzásra is',
    celoldal: '/',
    gomb: 'Regisztráció',
    kep: {
      jelveny: 'Ingyenes próba',
      cim: [`${proba.napok} nap.`, `${proba.dokumentumok} dokumentum.`, 'Bankkártya nélkül.'],
      kiemelt: 2,
      alcim: 'Próbáld ki a saját bizonylataiddal, akár a munkatársaiddal együtt.',
      vizual: 'szamok',
    },
    cimsorok: [`${proba.napok} nap, ${proba.dokumentumok} dokumentum, bankkártya nélkül`, 'Próbáld ki a saját számláiddal', `Havi ${alapar}-tól`],
    leirasok: ['Bankkártya nem kell', `Havi ${alapar}-tól`],
    elsodlegesRovid: `${proba.napok} nap, ${proba.dokumentumok} dokumentum, ${proba.felhasznalok} felhasználó, bankkártya nélkül. A saját bizonylataiddal próbálod ki, nem bemutató adatokon.`,
    elsodlegesHosszu: [
      `A SzámlaFolyót a saját bizonylataiddal próbálhatod ki: ${proba.napok} napig, ${proba.dokumentumok} dokumentumig, legfeljebb ${proba.felhasznalok} felhasználóval, bankkártya megadása nélkül. A próba alatt minden funkció elérhető.`,
      `Utána havi ${alapar}-tól: ${kicsi.nev} ${kicsi.dokumentumok}, ${kozepes.nev} ${kozepes.dokumentumok}, ${nagy.nev} ${nagy.dokumentumok} dokumentum havonta. A feltüntetett árak a fizetendő végösszegek: a szolgáltató alanyi adómentes, az árakra nem kerül további áfa.`,
      'Az adatokat Excel-táblázatként (XLSX), CSV-ben, JSON-ban vagy importfájlként a könyvelőprogramba (RLB Kettős, Novitax NTAX, Kulcs-Könyvelés) viszed tovább, az eredeti bizonylatokat ZIP-ben.',
      '→ szamlafolyo.hu',
    ].join('\n\n'),
  },
  {
    id: '8-bizalom',
    kinek: 'Mindkét közönség: aki ismeretlen szolgáltatónak nem adna bizonylatot',
    celoldal: '/',
    gomb: 'További információ',
    kep: {
      jelveny: 'Ki csinálja?',
      cim: ['Tudod,', 'kinek', 'adod oda a számláidat.'],
      kiemelt: 1,
      alcim: `A SzámlaFolyót ${TULAJDONOS} fejleszti és üzemelteti, ${TAPASZTALAT}.`,
      vizual: 'bizalom',
    },
    cimsorok: ['Tudod, kinek adod a számláidat', 'Adattárolás az EU-ban', 'Név szerint vállalt szolgáltatás'],
    leirasok: ['Adattárolás az EU-ban', `${proba.napok} nap ingyenes próba`],
    elsodlegesRovid: `Pénzügyi bizonylatot csak olyanra érdemes bízni, akit ismersz. A SzámlaFolyót ${TULAJDONOS} fejleszti.`,
    elsodlegesHosszu: [
      'Pénzügyi bizonylatot csak olyan szolgáltatásra érdemes bízni, amelyről tudod, ki üzemelteti, és hogyan bánik az adatokkal.',
      `A SzámlaFolyót ${TULAJDONOS} fejleszti és üzemelteti, ${TAPASZTALAT}.`,
      '• Az adatbázist és a bizonylatfájlokat Frankfurtban, az Európai Unióban tároljuk.\n• Minden cég adatai adatbázisszinten el vannak különítve.\n• A feltöltött bizonylatokat mesterséges intelligencia tanítására nem használjuk.\n• Bankkártyaadatot nem látunk: a fizetést a Stripe kezeli.',
      'Jó tudni: a kiolvasás Unión kívüli adatfeldolgozással jár. A részleteket az adatkezelési tájékoztató írja le.',
      `${proba.napok} napos ingyenes próba, bankkártya nélkül. → szamlafolyo.hu`,
    ].join('\n\n'),
  },
];

/* =========================================================================
 * Google Keresés – reszponzív keresési hirdetések
 * ====================================================================== */

export type KulcsszoEgyezes = 'pontos' | 'kifejezés' | 'általános';
export type Kulcsszo = { szo: string; egyezes: KulcsszoEgyezes };

export type GoogleHirdetescsoport = {
  kampany: string;
  csoport: string;
  celoldal: string;
  utvonal: readonly [string, string];
  /** 15 címsor – a Google ebből keveri a legjobbat. */
  cimsorok: readonly string[];
  /** 4 leírás. */
  leirasok: readonly string[];
  kulcsszavak: readonly Kulcsszo[];
};

export const GOOGLE_KERESES: readonly GoogleHirdetescsoport[] = [
  {
    kampany: 'SF Keresés – Vállalkozások',
    csoport: 'Számlafeldolgozás',
    celoldal: `${WEBOLDAL}/`,
    utvonal: ['szamlak', 'feldolgozas'],
    cimsorok: [
      'SzámlaFolyó számlafeldolgozás',
      'Számlák kiolvasása online',
      'Ne gépeld be a számlákat',
      'Számlák, nyugták egy helyen',
      'Továbbítsd a számlát e-mailben',
      'A jóváhagyás nálad marad',
      'Adószám és áfa ellenőrzése',
      'E-számla XML közvetlen átvétel',
      'Excel-táblázat a könyvelődnek',
      `${proba.napok} nap ingyenes próba`,
      'Bankkártya nélkül kipróbálható',
      `Havi ${alapar}-tól`,
      'Adattárolás az EU-ban',
      'Vállalkozóknak és könyvelőknek',
      'Külföldi számlák is',
    ],
    leirasok: [
      'Töltsd fel vagy továbbítsd a számlát: kiolvassuk az adatait, te átnézed és jóváhagyod.',
      'Jelezzük az adószám hibáját és az összegek eltérését. A jóváhagyás nálad marad.',
      'Excel-táblázat a könyvelődnek, vagy importfájl RLB, Novitax és Kulcs számára.',
      `${proba.napok} nap ingyenes próba, ${proba.dokumentumok} dokumentum, bankkártya nélkül. Havi ${alapar}-tól.`,
    ],
    kulcsszavak: [
      { szo: 'számlafeldolgozás', egyezes: 'pontos' },
      { szo: 'számla feldolgozás', egyezes: 'pontos' },
      { szo: 'számla kiolvasás', egyezes: 'pontos' },
      { szo: 'számla ocr', egyezes: 'pontos' },
      { szo: 'bizonylat feldolgozás', egyezes: 'pontos' },
      { szo: 'nyugta feldolgozás', egyezes: 'pontos' },
      { szo: 'e-számla xml feldolgozás', egyezes: 'pontos' },
      { szo: 'számla feldolgozó program', egyezes: 'kifejezés' },
      { szo: 'számla adatrögzítés', egyezes: 'kifejezés' },
      { szo: 'számla beolvasás', egyezes: 'kifejezés' },
      { szo: 'bizonylat digitalizálás', egyezes: 'kifejezés' },
      { szo: 'számlák excelbe', egyezes: 'kifejezés' },
      { szo: 'számla adatok kinyerése', egyezes: 'kifejezés' },
    ],
  },
  {
    kampany: 'SF Keresés – Könyvelők',
    csoport: 'Könyvelőirodák',
    celoldal: `${WEBOLDAL}/konyveloknek`,
    utvonal: ['konyveloknek', 'export'],
    cimsorok: [
      'Számlafeldolgozás könyvelőknek',
      'Ügyfelenkénti export',
      'RLB Kettős export',
      'Novitax NTAX export',
      'Kulcs-Könyvelés export',
      'Kevesebb kézi rögzítés',
      'Külföldi számlák, nyugták',
      'Beküldés e-mailben is',
      'Adószám és áfa ellenőrzése',
      'Közös irodai munkaterület',
      'Költségkalkulátor irodáknak',
      `${proba.felhasznalok} felhasználó a próba alatt`,
      `${proba.napok} nap ingyenes próba`,
      'Bankkártya nélkül kipróbálható',
      'Adattárolás az EU-ban',
    ],
    leirasok: [
      'Kiolvassuk a bizonylatokat, jelezzük az eltéréseket, és ügyfelenként exportálhatsz.',
      'Export RLB Kettős, Novitax NTAX és Kulcs-Könyvelés számára, valamint Excel, CSV, JSON.',
      'Külföldi számlák, nyugták, fotózott blokkok: a NAV-adatok mellett ezeket is kezeli.',
      `${proba.napok} nap, ${proba.dokumentumok} dokumentum, ${proba.felhasznalok} felhasználó, bankkártya nélkül. Számold ki az irodád díját.`,
    ],
    kulcsszavak: [
      { szo: 'könyvelő szoftver', egyezes: 'kifejezés' },
      { szo: 'könyvelőiroda szoftver', egyezes: 'kifejezés' },
      { szo: 'könyvelés automatizálás', egyezes: 'kifejezés' },
      { szo: 'bizonylat rögzítés', egyezes: 'kifejezés' },
      { szo: 'számla feldolgozás könyvelőknek', egyezes: 'kifejezés' },
      { szo: 'rlb kettős import', egyezes: 'kifejezés' },
      { szo: 'novitax import', egyezes: 'kifejezés' },
      { szo: 'kulcs könyvelés import', egyezes: 'kifejezés' },
      { szo: 'külföldi számla rögzítés', egyezes: 'kifejezés' },
      { szo: 'nyugta rögzítés könyvelés', egyezes: 'kifejezés' },
    ],
  },
];

/**
 * Kizáró kulcsszavak, mindkét kampányra (kifejezés-egyezéssel). A SzámlaFolyó
 * **nem** számlázó program: aki számlát kiállítani akar, annak a kattintása
 * pénz, érdeklődés nélkül.
 */
export const GOOGLE_KIZARO: readonly string[] = [
  'számlázó',
  'számlázó program',
  'számla kiállítás',
  'számla készítés',
  'számla minta',
  'számla sablon',
  'számlázz',
  'billingo',
  'nav online számla belépés',
  'ügyfélkapu',
  'adóbevallás',
  'szja bevallás',
  'állás',
  'tanfolyam',
  'képzés',
  'okj',
  'crack',
  'torrent',
];

/** Webhelylinkek: szöveg, cél, két leírássor. */
export const GOOGLE_WEBHELYLINKEK: readonly { szoveg: string; cel: string; sor1: string; sor2: string }[] = [
  { szoveg: 'Hogyan működik?', cel: `${WEBOLDAL}/#folyamat`, sor1: 'Feltöltéstől az exportig', sor2: 'Négy lépésben, ellenőrzéssel' },
  { szoveg: 'Árak és csomagok', cel: `${WEBOLDAL}/#arak`, sor1: `Havi ${alapar}-tól`, sor2: `${proba.napok} nap ingyenes próba` },
  { szoveg: 'Könyvelőknek', cel: `${WEBOLDAL}/konyveloknek`, sor1: 'Ügyfelenkénti export', sor2: 'RLB, Novitax, Kulcs' },
  { szoveg: 'Költségkalkulátor', cel: `${WEBOLDAL}/konyveloknek#kalkulator`, sor1: 'Az irodád várható havi díja', sor2: 'Három csomag összevetve' },
  { szoveg: 'Használati útmutató', cel: `${WEBOLDAL}/utmutato`, sor1: 'Lépésről lépésre', sor2: 'Menüpontok és gombok' },
  { szoveg: 'Regisztráció', cel: `${WEBOLDAL}/regisztracio`, sor1: `${proba.napok} nap, ${proba.dokumentumok} dokumentum`, sor2: 'Bankkártya nélkül' },
];

export const GOOGLE_KIEMELESEK: readonly string[] = [
  `${proba.napok} nap ingyenes próba`,
  'Bankkártya nélkül',
  'Adattárolás az EU-ban',
  'Az árak végösszegek',
  'Emberi jóváhagyás',
  'E-számla XML átvétel',
  'Könyvelőprogram-export',
  `Havi ${alapar}-tól`,
];

/** Kiegészítő részletek („Szolgáltatások" fejléccel). */
export const GOOGLE_RESZLETEK = {
  fejlec: 'Szolgáltatások',
  ertekek: [
    'Számlák kiolvasása',
    'Nyugták feldolgozása',
    'E-számla XML átvétel',
    'Adószám-ellenőrzés',
    'Ügyfelenkénti export',
    'Excel, CSV, JSON export',
  ],
} as const;

/* =========================================================================
 * Google Performance Max / reszponzív display – egy eszközcsoport
 * ====================================================================== */

export const GOOGLE_PMAX = {
  cegnev: 'SzámlaFolyó',
  celoldal: `${WEBOLDAL}/`,
  cimsorok: [
    'Ne gépeld be a számlákat',
    'Excel-táblázat a könyvelődnek',
    'A jóváhagyás nálad marad',
    `${proba.napok} nap ingyenes próba`,
    'Export RLB, Novitax, Kulcs',
  ],
  hosszuCimsorok: [
    'Ne gépeld be a számlákat. Töltsd fel őket, és viszed tovább.',
    'Fotó, PDF vagy e-számla: a SzámlaFolyó kiolvassa, te jóváhagyod',
    'Ügyfelenkénti export RLB Kettős, Novitax NTAX és Kulcs-Könyvelés számára',
  ],
  /** Az első a „rövid leírás" (legfeljebb 60 karakter). */
  leirasok: [
    `Számlák, nyugták, e-számla XML egy helyen. ${proba.napok} nap ingyen.`,
    'Kiolvassuk a számlák adatait, jelezzük az eltéréseket, a jóváhagyás nálad marad.',
    'Excel-táblázat a könyvelődnek, vagy importfájl RLB, Novitax és Kulcs számára.',
    `${proba.napok} nap, ${proba.dokumentumok} dokumentum, bankkártya nélkül. Utána havi ${alapar}-tól.`,
  ],
  gomb: 'Regisztráció',
} as const;

/** A Google-képekhez választott üzenetek (a Meta-üzenetek azonosítói). */
export const GOOGLE_KEP_UZENETEK: readonly string[] = ['1-gepeles', '2-jovahagyas', '4-konyvelo', '6-eszamla', '7-proba', '8-bizalom'];

/* =========================================================================
 * Tiltott ígéretek
 * ====================================================================== */

/**
 * Amit a termék ma nem ígérhet. Mindegyik mögött egy mondat áll, amit a
 * felület vagy a jogi szöveg cáfolna – és mindkét platformon „megtévesztő
 * állítás" elutasítási ok.
 */
export const TILTOTT: readonly { minta: RegExp; miert: string }[] = [
  { minta: /teljesen automatikus|nem kell hozzányúl/i, miert: 'Alapból minden bizonylat emberi jóváhagyásra vár.' },
  { minta: /hibátlan|100\s?%|garant/i, miert: 'A nevekre nincs és nem lehet számítással ellenőrzés.' },
  { minta: /magyar szerver|magyarországi szerver/i, miert: 'Az adat Frankfurtban (EU) van.' },
  { minta: /könyvel helyetted|elkészíti a bevallás|bevallást készít/i, miert: 'A termék adatot ad ki, nem könyvel.' },
  { minta: /adatszolgáltatás/i, miert: 'NAV-adatszolgáltatási funkció nincs.' },
  { minta: /könyvelésre kész/i, miert: 'Az ÁSZF 3. pontja szerint ellenőrzésre előkészített adat.' },
  { minta: /percek alatt|másodperc/i, miert: 'Nem mértük; a kiolvasás ideje a fájltól függ.' },
  // „Ingyen" csak a próbára: „14 nap ingyen", „ingyenes próba". Minden más
  // alak (pl. „ingyenes e-számla") azt sugallná, hogy valami ingyen van.
  { minta: /(?<!napo?s? )ingyen(?!es prób)/i, miert: '„Ingyen" csak a próbára mondható.' },
  { minta: /—/, miert: 'A felületen nagykötőjel (–) áll, nem hosszú gondolatjel.' },
  // 2026-10-09-ig a `2-jovahagyas` képén és címsorában állt. A gépi jóváhagyás
  // létező, bekapcsolható funkció – a mondat csak „alapbeállítás szerint" igaz
  // (ugyanaz a szabály, mint a nyitólapon: `jogiSzovegek.test.ts`, 9. pont).
  // 2026-10-09: a nyitólap óta „Excel (XLSX)", a puszta formátumnév egy
  // vállalkozónak semmit nem mond. Zárójelben (Excel mellett) maradhat.
  { minta: /(?<!\()XLSX/, miert: 'Puszta „XLSX" helyett „Excel (XLSX)", ahogy a nyitólapon.' },
  { minta: /minden bizonylatot\s+te hagy/i, miert: 'A gépi jóváhagyás bekapcsolható: csak „alapbeállítás szerint" igaz.' },
];
