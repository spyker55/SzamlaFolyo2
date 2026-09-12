import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.tsx';

/**
 * Útvonalvédelem.
 *
 * Két örökölt döntés, és mindkettő indokolt:
 *
 * 1. **A cégfal és a belépésfal külön van.** Aki regisztrált, de céget sosem
 *    hozott létre, azt a cégfal örökre a cégalapításra irányítaná — vagyis pont
 *    az nem tudna megszabadulni a fiókjától, akinek a legkevesebb köze van a
 *    rendszerhez. A `/fiok-torles` ezért csak a belépésfal mögött ül.
 *
 * 2. **Amíg tölt, nem irányítunk sehova.** Egy villanásnyi „nincs belépve"
 *    átdobná a felhasználót a bejelentkezésre, mielőtt a munkamenet
 *    visszaállna — és utána a visszairányítás is elveszne.
 */

function Toltes() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-400">Egy pillanat…</p>
    </div>
  );
}

/** Belépés kell hozzá. */
export function Belepve({ children }: { children: ReactNode }) {
  const { session, betolt } = useAuth();
  const hely = useLocation();

  if (betolt) return <Toltes />;

  if (session === null) {
    // Megjegyezzük, hova indult, hogy belépés után oda vihessük vissza.
    return <Navigate to="/bejelentkezes" replace state={{ honnan: hely.pathname }} />;
  }

  return <>{children}</>;
}

/** Belépés **és** cég kell hozzá. Cég nélkül a cégalapítás az egyetlen út. */
export function Ceggel({ children }: { children: ReactNode }) {
  const { session, ceg, betolt } = useAuth();
  const hely = useLocation();

  if (betolt) return <Toltes />;

  if (session === null) {
    return <Navigate to="/bejelentkezes" replace state={{ honnan: hely.pathname }} />;
  }

  if (ceg === null) {
    return <Navigate to="/ceg-letrehozas" replace />;
  }

  return <>{children}</>;
}

/** Csak kilépve érhető el: a belépett felhasználót a Beérkezőre küldjük. */
export function Vendeg({ children }: { children: ReactNode }) {
  const { session, betolt } = useAuth();

  if (betolt) return <Toltes />;

  if (session !== null) {
    return <Navigate to="/beerkezo" replace />;
  }

  return <>{children}</>;
}
