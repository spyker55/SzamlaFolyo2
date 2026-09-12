import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { AuthElrendezes } from '../../komponensek/Elrendezes.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../../lib/kornyezet.ts';

export function Bejelentkezes() {
  const [email, setEmail] = useState('');
  const [jelszo, setJelszo] = useState('');
  const [hiba, setHiba] = useState<string | null>(null);
  const [kuld, setKuld] = useState(false);

  const navigate = useNavigate();
  const hely = useLocation();
  const honnan = (hely.state as { honnan?: string } | null)?.honnan ?? '/beerkezo';

  async function belep(e: FormEvent) {
    e.preventDefault();
    setHiba(null);
    setKuld(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: jelszo });

    setKuld(false);

    if (error !== null) {
      // Szándékosan nem mondjuk meg, melyik adat rossz: abból ki lehetne
      // deríteni, hogy egy e-mail cím regisztrálva van-e nálunk.
      setHiba('A megadott e-mail cím és jelszó nem stimmel.');
      return;
    }

    navigate(honnan, { replace: true });
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Bejelentkezés</h1>
      <p className="mb-5 text-sm text-slate-500">Folytasd ott, ahol abbahagytad.</p>

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      <form onSubmit={belep} className="space-y-4">
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

        <div>
          <label className="flabel" htmlFor="jelszo">
            Jelszó
          </label>
          <input
            id="jelszo"
            type="password"
            className="control"
            autoComplete="current-password"
            required
            value={jelszo}
            onChange={(e) => setJelszo(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end">
          <Link to="/elfelejtett-jelszo" className="text-sm text-blue-700 hover:underline">
            Elfelejtettem
          </Link>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={kuld}>
          {kuld ? 'Egy pillanat…' : 'Bejelentkezés'}
        </button>
      </form>

      {regisztracioNyitva ? (
        <p className="mt-5 text-center text-sm text-slate-500">
          Még nincs fiókod?{' '}
          <Link to="/regisztracio" className="font-medium text-blue-700 hover:underline">
            Regisztrálok
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-slate-500">
          Új fiókot jelenleg nem lehet nyitni. Kérdés esetén:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="font-medium text-blue-700 hover:underline">
            {kapcsolatEmail}
          </a>
        </p>
      )}
    </AuthElrendezes>
  );
}
