import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LogoSor } from '../komponensek/Logo.tsx';
import { FejlesztesAlattSav } from '../komponensek/FejlesztesAlatt.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../lib/kornyezet.ts';
import { csomagSorrend, szamlafolyo } from '@config/szamlafolyo.ts';
import { szabaly } from '@uzleti/kredit.ts';
import { formaz } from '@uzleti/osszeg.ts';

/**
 * A nyitólap.
 *
 * # Mi változott a régi nyitólaphoz képest, és miért
 *
 * A szöveg az átadócsomagból jön (`02-szovegek/nyitolap.md`), de az a lap egy
 * **másik terméket** hirdetett. Két állítása ma valótlan:
 *
 * 1. A lábléce azt írta: „Az adatok magyar szervereken tárolódnak." Az adat
 *    2026 szeptembere óta Frankfurtban van. Ugyanaz a hibaosztály, amit a jogi
 *    szövegekben is javítani kellett — és egy nyitólapon még kényelmesebb
 *    bennhagyni, mert ott érvnek hangzik.
 * 2. A régi termékben **minden** bizonylat emberhez került. Ma nem: ami minden
 *    gépi ellenőrzésen átmegy, ember nélkül is továbbmehet.
 *
 * A második nem lábjegyzet lett, hanem **a fő ígéret** — mert ez a termék
 * valódi különbsége, és mert az ÁSZF 3. pontja már kimondja. Ha a nyitólap
 * elhallgatná, a két szöveg széttartana; ha az ÁSZF hallgatná el, az rosszabb
 * lenne ennél.
 *
 * A fékek ezért **közvetlenül az ígéret mellett** állnak, nem egy külön
 * szakasz mélyén: aki ettől megijed, ugyanabban a mozdulatban lássa, mi tartja
 * vissza.
 *
 * # Amit nem írunk újra
 *
 * A számok mind a `config/szamlafolyo.ts`-ből jönnek, a fair-use mondat a
 * `szabaly()`-ból, a forintformázás a `formaz()`-ból (**nem**
 * `toLocaleString`-ből: az a fejléc nélküli böngészőkben nem csoportosít).
 * Új CSS sincs: a két kísérőszín (`zsalya`, `mustar`) eddig is ott állt az
 * `app.css`-ben, „a nyilvános oldal két kísérőszíne" kommenttel — csak eddig
 * semmi nem használta.
 */
export function Nyitolap() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Fejlec />
      <main>
        <Hero />
        <Folyamat />
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
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="logo-link">
          <LogoSor jel="h-8 w-8" szoveg="text-xl" />
        </Link>

        {/* A horgonyok a régi nyitólapról jönnek — a rájuk mutató linkek is. */}
        <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
          <a href="#folyamat" className="hover:text-slate-900">
            Hogyan működik?
          </a>
          <a href="#elonyok" className="hover:text-slate-900">
            Miért bízhatsz benne?
          </a>
          <a href="#arak" className="hover:text-slate-900">
            Árak
          </a>
        </nav>

        <Link to="/bejelentkezes" className="btn btn-secondary btn-sm">
          Bejelentkezés
        </Link>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-12 pb-16">
      <FejlesztesAlattSav />

      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium tracking-wide text-blue-700 uppercase">
            A legrövidebb út a bizonylattól a könyvelésig
          </p>

          <h1 className="mt-3 text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl">
            Csak azt kapod kézhez, amivel tényleg dolgod van.
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Töltsd fel a számlát vagy a nyugtát. A SzámlaFolyó kiolvassa, és{' '}
            <strong className="text-slate-800">végigfuttatja a saját ellenőrzésein</strong>. Ami
            átmegy mindegyiken, magától jóváhagyásra kerül; ami elhasal, azt megjelölve eléd
            tesszük. Export, és kész.
          </p>

          {/*
            A fékek **itt** állnak, nem lejjebb. Aki most olvassa először, hogy
            a gép jóváhagyhat helyette, annak ugyanabban a mozdulatban kell
            látnia, mi tartja vissza — különben a következő gondolata a
            „bezárom" lesz, és igaza is lenne.
          */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-800">És amíg ez zavar, ki is kapcsolod:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>
                • Cégenként kapcsolható. Kikapcsolva{' '}
                <strong className="text-slate-800">minden</strong> bizonylat hozzád kerül.
              </li>
              <li>
                • Az első{' '}
                <strong className="text-slate-800">
                  {szamlafolyo.automatikusJovahagyas.bemelegitesDarab}
                </strong>{' '}
                bizonylatot mindig ember nézi át, és utána is minden{' '}
                <strong className="text-slate-800">
                  {szamlafolyo.automatikusJovahagyas.mintavetelMinden}.
                </strong>{' '}
                — így marad mérhető, mennyit téved.
              </li>
              <li>
                • Ami magától ment át, az jelvényt kap és indokot.{' '}
                <strong className="text-slate-800">
                  Soha nem írjuk ki, hogy „ellenőrizve", ha senki nem nézte meg.
                </strong>
              </li>
            </ul>
          </div>

          <HeroGombok />
          <ProbaAdatok />
        </div>

        <EllenorzesMinta />
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
      <div className="mt-6">
        <div className="flex flex-wrap gap-3">
          <Link to="/bejelentkezes" className="btn btn-primary">
            Bejelentkezés
          </Link>
          <a href="#folyamat" className="btn btn-secondary">
            Nézzük, hogyan működik
          </a>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          A nyilvános regisztráció még nem nyitott. Ha érdekel, írj:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="font-medium underline">
            {kapcsolatEmail}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link to="/regisztracio" className="btn btn-primary">
        Kipróbálom ingyen
      </Link>
      <a href="#folyamat" className="btn btn-secondary">
        Nézzük, hogyan működik
      </a>
    </div>
  );
}

function ProbaAdatok() {
  const adatok = [
    { szam: `${szamlafolyo.proba.napok} nap`, mit: 'próbaidő, kötelezettség nélkül' },
    { szam: `${szamlafolyo.proba.dokumentumok} dokumentum`, mit: 'ingyen, teljes funkcionalitással' },
    { szam: 'Nincs bankkártya', mit: 'a próbához nem kérjük' },
  ];

  return (
    <dl className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
      {adatok.map((a) => (
        <div key={a.szam}>
          <dt className="text-sm font-semibold text-slate-900">{a.szam}</dt>
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
 * az éles felületen (`mezo-biztos`, `mezo-gyanus`), és a hibaüzenet szó szerint
 * az, amit a `validatorok.ts` ad a nettó + ÁFA ≠ bruttó esetre. Egy nyitólapon
 * a kitalált képernyőkép a legolcsóbb hazugság; ez viszont pont annyit ígér,
 * amennyit a termék tud.
 */
function EllenorzesMinta() {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Ellenőrzés</h2>
        <span className="badge badge-varakozo">Ellenőrzésre vár</span>
      </div>

      <div className="mt-4 space-y-3">
        <MintaMezo cimke="Típus" ertek="Belföldi számla" />
        <MintaMezo cimke="Szállító neve" ertek="Hegyvidék Nyomda Zrt." />
        <MintaMezo cimke="Szállító adószáma" ertek="12345676-2-42" />
        <MintaMezo cimke="Nettó" ertek="100 000 Ft" />
        <MintaMezo cimke="ÁFA" ertek="27 000 Ft" />
        <MintaMezo cimke="Végösszeg (bruttó)" ertek="130 000 Ft" gyanus />
      </div>

      <p className="mt-3 text-sm text-red-700">
        A nettó és az ÁFA összege nem adja ki a bruttót.
      </p>

      <p className="mt-4 text-xs text-slate-400">
        A többi mezőhöz nincs mit hozzátenned — ezt az egyet kérdezzük meg.
      </p>
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
    <div>
      <p className="text-xs font-medium text-slate-500">{cimke}</p>
      <div
        className={`mt-1 rounded-md border bg-white px-3 py-2 text-sm text-slate-800 ${
          gyanus ? 'mezo-gyanus' : 'mezo-biztos'
        }`}
      >
        {ertek}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A munkafolyamat
// ---------------------------------------------------------------------------

function Folyamat() {
  const lepesek = [
    {
      cim: 'Feltöltés',
      szoveg:
        'Húzd be a fájlokat a Beérkezőbe — PDF, kép vagy e-számla XML, egyszerre több is.',
    },
    {
      cim: 'Kiolvasás',
      szoveg:
        'Az e-számla XML-jét gép olvassa, modell nélkül — ingyen és másodperc alatt. Papír vagy szkennelt PDF esetén jön az AI.',
    },
    {
      cim: 'Ellenőrzés',
      szoveg:
        'Megjelöljük, ami bizonytalan vagy ellentmondásos. Amit nem jelöltünk meg, azzal nincs dolgod.',
    },
    {
      cim: 'Export',
      szoveg: 'Egy kattintás, és letöltöd XLSX, CSV vagy JSON formátumban a könyveléshez.',
    },
  ];

  return (
    <Szekcio
      id="folyamat"
      cim="A munkafolyamat"
      alcim="Nem kell mindent túlbonyolítani. A SzámlaFolyó azért készült, hogy elvégezze helyetted az adatrögzítést."
    >
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {lepesek.map((lepes, i) => (
          <li key={lepes.cim} className="card card-pad">
            {/*
              Zsálya, nem terrakotta: a sorszám **nem állapot**. A `blue-`
              skála a felületen a „kiemelt" jelentést viszi, és egy lépés
              sorszáma nem kiemelt — ezért kapja a nyilvános oldal
              kísérőszínét, ami szándékosan nem hordoz jelentést.
            */}
            <span className="bg-zsalya/25 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold text-slate-800">
              {i + 1}
            </span>
            <h3 className="mt-3 text-base font-semibold text-slate-900">{lepes.cim}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{lepes.szoveg}</p>
          </li>
        ))}
      </ol>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Miért bízhatsz benne
// ---------------------------------------------------------------------------

function Elonyok() {
  const kartyak = [
    {
      cim: 'Az adószám matematikája',
      szoveg:
        'A magyar adószám ellenőrző számjegye vagy stimmel, vagy nem. Ez nem vélemény kérdése, és nem a modell mondja meg.',
    },
    {
      cim: 'Nettó + ÁFA = bruttó',
      szoveg:
        'Az ÁFA-bontás soronként is számol: ha a sorok nem adják ki a végösszeget, azt jelezzük — akkor is, ha a modell magabiztos volt.',
    },
    {
      cim: 'Kézírás külön elbírálás alá esik',
      szoveg:
        'A kézzel írt bizonylatnál a nevet nem lehet ellenőrizni semmivel. Ezért azt mindig átnézésre jelöljük, és sosem megy át magától.',
    },
    {
      cim: 'A gépi jóváhagyásnak fékei vannak',
      szoveg:
        'Cégenként kikapcsolható, az első bizonylatokat mindig ember nézi át, és utána is jut minta emberhez — ettől marad mérhető, mennyit téved.',
    },
    {
      cim: 'Vegyes bizonylatok',
      szoveg:
        'Belföldi számla, nyugta, külföldi bizonylat, fotózott blokk és e-számla XML — egy folyamatban, egy exportban.',
    },
    {
      cim: 'Rendszerfüggetlenség',
      szoveg:
        'Nincs bezártság. Az adatot úgy kapod meg (XLSX, CSV, JSON), ahogy a saját rendszered kéri — és az eredetit ZIP-ben mellé.',
    },
  ];

  return (
    <Szekcio
      id="elonyok"
      cim="Nem hisszük el a gépnek, amit mond"
      alcim="Egy kiolvasó modell akkor is magabiztos, amikor téved. Ezért minden bizonylat átmegy olyan ellenőrzéseken is, amelyeknek semmi közük a modellhez."
      sotet
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kartyak.map((k) => (
          <div key={k.cim} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-base font-semibold text-white">{k.cim}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/70">{k.szoveg}</p>
          </div>
        ))}
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Árak
// ---------------------------------------------------------------------------

function Arak() {
  const jellemzok = [
    'Számla, nyugta, külföldi bizonylat',
    'E-számla XML modellhívás nélkül',
    'Bizonytalan mezők megjelölése',
    'Export: XLSX / CSV / JSON',
  ];

  return (
    <Szekcio
      id="arak"
      cim="Árazás"
      alcim={`Fizess az értékért. A próba ${szamlafolyo.proba.napok} napig tart, ${szamlafolyo.proba.dokumentumok} dokumentumig, és nem kér bankkártyát.`}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {csomagSorrend.map((kulcs) => {
          const cs = szamlafolyo.csomagok[kulcs];
          const ajanlott = kulcs === 'kozepes';

          return (
            <div
              key={kulcs}
              className={`card card-pad flex flex-col ${ajanlott ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{cs.nev}</h3>
                {/*
                  Nem `badge-kesz`: az a felületen azt jelenti, hogy egy
                  bizonylat elkészült. Egy marketingcímke ne lopja el egy
                  állapotjelvény jelentését.
                */}
                {ajanlott && (
                  <span className="rounded-full bg-blue-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Ajánlott
                  </span>
                )}
              </div>

              {/*
                A pénznem a `formaz()`-ból jön, nem külön elemből: a szomszédos
                `<span>` margója vizuálisan elválasztotta ugyan, a **szöveg**
                viszont „1 990Ft"-ként állt össze — így másolja a felhasználó és
                így olvassa fel a képernyőolvasó is.
              */}
              <p className="mt-3">
                <span className="text-3xl font-semibold text-slate-900">
                  {formaz(cs.arHavi, 'Ft')}
                </span>
                <span className="ml-1 text-sm text-slate-500">/ hó</span>
              </p>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                <li>
                  <strong className="text-slate-900">{cs.dokumentumok} dokumentum</strong> / hó
                </li>
                <li>
                  <strong className="text-slate-900">
                    {cs.felhasznalok === null ? 'Korlátlan' : cs.felhasznalok} felhasználó
                  </strong>
                </li>
                <li>Extra dokumentum: {cs.extraFt} Ft</li>
                {jellemzok.map((j) => (
                  <li key={j}>{j}</li>
                ))}
              </ul>

              {/* Zárt regisztrációnál nincs gomb — lásd a `HeroGombok` indoklását. */}
              {regisztracioNyitva && (
                <Link
                  to="/regisztracio"
                  className={`btn mt-6 ${ajanlott ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {ajanlott ? `Kipróbálom ${szamlafolyo.proba.napok} napig` : 'Kiválasztom'}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          Az árak a fizetendő végösszegek: a szolgáltató alanyi adómentes, áfa nem járul hozzájuk.
          A keret minden csomagnál havi, és a következő időszakra nem gördül át.
        </p>
        <p>
          Ha elfogy a havi keret, a feldolgozás{' '}
          <strong className="text-slate-900">alapból megáll</strong> — a beküldött iratok
          megvárják a következő időszakot. Darabonkénti továbbszámlázás csak akkor van, ha külön
          bekapcsolod, és akkor is{' '}
          <strong className="text-slate-900">az általad megadott forintos határig</strong>:
          váratlan számla nem érhet.
        </p>
        <p>
          Egy dokumentum a fair-use szabály szerint: <strong>{szabaly()}</strong> Egy számla vagy
          nyugta így egy dokumentum marad; egy vastag, összefűzött köteg többnek számít — de a
          köteg szétszedése nem kerül külön kreditbe.
        </p>
      </div>
    </Szekcio>
  );
}

// ---------------------------------------------------------------------------
// Lábléc
// ---------------------------------------------------------------------------

function Lablec() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <LogoSor jel="h-8 w-8" szoveg="text-xl" />
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Csak azt kapod kézhez, amivel tényleg dolgod van.
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

          <nav className="flex flex-col gap-2 text-sm">
            <Link to="/bejelentkezes" className="text-slate-600 hover:text-slate-900">
              Bejelentkezés
            </Link>
            {regisztracioNyitva && (
              <Link to="/regisztracio" className="text-slate-600 hover:text-slate-900">
                Regisztráció
              </Link>
            )}
            <a href={`mailto:${kapcsolatEmail}`} className="text-slate-600 hover:text-slate-900">
              Kapcsolat
            </a>
            <Link to="/aszf" className="text-slate-600 hover:text-slate-900">
              ÁSZF
            </Link>
            <Link to="/adatkezeles" className="text-slate-600 hover:text-slate-900">
              Adatkezelés
            </Link>
            <Link to="/impresszum" className="text-slate-600 hover:text-slate-900">
              Impresszum
            </Link>
          </nav>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          © {new Date().getFullYear()} SzámlaFolyó. Minden jog fenntartva.
        </p>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Közös szakaszkeret
// ---------------------------------------------------------------------------

function Szekcio({
  id,
  cim,
  alcim,
  sotet = false,
  children,
}: {
  id: string;
  cim: string;
  alcim: string;
  /** A sötét sáv a lap ritmusát adja — egy szakasz, ami kiemelkedik. */
  sotet?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={sotet ? 'bg-slate-900' : ''}>
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* A mustár csík csak a sötét sávon: ott van mihez kontrasztot adnia. */}
        {sotet && <div className="bg-mustar mb-5 h-1 w-12 rounded-full" />}
        <h2 className={`text-2xl font-semibold ${sotet ? 'text-white' : 'text-slate-900'}`}>
          {cim}
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${sotet ? 'text-white/70' : 'text-slate-600'}`}>
          {alcim}
        </p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
