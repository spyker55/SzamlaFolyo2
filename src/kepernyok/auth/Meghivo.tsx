import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase.ts';
import { AuthElrendezes } from '../../komponensek/Elrendezes.tsx';
import { useAuth } from '../../lib/auth.tsx';
import { kapcsolatEmail } from '../../lib/kornyezet.ts';
import { meghivoAdatok, meghivotElfogad, type MeghivoAdatok } from '../../lib/meghivo.ts';
import { hatralevoNap } from '@uzleti/meghivo.ts';
import { szerepCimke } from '@uzleti/enumok.ts';

/**
 * A meghívó elfogadása.
 *
 * # Miért nem a `Vendeg` burkoló alatt fut
 *
 * Mert **mindkét állapotban kell működnie**. A meghívott lehet olyan, akinek
 * még nincs fiókja, és lehet olyan, aki már be van lépve — egy „csak kilépve"
 * kapu az utóbbit kidobná a saját meghívójáról.
 *
 * # És miért lehet itt fiókot nyitni, amikor a regisztráció zárva van
 *
 * Mert a kettő nem ugyanaz, és ezt a `kornyezet.ts` ki is mondja: a
 * `regisztracioNyitva` a **nyilvános** regisztrációt szabályozza. Egy meghívó
 * nem nyilvános: egy tulajdonos nevesítve hívott be valakit, a cége keretére.
 * Ha ez a kapcsolón múlna, a meghívás pont akkor nem működne, amikor a
 * leginkább kell.
 *
 * # Amit a képernyő nem tesz
 *
 * Nem dönt semmiről. A négy kaput (él-e, egyezik-e a cím, van-e már cége a
 * fióknak, tag-e már) az adatbázis zárja a `meghivot_elfogad()`-ban; ez a
 * képernyő ugyanazokat az állapotokat **mutatja**, nem újra ellenőrzi. Két
 * helyen eldöntve előbb-utóbb két választ adna.
 */
export function Meghivo() {
  const { token = '' } = useParams();
  const { session, ceg, betolt: authBetolt, ujratolt } = useAuth();
  const navigate = useNavigate();

  const [adat, setAdat] = useState<MeghivoAdatok | null>(null);
  const [betolt, setBetolt] = useState(true);
  const [hiba, setHiba] = useState<string | null>(null);
  const [dolgozik, setDolgozik] = useState(false);

  const betoltes = useCallback(async () => {
    setAdat(await meghivoAdatok(token));
    setBetolt(false);
  }, [token]);

  useEffect(() => {
    void betoltes();
  }, [betoltes]);

  if (betolt || authBetolt) {
    return (
      <AuthElrendezes>
        <p className="text-sm text-slate-500">Egy pillanat…</p>
      </AuthElrendezes>
    );
  }

  if (adat === null || adat.allapot !== 'ervenyes') {
    return <Elakadt allapot={adat?.allapot ?? 'ismeretlen'} />;
  }

  const cim = adat.cim ?? '';
  const nap = adat.lejar === null ? 0 : hatralevoNap(adat.lejar);

  async function elfogad() {
    setHiba(null);
    setDolgozik(true);

    const eredmeny = await meghivotElfogad(token);

    setDolgozik(false);

    if (!eredmeny.ok) {
      setHiba(eredmeny.hiba ?? 'A meghívót nem sikerült elfogadni.');
      return;
    }

    // A cég a munkamenetből jön, nem a tokenből: az elfogadás után újra kell
    // kérdezni, különben a Beérkező cégfala visszadobna a cégalapításra.
    await ujratolt();
    navigate('/beerkezo', { replace: true });
  }

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Meghívó</h1>
      <p className="mb-5 text-sm text-slate-500">
        Meghívtak a(z) <strong className="text-slate-700">{adat.ceg_nev}</strong> SzámlaFolyó-fiókjába
        {adat.szerep !== null && <> — {szerepCimke(adat.szerep).toLowerCase()} szerepben</>}.
      </p>

      {hiba !== null && <div className="alert alert-hiba mb-4">{hiba}</div>}

      {session === null ? (
        <Belepes cim={cim} token={token} />
      ) : session.user.email?.toLowerCase() !== cim ? (
        <MasCimmel cim={cim} belepve={session.user.email ?? ''} />
      ) : ceg !== null ? (
        <div className="alert alert-figyelem">
          <strong>Ehhez a fiókhoz már tartozik cég</strong> ({ceg.name}), márpedig egy fiók egy
          céget kezel. Ha át akarsz lépni, írj: {kapcsolatEmail}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={dolgozik}
            onClick={() => void elfogad()}
          >
            {dolgozik ? 'Egy pillanat…' : 'Belépek a céghez'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            A meghívó még {nap} napig érvényes.
          </p>
        </>
      )}
    </AuthElrendezes>
  );
}

/** A meghívott nincs belépve: vagy van fiókja, vagy most készít egyet. */
function Belepes({ cim, token }: { cim: string; token: string }) {
  const [jelszo, setJelszo] = useState('');
  const [feltetelek, setFeltetelek] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [kuld, setKuld] = useState(false);
  const [kesz, setKesz] = useState(false);

  async function fiokot(e: FormEvent) {
    e.preventDefault();
    setHiba(null);

    if (jelszo.length < 8) {
      setHiba('A jelszó legyen legalább 8 karakter.');
      return;
    }

    setKuld(true);

    const { data, error } = await supabase.auth.signUp({
      email: cim,
      password: jelszo,
      // Ha a projekt megerősítést kér, a levélben lévő link **ide** hozza
      // vissza a látogatót — nem a nyitólapra, ahonnan a meghívó már nem
      // volna megtalálható.
      options: { emailRedirectTo: window.location.href },
    });

    setKuld(false);

    if (error !== null) {
      setHiba(error.message);
      return;
    }

    // Nincs munkamenet: a projekt e-mail-megerősítést kér. Ilyenkor a
    // látogatónak meg kell mondani, hogy a postafiókját nézze — enélkül azt
    // hinné, nem történt semmi.
    if (data.session === null) {
      setKesz(true);
    }
  }

  if (kesz) {
    return (
      <div className="alert alert-info">
        <strong>Nézd meg a postafiókod.</strong> Küldtünk egy megerősítő levelet a(z) {cim} címre.
        A benne lévő link ide hoz vissza, és utána elfogadhatod a meghívót.
      </div>
    );
  }

  return (
    <>
      <div>
        <label className="flabel" htmlFor="cim">
          E-mail cím
        </label>
        {/*
          A cím **nem szerkeszthető**: a meghívó ehhez az egy címhez van kötve,
          és az elfogadás is ezt nézi. Egy szabad mező itt csak azt érné el,
          hogy a látogató átírja, majd a végén elutasítást kapjon.
        */}
        <input id="cim" type="email" className="control bg-slate-50" value={cim} disabled />
      </div>

      <form onSubmit={fiokot} className="mt-4 space-y-4">
        {hiba !== null && <div className="alert alert-hiba">{hiba}</div>}

        <div>
          <label className="flabel" htmlFor="jelszo">
            Válassz jelszót
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
          {kuld ? 'Egy pillanat…' : 'Fiókot készítek'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Van már fiókod?{' '}
        <Link
          to="/bejelentkezes"
          state={{ honnan: `/meghivo/${token}` }}
          className="font-medium text-blue-700 hover:underline"
        >
          Bejelentkezés
        </Link>
      </p>
    </>
  );
}

/** Más címmel van belépve, mint amire a meghívó szól. */
function MasCimmel({ cim, belepve }: { cim: string; belepve: string }) {
  const { kijelentkezes } = useAuth();

  return (
    <>
      <div className="alert alert-figyelem">
        Ez a meghívó a(z) <strong>{cim}</strong> címre szól, te viszont{' '}
        <strong>{belepve}</strong> néven vagy belépve. A meghívó nem adható át másnak — ha ez a
        cím nem jó, a cég tulajdonosa küldjön újat.
      </div>

      <button
        type="button"
        className="btn btn-secondary mt-4 w-full"
        onClick={() => void kijelentkezes()}
      >
        Kijelentkezem
      </button>
    </>
  );
}

/** Nem használható meghívó — négy külön ok, négy külön mondat. */
function Elakadt({ allapot }: { allapot: string }) {
  const szoveg: Record<string, string> = {
    lejart: 'Ez a meghívó lejárt. Kérj újat a cég tulajdonosától.',
    visszavont: 'Ezt a meghívót visszavonták.',
    elfogadott: 'Ezt a meghívót már elfogadták. Jelentkezz be.',
    ismeretlen: 'Ez a link nem érvényes. Ellenőrizd, hogy teljes egészében bemásoltad-e.',
  };

  return (
    <AuthElrendezes>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Meghívó</h1>
      <p className="mb-5 text-sm text-slate-500">{szoveg[allapot] ?? szoveg['ismeretlen']}</p>

      <Link to="/bejelentkezes" className="btn btn-secondary w-full">
        Bejelentkezés
      </Link>
    </AuthElrendezes>
  );
}
