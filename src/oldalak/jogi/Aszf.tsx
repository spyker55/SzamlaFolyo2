import { Link } from 'react-router-dom';
import { JogiOldal, Lista, P, Szakasz, Tablazat } from './JogiOldal.tsx';
import { szolgaltato } from './adatok.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
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
 * 3. **5. és 10. pont — a fiók törlése.** A felületről indítható törlés még
 *    nem készült el, tehát a szöveg azt mondja, ami igaz: e-mailben kérhető.
 *
 * A számok mind a configból jönnek (`config/szamlafolyo.ts`). Egy ÁSZF-ben
 * kézzel beírt ár az a fajta adat, ami csendben elavul.
 *
 * ⚠️ A formázás a repó saját `formaz()`-ával megy, **nem** a
 * `toLocaleString('hu-HU')`-val. Ez mérésből derült ki: a fejléc nélküli
 * Chromiumban a `toLocaleString` nem csoportosított (`1990 Ft` jött ki
 * `1 990 Ft` helyett), mert az ICU-adatok hiányoznak. Egy jogi szöveg számai
 * ne függjenek attól, milyen böngészővel nyitják meg — a `formaz()` saját
 * csoportosítót használ, és egyben ugyanúgy néz ki, mint az alkalmazásban.
 */
export function Aszf() {
  const mb = Math.round(szamlafolyo.feltoltes.maxBajt / (1024 * 1024));
  const maxNap = szamlafolyo.megorzes.maxNap;

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
          A szerződés a regisztrációval jön létre, a jelen ÁSZF és az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató
          </Link>{' '}
          elfogadásával. A regisztráló ezzel kijelenti, hogy a feltételeket megismerte, és magára
          nézve kötelezőnek fogadja el. A szerződés írásba foglalt szerződésnek nem minősül, azt a
          Szolgáltató nem iktatja; nyelve a magyar.
        </P>
      </Szakasz>

      <Szakasz cim="2. A Szolgáltatás kizárólag vállalkozásoknak szól">
        <P>
          A Szolgáltatást kizárólag a Polgári Törvénykönyv szerinti vállalkozások — gazdasági
          társaságok, egyéni vállalkozók és egyéb, önálló foglalkozásuk vagy gazdasági
          tevékenységük körében eljáró személyek — vehetik igénybe. A felhasználó a
          regisztrációval kijelenti, hogy vállalkozásként, gazdasági tevékenysége körében jár el.
        </P>
        <P>
          Ezt a rendszer is számon kéri: cég létrehozásához érvényes magyar adószám szükséges. A
          szerződés ennek megfelelően nem fogyasztói szerződés, a fogyasztókat megillető külön
          jogok (elállási jog, békéltető testületi eljárás) nem alkalmazandók.
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
          A fiók törlése a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen kérhető; a Szolgáltató a kérést öt munkanapon belül teljesíti. A cég adatai akkor
          szűnnek meg, ha a cégnek nem marad felhasználója; amíg más felhasználó dolgozik benne, a
          kilépő fiók törlése a cég adatait és az előfizetést nem érinti. A cég egyetlen
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
          szabály: <strong>{szabaly()}</strong> Egy szokásos, egy–három oldalas számla vagy nyugta
          tehát egy dokumentumnak számít. Ha egy irat oldalszáma nem állapítható meg, egy
          dokumentumnak számít.
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
          A felhasznált keretet a rendszer a ténylegesen elvégzett kiolvasások alapján tartja
          nyilván. Egy dokumentum utólagos törlése a már elvégzett kiolvasást nem teszi meg nem
          történtté, és a keretet nem adja vissza. A hibára futott kiolvasás nem fogyaszt keretet.
        </P>
      </Szakasz>

      <Szakasz cim="9. Fizetés, számlázás, felmondás">
        <P>
          A díjfizetés bankkártyával, a Stripe fizetési szolgáltatón keresztül történik. A
          Szolgáltató bankkártyaadatot nem kezel és nem tárol. Az előfizetés a számlázási időszak
          végén automatikusan megújul.
        </P>
        <P>
          Az Előfizető az előfizetést bármikor felmondhatja a Beállítások képernyőről elérhető
          számlázási felületen. A felmondás a kifizetett időszak végén lép hatályba; a már
          kifizetett díj időarányos visszatérítésére nincs mód. A felmondást követően a
          Szolgáltatás a keret és a felhasználószám szempontjából csomag nélküli állapotba kerül:
          új dokumentum feldolgozására nincs lehetőség.
        </P>
        <P>
          Az előfizetés a fiók törlésével is megszűnik, de ez a felmondástól eltérően{' '}
          <strong>azonnal</strong> hatályos: a fiók törlésével az adatok is törlődnek, így a
          kifizetett időszak hátralévő része nem használható fel, és nem téríthető vissza. Ha az
          Előfizető a kifizetett időszakot ki akarja használni, előbb mondja fel az előfizetést,
          és a fiók törlését csak az időszak végén kérje.
        </P>
        <P>
          Sikertelen fizetés esetén a Szolgáltató jogosult a feldolgozást felfüggeszteni. A
          Szolgáltató a szerződést harmincnapos határidővel, indokolás nélkül is felmondhatja;
          súlyos szerződésszegés — így különösen a Szolgáltatás jogellenes vagy visszaélésszerű
          használata — esetén azonnali hatállyal.
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
          <strong>A bizonylatok jogszabályi megőrzése az Előfizető kötelezettsége.</strong> A
          számviteli és adójogi előírások szerinti megőrzési időt a Szolgáltatás nem teljesíti és
          nem helyettesíti; a Szolgáltató általi törlés az Előfizető megőrzési kötelezettségét nem
          érinti. <strong>A Szolgáltatás „Archívum" képernyője ebben az értelemben nem
          archiválás:</strong> az az elkészült exportokat tartja nyilván, hogy azok
          visszakereshetők legyenek — munkafolyamati funkció, nem a jogszabály szerinti
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
          <strong>Az adatfeldolgozás tárgya és időtartama:</strong> a Szolgáltatás nyújtása, a
          jelen szerződés hatálya alatt. <strong>Jellege és célja:</strong> a feltöltött
          bizonylatok tárolása, gépi kiolvasása, az adatok ellenőrizhetővé tétele és exportálása.{' '}
          <strong>A kezelt adatok típusa:</strong> a bizonylatokon szereplő adatok — így a partner
          neve, címe, adószáma, a bizonylat számai és tételei —, amelyek személyes adatnak
          minősülnek, ha a partner egyéni vállalkozó vagy magánszemély.{' '}
          <strong>Az érintettek köre:</strong> az Előfizető partnerei és azok képviselői, valamint
          az Előfizető által felvett felhasználók.
        </P>
        <P>A Szolgáltató adatfeldolgozóként vállalja, hogy:</P>
        <Lista>
          <li>
            a személyes adatokat kizárólag az Előfizető írásbeli utasítása alapján kezeli —
            ideértve a harmadik országba történő adattovábbítást is —, kivéve, ha a kezelést uniós
            vagy tagállami jog írja elő; a Szolgáltatás rendeltetésszerű használata (feltöltés,
            kiolvasás, export) ilyen utasításnak minősül;
          </li>
          <li>
            biztosítja, hogy az adatokhoz hozzáférő személyek titoktartási kötelezettséget
            vállaltak vagy jogszabályon alapuló titoktartási kötelezettség alatt állnak;
          </li>
          <li>
            megteszi a GDPR 32. cikke szerinti biztonsági intézkedéseket; ezek felsorolása az
            Adatkezelési tájékoztató „Adatbiztonság" pontjában található;
          </li>
          <li>
            további adatfeldolgozót az Előfizető <strong>általános felhatalmazása</strong> alapján
            vesz igénybe. A mindenkori al-adatfeldolgozók az Adatkezelési tájékoztatóban név
            szerint szerepelnek. Új al-adatfeldolgozó igénybevétele előtt a Szolgáltató az
            Előfizetőt <strong>legalább tizenöt nappal korábban</strong> e-mailben értesíti; az
            Előfizető ez ellen kifogást emelhet, és ha a felek nem jutnak megegyezésre, a
            szerződést a változás hatálybalépéséig felmondhatja. A további adatfeldolgozókra a
            Szolgáltató ugyanezeket a kötelezettségeket telepíti;
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
            értesíti az Előfizetőt, és megad minden rendelkezésére álló információt;
          </li>
          <li>
            a szerződés megszűnésekor — az Előfizető választása szerint — az adatokat törli vagy
            visszaadja, és a meglévő másolatokat törli, kivéve, ha jogszabály a megőrzést előírja
            (ilyen a Szolgáltató által kiállított számla);
          </li>
          <li>
            az Előfizető rendelkezésére bocsát minden olyan információt, amely a jelen pont
            szerinti kötelezettségek igazolásához szükséges, és lehetővé teszi az Előfizető vagy
            az általa megbízott ellenőr által végzett auditot. Az ellenőrzést előzetesen
            egyeztetett időpontban, a Szolgáltatás működésének indokolatlan zavarása nélkül kell
            lefolytatni.
          </li>
        </Lista>
        <P>
          <strong>
            A Szolgáltató az Előfizető bizonylatait nem használja fel mesterséges intelligencia
            modell tanítására
          </strong>
          , sem sajátéra, sem harmadik félére, és erre külön megállapodás hiányában nem is
          jogosult. A gépi kiolvasáshoz igénybe vett szolgáltató felé a Szolgáltató kiköti, hogy a
          bizonylat tartalma nem tárolható és tanításra nem használható; erről az Adatkezelési
          tájékoztató 3. pontja szól részletesen.
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
          A Szolgáltató nem felel azért a kimaradásért, amely rajta kívül álló okból — így a
          tárhelyszolgáltató, a fizetési szolgáltató, a modellszolgáltató vagy az
          internetkapcsolat hibájából — következik be.
        </P>
      </Szakasz>

      <Szakasz cim="13. Felelősség">
        <P>
          A Szolgáltató felelőssége a szerződésszegéssel okozott károkért — a szándékosan okozott,
          továbbá az emberi életet, testi épséget vagy egészséget megkárosító szerződésszegés
          esetét kivéve — összesen legfeljebb a káresemény bekövetkeztét megelőző hat hónapban
          ténylegesen megfizetett szolgáltatási díj összegéig terjed.
        </P>
        <P>
          A Szolgáltató nem felel az elmaradt haszonért, az adatvesztésből eredő közvetett kárért,
          továbbá a gépi kiolvasás hibájából eredő károkért, ha az Előfizető a tételt a
          könyvelésben történő felhasználás előtt nem ellenőrizte.
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
          A Szolgáltató jogosult a jelen ÁSZF-et és a díjakat egyoldalúan módosítani. A
          módosításról az Előfizetőt a hatálybalépést megelőzően legalább tizenöt nappal e-mailben
          tájékoztatja. Ha az Előfizető a módosítást nem fogadja el, a hatálybalépésig
          felmondhatja az előfizetést; a Szolgáltatás további használata a módosítás elfogadásának
          minősül. A díjemelés a már kifizetett számlázási időszakot nem érinti.
        </P>
      </Szakasz>

      <Szakasz cim="16. Alkalmazandó jog és jogviták">
        <P>
          A jelen szerződésre a magyar jog irányadó. A felek a vitáikat elsősorban egyeztetéssel
          rendezik; ennek eredménytelensége esetén a magyar bíróságok járnak el az általános
          szabályok szerint. A jelen ÁSZF-ben nem szabályozott kérdésekben a Polgári Törvénykönyv
          és az elektronikus kereskedelmi szolgáltatásokról szóló 2001. évi CVIII. törvény
          rendelkezései az irányadók.
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
