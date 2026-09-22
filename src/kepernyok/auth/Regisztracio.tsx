import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { AuthElrendezes } from '../../komponensek/Elrendezes.tsx';
import { FeltetelekPipa } from '../../komponensek/FeltetelekPipa.tsx';
import { kapcsolatEmail, regisztracioNyitva } from '../../lib/kornyezet.ts';
import { magyarAuthHiba } from '../../lib/authHiba.ts';

/**
 * Nyilvános regisztráció.
 *
 * # Két kapcsoló dönt egyetlen dologról, és külön is el tudnak romlani
 *
 * A `regisztracioNyitva` a **böngészőé** (`VITE_REGISZTRACIO_NYITVA`, a Vercel
 * környezeti változójából, fordításkor beleégetve), a másik a Supabase Auth
 * `disable_signup` kapcsolója. Az elsőt a felület olvassa, a másodikat a
 * `signUp()` végpont kényszeríti ki.
 *
 * ⚠️ A kettő **nem mozog együtt**, és élesben szét is csúszott: a szerveroldali
 * kapu bezárult, a kiadott csomag viszont még a nyitott ágat hordozta. A
 * látogató így eljutott az űrlapig, és a végén a Supabase angol mondatát kapta
 * („Signups not allowed for this instance") — egy magyar termék főoldalán.
 *
 * Ezért fut a `signup_disabled` hiba **ugyanabba a képernyőbe**, mint a
 * felületi kapcsoló zárt állása: akármelyik miatt zárt a kapu, a látogató
 * ugyanazt az egy igaz mondatot kapja. Ez nem a kapcsolót helyettesíti — a
 * helyes javítás továbbra is az, hogy a két kapcsoló egyezzen —, hanem azt éri
 * el, hogy a széttartás ne egy platformüzenet formájában érjen földet.
 */
export function Regisztracio() {
  const [email, setEmail] = useState('');
  const [jelszo, setJelszo] = useState('');
  const [feltetelek, setFeltetelek] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [kesz, setKesz] = useState(false);
  const [kuld, setKuld] = useState(false);
  const [zarva, setZarva] = useState(false);

  const navigate = useNavigate();

  if (!regisztracioNyitva || zarva) {
    return <Zarva />;
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
      if (regisztracioTiltott(error)) {
        setZarva(true);
        return;
      }

      // A nyers `error.message` angol platformszöveg. Egy magyar termék
      // nyilvános regisztrációján ez ugyanaz a hibaosztály, mint a fent
      // elfogott `signup_disabled` volt — csak halkabb.
      const magyarul = magyarAuthHiba(error);

      if (magyarul === null) {
        console.error('Ismeretlen regisztrációs hiba:', error);
      }

      setHiba(
        magyarul ??
          `Nem sikerült a regisztráció. Próbáld újra, és ha nem megy, írj: ${kapcsolatEmail}`,
      );
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
        <FeltetelekPipa elfogadva={feltetelek} valtozott={setFeltetelek} />

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

/**
 * A zárt kapu — **egy szöveg, egy helyen**.
 *
 * Két úton lehet ide jutni (a felületi kapcsoló és a Supabase `disable_signup`),
 * de a látogatónak ez a különbség semmit nem mond: neki egy mondat kell arról,
 * hogy most nem nyithat fiókot, és hogy hova írhat.
 */
function Zarva() {
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

/**
 * „A Supabase zárva tartja a regisztrációt" — három jelből, mert egyik sem
 * garantált önmagában.
 *
 * A `code` a supabase-js újabb verzióiban jön, a `status` a HTTP-válaszé, a
 * szöveg pedig a végső tartalék. Ha mindhárom elvétené, a nyers üzenet jelenik
 * meg, mint eddig — az kevesebbet mond, de nem mond rosszat.
 */
function regisztracioTiltott(hiba: {
  code?: string | undefined;
  status?: number | undefined;
  message: string;
}): boolean {
  if (hiba.code === 'signup_disabled') return true;
  if (hiba.status === 422 && /signup/i.test(hiba.message)) return true;

  return /signups? not allowed/i.test(hiba.message);
}
