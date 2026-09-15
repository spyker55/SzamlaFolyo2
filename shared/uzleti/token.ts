/**
 * A hívó tokenjében álló szerep.
 *
 * # Miért nem elég a kulcsok sztringre hasonlítása
 *
 * A kötegelt feldolgozást eredetileg úgy zártuk le, hogy a kapott
 * `Authorization` fejlécet összehasonlítottuk a `SUPABASE_SERVICE_ROLE_KEY`
 * környezeti változóval. Élesben ez **elbukott**: a projekt új formátumú
 * API-kulcsokat is használ, és a függvénybe injektált érték nem ugyanaz a
 * sztring, mint a dashboardon látható, örökölt `service_role` JWT — pedig a
 * kettő ugyanazt a jogosultságot jelenti. A cron percenként 403-at kapott.
 *
 * A hiba osztálya nem a formátum, hanem az, hogy a kérdést rosszul tettük fel:
 * nem az érdekel, hogy a hívó **ugyanazt a betűsort** küldte-e, hanem hogy
 * **szolgáltatás-jogosultsággal** hív-e.
 *
 * # Miért biztonságos ezt a tokenből olvasni
 *
 * Mert mire ez a kód fut, a tokent a platform **már hitelesítette**: az Edge
 * Function `verify_jwt: true`-val fut, és ezt méréssel ellenőriztük — egy
 * `service_role` szerepű, de hamis aláírású token **401**-et kap
 * (`UNAUTHORIZED_LEGACY_JWT`), el sem jut idáig. A payload olvasása tehát nem
 * hiszékenység: a projekt kulcsával aláírt állítást olvassuk.
 *
 * ⚠️ Ez az érvelés **a `verify_jwt`-re támaszkodik.** Ha valaha kikapcsolnánk,
 * ez a függvény önmagában semmit nem bizonyít — akkor a hívást másképp kell
 * hitelesíteni. Ezért áll itt ez a bekezdés, és nem a commit-üzenetben.
 */

/**
 * A `role` állítás a Bearer tokenből, vagy `null`, ha nincs, vagy ha a fejléc
 * nem értelmezhető. **Soha nem dob**: egy szemét fejléc nem hiba, hanem
 * egyszerűen nem jogosít.
 */
export function tokenSzerep(fejlec: string | null | undefined): string | null {
  return tokenAllitas(fejlec, 'role');
}

/**
 * Egy tetszőleges szöveges állítás a Bearer tokenből.
 *
 * A `role`-on kívül a `meghivo-kuld` függvénynek az `email` kell: a levélben
 * meg kell nevezni, **ki** hívott. Ugyanaz az érvelés áll rá, mint a szerepre:
 * a platform a tokent a `verify_jwt: true` miatt **már hitelesítette**, mire
 * ide eljut — ezért olvasható ki belőle állítás anélkül, hogy ellenőriznénk.
 *
 * ⚠️ Kikapcsolt `verify_jwt` mellett ez a függvény semmit nem bizonyít.
 */
export function tokenAllitas(
  fejlec: string | null | undefined,
  nev: string,
): string | null {
  if (fejlec === null || fejlec === undefined) {
    return null;
  }

  const talalat = /^Bearer\s+(\S+)$/i.exec(fejlec.trim());

  if (talalat === null) {
    return null;
  }

  const reszek = (talalat[1] as string).split('.');

  // Fejléc, payload, aláírás. Ami nem három részből áll, az nem JWT — az új
  // formátumú kulcsok (`sb_secret_…`) például ilyenek, és azokról ez a
  // függvény helyesen nem állít semmit.
  if (reszek.length !== 3) {
    return null;
  }

  const payload = ertelmez(reszek[1] as string);

  if (payload === null) {
    return null;
  }

  const ertek = payload[nev];

  return typeof ertek === 'string' && ertek !== '' ? ertek : null;
}

/** Igaz, ha a hívó szolgáltatás-jogosultsággal (a cron vagy egy belső hívás) jön. */
export function szolgaltatasSzerep(fejlec: string | null | undefined): boolean {
  return tokenSzerep(fejlec) === 'service_role';
}

/**
 * Base64url → JSON. A `atob` a böngészőben, a Denóban és a Node 18+-ban is ott
 * van, tehát nem kell hozzá futtatókörnyezet-függő kód.
 */
function ertelmez(base64url: string): Record<string, unknown> | null {
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const kitoltve = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    const nyers = atob(kitoltve);
    const bajtok = Uint8Array.from(nyers, (ch) => ch.charCodeAt(0));
    const szoveg = new TextDecoder().decode(bajtok);

    const ertek = JSON.parse(szoveg) as unknown;

    return ertek !== null && typeof ertek === 'object' && !Array.isArray(ertek)
      ? (ertek as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
