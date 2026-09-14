/**
 * Görgetés.
 *
 * Két dolog van itt, és mindkettő ugyanarra a kérdésre válaszol: hol legyen a
 * lap, miután a látogató kattintott egyet?
 *
 * A finom gördülést magát **nem itt** kapcsoljuk be, hanem az `app.css`-ben
 * (`html { scroll-behavior: smooth }`), mert a horgonyra ugrást a böngésző
 * intézi, nem a mi kódunk — így marad működőképes a hash az URL-ben, a vissza
 * gomb és a billentyűzetes fókusz. Ez a modul csak azokat az eseteket fedi,
 * amiket a böngésző magától nem tud.
 *
 * ⚠️ **A mozgás nem ízlés kérdése.** Akinek a rendszere csökkentett mozgást
 * kér (`prefers-reduced-motion`), annál egy hosszú, sima görgetés valódi
 * rosszullétet okozhat — ezért ott ugrik. A CSS-ben ugyanez a feltétel áll,
 * csak fordítva megfogalmazva.
 */

/** Igaz, ha a látogató rendszere csökkentett mozgást kér. */
function csokkentettMozgas(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Vissza a lap tetejére, finoman.
 *
 * A nyitólap logójára kattintva hívjuk. Ott a `<Link to="/">` önmagában **nem
 * csinál semmit**, mert már a nyitólapon állunk: az útvonal nem változik, a
 * React nem renderel újra, a görgetés pedig marad, ahol volt.
 */
export function tetejereUszik(): void {
  window.scrollTo({ top: 0, behavior: csokkentettMozgas() ? 'instant' : 'smooth' });
}

/**
 * Ugrás a lap tetejére, **azonnal**.
 *
 * Útvonalváltáskor hívjuk. Itt a finom gördülés nemcsak felesleges, hanem
 * zavaró is: egy új lap nem „lejjebb van", hanem másik. A `behavior: 'instant'`
 * kell, és nem hagyható el — az alapértelmezett `'auto'` a CSS-ből venné az
 * értéket, vagyis végiggördülne az előző lap magasságán.
 */
export function tetejereUgrik(): void {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * A címben kapott horgonyra ugrás, amint az elem megjelenik.
 *
 * Egy egyoldalas alkalmazásnál a böngésző saját horgonykeresése **elbukik**: a
 * `#arak` elem a HTML megérkezésekor még nem létezik, azt a React rajzolja ki
 * később — a `Kezdolap` ráadásul `null`-t ad, amíg a munkamenet betöltődik.
 * Mérve: a `/#arak` címre érkezve a lap a tetején maradt, pedig a szakasz 3535
 * pixellel lejjebb van. Ez azóta számít, hogy a fejléc horgonyaira kattintva a
 * cím tényleg `#arak`-ra vált — vagyis ez a cím megosztható, tehát működnie
 * kell.
 *
 * Ezért megvárjuk az elemet, de **nem korlátlanul**: legfeljebb ennyi
 * képkockán át keressük (≈ egy másodperc). Ha addig nem jelent meg, akkor
 * jó eséllyel nem is fog — elgépelt horgony, régi link —, és a lap marad a
 * tetején. Egy végtelen keresés csendben tartaná életben a lapot.
 *
 * Az ugrás **azonnali**, nem gördülő: betöltéskor a látogató még nem látott
 * semmit, nincs honnan elgördülnie. A böngésző natív viselkedése is ez.
 *
 * @returns lemondó függvény — útvonalváltáskor ne szóljon bele egy korábbi
 *   keresés abba, ahol már máshol járunk.
 */
const HORGONY_KEPKOCKAK = 60;

export function horgonyraUgrik(hash: string): () => void {
  let hatra = HORGONY_KEPKOCKAK;
  let kepkocka = 0;

  const keres = () => {
    let cel: Element | null = null;
    try {
      // A hash a címsorból jön, vagyis tetszőleges szöveg lehet: egy érvénytelen
      // szelektor (`#2`, `#a b`) kivételt dobna.
      cel = document.querySelector(hash);
    } catch {
      return;
    }

    if (cel !== null) {
      // A `scroll-margin-top` (a szakaszokon `scroll-mt-20`) itt is érvényes,
      // tehát a ragadós fejléc nem takarja el a szakasz tetejét.
      cel.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }

    hatra -= 1;
    if (hatra > 0) {
      kepkocka = requestAnimationFrame(keres);
    }
  };

  kepkocka = requestAnimationFrame(keres);
  return () => cancelAnimationFrame(kepkocka);
}
