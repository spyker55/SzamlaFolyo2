import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoSor } from '../komponensek/Logo.tsx';
import { FejlesztesAlattSav } from '../komponensek/FejlesztesAlatt.tsx';
import { FejlesztesAlattAblak } from '../komponensek/FejlesztesAlattAblak.tsx';
import { LablecLinkek } from '../komponensek/Lablec.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo, type CsomagKulcs } from '@config/szamlafolyo.ts';
import { hatar } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { tetejereUszik } from '../lib/gorgetes.ts';
import { allapotCimke } from '@uzleti/enumok.ts';
import { KIMERVE, PROGRAM_NEVEK, PROGRAMOK } from '@uzleti/export/konyvelo/beallitas.ts';
import { szolgaltato } from './jogi/adatok.ts';

/**
 * A nyitólap.
 *
 * # A dizájn forrása
 *
 * A lap formája a terrakotta nyitólap-tervből jön (a designcsomag HTML
 * változata): magas, elmosott hátterű hero, pirula alakú gombok, ablakszerű
 * mintakártya, ikoncsempés folyamatsáv, **sötét árszakasz** kiemelt középső
 * csomaggal, világos lábléc.
 *
 * A színeket nem kellett hozzá behozni: a terv nyolc hexája **pontosan** az,
 * ami az `app.css`-ben már áll (`#c66c47` → `blue-500`, `#8c9c86` → `zsalya`,
 * `#dfb671` → `mustar`, `#f6ede4` → `vaszon`, `#2a2a26` → `tinta`, `#42423d` →
 * `tinta-lagy`). A dizájnrendszer tehát nem tért el a tervtől — csak ez a lap
 * nem használta ki. Új CSS ezért most sem kell.
 *
 * ## Amit a tervből szándékosan **nem** vettünk át
 *
 * - **A havi/éves fizetés kapcsolója.** Éves fizetés nincs, és ez nem elmaradt
 *   fejlesztés: a `config/szamlafolyo.ts` ki is mondja, miért (a keret a Stripe
 *   számlázási ciklusára szól, éves ciklusnál az éves keret lenne, nem havi).
 *   Egy kapcsoló, ami mögött nincs termék, ugyanaz a hibaosztály, mint a
 *   „magyar szerverek" mondat volt.
 * - **A „Több mint 500+ KKV és könyvelő választott minket" sor a fotókkal.**
 *   Nincs 500 ügyfelünk, és a képek egy idegen szerverről (`pravatar.cc`)
 *   töltődtek volna — vagyis a látogató IP-címe elmenne oda. Pont az ellenkezője
 *   annak, amiért a betűk helyben vannak.
 * - **A Google Fonts CDN-ről betöltött DM Sans.** Ugyanaz a betű, de helyből
 *   (`app.css`).
 * - **A terv árai** (14 990 Ft, 1 000 dokumentum, „korlátlan számú cég"). A
 *   számok a configból jönnek, nem a tervlapról.
 * - **A villám alakú logójel.** Van valódi szóvédjegyünk és jelünk
 *   (`komponensek/Logo.tsx`), az marad.
 *
 * # A szövegek
 *
 * 2026-09-25 óta a lap szövege a tulajdonos átírt szövegfájljából jön
 * (szakaszról szakaszra, a DONTESTORTENET „📝 Nyitólap: új szövegek” pontja).
 * 2026-10-09-én három változás a tulajdonos kérésére:
 *
 * 1. **Kézzelfogható haszon:** „Excel-táblázat a könyvelődnek", „importfájl a
 *    könyvelőprogramba" – a programnevek a `KIMERVE`-ből.
 * 2. **Bizalmi elem:** a hero alján az EU-s tárolás és a név, lent a „Ki
 *    csinálja?" szakasz.
 * 3. **A fenntartások lejjebb:** a felső szakaszok a működést írják le, a
 *    határok a lap alján, a „Jó tudni" szakaszban állnak.
 *
 * Két szabály változatlanul él, és ezeket egy újraírás se vigye el:
 *
 * - **A jóváhagyás „alapbeállítás szerint” a tiéd**, soha nem feltétel
 *   nélkül: a gépi jóváhagyás létező, bekapcsolható funkció
 *   (`20260915000100_auto_jovahagyas_alapbol_ki.sql`). A pontos mondat a
 *   „Jó tudni" és az Előnyök negyedik kártyája. Feljebb a lap a munkamenetet
 *   írja le („te átnézed, jóváhagyod"), de **„minden bizonylatot te hagysz
 *   jóvá"** alakot nem használ. Őr: `jogiSzovegek.test.ts`, 9. pont.
 * - **A feltöltés áll elöl, az e-mailes beküldés másodikként**: a beküldés
 *   alapból kikapcsolva érkezik, a cégnek egyszer be kell kapcsolnia.
 *
 * A kiemelt szó (most: „Töltsd fel őket.”) a terrakotta színátmenetet kapja,
 * nem a mustárt: `#dfb671` a `#f6ede4` vásznon ~1,6:1, a WCAG nagy betűre is
 * 3:1-et kér. A mustár ott marad, ahol dísz.
 *
 * Ami a lábléc „Az adatok magyar szervereken tárolódnak" mondatát illeti: az
 * **nem tér vissza**. Az adat 2026 szeptembere óta Frankfurtban van, és ez az
 * a fajta állítás, amit egy nyitólapon a legkönnyebb bennfelejteni, mert
 * érvnek hangzik.
 *
 * # Amit nem írunk újra
 *
 * A számok mind a `config/szamlafolyo.ts`-ből jönnek (az oldalhatár is, a
 * `hatar()`-on át), az állapotnevek az `enumok.ts`-ből, a forintformázás a
 * `formaz()`-ból (**nem** `toLocaleString`-ből: az a fejléc nélküli
 * böngészőkben nem csoportosít).
 */
export function Nyitolap() {
  return (
    /*
      ⚠️ **Itt nincs `overflow-x-hidden`, és ez nem feledékenység.** Egy őselem
      `overflow` értéke — az `x` tengelyen is — görgetőkonténert csinál, és
      onnantól a `sticky` fejléc **ahhoz** tapad, nem az ablakhoz: vagyis
      együtt görög el a lappal. Mérve: ezzel az osztállyal a fejléc y=-4130-ra
      került a lap alján, nélküle y=0.

      A foltokat nem is a külső doboznak kell megfognia, hanem annak a
      szakasznak, amelyikben keletkeznek — ott áll az `overflow-hidden`, a
      heron és a Beérkező-mintán.
    */
    <div className="min-h-screen bg-vaszon text-slate-800 antialiased">
      {/*
        Az ablak a lap elején áll, de a helye a DOM-ban nem számít: `fixed`, és
        a fókuszt magától magához veszi. Azért itt, mert így a `Nyitolap`
        olvasásakor rögtön látszik, hogy a kilépett látogatót ez fogadja.
      */}
      <FejlesztesAlattAblak />
      <Fejlec />
      <TorlesVisszajelzes />
      <main>
        <Hero />
        <FormatumSav />
        <Folyamat />
        <EgyFolyamatban />
        <Elonyok />
        <KiCsinalja />
        <Arak />
        <JoTudni />
      </main>
      <Lablec />
    </div>
  );
}

// ---------------------------------------------------------------------------
// A lap közös adatai
// ---------------------------------------------------------------------------

/**
 * A kimért könyvelőprogramok, a felületen használt nevükkel. Ugyanaz a szabály,
 * mint a Könyvelőknek oldalon: csak az kerül ide, amit valódi példány már
 * beolvasott (`KIMERVE`).
 */
const KONYVELOPROGRAMOK: readonly string[] = PROGRAMOK.filter((p) => KIMERVE[p]).map((p) => PROGRAM_NEVEK[p]);

/**
 * A szolgáltató neve az Impresszumból, a jogi forma nélkül. Egy forrás: ha a
 * név egyszer változik, a „Ki csinálja?" sem mondhat mást, mint az Impresszum.
 */
const TULAJDONOS = szolgaltato.nev.replace(/ egyéni vállalkozó$/, '');

/** A tulajdonos saját közlése (2026-10-09). */
const TAPASZTALAT = '10 év rendszergazdai és IT-biztonsági tapasztalattal';

/** „A, B és C" – a magyar felsorolás, a kötőszó a hívóé (`és`, `vagy`). */
function felsorol(elemek: readonly string[], koto: 'és' | 'vagy'): string {
  return elemek.length < 2 ? (elemek[0] ?? '') : `${elemek.slice(0, -1).join(', ')} ${koto} ${elemek.at(-1)}`;
}

// ---------------------------------------------------------------------------
// Fejléc
// ---------------------------------------------------------------------------

/**
 * A törölt fiók visszajelzése.
 *
 * A törlés után a felhasználó kijelentkezve ide érkezik. Enélkül a nyitólap
 * fogadná, ugyanúgy, mint bárki mást — és nem tudná meg, sikerült-e az, amit
 * kért. Egy visszafordíthatatlan műveletnek **legyen vége**, ne csak
 * következménye.
 *
 * A paraméter itt sem állapot: a törlés a szerveren dőlt el. Ez egy mondat,
 * nem bizonyíték — ezért nem is állít többet annál, hogy megtörtént.
 */
function TorlesVisszajelzes() {
  const [keresok] = useSearchParams();

  if (keresok.get('torles') === null) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="alert alert-siker">
        <p>
          <strong>A fiókod törölve.</strong> Köszönjük, hogy kipróbáltad a SzámlaFolyót. Ha
          meggondolod magad, bármikor kezdhetsz újat.
        </p>
      </div>
    </div>
  );
}

function Fejlec() {
  return (
    <header className="sticky top-0 z-50 border-b border-zsalya/20 bg-vaszon/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:h-20 lg:px-8">
        {/*
          A logó **link marad**, nem gomb: így a középső gombbal új lapon
          nyitható, és a böngésző is helyesen mutatja, hova mutat. A kattintás
          viszont külön kezelést kér, mert már a nyitólapon állunk — a
          `<Link to="/">` ilyenkor nem vált útvonalat, tehát magától nem
          történne semmi, a látogató pedig a lap alján maradna.
        */}
        <Link
          to="/"
          className="logo-link"
          onClick={(e) => {
            // Ctrl/Cmd/Shift/Alt + kattintás az új lapé — azt nem nyeljük el.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
              return;
            }
            e.preventDefault();
            tetejereUszik();
          }}
        >
          <LogoSor jel="h-9 w-9 md:h-10 md:w-10" szoveg="text-xl md:text-2xl" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <SzelesLinkek linkek={FEJLEC_LINKEK} />
          <FejlecGombok />
        </nav>

        {/* Keskeny kijelzőn a linkek a második sorba kerülnek, ide csak a
            belépés fér el. */}
        <Link to="/bejelentkezes" className="btn btn-primary shrink-0 rounded-full px-4 shadow-lg shadow-blue-500/20 sm:px-5 lg:hidden">
          Bejelentkezés
        </Link>
      </div>

      <MobilLinkek linkek={FEJLEC_LINKEK} />
    </header>
  );
}

/**
 * Egy fejléclink: horgony a lapon belül (`hova`), vagy útvonal egy másik
 * lapra (`ut`).
 */
export type FejlecLinkAdat = { hova: `#${string}`; cimke: string } | { ut: string; cimke: string };

/**
 * A fejléc linkjei — **egy forrásból** a széles és a keskeny elrendezésnek.
 *
 * ⚠️ 2026-09-24-ig a Könyvelőknek link csak a széles menüben állt, kézzel
 * beírva, a mobil sor pedig a horgonylistából épült – mobilon így egyszerűen
 * nem volt Könyvelőknek link. Most mindkét elrendezés ebből a listából rajzol.
 */
const FEJLEC_LINKEK: readonly FejlecLinkAdat[] = [
  { hova: '#folyamat', cimke: 'Hogyan működik?' },
  { hova: '#elonyok', cimke: 'Előnyök' },
  { hova: '#arak', cimke: 'Árak' },
  { ut: '/konyveloknek', cimke: 'Könyvelőknek' },
];

function FejlecLink({ link, className }: { link: FejlecLinkAdat; className: string }) {
  return 'ut' in link ? (
    <Link to={link.ut} className={className}>
      {link.cimke}
    </Link>
  ) : (
    <a href={link.hova} className={className}>
      {link.cimke}
    </a>
  );
}

/** A széles fejléc linkjei – a `lg:flex` menübe, a gombok elé. */
export function SzelesLinkek({ linkek }: { linkek: readonly FejlecLinkAdat[] }) {
  return linkek.map((l) => (
    <FejlecLink
      key={l.cimke}
      link={l}
      className="text-sm font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-blue-600"
    />
  ));
}

/**
 * A fejléc linkjei mobilon: **saját sorban**, nem menü mögé rejtve. A terv itt
 * hamburger gombot rajzolt, az viszont az eredetiben sem nyílt ki — és egy
 * nyitólapon a menü mögé tett navigáció egy kattintással messzebb van,
 * miközben pont ezekért a linkekért néz a látogató a fejlécre.
 *
 * Az ár a fejléc magassága: mobilon 108 px ragad a képernyő tetején. Ezért
 * lett az első sor ott alacsonyabb (`h-16`), és ezért kapnak a horgonyos
 * szakaszok kétféle `scroll-margin`-t (`scroll-mt-27 lg:scroll-mt-20`) —
 * különben a szakasz teteje a fejléc mögé érkezne.
 *
 * `flex-auto`, nem `flex-1`: az egyforma szélesség 320 px-en a „Hogyan
 * működik?"-et két sorba törné, így a hely a szöveg hosszával arányos.
 *
 * ⚠️ A váltás `lg`-nél van, nem `md`-nél: 768 px-en a széles menü nem fér ki
 * (mérve, 2026-09-24: a nyitólapon az „Ingyenes próba" 50 px-t kilógott, és a
 * feliratok két sorba törtek). Tableten ezért a kétsoros fejléc marad – és a
 * `scroll-margin` is `lg`-nél vált, különben a szakasz a fejléc alá érkezne.
 */
export function MobilLinkek({ linkek }: { linkek: readonly FejlecLinkAdat[] }) {
  return (
    <nav className="flex border-t border-zsalya/20 lg:hidden">
      {linkek.map((l) => (
        <FejlecLink
          key={l.cimke}
          link={l}
          className="flex-auto px-1 py-3 text-center text-xs font-medium whitespace-nowrap text-slate-500 transition-colors hover:text-blue-600"
        />
      ))}
    </nav>
  );
}

/**
 * ⚠️ Zárt regisztrációnál a fejléc nem kínál „Ingyenes próba" gombot — lásd a
 * `HeroGombok` indoklását. Ilyenkor a belépés maga a kiemelt gomb.
 */
export function FejlecGombok() {
  if (!regisztracioNyitva) {
    return (
      <Link to="/bejelentkezes" className="btn btn-primary rounded-full px-5 shadow-lg shadow-blue-500/20">
        Bejelentkezés
      </Link>
    );
  }

  return (
    <>
      <Link to="/bejelentkezes" className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-600">
        Bejelentkezés
      </Link>
      <Link to="/regisztracio" className="btn btn-primary rounded-full px-5 shadow-lg shadow-blue-500/20">
        Ingyenes próba
      </Link>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28">
      {/*
        A két elmosott folt a terv háttere. Dísz, nem jelzés — ezért a két
        kísérőszínt kapja, és `aria-hidden` marad. `pointer-events-none`, hogy
        a fölötte lévő gombokat semmiképp ne fogja el.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-32 h-96 w-96 rounded-full bg-zsalya/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-24 -right-24 h-96 w-96 rounded-full bg-mustar/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FejlesztesAlattSav />

        <div className="grid items-center gap-12 xl:grid-cols-2 xl:gap-8">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <span className="tracking-wide uppercase">Vállalkozóknak és könyvelőknek</span>
            </p>

            <h1 className="mb-6 text-4xl leading-tight font-extrabold text-slate-800 sm:text-5xl lg:text-6xl">
              Ne gépeld be a számlákat.{' '}
              <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                Töltsd fel őket.
              </span>
            </h1>

            <p className="mb-5 text-lg leading-relaxed text-slate-500 sm:text-xl">
              <strong className="font-bold text-slate-800">
                Fotó, PDF vagy e-számla – feltöltve vagy e-mailben továbbítva.
              </strong>{' '}
              A SzámlaFolyó kiolvassa az adatokat, és megjelöli, amit érdemes megnézned. Te
              jóváhagyod, és viszed tovább:
            </p>

            {/*
              A haszon kézzelfogható alakban, a két közönségnek külön. Az
              „XLSX, CSV, JSON" egy vállalkozónak nem mond semmit; az, hogy
              Excel-táblázatot küld a könyvelőnek, igen. A programnevek a
              `KIMERVE`-ből jönnek, tehát kimérés nélküli program ide sem kerül.
            */}
            <ul className="mb-8 space-y-2 text-base leading-relaxed text-slate-600 sm:text-lg">
              <li className="flex items-start gap-3">
                <IkonPipa className="mt-1 h-5 w-5 flex-none text-blue-600 sm:mt-1.5" />
                <span>
                  <strong className="text-slate-800">Vállalkozóként:</strong> Excel-táblázat (XLSX) a
                  könyvelődnek.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <IkonPipa className="mt-1 h-5 w-5 flex-none text-blue-600 sm:mt-1.5" />
                <span>
                  <strong className="text-slate-800">Könyvelőként:</strong> ügyfelenkénti importfájl –{' '}
                  {felsorol(KONYVELOPROGRAMOK, 'vagy')}.
                </span>
              </li>
            </ul>

            <HeroGombok />
            <BizalmiSor />
          </div>

          {/*
            A próbaidő adatai a videó alatt, nem a szöveg alatt: így a két
            oszlop nagyjából egyforma magas (2026-09-24, a tulajdonos kérésére –
            a bal oldal addig jóval hosszabb volt a videónál). Két oszlop csak
            `xl`-től: 1024 px-en a keskeny oszlopban a cím annyi sorra tört,
            hogy a szöveg kétszer olyan magas lett, mint a videó (mérve).
          */}
          <div>
            <HeroVideo />
            <ProbaAdatok />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A hero gombjai.
 *
 * ⚠️ **Zárt regisztrációnál nincs „Kipróbálom" gomb.** Ugyanaz a szabály, ami a
 * `Bejelentkezes.tsx`-ben és a korábbi nyitólapon is állt: nem kínálunk fel egy
 * ajtót, ami mögött a „nem lehet fiókot nyitni" üzenet vár. Egy nyitólap három
 * csukott ajtóval rosszabb, mint egy nyitólap gomb nélkül.
 */
function HeroGombok() {
  if (!regisztracioNyitva) {
    return (
      <div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/bejelentkezes" className="btn btn-primary rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-blue-500/20">
            Bejelentkezés
            <IkonNyil className="h-5 w-5" />
          </Link>
          <a href="#folyamat" className="btn btn-secondary rounded-full border-zsalya/30 px-8 py-4 text-lg font-semibold">
            Megnézem, hogyan működik
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          A nyilvános regisztráció még nem nyitott. Ha érdekel, írj:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="font-medium text-blue-700 underline">
            {kapcsolatEmail}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Link to="/regisztracio" className="btn btn-primary rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-blue-500/20">
        Kipróbálom ingyen
        <IkonNyil className="h-5 w-5" />
      </Link>
      <a href="#folyamat" className="btn btn-secondary rounded-full border-zsalya/30 px-8 py-4 text-lg font-semibold">
        Megnézem, hogyan működik
      </a>
    </div>
  );
}

/**
 * A bizalmi sor a hero alján, az első képernyőn (2026-10-09, a tulajdonos
 * kérésére): egy ismeretlen márkának senki nem ad oda pénzügyi bizonylatot,
 * ha nem látja, hol lesz az adat, és ki áll mögötte.
 *
 * ⚠️ **„Adattárolás", nem „az adat az EU-ban marad".** A tárolás Frankfurtban
 * van, a kiolvasás viszont Unión kívüli feldolgozással jár – ezt a lap alján
 * a „Jó tudni" szakasz mondja ki. Az őr (`jogiSzovegek.test.ts`) mindkét felét
 * nézi.
 */
function BizalmiSor() {
  return (
    <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-8">
      <li className="flex items-center gap-2">
        <IkonLakat className="h-5 w-5 flex-none text-zsalya" />
        <span>
          <strong className="text-slate-800">Adattárolás az EU-ban</strong> (Frankfurt)
        </span>
      </li>
      <li className="flex items-center gap-2">
        <IkonEmber className="h-5 w-5 flex-none text-zsalya" />
        <a href="#ki-csinalja" className="underline-offset-2 transition-colors hover:text-blue-600 hover:underline">
          <strong className="text-slate-800">{TULAJDONOS}</strong> fejleszti – {TAPASZTALAT}
        </a>
      </li>
    </ul>
  );
}

/**
 * A terv itt „Több mint 500+ KKV választott minket" sort hozott három
 * arcképpel. Nincs 500 ügyfelünk, a képek pedig egy idegen szerverről jöttek
 * volna. A helyére az kerül, ami igaz és ugyanazt a munkát végzi: mit kapsz,
 * mennyiért, milyen feltétellel.
 */
function ProbaAdatok() {
  const adatok = [
    { szam: `${szamlafolyo.proba.napok} napos ingyenes próba`, mit: 'Kötelezettség nélkül.' },
    {
      szam: `${szamlafolyo.proba.dokumentumok} dokumentum feldolgozása`,
      mit: 'A próba alatt minden funkció elérhető.',
    },
    { szam: 'Bankkártya nélkül', mit: 'A kipróbáláshoz nem kérünk kártyaadatokat.' },
  ];

  return (
    <dl className="mt-10 grid gap-4 border-t border-zsalya/20 pt-6 sm:grid-cols-3">
      {adatok.map((a) => (
        <div key={a.szam}>
          <dt className="text-sm font-bold text-slate-800">{a.szam}</dt>
          <dd className="mt-0.5 text-sm text-slate-500">{a.mit}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A nyitólap bemutatóvideója (`scripts/bemutato-video/`, `nyitolap` változat). */
const HERO_VIDEO = {
  leiras: 'Egy számla útja a feltöltéstől az ellenőrzésen át az exportig.',
  mp4: '/bemutato/nyitolap.mp4',
  webm: '/bemutato/nyitolap.webm',
  poszter: '/bemutato/nyitolap-poszter.jpg',
} as const;

/**
 * A hero bemutatóvideója – a régi „Dokumentum jóváhagyása” mintakártya helyén.
 *
 * **Valódi felvétel, nem rajz:** a SzámlaFolyó felülete kitalált adatokkal,
 * ugyanaz a „nettó + ÁFA ≠ bruttó” jelzés, amit a mintakártya mutatott – csak
 * most a termék maga mutatja.
 *
 * - **Magától, némítva, ismétlődve fut**, mint egy élő képernyő. A némítás
 *   nem díszítés: a böngészők csak így engedik magától elindulni (hangja
 *   amúgy sincs).
 * - **Megállítható** (szünet gomb) – a magától mozgó tartalomnak ez jár
 *   (WCAG 2.2.2).
 * - **Csökkentett mozgás beállításnál nem indul el magától**; ott a poszter
 *   áll (az ellenőrző képernyő a piros bruttóval), és a gombbal indítható.
 * - **„Megnézem nagyban”**: kis méretben a felület betűi apróak, ezért egy
 *   natív `<dialog>` elejéről, vezérlőkkel, nagyban játssza le.
 *
 * Két forrás: az MP4 (H.264) szinte mindenhol megy, de a nyílt forrású
 * Chromium és a rendszerkodek nélküli Firefox nem játssza le – nekik a WebM.
 */
function HeroVideo() {
  const kicsiRef = useRef<HTMLVideoElement>(null);
  const nagyRef = useRef<HTMLVideoElement>(null);
  const ablakRef = useRef<HTMLDialogElement>(null);
  const [megy, setMegy] = useState(false);

  useEffect(() => {
    const v = kicsiRef.current;
    if (v === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // A React a `muted`-ot tulajdonságként állítja, nem attribútumként – az
    // automatikus indításhoz a lejátszás előtt biztosan némítva kell lennie.
    v.muted = true;
    v.play().then(
      () => setMegy(true),
      () => setMegy(false),
    );
  }, []);

  function valt() {
    const v = kicsiRef.current;
    if (v === null) return;

    if (v.paused) {
      v.muted = true;
      v.play().then(
        () => setMegy(true),
        () => setMegy(false),
      );
    } else {
      v.pause();
      setMegy(false);
    }
  }

  function nagyban() {
    kicsiRef.current?.pause();
    setMegy(false);
    ablakRef.current?.showModal();

    const n = nagyRef.current;
    if (n !== null) {
      n.currentTime = 0;
      void n.play().catch(() => undefined);
    }
  }

  function bezar() {
    ablakRef.current?.close();
  }

  return (
    <div className="relative w-full max-w-2xl xl:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-zsalya/20 bg-tinta shadow-2xl">
        <video
          ref={kicsiRef}
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_VIDEO.poszter}
          aria-label={`Bemutató: ${HERO_VIDEO.leiras}`}
          className="aspect-video w-full"
        >
          <source src={HERO_VIDEO.mp4} type="video/mp4" />
          <source src={HERO_VIDEO.webm} type="video/webm" />
        </video>
      </div>

      <p className="mt-3 text-sm text-slate-500">{HERO_VIDEO.leiras}</p>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button type="button" className="btn btn-ghost btn-sm" onClick={valt}>
          {megy ? (
            <>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                <rect x="3" y="2" width="3.5" height="12" rx="1" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
              </svg>
              Szünet
            </>
          ) : (
            <>
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5z" />
              </svg>
              Lejátszás
            </>
          )}
        </button>
        <button type="button" className="btn btn-secondary btn-sm rounded-full" onClick={nagyban}>
          Megnézem nagyban
        </button>
      </div>

      {/*
        Natív `<dialog>`: az Esc bezárja, a fókuszt a böngésző kezeli. A
        háttérre kattintás is bezárja (a kattintás célpontja ilyenkor maga a
        `<dialog>`, nem a tartalma). Bezáráskor a nagy videó megáll.
      */}
      <dialog
        ref={ablakRef}
        aria-label="Bemutatóvideó"
        className="m-auto w-[min(96vw,1200px)] max-w-none overflow-hidden rounded-2xl bg-tinta p-0 backdrop:bg-slate-900/80"
        onClose={() => nagyRef.current?.pause()}
        onClick={(e) => {
          if (e.target === ablakRef.current) bezar();
        }}
      >
        <div className="flex justify-end px-2 pt-2">
          <button
            type="button"
            className="rounded-full px-3 py-1 text-sm font-semibold text-vaszon transition-colors hover:bg-tinta-lagy"
            onClick={bezar}
          >
            Bezárás ✕
          </button>
        </div>
        <video
          ref={nagyRef}
          controls
          playsInline
          preload="none"
          poster={HERO_VIDEO.poszter}
          className="aspect-video w-full"
        >
          <source src={HERO_VIDEO.mp4} type="video/mp4" />
          <source src={HERO_VIDEO.webm} type="video/webm" />
          <a href={HERO_VIDEO.mp4}>A bemutatóvideó letöltése (MP4)</a>
        </video>
      </dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formátumsáv
// ---------------------------------------------------------------------------

/**
 * A terv keskeny sávja a hero alatt: **hova** viheted az adatot.
 *
 * 2026-10-09-ig itt csak „.XLSX .CSV { JSON }" állt. Igaz volt, de egy
 * vállalkozónak nem mondott semmit, a könyvelőprogramok pedig csak a
 * Könyvelőknek oldalon szerepeltek. Most elöl a programnevek (a `KIMERVE`
 * szerint), utánuk az általános formátumok, az Excel néven.
 */
function FormatumSav() {
  const celok = [
    ...KONYVELOPROGRAMOK.map((nev) => ({ nev, program: true })),
    { nev: 'Excel (XLSX)', program: false },
    { nev: 'CSV', program: false },
    { nev: 'JSON', program: false },
  ];

  return (
    <section className="border-y border-zsalya/20 bg-vaszon py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-sm font-bold tracking-widest text-slate-500 uppercase">
          Ide viheted tovább az adatokat
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-slate-700 md:gap-x-12">
          {celok.map((c) => (
            <li key={c.nev} className={c.program ? 'text-xl font-extrabold' : 'font-mono text-lg font-bold opacity-70'}>
              {c.nev}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hogyan működik?
// ---------------------------------------------------------------------------

function Folyamat() {
  const lepesek = [
    {
      cim: 'Töltsd fel vagy küldd tovább',
      szoveg:
        'Húzd a PDF-eket, képeket vagy e-számla XML-fájlokat a Beérkezőbe – akár egyszerre többet is. E-mailben kaptad a számlát? Továbbítsd a céged saját beküldési e-mail-címére.',
      ikon: <IkonFeltoltes className="h-8 w-8" />,
    },
    {
      cim: 'A SzámlaFolyó kiolvassa az adatokat',
      szoveg:
        'A fotózott és szkennelt bizonylatok adatait mesterséges intelligencia ismeri fel. A támogatott XML-formátumú e-számlákból a rendszer közvetlenül veszi át az adatokat.',
      ikon: <IkonVillam className="h-8 w-8" />,
    },
    {
      cim: 'Ellenőrizd és hagyd jóvá',
      szoveg:
        'A rendszer megjelöli a bizonytalan adatokat és az észlelt eltéréseket, így rögtön látod, mire érdemes figyelned. Ha kell, javítasz, aztán egy kattintással jóváhagyod.',
      ikon: <IkonPajzs className="h-8 w-8" />,
    },
    {
      cim: 'Vidd tovább',
      szoveg: `Excel-táblázat a könyvelődnek, importfájl a könyvelőprogramba (${KONYVELOPROGRAMOK.join(', ')}), vagy CSV és JSON a saját rendszeredhez.`,
      ikon: <IkonLetoltes className="h-8 w-8" />,
    },
  ];

  return (
    <Szekcio
      id="folyamat"
      felcim="Hogyan működik?"
      cim="Feltöltéstől az exportig, négy lépésben."
      alcim="Fotó, PDF vagy e-számla: a SzámlaFolyó kiolvassa, ellenőrzi és előkészíti. Neked csak át kell nézned."
      halvany
    >
      <ol className="relative grid gap-8 md:grid-cols-4">
        {/* A négy csempét összekötő vonal — csak szélesen, ahol egy sorban állnak. */}
        <div
          aria-hidden="true"
          className="absolute top-10 right-[12%] left-[12%] hidden h-0.5 bg-zsalya/20 md:block"
        />

        {lepesek.map((lepes, i) => (
          <li key={lepes.cim} className="relative text-center">
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-vaszon text-blue-600 shadow-lg">
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
// Milyen bizonylatokat kezel?
// ---------------------------------------------------------------------------

/**
 * A terv kétoszlopos szakasza: balra állítások, jobbra egy Beérkező-részlet.
 *
 * A sorok állapotnevei az `enumok.ts`-ből jönnek (`allapotCimke`), a jelvények
 * a felület saját `badge-*` osztályai. Így a minta nem tud elcsúszni attól,
 * amit a rendszer valóban kiír.
 */
function EgyFolyamatban() {
  const allitasok: { cim: string; bekezdesek: readonly string[] }[] = [
    {
      cim: 'Többféle bizonylat, közös kezelés',
      bekezdesek: [
        'Belföldi és külföldi számlák, nyugták, fotózott bizonylatok és e-számla XML-fájlok adatait is kezelheted, majd együtt exportálhatod.',
      ],
    },
    {
      cim: 'Közvetlen adatátvétel az e-számlákból',
      bekezdesek: [
        'A támogatott XML-formátumokból a SzámlaFolyó közvetlenül olvassa ki az adatokat, képfelismerés nélkül. Ide tartozik az UBL, a CII – köztük a Factur-X és a ZUGFeRD –, valamint a támogatott magyar XML-formátumok.',
        'Az XML-fájlok feldolgozása is beleszámít a dokumentumkeretbe.',
      ],
    },
    {
      cim: 'Letölthető adatok és eredeti bizonylatok',
      bekezdesek: [
        `Az adatokat Excel-táblázatként (XLSX), CSV vagy JSON formátumban, illetve importfájlként a könyvelőprogramba (${KONYVELOPROGRAMOK.join(', ')}) viheted tovább. Az eredeti bizonylatfájlokat ZIP-csomagban is letöltheted.`,
      ],
    },
  ];

  return (
    <section className="bg-vaszon py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold tracking-widest text-blue-600 uppercase">
              Milyen bizonylatokat kezel?
            </p>
            <h2 className="mb-6 text-3xl font-extrabold text-slate-800">
              Számlák, nyugták, külföldi bizonylatok – egy helyen.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-slate-500">
              Egy e-mailben érkezett számla, egy lefotózott éttermi nyugta vagy több bizonylatot
              tartalmazó PDF: a SzámlaFolyóban ugyanazon a folyamaton mennek végig. A közös fájlba
              szkennelt bizonylatokat a rendszer különválasztja és feldolgozza.
            </p>

            <ul className="space-y-5">
              {allitasok.map((a) => (
                <li key={a.cim} className="flex items-start">
                  <span className="mt-1 mr-3 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zsalya/20 text-zsalya">
                    <IkonPipa className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-800">{a.cim}</span>
                    {a.bekezdesek.map((b) => (
                      <span key={b} className="mt-1 block text-sm leading-relaxed text-slate-500">
                        {b}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <BeerkezoMinta />
        </div>
      </div>
    </section>
  );
}

function BeerkezoMinta() {
  const sorok = [
    {
      fajl: 'e-szamla.xml',
      mit: 'Az adatok közvetlenül az XML-fájlból származnak.',
      allapot: allapotCimke('jovahagyva'),
      jelveny: 'badge-kesz',
      ikon: <IkonFajl className="h-6 w-6" />,
      kiemelt: false,
    },
    {
      fajl: 'etterem_blokk.jpg',
      mit: 'Egy adat ellenőrzést igényel.',
      allapot: allapotCimke('ellenorzesre_var'),
      jelveny: 'badge-varakozo',
      ikon: <IkonKep className="h-6 w-6" />,
      kiemelt: true,
    },
    {
      fajl: 'aws_invoice_08.pdf',
      mit: 'Külföldi, fordított adózású számla. Az automatikus ellenőrzések nem jeleztek eltérést.',
      allapot: allapotCimke('jovahagyva'),
      jelveny: 'badge-kesz',
      ikon: <IkonKartya className="h-6 w-6" />,
      kiemelt: false,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zsalya/20 bg-slate-50 p-8 shadow-inner">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-mustar/30 blur-3xl"
      />

      <ul className="relative space-y-4">
        {sorok.map((sor) => (
          <li
            key={sor.fajl}
            className={`flex items-center justify-between gap-4 rounded-xl border border-zsalya/10 bg-white p-4 shadow-sm ${
              sor.kiemelt ? 'ring-2 ring-amber-300' : ''
            }`}
          >
            <span className="flex min-w-0 items-center gap-4">
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                  sor.kiemelt ? 'bg-amber-100 text-amber-800' : 'bg-zsalya/10 text-zsalya'
                }`}
              >
                {sor.ikon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-800">{sor.fajl}</span>
                <span className="block truncate text-xs text-slate-500">{sor.mit}</span>
              </span>
            </span>
            <span className={`badge ${sor.jelveny} flex-none`}>{sor.allapot}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Előnyök: az ellenőrzés
// ---------------------------------------------------------------------------

function Elonyok() {
  const kartyak = [
    {
      ikon: <IkonRacs className="h-6 w-6" />,
      cim: 'Ellenőrzi az adószám ellenőrző számjegyét',
      szoveg:
        'A magyar adószám ellenőrző számjegyét a rendszer számítással vizsgálja. Ha eltérést talál, jelzi, hogy érdemes összevetned az adatot a bizonylattal.',
    },
    {
      ikon: <IkonSzamologep className="h-6 w-6" />,
      cim: 'Összeveti a nettó, az áfa- és a bruttó összegeket',
      szoveg:
        'A rendszer ellenőrzi az összegek összefüggéseit és az áfabontás sorait. Ha az adatok nem adják ki a végösszeget, figyelmeztet az eltérésre.',
    },
    {
      ikon: <IkonToll className="h-6 w-6" />,
      cim: 'Külön jelzi a kézzel írt bizonylatokat',
      szoveg:
        'A kézírás nehezebben olvasható, ezért az ilyen bizonylatok külön jelölést kapnak. Így tudod, hol érdemes alaposabban átnézned a felismert adatokat.',
    },
    {
      ikon: <IkonPajzs className="h-6 w-6" />,
      cim: 'A jóváhagyás nálad marad',
      szoveg:
        'Alapbeállítás szerint csak az általad jóváhagyott bizonylatok kerülhetnek az exportba. Az automatikus jóváhagyás külön bekapcsolható.',
    },
  ];

  return (
    <Szekcio
      id="elonyok"
      felcim="Előnyök"
      cim="Az adatkiolvasás mellett az ellenőrzésben is segít."
      alcim="A kiolvasott adatokat a SzámlaFolyó külön szabályok alapján is ellenőrzi. Jelzi például az adószám ellenőrző számjegyének hibáját vagy az összegek közötti eltérést, hogy ezeket könnyebb legyen észrevenned."
      halvany
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {kartyak.map((k) => (
          <div
            key={k.cim}
            className="rounded-2xl border border-zsalya/20 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              {k.ikon}
            </span>
            <h3 className="mb-2 text-lg font-bold text-slate-800">{k.cim}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{k.szoveg}</p>
          </div>
        ))}
      </div>

      {/*
        A határ („nem szűr ki minden hibát") 2026-10-09 óta a lap alján, a
        „Jó tudni" szakaszban áll – ott is a lapon, nem elrejtve, csak nem a
        lelkesedés helyén.
      */}
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Ki csinálja?
// ---------------------------------------------------------------------------

/**
 * A bizalmi blokk (2026-10-09, a tulajdonos kérésére): ki áll a termék mögött,
 * és mit tesz az adatokért.
 *
 * Minden pont **a működésből** jön, nem ígéret:
 * - a tárolás helye: Frankfurt (lásd a lábléc megjegyzését);
 * - a cégek elkülönítése: sorszintű jogosultság az adatbázisban (RLS);
 * - a tanítás tilalma: az Adatkezelési tájékoztató 3. pontja szó szerint;
 * - a fájltörlés: `szamlafolyo.megorzes.maxNap`, ugyanaz, amit az Adatkezelés
 *   mond;
 * - a kártyaadat: a fizetést a Stripe oldala kezeli, mi nem látjuk.
 *
 * Fotó nincs, szándékosan: kitalált arcot nem teszünk ki, igazi képet pedig
 * csak a tulajdonos adhat.
 */
function KiCsinalja() {
  const pontok = [
    'Az adatbázist és a bizonylatfájlokat Frankfurtban, az Európai Unióban tároljuk.',
    'Minden cég adatai adatbázisszinten el vannak különítve: más cég felhasználója nem látja a tiédet.',
    'A feltöltött bizonylatokat mesterséges intelligencia tanítására sem sajátra, sem harmadik félére nem használjuk.',
    `Az eredeti fájlokat az export után alapból töröljük; ha szeretnéd, legfeljebb ${szamlafolyo.megorzes.maxNap} napig megtarthatod őket.`,
    'Bankkártyaadatot nem látunk: a fizetést a Stripe kezeli.',
  ];
  // A magyar monogram a kettős betűt egészben veszi („NyK", nem „NK").
  const monogram = TULAJDONOS.split(' ')
    .map((resz) => /^(Dzs|Cs|Dz|Gy|Ly|Ny|Sz|Ty|Zs|.)/u.exec(resz)?.[1] ?? '')
    .join('');

  return (
    <Szekcio
      id="ki-csinalja"
      felcim="Ki csinálja?"
      alcim="Pénzügyi bizonylatot csak olyan szolgáltatásra érdemes bízni, amelyről tudod, ki üzemelteti, és hogyan bánik az adatokkal."
    >
      <div className="mx-auto grid max-w-5xl gap-10 rounded-3xl border border-zsalya/20 bg-white p-8 shadow-sm md:grid-cols-[auto_1fr] md:p-10">
        <div className="flex flex-col items-start gap-4 md:w-56">
          <span
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl font-extrabold text-blue-700"
          >
            {monogram}
          </span>
          <div>
            <p className="text-lg font-extrabold text-slate-800">{TULAJDONOS}</p>
            <p className="text-sm text-slate-500">a SzámlaFolyó fejlesztője és üzemeltetője</p>
          </div>
        </div>

        <div>
          <p className="mb-6 text-lg leading-relaxed text-slate-600">
            A SzámlaFolyót {TAPASZTALAT} fejlesztem és üzemeltetem. Ezért nálam az első kérdés
            mindig az, hol van az adat, ki fér hozzá, és mi történik vele.
          </p>
          <ul className="mb-6 space-y-3">
            {pontok.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                <IkonPipa className="mt-0.5 h-5 w-5 flex-none text-zsalya" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-slate-500">
            Ha kérdésed van, írj nekem:{' '}
            <a href={`mailto:${kapcsolatEmail}`} className="font-medium text-blue-700 underline">
              {kapcsolatEmail}
            </a>
            . A szolgáltató adatai az{' '}
            <Link to="/impresszum" className="underline transition-colors hover:text-blue-600">
              Impresszumban
            </Link>{' '}
            állnak.
          </p>
        </div>
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Árak
// ---------------------------------------------------------------------------

/**
 * A terv sötét árszakasza, kiemelt középső csomaggal.
 *
 * # Mi áll a kártyán, és mi alatta
 *
 * A kártyán **csak az, ami alapján választani kell**: a havi dokumentumkeret,
 * a felhasználók száma és a kereten felüli díj. Ami mindhárom csomagban
 * ugyanaz, az egyszer áll, a kártyák alatt (2026-09-25, a tulajdonos kérésére).
 * Addig a hat közös sor mindhárom kártyán megismétlődött, és a három
 * különbség elveszett közöttük.
 *
 * ⚠️ A terv havi/éves kapcsolója **nincs itt**, és ez nem kifelejtés: éves
 * fizetés nincs a termékben, az indokát a `config/szamlafolyo.ts` írja le. Egy
 * kapcsoló, ami mögött nincs termék, ugyanaz a hazugság, mint egy kitalált
 * képernyőkép.
 *
 * A „Mi számít egy dokumentumnak?" szöveg nem a `szabaly()` mondatát
 * használja (az ÁSZF, az Útmutató és a Beállítások igen), hanem a saját,
 * példás megfogalmazását – a határ viszont itt is a `hatar()`-ból jön, így egy
 * configváltás után a példák sem mondhatnak régit.
 */
function Arak() {
  const kozos = [
    'Fájlfeltöltés és beküldés e-mailben',
    'Számlák, nyugták és külföldi bizonylatok feldolgozása',
    'Támogatott XML-formátumú e-számlák adatainak közvetlen kiolvasása',
    'Bizonytalan adatok és észlelt eltérések jelölése',
    'A bizonylatok ellenőrzése és jóváhagyása',
    'Adatexport Excel (XLSX), CSV és JSON formátumban',
    `Importfájl a könyvelőprogramba: ${felsorol(KONYVELOPROGRAMOK, 'és')}`,
  ];
  const h = hatar();

  return (
    <section id="arak" className="scroll-mt-27 bg-tinta py-24 text-vaszon lg:scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-mustar uppercase">Árak</p>
          <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
            Válassz csomagot a havi bizonylatmennyiséghez.
          </h2>
          <p className="text-lg leading-relaxed text-vaszon/70">
            Próbáld ki a SzámlaFolyót {szamlafolyo.proba.napok} napig, legfeljebb{' '}
            {szamlafolyo.proba.dokumentumok} dokumentummal. A próba alatt minden funkciót
            használhatsz, bankkártya megadása nélkül.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-3">
          {csomagSorrend.map((kulcs) => {
            const cs = szamlafolyo.csomagok[kulcs];
            const ajanlott = kulcs === 'kozepes';

            return (
              <div
                key={kulcs}
                className={
                  ajanlott
                    ? 'relative z-10 flex h-full flex-col rounded-3xl border-2 border-blue-600 bg-blue-500 p-8 shadow-2xl shadow-blue-500/30 md:-translate-y-4'
                    : 'flex h-full flex-col rounded-2xl border border-tinta-lagy bg-tinta-lagy p-8'
                }
              >
                {/*
                  Nem `badge-kesz`: az a felületen azt jelenti, hogy egy
                  bizonylat elkészült. Egy marketingcímke ne lopja el egy
                  állapotjelvény jelentését.
                */}
                {ajanlott && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-mustar px-4 py-1.5 text-xs font-extrabold tracking-widest text-tinta uppercase shadow-lg">
                    Ajánlott csomag
                  </span>
                )}

                <h3 className={`mb-2 font-extrabold ${ajanlott ? 'text-2xl text-white' : 'text-xl text-vaszon'}`}>
                  {cs.nev}
                </h3>
                {/* Két sornyi hely: a hosszabb jellemzés se tolja lejjebb az árat. */}
                <p className={`text-sm md:min-h-10 ${ajanlott ? 'text-white/85' : 'text-vaszon/70'}`}>
                  {CSOMAG_JELLEMZES[kulcs]}
                </p>

                {/*
                  A pénznem a `formaz()`-ból jön, nem külön elemből: a szomszédos
                  `<span>` margója vizuálisan elválasztotta ugyan, a **szöveg**
                  viszont „4 900Ft"-ként állt össze — így másolja a felhasználó és
                  így olvassa fel a képernyőolvasó is.
                */}
                <p className="mt-4 mb-6">
                  <span className={`font-extrabold ${ajanlott ? 'text-5xl text-white' : 'text-4xl text-vaszon'}`}>
                    {formaz(cs.arHavi, 'Ft')}
                  </span>
                  <span className={`ml-1 font-medium ${ajanlott ? 'text-white/80' : 'text-vaszon/70'}`}>
                    / hó
                  </span>
                </p>

                <ul className={`mb-8 flex-1 space-y-4 text-sm ${ajanlott ? 'text-white/90' : 'text-vaszon/90'}`}>
                  <ArSor ajanlott={ajanlott}>
                    <strong className={ajanlott ? 'text-lg text-white' : 'text-vaszon'}>
                      Havi {cs.dokumentumok} dokumentum
                    </strong>
                  </ArSor>
                  <ArSor ajanlott={ajanlott}>
                    <strong className={ajanlott ? 'text-white' : 'text-vaszon'}>
                      {cs.felhasznalok === null
                        ? 'Korlátlan számú felhasználó'
                        : `${cs.felhasznalok} felhasználó`}
                    </strong>
                  </ArSor>
                  <ArSor ajanlott={ajanlott}>
                    Kereten felüli feldolgozás:{' '}
                    <span className="whitespace-nowrap">{formaz(cs.extraFt, 'Ft')} / dokumentum</span>, ha
                    bekapcsolod
                  </ArSor>
                </ul>

                {/* Zárt regisztrációnál nincs gomb — lásd a `HeroGombok` indoklását. */}
                {regisztracioNyitva && (
                  <Link
                    to="/regisztracio"
                    className={
                      ajanlott
                        ? 'block w-full rounded-xl bg-vaszon px-4 py-4 text-center text-lg font-extrabold text-blue-600 shadow-lg transition-colors hover:bg-white'
                        : 'block w-full rounded-xl bg-tinta px-4 py-3 text-center font-bold text-vaszon transition-colors hover:bg-slate-900'
                    }
                  >
                    Kipróbálom ingyen
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-tinta-lagy p-8">
          <h3 className="mb-6 text-lg font-extrabold text-vaszon">Mindhárom csomag tartalmazza</h3>
          <ul className="grid gap-x-8 gap-y-4 text-sm text-vaszon/90 sm:grid-cols-2">
            {kozos.map((j) => (
              <ArSor key={j} ajanlott={false}>
                {j}
              </ArSor>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-10 text-sm leading-relaxed text-vaszon/70 md:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-vaszon">Pontosan mennyit fizetsz?</h3>
            <p>
              A feltüntetett árak a fizetendő végösszegek. A szolgáltató alanyi adómentes, ezért az
              árakra nem kerül további áfa.
            </p>
            <p>
              A dokumentumkeret minden csomagnál havonta újul meg. A fel nem használt mennyiség nem
              vihető át a következő időszakra.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-vaszon">Mi történik, ha elfogy a havi kereted?</h3>
            <p>
              Alapbeállítás szerint a feldolgozás megáll, a beküldött bizonylatok pedig megvárják a
              következő időszakot.
            </p>
            <p>
              Ha szeretnéd folytatni a feldolgozást, külön bekapcsolhatod a kereten felüli
              elszámolást. Ehhez forintban költési korlátot is megadsz, így te szabod meg, mennyit
              fordítasz a további dokumentumokra.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-vaszon">Mi számít egy dokumentumnak?</h3>
            <p>
              Bizonylatonként az első {h} oldal egy dokumentumnak számít. Minden további megkezdett{' '}
              {h} oldal újabb dokumentumot jelent a keretből.
            </p>
            <p>Például:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Egy 1–{h} oldalas számla: <strong className="text-vaszon">1 dokumentum</strong>
              </li>
              <li>
                Egy {h + 1}–{2 * h} oldalas számla:{' '}
                <strong className="text-vaszon">2 dokumentum</strong>
              </li>
              <li>
                Egy PDF-be összefűzött tíz egyoldalas számla:{' '}
                <strong className="text-vaszon">10 dokumentum</strong>
              </li>
            </ul>
            <p>
              Az összefűzött bizonylatok különválasztásáért nem számolunk fel további
              dokumentumegységet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Jó tudni
// ---------------------------------------------------------------------------

/**
 * A termék igaz határai, egy helyen, a lap alján (2026-10-09, a tulajdonos
 * kérésére). Addig a felső szakaszokban álltak („alapbeállítás szerint", „nem
 * szűr ki minden hibát"), és a lelkesedés helyét foglalták. A mondatok
 * **nem lettek puhábbak**, csak lejjebb kerültek – a lapról nem tűntek el, és
 * az őr (`jogiSzovegek.test.ts`) mindegyiket a lapon keresi.
 */
function JoTudni() {
  const kerdesek: { kerdes: string; valasz: ReactNode }[] = [
    {
      kerdes: 'Ki hagyja jóvá a bizonylatokat?',
      valasz:
        'Alapbeállítás szerint te: az exportba csak az általad jóváhagyott bizonylatok kerülnek. Az automatikus jóváhagyás külön bekapcsolható, és a rendszer jelzi az így jóváhagyott tételeket.',
    },
    {
      kerdes: 'Minden hibát kiszűr?',
      valasz:
        'Nem. Az automatikus ellenőrzések segítik az átnézést, de nem szűrnek ki minden hibát. A neveket és más szöveges adatokat akkor is érdemes összevetned az eredetivel, ha a rendszer nem jelzett problémát.',
    },
    {
      kerdes: 'Hol kezelik az adataimat?',
      valasz: (
        <>
          Az adatbázist és a bizonylatfájlokat frankfurti kiszolgálón tároljuk. A mesterséges
          intelligenciával végzett kiolvasásnál viszont a bizonylat tartalma az OpenRouter
          közvetítésével a Google szolgáltatásához kerül, ez Unión kívüli adatfeldolgozással jár; az
          e-mailes beküldéshez használt szolgáltatónál szintén történik Unión kívüli tárolás. A
          közreműködőket az{' '}
          <Link to="/adatkezeles" className="underline transition-colors hover:text-blue-600">
            adatkezelési tájékoztató
          </Link>{' '}
          sorolja fel.
        </>
      ),
    },
  ];

  return (
    <Szekcio
      id="jo-tudni"
      felcim="Jó tudni"
      cim="Mielőtt elkezded."
      alcim="Néhány dolog, amit érdemes tudnod a SzámlaFolyó működéséről."
      halvany
    >
      <dl className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        {kerdesek.map((k) => (
          <div key={k.kerdes}>
            <dt className="mb-2 text-base font-bold text-slate-800">{k.kerdes}</dt>
            <dd className="text-sm leading-relaxed text-slate-500">{k.valasz}</dd>
          </div>
        ))}
      </dl>
    </Szekcio>
  );
}

/** A csomagkártyák egysoros jellemzése – kulcs szerint, hogy új csomag ne maradhasson ki. */
const CSOMAG_JELLEMZES: Record<CsomagKulcs, string> = {
  kicsi: 'Kisebb havi bizonylatmennyiséghez.',
  kozepes: 'Rendszeres számlafeldolgozáshoz.',
  nagy: 'Nagyobb bizonylatmennyiséghez és több munkatárshoz.',
};

function ArSor({ ajanlott, children }: { ajanlott: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <IkonPipa className={`mt-0.5 h-5 w-5 flex-none ${ajanlott ? 'text-vaszon' : 'text-mustar'}`} />
      <span>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Lábléc
// ---------------------------------------------------------------------------

export function Lablec() {
  return (
    <footer className="border-t border-zsalya/20 bg-slate-50 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <LogoSor jel="h-8 w-8" szoveg="text-xl" />
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Számlák és nyugták feldolgozása, kevesebb kézi adatrögzítéssel. Vállalkozóknak és
              könyvelőknek.
            </p>
            {/*
              ⚠️ A régi nyitólap itt azt írta: „Az adatok magyar szervereken
              tárolódnak." Ez 2026 szeptembere óta **nem igaz** — és pont ez az
              a mondat, amit egy nyitólapon a legkönnyebb bennfelejteni, mert
              érvnek hangzik. Az igaz alak sem gyengébb: a kiolvasás az, ami
              Unión kívülre megy, és arról az Adatkezelési tájékoztató szól – ezért
              mutat rá a mondat második fele (2026-09-25).
            */}
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Az adatbázist és a bizonylatfájlokat frankfurti kiszolgálón tároljuk. A
              feldolgozásban részt vevő szolgáltatókról az{' '}
              <Link to="/adatkezeles" className="underline transition-colors hover:text-blue-600">
                adatkezelési tájékoztatóban
              </Link>{' '}
              olvashatsz.
            </p>
          </div>

          {/*
            A linkek listája a `komponensek/Lablec.tsx`-ből jön, mert ugyanez a
            lista áll a jogi oldalak lábában, a belépés előtti képernyőkön és a
            **belépett felületen** is. Négy kézzel írt felsorolásból négyféle
            igazság lett volna.

            Ami innen kikerült, és miért:

            - **Bejelentkezés** — a fejlécben és a heróban is ott a gomb; a
              láblécben harmadszor is kiírva nem kínál semmi újat.
            - **Kapcsolat** (`mailto:`) — a cím nem veszett el: ott áll az
              Impresszumban, a Használati útmutató végén, és a zárt regisztráció
              szövegében is (feljebb ezen a lapon).
          */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-slate-500">
            {regisztracioNyitva && (
              <Link to="/regisztracio" className="transition-colors hover:text-blue-600">
                Regisztráció
              </Link>
            )}
            <Link to="/konyveloknek" className="transition-colors hover:text-blue-600">
              Könyvelőknek
            </Link>
            <LablecLinkek osztaly="transition-colors hover:text-blue-600" />
          </nav>
        </div>

        <div className="border-t border-zsalya/20 pt-8">
          <p className="text-xs font-medium text-slate-400">
            © {new Date().getFullYear()} SzámlaFolyó. Minden jog fenntartva.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Közös szakaszkeret
// ---------------------------------------------------------------------------

export function Szekcio({
  id,
  felcim,
  cim,
  alcim,
  halvany = false,
  children,
}: {
  id: string;
  /** A terv apró, terrakotta nagybetűs felcíme a szakaszcím fölött. */
  felcim: string;
  /**
   * A nagy szakaszcím. Ha nincs (a „Ki csinálja?", a tulajdonos kérésére),
   * a felcím maga lesz a `h2` – ugyanazzal a kinézettel –, hogy a szakasznak
   * a képernyőolvasó számára is legyen címe.
   */
  cim?: string;
  alcim: string;
  /** A világosabb, törtfehér háttér — ettől kap ritmust a lap. */
  halvany?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-27 py-24 lg:scroll-mt-20 ${halvany ? 'bg-slate-50' : 'bg-vaszon'}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          {cim === undefined ? (
            <h2 className="mb-3 text-sm font-bold tracking-widest text-blue-600 uppercase">{felcim}</h2>
          ) : (
            <>
              <p className="mb-3 text-sm font-bold tracking-widest text-blue-600 uppercase">{felcim}</p>
              <h2 className="mb-4 text-3xl font-extrabold text-slate-800 md:text-4xl">{cim}</h2>
            </>
          )}
          <p className="text-lg leading-relaxed text-slate-500">{alcim}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Ikonok
//
// Helyi, `stroke`-alapú ikonok — nincs értelme egy ikoncsomagot behúzni nyolc
// path miatt. Mind `aria-hidden`: a jelentést a mellettük álló szöveg viszi.
// ---------------------------------------------------------------------------

function Ikon({ d, className }: { d: string; className: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export const IkonPipa = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Ikon className={className} d="M5 13l4 4L19 7" />
);

export const IkonNyil = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Ikon className={className} d="M14 5l7 7m0 0l-7 7m7-7H3" />
);

export const IkonFeltoltes = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
);

export const IkonVillam = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M13 10V3L4 14h7v7l9-11h-7z" />
);

export const IkonPajzs = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  />
);

export const IkonLetoltes = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
);

const IkonFajl = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  />
);

export const IkonKep = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
  />
);

const IkonKartya = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
  />
);

const IkonLakat = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
  />
);

const IkonEmber = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
);

export const IkonRacs = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
);

export const IkonSzamologep = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
  />
);

const IkonToll = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
  />
);
