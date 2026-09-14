import { supabase } from './supabase.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';
import type { Szerep } from '@uzleti/enumok.ts';
import { naploz } from './naplo.ts';

/**
 * A Beállítások adatműveletei.
 *
 * Egy dolog köti össze őket: **mindegyik olyan mezőt ír, amit a kliensnek
 * szabad.** A `companies` UPDATE joga 2026-09-14 óta oszlopszinten szűkített (a
 * `20260914000100` migráció), mert azelőtt a tulajdonos a saját
 * `stripe_price_id`-ját is átírhatta — vagyis ingyen Pro csomagra tehette
 * magát. Ezt megmértük, nem feltételeztük.
 *
 * Ennek itt gyakorlati következménye van: **soha ne küldjünk vissza egész
 * cégobjektumot** egy `update()`-ben. Amit nem szabad írni, arra a Postgres
 * `permission denied`-et ad — akkor is, ha az érték változatlan. Ezért megy
 * minden mentés néhány nevesített mezővel.
 */

export type Tag = {
  id: string;
  user_id: string;
  role: Szerep;
  accepted_at: string | null;
  created_at: string;
};

/** A megőrzési idő választható értékei — a config maxából, nem kézzel felsorolva. */
export function megorzesiNapok(): readonly number[] {
  const max = szamlafolyo.megorzes.maxNap;

  return Array.from({ length: max + 1 }, (_, i) => i);
}

/** Az emberi alak: a 0 nem „0 nap", hanem az, hogy azonnal. */
export function megorzesCimke(nap: number): string {
  if (nap === 0) return 'Azonnal az export után';
  if (nap === 1) return 'Egy nappal az export után';
  return `${nap} nappal az export után`;
}

type Mentes = { ok: boolean; hiba?: string };

async function cegetMent(
  cegId: string,
  mezok: Record<string, string | number | boolean | null>,
): Promise<Mentes> {
  const { error } = await supabase.from('companies').update(mezok).eq('id', cegId);

  if (error !== null) {
    return { ok: false, hiba: error.message };
  }

  // Minden beállításváltás naplót ír. A megőrzési idő miatt kezdtük — az
  // **adatvédelmi ígéret**, és egy ígéret változásának nyoma kell legyen —, de
  // nincs okunk a többit kihagyni: mind a négy kapcsoló olyasmit állít, aminek
  // később következménye lesz (automatikus jóváhagyás, túlhasználati plafon).
  //
  // A mezőket kiírjuk, mert egyik sem érzékeny: cégnév, napok száma,
  // kapcsolóállás, forintplafon.
  await naploz('beallitas.modosult', {
    subject_type: 'company',
    subject_id: cegId,
    summary: Object.keys(mezok).join(', '),
    context: mezok,
  });

  return { ok: true };
}

/** A megőrzési idő. A tartományt az adatbázis is ellenőrzi (0–7). */
export async function megorzestMent(cegId: string, nap: number): Promise<Mentes> {
  return cegetMent(cegId, { file_retention_days: nap });
}

/** Az automatikus jóváhagyás kapcsolója. */
export async function autoJovahagyastMent(cegId: string, be: boolean): Promise<Mentes> {
  return cegetMent(cegId, { auto_jovahagyas_be: be });
}

/**
 * A túlhasználat kapcsolója.
 *
 * A bekapcsolás **magától beírja a forintplafont**, ha még nincs. Ez nem
 * kényelmi apróság: a plafon nélküli engedély nyitott végű számlát jelent, és
 * aki nem tud a mezőről, azt is védeni kell. Kikapcsoláskor a plafon marad —
 * ha valaki később visszakapcsolja, ne kelljen újra kitalálnia.
 */
export async function tulhasznalatotMent(
  cegId: string,
  be: boolean,
  jelenlegiPlafon: number | null,
): Promise<Mentes> {
  const plafon =
    be && (jelenlegiPlafon === null || jelenlegiPlafon <= 0)
      ? szamlafolyo.tulhasznalat.alapPlafonFt
      : jelenlegiPlafon;

  return cegetMent(cegId, { overage_enabled: be, overage_limit_ft: plafon });
}

/** A forintplafon. Nullát és negatívat nem engedünk: az „korlátlan"-t jelentene. */
export async function plafontMent(cegId: string, ft: number): Promise<Mentes> {
  if (!Number.isFinite(ft) || ft <= 0) {
    return { ok: false, hiba: 'A plafon legyen nullánál nagyobb összeg.' };
  }

  return cegetMent(cegId, { overage_limit_ft: Math.round(ft) });
}

/** A cég neve. */
export async function nevetMent(cegId: string, nev: string): Promise<Mentes> {
  const tiszta = nev.trim();

  if (tiszta === '') {
    return { ok: false, hiba: 'A cég neve nem lehet üres.' };
  }

  return cegetMent(cegId, { name: tiszta });
}

/** A cég tagjai, belépési sorrendben. */
export async function tagok(cegId: string): Promise<Tag[]> {
  const { data } = await supabase
    .from('company_members')
    .select('id, user_id, role, accepted_at, created_at')
    .eq('company_id', cegId)
    .order('created_at');

  return (data ?? []) as Tag[];
}

/** Egy tag szerepének módosítása. */
export async function szerepetMent(tagId: string, szerep: Szerep): Promise<Mentes> {
  const { error } = await supabase
    .from('company_members')
    .update({ role: szerep })
    .eq('id', tagId);

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

/**
 * Tag eltávolítása.
 *
 * A **saját** tagság eltávolítását itt nem kínáljuk fel: aki az utolsó
 * tulajdonos, az gazdátlanná tenné a céget. Az RLS engedné (`ki-ki magát`), de
 * a felület nem az a hely, ahol ezt fel kell ajánlani — a fiók megszüntetése
 * külön, átgondolt művelet.
 */
export async function tagotTorol(tagId: string): Promise<Mentes> {
  const { error } = await supabase.from('company_members').delete().eq('id', tagId);

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}
