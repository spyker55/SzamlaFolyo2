import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { JogiOldal, P, Lista, Tablazat } from './jogi/JogiOldal.tsx';
import { kapcsolatEmail } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { allapotCimke, szerepCimke, SZEREPEK } from '@uzleti/enumok.ts';

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
        először, olvasd végig egyszer — nagyjából tíz perc, és utána minden képernyőn tudni
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
          mindenki a <em>teljes</em> bizonylatállományt látja, a szerepe szerinti jogokkal — nem
          csak azt az ügyfelet, akivel dolgozik. Ha egy ügyfél iratait el kell különíteni a
          többitől, ahhoz külön cég (és külön előfizetés) kell. Adatvédelmi oldalról is érdemes
          tudni: amikor az ügyfeled megbízásából dolgozol, <em>te</em> vagy az ő adatfeldolgozója,
          és a SzámlaFolyó al-adatfeldolgozó — ehhez az ügyfél felhatalmazása kell. A részletek az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontjában
          </Link>{' '}
          állnak.
        </Figyelem>
        <P>
          <strong>Kollégák meghívása.</strong> A Beállítások → <em>Tagok</em> kártyáján
          e-mail-címre szól a meghívó; a meghívott a levélben kapott linken nyit fiókot, vagy
          ha már van neki, azzal lép be. Hogy ki mit tehet, azt a szerepe dönti el — a{' '}
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
            APEH-alak). A <strong>hibrid e-számlát</strong> — azt a PDF-et, amibe a kibocsátó az
            XML-t is beletette (Factur-X, ZUGFeRD) — magától felismerjük, és a beágyazott
            XML-ből olvassuk ki: neked ugyanúgy egy PDF-et kell feltöltened.
          </li>
          <li>
            Méret: legfeljebb <strong>{Math.round(szamlafolyo.feltoltes.maxBajt / 1024 / 1024)} MB</strong>{' '}
            fájlonként.
          </li>
          <li>
            A fájl típusát a <strong>tartalmából</strong> állapítjuk meg, nem a kiterjesztésből
            — egy rosszul elnevezett fájl is bekerül, ha egyébként jó.
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
          tartományon — a Beállítások → <em>E-mailes beküldés</em> kártyán kapcsolható be, és ott
          is másolható ki. Amit oda küldesz, az úgy kerül a Beérkezőbe, mintha feltöltötted
          volna.
        </P>
        <Figyelem>
          <strong>A beküldő cím titok.</strong> Nincs rajta jelszó: aki ismeri, a ti
          keretetekből költ. Ne tedd ki weboldalra vagy nyilvános aláírásba. Ha mégis
          kiszivárgott, a Beállításokban egy gombbal lecserélhető — a régi cím azonnal
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
            Ha a levélben van PDF vagy XML, a <strong>képekhez hozzá sem nyúlunk</strong> — így
            az aláírásban ülő céglogóból nem lesz bizonylat.
          </li>
          <li>
            Egy levélből legfeljebb <strong>{szamlafolyo.bekuldes.maxMelleklet}</strong>{' '}
            mellékletet dolgozunk fel.
          </li>
          <li>
            <strong>A feladó nem kap választ.</strong> Hogy mi lett egy levéllel — átment,
            vagy miért nem —, azt a Beállítások ugyanezen kártyáján, a lap alján látod.
          </li>
        </Lista>
        <Figyelem>
          <strong>A beküldő cím olyan, mint egy kulcs: aki ismeri, a te keretedből költ.</strong>{' '}
          Ne tedd ki nyilvános helyre, és ne írd bele körlevélbe. Alapesetben csak a cég
          tagjainak címéről fogadunk el levelet — ez átállítható „bárkitől" állásba, de tudd,
          hogy a feladómező hamisítható, tehát ez a szűrés a véletlen ellen véd (hírlevél,
          automata válasz), nem a szándékos visszaélés ellen. Ha a cím kiszivárog, a Beállítások
          kártyáján <strong>cseréld le</strong> — a régi cím azonnal érvénytelen lesz.
        </Figyelem>
      </Fejezet>

      <Fejezet id="beerkezo">
        <P>
          A feltöltés után a bizonylat sorba áll, és magától végigmegy a feldolgozáson. Nincs
          „indítás" gomb; a Beérkező listája frissül, ahogy halad. Ami valamelyik állapotban
          megakad, az ott is marad láthatóan — nem tűnik el csendben.
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
            dolog={`Igen — ez a ${pont('ellenorzes')}. pont.`}
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
          <strong>Ha egy fájlban több bizonylat van</strong> — mert egyben szkennelted be a havi
          paksamétát —, a rendszer megkeresi a határokat, és{' '}
          <strong>külön bizonylatot csinál mindegyikből</strong>, oldalszám szerint. A fájlt nem
          vágjuk szét, csak megjegyezzük, melyik bizonylat hol áll benne. A szétszedés maga nem
          kerül külön kreditbe.
        </P>
      </Fejezet>

      <Fejezet id="ellenorzes">
        <P>
          Ez a rendszer szíve. Bal oldalon az eredeti bizonylat, jobb oldalon a kiolvasott
          adatok. A feladatod nem az, hogy mindent begépelj, hanem hogy{' '}
          <strong>megnézd, amit megjelöltünk</strong>.
        </P>
        <P>
          <strong>A mezők színe azt mondja meg, mennyire bízunk az adatban:</strong>
        </P>
        <Lista>
          <li>
            <strong>Jelöletlen</strong> — magabiztos kiolvasás, és minden ellenőrzés rendben.
            Nem azt jelenti, hogy biztosan jó; azt, hogy nincs okunk gyanakodni.
          </li>
          <li>
            <strong>Sárga</strong> — bizonytalan. Vesd össze a papírral.
          </li>
          <li>
            <strong>Piros</strong> — vagy nagyon bizonytalan a kiolvasás, vagy{' '}
            <strong>megbukott egy ellenőrzés</strong>. A mező alatt ott a mondat, hogy mi a baj.
          </li>
          <li>
            <strong>Szürke, „nincs adat"</strong> — ezt a mezőt nem találtuk a bizonylaton. Ez
            nem hiba: egy nyugtán nincs vevő adószáma.
          </li>
        </Lista>
        <P>
          <strong>Az ellenőrzések számtaniak, nem gépi sejtések.</strong> Azt nézik, hogy a
          bizonylat magával összhangban van-e: kiadja-e a nettó és az ÁFA a bruttót, stimmel-e
          a tételsorok összege, érvényes-e az adószám ellenőrző számjegye, nem későbbi-e a
          teljesítés a keltnél. Ha egy ilyen megbukik, az vagy kiolvasási hiba, vagy{' '}
          <strong>a bizonylaton van eltérés</strong> — és a kettő közül a másodikat is jó időben
          megtudni. A jelzés <strong>vizsgálandó eltérés, nem ítélet</strong>: a keltnél későbbi
          teljesítés például teljesen szabályos lehet (időszakos elszámolásnál rendszeres is),
          csak érdemes ránézni. A jelölés <strong>élő</strong>: ha átírsz egy számot, az ellenőrzés azonnal
          újrafut a javított értékkel.
        </P>
        <Figyelem>
          <strong>A neveket senki nem tudja ellenőrizni.</strong> Összeget, dátumot, adószámot
          számtan fog meg; egy szállítónevet semmi. Kézzel írott vagy rosszul szkennelt
          bizonylatnál ezért a rendszer külön figyelmeztet, és olyankor{' '}
          <strong>a jelöletlen mezőket is</strong> érdemes végigfutni — különösen a neveket.
        </Figyelem>
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
          Nem ellenőrzésképpen: ebből derül ki, hol pontatlan a kiolvasás — ez az egyetlen
          visszajelzés, amiből a rendszer javítható.
        </P>
      </Fejezet>

      <Fejezet id="tetelek-export">
        <P>
          A <strong>Tételek</strong> képernyőn a jóváhagyott, még ki nem exportált bizonylatok
          állnak. Innen vissza lehet küldeni egyet javításra. Az export sem zárja le véglegesen:
          egy kiment tétel az Archívumból <strong>visszahívható</strong>, javítható és újra
          exportálható (lásd a {pont('archivum')}. pontot). Ami az exporttal{' '}
          <strong>tényleg elindul</strong>, az az eredeti fájl órája — a bizonylat képe a
          megőrzési idő után nem hívható vissza.
        </P>
        <P>
          Az <strong>Export</strong> képernyőn választod ki, mi menjen ki. Szűrni lehet
          beérkezési dátumra, bizonylattípusra és <strong>ügyfélre</strong>. Az ügyfélszűrő az{' '}
          <strong>adószám törzsszáma</strong> (az első nyolc jegy) szerint dolgozik, tehát akkor
          is összetartja egy ügyfél bizonylatait, ha a cégnév írásmódja bizonylatonként
          különbözik — és a kiválasztott ügyfél <strong>bejövő és kimenő</strong> bizonylatait
          egyaránt hozza.
        </P>
        <Lista>
          <li>
            Formátum: <strong>xlsx</strong> (Excel), <strong>csv</strong> vagy{' '}
            <strong>json</strong>. A pénzoszlopok számként, az Excel saját nyelvi beállítása
            szerinti formátumban — a dátumok szándékosan szöveges ISO alakban (
            <code className="rounded bg-slate-100 px-1">2026-09-20</code>), mert azt semmilyen
            táblázatkezelő nem írja át.
          </li>
          <li>
            Export előtt látod, <strong>hány tétel</strong> kerül bele, és pénznemenként a
            nettó/ÁFA/bruttó összeget — érdemes ránézni, mielőtt kimegy.
          </li>
          <li>
            Az <strong>eredeti fájlok</strong> (a PDF-ek és képek) egy gombbal ZIP-ben
            letölthetők. Ez külön művelet az exporttól, és érdemes vele élni: lásd a következő
            figyelmeztetést.
          </li>
        </Lista>
        <Figyelem>
          <strong>Az export lezárja a tételeket, és elindítja az eredeti fájlok óráját.</strong>{' '}
          Ami kiment, az az Archívumba kerül, és az eredeti PDF-ek a beállított megőrzési idő
          (alapból <strong>0 nap</strong>, vagyis azonnal) után törlődnek a szerverről. Az{' '}
          <strong>adatok megmaradnak</strong>, a bizonylat képe viszont nem hívható vissza. A
          megőrzési kötelezettség a tiéd — ha kell a papír képe, <strong>töltsd le a ZIP-et az
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
          törlődik, de <strong>a tételek megmaradnak</strong> — a Tételekből bármikor
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
          {szamlafolyo.proba.dokumentumok} dokumentum</strong> — amelyik előbb elfogy —,{' '}
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
          ne álljon meg, a Beállításokban bekapcsolható a túlhasználat — és{' '}
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
          van — ott lehet másik csomagot választani. Ugyanezen a lapon áll a lemondás, a
          bankkártya cseréje és a korábbi számláid letöltése. Amit ott módosítasz, az pár
          másodpercen belül a Beállításokon is látszik.
        </P>
        <P>
          <strong>A csomagváltás nem indítja újra a számlázási ciklust</strong>, és nem terhelünk
          érte azonnal semmit: a fordulónap marad, ahol volt, és külön számlát sem kapsz róla. A{' '}
          <strong>keret viszont azonnal változik</strong> — nagyobb csomagra váltva rögtön több,
          kisebbre váltva rögtön kevesebb.
        </P>
        <P>
          A pénzt a <strong>következő havi számla</strong> rendezi, napra arányosan, és{' '}
          <strong>mindkét irányban</strong>. Nagyobb csomagra váltva a hátralévő napok
          különbözete külön soron jelenik meg rajta; kisebbre váltva a már kifizetett, de fel nem
          használt rész <strong>jóváírásként jön vissza</strong> — szintén külön soron. Aki
          meggondolja magát és visszavált, annál a sorok kiejtik egymást: a váltogatás nem kerül
          semmibe.
        </P>
        <Figyelem>
          <strong>Kisebb csomagra váltva a keret azonnal szűkül.</strong> Ha a hónapban addigra
          már több bizonylatot dolgoztál fel, mint amennyi az új csomagba fér, a váltás
          pillanatában kereten kívülre kerülsz — onnantól a következő fordulónapig várnak a
          bizonylatok, hacsak be nem kapcsolod a túlhasználatot. A pénzzel nincs baj: a
          különbözet jóváíródik. Az idővel van: a keret nem.
        </Figyelem>
        <P>
          A lemondás a <strong>kifizetett időszak végéig</strong> hagyja használni a rendszert, és
          a fordulónapig <strong>visszavonható</strong> — szintén a portálon. Amíg a lemondás él,
          a Beállítások kiírja, meddig fut még az előfizetés.
        </P>
      </Fejezet>

      <Fejezet id="beallitasok">
        <Tablazat fejlec={['Kártya', 'Mit állít', 'Alapérték']}>
          <Sor
            allapot="A cég"
            mit="Cégnév és adószám — ez szerepel az exporton."
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
            dolog="Kikapcsolva — minden bizonylat rád vár."
          />
          <Sor
            allapot="Eredeti fájlok megőrzése"
            mit={`Hány napig maradjon meg az eredeti PDF az export után (0–${szamlafolyo.megorzes.maxNap} nap).`}
            dolog="0 nap — az export után azonnal törlődik."
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
          jóváhagyható bizonylatot elédteszünk — hogy legyen mihez mérni. Az így átment bizonylat{' '}
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
            <strong> nincs tartalék útvonal</strong> meg nem nevezett szolgáltatóhoz. Az e-számla
            XML-je fel sem megy: azt a rendszer helyben olvassa ki — és ez a hibrid e-számlára
            is áll, ahol az XML a PDF-be van ágyazva.
          </li>
          <li>
            A <strong>fiók és a cég törlése</strong> a Beállításokból indítható, és
            visszafordíthatatlan. Az egyedüli tulajdonos addig nem törölhet, amíg más is
            dolgozik a cégben — előbb át kell adni a tulajdonosi szerepet vagy el kell távolítani
            a tagokat.
          </li>
        </Lista>
        <P>
          A részletek — jogalap, adatfeldolgozók, a kiolvasás útja — az{' '}
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
              'Ha a kiolvasás olvasta félre a papírt: írd át arra, ami a bizonylaton áll — ' +
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
            dolog="Válts nagyobb csomagra, vagy kapcsold be a túlhasználatot — plafonnal."
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
          . Ha egy bizonylattal van baj, a bizonylatszám és a feltöltés ideje sokat segít — a
          fájlt <strong>ne</strong> küldd el levélben, az a rendszerben úgyis megvan.
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
    hosszu: 'Az Ellenőrzés képernyő — itt dolgozol',
  },
  { id: 'tetelek-export', cimke: 'Tételek és Export' },
  { id: 'archivum', cimke: 'Archívum' },
  { id: 'keret', cimke: 'Keret, csomagok, túlhasználat' },
  {
    id: 'beallitasok',
    cimke: 'Beállítások',
    hosszu: 'Beállítások — amit érdemes egyszer végigmenni',
  },
  { id: 'szerepek', cimke: 'Ki mit tehet' },
  { id: 'adatok', cimke: 'Az adataitok', hosszu: 'Az adataitok: hol vannak és meddig' },
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
