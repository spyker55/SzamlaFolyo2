import { useCallback, useEffect, useRef, useState } from 'react';
import { LogoSor } from './Logo.tsx';
import { fejlesztesAlatt, kapcsolatEmail } from '../lib/kornyezet.ts';

/**
 * „Az oldal fejlesztés alatt áll" — felugró ablak a nyitólapon.
 *
 * # Miért nem elég a vékony sáv
 *
 * A `FejlesztesAlattSav` a hero **tetején** ül, és a szem átsiklik rajta. A
 * nyilvános cím alatt viszont egy kész szolgáltatás képe fogad: hero, árazás,
 * „Kipróbálom ingyen" — miközben a regisztráció szerveroldalon zárva van
 * (`disable_signup`). Az érkezőnek ezt **egyszer, egyértelműen** meg kell
 * mondani. A sáv utána is ott marad; a kettő nem verseng, hanem egymást fedi.
 *
 * # Ugyanarra a kapcsolóra van kötve, mint a sáv
 *
 * `fejlesztesAlatt` — vagyis induláskor a `VITE_FEJLESZTES_ALATT=false`
 * **egyetlen mozdulattal** leveszi, kódváltozás nélkül. Egy mindig látszó,
 * kézzel törlendő ablak pont az a hamis ígéret volna, amit ebben a projektben
 * végig irtunk: ami nem kapcsolható, azt előbb-utóbb elfelejtik kikapcsolni.
 *
 * # Böngészőmenetenként egyszer
 *
 * Aki az árazást, majd az ÁSZF-et nézi meg, ne kapja háromszor ugyanazt. A jel
 * a `sessionStorage`-ben él: a menet végén magától elmúlik, tehát egy holnapi
 * látogatót újra fogad. ⚠️ Minden olvasás és írás `try/catch`-ben — privát
 * ablakban és letiltott tárolásnál dob —, és **hiba esetén megjelenik**: inkább
 * mondjuk el kétszer, mint egyszer sem.
 *
 * # Elutasítható, és ez nem gyengeség
 *
 * Egy be nem zárható ablak elzárná az ÁSZF-et és az Adatkezelési tájékoztatót.
 * Egy nyilvános oldalon elérhetetlen jogi szöveg rosszabb, mint a hiányzó
 * figyelmeztetés. Zárás: gomb, `Esc`, háttérkattintás.
 */

const KULCS = 'szamlafolyo.fejlesztes-ablak';

function marLatta(): boolean {
  try {
    return window.sessionStorage.getItem(KULCS) === '1';
  } catch {
    return false;
  }
}

function megjegyez(): void {
  try {
    window.sessionStorage.setItem(KULCS, '1');
  } catch {
    // Nincs teendő: a jel hiánya csak annyit jelent, hogy legközelebb újra
    // felugrik. Ez a biztonságos irány.
  }
}

export function FejlesztesAlattAblak() {
  // A kapcsoló zárt állásában a tárolóhoz **hozzá sem nyúlunk**.
  const [nyitva, setNyitva] = useState(() => fejlesztesAlatt && !marLatta());
  const [latszik, setLatszik] = useState(false);

  const gomb = useRef<HTMLButtonElement>(null);
  const honnan = useRef<HTMLElement | null>(null);

  const bezar = useCallback(() => {
    megjegyez();
    setNyitva(false);
  }, []);

  useEffect(() => {
    if (!nyitva) {
      return;
    }

    honnan.current = document.activeElement as HTMLElement | null;

    // Görgetészár, **a görgetősáv szélességének kipótlásával**: enélkül a lap
    // megnyitáskor odébb ugrik annyival, amennyi a sáv volt.
    const test = document.body;
    const regiOverflow = test.style.overflow;
    const regiPadding = test.style.paddingRight;
    const sav = window.innerWidth - document.documentElement.clientWidth;

    test.style.overflow = 'hidden';

    if (sav > 0) {
      test.style.paddingRight = `${sav}px`;
    }

    function billentyu(esemeny: KeyboardEvent) {
      if (esemeny.key === 'Escape') {
        bezar();
      }
    }

    document.addEventListener('keydown', billentyu);
    gomb.current?.focus();

    // Egy képkockával később kapcsoljuk be az áttűnést, különben a böngésző a
    // kezdő és a vég-állapotot egyszerre látja, és nincs mit animálni.
    const kepkocka = window.requestAnimationFrame(() => setLatszik(true));

    return () => {
      document.removeEventListener('keydown', billentyu);
      window.cancelAnimationFrame(kepkocka);
      test.style.overflow = regiOverflow;
      test.style.paddingRight = regiPadding;

      // A fókusz oda megy vissza, ahonnan jött — enélkül a billentyűzetes
      // látogató a lap elejére esne.
      honnan.current?.focus?.();
    };
  }, [nyitva, bezar]);

  if (!nyitva) {
    return null;
  }

  return (
    /*
      `z-[60]`, mert a nyitólap fejléce `sticky z-50` — egy `z-50`-es ablak
      alácsúszna. A vászon maga viszi a sötétítést, nem egy külön elem: így a
      háttérre kattintás tényleg a vásznat találja el (`target === currentTarget`),
      nem egy fölé fektetett réteget.
    */
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-tinta/60 p-4 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:items-center ${
        latszik ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(esemeny) => {
        if (esemeny.target === esemeny.currentTarget) {
          bezar();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fejlesztes-cim"
        aria-describedby="fejlesztes-szoveg"
        className={`card relative w-full max-w-lg overflow-hidden shadow-2xl transition duration-200 motion-reduce:transition-none ${
          latszik ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.98]'
        }`}
      >
        {/* A három kísérőszín csíkja. Dísz, nem jelzés — ezért `aria-hidden`. */}
        <div
          aria-hidden="true"
          className="h-1.5 bg-gradient-to-r from-zsalya via-mustar to-blue-500"
        />

        <div className="p-6 sm:p-8">
          {/*
            A logó és a jelvény **szándékosan egy sorban**, `flex-wrap`-pel: a
            `LogoSor` egy `span`, a jelvény `inline-flex` — egymás mellé
            sodródnának maguktól is, de az véletlen volna. Így szűk kijelzőn
            szabályosan tördelődik, nem szorul össze.
          */}
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <LogoSor />
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-700">
              <span aria-hidden="true" className="inline-flex h-2 w-2 rounded-full bg-mustar" />
              Fejlesztés alatt
            </span>
          </div>

          <h2 id="fejlesztes-cim" className="mb-3 text-2xl font-extrabold text-slate-800">
            Az oldal fejlesztés alatt áll
          </h2>

          {/*
            Ugyanaz a három állítás, ami a vékony sávban és a zárt regisztrációs
            képernyőn is áll — nem írunk negyedik változatot ugyanarról.
          */}
          <p id="fejlesztes-szoveg" className="mb-6 text-sm leading-relaxed text-slate-600">
            A SzámlaFolyó még nem indult el, <strong className="font-semibold text-slate-700">
            regisztrálni egyelőre nem lehet</strong>. Amit itt látsz, még változik. Nézz vissza
            később – vagy írj, és szólunk, amint élesedik:{' '}
            <a
              href={`mailto:${kapcsolatEmail}`}
              className="font-medium text-blue-700 hover:underline"
            >
              {kapcsolatEmail}
            </a>
          </p>

          <button ref={gomb} type="button" className="btn btn-primary w-full" onClick={bezar}>
            Értem, körülnézek
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            Az oldal megtekinthető, csak fiókot nem lehet nyitni.
          </p>
        </div>
      </div>
    </div>
  );
}
