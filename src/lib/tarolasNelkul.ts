/**
 * A Supabase-hívások **soha** nem mennek a böngésző HTTP-gyorsítótárán át.
 *
 * # Miért (2026-10-07)
 *
 * Egy séma-kétértelműség miatt a PostgREST HTTP **300**-zal (PGRST201)
 * válaszolt az Export és a Beérkező lekérdezésére. A Chromium a 300-at – a
 * 301-hez, 308-hoz és 410-hez hasonlóan – kifejezett lejárat nélkül is
 * **korlátlan ideig frissnek** tekinti, a válaszban pedig nem volt
 * `Cache-Control`. A javítás után így a tulajdonos böngészője ugyanarra a címre
 * ki sem ment: az API-naplóban a javítás után egyetlen alapértelmezett
 * Export-lekérdezés sem jelent meg, csak a dátumváltásra (új cím) indultak
 * friss kérések.
 *
 * Az adatbázis válasza sosem gyorsítótárazható: ugyanaz a cím percről percre
 * mást ad. A `no-store` a meglévő tárolt bejegyzést sem olvassa, tehát a már
 * beragadt 300-at is megkerüli.
 */
export function tarolasNelkul(alap: typeof fetch): typeof fetch {
  return (bemenet, beallitas) => alap(bemenet, { ...beallitas, cache: 'no-store' });
}
