/**
 * A Deno futtatókörnyezet azon darabkái, amiket ez a projekt ténylegesen használ.
 *
 * # Miért van erre szükség
 *
 * Az Edge Functionök Deno alatt futnak, a `npm run typecheck` viszont `tsc`-t
 * hív — az meg nem ismeri a `Deno` globálist. Enélkül a `supabase/functions/`
 * be sem vonható a typecheckbe: minden `Deno.env.get` hívás „Cannot find name
 * 'Deno'" hibát adna, és a szabály első napján kikapcsolnánk.
 *
 * # Miért kézzel írt, és nem `@types/deno`
 *
 * Mert egy teljes Deno-típuskészlet **többet ígérne, mint amennyit tudunk**. A
 * `tsc` nem a Deno resolverét futtatja: az `npm:` előtagú import-térképet nem
 * látja, a jogosultságokról semmit nem tud. Egy teljes típuskészlet mellett úgy
 * tűnne, mintha az egész Deno API-t ellenőriznénk — pedig csak a típusokat
 * nézzük, egy közelítéssel.
 *
 * Ez a fájl ehelyett **pontosan annyit mond, amennyit használunk**, és ennek
 * van egy hasznos mellékhatása: ha valaki egy új Deno API-hoz nyúl, a
 * typecheck **elhasal** — vagyis tudatos döntés lesz belőle (írd ide hozzá),
 * nem csendes elcsúszás. Mérve, ma ez a teljes felület: `Deno.env.get` (32
 * hívás) és `Deno.serve` (9 hívás), más nincs.
 *
 * ⚠️ **Amit ez NEM helyettesít.** A `tsc` a `node_modules`-ból oldja fel a
 * csomagokat (`unpdf`, `pdf-lib`, `@supabase/supabase-js`, `fast-xml-parser`),
 * a Deno viszont a `functions/deno.json` import-térképéből, `npm:` előtaggal.
 * A kettő ma egyezik — a `package.json` és az import-térkép **ugyanazokat a
 * major verziókat** rögzíti —, de ez nem automatikus. Az igazi feloldást a
 * telepítés `deno check`-je végzi; ez a projekt a típushibákat fogja meg,
 * hamarabb és olcsóbban.
 */

declare namespace Deno {
  const env: {
    get(kulcs: string): string | undefined;
  };

  /**
   * A visszatérési érték szándékosan `unknown`: mind a kilenc hívóhelyünk
   * eldobja (mérve). Ha egyszer kellene — leállítás, `finished` —, az írja ide
   * a valódi alakját, ne egy találgatás álljon itt helyette.
   *
   * A kezelő második paraméterét (a kapcsolat adatait) sem vesszük fel: ma
   * senki nem kéri. Aki kéri, annak itt kell kimondania.
   */
  function serve(kezelo: (keres: Request) => Response | Promise<Response>): unknown;
}
