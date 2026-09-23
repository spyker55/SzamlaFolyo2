import { Link } from 'react-router-dom';
import { JogiOldal, Lista, P, Szakasz, Tablazat } from './JogiOldal.tsx';
import { adatfeldolgozok, NINCS_SZEKHELY, szolgaltato, unionKivuliDarab } from './adatok.ts';
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
 *    Sokáig ez volt az egyetlen pont, ahol a szöveg **kevesebbet** ígért a
 *    réginél: amíg a képernyő nem készült el, azt mondta, ami igaz — e-mailben
 *    kérhető. **2026. szeptember 20-án elkészült** (`/fiok-torles`), és ezzel
 *    ez a bekezdés visszatért az eredeti ígérethez. A sorrend végig ez volt:
 *    előbb a gomb, aztán a mondat.
 * 5. **A munkamenet** nem sütiben él, hanem a böngésző tárolójában. Apróság, de
 *    egy süti-szakasz ne írjon le olyan sütit, ami nincs.
 *
 * # 2026. szeptember 15. — az e-mailes beküldés
 *
 * A bizonylat mostantól **levélben is érkezhet**, a cég saját beküldő címére
 * (`20260915000200_email_bekuldes.sql`). Ez két helyen üt be, és mindkettőt ki
 * kell mondani, nem elég a beküldést megemlíteni:
 *
 * - **Új adatfeldolgozó**: a Resend fogadja a leveleket és küldi a rendszer
 *   saját leveleit. Bekerült az 5. pont táblázatába — ezt az ÁSZF 11. pontja
 *   értesítési kötelezettséggé is teszi.
 * - **Új adatkör**: harmadik felek (a szállítók) leveleinek feladója és tárgya.
 *   Ez azért kerül a 2. pont táblázatába külön sorként, mert nem a bizonylat
 *   adata, hanem a *kézbesítésé* — és mert a megőrzésének **más az indoka**:
 *   nem a kiolvasás, hanem az, hogy egy elutasított levél ne tűnjön el
 *   nyomtalanul.
 *
 * # 2026. szeptember 15. — a meghívó
 *
 * Kollégát mostantól levélben lehet behívni (`20260915000300_meghivo.sql`).
 * Ezzel egy **új adatkör** keletkezett, és szintén saját sort kapott a 2.
 * pontban: a meghívott e-mail címe. Ez azért nem fér bele a „Név, e-mail cím,
 * titkosított jelszó" sorba, mert az a **felhasználóinkról** szól — a
 * meghívott viszont addig nem az, és lehet, hogy soha nem is lesz. A címet a
 * cég tulajdonosa adja meg, a jogalap ezért jogos érdek, nem szerződés.
 *
 * # 2026. szeptember 20. — látogatásmérés a nyilvános oldalakon
 *
 * A Vercel Web Analytics bekapcsolásával **ez a tájékoztató egy csapásra
 * valótlanná vált**: a 2. pont félkövéren azt ígérte, hogy „a weboldalon nincs
 * látogatásmérő". Nem a szöveget gyengítettük, hanem kimondtuk, mi van — és
 * közben a mérést oda szorítottuk, ahol ez a mondat vállalható marad.
 *
 * A szűkítés nem szövegezési fogás, hanem kód: a `src/lib/analitika.ts`
 * **fehérlistája** dönti el, melyik címről indulhat egyáltalán esemény. Ami
 * nincs nevesítve benne — köztük minden bizonylat-, meghívó- és
 * jelszó-visszaállító cím —, arról adat el sem indul. Megfordítva azért, mert
 * egy feketelista némán romlik el: egy jövőbeli, azonosítót hordozó útvonal
 * magától kicsúszna rajta.
 *
 * Mit mértünk, és mi az, amit csak elhiszünk — érdemes szétválasztani:
 *
 * - **Mérve**: mely címek hagyhatják el a böngészőt. Erre 29 teszt áll
 *   (`src/lib/analitika.test.ts`), köztük egy elcsúszás-őr, ami az `App.tsx`
 *   útvonaltáblájából olvas.
 * - **Mérve**: hogy a mérés nem tesz sütit. A telepítés után visszaolvasott
 *   `/_vercel/insights/script.js` nem ír `document.cookie`-t; munkamenet-sütit
 *   csak a `va('enableCookie')` kapcsolna be, amit sehol nem hívunk.
 * - **Mérve**: hogy a szűrőnk valóban kapu. Ugyanabban a scriptben a
 *   `beforeSend` `null` válaszára a függvény visszatér, kérés nélkül.
 * - ⚠️ **Elhitt**: hogy a beérkezett adatból a Vercel **nem épít tartós
 *   azonosítót**. Ez a kiszolgáló oldalán dől el, tehát innen nem mérhető — ez
 *   az egyetlen állítás a szakaszban, ami a Vercel kiadott leírásán nyugszik.
 *
 * # 2026. szeptember 20. — a Használati útmutató, és egy mondat, ami már előtte
 * sem volt pontos
 *
 * A `/utmutato` nyilvános oldal, és bekerült a mérés fehérlistájába — a 2. pont
 * felsorolása ezért egy taggal bővült. A felsorolás **tételes** („Sehol
 * máshol"), tehát a listával együtt kell mozognia; a `MERT_UTVONALAK` fölött
 * ez ki is van mondva.
 *
 * ⚠️ Ugyanitt egy **meglévő pontatlanság** is javult, amit ez a kör talált meg:
 * a felsorolás a bejelentkező és a regisztrációs űrlapot nevezte meg, az
 * **elfelejtett jelszó** űrlapja viszont a kezdetektől a fehérlistán állt. Nem
 * a mérés terjedt ki többre, mint amit vállaltunk — a szöveg sorolt fel
 * kevesebbet, mint ami történt. Most mindkettő ugyanazt mondja.
 *
 * Ezt a kötést nem őrzi teszt, és ez a szakasz kimondja, miért: a fehérlista
 * útvonalakat tart (`/elfelejtett-jelszo`), a tájékoztató magyar oldalneveket
 * („az elfelejtett jelszó űrlapon"). A kettő összevetése gépileg csak egy
 * harmadik, kézzel karbantartott szótáron át menne — ami ugyanúgy elcsúszhat,
 * csak eggyel messzebb.
 *
 * # 2026. szeptember 20. — jogi felülvizsgálat, első kör
 *
 * Egy külső átnézés huszonkét pontot talált; ebből hét volt P0. Amit ez a
 * szakasz átírt, és **miért volt mindegyik valótlan vagy hiányos**:
 *
 * 1. **Az AI-lánc nem volt azonosítható** (1. pont). „A kiolvasást végző modell
 *    szolgáltatója" nem cégnév, miközben az ÁSZF 11. pontja név szerinti
 *    felsorolást ígér. Most **mérve** tudjuk, ki az: az OpenRouter API-ja
 *    szerint a modellt hat végpont szolgálja ki, és mind a hat a Google. A
 *    kérés azóta kódból is csak ezt engedi, tartalék útvonal nélkül.
 * 2. **A továbbítási garancia egyetlen általános mondat volt** (2. pont).
 *    Most szolgáltatónként mutatunk a garancia forrására, és kimondjuk, hogy
 *    a továbbítási mechanizmus **nem azonos** az adatkezelés jogalapjával.
 * 3. **A „nem tárolják és nem tanítanak vele" egy ígéretként szerepelt**
 *    (3. pont). Kettő: a nulla adatmegőrzés és a tanítás tiltása külön kérés,
 *    és egyik sem helyettesíti a másikat.
 * 4. **A törlés „azonnali, másolat nélküli" volt** (4. pont) — ilyen nincs.
 *    Most három lépcső: aktív rendszer, mentések kifutása, közreműködők.
 * 5. **A könyvelőirodás használat nem volt lefedve** (5. pont). Az útmutató
 *    hirdeti, a jogi szöveg viszont mindig az Előfizetőt nevezte adatkezelőnek.
 *    Az 1. pont most három szerepet ismer, és kimondja, hogy az ügyfélszűrő
 *    **nem jogosultsági korlát**.
 * 6. ⚠️ **A 7. pont valótlant állított** (7. pont). Szó szerint ez állt benne:
 *    „nincs olyan út, amelyen hitelesítés nélkül lehetne iratot elhelyezni a
 *    rendszerben" — miközben az e-mailes beküldés pontosan ilyen út. Ez a
 *    legsúlyosabb fajta hiba ebben a projektben: nem hiányzott egy mondat,
 *    hanem egy meglévő mondat lett hamissá egy új funkciótól.
 * 7. **A megőrzési idők** (12. pont) három adatkörre „a szerződés
 *    megszűnéséig" álltak. Most kilencven nap mindhármon, és **a törlést napi
 *    cron végzi** (`20260920000400_adattakaritas.sql`) — a szám nem ígéret
 *    marad, hanem lefut.
 * 8. **A sütiablak indoklása** (14. pont) arra hivatkozott, hogy a munkamenet
 *    „nem süti". Ez önmagában nem mentesít: ugyanaz a mérce vonatkozik a
 *    böngésző más tárolóira is. Most azt mondjuk, ami az indok: az egyik
 *    feltétlenül szükséges, a másik pedig semmit nem tárol az eszközön.
 * 9. **A saját számlák megőrzése** (13. pont) „számviteli előírásokra"
 *    hivatkozott. A Szolgáltató egyéni vállalkozó, akire a számviteli törvény
 *    főszabály szerint nem terjed ki — a helyes hivatkozás az adójogi
 *    iratmegőrzés.
 *
 * ⛔ **Ami nyitva maradt, és amit nem lehet kódból megoldani:** az egyes
 * közreműködőknél alkalmazott *konkrét* továbbítási mechanizmus (megfelelőségi
 * határozat kontra általános szerződési feltételek) az általuk elfogadott
 * adatfeldolgozási szerződésből derül ki. A tájékoztató ezért a garancia
 * **forrására** mutat — ezt kéri a felülvizsgálat 2. pontja is —, a szerződések
 * elfogadása és bizonyítékuk megőrzése viszont üzemeltetői feladat.
 *
 * # 2026. szeptember 22. — jogi felülvizsgálat, második kör
 *
 * Négy pont érintette ezt a szöveget, és mind ugyanabból a tőről fakadt: a
 * tájékoztató **kevesebbet mondott, mint amennyi történik**.
 *
 * - **2. pont — a jogalapok.** Egyetlen sor fedte a „szerződő fél
 *   képviselőjét", „szerződés teljesítése" jogalappal. Ez egyéni vállalkozónál
 *   helyes, társaság képviselőjénél nem: a társaság szerződése nem az ő
 *   szerződése. A sor **négyfelé vált**: cég előtti regisztráció, egyéni
 *   vállalkozó, társasági képviselő, és az ÁSZF-elfogadás nyilvántartása.
 * - **10. pont — a nyers válasz és a javítások.** Egy sorban ültek, pedig a
 *   megőrzésük **eltér**: a nyers válasz {nyersNap} nap után kiürül, a javítási
 *   előzmény a bizonylattal együtt marad. Külön sort kaptak, külön céllal.
 * - **13. pont — a látogatásmérés.** A táblázatban **egyetlen sor sem** szólt
 *   róla, tehát jogalapja sem volt megjelölve; a leírás pedig „oldalanként
 *   összesített látogatásszámot" említett, holott a szolgáltató ennél többet
 *   kezel (hivatkozó oldal, ország, eszköz, böngésző, nem tartós azonosító).
 *   Most saját sora van, jogos érdek jogalappal és érdekmérlegeléssel.
 * - **2. és 3. pont — az Unión kívüli feldolgozás.** Az 5. pont összefoglalója
 *   azt mondta, hogy „Unión kívülre két dolog megy", miközben a **saját
 *   táblázata négy sort** jelölt annak. Külön kimondva a Resend: a fogadás és a
 *   küldés útvonala EU-régióban fut, az üzenettartalom **tárolása viszont az
 *   Egyesült Államokban** — a régióválasztás az útvonalat szabályozza, nem a
 *   tárolás helyét.
 *
 * Egy ötödik, ami a 3. ponthoz tartozik: **a fel nem ismert XML a modellhez
 * kerül.** A szöveg addig úgy hangzott, mintha minden XML helyben maradna. A
 * kód szándékosan ejti tovább az ismeretlen alakot (`felderites.ts`), és ez jó
 * tervezés — de adatvédelmi különbséget jelent, tehát ki kell mondani.
 *
 * ⚠️ Egy mondatot menet közben **kivettem**, mert megmérve nem volt igaz: hogy
 * az Ellenőrzés képernyő megmutatná, a saját értelmezőnk vagy a modell
 * olvasta-e ki a bizonylatot. A `document_extractions.model` oszlop tudta, a
 * felület viszont nem jelenítette meg. Egy jogi szövegbe írt, kód nélküli
 * ígéret pontosan az a hibaosztály, amit ez a projekt végig irtott.
 *
 * **2026-09-22: a kód utolérte a szöveget**, és most a szöveg mondja ki, amit a
 * kód csinál — nem fordítva. A `kiolvasoForras.ts` fordítja a `model` oszlopot
 * emberi mondatra, és két helyen látszik: az Ellenőrzés képernyő tetején egy
 * semleges sávban, a Beérkező listájában pedig a bizonylat sorában.
 * **Mindkét ágon** kiírjuk, nem csak az egyiken: egy jelzés, ami csak a saját
 * értelmezőnél jelenne meg, a hiányával állítana — és a hiányból olvasott
 * állítás ebben a projektben mindig rosszul sült el.
 *
 * # 2026. szeptember 23. — harmadik kör, ügyvédtől
 *
 * Három állítás itt **mérve volt hamis**, és mindháromnál a valóság
 * változott vagy a mondat, nem a hangsúly:
 *
 * - **„A böngészőből feltöltött bizonylat végig az Unión belül marad."** Nem
 *   marad: a modellhez kerül (USA), és a DPA-k szerint a tárhelyszolgáltató
 *   szerződő fele is szingapúri (Supabase Pte. Ltd, SCC). A mondat most azt
 *   mondja, ami igaz: a böngészős feltöltés a Resendet kerüli el, semmi mást.
 * - **„A látogatásmérés … onnan semmit nem olvas ki."** A visszaolvasott, aznap
 *   frissült mérőkód (v0.1.3) minden oldalmegnyitáskor olvasta a
 *   `localStorage` `__va_attribution` kulcsát. A tulajdonos döntése: a mérés
 *   **kikapcsolva**, a szöveg azt mondja, ami volt és ami van.
 * - **A Supabase `unionBelul: true`-ja** — lásd `adatok.ts`.
 *
 * Ami a kódban is változott: az ÁSZF-elfogadás bizonyítéka öt évig túléli a
 * cég törlését, a cég nélküli fiók 180 nap után magától törlődik
 * (`20260923000400`), és a „szolgáltató saját megőrzési ideje szerint"
 * fordulat helyére a belépési naplóknál konkrét szám került (hét nap, a
 * Supabase Pro csomagjának naplómegőrzése — dokumentációból, nem mérve). Az
 * incidensszakasz szétvált: adatfeldolgozóként 48 óra az Előfizető felé,
 * adatkezelőként a kockázatértékelés és a 72 órás hatósági bejelentés.
 */
export function Adatkezeles() {
  const modell = szamlafolyo.modell.alapertelmezett;
  const maxNap = szamlafolyo.megorzes.maxNap;
  const exportNap = szamlafolyo.megorzes.exportNap;
  const meghivoNap = szamlafolyo.megorzes.meghivoNap;
  const levelNap = szamlafolyo.megorzes.levelNaploNap;
  const nyersNap = szamlafolyo.megorzes.nyersValaszNap;
  const inaktivNap = szamlafolyo.megorzes.inaktivFiokNap;
  const aszfEv = szamlafolyo.megorzes.aszfBizonyitekEv;

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
        <P>
          Attól függően, <em>milyen adatról</em> van szó, a Szolgáltató más-más szerepben jár
          el. Három esetet érdemes szétválasztani:
        </P>
        <Lista>
          <li>
            <strong>A fiók adataira nézve a Szolgáltató az adatkezelő.</strong> Ide tartozik a
            regisztráló neve, e-mail címe, a cég neve és adószáma, valamint az előfizetés adatai.
          </li>
          <li>
            <strong>A saját bizonylataira nézve az Előfizető az adatkezelő</strong>, a
            Szolgáltató pedig adatfeldolgozó. A bizonylatokon szereplő adatok — köztük személyes
            adatok, ha a partner egyéni vállalkozó vagy magánszemély — az Előfizető birtokában
            lévő iratokból származnak. A Szolgáltató ezeket kizárólag a Szolgáltatás nyújtása
            érdekében, az Előfizető utasításai szerint kezeli: nem elemzi más célra, harmadik
            félnek <strong>kizárólag az 5. pontban ismertetett közreműködőknek</strong>, a
            Szolgáltatás teljesítéséhez szükséges körben továbbítja, és a szerződés
            megszűnésekor a 4. pont szerint törli.
          </li>
          <li>
            <strong>
              Ha az Előfizető az ügyfele megbízásából dolgozza fel a bizonylatokat — például
              könyvelőirodaként —, akkor ő maga is adatfeldolgozó, a Szolgáltató pedig
              al-adatfeldolgozó.
            </strong>{' '}
            Ilyenkor az adatkezelő az Előfizető ügyfele, és az Előfizető felel azért, hogy a
            Szolgáltató igénybevételéhez az ügyfelétől megkapja a további adatfeldolgozó
            bevonására szóló felhatalmazást. A Szolgáltató kötelezettségei ettől nem változnak:
            ugyanazok terhelik, amelyeket az{' '}
            <Link to="/aszf" className="underline">
              ÁSZF 11. pontja
            </Link>{' '}
            rögzít.
          </li>
        </Lista>
        <P>
          ⚠️ <strong>A rendszer ügyfélszűrője nem jogosultsági korlát.</strong> Egy cégen belül
          minden felhasználó a cég <em>összes</em> bizonylatát látja, a szerepköréhez tartozó
          jogokkal; az ügyfelekre bontás az exportban kényelmi szűrés, nem hozzáférési határ.
          Aki több ügyfélnek dolgozik egy cégben, annak ezt a saját hozzáférési szabályainál
          figyelembe kell vennie: az egyes ügyfelek elkülönítéséhez külön cég (és külön
          előfizetés) szükséges.
        </P>
      </Szakasz>

      <Szakasz cim="2. Milyen adatokat kezelünk">
        <P>
          A táblázat célonként bontja az adatkezelést. Ami az{' '}
          <strong>Előfizető utasítása</strong> jogalapot viseli, azt a Szolgáltató
          adatfeldolgozóként kezeli (1. pont) — ott a jogalapot nem a Szolgáltató választja meg,
          hanem az adatkezelő Előfizető.
        </P>
        <Tablazat fejlec={['Mit', 'Miért', 'Jogalap', 'Meddig']}>
          <tr className="trow">
            <td className="td">
              <strong>Regisztráló</strong> e-mail címe és jelszava, még a cég létrehozása{' '}
              <em>előtt</em> — és minden olyan fiók adata, amelyhez éppen nem tartozik cég
              (például aki kilépett a cégéből)
            </td>
            <td className="td">
              Fiók létrehozása, belépés. Ekkor még nincs szerződés (ÁSZF 1.): a fiók önmagában
              nem köti a Szolgáltatót és nem jogosít a Szolgáltatás használatára
            </td>
            <td className="td">
              A jogalap attól függ, <em>kinek a nevében</em> készül a szerződés.{' '}
              <strong>Aki egyéni vállalkozóként, a saját nevében</strong> kíván szerződni, annál
              az érintett kérésére történő, szerződéskötést megelőző lépések megtétele — ő lesz
              a szerződő fél. <strong>Aki egy társaság leendő képviselőjeként</strong>
              regisztrál, annál jogos érdek: a társasággal kötendő szerződés előkészítése, mert
              nem ő maga lesz a szerződő fél. Az érdekmérlegelés eredménye az, hogy csak a
              belépéshez elengedhetetlen két adatot kezeljük, és a fiók bármikor törölhető
            </td>
            <td className="td">
              A cég létrehozásáig. Ha az elmarad, a fiók törléséig — a törlés a felületről
              bármikor elvégezhető —, de a cég nélküli fiókot{' '}
              <strong>{inaktivNap} nap belépés nélkül</strong> (belépés hiányában a
              regisztrációtól számítva) a rendszer magától törli
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              <strong>Egyéni vállalkozó</strong> Előfizető neve, e-mail címe, jelszava
            </td>
            <td className="td">Fiók, belépés, értesítések</td>
            <td className="td">
              Szerződés teljesítése — nála az érintett és a szerződő fél <em>ugyanaz</em> a
              személy, a vállalkozói minőségében eljárva
            </td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A szerződő <strong>társaság képviselőjének</strong> neve, e-mail címe, jelszava
            </td>
            <td className="td">
              Fiók, belépés, értesítések. A szerződést a társaság kötötte, nem ő — ezért rá a
              „szerződés teljesítése" jogalap nem illik
            </td>
            <td className="td">
              Jogos érdek: a szerződés teljesítéséhez azonosítható kapcsolattartó kell mindkét
              oldalon. Az érdekmérlegelés eredménye az, hogy a legszűkebb adatkört kezeljük, az
              adat forrása maga az érintett, és a hozzáférését bármikor megszüntetheti
            </td>
            <td className="td">A képviselői hozzáférés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              <strong>Az ÁSZF elfogadásának nyilvántartása:</strong> az elfogadott változat
              azonosítója, az időpont, az eljáró felhasználó (e-mail-címmel) és a cég (névvel,
              adószámmal); mellette az elfogadott változat teljes, utólag nem módosított szövege
            </td>
            <td className="td">
              Annak igazolása, hogy a szerződés létrejött, és <em>melyik szöveggel</em>. Az
              időpont önmagában erre nem volna elég
            </td>
            <td className="td">
              Jogos érdek: a szerződés létrejöttének és tartalmának bizonyíthatósága, valamint
              az elszámoltathatóság
            </td>
            <td className="td">
              A szerződés megszűnésétől számított <strong>{aszfEv} évig</strong> (a Polgári
              Törvénykönyv általános elévülési ideje) — <em>a cég adatainak törlése után is</em>,
              mert a bizonyítékra épp egy későbbi vitában lehet szükség. Ez szűk kivétel: csak az
              elfogadás nyoma marad meg, a cég egyéb adatai nem. Utána a rendszer magától törli
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A cég <strong>meghívott munkatársának</strong> neve, e-mail címe, jelszava és
              szerepköre
            </td>
            <td className="td">
              Hozzáférés a cég bizonylataihoz. Ő maga jellemzően nem szerződő fél — a szerződést
              a cég kötötte —, ezért rá nem a „szerződés teljesítése" jogalap illik
            </td>
            <td className="td">
              Jogos érdek: a cég munkaszervezése és a hozzáférések kezelése. Az érdekmérlegelés
              eredménye az, hogy a munkavégzéshez elengedhetetlen, legszűkebb adatkört kezeljük,
              és az érintett a hozzáférését bármikor megszüntetheti
            </td>
            <td className="td">A tagság megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">Cégnév, adószám</td>
            <td className="td">A cég azonosítása, jogosultság a szolgáltatásra</td>
            <td className="td">Szerződés teljesítése</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">Előfizetés és fizetés adatai (Stripe-azonosító, állapot, időszak)</td>
            <td className="td">Az előfizetés kezelése, keretszámítás</td>
            <td className="td">Szerződés teljesítése</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">Számlázási adatok és a kiállított számlák</td>
            <td className="td">Számlakiállítás és -megőrzés</td>
            <td className="td">Jogi kötelezettség teljesítése</td>
            <td className="td">A 4. pont szerinti adójogi iratmegőrzési ideig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              Feltöltött vagy e-mailben beküldött bizonylatok és a belőlük kiolvasott adatok
            </td>
            <td className="td">A Szolgáltatás nyújtása</td>
            <td className="td">Az Előfizető utasítása (adatfeldolgozás)</td>
            <td className="td">Lásd a 4. pontot</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A modell <strong>nyers válasza</strong> (a bizonylatról kiolvasott mezők abban az
              alakban, ahogy a modell adta)
            </td>
            <td className="td">
              Annak ellenőrzése, hogy a gépi kiolvasás helyesen működött-e az adott
              bizonylaton, és hogy egy vitatott tétel utólag rekonstruálható legyen
            </td>
            <td className="td">Az Előfizető utasítása (adatfeldolgozás)</td>
            <td className="td">
              <strong>{nyersNap} nap</strong>, azután a válasz automatikusan kiürül. A
              kiolvasás <em>sora</em> megmarad — abból számoljuk a keretet —, de a bizonylat
              tartalmát hordozó válasz nem
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A jóváhagyáskor végzett <strong>javítások</strong> (mely mezőt mire írta át az
              ember)
            </td>
            <td className="td">
              Kétféle célt szolgál, és egyik sem a mi termékfejlesztésünk: (1) a cégen belüli
              visszakövethetőség — ki min változtatott —, és (2) annak mérése, mennyire
              megbízható a gépi kiolvasás <em>ennél az Előfizetőnél</em>, ami a gépi jóváhagyás
              küszöbeinek helyességéről az egyetlen visszajelzés (6. pont). Saját célú
              elemzésre, profilalkotásra, prompt- vagy modellfejlesztésre, illetve
              modelltanításra <strong>nem</strong> használjuk fel
            </td>
            <td className="td">Az Előfizető utasítása (adatfeldolgozás)</td>
            <td className="td">
              A szerződés megszűnéséig. ⚠️ A javítási előzmény <em>nem</em> ürül ki a nyers
              válasszal együtt: a javított és a javítás előtti érték a bizonylat mellett marad,
              amíg maga a bizonylat
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A beküldő címre érkezett levelek feladója, tárgya és sorsa (a levél szövege nem)
            </td>
            <td className="td">
              Hogy a cég lássa, mi történt az odaküldött levéllel — a csendben eldobott levél a
              legrosszabb kimenetel
            </td>
            <td className="td">Az Előfizető utasítása (adatfeldolgozás)</td>
            <td className="td">{levelNap} nap</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A meghívott kolléga e-mail címe, a meghívó szerepköre és sorsa (elküldve,
              elfogadva, visszavonva, lejárt)
            </td>
            <td className="td">
              Hozzáférés adása a cég bizonylataihoz. A címet a cég tulajdonosa adja meg — ez az
              adat forrása, és a meghívott a meghívólevélből értesül róla
            </td>
            <td className="td">Jogos érdek: a cég hozzáférés-kezelése</td>
            <td className="td">A lezárulástól számított {meghivoNap} nap</td>
          </tr>
          <tr className="trow">
            <td className="td">
              <strong>Érdeklődői és ügyfélszolgálati levelezés</strong> (a hozzánk írt levél
              feladója és tartalma)
            </td>
            <td className="td">A megkeresés megválaszolása, a panasz kivizsgálása</td>
            <td className="td">
              Jogos érdek: a megkeresésre válaszolni kell, és a válasz utólag visszakereshető
              legyen. <strong>Panasznál</strong> kettéválik: ha a panaszos a fogyasztóvédelmi
              törvény szerint fogyasztónak minősül, a panasz és a válasz megőrzése jogi
              kötelezettség; minden más — vállalkozói — panasznál jogos érdek (a panasz
              kivizsgálhatósága és egy esetleges igény elbírálása)
            </td>
            <td className="td">
              A megkeresés lezárásától számított egy év. Panasznál: fogyasztónak minősülő
              panaszosnál a fogyasztóvédelmi törvényben előírt ideig, egyébként a panasz
              lezárásától számított öt évig (az általános elévülési idő)
            </td>
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
            <td className="td">
              <strong>Hét nap</strong> — ennyi ideig őrzi a Supabase a projekt naplóit a
              Szolgáltató csomagjában. Az adatbázisban a Szolgáltató belépési naplót nem tárol
            </td>
          </tr>
          <tr className="trow">
            <td className="td">Munkamenet-adat a böngésző saját tárolójában</td>
            <td className="td">Bejelentkezett állapot fenntartása</td>
            <td className="td">A szolgáltatáshoz feltétlenül szükséges</td>
            <td className="td">Kilépésig, illetve a munkamenet lejártáig</td>
          </tr>
        </Tablazat>
        <P>
          <strong>Kötelező-e megadni?</strong> A <em>fiókadatok</em> (e-mail cím, jelszó), a{' '}
          <em>cégadatok</em> (cégnév, adószám) és az <em>ÁSZF elfogadása</em> a szerződés
          megkötéséhez és teljesítéséhez szükségesek: megadásuk nélkül fiók és cég nem hozható
          létre, tehát a Szolgáltatás nem vehető igénybe. A <em>fizetési adatok</em> a fizetős
          előfizetéshez kellenek, a próbaidőhöz nem. Minden más adat a használatból keletkezik.
        </P>
        <P>
          ⚠️ <strong>A tájékoztató tudomásulvétele nem hozzájárulás.</strong> A regisztrációkor
          adott elfogadás a szerződés megkötésére vonatkozik, és nem jelent a fenti táblázat
          minden sorát lefedő adatkezelési hozzájárulást: minden sornak saját jogalapja van. A
          jogos érdeken alapuló kezelések ellen az érintett a 8. pont szerint tiltakozhat.
        </P>
        <P>
          <strong>Látogatásmérés nincs, sütit mérésre vagy hirdetésre nem használunk.</strong>{' '}
          Hirdetési kódrészlet nincs, profilalkotás nincs, és más webhelyeken sem követünk
          senkit. A nyilvános oldalakon 2026. szeptember 20. és 23. között látogatásmérés futott
          (Vercel Web Analytics); 2026. szeptember 23-án kikapcsoltuk, mert a mérőkód a
          látogató böngészőjének tárolójából is olvasott, és ezzel a hozzájárulás nélküli
          mérés indoka megdőlt.
        </P>
        <P>
          <strong>Miért nem fogadja süti-ablak a látogatót.</strong> Az eszközön történő
          tárolásra és az onnan való adatkiolvasásra vonatkozó szabály nem attól függ, hogy a
          tárolás süti-e vagy a böngésző más tárolója — a kettőt ugyanaz a mérce érinti. Az
          oldal egyetlen ilyen tárolást használ: <strong>a bejelentkezett állapotot</strong>, a
          böngésző saját tárolójában. Ez a felhasználó által kifejezetten kért szolgáltatás
          nyújtásához <strong>feltétlenül szükséges</strong> — enélkül minden oldalváltásnál újra
          be kellene lépni —, és az ilyen tároláshoz nem kell hozzájárulás.
        </P>
        <P>
          ⚠️ Ha a weboldal egyszer olyan eszköztárolást vagy kiolvasást kezdene használni, ami
          nem feltétlenül szükséges — például újra látogatásmérést —, az csak hozzájárulással
          indulhat, és ez a bekezdés <em>előtte</em> változik.
        </P>
      </Szakasz>

      <Szakasz cim="3. Mi történik egy beérkezett bizonylattal">
        <P>Ez a tájékoztató legfontosabb szakasza, mert itt hagyják el az adatok a szervert.</P>
        <Lista>
          <li>
            A bizonylat a böngészőből, feltöltéssel érkezik — vagy, ha a cég ezt bekapcsolta, a
            cég saját beküldő címére küldött levél mellékleteként. Mindkét esetben az{' '}
            <strong>Európai Unión belül, frankfurti kiszolgálón</strong> tárolódik.
          </li>
          <li>
            <strong>Az e-mailes beküldésnél</strong> a levelet a Resend fogadja, és webhookon
            adja át nekünk. A levélből a <strong>melléklet tartalmát</strong> vesszük át; a
            levél szövegéből <em>mi</em> semmit nem tárolunk. A feladó címét és a tárgyat
            megőrizzük, de kizárólag azért, hogy a cég látni tudja, mi történt az odaküldött
            levéllel — egy csendben eldobott számla rosszabb, mint egy elutasított. Ha a
            címzett cím ismeretlen, a levélről <strong>semmit nem tárolunk.</strong>
          </li>
          <li>
            ⚠️ <strong>Abból, hogy mi nem tároljuk a levél szövegét, nem következik, hogy a
            levélküldő sem kezeli.</strong> A beküldő címre érkező levél — a{' '}
            <strong>teljes szövegével és mellékletével együtt</strong> — először a Resend
            rendszerébe érkezik. A fogadás és a küldés útvonala EU-régióban (Írország) fut, a
            szolgáltató saját tájékoztatása szerint viszont az üzenettartalmat és a naplókat az{' '}
            <strong>Egyesült Államokban tárolja</strong>: a régió megválasztása az útvonalat
            szabályozza, nem a tárolás helyét. Ez tehát Unión kívüli adattovábbítás, a saját
            megőrzési idejük szerint — az 5. pont táblázata így is tünteti fel. Aki ezt el
            akarja kerülni, ne használja az e-mailes beküldést: a böngészőből feltöltött
            bizonylat <strong>a Resendet nem érinti</strong>. ⚠️ Ez nem jelenti azt, hogy az
            Unión belül marad: ha a bizonylatot a modell olvassa ki, a tartalma a következő
            bekezdés szerint az Unión kívülre kerül, és a tárhelyszolgáltatónál is van Unión
            kívüli hozzáférés (5. pont).
          </li>
          <li>
            A kiolvasáshoz a bizonylat tartalma — a PDF vagy a kép — <strong>elhagyja a
            szervert</strong>. Az útvonal <strong>két, név szerint megnevezett közreműködőn</strong>{' '}
            vezet át: az <strong>OpenRouter</strong> továbbítja a kérést, a kiolvasást a{' '}
            <strong>Google</strong> modellje végzi (jelenleg: <code>{modell}</code>). Mindkettő
            szerepel az 5. pont táblázatában, székhellyel és feldolgozási országgal. A modellnek
            a bizonylat mellett a saját cég nevét és adószámát küldjük el, hogy tudja, melyik
            oldalon állunk. <strong>A fiók adatait — a felhasználók nevét, e-mail-címét,
            jelszavát — nem küldjük el.</strong> A bizonylat maga viszont tartalmazhat neveket és
            e-mail-címeket (például a kiállító elérhetőségét): ezek a bizonylat tartalmaként
            ugyanúgy eljutnak a modellhez.
          </li>
          <li>
            <strong>A címzettek köre kódból zárt.</strong> A kérés felsorolja, mely szolgáltatók
            szolgálhatják ki, és <strong>kikapcsolja a tartalék útvonalat</strong> — vagyis nincs
            az a helyzet, amelyben a bizonylat egy meg nem nevezett szolgáltatóhoz kerülne azért,
            mert a megnevezett épp nem elérhető. Ilyenkor a kiolvasás inkább hibával megáll, a
            bizonylat a Beérkezőben marad, és újrapróbálható.
          </li>
          <li>
            <strong>Két külön kikötés, mert két külön ígéret.</strong> A kérés egyrészt{' '}
            <strong>nulla adatmegőrzésű</strong> végpontot kér — vagyis hogy a tartalmat ne is
            tárolják —, másrészt kizárja azokat, amelyek az adatot{' '}
            <strong>modelltanításra</strong> használhatják. A kettő nem ugyanaz, és egyiket sem
            lehet a másikkal helyettesíteni. Ezek a kikötések a kódban vannak, nem a
            beállításokban: <strong>környezeti változóból nem kapcsolhatók ki.</strong>
          </li>
          <li>
            ⚠️ <strong>Amit ez a kikötés önmagában nem old meg, és ezért kimondjuk:</strong> a
            továbbító szolgáltató a kérésre vonatkozó adatpolitikát a saját legjobb tudása
            szerint érvényesíti. Az ezen túli garanciát a közreműködőkkel kötött
            adatfeldolgozási szerződések adják, amelyekre az 5. pont mutat.
          </li>
          <li>
            <strong>A feltöltött bizonylatokat mi magunk sem használjuk mesterséges
            intelligencia tanítására</strong> — sem sajátéra, sem harmadik félére —, és külön
            megállapodás hiányában erre nem is vagyunk jogosultak.
          </li>
          <li>
            <strong>A megőrzött nyers modellválasz és a javítások célja szűk, és nem a mi
            termékfejlesztésünk.</strong> Kizárólag azt mérjük belőlük, hogy a gépi kiolvasás
            helyesen működik-e — vagyis a Szolgáltatás szerződésszerű teljesítését ellenőrizzük,
            az Előfizető utasításának keretében. Saját célú elemzésre, profilalkotásra vagy
            prompt- és modellfejlesztésre <strong>nem</strong> használjuk fel őket. A nyers
            válasz {nyersNap} nap után automatikusan kiürül.
          </li>
          <li>
            <strong>A felismert e-számla XML feldolgozása modellhívás nélkül történik:</strong>{' '}
            az ilyen irat tartalma nem hagyja el a szervert. A rendszer négy XML-alakot ismer
            fel saját értelmezővel: UBL, Factur-X/ZUGFeRD (CII), NAV Online Számla, és a
            régebbi APEH 2005 számla adatexport. Ez a <strong>hibrid e-számlára</strong> is
            vonatkozik, amelynél az XML a PDF mellékleteként érkezik: ha a rendszer felismeri a
            beágyazott XML-t, a bizonylat — a PDF-fel együtt — el sem indul a modellhez.
          </li>
          <li>
            ⚠️ <strong>A fel nem ismert XML viszont a modellhez kerül — ez az egyetlen hely,
            ahol az „az XML nem hagyja el a szervert" szabály nem áll.</strong> Ha egy XML a
            fenti négy alak egyikébe sem illik, a rendszer nem utasítja el, hanem a szokásos
            gépi kiolvasás útjára engedi: a <strong>tartalma ugyanúgy elhagyja a szervert</strong>,
            mint egy PDF-é, ugyanazon a két megnevezett közreműködőn át, ugyanazokkal a fenti
            kikötésekkel. Ugyanez áll a hibrid e-számlára, ha a beágyazott XML-t nem ismerjük
            fel: olyankor a PDF megy ki, a benne lévő melléklettel együtt.
          </li>
          <li>
            Ez <strong>szándékos tervezés</strong>, nem hiányosság: egy ismeretlen alakú irat így
            nem akad el a feldolgozásban, hanem feldolgozásra kerül. De mivel adatvédelmi
            különbséget jelent, kimondjuk — és <strong>bizonylatonként meg is mutatjuk</strong>.
            Az Ellenőrzés képernyő tetején egy sor nevezi meg, hogy az adatok a saját
            értelmezőnktől (a felismert e-számla alakjának nevével együtt) vagy a modelltől
            származnak-e, és ugyanez áll a Beérkező listájában, a bizonylat sorában. Ahol nincs
            kiírva, ott a bizonylat még nem futott le. Ha egy konkrét iratról ezen felül is
            kérdésed van, a {szolgaltato.email} címen megkérdezheted.
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
            <strong>Export fájlok:</strong> az elkészültüktől számított{' '}
            <strong>legfeljebb {exportNap} napig</strong>, azután automatikusan törlődnek. Ez az
            idő nem hosszabbítható és nem állítható: az export bármikor újrakészíthető a
            jóváhagyott tételekből, tehát a hosszabb tárolás nem ad többet, csak kockázatot. Az
            elkészült exportok <em>nyilvántartása</em> (mikor, milyen formátumban, hány tétellel)
            a fájl törlése után is megmarad.
          </li>
          <li>
            <strong>A modell nyers válasza:</strong> a kiolvasástól számított{' '}
            <strong>{nyersNap} nap</strong>, azután automatikusan kiürül. A kiolvasás{' '}
            <em>sora</em> megmarad — abból számoljuk a havi keretet —, de a bizonylat tartalmát
            hordozó válasz nem.
          </li>
          <li>
            <strong>A beküldő címre érkezett levelek nyilvántartása</strong> (feladó, tárgy,
            eredmény — a levél szövege nem): <strong>{levelNap} nap</strong>. Ennyi idő alatt
            egy negyedéves könyvelési kör egyszer végigfut; ami ennél régebbi, azt már nem
            keresi vissza senki.
          </li>
          <li>
            <strong>Lezárult meghívók</strong> (elfogadott, visszavont vagy lejárt): a lezárulástól
            számított <strong>{meghivoNap} nap</strong>. Az élő meghívó a lejáratáig marad.
          </li>
          <li>
            <strong>Kiolvasott és jóváhagyott adatok, a cég adatai:</strong> a szerződés
            megszűnéséig. Az előfizetés lemondása a szerződést nem szünteti meg. A megszűnés
            módjától függ, mikor törlődnek (
            <Link to="/aszf" className="underline">
              ÁSZF 10. és 16. pont
            </Link>
            ): ha az Előfizető maga törli a céges munkaterületet, azonnal; ha a Szolgáltató mond
            fel, a megszűnéstől számított harminc napon belül; szolgáltatóváltásnál az
            adat-visszanyerési időszak végén.
          </li>
          <li>
            <strong>Cég nélküli fiók</strong> (aki regisztrált, de céget nem hozott létre, vagy
            kilépett a cégéből): <strong>{inaktivNap} nap belépés nélkül</strong> — belépés
            hiányában a regisztrációtól számítva — a rendszer magától törli.
          </li>
          <li>
            <strong>Az ÁSZF elfogadásának nyilvántartása:</strong> a szerződés megszűnésétől
            számított <strong>{aszfEv} év</strong>, a cég törlése után is (2. pont).
          </li>
          <li>
            <strong>Belépési kísérletek adatai (IP-cím):</strong> ezeket a felhasználókezelést
            végző Supabase naplózza, és a Szolgáltató csomagjában <strong>hét napig</strong>{' '}
            őrzi. A Szolgáltató ezekről külön nyilvántartást nem vezet, és a Szolgáltatás
            felületén nem jelennek meg.
          </li>
          <li>
            <strong>Számlázási adatok:</strong> a Szolgáltatóra irányadó adójogi iratmegőrzési
            ideig. A Szolgáltató egyéni vállalkozó, akire a számviteli törvény főszabály szerint
            nem terjed ki; a megőrzés alapja ezért az adózás rendjéről szóló törvény szerinti
            iratmegőrzési kötelezettség, amely az adómegállapításhoz való jog elévüléséhez
            igazodik. Ez jogszabályi kötelezettség, törlési kérésre sem szüntethető meg. A
            megőrzés <strong>a számlákra és a hozzájuk tartozó bizonylatokra</strong> vonatkozik,
            nem minden előfizetési technikai adatra.
          </li>
        </Lista>
        <P>
          <strong>A fiók törlése</strong> a Beállítások képernyőről indítható, és{' '}
          <strong>azonnal</strong> megtörténik — nem kérelem, hanem művelet. A képernyő előbb
          kiírja, pontosan mi tűnik el, és a cég adatait érintő törléshez a cég nevét is be kell
          gépelni. Ha bármi elakad, a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen is kérhető. A törléssel a felhasználói fiók megszűnik. Ha ezzel a cégnek nem marad
          felhasználója, vele együtt törlődnek a cég bizonylatai, a kiolvasott adatok, az
          exportok, a naplóbejegyzések és a szerveren lévő fájlok is, az esetleges
          Stripe-előfizetést pedig lemondjuk. A törlés nem vonható vissza.
        </P>
        <P>
          <strong>Mit jelent pontosan a „törölve" — három lépésben.</strong> Egy őszinte
          tájékoztató itt nem állíthat pillanatszerű, nyom nélküli megszűnést, mert egy
          üzemszerűen működő rendszerben ilyen nincs:
        </P>
        <Lista>
          <li>
            <strong>Az aktív rendszerből azonnal.</strong> A törlés pillanatában az adat eltűnik
            az adatbázisból és a fájltárolóból; a Szolgáltatás felületén és az API-n keresztül
            sem érhető el többé. A felhasználó által indított törlés{' '}
            <strong>nem vonható vissza</strong>: egyedi visszaállításra nincs lehetőség.
          </li>
          <li>
            <strong>A biztonsági mentésekből kifutással, legfeljebb hét nap alatt.</strong> Az
            adatbázisról a tárhelyszolgáltató üzemfolytonossági célú mentéseket készíthet,
            amelyek a törlés után még tartalmazhatják az adatot. Ennek a megőrzési ideje a
            tárhelyszolgáltató csomagjától függ, és <strong>a hét napot nem haladja meg</strong>{' '}
            — a hetedik nap után a törölt adat a mentésekből is kifut. Ezeket a mentéseket{' '}
            <strong>kizárólag teljes helyreállításra</strong> használjuk, egyedi visszakeresésre
            soha. Egy teljes helyreállítás technikailag visszahozná a mentés óta törölt adatot
            is — ezért ilyenkor a mentés óta törölt ügyféladatok törlését{' '}
            <strong>a rendszer újbóli megnyitása előtt megismételjük</strong>, és a helyreállítás
            nem teszi újra elérhetővé őket.
          </li>
          <li>
            <strong>A közreműködőknél a saját feltételeik szerint.</strong> A levélküldő
            szolgáltatónál a kimenő és bejövő levelekről a saját rendszerében maradhat nyom, a
            fizetési szolgáltatónál pedig a tranzakciók adata — ezekre az 5. pont táblázatában
            hivatkozott feltételeik irányadók. A Szolgáltató ezeket nem tudja a saját törlésével
            egyidejűleg megszüntetni.
          </li>
        </Lista>
        <P>
          Három dolog marad meg szándékosan. A <strong>már kiállított számlák</strong> a fenti
          adójogi megőrzési idő végéig megmaradnak — ezt nem mi választjuk, és törlési kérésre
          sem szüntethető meg. Az <strong>ÁSZF elfogadásának nyilvántartása</strong>{' '}
          {aszfEv} évig marad meg, a 2. pont szerinti szűk körben. A cégben maradó
          felhasználóknál pedig, ha csak egy felhasználó lép ki, a cég adatai értelemszerűen
          megmaradnak: azok az adatkezelő Előfizetőhöz tartoznak, nem a kilépő felhasználóhoz.
        </P>
        <P>
          A bizonylatok saját, jogszabályi megőrzéséről az Előfizetőnek kell gondoskodnia; a
          Szolgáltató általi törlés ezt a kötelezettséget nem teljesíti és nem helyettesíti.{' '}
          <strong>A rendszer „Archívum" képernyője sem archiválás ebben az értelemben:</strong>{' '}
          az az elkészült exportokat tartja nyilván, hogy visszakereshetők legyenek — a fájl
          maga {exportNap} nap után törlődik. Munkafolyamati funkció, nem bizonylatmegőrzés.
        </P>
      </Szakasz>

      <Szakasz cim="5. Kik férnek hozzá — adatfeldolgozók">
        <P>
          A Szolgáltató a Szolgáltatás nyújtásához az alábbi közreműködőket veszi igénybe.{' '}
          <strong>A lista tételes:</strong> aki nincs rajta, az nem fér hozzá az adatokhoz. Új
          közreműködő belépése előtt az Előfizetőket tizenöt nappal korábban értesítjük — a
          részleteket lentebb és az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          tartalmazza.
        </P>
        <Tablazat fejlec={['Ki', 'Mit csinál', 'Milyen adathoz fér hozzá', 'Hol dolgozza fel']}>
          {adatfeldolgozok.map((a) => (
            <tr key={a.ki} className="trow">
              <td className="td">
                <strong>{a.ki}</strong>
                {a.jogiSzemely !== undefined && (
                  <>
                    <br />
                    <span className="text-slate-500">{a.jogiSzemely}</span>
                  </>
                )}
                <br />
                <span className="text-slate-500">{a.szekhely ?? NINCS_SZEKHELY}</span>
                <br />
                <a
                  className="underline"
                  href={a.garanciaUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  adatvédelmi feltételei
                </a>
              </td>
              <td className="td">{a.mit}</td>
              <td className="td">{a.adatkor}</td>
              <td className="td">
                {a.hol}
                {a.tovabbitasAlapja !== null && (
                  <>
                    <br />
                    <span className="text-slate-500">
                      A továbbítás alapja: {a.tovabbitasAlapja}
                    </span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Tablazat>
        <P>
          <strong>Az adatbázis és a bizonylatok fájljai az Európai Unión belül tárolódnak</strong>{' '}
          (Frankfurt) — ez a tárolás <em>helyére</em> vonatkozik, és csak arra. Ebből nem
          következik, hogy az adat az Unión belül marad: a fenti táblázat{' '}
          {unionKivuliDarab} sora Unión kívüli feldolgozást vagy hozzáférést jelöl, és érdemes
          külön kimondani, melyik mit:
        </P>
        <Lista>
          <li>
            <strong>A tárolás</strong> — a tárhelyszolgáltató (Supabase) szerződő fele
            szingapúri társaság, ezért a Frankfurtban tárolt adatokhoz Unión kívüli hozzáférés
            nem zárható ki; ennek alapja általános szerződési feltételek.
          </li>
          <li>
            <strong>A gépi kiolvasás</strong> — a papír- és szkennelt bizonylat tartalma megy ki,
            az OpenRouteren át a Google végpontjaihoz (3. pont).
          </li>
          <li>
            <strong>A fizetés</strong> — a fizető neve, számlázási címe és kártyaadata a
            Stripe-hoz.
          </li>
          <li>
            <strong>A levelezés</strong> — a beküldő címre érkező levél teljes szövege és
            melléklete, valamint a kimenő levelek: a Resend útvonala EU-régióban fut, a{' '}
            <strong>tárolás és a naplózás viszont az Egyesült Államokban</strong>.
          </li>
          <li>
            <strong>A weboldal kiszolgálása</strong> — a Vercelhez. Bizonylat nem megy át rajta,
            a látogató kérésének adatai igen.
          </li>
        </Lista>
        <P>
          Az előfizetési díjról kiállított számlát magyarországi szolgáltató készíti.
        </P>
        <P>
          <strong>A kiolvasás láncát a rendszer kódból is lezárja.</strong> A kérés megnevezi,
          mely szolgáltatók szolgálhatják ki — jelenleg kizárólag a fenti táblázatban szereplő
          Google-végpontok —, és <strong>kikapcsolja a tartalék útvonalat</strong>. Ha ezek nem
          elérhetők, a kiolvasás inkább hibával áll meg, mintsem hogy a bizonylat egy meg nem
          nevezett címzetthez kerüljön. Ez nem beállítás, hanem a kód része: környezeti
          változóból nem billenthető át.
        </P>
        <P>
          <strong>Az Unión kívüli továbbítás garanciái.</strong> Minden fenti közreműködővel —
          a Google kivételével, lásd lent — adatfeldolgozási szerződés áll fenn, amely
          tartalmazza a harmadik országba történő továbbítás garanciáit.{' '}
          <strong>Hogy melyik közreműködőnél melyik garancia érvényesül</strong> — az Európai
          Bizottság által elfogadott általános szerződési feltételek, illetve az EU–USA
          adatvédelmi keret —, azt a táblázat „Hol dolgozza fel" oszlopa soronként megmondja,
          a Szolgáltató által elfogadott szerződések alapján. A szerződő fél adatai szintén az
          elfogadott szerződésekből származnak; ahol a szerződés székhelyet nem ad meg, ott ezt a
          táblázat kimondja. Az Előfizető kérésére a
          Szolgáltató az őt érintő garanciákról írásban is tájékoztatást ad a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen. Ez a továbbítási garancia <strong>nem azonos</strong> az adatkezelés 2. pontban
          megjelölt jogalapjával: az előbbi azt mondja meg, milyen feltétellel hagyhatja el az
          adat az Uniót, az utóbbi azt, hogy egyáltalán miért kezeljük.
        </P>
        <P>
          <strong>A lánc nem mindenhol közvetlen, és ezt is kimondjuk.</strong> A Szolgáltatónak
          a <strong>Google-lel nincs saját szerződése</strong>: a modell végpontjait az
          OpenRouter veszi igénybe, a Google tehát <em>al-adatfeldolgozó</em>. A ránk vonatkozó
          garancia ennek megfelelően az OpenRouter feltételeiből ered, és a táblázat is oda
          mutat — egy olyan szerződésre hivatkozni, aminek nem vagyunk részesei, többet ártana,
          mint amennyit használ.
        </P>
        <P>
          <strong>A Stripe szerepe sem egyféle.</strong> Az előfizetés kezelésében a Szolgáltató
          megbízásából jár el, a fizetési művelet lebonyolításában, a visszaélések szűrésében és
          a rá vonatkozó pénzügyi jogszabályok teljesítésében viszont{' '}
          <strong>saját jogon, önálló adatkezelőként</strong> — ezekre az ő saját adatvédelmi
          tájékoztatója irányadó, nem a jelen tájékoztató. A Szolgáltató{' '}
          <strong>teljes bankkártyaadatot nem lát és nem tárol</strong>; a fizető nevét és
          számlázási címét viszont igen, mert abból állítja ki a magyar számlát.
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
            szolgáljuk ki: a böngésző az oldal megnyitásakor nem keres meg idegen kiszolgálót.
            Külső betűszolgáltatót, látogatásmérőt és hirdetési kódot nem használunk.
          </li>
          <li>
            A cégek adatai el vannak különítve egymástól, és ezt az{' '}
            <strong>adatbázis maga kényszeríti ki</strong> (soronkénti hozzáférés-szabályozás) —
            nem a felület. A szűkítés tehát közvetlen API-hívással sem kerülhető meg, nem csak a
            képernyőről.
          </li>
          <li>
            <strong>A böngészőből</strong> bizonylatot csak belépett felhasználó tölthet fel, és
            csak a saját cégébe.
          </li>
          <li>
            <strong>Az e-mailes beküldés ettől eltérő csatorna, és ezt ki kell mondani:</strong>{' '}
            az itt érkező levél feladója <em>nincs</em> bejelentkezve. A lehetőség ezért{' '}
            <strong>alapból ki van kapcsolva</strong>, és csak a cég tulajdonosa kapcsolhatja be.
            Bekapcsolva a védelem három rétegű: (1) a cég beküldő címe{' '}
            <strong>bemutatóra szóló titok</strong> — véletlenszerű, kitalálhatatlan betűsor,
            amit a tulajdonos bármikor lecserélhet, és a csere a régi címet azonnal
            érvényteleníti; (2) alapesetben <strong>csak a cég felhasználóinak címéről</strong>{' '}
            érkező levelet fogadjuk el, és ez külön átállítható „bárkitől" állásba; (3) a
            beküldött bizonylat ugyanúgy a cég <strong>darabkeretéből</strong> és a kereten
            felüli költésre beállított forintos plafonból gazdálkodik, tehát egy váratlan
            levéláradat nem tud korlátlan költséget okozni. Ismeretlen címzett esetén a levélről
            semmit nem tárolunk.
          </li>
          <li>
            ⚠️ <strong>A feladó ellenőrzése nem biztonsági határ, és nem is annak szánjuk.</strong>{' '}
            Egy levél feladómezője hamisítható. A szűrés a <em>véletlen</em> ellen véd — hírlevél,
            automata válasz, egy aláírásból kimásolt cím —, nem a szándékos visszaélés ellen. A
            valódi védelem a cím titokban tartása; ha a cím kiszivárog, a helyes válasz a{' '}
            <strong>cím cseréje</strong>. A beérkezett levelek sorsa — az elutasítottaké is, az
            elutasítás okával — a Beállítások képernyőn látható.
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
          <strong>Adatvédelmi incidens</strong> minden olyan biztonsági esemény, amely az adatok
          véletlen vagy jogellenes megsemmisítését, elvesztését, megváltoztatását, jogosulatlan
          közlését vagy az azokhoz való jogosulatlan hozzáférést eredményezi. Ilyenkor a
          Szolgáltató kötelezettségei attól függnek, milyen szerepben kezeli az érintett adatot
          (1. pont):
        </P>
        <Lista>
          <li>
            <strong>A bizonylatokra nézve adatfeldolgozó.</strong> Indokolatlan késedelem
            nélkül, de legkésőbb az észleléstől számított <strong>negyvennyolc órán belül</strong>{' '}
            értesíti az érintett Előfizetőt, és megad minden rendelkezésére álló információt. A
            hatóság felé történő bejelentés és az érintettek tájékoztatása ilyenkor az
            adatkezelő Előfizető feladata; a Szolgáltató ehhez segítséget nyújt.
          </li>
          <li>
            <strong>A fiókadatokra nézve adatkezelő.</strong> Az incidenst kivizsgálja, és
            felméri, milyen kockázattal jár az érintettekre. Ha a kockázat nem zárható ki, az
            incidenst a tudomásszerzéstől számított <strong>hetvenkét órán belül</strong>{' '}
            bejelenti a Nemzeti Adatvédelmi és Információszabadság Hatóságnak; ha a kockázat
            magas, az érintetteket is haladéktalanul tájékoztatja. Minden incidenst — azt is,
            amelyet nem kell bejelenteni — nyilvántartásba vesz.
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="8. Az érintett jogai">
        <P>
          Az érintett kérheti a rá vonatkozó adatokhoz való hozzáférést, azok helyesbítését,
          törlését vagy kezelésük korlátozását, kérheti az adatai hordozható formában történő
          kiadását, és tiltakozhat a jogos érdeken alapuló adatkezelés ellen. Az adatok
          kimentésére az export szolgál, amit a fiók törlése előtt érdemes elkészíteni. A fiók
          törlése a Beállítások képernyőről bármikor, kérelem nélkül elvégezhető; a többi kérést
          a{' '}
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
