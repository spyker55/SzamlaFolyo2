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
    // Megkeressük, **minek** a duplikátuma. A `duplicate_of_id` oszlop pont
    // erre való, és sokáig kitöltetlen maradt: a sor tudta, hogy fölösleges,
    // csak azt nem, hogy mi helyett az.
    //
    // A `status <> 'duplikatum'` szűrő nem apróság: enélkül egy harmadik
    // feltöltés a **második** duplikátumra mutatna, és a lánc végén senki nem
    // találná meg az igazi bizonylatot. Rendezés a legkorábbira, mert az az
    // eredeti.
    const { data: eredeti } = await supabase
      .from('documents')
      .select('id')
      .eq('file_id', meglevo.id)
      .neq('status', 'duplikatum')
      .order('created_at')
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from('documents').insert({
      file_id: meglevo.id,
      status: 'duplikatum',
      // Ha az eredetit időközben törölték, marad `null` — a sor akkor is
      // igazat mond: a fájl bent van, csak nincs mire mutatni.
      duplicate_of_id: eredeti?.id ?? null,
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

  // Az élő utat a feltöltés utáni közvetlen hívás hajtja; az elakadt és a
  // félbemaradt futásokat a pg_cron szedi fel. **Nem várjuk meg**: a kiolvasás
  // másodpercekig tart, a felhasználónak viszont azonnal látnia kell a sorban a
  // bizonylatot. A Beérkező úgyis frissít, amíg van feldolgozandó.
  //
  // A hiba nem állítja meg a feltöltést, és ez szándékos: ha az indítás nem megy
  // át, a dokumentum `feltoltve` állapotban marad, és a cron felveszi. A
  // feltöltés maga sikeres volt — nem szabad hibának látszania.
  //
  // ⚠️ **De nem nyeljük el némán, és ennek ára volt.** Korábban itt egy
  // `.catch(() => undefined)` állt, és emiatt hónapokig észrevétlen maradt,
  // hogy ez a hívás **soha nem ment át**: a `kiolvas` függvényből hiányzott a
  // CORS-elővizsgálat kezelése, tehát a böngésző el sem küldte a POST-ot. A
  // bizonylatok ugyanúgy elkészültek — csak nem azonnal, hanem a következő
  // percfordulón, átlagosan ötven másodperc várakozás után.
  //
  // A tartalék út léte nem ok arra, hogy ne tudjuk, mikor van rá szükség.
  void supabase.functions
    .invoke('kiolvas', { body: { dokumentum_id: dokumentum.id } })
    .catch((hiba: unknown) => {
      console.error(
        'A kiolvasás közvetlen indítása nem sikerült — a bizonylat a következő percfordulón indul.',
        hiba,
      );
    });

  return { allapot: 'kesz', dokumentumId: dokumentum.id };
}

/**
 * Egy duplikátumsor elvetése.
 *
 * A duplikátum **üzenet, nem bizonylat**: azt mondja meg, hogy ezt a fájlt már
 * feltöltötted egyszer. Amíg egy kötegnél hasznos látni, mit hagyott ki a
 * rendszer, egy véletlen dupla behúzás után már csak zaj — és eddig nem volt
 * mód megszabadulni tőle.
 *
 * ⚠️ A `status` feltétel a lekérdezésben van, nem csak a hívó oldalán: így egy
 * elgépelt azonosító **nem tud** valódi bizonylatot törölni. Ez nem biztonsági
 * határ — az az RLS —, hanem az a fajta öv, ami mellé a nadrágtartó is jár.
 *
 * A fájlhoz nem nyúlunk: az az **eredeti** bizonylaté, nem ezé a soré.
 */
export async function duplikatumotElvet(dokumentumId: string): Promise<{ ok: boolean; hiba?: string }> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', dokumentumId)
    .eq('status', 'duplikatum');

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

/**
 * Egy végleg elbukott bizonylat kézi újraindítása.
 *
 * 2026-09-23-ig a `hiba` állapotú sor zsákutca volt a Beérkezőben: se
 * újrapróbálni, se eltüntetni nem lehetett. A leggyakoribb oka pedig
 * átmeneti – a modell szolgáltatójának túlterhelése (429) –, amin egy
 * későbbi próba átmegy.
 *
 * ⚠️ **A kísérletszámláló nullázódik**, és ez nem kényelem: a cron csak a
 * `maxProbalkozas` alatti sorokat veszi fel. Nullázás nélkül, ha az alábbi
 * közvetlen indítás nem megy át, a sor örökre `feltoltve` állna, és senki
 * nem venné fel. Így ugyanaz a háló viszi, mint egy friss feltöltést (azonnali
 * második kísérlet, cron). A hibás kísérlet keretet nem fogyaszt.
 *
 * A `status` feltétel a lekérdezésben van: egy közben másképp alakult sort
 * (például egy másik felhasználó már elvetette) nem indít újra.
 */
export async function hibasatUjraindit(dokumentumId: string): Promise<{ ok: boolean; hiba?: string }> {
  const { data, error } = await supabase
    .from('documents')
    .update({ status: 'feltoltve', attempts: 0, error: null, claimed_at: null })
    .eq('id', dokumentumId)
    .eq('status', 'hiba')
    .select('id')
    .maybeSingle();

  if (error !== null) {
    return { ok: false, hiba: error.message };
  }

  if (data === null) {
    return { ok: false, hiba: 'Ez a bizonylat közben már nem hibás állapotú.' };
  }

  void supabase.functions
    .invoke('kiolvas', { body: { dokumentum_id: dokumentumId } })
    .catch((hiba: unknown) => {
      console.error(
        'Az újraindítás közvetlen hívása nem sikerült – a bizonylat a következő percfordulón indul.',
        hiba,
      );
    });

  return { ok: true };
}

/**
 * Egy végleg elbukott bizonylat elvetése.
 *
 * A fájlhoz itt nem nyúlunk: egy köteg darabjai közös fájlon osztoznak, és a
 * testvérek még használhatják. Ha ez volt a fájl utolsó bizonylata, a fájl
 * gazdátlan marad, és a napi selejtezés egy nap múlva elviszi
 * (`20260923000900_gazdatlan_fajlok.sql`).
 */
export async function hibasatElvet(dokumentumId: string): Promise<{ ok: boolean; hiba?: string }> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', dokumentumId)
    .eq('status', 'hiba');

  return error === null ? { ok: true } : { ok: false, hiba: error.message };
}

/** SHA-256 hexa alakban. A böngésző beépített kriptója adja, nincs hozzá könyvtár. */
async function ujjlenyomat(puffer: ArrayBuffer): Promise<string> {
  const kivonat = await crypto.subtle.digest('SHA-256', puffer);

  return [...new Uint8Array(kivonat)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
