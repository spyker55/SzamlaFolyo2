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

export type KulcsAfakod = { kod: string; nev: string };

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
    /** A könyvelő Kulcs-Könyvelésében rögzített ÁFA-kulcsok kódja és neve. */
    afakodok: Record<AfaFajta, KulcsAfakod>;
  };
};

export function alapBeallitas(): KontirBeallitas {
  const ures = (): KulcsAfakod => ({ kod: '', nev: '' });
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
      afakodok: { '27': ures(), '18': ures(), '5': ures(), '0': ures(), mentes: ures() },
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
  const kul = ((n['kulcs'] ?? {}) as Record<string, unknown>)['afakodok'] as
    | Record<string, unknown>
    | undefined;

  const afakodok = { ...alap.kulcs.afakodok };
  for (const fajta of AFA_FAJTAK) {
    const k = (kul?.[fajta] ?? {}) as Record<string, unknown>;
    afakodok[fajta] = { kod: szoveg(k['kod'], 3, ''), nev: szoveg(k['nev'], 20, '') };
  }

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
    for (const fajta of igeny.fajtak) {
      const k = b.kulcs.afakodok[fajta];
      if (k.kod === '' || k.nev === '') {
        const nev = fajta === 'mentes' ? 'mentes' : `${fajta}%-os`;
        hiany.push(
          `Add meg a(z) ${nev} ÁFA-kulcs kódját és nevét, ahogy a Kulcs-Könyvelésben szerepel.`,
        );
      }
    }
  }

  return hiany;
}
