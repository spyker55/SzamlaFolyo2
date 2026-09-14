import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LogoSor } from '../../komponensek/Logo.tsx';
import { hatalyos } from './adatok.ts';

/**
 * A három jogi oldal közös kerete.
 *
 * Egy keret, mert a három oldal **egymásra hivatkozik**: mindegyik alján ott a
 * másik kettő. Ha külön-külön épülnének, a lábléc előbb-utóbb széttartana, és
 * az a fajta hiba, ami csak akkor derül ki, amikor valaki tényleg keresi az
 * Adatkezelést.
 *
 * A logó **link a nyitólapra**. Egy jogi oldal gyakran az első, amit valaki
 * megnyit (az ÁSZF-re a regisztrációs űrlap mutat) — onnan legyen út vissza.
 *
 * A visszaút ezért **ragadós fejlécben** van, nem csak a lap tetején és a
 * láblécben: az Adatkezelési tájékoztató hosszú, és aki a közepén dönt úgy,
 * hogy eleget olvasott, ne görgessen vissza hatvan képernyőt egy linkért.
 *
 * ⚠️ Ehhez a keretnek **nem lehet `overflow`-ja** egyetlen őselemén sem: az
 * görgetőkonténert csinál, és a `sticky` onnantól ahhoz tapad, nem az
 * ablakhoz. (A táblázat saját `overflow-x-auto`-ja rendben van — az a fejléc
 * alatt ül, nem fölötte.)
 */
export function JogiOldal({
  cim,
  datummal = true,
  children,
}: {
  cim: string;
  /** Az Impresszumnak nincs hatálybalépése: az nem szerződés, hanem adatlap. */
  datummal?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-vaszon">
      <header className="sticky top-0 z-50 border-b border-zsalya/20 bg-vaszon/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-6">
          <Link to="/" className="logo-link">
            <LogoSor jel="h-8 w-8" szoveg="text-xl" />
          </Link>
          <Link to="/" className="btn btn-secondary btn-sm rounded-full border-zsalya/30">
            <IkonVissza />
            Vissza a főoldalra
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">{cim}</h1>
        {datummal && <p className="mt-1 text-sm text-slate-500">Hatályos: {hatalyos}</p>}

        {/*
          `prose` osztály nincs — a Tailwind typography bővítmény nincs a
          projektben, és három oldalért nem hozzuk be. A tipográfia így a
          szakaszok saját dolga, ami több gépelés, de nulla új függőség.
        */}
        <div className="mt-8 space-y-8">{children}</div>

        <JogiLablec />
      </div>
    </div>
  );
}

/** Balra mutató nyíl a visszaút gombjára. A jelentést a mellette álló szöveg viszi. */
function IkonVissza() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

/** Egy számozott szakasz. A cím és a törzs együtt jár. */
export function Szakasz({ cim, children }: { cim: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{cim}</h2>
      {children}
    </section>
  );
}

/** Bekezdés. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-slate-700">{children}</p>;
}

/** Felsorolás. */
export function Lista({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-slate-700">{children}</ul>
  );
}

/**
 * Táblázat.
 *
 * Vízszintesen görgethető kereten belül: a telefon szélessége nem ok arra, hogy
 * egy adatfeldolgozói táblázat olvashatatlanná törjön.
 */
export function Tablazat({ fejlec, children }: { fejlec: readonly string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            {fejlec.map((cella) => (
              <th key={cella} className="th">
                {cella}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Adatsor az Impresszumhoz: megnevezés és érték. */
export function Adatsor({ cimke, children }: { cimke: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{cimke}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function JogiLablec() {
  return (
    <footer className="mt-12 border-t border-slate-200 pt-6">
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link to="/" className="text-slate-600 underline hover:text-slate-900">
          Főoldal
        </Link>
        <Link to="/aszf" className="text-slate-600 underline hover:text-slate-900">
          ÁSZF
        </Link>
        <Link to="/adatkezeles" className="text-slate-600 underline hover:text-slate-900">
          Adatkezelés
        </Link>
        <Link to="/impresszum" className="text-slate-600 underline hover:text-slate-900">
          Impresszum
        </Link>
      </nav>
      <p className="mt-4 text-xs text-slate-400">
        © {new Date().getFullYear()} SzámlaFolyó
      </p>
    </footer>
  );
}
