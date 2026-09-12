import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { AuthElrendezes } from '../../komponensek/Elrendezes.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../../lib/kornyezet.ts';

export function Regisztracio() {
  const [email, setEmail] = useState('');
  const [jelszo, setJelszo] = useState('');
  const [feltetelek, setFeltetelek] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [kesz, setKesz] = useState(false);
  const [kuld, setKuld] = useState(false);

  const navigate = useNavigate();

  if (!regisztracioNyitva) {
    return (
      <AuthElrendezes>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Regisztráció</h1>
        <p className="mb-5 text-sm text-slate-500">
          Új fiókot jelenleg nem lehet nyitni. Ha érdekel a SzámlaFolyó, írj:{' '}
          <a href={`mailto:${kapcsolatEmail}`} className="font-medium text-blue-700 hover:underline">
            {kapcsolatEmail}
          </a>
        </p>
        <Link to="/bejelentkezes" className="btn btn-secondary w-full">
          Vissza a bejelentkezéshez
        </Link>
      </AuthElrendezes>
    );
  }

  async function regisztral(e: FormEvent) {
    e.preventDefault();
    setHiba(null);

    if (jelszo.length < 8) {
      setHiba('A jelszó legyen legalább 8 karakter.');
      return;
    }

    setKuld(true);
    const { data, error } = await supabase.auth.signUp({ email, password: jelszo });
    setKuld(false);

    if (error !== null) {
      setHiba(error.message);
      return;
    }

    // Ha a projekt e-mail-megerősítést kér, még nincs munkamenet: ilyenkor a
    // felhasználónak meg kell mondani, hogy a postafiókját nézze — enélkül azt
    // hinné, hogy nem történt semmi.
    if (data.session === null) {
      setKesz(true);
      return;
    }

    navigate('/ceg-letrehozas', { replace: true });
  }

  if (kesz) {
    return (
      <AuthElrendezes>
        <h1 className="mb-1 text-lg font-semibold text-slate-900">Nézd meg a postafiókod</h1>
        <p className="text-sm text-slate-500">
          Küldtünk egy megerősítő levelet a(z) <strong>{email}</strong> címre. A benne lévő linkre
          kattintva tudsz belépni.
        </p>
      </AuthElrendezes>
    );
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Regisztráció</h1>
      <p className="mb-5 text-sm text-slate-500">14 nap próba, bankkártya nélkül.</p>

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      <form onSubmit={regisztral} className="space-y-4">
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
            autoComplete="new-password"
            required
            minLength={8}
            value={jelszo}
            onChange={(e) => setJelszo(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">Legalább 8 karakter.</p>
        </div>

        {/*
          A feltételek elfogadása külön jelölés, nem a gomb megnyomásába
          beleértve: az ÁSZF a regisztráció ELŐTT olvasható, különben fiók
          kellene ahhoz, amihez a fiók feltétele kötődik.
        */}
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-slate-300"
            required
            checked={feltetelek}
            onChange={(e) => setFeltetelek(e.target.checked)}
          />
          <span>
            Elfogadom az{' '}
            <Link to="/aszf" className="text-blue-700 hover:underline">
              ÁSZF-et
            </Link>{' '}
            és az{' '}
            <Link to="/adatkezeles" className="text-blue-700 hover:underline">
              Adatkezelési tájékoztatót
            </Link>
            .
          </span>
        </label>

        <button type="submit" className="btn btn-primary w-full" disabled={kuld || !feltetelek}>
          {kuld ? 'Egy pillanat…' : 'Fiók létrehozása'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Van már fiókod?{' '}
        <Link to="/bejelentkezes" className="font-medium text-blue-700 hover:underline">
          Bejelentkezés
        </Link>
      </p>
    </AuthElrendezes>
  );
}
