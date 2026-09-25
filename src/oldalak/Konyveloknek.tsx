import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogoSor } from '../komponensek/Logo.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../lib/kornyezet.ts';
import { csomagKoltsegek, legolcsobbCsomag, type CsomagKoltseg } from '../lib/irodaiKoltseg.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { hatar } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import {
  FejlecGombok,
  IkonFeltoltes,
  IkonLetoltes,
  IkonNyil,
  IkonPajzs,
  IkonVillam,
  Lablec,
  MobilLinkek,
  Szekcio,
  SzelesLinkek,
  type FejlecLinkAdat,
} from './Nyitolap.tsx';

/**
 * A „Könyvelőknek" oldal (`/konyveloknek`).
 *
 * # Kinek szól
 *
 * Nem a vállalkozónak, hanem annak, aki hónap végén a vállalkozó
 * cipősdobozát kapja: egy könyvelőiroda 20–100 ügyfél bizonylatait rögzíti, és
 * a rögzítés az ő fájdalma. (A marketingdöntés: `DONTESTORTENET.md`,
 * 2026-09-24.)
 *
 * # A szövegek (2026-09-25)
 *
 * A tulajdonos átírt szövegei, három elvvel:
 *
 * 1. **A könyvelőprogramok elöl.** Az RLB Kettős, a Novitax NTAX és a
 *    Kulcs-Könyvelés már a heróban áll: egy könyvelőnek ez a legkonkrétabb
 *    kapaszkodó.
 * 2. **Tárgyilagos, nem védekező hang.** A „nem hiányzó funkció" és a „jobb,
 *    ha most tudod meg" típusú fordulatok helyett leírás arról, hogyan
 *    használható a rendszer.
 * 3. **A működési feltételek egyértelműen.** A közös hozzáférés és a fájlok
 *    törlése a lapon marad, mert ezek alapján lehet megalapozottan dönteni.
 *
 * ## A NAV-szakasz feladatközpontú
 *
 * Egy könyvelő első mondata az lesz: „minek, megvan a NAV-ból". A régi lap
 * ezt egy „NAV: igen/nem – SzámlaFolyó: igen" táblával válaszolta meg; az új
 * tábla azt mutatja, **milyen munkával** segít a rendszer (belföldi számla,
 * külföldi szállító, nyugta, a bizonylatfájl, jóváhagyás). A NAV-adatot nem
 * vitatjuk: az a könyvelőprogramban marad.
 *
 * ⚠️ A „jóváhagyás" sor **nem** mondja, hogy követhető, ki hagyta jóvá: a
 * rendszer rögzíti (`approved_by`), de a felületen és az exportban ma nem
 * látszik. A tulajdonos döntése (2026-09-25): a mondat íródott át, nem a
 * funkció készült el.
 *
 * # Amit a lap nem ígér, szándékosan
 *
 * - **Olyan könyvelőprogramot, amit valódi példány még nem olvasott be.** A
 *   lap csak a `KIMERVE`-s programot nevezi meg (`beallitas.ts`); egy új
 *   program béta, amíg nincs kimérve, és addig nem kerül ide.
 * - **Feltétel nélküli emberi jóváhagyást.** Ugyanaz a szabály, mint a
 *   nyitólapon (`jogiSzovegek.test.ts`, 9. pont): alapbeállítás szerint.
 * - **Hogy az adat végig az Unióban marad.** A tárolás Frankfurtban van, a
 *   kiolvasás viszont a Google-nél történik, és az e-mailes beküldés
 *   szolgáltatója is Unión kívül tárol – ezt kimondjuk.
 * - **Ügyfélenkénti hozzáférést.** Az ügyfélszűrő nem jogosultság
 *   (Adatkezelés 1. pont) – ez egy könyvelőnél az első ügyfélmeghívásnál
 *   derülne ki, ezért a lapon előbb.
 * - **Élő, egyeztetett bemutatót.** Helyette videó van (`BEMUTATO_VIDEO`,
 *   felvétele: `scripts/bemutato-video/`); az e-mail-cím csak kérdésre való.
 *
 * # A számok
 *
 * Minden ár, keret, határ és nap a configból jön (`irodaiKoltseg.ts`,
 * `szamlafolyo.megorzes`, `szamlafolyo.tulhasznalat`), az oldalhatár a
 * `hatar()`-ból. Egy áremelés után a lap nem mutathat régit.
 */
export function Konyveloknek() {
  return (
    <div className="min-h-screen bg-vaszon text-slate-800 antialiased">
      <Fejlec />
      <main>
        <Hero />
        <Bemutato />
        <NavMellett />
        <IrodaiFolyamat />
        <Kalkulator />
        <Adatkezeles />
        <IrodaiHasznalat />
        <Zaro />
      </main>
      <Lablec />
    </div>
  );
}

/**
 * A bemutatóvideó a `public/`-ból – saját tárhelyen, nem YouTube-on: a
 * beágyazott lejátszó harmadik féltől jövő sütit hozna.
 *
 * Két forrás: az MP4 (H.264) szinte mindenhol megy, de a nyílt forrású
 * Chromium és a rendszerkodek nélküli Firefox nem játssza le – nekik a WebM.
 */
const BEMUTATO_VIDEO = {
  mp4: '/bemutato/konyveloknek.mp4',
  webm: '/bemutato/konyveloknek.webm',
  poszter: '/bemutato/konyveloknek-poszter.jpg',
} as const;

// ---------------------------------------------------------------------------
// Fejléc
// ---------------------------------------------------------------------------

function Fejlec() {
  return (
    <header className="sticky top-0 z-50 border-b border-zsalya/20 bg-vaszon/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:px-8">
        <Link to="/" className="logo-link">
          <LogoSor jel="h-9 w-9 md:h-10 md:w-10" szoveg="text-xl md:text-2xl" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <SzelesLinkek linkek={FEJLEC_LINKEK} />
          <FejlecGombok />
        </nav>

        <Link to="/bejelentkezes" className="btn btn-primary shrink-0 rounded-full px-4 shadow-lg shadow-blue-500/20 sm:px-5 lg:hidden">
          Bejelentkezés
        </Link>
      </div>

      {/* Mobilon a linkek saját sorban, mint a nyitólapon (`MobilLinkek`). */}
      <MobilLinkek linkek={FEJLEC_LINKEK} />
    </header>
  );
}

/** A fejléc linkjei – a széles és a mobil elrendezés is ebből rajzol. */
const FEJLEC_LINKEK: readonly FejlecLinkAdat[] = [
  { ut: '/', cimke: 'Főoldal' },
  { hova: '#bemutato', cimke: 'Bemutató' },
  { hova: '#kalkulator', cimke: 'Költségkalkulátor' },
];

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rounded-full bg-zsalya/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-24 -right-24 h-96 w-96 rounded-full bg-mustar/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold tracking-wide text-blue-700 uppercase">
          Könyvelőknek és könyvelőirodáknak
        </p>

        <h1 className="mb-6 text-4xl leading-tight font-extrabold text-slate-800 sm:text-5xl lg:text-6xl">
          Kevesebb kézi rögzítés,{' '}
          <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            ügyfelenként rendezett
          </span>{' '}
          számlaadatok.
        </h1>

        <p className="mx-auto mb-4 max-w-3xl text-lg leading-relaxed text-slate-500 sm:text-xl">
          <strong className="text-slate-800">
            Külföldi számlák, nyugták, fotózott bizonylatok
          </strong>{' '}
          – a NAV-ból átvett adatok mellett ezek feldolgozására is időt kell szánni.
        </p>
        <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-slate-500 sm:text-xl">
          A SzámlaFolyó kiolvassa a beküldött bizonylatok adatait, megjelöli az ellenőrzést
          igénylő mezőket, és ügyfelenként exportálhatóvá teszi a jóváhagyott tételeket. Így
          kevesebb adatot kell kézzel rögzítened a könyvelés előkészítésekor.
        </p>

        {/*
          A könyvelőprogramok a heróban: egy könyvelőnek ez a legkonkrétabb
          kapaszkodó (a tulajdonos 1. elve, 2026-09-25). A nevek itt is
          szó szerint állnak, mert az őr a lap szövegében keresi őket.
        */}
        <p className="mx-auto mb-10 max-w-3xl rounded-2xl border border-zsalya/30 bg-white/70 px-5 py-4 text-base leading-relaxed text-slate-600 shadow-sm">
          Export{' '}
          <strong className="text-slate-800">RLB Kettős</strong>,{' '}
          <strong className="text-slate-800">Novitax NTAX</strong> és{' '}
          <strong className="text-slate-800">Kulcs-Könyvelés</strong> számára, valamint XLSX, CSV
          és JSON formátumban.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          {regisztracioNyitva && (
            <Link
              to="/regisztracio"
              className="btn btn-primary rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-blue-500/20"
            >
              Kipróbálom ingyen
              <IkonNyil className="h-5 w-5" />
            </Link>
          )}
          <a
            href="#bemutato"
            className={
              regisztracioNyitva
                ? 'btn btn-secondary rounded-full border-zsalya/30 px-8 py-4 text-lg font-semibold'
                : 'btn btn-primary rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-blue-500/20'
            }
          >
            Megnézem a bemutatót
          </a>
        </div>

        <dl className="mx-auto mt-10 grid max-w-3xl gap-4 border-t border-zsalya/20 pt-6 text-left sm:grid-cols-3">
          {[
            { szam: `${szamlafolyo.proba.napok} napos ingyenes próba`, mit: 'Bankkártya megadása nélkül.' },
            {
              szam: `${szamlafolyo.proba.dokumentumok} dokumentum feldolgozása`,
              mit: 'A próba alatt minden funkció elérhető.',
            },
            {
              szam: `${szamlafolyo.proba.felhasznalok} felhasználó a próba alatt`,
              mit: 'Próbáljátok ki a munkatársaiddal együtt.',
            },
          ].map((a) => (
            <div key={a.szam}>
              <dt className="text-sm font-bold text-slate-800">{a.szam}</dt>
              <dd className="mt-0.5 text-sm text-slate-500">{a.mit}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bemutató
// ---------------------------------------------------------------------------

function Bemutato() {
  return (
    <Szekcio
      id="bemutato"
      felcim="Bemutató"
      cim="Nézd meg egy ügyfél bizonylatainak feldolgozását."
      alcim="A feltöltéstől az ellenőrzésen át a Kulcs-Könyveléshez készített exportig: a bemutatóban végigkövetheted a munkafolyamatot a SzámlaFolyó felületén."
      halvany
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-zsalya/30 bg-tinta shadow-2xl shadow-slate-900/10">
        <video
          controls
          playsInline
          preload="none"
          poster={BEMUTATO_VIDEO.poszter}
          className="aspect-video w-full"
        >
          <source src={BEMUTATO_VIDEO.mp4} type="video/mp4" />
          <source src={BEMUTATO_VIDEO.webm} type="video/webm" />
          <a href={BEMUTATO_VIDEO.mp4}>A bemutatóvideó letöltése (MP4)</a>
        </video>
      </div>
      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-slate-500">
        A videó mintaadatokkal készült, és feliratokkal vezet végig a lépéseken, így hang nélkül
        is követhető.
      </p>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// A NAV-adatok mellett
// ---------------------------------------------------------------------------

/**
 * Feladatközpontú tábla: mivel dolgozik a könyvelő, és abban mit végez el a
 * SzámlaFolyó. A NAV-adatot nem vitatja – azt mutatja, ami mellette marad.
 */
function NavMellett() {
  const sorok = [
    {
      mi: 'Belföldi számlák',
      segit: 'Kiolvassa a feltöltött számlák adatait, és segít az ellenőrzésükben.',
    },
    {
      mi: 'Külföldi szállítók számlái',
      segit:
        'Feldolgozza a beküldött bizonylatokat, például a külföldi előfizetések és beszállítók számláit.',
    },
    {
      mi: 'Nyugták, fotózott blokkok',
      segit: 'A képen szereplő adatokat is kiolvassa és ellenőrzésre előkészíti.',
    },
    {
      mi: 'PDF-ek, szkennelt képek, fotók',
      segit: 'Az eredeti fájlokat a feldolgozás során elérheted, majd ZIP-csomagban letöltheted.',
    },
    {
      mi: 'Ellenőrzés és jóváhagyás',
      segit: 'Jelzi az észlelt eltéréseket, és exportba csak a jóváhagyott bizonylat kerül.',
    },
  ];

  return (
    <Szekcio
      id="nav"
      felcim="A NAV-adatok mellett"
      cim="A NAV-adatok mellett a többi bizonylat feldolgozását is egyszerűsítheted."
      alcim="A NAV-ból átvett számlaadatok sok kézi munkát megtakarítanak. Az ügyféltől érkező külföldi számlák, nyugták és fotózott bizonylatok feldolgozása azonban továbbra is feladatot jelent."
    >
      <p className="mx-auto -mt-8 mb-10 max-w-3xl text-center text-lg leading-relaxed text-slate-500">
        A SzámlaFolyó ezeket is kezeli, és a feltöltött belföldi számlákból is kiolvassa az
        adatokat. A feldolgozás során az eredeti bizonylatot és a felismert mezőket együtt
        nézheted át.
      </p>

      <div className="mx-auto max-w-4xl overflow-x-auto rounded-2xl border border-zsalya/20 bg-white shadow-sm">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th w-1/3">Mivel dolgozol?</th>
              <th className="th">Miben segít a SzámlaFolyó?</th>
            </tr>
          </thead>
          <tbody>
            {sorok.map((s) => (
              <tr key={s.mi}>
                <td className="td font-semibold text-slate-800">{s.mi}</td>
                <td className="td text-slate-600">{s.segit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-slate-500">
        A NAV-adatokkal továbbra is a megszokott könyvelőprogramodban dolgozhatsz. A SzámlaFolyó
        az ügyfelektől érkező bizonylatok feldolgozását és a könyvelés előkészítését segíti.
      </p>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Így működik egy könyvelőirodában
// ---------------------------------------------------------------------------

function IrodaiFolyamat() {
  const lepesek: { cim: string; bekezdesek: readonly string[]; ikon: ReactNode }[] = [
    {
      cim: 'Az ügyfél beküldi, vagy te feltöltöd',
      bekezdesek: [
        'A céges munkaterülethez saját beküldési e-mail-címet kapcsolhatsz. Ha engedélyezed a külső feladóktól érkező leveleket, az ügyfeleid közvetlenül erre a címre továbbíthatják a bizonylataikat.',
        'A már nálad lévő fájlokat a felületen is feltöltheted.',
      ],
      ikon: <IkonFeltoltes className="h-8 w-8" />,
    },
    {
      cim: 'A SzámlaFolyó kiolvassa az adatokat',
      bekezdesek: [
        'A rendszer PDF-eket, szkennelt képeket, fotókat és e-számla XML-fájlokat is feldolgoz. A felismert, támogatott XML-formátumokból közvetlenül veszi át az adatokat; a képek és más dokumentumok kiolvasását mesterséges intelligencia végzi.',
        'Az egy fájlba összefűzött bizonylatokat különválasztja.',
      ],
      ikon: <IkonVillam className="h-8 w-8" />,
    },
    {
      cim: 'Ellenőrzöd és jóváhagyod',
      bekezdesek: [
        'A rendszer jelzi például, ha hibás az adószám ellenőrző számjegye, vagy a nettó és az áfa összege nem egyezik a bruttóval.',
        'Alapbeállítás szerint minden bizonylat a te vagy egy munkatársad jóváhagyására vár. Az automatikus jóváhagyás külön bekapcsolható.',
      ],
      ikon: <IkonPajzs className="h-8 w-8" />,
    },
    {
      cim: 'Ügyfelenként exportálsz',
      bekezdesek: [
        'A tételeket az ügyfél adószáma alapján szűrheted. A rendszer az azonos adószámtörzshöz tartozó belföldi és közösségi alakot is összerendeli.',
        'Az adatokat XLSX, CSV vagy JSON formátumban, illetve az RLB Kettős, a Novitax NTAX és a Kulcs-Könyvelés számára készített exportként töltheted le. Az eredeti bizonylatfájlokat ZIP-csomagban is elmentheted.',
      ],
      ikon: <IkonLetoltes className="h-8 w-8" />,
    },
  ];

  return (
    <Szekcio
      id="folyamat"
      felcim="Így működik egy könyvelőirodában"
      cim="Beérkező bizonylatokból ügyfelenkénti export."
      alcim="Az iroda közös munkaterületén dolgozhattok a beérkező bizonylatokkal. A jóváhagyott adatokat ügyfelenként válogathatod le és adhatod tovább a könyveléshez."
      halvany
    >
      <ol className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {lepesek.map((lepes, i) => (
          <li key={lepes.cim} className="text-center">
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-vaszon text-blue-600 shadow-lg">
              {lepes.ikon}
            </span>
            <h3 className="mb-2 text-xl font-bold text-slate-800">
              {i + 1}. {lepes.cim}
            </h3>
            {lepes.bekezdesek.map((b) => (
              <p key={b} className="mt-2 text-sm leading-relaxed text-slate-500">
                {b}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Költségkalkulátor
// ---------------------------------------------------------------------------

/** A beviteli mező határa: ennél nagyobb iroda már beszélgetés, nem kalkulátor. */
const MAX_UGYFEL = 1000;
const MAX_BIZONYLAT = 1000;

function szamBe(ertek: string, max: number): number {
  const n = Math.floor(Number(ertek));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

/** A legolcsóbb csomag jelölése – a táblában és a mobilkártyán ugyanaz a szöveg. */
const LEGKEDVEZOBB = 'A megadott mennyiséghez a legkedvezőbb havi díj';

/**
 * A kalkulátor sorai – **egy forrásból** a széles táblának és a keskeny
 * kártyáknak, hogy a két elrendezés ne mondhasson mást.
 */
const KALK_SOROK: { cimke: string; ertek: (k: CsomagKoltseg) => string; kiemelt?: boolean }[] = [
  { cimke: 'Becsült teljes havi díj', ertek: (k) => formaz(k.osszes, 'Ft'), kiemelt: true },
  { cimke: 'Alap havidíj', ertek: (k) => formaz(k.havidij, 'Ft') },
  { cimke: 'A havidíjban foglalt dokumentumkeret', ertek: (k) => formaz(k.keret) },
  {
    cimke: 'Kereten felüli feldolgozás',
    ertek: (k) =>
      k.tobbletDarab === 0
        ? 'nincs'
        : `${formaz(k.tobbletDarab)} × ${formaz(szamlafolyo.csomagok[k.kulcs].extraFt, 'Ft')}`,
  },
  { cimke: 'Kereten felüli díj összesen', ertek: (k) => formaz(k.tobbletFt, 'Ft') },
  {
    cimke: 'Átlagos költség bizonylatonként, kerekítve',
    ertek: (k) => (k.darabar === null ? '–' : formaz(k.darabar, 'Ft')),
  },
  { cimke: 'Felhasználók száma', ertek: (k) => (k.felhasznalok === null ? 'Korlátlan' : `${k.felhasznalok} fő`) },
];

function Kalkulator() {
  const [ugyfelek, setUgyfelek] = useState(25);
  const [bizonylat, setBizonylat] = useState(30);

  const darab = ugyfelek * bizonylat;
  const koltsegek = csomagKoltsegek(darab);
  const legjobb = legolcsobbCsomag(darab);
  const h = hatar();

  return (
    <Szekcio
      id="kalkulator"
      felcim="Költségkalkulátor"
      cim="Mennyibe kerülne az irodád havi bizonylatainak feldolgozása?"
      alcim="Add meg, hány ügyfél bizonylataival dolgoznál a SzámlaFolyóban, és ügyfelenként átlagosan hány dokumentumot küldenél be havonta. A kalkulátor összehasonlítja a három csomag várható havi költségét."
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="flabel" htmlFor="kalk-ugyfel">
              Ügyfelek száma
            </label>
            <input
              id="kalk-ugyfel"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_UGYFEL}
              className="control"
              value={ugyfelek}
              onChange={(e) => setUgyfelek(szamBe(e.target.value, MAX_UGYFEL))}
            />
          </div>
          <div>
            <label className="flabel" htmlFor="kalk-bizonylat">
              Havi bizonylatmennyiség ügyfelenként
            </label>
            <input
              id="kalk-bizonylat"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_BIZONYLAT}
              className="control"
              value={bizonylat}
              onChange={(e) => setBizonylat(szamBe(e.target.value, MAX_BIZONYLAT))}
            />
          </div>
          <div className="rounded-lg border border-zsalya/20 bg-white px-4 py-2">
            <p className="text-xs font-medium text-slate-500">Feldolgozandó bizonylatok havonta</p>
            <p className="text-2xl font-extrabold text-slate-800">{formaz(darab)}</p>
            <p className="text-xs text-slate-500">
              {formaz(ugyfelek)} ügyfél × {formaz(bizonylat)} bizonylat
            </p>
          </div>
        </div>

        <div aria-live="polite">
          {/* Széles kijelzőn összehasonlító tábla, a legolcsóbb oszlop kiemelve. */}
          <div className="hidden overflow-hidden rounded-2xl border border-zsalya/20 bg-white shadow-sm md:block">
            {/*
              `table-fixed`: a legolcsóbb oszlop jelölése hosszú szöveg, és
              automatikus szélességnél azt az oszlopot kétszer olyan szélesre
              húzta, mint a másik kettőt (mérve, 1440 px). Így a három csomag
              egyforma, a jelölés tör.
            */}
            <table className="tbl table-fixed">
              <thead>
                <tr>
                  <th className="th w-2/5">
                    <span className="sr-only">Tétel</span>
                  </th>
                  {koltsegek.map((k) => {
                    const ez = k.kulcs === legjobb.kulcs;
                    return (
                      <th key={k.kulcs} className={`th text-right align-bottom ${ez ? 'bg-blue-500/10' : ''}`}>
                        {ez && (
                          <span className="mb-1 block text-xs font-bold tracking-normal text-blue-700 normal-case">
                            {LEGKEDVEZOBB}
                          </span>
                        )}
                        <span className="text-base text-slate-800 normal-case">{k.nev}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {KALK_SOROK.map((sor) => (
                  <tr key={sor.cimke}>
                    <td className={`td ${sor.kiemelt ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{sor.cimke}</td>
                    {koltsegek.map((k) => (
                      <td
                        key={k.kulcs}
                        className={`td text-right whitespace-nowrap ${sor.kiemelt ? 'text-lg font-extrabold text-slate-800' : 'text-slate-700'} ${
                          k.kulcs === legjobb.kulcs ? 'bg-blue-500/10' : ''
                        }`}
                      >
                        {sor.ertek(k)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/*
            Keskeny kijelzőn a hétsoros, háromoszlopos tábla nem fér el – ott
            kártyák, ugyanazokkal a sorokkal. A legolcsóbb kerül előre, különben
            egy nagy irodának két drágább kártya alatt kellene megtalálnia.
          */}
          <div className="grid gap-4 md:hidden">
            {koltsegek.map((k) => {
              const ez = k.kulcs === legjobb.kulcs;
              return (
                <div
                  key={k.kulcs}
                  className={
                    ez
                      ? 'order-first rounded-2xl border-2 border-blue-600 bg-white p-5 shadow-lg'
                      : 'rounded-2xl border border-zsalya/20 bg-white p-5'
                  }
                >
                  {ez && <p className="mb-2 text-xs font-bold text-blue-700">{LEGKEDVEZOBB}</p>}
                  <h3 className="mb-3 text-lg font-bold text-slate-800">{k.nev}</h3>
                  <dl className="space-y-1.5 text-sm">
                    {KALK_SOROK.map((sor) => (
                      <div key={sor.cimke} className="flex justify-between gap-4">
                        <dt className={sor.kiemelt ? 'font-bold text-slate-800' : 'text-slate-500'}>{sor.cimke}</dt>
                        <dd className={`text-right whitespace-nowrap ${sor.kiemelt ? 'font-extrabold text-slate-800' : 'text-slate-700'}`}>
                          {sor.ertek(k)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          A feltüntetett árak a fizetendő végösszegek. A szolgáltató alanyi adómentes, ezért az
          árakra nem kerül további áfa.
        </p>

        <div className="mt-10 grid gap-8 text-sm leading-relaxed text-slate-500 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-800">A kereten felüli feldolgozásról te döntesz</h3>
            <p>
              A havi dokumentumkeret elérésekor a feldolgozás alapbeállítás szerint megáll. A
              beküldött bizonylatok megvárják a következő időszakot.
            </p>
            <p>
              A folytatáshoz a Beállításokban engedélyezheted a kereten felüli feldolgozást, és
              megadhatod a rá fordítható összeget. Az alapértelmezett költési korlát{' '}
              <span className="whitespace-nowrap">{formaz(szamlafolyo.tulhasznalat.alapPlafonFt, 'Ft')}</span>.
            </p>
            <p>
              A kalkulátor a teljes megadott mennyiség feldolgozásával számol. Ehhez a beállított
              költési korlátnak is fedeznie kell a kereten felüli díjat.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-800">Hogyan számoljuk a dokumentumokat?</h3>
            <p>
              Bizonylatonként az első {h} oldal egy dokumentumnak számít. Minden további megkezdett{' '}
              {h} oldal újabb dokumentumot jelent a keretből.
            </p>
            <p>
              A kalkulátor bizonylatonként egy dokumentummal számol. Hosszabb számlák esetén a
              tényleges dokumentumfelhasználás és a költség magasabb lehet.
            </p>
            <p>
              A keret havonta újul meg; a fel nem használt mennyiség nem vihető át a következő
              időszakra.
            </p>
            <p>
              A kalkuláció egy közös céges munkaterület használatára vonatkozik. Az ügyfelek
              elkülönített hozzáféréséhez külön céges munkaterület és külön előfizetés szükséges.
            </p>
          </div>
        </div>
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Adatkezelés
// ---------------------------------------------------------------------------

function Adatkezeles() {
  const pontok: { cim: string; bekezdesek: readonly ReactNode[] }[] = [
    {
      cim: 'Az ügyfeled felhatalmazásával',
      bekezdesek: [
        'Ha az ügyfeled megbízásából, adatfeldolgozóként dolgozol, a SzámlaFolyó további adatfeldolgozóként vesz részt a munkában. A bevonásához szükséges ügyfélfelhatalmazásról neked kell gondoskodnod.',
        <>
          A szerepeket és a feltételeket az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 1. pontja
          </Link>{' '}
          és az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          részletezi.
        </>,
      ],
    },
    {
      cim: 'Európai tárolás, megnevezett közreműködők',
      bekezdesek: [
        'Az adatbázist és a bizonylatfájlokat Frankfurtban, az Európai Unión belül tároljuk.',
        'A mesterséges intelligenciával végzett kiolvasásnál a bizonylat tartalma az OpenRouter közvetítésével a Google szolgáltatásához kerül. Ez Unión kívüli adatfeldolgozással jár; az e-mailes beküldéshez használt szolgáltatónál szintén történik Unión kívüli tárolás.',
        <>
          A közreműködőket és az adattovábbítás feltételeit az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató
          </Link>{' '}
          ismerteti.
        </>,
      ],
    },
    {
      cim: 'Rögzített feltételek a gépi kiolvasáshoz',
      bekezdesek: [
        'A kiolvasási kérésben előírjuk a bizonylattartalom megőrzésének mellőzését, és kizárjuk a modelltanításra történő felhasználást megengedő végpontokat. Ezek a feltételek a rendszer működésének részei, a felületen nem kapcsolhatók ki.',
        'A feltételek érvényesítését és a szolgáltatói garanciákat az adatkezelési tájékoztató részletezi.',
      ],
    },
    {
      cim: 'Előre meghatározott fájlmegőrzés',
      bekezdesek: [
        `Az eredeti bizonylatfájlok az export után alapbeállítás szerint azonnal törlődnek. Ehhez legfeljebb ${szamlafolyo.megorzes.maxNap} napos türelmi időt állíthatsz be. Az elkészült exportfájlok ${szamlafolyo.megorzes.exportNap} nap után törlődnek.`,
        'A megmaradó jóváhagyott adatokból új adatexport készíthető, a törölt eredeti fájlok azonban ebből nem állíthatók vissza. A bizonylatok hosszú távú megőrzéséről saját rendszerben kell gondoskodnod.',
      ],
    },
  ];

  return (
    <Szekcio
      id="adatkezeles"
      felcim="Adatkezelés"
      cim="Átlátható feltételek az ügyfeleid adatainak kezeléséhez."
      alcim="Könyvelőként az ügyfeleid bizonylataival dolgozol. Ezért már a használat előtt megismerheted, hogyan kezeljük az adatokat, kik vesznek részt a feldolgozásban, és meddig érhetők el a fájlok."
      halvany
    >
      <Kartyak pontok={pontok} />
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Használat a könyvelőirodában
// ---------------------------------------------------------------------------

/**
 * A működési feltételek **a lapon**, nem az apróbetűben – tárgyilagosan
 * leírva. Egy könyvelő ezek alapján dönti el, hogyan alakítsa ki a
 * hozzáféréseket (a tulajdonos 3. elve, 2026-09-25).
 */
function IrodaiHasznalat() {
  const pontok: { cim: string; bekezdesek: readonly string[] }[] = [
    {
      cim: 'Közös munkaterület az iroda számára',
      bekezdesek: [
        'Egy felhasználói fiók egy céghez tartozik, a felületen nincs cégváltás. Az iroda közös céges munkaterületén több ügyfél bizonylatait dolgozhatjátok fel, majd ügyfelenként külön exportálhatjátok az adatokat.',
      ],
    },
    {
      cim: 'A munkaterület tagjai minden ügyfél bizonylatait látják',
      bekezdesek: [
        'Az ügyfélszűrő a tételek kiválogatását segíti, a hozzáférést nem korlátozza. A munkaterületre meghívott felhasználó az ott kezelt összes ügyfél bizonylatait látja, a saját szerepkörének megfelelő jogosultságokkal.',
        'Ez az ügyfélként meghívott felhasználókra is igaz. Ha egymástól elkülönített hozzáférésre van szükség, külön céges munkaterületet és külön előfizetést kell használni.',
      ],
    },
    {
      cim: 'A könyvelőprogramodban folytatod a munkát',
      bekezdesek: [
        'A SzámlaFolyó a bizonylatok adatainak kiolvasását, ellenőrzését és exportját végzi. A főkönyvi könyvelés és a bevallások elkészítése továbbra is a könyvelőprogramod feladata.',
      ],
    },
    {
      cim: 'Az ellenőrzés a szakmai munkád része marad',
      bekezdesek: [
        'A jelzések megmutatják az észlelt bizonytalanságokat, de nem szűrnek ki minden hibát. A neveket és más szöveges adatokat akkor is érdemes összevetned az eredeti bizonylattal, ha a rendszer nem jelzett eltérést.',
      ],
    },
  ];

  return (
    <Szekcio
      id="hasznalat"
      felcim="Használat a könyvelőirodában"
      cim="Így illeszthető a SzámlaFolyó az irodád működésébe."
      alcim="A hozzáférések kialakításához és a napi munkához az alábbiakat érdemes figyelembe venned."
    >
      <Kartyak pontok={pontok} />
    </Szekcio>
  );
}

function Kartyak({ pontok }: { pontok: readonly { cim: string; bekezdesek: readonly ReactNode[] }[] }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      {pontok.map((p) => (
        <div key={p.cim} className="rounded-2xl border border-zsalya/20 bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-bold text-slate-800">{p.cim}</h3>
          {p.bekezdesek.map((b, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-slate-500">
              {b}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zárás
// ---------------------------------------------------------------------------

function Zaro() {
  return (
    <section className="bg-tinta py-20 text-vaszon">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
          Próbáld ki egy ügyfeled bizonylataival.
        </h2>
        <p className="mb-4 text-lg leading-relaxed text-vaszon/70">
          Válassz ki egy olyan ügyfelet, akinél rendszeresen rögzítesz kézzel számlaadatokat. Tölts
          fel néhány jellemző bizonylatot, nézd át a kiolvasott mezőket, és próbáld ki az exportot
          a saját könyvelési folyamatodban.
        </p>
        <p className="mb-8 text-sm font-bold text-vaszon">
          {szamlafolyo.proba.napok} nap · {szamlafolyo.proba.dokumentumok} dokumentum ·{' '}
          {szamlafolyo.proba.felhasznalok} felhasználó · Bankkártya nélkül
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          {regisztracioNyitva && (
            <Link
              to="/regisztracio"
              className="rounded-full bg-vaszon px-8 py-4 text-lg font-extrabold text-blue-600 shadow-lg transition-colors hover:bg-white"
            >
              Kipróbálom ingyen
            </Link>
          )}
          <a
            href="#bemutato"
            className="rounded-full border border-vaszon/30 px-8 py-4 text-lg font-semibold text-vaszon transition-colors hover:bg-tinta-lagy"
          >
            Megnézem a bemutatót
          </a>
        </div>
        <p className="mt-8 text-sm text-vaszon/60">
          Kérdésed van az irodai használatról? Írj nekünk:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="underline hover:text-vaszon">
            {kapcsolatEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
