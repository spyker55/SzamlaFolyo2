import { Link } from 'react-router-dom';

/**
 * „Elfogadom az ÁSZF-et, és megismertem az Adatkezelési tájékoztatót" — pipával.
 *
 * ⚠️ **Az ÁSZF-et elfogadja, a tájékoztatót megismeri** (2026-09-25, jogi
 * átnézés 7. pont). A tájékoztató nem szerződési feltétel, és egy „elfogadom"
 * adatkezelési hozzájárulásnak tűnhetne – a jogalapok az Adatkezelési
 * tájékoztató 2. pontjában állnak, és egyik sem hozzájárulás a pipából.
 *
 * # Miért külön komponens
 *
 * Ez a mondat **jogi nyilatkozat**: azt rögzíti, mibe egyezett bele a
 * felhasználó. Két képernyőn kell (regisztráció és meghívó elfogadása), és
 * eddig mindkettőben külön példányban állt. Két példány előbb-utóbb
 * széttart — itt pedig a széttartás nem kozmetikai kérdés, hanem az, hogy két
 * felhasználó **más szövegre** mondott igent.
 *
 * # Miért nyílnak új lapon a linkek
 *
 * Mert ugyanabban a lapon a nyilatkozat elolvasása **megszakítja a
 * regisztrációt**: a jogi oldal fejléce a főoldalra visz vissza, a beírt
 * e-mail-cím és jelszó pedig elvész. Aki elolvassa, amit aláír, rosszabbul
 * jár, mint aki nem — ez pont a fordítottja annak, amit akarunk.
 *
 * ⚠️ A kézenfekvőnek tűnő másik megoldást — az űrlap elmentését, hogy a
 * visszatérő látogató folytathassa — **szándékosan nem** választottuk: az a
 * begépelt **jelszó** böngészőtárolóba írását jelentené. Egy új lap ugyanazt a
 * célt éri el anélkül, hogy bármit el kellene tenni.
 *
 * A „Mindkettő új lapon nyílik" mondat ezért látható, nem csak képernyőolvasós
 * jelzés: a félelem, amit eloszlat („elveszítem, amit beírtam"), mindenkié.
 */
export function FeltetelekPipa({
  elfogadva,
  valtozott,
}: {
  elfogadva: boolean;
  valtozott: (ertek: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        className="mt-0.5 rounded border-slate-300"
        required
        checked={elfogadva}
        onChange={(e) => valtozott(e.target.checked)}
      />
      <span>
        Elfogadom az{' '}
        <Link
          to="/aszf"
          target="_blank"
          rel="noreferrer noopener"
          className="text-blue-700 hover:underline"
        >
          ÁSZF-et<span className="sr-only"> (új lapon nyílik)</span>
        </Link>
        , és megismertem az{' '}
        <Link
          to="/adatkezeles"
          target="_blank"
          rel="noreferrer noopener"
          className="text-blue-700 hover:underline"
        >
          Adatkezelési tájékoztatót<span className="sr-only"> (új lapon nyílik)</span>
        </Link>
        .{' '}
        <span className="text-slate-500">
          Mindkettő új lapon nyílik, hogy ne veszítsd el, amit beírtál.
        </span>
      </span>
    </label>
  );
}
