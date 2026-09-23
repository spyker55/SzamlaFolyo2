import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { magyarAuthHiba } from '../../lib/authHiba.ts';
import { AuthElrendezes } from '../../komponensek/Elrendezes.tsx';

/**
 * Jelszó-emlékeztető kérése.
 *
 * A visszajelzés **mindig ugyanaz**, akár létezik a cím, akár nem: különben ez
 * az űrlap megmondaná, ki ügyfelünk és ki nem.
 */
export function ElfelejtettJelszo() {
  const [email, setEmail] = useState('');
  const [kesz, setKesz] = useState(false);
  const [kuld, setKuld] = useState(false);

  async function kuldes(e: FormEvent) {
    e.preventDefault();
    setKuld(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/jelszo-beallitas`,
    });

    setKuld(false);
    setKesz(true);
  }

  if (kesz) {
    return (
      <AuthElrendezes>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Elküldtük</h1>
        <p className="mb-5 text-sm text-slate-500">
          Ha tartozik fiók ehhez a címhez, percen belül megérkezik a jelszó-beállító link.
        </p>
        <Link to="/bejelentkezes" className="btn btn-secondary w-full">
          Vissza a bejelentkezéshez
        </Link>
      </AuthElrendezes>
    );
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Elfelejtett jelszó</h1>
      <p className="mb-5 text-sm text-slate-500">
        Add meg az e-mail címed, és küldünk egy linket új jelszó megadásához.
      </p>

      <form onSubmit={kuldes} className="space-y-4">
        <div>
          <label className="flabel" htmlFor="email">
            E-mail cím
          </label>
          <input
            id="email"
            type="email"
            className="control"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={kuld}>
          {kuld ? 'Egy pillanat…' : 'Link kérése'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        <Link to="/bejelentkezes" className="font-medium text-blue-700 hover:underline">
          Mégis tudom a jelszavam
        </Link>
      </p>
    </AuthElrendezes>
  );
}

/**
 * Új jelszó megadása.
 *
 * Ide a levélben küldött linkről érkezik a felhasználó; a Supabase a linkből
 * felveszi a munkamenetet (`detectSessionInUrl`), ezért itt már belépve van —
 * csak épp egy olyan munkamenettel, aminek az egyetlen dolga a jelszócsere.
 */
export function JelszoBeallitas() {
  const [jelszo, setJelszo] = useState('');
  const [hiba, setHiba] = useState<string | null>(null);
  const [kuld, setKuld] = useState(false);
  const navigate = useNavigate();

  async function beallit(e: FormEvent) {
    e.preventDefault();
    setHiba(null);

    if (jelszo.length < 8) {
      setHiba('A jelszó legyen legalább 8 karakter.');
      return;
    }

    setKuld(true);
    const { error } = await supabase.auth.updateUser({ password: jelszo });
    setKuld(false);

    if (error !== null) {
      // ⚠️ Ez a képernyő eddig **minden** hibát lejárt linknek mondott. A
      // szivárgásellenőrzés bekapcsolása után ez félrevezetővé vált: egy
      // elutasított gyenge jelszóra is azt kapta a felhasználó, hogy kérjen új
      // linket — és az új link sem segített volna rajta.
      const magyarul = magyarAuthHiba(error);

      if (magyarul === null) {
        console.error('Ismeretlen hiba a jelszó beállításakor:', error);
      }

      setHiba(
        magyarul ??
          'Nem sikerült beállítani a jelszót. Lehet, hogy a link lejárt – kérj újat a bejelentkezésnél.',
      );
      return;
    }

    navigate('/beerkezo', { replace: true });
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Új jelszó</h1>
      <p className="mb-5 text-sm text-slate-500">Add meg az új jelszavad, és beléptetünk.</p>

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      <form onSubmit={beallit} className="space-y-4">
        <div>
          <label className="flabel" htmlFor="jelszo">
            Új jelszó
          </label>
          <input
            id="jelszo"
            type="password"
            className="control"
            autoComplete="new-password"
            required
            autoFocus
            minLength={8}
            value={jelszo}
            onChange={(e) => setJelszo(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">Legalább 8 karakter.</p>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={kuld}>
          {kuld ? 'Egy pillanat…' : 'Jelszó beállítása'}
        </button>
      </form>
    </AuthElrendezes>
  );
}
