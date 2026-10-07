/**
 * Amit a felhasználó lát, ha egy lista lekérdezése **elbukott** – üres lista
 * helyett.
 *
 * 2026-10-07: egy séma-kétértelműség miatt a PostgREST hat napig HTTP 300-zal
 * utasította el a Beérkező és az Export lekérdezését, a képernyők pedig a
 * `data ?? []` miatt üres listát mutattak: „nincs bizonylatod”, illetve „0 tétel
 * kerül exportba”. Egy elbukott kérés nem azt jelenti, hogy nincs adat – ezt a
 * két képernyő azóta külön mondja ki.
 */
export const BEERKEZO_LISTA_HIBA =
  'Nem sikerült betölteni a bizonylatokat. Az oldal magától újrapróbálja; ha nem jön rendbe, frissítsd az oldalt, vagy írj nekünk.';

export const EXPORT_LISTA_HIBA =
  'Nem sikerült betölteni az exportálható tételeket, ezért most nem tudjuk megmondani, mi kerülne exportba. Frissítsd az oldalt; ha nem jön rendbe, írj nekünk.';
