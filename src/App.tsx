import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LogoSor } from './komponensek/Logo.tsx';

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
 * 2. **A `/fiok-torles` nincs a „cég kell hozzá" csoportban.** Aki regisztrált,
 *    de céget sosem hozott létre, azt a cégfal örökre a cégalapításra
 *    irányítaná — vagyis pont az nem tudna megszabadulni a fiókjától, akinek a
 *    legkevesebb köze van a rendszerhez.
 *
 * A jogi oldalak bejelentkezés nélkül is elérhetők: az ÁSZF-et a regisztráció
 * *előtt* kell tudni elolvasni, különben fiók kellene ahhoz, amihez a fiók
 * feltétele kötődik.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nyilvános */}
        <Route path="/" element={<Vazlat nev="Nyitólap" />} />
        <Route path="/aszf" element={<Vazlat nev="ÁSZF" />} />
        <Route path="/adatkezeles" element={<Vazlat nev="Adatkezelési tájékoztató" />} />
        <Route path="/impresszum" element={<Vazlat nev="Impresszum" />} />

        {/* Belépés */}
        <Route path="/bejelentkezes" element={<Vazlat nev="Bejelentkezés" />} />
        <Route path="/regisztracio" element={<Vazlat nev="Regisztráció" />} />
        <Route path="/elfelejtett-jelszo" element={<Vazlat nev="Elfelejtett jelszó" />} />
        <Route path="/jelszo-beallitas" element={<Vazlat nev="Új jelszó megadása" />} />

        {/* Belépve, cég nélkül is */}
        <Route path="/ceg-letrehozas" element={<Vazlat nev="Cég létrehozása" />} />
        <Route path="/fiok-torles" element={<Vazlat nev="Fiók törlése" />} />

        {/* Belépve, céggel */}
        <Route path="/beerkezo" element={<Vazlat nev="Beérkező" />} />
        <Route path="/ellenorzes/:id" element={<Vazlat nev="Ellenőrzés" />} />
        <Route path="/tetelek" element={<Vazlat nev="Tételek" />} />
        <Route path="/export" element={<Vazlat nev="Export" />} />
        <Route path="/archivum" element={<Vazlat nev="Archívum" />} />
        <Route path="/beallitasok" element={<Vazlat nev="Beállítások" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Ideiglenes helyőrző, amíg a képernyők elkészülnek. */
function Vazlat({ nev }: { nev: string }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <LogoSor jel="h-9 w-9" szoveg="text-2xl" />
      <div className="card card-pad">
        <h1 className="text-lg font-semibold text-slate-900">{nev}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ez a képernyő még nem készült el. A váz, a dizájnrendszer és az útvonalak állnak.
        </p>
      </div>
    </div>
  );
}
