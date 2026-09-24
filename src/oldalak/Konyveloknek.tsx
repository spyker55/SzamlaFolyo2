import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoSor } from '../komponensek/Logo.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../lib/kornyezet.ts';
import { csomagKoltsegek, legolcsobbCsomag } from '../lib/irodaiKoltseg.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import {
  FejlecGombok,
  IkonFeltoltes,
  IkonLetoltes,
  IkonNyil,
  IkonPajzs,
  IkonPipa,
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
 * # A lap első kérdése a NAV
 *
 * Egy könyvelő első mondata az lesz: „minek, megvan a NAV-ból". A belföldi,
 * adószámos vevőnek kiállított számla adata valóban megvan az Online
 * Számlában, és a vevő lekérdezheti. Ezért a lap **nem** azt állítja, hogy a
 * NAV-adat nincs meg – hanem megmutatja, mi **nincs**: a külföldi számla, a
 * nyugta (vevőként nem kérdezhető le), és maga a bizonylat, a PDF vagy a fotó.
 *
 * ⚠️ A kézzel kiállított belföldi számla adata **is** bekerül a NAV-hoz
 * (utólagos adatszolgáltatással), tehát a „papír" szó önmagában nem érv – a
 * táblázat ezért a bizonylat *képét* és a nyugtát választja szét, nem a
 * papírt a géptől.
 *
 * # Amit a lap nem ígér, szándékosan
 *
 * - **Olyan könyvelőprogramot, amit valódi példány még nem olvasott be.** A
 *   lap csak a `KIMERVE`-s programot nevezi meg (`beallitas.ts`); egy új
 *   program béta, amíg nincs kimérve, és addig nem kerül ide.
 * - **Feltétel nélküli emberi jóváhagyást.** Ugyanaz a szabály, mint a
 *   nyitólapon (`jogiSzovegek.test.ts`, 9. pont): alapértelmezés szerint.
 * - **Hogy az adat végig az Unióban marad.** A tárolás Frankfurtban van, a
 *   kiolvasás viszont a Google modelljénél történik – ezt kimondjuk, és a
 *   tájékoztatóra mutatunk (ugyanaz az őr, harmadik kör 1. pont).
 * - **Ügyfélenkénti hozzáférést.** Az ügyfélszűrő nem jogosultság
 *   (Adatkezelés 1. pont) – ez egy könyvelőnél az első ügyfélmeghívásnál
 *   derülne ki, ezért a lapon előbb.
 * - **Élő, egyeztetett bemutatót.** Helyette videó van (`BEMUTATO_VIDEO`,
 *   felvétele: `scripts/bemutato-video/`); az e-mail-cím csak kérdésre való.
 *
 * # A számok
 *
 * Minden ár, keret és határ a configból jön (`irodaiKoltseg.ts`), a
 * fair-use mondat a `szabaly()`-ból. Egy áremelés után a lap nem mutathat régit.
 */
export function Konyveloknek() {
  return (
    <div className="min-h-screen bg-vaszon text-slate-800 antialiased">
      <Fejlec />
      <main>
        <Hero />
        <Bemutato />
        <NavOsszevetes />
        <IrodaiFolyamat />
        <Kalkulator />
        <Adatvedelem />
        <Hatarok />
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
  { ut: '/', cimke: 'A nyitólapra' },
  { hova: '#bemutato', cimke: 'Bemutató' },
  { hova: '#kalkulator', cimke: 'Kalkulátor' },
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
        <p className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-700">
          Könyvelőknek és könyvelőirodáknak
        </p>

        <h1 className="mb-6 text-4xl leading-tight font-extrabold text-slate-800 sm:text-5xl lg:text-6xl">
          Az ügyfeleid bizonylatai egy helyen,{' '}
          <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
            könyvelésre készen
          </span>
          .
        </h1>

        <p className="mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-slate-500 sm:text-xl">
          A belföldi számlák adata megvan a NAV-ban. <strong className="text-slate-800">A
          többi nincs:</strong> a külföldi számla, a nyugta, a fotózott blokk – és maga a
          bizonylat, amit a könyveléshez meg kell őrizni. A SzámlaFolyó ezeket olvassa ki,
          megjelöli, ami gyanús, és ügyfelenként adja át.
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
            { szam: `${szamlafolyo.proba.napok} nap`, mit: 'próbaidő, bankkártya nélkül' },
            { szam: `${szamlafolyo.proba.dokumentumok} dokumentum`, mit: 'a próbában, teljes funkcionalitással' },
            { szam: `${szamlafolyo.proba.felhasznalok} felhasználó`, mit: 'a próbában – ne egyedül próbáld ki' },
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
      cim="Egy ügyfél bizonylatai, egy perc alatt."
      alcim="Feltöltés, kiolvasás, ellenőrzés és export a Kulcs-Könyvelésbe – a valódi felületen, kitalált adatokkal. Hang nélkül is érthető: feliratos."
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
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// NAV ↔ SzámlaFolyó
// ---------------------------------------------------------------------------

/**
 * A lap legfontosabb blokkja: a könyvelő első kérdésére felel.
 *
 * ⚠️ A NAV-oszlop azt mondja, amit **a vevő** lekérdezhet az Online
 * Számlából – nem azt, amit a NAV egyáltalán tud. A nyugta adata például a
 * pénztárgépből eljut a NAV-hoz, de a vevő onnan nem kapja meg.
 */
function NavOsszevetes() {
  const sorok: { mi: string; nav: boolean; mi2?: string }[] = [
    { mi: 'Belföldi számla adata (adószámos vevőnek kiállítva)', nav: true },
    { mi: 'A bizonylat maga – a PDF, a szkennelt kép, a fotó', nav: false },
    { mi: 'Külföldi szállító számlája (Google, Meta, AWS, uniós beszállító)', nav: false },
    { mi: 'Nyugta, blokk', nav: false, mi2: 'vevőként nem kérdezhető le' },
    { mi: 'Jóváhagyás: ki nézte át, mi volt gyanús', nav: false },
  ];

  return (
    <Szekcio
      id="nav"
      felcim="„De hát megvan a NAV-ból"
      cim="Ami megvan, az megvan. Mi a többit hozzuk."
      alcim="A NAV Online Számla a belföldi számlák adatát adja. A SzámlaFolyó azt, amit onnan nem kapsz meg – és a belföldi számlát is kiolvassa, a bizonylattal együtt."
      halvany
    >
      <div className="mx-auto max-w-3xl overflow-x-auto rounded-2xl border border-zsalya/20 bg-white shadow-sm">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th">Mit kapsz meg?</th>
              <th className="th text-center">NAV Online Számla, vevőként</th>
              <th className="th text-center">SzámlaFolyó</th>
            </tr>
          </thead>
          <tbody>
            {sorok.map((s) => (
              <tr key={s.mi}>
                <td className="td">
                  {s.mi}
                  {s.mi2 !== undefined && <span className="block text-xs text-slate-500">{s.mi2}</span>}
                </td>
                <td className="td text-center">{s.nav ? <Van /> : <Nincs />}</td>
                <td className="td text-center">
                  <Van />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-slate-500">
        A két forrás nem egymás vetélytársa: a NAV-adat a könyvelőprogramodban marad, a
        SzámlaFolyó a hiányzó részt és a bizonylatot hozza mellé.
      </p>
    </Szekcio>
  );
}

function Van() {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
      <IkonPipa className="h-4 w-4" /> igen
    </span>
  );
}

function Nincs() {
  return <span className="font-semibold text-slate-400">nem</span>;
}

// ---------------------------------------------------------------------------
// A munkafolyamat egy irodában
// ---------------------------------------------------------------------------

function IrodaiFolyamat() {
  const lepesek = [
    {
      cim: 'Az ügyfél továbbítja',
      szoveg:
        'A cégnek bekapcsolható egy saját, titkos beküldő e-mail-címe. Ha a Beállításokban engeded, hogy bárki küldhessen rá, aki ismeri, az ügyfeleid közvetlenül oda továbbítják a számlát – vagy te töltöd fel, amit kaptál.',
      ikon: <IkonFeltoltes className="h-8 w-8" />,
    },
    {
      cim: 'A rendszer kiolvassa',
      szoveg:
        'PDF, kép, fotó vagy e-számla XML. Az XML-t gép olvassa, modell nélkül; a többit a kiolvasó modell. Az összefűzött köteget bizonylatonként szedi szét.',
      ikon: <IkonVillam className="h-8 w-8" />,
    },
    {
      cim: 'Te jóváhagyod',
      szoveg:
        'Alapértelmezés szerint minden bizonylat rád vár. Megjelöljük, ami gyanús: ha az adószám ellenőrző számjegye nem stimmel, vagy a nettó és az ÁFA nem adja ki a bruttót.',
      ikon: <IkonPajzs className="h-8 w-8" />,
    },
    {
      cim: 'Ügyfelenként exportálsz',
      szoveg:
        'Az exportot adószám szerint válogatod le: „12345678-2-41" és „HU12345678" ugyanaz az ügyfél. XLSX, CSV vagy JSON, vagy közvetlenül az RLB Kettős, a Novitax NTAX vagy a Kulcs-Könyvelés könyvelőprogramba – és ZIP-ben az eredeti bizonylatok.',
      ikon: <IkonLetoltes className="h-8 w-8" />,
    },
  ];

  return (
    <Szekcio
      id="folyamat"
      felcim="Így működik egy irodában"
      cim="A cipősdoboztól az exportig."
      alcim="Egy fiók, az összes ügyfél bizonylata, és a hónap végén ügyfelenként egy tiszta export."
    >
      <ol className="grid gap-8 md:grid-cols-4">
        {lepesek.map((lepes, i) => (
          <li key={lepes.cim} className="text-center">
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-50 text-blue-600 shadow-lg">
              {lepes.ikon}
            </span>
            <h3 className="mb-2 text-xl font-bold text-slate-800">
              {i + 1}. {lepes.cim}
            </h3>
            <p className="text-sm leading-relaxed text-slate-500">{lepes.szoveg}</p>
          </li>
        ))}
      </ol>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Kalkulátor
// ---------------------------------------------------------------------------

/** A beviteli mező határa: ennél nagyobb iroda már beszélgetés, nem kalkulátor. */
const MAX_UGYFEL = 1000;
const MAX_BIZONYLAT = 1000;

function szamBe(ertek: string, max: number): number {
  const n = Math.floor(Number(ertek));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

function Kalkulator() {
  const [ugyfelek, setUgyfelek] = useState(25);
  const [bizonylat, setBizonylat] = useState(30);

  const darab = ugyfelek * bizonylat;
  const koltsegek = csomagKoltsegek(darab);
  const legjobb = legolcsobbCsomag(darab);

  return (
    <Szekcio
      id="kalkulator"
      felcim="Mennyibe kerül egy irodának?"
      cim="Számold ki a saját számaiddal."
      alcim="Az árak a fizetendő végösszegek: a szolgáltató alanyi adómentes, áfa nem járul hozzájuk."
      halvany
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
              Bizonylat ügyfelenként, havonta
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
            <p className="text-xs font-medium text-slate-500">Havonta összesen</p>
            <p className="text-2xl font-extrabold text-slate-800">{formaz(darab)} bizonylat</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
          {koltsegek.map((k) => {
            const ez = k.kulcs === legjobb.kulcs;
            return (
              <div
                key={k.kulcs}
                // Keskeny kijelzőn a legolcsóbb kerül előre – különben egy nagy
                // irodának két drágább kártya alatt kellene megtalálnia.
                className={
                  ez
                    ? 'relative order-first rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-lg md:order-none'
                    : 'rounded-2xl border border-zsalya/20 bg-white p-6'
                }
              >
                {ez && (
                  <span className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-mustar px-3 py-1 text-xs font-extrabold tracking-widest text-tinta uppercase">
                    Nektek ez a legolcsóbb
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-800">{k.nev}</h3>
                <p className="mt-2 text-3xl font-extrabold text-slate-800">
                  {formaz(k.osszes, 'Ft')}
                  <span className="ml-1 text-base font-medium text-slate-500">/ hó</span>
                </p>
                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                  <li>
                    Havidíj: {formaz(k.havidij, 'Ft')}, benne {formaz(k.keret)} dokumentum
                  </li>
                  <li>
                    {k.tobbletDarab === 0
                      ? 'Kereten felül: nincs'
                      : `Kereten felül: ${formaz(k.tobbletDarab)} × ${formaz(szamlafolyo.csomagok[k.kulcs].extraFt, 'Ft')} = ${formaz(k.tobbletFt, 'Ft')}`}
                  </li>
                  <li>
                    Bizonylatonként: <strong>{k.darabar === null ? '–' : formaz(k.darabar, 'Ft')}</strong>
                  </li>
                  <li>Felhasználó: {k.felhasznalok === null ? 'korlátlan' : `${k.felhasznalok} fő`}</li>
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-slate-500">
          {legjobb.tobbletDarab > 0 && (
            <p className="alert alert-info">
              A kereten felüli darabokat csak akkor dolgozzuk fel, ha a Beállításokban{' '}
              <strong>bekapcsolod a túlhasználatot</strong> – alapból a feldolgozás a keretnél
              megáll, és a bizonylatok megvárják a következő hónapot. A túlhasználatnak forintos
              plafonja van, alapból {formaz(szamlafolyo.tulhasznalat.alapPlafonFt, 'Ft')}
              {legjobb.plafonFelett && (
                <>
                  {' '}
                  – <strong>nálatok ennél több kell</strong> ({formaz(legjobb.tobbletFt, 'Ft')}), tehát a
                  plafont emelnetek kell
                </>
              )}
              .
            </p>
          )}
          <p>
            Egy dokumentum a fair-use szabály szerint: <strong>{szabaly()}</strong> Egy szokásos
            számla vagy nyugta így egy dokumentum; a kalkulátor ezzel számol.
          </p>
          <p>
            A keret havi, és nem gördül át. Ha az ügyfeleket egymástól elzárva, külön
            hozzáféréssel akarod kezelni, arra külön cég – és külön előfizetés – kell; lásd
            lentebb.
          </p>
        </div>
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Adatvédelem
// ---------------------------------------------------------------------------

function Adatvedelem() {
  const pontok = [
    {
      cim: 'Te adatfeldolgozó vagy, mi al-adatfeldolgozó',
      szoveg: (
        <>
          Ha az ügyfeleid megbízásából dolgozol, az adatkezelő az ügyfeled. A SzámlaFolyó
          bevonásához az ügyfeledtől felhatalmazás kell – ezt az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztató 1. pontja
          </Link>{' '}
          és az{' '}
          <Link to="/aszf" className="underline">
            ÁSZF 11. pontja
          </Link>{' '}
          írja le.
        </>
      ),
    },
    {
      cim: 'Hol van az adat',
      szoveg: (
        <>
          Az adatok és a fájlok az Unión belül, frankfurti kiszolgálón tárolódnak. A
          kiolvasáskor a bizonylat a Google modelljéhez kerül. A kérés nulla adatmegőrzésű
          végpontot kér, és kizárja azokat, amelyek az adatot modelltanításra használhatnák –
          ez kódból rögzített, nem beállítás. A részletek és a
          továbbítás garanciái az{' '}
          <Link to="/adatkezeles" className="underline">
            Adatkezelési tájékoztatóban
          </Link>
          .
        </>
      ),
    },
    {
      cim: 'Ami nincs meg, azt nem lehet kiszivárogtatni',
      szoveg: (
        <>
          Az eredeti fájlok az export után legfeljebb {szamlafolyo.megorzes.maxNap} nappal törlődnek
          – a türelmi időt te állítod –, az elkészült exportfájl pedig{' '}
          {szamlafolyo.megorzes.exportNap} nap után. Az adat a rendszerben marad, az export
          bármikor újrakészíthető.
        </>
      ),
    },
  ];

  return (
    <Szekcio
      id="adatvedelem"
      felcim="Adatvédelem"
      cim="Idegen cégek számláiról van szó. Tudjuk."
      alcim="Egy könyvelőiroda nem a saját adatát bízza ránk, hanem az ügyfeleiét. Ezért itt röviden, a részletek pedig a jogi szövegekben."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {pontok.map((p) => (
          <div key={p.cim} className="rounded-2xl border border-zsalya/20 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-slate-800">{p.cim}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{p.szoveg}</p>
          </div>
        ))}
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Őszinte határok
// ---------------------------------------------------------------------------

/**
 * A határok **a lapon**, nem az apróbetűben. Egy könyvelő ezekbe az első héten
 * belefutna; ha előre tudja, dönteni tud, ha utólag, csalódik.
 */
function Hatarok() {
  const hatarok = [
    {
      cim: 'Egy fiók egy céget kezel',
      szoveg:
        'Cégváltó nincs. Az iroda egy helyen látja az összes ügyfél bizonylatát, és ügyfelenként exportál – ez a munkamódszer, nem hiányzó funkció.',
    },
    {
      cim: 'Az ügyfélszűrő nem jogosultság',
      szoveg:
        'Aki belép a cégbe, a cég összes bizonylatát látja. Ha az ügyfeledet is meghívod, a többi ügyfeled számláit is látni fogja. Az elzárt kezeléshez külön cég kell.',
    },
    {
      cim: 'Nem könyvelőprogram',
      szoveg:
        'A SzámlaFolyó a könyvelőprogramod adatforrása: kiolvas, ellenőriz, exportál. Főkönyvet, bevallást nem készít.',
    },
    {
      cim: 'A jelöletlen mező sem garancia',
      szoveg:
        'A megjelölés azt jelenti, hogy okunk van gyanakodni. A nevekre nincs számtani ellenőrzés – a jóváhagyás a te szakmai döntésed marad.',
    },
  ];

  return (
    <Szekcio
      id="hatarok"
      felcim="Mielőtt belevágsz"
      cim="Amit a SzámlaFolyó nem csinál."
      alcim="Jobb, ha most tudod meg, mint az első ügyfélmeghívásnál."
      halvany
    >
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
        {hatarok.map((h) => (
          <div key={h.cim} className="rounded-2xl border border-zsalya/20 bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-slate-800">{h.cim}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{h.szoveg}</p>
          </div>
        ))}
      </div>
    </Szekcio>
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
          Próbáld ki egy ügyfél egy hónapjával.
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-vaszon/70">
          {szamlafolyo.proba.napok} nap, {szamlafolyo.proba.dokumentumok} dokumentum, bankkártya
          nélkül.
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
          Kérdésed van? Írj:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="underline hover:text-vaszon">
            {kapcsolatEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
