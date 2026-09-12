import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogoSor } from './Logo.tsx';
import { useAuth } from '../lib/auth.tsx';

/**
 * A menüpontok. **Egyetlen alak van belőlük**: ugyanaz a lista ül a nagy
 * képernyő oldalsávjában és a mobil fiókban.
 */
const MENU = [
  { ut: '/beerkezo', cimke: 'Beérkező' },
  { ut: '/tetelek', cimke: 'Tételek' },
  { ut: '/export', cimke: 'Export' },
  { ut: '/archivum', cimke: 'Archívum' },
  { ut: '/beallitasok', cimke: 'Beállítások' },
] as const;

/** A belépett felület: oldalsáv nagy képernyőn, lenyíló fiók mobilon. */
export function AppElrendezes({
  children,
  varakozo = 0,
}: {
  children: ReactNode;
  varakozo?: number;
}) {
  const [nyitva, setNyitva] = useState(false);
  const { user, ceg, kijelentkezes } = useAuth();
  const navigate = useNavigate();

  async function kilep() {
    await kijelentkezes();
    navigate('/bejelentkezes', { replace: true });
  }

  return (
    <div className="min-h-screen">
      {/* Fejléc — mobilon ez hordozza a menüt is. */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/beerkezo" className="logo-link">
            <LogoSor jel="h-7 w-7" szoveg="text-lg" />
          </Link>

          <span className="ml-2 hidden truncate text-sm text-slate-500 sm:inline">{ceg?.name}</span>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 md:inline">{user?.email}</span>
            <button type="button" onClick={kilep} className="btn btn-ghost btn-sm">
              Kilépés
            </button>
            <button
              type="button"
              onClick={() => setNyitva((v) => !v)}
              className="btn btn-secondary btn-sm md:hidden"
              aria-expanded={nyitva}
              aria-label="Menü"
            >
              Menü
              {varakozo > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {varakozo}
                </span>
              )}
            </button>
          </div>
        </div>

        {nyitva && (
          <nav className="border-t border-slate-200 px-4 py-2 md:hidden">
            <Menupontok varakozo={varakozo} onValaszt={() => setNyitva(false)} />
          </nav>
        )}
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="space-y-1">
            <Menupontok varakozo={varakozo} />
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function Menupontok({ varakozo, onValaszt }: { varakozo: number; onValaszt?: () => void }) {
  return (
    <>
      {MENU.map((elem) => (
        <NavLink
          key={elem.ut}
          to={elem.ut}
          onClick={onValaszt}
          className={({ isActive }) => `nav-item ${isActive ? 'nav-item-aktiv' : ''}`}
        >
          <span>{elem.cimke}</span>
          {elem.ut === '/beerkezo' && varakozo > 0 && (
            <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {varakozo}
            </span>
          )}
        </NavLink>
      ))}
    </>
  );
}

/** A belépés előtti képernyők: egy kártya középen, a logóval. */
export function AuthElrendezes({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="logo-link mb-6">
        <LogoSor jel="h-9 w-9" szoveg="text-2xl" />
      </Link>

      <div className="card card-pad w-full max-w-sm">{children}</div>

      <p className="mt-6 text-xs text-slate-400">
        <Link to="/aszf" className="hover:underline">
          ÁSZF
        </Link>
        {' · '}
        <Link to="/adatkezeles" className="hover:underline">
          Adatkezelés
        </Link>
        {' · '}
        <Link to="/impresszum" className="hover:underline">
          Impresszum
        </Link>
      </p>
    </div>
  );
}
