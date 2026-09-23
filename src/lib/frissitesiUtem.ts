/**
 * A Beérkező frissítésének üteme — három sebesség, egy döntés.
 *
 * # Miért van csendes ütem is
 *
 * 2026-09-23-ig a Beérkező **csak akkor** kérdezte újra az adatbázist, ha a
 * listán már volt feldolgozás alatt álló sor. A böngészős feltöltésnél ez elég:
 * a sort a saját feltöltésed hozza létre, és onnan a sűrű ütem viszi. Az
 * e-mailben érkező bizonylatról viszont a böngésző nem tud — ha semmi nem volt
 * folyamatban, senki nem kérdezett, és az új sor csak oldalfrissítésre jelent
 * meg. A tulajdonos tesztje ezt „lassúnak" érezte; valójában a képernyő nem
 * nézett oda.
 *
 * A csendes ütem ezt zárja: amíg a fül látható, negyedpercenként ránéz a
 * sorra. Ha új, feldolgozandó sort talál, a sűrű ütem veszi át, és onnan a
 * felhasználó látja, ahogy halad.
 *
 * # A három sebesség
 *
 * | Állapot | Ütem | Miért |
 * |---|---|---|
 * | feldolgozás fut, az első 30 s-ban | 1 s | egy PDF mérve ~10 s; az utolsó másodperc a legérezhetőbb |
 * | feldolgozás fut, 30 s után | 5 s | egy **beragadt** sor (elfogyott keret) ne kérdezzen másodpercenként zárásig |
 * | semmi nem fut | 15 s | az e-mailes út észlelése; egy levél befogadása + kiolvasása mérve ~10 s |
 *
 * A 15 másodperc alsó korlát az észlelésre, nem a feldolgozásra: a kiolvasást
 * az `email-bekuldes` azonnal indítja, a képernyő csak megmutatja.
 *
 * ⚠️ A **rejtett fül nem kérdez** egyik ütemben sem — ezt a hívó dönti el a
 * `document.visibilityState` alapján, és visszaváltáskor azonnal frissít. Egy
 * háttérben felejtett fül így nem terheli az adatbázist.
 */

export const SURU_POLL_MS = 1000;
export const RITKA_POLL_MS = 5000;
export const CSENDES_POLL_MS = 15_000;
export const SURU_ABLAK_MS = 30_000;

/**
 * A következő frissítésig hátralévő idő.
 *
 * @param dolgozikMeg van-e a listán `feltoltve` vagy `feldolgozas_alatt` sor
 * @param elteltMs mióta tart a mostani feldolgozási szakasz (a sűrű ablakhoz)
 */
export function frissitesiUtem(dolgozikMeg: boolean, elteltMs: number): number {
  if (!dolgozikMeg) {
    return CSENDES_POLL_MS;
  }

  return elteltMs < SURU_ABLAK_MS ? SURU_POLL_MS : RITKA_POLL_MS;
}
