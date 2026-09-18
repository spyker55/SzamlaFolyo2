import { supabase } from './supabase.ts';
import { osszesites, sor, type ExportBizonylat, type Osszesitesek } from '@uzleti/export/oszlopok.ts';
import { ir as csvIr } from '@uzleti/export/csv.ts';
import { ir as jsonIr } from '@uzleti/export/json.ts';
import { fajl as xlsxFajl } from '@uzleti/export/xlsx.ts';
import { egyediNev, zip, type ZipBejegyzes } from '@uzleti/export/zip.ts';
import { bizonylatFajlnev, exportFajlnev } from '@uzleti/export/nevek.ts';
import { ugyfele, ugyfelek, type UgyfelOpcio } from '@uzleti/export/ugyfel.ts';
import { nap } from '@uzleti/ido.ts';
import { naploz } from './naplo.ts';

/**
 * Az export adatrétege.
 *
 * A **sorrend kötött**, mert visszafordíthatatlan lépés van benne:
 *
 *   1. az export fájl elkészül és felkerül a tárolóba,
 *   2. a tételek egy tranzakcióban megkapják az `export_id`-t (`export_rogzit`),
 *   3. és **csak ezután** törlődnek az eredeti fájlok.
 *
 * Fordított sorrendben egy félbemaradt export után a bizonylat képe is odalenne,
 * és az adat is.
 */

export type Formatum = 'xlsx' | 'csv' | 'json';

export type Szurok = {
  tol: string;
  ig: string;
  tipus: string;
  ugyfel: string;
};

/** Amit a képernyő listáz és amiből az export sora összeáll. */
export type Tetel = ExportBizonylat & {
  id: string;
  file_id: string;
  /** A fájl adatai — az eredetik ZIP-jéhez és a selejtezéshez kell. */
  fajl: {
    original_filename: string | null;
    storage_path: string | null;
    file_deleted_at: string | null;
    source: string | null;
    size_bytes: number | null;
  } | null;
};

const MEZOK = [
  'id',
  'file_id',
  'doc_type',
  'supplier_name',
  'supplier_tax_number',
  'customer_name',
  'customer_tax_number',
  'doc_number',
  'issue_date',
  'fulfillment_date',
  'due_date',
  'payment_method',
  'currency',
  'net_amount',
  'vat_amount',
  'gross_amount',
  'fizetendo',
  'afa_bontas',
  'note',
  'created_at',
  'oldal_tol',
  'oldal_ig',
].join(', ');

const FAJL_MEZOK = 'files(original_filename, storage_path, file_deleted_at, source, size_bytes)';

/**
 * A jóváhagyott, még nem exportált tételek.
 *
 * Az időszak **budapesti napokra** szól, a `created_at` viszont UTC. A kettőt
 * nem próbáljuk lekérdezésben összeegyeztetni (a nyári időszámítás miatt az
 * eltolás nem állandó): egy napnyi ráhagyással kérdezünk, és a széleket
 * memóriában vágjuk le a már tesztelt `nap()`-pal.
 *
 * ⚠️ Az **ügyfélszűrő nincs benne**, és ez nem lustaság: a választható ügyfelek
 * listája ebből a halmazból áll össze. Ha az ügyfélre szűrt halmazból állna,
 * akkor egy kiválasztott ügyfél után a többi eltűnne a listából, és csak a
 * „Mind"-en keresztül lehetne visszajutni hozzájuk. A szűrést ezért a képernyő
 * végzi, memóriában — a halmaz amúgy is ott van, mert az összesítés és maga az
 * export is ezt kapja.
 */
export async function exportalhatok(szurok: Szurok): Promise<Tetel[]> {
  let kerdes = supabase
    .from('documents')
    .select(`${MEZOK}, ${FAJL_MEZOK}`)
    .eq('status', 'jovahagyva')
    .is('export_id', null)
    .order('issue_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (szurok.tipus !== '') {
    kerdes = kerdes.eq('doc_type', szurok.tipus);
  }

  // Egy napnyi ráhagyás mindkét irányban: a pontos vágás a `naponBelul()`
  // dolga, ez a szűkítés csak azért van, hogy ne az egész előzményt kérdezzük le.
  if (szurok.tol !== '') {
    kerdes = kerdes.gte('created_at', `${eltol(szurok.tol, -1)}T00:00:00Z`);
  }

  if (szurok.ig !== '') {
    kerdes = kerdes.lte('created_at', `${eltol(szurok.ig, 1)}T23:59:59.999Z`);
  }

  const { data } = await kerdes;

  const tetelek = ((data ?? []) as unknown as Record<string, unknown>[]).map((nyers) => {
    // A beágyazott relációt a PostgREST objektumként adja vissza, generált
    // típusok nélkül viszont a supabase-js tömbnek tippeli. Mindkettőt
    // elviseljük.
    const fajlNyers = Array.isArray(nyers['files']) ? nyers['files'][0] : nyers['files'];
    const fajl = (fajlNyers ?? null) as Tetel['fajl'];

    return { ...nyers, fajl, forras: fajl?.source ?? null } as unknown as Tetel;
  });

  return tetelek.filter((t) => naponBelul(t.created_at ?? null, szurok.tol, szurok.ig));
}

/** Az ügyfélszűrő — a törzsszám dönt, és mindkét oldal beleszámít. */
export function ugyfelre(tetelek: readonly Tetel[], torzsszam: string): Tetel[] {
  if (torzsszam === '') {
    return [...tetelek];
  }

  return tetelek.filter((t) => ugyfele(t, torzsszam));
}

/** A választható ügyfelek — **az ügyfélszűrő előtti** halmazból. */
export function ugyfelLista(idoszak: readonly Tetel[]): UgyfelOpcio[] {
  return ugyfelek(idoszak);
}

/** Egy `YYYY-MM-DD` nap eltolása napokkal. Az UTC-s számolás itt elég: a
 *  ráhagyás miatt a nyári időszámítás fél órája sem számít. */
function eltol(napSzoveg: string, nappal: number): string {
  const d = new Date(`${napSzoveg}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + nappal);
  return d.toISOString().slice(0, 10);
}

function naponBelul(created: string | null, tol: string, ig: string): boolean {
  const n = nap(created);

  if (n === null) {
    return true;
  }

  return (tol === '' || n >= tol) && (ig === '' || n <= ig);
}

/** A képernyő összefoglalója: hány tétel, és pénznemenként mennyi. */
export function osszefoglalo(tetelek: readonly Tetel[]): {
  darab: number;
  osszesites: Osszesitesek;
} {
  return { darab: tetelek.length, osszesites: osszesites(tetelek) };
}

// ---------------------------------------------------------------------------
// Az export elkészítése
// ---------------------------------------------------------------------------

export type ExportEredmeny = {
  ok: boolean;
  hiba?: string;
  exportId?: string;
  fajlnev?: string;
  /** A kész fájl — a böngésző azonnal le is tölti, nem kell érte az Archívumba. */
  blob?: Blob;
  /** Hány eredeti fájl törlődött a tárolóból. */
  toroltFajlok?: number;
};

const MIME: Record<Formatum, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  json: 'application/json',
};

export async function keszit(
  tetelek: readonly Tetel[],
  formatum: Formatum,
  szurok: Szurok,
  // A `file_retention_days` **szándékosan nincs itt**: a megőrzési időt a
  // szerver mérlegeli (`belso.selejtezheto`), és ha ez a függvény kérné, azzal
  // azt sugallná, hogy a döntés itt születik. Egyszer már itt született, és
  // pont ez volt a baj.
  ceg: { id: string; name: string },
): Promise<ExportEredmeny> {
  if (tetelek.length === 0) {
    return { ok: false, hiba: 'Ebben az időszakban nincs exportálható tétel.' };
  }

  const sorok = tetelek.map((t) => sor(t));
  const fajlnev = exportFajlnev(ceg.name, formatum, new Date());
  const bajtok = await tartalom(formatum, sorok, {
    ceg: ceg.name,
    keszult: new Date().toISOString(),
    darab: tetelek.length,
    osszesites: osszesites(tetelek),
  });

  const utvonal = `${ceg.id}/${crypto.randomUUID()}-${fajlnev}`;
  const blob = new Blob([bajtok as BlobPart], { type: MIME[formatum] });

  // 1. lépés: a fájl. Amíg ez nincs meg, semmit nem jelölünk át.
  const { error: tarolasiHiba } = await supabase.storage
    .from('exportok')
    .upload(utvonal, blob, { contentType: MIME[formatum], upsert: false });

  if (tarolasiHiba !== null) {
    return { ok: false, hiba: `Az export fájl feltöltése nem sikerült: ${tarolasiHiba.message}` };
  }

  // 2. lépés: az átjelölés — egyetlen tranzakcióban, a darabszám ellenőrzésével.
  const { data, error } = await supabase.rpc('export_rogzit', {
    formatum,
    szurok: szurok as unknown as Record<string, string>,
    fajl_utvonal: utvonal,
    fajl_nev: fajlnev,
    fajl_bajt: bajtok.length,
    dokumentum_idk: tetelek.map((t) => t.id),
  });

  if (error !== null || data === null) {
    // A feltöltött fájl gazdátlan maradt: takarítjuk, amennyire a jogosultság
    // engedi. Ha nem megy, az sem baj — egy gazdátlan objektum takarítható, és
    // nem hazudik senkinek.
    void supabase.storage.from('exportok').remove([utvonal]);

    return { ok: false, hiba: error?.message ?? 'Az export rögzítése nem sikerült.' };
  }

  const eredmeny = data as { export_id: string; darab: number; torolheto: TorolhetoFajl[] };

  // 3. lépés: az eredeti fájlok.
  //
  // A türelmi időt **nem itt** mérlegeljük: a `torolheto` lista már csak azt
  // tartalmazza, ami tényleg esedékes (`belso.selejtezheto`). Korábban itt állt
  // egy `if (megorzesiNapok > 0) return 0`, és az volt a hiba forrása — a
  // böngésző csak akkor fut, ha valaki épp nézi, tehát türelmi idő mellett a
  // fájl **soha** nem törlődött. Most a szerver dönt, és a napi selejtező viszi
  // el azt, ami később válik esedékessé.
  const torolt = await eredetiketTorol(eredmeny.torolheto);

  return {
    ok: true,
    exportId: eredmeny.export_id,
    fajlnev,
    blob,
    toroltFajlok: torolt,
  };
}

async function tartalom(
  formatum: Formatum,
  sorok: Record<string, unknown>[],
  meta: Record<string, unknown>,
): Promise<Uint8Array> {
  if (formatum === 'xlsx') {
    return xlsxFajl(sorok);
  }

  const szoveg = formatum === 'csv' ? csvIr(sorok) : jsonIr(sorok, meta);

  return new TextEncoder().encode(szoveg);
}

// ---------------------------------------------------------------------------
// Az eredeti fájlok
// ---------------------------------------------------------------------------

export type TorolhetoFajl = { id: string; storage_path: string };

/**
 * A törlés sorrendje, és miért ez:
 *
 *   1. `file_deleted_at` (a `storage_path` **marad**),
 *   2. a tárolóból törlés,
 *   3. `storage_path := null`.
 *
 * Egy megszakadt törlés után a sor `file_deleted_at is not null and
 * storage_path is not null` állapotban áll — ami **pontosan a befejezetlen
 * munka listája**, és a felület már az első lépéstől helyesen mondja, hogy a
 * kép nem hívható vissza. Fordított sorrendben a mutató veszne el a bájtok
 * előtt, és a fájl kitakaríthatatlanul ott maradna.
 */
async function eredetiketTorol(torolheto: readonly TorolhetoFajl[]): Promise<number> {
  if (torolheto.length === 0) {
    return 0;
  }

  const idk = torolheto.map((f) => f.id);

  await supabase.from('files').update({ file_deleted_at: new Date().toISOString() }).in('id', idk);

  const { error } = await supabase.storage
    .from('bizonylatok')
    .remove(torolheto.map((f) => f.storage_path));

  if (error !== null) {
    // A sorok már jelölve vannak: a következő megnyitás befejezi.
    return 0;
  }

  await supabase.from('files').update({ storage_path: null }).in('id', idk);

  return idk.length;
}

/**
 * A félbemaradt selejtezés befejezése.
 *
 * Az Export képernyő megnyitásakor fut. Amit egy megszakadt előző kör jelölt,
 * de nem törölt, azt itt fejezzük be — csendben, mert a felhasználó felé már az
 * előző körben is az volt az igazság, hogy a kép nincs meg.
 */
export async function selejtezestBefejez(): Promise<number> {
  const { data } = await supabase
    .from('files')
    .select('id, storage_path')
    .not('file_deleted_at', 'is', null)
    .not('storage_path', 'is', null)
    .limit(100);

  const fajlok = (data ?? []) as { id: string; storage_path: string }[];

  if (fajlok.length === 0) {
    return 0;
  }

  const { error } = await supabase.storage
    .from('bizonylatok')
    .remove(fajlok.map((f) => f.storage_path));

  if (error !== null) {
    return 0;
  }

  await supabase
    .from('files')
    .update({ storage_path: null })
    .in(
      'id',
      fajlok.map((f) => f.id),
    );

  return fajlok.length;
}

/**
 * Az eredeti bizonylatok ZIP-ben.
 *
 * Tömörítés nélkül (STORE): a PDF és a JPEG már tömörített, a deflate csak
 * CPU-t égetne. A ZIP a böngésző memóriájában áll össze — ezért mondja meg a
 * képernyő a méretet, mielőtt valaki rákattint.
 */
export async function eredetikZip(tetelek: readonly Tetel[]): Promise<Blob | null> {
  const bejegyzesek: ZipBejegyzes[] = [];
  const hasznalt = new Set<string>();

  for (const tetel of tetelek) {
    const utvonal = tetel.fajl?.storage_path ?? null;

    if (utvonal === null || tetel.fajl?.file_deleted_at != null) {
      continue;
    }

    const { data } = await supabase.storage.from('bizonylatok').download(utvonal);

    if (data === null) {
      continue;
    }

    bejegyzesek.push({
      nev: egyediNev(
        bizonylatFajlnev(tetel.doc_number, tetel.fajl?.original_filename, tetel.id),
        hasznalt,
      ),
      tartalom: new Uint8Array(await data.arrayBuffer()),
    });
  }

  if (bejegyzesek.length === 0) {
    return null;
  }

  return new Blob([(await zip(bejegyzesek)) as BlobPart], { type: 'application/zip' });
}

/** Az eredetik becsült mérete — a gombra kiírva, mert a ZIP a memóriában készül. */
export function eredetikMerete(tetelek: readonly Tetel[]): number {
  const fajlok = new Map<string, number>();

  for (const tetel of tetelek) {
    if (tetel.fajl?.storage_path != null && tetel.fajl.file_deleted_at == null) {
      // Egy köteg minden bizonylata ugyanarra a fájlra mutat: egyszer számít.
      fajlok.set(tetel.file_id, tetel.fajl.size_bytes ?? 0);
    }
  }

  return [...fajlok.values()].reduce((ossz, m) => ossz + m, 0);
}

// ---------------------------------------------------------------------------
// Archívum
// ---------------------------------------------------------------------------

export type ExportSor = {
  id: string;
  format: string;
  filters: Record<string, string> | null;
  item_count: number;
  file_name: string;
  file_path: string | null;
  /**
   * Mikor járt le a fájl 30 napos megőrzése, vagy `null`, ha még él.
   *
   * ⚠️ Nem ugyanaz, mint a `file_path === null`: a selejtezés három lépése
   * között (jelöl → tárolóból töröl → mutatót ürít) a sor rövid ideig
   * **jelölt, de még van útvonala**. A felület ilyenkor is a lejáratot
   * mutassa, ne egy letöltést, ami a következő pillanatban elhasal.
   */
  file_deleted_at: string | null;
  file_bytes: number;
  created_at: string;
  /** Hány tétel tartozik hozzá **most** — a visszahívás után ez kevesebb lehet. */
  jelenlegi: number;
};

export async function exportok(): Promise<ExportSor[]> {
  const { data } = await supabase
    .from('exports')
    .select(
      'id, format, filters, item_count, file_name, file_path, file_deleted_at, file_bytes, created_at, documents(count)',
    )
    .order('created_at', { ascending: false })
    .limit(50);

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((nyers) => {
    const szamlalo = nyers['documents'];
    const jelenlegi = Array.isArray(szamlalo)
      ? ((szamlalo[0] as { count?: number } | undefined)?.count ?? 0)
      : 0;

    return { ...nyers, jelenlegi } as unknown as ExportSor;
  });
}

/** Rövid életű, aláírt URL az export fájlhoz — a bucket privát. */
export async function exportUrl(utvonal: string | null): Promise<string | null> {
  if (utvonal === null) {
    return null;
  }

  const { data } = await supabase.storage.from('exportok').createSignedUrl(utvonal, 5 * 60);

  return data?.signedUrl ?? null;
}

export async function exportTetelei(exportId: string): Promise<Tetel[]> {
  const { data } = await supabase
    .from('documents')
    .select(`${MEZOK}, ${FAJL_MEZOK}`)
    .eq('export_id', exportId)
    .order('issue_date', { ascending: true, nullsFirst: false });

  return (data ?? []) as unknown as Tetel[];
}

/**
 * Visszahívás a Tételek közé.
 *
 * Az `item_count` **nem** változik: az azt rögzíti, mi került bele az exportba,
 * és ez utólag is igaz marad. A képernyő a jelenlegi darabszámot külön mutatja.
 */
export async function visszahiv(dokumentumId: string): Promise<{ ok: boolean; hiba?: string }> {
  const { error } = await supabase
    .from('documents')
    .update({ status: 'jovahagyva', export_id: null })
    .eq('id', dokumentumId)
    .eq('status', 'exportalva');

  if (error !== null) {
    return { ok: false, hiba: error.message };
  }

  // ⚠️ Enélkül a művelet **nyomtalan** volt, és ez bosszantóan félrevezetett:
  // egy visszahívott tétel után az export `item_count`-ja nem egyezik a
  // rámutató bizonylatok számával, ami adatromlásnak látszik. Nem az — de
  // eddig semmi nem mondta meg, hogy mi történt.
  //
  // Ez egyben a selejtezésnek is számít: a türelmi idő a **legkésőbbi**
  // exporttól ketyeg, tehát a visszahívás és az újraexportálás újraindítja az
  // órát az eredeti fájlon.
  await naploz('export.visszahivas', {
    subject_type: 'document',
    subject_id: dokumentumId,
    summary: 'Tétel visszahívva a Tételek közé.',
  });

  return { ok: true };
}

/** Letöltés a böngészőben. Az `URL.revokeObjectURL` nélkül a blob a lapon ragad. */
export function letolt(blob: Blob, fajlnev: string): void {
  const url = URL.createObjectURL(blob);
  const elem = document.createElement('a');

  elem.href = url;
  elem.download = fajlnev;
  document.body.appendChild(elem);
  elem.click();
  elem.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
