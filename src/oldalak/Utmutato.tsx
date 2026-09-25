import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { JogiOldal, P, Lista, Tablazat } from './jogi/JogiOldal.tsx';
import { kapcsolatEmail } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { hatar, oldalakbol } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { allapotCimke, szerepCimke, SZEREPEK, type DokumentumAllapot, type Szerep } from '@uzleti/enumok.ts';
import { FEJLECEK, KULCSOK, SZAM_OSZLOPOK } from '@uzleti/export/oszlopok.ts';
import { KULCS_FAJLOK } from '@uzleti/export/konyvelo/kulcs.ts';
import { NOVITAX_FAJLOK } from '@uzleti/export/konyvelo/novitax.ts';

/**
 * Használati útmutató.
 *
 * # Kinek szól
 *
 * A címzett a **felhasználó** – vállalkozó vagy könyvelő –, nem a fejlesztő.
 * A lap **a bizonylat útját követi**: hogyan kerül be, mi történik vele, mit
 * kell megnézni rajta, hogyan megy ki. Első használatkor elejétől, később a
 * tartalomjegyzékből.
 *
 * # A 2026-09-25-i átírás
 *
 * A tulajdonos szövegei, három szerkesztési elvvel:
 *
 * 1. **A felület nevei betű szerint.** Menüpont, kártyacím, gomb: ahogy a
 *    képernyőn áll. Ahol a szövegfájl rövidített (pl. „Próbafájl"), ott a
 *    gomb valódi felirata került be („Próbafájl letöltése"); a „Jóváhagyás és
 *    következő" csak akkor ez, ha van még sorban álló bizonylat.
 * 2. **Egy magyarázat egyszer.** A beküldési cím titkossága eddig két
 *    figyelmeztetésben is állt; most egy alfejezet.
 * 3. **A technikai leírás külön alfejezetben, a mezőlisták lenyitható
 *    részben** (`Lenyithato`). Az „Az export mezői" és „A teljes adatkiadás
 *    szakaszai" a Data Act 26. cikke szerinti online formátumleírás része, ezért
 *    **a lapon marad** – csak nem takarja el a napi használathoz keresett
 *    lépéseket. (A böngésző oldalon belüli keresése a csukott részben is talál,
 *    és a Chromium ki is nyitja.)
 *
 * # Szabályok, amihez a szöveg tartja magát
 *
 * - **Csak azt írja le, amit a rendszer tud.** Ami ma nincs kész (cégváltó,
 *   éves fizetés), arról nem szól.
 * - **A számok a configból jönnek, nem kézből:** keretek, árak, megőrzési
 *   idők, próbálkozások, mellékletszám, az oldalhatár és a példái. Az állapot-
 *   és szerepnevek az `enumok.ts`-ből, tehát nem csúszhatnak el a felülettől.
 * - **A jogi szövegekre mutat, nem ismétli őket.** Ahol kötelezettségről vagy
 *   adatkezelésről van szó, az ÁSZF és az Adatkezelési tájékoztató a mérvadó.
 *
 * # A keret
 *
 * A lap a jogi oldalak keretét (`JogiOldal`) használja: hosszú, nyilvános,
 * olvasásra való lap, ugyanaz a fejléc, szélesség és lábléc.
 */
export function Utmutato() {
  const h = hatar();
  const rovid = Math.max(1, h - 2);
  const hosszu = h + 3;

  return (
    <JogiOldal cim="Használati útmutató" datummal={false}>
      <P>
        A SzámlaFolyó segít feldolgozni a számlákat és nyugtákat, hogy kevesebb adatot kelljen
        kézzel rögzítened. Feltöltöd vagy e-mailben beküldöd a bizonylatokat, a rendszer
        kiolvassa az adatokat, te ellenőrzöd és jóváhagyod őket, majd elkészíted az exportot.
      </P>
      <P>
        Ez az útmutató ezen a folyamaton vezet végig. Első használatkor érdemes az elejéről
        haladnod; később a tartalomjegyzékből közvetlenül a keresett részhez ugorhatsz.
      </P>

      <Tartalom />

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="elso-lepesek">
        <Alcim>Add meg a céged adatait</Alcim>
        <P>
          Az első belépés után add meg a cég nevét és adószámát. A rendszer ezeket használja a
          bizonylatok feldolgozásakor és az exportokban, ezért ellenőrizd, hogy pontosan
          szerepelnek-e.
        </P>
        <P>
          A SzámlaFolyó ellenőrzi a magyar adószám első nyolc számjegyének, vagyis a
          törzsszámnak az ellenőrző számjegyét. Ha hibát jelez, nézd át a megadott adószámot.
        </P>

        <Alcim>Ha több ügyfélnek könyvelsz</Alcim>
        <P>
          Egy felhasználói fiók egy céges munkaterülethez tartozik. Az iroda munkaterületén több
          ügyfél bizonylatait is feldolgozhatjátok, majd az adatokat ügyfelenként
          exportálhatjátok. A felületen nincs cégváltás.
        </P>
        <P>
          <strong>A munkaterület minden tagja látja az ott kezelt összes ügyfél bizonylatait.</strong>{' '}
          Az ügyfélszűrő a tételek kiválogatására szolgál, a hozzáférést nem korlátozza.
        </P>
        <P>
          Ha az ügyfelek adatait egymástól elkülönített hozzáféréssel szeretnéd kezelni, külön
          céges munkaterületre és külön előfizetésre van szükség.
        </P>
        <P>
          Ha az ügyfeled megbízásából, adatfeldolgozóként dolgozol, a SzámlaFolyó bevonásához
          szükséges ügyfélfelhatalmazásról is gondoskodnod kell. A részleteket az{' '}
          <JogiLink to="/aszf">ÁSZF 11. pontja</JogiLink> tartalmazza.
        </P>

        <Alcim>Hívd meg a munkatársaidat</Alcim>
        <P>
          A meghívást a <strong>Beállítások → Tagok</strong> résznél indíthatod.
        </P>
        <P>
          Add meg a munkatárs e-mail-címét, és válaszd ki a szerepkörét. A meghívott az
          e-mailben kapott linken regisztrálhat, vagy beléphet a meglévő fiókjával.
        </P>
        <P>A szerepkörök közötti különbségeket a {pont('szerepek')}. fejezetben találod.</P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="bekuldes">
        <Alcim>Feltöltés a felületen</Alcim>
        <P>
          Nyisd meg a <strong>Beérkező</strong> képernyőt. Húzd a fájlokat a szaggatott keretbe,
          vagy válaszd ki őket a feltöltés gombjával. Egyszerre több fájlt is feltölthetsz.
        </P>
        <P>
          <strong>Elfogadott fájltípusok:</strong> PDF, JPG, PNG, WEBP és e-számla XML.
          <br />
          <strong>Legnagyobb fájlméret:</strong> fájlonként{' '}
          {Math.round(szamlafolyo.feltoltes.maxBajt / 1024 / 1024)} MB.
        </P>
        <P>
          A rendszer a fájl tartalmából állapítja meg a típusát, ezért egy hibás
          fájlkiterjesztés önmagában nem akadályozza meg a feldolgozást.
        </P>

        <Alcim>E-számlák és XML-fájlok</Alcim>
        <P>A SzámlaFolyó az alábbi XML-formátumokat ismeri fel közvetlenül:</P>
        <Lista>
          <li>UBL</li>
          <li>Factur-X / ZUGFeRD, CII-formátumban</li>
          <li>NAV Online Számla</li>
          <li>A régebbi APEH-formátum</li>
        </Lista>
        <P>
          A PDF-be ágyazott, támogatott XML-t is felismeri. Ilyenkor ugyanúgy a PDF-et kell
          feltöltened, az adatokat pedig a rendszer a benne található XML-ből veszi át.
        </P>
        <P>
          Ha az XML formátumát nem ismeri fel, a feldolgozást mesterséges intelligencia végzi.
          Ebben az esetben a dokumentum tartalma külső feldolgozóhoz kerül, a PDF-ekhez és
          képekhez hasonlóan. Erről az{' '}
          <JogiLink to="/adatkezeles">Adatkezelési tájékoztató 3. pontjában</JogiLink> olvashatsz.
        </P>

        <Alcim>Ha ugyanazt a fájlt újra feltöltöd</Alcim>
        <P>
          A rendszer felismeri a már beküldött fájlt. Az új sor{' '}
          <strong>{allapotCimke('duplikatum')}</strong> állapotot kap, és eltávolítható. Ez nem
          csökkenti a dokumentumkeretedet.
        </P>

        <Alcim>Beküldés e-mailben</Alcim>
        <P>
          Az e-mailes beküldést a <strong>Beállítások → E-mailes beküldés</strong> résznél
          kapcsolhatod be. Itt másolhatod ki a céged saját,{' '}
          <code className="rounded bg-slate-100 px-1">{szamlafolyo.bekuldes.domain}</code>{' '}
          végződésű beküldési címét is.
        </P>
        <P>
          Az erre a címre küldött, feldolgozható mellékletek a <strong>Beérkező</strong> listába
          kerülnek.
        </P>
        <P>A beküldésnél az alábbiakra figyelj:</P>
        <Lista>
          <li>
            Alapbeállítás szerint csak a munkaterület tagjainak e-mail-címéről érkező leveleket
            fogadja a rendszer.
          </li>
          <li>
            Ha ügyfelektől vagy szállítóktól is szeretnél közvetlenül bizonylatokat fogadni, a
            feladók beállítását átállíthatod a <strong>„Bárkitől, aki ismeri a címet”</strong>{' '}
            értékre.
          </li>
          <li>
            Ha a levélben PDF- vagy XML-melléklet is van, a képmellékleteket a rendszer kihagyja.
            Így például az aláírásban szereplő logó nem kerül feldolgozásra.
          </li>
          <li>
            Egy levélből legfeljebb {szamlafolyo.bekuldes.maxMelleklet} mellékletet dolgoz fel.
          </li>
          <li>
            A feladó nem kap automatikus választ a feldolgozás eredményéről. Az elfogadott és
            elutasított leveleket a <strong>Beállítások → E-mailes beküldés</strong> rész alján
            követheted.
          </li>
        </Lista>

        <Alcim>A beküldési címet csak az érintettekkel oszd meg</Alcim>
        <P>
          Az erre a címre beküldött bizonylatok a te dokumentumkeretedet használják. Ne tedd
          közzé a címet weboldalon, nyilvános aláírásban vagy körlevélben.
        </P>
        <P>
          A feladó szerinti szűrés a véletlen beküldések kiszűrésében segít, de a feladómező
          hamisítható. Ezért a cím bizalmas kezelése akkor is fontos, ha csak a tagoktól fogadsz
          levelet.
        </P>
        <P>
          Ha a cím illetéktelenhez került, cseréld le a Beállításokban az <strong>Új cím</strong>{' '}
          gombbal. A régi cím azonnal érvénytelenné válik.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="beerkezo">
        <P>
          A beküldött fájl feldolgozása automatikusan elindul, külön indítógombot nem kell
          megnyomnod. A <strong>Beérkező</strong> listában követheted, hol tart a folyamat.
        </P>
        <Tablazat fejlec={['Állapot', 'Mit jelent?', 'Mi a teendőd?']}>
          {ALLAPOT_SOROK.map((s) => (
            <Sor key={s.allapot} elso={allapotCimke(s.allapot)} mit={s.mit} dolog={s.dolog} />
          ))}
        </Tablazat>
        <P>
          Egy PDF kiolvasása jellemzően 5–15 másodpercet vesz igénybe. A felismert
          XML-formátumok feldolgozása ennél gyorsabb lehet. A sorban állás a teljes várakozási
          időt növelheti.
        </P>

        <Alcim>Több bizonylat egy fájlban</Alcim>
        <P>
          Ha egy PDF több számlát vagy nyugtát tartalmaz, a rendszer megkeresi a bizonylatok
          határait, és külön kezeli őket.
        </P>
        <P>
          Az eredeti fájlt nem darabolja fel: azt tartja nyilván, hogy az egyes bizonylatok mely
          oldalakon találhatók. A különválasztásért nem számol fel további dokumentumegységet.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="ellenorzes">
        <P>
          Az <strong>Ellenőrzés</strong> képernyő bal oldalán az eredeti bizonylatot, jobb oldalán
          a kiolvasott adatokat látod.
        </P>
        <P>
          Hasonlítsd össze a mezőket a bizonylattal, és javítsd az esetleges eltéréseket. A
          jelölések segítenek megtalálni a bizonytalan adatokat, de a jelöletlen mezők között is
          lehet hiba. A bizonylatszámot, a végösszeget és a neveket is érdemes ellenőrizned.
        </P>

        <Alcim>Mit jelentenek a mezők színei?</Alcim>
        <Tablazat fejlec={['Jelölés', 'Jelentés', 'Teendő']}>
          <Sor
            elso="Jelöletlen mező"
            mit="A rendszer nem észlelt bizonytalanságot vagy eltérést."
            dolog="Ellenőrizd az adatot az eredeti bizonylat alapján. A jelölés hiánya nem garantálja a helyességet."
          />
          <Sor
            elso="Sárga mező"
            mit="A kiolvasott adat bizonytalan."
            dolog="Vesd össze az eredetivel, és szükség esetén javítsd."
          />
          <Sor
            elso="Piros mező"
            mit="A kiolvasás erősen bizonytalan, vagy valamelyik ellenőrzés eltérést talált."
            dolog="Olvasd el a mező alatti magyarázatot, és ellenőrizd az adatot."
          />
          <Sor
            elso="Szürke mező, „nincs adat”"
            mit="A rendszer nem talált ilyen adatot a bizonylaton."
            dolog="Nézd meg, hogy valóban hiányzik-e. Ez önmagában nem hiba."
          />
        </Tablazat>

        <Alcim>Milyen ellenőrzések futnak?</Alcim>
        <P>A rendszer többek között összeveti:</P>
        <Lista>
          <li>A nettó, az áfa- és a bruttó összeget.</li>
          <li>Az áfabontás sorait és a végösszegeket.</li>
          <li>A magyar adószám ellenőrző számjegyét.</li>
          <li>A bizonylaton szereplő dátumok egymáshoz való viszonyát.</li>
        </Lista>
        <P>
          A jelzés azt mutatja, hogy az adatot érdemes megvizsgálni. Önmagában például a keltnél
          későbbi teljesítési dátum nem jelenti azt, hogy a bizonylat hibás.
        </P>
        <P>Ha módosítasz egy értéket, az ellenőrzések újrafutnak, és a jelölések frissülnek.</P>

        <Alcim>Kézírás, gyenge képminőség és nevek</Alcim>
        <P>
          A kézzel írt vagy rosszul szkennelt bizonylatoknál a rendszer külön figyelmeztetést
          adhat. Ilyenkor a jelöletlen mezőket is nézd át alaposan.
        </P>
        <P>
          A szállító vagy a vevő nevét a számtani ellenőrzések nem tudják igazolni, ezért ezeket
          mindig az eredeti bizonylattal érdemes összevetni.
        </P>

        <Alcim>Honnan származnak a kiolvasott adatok?</Alcim>
        <P>
          A képernyő tetején és a <strong>Beérkező</strong> listában láthatod, hogyan történt a
          feldolgozás.
        </P>
        <P>
          <strong>Felismert e-számla esetén</strong> a rendszer közvetlenül az XML-ben tárolt
          értékeket veszi át.
        </P>
        <P>
          <strong>Képek, szkennelt dokumentumok és fel nem ismert XML-ek esetén</strong>{' '}
          mesterséges intelligencia olvassa ki az adatokat, ezért előfordulhat félreolvasás.
        </P>
        <P>
          A számtani ellenőrzések mindkét esetben lefutnak. Ha még nem látszik a feldolgozás
          módja, a kiolvasás nem fejeződött be.
        </P>

        <Alcim>Áfabontás javítása</Alcim>
        <P>
          Az áfabontásban áfakulcsonként szerkesztheted a nettó és az áfa összegét. Ezek az
          értékek kerülnek az export megfelelő oszlopaiba, ezért a javításokat még jóváhagyás
          előtt végezd el.
        </P>

        <Alcim>Jóváhagyás és továbblépés</Alcim>
        <P>
          Ha végeztél, kattints a <strong>Jóváhagyás</strong> gombra. Ha van még ellenőrzésre
          váró bizonylat, a gomb felirata <strong>„Jóváhagyás és következő”</strong>.
        </P>
        <P>
          A jóváhagyott bizonylat a <strong>Tételek</strong> közé kerül, és a rendszer megnyitja a
          következő ellenőrzésre váró bizonylatot.
        </P>
        <P>
          A módosításokat a rendszer naplózza: megőrzi, melyik mezőt mire javítottad. Ez a
          változtatások visszakövetését és a kiolvasás működésének ellenőrzését szolgálja.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="tetelek-export">
        <Alcim>A jóváhagyott bizonylatok</Alcim>
        <P>
          A <strong>Tételek</strong> képernyőn a jóváhagyott, még nem exportált bizonylatokat
          találod. Ha valamelyiken javítani szeretnél, a <strong>Javításra</strong> gombbal
          visszaküldheted ellenőrzésre.
        </P>

        <Alcim>Export előtt mentsd el az eredeti fájlokat</Alcim>
        <P>
          <strong>Alapbeállítás szerint az eredeti bizonylatfájlok az export után azonnal törlődnek.</strong>
        </P>
        <P>
          Ha szükséged van rájuk, az export elkészítése előtt töltsd le őket az{' '}
          <strong>Eredeti bizonylatok letöltése (ZIP)</strong> gombbal. Ez az adatexporttól külön
          művelet.
        </P>
        <P>
          A <strong>Beállítások → Eredeti fájlok megőrzése</strong> résznél legfeljebb{' '}
          {szamlafolyo.megorzes.maxNap} napos türelmi időt állíthatsz be. A megőrzési idő letelte
          után az eredeti fájl nem állítható vissza a kiolvasott adatokból.
        </P>
        <P>
          Ha egy fájl több bizonylatot tartalmaz, a törléshez kapcsolódó megőrzési idő csak akkor
          indul el, amikor a fájlban szereplő összes bizonylatot exportáltad.
        </P>

        <Alcim>Válaszd ki az exportálandó tételeket</Alcim>
        <P>
          Az <strong>Export</strong> képernyőn az alábbiak szerint szűrhetsz:
        </P>
        <Lista>
          <li>Beérkezési dátum</li>
          <li>Bizonylattípus</li>
          <li>Ügyfél</li>
        </Lista>
        <P>
          Az ügyfélszűrő az adószám első nyolc számjegye alapján azonosítja az ügyfelet, így az
          eltérő névírás nem választja külön a bizonylatait. A szűrés az ügyfél bejövő és kimenő
          bizonylatait is megjeleníti.
        </P>
        <P>
          Export előtt ellenőrizd a kiválasztott tételek számát és a pénznemenként összesített
          nettó, áfa- és bruttó összegeket.
        </P>

        <Alcim>Export táblázatba vagy JSON-fájlba</Alcim>
        <P>Az adatokat az alábbi formátumokban töltheted le:</P>
        <Lista>
          <li>
            <strong>XLSX:</strong> Excelben és más táblázatkezelőkben használható fájl.
          </li>
          <li>
            <strong>CSV:</strong> más rendszerekbe is átadható, szöveges táblázat.
          </li>
          <li>
            <strong>JSON:</strong> további gépi feldolgozáshoz használható adatformátum.
          </li>
        </Lista>
        <P>
          Az XLSX-fájlban a pénzösszegek számként szerepelnek. A dátumok <code>ÉÉÉÉ-HH-NN</code>{' '}
          formátumú szövegként kerülnek az exportba, például: <code>2026-09-20</code>.
        </P>

        <Alcim>Export könyvelőprogramba</Alcim>
        <P>A SzámlaFolyó az alábbi programokhoz készít exportot:</P>
        <Lista>
          <li>RLB Kettős</li>
          <li>Novitax NTAX</li>
          <li>Kulcs-Könyvelés</li>
        </Lista>
        <P>
          Első használatkor kezdd a <strong>Próbafájl letöltése</strong> gombbal. Ezzel
          ellenőrizheted az importálást anélkül, hogy a tételek exportált állapotba kerülnének.
        </P>

        <Alcim>Könyvelőprogram-export beállítása</Alcim>
        <P>
          Könyvelőirodaként először válaszd ki az ügyfelet. A rendszer az ő adószáma alapján
          határozza meg, mely bizonylatok bejövők és melyek kimenők.
        </P>
        <P>Ezután add meg a szükséges beállításokat:</P>
        <Lista>
          <li>A költség, az előzetes áfa és a szállítók főkönyvi számait.</li>
          <li>Az árbevétel, a fizetendő áfa és a vevők főkönyvi számait.</li>
          <li>Novitax esetén a naplókódot.</li>
          <li>
            Kulcs-Könyvelés esetén az áfakulcsokhoz tartozó kódokat. Ezeket a rendszer a Kulcs
            alaptáblája alapján előre kitölti.
          </li>
        </Lista>
        <P>
          A főkönyvi számokat az egész munkaterületre vagy ügyfelenként is megadhatod.{' '}
          <strong>Az első programfájl elkészítése előtt mentsd el a beállításokat.</strong>
        </P>
        <P>
          A SzámlaFolyó a megadott főkönyvi számokat használja az exportban; nem végez önálló
          kontírozást. A szükséges módosításokat a könyvelőprogramban végezheted el.
        </P>
        <P>
          A Kulcs-Könyvelésben az új partnereket és a pénztárat első alkalommal párosítani kell.
          A kijelölést és a feladást végigvezetve a program megjegyzi a párosítást.
        </P>

        <Alcim>A letöltött fájl betöltése</Alcim>
        <P>
          Az <strong>RLB Kettős</strong> exportját közvetlenül töltsd be a programba.
        </P>
        <P>
          A <strong>Novitax NTAX</strong> és a <strong>Kulcs-Könyvelés</strong> exportja
          ZIP-csomagban érkezik:
        </P>
        <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-slate-700">
          <li>Bontsd ki a csomagot egy külön mappába.</li>
          <li>Hagyd együtt a benne található fájlokat.</li>
          <li>
            Novitax esetén a <code>{NOVITAX_FAJLOK.szamla}</code>, Kulcs-Könyvelés esetén a{' '}
            <code>{KULCS_FAJLOK.fej}</code> fájlt válaszd ki az importáláshoz.
          </li>
        </ol>
        <P>
          Az <strong>Export</strong> képernyő programonként is megmutatja a lépéseket.
        </P>
        <P>
          <strong>A könyvelőprogramhoz készült fájlt ne mentsd újra táblázatkezelőben.</strong> Az
          Excel vagy a Google Táblázatok megváltoztathatja a fájl elválasztóit és
          karakterkódolását, ami importálási hibát okozhat. Az eredetileg letöltött fájlt
          használd.
        </P>

        <Alcim>Mely tételek maradhatnak ki a könyvelőprogram-exportból?</Alcim>
        <P>
          A könyvelőprogramokhoz készített export feltételei szűkebbek a táblázatos exporténál. A
          kimaradó tételek a listán maradnak, és a képernyő mindegyiknél megmutatja az okot.
        </P>
        <P>Nem kerülnek programfájlba:</P>
        <Lista>
          <li>A devizás bizonylatok, mert a rendszer nem olvas ki árfolyamot.</li>
          <li>
            A fordított adózású, közösségi, export- és áfakörön kívüli sorokat tartalmazó
            bizonylatok.
          </li>
          <li>
            Azok a bizonylatok, amelyeknél a 0%-os sor áfakategóriája nincs megadva. Ezt az{' '}
            <strong>Ellenőrzés</strong> képernyőn pótolhatod.
          </li>
          <li>
            Azok a tételek, amelyeknél a nettó és az áfa összege nem egyezik a bruttóval, vagy
            hiányzik a bizonylatszám.
          </li>
          <li>A fizetési határidő nélküli átutalásos számlák.</li>
          <li>
            Novitax és Kulcs-Könyvelés esetén az érvényes magyar partneradószám nélküli
            bizonylatok.
          </li>
          <li>
            Kulcs-Könyvelés esetén a sztornó- és helyesbítő számlák, mert ezekhez a program az
            eredeti számla számát is kéri.
          </li>
        </Lista>
        <P>Ezek a tételek Excel- vagy CSV-fájlba továbbra is exportálhatók.</P>

        <Alcim>Belső sorszámok</Alcim>
        <P>
          A Novitax és a Kulcs számára készített exportban a bizonylatok belső sorszámot kapnak. A
          Novitaxban ez <code>SZF</code> előtaggal jelenik meg.
        </P>
        <P>
          A tétel az első programfájl elkészítésekor kapja meg ezt az azonosítót, és későbbi
          javítás vagy újraexportálás esetén is megtartja.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="archivum">
        <P>
          Az <strong>Archívumban</strong> találod az elkészült exportokat.
        </P>
        <P>
          Az exportfájlt az elkészítésétől számított {szamlafolyo.megorzes.exportNap} napig
          töltheted le újra. Ezután a fájl törlődik, de a hozzá tartozó tételek megmaradnak.
        </P>

        <Alcim>Ha javítani szeretnél egy exportált tételt</Alcim>
        <ol className="ml-5 list-decimal space-y-2 text-sm leading-relaxed text-slate-700">
          <li>
            Keresd meg a tételt az <strong>Archívumban</strong>.
          </li>
          <li>
            A <strong>Visszahívom</strong> gombbal hívd vissza a <strong>Tételek</strong> közé.
          </li>
          <li>
            A <strong>Javításra</strong> gombbal küldd vissza ellenőrzésre, és javítsd az adatokat.
          </li>
          <li>Hagyd jóvá, majd exportáld újra.</li>
        </ol>
        <P>Az eredeti export mellett látható marad, hány tétel tartozik még hozzá.</P>
        <P>
          Ha a korábbi exportot már betöltötted a könyvelőprogramba, ott is ellenőrizd a javítás
          kezelését. Egy új exportfájl elkészítése önmagában nem módosítja a könyvelőprogramban
          szereplő adatokat.
        </P>
        <P>
          <strong>
            Az Archívum a korábbi exportok nyilvántartása. Az eredeti bizonylatok hosszú távú
            megőrzéséről külön kell gondoskodnod.
          </strong>
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="keret">
        <Alcim>Mi számít egy dokumentumnak?</Alcim>
        <P>A dokumentumkeret felhasználását bizonylatonként számoljuk:</P>
        <Lista>
          <li>Az első {h} oldal egy dokumentum.</li>
          <li>Minden további megkezdett {h} oldal újabb dokumentum.</li>
          <li>A feldolgozott e-számla XML is beleszámít a keretbe.</li>
          <li>
            Ha egy fájl több bizonylatot tartalmaz, mindegyiket külön számoljuk, az oldalszámát is
            figyelembe véve.
          </li>
        </Lista>
        <P>
          Például egy {rovid} oldalas számla {oldalakbol(rovid)} dokumentum, egy {hosszu} oldalas
          számla {oldalakbol(hosszu)} dokumentum. Egy PDF-be összefűzött tíz egyoldalas számla 10
          dokumentum.
        </P>
        <P>Nem csökkenti a keretedet:</P>
        <Lista>
          <li>A bizonylatok különválasztása.</li>
          <li>A duplikátumként felismert fájl.</li>
          <li>A sikertelenül kiolvasott bizonylat.</li>
        </Lista>

        <Alcim>Ingyenes próba</Alcim>
        <P>
          A próba{' '}
          <strong>
            {szamlafolyo.proba.napok} napig vagy {szamlafolyo.proba.dokumentumok} dokumentum
            feldolgozásáig
          </strong>{' '}
          tart, attól függően, melyiket éred el előbb.
        </P>
        <P>
          A próba alatt {szamlafolyo.proba.felhasznalok} felhasználó dolgozhat együtt.
          Bankkártyaadatok megadására nincs szükség.
        </P>

        <Alcim>Előfizetési csomagok</Alcim>
        <Tablazat
          fejlec={['Csomag', 'Dokumentum havonta', 'Felhasználók', 'Havidíj', 'Kereten felüli feldolgozás']}
        >
          {csomagSorrend.map((kulcs) => {
            const cs = szamlafolyo.csomagok[kulcs];

            return (
              <tr key={kulcs} className="trow">
                <td className="td font-medium text-slate-900">{cs.nev}</td>
                <td className="td">{cs.dokumentumok}</td>
                <td className="td">{cs.felhasznalok ?? 'Korlátlan'}</td>
                <td className="td whitespace-nowrap">{formaz(cs.arHavi, 'Ft')}</td>
                <td className="td whitespace-nowrap">{formaz(cs.extraFt, 'Ft')} / dokumentum</td>
              </tr>
            );
          })}
        </Tablazat>
        <P>
          Az árak a fizetendő végösszegek. A szolgáltató alanyi adómentes, ezért további áfa nem
          kerül rájuk.
        </P>
        <P>
          A keret havonta újul meg. A fel nem használt mennyiség nem vihető át a következő
          időszakra.
        </P>

        <Alcim>Mi történik, ha elfogy a kereted?</Alcim>
        <P>
          Alapbeállítás szerint a feldolgozás megáll, és a beküldött bizonylatok megvárják a
          következő időszakot.
        </P>
        <P>
          Ha folytatni szeretnéd a feldolgozást, nagyobb csomagra válthatsz, vagy aktív
          előfizetés mellett bekapcsolhatod a <strong>Túlhasználat</strong> lehetőséget a
          Beállításokban.
        </P>
        <P>
          A kereten felüli feldolgozáshoz forintban költési korlátot is megadsz. Ennek alapértéke{' '}
          <strong className="whitespace-nowrap">
            {formaz(szamlafolyo.tulhasznalat.alapPlafonFt, 'Ft')}
          </strong>
          . A korlát elérésekor a feldolgozás ismét megáll.
        </P>
        <P>
          A kereten felüli dokumentumok díja a következő havi számlán, külön tételként jelenik meg.
        </P>

        <Alcim>Előfizetés kezelése</Alcim>
        <P>
          Nyisd meg a <strong>Beállítások → Előfizetés</strong> részt, majd kattints a{' '}
          <strong>Számlázási portál</strong> gombra.
        </P>
        <P>A megnyíló Stripe-felületen:</P>
        <Lista>
          <li>
            Az <strong>„Előfizetés frissítése”</strong> gombbal csomagot válthatsz.
          </li>
          <li>Lemondhatod az előfizetést.</li>
          <li>Módosíthatod a bankkártyádat.</li>
          <li>Letöltheted a korábbi fizetési bizonylatokat.</li>
        </Lista>
        <P>
          A módosítások rövid időn belül a SzámlaFolyó Beállítások képernyőjén is megjelennek.
        </P>

        <Alcim>Hol találod a számládat?</Alcim>
        <P>
          A szolgáltatásról kiállított számlát e-mailben küldjük a megadott címedre. A
          könyveléshez ezt használd.
        </P>
        <P>
          A Stripe portálján letölthető fizetési bizonylat a tranzakcióról szól; nem helyettesíti
          az általunk kiállított számlát.
        </P>

        <Alcim>Mi történik csomagváltáskor?</Alcim>
        <P>
          A csomagváltás nem indít új számlázási időszakot, és nem jár azonnali terheléssel. A
          fordulónap változatlan marad.
        </P>
        <P>A dokumentumkeret viszont azonnal az új csomaghoz igazodik.</P>
        <P>A díjkülönbözetet a következő havi számlán, napra arányosan számoljuk el:</P>
        <Lista>
          <li>
            Nagyobb csomagnál a hátralévő időszak díjkülönbözete külön tételként jelenik meg.
          </li>
          <li>Kisebb csomagnál az időarányos különbözet jóváírásként szerepel.</li>
          <li>
            Ha egy időszakon belül többször váltasz, minden csomag díja a benne töltött idő
            alapján számít.
          </li>
        </Lista>

        <Alcim>Kisebb csomagra váltás</Alcim>
        <P>
          A kisebb dokumentumkeret azonnal életbe lép. Ha az adott időszakban már ennél többet
          dolgoztál fel, a további feldolgozás megáll, kivéve, ha engedélyezed a kereten felüli
          használatot.
        </P>
        <P>
          A váltás előtt, a korábbi csomag keretéből feldolgozott dokumentumokra utólag nem
          számítunk fel többletdíjat.
        </P>
        <P>
          Ha a csomagváltás után az előfizetést is lemondod, a fel nem használt jóváírást nem
          térítjük vissza.
        </P>

        <Alcim>Előfizetés lemondása</Alcim>
        <P>
          Lemondás után a kifizetett időszak végéig használhatod a szolgáltatást. A
          Beállításokban láthatod, meddig aktív az előfizetésed.
        </P>
        <P>A lemondást a fordulónapig visszavonhatod a számlázási portálon.</P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="beallitasok">
        <P>Első használatkor érdemes áttekintened az alábbi beállításokat.</P>
        <Tablazat fejlec={['Beállítás', 'Mire szolgál?', 'Alapbeállítás']}>
          <Sor elso="A cég" mit="A cégnév és az adószám kezelése." dolog="A létrehozáskor megadott adatok." />
          <Sor
            elso="E-mailes beküldés"
            mit="A beküldési cím és az engedélyezett feladók kezelése."
            dolog="Kikapcsolva."
          />
          <Sor
            elso="Automatikus jóváhagyás"
            mit="A feltételeknek megfelelő bizonylatok emberi jóváhagyás nélkül kerülhetnek a Tételek közé."
            dolog="Kikapcsolva."
          />
          <Sor
            elso="Eredeti fájlok megőrzése"
            mit={`Az export utáni megőrzési idő beállítása 0–${szamlafolyo.megorzes.maxNap} nap között.`}
            dolog="0 nap, vagyis azonnali törlés az export után."
          />
          <Sor
            elso="Túlhasználat"
            mit="A kereten felüli feldolgozás engedélyezése és költési korlátja."
            dolog="Kikapcsolva. Csak aktív előfizetéssel kapcsolható be."
          />
          <Sor
            elso="Tagok"
            mit="Munkatársak meghívása, szerepkörök módosítása és tagok eltávolítása."
            dolog="A cég létrehozója a tulajdonos."
          />
          <Sor elso="Előfizetés" mit="Csomagválasztás és a számlázási portál megnyitása." dolog="Próbaidő." />
        </Tablazat>

        <Alcim>Automatikus jóváhagyás</Alcim>
        <P>Alapbeállítás szerint minden bizonylat emberi jóváhagyásra vár.</P>
        <P>
          Ha bekapcsolod az automatikus jóváhagyást, a feltételeknek megfelelő bizonylatok
          közvetlenül a <strong>Tételek</strong> közé kerülhetnek. Ilyenkor is marad rendszeres
          kézi ellenőrzés:
        </P>
        <Lista>
          <li>
            A cég első {szamlafolyo.automatikusJovahagyas.bemelegitesDarab} bizonylata mindenképpen
            emberi jóváhagyásra vár.
          </li>
          <li>
            Ezután minden {szamlafolyo.automatikusJovahagyas.mintavetelMinden}. automatikusan
            jóváhagyható bizonylatot is ellenőrzésre ad a rendszer.
          </li>
        </Lista>
        <P>
          Az automatikusan jóváhagyott bizonylatok külön jelölést és rövid indoklást kapnak.
          Export előtt visszaküldheted őket javításra.
        </P>
        <P>
          Az automatikus jóváhagyás nem jelent emberi ellenőrzést; az adatok helyességét továbbra
          is neked kell biztosítanod.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="szerepek">
        <Tablazat fejlec={['Szerepkör', 'Jogosultságok']}>
          {SZEREPEK.map((szerep) => (
            <tr key={szerep} className="trow">
              <td className="td font-medium whitespace-nowrap text-slate-900">{szerepCimke(szerep)}</td>
              <td className="td">{SZEREP_JOGOK[szerep]}</td>
            </tr>
          ))}
        </Tablazat>
        <P>A jogosultságokat a rendszer a műveleteknél is ellenőrzi.</P>
        <P>
          A munkaterület minden tagja látja az ott kezelt teljes bizonylatállományt. Más céges
          munkaterület adataihoz egyik szerepkör sem ad hozzáférést.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="adatok">
        <Alcim>Hol tároljuk az adatokat?</Alcim>
        <P>Az adatbázist és a bizonylatfájlokat Frankfurtban, az Európai Unión belül tároljuk.</P>
        <P>
          A mesterséges intelligenciával végzett kiolvasásnál a bizonylat tartalma az OpenRouter
          közvetítésével a Google szolgáltatásához kerül. Ez Unión kívüli feldolgozással jár. Az
          e-mailes beküldés szolgáltatójánál szintén történik Unión kívüli tárolás.
        </P>
        <P>
          A kiolvasási kérés előírja a tartalom megőrzésének mellőzését, és kizárja a
          modelltanításra történő felhasználást megengedő végpontokat. Ha a megnevezett
          feldolgozó nem érhető el, a rendszer nem továbbítja a bizonylatot más, meg nem nevezett
          szolgáltatóhoz.
        </P>

        <Alcim>E-számlák feldolgozása</Alcim>
        <P>
          A felismert XML-formátumokból a rendszer közvetlenül olvassa ki az adatokat, ezért a
          tartalmukat nem küldi ki mesterséges intelligenciával végzett feldolgozásra. Ez a
          felismert, PDF-be ágyazott XML-re is érvényes.
        </P>
        <P>A fel nem ismert XML-formátumokat viszont a külső kiolvasó szolgáltatás dolgozza fel.</P>

        <Alcim>Meddig érhetők el a fájlok és az adatok?</Alcim>
        <Tablazat fejlec={['Adat vagy fájl', 'Megőrzés']}>
          <Sor2
            elso="Eredeti bizonylatfájlok"
            masodik={`Az export után a beállított 0–${szamlafolyo.megorzes.maxNap} napos időtartamig. Alapbeállítás szerint azonnal törlődnek.`}
          />
          <Sor2
            elso="Elkészült exportfájlok"
            masodik={`Az elkészítéstől számított ${szamlafolyo.megorzes.exportNap} napig.`}
          />
          <Sor2
            elso="Kiolvasott és jóváhagyott adatok"
            masodik="A szerződés megszűnéséhez kapcsolódó törlésig, az adatkezelési tájékoztató szerint. Ezekből új adatexport készíthető."
          />
        </Tablazat>
        <P>
          A bizonylatok saját megőrzéséről neked kell gondoskodnod. Az eredeti fájlok törlése
          után a kiolvasott adatokból a bizonylat képe nem állítható vissza.
        </P>

        <Alcim>Fiók és céges munkaterület törlése</Alcim>
        <P>
          A törlést a <strong>Beállítások</strong> alján, a <strong>Fiók törlése</strong> linkkel
          indíthatod. A művelet visszafordíthatatlan, ezért előtte mentsd el a szükséges adatokat
          és a még elérhető fájlokat.
        </P>
        <P>
          Ha te vagy az egyetlen tulajdonos, és a munkaterületnek más tagjai is vannak, előbb át
          kell adnod a tulajdonosi szerepet, vagy el kell távolítanod a tagokat.
        </P>
        <P>
          A céges adatok törlése után az ÁSZF elfogadásának nyilvántartása a szerződés
          megszűnésétől számított {szamlafolyo.megorzes.aszfBizonyitekEv} évig megmarad.
        </P>
        <P>
          Az a fiók, amelyhez nem tartozik cég, {szamlafolyo.megorzes.inaktivFiokNap} napos
          belépés nélküli időszak után automatikusan törlődik.
        </P>
        <P>
          A részletes adatkezelési szabályokat az{' '}
          <JogiLink to="/adatkezeles">Adatkezelési tájékoztató</JogiLink>, a szolgáltatás
          feltételeit az <JogiLink to="/aszf">ÁSZF</JogiLink> tartalmazza.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="adatformatumok">
        <P>
          Az adataidat letöltheted, ha másik szolgáltatóval vagy saját rendszerben szeretnél
          tovább dolgozni.
        </P>
        <P>
          A szolgáltatóváltás díjmentes. Menetét és határidőit az{' '}
          <JogiLink to="/aszf">ÁSZF 16. pontja</JogiLink> részletezi. Ez a fejezet az
          adatszolgáltatásokról szóló (EU) 2023/2854 rendelet, a Data Act 26. cikke szerinti
          adatformátum-tájékoztatást is tartalmazza.
        </P>

        <Alcim>Milyen adatot hogyan tölthetsz le?</Alcim>
        <Tablazat fejlec={['Adatok', 'Formátum', 'Elérés']}>
          <Sor
            elso="Jóváhagyott tételek"
            mit="XLSX, CSV vagy JSON"
            dolog="Az Export képernyőn, időszakra és ügyfélre szűrve. A korábban exportált tételeket szükség esetén visszahívhatod."
          />
          <Sor
            elso="Könyvelőprogramokhoz készített export"
            mit="RLB: CSV. Novitax és Kulcs: ZIP-csomag."
            dolog="Az Export képernyőn."
          />
          <Sor
            elso="Eredeti bizonylatfájlok"
            mit="ZIP, a feltöltött fájlok eredeti formátumával."
            dolog="Amíg a fájlok a megőrzési időn belül elérhetők."
          />
          <Sor
            elso="Teljes adatkiadás"
            mit="UTF-8 kódolású JSON-fájl."
            dolog="E-mailben kérhető. Szolgáltatóváltáskor díjmentes."
          />
        </Tablazat>
        <P>
          Teljes adatkiadáshoz írj az{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="text-blue-700 underline hover:text-blue-900">
            {kapcsolatEmail}
          </a>{' '}
          címre.
        </P>

        <Alcim>Technikai részletek: a normál export</Alcim>
        <P>
          Az XLSX-, CSV- és JSON-export alapmezői megegyeznek. A dátumok <code>ÉÉÉÉ-HH-NN</code>{' '}
          formátumúak, budapesti nap szerint.
        </P>
        <Tablazat fejlec={['Formátum', 'Technikai jellemzők']}>
          <Sor2 elso="XLSX" masodik="Office Open XML, ISO/IEC 29500. A számértékeket számként tárolja." />
          <Sor2
            elso="CSV"
            masodik="UTF-8 kódolás bájtsorrend-jellel, pontosvesszős mezőelválasztás, vesszős tizedesjel, CRLF sorvég."
          />
          <Sor2
            elso="JSON"
            masodik={
              <>
                RFC 8259. A számértékek számként, a hiányzó értékek <code>null</code> értékkel
                szerepelnek. Az <code>afa_bontas</code> mező a teljes áfabontást is tartalmazza,
                kategóriakóddal.
              </>
            }
          />
        </Tablazat>
        <P>
          A könyvelőprogramokhoz készített fájlok ettől eltérnek: pontosvesszővel tagolt,
          Windows-1250 kódolású szövegfájlok. Novitax és Kulcs esetén ezeket ZIP-csomag
          tartalmazza.
        </P>

        <Alcim>Az export mezői</Alcim>
        <Lenyithato cim={`Az export ${KULCSOK.length} mezője`}>
          <Tablazat fejlec={['JSON-kulcs', 'XLSX- és CSV-fejléc', 'Adattípus']}>
            {KULCSOK.map((kulcs) => (
              <tr key={kulcs} className="trow">
                <td className="td">
                  <code>{kulcs}</code>
                </td>
                <td className="td">{FEJLECEK[kulcs]}</td>
                <td className="td">
                  {SZAM_OSZLOPOK.includes(kulcs) ? 'Szám' : DATUM_OSZLOPOK.includes(kulcs) ? 'Dátum' : 'Szöveg'}
                </td>
              </tr>
            ))}
          </Tablazat>
        </Lenyithato>

        <Alcim>Mit tartalmaz a teljes adatkiadás?</Alcim>
        <P>
          A teljes adatkiadás a normál exporton túl a rendszerben még elérhető egyéb adatokat is
          tartalmazza: például az ellenőrzésre váró vagy hibás bizonylatokat, a javítási
          előzményeket és a beállításokat.
        </P>
        <P>Az adatokat egy JSON-fájlban adjuk át, az alábbi szakaszokkal.</P>
        <Lenyithato cim={`A teljes adatkiadás ${ADATKIADAS_SZAKASZOK.length} szakasza`}>
          <Tablazat fejlec={['Szakasz', 'Tartalom']}>
            {ADATKIADAS_SZAKASZOK.map(([nev, mit]) => (
              <tr key={nev} className="trow">
                <td className="td">
                  <code>{nev}</code>
                </td>
                <td className="td">{mit}</td>
              </tr>
            ))}
          </Tablazat>
        </Lenyithato>
        <P>
          A teljes adatkiadás időbélyegei UTC szerinti, ISO 8601 formátumú értékek. Az elszámolási
          összegek forintban, a modellhívások <code>cost</code> mezői dollárban szerepelnek.
        </P>
        <P>
          A titkos beküldési címet és a meghívók hozzáférést biztosító azonosítóit biztonsági okból
          nem adjuk ki. Ezek helyén magyarázó szöveg található.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="gyik">
        <Alcim>„{allapotCimke('hiba')}” állapotot látok a Beérkezőben</Alcim>
        <P>
          A rendszer {szamlafolyo.kiolvasas.maxProbalkozas} próbálkozás után sem tudta kiolvasni a
          fájlt.
        </P>
        <P>
          Nyisd meg az eredetit, és ellenőrizd, hogy olvasható-e, nem sérült-e, illetve nincs-e
          jelszóval védve. Javítsd a problémát, majd tölts fel egy olvasható változatot.
        </P>
        <P>A sikertelen kiolvasás nem csökkenti a dokumentumkeretedet.</P>

        <Alcim>Nem egyeznek az összegek</Alcim>
        <P>Nézd meg a piros mező alatti magyarázatot, majd vesd össze az adatokat a bizonylattal.</P>
        <P>
          Ha a rendszer olvasta félre az adatot, javítsd a mezőt az eredetin szereplő értékre. Az
          ellenőrzés azonnal újrafut.
        </P>
        <P>
          Ha az eltérés az eredeti bizonylaton is szerepel, a SzámlaFolyóban végzett módosítás nem
          javítja ki a kiállított számlát. A szükséges helyesbítést egyeztesd a kibocsátóval, a
          könyvelési teendőket pedig a könyvelővel.
        </P>

        <Alcim>Nem látom az e-mailben beküldött számlát</Alcim>
        <P>
          Ellenőrizd, hogy az e-mailes beküldés be van-e kapcsolva, és a megfelelő címre küldted-e
          a levelet.
        </P>
        <P>
          A <strong>Beállítások → E-mailes beküldés</strong> rész alján nézd meg a levelek
          nyilvántartását. Ha a rendszer elutasította a levelet, itt láthatod az okát.
        </P>
        <P>Gyakori ok az engedélyezetlen feladó vagy a nem feldolgozható melléklet.</P>

        <Alcim>Elfogyott a havi keretem</Alcim>
        <P>Három lehetőséged van:</P>
        <Lista>
          <li>Megvárod a következő időszakot.</li>
          <li>Nagyobb csomagra váltasz.</li>
          <li>
            Aktív előfizetés mellett engedélyezed a <strong>Túlhasználat</strong> lehetőséget, és
            beállítod a költési korlátot.
          </li>
        </Lista>

        <Alcim>Hibás adat került az exportba</Alcim>
        <P>
          Az <strong>Archívumban</strong> hívd vissza az érintett tételt, javítsd, hagyd jóvá, majd
          exportáld újra.
        </P>
        <P>Ha az előző fájlt már betöltötted a könyvelőprogramba, a javítást ott is kezeld.</P>

        <Alcim>Nem váltak külön az egy fájlban lévő bizonylatok</Alcim>
        <P>
          Ha a bizonylatok határai nem egyértelműek, a rendszer nem választja külön őket. Ilyenkor
          a kiolvasott adatok az első bizonylathoz tartoznak.
        </P>
        <P>A többi bizonylatot töltsd fel külön fájlban.</P>

        <Alcim>Nem tudom letölteni az eredeti fájlt</Alcim>
        <P>
          Nézd meg, hogy a bizonylatot exportáltad-e már, és letelt-e az eredeti fájlokhoz
          beállított megőrzési idő.
        </P>
        <P>
          Alapbeállítás szerint az eredeti fájl az export után azonnal törlődik. A törölt fájl nem
          állítható vissza; ezért a szükséges eredetiket mindig az export előtt mentsd el.
        </P>

        <Alcim>A könyvelőprogram hibásnak jelzi az importfájlt</Alcim>
        <P>Próbáld az eredetileg letöltött, változtatás nélkül megőrzött fájlt használni.</P>
        <P>
          Novitax és Kulcs esetén ellenőrizd, hogy kibontottad-e a ZIP-et, és az összes mellékelt
          fájl ugyanabban a mappában maradt-e.
        </P>
        <P>
          Új beállításnál először a <strong>Próbafájl letöltése</strong> lehetőséggel ellenőrizd az
          importot.
        </P>
      </Fejezet>

      {/* ------------------------------------------------------------------ */}
      <Fejezet id="kapcsolat">
        <P>
          Ha elakadtál, írj az{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="text-blue-700 underline hover:text-blue-900">
            {kapcsolatEmail}
          </a>{' '}
          címre.
        </P>
        <P>A gyorsabb segítséghez írd meg:</P>
        <Lista>
          <li>Melyik képernyőn jelentkezett a probléma.</li>
          <li>Mit szerettél volna elvégezni.</li>
          <li>Milyen hibaüzenetet látsz.</li>
          <li>Bizonylathoz kapcsolódó kérdésnél a bizonylatszámot és a feltöltés időpontját.</li>
        </Lista>
        <P>Ha az eredeti fájl még elérhető a rendszerben, nem szükséges e-mailben is elküldened.</P>
        <P>
          Ha már exportált bizonylatról kérdezel, előfordulhat, hogy az eredeti fájl nálunk már
          törlődött. Ilyenkor, ha nálad megvan és szükséges a hiba megvizsgálásához, mellékeld a
          levélhez.
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
 * sorszáma és a szövegközi hivatkozások („a 9. fejezetben") is.
 *
 * Ez nem esztétika: az első változatban a sorszámokat kézzel írtam a
 * fejezetcímekbe, és a tartalomjegyzékhez képest **már az első összeolvasásra
 * elcsúsztak**. Így a számozás nem is tud elcsúszni: a sorrend maga a forrás.
 */
const FEJEZETEK = [
  { id: 'elso-lepesek', cim: 'Első lépések' },
  { id: 'bekuldes', cim: 'Bizonylatok feltöltése és beküldése' },
  { id: 'beerkezo', cim: 'A Beérkező és a feldolgozási állapotok' },
  { id: 'ellenorzes', cim: 'Adatok ellenőrzése és jóváhagyása' },
  { id: 'tetelek-export', cim: 'Tételek és export' },
  { id: 'archivum', cim: 'Korábbi exportok és javítások' },
  { id: 'keret', cim: 'Dokumentumkeret, csomagok és számlázás' },
  { id: 'beallitasok', cim: 'Beállítások' },
  { id: 'szerepek', cim: 'Felhasználói szerepkörök' },
  { id: 'adatok', cim: 'Adatkezelés és megőrzés' },
  { id: 'adatformatumok', cim: 'Adatformátumok és szolgáltatóváltás' },
  { id: 'gyik', cim: 'Gyakori kérdések és megoldások' },
  { id: 'kapcsolat', cim: 'Segítség és kapcsolat' },
] as const;

type FejezetId = (typeof FEJEZETEK)[number]['id'];

/** Egy fejezet sorszáma — a szövegközi hivatkozások innen veszik. */
function pont(id: FejezetId): number {
  return FEJEZETEK.findIndex((f) => f.id === id) + 1;
}

/**
 * Tartalomjegyzék.
 *
 * Ez nem egyszer elolvasandó lap, hanem az, amit valaki munka közben nyit meg,
 * mert az áfabontásról akar valamit. Annak a görgetés a rossz válasz.
 */
function Tartalom() {
  return (
    <nav className="card card-pad bg-slate-50" aria-label="Tartalom">
      <p className="text-sm font-semibold text-slate-900">Tartalom</p>
      <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {FEJEZETEK.map((f, i) => (
          <li key={f.id} className="text-sm text-slate-700">
            <a href={`#${f.id}`} className="hover:text-blue-700 hover:underline">
              <span className="text-slate-400">{i + 1}.</span> {f.cim}
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
  const cim = FEJEZETEK.find((f) => f.id === id)?.cim ?? '';

  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="pt-2 text-lg font-semibold text-slate-900">
        {pont(id)}. {cim}
      </h2>
      {children}
    </section>
  );
}

/** Alfejezetcím – a napi használatban keresett lépések címe. */
function Alcim({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-base font-semibold text-slate-800">{children}</h3>;
}

/** Link a jogi szövegekre – egy helyen a stílus. */
function JogiLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-blue-700 underline hover:text-blue-900">
      {children}
    </Link>
  );
}

/**
 * Lenyitható rész a technikai mezőlistáknak (2026-09-25, a tulajdonos
 * kérésére): a lista a lapon marad – a Data Act 26. cikke szerinti online
 * leírás része –, de csukva nem takarja a napi használat lépéseit.
 */
function Lenyithato({ cim, children }: { cim: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span>{cim}</span>
        <span className="text-xs font-normal text-blue-700">
          <span className="group-open:hidden">Megnyitás</span>
          <span className="hidden group-open:inline">Bezárás</span>
        </span>
      </summary>
      <div className="border-t border-slate-200 p-2">{children}</div>
    </details>
  );
}

/** A Beérkező állapottáblája: állapot → mit jelent, mi a teendő. A címke az `enumok.ts`-ből jön. */
const ALLAPOT_SOROK: readonly { allapot: DokumentumAllapot; mit: string; dolog: string }[] = [
  { allapot: 'feltoltve', mit: 'A fájl megérkezett, és feldolgozásra vár.', dolog: 'Várd meg, amíg elindul a feldolgozás.' },
  { allapot: 'feldolgozas_alatt', mit: 'A rendszer éppen kiolvassa az adatokat.', dolog: 'Nincs teendőd.' },
  {
    allapot: 'ellenorzesre_var',
    mit: 'A kiolvasás elkészült, a bizonylat jóváhagyásra vár.',
    dolog: 'Nyisd meg, és ellenőrizd az adatokat.',
  },
  {
    allapot: 'hiba',
    mit: `A kiolvasás ${szamlafolyo.kiolvasas.maxProbalkozas} próbálkozás után sem sikerült.`,
    dolog: 'Ellenőrizd a fájlt, javítsd a problémát, majd töltsd fel újra. A sikertelen kiolvasás nem csökkenti a keretedet.',
  },
  {
    allapot: 'duplikatum',
    mit: 'Ugyanez a fájl már szerepel a rendszerben.',
    dolog: 'Az ismételten beküldött sort eltávolíthatod. Nem csökkenti a keretedet.',
  },
  { allapot: 'jovahagyva', mit: 'A bizonylat jóváhagyást kapott, és exportálható.', dolog: 'A Tételek képernyőn találod.' },
  { allapot: 'exportalva', mit: 'A bizonylat bekerült egy exportba.', dolog: 'Az exportot az Archívumban találod.' },
];

/** A szerepkörök jogai – kulcs szerint, hogy új szerep ne maradhasson ki. */
const SZEREP_JOGOK: Record<Szerep, string> = {
  tulajdonos:
    'Feltölthet, jóváhagyhat, exportálhat és visszahívhat tételeket. Kezelheti a cég adatait, a beállításokat, a tagokat és a számlázást.',
  szerkeszto:
    'Feltölthet, jóváhagyhat, exportálhat és visszahívhat tételeket. A számlázást és a tagokat nem kezelheti.',
  megtekinto:
    'Megnézheti a bizonylatokat és letöltheti a még elérhető eredeti fájlokat. Nem tölthet fel, nem hagyhat jóvá és nem készíthet exportot.',
};

/** Az export dátumoszlopai — a típusoszlop ebből mondja, hogy „Dátum". */
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
  ['kiadas', 'A kiadás időpontja, az érintett cég és az adatszerkezet verziója.'],
  ['ceg', 'Cégadatok, beállítások és az előfizetés állapota.'],
  ['tagok', 'Felhasználók és szerepkörök.'],
  ['meghivok', 'Meghívók címei, szerepkörei és időpontjai.'],
  ['fajlok', 'A fájlok neve, típusa, mérete, lenyomata és törlési ideje.'],
  ['bizonylatok', 'A bizonylatok és kiolvasott adataik, állapottól függetlenül.'],
  ['kiolvasasok', 'A kiolvasások adatai, költsége és keretfelhasználása; a nyers válasz, amíg elérhető.'],
  ['javitasok', 'A módosított mezők, valamint a korábbi és új értékek.'],
  ['exportok', 'Az exportok formátuma, szűrői és tételszáma.'],
  ['tulhasznalat', 'A kereten felüli feldolgozás időszakonkénti elszámolása.'],
  ['beerkezo_levelek', 'A beérkezett levelek nyilvántartása, a levélszöveg nélkül.'],
  ['naplo', 'Tevékenységnapló.'],
  ['aszf_elfogadasok', 'Az elfogadott ÁSZF-változat, az elfogadó és az időpont.'],
  ['konyvelo_beallitasok', 'A könyvelőprogram-exporthoz megadott főkönyvi számok és kódok.'],
  ['iktatoszamok', 'A bizonylatok könyvelőprogramokhoz kiadott belső sorszámai.'],
  ['keret_fedezetek', 'A csomagváltásokhoz kapcsolódó korábbi keretek és felhasználás.'],
  ['darabszamok', 'Az egyes szakaszok sorainak száma, a teljesség ellenőrzéséhez.'],
];

/** Háromoszlopos táblázatsor — az első oszlop kiemelt, nem törik. */
function Sor({ elso, mit, dolog }: { elso: string; mit: string; dolog: string }) {
  return (
    <tr className="trow">
      <td className="td font-medium text-slate-900">{elso}</td>
      <td className="td">{mit}</td>
      <td className="td">{dolog}</td>
    </tr>
  );
}

/** Kétoszlopos táblázatsor. */
function Sor2({ elso, masodik }: { elso: string; masodik: ReactNode }) {
  return (
    <tr className="trow">
      <td className="td font-medium text-slate-900">{elso}</td>
      <td className="td">{masodik}</td>
    </tr>
  );
}
