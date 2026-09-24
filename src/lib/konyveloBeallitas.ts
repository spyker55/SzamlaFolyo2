import { supabase } from './supabase.ts';
import { alapBeallitas, tisztit, type KontirBeallitas } from '@uzleti/export/konyvelo/beallitas.ts';

/**
 * A könyvelőprogram-export kontírjának betöltése és mentése.
 *
 * A sorrend: **az ügyfél saját sora**, ha van; különben **a cég alapsora**;
 * különben a beépített alapértékek – de azt külön jelezzük (`forras:
 * 'nincs'`), mert azzal nem szabad exportálni (lásd `beallitas.ts`).
 */

export type BeallitasForras = 'ugyfel' | 'ceg' | 'nincs';

export type BetoltottBeallitas = {
  beallitas: KontirBeallitas;
  forras: BeallitasForras;
};

export async function beallitasBetolt(
  cegId: string,
  ugyfel: string | null,
): Promise<BetoltottBeallitas> {
  // A törzsszám szűrőkifejezésbe kerül (`.or()`): csak nyolc számjegy mehet.
  if (ugyfel !== null && !/^\d{8}$/.test(ugyfel)) ugyfel = null;

  let kerdes = supabase
    .from('konyvelo_beallitasok')
    .select('ugyfel_torzsszam, beallitas')
    .eq('company_id', cegId);

  kerdes =
    ugyfel === null
      ? kerdes.is('ugyfel_torzsszam', null)
      : kerdes.or(`ugyfel_torzsszam.is.null,ugyfel_torzsszam.eq.${ugyfel}`);

  const { data } = await kerdes;
  const sorok = (data ?? []) as { ugyfel_torzsszam: string | null; beallitas: unknown }[];

  const sajat = ugyfel === null ? undefined : sorok.find((s) => s.ugyfel_torzsszam === ugyfel);
  if (sajat !== undefined) return { beallitas: tisztit(sajat.beallitas), forras: 'ugyfel' };

  const ceg = sorok.find((s) => s.ugyfel_torzsszam === null);
  if (ceg !== undefined) return { beallitas: tisztit(ceg.beallitas), forras: 'ceg' };

  return { beallitas: alapBeallitas(), forras: 'nincs' };
}

/** `ugyfel === null` → a cég alapsora (minden ügyfélre, akinek nincs sajátja). */
export async function beallitasMent(
  ugyfel: string | null,
  beallitas: KontirBeallitas,
): Promise<{ ok: boolean; hiba?: string }> {
  const { error } = await supabase.rpc('konyvelo_beallitas_ment', {
    ugyfel: ugyfel ?? '',
    beallitas: tisztit(beallitas) as unknown as Record<string, unknown>,
  });

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}
