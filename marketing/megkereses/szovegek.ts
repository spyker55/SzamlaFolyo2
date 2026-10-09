/**
 * Személyes megkeresés: üzenetek könyvelőirodáknak és Facebook-bejegyzések.
 *
 * # Nem kampány, hanem sablon
 *
 * Ezeket a tulajdonos küldi ki, **egyenként, a saját nevében**. Tömeges
 * kiküldésre nem valók: reklám-e-mailt természetes személynek (és az egyéni
 * vállalkozó az) csak előzetes hozzájárulással lehet küldeni. A részletek az
 * `OLVASS-EL.md`-ben vannak.
 *
 * Valós címzett nincs a repóban. A személyre szabott részek helyén zárt
 * listából való helyőrző áll (lásd `HELYORZOK`), és az őr minden más
 * szögletes zárójeles szöveget kifogásol.
 *
 * # Ugyanaz a mérce, mint a hirdetéseknél
 *
 * - az árak és a próba számai a `config/szamlafolyo.ts`-ből jönnek;
 * - a hirdetéscsomag `TILTOTT` ígéretei itt sem szerepelhetnek;
 * - a fordulatok a jóváhagyott nyitólapot, a Könyvelőknek oldalt és a
 *   `marketing/hirdetes/szovegek.ts` szövegét követik.
 *
 * 2026-10-09 óta a nyitólap átírása szerint is: „Excel (XLSX)" a puszta
 * „XLSX" helyett, a bemutatkozásban a tulajdonos háttere és az EU-s tárolás
 * (a `TAPASZTALAT` a hirdetéscsomagból, amit az ottani őr a nyitólappal
 * vet össze), a jóváhagyás pedig előnyként áll elöl („nálad marad"), a
 * pontos „alapbeállítás szerint" alakkal.
 *
 * A könyvelőknek szóló üzenetek **magázók**, mert ismeretlen irodának
 * szólnak. A Facebook-bejegyzések **tegezők**, ahogy a csoportokban szokás és
 * ahogy a weboldal is beszél.
 */
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szolgaltato } from '@/oldalak/jogi/adatok.ts';
import { ft, TAPASZTALAT } from '../hirdetes/szovegek.ts';

const { proba } = szamlafolyo;
const { kicsi, kozepes, nagy } = szamlafolyo.csomagok;

/** A személyre szabandó részek zárt listája. */
export const HELYORZOK = ['[Név]', '[Személyes mondat]'] as const;

/*
 * Karakterkorlátok.
 *
 * A LinkedIn kapcsolatkérési jegyzete ingyenes fióknál 200, prémiumnál 300
 * karakter, és UTF-16 egységben számol (webes forrás, 2026-09). A szigorúbbra
 * írunk. A `[Név]` helyére a mérésnél `nevHelye` karaktert számolunk.
 *
 * Az e-mail tárgya nem kemény korlát: kb. 60 karakter fölött a legtöbb
 * levelező mobilon levágja.
 */
export const KORLAT = {
  linkedinJegyzet: 200,
  nevHelye: 25,
  emailTargy: 60,
} as const;

/** A tulajdonos neve, a vállalkozási forma nélkül. */
export const ALAIRO = szolgaltato.nev.replace(/ egyéni vállalkozó$/, '');

const alairas = [
  'Üdvözlettel:',
  ALAIRO,
  `SzámlaFolyó · ${szolgaltato.weboldal}`,
  `${szolgaltato.email} · ${szolgaltato.telefon}`,
].join('\n');

const probaMondat = `${proba.napok} nap, ${proba.dokumentumok} dokumentum, ${proba.felhasznalok} felhasználó, bankkártya nélkül`;

/* =========================================================================
 * Könyvelőirodák
 * ====================================================================== */

export type Bemutatolepes = { perc: string; cim: string; pontok: readonly string[] };

export type KonyveloCsomag = {
  /** Kapcsolatkérés mellé. Ingyenes fiókkal havonta csak kb. 10 ilyen jegyzet mehet ki. */
  linkedinJegyzet: string;
  /** Ha a kapcsolatkérést elfogadta (jegyzettel vagy anélkül). */
  linkedinElsoUzenet: string;
  /** A cég nyilvános irodai címére, egyenként. */
  email: { targy: string; szoveg: string };
  /** Kb. egy hét múlva, egyetlen alkalommal, válaszként az első levélre. */
  emlekezteto: string;
  /** 10 perces online bemutató vázlata a tulajdonosnak, nem kiküldésre. */
  bemutato: readonly Bemutatolepes[];
};

export const KONYVELO: KonyveloCsomag = {
  linkedinJegyzet:
    'Jó napot, [Név]! Könyvelőirodáknak fejlesztek bizonylatfeldolgozó eszközt, és sokat tanulnék egy gyakorló könyvelő véleményéből. Szívesen kapcsolódnék.',

  linkedinElsoUzenet: [
    'Köszönöm, hogy visszaigazolt, [Név]!',
    `Röviden arról, amin dolgozom: a SzámlaFolyót ${TAPASZTALAT} fejlesztem. Az ügyfelektől érkező bizonylatok adatait olvassa ki, a külföldi számlákét, nyugtákét és fotózott blokkokét is. Megjelöli, amit érdemes átnézni, a jóváhagyott tételeket pedig ügyfelenként exportálja az RLB Kettős, a Novitax NTAX vagy a Kulcs-Könyvelés számára.`,
    'Egy rövid, feliratos bemutatóvideó itt látható: https://szamlafolyo.hu/konyveloknek#bemutato',
    'Leginkább az érdekelne, hogy egy irodában mi hiányozna belőle. Ha lenne 10 perce, képernyőmegosztással szívesen megmutatom, vagy ki is próbálhatja: ' +
      `${probaMondat}.`,
    `Üdvözlettel:\n${ALAIRO}`,
  ].join('\n\n'),

  email: {
    targy: 'Bizonylatok kiolvasása és export RLB, Novitax, Kulcs felé',
    szoveg: [
      'Tisztelt [Név]!',
      '[Személyes mondat]',
      `${ALAIRO} vagyok, a SzámlaFolyó fejlesztője és üzemeltetője; ${TAPASZTALAT} építem. Ez egy online eszköz, amely az ügyfelektől érkező bizonylatok adatait olvassa ki: a külföldi számlákét, a nyugtákét, a fotózott blokkokét és a támogatott e-számla XML-ekét is.`,
      [
        'Az Önök irodájában így nézne ki:',
        '• az ügyfél e-mailben továbbítja a bizonylatot a munkaterület saját beküldési címére, vagy Önök töltik fel;',
        '• a rendszer kiolvassa az adatokat, és számítással ellenőrzi az adószám ellenőrző számjegyét, valamint a nettó, az áfa és a bruttó összefüggését;',
        '• a jóváhagyás az irodánál marad: alapbeállítás szerint minden bizonylatot egy munkatárs hagy jóvá;',
        '• a jóváhagyott tételek ügyfelenként exportálhatók az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára, vagy Excel (XLSX), CSV és JSON formátumban.',
      ].join('\n'),
      'Az adatbázist és a bizonylatfájlokat Frankfurtban, az Európai Unióban tároljuk. A feldolgozásban részt vevő szolgáltatókat az adatkezelési tájékoztató sorolja fel: https://szamlafolyo.hu/adatkezeles',
      'A NAV-ból átvett számlaadatokat nem váltja ki: azok mellett a többi bizonylat feldolgozását segíti.',
      'Egy rövid, feliratos bemutató és egy költségkalkulátor itt található: https://szamlafolyo.hu/konyveloknek',
      `Ha érdekli, 10 percben szívesen megmutatom online, vagy ki is próbálhatják: ${probaMondat}. Az is sokat segítene, ha megírná, mi hiányzik belőle egy irodai munkafolyamathoz.`,
      'Ha nem szeretne több levelet kapni tőlem, elég egy rövid válasz, és nem keresem többet.',
      alairas,
    ].join('\n\n'),
  },

  emlekezteto: [
    'Tisztelt [Név]!',
    'Egy héttel ezelőtt írtam a SzámlaFolyóról: az ügyfelektől érkező bizonylatok kiolvasásáról és az RLB, Novitax, Kulcs felé készülő exportról. Tudom, hogy egy könyvelőirodában ritkán van szabad perc, ezért csak most az egyszer jelentkezem újra.',
    'Ha érdekes lehet, a rövid bemutató itt látható: https://szamlafolyo.hu/konyveloknek#bemutato',
    'Ha nem, egy „köszönöm, nem” is teljesen rendben van, és nem keresem többet.',
    `Üdvözlettel:\n${ALAIRO}`,
  ].join('\n\n'),

  bemutato: [
    {
      perc: '0–1',
      cim: 'Előbb kérdezz',
      pontok: [
        'Milyen bizonylatok jönnek az ügyfelektől, és hogyan: e-mailben, papíron, fotón?',
        'Melyik könyvelőprogramot használják? A 4. lépésben azt mutasd.',
        `Egy mondat magadról: ${TAPASZTALAT} fejleszted, az adat Frankfurtban (EU) van. Ha rákérdez: a kiolvasás Unión kívüli feldolgozással jár, ezt az adatkezelési tájékoztató írja le.`,
      ],
    },
    {
      perc: '1–3',
      cim: 'Beküldés',
      pontok: [
        'Feltöltés a felületen: PDF, szkennelt kép, fotó, XML. Az egy fájlba összefűzött bizonylatokat különválasztja.',
        'A beküldési cím: bekapcsolás, a külső feladók engedélyezése, és a Legutóbbi levelek lista, ahol az elutasított levél oka is látszik.',
      ],
    },
    {
      perc: '3–6',
      cim: 'Ellenőrzés és jóváhagyás',
      pontok: [
        'A kártya: az eredeti bizonylat és a felismert mezők egymás mellett.',
        'Számítással: az adószám ellenőrző számjegye, nettó + áfa = bruttó, az áfabontás sorai.',
        'Alapból minden bizonylat jóváhagyásra vár, az automatikus jóváhagyás külön kapcsolható.',
        'Mondd ki magadtól is: a neveket és a szöveges adatokat érdemes az eredetivel összevetni.',
      ],
    },
    {
      perc: '6–8',
      cim: 'Ügyfelenkénti export',
      pontok: [
        'Szűrés az ügyfél adószáma szerint; a belföldi és a közösségi alakot összerendeli.',
        'Az ő programjának exportja (RLB Kettős, Novitax NTAX vagy Kulcs-Könyvelés), vagy Excel (XLSX), CSV, JSON. Az eredeti fájlok ZIP-ben.',
      ],
    },
    {
      perc: '8–9',
      cim: 'Díjak és próba',
      pontok: [
        `Próba: ${probaMondat}.`,
        `${kicsi.nev} ${ft(kicsi.arHavi)} (${kicsi.dokumentumok} dokumentum), ${kozepes.nev} ${ft(kozepes.arHavi)} (${kozepes.dokumentumok}), ${nagy.nev} ${ft(nagy.arHavi)} (${nagy.dokumentumok}) havonta. Végösszegek: a szolgáltató alanyi adómentes, további áfa nincs.`,
        `A kereten felüli feldolgozás alapból ki van kapcsolva; bekapcsolva dokumentumonként ${ft(kicsi.extraFt)}, ${ft(kozepes.extraFt)} vagy ${ft(nagy.extraFt)}, kötelező költési korláttal.`,
        'A kalkulátor az ügyfélszámból és a havi bizonylatszámból becsül: https://szamlafolyo.hu/konyveloknek#kalkulator',
      ],
    },
    {
      perc: '9–10',
      cim: 'Kérdezz vissza',
      pontok: [
        'Mi hiányzik ahhoz, hogy egy ügyfélen kipróbálják?',
        'Rákérdezhetsz-e egy hét múlva?',
      ],
    },
  ],
};

/* =========================================================================
 * Facebook-csoportok
 * ====================================================================== */

export type FacebookBejegyzes = {
  id: string;
  /** Milyen csoportba való. */
  hova: string;
  szoveg: string;
};

/** A nyílt közlés. Burkolt reklám nem lehet: minden bejegyzésben benne van. */
export const NYILT_KOZLES = 'Nyíltan jelzem: a SzámlaFolyót én fejlesztem.';

export const FACEBOOK: readonly FacebookBejegyzes[] = [
  {
    id: '1-xml',
    hova: 'Vállalkozói és könyvelői csoportok',
    szoveg: [
      'Tudtad, hogy az e-számlát nem kell begépelni, sőt kiolvastatni sem?',
      'Egyre több szállító küld e-számlát XML-ben, például UBL, Factur-X vagy ZUGFeRD formátumban. Ebben az adat strukturáltan benne van: a szállító rendszere írta ki, nem egy képből kell kitalálni.',
      [
        'Két dolog, amit érdemes tudni:',
        '• A Factur-X és a ZUGFeRD kívülről sima PDF, de a fájlba ágyazva ott van az XML is.',
        '• Ha a PDF mellé külön XML is érkezik, azt is tedd el: abban géppel olvasható alakban van ugyanaz az adat.',
      ].join('\n'),
      `${NYILT_KOZLES} A támogatott XML-formátumokból közvetlenül, képfelismerés nélkül veszi át az adatokat, a fotózott és szkennelt bizonylatokat pedig mesterséges intelligencia olvassa ki. Ha kíváncsi vagy: https://szamlafolyo.hu`,
      'Te hogyan kezeled most az XML-es számlákat?',
    ].join('\n\n'),
  },
  {
    id: '2-email',
    hova: 'Vállalkozói csoportok',
    szoveg: [
      'Hány kattintás, mire egy e-mailben érkezett számla eljut a könyvelőhöz?',
      'Letöltés, átnevezés, mappába húzás, feltöltés vagy továbbküldés. Egyenként nem sok, de havonta összeadódik.',
      [
        'Két egyszerűsítés, eszköztől függetlenül:',
        '• Legyen külön postafiók vagy címke a bejövő számláknak, és a szállítóknak ezt add meg számlázási címként.',
        '• A levelezőben egy szűrővel a PDF-mellékletes számlákat automatikusan felcímkézheted, így nem vesznek el a többi levél között.',
      ].join('\n'),
      `${NYILT_KOZLES} Ott a munkaterületed saját beküldési e-mail-címet kaphat: ha oda továbbítod a számlát, a melléklet a Beérkezőbe kerül, a rendszer kiolvassa az adatokat, te jóváhagyod, és a könyvelődnek Excel-táblázatot (XLSX) küldhetsz. A beküldés alapból ki van kapcsolva, és a cím bármikor lecserélhető. https://szamlafolyo.hu`,
      'Nálad hogyan jut el a számla a könyvelőhöz?',
    ].join('\n\n'),
  },
  {
    id: '3-export',
    hova: 'Könyvelői csoportok',
    szoveg: [
      'Kérdés könyvelőknek: mennyi idő megy el azokra a bizonylatokra, amelyek nincsenek benne a NAV-os adatokban?',
      'Külföldi számlák, nyugták, fotózott blokkok. A NAV-ból átvett számlaadatok sok kézi munkát megtakarítanak, ezeket viszont továbbra is valakinek rögzítenie kell.',
      `${NYILT_KOZLES} Pont erre készült: kiolvassa a beküldött bizonylatok adatait, megjelöli, amit érdemes átnézni, a jóváhagyott tételeket pedig ügyfelenként exportálja az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára, vagy Excel (XLSX), CSV és JSON formátumban. Az eredeti fájlok ZIP-ben is letölthetők.`,
      'A NAV-adatokat nem váltja ki, azok mellett a többi bizonylatra való. A könyvelőknek szóló oldalon van egy rövid, feliratos bemutató és egy költségkalkulátor: https://szamlafolyo.hu/konyveloknek',
      'Őszintén érdekelne: nálatok mi hiányozna belőle?',
    ].join('\n\n'),
  },
  {
    id: '4-ellenorzes',
    hova: 'Vállalkozói és könyvelői csoportok',
    szoveg: [
      '„És mi van, ha rosszul olvassa ki?”',
      'Ez az első kérdés, ha gépi számlakiolvasásról van szó, és jogos. Néhány dolgot számítással is lehet ellenőrizni, akármilyen eszközt használsz:',
      [
        '• A magyar adószám törzsszámának 8. számjegye ellenőrző számjegy: a többiből kiszámolható, így egy elgépelés többnyire kiderül.',
        '• A nettó és az áfa összege kiadja-e a bruttót.',
        '• Az áfabontás sorai kiadják-e a végösszeget.',
      ].join('\n'),
      'Amit viszont számítással nem lehet ellenőrizni: a neveket, címeket és más szöveges adatokat. Ezeket érdemes az eredetivel összevetni.',
      `${NYILT_KOZLES} Ezeket az ellenőrzéseket elvégzi, és megjelöli, ahol eltérést talál. A jóváhagyás nálad marad: alapbeállítás szerint minden bizonylat a te jóváhagyásodra vár, és csak a jóváhagyott tétel kerül exportba. https://szamlafolyo.hu`,
      'Te mit nézel meg elsőként egy beérkezett számlán?',
    ].join('\n\n'),
  },
];

/** Kész válasz, ha a kommentekben az árra kérdeznek. */
export const FACEBOOK_AR_VALASZ = [
  `Havi ${ft(kicsi.arHavi)}-tól: ${kicsi.nev} ${kicsi.dokumentumok} dokumentum ${ft(kicsi.arHavi)}, ${kozepes.nev} ${kozepes.dokumentumok} dokumentum ${ft(kozepes.arHavi)}, ${nagy.nev} ${nagy.dokumentumok} dokumentum ${ft(nagy.arHavi)} havonta.`,
  'Ezek végösszegek: a szolgáltató alanyi adómentes, az árakra nem kerül további áfa.',
  `Előtte ${proba.napok} napos ingyenes próba, ${proba.dokumentumok} dokumentumig, bankkártya nélkül. Könyvelőirodáknak kalkulátor is van: https://szamlafolyo.hu/konyveloknek#kalkulator`,
].join(' ');
