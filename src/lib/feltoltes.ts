import { supabase } from './supabase.ts';
import { ellenoriz, MINTA_BAJT } from '@uzleti/fajltipus.ts';

/**
 * Egy fájl feltöltése.
 *
 * A sorrend szándékos: **előbb a tárolóba, utána az adatbázisba.** Fordítva egy
 * megszakadt feltöltés után maradna egy sor, ami nem létező fájlra mutat — a
 * Beérkező mutatná, a megnyitása viszont hibára futna. Így legrosszabb esetben
 * marad egy gazdátlan objektum a tárolóban, ami takarítható, és senkinek nem
 * hazudik semmit.
 *
 * Az oldalszám itt még nem derül ki: azt a kiolvasó Edge Function állapítja meg
 * a felderítés során. Addig `null`, és a kreditszabály szerint az egy kredit —
 * bizonytalanságból nem számlázunk többet.
 */

export type FeltoltesEredmeny =
  | { allapot: 'kesz'; dokumentumId: string }
  | { allapot: 'duplikatum' }
  | { allapot: 'hiba'; hiba: string };

export async function feltolt(fajl: File, cegId: string): Promise<FeltoltesEredmeny> {
  const puffer = await fajl.arrayBuffer();
  const bajtok = new Uint8Array(puffer);

  // A típus a **tartalomból** derül ki, nem a `fajl.type`-ból: az a böngésző
  // (illetve a feltöltő) állítása, nem tény.
  const vizsgalat = ellenoriz(bajtok.slice(0, MINTA_BAJT), fajl.size, fajl.name);

  if (!vizsgalat.ok) {
    return { allapot: 'hiba', hiba: vizsgalat.hiba };
  }

  const sha256 = await ujjlenyomat(puffer);

  // Duplikátumszűrés: azonos tartalom nem kerül be kétszer. Ilyenkor fel sem
  // töltjük még egyszer — a fájl már ott van, csak a bizonylat kap jelzést.
  const { data: meglevo } = await supabase
    .from('files')
    .select('id')
    .eq('sha256', sha256)
    .limit(1)
    .maybeSingle();

  if (meglevo !== null) {
    const { error } = await supabase.from('documents').insert({
      file_id: meglevo.id,
      status: 'duplikatum',
    });

    if (error !== null) {
      return { allapot: 'hiba', hiba: error.message };
    }

    return { allapot: 'duplikatum' };
  }

  const fajlId = crypto.randomUUID();
  const utvonal = `${cegId}/${fajlId}.${vizsgalat.tipus.kiterjesztes}`;

  const { error: tarolasiHiba } = await supabase.storage.from('bizonylatok').upload(utvonal, puffer, {
    // A tartalomból megállapított típussal töltjük fel, nem a kliensével.
    contentType: vizsgalat.tipus.mime,
    upsert: false,
  });

  if (tarolasiHiba !== null) {
    return { allapot: 'hiba', hiba: `A(z) „${fajl.name}" feltöltése nem sikerült.` };
  }

  const { error: fajlHiba } = await supabase.from('files').insert({
    id: fajlId,
    original_filename: fajl.name,
    mime_type: vizsgalat.tipus.mime,
    size_bytes: fajl.size,
    sha256,
    storage_path: utvonal,
    source: 'upload',
  });

  if (fajlHiba !== null) {
    return { allapot: 'hiba', hiba: fajlHiba.message };
  }

  // A bizonylat oldaltartomány nélkül indul: NULL–NULL azt jelenti, hogy a
  // bizonylat az egész fájl. Ha a kiolvasás több bizonylatot talál benne, ez a
  // sor kapja az elsőt, és mellé születnek a többiek.
  const { data: dokumentum, error: dokumentumHiba } = await supabase
    .from('documents')
    .insert({ file_id: fajlId, status: 'feltoltve' })
    .select('id')
    .single();

  if (dokumentumHiba !== null || dokumentum === null) {
    return { allapot: 'hiba', hiba: dokumentumHiba?.message ?? 'Ismeretlen hiba.' };
  }

  return { allapot: 'kesz', dokumentumId: dokumentum.id };
}

/** SHA-256 hexa alakban. A böngésző beépített kriptója adja, nincs hozzá könyvtár. */
async function ujjlenyomat(puffer: ArrayBuffer): Promise<string> {
  const kivonat = await crypto.subtle.digest('SHA-256', puffer);

  return [...new Uint8Array(kivonat)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
