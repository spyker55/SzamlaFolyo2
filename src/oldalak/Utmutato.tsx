import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { JogiOldal, P, Lista, Tablazat } from './jogi/JogiOldal.tsx';
import { kapcsolatEmail } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { allapotCimke, szerepCimke, SZEREPEK } from '@uzleti/enumok.ts';
import { FEJLECEK, KULCSOK, SZAM_OSZLOPOK } from '@uzleti/export/oszlopok.ts';

/**
 * Használati útmutató.
 *
 * # Kinek szól, és miért nem „dokumentáció"
 *
 * A címzett a **könyvelő**, nem a fejlesztő. Ezért a lap nem képernyőről
 * képernyőre halad, hanem **a bizonylat útját követi**: hogyan kerül be, mi
 * történik vele, mit kell megnézni rajta, hogyan megy ki. Aki először ül le a
 * rendszerhez, az ebben a sorrendben találkozik vele.
 *
 * # Három szabály, amihez a szöveg tartja magát
 *
 * 1. **Csak azt írja le, amit a rendszer tud.** Egy útmutató, ami a termék
 *    tervezett állapotát írja le, ugyanaz a hibaosztály, mint egy ígéret, amit
 *    a kód nem tart be — csak itt a felhasználó fedezi fel, munka közben. Ami
 *    ma nincs kész (cégváltó, éves fizetés), arról nem szól.
 *
 * 2. **A számok a configból jönnek, nem kézből.** A keretek, az árak, a
 *    megőrzési idők és a kredit szabálya ugyanabból a forrásból (
 *    `config/szamlafolyo.ts`, `@uzleti/kredit.ts`), amiből a nyitólap, az ÁSZF
 *    és maga a működés. Egy útmutató, amiben a tavalyi ár áll, rosszabb, mint
 *    ha nem lenne benne ár — az állapotok címkéit ugyanígy az `enumok.ts` adja,
 *    tehát a táblázat nem tud elcsúszni a Beérkező jelvényeitől.
 *
 * 3. **Nem ismétli meg a jogi szövegeket, hanem rájuk mutat.** Ahol
 *    kötelezettségről vagy adatkezelésről van szó, ott az ÁSZF és az
 *    Adatkezelési tájékoztató a mérvadó; két helyen leírva a kettő
 *    előbb-utóbb széttartana. Az útmutató azt mondja el, **mit csinálj**.
 *
 * # A keret
 *
 * A lap a jogi oldalak keretét (`JogiOldal`) használja: ugyanaz a ragadós
 * fejléc a visszaúttal, ugyanaz a szélesség, ugyanaz a lábléc. Nem azért, mert
 * jogi szöveg — nem az —, hanem mert ugyanaz a fajta lap: **hosszú, nyilvános,
 * olvasásra való**. Egy negyedik keret csak négyféleképpen tudna elromlani.
 *
 * # 2026. szeptember 20. — a jogi felülvizsgálat nyomai
 *
 * Négy helyen mondott az útmutató mást, mint a rendszer:
 *
 * - **Az „export után már nem" ellentmondás.** A Tételek fejezet azt írta, hogy
 *   export után nincs javítás, az Archívum fejezet meg azt, hogy a tétel
 *   visszahívható. A második az igaz.
 * - **„Ha a bizonylat maga hibás, javítsd a valós értékre."** Ez félrevezető
 *   volt: az alkalmazásban átírt adat a kibocsátott számlát nem helyesbíti. A
 *   szöveg most szétválasztja a kiolvasási hibát és a bizonylat hibáját.
 * - **Az XML és a keret.** A nyitólap „ingyen"-t hirdetett, az útmutató
 *   hallgatott róla. Mérve: a kredit az oldalszámból jön, nem a kiolvasás
 *   módjából — tehát az XML is fogyaszt keretet, csak modellköltsége nincs.
 * - **A könyvelőirodás használat.** Az „aki több cégnek könyvel" mondat marad,
 *   de mellé került, hogy az ügyfélszűrő nem hozzáférési korlát, és hogy ilyen
 *   használatnál az Előfizető maga is adatfeldolgozó.
 */
export function Utmutato() {
  return (
    <JogiOldal cim="Használati útmutató" datummal={false}>
      <P>
        A SzámlaFolyó egyetlen dolgot csinál, azt viszont végig: a beérkező
        bizonylatokból <strong>könyvelésre kész adatot</strong> készít. Te feltöltöd vagy
        átküldöd a számlát, a rendszer kiolvassa, megjelöli, ami gyanús, te jóváhagyod, és
        a végén egy táblázatot kapsz, amit a könyvelőprogram be tud olvasni.
      </P>
      <P>
        Ez az útmutató a <strong>bizonylat útját</strong> követi, nem a menüt. Ha most ülsz le
        először, olvasd végig egyszer – nagyjából tíz perc, és utána minden képernyőn tudni
        fogod, mit keresel.
      </P>

      <Tartalom />

      <Fejezet id="elso-lepesek">
        <P>
          <strong>Fiók és cég.</strong> A belépés után a rendszer céget kér: a cég neve és az{' '}
          <strong>adószáma</strong> kerül a bizonylatok mellé és az exportra. Az adószámot
          ellenőrizzük: a <strong>törzsszám</strong> (az első nyolc jegy) utolsó
          számjegye ellenőrző szám, tehát egy elgépelt adószám nem megy át. Ez szándékos
          szigor: a cégadat egy helyen áll, és onnan mindenhova továbbmegy.
        </P>
        <P>
          <strong>Egy fiók egy céget kezel.</strong> Aki több cégnek könyvel, annak nem kell
          több fiók: a bizonylatok ugyanabba a cégbe kerülnek, az exportot pedig{' '}
          <strong>ügyfelenként</strong> lehet leválogatni (lásd a {pont('tetelek-export')}. pontot). Cégváltó nincs, és
          ez nem elmaradás, hanem döntés.
        </P>
        <Figyelem>
          <strong>Az ügyfélszűrő kényelmi szűrés, nem hozzáférési korlát.</strong> A cégben
          mindenki a <em>teljes</em> bizonylatállományt látja, a szerepe szerinti jogokkal – nem
          csak azt az ügyfelet, akivel dolgozik. Ha egy ügyfél iratait el kell különíteni a
          többitől, ahhoz külön cég (és külön előfizetés) kell. Adatvédelmi oldalról is érdemes
          tudni: amikor az ügyfeled megbízásából dolgozol, <em>te</em> vagy az ő adatfeldolgozója,
          és a SzámlaFolyó al-adatfeldolgozó – ehhez az ügyfél felhatalmazása kell. A részletek az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontjában
          </Link>{' '}
          állnak.
        </Figyelem>
        <P>
          <strong>Kollégák meghívása.</strong> A Beállítások → <em>Tagok</em> kártyáján
          e-mail-címre szól a meghívó; a meghívott a levélben kapott linken nyit fiókot, vagy
          ha már van neki, azzal lép be. Hogy ki mit tehet, azt a szerepe dönti el – a{' '}
          {pont('szerepek')}. pontban van a táblázat.
        </P>
      </Fejezet>

      <Fejezet id="bekuldes">
        <P>
          <strong>Feltöltéssel.</strong> A Beérkezőben húzd a fájlokat a szaggatott keretre,
          vagy válaszd ki őket a gombbal. Egyszerre több is mehet.
        </P>
        <Lista>
          <li>
            Elfogadott formátumok: <strong>PDF, JPG, PNG, WEBP</strong> és{' '}
            <strong>e-számla XML</strong> (UBL, Factur-X/ZUGFeRD, NAV Online Számla és a régebbi
            APEH-alak). A <strong>hibrid e-számlát</strong> – azt a PDF-et, amibe a kibocsátó az
            XML-t is beletette (Factur-X, ZUGFeRD) – magától felismerjük, és a beágyazott
            XML-ből olvassuk ki: neked ugyanúgy egy PDF-et kell feltöltened.
          </li>
          <li>
            ⚠️ <strong>Ha egy XML nem a négy ismert alak valamelyike</strong>, nem utasítjuk el:
            ugyanúgy feldolgozzuk, mint egy PDF-et – vagyis <strong>a modell olvassa ki</strong>.
            A keretedbe ugyanannyi, a tartalma viszont így elhagyja a szervert. A
            részletek az{' '}
            <Link to="/adatkezeles" className="underline">
              Adatkezelési tájékoztató 3. pontjában
            </Link>{' '}
            állnak.
          </li>
          <li>
            Méret: legfeljebb <strong>{Math.round(szamlafolyo.feltoltes.maxBajt / 1024 / 1024)} MB</strong>{' '}
            fájlonként.
          </li>
          <li>
            A fájl típusát a <strong>tartalmából</strong> állapítjuk meg, nem a kiterjesztésből
            – egy rosszul elnevezett fájl is bekerül, ha egyébként jó.
          </li>
          <li>
            <strong>Ugyanaz a fájl kétszer nem kerül be.</strong> Ha egy bizonylat már bent van,
            az új sor „{allapotCimke('duplikatum')}" jelzéssel áll meg, és egy kattintással
            eldobható. Kreditbe nem kerül.
          </li>
        </Lista>
        <P>
          <strong>E-mailben.</strong> A cégnek saját beküldő címe van a{' '}
          <code className="rounded bg-slate-100 px-1">{szamlafolyo.bekuldes.domain}</code>{' '}
          tartományon – a Beállítások → <em>E-mailes beküldés</em> kártyán kapcsolható be, és ott
          is másolható ki. Amit oda küldesz, az úgy kerül a Beérkezőbe, mintha feltöltötted
          volna.
        </P>
        <Figyelem>
          <strong>A beküldő cím titok.</strong> Nincs rajta jelszó: aki ismeri, a ti
          keretetekből költ. Ne tedd ki weboldalra vagy nyilvános aláírásba. Ha mégis
          kiszivárgott, a Beállításokban egy gombbal lecserélhető – a régi cím azonnal
          érvénytelen lesz.
        </Figyelem>
        <P>Amit a levelekről tudni érdemes:</P>
        <Lista>
          <li>
            Alapból <strong>csak a cég tagjaitól</strong> fogadunk levelet (vagyis a saját
            postafiókodból továbbküldött számla jön át). Ez átállítható „bárkitől"-re, ha azt
            szeretnéd, hogy a szállítóid közvetlenül ide küldjenek.
          </li>
          <li>
            Ha a levélben van PDF vagy XML, a <strong>képekhez hozzá sem nyúlunk</strong> – így
            az aláírásban ülő céglogóból nem lesz bizonylat.
          </li>
          <li>
            Egy levélből legfeljebb <strong>{szamlafolyo.bekuldes.maxMelleklet}</strong>{' '}
            mellékletet dolgozunk fel.
          </li>
          <li>
            <strong>A feladó nem kap választ.</strong> Hogy mi lett egy levéllel – átment,
            vagy miért nem –, azt a Beállítások ugyanezen kártyáján, a lap alján látod.
          </li>
        </Lista>
        <Figyelem>
          <strong>A beküldő cím olyan, mint egy kulcs: aki ismeri, a te keretedből költ.</strong>{' '}
          Ne tedd ki nyilvános helyre, és ne írd bele körlevélbe. Alapesetben csak a cég
          tagjainak címéről fogadunk el levelet – ez átállítható „bárkitől" állásba, de tudd,
          hogy a feladómező hamisítható, tehát ez a szűrés a véletlen ellen véd (hírlevél,
          automata válasz), nem a szándékos visszaélés ellen. Ha a cím kiszivárog, a Beállítások
          kártyáján <strong>cseréld le</strong> – a régi cím azonnal érvénytelen lesz.
        </Figyelem>
      </Fejezet>

      <Fejezet id="beerkezo">
        <P>
          A feltöltés után a bizonylat sorba áll, és magától végigmegy a feldolgozáson. Nincs
          „indítás" gomb; a Beérkező listája frissül, ahogy halad. Ami valamelyik állapotban
          megakad, az ott is marad láthatóan – nem tűnik el csendben.
        </P>
        <Tablazat fejlec={['Állapot', 'Mit jelent', 'Van-e vele dolgod']}>
          <Sor
            allapot={allapotCimke('feltoltve')}
            mit="A fájl megérkezett, a feldolgozásra vár."
            dolog="Nincs. Percen belül továbblép."
          />
          <Sor
            allapot={allapotCimke('feldolgozas_alatt')}
            mit="Épp olvassuk ki. Egy PDF jellemzően 5–15 másodperc, egy e-számla XML a töredéke."
            dolog="Nincs."
          />
          <Sor
            allapot={allapotCimke('ellenorzesre_var')}
            mit="Kiolvastuk, és rád vár a jóváhagyás."
            dolog={`Igen – ez a ${pont('ellenorzes')}. pont.`}
          />
          <Sor
            allapot={allapotCimke('hiba')}
            mit="Három próbálkozás után sem sikerült kiolvasni (sérült fájl, jelszóval védett PDF, üres oldal)."
            dolog="Nézd meg a fájlt, és töltsd fel újra. Kreditbe nem került."
          />
          <Sor
            allapot={allapotCimke('duplikatum')}
            mit="Ez a fájl már bent van."
            dolog="Eldobhatod. Kreditbe nem került."
          />
          <Sor
            allapot={allapotCimke('jovahagyva')}
            mit="Jóváhagytad; az exportra vár."
            dolog="A Tételek képernyőn találod."
          />
          <Sor
            allapot={allapotCimke('exportalva')}
            mit="Kiment egy exportban."
            dolog="Az Archívumban találod."
          />
        </Tablazat>
        <P>
          <strong>Ha egy fájlban több bizonylat van</strong> – mert egyben szkennelted be a havi
          paksamétát –, a rendszer megkeresi a határokat, és{' '}
          <strong>külön bizonylatot csinál mindegyikből</strong>, oldalszám szerint. A fájlt nem
          vágjuk szét, csak megjegyezzük, melyik bizonylat hol áll benne. A szétszedés maga nem
          kerül külön kreditbe.
        </P>
      </Fejezet>

      <Fejezet id="ellenorzes">
        <P>
          Ez a rendszer szíve. Bal oldalon az eredeti bizonylat, jobb oldalon a kiolvasott
          adatok. A feladatod nem az, hogy mindent begépelj, hanem hogy{' '}
          <strong>megnézd, amit megjelöltünk</strong> – azzal a megszorítással, hogy a{' '}
          <em>jelöletlen</em> mező sem garancia. Azt jelenti, hogy nincs okunk gyanakodni, nem
          azt, hogy biztosan jó. A végösszeget és a bizonylatszámot érdemes akkor is ránézésre
          összevetni az eredetivel.
        </P>
        <P>
          <strong>A mezők színe azt mondja meg, mennyire bízunk az adatban:</strong>
        </P>
        <Lista>
          <li>
            <strong>Jelöletlen</strong> – magabiztos kiolvasás, és minden ellenőrzés rendben.
            Nem azt jelenti, hogy biztosan jó; azt, hogy nincs okunk gyanakodni.
          </li>
          <li>
            <strong>Sárga</strong> – bizonytalan. Vesd össze a papírral.
          </li>
          <li>
            <strong>Piros</strong> – vagy nagyon bizonytalan a kiolvasás, vagy{' '}
            <strong>megbukott egy ellenőrzés</strong>. A mező alatt ott a mondat, hogy mi a baj.
          </li>
          <li>
            <strong>Szürke, „nincs adat"</strong> – ezt a mezőt nem találtuk a bizonylaton. Ez
            nem hiba: egy nyugtán nincs vevő adószáma.
          </li>
        </Lista>
        <P>
          <strong>Az ellenőrzések számtaniak, nem gépi sejtések.</strong> Azt nézik, hogy a
          bizonylat magával összhangban van-e: kiadja-e a nettó és az ÁFA a bruttót, stimmel-e
          a tételsorok összege, érvényes-e az adószám ellenőrző számjegye, nem későbbi-e a
          teljesítés a keltnél. Ha egy ilyen megbukik, az vagy kiolvasási hiba, vagy{' '}
          <strong>a bizonylaton van eltérés</strong> – és a kettő közül a másodikat is jó időben
          megtudni. A jelzés <strong>vizsgálandó eltérés, nem ítélet</strong>: a keltnél későbbi
          teljesítés például teljesen szabályos lehet (időszakos elszámolásnál rendszeres is),
          csak érdemes ránézni. A jelölés <strong>élő</strong>: ha átírsz egy számot, az ellenőrzés azonnal
          újrafut a javított értékkel.
        </P>
        <Figyelem>
          <strong>A neveket senki nem tudja ellenőrizni.</strong> Összeget, dátumot, adószámot
          számtan fog meg; egy szállítónevet semmi. Kézzel írott vagy rosszul szkennelt
          bizonylatnál ezért a rendszer külön figyelmeztet, és olyankor{' '}
          <strong>a jelöletlen mezőket is</strong> érdemes végigfutni – különösen a neveket.
        </Figyelem>
        <P>
          <strong>A képernyő tetején az is ott van, ki olvasta ki a bizonylatot</strong> – és ez
          megváltoztatja, mennyire kell gyanakodnod. Ha a fájlban strukturált e-számla volt (UBL,
          Factur-X/ZUGFeRD, NAV Online Számla vagy a régebbi APEH-alak), akkor a mezők a
          szállító rendszerének <strong>kiírt értékei</strong>: átvettük őket, nem olvastuk le
          semmiről. Minden más esetben – papír, szkennelt kép, és a fel nem ismert alakú XML is –
          a modell olvasta ki, tehát minden mező olvasat. A különbség a neveknél a legnagyobb:
          átvett névnél nincs mit félreolvasni, olvasott névnél van. Ugyanez a jelzés ott áll a
          Beérkező listájában is, a bizonylat sorában; ahol nincs kiírva, ott a bizonylat még nem
          futott le. A számtani ellenőrzések mindkét úton futnak: egy rosszul kiállított
          e-számla ugyanúgy megbukik rajtuk.
        </P>
        <P>
          <strong>Az ÁFA-bontás</strong> külön szerkeszthető: kulcsonként a nettó és az ÁFA. Ez
          megy az exportba kulcsonkénti oszlopokban, tehát itt érdemes rendbe tenni, nem a
          táblázatban utólag.
        </P>
        <P>
          A <strong>„Jóváhagyás és következő"</strong> gombbal menet közben nem kell
          visszakattintanod a listára: a rendszer hozza a sorban következő bizonylatot. A
          jóváhagyással a bizonylat a <strong>Tételek</strong> közé kerül.
        </P>
        <P>
          Amit javítasz, azt <strong>megjegyezzük</strong> (hogy melyik mezőt írtad át, mire).
          Nem ellenőrzésképpen: ebből derül ki, hol pontatlan a kiolvasás – ez az egyetlen
          visszajelzés, amiből a rendszer javítható.
        </P>
      </Fejezet>

      <Fejezet id="tetelek-export">
        <P>
          A <strong>Tételek</strong> képernyőn a jóváhagyott, még ki nem exportált bizonylatok
          állnak. Innen vissza lehet küldeni egyet javításra. Az export sem zárja le véglegesen:
          egy kiment tétel az Archívumból <strong>visszahívható</strong>, javítható és újra
          exportálható (lásd a {pont('archivum')}. pontot). Ami az exporttal{' '}
          <strong>tényleg elindul</strong>, az az eredeti fájl órája – a bizonylat képe a
          megőrzési idő után nem hívható vissza.
        </P>
        <P>
          Az <strong>Export</strong> képernyőn választod ki, mi menjen ki. Szűrni lehet
          beérkezési dátumra, bizonylattípusra és <strong>ügyfélre</strong>. Az ügyfélszűrő az{' '}
          <strong>adószám törzsszáma</strong> (az első nyolc jegy) szerint dolgozik, tehát akkor
          is összetartja egy ügyfél bizonylatait, ha a cégnév írásmódja bizonylatonként
          különbözik – és a kiválasztott ügyfél <strong>bejövő és kimenő</strong> bizonylatait
          egyaránt hozza.
        </P>
        <Lista>
          <li>
            Formátum: <strong>xlsx</strong> (Excel), <strong>csv</strong> vagy{' '}
            <strong>json</strong>. A pénzoszlopok számként, az Excel saját nyelvi beállítása
            szerinti formátumban – a dátumok szándékosan szöveges ISO alakban (
            <code className="rounded bg-slate-100 px-1">2026-09-20</code>), mert azt semmilyen
            táblázatkezelő nem írja át.
          </li>
          <li>
            Export előtt látod, <strong>hány tétel</strong> kerül bele, és pénznemenként a
            nettó/ÁFA/bruttó összeget – érdemes ránézni, mielőtt kimegy.
          </li>
          <li>
            <strong>Könyvelőprogramba:</strong> RLB Kettős – valódi RLB-ben kipróbálva (bejövő,
            kimenő, mentes, sztornó, nyugta); Novitax NTAX és Kulcs-Könyvelés –{' '}
            <strong>béta</strong>: a gyártók közzétett leírása szerint készül, valódi programban
            még nincs kipróbálva. Mindháromhoz van <strong>Próbafájl</strong> gomb, ami nem
            jelöli át a tételeket – béta programnál előbb egy próbacégbe töltsd be.
          </li>
          <li>
            A programfájlt <strong>közvetlenül</strong> töltsd be, ahogy letöltötted. Ha
            Excelben, Google Táblázatban vagy a Google Drive-on megnyitod és újramented (vagy
            onnan töltöd le), az átírja az elválasztót és az ékezetek kódolását, és a program{' '}
            „a mezőelválasztások vagy adatok hibásak” hibával elutasítja.
          </li>
          <li>
            Az <strong>eredeti fájlok</strong> (a PDF-ek és képek) egy gombbal ZIP-ben
            letölthetők. Ez külön művelet az exporttól, és érdemes vele élni: lásd a következő
            figyelmeztetést.
          </li>
        </Lista>
        <P>
          <strong>Mi kell a programfájlhoz.</strong> A program egy cég könyvelését kapja, ezért
          könyvelőirodaként <strong>válaszd ki az ügyfelet</strong>: az ő adószáma dönti el, mi
          bejövő és mi kimenő. A <strong>főkönyvi számokat</strong> (költség, előzetes ÁFA,
          szállítók; árbevétel, fizetendő ÁFA, vevők) te adod meg, ügyfelenként vagy egyszer az
          egész cégre – a SzámlaFolyó nem kontíroz helyetted, minden tétel ezekre a számlákra
          megy, a programban átkontírozhatod. A Novitaxhoz a napló kódja, a Kulcshoz a saját
          ÁFA-kulcsaid kódja és neve is kell. Első fájl előtt a beállítást menteni kell.
        </P>
        <P>
          <strong>Ami nem megy programfájlba</strong>, az a listán marad, és a képernyő
          tételenként megmondja, miért – táblázatba (Excel, CSV) továbbra is exportálható:
        </P>
        <Lista>
          <li>devizás bizonylat (árfolyamot nem olvasunk ki, és nem találunk ki);</li>
          <li>
            fordított adózású, közösségi, export- és ÁFA-körön kívüli sor, valamint a 0%-os sor
            ÁFA-kategória nélkül (mentes vagy nulla kulcsos? – ezt az Ellenőrzésben lehet
            megadni);
          </li>
          <li>ha a nettó és az ÁFA nem adja ki a bruttót, vagy hiányzik a bizonylatszám;</li>
          <li>átutalásos számla fizetési határidő nélkül;</li>
          <li>
            a Novitaxnál és a Kulcsnál a partner érvényes magyar adószám nélkül; a Kulcsnál a
            sztornó és a helyesbítő számla (az eredeti számla számát kéri).
          </li>
        </Lista>
        <P>
          A Novitax és a Kulcs a bizonylatot egy <strong>belső sorszámmal</strong> azonosítja
          (Novitaxban <code>SZF</code> + szám). Ezt az első programfájlnál kapja meg a tétel, és
          megtartja: ha visszahívod és újra exportálod, ugyanazzal a számmal megy ki.
        </P>
        <Figyelem>
          <strong>Az export lezárja a tételeket, és elindítja az eredeti fájlok óráját.</strong>{' '}
          Ami kiment, az az Archívumba kerül, és az eredeti PDF-ek a beállított megőrzési idő
          (alapból <strong>0 nap</strong>, vagyis azonnal) után törlődnek a szerverről. Az{' '}
          <strong>adatok megmaradnak</strong>, a bizonylat képe viszont nem hívható vissza. A
          megőrzési kötelezettség a tiéd – ha kell a papír képe, <strong>töltsd le a ZIP-et az
          export előtt</strong>, mert 0 napos megőrzésnél az export után már nincs mit letölteni.
          Ha egy fájlban több bizonylat volt, az óra csak akkor indul, amikor{' '}
          <strong>mindegyik</strong> kiment: egy részleges export nem viszi el a még
          feldolgozatlan számlák forrását.
        </Figyelem>
      </Fejezet>

      <Fejezet id="archivum">
        <P>
          Ami kiment, az itt áll. Az export fájl{' '}
          <strong>{szamlafolyo.megorzes.exportNap} napig</strong> újra letölthető; utána a fájl
          törlődik, de <strong>a tételek megmaradnak</strong> – a Tételekből bármikor
          készíthető új export ugyanazokról.
        </P>
        <P>
          Egy tétel <strong>visszahívható</strong> az exportból a Tételek közé: ha kiderül, hogy
          rossz adat ment ki, nem kell mellé magyarázat, hanem javítható és újra exportálható.
          Az export sora ilyenkor megmutatja, hogy az eredeti darabszámból hány tétel van még
          benne.
        </P>
      </Fejezet>

      <Fejezet id="keret">
        <P>
          <strong>A mértékegység a bizonylat, nem a fájl.</strong> {szabaly()} Ez az{' '}
          <strong>e-számla XML-re is vonatkozik</strong>: azt ugyan gép olvassa ki, modellhívás
          nélkül és másodperc alatt, de a havi keretedbe ugyanúgy beleszámít, mint bármelyik
          másik bizonylat. Vagyis egy normál,
          egy-három oldalas számla mindig egy dokumentum; egy hosszú köteg annyi, ahány bizonylat
          van benne. Amiért <strong>nem</strong> számolunk fel semmit: a köteg szétszedése, a
          duplikátum, és az a bizonylat, amit nem sikerült kiolvasni.
        </P>
        <P>
          <strong>A próbaidő {szamlafolyo.proba.napok} nap vagy{' '}
          {szamlafolyo.proba.dokumentumok} dokumentum</strong> – amelyik előbb elfogy –,{' '}
          {szamlafolyo.proba.felhasznalok} felhasználóval, bankkártya nélkül.
        </P>
        <Tablazat fejlec={['Csomag', 'Dokumentum / hó', 'Felhasználó', 'Havi díj', 'Keret fölött']}>
          {csomagSorrend.map((kulcs) => {
            const cs = szamlafolyo.csomagok[kulcs];

            return (
              <tr key={kulcs} className="trow">
                <td className="td font-medium text-slate-900">{cs.nev}</td>
                <td className="td">{cs.dokumentumok}</td>
                <td className="td">{cs.felhasznalok ?? 'korlátlan'}</td>
                <td className="td">{formaz(cs.arHavi)} Ft</td>
                <td className="td">{cs.extraFt} Ft / dokumentum</td>
              </tr>
            );
          })}
        </Tablazat>
        <P>
          <strong>A keret fölött alapból megállunk.</strong> Váratlan számlát senki ne kapjon
          attól, hogy egy hónapban többet dolgozott. Ha mégis azt szeretnéd, hogy a hónap vége
          ne álljon meg, a Beállításokban bekapcsolható a túlhasználat – és{' '}
          <strong>akkor is van felső határa</strong>: egy forintban megadott plafon (alapértéke{' '}
          {formaz(szamlafolyo.tulhasznalat.alapPlafonFt)} Ft), ami fölött ugyanúgy megállunk. A
          keret fölötti dokumentumok a <strong>következő havi számlán</strong> szerepelnek külön
          tételként.
        </P>
        <P>
          <strong>A csomagváltás, a lemondás és a bankkártya cseréje</strong> a Beállítások →{' '}
          <em>Előfizetés</em> kártyájáról indul, a <em>Számlázási portál</em> gombbal. Az a gomb
          a Stripe oldalára visz: a bankkártyaadat és a számlatörténet ott van, nem nálunk.
        </P>
        <P>
          A Stripe lapján a csomagváltás az <strong>„Előfizetés frissítése"</strong> gomb mögött
          van – ott lehet másik csomagot választani. Ugyanezen a lapon áll a lemondás, a
          bankkártya cseréje és a korábbi <strong>fizetési bizonylatok</strong> letöltése. Amit
          ott módosítasz, az pár másodpercen belül a Beállításokon is látszik.
        </P>
        <Figyelem>
          <strong>A Stripe-nál letölthető bizonylat nem a számlád.</strong> Az a fizetési
          szolgáltató saját dokumentuma a tranzakcióról. A <em>számlát</em> mi állítjuk ki, magyar
          számlázóprogrammal, és e-mailben küldjük a megadott címedre – azt tedd a könyvelésbe,
          ne a Stripe-ét.
        </Figyelem>
        <P>
          <strong>A csomagváltás nem indítja újra a számlázási ciklust</strong>, és nem terhelünk
          érte azonnal semmit: a fordulónap marad, ahol volt, és külön számlát sem kapsz róla. A{' '}
          <strong>keret viszont azonnal változik</strong> – nagyobb csomagra váltva rögtön több,
          kisebbre váltva rögtön kevesebb.
        </P>
        <P>
          A pénzt a <strong>következő havi számla</strong> rendezi, napra arányosan, és{' '}
          <strong>mindkét irányban</strong>. Nagyobb csomagra váltva a hátralévő napok
          különbözete külön soron jelenik meg rajta; kisebbre váltva a már kifizetett, de fel nem
          használt rész <strong>jóváírásként jön vissza</strong> – szintén külön soron. Minden
          váltás a saját napjától számít: aki nagyobbra vált, majd vissza, annak a nagyobb
          csomagban töltött napok díjkülönbözete megmarad.
        </P>
        <Figyelem>
          <strong>Kisebb csomagra váltva a keret azonnal szűkül.</strong> Ha a hónapban addigra
          már több bizonylatot dolgoztál fel, mint amennyi az új csomagba fér, a váltás
          pillanatában kereten kívülre kerülsz – onnantól a következő fordulónapig várnak a
          bizonylatok, hacsak be nem kapcsolod a túlhasználatot. A váltás{' '}
          <strong>előtt</strong> feldolgozott bizonylatokért viszont utólag nem számolunk fel
          túlhasználatot: azok a régi csomag keretéig fedezve maradnak. A különbözet a következő
          számlán jóváíródik – ⚠️ de ha közben az előfizetést le is mondod, a fel nem használt
          jóváírás nem jár vissza.
        </Figyelem>
        <P>
          A lemondás a <strong>kifizetett időszak végéig</strong> hagyja használni a rendszert, és
          a fordulónapig <strong>visszavonható</strong> – szintén a portálon. Amíg a lemondás él,
          a Beállítások kiírja, meddig fut még az előfizetés.
        </P>
      </Fejezet>

      <Fejezet id="beallitasok">
        <Tablazat fejlec={['Kártya', 'Mit állít', 'Alapérték']}>
          <Sor
            allapot="A cég"
            mit="Cégnév és adószám – ez szerepel az exporton."
            dolog="A regisztrációkor megadott adat."
          />
          <Sor
            allapot="E-mailes beküldés"
            mit="A cég beküldő címe, és hogy kitől fogadunk rá levelet."
            dolog="Kikapcsolva."
          />
          <Sor
            allapot="Automatikus jóváhagyás"
            mit="Bekapcsolva az a bizonylat, amelyik minden ellenőrzésen átment, ember nélkül is továbbmehet a Tételekbe."
            dolog="Kikapcsolva – minden bizonylat rád vár."
          />
          <Sor
            allapot="Eredeti fájlok megőrzése"
            mit={`Hány napig maradjon meg az eredeti PDF az export után (0–${szamlafolyo.megorzes.maxNap} nap).`}
            dolog="0 nap – az export után azonnal törlődik."
          />
          <Sor
            allapot="Túlhasználat"
            mit="Megálljon-e a rendszer a havi keretnél, és ha nem, milyen forintösszegig."
            dolog="Kikapcsolva (előfizetés nélkül nem is kapcsolható be)."
          />
          <Sor
            allapot="Tagok"
            mit="Meghívás, szerepek, eltávolítás."
            dolog="Te vagy a tulajdonos."
          />
          <Sor
            allapot="Előfizetés"
            mit="Csomagválasztás, számlázási portál, számlák."
            dolog="Próbaidő."
          />
        </Tablazat>
        <P>
          Az <strong>automatikus jóváhagyásról</strong> érdemes tudni, mit vállalsz vele, mert
          alapból ki van kapcsolva, és ezt a nyilvános szövegeink is így ígérik. Ha
          bekapcsolod: a cég első{' '}
          <strong>{szamlafolyo.automatikusJovahagyas.bemelegitesDarab} bizonylata akkor is
          hozzád kerül</strong> (a rendszernek előbb meg kell ismernie a cég szokásait), és utána
          is minden{' '}
          <strong>{szamlafolyo.automatikusJovahagyas.mintavetelMinden}.</strong> automatikusan
          jóváhagyható bizonylatot elédteszünk – hogy legyen mihez mérni. Az így átment bizonylat{' '}
          <strong>jelvényt kap az indokkal együtt</strong>, és az exportig visszahívható. Soha nem
          írjuk rá, hogy „ellenőrizve", ha senki nem nézte meg.
        </P>
      </Fejezet>

      <Fejezet id="szerepek">
        <Tablazat fejlec={['Szerep', 'Mit tehet']}>
          {SZEREPEK.map((szerep) => (
            <tr key={szerep} className="trow">
              <td className="td font-medium text-slate-900">{szerepCimke(szerep)}</td>
              <td className="td">
                {szerep === 'tulajdonos' &&
                  'Mindent: feltöltés, jóváhagyás, export, és ezen felül a számlázás, a tagok kezelése és a cég adatai.'}
                {szerep === 'szerkeszto' &&
                  'Feltöltés, jóváhagyás, export, visszahívás. Számlázáshoz és tagokhoz nem fér hozzá.'}
                {szerep === 'megtekinto' &&
                  'Olvasás: megnézheti a bizonylatokat és letöltheti az eredetiket, de nem hagy jóvá és nem exportál.'}
              </td>
            </tr>
          ))}
        </Tablazat>
        <P>
          A szűkítést <strong>az adatbázis kényszeríti ki</strong>, nem a képernyő: amit egy
          megtekintő nem tehet meg, azt nem csak a gomb hiánya akadályozza meg. Más cég
          bizonylatához pedig egyik szerep sem fér hozzá.
        </P>
      </Fejezet>

      <Fejezet id="adatok">
        <Lista>
          <li>
            Az adatok és a bizonylatok fájljai <strong>az Európai Unión belül</strong>,
            frankfurti kiszolgálón vannak.
          </li>
          <li>
            Az <strong>eredeti fájl</strong> az export után a beállított megőrzési idővel
            (0–{szamlafolyo.megorzes.maxNap} nap) törlődik. A kiolvasott adat megmarad.
          </li>
          <li>
            Az <strong>export fájl</strong> {szamlafolyo.megorzes.exportNap} napig tölthető le
            újra; a tételekből utána is készíthető új export.
          </li>
          <li>
            A <strong>kiolvasáshoz</strong> a papír- és a szkennelt bizonylat tartalma elhagyja a
            szervert: két, név szerint megnevezett közreműködőn át jut el a modellhez (OpenRouter,
            majd a Google). A kérés kiköti, hogy a tartalmat ne tárolják és ne tanítsanak vele, és
            <strong> nincs tartalék útvonal</strong> meg nem nevezett szolgáltatóhoz. A{' '}
            <strong>felismert</strong> e-számla XML-je fel sem megy: azt a rendszer helyben
            olvassa ki – és ez a hibrid e-számlára is áll, ahol az XML a PDF-be van ágyazva. Az
            az XML viszont, amit a rendszer nem ismer fel, a modellhez kerül, mint egy PDF.
          </li>
          <li>
            A <strong>fiók és a cég törlése</strong> a Beállításokból indítható, és
            visszafordíthatatlan. Az egyedüli tulajdonos addig nem törölhet, amíg más is
            dolgozik a cégben – előbb át kell adni a tulajdonosi szerepet vagy el kell távolítani
            a tagokat. A törlés után az ÁSZF elfogadásának nyoma (melyik változatot, mikor, ki
            fogadta el) {szamlafolyo.megorzes.aszfBizonyitekEv} évig megmarad.
          </li>
          <li>
            Az a fiók, amelyhez nem tartozik cég, és{' '}
            {szamlafolyo.megorzes.inaktivFiokNap} napja nem lépett be senki,{' '}
            <strong>magától törlődik</strong>.
          </li>
        </Lista>
        <P>
          A részletek – jogalap, adatfeldolgozók, a kiolvasás útja – az{' '}
          <Link to="/adatkezeles" className="text-blue-700 underline hover:text-blue-900">
            Adatkezelési tájékoztatóban
          </Link>{' '}
          állnak, a szolgáltatás feltételei pedig az{' '}
          <Link to="/aszf" className="text-blue-700 underline hover:text-blue-900">
            ÁSZF-ben
          </Link>
          . Ez az útmutató azoknál nem mond sem többet, sem mást.
        </P>
      </Fejezet>

      <Fejezet id="adatformatumok">
        <P>
          Ez a fejezet az adatszolgáltatásokról szóló (EU) 2023/2854 rendelet (Data Act) 26.
          cikke szerinti tájékoztatás: <strong>milyen formátumban és szerkezetben</strong>{' '}
          vihető el minden adat, ha másik szolgáltatóra vagy saját rendszerre állnál át. A
          váltás menetét és határidőit az{' '}
          <Link to="/aszf" className="text-blue-700 underline hover:text-blue-900">
            ÁSZF 16. pontja
          </Link>{' '}
          írja le; a váltás díjmentes.
        </P>
        <Tablazat fejlec={['Mi', 'Formátum', 'Hogyan']}>
          <Sor
            allapot="Jóváhagyott tételek"
            mit="XLSX (Office Open XML, ISO/IEC 29500), CSV vagy JSON (RFC 8259)"
            dolog="Az Export képernyőről, bármikor, bármennyiszer, időszakra és ügyfélre szűrve."
          />
          <Sor
            allapot="Jóváhagyott tételek, könyvelőprogramba (béta)"
            mit="RLB Kettős: pontosvesszős CSV. Novitax NTAX és Kulcs-Könyvelés: ZIP, benne pontosvesszős szövegfájlok. Windows-1250 kódolás."
            dolog="Az Export képernyőről, a gyártók közzétett leírása szerint. Kényelmi többlet, nem helyettesíti a fenti formátumokat."
          />
          <Sor
            allapot="Eredeti fájlok"
            mit="ZIP, benne a feltöltött fájlok eredeti alakjukban (PDF, JPG, PNG, WEBP, XML)"
            dolog="Az export mellé, amíg a megőrzési idő alatt a szerveren vannak."
          />
          <Sor
            allapot="Minden más adat"
            mit="Egyetlen JSON-állomány, UTF-8"
            dolog="Kérésre, e-mailben: a teljes adatkiadás (lent). Szolgáltatóváltásnál díjmentes."
          />
        </Tablazat>
        <P>
          <strong>A három exportformátum ugyanazokat az oszlopokat viszi</strong>, ugyanabban a
          sorrendben. A dátum mindenhol <code>ÉÉÉÉ-HH-NN</code> (ISO 8601), budapesti nap
          szerint. A <strong>CSV</strong> UTF-8 kódolású (bájtsorrend-jellel), a mezőelválasztó
          pontosvessző, a tizedesjel vessző, a sorvég CRLF – így nyitja meg helyesen a magyar
          Excel. Az <strong>XLSX</strong> a számokat számként tárolja. A <strong>JSON</strong>{' '}
          a számot számként, a hiányzó értéket <code>null</code>-ként adja, és a táblázatos
          oszlopok mellett a bizonylat teljes ÁFA-bontását is tartalmazza (
          <code>afa_bontas</code>), kategóriakóddal.
        </P>
        <Tablazat fejlec={['JSON-kulcs', 'Fejléc (XLSX, CSV)', 'Típus']}>
          {KULCSOK.map((kulcs) => (
            <tr key={kulcs} className="trow">
              <td className="td">
                <code>{kulcs}</code>
              </td>
              <td className="td">{FEJLECEK[kulcs]}</td>
              <td className="td">
                {SZAM_OSZLOPOK.includes(kulcs)
                  ? 'szám'
                  : DATUM_OSZLOPOK.includes(kulcs)
                    ? 'dátum'
                    : 'szöveg'}
              </td>
            </tr>
          ))}
        </Tablazat>
        <P>
          <strong>A teljes adatkiadás</strong> azt is tartalmazza, amit a felületi export nem:
          a még jóváhagyásra váró és a hibára futott bizonylatokat, a kiolvasási futásokat (a
          modell nyers válaszával, amíg az megvan), a javítások naplóját, a cég beállításait, a
          tevékenységnaplót és a beküldött levelek nyilvántartását. Egyetlen JSON-objektum,
          ezekkel a szakaszokkal:
        </P>
        <Tablazat fejlec={['Szakasz', 'Mit tartalmaz']}>
          {ADATKIADAS_SZAKASZOK.map(([nev, mit]) => (
            <tr key={nev} className="trow">
              <td className="td">
                <code>{nev}</code>
              </td>
              <td className="td">{mit}</td>
            </tr>
          ))}
        </Tablazat>
        <P>
          Minden időbélyeg UTC, ISO 8601 alakban; az összegek forintban, a modellhívás
          költsége (<code>cost</code>) dollárban. Két dolog szándékosan kimarad, mert{' '}
          <strong>élő kulcs</strong>: a cég titkos beküldő címe és a meghívók jelei – aki
          ismeri őket, a cég nevében tudna eljárni. A helyükön magyarázó szöveg áll.
        </P>
      </Fejezet>

      <Fejezet id="mi-van-ha">
        <Tablazat fejlec={['Amit látsz', 'Mi történt', 'Mit tegyél']}>
          <Sor
            allapot={'„Hiba” a Beérkezőben'}
            mit="Háromszor sem sikerült kiolvasni: jelszóval védett vagy sérült PDF, üres szkennelés."
            dolog="Nyisd meg a fájlt, és töltsd fel újra. Kreditbe nem került."
          />
          <Sor
            allapot="A számok nem stimmelnek"
            mit="Piros mező, alatta az ellenőrzés mondata. Két különböző dolog lehet mögötte."
            dolog={
              'Ha a kiolvasás olvasta félre a papírt: írd át arra, ami a bizonylaton áll – ' +
              'a jelölés azonnal frissül. Ha viszont maga a bizonylat hibás, azt itt nem ' +
              'lehet megjavítani: az alkalmazásban átírt adat a kibocsátott számlát nem ' +
              'helyesbíti. Ilyenkor a kibocsátótól kell helyesbítő vagy sztornó számlát ' +
              'kérni; hogy addig mi kerüljön a könyvelésbe, azt a könyvelővel egyeztesd.'
            }
          />
          <Sor
            allapot="Nem érkezett meg az e-mailben küldött számla"
            mit="A beküldés ki van kapcsolva, idegen feladó, vagy a melléklet nem feldolgozható típus."
            dolog="A Beállítások → E-mailes beküldés kártya alján ott a levél és az elutasítás oka."
          />
          <Sor
            allapot={'„Elfogyott a havi kereted”'}
            mit="A csomag dokumentumkerete betelt, és a túlhasználat ki van kapcsolva."
            dolog="Válts nagyobb csomagra, vagy kapcsold be a túlhasználatot – plafonnal."
          />
          <Sor
            allapot="Rossz adat ment ki az exportban"
            mit="Az export nem végleges."
            dolog="Az Archívumban hívd vissza a tételt, javítsd, és exportáld újra."
          />
          <Sor
            allapot="Több bizonylat egy fájlban, de nem szedtük szét"
            mit="A határok nem voltak egyértelműek, ezért nem vágtunk vaktában."
            dolog="A kiolvasott adat az első bizonylaté. A többit töltsd fel külön."
          />
        </Tablazat>
      </Fejezet>

      <Fejezet id="kerdes">
        <P>
          Írj nekünk:{' '}
          <a
            href={`mailto:${kapcsolatEmail}`}
            className="text-blue-700 underline hover:text-blue-900"
          >
            {kapcsolatEmail}
          </a>
          . Ha egy bizonylattal van baj, a bizonylatszám és a feltöltés ideje sokat segít.{' '}
          <strong>Az eredeti fájlt ne küldd el</strong> – amíg a rendszerben van, magunk is
          megnézzük. ⚠️ Egy kivétel: az eredetik az <strong>export után törlődnek</strong>{' '}
          (a {pont('archivum')}. pont szerint), tehát egy már exportált bizonylat fájlja lehet,
          hogy nálunk sincs meg. Ha ilyenről kérdezel, és nálad megvan, mellékeld.
        </P>
      </Fejezet>
    </JogiOldal>
  );
}

// ---------------------------------------------------------------------------
// Helyi elemek
// ---------------------------------------------------------------------------

/**
 * A fejezetek — **egyetlen listából** a tartalomjegyzék, a fejezetcímek
 * sorszáma és a szövegközi hivatkozások („lásd az 5. pontot") is.
 *
 * Ez nem esztétika: az első változatban a sorszámokat kézzel írtam a
 * fejezetcímekbe, és a tartalomjegyzékhez képest **már az első összeolvasásra
 * elcsúsztak** — a tartalom 6. tétele az Archívum volt, a cím fölötte 7. Egy
 * útmutató, ami rossz pontra hivatkozik, rosszabb, mint ami nem hivatkozik
 * sehova. Így a számozás nem is tud elcsúszni: a sorrend maga a forrás.
 *
 * A `hosszu` a fejezet fölé kerülő cím, a `cimke` a tartalomjegyzéké — ott egy
 * hosszabb címsor csak nehezebben átfutható listát adna.
 */
const FEJEZETEK = [
  { id: 'elso-lepesek', cimke: 'Az első lépések' },
  { id: 'bekuldes', cimke: 'Hogyan kerül be egy bizonylat' },
  {
    id: 'beerkezo',
    cimke: 'A Beérkező és az állapotok',
    hosszu: 'A Beérkező: mi történik a bizonylattal',
  },
  {
    id: 'ellenorzes',
    cimke: 'Az Ellenőrzés képernyő',
    hosszu: 'Az Ellenőrzés képernyő – itt dolgozol',
  },
  { id: 'tetelek-export', cimke: 'Tételek és Export' },
  { id: 'archivum', cimke: 'Archívum' },
  { id: 'keret', cimke: 'Keret, csomagok, túlhasználat' },
  {
    id: 'beallitasok',
    cimke: 'Beállítások',
    hosszu: 'Beállítások – amit érdemes egyszer végigmenni',
  },
  { id: 'szerepek', cimke: 'Ki mit tehet' },
  { id: 'adatok', cimke: 'Az adataitok', hosszu: 'Az adataitok: hol vannak és meddig' },
  {
    id: 'adatformatumok',
    cimke: 'Adatformátumok',
    hosszu: 'Adatformátumok és szolgáltatóváltás',
  },
  { id: 'mi-van-ha', cimke: 'Mi van, ha…' },
  { id: 'kerdes', cimke: 'Ha valami nem világos' },
] as const;

type FejezetId = (typeof FEJEZETEK)[number]['id'];

/** Egy fejezet sorszáma — a szövegközi hivatkozások innen veszik. */
function pont(id: FejezetId): number {
  return FEJEZETEK.findIndex((f) => f.id === id) + 1;
}

/**
 * A fejezet fölé kerülő cím.
 *
 * A `as const` miatt a lista **unió típus**, aminek nem minden ága ismeri a
 * `hosszu` mezőt — ezért kell a tágabb alak. Cserébe a `FejezetId` szűk marad:
 * egy elgépelt horgonyt a fordító fog meg, nem az olvasó.
 */
function fejezetCim(id: FejezetId): string {
  const fejezet: { cimke: string; hosszu?: string } | undefined = FEJEZETEK.find(
    (f) => f.id === id,
  );

  return fejezet?.hosszu ?? fejezet?.cimke ?? '';
}

/**
 * Tartalomjegyzék.
 *
 * Egy tízperces olvasmányhoz nem kell — **de ez nem egyszer elolvasandó lap**,
 * hanem az, amit valaki munka közben nyit meg, mert az ÁFA-bontásról akar
 * valamit. Annak a görgetés a rossz válasz.
 */
function Tartalom() {
  return (
    <nav className="card card-pad bg-slate-50" aria-label="Tartalom">
      <p className="text-sm font-semibold text-slate-900">Tartalom</p>
      <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {FEJEZETEK.map((f, i) => (
          <li key={f.id} className="text-sm text-slate-700">
            <a href={`#${f.id}`} className="hover:text-blue-700 hover:underline">
              <span className="text-slate-400">{i + 1}.</span> {f.cimke}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Egy fejezet.
 *
 * A `scroll-mt-20` nem díszítés: a keret fejléce **ragadós**, és enélkül a
 * tartalomjegyzékből érkező olvasó a cím helyett a fejléc alá esne.
 */
function Fejezet({ id, children }: { id: FejezetId; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        {pont(id)}. {fejezetCim(id)}
      </h2>
      {children}
    </section>
  );
}

/** Az export dátumoszlopai — a típusoszlop ebből mondja, hogy „dátum". */
const DATUM_OSZLOPOK: readonly string[] = ['kelt', 'teljesites', 'fizetesi_hatarido', 'beerkezes'];

/**
 * A teljes adatkiadás szakaszai (`eszkozok/adatkiadas/adatkiadas.sql`).
 *
 * ⚠️ **Ez a lista nyilvános ígéret** (Data Act 26. cikk: a formátumok és az
 * adatszerkezet online leírása). A `src/oldalak/jogiSzovegek.test.ts` méri,
 * hogy pontosan ugyanazokat a szakaszokat sorolja fel, amiket az SQL előállít
 * — egy új szakasz a lekérdezésben itt is meg kell jelenjen.
 */
const ADATKIADAS_SZAKASZOK: readonly (readonly [string, string])[] = [
  ['kiadas', 'A kiadás fejléce: mikor készült, melyik cégről, a szerkezet verziója'],
  ['ceg', 'A cég törzsadatai és minden beállítása, az előfizetés állapota'],
  ['tagok', 'A cég felhasználói és szerepkörük'],
  ['meghivok', 'A kiküldött meghívók: cím, szerep, kiküldés, lejárat, elfogadás'],
  ['fajlok', 'A feltöltött fájlok nyilvántartása: név, típus, méret, lenyomat, törlés ideje'],
  ['bizonylatok', 'Minden bizonylat, állapottól függetlenül, a kiolvasott mezőkkel'],
  ['kiolvasasok', 'Minden kiolvasási futás: ki olvasta ki, nyers válasz, költség, kredit'],
  ['javitasok', 'Mit írt át ember a gépi kiolvasás után: mező, régi és új érték'],
  ['exportok', 'Az elkészült exportok: formátum, szűrők, tételszám'],
  ['tulhasznalat', 'A kereten felüli felhasználás elszámolása időszakonként'],
  ['beerkezo_levelek', 'A beküldő címre érkezett levelek nyilvántartása (a levél szövege nélkül)'],
  ['naplo', 'A teljes tevékenységnapló'],
  ['aszf_elfogadasok', 'Ki, mikor, az ÁSZF melyik változatát fogadta el'],
  ['konyvelo_beallitasok', 'A könyvelőprogram-export főkönyvi számai és kódjai, cégre és ügyfelekre'],
  ['iktatoszamok', 'A könyvelőprogramoknak kiadott belső sorszám bizonylatonként'],
  ['keret_fedezetek', 'Csomagváltások nyoma: a váltásig felhasznált kredit és a régi csomag'],
  ['darabszamok', 'Soronkénti darabszám szakaszonként, a teljesség ellenőrzéséhez'],
];

/** Háromoszlopos táblázatsor — a három nagy táblázat ugyanazt az alakot viszi. */
function Sor({ allapot, mit, dolog }: { allapot: string; mit: string; dolog: string }) {
  return (
    <tr className="trow">
      <td className="td font-medium whitespace-nowrap text-slate-900">{allapot}</td>
      <td className="td">{mit}</td>
      <td className="td">{dolog}</td>
    </tr>
  );
}

/** Kiemelt figyelmeztetés — a meglévő `alert` osztályokból, új CSS nélkül. */
function Figyelem({ children }: { children: ReactNode }) {
  return <div className="alert alert-figyelem text-sm leading-relaxed">{children}</div>;
}
