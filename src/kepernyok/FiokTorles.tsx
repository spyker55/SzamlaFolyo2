import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppElrendezes } from '../komponensek/Elrendezes.tsx';
import { useAuth } from '../lib/auth.tsx';
import { fiokotTorol, torlesiTenyek } from '../lib/fiokTorles.ts';
import { nevEgyezik, torlesDontes, type TorlesTenyek } from '@uzleti/fiokTorles.ts';

/**
 * A fiók törlése — a kijárat.
 *
 * # Miért nem elég egy gomb
 *
 * Mert ez a rendszer **egyetlen visszafordíthatatlan** művelete, és mert a
 * következménye fiókonként más: van, akinek csak a belépése szűnik meg, és
 * van, akivel együtt egy cég minden bizonylata elmegy. Egy általános
 * figyelmeztetés („minden adatod törlődik") ezt elmossa — ezért a képernyő
 * **előbb megkérdezi a szervert**, mi történne, és azt írja ki, számokkal.
 *
 * A döntést nem itt hozzuk: a `@uzleti/fiokTorles.ts` mondja meg, és ugyanazt
 * a modult futtatja az Edge Function is. Ha a kettő széttartana, a felhasználó
 * egy másik műveletre mondana igent, mint ami lefut.
 *
 * # A megerősítés: a cég nevét kell begépelni
 *
 * Csak ott, ahol a cég is megszűnik. Nem azért, mert egy pipa technikailag
 * kevesebb, hanem mert a begépelés **odanézésre kényszerít**: a saját kezeddel
 * írod le, melyik cég adatait viszed el. Ékezetre és kis-nagybetűre nem
 * vagyunk érzékenyek (`nevEgyezik`) — a cél a szándékosság, nem a helyesírás.
 *
 * Kilépésnél ez túlzás lenne: ott a cég adatai maradnak, és egy pipa is
 * kimondja, amit ki kell mondani.
 *
 * ⚠️ A böngésző minden ellenőrzése **udvariasság, nem védelem**: a szerver
 * ugyanezt újra megnézi, a saját olvasásából. Ez a végpont közvetlenül is
 * hívható.
 */
export function FiokTorles() {
  const { kijelentkezes } = useAuth();
  const navigate = useNavigate();

  const [tenyek, setTenyek] = useState<TorlesTenyek | null>(null);
  const [betolt, setBetolt] = useState(true);
  const [begepelt, setBegepelt] = useState('');
  const [ertem, setErtem] = useState(false);
  const [fut, setFut] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setTenyek(await torlesiTenyek());
      setBetolt(false);
    })();
  }, []);

  async function torol() {
    setHiba(null);
    setFut(true);

    const eredmeny = await fiokotTorol(begepelt);

    if (!eredmeny.ok) {
      setHiba(eredmeny.hiba);
      setFut(false);

      return;
    }

    // A munkamenet ebben a pillanatban már **érvénytelen**: a fiók nincs meg.
    // A kijelentkezés ezért elhasalhat — ez nem hiba, és nem is állíthatja meg
    // a továbblépést. A dolgunk annyi, hogy a helyi munkamenet eltűnjön.
    try {
      await kijelentkezes();
    } catch {
      // Szándékosan üres: lásd fent.
    }

    navigate('/?torles=kesz', { replace: true });
  }

  if (betolt) {
    return (
      <AppElrendezes>
        <p className="text-sm text-slate-500">Betöltés…</p>
      </AppElrendezes>
    );
  }

  // Ha a tényeket nem tudtuk lekérdezni, **nem** találgatunk. Egy törlőgomb
  // mellé nem való a „valószínűleg ennyi minden fog eltűnni".
  if (tenyek === null) {
    return (
      <AppElrendezes>
        <Fejlec />
        <div className="alert alert-hiba">
          <p>
            Most nem tudjuk megmondani, mi történne a törléssel, ezért nem is kínáljuk fel. Próbáld
            újra később.
          </p>
        </div>
      </AppElrendezes>
    );
  }

  const dontes = torlesDontes(tenyek);

  if (dontes.fajta === 'tiltva') {
    return (
      <AppElrendezes>
        <Fejlec />
        <div className="card card-pad">
          <h2 className="text-base font-semibold text-slate-900">{dontes.cim}</h2>
          <p className="mt-2 text-sm text-slate-700">{dontes.miert}</p>
          <Link to="/beallitasok" className="btn btn-primary mt-4">
            Vissza a Beállításokhoz
          </Link>
        </div>
      </AppElrendezes>
    );
  }

  const nevKell = dontes.fajta === 'ceggel';
  const mehet = nevKell ? nevEgyezik(begepelt, tenyek.cegNev) : ertem;

  return (
    <AppElrendezes>
      <Fejlec />

      <div className="card card-pad">
        <h2 className="text-base font-semibold text-slate-900">{dontes.cim}</h2>

        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {dontes.kovetkezmenyek.map((sor) => (
            <li key={sor}>• {kiemelve(sor)}</li>
          ))}
        </ul>

        {/*
          Az export ajánlása nem udvariassági formula: az Adatkezelési 8. pontja
          szerint a hordozhatóság joga ezen keresztül gyakorolható. Ezért link,
          nem mondat — és csak ott, ahol tényleg van mit menteni.
        */}
        {dontes.fajta === 'ceggel' && tenyek.bizonylatok > 0 && (
          <div className="alert alert-info mt-4">
            <p>
              Ha kellenek az adataid, <strong>előbb készíts exportot</strong> – utána már nem lesz
              miből.
            </p>
            <Link to="/tetelek" className="btn btn-secondary btn-sm mt-3">
              Irány a Tételek
            </Link>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          {nevKell ? (
            <>
              <label className="flabel" htmlFor="cegnev-megerosites">
                Írd be a cég nevét a megerősítéshez: <strong>{tenyek.cegNev}</strong>
              </label>
              <input
                id="cegnev-megerosites"
                type="text"
                className="control max-w-sm"
                value={begepelt}
                autoComplete="off"
                disabled={fut}
                onChange={(e) => setBegepelt(e.target.value)}
              />
            </>
          ) : (
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={ertem}
                disabled={fut}
                onChange={(e) => setErtem(e.target.checked)}
              />
              <span>Értem, hogy a fiókom megszűnik, és ez nem vonható vissza.</span>
            </label>
          )}

          {hiba !== null && (
            <div className="alert alert-hiba mt-4">
              <p>{hiba}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-danger"
              disabled={!mehet || fut}
              onClick={() => void torol()}
            >
              {fut ? 'Törlés…' : 'Végleges törlés'}
            </button>
            <Link to="/beallitasok" className="btn btn-secondary">
              Mégsem
            </Link>
          </div>
        </div>
      </div>
    </AppElrendezes>
  );
}

function Fejlec() {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-slate-900">Fiók törlése</h1>
      <p className="mt-1 text-sm text-slate-500">
        Mielőtt bármit tennénk, itt áll, hogy pontosan mi tűnik el.
      </p>
    </div>
  );
}

/**
 * A `**félkövér**` jelölés feloldása.
 *
 * A mondatok a tiszta modulból jönnek, ami nem ismerhet Reactet — ott a
 * kiemelés csak jelölés lehet. Itt oldjuk fel, egyetlen helyen: így a
 * figyelmeztetés súlyos része („nem vonható vissza") látszik is, anélkül hogy
 * a szöveg és a megjelenítés két helyen létezne.
 */
function kiemelve(szoveg: string) {
  return szoveg
    .split(/\*\*(.+?)\*\*/g)
    .map((resz, i) => (i % 2 === 1 ? <strong key={`${resz}-${String(i)}`}>{resz}</strong> : resz));
}
