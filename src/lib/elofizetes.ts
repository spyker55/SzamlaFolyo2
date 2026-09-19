import { supabase } from './supabase.ts';
import { hibaSzoveg } from './fuggveny.ts';
import type { CsomagKulcs } from '@config/szamlafolyo.ts';

/**
 * Az előfizetés indítása.
 *
 * # Miért csak egy link jön vissza
 *
 * Mert a böngésző **nem bizonyíték** a fizetésre. Ez a hívás egyetlen dolgot
 * kér: egy Stripe Checkout linket a választott csomagra. A cég számlázási
 * állapotát kizárólag a `stripe-webhook` írja, aláírás-ellenőrzés után — a
 * visszatérés a `success_url`-re csak annyit jelent, hogy a felhasználó
 * végigment az űrlapon.
 *
 * Ezért nem írunk itt semmit, és ezért nem is hisszük el a `?fizetes=kesz`
 * paramétert: az a képernyőn egy udvarias mondat, nem állapot.
 */

export type Indulas = { ok: true; url: string } | { ok: false; hiba: string };

export async function elofizetestIndit(csomag: CsomagKulcs): Promise<Indulas> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; hiba?: string }>(
    'stripe-checkout',
    { body: { csomag } },
  );

  if (error !== null) {
    const reszletek = await hibaSzoveg(error);

    return { ok: false, hiba: reszletek ?? 'A fizetés indítása nem sikerült.' };
  }

  if (data?.hiba !== undefined) {
    return { ok: false, hiba: data.hiba };
  }

  if (data?.url === undefined || data.url === '') {
    return { ok: false, hiba: 'A fizetés indítása nem sikerült.' };
  }

  return { ok: true, url: data.url };
}
