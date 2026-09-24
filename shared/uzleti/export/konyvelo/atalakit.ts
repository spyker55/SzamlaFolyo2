import { ertelmez } from '../../osszeg.ts';
import { ervenyes, formaz, szamjegyek, torzsszam } from '../../adoszam.ts';
import { kulcsErtelmez, type BontasSor } from '../../afaBontas.ts';
import type { ExportBizonylat } from '../oszlopok.ts';
import type { AfaFajta, FizetesiMod, KontirBeallitas } from './beallitas.ts';

/**
 * Egy jóváhagyott bizonylat → könyvelőprogramnak való alak.
 *
 * # Mit csinál, és mit nem
 *
 * A három író (RLB, Novitax, Kulcs) ugyanazt a négy dolgot kéri, amit a mi
 * táblázatos exportunk nem tud: **irányt**, **egész forintot**, **tisztán
 * besorolható ÁFA-sorokat** és **kötelező mezőket**. Ez a modul egyszer dönti
 * el őket, hogy a három program ne dönthessen háromféleképpen.
 *
 * Ami nem dönthető el biztosan, az **akadály**, nem tipp: a bizonylat a
 * listán marad, a képernyő megmondja, miért, és táblázatba ettől még
 * exportálható. A könyvelőprogramban egy rossz tipp csak a bevallásnál
 * derülne ki.
 */

export type Irany = 'bejovo' | 'kimeno';
export type KonyveloiTipus = 'szamla' | 'eloleg' | 'helyesbito' | 'sztorno' | 'nyugta';

/** Egy ÁFA-sor, **egész forintban**. Sztornónál az összegek negatívak. */
export type KonyveloiSor = { fajta: AfaFajta; netto: number; afa: number };

export type KonyveloiBizonylat = {
  id: string;
  irany: Irany;
  tipus: KonyveloiTipus;
  partner: {
    nev: string;
    /** Ahogy a bizonylaton áll, magyar alakra formázva, ha az. */
    adoszam: string | null;
    /** Csak **érvényes magyar** adószámból – ez lesz a partnerkód. */
    torzsszam: string | null;
  };
  bizonylatszam: string;
  /** ISO dátumok (`ÉÉÉÉ-HH-NN`). */
  kelt: string;
  teljesites: string;
  esedekesseg: string;
  fizmod: FizetesiMod;
  sorok: KonyveloiSor[];
  netto: number;
  afa: number;
  brutto: number;
  megjegyzes: string | null;
};

export type Atalakitas =
  | { ok: true; bizonylat: KonyveloiBizonylat; figyelmeztetesek: string[] }
  | { ok: false; akadalyok: string[] };

const TIPUSOK: Record<string, KonyveloiTipus> = {
  szamla: 'szamla',
  elolegszamla: 'eloleg',
  helyesbito_szamla: 'helyesbito',
  sztorno_szamla: 'sztorno',
  nyugta: 'nyugta',
};

const KATEGORIA_AKADALY: Record<string, string> = {
  AE: 'Fordított adózású sor – a programok ezt ügylettípus szerint külön kódolják (szolgáltatás, építőipar, termék…), a bizonylatból nem tudjuk, melyik.',
  K: 'Közösségi értékesítés – az első körben nem megy programfájlba.',
  G: 'Export – az első körben nem megy programfájlba.',
  O: 'ÁFA hatályán kívüli sor – az első körben nem megy programfájlba.',
};

/**
 * @param sajat Annak a cégnek a törzsszáma, **akinek a könyveléséről** van szó:
 *   a kiválasztott ügyfélé, vagy ha nincs kiválasztva, a fióké. Ebből dől el
 *   az irány.
 */
export function atalakit(
  d: ExportBizonylat & { id: string },
  sajat: string,
  beallitas: Pick<KontirBeallitas, 'alapFizmod'>,
): Atalakitas {
  const akadalyok: string[] = [];
  const figyelmeztetesek: string[] = [];

  // --- Típus -------------------------------------------------------------
  const tipus = TIPUSOK[d.doc_type ?? ''];
  if (tipus === undefined) {
    akadalyok.push(
      d.doc_type === 'dijbekero'
        ? 'Díjbekérő – nem könyvelendő, a rá kiállított számla megy a könyvelésbe.'
        : 'Nem számviteli bizonylat (vagy nincs típusa) – nem könyvelendő.',
    );
    // A többi hiányt fölösleges felsorolni: ez a bizonylat úgysem megy.
    return { ok: false, akadalyok };
  }

  // --- Pénznem -----------------------------------------------------------
  const penznem = (d.currency ?? '').trim().toUpperCase();
  if (penznem === '') {
    akadalyok.push('Nincs pénzneme.');
  } else if (penznem !== 'HUF') {
    // Árfolyamot nem olvasunk ki, kitalálni pedig nem fogjuk.
    akadalyok.push(`Devizás (${penznem}) – az első körben csak forintos bizonylat megy programfájlba.`);
  }

  // --- Irány -------------------------------------------------------------
  const szallitoT = torzsszam(d.supplier_tax_number);
  const vevoT = torzsszam(d.customer_tax_number);
  let irany: Irany | null = null;

  if (szallitoT === sajat && vevoT === sajat) {
    akadalyok.push('A szállító és a vevő adószáma is az ügyfélé – nem dönthető el az irány.');
  } else if (szallitoT === sajat) {
    irany = 'kimeno';
  } else if (vevoT === sajat) {
    irany = 'bejovo';
  } else if (vevoT === null) {
    // Nyugtán nincs vevő, és magánszemélynek szóló számlán sincs adószám. Ha a
    // kiállító nem az ügyfél, ez az ügyfél költsége – de kimondjuk.
    irany = 'bejovo';
    figyelmeztetesek.push('A vevő adószáma nem szerepel – bejövőnek vettük.');
  } else {
    akadalyok.push('Se a szállító, se a vevő adószáma nem az ügyfélé.');
  }

  // --- Partner -----------------------------------------------------------
  const partnerNev = ((irany === 'kimeno' ? d.customer_name : d.supplier_name) ?? '').trim();
  const partnerAdoszamNyers = irany === 'kimeno' ? d.customer_tax_number : d.supplier_tax_number;
  if (irany !== null && partnerNev === '') {
    akadalyok.push(irany === 'kimeno' ? 'Nincs vevőnév.' : 'Nincs szállítónév.');
  }

  // --- Bizonylatszám, dátumok, fizetési mód -------------------------------
  const bizonylatszam = (d.doc_number ?? '').trim();
  if (bizonylatszam === '') akadalyok.push('Nincs bizonylatszáma.');

  const kelt = iso(d.issue_date);
  if (kelt === null) akadalyok.push('Nincs kelte.');

  // Áfa tv. 169. § g): a teljesítés dátuma csak akkor kötelező a számlán, ha
  // eltér a kelttől. Ha nincs rajta, az a kelte.
  const teljesites = iso(d.fulfillment_date) ?? kelt;

  const fizmodBecsles = fizetesiMod(d.payment_method);
  const fizmod = fizmodBecsles ?? beallitas.alapFizmod;
  if (fizmodBecsles === null) {
    figyelmeztetesek.push(
      d.payment_method === null || d.payment_method === undefined || d.payment_method.trim() === ''
        ? 'Nincs fizetési mód – az alapértelmezettet írtuk.'
        : `Ismeretlen fizetési mód („${d.payment_method.trim()}") – az alapértelmezettet írtuk.`,
    );
  }

  let esedekesseg = iso(d.due_date);
  if (esedekesseg === null && (fizmod === 'keszpenz' || fizmod === 'bankkartya')) {
    esedekesseg = kelt;
  }
  if (esedekesseg === null && kelt !== null) {
    akadalyok.push('Nincs fizetési határideje (nem készpénzes/kártyás bizonylatnál kötelező).');
  }

  // --- ÁFA-sorok és kerekítés --------------------------------------------
  const osszegek = sorokEgeszForintban(d, akadalyok);

  if (akadalyok.length > 0 || irany === null || tipus === undefined || osszegek === null) {
    return { ok: false, akadalyok };
  }

  return {
    ok: true,
    figyelmeztetesek,
    bizonylat: {
      id: d.id,
      irany,
      tipus,
      partner: {
        nev: partnerNev,
        adoszam: formaz(partnerAdoszamNyers ?? null),
        torzsszam: magyarTorzsszam(partnerAdoszamNyers),
      },
      bizonylatszam,
      kelt: kelt as string,
      teljesites: teljesites as string,
      esedekesseg: esedekesseg as string,
      fizmod,
      sorok: osszegek.sorok,
      netto: osszegek.sorok.reduce((s, x) => s + x.netto, 0),
      afa: osszegek.sorok.reduce((s, x) => s + x.afa, 0),
      brutto: osszegek.brutto,
      megjegyzes: d.note === null || d.note === undefined || d.note.trim() === '' ? null : d.note.trim(),
    },
  };
}

/**
 * Az ÁFA esedékessége.
 *
 * - **Kimenő:** a teljesítés (Áfa tv. 55. §, általános szabály).
 * - **Bejövő:** a levonási jog legkorábban akkor nyílik meg, amikor a
 *   teljesítés megtörtént **és** a számla a birtokunkban van – a birtoklás
 *   nem lehet a kelt előtt. A kettő közül a későbbi tehát a legkorábbi
 *   biztosan helyes időpont.
 */
export function afaEsedekesseg(b: KonyveloiBizonylat): string {
  if (b.irany === 'kimeno') return b.teljesites;
  return b.kelt > b.teljesites ? b.kelt : b.teljesites;
}

/**
 * Fizetési mód a bizonylat szövegéből. Amit nem ismerünk fel, az `null` – a
 * hívó az alapértéket írja, és szól.
 */
export function fizetesiMod(nyers: string | null | undefined): FizetesiMod | null {
  const s = (nyers ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (s.trim() === '') return null;
  if (s.includes('utanvet')) return 'utanvet';
  if (s.includes('utal') || s.includes('transfer')) return 'atutalas';
  if (s.includes('keszpenz') || /\bkp\b/.test(s) || s.includes('cash')) return 'keszpenz';
  if (s.includes('kartya') || s.includes('card')) return 'bankkartya';
  if (s.includes('kompenz')) return 'kompenzacio';
  if (s.includes('csekk')) return 'csekk';
  if (s.includes('inkassz') || s.includes('beszedes')) return 'inkasszo';
  return null;
}

/**
 * Törzsszám **csak érvényes magyar adószámból**. A közös `torzsszam()` egy
 * `DE123456789`-ből is kivág nyolc jegyet – az ügyfélszűrőnek ez elég, de
 * partnerkódnak egy német cégnél hamis magyar azonosítót adna.
 */
export function magyarTorzsszam(adoszam: string | null | undefined): string | null {
  const nyers = (adoszam ?? '').trim().toUpperCase();
  if (nyers === '' || (/^[A-Z]{2}/.test(nyers) && !nyers.startsWith('HU'))) return null;
  return ervenyes(szamjegyek(nyers)) ? torzsszam(nyers) : null;
}

// ---------------------------------------------------------------------------
// Összegek
// ---------------------------------------------------------------------------

/**
 * Az ÁFA-bontás egész forintra, egyeztetve a végösszegekkel.
 *
 * Fillérben számolunk (egész szám, nincs lebegőpontos sodródás), és a
 * kerekítés **soronként** fél-fel történik. Soronként legfeljebb 1 Ft csúszhat
 * (nettó és ÁFA fél-fél forint); ennyit a legnagyobb sor nettójára teszünk,
 * hogy a sorok a bizonylat kerekített bruttóját adják ki. Ennél nagyobb
 * eltérés már nem kerekítés, hanem ellentmondás – akadály.
 */
function sorokEgeszForintban(
  d: ExportBizonylat,
  akadalyok: string[],
): { sorok: KonyveloiSor[]; brutto: number } | null {
  const netto = filler(d.net_amount);
  const afa = filler(d.vat_amount);
  const brutto = filler(d.gross_amount);

  let sorokF = bontasFillerben(d.afa_bontas, akadalyok);
  if (sorokF === null) return null;

  if (sorokF.length === 0) {
    const egy = egyKulcsos(netto, afa);
    if (egy === null) {
      akadalyok.push('Nincs ÁFA-bontása, és a végösszegekből sem egyértelmű a kulcs.');
      return null;
    }
    sorokF = [egy];
  }

  const sumN = sorokF.reduce((s, x) => s + x.netto, 0);
  const sumA = sorokF.reduce((s, x) => s + x.afa, 0);

  if (netto !== null && Math.abs(sumN - netto) > 100) {
    akadalyok.push('Az ÁFA-bontás nettója nem egyezik a nettó végösszeggel.');
    return null;
  }
  if (afa !== null && Math.abs(sumA - afa) > 100) {
    akadalyok.push('Az ÁFA-bontás ÁFÁ-ja nem egyezik az ÁFA végösszeggel.');
    return null;
  }
  if (brutto !== null && Math.abs(sumN + sumA - brutto) > 100) {
    akadalyok.push('A nettó és az ÁFA összege nem adja ki a bruttót.');
    return null;
  }

  const sorok = sorokF.map((s) => ({ fajta: s.fajta, netto: forint(s.netto), afa: forint(s.afa) }));
  const cel = forint(brutto ?? sumN + sumA);
  const elteres = cel - sorok.reduce((s, x) => s + x.netto + x.afa, 0);

  if (Math.abs(elteres) > sorok.length) {
    akadalyok.push('A forintra kerekített sorok nem adják ki a bruttót.');
    return null;
  }

  if (elteres !== 0) {
    let legnagyobb = sorok[0] as KonyveloiSor;
    for (const s of sorok) if (Math.abs(s.netto) > Math.abs(legnagyobb.netto)) legnagyobb = s;
    legnagyobb.netto += elteres;
  }

  return { sorok, brutto: cel };
}

type FillerSor = { fajta: AfaFajta; netto: number; afa: number };

/** A tárolt bontás fillérben, fajtánként összevonva. `null` = akadály volt. */
function bontasFillerben(nyers: unknown, akadalyok: string[]): FillerSor[] | null {
  if (!Array.isArray(nyers)) return [];

  const fajtak = new Map<AfaFajta, FillerSor>();
  let rossz = false;

  for (const sor of nyers as BontasSor[]) {
    if (sor === null || typeof sor !== 'object') continue;

    const n = filler(sor.netto);
    const a = filler(sor.afa) ?? 0;
    if (n === null) continue;

    const fajta = fajtaja(kulcsErtelmez(sor.kulcs), sor.kategoria, a, akadalyok);
    if (fajta === null) {
      rossz = true;
      continue;
    }

    const eddig = fajtak.get(fajta) ?? { fajta, netto: 0, afa: 0 };
    fajtak.set(fajta, { fajta, netto: eddig.netto + n, afa: eddig.afa + a });
  }

  return rossz ? null : [...fajtak.values()];
}

function fajtaja(
  kulcs: number | null,
  kategoriaNyers: unknown,
  afaFiller: number,
  akadalyok: string[],
): AfaFajta | null {
  const kategoria = typeof kategoriaNyers === 'string' ? kategoriaNyers : null;

  if (kategoria !== null && KATEGORIA_AKADALY[kategoria] !== undefined) {
    akadalyok.push(KATEGORIA_AKADALY[kategoria] as string);
    return null;
  }

  if (kategoria === 'E' || kategoria === 'Z') {
    if (afaFiller !== 0) {
      akadalyok.push('Mentes vagy nulla kulcsos sor ÁFÁ-val – ellentmondás.');
      return null;
    }
    return kategoria === 'E' ? 'mentes' : '0';
  }

  for (const k of [27, 18, 5] as const) {
    if (kulcs !== null && Math.abs(kulcs - k) < 0.001) return String(k) as AfaFajta;
  }

  if (kulcs !== null && Math.abs(kulcs) < 0.001) {
    // Nulla kulcs kategória nélkül: mentes (AAM/TAM) vagy tényleg 0%? A
    // bevallásban máshova kerül, ezért nem tippelünk.
    akadalyok.push('0%-os sor ÁFA-kategória nélkül – állítsd be az Ellenőrzésben, hogy mentes vagy nulla kulcsos.');
    return null;
  }

  akadalyok.push(
    kulcs === null
      ? 'ÁFA-sor kulcs nélkül.'
      : `${String(kulcs).replace('.', ',')}%-os ÁFA-kulcs – nem magyar kulcs.`,
  );
  return null;
}

/** Ha nincs bontás: egyetlen magyar kulcs, ha a végösszegekből **egyértelmű**. */
function egyKulcsos(netto: number | null, afa: number | null): FillerSor | null {
  if (netto === null || afa === null || afa === 0 || netto === 0) return null;

  const talalat = ([27, 18, 5] as const).filter(
    // |nettó × k/100 − ÁFA| ≤ 1 Ft, fillérben és szorzással, osztás nélkül.
    (k) => Math.abs(netto * k - afa * 100) <= 100 * 100,
  );

  return talalat.length === 1
    ? { fajta: String(talalat[0]) as AfaFajta, netto, afa }
    : null;
}

/** Összeg → fillér (egész). Amit nem értünk, az `null`. */
function filler(ertek: unknown): number | null {
  if (ertek === null || ertek === undefined || ertek === '') return null;
  if (typeof ertek !== 'number' && typeof ertek !== 'string') return null;

  const e = ertelmez(ertek);
  if (!e.ok || e.ertek === null) return null;

  // Az `ertelmez` mindig két tizedest ad, pont elválasztóval: a pont
  // eltávolítása maga a fillér – szorzás és lebegőpont nélkül.
  return Number(e.ertek.replace('.', ''));
}

/** Fillér → forint, fél-fel (nullától elfelé), mint az `Osszeg`. */
function forint(f: number): number {
  const e = Math.floor((Math.abs(f) + 50) / 100);
  return f < 0 ? -e : e;
}

function iso(ertek: string | null | undefined): string | null {
  if (ertek === null || ertek === undefined) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(ertek) ? ertek.slice(0, 10) : null;
}
