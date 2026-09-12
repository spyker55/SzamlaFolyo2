import { supabase } from './supabase.ts';
import { javitasok, type TarolhatoBontasSor } from '@uzleti/urlap.ts';
import type { Mezo } from '@uzleti/sema.ts';

/**
 * Az ellenőrző képernyő adatrétege: betöltés, aláírt URL, mentés.
 *
 * A jogosultságot végig az **RLS** dönti el — nem írunk külön szabályrendszert,
 * mert egy második, kézzel írt réteg előbb-utóbb elcsúszna az elsőtől.
 */

export type Bizonylat = {
  id: string;
  company_id: string;
  file_id: string;
  status: string;
  oldal_tol: number | null;
  oldal_ig: number | null;
  afa_bontas: unknown;
  note: string | null;
  tobb_irat_gyanu: boolean;
  nehezen_olvashato: boolean;
  auto_jovahagyva: boolean;
  auto_indok: string | null;
} & Record<Mezo, string | null>;

export type Fajl = {
  original_filename: string | null;
  mime_type: string | null;
  storage_path: string | null;
  file_deleted_at: string | null;
};

export type Kiolvasas = {
  id: string;
  fields: Record<string, unknown> | null;
  confidence: Record<string, number> | null;
};

export type Betoltott = {
  bizonylat: Bizonylat;
  fajl: Fajl | null;
  kiolvasas: Kiolvasas | null;
  /** Rövid életű, aláírt URL az előnézethez — a bucket privát. */
  fajlUrl: string | null;
  /** Hány bizonylat vár még ellenőrzésre (ezt is beleértve). */
  hatravan: number;
};

/** Az aláírt URL élettartama. Egy ellenőrzés néhány perc; ennyi bőven elég. */
const URL_PERC = 30;

export async function betolt(id: string): Promise<Betoltott | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, files(original_filename, mime_type, storage_path, file_deleted_at)')
    .eq('id', id)
    .maybeSingle();

  if (error !== null || data === null) {
    return null;
  }

  const nyers = data as Record<string, unknown>;
  const fajl = (Array.isArray(nyers['files']) ? nyers['files'][0] : nyers['files']) as Fajl | null;

  // A magabiztosság a legutolsó kiolvasásból jön. A kiolvasó eleve az
  // összevont (`combined`) ágat írja ebbe az oszlopba.
  const { data: kiolvasasok } = await supabase
    .from('document_extractions')
    .select('id, fields, confidence')
    .eq('document_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ellenorzesre_var');

  return {
    bizonylat: nyers as unknown as Bizonylat,
    fajl,
    kiolvasas: (kiolvasasok?.[0] as Kiolvasas | undefined) ?? null,
    fajlUrl: await alairtUrl(fajl),
    hatravan: count ?? 0,
  };
}

async function alairtUrl(fajl: Fajl | null): Promise<string | null> {
  if (fajl === null || fajl.storage_path === null || fajl.file_deleted_at !== null) {
    return null;
  }

  const { data } = await supabase.storage
    .from('bizonylatok')
    .createSignedUrl(fajl.storage_path, URL_PERC * 60);

  return data?.signedUrl ?? null;
}

/** A következő ellenőrzésre váró — enélkül minden jóváhagyás után listázni kellene. */
export async function kovetkezoId(jelenlegi: string): Promise<string | null> {
  const { data } = await supabase
    .from('documents')
    .select('id')
    .eq('status', 'ellenorzesre_var')
    .neq('id', jelenlegi)
    .order('created_at', { ascending: true })
    .limit(1);

  return (data?.[0]?.id as string | undefined) ?? null;
}

export type MentesBemenet = {
  bizonylat: Bizonylat;
  kiolvasas: Kiolvasas | null;
  mezok: Record<Mezo, string | null>;
  bontas: TarolhatoBontasSor[];
  megjegyzes: string;
  felhasznaloId: string | null;
};

/**
 * Jóváhagyás.
 *
 * Előbb a **javítások**, aztán a bizonylat. A javítás az a mérőeszköz, ami
 * megmondja, hol téved a modell — ha a bizonylat mentése után írnánk, egy
 * megszakadt mentés pont a mérést veszítené el, miközben az adat már bement.
 */
export async function jovahagy(be: MentesBemenet): Promise<{ ok: boolean; hiba?: string }> {
  const bontas = be.bontas.length === 0 ? null : be.bontas;

  const lista = javitasok(
    be.kiolvasas?.fields ?? {},
    be.mezok,
    be.bizonylat.afa_bontas,
    bontas,
  );

  if (lista.length > 0) {
    const { error } = await supabase.from('document_corrections').insert(
      lista.map((j) => ({
        company_id: be.bizonylat.company_id,
        document_id: be.bizonylat.id,
        extraction_id: be.kiolvasas?.id ?? null,
        field: j.field,
        machine_value: j.machine_value,
        human_value: j.human_value,
        // ⚠️ Ha a bizonylat automatikusan ment át, és most ember javítja, azt
        // külön jelöljük. **Ez az egyetlen jel arról, hogy a kapuk jól vannak-e
        // beállítva.** Ha ez a szám kúszik, a kapukat kell szigorítani, nem a
        // felhasználót hibáztatni.
        auto_jovahagyott_volt: be.bizonylat.auto_jovahagyva,
        corrected_by: be.felhasznaloId,
      })),
    );

    if (error !== null) {
      return { ok: false, hiba: error.message };
    }
  }

  const { error } = await supabase
    .from('documents')
    .update({
      ...be.mezok,
      afa_bontas: bontas,
      note: be.megjegyzes.trim() === '' ? null : be.megjegyzes.trim(),
      status: 'jovahagyva',
      // Innentől ember nézte meg. Az `auto_jovahagyva` zászlót **nem töröljük**:
      // az azt rögzíti, hogyan került először jóváhagyott állapotba, és ez
      // utólag is igaz marad.
      approved_by: be.felhasznaloId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', be.bizonylat.id);

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

/** Visszaküldés javításra a Tételek képernyőről. Export után már nem megy. */
export async function visszakuld(id: string): Promise<{ ok: boolean; hiba?: string }> {
  const { error } = await supabase
    .from('documents')
    .update({ status: 'ellenorzesre_var', approved_by: null, approved_at: null })
    .eq('id', id)
    .eq('status', 'jovahagyva')
    .is('export_id', null);

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}
