import type { SupabaseClient } from '@supabase/supabase-js';
import { torzsszam } from '../../../shared/uzleti/adoszam.ts';
import type { Elozmeny } from '../../../shared/uzleti/kapuk.ts';

/**
 * A cég saját előzményei — az automatikus jóváhagyás `g)` kapujához.
 *
 * Mind **olcsó, magyarázható SQL, nulla AI.** Pont ez az, amit a régi rendszer
 * nem tudott: hogy egy bizonylatot ne csak önmagában nézzünk, hanem ahhoz
 * képest, amit ez a cég eddig látott.
 *
 * ⚠️ A `service_role` megkerüli az RLS-t, ezért **minden lekérdezés kézzel
 * szűr `company_id`-re.** Ez nem óvatoskodás: itt nincs mögöttes háló.
 */

/** Ezek az állapotok jelentik azt, hogy egy bizonylatot ember már elfogadott. */
const JOVAHAGYOTT = ['jovahagyva', 'exportalva'];

export async function elozmenyt(
  db: SupabaseClient,
  cegId: string,
  dokumentumId: string,
  mezok: Record<string, string | null>,
): Promise<Elozmeny> {
  const { count: cegEddigi } = await db
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', cegId)
    .in('status', JOVAHAGYOTT);

  const cegEddigiBizonylatai = cegEddigi ?? 0;

  const szallitoTorzs = torzsszam(mezok['supplier_tax_number']);

  // Előzmény nélkül nincs mihez mérni: a bemelegítés úgyis emberhez viszi az
  // első bizonylatokat, itt tehát elég a „nem ismert szállító" válasz.
  if (szallitoTorzs === null) {
    return {
      ismertSzallito: false,
      bizonylatszamMarLatott: false,
      osszegKilog: false,
      keltKilog: false,
      penznemSzokatlan: false,
      cegEddigiBizonylatai,
    };
  }

  // Ugyanattól a szállítótól korábban jóváhagyott bizonylatok. A törzsszámra
  // illesztünk, mert ugyanaz a cég szerepelhet `11176165-2-10` és `HU11176165`
  // alakban is — az ÁFA-kód és a megyekód változhat, az adóalanyt a törzsszám
  // azonosítja.
  const { data: korabbiak } = await db
    .from('documents')
    .select('doc_number, gross_amount, issue_date, currency, supplier_tax_number')
    .eq('company_id', cegId)
    .in('status', JOVAHAGYOTT)
    .neq('id', dokumentumId)
    .limit(500);

  const szallitoe = (korabbiak ?? []).filter(
    (sor) => torzsszam(sor.supplier_tax_number) === szallitoTorzs,
  );

  if (szallitoe.length === 0) {
    return {
      ismertSzallito: false,
      bizonylatszamMarLatott: false,
      osszegKilog: false,
      keltKilog: false,
      penznemSzokatlan: false,
      cegEddigiBizonylatai,
    };
  }

  return {
    ismertSzallito: true,
    bizonylatszamMarLatott:
      mezok['doc_number'] !== null &&
      szallitoe.some((sor) => sor.doc_number === mezok['doc_number']),
    osszegKilog: osszegKilog(mezok['gross_amount'], szallitoe),
    keltKilog: keltKilog(mezok['issue_date']),
    penznemSzokatlan: penznemSzokatlan(mezok['currency'], korabbiak ?? []),
    cegEddigiBizonylatai,
  };
}

/**
 * Kilóg-e a végösszeg az ugyanettől a szállítótól látott nagyságrendből.
 *
 * Szándékosan durva a mérce — **ötszörös** eltérés kell hozzá. Egy szűk sáv
 * folyton hamisan riasztana (egy szállító számlája hónapról hónapra ingadozik),
 * és egy validátor, ami jogos munkamenetre szólal meg, rosszabb a semminél:
 * viszi magával a többi piros súlyát is.
 */
function osszegKilog(
  brutto: string | null,
  korabbiak: { gross_amount: string | null }[],
): boolean {
  if (brutto === null) return false;

  const ertekek = korabbiak
    .map((sor) => (sor.gross_amount === null ? null : Math.abs(Number(sor.gross_amount))))
    .filter((e): e is number => e !== null && Number.isFinite(e) && e > 0);

  // Kevés adatból nem állítunk semmit.
  if (ertekek.length < 3) return false;

  const mostani = Math.abs(Number(brutto));
  if (!Number.isFinite(mostani) || mostani === 0) return false;

  const min = Math.min(...ertekek);
  const max = Math.max(...ertekek);

  return mostani > max * 5 || mostani < min / 5;
}

/**
 * Túl régi vagy jövőbeli-e a kelt.
 *
 * Nem az előzményhez mérünk, hanem a mai naphoz: egy számla, aminek a kelte
 * két év múlva van, akkor is gyanús, ha a cégnek még nincs története.
 */
function keltKilog(kelt: string | null): boolean {
  if (kelt === null) return false;

  const datum = Date.parse(kelt);
  if (Number.isNaN(datum)) return false;

  const nap = 24 * 60 * 60 * 1000;
  const most = Date.now();

  return datum > most + 7 * nap || datum < most - 400 * nap;
}

/** Szokatlan-e a pénznem ennél a cégnél. */
function penznemSzokatlan(
  penznem: string | null,
  korabbiak: { currency: string | null }[],
): boolean {
  if (penznem === null) return false;

  const latottak = new Set(
    korabbiak.map((sor) => sor.currency).filter((c): c is string => c !== null),
  );

  // Előzmény nélkül nincs „szokásos" — ilyenkor nem állítunk semmit.
  if (latottak.size === 0) return false;

  return !latottak.has(penznem);
}
