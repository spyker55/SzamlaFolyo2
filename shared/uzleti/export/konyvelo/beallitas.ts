/**
 * A könyvelőprogram-export beállításai: a kontír.
 *
 * # Miért beállítás, és miért nem mi döntjük el
 *
 * Mindhárom program főkönyvi számokat kér: a bejövő számla nettója melyik
 * költségszámlára, az ÁFA melyik előzetes ÁFA-számlára, a bruttó melyik
 * szállítói számlára menjen. Ez **a könyvelő döntése**, a számlatükre
 * irodánként, sőt ügyfelenként más. A szokásos értékeket (454, 466, 311, 467)
 * felkínáljuk, de a költség- és az árbevételszámlát **üresen** hagyjuk:
 * „valami 5-ös" nem könyvelés, hanem találgatás, és a könyvelő csak a
 * programjában venné észre.
 *
 * Az első export előtt a beállítást menteni kell (`Export.tsx`) – az
 * alapértékek nem mehetnek ki úgy, hogy senki nem nézett rájuk.
 *
 * A tárolt alak `jsonb` (`konyvelo_beallitasok.beallitas`); amit onnan
 * olvasunk, az a `tisztit()`-on megy át, mert egy régebbi változat vagy egy
 * kézi szerkesztés hiányos objektumot is hagyhat.
 */

export const PROGRAMOK = ['rlb', 'novitax', 'kulcs'] as const;
export type Program = (typeof PROGRAMOK)[number];

export const PROGRAM_NEVEK: Record<Program, string> = {
  rlb: 'RLB Kettős',
  novitax: 'Novitax NTAX',
  kulcs: 'Kulcs-Könyvelés',
};

/**
 * Beolvasta-e már a fájlt egy **valódi** példány a programból.
 *
 * - **RLB – igen (2026-09-24):** RLB Kettős, 2026-os év; bejövő (vegyes
 *   kulccsal is), kimenő, alanyi mentes, sztornó (negatív összeg), nyugta
 *   kártyával – minden eset, amit az író ma gyárt (`DONTESTORTENET.md`).
 * - **Novitax – igen (2026-09-24):** demó NTAX; bejövő (vegyes kulccsal is,
 *   új partnerrel a `partner.csv`-ből), kimenő, mentes (`AM`), sztornó (`-`
 *   jel) – minden eset, amit az író ma gyárt.
 * - **Kulcs – nem:** a gyártói leírás szerint készül, valódi programban még
 *   senki nem töltötte be.
 *
 * Ez az egy igazság: az Export képernyő béta-jelvénye és a „Könyvelőknek"
 * oldal őre (`jogiSzovegek.test.ts`) is innen olvas. Igazra **csak valódi
 * próbaimport után** állítsd.
 */
export const KIMERVE: Record<Program, boolean> = { rlb: true, novitax: true, kulcs: false };

export const FIZETESI_MODOK = [
  'atutalas',
  'keszpenz',
  'bankkartya',
  'utanvet',
  'kompenzacio',
  'csekk',
  'inkasszo',
] as const;
export type FizetesiMod = (typeof FIZETESI_MODOK)[number];

export const FIZMOD_CIMKEK: Record<FizetesiMod, string> = {
  atutalas: 'Átutalás',
  keszpenz: 'Készpénz',
  bankkartya: 'Bankkártya',
  utanvet: 'Utánvét',
  kompenzacio: 'Kompenzáció',
  csekk: 'Csekk',
  inkasszo: 'Inkasszó',
};

/** Egy ÁFA-sor fajtája a programok szemével. */
export const AFA_FAJTAK = ['27', '18', '5', '0', 'mentes'] as const;
export type AfaFajta = (typeof AFA_FAJTAK)[number];

/** Irány → ÁFA-fajta → a Kulcs-Könyvelés ÁFA-kulcsának „Kód”-ja. */
export type KulcsAfakodok = { kimeno: Record<AfaFajta, string>; bejovo: Record<AfaFajta, string> };

/**
 * A Kulcs-Könyvelés alap ÁFA-táblájának **„Kód”** oszlopa (Törzskarbantartás
 * → Kimenő/Bejövő áfa-kulcsok) – nem az „Azonosító”, és nem a főkönyvi szám.
 *
 * Mérve (2026-09-24, demó Adatimporter 2.2601.1.833): a két lista kódjai
 * ugyanezek; a `1`-es kóddal a 27% kérdés nélkül ment be mindkét irányban,
 * a 18-as (Azonosító) és a 467-es (főkönyvi szám) Adategyeztetést kért, a
 * betűs `K27` hibát. A kód **csak szám** lehet.
 */
export const KULCS_ALAP_KODOK: Readonly<Record<AfaFajta, string>> = {
  '27': '1',
  '18': '2',
  '5': '8',
  '0': '5',
  mentes: '6',
};

/** 1–3 számjegy: az Adatimporter az `afakod` mezőben mást nem fogad. */
export function kulcsKodE(ertek: string): boolean {
  return /^\d{1,3}$/.test(ertek);
}

export type KontirBeallitas = {
  /** Bejövő számla nettója (pl. 51…, 52…). **Nincs alapértéke.** */
  koltseg: string;
  /** Kimenő számla nettója (91…). **Nincs alapértéke.** */
  arbevetel: string;
  szallito: string;
  vevo: string;
  elozetesAfa: string;
  fizetendoAfa: string;
  /**
   * Pénzforgalmi ÁFA-elszámolású-e az ügyfél. Az RLB-ben ez **az ÁFA
   * esedékességének üresen hagyása** – vagyis ha itt tévedünk, a bevallás
   * rossz időszakra kerül.
   */
  penzforgalmi: boolean;
  /** Ha a bizonylatról nem derül ki a fizetési mód. */
  alapFizmod: FizetesiMod;
  novitax: {
    /** A napló kódja az NTAX-ban (2 karakter), bejövőhöz és kimenőhöz. */
    naplokodBe: string;
    naplokodKi: string;
    /**
     * A mentes tétel NTAX-kódja: alanyi (`AM`) vagy tárgyi (`TM`). Nálunk
     * mindkettő ugyanaz az `E` kategória – a papír ritkán mondja meg,
     * melyik. Üresen a mentes tétel akadály.
     */
    mentesTipus: '' | 'AM' | 'TM';
  };
  kulcs: {
    /**
     * A könyvelő Kulcs-Könyvelésében rögzített ÁFA-kulcsok „Kód”-ja,
     * irányonként – a kimenő és a bejövő lista két külön tábla. A nevet nem
     * kérjük: mérten nem számít (lásd `KULCS_AFANEVEK`, `kulcs.ts`).
     */
    afakodok: KulcsAfakodok;
  };
};

export function alapBeallitas(): KontirBeallitas {
  return {
    koltseg: '',
    arbevetel: '',
    szallito: '454',
    vevo: '311',
    elozetesAfa: '466',
    fizetendoAfa: '467',
    penzforgalmi: false,
    alapFizmod: 'atutalas',
    novitax: { naplokodBe: '', naplokodKi: '', mentesTipus: '' },
    kulcs: {
      afakodok: { kimeno: { ...KULCS_ALAP_KODOK }, bejovo: { ...KULCS_ALAP_KODOK } },
    },
  };
}

/**
 * Főkönyvi szám: 1–8 számjegy. Az RLB 8, a Kulcs 10 karaktert enged, a
 * Novitax 7 jegyet – az utóbbit a Novitax-író külön nézi.
 */
export function fokonyviSzamE(ertek: string): boolean {
  return /^\d{1,8}$/.test(ertek);
}

/** Tárolt (akár hiányos, akár régi) objektum → teljes beállítás. */
export function tisztit(nyers: unknown): KontirBeallitas {
  const alap = alapBeallitas();
  if (nyers === null || typeof nyers !== 'object') return alap;
  const n = nyers as Record<string, unknown>;

  const szoveg = (ertek: unknown, max: number, eredeti: string): string =>
    typeof ertek === 'string' ? ertek.trim().slice(0, max) : eredeti;

  const nov = (n['novitax'] ?? {}) as Record<string, unknown>;
  const kul = (((n['kulcs'] ?? {}) as Record<string, unknown>)['afakodok'] ?? {}) as Record<string, unknown>;

  // Új alak: { kimeno: { '27': '1', … }, bejovo: { … } }. Régi alak (2026-09-24
  // előtt): { '27': { kod, nev }, … } – egy kód mindkét irányra. Ami nem
  // érvényes kód, az az alapérték lesz, nem üres: üresen a fájl nem készülne el,
  // az alapérték pedig a Kulcs saját táblája.
  const kod = (ertek: unknown, alapKod: string): string => {
    const k = typeof ertek === 'string' ? ertek.trim() : '';
    return kulcsKodE(k) ? k : alapKod;
  };
  const irany = (nyersIrany: unknown): Record<AfaFajta, string> => {
    const ki = { ...KULCS_ALAP_KODOK };
    for (const fajta of AFA_FAJTAK) {
      const iranyos = (nyersIrany as Record<string, unknown> | undefined)?.[fajta];
      const regi = (kul[fajta] as Record<string, unknown> | undefined)?.['kod'];
      ki[fajta] = kod(typeof iranyos === 'string' ? iranyos : regi, KULCS_ALAP_KODOK[fajta]);
    }
    return ki;
  };
  const afakodok: KulcsAfakodok = { kimeno: irany(kul['kimeno']), bejovo: irany(kul['bejovo']) };

  const mentes = nov['mentesTipus'];

  return {
    koltseg: szoveg(n['koltseg'], 10, alap.koltseg),
    arbevetel: szoveg(n['arbevetel'], 10, alap.arbevetel),
    szallito: szoveg(n['szallito'], 10, alap.szallito),
    vevo: szoveg(n['vevo'], 10, alap.vevo),
    elozetesAfa: szoveg(n['elozetesAfa'], 10, alap.elozetesAfa),
    fizetendoAfa: szoveg(n['fizetendoAfa'], 10, alap.fizetendoAfa),
    penzforgalmi: n['penzforgalmi'] === true,
    alapFizmod: FIZETESI_MODOK.includes(n['alapFizmod'] as FizetesiMod)
      ? (n['alapFizmod'] as FizetesiMod)
      : alap.alapFizmod,
    novitax: {
      naplokodBe: szoveg(nov['naplokodBe'], 2, ''),
      naplokodKi: szoveg(nov['naplokodKi'], 2, ''),
      mentesTipus: mentes === 'AM' || mentes === 'TM' ? mentes : '',
    },
    kulcs: { afakodok },
  };
}

/**
 * Ami a beállításból hiányzik ahhoz, hogy **ezek** a bizonylatok kimenjenek.
 *
 * Csak azt kérjük, ami kell: akinek nincs kimenő számlája, annak az
 * árbevételszámla üresen is jó.
 */
export function beallitasHianyai(
  b: KontirBeallitas,
  program: Program,
  igeny: { bejovo: boolean; kimeno: boolean; fajtak: ReadonlySet<AfaFajta> },
): string[] {
  const hiany: string[] = [];
  const fokonyv = (ertek: string, nev: string) => {
    if (ertek === '') hiany.push(`Add meg a(z) ${nev} főkönyvi számát.`);
    else if (!fokonyviSzamE(ertek)) hiany.push(`A(z) ${nev} főkönyvi száma csak 1–8 számjegy lehet.`);
    else if (program === 'novitax' && ertek.length > 7)
      hiany.push(`A Novitax legfeljebb 7 jegyű főkönyvi számot fogad (${nev}).`);
  };

  if (igeny.bejovo) {
    fokonyv(b.koltseg, 'költség');
    fokonyv(b.szallito, 'szállítók');
    fokonyv(b.elozetesAfa, 'előzetes ÁFA');
  }
  if (igeny.kimeno) {
    fokonyv(b.arbevetel, 'árbevétel');
    fokonyv(b.vevo, 'vevők');
    fokonyv(b.fizetendoAfa, 'fizetendő ÁFA');
  }

  if (program === 'novitax') {
    if (igeny.bejovo && b.novitax.naplokodBe === '')
      hiany.push('Add meg a bejövő számlák NTAX-naplójának kódját.');
    if (igeny.kimeno && b.novitax.naplokodKi === '')
      hiany.push('Add meg a kimenő számlák NTAX-naplójának kódját.');
    if (igeny.fajtak.has('mentes') && b.novitax.mentesTipus === '')
      hiany.push('Van mentes tétel: add meg, hogy az NTAX-ban alanyi (AM) vagy tárgyi (TM) mentesként menjen.');
  }

  if (program === 'kulcs') {
    const iranyok = [
      ...(igeny.kimeno ? [['kimeno', 'Kimenő'] as const] : []),
      ...(igeny.bejovo ? [['bejovo', 'Bejövő'] as const] : []),
    ];
    for (const [irany, cimke] of iranyok) {
      // Egy irányon belül két fajta nem kaphatja ugyanazt a kódot: a Kulcs a
      // rossz kódot szó nélkül elfogadja (mérve, 2026-09-24: 27%-os tétel
      // 5%-os kóddal átment), így ez az egyetlen elírás, amit mi láthatunk.
      const kodok = b.kulcs.afakodok[irany];
      const hasznalt = [...igeny.fajtak].map((f) => kodok[f]).filter(kulcsKodE);
      const dupla = hasznalt.find((k, i) => hasznalt.indexOf(k) !== i);
      if (dupla !== undefined)
        hiany.push(
          `A(z) ${dupla} Kulcs-kód két ${cimke.toLowerCase()} ÁFA-kulcsnál is szerepel – mindegyik kulcsnak a sajátja kell (${cimke} áfa-kulcsok, „Kód” oszlop).`,
        );
      for (const fajta of igeny.fajtak) {
        if (!kulcsKodE(b.kulcs.afakodok[irany][fajta])) {
          const nev = fajta === 'mentes' ? 'mentes' : `${fajta}%-os`;
          hiany.push(
            `A(z) ${nev} ${cimke.toLowerCase()} ÁFA-kulcs Kulcs-kódja 1–3 számjegy legyen: a Kulcs-Könyvelés Törzskarbantartás → ${cimke} áfa-kulcsok „Kód” oszlopából (nem az Azonosító).`,
          );
        }
      }
    }
  }

  return hiany;
}
