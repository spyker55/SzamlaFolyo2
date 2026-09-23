import { useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.tsx';
import { horgonyraUgrik, tetejereUgrik } from './lib/gorgetes.ts';
import { Belepve, Ceggel, Vendeg } from './komponensek/Vedett.tsx';
import { Bejelentkezes } from './kepernyok/auth/Bejelentkezes.tsx';
import { Regisztracio } from './kepernyok/auth/Regisztracio.tsx';
import { ElfelejtettJelszo, JelszoBeallitas } from './kepernyok/auth/Jelszo.tsx';
import { Meghivo } from './kepernyok/auth/Meghivo.tsx';
import { CegLetrehozas } from './kepernyok/CegLetrehozas.tsx';
import { FiokTorles } from './kepernyok/FiokTorles.tsx';
import { Beerkezo } from './kepernyok/Beerkezo.tsx';
import { Ellenorzes } from './kepernyok/Ellenorzes.tsx';
import { Tetelek } from './kepernyok/Tetelek.tsx';
import { Export } from './kepernyok/Export.tsx';
import { Archivum } from './kepernyok/Archivum.tsx';
import { Nyitolap } from './oldalak/Nyitolap.tsx';
import { Utmutato } from './oldalak/Utmutato.tsx';
import { Beallitasok } from './kepernyok/Beallitasok.tsx';
import { Aszf } from './oldalak/jogi/Aszf.tsx';
import { Adatkezeles } from './oldalak/jogi/Adatkezeles.tsx';
import { Impresszum } from './oldalak/jogi/Impresszum.tsx';

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
 *
 * # 2026. szeptember 23. — nincs látogatásmérés
 *
 * Itt állt a Vercel Web Analytics, a `lib/analitika.ts` fehérlistájával. A
 * jogi felülvizsgálat harmadik köre kérte, hogy a „semmit nem olvas ki az
 * eszközről" állítást a tényleges kóddal támasszuk alá — és a visszaolvasott,
 * **aznap frissült** mérőkód (v0.1.3) minden oldalmegnyitáskor kiolvasta a
 * `localStorage` `__va_attribution` kulcsát. Az állítás, amin a hozzájárulás
 * nélküli mérés indoka állt, így hamissá vált — ráadásul nem a mi
 * telepítésünktől, hanem a szolgáltató oldalán.
 *
 * A mérés ezért kikerült, nem a szöveg gyengült. ⚠️ Aki visszahozná: a
 * mérőkódot a Vercel szolgálja ki, és **a mi kiadásunk nélkül is változhat** —
 * vagyis a „mit olvas ki" kérdésre adott válasz csak a visszaolvasás napjára
 * igaz, és a jogalapot (hozzájárulás) ehhez kell igazítani, nem fordítva.
 */
export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GorgetesVisszaall />
        <Routes>
          {/* Nyilvános */}
          <Route path="/" element={<Kezdolap />} />
          <Route path="/utmutato" element={<Utmutato />} />
          <Route path="/aszf" element={<Aszf />} />
          <Route path="/adatkezeles" element={<Adatkezeles />} />
          <Route path="/impresszum" element={<Impresszum />} />

          {/*
            A meghívó **se nem vendég-, se nem védett** útvonal, és ez tudatos:
            a meghívott lehet olyan, akinek még nincs fiókja, és lehet olyan,
            aki már be van lépve. Egy „csak kilépve" kapu az utóbbit kidobná a
            saját meghívójáról; egy „csak belépve" kapu az előbbit.
          */}
          <Route path="/meghivo/:token" element={<Meghivo />} />

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
                <FiokTorles />
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

/**
 * Útvonalváltáskor a lap tetejére.
 *
 * A React Router nem görget: a DOM cserélődik, a görgetés marad. Mérve ez azt
 * jelentette, hogy a nyitólap aljáról az ÁSZF-re kattintva **4130 pixelnél**
 * kötöttél ki, a szerződés közepén, és az ÁSZF-ből visszafelé ugyanígy.
 *
 * Két esetben viszont nem a lap teteje a helyes válasz:
 *
 * - **vissza/előre gomb** (`POP`): a böngésző oda állítja vissza a lapot, ahol
 *   a látogató hagyta. Ezt felülírni nem javítás, hanem kártétel.
 * - **horgonyos cím** (`/valami#szakasz`): ott a cél nem a lap teteje. A
 *   böngészőre viszont ezt sem lehet bízni — a horgony elemét a React rajzolja
 *   ki, mire a böngésző már feladta a keresést —, ezért a `horgonyraUgrik()`
 *   végzi el.
 */
function GorgetesVisszaall() {
  const { pathname, hash } = useLocation();
  const navigacio = useNavigationType();
  const elozoUtvonal = useRef<string | null>(null);

  useEffect(() => {
    const eloszor = elozoUtvonal.current === null;
    const lapotValtottunk = elozoUtvonal.current !== pathname;
    elozoUtvonal.current = pathname;

    // ⚠️ **Csak lapváltáskor szólunk bele.** Ha ugyanazon a lapon csak a
    // horgony változott — mert a látogató a fejléc „Árak" linkjére kattintott
    // —, azt a böngésző már elvégezte, méghozzá finoman. Mérve: e nélkül a
    // feltétel nélkül az effekt azonnali ugrásra írta felül a sima gördülést.
    if (!eloszor && !lapotValtottunk) {
      return;
    }

    // ⚠️ A horgony **a POP-vizsgálat előtt** áll, szintén mérésből: a legelső
    // rendernél a navigáció típusa `POP` (a lap betöltése maga is az), tehát
    // fordított sorrendben egy megosztott `/#arak` cím soha nem ugrott volna
    // a helyére.
    if (hash !== '') {
      return horgonyraUgrik(hash);
    }

    // A vissza/előre gombnál a böngésző maga állítja vissza a pozíciót, oda,
    // ahol a látogató az adott lapot hagyta. Azt felülírni kártétel.
    if (navigacio === 'POP') {
      return;
    }

    tetejereUgrik();
  }, [pathname, hash, navigacio]);

  return null;
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

