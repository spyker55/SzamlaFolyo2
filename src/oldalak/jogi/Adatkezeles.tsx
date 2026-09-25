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
 *
 * # 2026. szeptember 23. — zárókör (2026-09-23-3)
 *
 * A 2. pontból kikerült a látogatásmérés múltja (szeptember 20–23., Vercel Web
 * Analytics) és a „ha egyszer újra mérnénk" figyelmeztetés. A tulajdonos
 * döntése: az a néhány nap tesztidőszak volt, előfizető nélkül (élesben mérve:
 * egyetlen cég, a tulajdonosé), a tájékoztató a jelenről szól. A múlt a
 * `jogi-archivum/2026-09-23-2/` alatt és itt, a fenti szakaszokban marad meg.
 *
 * ⚠️ A kikerült figyelmeztetés szabálya ettől még áll: ha a weboldal egyszer
 * nem feltétlenül szükséges eszköztárolást kezdene használni, az csak
 * hozzájárulással indulhat, és ezt a szakaszt előtte át kell írni.
 *
 * # 2026. szeptember 25. — ötödik kör (2026-09-25-2)
 *
 * Új, közérthetőbb szöveg a tulajdonos vázlatából, és hat bírálói pont:
 *
 * 1. **Két táblázat.** A 2.1. a saját adatkezelés (cél és jogalap a miénk), a
 *    2.2. az Előfizető megbízásából végzett adatfeldolgozás („Kinek az
 *    utasítására?"). A munkamenetnél külön áll a böngészőtárolás indoka
 *    (Eht. 155. § (4): feltétlenül szükséges) és a benne lévő személyes adat
 *    GDPR-jogalapja — a kettő eddig egy cellában keveredett.
 * 2. **OpenRouter.** A DPA-ja a Szolgáltatót „Customer = Controller"-ként
 *    kezeli, SCC 2. modullal, és a „Sensitive Data" fogalmába az
 *    adóazonosító és a pénzügyi információ is beletartozik. A szöveg ezt
 *    kimondja, ahogy ma van. A tulajdonos döntése: „szöveg most +
 *    levélvázlat" — a szerződésmódosítást (3. modul, Sensitive Data) a
 *    tulajdonos kezdeményezi. ⚠️ Az 5. pont „kezdeményezzük" mondata csak
 *    addig igaz, amíg ez a megkeresés tényleg megy.
 * 3. **Google.** A kód mindkét végpontot engedi
 *    (`szamlafolyo.modell.szolgaltatok`); a szöveg ezt mondja, és hogy a
 *    `zdr: true` mellett az OpenRouter nyilvántartása dönti el, melyik
 *    szolgálhat ki. A ZDR és a tanítási tilalom két külön feltétel. A
 *    tulajdonos döntése: „csak szövegben", a kód nem szűkül. Őr figyeli.
 * 4. **„Aki nincs rajta, az nem fér hozzá"** kikerült: a közreműködők saját
 *    al-adatfeldolgozói és a hatósági megkeresés is hozzáférés.
 * 5. **Megőrzés három szinten** (aktív rendszer / mentés hét nap / külső
 *    szolgáltató), a soha nem exportált bizonylat (nincs automatikus
 *    határidő; a felületről csak a duplikátum és a hibás vethető el, a fájl
 *    gazdátlanként egy napon belül megy), a tagság vége és a 180 napos
 *    fiókszabály viszonya, és a Vercel kiszolgálónaplójának sora. A Vercel
 *    megőrzési idejét nem tudtuk megmérni (a dokumentáció nem adott számot,
 *    drain nincs), ezért a szöveg a szempontot mondja, nem egy számot.
 * 6. **A gépi jóváhagyás nem GDPR 22. cikk szerinti döntés**, a jogok az adott
 *    adatkezelés feltételei szerint járnak, a hordozhatóság szűk.
 *
 * Fogalom: „munkaterület" (nem „munkatér"), mint a felületen. Őr figyeli.
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
      <P>
        A SzámlaFolyó használata során személyes adatokat is kezelünk. Ilyenek lehetnek a
        regisztrációkor megadott adataid, az előfizetéshez kapcsolódó információk és a
        feldolgozásra beküldött számlákon szereplő adatok.
      </P>
      <P>
        Ebben a tájékoztatóban bemutatjuk, milyen adatokat használunk, milyen célból, kikkel
        osztjuk meg őket, és meddig őrizzük meg azokat. Azt is megtalálod, hogyan kérhetsz
        tájékoztatást vagy törlést. Adatkezeléssel kapcsolatos kérdésedet a{' '}
        <a className="underline" href={`mailto:${szolgaltato.email}`}>
          {szolgaltato.email}
        </a>{' '}
        címre küldheted.
      </P>

      <Szakasz cim="1. Ki kezeli az adatokat, és milyen szerepben">
        <P>
          A SzámlaFolyó üzemeltetője <strong>{szolgaltato.nev}</strong> (a továbbiakban:
          Szolgáltató). A részletes adatai az{' '}
          <Link to="/impresszum" className="underline">
            Impresszumban
          </Link>{' '}
          találhatók. Az adatkezelésben betöltött szerepünk attól függ, milyen adatokról van szó.
        </P>
        <Lista>
          <li>
            <strong>A fiókodhoz és az előfizetésedhez kapcsolódó adatoknál adatkezelőként járunk
            el.</strong> Mi határozzuk meg például, milyen adatok szükségesek a regisztrációhoz, a
            kapcsolattartáshoz, a számlázáshoz és a szolgáltatás biztonságos működtetéséhez.
          </li>
          <li>
            <strong>A feldolgozásra beküldött bizonylatok személyes adatait az Előfizető
            megbízásából, adatfeldolgozóként kezeljük.</strong> Az adatkezelő az Előfizető: ő
            határozza meg a célt és a jogalapot, mi pedig az utasításai szerint dolgozunk. Ezeket
            az adatokat kizárólag a Szolgáltatás nyújtásához használjuk fel; harmadik félnek{' '}
            <strong>kizárólag az 5. pontban ismertetett közreműködőknek</strong>, a Szolgáltatás
            teljesítéséhez szükséges körben továbbítjuk, és a szerződés megszűnésekor a 4. pont
            szerint töröljük.
          </li>
          <li>
            <strong>
              Ha könyvelőként, az ügyfeled adatfeldolgozójaként használod a SzámlaFolyót, a
              Szolgáltató további adatfeldolgozóként vesz részt a folyamatban.
            </strong>{' '}
            Ilyenkor az adatkezelő az ügyfeled, és neked kell gondoskodnod arról, hogy az
            ügyfeleddel fennálló megállapodás és felhatalmazás ezt lehetővé tegye.
          </li>
        </Lista>
        <P>
          Az adatfeldolgozás részletes feltételeit az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          tartalmazza, amely egyben a felek közötti adatfeldolgozási szerződés.
        </P>
        <P>
          <strong>Egy céges munkaterület tagjai a munkaterület valamennyi bizonylatát
          láthatják.</strong> Az ügyfél szerinti szűrés a munkát segíti, de nem korlátozza a
          hozzáférést. Ha egymástól elkülönített hozzáférésre van szükséged, külön
          munkaterületeket és a hozzájuk tartozó előfizetéseket kell használnod.
        </P>
      </Szakasz>

      <Szakasz cim="2. Milyen adatokat kezelünk, és miért">
        <P>
          Az adatokat két táblázat mutatja be, mert a két szerepünk szabályai eltérnek. Az első a{' '}
          <strong>saját adatkezelésünk</strong>: itt mi határozzuk meg a célt, és mi választjuk a
          jogalapot. A második az <strong>Előfizető megbízásából végzett adatfeldolgozás</strong>:
          itt a célt és a jogalapot az adatkezelő Előfizető határozza meg, mi az utasításai
          szerint járunk el.
        </P>
        <P>
          A regisztrációhoz és a szolgáltatás használatához szükséges adatokat az adott
          felületen jelezzük; ezek nélkül nem tudjuk létrehozni a fiókot vagy biztosítani az
          érintett szolgáltatást. Az önkéntesen megválaszolható kérdéseket külön jelöljük.
        </P>

        <h3 className="pt-2 text-base font-semibold text-slate-800">
          2.1. Saját adatkezelésünk
        </h3>
        <Tablazat fejlec={['Milyen adatot kezelünk?', 'Miért?', 'Mi a jogalap?', 'Meddig őrizzük meg?']}>
          <tr className="trow">
            <td className="td">
              <strong>Regisztráló</strong> e-mail címe és jelszava, még a cég létrehozása{' '}
              <em>előtt</em> – és minden olyan fiók adata, amelyhez éppen nem tartozik cég
              (például aki kilépett a munkaterületről)
            </td>
            <td className="td">
              Fiók létrehozása, belépés. Ekkor még nincs szerződés (ÁSZF 1.): a fiók önmagában
              nem köti a Szolgáltatót és nem jogosít a Szolgáltatás használatára
            </td>
            <td className="td">
              <strong>Aki egyéni vállalkozóként, a saját nevében</strong> kíván szerződni, annál
              a szerződéskötést megelőző, az érintett kérésére tett lépések.{' '}
              <strong>Aki egy társaság leendő képviselőjeként</strong> regisztrál, annál jogos
              érdek: a társasággal kötendő szerződés előkészítése. Csak a belépéshez
              elengedhetetlen két adatot kezeljük, és a fiók bármikor törölhető
            </td>
            <td className="td">
              A cég létrehozásáig. Ha az elmarad, a fiók törléséig, de a cég nélküli fiókot{' '}
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
              Szerződés teljesítése – nála az érintett és a szerződő fél <em>ugyanaz</em> a
              személy, a vállalkozói minőségében eljárva
            </td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A szerződő <strong>társaság képviselőjének</strong> neve, e-mail címe, jelszava
            </td>
            <td className="td">
              Fiók, belépés, értesítések. A szerződést a társaság kötötte, nem ő
            </td>
            <td className="td">
              Jogos érdek: a szerződés teljesítéséhez azonosítható kapcsolattartó kell. A
              legszűkebb adatkört kezeljük, az adat forrása maga az érintett, és a hozzáférését
              bármikor megszüntetheti
            </td>
            <td className="td">A képviselői hozzáférés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A munkaterület <strong>meghívott munkatársának</strong> neve, e-mail címe, jelszava
              és szerepköre
            </td>
            <td className="td">Hozzáférés a munkaterület bizonylataihoz</td>
            <td className="td">
              Jogos érdek: a munkaterület hozzáférés-kezelése. A munkavégzéshez elengedhetetlen,
              legszűkebb adatkört kezeljük, és az érintett a hozzáférését bármikor megszüntetheti
            </td>
            <td className="td">
              A tagság megszűnéséig. Ezután a fiók cég nélküli fiókként marad, és az első sor
              szerint törlődik
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A meghívott munkatárs e-mail címe, a meghívó szerepköre és sorsa (elküldve,
              elfogadva, visszavonva, lejárt)
            </td>
            <td className="td">
              Hozzáférés adása a munkaterülethez. A címet a munkaterület tulajdonosa adja meg, és a
              meghívott a meghívólevélből értesül róla
            </td>
            <td className="td">Jogos érdek: a munkaterület hozzáférés-kezelése</td>
            <td className="td">A lezárulástól számított {meghivoNap} nap</td>
          </tr>
          <tr className="trow">
            <td className="td">
              <strong>Az ÁSZF elfogadásának nyilvántartása:</strong> az elfogadott változat
              azonosítója, az időpont, az eljáró felhasználó (e-mail-címmel) és a cég (névvel,
              adószámmal); mellette az elfogadott változat teljes szövege
            </td>
            <td className="td">Annak igazolása, hogy a szerződés létrejött, és melyik szöveggel</td>
            <td className="td">
              Jogos érdek: a szerződés létrejöttének és tartalmának bizonyíthatósága
            </td>
            <td className="td">
              A szerződés megszűnésétől számított <strong>{aszfEv} évig</strong> (a Polgári
              Törvénykönyv általános elévülési ideje), <em>a cég adatainak törlése után is</em>.
              Csak az elfogadás nyilvántartása marad meg, a cég egyéb adatai nem
            </td>
          </tr>
          <tr className="trow">
            <td className="td">Cégnév, adószám</td>
            <td className="td">A cég azonosítása, jogosultság a szolgáltatásra</td>
            <td className="td">Szerződés teljesítése</td>
            <td className="td">A szerződés megszűnéséig</td>
          </tr>
          <tr className="trow">
            <td className="td">
              A cég létrehozásakor adott, <strong>nem kötelező</strong> válasz arra, honnan
              hallott a SzámlaFolyóról – egy előre megadott listából, szabad szöveg nélkül
            </td>
            <td className="td">
              Annak mérése, melyik csatornán találnak ránk az előfizetők.
              Kizárólag összesítve használjuk; megkeresésre, profilalkotásra nem
            </td>
            <td className="td">
              Jogos érdek: a marketing megalapozása sütis mérés nélkül. A válasz önkéntes, csak
              listából választható, és tiltakozás esetén töröljük
            </td>
            <td className="td">A szerződés megszűnéséig – a cég adataival együtt törlődik</td>
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
              <strong>Érdeklődői és ügyfélszolgálati levelezés</strong> (a hozzánk írt levél
              feladója és tartalma)
            </td>
            <td className="td">A megkeresés megválaszolása, a panasz kivizsgálása</td>
            <td className="td">
              Jogos érdek: a megkeresés megválaszolása és utólagos visszakereshetősége.
              Fogyasztónak minősülő panaszosnál a panasz és a válasz megőrzése jogi kötelezettség
            </td>
            <td className="td">
              A megkeresés lezárásától számított egy év. Panasznál: fogyasztónak minősülő
              panaszosnál a fogyasztóvédelmi törvényben előírt ideig, egyébként a panasz
              lezárásától számított öt évig (az általános elévülési idő)
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A visszafordíthatatlan és a munkaterületre kiható műveletek naplója (export,
              törlés, tag felvétele, beállításváltás): ki, mikor, mit tett
            </td>
            <td className="td">Utólagos visszakövethetőség, a fiókok és a munkaterület biztonsága</td>
            <td className="td">Jogos érdek: elszámoltathatóság és biztonság</td>
            <td className="td">A szerződés megszűnéséig – a cég adataival együtt törlődik</td>
          </tr>
          <tr className="trow">
            <td className="td">
              Belépési kísérletek adatai, köztük IP-cím – ezeket a felhasználókezelést végző
              Supabase naplózza
            </td>
            <td className="td">Próbálgatásos támadás elleni védelem</td>
            <td className="td">Jogos érdek: a fiókok biztonsága</td>
            <td className="td">
              <strong>Hét nap</strong> – ennyi ideig őrzi a Supabase a projekt naplóit a
              Szolgáltató csomagjában. Az adatbázisban belépési naplót nem tárolunk
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A weboldal letöltésekor a böngésző kérésének technikai adatai (IP-cím, időpont,
              kért cím, böngészőazonosító) a tárhelyszolgáltató (Vercel) kiszolgálónaplóiban
            </td>
            <td className="td">
              A weboldal kiszolgálása, hibakeresés, visszaélések és támadások elleni védelem
            </td>
            <td className="td">
              Jogos érdek: a weboldal működtetése és biztonsága. Ezekből profilt nem készítünk,
              és más adattal nem kapcsoljuk össze
            </td>
            <td className="td">
              A Vercel naplómegőrzése szerint, a Szolgáltató csomagjára érvényes ideig – ez a
              megőrzés meghatározásának szempontja
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              Munkamenet-adat (belépési azonosító) a böngésző saját tárolójában
            </td>
            <td className="td">A bejelentkezett állapot fenntartása</td>
            <td className="td">
              <strong>A tárolás az eszközön:</strong> a felhasználó által kifejezetten kért
              szolgáltatáshoz feltétlenül szükséges, ezért nem kell hozzá hozzájárulás.{' '}
              <strong>A benne lévő személyes adat kezelése:</strong> a fiókadatokkal azonos
              jogalapon (szerződés teljesítése, illetve jogos érdek, a fenti sorok szerint)
            </td>
            <td className="td">Kilépésig, illetve a munkamenet lejártáig</td>
          </tr>
        </Tablazat>

        <h3 className="pt-2 text-base font-semibold text-slate-800">
          2.2. Az Előfizető megbízásából végzett adatfeldolgozás
        </h3>
        <Tablazat fejlec={['Milyen adatot dolgozunk fel?', 'Milyen feladathoz?', 'Kinek az utasítására?', 'Mikor töröljük?']}>
          <tr className="trow">
            <td className="td">
              Feltöltött vagy e-mailben beküldött bizonylatok és a belőlük kiolvasott adatok –
              köztük személyes adatok, ha a partner egyéni vállalkozó vagy magánszemély
            </td>
            <td className="td">
              Tárolás, gépi kiolvasás (a 3. pont szerint külső közreműködővel), ellenőrzés,
              jóváhagyás és export
            </td>
            <td className="td" rowSpan={4}>
              Az Előfizető – mint adatkezelő – utasítására, az{' '}
              <Link to="/aszf" className="underline">
                ÁSZF 11. pontja
              </Link>{' '}
              szerint. Könyvelőirodánál az Előfizető az ügyfelétől kapott felhatalmazás
              keretében ad utasítást
            </td>
            <td className="td">
              Az eredeti fájl az export után, a beállított türelmi idővel; a kiolvasott adatok a
              szerződés megszűnésekor (4. pont)
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A modell <strong>nyers válasza</strong> (a kiolvasott mezők abban az alakban,
              ahogy a modell adta)
            </td>
            <td className="td">
              Annak ellenőrzése, hogy a gépi kiolvasás helyesen működött-e, és hogy egy vitatott
              tétel utólag rekonstruálható legyen
            </td>
            <td className="td">
              <strong>{nyersNap} nap</strong> után kiürül; a kiolvasás sora a keretszámítás
              miatt megmarad, a bizonylat tartalmát hordozó válasz nem
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A jóváhagyáskor végzett <strong>javítások</strong> (mely mezőt mire írta át az
              ember)
            </td>
            <td className="td">
              A munkaterületen belüli visszakövethetőség, és annak mérése, mennyire megbízható a
              gépi kiolvasás ennél az Előfizetőnél – ez az automatikus jóváhagyás küszöbeinek
              egyetlen visszajelzése (6. pont)
            </td>
            <td className="td">
              A szerződés megszűnésekor, a bizonylattal együtt – a nyers válasszal nem ürül ki
            </td>
          </tr>
          <tr className="trow">
            <td className="td">
              A beküldő címre érkezett levelek feladója, tárgya és sorsa (a levél szövege nem)
            </td>
            <td className="td">Hogy az Előfizető lássa, mi történt az odaküldött levéllel</td>
            <td className="td">{levelNap} nap</td>
          </tr>
        </Tablazat>

        <P>
          <strong>A tájékoztató megismerése nem hozzájárulás.</strong> A regisztrációkor és a
          cég létrehozásakor az ÁSZF-et elfogadod, ezt a tájékoztatót pedig megismered; ez nem
          jelent a fenti táblázatok minden sorát lefedő adatkezelési hozzájárulást, mert minden
          sornak saját jogalapja van. A jogos érdeken alapuló kezelések ellen a 8. pont szerint
          tiltakozhatsz.
        </P>
        <P>
          <strong>Látogatásmérés nincs, sütit mérésre vagy hirdetésre nem használunk.</strong>{' '}
          Hirdetési kódrészlet nincs, profilalkotás nincs, és más webhelyeken sem követünk
          senkit. Az oldal az eszközön egyetlen tárolást használ – a bejelentkezett állapotot, a
          böngésző saját tárolójában –, ezért nem fogad süti-ablak.
        </P>
      </Szakasz>

      <Szakasz cim="3. Mi történik egy beérkezett bizonylattal">
        <P>
          <strong>1. A bizonylat bekerül a rendszerbe.</strong> A számlát feltöltheted a
          böngészőből, vagy – ha ezt a munkaterület tulajdonosa engedélyezte – elküldheted a
          munkaterülethez tartozó e-mail-címre. A bizonylat mindkét esetben az Európai Unión
          belül, frankfurti kiszolgálón tárolódik.
        </P>
        <P>
          E-mailes beküldéskor a levelet és a mellékleteket a <strong>Resend</strong> fogadja,
          és webhookon adja át nekünk. A SzámlaFolyó a mellékleteket veszi át feldolgozásra;
          saját adatbázisában a levél törzse helyett a beküldéshez kapcsolódó adatokat – a
          feladót, a tárgyat és a feldolgozás állapotát – tárolja. Ha a címzett cím ismeretlen,
          a levélről semmit nem tárolunk. ⚠️ Abból, hogy mi nem tároljuk a levél szövegét, nem
          következik, hogy a levélküldő sem kezeli: a Resend útvonala EU-régióban (Írország)
          fut, a saját tájékoztatása szerint viszont az üzenettartalmat és a naplókat az{' '}
          <strong>Egyesült Államokban tárolja</strong> (5. pont).
        </P>
        <P>
          Böngészős feltöltéskor a bizonylat nem halad át a Resenden. A további feldolgozásban
          azonban ilyenkor is részt vehetnek Unión kívüli szolgáltatók (lent és az 5. pontban).
        </P>
        <P>
          <strong>2. A rendszer kiolvassa a számlaadatokat.</strong> A támogatott, felismert
          strukturált számlaadatokat a SzámlaFolyó közvetlenül dolgozza fel:{' '}
          <strong>a felismert e-számla XML feldolgozása modellhívás nélkül történik</strong>,
          az ilyen irat tartalma nem hagyja el a szervert. A rendszer négy XML-alakot ismer fel
          saját értelmezővel: UBL, Factur-X/ZUGFeRD (CII), NAV Online Számla, és a régebbi APEH
          2005 számla adatexport. Ez a PDF-be ágyazott, felismert XML-re is érvényes.
        </P>
        <P>
          A PDF-ek, képek és a közvetlenül nem feldolgozható fájlok – köztük a{' '}
          <strong>fel nem ismert XML</strong> – adatainak kiolvasásához külső mesterséges
          intelligencia szolgáltatót veszünk igénybe. A kérést az <strong>OpenRouter</strong>{' '}
          továbbítja, a kiolvasást a <strong>Google</strong> modellje végzi (jelenleg:{' '}
          <code>{modell}</code>). A továbbított adatok közé a bizonylat tartalma, valamint a
          munkaterülethez tartozó cégnév és adószám tartozik – ez utóbbi azért, hogy a modell
          tudja, melyik oldalon állunk. <strong>A fiók adatait – a felhasználók nevét,
          e-mail-címét, jelszavát – nem küldjük el</strong>, a bizonylaton szereplő személyes
          adatok viszont a bizonylat tartalmaként a feldolgozó szolgáltatóhoz is eljutnak.
        </P>
        <P>
          <strong>A kiolvasási kérés feltételei kódból rögzítettek</strong>, környezeti
          változóból nem kapcsolhatók ki:
        </P>
        <Lista>
          <li>
            <strong>Zárt címzetti kör.</strong> A kérés megnevezi, mely végpontok szolgálhatják
            ki – a Google AI Studio és a Google Cloud Vertex AI végpontját –, és kikapcsolja a
            tartalék útvonalat. Ha ezek nem elérhetők, a kiolvasás hibával megáll, a bizonylat a
            Beérkezőben marad, és újrapróbálható; meg nem nevezett szolgáltatóhoz nem kerül.
          </li>
          <li>
            <strong>Nulla adatmegőrzés.</strong> A kérés előírja, hogy a tartalmat a kérés
            teljesítése után ne tárolják. Ilyenkor az OpenRouter csak olyan végpontra
            irányíthatja a kérést, amelyet a saját nyilvántartásában nulla adatmegőrzésűként
            tart számon; <strong>hogy a két megnevezett Google-végpont közül melyik ilyen, azt ez
            a nyilvántartás dönti el</strong>. Az OpenRouter szerződése szerint a
            nyilvántartásba vétel a modellszolgáltató közzétett vállalásán alapul, és nem az
            OpenRouter garanciája.
          </li>
          <li>
            <strong>Modelltanítás tilalma.</strong> Külön feltételként kizárja azokat a
            végpontokat, amelyek az adatot modelltanításra használhatják. A megőrzés tilalma és
            a tanítás tilalma két külön feltétel: az egyik azt zárja ki, hogy az adat
            megmaradjon, a másik azt, hogy felhasználják.
          </li>
        </Lista>
        <P>
          A feldolgozás módját bizonylatonként meg is mutatjuk: az Ellenőrzés képernyő tetején
          és a Beérkező listájában egy sor nevezi meg, hogy az adatok a saját értelmezőnktől
          (a felismert e-számla alakjának nevével együtt) vagy a modelltől származnak-e. Ahol
          nincs kiírva, ott a kiolvasás még nem fejeződött be.
        </P>
        <P>
          <strong>3. Ellenőrzöd a kiolvasott adatokat.</strong> Alapértelmezés szerint a
          kiolvasott adatokat ember ellenőrzi és hagyja jóvá. Az automatikus jóváhagyás külön
          bekapcsolható funkció (6. pont); a rendszer jelzi az automatikusan jóváhagyott
          tételeket, és ezeket exportálás előtt visszahívhatod ellenőrzésre.
        </P>
        <P>
          <strong>4. Elkészíted az exportot.</strong> Az export elkészítése után az eredeti
          fájlokat a beállított megőrzési idő szerint töröljük: alapértelmezés szerint azonnal, a
          megőrzés legfeljebb {maxNap} napra állítható. Az eredeti fájl törlése és a kiolvasott
          adatok törlése külön folyamat; a határidőket a 4. pont tartalmazza.
        </P>
        <P>
          <strong>Mire használjuk a feldolgozás során keletkező adatokat?</strong> A nyers
          modellválaszt és a mezők javításának előzményeit a feldolgozás ellenőrzéséhez és az
          Előfizetőnek nyújtott szolgáltatáshoz használjuk; a javítási előzmények az adott
          Előfizető automatikus jóváhagyásának működését is támogatják. Saját modelltréningre,
          prompt- vagy modellfejlesztésre, profilalkotásra vagy önálló termékfejlesztési
          elemzésre nem használjuk őket. <strong>A feltöltött bizonylatokat mesterséges
          intelligencia tanítására sem sajátra, sem harmadik félére nem használjuk</strong>, és
          külön megállapodás hiányában erre nem is vagyunk jogosultak. A nyers modellválasz a
          kiolvasástól számított {nyersNap} nap után kiürül; ez nem jelenti a javítási
          előzmények törlését.
        </P>
      </Szakasz>

      <Szakasz cim="4. Meddig őrizzük meg az adatokat">
        <P>
          A különböző adatokra eltérő határidők vonatkoznak. A törlésnél három szintet
          különböztetünk meg, mert egy üzemszerűen működő rendszerben a „törölve" nem egyetlen
          pillanat:
        </P>
        <Lista>
          <li>
            <strong>Az aktív rendszerben tárolt adatok</strong> – az adatbázis és a fájltároló.
            Innen az alábbi határidők szerint, illetve a fiók vagy a munkaterület törlésekor
            tűnnek el; ettől kezdve a felületen és az API-n keresztül sem érhetők el. A
            felhasználó által indított törlés <strong>nem vonható vissza</strong>: egyedi
            visszaállításra nincs lehetőség.
          </li>
          <li>
            <strong>Biztonsági mentések: legfeljebb hét nap.</strong> Az adatbázisról a
            tárhelyszolgáltató üzemfolytonossági mentéseket készít, amelyek a törlés után még
            tartalmazhatják az adatot. A már törölt adat a mentésekből{' '}
            <strong>legfeljebb hét napon belül</strong> kifut. A mentéseket{' '}
            <strong>kizárólag teljes helyreállításra</strong> használjuk, egyedi visszakeresésre
            soha. Ha teljes helyreállításra van szükség, a mentés óta törölt ügyféladatok
            törlését <strong>a rendszer újbóli megnyitása előtt megismételjük</strong>.
          </li>
          <li>
            <strong>Külső szolgáltatóknál kezelt adatok: a saját feltételeik szerint.</strong>{' '}
            Az OpenRouter a nulla adatmegőrzés feltételével kapott kérés tartalmát nem tárolja;
            a Google-végpontra ugyanez a feltétel az OpenRouter nyilvántartása alapján
            érvényesül (3. pont). A Resend a bejövő és kimenő levelekről, a Stripe a
            tranzakciókról, a Billingo a kiállított számlákról, a Vercel a kiszolgálási
            naplókról a saját megőrzési ideje szerint őriz adatot – ezekre az 5. pont
            táblázatában hivatkozott feltételeik irányadók. A Szolgáltató ezeket nem tudja a
            saját törlésével egyidejűleg megszüntetni.
          </li>
        </Lista>
        <P>
          <strong>A határidők az aktív rendszerben:</strong>
        </P>
        <Lista>
          <li>
            <strong>Eredeti fájlok:</strong> az export után törlődnek, legfeljebb {maxNap} napos,
            munkaterületenként állítható türelmi idővel.
          </li>
          <li>
            <strong>Soha nem exportált bizonylatok és fájlok:</strong> automatikus határidő nem
            vonatkozik rájuk – a szerződés megszűnéséig, illetve a munkaterület törléséig
            maradnak. A felületen a duplikátumként megjelölt és a feldolgozhatatlan (hibás)
            bizonylat vethető el; ha a fájljára más bizonylat nem hivatkozik, a fájl egy napon
            belül törlődik. Ugyanígy egy napon belül törlődik az a feltöltött fájl, amelyhez
            nem jött létre bizonylat.
          </li>
          <li>
            <strong>Exportfájlok:</strong> az elkészültüktől számított{' '}
            <strong>legfeljebb {exportNap} napig</strong>, azután automatikusan törlődnek. Az
            export bármikor újrakészíthető a jóváhagyott tételekből. Az elkészült exportok{' '}
            <em>nyilvántartása</em> (mikor, milyen formátumban, hány tétellel) a fájl törlése után
            is megmarad.
          </li>
          <li>
            <strong>A modell nyers válasza:</strong> a kiolvasástól számított{' '}
            <strong>{nyersNap} nap</strong>, azután automatikusan kiürül. A kiolvasás{' '}
            <em>sora</em> megmarad – abból számoljuk a havi keretet –, de a bizonylat tartalmát
            hordozó válasz nem.
          </li>
          <li>
            <strong>A beküldő címre érkezett levelek nyilvántartása</strong> (feladó, tárgy,
            eredmény – a levél szövege nem): <strong>{levelNap} nap</strong>.
          </li>
          <li>
            <strong>Lezárult meghívók</strong> (elfogadott, visszavont vagy lejárt): a lezárulástól
            számított <strong>{meghivoNap} nap</strong>. Az élő meghívó a lejáratáig marad.
          </li>
          <li>
            <strong>Kiolvasott és jóváhagyott adatok, javítási előzmények, a munkaterület
            adatai:</strong> a szerződés megszűnéséig. Az előfizetés lemondása a szerződést nem
            szünteti meg. A megszűnés módjától függ, mikor törlődnek (
            <Link to="/aszf" className="underline">
              ÁSZF 10. és 16. pont
            </Link>
            ): ha az Előfizető maga törli a munkaterületet, azonnal; ha a Szolgáltató mond fel,
            vagy az Előfizető az ÁSZF módosítását elutasítva szünteti meg a szerződést, a
            megszűnéstől számított harminc napon belül; szolgáltatóváltásnál az
            adat-visszanyerési időszak végén.
          </li>
          <li>
            <strong>Tagság megszűnése és cég nélküli fiók.</strong> Ha egy felhasználó kilép a
            munkaterületről, vagy a tulajdonos eltávolítja, a munkaterület bizonylatai
            megmaradnak – azok az adatkezelő Előfizetőhöz tartoznak, nem a kilépő
            felhasználóhoz. A felhasználói fiókja nem törlődik azonnal: cég nélküli fiókként
            marad, és ha <strong>{inaktivNap} napig nem lép be</strong>, a rendszer magától
            törli. Ugyanez vonatkozik arra, aki regisztrált, de munkaterületet nem hozott létre
            (belépés hiányában a regisztrációtól számítva). A fiók ennél korábban is bármikor
            törölhető.
          </li>
          <li>
            <strong>Az ÁSZF elfogadásának nyilvántartása:</strong> a szerződés megszűnésétől
            számított <strong>{aszfEv} év</strong>, a munkaterület törlése után is (2. pont).
          </li>
          <li>
            <strong>Belépési kísérletek adatai (IP-cím):</strong> ezeket a felhasználókezelést
            végző Supabase naplózza, és a Szolgáltató csomagjában <strong>hét napig</strong>{' '}
            őrzi.
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
          <strong>Szolgáltatóváltás alatt nincs ütemezett törlés.</strong> A szolgáltatóváltási
          kérés beérkezésétől az adat-visszanyerési időszak végéig a fenti határidők közül a
          munkaterület adataira vonatkozók – az eredeti fájlok, az exportfájlok, a nyers
          modellválasz, a levélnapló és a lezárult meghívók törlése – szünetelnek (
          <Link to="/aszf" className="underline">
            ÁSZF 10. és 16. pont
          </Link>
          ). A kérés előtt már törölt fájlokat ez nem állítja vissza.
        </P>
        <P>
          <strong>A fiók törlése</strong> a Beállítások képernyőről indítható, és{' '}
          <strong>azonnal</strong> megtörténik – nem kérelem, hanem művelet. A képernyő előbb
          kiírja, pontosan mi tűnik el, és a munkaterület adatait érintő törléshez a cég nevét
          is be kell gépelni. Ha bármi elakad, a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen is kérhető. A törléssel a felhasználói fiók megszűnik. Ha ezzel a
          munkaterületnek nem marad felhasználója, vele együtt törlődnek a bizonylatai, a
          kiolvasott adatok, az exportok, a naplóbejegyzések és a szerveren lévő fájlok is, az
          esetleges Stripe-előfizetést pedig lemondjuk. A törlés nem vonható vissza.
        </P>
        <P>
          <strong>A fiók vagy a munkaterület törlése nem szüntet meg minden megőrzési
          kötelezettséget.</strong> A <strong>már kiállított számlák</strong> a fenti adójogi
          megőrzési idő végéig megmaradnak, az <strong>ÁSZF elfogadásának
          nyilvántartása</strong> pedig {aszfEv} évig, a 2. pont szerinti szűk körben.
        </P>
        <P>
          <strong>A SzámlaFolyó nem helyettesíti a bizonylatok jogszabály szerinti
          megőrzését.</strong> Az eredeti dokumentumok megfelelő tárolásáról az Előfizetőnek
          kell gondoskodnia; a Szolgáltató általi törlés ezt a kötelezettséget nem teljesíti és
          nem helyettesíti. Az „Archívum" képernyő az elkészült exportokat tartja nyilván, hogy
          visszakereshetők legyenek – a fájl maga {exportNap} nap után törlődik. Munkafolyamati
          funkció, nem korlátlan idejű dokumentummegőrzés.
        </P>
      </Szakasz>

      <Szakasz cim="5. Kik férnek hozzá – közreműködők és adattovábbítás">
        <P>
          A Szolgáltatás működtetéséhez külső szolgáltatókat veszünk igénybe. A táblázat
          bemutatja, milyen feladatot látnak el, milyen adatokhoz juthatnak hozzá, és hol
          történhet az adatfeldolgozás. A táblázatban azok a közreműködők szerepelnek, akikkel
          a Szolgáltató közvetlen szerződésben áll, valamint a Google, amelyet az OpenRouter
          vesz igénybe. Új közreműködő belépése előtt az Előfizetőket tizenöt nappal korábban
          értesítjük – a részleteket lentebb és az{' '}
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
          <strong>A közreműködők további alvállalkozói.</strong> A táblázatban szereplő
          szolgáltatók a saját feltételeikben megnevezett további adatfeldolgozókat –
          például tárhely-, hálózati és ügyfélszolgálati szolgáltatókat – vehetnek igénybe; ezek
          köre a táblázatban hivatkozott feltételekből érhető el. A közreműködők ezekre a
          saját szerződésük szerinti kötelezettségeket telepítik.
        </P>
        <P>
          <strong>Hatósági megkeresés.</strong> Jogszabály alapján bíróság vagy hatóság a
          Szolgáltatótól vagy a közreműködőktől is kérhet adatot, a közreműködőknél a saját
          országuk joga szerint is. A Szolgáltató ilyen kérést csak jogszabályi kötelezettség
          alapján, a szükséges körben teljesít; ha a kérés az Előfizető bizonylataira
          vonatkozik, erről – ha jogszabály nem tiltja – előzetesen értesíti az Előfizetőt.
        </P>
        <P>
          <strong>Az adatbázis és a bizonylatok fájljai az Európai Unión belül tárolódnak</strong>{' '}
          (Frankfurt). Az európai tárolási hely önmagában nem jelenti azt, hogy minden
          feldolgozás és hozzáférés az Európai Gazdasági Térségen belül marad: a fenti táblázat{' '}
          {unionKivuliDarab} sora Unión kívüli feldolgozást vagy hozzáférést jelöl.
        </P>
        <Lista>
          <li>
            <strong>A tárolás</strong> – a tárhelyszolgáltató (Supabase) szerződő fele
            szingapúri társaság, ezért a Frankfurtban tárolt adatokhoz Unión kívüli hozzáférés
            nem zárható ki; ennek alapja általános szerződési feltételek.
          </li>
          <li>
            <strong>A gépi kiolvasás</strong> – a PDF- és képbizonylatok, valamint a fel nem
            ismert XML tartalma az OpenRouteren át a Google végpontjaihoz kerül (3. pont).
          </li>
          <li>
            <strong>A fizetés</strong> – a fizető neve, számlázási címe és kártyaadata a
            Stripe-hoz.
          </li>
          <li>
            <strong>A levelezés</strong> – a beküldő címre érkező levél teljes szövege és
            melléklete, valamint a kimenő levelek: a Resend útvonala EU-régióban fut, a{' '}
            <strong>tárolás és a naplózás viszont az Egyesült Államokban</strong>.
          </li>
          <li>
            <strong>A weboldal kiszolgálása</strong> – a Vercelhez. Bizonylat nem megy át rajta,
            a látogató kérésének technikai adatai igen (2.1. pont).
          </li>
        </Lista>
        <P>
          Az előfizetési díjról kiállított számlát magyarországi szolgáltató készíti.
        </P>
        <P>
          <strong>Az Unión kívüli továbbítás garanciái.</strong> Minden fenti közreműködővel –
          a Google kivételével, lásd lent – adatfeldolgozási szerződés áll fenn, amely
          tartalmazza a harmadik országba történő továbbítás garanciáit.{' '}
          <strong>Hogy melyik közreműködőnél melyik garancia érvényesül</strong> – az Európai
          Bizottság által elfogadott általános szerződési feltételek, illetve az EU–USA
          adatvédelmi keret –, azt a táblázat „Hol dolgozza fel" oszlopa soronként megmondja,
          a Szolgáltató által elfogadott szerződések alapján. A szerződő fél adatai szintén az
          elfogadott szerződésekből származnak; ahol a szerződés székhelyet nem ad meg, ott ezt a
          táblázat kimondja. A garanciákról és azok másolatáról a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címen kérhetsz tájékoztatást. Ez a továbbítási garancia <strong>nem azonos</strong>{' '}
          az adatkezelés 2. pontban megjelölt jogalapjával: az előbbi azt mondja meg, milyen
          feltétellel hagyhatja el az adat az Uniót, az utóbbi azt, hogy egyáltalán miért
          kezeljük.
        </P>
        <P>
          <strong>Az OpenRouterrel kötött szerződés szerepei.</strong> Az OpenRouter
          adatfeldolgozási feltételei a Szolgáltatót adatkezelőként, az OpenRoutert
          adatfeldolgozóként nevezik meg, és a továbbítás alapja az általános szerződési
          feltételek 2. modulja (adatkezelőtől adatfeldolgozóhoz). A bizonylatokra nézve
          azonban a Szolgáltató maga is adatfeldolgozó (1. pont), az OpenRouter tehát ebben a
          láncban további adatfeldolgozó; a Szolgáltató az OpenRoutert az Előfizető
          utasításainak keretében veszi igénybe. Ugyanezek a feltételek a „különleges adatok"
          („Sensitive Data") körébe sorolják az adóazonosítót és a pénzügyi információt is, és
          ezek feldolgozását csak kifejezett megállapodás alapján vállalják. A számlák ilyen
          adatokat tartalmaznak. A szerződés szerepeinek és e kikötésnek a pontosítását az
          OpenRouternél kezdeményezzük; addig a kiolvasás a hatályos feltételek és a 3.
          pontban leírt, kódból rögzített kérési feltételek szerint működik.
        </P>
        <P>
          <strong>A Google-lel nincs saját szerződésünk.</strong> A modell végpontjait az
          OpenRouter veszi igénybe, a Google tehát <em>al-adatfeldolgozó</em>. A ránk vonatkozó
          garancia ennek megfelelően az OpenRouter feltételeiből ered, és a táblázat is oda
          mutat.
        </P>
        <P>
          <strong>A Stripe szerepe sem egyféle.</strong> Az előfizetés kezelésében a Szolgáltató
          megbízásából jár el, a fizetési művelet lebonyolításában, a visszaélések szűrésében és
          a rá vonatkozó pénzügyi jogszabályok teljesítésében viszont{' '}
          <strong>saját jogon, önálló adatkezelőként</strong> – ezekre az ő saját adatvédelmi
          tájékoztatója irányadó, nem a jelen tájékoztató. A Szolgáltató{' '}
          <strong>teljes bankkártyaadatot nem lát és nem tárol</strong>; a fizető nevét és
          számlázási címét viszont igen, mert abból állítja ki a magyar számlát.
        </P>
        <P>
          <strong>Ha a fenti kör változik</strong> – új közreműködő lép be, vagy másik
          modellszolgáltatóra váltunk –, arról az Előfizetőket a változás előtt legalább tizenöt
          nappal e-mailben értesítjük. Az Előfizető kifogást emelhet, és ha nem jutunk
          megegyezésre, a szerződést a változás hatálybalépéséig felmondhatja. A részletes
          feltételeket az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          tartalmazza, amely egyben a felek közötti adatfeldolgozási szerződés.
        </P>
      </Szakasz>

      <Szakasz cim="6. Gépi jóváhagyás – alapból kikapcsolva">
        <P>
          <strong>Alapértelmezés szerint minden bizonylat emberhez kerül</strong>, és emberi
          jóváhagyás nélkül egyetlen kiolvasott adat sem megy tovább. Automatikus jóváhagyás
          csak akkor történik, ha azt a munkaterület a Beállítások képernyőn{' '}
          <strong>kifejezetten bekapcsolja</strong> – ekkor a minden gépi ellenőrzésen átmenő
          bizonylat emberi jóváhagyás nélkül is továbbengedhető.
        </P>
        <Lista>
          <li>
            <strong>Munkaterületenként kapcsolható</strong>, a Beállítások képernyőn, és{' '}
            <strong>alapból ki van kapcsolva</strong>. Kikapcsolva minden bizonylat emberhez
            kerül.
          </li>
          <li>
            A munkaterület <strong>első{' '}
            {szamlafolyo.automatikusJovahagyas.bemelegitesDarab} bizonylata mindig</strong>{' '}
            emberhez megy, és utána is minden{' '}
            {szamlafolyo.automatikusJovahagyas.mintavetelMinden}. – így marad mérhető, mennyit
            téved a gépi jóváhagyás.
          </li>
          <li>
            Ami automatikusan ment át, az <strong>jelvényt kap</strong> és rövid indokot, és az
            exportig visszahívható javításra. <strong>Soha nem írjuk ki, hogy „ellenőrizve", ha
            senki nem nézte meg.</strong>
          </li>
          <li>
            A gépi jóváhagyás <strong>nem vesz át felelősséget</strong>: a kiolvasott adatok
            összevetése az eredeti bizonylattal ilyenkor is az Előfizető feladata, ahogy az{' '}
            <Link to="/aszf" className="underline">
              ÁSZF 4. pontja
            </Link>{' '}
            kimondja.
          </li>
        </Lista>
        <P>
          <strong>Ez nem a GDPR 22. cikke szerinti automatizált döntéshozatal.</strong> Az
          automatikus jóváhagyás egy számla kiolvasott adatainak továbbengedéséről szól az
          Előfizető saját könyvelési munkafolyamatában, az Előfizető által bekapcsolt
          beállítás szerint. Nem hoz természetes személyre joghatással járó vagy őt hasonlóan
          jelentős mértékben érintő döntést, profilalkotást nem végez, és az eredménye az
          exportig emberi ellenőrzésre visszahívható.
        </P>
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
            A munkaterületek adatai el vannak különítve egymástól, és ezt az{' '}
            <strong>adatbázis maga kényszeríti ki</strong> (soronkénti hozzáférés-szabályozás) –
            nem a felület. A szűkítés tehát közvetlen API-hívással sem kerülhető meg, nem csak a
            képernyőről.
          </li>
          <li>
            <strong>A böngészőből</strong> bizonylatot csak belépett felhasználó tölthet fel, és
            csak a saját munkaterületére.
          </li>
          <li>
            <strong>Az e-mailes beküldés ettől eltérő csatorna, és ezt ki kell mondani:</strong>{' '}
            az itt érkező levél feladója <em>nincs</em> bejelentkezve. A lehetőség ezért{' '}
            <strong>alapból ki van kapcsolva</strong>, és csak a munkaterület tulajdonosa kapcsolhatja be.
            Bekapcsolva a védelem három rétegű: (1) a munkaterület beküldő címe{' '}
            <strong>bemutatóra szóló titok</strong> – véletlenszerű, kitalálhatatlan betűsor,
            amit a tulajdonos bármikor lecserélhet, és a csere a régi címet azonnal
            érvényteleníti; (2) alapesetben <strong>csak a munkaterület felhasználóinak címéről</strong>{' '}
            érkező levelet fogadjuk el, és ez külön átállítható „bárkitől" állásba; (3) a
            beküldött bizonylat ugyanúgy a munkaterület <strong>darabkeretéből</strong> és a kereten
            felüli költésre beállított forintos plafonból gazdálkodik, tehát egy váratlan
            levéláradat nem tud korlátlan költséget okozni. Ismeretlen címzett esetén a levélről
            semmit nem tárolunk.
          </li>
          <li>
            ⚠️ <strong>A feladó ellenőrzése nem biztonsági határ, és nem is annak szánjuk.</strong>{' '}
            Egy levél feladómezője hamisítható. A szűrés a <em>véletlen</em> ellen véd – hírlevél,
            automata válasz, egy aláírásból kimásolt cím –, nem a szándékos visszaélés ellen. A
            valódi védelem a cím titokban tartása; ha a cím kiszivárog, a helyes válasz a{' '}
            <strong>cím cseréje</strong>. A beérkezett levelek sorsa – az elutasítottaké is, az
            elutasítás okával – a Beállítások képernyőn látható.
          </li>
          <li>
            <strong>A visszafordíthatatlan és a munkaterületre kiható műveleteket naplózzuk</strong>{' '}
            (export, a megőrzési idő és a gépi jóváhagyás átállítása, a kereten felüli költés
            engedélyezése, tag felvétele és eltávolítása): ki, mikor, mit tett. Ez utólag
            megmutatja, mi történt a munkaterületen – és a napló a munkaterület adata, a
            törlésével együtt megy el.
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
            magas, az érintetteket is haladéktalanul tájékoztatja. Minden incidenst – azt is,
            amelyet nem kell bejelenteni – nyilvántartásba vesz.
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="8. Milyen jogaid vannak">
        <P>Az adott adatkezelésre vonatkozó feltételek szerint kérheted:</P>
        <Lista>
          <li>a személyes adataidhoz való hozzáférést és az adatkezelésről szóló tájékoztatást;</li>
          <li>a pontatlan adatok helyesbítését;</li>
          <li>
            az adataid törlését vagy kezelésük korlátozását, ha annak jogszabályi feltételei
            fennállnak;
          </li>
          <li>
            az adathordozhatóságot – ez a hozzájáruláson vagy szerződésen alapuló, automatizált
            módon kezelt adatokra vonatkozik, amelyeket te adtál meg (például a fiók- és
            cégadatokra), a jogos érdeken vagy jogi kötelezettségen alapuló kezelésekre nem;
          </li>
          <li>
            a jogos érdeken alapuló adatkezelés ellen tiltakozhatsz; ilyenkor az adatot csak
            akkor kezeljük tovább, ha a kezelést olyan kényszerítő erejű jogos ok indokolja,
            amely elsőbbséget élvez az érdekeiddel szemben, vagy jogi igény érvényesítéséhez
            szükséges.
          </li>
        </Lista>
        <P>
          A fiók törlése a Beállítások képernyőről bármikor, kérelem nélkül elvégezhető; az
          adatok kimentésére az export szolgál, amit a törlés előtt érdemes elkészíteni. A
          többi kérelmet a{' '}
          <a className="underline" href={`mailto:${szolgaltato.email}`}>
            {szolgaltato.email}
          </a>{' '}
          címre küldheted. <strong>Egy hónapon belül válaszolunk.</strong> Ha a kért intézkedést
          nem tudjuk teljesíteni, tájékoztatunk ennek indokáról és a jogorvoslati
          lehetőségeidről.
        </P>
        <P>
          A törléshez való jog nem minden esetben jelenti valamennyi adat azonnali törlését.
          Jogszabályi megőrzési kötelezettség (például a kiállított számláké) vagy jogi igények
          érvényesítése egyes adatok további kezelését indokolhatja (4. pont).
        </P>
        <P>
          Ha a kérelmed egy Előfizető által feltöltött bizonylaton szereplő adatokra vonatkozik,
          azt az adatkezelő Előfizetőhöz továbbítjuk, és adatfeldolgozóként segítjük a
          teljesítését; önállóan ilyenkor nem járunk el.
        </P>
        <P>
          Panaszt tehetsz a <strong>Nemzeti Adatvédelmi és Információszabadság Hatóságnál</strong>
          , illetve bírósághoz fordulhatsz.
        </P>
        <Lista>
          <li>Cím: 1055 Budapest, Falk Miksa utca 9–11.</li>
          <li>Levelezési cím: 1363 Budapest, Pf. 9.</li>
          <li>
            E-mail:{' '}
            <a className="underline" href="mailto:ugyfelszolgalat@naih.hu">
              ugyfelszolgalat@naih.hu
            </a>
          </li>
          <li>
            Honlap:{' '}
            <a
              className="underline"
              href="https://www.naih.hu/ugyfelszolgalat-kapcsolat"
              target="_blank"
              rel="noreferrer noopener"
            >
              naih.hu
            </a>
          </li>
        </Lista>
      </Szakasz>

      <Szakasz cim="9. Hogyan értesülsz a változásokról">
        <P>
          Ha megváltozik az adatkezelésünk – például új közreműködő lép be, vagy más megőrzési
          idő lép életbe –, frissítjük ezt a tájékoztatót, és a változásról az Előfizetőket
          e-mailben értesítjük. A hatályos szöveg mindig ezen az oldalon érhető el, az aktuális
          változat hatálybalépésének dátumával.
        </P>
        <P>
          Ha egy adatot az eredetitől eltérő célra kívánunk felhasználni, erről az új célú
          adatkezelés megkezdése előtt tájékoztatást adunk.
        </P>
      </Szakasz>
    </JogiOldal>
  );
}
