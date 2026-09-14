import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { szolgaltatasSzerep } from '../../../shared/uzleti/token.ts';

/**
 * Az eredeti fájlok selejtezése.
 *
 * # Miért külön függvény, és miért nem a `kiolvas`-ban
 *
 * Mert semmi köze hozzá. A `kiolvas` huszonnégy fájlból csomagolt, 41 kB-os
 * artefakt (`unpdf`, `fast-xml-parser`, a teljes `shared/uzleti`), és a
 * telepítése ma a legkockázatosabb lépésünk — egyszer már öt percre megállította
 * a feldolgozást. Ez a függvény ezzel szemben **egyetlen kis fájl**: a
 * `shared/uzleti`-ből csak a token-olvasót hozza, minden más az adatbázisé.
 * Csomagoló nem kell hozzá.
 *
 * # Mit csinál, és mit nem
 *
 * A **szabály nincs benne.** Azt a `belso.selejtezheto()` mondja ki az
 * adatbázisban, és ugyanazt hívja az `export_rogzit` is — így az azonnali és a
 * türelmi idős törlés nem tud széttartani. Ez a függvény csak azt teszi, amit
 * SQL-ből nem lehet: **kitörli a bájtokat a tárolóból.**
 *
 * ⚠️ `service_role`-lal fut, tehát megkerüli az RLS-t. Cégek fölött dolgozik,
 * ezért csak belső hívásból indítható.
 */

Deno.serve(async (keres: Request): Promise<Response> => {
  const fejlec = keres.headers.get('Authorization') ?? '';

  if (!szolgaltatasKulcs(fejlec)) {
    return valasz({ hiba: 'A selejtezés csak belső hívásból indítható.' }, 403);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Először a félbemaradt munka, utána az újonnan esedékes. Ebben a sorrendben,
  // mert a félbemaradt sorokról a felület **már most is azt mondja**, hogy a
  // kép nincs meg — az az adósság, nem az új feladat.
  const befejezett = await befejez(db);
  const ujak = await esedekeseket(db);

  return valasz({ befejezett, selejtezett: ujak }, 200);
});

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Szolgáltatás-jogosultsággal érkezett-e a hívás.
 *
 * Ugyanaz a két út, mint a `kiolvas`-ban, ugyanabból az okból: a sztring-egyezés
 * a legszigorúbb, de **önmagában elbukott élesben** — a projekt új formátumú
 * API-kulcsokat is használ, és a befecskendezett érték nem ugyanaz a betűsor,
 * mint a dashboardon álló, örökölt `service_role` JWT. A második út ezért a
 * token `role` állítása, amit a platform a `verify_jwt: true` miatt már
 * hitelesített.
 */
function szolgaltatasKulcs(fejlec: string): boolean {
  const kulcs = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (kulcs !== '' && fejlec === `Bearer ${kulcs}`) {
    return true;
  }

  return szolgaltatasSzerep(fejlec);
}

type Fajl = { id: string; company_id: string; storage_path: string };

/**
 * Az esedékes fájlok elvitele.
 *
 * A lépések sorrendje kötött, és az indoka ugyanaz, mint a kliensoldali
 * párjáé (`src/lib/export.ts`):
 *
 *   1. `file_deleted_at` (a `storage_path` **marad**),
 *   2. a tárolóból törlés,
 *   3. `storage_path := null`.
 *
 * Egy megszakadt futás után a sor `file_deleted_at is not null and storage_path
 * is not null` állapotban áll — ami **pontosan a befejezetlen munka listája**,
 * és a felület már az első lépéstől helyesen mondja, hogy a kép nem hívható
 * vissza. Fordított sorrendben a mutató veszne el a bájtok előtt, és a fájl
 * kitakaríthatatlanul ott maradna.
 */
async function esedekeseket(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc('selejtezendo_fajlok');

  if (error !== null) {
    return 0;
  }

  const fajlok = (data ?? []) as Fajl[];

  if (fajlok.length === 0) {
    return 0;
  }

  const idk = fajlok.map((f) => f.id);

  await db
    .from('files')
    .update({ file_deleted_at: new Date().toISOString() })
    .in('id', idk);

  const torolt = await bajtokatTorol(db, fajlok);

  // A naplóba cégenként egy sor kerül, nem fájlonként: a könyvelőt az érdekli,
  // hogy aznap mi ment el, nem a huszonhét azonosító.
  for (const [ceg, darab] of cegenkent(fajlok)) {
    await db.from('activity_log').insert({
      company_id: ceg,
      action: 'fajl.selejtezve',
      subject_type: 'file',
      summary: `${darab} eredeti fájl törölve a megőrzési idő lejártával.`,
      context: { darab },
    });
  }

  return torolt;
}

/**
 * A félbemaradt selejtezés befejezése.
 *
 * Amit egy megszakadt előző kör (vagy a böngésző) jelölt, de nem törölt, azt
 * itt fejezzük be — csendben, mert a felhasználó felé már az előző körben is az
 * volt az igazság, hogy a kép nincs meg.
 */
async function befejez(db: SupabaseClient): Promise<number> {
  const { data } = await db
    .from('files')
    .select('id, company_id, storage_path')
    .not('file_deleted_at', 'is', null)
    .not('storage_path', 'is', null)
    .limit(200);

  const fajlok = (data ?? []) as Fajl[];

  if (fajlok.length === 0) {
    return 0;
  }

  return bajtokatTorol(db, fajlok);
}

/** A 2. és 3. lépés: a tárolóból törlés, majd a mutató kiürítése. */
async function bajtokatTorol(db: SupabaseClient, fajlok: readonly Fajl[]): Promise<number> {
  const { error } = await db.storage.from('bizonylatok').remove(fajlok.map((f) => f.storage_path));

  if (error !== null) {
    // A sorok már jelölve vannak: a következő futás befejezi. Nem hibázunk el
    // egy egész kört egy tárolóhiba miatt.
    return 0;
  }

  await db
    .from('files')
    .update({ storage_path: null })
    .in(
      'id',
      fajlok.map((f) => f.id),
    );

  return fajlok.length;
}

/** Cégenkénti darabszám, a naplóbejegyzésekhez. */
function cegenkent(fajlok: readonly Fajl[]): Map<string, number> {
  const szamlalo = new Map<string, number>();

  for (const fajl of fajlok) {
    szamlalo.set(fajl.company_id, (szamlalo.get(fajl.company_id) ?? 0) + 1);
  }

  return szamlalo;
}
