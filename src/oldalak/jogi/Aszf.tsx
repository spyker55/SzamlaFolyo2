import { Link } from 'react-router-dom';
import { JogiOldal, Lista, P, Szakasz, Tablazat } from './JogiOldal.tsx';
import { szolgaltato } from './adatok.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { oldalakbol, szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';

/**
 * Általános Szerződési Feltételek.
 *
 * # A három érdemi tartalmi változás
 *
 * A szöveg nagyrészt szó szerint jön a régi rendszerből. Három ponton viszont
 * **a termék változott meg**, és az ÁSZF nem maradhat a régi terméké:
 *
 * 1. **3. és 4. pont — a gépi jóváhagyás.** A régi szöveg azt írta, hogy „a
 *    rendszer minden tétel emberi jóváhagyását kéri". Egy ideig ez az ÁSZF az
 *    ellenkezőjét mondta, mert a gépi jóváhagyás alapértelmezés volt — **ez
 *    megfordult**: alapból minden bizonylat jóváhagyásra vár, a gépi
 *    jóváhagyás pedig kifejezetten bekapcsolható lehetőség
 *    (`20260915000100_auto_jovahagyas_alapbol_ki.sql`). A 3. pont ezt így
 *    mondja, a 4. pedig azt, hogy **a felelősség a bekapcsolással sem költözik
 *    át**.
 * 2. **8. pont — a kredit a bizonylatra szól, nem a fájlra.** A régi rendszer
 *    hibája az volt, hogy a köteg oldalarányosan fogyasztott, aztán az ember
 *    szétvágva újra feltöltötte, és **másodszor is fizetett**. A szétszedés
 *    innentől a szolgáltatás része, és nem kerül külön kreditbe.
 * 3. **5. és 10. pont — a fiók törlése.** Sokáig e-mailes kérelem volt, mert a
 *    felületről indítható törlés nem készült el — a szöveg akkor is azt mondta,
 *    ami igaz. **2026. szeptember 20-án elkészült** (`/fiok-torles`), tehát
 *    ezek a pontok most a valódi működést írják le: azonnali, a felületről
 *    indított, visszavonhatatlan törlés.
 *
 * A számok mind a configból jönnek (`config/szamlafolyo.ts`). Egy ÁSZF-ben
 * kézzel beírt ár az a fajta adat, ami csendben elavul.
 *
 * ⚠️ A formázás a repó saját `formaz()`-ával megy, **nem** a
 * `toLocaleString('hu-HU')`-val. Ez mérésből derült ki: a fejléc nélküli
 * Chromiumban a `toLocaleString` nem csoportosított (`4900 Ft` jött ki
 * `4 900 Ft` helyett), mert az ICU-adatok hiányoznak. Egy jogi szöveg számai
 * ne függjenek attól, milyen böngészővel nyitják meg — a `formaz()` saját
 * csoportosítót használ, és egyben ugyanúgy néz ki, mint az alkalmazásban.
 *
 * # 2026. szeptember 20. — jogi felülvizsgálat, első kör
 *
 * Egy külső átnézés huszonkét pontot talált. Amit az ÁSZF-ben átírt:
 *
 * - **1–2. pont:** eddig nem derült ki, *kivel* jön létre a szerződés és
 *   *mikor*. Most: a szerződő fél a vállalkozás, a szerződés a cég
 *   létrehozásával jön létre, a fizetős előfizetés ettől külön lépés, és a
 *   később meghívott munkatárs nem köt önálló szerződést. A békéltetés
 *   kizárása kikerült: nem a vállalkozói státusz dönti el, hanem a
 *   fogyasztóvédelmi törvény KKV-fogalma.
 * - **8. pont:** kimondtuk, hogy **az e-számla XML is a keretbe számít**. A
 *   nyitólap „ingyen" szava a modellköltségre igaz, a darabkeretre nem — ez
 *   volt a felülvizsgálat 9. pontja, és mérve is így van (a kredit az
 *   oldalszámból jön, nem a kiolvasás módjából). Mellé három példa.
 * - **9. pont:** szétvált a három művelet, amit eddig egy bekezdés kezelt:
 *   az előfizetés lemondása, egy fiók törlése és a teljes céges környezet
 *   törlése. Bekerült a csomagváltás azonnali keretcsökkenése, a Billingo
 *   általi számlázás, és az, hogy a megszűnt előfizetés záró időszakának
 *   túlhasználatát nem számlázzuk ki. A „nincs visszatérítés" szabály többé
 *   **nem terjed ki** a Szolgáltató hibás teljesítésére.
 * - **11. pont:** a könyvelőirodás eset (az Előfizető adatfeldolgozó, mi
 *   al-adatfeldolgozók), a jogellenes utasítás jelzésének vállalása, a
 *   bővített adatkör (munkavállalói költségbizonylat, nyers modellválasz,
 *   javítási napló) és a megszűnéskori törlés: a visszaadás és a törlés nem
 *   vagylagos, hanem egymás után következik.
 * - **12–13. pont:** a felelősség négy esetre bomlik, és a közreműködők
 *   hibája nem általános mentesülés. Az adatvédelmi felelősséget a
 *   hathavi díjhoz kötött korlát **nem** érinti.
 * - **15–17. pont:** a módosítás elutasítása valódi kilépési utat kapott
 *   (a felmondás a hatálybalépés napján hatályosul, időarányos
 *   visszatérítéssel), és új pont szól az adatkimentésről és a
 *   szolgáltatóváltásról.
 *
 * ⚠️ A pontok **átszámozódtak** a 15. után: a régi „16. Alkalmazandó jog"
 * a 17. lett, és közé került a 16. Adatkimentés. Aki ide hivatkozást ír,
 * nézze meg a számot — az Adatkezelési tájékoztató az ÁSZF 11. pontjára
 * mutat, az nem mozdult.
 *
 * # 2026. szeptember 21. — a beágyazott XML
 *
 * A 8. pont eddig azt írta, hogy a PDF-be ágyazott e-számla XML-t a
 * Szolgáltatás **nem bontja ki**, a PDF-et dolgozza fel. Ez a mondat akkor
 * igaz volt, és a hibrid e-számla (Factur-X, ZUGFeRD) felismerésével
 * valótlanná vált — ezért egy körben változott a kóddal, nem utána.
 *
 * A keretszabály **nem** változott, és ez a lényeg: a hibrid bizonylat
 * ugyanúgy egy dokumentum, akár az XML-jéből, akár a PDF-jéből olvastuk ki.
 * Csak a modellköltségünk tűnik el — az Előfizető számlája nem.
 */
export function Aszf() {
  const mb = Math.round(szamlafolyo.feltoltes.maxBajt / (1024 * 1024));
  const exportNap = szamlafolyo.megorzes.exportNap;
  const maxNap = szamlafolyo.megorzes.maxNap;
  // Egy hosszú, de egyetlen bizonylat — a példa a szabályt mutatja, nem a számot.
  const peldaOldal = 12;

  return (
    <JogiOldal cim="Általános Szerződési Feltételek">
      <Szakasz cim="1. A Szolgáltató és a szerződés létrejötte">
        <P>
          A SzámlaFolyó szolgáltatást <strong>{szolgaltato.nev}</strong> (a továbbiakban:
          Szolgáltató) nyújtja. A Szolgáltató azonosító adatai és elérhetőségei az{' '}
          <Link to="/impresszum" className="underline">
            Impresszumban
          </Link>{' '}
          találhatók.
        </P>
        <P>
          <strong>Ki a szerződő fél.</strong> A szerződés a Szolgáltató és{' '}
          <strong>az a vállalkozás</strong> között jön létre, amelynek nevében és adószámával a
          cég a rendszerben létrejön — nem a regisztráló természetes személlyel. A céget létrehozó
          felhasználó a cégalapítással kijelenti, hogy e vállalkozás képviseletére jogosult, vagy
          a szerződés megkötésére felhatalmazással rendelkezik.
        </P>
        <P>
          <strong>Mikor jön létre.</strong> A regisztráció önmagában fiókot hoz létre; a
          szerződés a <strong>cég létrehozásával</strong> jön létre, amikor a felhasználó a jelen
          ÁSZF-et és az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztatót
          </Link>{' '}
          elfogadva megadja a cég nevét és adószámát. A fizetős előfizetés ettől külön lépés: az
          a csomag kiválasztásával és a fizetés teljesítésével jön létre, a 7. és 9. pont szerint.
        </P>
        <P>
          <strong>A megrendelés lépései és az adatok javítása.</strong> A cégalapítás és a
          csomagválasztás előtt a megadott adatok a képernyőn láthatók és az elküldés előtt
          szabadon javíthatók; az adószámot a rendszer ellenőrzi, és hibás adószámmal a cég nem
          jön létre. A cég létrejöttéről és az előfizetés megrendeléséről a Szolgáltató
          elektronikus visszaigazolást ad.
        </P>
        <P>
          <strong>A később meghívott munkatárs</strong> a meghívó elfogadásával{' '}
          <strong>nem köt önálló szerződést</strong>: a cég nevében eljáró felhasználóként kap
          hozzáférést, a szerepköréhez tartozó jogokkal. A jelen ÁSZF-et a cég képviseletében
          eljáró tulajdonos fogadta el; a munkatársra az abban foglalt használati szabályok a cég
          felhasználójaként irányadók.
        </P>
        <P>
          <strong>A szerződés nyelve magyar.</strong> A szerződést a Szolgáltató nem iktatja
          külön okiratként, az utóbb nem kereshető elő; a jelen ÁSZF mindenkor hatályos szövege
          azonban ezen az oldalon elérhető, onnan menthető és kinyomtatható, és a Szolgáltató
          nyilvántartja, hogy az Előfizető <strong>melyik időpontban</strong> fogadta el. A
          hatálybalépés napja a lap tetején szerepel.
        </P>
      </Szakasz>

      <Szakasz cim="2. A Szolgáltatás kizárólag vállalkozásoknak szól">
        <P>
          A Szolgáltatást kizárólag a Polgári Törvénykönyv szerinti vállalkozások — gazdasági
          társaságok, egyéni vállalkozók és egyéb, önálló foglalkozásuk vagy gazdasági
          tevékenységük körében eljáró személyek — vehetik igénybe. A felhasználó a
          cégalapítással kijelenti, hogy vállalkozásként, gazdasági tevékenysége körében jár el.
        </P>
        <P>
          Ezt a rendszer is számon kéri: cég létrehozásához érvényes magyar adószám szükséges.{' '}
          <strong>Ez azonban csak formai ellenőrzés</strong> — az adószám ellenőrző számjegyének
          helyessége nem bizonyítja sem azt, hogy a vállalkozás működik, sem azt, hogy a
          regisztráló képviseletére jogosult.
        </P>
        <P>
          A szerződés ennek megfelelően <strong>nem fogyasztói szerződés</strong>, és a
          fogyasztókat megillető elállási jog nem alkalmazandó. A Szolgáltató a hozzá érkező
          panaszokat a 17. pont szerint kivizsgálja.{' '}
          <strong>
            Ha az Előfizető a fogyasztóvédelmi szabályok szerint békéltető testületi eljárásra
            jogosultnak minősül
          </strong>{' '}
          — a hatályos fogyasztóvédelmi törvény bizonyos kis- és középvállalkozásokat is e körbe
          von —, e jogát a jelen ÁSZF nem korlátozza; az illetékes békéltető testület a
          Szolgáltató székhelye szerinti kereskedelmi és iparkamara mellett működik.
        </P>
      </Szakasz>

      <Szakasz cim="3. A Szolgáltatás tartalma">
        <P>
          A SzámlaFolyó bejövő számlákat és egyéb bizonylatokat olvas ki gépi úton, és könyvelésre
          alkalmas formában ad tovább. A Szolgáltatás keretében az Előfizető:
        </P>
        <Lista>
          <li>bizonylatokat tölthet fel a böngészőből;</li>
          <li>
            a cég saját, titkos beküldő címére <strong>e-mailben is küldhet</strong> bizonylatot;
            ez a lehetőség alapból ki van kapcsolva, és a cég tulajdonosa kapcsolhatja be.
            Alapesetben csak a cég felhasználóinak címéről érkező levelet fogadjuk el; ez is
            átállítható. Az e-mailben érkezett bizonylat ugyanúgy számít a darabkeretbe, mint a
            feltöltött;
          </li>
          <li>
            a kiolvasott adatokat egy ellenőrző képernyőn átnézheti és javíthatja — a rendszer
            megjelöli azokat a mezőket, amelyekben bizonytalan;
          </li>
          <li>
            a jóváhagyott tételeket XLSX, CSV vagy JSON formátumban exportálhatja, szűrve
            időszakra és vevő adószámára;
          </li>
          <li>az eredeti fájlokat az export mellé ZIP-ben letöltheti.</li>
        </Lista>
        <P>
          Feltölthető fájltípusok: PDF, JPG, PNG, WEBP, valamint e-számla XML (UBL,
          Factur-X/ZUGFeRD CII). Egy fájl mérete legfeljebb {mb} MB.
        </P>
        <P>
          <strong>
            A kiolvasott bizonylatok emberi jóváhagyásra várnak: alapértelmezés szerint minden
            bizonylat az Ellenőrzés képernyőre kerül, és exportálni csak jóváhagyás után lehet.
          </strong>{' '}
          Az Előfizető a Beállítások képernyőn ettől eltérhet: bekapcsolhatja a gépi
          jóváhagyást, és ettől a minden gépi ellenőrzésen átmenő bizonylat emberi jóváhagyás
          nélkül is továbbmehet. Ez a lehetőség <strong>alapból ki van kapcsolva</strong>, és
          bekapcsolva sem jelent láthatatlanságot: az így átengedett bizonylat megjelölve és
          rövid indokkal jelenik meg, és az exportig visszahívható javításra. A Szolgáltatás
          soha nem állítja egy bizonylatról, hogy ellenőrizte, ha azt ember nem nézte meg. A
          működés részleteit az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 6. pontja
          </Link>{' '}
          írja le.
        </P>
        <P>
          A kiolvasást a Szolgáltató által választott, külső mesterséges intelligencia
          modellszolgáltató végzi. Ennek adatvédelmi vonatkozásait az Adatkezelési tájékoztató
          tartalmazza. Az e-számla XML feldolgozása modellhívás nélkül történik.
        </P>
      </Szakasz>

      <Szakasz cim="4. Amit a Szolgáltatás nem nyújt">
        <P>
          <strong>A gépi kiolvasás eredménye tervezet, nem kész könyvelési adat.</strong> A
          Szolgáltató nem vállal szavatosságot a kiolvasott adatok helyességéért vagy
          teljességéért.
        </P>
        <P>
          <strong>
            Az adat helyességéért — és mindazért, ami abból a könyvelésben, a bevallásokban vagy
            máshol következik — az Előfizető felel.
          </strong>{' '}
          Ez akkor is így van, ha az Előfizető bekapcsolta a 3. pont szerinti gépi jóváhagyást,
          és a bizonylat emberi ellenőrzés nélkül ment át: a gépi jóváhagyás a munkát könnyíti,
          a felelősséget nem veszi át. A gépi jóváhagyás alapból ki van kapcsolva, bekapcsolása
          az Előfizető döntése, és bármikor visszakapcsolható; a jóváhagyott tételek az exportig
          visszahívhatók javításra.
        </P>
        <P>
          <strong>Az e-mailben történő beküldés kézbesítéséért a Szolgáltató nem felel.</strong>{' '}
          Az elektronikus levél útja a Szolgáltató érdekkörén kívül esik: a levél elveszhet,
          késhet, vagy levélszemétként elakadhat a küldő vagy a továbbító oldalán. A Szolgáltató
          azokat a leveleket dolgozza fel, amelyek hozzá megérkeznek, és minden ilyen levél
          sorsát — az elutasítottakét is, az elutasítás okával együtt — megmutatja a Beállítások
          képernyőn. <strong>A feladónak viszont nem küld választ:</strong> a küldő nem kap
          visszajelzést arról, hogy a levele feldolgozásra került-e. Annak ellenőrzése, hogy egy
          beküldött bizonylat megérkezett-e, az Előfizető feladata.
        </P>
        <P>
          A Szolgáltatás nem minősül könyvelési, adótanácsadási vagy jogi szolgáltatásnak, és nem
          helyettesíti a könyvelő munkáját.
        </P>
      </Szakasz>

      <Szakasz cim="5. A fiók, a cég és a felhasználók">
        <P>
          Egy fiókhoz egy cég tartozik, egy darabkerettel. A céget létrehozó felhasználó a
          tulajdonos: ő hívhat meg további felhasználókat, ő módosíthatja a beállításokat és az
          előfizetést. A meghívott felhasználók a szerepkörük szerinti jogokat kapják.
        </P>
        <P>
          A belépési adatok megőrzése az Előfizető felelőssége; a fiókjában végzett műveletekért
          az Előfizető felel.
        </P>
        <P>
          A fiók törlése a Beállítások képernyőről indítható, és azonnal hatályos; ha bármi
          elakad, a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen is kérhető. A cég adatai akkor szűnnek meg, ha a cégnek nem marad felhasználója;
          amíg más felhasználó dolgozik benne, a kilépő fiók törlése a cég adatait és az
          előfizetést nem érinti. A cég egyetlen
          tulajdonosának fiókja addig nem törölhető, amíg a cégben más felhasználó van — előbb
          másik tulajdonost kell kijelölni, vagy a többi felhasználót el kell távolítani.
        </P>
      </Szakasz>

      <Szakasz cim="6. Próbaidő">
        <P>
          A regisztrációt követően {szamlafolyo.proba.napok} napos, bankkártya megadása nélküli
          próbaidő jár, amely alatt legfeljebb {szamlafolyo.proba.dokumentumok} dokumentum
          dolgozható fel, és legfeljebb {szamlafolyo.proba.felhasznalok} felhasználó vehető fel. A
          próbaidőt a kettő közül az zárja le, amelyik előbb elfogy. A próbaidő automatikusan
          megszűnik, fizetési kötelezettséget nem keletkeztet.
        </P>
      </Szakasz>

      <Szakasz cim="7. Csomagok és díjak">
        <Tablazat
          fejlec={['Csomag', 'Havi díj', 'Dokumentum / hó', 'Felhasználó', 'Extra dokumentum']}
        >
          {csomagSorrend.map((kulcs) => {
            const cs = szamlafolyo.csomagok[kulcs];

            return (
              <tr key={kulcs} className="trow">
                <td className="td">{cs.nev}</td>
                <td className="td">{formaz(cs.arHavi, 'Ft')}</td>
                <td className="td">{cs.dokumentumok}</td>
                <td className="td">{cs.felhasznalok ?? 'korlátlan'}</td>
                <td className="td">{cs.extraFt} Ft</td>
              </tr>
            );
          })}
        </Tablazat>
        <P>
          A Szolgáltató alanyi adómentes, ezért a feltüntetett díjak áfát nem tartalmaznak, és
          azok a fizetendő végösszegek.
        </P>
        <P>
          Az előfizetés <strong>havi</strong> díjfizetésű; éves konstrukció nincs. A darabkeret
          mindig az aktuális számlázási időszakra szól, és a következő időszakra{' '}
          <strong>nem gördül át</strong>.
        </P>
      </Szakasz>

      <Szakasz cim="8. Darabkeret, kredit és túlhasználat">
        <P>
          <strong>A keret mértékegysége a bizonylat, nem a fájl</strong>, és nem számít, hogy a
          fájl feltöltéssel vagy a cég beküldő címére küldött levél mellékleteként érkezett. Ha
          egy fájl több bizonylatot tartalmaz, a rendszer szétszedi őket, és mindegyik külön
          számít — de{' '}
          <strong>a szétszedés maga nem kerül külön kreditbe</strong>, az a Szolgáltatás része.
        </P>
        <P>
          A keret felhasználását a rendszer bizonylatonként, oldalarányosan méri, mert egy
          sokoldalas bizonylat feldolgozása nem ugyanannyi munka, mint egy egyoldalas nyugta. A
          szabály: <strong>{szabaly()}</strong> Ha egy irat oldalszáma nem állapítható meg, egy
          dokumentumnak számít.
        </P>
        <P>Három példa, hogy a szabály ne maradjon elvont:</P>
        <Lista>
          <li>
            <strong>Egy szokásos, egy–három oldalas számla:</strong> {oldalakbol(3)} dokumentum.
          </li>
          <li>
            <strong>Egy {peldaOldal} oldalas számla:</strong> {oldalakbol(peldaOldal)} dokumentum —
            ez <em>egy</em> bizonylat, csak hosszú.
          </li>
          <li>
            <strong>Tíz darab egyoldalas számla egyetlen PDF-ben:</strong> a rendszer külön
            bizonylatokra bontja, tehát <strong>{10 * oldalakbol(1)} dokumentum</strong>. A
            szétbontás maga nem kerül külön kreditbe, de a benne lévő bizonylatok külön-külön
            igen — ahogy akkor is, ha egyesével töltötted volna fel őket.
          </li>
        </Lista>
        <P>
          <strong>Az e-számla XML ugyanúgy a keretbe számít.</strong> Az ilyen iratot a rendszer
          modellhívás nélkül, saját értelmezővel olvassa ki — ez gyorsabb és a Szolgáltatónak
          nincs mesterséges intelligencia költsége —, de a keret szempontjából{' '}
          <strong>ugyanannyi, mint bármelyik másik bizonylat</strong>, és túlhasználati díja is
          ugyanúgy lehet. Ahol a Szolgáltatás kommunikációja az XML-ről azt írja, hogy
          „ingyenes" vagy „modellhívás nélkül", az a <em>modellköltségre</em> vonatkozik, nem a
          darabkeretre.
        </P>
        <P>
          Ha a rendszer egy XML-t nem ismer fel — mert olyan formátumban készült, amit az
          értelmezői nem kezelnek —, a bizonylat a szokásos gépi kiolvasás útjára kerül. Ez a
          keret szempontjából nem jelent különbséget. Ugyanez vonatkozik a{' '}
          <strong>hibrid e-számlára</strong> (Factur-X, ZUGFeRD), amelynél a PDF mellé az
          e-számla XML is be van ágyazva: a Szolgáltatás ilyenkor a beágyazott XML-t dolgozza
          fel, ha felismeri, egyébként a PDF-et. A keretbe mindkét esetben egy bizonylatként
          számít.
        </P>
        <P>
          A keret kimerülése után a feldolgozás <strong>alapértelmezés szerint megáll</strong>. Az
          Előfizető tulajdonosa külön engedélyezheti a kereten felüli feldolgozást; ilyenkor az e
          feletti dokumentumok a csomaghoz tartozó darabáron kerülnek kiszámlázásra. Az engedély
          nem nyitott végű: forintban meghatározott felső határ tartozik hozzá, amelynek
          kezdőértéke {formaz(szamlafolyo.tulhasznalat.alapPlafonFt, 'Ft')}, és
          amelyet a tulajdonos módosíthat vagy kikapcsolhat. A plafon elérése után a feldolgozás
          megáll.
        </P>
        <P>
          A kereten felüli feldolgozás <strong>előfizetéshez kötött</strong>: a próbaidő kerete
          zárt keret, azon felül feldolgozás nem engedélyezhető. A kereten felül feldolgozott
          dokumentumok díja az adott számlázási időszak lezárultakor,{' '}
          <strong>a következő időszakról kiállított számlán</strong> jelenik meg, külön tételként,
          a lezárult időszak megjelölésével.
        </P>
        <P>
          A felhasznált keretet a rendszer a ténylegesen elvégzett kiolvasások alapján tartja
          nyilván. Egy dokumentum utólagos törlése a már elvégzett kiolvasást nem teszi meg nem
          történtté, és a keretet nem adja vissza. A hibára futott kiolvasás nem fogyaszt keretet.
        </P>
      </Szakasz>

      <Szakasz cim="9. Fizetés, számlázás, felmondás">
        <P>
          A díjfizetés bankkártyával, a <strong>Stripe</strong> fizetési szolgáltatón keresztül
          történik. A Szolgáltató bankkártyaadatot nem kezel és nem tárol. Az előfizetés a
          számlázási időszak végén automatikusan megújul.
        </P>
        <P>
          <strong>A számlát a Szolgáltató állítja ki</strong>, magyar számlázóprogramon keresztül
          (Billingo), és az adójogi előírások szerint teljesíti a hozzá kapcsolódó
          adatszolgáltatást. A Stripe fizetési visszaigazolása{' '}
          <strong>nem számla</strong>: a számviteli elszámoláshoz a Szolgáltató által kiállított
          számla szolgál, amelyet az Előfizető a megadott e-mail címén kap meg. A Szolgáltató
          alanyi adómentes, ezért a számla áfát nem tartalmaz.
        </P>
        <P>
          <strong>Három különböző művelet, és érdemes nem összekeverni őket:</strong>
        </P>
        <Lista>
          <li>
            <strong>Az előfizetés lemondása.</strong> Az Előfizető az előfizetést bármikor
            felmondhatja a Beállítások képernyőről elérhető számlázási felületen. A felmondás{' '}
            <strong>a kifizetett időszak végén</strong> lép hatályba: addig a Szolgáltatás és a
            keret változatlanul használható. Ezt követően a Szolgáltatás csomag nélküli állapotba
            kerül: új dokumentum feldolgozására nincs lehetőség, a meglévő adatok és exportok
            viszont elérhetők maradnak, és kimenthetők.
          </li>
          <li>
            <strong>Egy felhasználó fiókjának törlése.</strong> Ha a cégben más felhasználó is
            dolgozik, ez a cég adatait és az előfizetést <strong>nem érinti</strong>: csak az
            adott személy hozzáférése szűnik meg.
          </li>
          <li>
            <strong>A teljes céges környezet törlése.</strong> Ha a törléssel a cégnek nem marad
            felhasználója, az előfizetés <strong>azonnal</strong> megszűnik, és az adatok is
            törlődnek — a kifizetett időszak hátralévő része így nem használható fel, és nem
            téríthető vissza. Ha az Előfizető a kifizetett időszakot ki akarja használni, előbb
            mondja fel az előfizetést, és a törlést csak az időszak végén indítsa.
          </li>
        </Lista>
        <P>
          <strong>Csomagváltás.</strong> Az Előfizető a számlázási felületen bármikor válthat
          csomagot. A váltás <strong>azonnal hatályos</strong>, a számlázási időszak fordulónapja
          viszont nem változik, és időarányos elszámolás nem történik: a különbözet a következő
          fordulónapon jelentkezik.{' '}
          <strong>Kisebb csomagra váltásnál a keret is azonnal csökken</strong> — ha az
          Előfizető az adott időszakban már többet használt fel, mint az új csomag kerete, a
          feldolgozás a kereten felüli feldolgozásra vonatkozó szabályok szerint folytatódik vagy
          áll meg.
        </P>
        <P>
          <strong>A próbaidő lejárta</strong> után a Szolgáltatás előfizetés nélkül nem dolgoz
          fel új dokumentumot; a próbaidőben feldolgozott adatok elérhetők maradnak és
          exportálhatók.
        </P>
        <P>
          <strong>Az utolsó időszak túlhasználata.</strong> A kereten felül feldolgozott
          dokumentumok díja a számlázási időszak fordulóján kerül kiszámlázásra. Ha az előfizetés
          a forduló előtt megszűnik, a megszűnéssel lezárult időszak túlhasználatát a Szolgáltató{' '}
          <strong>nem számlázza ki</strong>.
        </P>
        <P>
          <strong>Visszatérítés.</strong> A már kifizetett díj időarányos visszatérítésére az
          Előfizető saját döntéséből történő felmondás vagy törlés esetén nincs mód.{' '}
          <strong>
            Ez a szabály nem vonatkozik arra, ha a Szolgáltatás a Szolgáltatónak felróható okból
            marad el vagy válik tartósan használhatatlanná
          </strong>{' '}
          — ilyenkor az Előfizetőt a hibás teljesítés általános szabályai szerinti igények
          illetik meg, ideértve a díj arányos leszállítását is.
        </P>
        <P>
          <strong>A Szolgáltató felmondása.</strong> Sikertelen fizetés esetén a Szolgáltató
          jogosult a feldolgozást felfüggeszteni. A Szolgáltató a szerződést harmincnapos
          határidővel, indokolás nélkül is felmondhatja; ilyenkor a már kifizetett, de fel nem
          használt időszakra eső díjat <strong>időarányosan visszatéríti</strong>, és a
          felmondási idő alatt biztosítja az adatok kimentését (16. pont). Súlyos
          szerződésszegés — így különösen a Szolgáltatás jogellenes vagy visszaélésszerű
          használata — esetén a felmondás azonnali hatályú; ilyenkor visszatérítés nem jár.
        </P>
      </Szakasz>

      <Szakasz cim="10. Az iratok és a fájlok megőrzése">
        <P>
          <strong>Az eredeti fájlok az export elkészültével törlődnek a szerverről.</strong> Ez
          alapesetben azonnal megtörténik; az Előfizető a Beállítások képernyőn türelmi időt
          állíthat be, amely legfeljebb {maxNap} nap lehet. Az export képernyő a törlést előre
          kimondja, és felkínálja az eredetik ZIP-ben történő letöltését. A kiolvasott és
          jóváhagyott adatok a törlés után is megmaradnak.
        </P>
        <P>
          <strong>A részleges export nem viszi el a többi bizonylat forrását.</strong> Ha egy
          feltöltött fájl több bizonylatot tartalmaz, az eredeti fájl csak akkor törölhető, ha a
          benne lévő <strong>összes</strong> bizonylat kiment egy exportba. Amíg akár egy
          bizonylat feldolgozás alatt áll, a fájl marad. Ezt nem a felület, hanem az adatbázis
          szabálya biztosítja.
        </P>
        <P>
          <strong>Az elkészült export fájl {exportNap} napig érhető el</strong>, azután a
          Szolgáltató automatikusan törli. Ez az idő nem hosszabbítható és nem állítható: az
          export a jóváhagyott tételekből bármikor újrakészíthető, az adat tehát nem vész el. Az
          Archívum ezután is mutatja, mi, mikor és hány tétellel ment ki — csak a fájl letöltése
          szűnik meg.
        </P>
        <P>
          <strong>A bizonylatok jogszabályi megőrzése az Előfizető kötelezettsége.</strong> A
          számviteli és adójogi előírások szerinti megőrzési időt a Szolgáltatás nem teljesíti és
          nem helyettesíti; a Szolgáltató általi törlés az Előfizető megőrzési kötelezettségét nem
          érinti. <strong>A Szolgáltatás „Archívum" képernyője ebben az értelemben nem
          archiválás:</strong> az az elkészült exportokat tartja nyilván, hogy azok a fenti
          {' '}{exportNap} napig visszakereshetők legyenek — munkafolyamati funkció, nem a jogszabály szerinti
          bizonylatmegőrzés, és azt nem is pótolja. Az Előfizetőnek ezért az eredeti bizonylatokat
          magának kell megőriznie.
        </P>
        <P>
          A szerződés megszűnése után a Szolgáltató az Előfizető adatait ésszerű időn belül törli.
          Az Előfizető a szerződés fennállása alatt bármikor exportálhatja az adatait; a
          megszűnést megelőző adatmentés az Előfizető feladata.
        </P>
        <P>
          <strong>A fiók törlése végleges.</strong> Ha a törléssel a cégnek nem marad
          felhasználója, a Szolgáltató a törléssel egyidejűleg lemondja az előfizetést, és
          véglegesen törli a cég bizonylatait, a kiolvasott adatokat, az exportokat és a
          feltöltött fájlokat. A törlés nem vonható vissza, és a törölt adatokról a Szolgáltató
          nem tart fenn másolatot. A már kiállított számlák ez alól kivételt képeznek: azokat a
          Szolgáltató a számviteli előírások szerinti ideig megőrzi. A törlés az Előfizetőt
          terhelő jogszabályi megőrzési kötelezettséget nem érinti.
        </P>
      </Szakasz>

      <Szakasz cim="11. Adatkezelés — adatfeldolgozási feltételek">
        <P>
          A feltöltött bizonylatok tekintetében az Előfizető az adatkezelő, a Szolgáltató pedig
          adatfeldolgozóként jár el. <strong>Ez a pont egyben a felek közötti adatfeldolgozási
          szerződés</strong> a GDPR 28. cikk (3) bekezdése szerint; külön okirat aláírása nem
          szükséges. A fiók adataira (a regisztráló neve, e-mail címe, a cég adatai, az
          előfizetés) nézve viszont a Szolgáltató önálló adatkezelő — arról az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató
          </Link>{' '}
          szól.
        </P>
        <P>
          <strong>
            Ha az Előfizető nem a saját, hanem az ügyfele bizonylatait dolgozza fel — például
            könyvelőirodaként —, akkor ő maga adatfeldolgozó, a Szolgáltató pedig
            al-adatfeldolgozó.
          </strong>{' '}
          Ilyen használat esetén az Előfizető szavatolja, hogy az ügyfelétől (az adatkezelőtől)
          rendelkezik a további adatfeldolgozó bevonására szóló felhatalmazással, és hogy az
          ügyfelével kötött adatfeldolgozási szerződése lehetővé teszi a jelen pont szerinti
          igénybevételt. A Szolgáltatót terhelő, alább felsorolt kötelezettségek ilyenkor
          változatlanok, és az Előfizetőn keresztül az adatkezelő javára is fennállnak. Az
          Előfizető az ügyfele felé fennálló kötelezettségeiért — így az értesítésért és a
          hozzáférések szabályozásáért — maga felel.
        </P>
        <P>
          ⚠️ <strong>A Szolgáltatás ügyfélszűrője nem hozzáférési korlát.</strong> Egy cégen belül
          minden felhasználó a cég összes bizonylatát látja, a szerepköre szerinti jogokkal; az
          ügyfelekre bontás az exportban kényelmi szűrés. Ha az Előfizetőnek az egyes ügyfelek
          adatait egymástól el kell különítenie, ahhoz külön cég és külön előfizetés szükséges.
        </P>
        <P>
          <strong>Az adatfeldolgozás tárgya és időtartama:</strong> a Szolgáltatás nyújtása, a
          jelen szerződés hatálya alatt. <strong>Jellege és célja:</strong> a feltöltött
          bizonylatok tárolása, gépi kiolvasása, az adatok ellenőrizhetővé tétele és exportálása.{' '}
          <strong>A kezelt adatok típusa:</strong> a bizonylatokon szereplő adatok — így a partner
          neve, címe, adószáma, a bizonylat számai és tételei —, ideértve a munkavállalói vagy
          megbízotti költségbizonylatokon szereplő adatokat is; a bizonylathoz kapcsolódó
          feldolgozási adatok, így a <strong>modell nyers válasza</strong>, a jóváhagyáskor
          végzett <strong>javítások naplója</strong>, valamint e-mailes beküldés esetén a levél
          feladója és tárgya. Ezek személyes adatnak minősülnek, ha a partner egyéni vállalkozó
          vagy magánszemély, illetve ha a bizonylat természetes személyre vonatkozik.{' '}
          <strong>Az érintettek köre:</strong> az Előfizető partnerei és azok képviselői, az
          Előfizető munkavállalói és megbízottjai, valamint az Előfizető által felvett
          felhasználók.
        </P>
        <P>A Szolgáltató adatfeldolgozóként vállalja, hogy:</P>
        <Lista>
          <li>
            a személyes adatokat kizárólag az Előfizető írásbeli utasítása alapján kezeli —
            ideértve a harmadik országba történő adattovábbítást is —, kivéve, ha a kezelést uniós
            vagy tagállami jog írja elő; a Szolgáltatás rendeltetésszerű használata (feltöltés,
            kiolvasás, export) ilyen utasításnak minősül.{' '}
            <strong>
              A Szolgáltatás igénybevétele egyben az Előfizető kifejezett utasítása arra is, hogy
              a gépi kiolvasás céljából a bizonylat tartalma az Adatkezelési tájékoztató 5.
              pontjában megnevezett, Unión kívüli közreműködőkhöz továbbításra kerüljön
            </strong>
            , az ott hivatkozott garanciák mellett;
          </li>
          <li>
            <strong>
              haladéktalanul tájékoztatja az Előfizetőt, ha megítélése szerint valamely utasítása
              a GDPR-ba vagy más adatvédelmi rendelkezésbe ütközik
            </strong>
            , és az érintett utasítás teljesítését az egyeztetés lezárultáig felfüggesztheti;
          </li>
          <li>
            biztosítja, hogy az adatokhoz hozzáférő személyek titoktartási kötelezettséget
            vállaltak vagy jogszabályon alapuló titoktartási kötelezettség alatt állnak;
          </li>
          <li>
            megteszi a GDPR 32. cikke szerinti biztonsági intézkedéseket. Ezek: a kapcsolat
            titkosítása; a jelszavak visszafejthetetlen tárolása; a cégek adatainak{' '}
            <strong>adatbázis-szintű, soronkénti elkülönítése</strong>, amely közvetlen
            API-hívással sem kerülhető meg; szerepkörhöz kötött hozzáférés, amelyet minden művelet
            maga ellenőriz; a visszafordíthatatlan műveletek naplózása; a bizonylatok privát
            tárolóban, kizárólag időkorlátos, aláírt hivatkozással elérhető tárolása; valamint a
            tárhelyszolgáltató üzemfolytonossági mentései, amelyek helyreállításra szolgálnak.
            A felsorolás részletesebb leírása az Adatkezelési tájékoztató 7. pontjában található;
          </li>
          <li>
            további adatfeldolgozót az Előfizető <strong>általános felhatalmazása</strong> alapján
            vesz igénybe. A mindenkori al-adatfeldolgozók az Adatkezelési tájékoztató 5.
            pontjában <strong>név szerint, székhellyel és feldolgozási országgal</strong>{' '}
            szerepelnek. Új al-adatfeldolgozó igénybevétele előtt a Szolgáltató az Előfizetőt{' '}
            <strong>legalább tizenöt nappal korábban</strong> e-mailben értesíti; az Előfizető ez
            ellen kifogást emelhet, és ha a felek nem jutnak megegyezésre, a szerződést a változás
            hatálybalépéséig felmondhatja. A további adatfeldolgozókra a Szolgáltató ugyanezeket a
            kötelezettségeket telepíti;
          </li>
          <li>
            az Előfizetőt a technikai lehetőségeihez mérten segíti az érintetti kérelmek
            (hozzáférés, helyesbítés, törlés, korlátozás, hordozhatóság, tiltakozás)
            teljesítésében; ha ilyen kérelem közvetlenül a Szolgáltatóhoz érkezik, azt továbbítja
            az Előfizetőnek, és önállóan nem jár el;
          </li>
          <li>
            segíti az Előfizetőt a GDPR 32–36. cikke szerinti kötelezettségei teljesítésében.{' '}
            <strong>
              Adatvédelmi incidens esetén a Szolgáltató indokolatlan késedelem nélkül, de
              legkésőbb az észleléstől számított negyvennyolc órán belül
            </strong>{' '}
            értesíti az Előfizetőt, és megad minden rendelkezésére álló információt. Ez az
            értesítés az Előfizetőt terhelő hatósági bejelentést nem teljesíti és nem
            helyettesíti;
          </li>
          <li>
            <strong>a szerződés megszűnésekor az adatokat törli.</strong> Az Előfizető a
            megszűnés előtt bármikor exportálhatja az adatait, és a megszűnéskor a 16. pont
            szerinti adatkimentés áll rendelkezésére; ha az Előfizető az adatok visszaadását kéri,
            azt a Szolgáltató a 16. pont szerinti formátumokban teljesíti.{' '}
            <strong>A visszaadás és a törlés tehát nem vagylagos, hanem egymás után következik</strong>{' '}
            — előbb a kimentés, azután a törlés —, kivéve, ha jogszabály a megőrzést előírja
            (ilyen a Szolgáltató által kiállított számla). A törlés lefolyásáról — aktív rendszer,
            mentések kifutása, közreműködők — az Adatkezelési tájékoztató 4. pontja szól;
          </li>
          <li>
            az Előfizető rendelkezésére bocsát minden olyan információt, amely a jelen pont
            szerinti kötelezettségek igazolásához szükséges, és lehetővé teszi az Előfizető vagy
            az általa megbízott ellenőr által végzett auditot. Az ellenőrzést előzetesen
            egyeztetett időpontban, a Szolgáltatás működésének indokolatlan zavarása nélkül kell
            lefolytatni; a Szolgáltató ennek keretében a közreműködői által kiadott
            dokumentációra is hivatkozhat.
          </li>
        </Lista>
        <P>
          <strong>
            A Szolgáltató az Előfizető bizonylatait nem használja fel mesterséges intelligencia
            modell tanítására
          </strong>
          , sem sajátéra, sem harmadik félére, és erre külön megállapodás hiányában nem is
          jogosult. A gépi kiolvasáshoz igénybe vett szolgáltatók felé a Szolgáltató{' '}
          <strong>két külön kikötést</strong> érvényesít: hogy a bizonylat tartalmát ne tárolják,
          és hogy tanításra ne használják. A kiolvasást csak az Adatkezelési tájékoztató 5.
          pontjában megnevezett szolgáltatók végezhetik; tartalék útvonal meg nem nevezett
          címzetthez nincs. Erről az Adatkezelési tájékoztató 3. pontja szól részletesen.
        </P>
      </Szakasz>

      <Szakasz cim="12. Rendelkezésre állás és karbantartás">
        <P>
          A Szolgáltató a Szolgáltatást az elvárható gondossággal, folyamatos rendelkezésre
          állásra törekedve üzemelteti, de meghatározott rendelkezésre állási szintet nem
          garantál. A Szolgáltató jogosult a Szolgáltatást karbantartás céljából szüneteltetni; a
          tervezett, a szokásosnál hosszabb szünetről lehetőség szerint előre tájékoztat.
        </P>
        <P>
          <strong>A közreműködők hibája nem általános mentesülés.</strong> A Szolgáltató által
          igénybe vett közreműködők (tárhely-, fizetési és modellszolgáltató) teljesítéséért a
          Szolgáltató úgy felel, mintha maga járt volna el — ez a szabály alól a jelen ÁSZF nem
          tér el. A Szolgáltató kizárólag azokért a kimaradásokért nem felel, amelyek{' '}
          <strong>rajta kívül álló, elháríthatatlan okból</strong> következnek be, és amelyeket
          az elvárható gondosság mellett sem tudott megelőzni vagy elhárítani — ilyen az
          internetkapcsolat általános hibája vagy a közreműködő előre nem látható, tartós
          üzemzavara. Az ilyen kimaradás idejére eső díjról a felek elszámolnak.
        </P>
      </Szakasz>

      <Szakasz cim="13. Felelősség">
        <P>
          A felelősség kérdése <strong>négy, egymástól elkülönülő esetre</strong> bomlik, és ezek
          nem kezelhetők egyben:
        </P>
        <Lista>
          <li>
            <strong>A gépi kiolvasás bizonytalansága.</strong> A kiolvasás eredménye tervezet; a
            4. pont szerint az adat helyességéért az Előfizető felel. A Szolgáltató nem felel a
            kiolvasás hibájából eredő kárért, ha az Előfizető a tételt a könyvelésben történő
            felhasználás előtt nem ellenőrizte.
          </li>
          <li>
            <strong>A Szolgáltatás hibája.</strong> Ha a rendszer nem úgy működik, ahogy a jelen
            ÁSZF leírja — például elveszít egy feltöltött bizonylatot, vagy rosszul számolja a
            keretet —, az <strong>hibás teljesítés</strong>, amelyért a Szolgáltató az általános
            szabályok szerint felel.
          </li>
          <li>
            <strong>Adatvesztés.</strong> A Szolgáltató a neki felróható adatvesztésért felel. Az
            Előfizetőt terhelő bizonylatmegőrzést azonban a Szolgáltatás nem teljesíti (10.
            pont), ezért a Szolgáltató nem felel azért a kárért, amely abból ered, hogy az
            Előfizető a megőrzésről máshol nem gondoskodott.
          </li>
          <li>
            <strong>Adatvédelmi kötelezettségek.</strong> A Szolgáltató adatfeldolgozói
            kötelezettségeiért (11. pont) a GDPR szabályai szerint felel.{' '}
            <strong>
              Az érintettek és a hatóságok jogait, valamint a Szolgáltató adatvédelmi jogszabályon
              alapuló felelősségét a jelen pont felelősségkorlátozása nem érinti és nem
              korlátozza.
            </strong>
          </li>
        </Lista>
        <P>
          <strong>Összegszerű korlát.</strong> A Szolgáltató szerződésszegéssel okozott károkért
          fennálló felelőssége — a fenti negyedik eset, továbbá a{' '}
          <strong>szándékosan okozott</strong>, valamint az emberi életet, testi épséget vagy
          egészséget megkárosító szerződésszegés esetét kivéve — összesen legfeljebb a káresemény
          bekövetkeztét megelőző hat hónapban ténylegesen megfizetett szolgáltatási díj összegéig
          terjed. A Szolgáltató nem felel az elmaradt haszonért.
        </P>
        <P>
          A jelen pont a Szolgáltatás díjához mért, a felek által a szerződéskötéskor ismert
          kockázatmegosztást rögzíti. Az Előfizető a szerződéskötéssel elismeri, hogy erről a
          korlátozásról — csakúgy, mint a 10. pont szerinti automatikus fájltörlésről —{' '}
          <strong>külön tájékoztatást kapott</strong>, és azt kifejezetten elfogadja.
        </P>
      </Szakasz>

      <Szakasz cim="14. Szellemi tulajdon">
        <P>
          A SzámlaFolyó név, a logó, a weboldal tartalma és a Szolgáltatást működtető szoftver a
          Szolgáltató szellemi tulajdona. Az Előfizető a Szolgáltatás használatára nem
          kizárólagos, át nem ruházható jogot kap a szerződés időtartamára. A szoftver
          visszafejtése, másolása vagy továbbértékesítése nem megengedett. A feltöltött
          bizonylatok és a belőlük kiolvasott adatok az Előfizető tulajdonában maradnak.
        </P>
      </Szakasz>

      <Szakasz cim="15. Az ÁSZF módosítása">
        <P>
          A Szolgáltató jogosult a jelen ÁSZF-et és a díjakat egyoldalúan módosítani, ha azt
          jogszabályváltozás, a Szolgáltatás működésének változása, a közreműködők vagy a
          költségek változása indokolja. A módosításról az Előfizetőt a hatálybalépést megelőzően
          legalább <strong>tizenöt nappal</strong> e-mailben tájékoztatja, a változás
          megjelölésével.
        </P>
        <P>
          <strong>Ha az Előfizető a módosítást nem fogadja el</strong>, a hatálybalépésig
          felmondhatja az előfizetést. Ilyenkor a felmondás{' '}
          <strong>a módosítás hatálybalépésének napján</strong> hatályosul — nem kell megvárnia a
          számlázási időszak végét —, és a Szolgáltató a már kifizetett, de fel nem használt
          időszakra eső díjat <strong>időarányosan visszatéríti</strong>. A megszűnésig az
          Előfizető a 17. pont szerint mentheti ki az adatait. Enélkül a felmondás joga csak
          látszólagos volna: a változást elutasító Előfizető a hatálybalépés után is a módosított
          feltételek szerint fizetne.
        </P>
        <P>
          A Szolgáltatás további használata a hatálybalépés után a módosítás elfogadásának
          minősül. A díjemelés a már kifizetett számlázási időszakot nem érinti.
        </P>
      </Szakasz>

      <Szakasz cim="16. Adatkimentés és szolgáltatóváltás">
        <P>
          <strong>Az Előfizető az adatait bármikor kimentheti</strong>, a szerződés fennállása
          alatt és a megszűnését megelőzően egyaránt. Ez nem kérelem, hanem a felületről
          elvégezhető művelet:
        </P>
        <Lista>
          <li>
            a <strong>jóváhagyott tételek</strong> XLSX, CSV vagy JSON formátumban exportálhatók,
            tetszőleges időszakra és ügyfélre szűrve, tetszőleges számú alkalommal;
          </li>
          <li>
            az <strong>eredeti fájlok</strong> (PDF-ek, képek) az export mellé ZIP-ben
            letölthetők, amíg a 10. pont szerinti megőrzési idő alatt a szerveren vannak;
          </li>
          <li>
            az <strong>elkészült exportok</strong> az Archívumban {exportNap} napig újra
            letölthetők, és a tételekből bármikor új export készíthető.
          </li>
        </Lista>
        <P>
          <strong>Szolgáltatóváltás esetén</strong> a Szolgáltató — az Előfizető kérésére, a
          szerződés megszűnésétől számított <strong>harminc napon belül</strong> — díjmentesen
          biztosítja az Előfizető adatainak kiadását a fenti formátumokban, és ésszerű mértékű
          segítséget nyújt azok értelmezéséhez. Ha az Előfizető ilyen kérést terjeszt elő, a
          Szolgáltató az adatokat a kiadásig nem törli.{' '}
          <strong>Kérés hiányában a törlés a 10–11. pont szerint történik</strong>, ezért az
          Előfizetőnek érdemes a kimentést még a megszűnés előtt elvégeznie.
        </P>
        <P>
          A Szolgáltató a váltás megkönnyítése érdekében nyílt, széles körben olvasható
          formátumokat használ, és az exportfájlok szerkezetéről kérésre leírást ad. A
          Szolgáltatás nem tartalmaz olyan technikai akadályt, amely a váltást gátolná.
        </P>
      </Szakasz>

      <Szakasz cim="17. Panasz, alkalmazandó jog és jogviták">
        <P>
          <strong>Panasz.</strong> Panaszt az{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen lehet bejelenteni. A Szolgáltató a panaszt megvizsgálja, és legkésőbb harminc
          napon belül írásban válaszol.
        </P>
        <P>
          A jelen szerződésre a magyar jog irányadó. A felek a vitáikat elsősorban egyeztetéssel
          rendezik; ennek eredménytelensége esetén a magyar bíróságok járnak el az általános
          szabályok szerint. A 2. pont szerinti esetben a békéltető testületi eljárás lehetőségét
          a jelen ÁSZF nem zárja ki. A jelen ÁSZF-ben nem szabályozott kérdésekben a Polgári
          Törvénykönyv és az elektronikus kereskedelmi szolgáltatásokról szóló 2001. évi CVIII.
          törvény rendelkezései az irányadók.
        </P>
        <P>
          Kérdés esetén:{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>
        </P>
      </Szakasz>
        </JogiOldal>
  );
}
