import { supabase } from './supabase.ts';
import { cimHelyes, cimetNormalizal, type MeghivoAllapot } from '@uzleti/meghivo.ts';
import type { Szerep } from '@uzleti/enumok.ts';

/**
 * A meghívó adatműveletei.
 *
 * Három RPC és egy Edge Function-hívás. A táblát közvetlenül **csak olvassuk**:
 * írási jog nincs rajta (`20260915000300` migráció), és ez szándékos — a
 * meghívó három művelete mind olyan szabályt kényszerít ki, amit egy
 * RLS-politika nem tud kimondani (már tag-e a cím, egyezik-e a belépési cím,
 * van-e már cége a fióknak).
 *
 * # A létrehozás és a küldés külön lépés
 *
 * Előbb létrejön a meghívó, aztán megy ki a levél. Ha a második elakad, az
 * első **megmarad**: a listában ott a sor, és a „Küldd újra" gomb pont azt
 * csinálja, amit ígér. Egy összevont művelet ilyenkor vagy hazudna, vagy
 * elvesztené a meghívót.
 */

export type Meghivo = {
  id: string;
  email: string;
  role: Szerep;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  /**
   * Mikor ment ki a levél, vagy `null`, ha nem tudunk kiküldött levélről.
   *
   * ⚠️ Nem díszítés: az első verzió minden függő meghívóra „Elküldve"-t írt,
   * miközben a levél a CORS-elővizsgálaton elakadt és el sem indult.
   */
  sent_at: string | null;
};

type Eredmeny = { ok: boolean; hiba?: string };

/** A cég meghívói, a legfrissebb elöl. Csak a tulajdonos látja őket (RLS). */
export async function meghivok(cegId: string): Promise<Meghivo[]> {
  const { data } = await supabase
    .from('company_invites')
    .select('id, email, role, token, created_at, expires_at, accepted_at, revoked_at, sent_at')
    .eq('company_id', cegId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []) as Meghivo[];
}

/**
 * Egy meghívó élő állapota — ugyanaz a négy eset, amit az adatbázis is mond.
 *
 * Azért számoljuk itt is, mert a lista sorainál nincs értelme soronként
 * lekérdezni. A `meghivo_adatok()` marad az igazság a **meghívott** oldalán;
 * ez itt a tulajdonos listájának a kijelzése.
 */
export function allapota(m: Meghivo, most: Date = new Date()): MeghivoAllapot {
  if (m.revoked_at !== null) return 'visszavont';
  if (m.accepted_at !== null) return 'elfogadott';
  if (new Date(m.expires_at).getTime() <= most.getTime()) return 'lejart';

  return 'ervenyes';
}

/** Létrehozás. A levelet **nem** ez küldi — lásd `meghivotKuld`. */
export async function meghivotLetrehoz(
  cegId: string,
  cim: string,
  szerep: Szerep,
): Promise<{ ok: boolean; id?: string; hiba?: string }> {
  const tiszta = cimetNormalizal(cim);

  // A formai ellenőrzés itt is megvan, nem csak az adatbázisban: egy hibás cím
  // miatt ne kelljen hálózatra menni, és a hibaüzenet a mezőnél jelenjen meg.
  if (!cimHelyes(tiszta)) {
    return { ok: false, hiba: 'Ez nem érvényes e-mail cím.' };
  }

  const { data, error } = await supabase.rpc('meghivot_letrehoz', {
    ceg: cegId,
    cim: tiszta,
    szerep,
  });

  return error === null
    ? { ok: true, id: data as string }
    : { ok: false, hiba: error.message };
}

/**
 * A levél kiküldése.
 *
 * Külön hibát ad vissza, mint a létrehozás, mert **más a teendő**: egy
 * elakadt levélnél a meghívó megvan, csak újra kell küldeni vagy a linket
 * kézzel átadni.
 */
export async function meghivotKuld(meghivoId: string): Promise<Eredmeny> {
  const { data, error } = await supabase.functions.invoke<{ hiba?: string }>('meghivo-kuld', {
    body: { meghivo_id: meghivoId },
  });

  if (error !== null) {
    // A `FunctionsHttpError` üzenete csak annyi, hogy „non-2xx status code" —
    // a valódi indok a válasz testében van, azt olvassuk ki.
    const reszletek = await hibaSzoveg(error);

    return { ok: false, hiba: reszletek ?? 'A levél nem ment ki.' };
  }

  return data?.hiba === undefined ? { ok: true } : { ok: false, hiba: data.hiba };
}

/** Visszavonás. A link ettől azonnal érvénytelen. */
export async function meghivotVisszavon(meghivoId: string): Promise<Eredmeny> {
  const { error } = await supabase.rpc('meghivot_visszavon', { meghivo: meghivoId });

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

export type MeghivoAdatok = {
  allapot: MeghivoAllapot;
  ceg_nev: string | null;
  cim: string | null;
  szerep: Szerep | null;
  lejar: string | null;
};

/**
 * Mit mutasson a meghívó oldal.
 *
 * Belépés **nélkül** is hívható (`anon`), és ez nem lazaság: a meghívott
 * jellemzően nincs belépve, amikor a linkre kattint. Ha nem tudnánk semmit
 * mutatni neki a bejelentkezés előtt, egy üres képernyőre kérnénk jelszót.
 */
export async function meghivoAdatok(token: string): Promise<MeghivoAdatok> {
  const { data, error } = await supabase.rpc('meghivo_adatok', { jel: token });

  if (error !== null) {
    return { allapot: 'ismeretlen', ceg_nev: null, cim: null, szerep: null, lejar: null };
  }

  const sor = (data as MeghivoAdatok[] | null)?.[0];

  return sor ?? { allapot: 'ismeretlen', ceg_nev: null, cim: null, szerep: null, lejar: null };
}

/** Elfogadás. A négy kaput az adatbázis zárja — itt csak az üzenete látszik. */
export async function meghivotElfogad(token: string): Promise<Eredmeny> {
  const { error } = await supabase.rpc('meghivot_elfogad', { jel: token });

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

async function hibaSzoveg(error: unknown): Promise<string | null> {
  const valasz = (error as { context?: Response }).context;

  if (valasz === undefined || typeof valasz.json !== 'function') {
    return null;
  }

  try {
    const test = (await valasz.json()) as { hiba?: unknown };

    return typeof test.hiba === 'string' ? test.hiba : null;
  } catch {
    return null;
  }
}
