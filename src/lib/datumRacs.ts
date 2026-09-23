/**
 * A dátummezők rácsa – annyi oszlop, amennyi **olvashatóan** elfér.
 *
 * # Miért nem fix három oszlop
 *
 * Az ellenőrző képernyőn a három dátum (kelt, teljesítés, határidő) korábban
 * `sm:grid-cols-3` volt. Széles képernyőn a mezők a fél szélességű kártyába
 * kerülnek, és az oldal maga is legfeljebb `max-w-6xl` (1152 px) – a monitor
 * méretétől **függetlenül** 119 px jutott egy dátumra. Mérve (Chromium,
 * magyar nyelv, 2026-09-23): a „2026. 09. 15.” és az „éééé. hh. nn.” 120 px-en
 * levágódik, 130 px-en a naptárikonba ér, **140 px-től** látszik tisztán. A
 * tulajdonos 27 colos monitoron „2026. 09. 1”-et látott.
 *
 * # Mit csinál helyette
 *
 * `auto-fit` + `minmax`: egy oszlop legalább 10rem (160 px – 20 px tartalék
 * más böngészők eltérő naptárikonjára és betűjére), és ha három nem fér el,
 * a harmadik a következő sorba csúszik. A fél kártyában így 2 + 1, keskeny
 * nézetben (egy oszlopos elrendezés) három egy sorban, telefonon egymás alatt.
 *
 * ⚠️ Az osztálynév itt **betű szerint** áll, mert a Tailwind a forrásból
 * olvassa ki: összerakott (`\`…${x}rem…\``) névből nem generál CSS-t.
 */
export const DATUM_RACS = 'grid gap-4 grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]';

/** A 10rem pixelben – a tesztnek, hogy a mért minimum ne csússzon el. */
export const DATUM_MIN_PX = 160;
