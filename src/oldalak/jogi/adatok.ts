/**
 * A szolgáltató azonosító adatai — egy helyen.
 *
 * Mind a három jogi oldal hivatkozik rájuk, és az Impresszum, az ÁSZF 1. pontja
 * meg az Adatkezelési tájékoztató 1. pontja **ugyanazt** a céget nevezi meg. Ha
 * három helyre írnánk le, előbb-utóbb kettő maradna igaz.
 *
 * ⚠️ **Ezek a szövegek nem estek át jogi felülvizsgálaton.** Az eredetit egy
 * megszűnt rendszerből hozzuk át, a mostani körben pedig azokat a pontokat
 * írtuk újra, amelyek a mai működéssel ellentmondásba kerültek. A tartalom
 * szakmai ellenőrzése külön feladat, és nem ez a fájl végzi el.
 */

export const szolgaltato = {
  nev: 'Nyeste Krisztián egyéni vállalkozó',
  szekhely: '3000 Hatvan, István király utca 7.',
  hatosag: 'Nemzeti Adó- és Vámhivatal (NAV)',
  nyilvantartasiSzam: '62574956',
  adoszam: '92220155-1-30',
  kamara: 'Heves Vármegyei Kereskedelmi és Iparkamara (HKIK)',
  kamaraCim: '3300 Eger, Faiskola út 15.',
  email: 'info@szamlafolyo.hu',
  telefon: '+36 70 604 3043',
  telefonHivas: '+36706043043',
  weboldal: 'szamlafolyo.hu',
} as const;

/**
 * A hatálybalépés napja.
 *
 * Egy dátum, nem három: a három szöveg együtt változik, mert ugyanarra a
 * működésre vonatkozik. Ha egyszer külön kell válniuk, az külön mezőt kap —
 * addig a közös dátum az igazat mondja.
 */
export const hatalyos = '2026. szeptember 14.';

/**
 * Az adatfeldolgozók — az Adatkezelési tájékoztató 5. pontjának táblázata.
 *
 * ⚠️ **Ez a lista szerződéses ígéret.** Az ÁSZF 11. pontja szerint új
 * al-adatfeldolgozó belépése előtt tizenöt nappal értesíteni kell az
 * Előfizetőket. Aki ide sort vesz fel, annak ez a kötelezettsége is keletkezik
 * — ezért áll a lista itt, kódban, és nem egy szerkeszthető szövegdobozban.
 *
 * A 2026. szeptemberi átállással a **Nethely kiesett**: a tárhely, az adatbázis
 * és a futtatás a Supabase-hez és a Vercelhez került. Ezzel együtt kiesett az a
 * mondat is, hogy „a kiszolgálók, az adatbázis és a levelezés Magyarországon
 * üzemelnek" — ez ma **nem igaz**, és egy adatkezelési tájékoztatóban a
 * kényelmes régi mondat a legrosszabb fajta hiba.
 */
export const adatfeldolgozok: readonly {
  ki: string;
  mit: string;
  hol: string;
  unionBelul: boolean;
}[] = [
  {
    ki: 'Supabase, Inc.',
    mit: 'Adatbázis, fájltárolás, felhasználókezelés és az ahhoz tartozó levelek',
    hol: 'Európai Unió (Frankfurt)',
    unionBelul: true,
  },
  {
    ki: 'Vercel, Inc.',
    mit: 'A weboldal kiszolgálása',
    hol: 'Amerikai Egyesült Államok (a kiszolgálás európai élhálózatról)',
    unionBelul: false,
  },
  {
    ki: 'OpenRouter, Inc.',
    mit: 'A kiolvasási kérés továbbítása a modellhez',
    hol: 'Amerikai Egyesült Államok',
    unionBelul: false,
  },
  {
    ki: 'A kiolvasást végző modell szolgáltatója',
    mit: 'A bizonylat gépi kiolvasása',
    hol: 'Amerikai Egyesült Államok',
    unionBelul: false,
  },
  {
    ki: 'Stripe',
    mit: 'Bankkártyás fizetés, előfizetés-kezelés',
    hol: 'Írország / Amerikai Egyesült Államok',
    unionBelul: false,
  },
];
