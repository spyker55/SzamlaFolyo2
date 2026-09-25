import { Link } from 'react-router-dom';

/**
 * A lábléc linkjei — **egyetlen forrásból**.
 *
 * Ez a lista négy helyen jelenik meg: a nyitólap láblécében, a nyilvános
 * szöveges oldalak (útmutató, jogi hármas) lábában, a belépés előtti
 * képernyők alján és a belépett felület láblécében. Amíg négy helyen állt
 * négy kézzel írt felsorolás, a széttartás nem *ha*, hanem *mikor* kérdése
 * volt — és úgy derült volna ki, hogy valaki épp keresi az útmutatót.
 *
 * ⚠️ **Csak nyilvános, belépés nélkül is elérhető cím kerülhet ide.** A lista
 * a belépett felületen is kirajzolódik, ahol egy védett útvonal linkje
 * szerepkörtől függően zsákutca lenne.
 *
 * Ami **nincs** benne, és ez szándékos:
 *
 * - **Bejelentkezés** — a belépett felhasználónak értelmetlen, a kilépettnek
 *   pedig ott a fejléc gombja és a hero elsődleges gombja. Háromszor ugyanaz.
 * - **Kapcsolat** (`mailto:`) — a cím megvan az Impresszumban és a Használati
 *   útmutató végén is, vagyis nem tűnik el, csak nem a láblécben áll.
 */
export const LABLEC_LINKEK = [
  { ut: '/utmutato', cimke: 'Használati útmutató' },
  { ut: '/aszf', cimke: 'ÁSZF' },
  { ut: '/adatkezeles', cimke: 'Adatkezelés' },
  { ut: '/impresszum', cimke: 'Impresszum' },
] as const;

/**
 * A linkek maguk, keret nélkül.
 *
 * ⚠️ Az `ujLapon` csak a **belépés előtti** képernyőkön igaz
 * (`AuthElrendezes`). Ott a lapon egy félig kitöltött űrlap áll, és egy
 * jogi szöveg elolvasása nem viheti el a begépelt adatokat — ugyanaz az érv,
 * mint a `FeltetelekPipa` linkjeinél. Máshol a lábléc marad, ami: a saját
 * lapján nyíló, megszokott navigáció.
 *
 * A keretet (a `<nav>`-ot és a tipográfiát) a hívó adja: a nyitólap láblécében
 * félkövér, a belépett felületen halvány apróbetű. A **lista** viszont közös —
 * az a része, ami elromolhat.
 */
export function LablecLinkek({ osztaly, ujLapon = false }: { osztaly?: string; ujLapon?: boolean }) {
  return (
    <>
      {LABLEC_LINKEK.map((elem) => (
        <Link
          key={elem.ut}
          to={elem.ut}
          className={osztaly}
          {...(ujLapon ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {elem.cimke}
          {ujLapon && <span className="sr-only"> (új lapon nyílik)</span>}
        </Link>
      ))}
    </>
  );
}

/**
 * A belépett felület lába.
 *
 * Korábban itt semmi nem volt: aki belépett, annak az útmutató, az ÁSZF és az
 * Adatkezelési tájékoztató **elérhetetlenné vált** — pedig pont annak van
 * leginkább dolga velük, aki használja a rendszert. Kijelentkezés nélkül csak
 * a címsorba gépelve jutott volna el hozzájuk.
 */
export function AppLablec() {
  return (
    <footer className="border-t border-slate-200 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-xs text-slate-500">
        <LablecLinkek osztaly="transition-colors hover:text-blue-600 hover:underline" />
        <span className="text-slate-400 sm:ml-auto">
          © {new Date().getFullYear()} SzámlaFolyó
        </span>
      </div>
    </footer>
  );
}
