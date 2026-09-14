import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.tsx';
import { Belepve, Ceggel, Vendeg } from './komponensek/Vedett.tsx';
import { LogoSor } from './komponensek/Logo.tsx';
import { AppElrendezes } from './komponensek/Elrendezes.tsx';
import { Bejelentkezes } from './kepernyok/auth/Bejelentkezes.tsx';
import { Regisztracio } from './kepernyok/auth/Regisztracio.tsx';
import { ElfelejtettJelszo, JelszoBeallitas } from './kepernyok/auth/Jelszo.tsx';
import { CegLetrehozas } from './kepernyok/CegLetrehozas.tsx';
import { Beerkezo } from './kepernyok/Beerkezo.tsx';
import { Ellenorzes } from './kepernyok/Ellenorzes.tsx';
import { Tetelek } from './kepernyok/Tetelek.tsx';
import { Export } from './kepernyok/Export.tsx';
import { Archivum } from './kepernyok/Archivum.tsx';
import { Nyitolap } from './kepernyok/Nyitolap.tsx';
import { Beallitasok } from './kepernyok/Beallitasok.tsx';

/**
 * Az útvonaltábla.
 *
 * Két döntés örökölt a régi `routes-web.php`-ból, és mindkettő indokolt:
 *
 * 1. **A főoldal nem irányít mindenkit tovább.** A be nem lépett látogató a
 *    nyitólapot kapja, nem a bejelentkező űrlapot — korábban egyből ott kötött
 *    ki, anélkül hogy megtudta volna, mit csinál az oldal. Belépve viszont a
 *    Beérkező jön.
 *
 * 2. **A `/fiok-torles` nincs a cégfal mögött.** Aki regisztrált, de céget
 *    sosem hozott létre, azt a cégfal örökre a cégalapításra irányítaná —
 *    vagyis pont az nem tudna megszabadulni a fiókjától, akinek a legkevesebb
 *    köze van a rendszerhez.
 *
 * A jogi oldalak bejelentkezés nélkül is elérhetők: az ÁSZF-et a regisztráció
 * *előtt* kell tudni elolvasni, különben fiók kellene ahhoz, amihez a fiók
 * feltétele kötődik.
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Nyilvános */}
          <Route path="/" element={<Kezdolap />} />
          <Route path="/aszf" element={<Vazlat nev="ÁSZF" />} />
          <Route path="/adatkezeles" element={<Vazlat nev="Adatkezelési tájékoztató" />} />
          <Route path="/impresszum" element={<Vazlat nev="Impresszum" />} />

          {/* Csak kilépve */}
          <Route
            path="/bejelentkezes"
            element={
              <Vendeg>
                <Bejelentkezes />
              </Vendeg>
            }
          />
          <Route
            path="/regisztracio"
            element={
              <Vendeg>
                <Regisztracio />
              </Vendeg>
            }
          />
          <Route
            path="/elfelejtett-jelszo"
            element={
              <Vendeg>
                <ElfelejtettJelszo />
              </Vendeg>
            }
          />
          {/* A jelszó-beállító linkkel a felhasználó már belépve érkezik. */}
          <Route path="/jelszo-beallitas" element={<JelszoBeallitas />} />

          {/* Belépve, cég nélkül is */}
          <Route
            path="/ceg-letrehozas"
            element={
              <Belepve>
                <CegLetrehozas />
              </Belepve>
            }
          />
          <Route
            path="/fiok-torles"
            element={
              <Belepve>
                <VazlatAlkalmazasban nev="Fiók törlése" />
              </Belepve>
            }
          />

          {/* Belépve, céggel */}
          <Route
            path="/beerkezo"
            element={
              <Ceggel>
                <Beerkezo />
              </Ceggel>
            }
          />
          <Route
            path="/ellenorzes/:id"
            element={
              <Ceggel>
                <Ellenorzes />
              </Ceggel>
            }
          />
          <Route
            path="/tetelek"
            element={
              <Ceggel>
                <Tetelek />
              </Ceggel>
            }
          />
          <Route
            path="/export"
            element={
              <Ceggel>
                <Export />
              </Ceggel>
            }
          />
          <Route
            path="/archivum"
            element={
              <Ceggel>
                <Archivum />
              </Ceggel>
            }
          />
          <Route
            path="/beallitasok"
            element={
              <Ceggel>
                <Beallitasok />
              </Ceggel>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/** A főoldal: belépve a Beérkező, egyébként a nyitólap. */
function Kezdolap() {
  const { session, betolt } = useAuth();

  if (betolt) {
    return null;
  }

  return session !== null ? <Navigate to="/beerkezo" replace /> : <Nyitolap />;
}

/**
 * Ideiglenes helyőrző a még el nem készült **jogi** oldalakhoz.
 *
 * A főoldal szándékosan **nem** ezt kapja: egy helyőrző, amin nincs link, a
 * látogató szempontjából zsákutca — pontosan ez volt a baj, amíg a `/` is ezt
 * kapta. A `Nyitolap` legalább a bejelentkezésig elvezet.
 *
 * Itt a helyőrző igazat mond (ezek az oldalak tényleg nem készültek el), de a
 * logó ugyanúgy **visszavisz a főoldalra**, mint az `AuthElrendezes`-ben. Egy
 * félkész oldalról is legyen kiút.
 */
function Vazlat({ nev }: { nev: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <Link to="/" className="logo-link self-start">
        <LogoSor jel="h-9 w-9" szoveg="text-2xl" />
      </Link>
      <div className="card card-pad">
        <h1 className="text-lg font-semibold text-slate-900">{nev}</h1>
        <p className="mt-2 text-sm text-slate-600">Ez az oldal még nem készült el.</p>
      </div>
    </div>
  );
}

/** Ugyanez, de a belépett felület elrendezésében. */
function VazlatAlkalmazasban({ nev }: { nev: string }) {
  return (
    <AppElrendezes>
      <h1 className="text-xl font-semibold text-slate-900">{nev}</h1>
      <p className="mt-2 text-sm text-slate-600">Ez a képernyő még nem készült el.</p>
    </AppElrendezes>
  );
}
