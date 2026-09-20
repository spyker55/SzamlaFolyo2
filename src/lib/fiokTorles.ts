import { supabase } from './supabase.ts';
import { hibaSzoveg } from './fuggveny.ts';
import type { TorlesTenyek } from '@uzleti/fiokTorles.ts';

/**
 * A fiók törlésének adatműveletei.
 *
 * Kettő van, és a kettő szándékosan **külön** végpont: a tények lekérdezése
 * egy ártalmatlan RPC, a végrehajtás egy Edge Function. Aki megnézi, mi
 * történne, az ettől még nem törölt semmit.
 */

export type { TorlesTenyek };

/**
 * Mi történne a törléssel.
 *
 * Hibát nem dob: ha a lekérdezés nem sikerül, `null` jön, és a képernyő azt
 * mondja, hogy most nem tudja megmondani — nem pedig azt, hogy „nincs mit
 * törölni". Egy meghiúsult lekérdezésből nem szabad megnyugtató mondatot
 * csinálni ott, ahol a következő gomb visszafordíthatatlan.
 */
export async function torlesiTenyek(): Promise<TorlesTenyek | null> {
  const { data, error } = await supabase.rpc('fiok_torles_tenyek');

  if (error !== null || data === null) {
    return null;
  }

  return data as unknown as TorlesTenyek;
}

export type TorlesEredmeny = { ok: true } | { ok: false; hiba: string };

/**
 * A törlés végrehajtása.
 *
 * A `megerosites` a begépelt cégnév. A böngésző is ellenőrzi, de a **szerver
 * is** — ez a végpont közvetlenül is hívható, és a kliensoldali ellenőrzés
 * ott már nem véd semmit.
 */
export async function fiokotTorol(megerosites: string): Promise<TorlesEredmeny> {
  const { data, error } = await supabase.functions.invoke<{ rendben?: boolean; hiba?: string }>(
    'fiok-torles',
    { body: { megerosites } },
  );

  if (error !== null) {
    const reszletek = await hibaSzoveg(error);

    return { ok: false, hiba: reszletek ?? 'A törlés nem sikerült.' };
  }

  if (data?.hiba !== undefined) {
    return { ok: false, hiba: data.hiba };
  }

  return data?.rendben === true ? { ok: true } : { ok: false, hiba: 'A törlés nem sikerült.' };
}
