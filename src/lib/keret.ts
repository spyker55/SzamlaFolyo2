import { supabase } from './supabase.ts';
import { keretAllapot, type CegAllapot, type Keret } from '@uzleti/keret.ts';

/**
 * A keret lekérdezése.
 *
 * A **nyersanyag** az adatbázisból jön (`keret_adatok()` RPC: számlázási
 * állapot + elhasznált kreditek), a **döntést** a `@uzleti/keret.ts` hozza. Ez
 * a szétválasztás szándékos: ugyanaz a döntéshozó modul fut a böngészőben és —
 * majd — az Edge Functionben is, tehát a kettő nem tud széttartani.
 *
 * ⚠️ Amit a böngésző mond, az **udvariasság, nem védelem.** A kliensoldali
 * ellenőrzés arra jó, hogy a felhasználó ne töltsön fel fölöslegesen és lássa,
 * hol tart. A valódi fék a szerveren van — a feltöltésnél és a kiolvasásnál —,
 * mert ezt a kódot bárki megkerülheti egy közvetlen API-hívással.
 */

export type { Keret };

/** A `keret_adatok()` RPC válasza. */
type Nyers = CegAllapot & {
  felhasznalt: number;
  idoszak_kezdete: string | null;
};

/**
 * A cég aktuális kerete, vagy `null`, ha nincs cég (még nem alapított).
 *
 * Hibát **nem dob**: egy meghiúsult keretlekérdezés ne akadályozza meg a
 * felhasználót abban, hogy megnézze a saját bizonylatait. A hívó a `null`-t
 * úgy kezeli, hogy „nem tudjuk" — és a szerveroldali fék úgyis a helyén van.
 */
export async function keret(): Promise<Keret | null> {
  const { data, error } = await supabase.rpc('keret_adatok');

  if (error !== null || data === null) {
    return null;
  }

  const nyers = data as unknown as Nyers;

  const allapot = keretAllapot(nyers, nyers.felhasznalt);

  // Az ismeretlen árazonosító nem maradhat csendben: a legkisebb csomag keretét
  // adtuk, és ha ez tévedés, csak innen derül ki. A naplózás **itt** történik,
  // nem a tiszta modulban — az ne tudjon a konzolról.
  if (allapot.ismeretlenArazonosito) {
    console.warn(
      `Ismeretlen Stripe árazonosító (${nyers.stripe_price_id ?? 'nincs'}). ` +
        `A legkisebb csomag keretét adtuk: ${allapot.keret} bizonylat.`,
    );
  }

  return allapot;
}
