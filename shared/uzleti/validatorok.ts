import { biztosanRossz } from './adoszam.ts';
import { datumErtelmez } from './ido.ts';
import { ertelmez } from './osszeg.ts';
import { kategoriaCimke, nullaAfa, type AfaKategoria, AFA_KATEGORIAK } from './enumok.ts';

/**
 * Determinisztikus ellenőrzések a kiolvasott mezőkön.
 *
 * Ezek **nem javítanak és nem utasítanak el** semmit — csak megmondják, melyik
 * mezőben találtak ellentmondást. A modell önbevallott magabiztossága rosszul
 * kalibrált (magabiztos akkor is, amikor téved), ezért kell mellé olyan jel,
 * ami **a papírtól független**: az adószám ellenőrző számjegye, vagy hogy a
 * nettó és az ÁFA kiadja-e a bruttót.
 *
 * A bukott validátor nem blokkol. A papír az emberé: ha ő látja úgy, hogy a
 * bizonylat tényleg ilyen, jóváhagyhatja.
 */

const PENZNEMEK = [
  'HUF', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'PLN', 'RON',
  'SEK', 'DKK', 'NOK', 'HRK', 'RSD', 'UAH', 'JPY', 'CNY',
] as const;

export type Mezok = Record<string, unknown>;
export type BontasSor = Record<string, unknown>;

/** mező → a bukás magyar indoklása */
export type Bukasok = Record<string, string>;

export function bukottak(mezok: Mezok, bontas?: readonly BontasSor[] | null): Bukasok {
  const bukas: Bukasok = {};

  // --- Adószámok ---------------------------------------------------------
  for (const [mezo, ki] of [
    ['supplier_tax_number', 'szállító'],
    ['customer_tax_number', 'vevő'],
  ] as const) {
    const ertek = mezok[mezo];
    if (biztosanRossz(typeof ertek === 'string' ? ertek : null)) {
      bukas[mezo] = `A ${ki} adószámának ellenőrző számjegye nem stimmel.`;
    }
  }

  // --- Dátumok -----------------------------------------------------------
  for (const [mezo, nev] of [
    ['issue_date', 'A kelt'],
    ['fulfillment_date', 'A teljesítés dátuma'],
    ['due_date', 'A fizetési határidő'],
  ] as const) {
    const ertek = mezok[mezo];
    if (ertek === null || ertek === undefined || ertek === '') {
      continue;
    }

    const datum = datumErtelmez(String(ertek));
    if (datum === null) {
      bukas[mezo] = `${nev} nem értelmezhető dátum.`;
      continue;
    }

    const ev = Number(datum.slice(0, 4));
    if (ev < 2000 || ev > 2100) {
      bukas[mezo] = `${nev} kívül esik az értelmes tartományon.`;
    }
  }

  // A határidő nem előzheti meg a keltet. Ha mégis, valamelyik dátumot rosszul
  // olvasta ki — de nem tudjuk, melyiket, ezért **mindkettőt** jelezzük.
  const kelt = mezok['issue_date'] != null ? datumErtelmez(String(mezok['issue_date'])) : null;
  const hatarido = mezok['due_date'] != null ? datumErtelmez(String(mezok['due_date'])) : null;

  if (
    kelt !== null &&
    hatarido !== null &&
    hatarido < kelt &&
    bukas['issue_date'] === undefined &&
    bukas['due_date'] === undefined
  ) {
    bukas['due_date'] = 'A fizetési határidő korábbi, mint a kelt.';
    bukas['issue_date'] = 'A kelt későbbi, mint a fizetési határidő.';
  }

  // --- Pénznem -----------------------------------------------------------
  const penznem = mezok['currency'];
  if (
    typeof penznem === 'string' &&
    penznem !== '' &&
    !(PENZNEMEK as readonly string[]).includes(penznem.toUpperCase())
  ) {
    bukas['currency'] = 'Ismeretlen pénznemkód.';
  }

  // --- Nettó + ÁFA = bruttó ----------------------------------------------
  // Az egy egységnyi tűrés a kerekítés miatt kell; ennél nagyobb eltérés már
  // kiolvasási hiba. Fordított adózásnál a nulla ÁFA magától átmegy ezen.
  const netto = szam(mezok['net_amount']);
  const afa = szam(mezok['vat_amount']);
  const brutto = szam(mezok['gross_amount']);

  if (netto !== null && afa !== null && brutto !== null && Math.abs(netto + afa - brutto) > 1.0) {
    const indok = 'A nettó és az ÁFA összege nem adja ki a bruttót.';
    bukas['net_amount'] = indok;
    bukas['vat_amount'] = indok;
    bukas['gross_amount'] = indok;
  }

  // A PHP tömb-unió szemantikája: a **bal oldal nyer**. Ami már megbukott a
  // fejlécen, azon a bontás indoklása nem ír felül.
  const bontasBukas = bontasBukasok(bontas, netto, afa);
  for (const [mezo, indok] of Object.entries(bontasBukas)) {
    if (bukas[mezo] === undefined) {
      bukas[mezo] = indok;
    }
  }

  return bukas;
}

/**
 * Az ÁFA-bontás ellenőrzései.
 *
 * A legértékesebb közülük **az összegzés**: ha a sorok nem adják ki a fejléc
 * végösszegét, akkor valamelyik rossz, és nem tudjuk, melyik — ezért a fejléc
 * mezőit is lehúzzuk. Pontosan ez fogja meg azt a hibát, amikor a modell egy
 * tételsor összegét írja be végösszegnek: a `nettó + ÁFA = bruttó` ilyenkor
 * hibátlan marad, mert a bruttó is a tételsorhoz igazodik.
 */
function bontasBukasok(
  bontas: readonly BontasSor[] | null | undefined,
  netto: number | null,
  afa: number | null,
): Bukasok {
  if (bontas === null || bontas === undefined || bontas.length === 0) {
    return {};
  }

  const bukas: Bukasok = {};
  let osszegNetto = 0;
  let osszegAfa = 0;
  const latottKulcsok = new Set<string>();

  for (const sor of bontas) {
    const nyersKulcs = sor['kulcs'];
    const sorKulcs =
      typeof nyersKulcs === 'number' && Number.isFinite(nyersKulcs)
        ? nyersKulcs
        : typeof nyersKulcs === 'string' && nyersKulcs.trim() !== '' && Number.isFinite(Number(nyersKulcs))
          ? Number(nyersKulcs)
          : null;

    const sorNetto = szam(sor['netto']);
    const sorAfa = szam(sor['afa']);
    const nyersKategoria = sor['kategoria'];
    const kategoria =
      typeof nyersKategoria === 'string' &&
      (AFA_KATEGORIAK as readonly string[]).includes(nyersKategoria)
        ? (nyersKategoria as AfaKategoria)
        : null;

    osszegNetto += sorNetto ?? 0;
    osszegAfa += sorAfa ?? 0;

    if (sorKulcs === null) {
      continue;
    }

    // Ugyanaz a kulcs kétszer: a modell tételsorokat sorolt fel ahelyett, hogy
    // kulcsonként összevonta volna.
    const azonosito = `${sorKulcs}|${kategoria ?? ''}`;
    if (latottKulcsok.has(azonosito)) {
      bukas['afa_bontas'] = 'Ugyanaz az ÁFA-kulcs többször szerepel a bontásban.';
    }
    latottKulcsok.add(azonosito);

    // A kulcsból számolt ÁFA. A tűrés a kerekítés miatt kell, de nem lehet
    // akkora, hogy két kulcs összetévesztését elfedje.
    if (sorNetto !== null && sorAfa !== null) {
      const varhato = (sorNetto * sorKulcs) / 100;

      if (Math.abs(varhato - sorAfa) > Math.max(1.0, Math.abs(sorNetto) * 0.005)) {
        bukas['afa_bontas'] =
          `A ${kulcsKiiras(sorKulcs)}%-os sorban a nettóból nem jön ki a feltüntetett ÁFA.`;
      }
    }

    if (kategoria !== null && sorAfa !== null && nullaAfa(kategoria) && Math.abs(sorAfa) > 1.0) {
      bukas['afa_bontas'] = `„${kategoriaCimke(kategoria)}" kategóriában nem lehet ÁFA.`;
    }
  }

  // Soronként külön kerekítenek, ezért soronként engedünk egy egységet.
  const tures = Math.max(1.0, bontas.length);

  for (const [mezo, vegosszeg, sorokOsszege, nev] of [
    ['net_amount', netto, osszegNetto, 'a nettó'],
    ['vat_amount', afa, osszegAfa, 'az ÁFA'],
  ] as const) {
    if (vegosszeg === null || Math.abs(sorokOsszege - vegosszeg) <= tures) {
      continue;
    }

    // A szöveg mindkét helyen olvasható: a bontás alatt és a fejléc mezője
    // alatt is ez jelenik meg.
    const indok = `A bontás sorai nem adják ki ${nev} végösszeget.`;
    bukas['afa_bontas'] = indok;
    bukas[mezo] = indok;
  }

  return bukas;
}

/** `27` marad `27`, de `7.5` → `7,5` — a kijelzési alak magyar. */
function kulcsKiiras(kulcs: number): string {
  return kulcs === Math.floor(kulcs) ? String(Math.trunc(kulcs)) : kulcs.toFixed(1).replace('.', ',');
}

/** Összeg számmá; amit nem értünk, az `null` — nem nulla. */
function szam(ertek: unknown): number | null {
  if (ertek === null || ertek === undefined || ertek === '') {
    return null;
  }

  if (typeof ertek === 'number') {
    return Number.isFinite(ertek) ? ertek : null;
  }

  const eredmeny = ertelmez(String(ertek));

  return eredmeny.ok && eredmeny.ertek !== null ? Number(eredmeny.ertek) : null;
}
