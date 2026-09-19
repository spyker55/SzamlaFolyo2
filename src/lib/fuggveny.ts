/**
 * Edge Function-hívások közös segédje.
 *
 * # Miért van erre külön fájl
 *
 * Mert a `supabase.functions.invoke` hibája **nem mondja meg, mi a baj**: a
 * `FunctionsHttpError` üzenete annyi, hogy „non-2xx status code". A valódi,
 * magyar indokot a függvényünk a válasz testébe írja — azt viszont ki kell
 * onnan olvasni.
 *
 * Ez a pár sor eddig a `meghivo.ts`-ben lakott egy példányban. A Stripe-kör
 * hozta a másodikat, és egy másolat itt pont azt vinné el, amiért a függvények
 * magyarul hibáznak: két helyen két különböző tartalékszöveg keletkezne.
 */

/** A függvény saját `{ hiba }` üzenete a válasz testéből, vagy `null`. */
export async function hibaSzoveg(error: unknown): Promise<string | null> {
  const valasz = (error as { context?: Response }).context;

  if (valasz === undefined || typeof valasz.json !== 'function') {
    return null;
  }

  try {
    const test = (await valasz.json()) as { hiba?: unknown };

    return typeof test.hiba === 'string' ? test.hiba : null;
  } catch {
    return null;
  }
}
