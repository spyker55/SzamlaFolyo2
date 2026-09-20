import type { BeforeSendEvent } from '@vercel/analytics/react';

/**
 * A látogatásmérés szűrője.
 *
 * # Miért van erre szükség egyáltalán
 *
 * A Vercel Web Analytics a `beforeSend` visszahívásban adja át az eseményt,
 * mielőtt elküldené — és az esemény egy teljes **URL**-t hordoz. Hogy abba az
 * URL-be a lekérdezés és a horgony (`?…`, `#…`) beleszámít-e, azt nem a
 * telepített npm-csomag dönti el: az csak betölti a `/_vercel/insights/script.js`-t
 * a **saját domainünkről**, és átadja neki ezt a függvényt. A tényleges
 * összeállítás abban a távoli scriptben történik, amit innen nem látunk.
 *
 * Ezért nem feltételezzük, hogy mit tesz bele, hanem **felülírjuk**.
 *
 * # Fehérlista, nem feketelista — és ez a fájl lényege
 *
 * Kézenfekvő volna kiszűrni a „veszélyes" útvonalakat. Az viszont úgy romlik
 * el, hogy nem szól: aki jövőre felvesz egy új, azonosítót hordozó útvonalat,
 * annak eszébe kell jutnia, hogy ezt a fájlt is bővítse. Nem fog eszébe jutni.
 *
 * Megfordítva a szabály magától tart: **csak az megy ki, ami nevesítve itt
 * áll**, minden más eldobódik. Egy új útvonal alapértelmezésben néma.
 *
 * # Mit nem mérünk, és miért pont azokat
 *
 * 1. **A bejelentkezés mögötti képernyőket.** Ez a termék más cégek számláit
 *    kezeli; hogy ki mikor melyik bizonylatot nézte, az nem egy látogatásmérő
 *    dolga. Amit a használatról tudni akarunk, az amúgy is a saját
 *    adatbázisunkban van (`activity_log`), az Európai Unión belül.
 *
 * 2. **A `/meghivo/:token` útvonalat.** Az a token **bemutatóra szóló kulcs**:
 *    aki ismeri, be tud lépni a cégbe. Egy ilyet harmadik félnek átadni akkor
 *    is szivárgás, ha az a harmadik fél amúgy a tárhelyszolgáltatónk.
 *
 * 3. **A `/jelszo-beallitas` útvonalat.** Ide a Supabase a helyreállító tokent
 *    a URL **horgonyában** hozza (`#access_token=…`), és a kliens szedi ki
 *    onnan. Itt ugyan a lekérdezést és a horgonyt is levágnánk — de egy
 *    jelszó-visszaállító token mellett nem a saját levágásunkban akarunk
 *    bízni. Az ilyen képernyő inkább ne is kerüljön a mérésbe.
 *
 * Ami marad: a nyilvános tölcsér — nyitólap, jogi oldalak, és a belépés előtti
 * űrlapok. Pontosan az, amire egy látogatásmérő való.
 *
 * # Egy eltérés, ami fejlesztés közben megzavar
 *
 * Éles csomagban a mérőkód a **saját domainünkről** jön
 * (`/_vercel/insights/script.js`) — az Adatkezelési tájékoztató 7. pontja
 * ezt állítja, és mérve igaz: a `detectEnvironment()` a Vite optimalizálása
 * után feltétel nélkül `"production"`-t ad, tehát a `va.vercel-scripts.com`-os
 * ág a kiadott kódban holt.
 *
 * `npm run dev` alatt viszont **él**: ott a csomag a hibakereső scriptet tölti
 * a `va.vercel-scripts.com`-ról. Ha a konzolban emiatt látsz egy sikertelen
 * kérést, az nem hiba és nem is kerül ki a látogatókhoz.
 *
 * ⚠️ **Ez a döntés a kódban él, nem env-kapcsolóban.** Ugyanaz az indok, mint
 * az OpenRouter `data_collection: "deny"`-jánál: az Adatkezelési tájékoztató
 * 2. pontja ígéretet tesz rá, és egy átbillenthető ígéret rosszabb a semminél.
 */
export const MERT_UTVONALAK: readonly string[] = [
  '/',
  '/aszf',
  '/adatkezeles',
  '/impresszum',
  '/bejelentkezes',
  '/regisztracio',
  '/elfelejtett-jelszo',
] as const;

/**
 * A nyers URL-ből az a tiszta cím, ami elmehet — vagy `null`, ha semmi.
 *
 * A lekérdezés és a horgony **mindig** elvész: nem szűrjük őket, hanem egy
 * olyan címet állítunk elő, amiben nincsenek benne. Így egy `?utm_source=…`
 * vagy egy `#access_token=…` nem attól tűnik el, hogy gondoltunk rá.
 */
export function utvonalJel(nyers: string): string | null {
  let cim: URL;

  try {
    // A `base` csak akkor számít, ha relatív címet kapunk. Abszolútnál az
    // eredeti origin marad — előnézeti telepítésen az sem a sajátunk.
    cim = new URL(nyers, 'https://szamlafolyo.hu');
  } catch {
    // Értelmezhetetlen cím: a biztonságos irány a hallgatás.
    return null;
  }

  // A záró perjel nem külön oldal. `/aszf/` és `/aszf` ugyanaz.
  const ut = cim.pathname.length > 1 ? cim.pathname.replace(/\/+$/, '') : cim.pathname;

  if (!MERT_UTVONALAK.includes(ut === '' ? '/' : ut)) {
    return null;
  }

  return `${cim.origin}${ut === '' ? '/' : ut}`;
}

/**
 * A `beforeSend` maga. Eldobja az eseményt, vagy megtisztított címmel engedi.
 */
export function esemenytSzur(esemeny: BeforeSendEvent): BeforeSendEvent | null {
  const jel = utvonalJel(esemeny.url);

  return jel === null ? null : { ...esemeny, url: jel };
}
