import { supabase } from './supabase.ts';

/**
 * Naplóbejegyzés a tevékenységnaplóba.
 *
 * # Miért kell ez külön
 *
 * Mert a napló eddig **hiányos** volt: csak az export írt bele
 * (`export_rogzit`). Emiatt nézett ki adatromlásnak az, hogy egy export
 * `item_count`-ja nem egyezik a rámutató bizonylatok számával — pedig csak
 * valaki visszahívott egy tételt az Archívumból. A művelet megtörtént, nyoma
 * nem maradt.
 *
 * # Amit nem kell megadni
 *
 * A `company_id`-t **trigger tölti** (`belso.tolti_company_id`), a
 * `belso.aktualis_ceg()` alapján — vagyis nem a kliens állítása dönti el,
 * melyik cég naplójába kerül a sor. A `user_id` a helyi munkamenetből jön,
 * hálózati kérés nélkül.
 *
 * ⚠️ A napló **hozzáfűzhető, de nem írható át**: az `activity_log`-on csak
 * SELECT és INSERT politika van. Ez szándékos — egy átírható napló nem napló.
 *
 * Hibát **nem dob és nem jelez**: egy meghiúsult naplózás soha ne akadályozza
 * meg magát a műveletet. A hívó dolga a művelet, nem a könyvelése.
 */
export async function naploz(
  action: string,
  mezok: {
    subject_type?: string;
    subject_id?: string;
    summary?: string;
    context?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const { data } = await supabase.auth.getSession();

  await supabase
    .from('activity_log')
    .insert({ action, user_id: data.session?.user.id ?? null, ...mezok });
}
