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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/" className="logo-link inline-block">
        <LogoSor jel="h-9 w-9" szoveg="text-2xl" />
      </Link>

      <h1 className="mt-8 text-2xl font-semibold text-slate-900">{cim}</h1>
      {datummal && <p className="mt-1 text-sm text-slate-500">Hatályos: {hatalyos}</p>}

      {/*
        `prose` osztály nincs — a Tailwind typography bővítmény nincs a
        projektben, és három oldalért nem hozzuk be. A tipográfia így a
        szakaszok saját dolga, ami több gépelés, de nulla új függőség.
      */}
      <div className="mt-8 space-y-8">{children}</div>

      <JogiLablec />
    </div>
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
