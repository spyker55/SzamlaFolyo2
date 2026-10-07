import { createClient } from '@supabase/supabase-js';
import { tarolasNelkul } from './tarolasNelkul.ts';

/**
 * A Supabase-kliens.
 *
 * A publikálható kulcs **nem titok**, és ez nem hanyagság: az adatot a Row
 * Level Security védi, nem a kulcs titokban tartása. Ha az RLS rossz, a kulcs
 * elrejtése sem segít — ha jó, a kulcs nyilvánossága nem árt.
 *
 * A `service_role` kulcs viszont megkerüli az RLS-t, ezért az kizárólag az Edge
 * Functionökben él, és soha nem kerül a böngészőbe.
 */
const url = import.meta.env['VITE_SUPABASE_URL'];
const kulcs = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

if (!url || !kulcs) {
  throw new Error(
    'Hiányzik a VITE_SUPABASE_URL vagy a VITE_SUPABASE_PUBLISHABLE_KEY. Másold le a .env.example fájlt .env néven.',
  );
}

export const supabase = createClient(url, kulcs, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // A munkamenet az URL-ből is felvehető: a jelszó-visszaállítás és a
    // meghívó elfogadása ilyen linkkel érkezik.
    detectSessionInUrl: true,
  },
  // Az adatbázis válasza sosem kerülhet a böngésző gyorsítótárába – egy
  // beragadt hibaválasz napokig üres listát mutatott (`tarolasNelkul.ts`). A
  // nyílfüggvény azért kell, hogy a `fetch` hívásidőben oldódjon fel.
  global: { fetch: tarolasNelkul((...a) => fetch(...a)) },
});
