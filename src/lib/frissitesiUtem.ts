/**
 * A Beérkező frissítésének üteme — négy sebesség, egy döntés.
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
 * # A négy sebesség
 *
 * | Állapot | Ütem | Miért |
 * |---|---|---|
 * | feldolgozás fut, az első 30 s-ban | 1 s | egy PDF mérve ~10 s; az utolsó másodperc a legérezhetőbb |
 * | feldolgozás fut, 30 s után | 5 s | egy **beragadt** sor (elfogyott keret) ne kérdezzen másodpercenként zárásig |
 * | semmi nem fut, de **figyelsz** (2 percig) | 5 s | épp visszajöttél a Gmailből: most vársz a levélre |
 * | semmi nem fut, és rég nem néztél ide | 15 s | a nyitva hagyott fül |
 *
 * # Miért nem mindig 5 másodperc — mérve, 2026-09-23
 *
 * Minden kérés egy sort ír a Supabase API-átjáró naplójába, **~4,2 KB-ot**,
 * akármilyen kicsi a válasz (üres Beérkezőnél a válasz 2 bájt). A Pro csomag
 * naplóbeviteli kerete havi **5 GB** — ez a szűk keret, nem a 250 GB-os
 * forgalom, és nem a Vercel (a kérés a böngészőből közvetlenül a Supabase-hez
 * megy). Egy napi 8 órán át nyitva hagyott fül havonta:
 *
 * | Tétlen ütem | Napló / hó | Hány ilyen felhasználó fér az 5 GB-ba |
 * |---|---|---|
 * | 15 s | ~180 MB | ~25 |
 * | 5 s mindig | ~530 MB | ~8 |
 *
 * A „figyelő" ablak ezt kerüli meg: gyors ott, ahol a felhasználó épp vár (a
 * fül vagy az ablak előtérbe kerülése, az oldal megnyitása), és visszalassul,
 * amikor senki nem néz. Egy ablak 24 kérés, ~100 KB.
 *
 * A kiolvasást az `email-bekuldes` azonnal indítja; a képernyő csak megmutatja.
 *
 * ⚠️ A **rejtett fül nem kérdez** egyik ütemben sem — ezt a hívó dönti el a
 * `document.visibilityState` alapján, és visszaváltáskor azonnal frissít. Egy
 * háttérben felejtett fül így nem terheli az adatbázist.
 */

export const SURU_POLL_MS = 1000;
export const RITKA_POLL_MS = 5000;
export const CSENDES_POLL_MS = 15_000;
export const SURU_ABLAK_MS = 30_000;
export const FIGYELO_POLL_MS = 5000;
export const FIGYELO_ABLAK_MS = 120_000;

/**
 * A következő frissítésig hátralévő idő.
 *
 * @param dolgozikMeg van-e a listán `feltoltve` vagy `feldolgozas_alatt` sor
 * @param elteltMs mióta tart a mostani feldolgozási szakasz (a sűrű ablakhoz)
 * @param figyelemOtaMs mióta nem került előtérbe az oldal (a figyelő ablakhoz)
 */
export function frissitesiUtem(dolgozikMeg: boolean, elteltMs: number, figyelemOtaMs: number): number {
  if (dolgozikMeg) {
    return elteltMs < SURU_ABLAK_MS ? SURU_POLL_MS : RITKA_POLL_MS;
  }

  return figyelemOtaMs < FIGYELO_ABLAK_MS ? FIGYELO_POLL_MS : CSENDES_POLL_MS;
}

/**
 * A frissítő hurok — React nélkül, hogy álórával tesztelhető legyen.
 *
 * Két szabályt tart, és mindkettő csendben romlana el egy komponensben:
 *
 * - **Soha nem fut két hurok.** Minden ütemezés és minden `most()` sorszámot
 *   kap, és egy visszaérő kérés **csak akkor** ütemez újra, ha közben nem
 *   nyílt újabb. Két helyzet, amiben ez számít: egy fülváltás egy épp úton
 *   lévő kérés közben (a kettő bármilyen sorrendben érhet vissza), és a szinte
 *   egyszerre érkező `visibilitychange` + `focus` (két `most()`). Enélkül
 *   mindkettő két párhuzamos hurkot indítana, és a kérésszám — vele a
 *   naplókeret — megduplázódna.
 * - **Rejtett fülön nem kérdez**, csak újraütemez; a hívó a visszaváltáskor
 *   `most()`-ot hív.
 *
 * A `frissit` hibája nem állítja meg a hurkot: egy pillanatnyi hálózati hiba
 * után a sor különben örökre „feldolgozás alatt" maradna a képernyőn.
 */
export function frissitoHurok(o: {
  frissit: () => Promise<unknown>;
  /** A következő körig hátralévő idő, minden ütemezéskor újraszámolva. */
  utem: () => number;
  lathato: () => boolean;
}): { most: () => void; leallit: () => void } {
  let el = true;
  let idozito: ReturnType<typeof setTimeout> | undefined;
  let kor = 0;

  const frissit = () => o.frissit().catch(() => undefined);

  function utemez() {
    const sajat = ++kor;

    idozito = setTimeout(() => {
      if (!el) return;

      if (!o.lathato()) {
        utemez();
        return;
      }

      void frissit().then(() => {
        if (el && sajat === kor) utemez();
      });
    }, o.utem());
  }

  utemez();

  return {
    most() {
      if (!el) return;

      clearTimeout(idozito);
      const sajat = ++kor;

      void frissit().then(() => {
        if (el && sajat === kor) utemez();
      });
    },
    leallit() {
      el = false;
      clearTimeout(idozito);
    },
  };
}
