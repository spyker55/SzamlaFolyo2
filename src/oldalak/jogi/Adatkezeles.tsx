import { Link } from 'react-router-dom';
import { JogiOldal, Lista, P, Szakasz, Tablazat } from './JogiOldal.tsx';
import { adatfeldolgozok, szolgaltato } from './adatok.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';

/**
 * Adatkezelési tájékoztató.
 *
 * # Amit a 2026. szeptemberi átállás miatt át kellett írni
 *
 * A régi szöveg jó volt — a saját rendszeréről. Öt ponton viszont **olyat
 * állított, ami ma nem igaz**, és egy adatkezelési tájékoztatóban ez a
 * legsúlyosabb hibafajta:
 *
 * 1. **„a magyarországi kiszolgálón tárolódik"** → az adat Frankfurtban van
 *    (Supabase, `eu-central-1`). A Nethely kiesett, és vele az a mondat is,
 *    hogy a kiszolgálók és a levelezés Magyarországon üzemelnek.
 * 2. **A modell neve** kézzel volt beírva, és **elavult** (`claude-sonnet-5`
 *    állt benne, miközben más fut). Most a configból jön — így nem tud
 *    másodszor is széttartani.
 * 3. **„Feltöltött irat soha nem kerül automatikusan jóváhagyásra"** → ez
 *    pontosan az, ami megváltozott. Az automatikus jóváhagyás a termék része,
 *    kapcsolható, fékekkel. Elhallgatni rosszabb lenne, mint nem is írni róla.
 * 4. **A fiók törlése** a Beállítások képernyőről ígért, azonnali művelet volt.
 *    Az a képernyő **még nem készült el**, tehát a szöveg ma azt mondja, ami
 *    igaz: e-mailben kérhető. Amikor a gomb meglesz, ez a bekezdés változik —
 *    nem előtte.
 * 5. **A munkamenet** nem sütiben él, hanem a böngésző tárolójában. Apróság, de
 *    egy süti-szakasz ne írjon le olyan sütit, ami nincs.
 */
export function Adatkezeles() {
  const modell = szamlafolyo.modell.alapertelmezett;
  const maxNap = szamlafolyo.megorzes.maxNap;

  return (
    <JogiOldal cim="Adatkezelési tájékoztató">
      <Szakasz cim="1. Ki kezeli az adatokat, és milyen szerepben">
        <P>
          A SzámlaFolyó szolgáltatást <strong>{szolgaltato.nev}</strong> üzemelteti; azonosító
          adatai és elérhetőségei az{' '}
          <Link to="/impresszum" className="underline">
            Impresszumban
          </Link>{' '}
          találhatók. Adatvédelmi kérdésekben a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen lehet hozzá fordulni.
        </P>
        <P>Két, egymástól elkülönülő szerepkör van, és ezt érdemes az elején tisztázni:</P>
        <Lista>
          <li>
            <strong>A fiók adataira nézve a Szolgáltató az adatkezelő.</strong> Ide tartozik a
            regisztráló neve, e-mail címe, a cég neve és adószáma, valamint az előfizetés adatai.
          </li>
          <li>
            <strong>A feltöltött bizonylatokra nézve az Előfizető az adatkezelő</strong>, a
            Szolgáltató pedig adatfeldolgozó. A bizonylatokon szereplő adatok — köztük személyes
            adatok, ha a partner egyéni vállalkozó vagy magánszemély — az Előfizető birtokában
            lévő iratokból származnak. A Szolgáltató ezeket kizárólag a Szolgáltatás nyújtása
            érdekében, az Előfizető utasításai szerint kezeli: nem elemzi más célra, nem adja
            tovább, és a szerződés megszűnésekor törli.
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="2. Milyen adatokat kezelünk">
        <Tablazat fejlec={['Mit', 'Miért', 'Jogalap', 'Meddig']}>
          <tr className="trow">
            <td className="td">Név, e-mail cím, titkosított jelszó</td>
            <td className="td">Fiók, belépés, értesítések</td>
            <td className="td">Szerződés teljesítése</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">Cégnév, adószám</td>
            <td className="td">A cég azonosítása, jogosultság a szolgáltatásra</td>
            <td className="td">Szerződés teljesítése</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">Előfizetés és fizetés adatai (Stripe-azonosító, állapot, időszak)</td>
            <td className="td">Számlázás, keretszámítás</td>
            <td className="td">Szerződés teljesítése, illetve jogi kötelezettség</td>
            <td className="td">A számviteli előírások szerinti megőrzési ideig</td>
          </tr>
          <tr className="trow">
            <td className="td">Feltöltött bizonylatok és a belőlük kiolvasott adatok</td>
            <td className="td">A Szolgáltatás nyújtása</td>
            <td className="td">Az Előfizető utasítása (adatfeldolgozás)</td>
            <td className="td">Lásd a 4. pontot</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A visszafordíthatatlan és a cégre kiható műveletek naplója (export, törlés, tag
              felvétele, beállításváltás)
            </td>
            <td className="td">Utólagos visszakövethetőség a cégen belül</td>
            <td className="td">Jogos érdek: elszámoltathatóság</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              Belépési kísérletek adatai, köztük IP-cím — ezeket a felhasználókezelést végző
              Supabase kezeli
            </td>
            <td className="td">Próbálgatásos támadás elleni védelem</td>
            <td className="td">Jogos érdek: a fiókok biztonsága</td>
            <td className="td">A szolgáltató rövid, biztonsági célú megőrzési ideje szerint</td>
          </tr>
          <tr className="trow">
            <td className="td">Munkamenet-adat a böngésző saját tárolójában</td>
            <td className="td">Bejelentkezett állapot fenntartása</td>
            <td className="td">A szolgáltatáshoz feltétlenül szükséges</td>
            <td className="td">Kilépésig, illetve a munkamenet lejártáig</td>
          </tr>
        </Tablazat>
        <P>
          <strong>Sütiket mérésre vagy hirdetésre nem használunk.</strong> A weboldalon nincs
          látogatásmérő, nincs hirdetési kódrészlet, és nincs profilalkotás. A bejelentkezett
          állapotot nem süti, hanem a böngésző saját tárolója őrzi, és az is kizárólag a
          működéshez kell. Ezért süti-hozzájáruló ablak sem fogadja a látogatót: nincs mihez
          hozzájárulni.
        </P>
      </Szakasz>

      <Szakasz cim="3. Mi történik egy feltöltött bizonylattal">
        <P>Ez a tájékoztató legfontosabb szakasza, mert itt hagyják el az adatok a szervert.</P>
        <Lista>
          <li>
            A bizonylat a böngészőből, feltöltéssel érkezik, és az{' '}
            <strong>Európai Unión belül, frankfurti kiszolgálón</strong> tárolódik.
          </li>
          <li>
            A kiolvasáshoz a bizonylat tartalma — a PDF vagy a kép — <strong>elhagyja a
            szervert</strong>: az OpenRouter szolgáltatáson keresztül eljut a kiolvasást végző
            mesterséges intelligencia modellhez (jelenleg: <code>{modell}</code>). A modellnek a
            bizonylat mellett a saját cég nevét és adószámát küldjük el, hogy tudja, melyik
            oldalon állunk. <strong>Felhasználói nevet, e-mail címet, jelszót nem küldünk.</strong>
          </li>
          <li>
            A kérésben kikötjük, hogy az irat <strong>csak olyan szolgáltatóhoz kerülhet,
            amelyik a tartalmat nem tárolja és nem használja modelltanításra</strong>. Amelyik
            ezt nem vállalja, azt az útválasztás kihagyja; ha egy sem marad, a kiolvasás inkább
            hibával áll meg. Ez a kikötés a kódban van, nem a beállításokban:{' '}
            <strong>környezeti változóból nem kapcsolható ki.</strong>
          </li>
          <li>
            <strong>A feltöltött bizonylatokat mi magunk sem használjuk mesterséges
            intelligencia tanítására</strong> — sem sajátéra, sem harmadik félére —, és külön
            megállapodás hiányában erre nem is vagyunk jogosultak. A megőrzött nyers modellválasz
            és a javítások kizárólag arra szolgálnak, hogy mérni tudjuk, mennyit hibázik a gépi
            kiolvasás.
          </li>
          <li>
            Az e-számla XML feldolgozása <strong>modellhívás nélkül</strong> történik: az ilyen
            irat tartalma nem hagyja el a szervert.
          </li>
          <li>
            A kiolvasott adat ezután vagy ellenőrzésre vár, vagy — ha a cég ezt bekapcsolta és a
            bizonylat minden gépi ellenőrzésen átment — automatikusan jóváhagyottá válik. Erről a
            6. pont szól részletesen.
          </li>
          <li>
            Az export elkészültével <strong>az eredeti fájlok törlődnek</strong> a szerverről.
            Alapesetben azonnal; a cég tulajdonosa legfeljebb {maxNap} napos türelmi időt
            állíthat be. A kiolvasott adatok megmaradnak.
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="4. Meddig őrizzük az adatokat">
        <Lista>
          <li>
            <strong>Eredeti fájlok:</strong> az export után törlődnek, legfeljebb {maxNap} napos,
            cégenként állítható türelmi idővel.
          </li>
          <li>
            <strong>Kiolvasott és jóváhagyott adatok, fiókadatok:</strong> a szerződés
            megszűnéséig, azt követően ésszerű időn belül törölve.
          </li>
          <li>
            <strong>Számlázási adatok:</strong> a számviteli előírások szerinti megőrzési ideig —
            ezt jogszabály írja elő, törlési kérésre sem szüntethető meg.
          </li>
        </Lista>
        <P>
          <strong>A fiók törlése</strong> jelenleg a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen kérhető; a kérést öt munkanapon belül teljesítjük. (A felületről indítható,
          azonnali törlés fejlesztés alatt áll — amíg nincs kész, nem ígérjük.) A törléssel a
          felhasználói fiók megszűnik. Ha ezzel a cégnek nem marad felhasználója, vele együtt
          törlődnek a cég bizonylatai, a kiolvasott adatok, az exportok, a naplóbejegyzések és a
          szerveren lévő fájlok is, az esetleges Stripe-előfizetést pedig lemondjuk. A törlés nem
          vonható vissza, és a törölt adatokról nem tartunk fenn másolatot.
        </P>
        <P>
          Két dolog marad meg ilyenkor, és mindkettőnek jogszabályi oka van. A{' '}
          <strong>már kiállított számlák</strong> a Stripe-nál és nálunk is megmaradnak a
          számviteli megőrzési idő végéig — ezt nem mi választjuk, és törlési kérésre sem
          szüntethető meg. A cégben maradó felhasználóknál pedig, ha csak egy felhasználó lép ki,
          a cég adatai értelemszerűen megmaradnak: azok az adatkezelő Előfizetőhöz tartoznak, nem
          a kilépő felhasználóhoz.
        </P>
        <P>
          A bizonylatok saját, jogszabályi megőrzéséről az Előfizetőnek kell gondoskodnia; a
          Szolgáltató általi törlés ezt a kötelezettséget nem teljesíti és nem helyettesíti.{' '}
          <strong>A rendszer „Archívum" képernyője sem archiválás ebben az értelemben:</strong>{' '}
          az az elkészült exportokat tartja nyilván, hogy visszakereshetők legyenek.
          Munkafolyamati funkció, nem bizonylatmegőrzés.
        </P>
      </Szakasz>

      <Szakasz cim="5. Kik férnek hozzá — adatfeldolgozók">
        <Tablazat fejlec={['Ki', 'Mit csinál', 'Hol']}>
          {adatfeldolgozok.map((a) => (
            <tr key={a.ki} className="trow">
              <td className="td">{a.ki}</td>
              <td className="td">{a.mit}</td>
              <td className="td">{a.hol}</td>
            </tr>
          ))}
        </Tablazat>
        <P>
          <strong>Az adatbázis és a feltöltött fájlok az Európai Unión belül maradnak</strong>{' '}
          (Frankfurt). A gépi kiolvasás és a fizetés viszont az Unión kívülre továbbítással jár.
          Ezekre az Európai Bizottság megfelelőségi határozata, illetve — ahol az nem alkalmazható
          — az Európai Bizottság által elfogadott általános szerződési feltételek adnak jogalapot.
        </P>
        <P>
          A Szolgáltató bankkártyaadatot nem lát és nem tárol: azt a Stripe kezeli a saját
          felületén.
        </P>
        <P>
          <strong>Ha a fenti kör változik</strong> — új közreműködő lép be, vagy másik
          modellszolgáltatóra váltunk —, arról az Előfizetőket a változás előtt legalább tizenöt
          nappal e-mailben értesítjük. Az Előfizető kifogást emelhet, és ha nem jutunk
          megegyezésre, a szerződést a változás hatálybalépéséig felmondhatja. A részletes
          feltételeket az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          tartalmazza, amely egyben a felek közötti adatfeldolgozási szerződés.
        </P>
      </Szakasz>

      <Szakasz cim="6. Gépi jóváhagyás — alapból kikapcsolva">
        <P>
          <strong>Alapértelmezés szerint minden bizonylat emberhez kerül</strong>, és emberi
          jóváhagyás nélkül egyetlen kiolvasott adat sem megy tovább. Automatikus döntés csak
          akkor születik, ha azt a cég a Beállítások képernyőn <strong>kifejezetten
          bekapcsolja</strong> — ekkor a minden gépi ellenőrzésen átmenő bizonylat emberi
          jóváhagyás nélkül is továbbengedhető. Mivel ez a bekapcsolt állapot érinti az
          érintettek adatainak kezelését, itt is leírjuk, mi tartozik hozzá:
        </P>
        <Lista>
          <li>
            <strong>Cégenként kapcsolható</strong>, a Beállítások képernyőn, és{' '}
            <strong>alapból ki van kapcsolva</strong>. Kikapcsolva minden bizonylat emberhez
            kerül.
          </li>
          <li>
            A cég <strong>első {szamlafolyo.automatikusJovahagyas.bemelegitesDarab} bizonylata
            mindig</strong> emberhez megy, és utána is minden{' '}
            {szamlafolyo.automatikusJovahagyas.mintavetelMinden}. — így marad mérhető, mennyit
            téved a gépi jóváhagyás.
          </li>
          <li>
            Ami automatikusan ment át, az <strong>jelvényt kap</strong> és rövid indokot, és az
            exportig visszahívható javításra. <strong>Soha nem írjuk ki, hogy „ellenőrizve", ha
            senki nem nézte meg.</strong>
          </li>
          <li>
            A gépi jóváhagyás <strong>nem vesz át felelősséget</strong>: a kiolvasott adat
            helyességéért az Előfizető felel, ahogy az{' '}
            <Link to="/aszf" className="underline">
              ÁSZF 4. pontja
            </Link>{' '}
            kimondja.
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="7. Adatbiztonság">
        <Lista>
          <li>A kapcsolat titkosított (HTTPS), a jelszavak visszafejthetetlen formában tárolódnak.</li>
          <li>
            A betűtípusokat és minden más eszközt <strong>az oldal saját címéről</strong>{' '}
            szolgáljuk ki: az oldal megnyitása önmagában nem jár adattovábbítással harmadik
            félhez. Külső betűszolgáltatót, látogatásmérőt és hirdetési kódot nem használunk.
          </li>
          <li>
            A cégek adatai el vannak különítve egymástól, és ezt az{' '}
            <strong>adatbázis maga kényszeríti ki</strong> (soronkénti hozzáférés-szabályozás) —
            nem a felület. A szűkítés tehát közvetlen API-hívással sem kerülhető meg, nem csak a
            képernyőről.
          </li>
          <li>
            Bizonylat csak belépett felhasználótól, a saját cégébe kerülhet be: nincs olyan út,
            amelyen hitelesítés nélkül lehetne iratot elhelyezni a rendszerben.
          </li>
          <li>
            <strong>A visszafordíthatatlan és a cégre kiható műveleteket naplózzuk</strong>{' '}
            (export, a megőrzési idő és a gépi jóváhagyás átállítása, a kereten felüli költés
            engedélyezése, tag felvétele és eltávolítása): ki, mikor, mit tett. Ez utólag
            megmutatja, mi történt a céggel — és a napló a cég adata, a cég törlésével együtt megy
            el.
          </li>
          <li>
            A hozzáférés szerepkörhöz kötött: a Megtekintő nem tölthet fel és nem hagyhat jóvá, a
            számlázást és a tagok kezelését csak a Tulajdonos éri el. A korlátot minden művelet
            maga ellenőrzi, nem csak az elrejtett gomb.
          </li>
        </Lista>
        <P>
          <strong>Adatvédelmi incidens esetén</strong> — ha az adatok jogosulatlanul
          nyilvánosságra kerülnek, elvesznek vagy megsemmisülnek — a Szolgáltató indokolatlan
          késedelem nélkül, de legkésőbb az észleléstől számított negyvennyolc órán belül értesíti
          az érintett Előfizetőt, és megad minden rendelkezésére álló információt. A bizonylatok
          tekintetében a hatóság felé történő bejelentés az adatkezelő Előfizető feladata; a
          Szolgáltató ehhez segítséget nyújt.
        </P>
      </Szakasz>

      <Szakasz cim="8. Az érintett jogai">
        <P>
          Az érintett kérheti a rá vonatkozó adatokhoz való hozzáférést, azok helyesbítését,
          törlését vagy kezelésük korlátozását, kérheti az adatai hordozható formában történő
          kiadását, és tiltakozhat a jogos érdeken alapuló adatkezelés ellen. Az adatok
          kimentésére az export szolgál, amit a fiók törlése előtt érdemes elkészíteni. A
          kéréseket — a fiók törlését is — a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen lehet előterjeszteni; azokra legkésőbb egy hónapon belül válaszolunk.
        </P>
        <P>
          Ha a kérés olyan bizonylatra vonatkozik, amelyet egy Előfizető töltött fel, a
          Szolgáltató adatfeldolgozóként jár el: a kérést továbbítja az adatkezelő Előfizetőnek,
          és az ő utasítása szerint jár el.
        </P>
        <P>
          Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz lehet fordulni (1055
          Budapest, Falk Miksa utca 9–11.; postacím: 1363 Budapest, Pf. 9.;{' '}
          <a className="underline" href="mailto:ugyfelszolgalat@naih.hu">
            ugyfelszolgalat@naih.hu
          </a>
          ), illetve bírósághoz.
        </P>
      </Szakasz>

      <Szakasz cim="9. A tájékoztató módosítása">
        <P>
          A Szolgáltató a jelen tájékoztatót módosíthatja, ha az adatkezelés módja megváltozik —
          például új közreműködő lép be, vagy más megőrzési idő lép életbe. A módosításról az
          Előfizetőket e-mailben tájékoztatja, a hatályos szöveg pedig mindig ezen az oldalon
          érhető el.
        </P>
      </Szakasz>
    </JogiOldal>
  );
}
