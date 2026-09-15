import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LogoSor } from '../komponensek/Logo.tsx';
import { FejlesztesAlattSav } from '../komponensek/FejlesztesAlatt.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';
import { tetejereUszik } from '../lib/gorgetes.ts';
import { allapotCimke, tipusCimke } from '@uzleti/enumok.ts';

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
 * # A hero szövege: vissza az eredetihez
 *
 * Egy korábbi körben a **gépi jóváhagyás** lett a lap fő ígérete („Csak azt
 * kapod kézhez, amivel tényleg dolgod van"). Az élesben végigvitt folyamat
 * után a döntés megfordult: **minden bizonylat emberi jóváhagyásra vár**, és
 * ez a helyes működés. A gépezet megmarad, de alapból kikapcsolva
 * (`20260915000100_auto_jovahagyas_alapbol_ki.sql`), és **egyetlen szöveg sem
 * ígéri** — ezért állt vissza ide a régi lap hero-szövege.
 *
 * ## Két szándékos eltérés a régi laptól
 *
 * 1. **„Küldd tovább a számlát" → „Töltsd fel…".** Az eredeti mondat az
 *    e-mailes beküldésre utalt, ami a régi termékben működött; ebben **még
 *    nincs meg** (webhookkal jön, később). A mondat többi része szó szerint
 *    marad.
 * 2. **A kiemelt szó színe.** A régi lapon a „könyvelésre kész adat" két színű
 *    volt, a második szó mustárral. A mustár ezen a háttéren **mérve
 *    olvashatatlan**: `#dfb671` a `#f6ede4` vásznon ~1,6:1, a WCAG nagy betűre
 *    is 3:1-et kér. Ezért a meglévő terrakotta színátmenet viszi mindkét szót
 *    — ránézésre ugyanaz a kétszínű hatás, csak olvasható. A mustár ott marad,
 *    ahol dísz: a háttérfoltokon és az „Ajánlott" jelvényen.
 *
 * Ami a lábléc „Az adatok magyar szervereken tárolódnak" mondatát illeti: az
 * **nem tér vissza**. Az adat 2026 szeptembere óta Frankfurtban van, és ez az
 * a fajta állítás, amit egy nyitólapon a legkönnyebb bennfelejteni, mert
 * érvnek hangzik.
 *
 * # Amit nem írunk újra
 *
 * A számok mind a `config/szamlafolyo.ts`-ből jönnek, a fair-use mondat a
 * `szabaly()`-ból, az állapotnevek az `enumok.ts`-ből, a forintformázás a
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
      <Fejlec />
      <main>
        <Hero />
        <FormatumSav />
        <Folyamat />
        <EgyFolyamatban />
        <Elonyok />
        <Arak />
      </main>
      <Lablec />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fejléc
// ---------------------------------------------------------------------------

function Fejlec() {
  return (
    <header className="sticky top-0 z-50 border-b border-zsalya/20 bg-vaszon/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-8">
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

        <nav className="hidden items-center gap-8 md:flex">
          {HORGONYOK.map((h) => (
            <a
              key={h.hova}
              href={h.hova}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
            >
              {h.cimke}
            </a>
          ))}
          <FejlecGombok />
        </nav>

        {/* Keskeny kijelzőn a horgonyok a második sorba kerülnek, ide csak a
            belépés fér el. */}
        <Link to="/bejelentkezes" className="btn btn-primary rounded-full px-5 shadow-lg shadow-blue-500/20 md:hidden">
          Bejelentkezés
        </Link>
      </div>

      {/*
        A horgonyok mobilon **saját sorban**, nem menü mögé rejtve. A terv itt
        hamburger gombot rajzolt, az viszont az eredetiben sem nyílt ki — és egy
        nyitólapon a menü mögé tett navigáció egy kattintással messzebb van,
        miközben pont az a három link, amiért a látogató a fejlécre néz.

        Az ár a fejléc magassága: mobilon 108 px ragad a képernyő tetején. Ezért
        lett az első sor ott alacsonyabb (`h-16`), és ezért kapnak a horgonyos
        szakaszok kétféle `scroll-margin`-t (`scroll-mt-27 md:scroll-mt-20`) —
        különben a szakasz teteje a fejléc mögé érkezne.
      */}
      <nav className="flex border-t border-zsalya/20 md:hidden">
        {HORGONYOK.map((h) => (
          <a
            key={h.hova}
            href={h.hova}
            className="flex-1 py-3 text-center text-xs font-medium text-slate-500 transition-colors hover:text-blue-600"
          >
            {h.cimke}
          </a>
        ))}
      </nav>
    </header>
  );
}

/**
 * A fejléc horgonyai — **egy forrásból** a széles és a keskeny elrendezésnek.
 *
 * A címkék a régi nyitólapról jönnek, a horgonyok is. Ha egyszer negyedik
 * szakasz kerül a lapra, egy helyen kell felvenni, és mindkét elrendezésben
 * megjelenik.
 */
const HORGONYOK = [
  { hova: '#folyamat', cimke: 'Hogyan működik?' },
  { hova: '#elonyok', cimke: 'Előnyök' },
  { hova: '#arak', cimke: 'Árak' },
] as const;

/**
 * ⚠️ Zárt regisztrációnál a fejléc nem kínál „Ingyenes próba" gombot — lásd a
 * `HeroGombok` indoklását. Ilyenkor a belépés maga a kiemelt gomb.
 */
function FejlecGombok() {
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
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
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

        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              A legtisztább számlafeldolgozó munkafolyamat
            </p>

            <h1 className="mb-6 text-4xl leading-tight font-extrabold text-slate-800 sm:text-5xl lg:text-6xl">
              Dokumentumból ellenőrzött,{' '}
              <span className="bg-linear-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                könyvelésre kész adat
              </span>{' '}
              percek alatt.
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-slate-500 sm:text-xl">
              <strong className="font-bold text-slate-800">
                Töltsd fel a számlát vagy a nyugtát. A SzámlaFolyó kiolvassa.
              </strong>{' '}
              Te csak azt ellenőrzöd, amiben nem biztos. Export, és kész. Nem funkciókat
              halmozunk, hanem a legkisebb, leggyorsabb munkafolyamatot adjuk.
            </p>

            <HeroGombok />
            <ProbaAdatok />
          </div>

          <EllenorzesMinta />
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
            Nézzük, hogyan működik
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
        Nézzük, hogyan működik
      </a>
    </div>
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
    { szam: `${szamlafolyo.proba.napok} nap`, mit: 'próbaidő, kötelezettség nélkül' },
    { szam: `${szamlafolyo.proba.dokumentumok} dokumentum`, mit: 'ingyen, teljes funkcionalitással' },
    { szam: 'Nincs bankkártya', mit: 'a próbához nem kérjük' },
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

/**
 * Az Ellenőrzés képernyő kicsiben.
 *
 * **Nem rajzolt képernyőkép.** A mezők ugyanazokat az osztályokat viselik, mint
 * az éles felületen (`mezo-biztos`, `mezo-gyanus`), a típus címkéje a
 * `tipusCimke()`-ből jön, és a hibaüzenet szó szerint az, amit a
 * `validatorok.ts` ad a nettó + ÁFA ≠ bruttó esetre. Egy nyitólapon a kitalált
 * képernyőkép a legolcsóbb hazugság; ez viszont pont annyit ígér, amennyit a
 * termék tud.
 *
 * ⚠️ Egy ponton **eltérünk a tervtől, szándékosan**: ott a bizonytalan mező
 * mustársárga. A termékben a bukott validátor **piros** — a sárga a gyenge
 * magabiztosságé. A mintakártya a termék színkódját követi, nem a tervlapét.
 */
function EllenorzesMinta() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-zsalya/20 bg-white shadow-2xl">
        {/* Ablakfejléc: a terv három pöttye, a három márkaszínnel. */}
        <div className="flex items-center justify-between border-b border-zsalya/20 bg-vaszon/50 p-4">
          <p className="text-sm font-bold text-slate-800">Dokumentum jóváhagyása</p>
          <div aria-hidden="true" className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="h-3 w-3 rounded-full bg-mustar" />
            <span className="h-3 w-3 rounded-full bg-zsalya" />
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">Típus</span>
            <span className="rounded-md bg-zsalya/20 px-2 py-1 text-xs font-bold text-slate-700">
              {tipusCimke('szamla')}
            </span>
          </div>

          <MintaMezo cimke="Szállító neve" ertek="Hegyvidék Nyomda Zrt." />
          <MintaMezo cimke="Szállító adószáma" ertek="12345676-2-42" />
          <MintaMezo cimke="Nettó" ertek={formaz(100000, 'Ft')} />
          <MintaMezo cimke="ÁFA" ertek={formaz(27000, 'Ft')} />
          <MintaMezo cimke="Végösszeg (bruttó)" ertek={formaz(130000, 'Ft')} gyanus />

          <p className="fhiba text-sm">A nettó és az ÁFA összege nem adja ki a bruttót.</p>

          <p className="rounded-lg bg-vaszon/60 px-3 py-2 text-xs text-slate-500">
            A többi mezőhöz nincs mit hozzátenned — ezt az egyet kérdezzük meg.
          </p>
        </div>
      </div>

      {/*
        A lebegő visszajelzés a tervből. `motion-safe`: akinek a rendszere
        csökkentett mozgást kér, annak áll.
      */}
      <div className="absolute -right-3 -bottom-6 flex items-center gap-3 rounded-xl border border-zsalya/20 bg-white p-4 shadow-xl motion-safe:animate-bounce sm:-right-6" style={{ animationDuration: '3s' }}>
        <span className="rounded-full bg-zsalya/20 p-2 text-zsalya">
          <IkonLetoltes className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-xs font-bold text-slate-800">Sikeres export</span>
          <span className="block text-[10px] text-slate-500">szamlak_2026_09.xlsx</span>
        </span>
      </div>
    </div>
  );
}

function MintaMezo({
  cimke,
  ertek,
  gyanus = false,
}: {
  cimke: string;
  ertek: string;
  gyanus?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center justify-between text-xs font-semibold text-slate-500">
        {cimke}
        {gyanus && <span className="badge badge-hiba">Ellenőrizendő</span>}
      </p>
      <div
        className={`relative rounded-md border bg-white py-2 pr-9 pl-3 text-sm font-semibold text-slate-800 ${
          gyanus ? 'mezo-gyanus' : 'mezo-biztos'
        }`}
      >
        {ertek}
        <span
          aria-hidden="true"
          className={`absolute top-1/2 right-3 -translate-y-1/2 ${gyanus ? 'text-red-600' : 'text-zsalya'}`}
        >
          {gyanus ? <IkonFigyelem className="h-4 w-4" /> : <IkonPipa className="h-4 w-4" />}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formátumsáv
// ---------------------------------------------------------------------------

/** A terv keskeny sávja a hero alatt. Mindhárom formátum valóban létezik. */
function FormatumSav() {
  return (
    <section className="border-y border-zsalya/20 bg-vaszon py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-sm font-bold tracking-widest text-slate-500 uppercase">
          Az adatot úgy kapod meg, ahogy a rendszered kéri
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-slate-700 opacity-70 md:gap-16">
          <span className="font-mono text-xl font-bold">.XLSX</span>
          <span className="font-mono text-xl font-bold">.CSV</span>
          <span className="font-mono text-xl font-bold">{'{ JSON }'}</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// A munkafolyamat
// ---------------------------------------------------------------------------

function Folyamat() {
  const lepesek = [
    {
      cim: 'Feltöltés',
      szoveg: 'Húzd be a fájlokat a Beérkezőbe — PDF, kép vagy e-számla XML, egyszerre több is.',
      ikon: <IkonFeltoltes className="h-8 w-8" />,
    },
    {
      cim: 'Kiolvasás',
      szoveg:
        'Az e-számla XML-jét gép olvassa, modell nélkül — ingyen és másodperc alatt. Papír vagy szkennelt PDF esetén jön az AI.',
      ikon: <IkonVillam className="h-8 w-8" />,
    },
    {
      cim: 'Ellenőrzés',
      szoveg:
        'Minden bizonylatot te hagysz jóvá — de csak azzal van dolgod, amit megjelöltünk: a bizonytalan és az ellentmondásos mezőkkel.',
      ikon: <IkonPajzs className="h-8 w-8" />,
    },
    {
      cim: 'Export',
      szoveg: 'Egy kattintás, és letöltöd XLSX, CSV vagy JSON formátumban a könyveléshez.',
      ikon: <IkonLetoltes className="h-8 w-8" />,
    },
  ];

  return (
    <Szekcio
      id="folyamat"
      felcim="A munkafolyamat"
      cim="Nem kell mindent túlbonyolítani."
      alcim="A SzámlaFolyó azért készült, hogy elvégezze helyetted az adatrögzítést. A kevesebb gomb néha több szabadidőt jelent."
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
// Minden bizonylat egy folyamatban
// ---------------------------------------------------------------------------

/**
 * A terv kétoszlopos szakasza: balra állítások, jobbra egy Beérkező-részlet.
 *
 * A sorok állapotnevei az `enumok.ts`-ből jönnek (`allapotCimke`), a jelvények
 * a felület saját `badge-*` osztályai. Így a minta nem tud elcsúszni attól,
 * amit a rendszer valóban kiír.
 */
function EgyFolyamatban() {
  const allitasok = [
    {
      cim: 'Vegyes bizonylatok',
      szoveg:
        'Belföldi számla, nyugta, külföldi bizonylat, fotózott blokk és e-számla XML — egy folyamatban, egy exportban.',
    },
    {
      cim: 'E-számla XML modellhívás nélkül',
      szoveg:
        'Az UBL és a CII (Factur-X, ZUGFeRD) bizonylatot gép olvassa ki: másodperc alatt, AI nélkül, a keretedből nulla forintért.',
    },
    {
      cim: 'Rendszerfüggetlenség',
      szoveg:
        'Nincs bezártság. Az adatot úgy kapod meg (XLSX, CSV, JSON), ahogy a saját rendszered kéri — és az eredetit ZIP-ben mellé.',
    },
  ];

  return (
    <section className="bg-vaszon py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-3xl font-extrabold text-slate-800">
              Minden bizonylat egy helyen, egy folyamatban.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-slate-500">
              A hangsúly nem csak a hazai számlákon van. Legyen éttermi blokk, külföldi bizonylat
              vagy vegyesen beszkennelt PDF — a SzámlaFolyó szétválogatja és értelmezi.
            </p>

            <ul className="space-y-5">
              {allitasok.map((a) => (
                <li key={a.cim} className="flex items-start">
                  <span className="mt-1 mr-3 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-zsalya/20 text-zsalya">
                    <IkonPipa className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-800">{a.cim}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-500">
                      {a.szoveg}
                    </span>
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
      mit: 'XML-ből kiolvasva • modellhívás nélkül',
      allapot: allapotCimke('jovahagyva'),
      jelveny: 'badge-kesz',
      ikon: <IkonFajl className="h-6 w-6" />,
      kiemelt: false,
    },
    {
      fajl: 'etterem_blokk.jpg',
      mit: 'Egy mező nem megy át az ellenőrzésen',
      allapot: allapotCimke('ellenorzesre_var'),
      jelveny: 'badge-varakozo',
      ikon: <IkonKep className="h-6 w-6" />,
      kiemelt: true,
    },
    {
      fajl: 'aws_invoice_08.pdf',
      mit: 'Külföldi, fordított adózás • minden mező átment az ellenőrzéseken',
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
// Nem hisszük el a gépnek, amit mond
// ---------------------------------------------------------------------------

function Elonyok() {
  const kartyak = [
    {
      ikon: <IkonRacs className="h-6 w-6" />,
      cim: 'Az adószám matematikája',
      szoveg:
        'A magyar adószám ellenőrző számjegye vagy stimmel, vagy nem. Ez nem vélemény kérdése, és nem a modell mondja meg.',
    },
    {
      ikon: <IkonSzamologep className="h-6 w-6" />,
      cim: 'Nettó + ÁFA = bruttó',
      szoveg:
        'Az ÁFA-bontás soronként is számol: ha a sorok nem adják ki a végösszeget, azt jelezzük — akkor is, ha a modell magabiztos volt.',
    },
    {
      ikon: <IkonToll className="h-6 w-6" />,
      cim: 'Kézírás külön elbírálás alá esik',
      szoveg:
        'A kézzel írt bizonylatnál a szállító nevét nem lehet ellenőrizni semmivel — a modell pedig ilyenkor talál ki neveket a legmagabiztosabban. Ezért a kézírást külön megjelöljük.',
    },
    {
      ikon: <IkonPajzs className="h-6 w-6" />,
      cim: 'Az utolsó szó a tiéd',
      szoveg:
        'Minden bizonylat jóváhagyásra vár: semmi nem kerül exportba úgy, hogy egy ember rá ne bólintott volna. A gép nem helyetted dönt — előkészíti a döntést.',
    },
  ];

  return (
    <Szekcio
      id="elonyok"
      felcim="Előnyök"
      cim="Nem hisszük el a gépnek, amit mond."
      alcim="Egy kiolvasó modell akkor is magabiztos, amikor téved. Ezért minden bizonylat átmegy olyan ellenőrzéseken is, amelyeknek semmi közük a modellhez."
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
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Árak
// ---------------------------------------------------------------------------

/**
 * A terv sötét árszakasza, kiemelt középső csomaggal.
 *
 * ⚠️ A terv havi/éves kapcsolója **nincs itt**, és ez nem kifelejtés: éves
 * fizetés nincs a termékben, az indokát a `config/szamlafolyo.ts` írja le. Egy
 * kapcsoló, ami mögött nincs termék, ugyanaz a hazugság, mint egy kitalált
 * képernyőkép.
 */
function Arak() {
  const jellemzok = [
    'Feltöltés a Beérkezőbe',
    'Számla, nyugta, külföldi bizonylat',
    'E-számla XML modellhívás nélkül',
    'Bizonytalan mezők megjelölése',
    'Export: XLSX / CSV / JSON',
  ];

  return (
    <section id="arak" className="scroll-mt-27 bg-tinta py-24 text-vaszon md:scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-mustar uppercase">Árazás</p>
          <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
            Fizess az értékért. Nincsenek rejtett költségek.
          </h2>
          <p className="text-lg leading-relaxed text-vaszon/70">
            A próba {szamlafolyo.proba.napok} napig tart, {szamlafolyo.proba.dokumentumok}{' '}
            dokumentumig, és nem kér bankkártyát.
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
                    Ajánlott
                  </span>
                )}

                <h3 className={`mb-2 font-extrabold ${ajanlott ? 'text-2xl text-white' : 'text-xl text-vaszon'}`}>
                  {cs.nev}
                </h3>

                {/*
                  A pénznem a `formaz()`-ból jön, nem külön elemből: a szomszédos
                  `<span>` margója vizuálisan elválasztotta ugyan, a **szöveg**
                  viszont „1 990Ft"-ként állt össze — így másolja a felhasználó és
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
                      {cs.dokumentumok} dokumentum
                    </strong>{' '}
                    / hó
                  </ArSor>
                  <ArSor ajanlott={ajanlott}>
                    <strong className={ajanlott ? 'text-white' : 'text-vaszon'}>
                      {cs.felhasznalok === null ? 'Korlátlan' : cs.felhasznalok} felhasználó
                    </strong>
                  </ArSor>
                  <ArSor ajanlott={ajanlott}>Extra dokumentum: {cs.extraFt} Ft</ArSor>
                  {jellemzok.map((j) => (
                    <ArSor key={j} ajanlott={ajanlott}>
                      {j}
                    </ArSor>
                  ))}
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
                    {ajanlott ? `Kipróbálom ${szamlafolyo.proba.napok} napig` : 'Kiválasztom'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-3 text-sm leading-relaxed text-vaszon/70">
          <p>
            Az árak a fizetendő végösszegek: a szolgáltató alanyi adómentes, áfa nem járul hozzájuk.
            A keret minden csomagnál havi, és a következő időszakra nem gördül át.
          </p>
          <p>
            Ha elfogy a havi keret, a feldolgozás <strong className="text-vaszon">alapból megáll</strong>{' '}
            — a beküldött iratok megvárják a következő időszakot. Darabonkénti továbbszámlázás csak
            akkor van, ha külön bekapcsolod, és akkor is{' '}
            <strong className="text-vaszon">az általad megadott forintos határig</strong>: váratlan
            számla nem érhet.
          </p>
          <p>
            Egy dokumentum a fair-use szabály szerint:{' '}
            <strong className="text-vaszon">{szabaly()}</strong> Egy számla vagy nyugta így egy
            dokumentum marad; egy vastag, összefűzött köteg többnek számít — de a köteg szétszedése
            nem kerül külön kreditbe.
          </p>
        </div>
      </div>
    </section>
  );
}

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

function Lablec() {
  return (
    <footer className="border-t border-zsalya/20 bg-slate-50 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <LogoSor jel="h-8 w-8" szoveg="text-xl" />
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Dokumentumból könyvelésre kész adat, percek alatt.
            </p>
            {/*
              ⚠️ A régi nyitólap itt azt írta: „Az adatok magyar szervereken
              tárolódnak." Ez 2026 szeptembere óta **nem igaz** — és pont ez az
              a mondat, amit egy nyitólapon a legkönnyebb bennfelejteni, mert
              érvnek hangzik. Az igaz alak sem gyengébb: a kiolvasás az, ami
              Unión kívülre megy, és arról az Adatkezelési tájékoztató szól.
            */}
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Az adatok és a feltöltött fájlok az Európai Unión belül, frankfurti kiszolgálón
              tárolódnak.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-slate-500">
            <Link to="/bejelentkezes" className="transition-colors hover:text-blue-600">
              Bejelentkezés
            </Link>
            {regisztracioNyitva && (
              <Link to="/regisztracio" className="transition-colors hover:text-blue-600">
                Regisztráció
              </Link>
            )}
            <a href={`mailto:${kapcsolatEmail}`} className="transition-colors hover:text-blue-600">
              Kapcsolat
            </a>
            <Link to="/aszf" className="transition-colors hover:text-blue-600">
              ÁSZF
            </Link>
            <Link to="/adatkezeles" className="transition-colors hover:text-blue-600">
              Adatkezelés
            </Link>
            <Link to="/impresszum" className="transition-colors hover:text-blue-600">
              Impresszum
            </Link>
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

function Szekcio({
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
  cim: string;
  alcim: string;
  /** A világosabb, törtfehér háttér — ettől kap ritmust a lap. */
  halvany?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-27 py-24 md:scroll-mt-20 ${halvany ? 'bg-slate-50' : 'bg-vaszon'}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold tracking-widest text-blue-600 uppercase">{felcim}</p>
          <h2 className="mb-4 text-3xl font-extrabold text-slate-800 md:text-4xl">{cim}</h2>
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

const IkonPipa = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Ikon className={className} d="M5 13l4 4L19 7" />
);

const IkonNyil = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Ikon className={className} d="M14 5l7 7m0 0l-7 7m7-7H3" />
);

const IkonFeltoltes = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
);

const IkonVillam = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M13 10V3L4 14h7v7l9-11h-7z" />
);

const IkonPajzs = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  />
);

const IkonLetoltes = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
);

const IkonFigyelem = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
  />
);

const IkonFajl = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon
    className={className}
    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  />
);

const IkonKep = ({ className = 'h-6 w-6' }: { className?: string }) => (
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

const IkonRacs = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Ikon className={className} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
);

const IkonSzamologep = ({ className = 'h-6 w-6' }: { className?: string }) => (
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
