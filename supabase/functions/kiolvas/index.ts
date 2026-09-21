import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { szamlafolyo } from '../../../config/szamlafolyo.ts';
import { bizonylatOldalszama, feldolgoz as lancotFuttat } from '../../../shared/uzleti/lanc.ts';
import { kiolvas, KiolvasasHiba, szetszed } from '../../../shared/uzleti/openrouter.ts';
import { hatarokErtelmez, type Hatar } from '../../../shared/uzleti/koteg.ts';
import { xmlbolKiolvas } from '../../../shared/uzleti/xml/beolvasas.ts';
import { szolgaltatasSzerep } from '../../../shared/uzleti/token.ts';
import { keretAllapot, type CegAllapot } from '../../../shared/uzleti/keret.ts';

import { felderit, igenyelModellt, naplo } from './felderites.ts';
import { oldaltartomany } from './pdf.ts';
import { elozmenyt } from './elozmeny.ts';

/**
 * A kiolvasó.
 *
 * A lánc: **keretellenőrzés → claim → felderítés → kötegszétszedés → XML-ág
 * vagy modellhívás → tisztítás → normalizálás → validátorok → konfidencia →
 * kapuk → állapot + kredit.**
 *
 * A keretellenőrzés a claim **előtt** áll, és ez nem stiláris: a claim növeli
 * az `attempts`-et, három próbálkozás után a bizonylat `hiba` lesz. Ha a fék a
 * claim után állna, egy elfogyott keret három perc alatt tönkretenné az összes
 * várakozó iratot — pedig az nem a bizonylat hibája.
 *
 * A claim egyetlen feltételes `UPDATE`: aki elsőnek írja át az állapotot, azé a
 * munka. Nem kell hozzá sorzár, és két párhuzamos hívás sem tudja ugyanazt az
 * iratot kétszer feldolgozni. A logika a régi `Sorkezelo`-ből jön — az jó volt,
 * csak a kényszer tűnt el mögüle (osztott tárhelyen nem volt hova workert tenni).
 *
 * ⚠️ Ez a függvény `service_role`-lal fut, tehát **megkerüli az RLS-t**. Minden
 * lekérdezés kézzel szűr `company_id`-re; itt nincs mögöttes háló.
 */

/**
 * CORS — és ez a függvény **hónapokig** hiányzott innen, csendben.
 *
 * A `kiolvas`-t nem csak a cron hívja: a feltöltés után a böngésző is elindítja
 * közvetlenül (`src/lib/feltoltes.ts`), hogy ne kelljen a következő percfordulóra
 * várni. Egy böngészőből hívott, `verify_jwt = true` mögötti függvény viszont
 * **elővizsgálatot** (`OPTIONS`) kap előbb, és arra a böngésző soha nem küld
 * `Authorization` fejlécet. Ha a függvény nem válaszol rá CORS-fejlécekkel, az
 * elővizsgálat elbukik, és **a POST el sem indul**.
 *
 * ⚠️ A tünet pontosan az a fajta, amit ebben a projektben végig irtottunk: nem
 * hibaüzenet keletkezett, hanem *majdnem működés*. A bizonylat ugyanúgy
 * feldolgozódott — csak nem azonnal, hanem amikor a percenkénti cron felszedte.
 * Mérve: két független feltöltés, mindkettő a cron percfordulóján indult
 * (03:08:00 és 18:33:00), átlagosan **kb. 50 másodperc várakozás** a semmiért.
 *
 * Azért maradhatott ennyi ideig észrevétlen, mert a hívó oldal a hibát
 * szándékosan elnyelte (`.catch(() => undefined)`). Az elnyelés indoka jó volt
 * — a feltöltés sikerült, nem szabad hibának látszania —, de néma is lett tőle.
 * A `feltoltes.ts` ezért mostantól legalább a konzolra kiírja.
 *
 * A repó minden böngészőből hívott függvényében ott van ez a blokk
 * (`stripe-checkout`, `stripe-portal`, `meghivo-kuld`, `meghivo-fiok`,
 * `fiok-torles`); a `kiolvas` volt az egyetlen kivétel. A `selejtez` és az
 * `email-bekuldes` helyesen nem tartalmazza: azokat nem böngésző hívja.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (keres: Request): Promise<Response> => {
  if (keres.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  let torzs: { dokumentum_id?: string; limit?: number };
  try {
    torzs = (await keres.json()) as typeof torzs;
  } catch {
    torzs = {};
  }

  const fejlec = keres.headers.get('Authorization') ?? '';

  let azonositok: string[];

  if (torzs.dokumentum_id) {
    // ⚠️ A függvény `service_role`-lal dolgozik, tehát megkerüli az RLS-t. Ha
    // a hívó azonosítót ad, **az ő jogosultságával kell ellenőrizni**, hogy
    // hozzáférhet-e ehhez a dokumentumhoz — különben bármely belépett
    // felhasználó elindíthatná más cég bizonylatának feldolgozását, és a
    // költséget is más cég keretére terhelné.
    //
    // A `service_role` hívó (a cron) ezen a vizsgálaton automatikusan átmegy,
    // mert rá nem vonatkozik az RLS. Egy kódút, két hívótípus.
    if (!(await lathatja(url, fejlec, torzs.dokumentum_id))) {
      return valasz({ hiba: 'Nincs jogosultságod ehhez a bizonylathoz.' }, 403);
    }

    azonositok = [torzs.dokumentum_id];
  } else {
    // A kötegelt futás a soron megy végig, tehát cégek fölött dolgozik: ezt
    // csak a `service_role` (a cron) hívhatja.
    if (!szolgaltatasKulcs(fejlec)) {
      return valasz({ hiba: 'A kötegelt feldolgozás csak belső hívásból indítható.' }, 403);
    }

    azonositok = await felvehetok(db, Math.min(torzs.limit ?? 5, 20));
  }

  const eredmenyek: Record<string, string>[] = [];

  for (const id of azonositok) {
    eredmenyek.push(await feldolgoz(db, id));
  }

  return valasz({ feldolgozva: eredmenyek }, 200);
});

function valasz(test: unknown, statusz: number): Response {
  return new Response(JSON.stringify(test), {
    status: statusz,
    // A CORS-fejléc a **hibaválaszokon is** kell, nem csak a 200-on: enélkül a
    // böngésző a 403 törzsét sem olvashatná el, és a hívó oldal csak annyit
    // látna, hogy „valami nem sikerült". Ez a `meghivo-kuld` első verziójának
    // hibája volt, és ugyanaz a tanulság.
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * Láthatja-e a hívó ezt a dokumentumot.
 *
 * A hívó saját tokenjével kérdezünk, tehát **az RLS dönt** — ugyanaz a
 * politika, ami a felületet is védi. Nem írunk külön jogosultsági logikát:
 * egy második, kézzel írt szabályrendszer előbb-utóbb elcsúszna az elsőtől.
 */
async function lathatja(url: string, fejlec: string, dokumentumId: string): Promise<boolean> {
  if (fejlec === '') return false;

  const hivoDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: fejlec } },
  });

  const { data } = await hivoDb.from('documents').select('id').eq('id', dokumentumId).maybeSingle();

  return data !== null;
}

/**
 * Szolgáltatás-jogosultsággal érkezett-e a hívás.
 *
 * Két úton is igent mondhat, és ennek oka van. Az első a sztring-egyezés a
 * függvény saját `SUPABASE_SERVICE_ROLE_KEY`-ével — ez a legszigorúbb, és
 * amikor teljesül, nincs mit mérlegelni.
 *
 * ⚠️ **De önmagában elbukott élesben.** A projekt új formátumú API-kulcsokat is
 * használ, és a függvénybe injektált érték nem ugyanaz a betűsor, mint a
 * dashboardon álló, örökölt `service_role` JWT — pedig a kettő ugyanazt a
 * jogosultságot jelenti. A cron percenként 403-at kapott, holott a helyes
 * kulccsal hívott.
 *
 * A második út ezért a token **`role` állítása**. Ez nem enged be senkit, akit
 * a platform nem hitelesített: a függvény `verify_jwt: true`-val fut, és ezt
 * méréssel ellenőriztük — egy `service_role` szerepű, de hamis aláírású token
 * 401-et kap, és el sem jut idáig.
 */
function szolgaltatasKulcs(fejlec: string): boolean {
  const kulcs = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (kulcs !== '' && fejlec === `Bearer ${kulcs}`) {
    return true;
  }

  return szolgaltatasSzerep(fejlec);
}

/** A sorban álló és az elakadt dokumentumok azonosítói. */
async function felvehetok(db: SupabaseClient, limit: number): Promise<string[]> {
  const elakadt = new Date(
    Date.now() - szamlafolyo.kiolvasas.claimIdokorlatPerc * 60 * 1000,
  ).toISOString();

  const { data } = await db
    .from('documents')
    .select('id')
    .or(`status.eq.feltoltve,and(status.eq.feldolgozas_alatt,claimed_at.lt.${elakadt})`)
    .lt('attempts', szamlafolyo.kiolvasas.maxProbalkozas)
    .order('created_at', { ascending: true })
    .limit(limit);

  return (data ?? []).map((sor) => sor.id as string);
}

async function feldolgoz(db: SupabaseClient, id: string): Promise<Record<string, string>> {
  // A keretet a claim **elott** nezzuk meg, es ennek oka van: a claim megnoveli
  // az `attempts` szamlalot, harom probalkozas utan pedig a bizonylat `hiba`
  // allapotba kerul. Egy elfogyott keret viszont nem hiba, es nem is a
  // bizonylattal van baj — ha itt fogyasztana probalkozast, a cron harom perc
  // alatt vegleg elrontana minden varakozo iratot, mielott a felhasznalo
  // csomagot valaszthatna.
  const keret = await keretEllenoriz(db, id);

  if (keret !== null) {
    return { id, allapot: 'keret_elfogyott', hiba: keret };
  }

  const dokumentum = await claim(db, id);

  if (dokumentum === null) {
    // Valaki más már elvitte, vagy nincs felvehető állapotban. Ez nem hiba.
    return { id, allapot: 'kihagyva' };
  }

  const kezdet = Date.now();
  const ora = meroora();

  try {
    const eredmeny = await vegigfut(db, dokumentum, kezdet, ora);
    return { id, ...eredmeny };
  } catch (hiba) {
    const uzenet = hiba instanceof Error ? hiba.message : 'Ismeretlen hiba.';

    // A hibába futott kísérlet **nem fogyaszt keretet**: nem a felhasználó
    // hibája, és jórészt nem is került pénzbe. A sor viszont bekerül az
    // audit-nyomba, hogy utólag látszódjon, mi történt.
    await db.from('document_extractions').insert({
      company_id: dokumentum.company_id,
      document_id: dokumentum.id,
      file_id: dokumentum.file_id,
      error: uzenet,
      duration_ms: Date.now() - kezdet,
      // A hibáig megtett szakaszok is bekerülnek: egy időtúllépésnél ez mondja
      // meg, melyik lépésen akadt el, nem csak azt, hogy elakadt.
      szakaszok_ms: ora.szakaszok,
      credits: 0,
    });

    // Amíg van még próbálkozás, visszatesszük a sorba; utána megáll hibával.
    const ujra = dokumentum.attempts < szamlafolyo.kiolvasas.maxProbalkozas;

    await db
      .from('documents')
      .update({ status: ujra ? 'feltoltve' : 'hiba', error: uzenet, claimed_at: null })
      .eq('id', dokumentum.id);

    return { id, allapot: ujra ? 'ujraprobalhato' : 'hiba', hiba: uzenet };
  }
}

/**
 * Van-e meg keret ehhez a bizonylathoz.
 *
 * `null`, ha mehet; egyebkent a felhasznalonak szolo indok.
 *
 * # Miert itt all a fek, es nem a feltoltesnel
 *
 * Mert **itt keletkezik a koltseg**. Egy beszuras a `documents`-be nem kerul
 * penzbe; a modellhivas igen. Ha a feltoltest tiltanank, egy kozvetlen
 * API-hivassal meg lehetne kerulni — ezt a pontot viszont nem: minden
 * kiolvasas ezen a fuggvenyen megy at, a bongeszobol es a cronbol egyarant.
 *
 * # Miert ugyanaz a modul dont, mint a bongeszoben
 *
 * A `keretAllapot` a `shared/uzleti/keret.ts`-bol jon, es a nyersanyagot a
 * `keret_adatok()` SQL-fuggveny adja — ugyanaz a ketto, amit a Beallitasok
 * kepernyo hasznal. Ha a szerver es a kliens kulon szamolna, elobb-utobb ket
 * kulonbozo valaszt adnanak, es a megengedobb mindig AI-koltseget jelent.
 */
async function keretEllenoriz(db: SupabaseClient, dokumentumId: string): Promise<string | null> {
  const { data: sor } = await db
    .from('documents')
    .select('company_id')
    .eq('id', dokumentumId)
    .maybeSingle();

  const cegId = sor?.company_id as string | undefined;

  if (cegId === undefined) {
    // Nincs ilyen sor, vagy nincs cege. A claim ugyis kihagyja majd.
    return null;
  }

  const { data } = await db.rpc('keret_adatok', { ceg_id: cegId });

  if (data === null || data === undefined) {
    // Nem tudjuk megmondani. Ilyenkor **atengedjuk**: egy meghiusult
    // keretlekerdezes miatt ne alljon meg a feldolgozas. A kar korlatos (egy
    // bizonylat), a forditott iranyu tevedes viszont az egesz sort megallitana.
    return null;
  }

  const nyers = data as unknown as CegAllapot & { felhasznalt: number };
  const allapot = keretAllapot(nyers, nyers.felhasznalt);

  return allapot.mehet ? null : (allapot.indok ?? 'Elfogyott a kereted.');
}

/**
 * A claim: egyetlen feltételes `UPDATE`, `RETURNING`-gel.
 *
 * Két menetben, mert két felvehető állapot van — de mindkettő **atomi**: a
 * `WHERE` feltétel része az `UPDATE`-nek, tehát ha közben más vitte el, a
 * frissítés nulla sort érint, és üres kézzel térünk vissza.
 */
async function claim(db: SupabaseClient, id: string) {
  const most = new Date().toISOString();

  const { data: sorban } = await db
    .from('documents')
    .update({ status: 'feldolgozas_alatt', claimed_at: most })
    .eq('id', id)
    .eq('status', 'feltoltve')
    .select('*, files(*), companies(name, tax_number, auto_jovahagyas_be)')
    .maybeSingle();

  if (sorban !== null) return await attemptsNovel(db, sorban);

  // Elakadt futás felvétele: az állapot már `feldolgozas_alatt`, de a claim
  // régi. Enélkül egy félbemaradt futás örökre megfogná a dokumentumot.
  const elakadt = new Date(
    Date.now() - szamlafolyo.kiolvasas.claimIdokorlatPerc * 60 * 1000,
  ).toISOString();

  const { data: ujra } = await db
    .from('documents')
    .update({ claimed_at: most })
    .eq('id', id)
    .eq('status', 'feldolgozas_alatt')
    .lt('claimed_at', elakadt)
    .select('*, files(*), companies(name, tax_number, auto_jovahagyas_be)')
    .maybeSingle();

  return ujra === null ? null : await attemptsNovel(db, ujra);
}

async function attemptsNovel(db: SupabaseClient, sor: Record<string, unknown>) {
  const attempts = ((sor['attempts'] as number) ?? 0) + 1;
  await db.from('documents').update({ attempts }).eq('id', sor['id'] as string);

  return {
    id: sor['id'] as string,
    company_id: sor['company_id'] as string,
    file_id: sor['file_id'] as string,
    oldal_tol: sor['oldal_tol'] as number | null,
    oldal_ig: sor['oldal_ig'] as number | null,
    attempts,
    files: egyesit(sor['files']) as {
      storage_path: string | null;
      mime_type: string | null;
      original_filename: string | null;
      oldalszam: number | null;
    } | null,
    companies: egyesit(sor['companies']) as {
      name: string;
      tax_number: string;
      auto_jovahagyas_be: boolean;
    } | null,
  };
}

/** A PostgREST a sok-az-egyhez beágyazást objektumként adja; tömbre is felkészülünk. */
function egyesit(ertek: unknown): unknown {
  return Array.isArray(ertek) ? (ertek[0] ?? null) : ertek;
}

type Dokumentum = Awaited<ReturnType<typeof attemptsNovel>>;

/**
 * Szakaszonkénti időmérés.
 *
 * A `duration_ms` eddig egyetlen számot adott a teljes láncra, és egy szám nem
 * mondja meg, **hol** ment el az idő. Egy 9 másodperces kiolvasásnál ez a
 * különbség dönti el, hogy a modellen, a tárolón vagy a PDF-felderítésen
 * érdemes-e dolgozni — enélkül csak következtetni lehet rá.
 *
 * ⚠️ A mérés a `finally`-ben zárul, **nem a sikeres ág végén**: egy
 * időtúllépésnél pont az a legértékesebb adat, hogy melyik szakasz vitte el a
 * kilencven másodpercet. Ha a mérés csak sikernél íródna, a legfontosabb
 * esetről nem tudnánk semmit.
 *
 * Az összeadás (`+=`) szándékos: ha egy szakasz többször fut (újrapróbálkozás
 * egy lépésen belül), az összesített idő az igaz válasz, nem az utolsó futásé.
 */
function meroora() {
  const szakaszok: Record<string, number> = {};

  return {
    szakaszok,
    async merj<T>(nev: string, mit: () => Promise<T>): Promise<T> {
      const kezdet = Date.now();

      try {
        return await mit();
      } finally {
        szakaszok[nev] = (szakaszok[nev] ?? 0) + (Date.now() - kezdet);
      }
    },
  };
}

type Meroora = ReturnType<typeof meroora>;

async function vegigfut(
  db: SupabaseClient,
  dokumentum: Dokumentum,
  kezdet: number,
  ora: Meroora,
): Promise<Record<string, string>> {
  const fajl = dokumentum.files;

  if (fajl === null || fajl.storage_path === null) {
    throw new Error('A bizonylat fájlja már nem érhető el.');
  }

  // Az útvonalat külön konstansba vesszük: az őr fölötte már kizárta a
  // `null`-t, de a szűkítés nem él át egy visszahívásba. Egy `as string`
  // elfedné ezt — inkább a fordító lássa a bizonyítékot, mint hogy ígéretet
  // tegyünk neki.
  const utvonal = fajl.storage_path;

  // A bájtok kiolvasása **beletartozik** a letöltésbe: a fájl nincs a
  // kezünkben, amíg az `arrayBuffer()` le nem futott. Egy 20 MB-os
  // bizonylatnál ez nem nulla, és a szakasz neve azt ígéri, hogy mérjük.
  const bajtok = await ora.merj('letoltes', async () => {
    const { data, error } = await db.storage.from('bizonylatok').download(utvonal);

    if (error !== null || data === null) {
      throw new Error('A bizonylat fájlja nem tölthető le.');
    }

    return new Uint8Array(await data.arrayBuffer());
  });

  const felderites = await ora.merj('felderites', () => felderit(bajtok, fajl.mime_type ?? ''));

  // Az oldalszám a fájlé, nem a bizonylaté — egy fájlban több bizonylat is
  // lehet. Itt írjuk be, mert a felderítés most futott le.
  await db
    .from('files')
    .update({
      oldalszam: felderites.oldalszam,
      forras_jelleg: felderites.jelleg,
      forras_naplo: naplo(felderites),
    })
    .eq('id', dokumentum.file_id);

  // Kötegszétszedés. Ha a fájlban több bizonylat van, ez a sor az elsőt kapja
  // meg, a többihez új `documents` sor születik — mindegyik saját
  // oldaltartománnyal, saját kiolvasással és saját kredittel.
  const hatar = await ora.merj('szetszedes', () =>
    esetlegSzetszed(db, dokumentum, felderites, bajtok, fajl),
  );

  // Ez a szakasz a modellhívás **vagy** az XML-értelmezés — a kettő ugyanoda
  // fut be. Épp ezért beszédes: ha a `kiolvasas` uralja az időt, a modellen
  // kell dolgozni; ha nem, akkor máshol keressük.
  const {
    nyers,
    modell,
    futtatottModell,
    promptVerzio,
    bemenetToken,
    kimenetToken,
    gondolkodasToken,
    koltseg,
  } = await ora.merj('kiolvasas', () => kiolvasas(dokumentum, felderites, bajtok, fajl, hatar));

  // Az előzményt a nyers válaszból kérdezzük: a szállító adószámára, a
  // bizonylatszámra és a végösszegre kell, és ezek a tárolási alakra hozás
  // előtt is összevethetők (a törzsszám amúgy is normalizálva illeszt).
  const elozmeny = await ora.merj('elozmeny', () =>
    elozmenyt(db, dokumentum.company_id, dokumentum.id, elozmenyMezok(nyers)),
  );

  // Innentől minden a tiszta láncban történik: tisztítás → normalizálás →
  // validátorok → konfidencia → kapuk → kredit. Ebben a fájlban csak az
  // adatbázis-huzalozás marad.
  const lanc = lancotFuttat({
    nyers,
    oldalszam: bizonylatOldalszama(
      hatar?.oldal_tol ?? dokumentum.oldal_tol,
      hatar?.oldal_ig ?? dokumentum.oldal_ig,
      felderites.oldalszam,
    ),
    duplikatum: false,
    // Ha a cég-join valamiért üresen jön vissza, **emberhez** dőlünk, nem
    // automatikus jóváhagyás felé: a hiányzó adat nem engedély.
    autoJovahagyasBe: dokumentum.companies?.auto_jovahagyas_be ?? false,
    elozmeny,
    mintaSorszam: elozmeny.cegEddigiBizonylatai + 1,
  });

  const { data: kiolvasasSor } = await db
    .from('document_extractions')
    .insert({
      company_id: dokumentum.company_id,
      document_id: dokumentum.id,
      file_id: dokumentum.file_id,
      model: modell,
      model_version: futtatottModell,
      // A `null` itt tartalmi állítás: ezt nem modell olvasta ki. Odaírni egy
      // prompt-verziót, ami nem futott, épp azt az összehasonlítást rontaná
      // el, amiért az oszlop van.
      prompt_version: promptVerzio,
      raw_response: nyers,
      fields: lanc.mezok,
      confidence: lanc.konfidencia.combined,
      input_tokens: bemenetToken,
      output_tokens: kimenetToken,
      // A gondolkodás a kimenet RÉSZE, nem afölött. Lásd a `hasznalatOlvas()`
      // fejlécét: a mért esetünkben 1096 kimeneti tokenből ~800 volt ez.
      reasoning_tokens: gondolkodasToken,
      cost: koltseg,
      duration_ms: Date.now() - kezdet,
      szakaszok_ms: ora.szakaszok,
      credits: lanc.kreditek,
    })
    .select('id')
    .single();

  await db
    .from('documents')
    .update({
      ...lanc.mezok,
      afa_bontas: lanc.bontas,
      tobb_irat_gyanu: lanc.tobbIratGyanu,
      nehezen_olvashato: lanc.nehezenOlvashato,
      status: lanc.allapot,
      auto_jovahagyva: lanc.kapu.automatikus,
      auto_indok: lanc.kapu.indok,
      approved_at: lanc.kapu.automatikus ? new Date().toISOString() : null,
      error: null,
      claimed_at: null,
    })
    .eq('id', dokumentum.id);

  return {
    allapot: lanc.allapot,
    indok: lanc.kapu.indok,
    kreditek: String(lanc.kreditek),
    forras: felderites.jelleg,
    ...(hatar === null ? {} : { oldalak: `${hatar.oldal_tol}–${hatar.oldal_ig}` }),
    kiolvasas_id: String(kiolvasasSor?.id ?? ''),
  };
}

/**
 * A kötegszétszedés.
 *
 * Egy PDF-ben gyakran több bizonylat van — a könyvelő egyben szkenneli be a havi
 * paksamétát. Eddig ilyenkor a rendszer az **elsőt** olvasta ki, és a
 * `tobb_irat_gyanu` zászlóval emberhez küldte: a többi bizonylat adata
 * elveszett, és a felhasználónak kézzel kellett szétvágnia a fájlt.
 *
 * Most megkérdezzük a modellt, hol vannak a határok, és minden bizonylatból
 * **külön `documents` sor** lesz, saját oldaltartománnyal. A fájlt nem vágjuk
 * szét: a tartomány elég, és az előnézet `#page=N`-nel odaugrik.
 *
 * Amit visszaad: az **első** bizonylat határa (ez a sor azt kapja), vagy
 * `null`, ha nem szedtük szét — akkor minden marad a réginél.
 *
 * ⚠️ A szétszedő futás **nulla kredit**. Nem kedvezmény: használható adatot
 * önmagában nem adott, és a szétszedés a szolgáltatás része (ÁSZF 8. pont). A
 * dollárban mért költsége viszont beíródik, különben nem tudnánk, mibe kerül.
 */
async function esetlegSzetszed(
  db: SupabaseClient,
  dokumentum: Dokumentum,
  felderites: Awaited<ReturnType<typeof felderit>>,
  bajtok: Uint8Array,
  fajl: { mime_type: string | null; original_filename: string | null },
): Promise<Hatar | null> {
  const oldalszam = felderites.oldalszam;

  // Csak többoldalas PDF-en van mit szétszedni. A kép egy oldal, az XML pedig
  // strukturált: ott a `tobb_irat_gyanu`-t az értelmező állítja.
  //
  // ⚠️ **A `beagyazott_xml` itt is kimarad, és ez a fék most lett teherbíró.**
  // Önálló XML-nél az `oldalszam` amúgy is `null`, tehát a jelleg-feltétel nem
  // számított; egy hibrid PDF-nek viszont valódi oldalszáma van. A kihagyás a
  // szabványt követi: a Factur-X és a ZUGFeRD **fájlonként egy bizonylatot**
  // ír elő, és a melléklet maga mondja meg, mi van a fájlban — egy szétszedő
  // modellhívás ugyanazt az egy számlát találná meg, fizetős áron.
  //
  // A határeset kimondva: egy **köteg** PDF, amiben véletlenül ül egy olyan
  // `.xml` melléklet, amit az értelmezőink fel is ismernek, szétszedetlen
  // marad. Ilyet még nem láttunk, és a `csatolmany.ts` tartalék szabálya is
  // szűk — de ha előkerül, itt kell szűkíteni a feltételt a szabványos
  // fájlnevekre, nem a tartalékot eldobni.
  if (oldalszam === null || oldalszam < 2 || !igenyelModellt(felderites.jelleg)) {
    return null;
  }

  // Ennek a sornak már van tartománya: ez a szétszedés **eredménye**, nem a
  // bemenete. Egy újrapróbálkozás nem szedheti szét másodszor.
  if (dokumentum.oldal_tol !== null) {
    return null;
  }

  // Egy testvérsor tartománnyal azt jelenti, hogy a fájlt már szétszedtük, és
  // ez a futás egy félbemaradt kör újrapróbálása. Ilyenkor sem szedjük szét
  // újra — az duplikálná a bizonylatokat és a krediteket.
  const { data: testver } = await db
    .from('documents')
    .select('id')
    .eq('file_id', dokumentum.file_id)
    .neq('id', dokumentum.id)
    .not('oldal_tol', 'is', null)
    .limit(1)
    .maybeSingle();

  if (testver !== null) {
    return null;
  }

  let valasz: Awaited<ReturnType<typeof szetszed>>;
  try {
    valasz = await szetszed({
      tartalom: bajtok,
      mime: fajl.mime_type ?? 'application/pdf',
      fajlnev: fajl.original_filename ?? 'koteg.pdf',
      oldalszam,
      // Szövegréteg esetén a szöveg megy, nem a fájl: a határok felismeréséhez
      // elég, és nagyságrenddel olcsóbb. Egy nagyon hosszú kötegnél viszont a
      // szöveg is sok lenne — ott marad a fájl, amit a modell lapozgat.
      oldalSzovegek:
        felderites.jelleg === 'szovegreteg' &&
        felderites.oldalSzovegek !== null &&
        oldalszam <= szamlafolyo.koteg.szovegMaxOldal
          ? felderites.oldalSzovegek
          : null,
      apiKulcs: Deno.env.get('OPENROUTER_API_KEY') ?? '',
    });
  } catch (hiba) {
    // A szétszedés elakadása **nem** állítja meg a feldolgozást: a bizonylat
    // ugyanúgy kiolvasható egyben, ahogy eddig. Egy kiegészítő lépés soha ne
    // tudja elvinni az alapszolgáltatást.
    console.error('szetszedes', hiba instanceof Error ? hiba.message : hiba);
    return null;
  }

  const dontes = hatarokErtelmez(valasz.nyers, oldalszam);

  // A futás akkor is bekerül az audit-nyomba, ha nem lett belőle szétszedés:
  // pénzbe került, és a `nem` is eredmény.
  await db.from('document_extractions').insert({
    company_id: dokumentum.company_id,
    document_id: dokumentum.id,
    file_id: dokumentum.file_id,
    model: valasz.modell,
    model_version: valasz.futtatottModell,
    prompt_version: valasz.promptVerzio,
    // A `raw_response` a modell **érintetlen** válasza; a `fields` az, amit
    // ebből csináltunk — a végleges tartományok és az, hogy hol toldottunk
    // hozzá besorolatlan oldalt. A kettő együtt adja meg utólag, hogy egy
    // oldaltartomány a modelltől vagy tőlünk származik-e.
    raw_response: valasz.nyers,
    fields: dontes.szet ? { hatarok: dontes.hatarok, javitas: dontes.javitas } : null,
    confidence: null,
    input_tokens: valasz.bemenetToken,
    output_tokens: valasz.kimenetToken,
    reasoning_tokens: valasz.gondolkodasToken,
    cost: valasz.koltseg,
    error: dontes.szet ? null : dontes.indok,
    // A szétszedés a szolgáltatás része, nem külön tétel.
    credits: 0,
  });

  if (!dontes.szet) {
    return null;
  }

  const [elso, ...tobbi] = dontes.hatarok;

  // A többi bizonylat új sorként születik, `feltoltve` állapotban — onnantól
  // ugyanaz a sor viszi őket, mint bármely feltöltést: keretellenőrzés, claim,
  // kiolvasás, kapuk. A cron egy percen belül felveszi őket.
  if (tobbi.length > 0) {
    const { error: beszurasiHiba } = await db.from('documents').insert(
      tobbi.map((h) => ({
        company_id: dokumentum.company_id,
        file_id: dokumentum.file_id,
        oldal_tol: h.oldal_tol,
        oldal_ig: h.oldal_ig,
        status: 'feltoltve',
      })),
    );

    if (beszurasiHiba !== null) {
      // Ha a testvérsorok nem jöttek létre, **nem** szűkítjük ezt a sort az
      // első bizonylatra: úgy a fájl többi oldala némán elveszne. Marad az
      // egészet átfogó bizonylat, ahogy eddig.
      console.error('szetszedes-beszuras', beszurasiHiba.message);
      return null;
    }
  }

  if (elso === undefined) {
    return null;
  }

  // ⚠️ **A saját tartomány azonnal beíródik, nem a futás végén** — és ez nem
  // apróság, hanem egy mért hibaosztály elkerülése.
  //
  // A testvérsorok ekkor már léteznek. Ha ez a sor tartomány nélkül maradna, és
  // a kiolvasás utána elhasalna (időtúllépés, modellhiba), az újrapróbálás így
  // találná magát: a sornak nincs tartománya, a testvéreknek **van** — a
  // szétszedés tehát nem fut újra —, és a kiolvasás az **egész fájlt** küldené
  // el a modellnek. A köteg első bizonylata helyett egy összemosott válasz
  // születne, csendben. Beírva viszont az újrapróbálás pontosan ott folytatja,
  // ahol ez a sor tart.
  await db
    .from('documents')
    .update({ oldal_tol: elso.oldal_tol, oldal_ig: elso.oldal_ig })
    .eq('id', dokumentum.id);

  return elso;
}

/** Az előzmény-lekérdezéshez elég a szállító adószáma és a bizonylat azonosítói. */
function elozmenyMezok(nyers: Record<string, unknown>): Record<string, string | null> {
  const szoveg = (ertek: unknown) =>
    ertek === null || ertek === undefined || ertek === '' ? null : String(ertek);

  return {
    supplier_tax_number: szoveg(nyers['supplier_tax_number']),
    doc_number: szoveg(nyers['doc_number']),
    gross_amount: szoveg(nyers['gross_amount']),
    issue_date: szoveg(nyers['issue_date']),
    currency: szoveg(nyers['currency']),
  };
}

/**
 * A kiolvasás maga: **XML-ág vagy modellhívás.**
 *
 * A strukturált ág nem kerül pénzbe és nem találgat. Ha nem tudjuk
 * értelmezni, az nem hiba — csak a lánc következő foka jön.
 */
async function kiolvasas(
  dokumentum: Dokumentum,
  felderites: Awaited<ReturnType<typeof felderit>>,
  bajtok: Uint8Array,
  fajl: { mime_type: string | null; original_filename: string | null },
  frissHatar: Hatar | null = null,
) {
  if (!igenyelModellt(felderites.jelleg) && felderites.xml !== null) {
    // ⚠️ A hosszt a **felderítés** adja, nem a fájl mérete. Önálló XML-nél a
    // kettő ugyanaz; egy PDF-be ágyazott XML-nél viszont a PDF méretét
    // mérnénk a melléklet 4 MB-os korlátjához — lásd a `xmlBajt` mező
    // fejlécét. A `??` csak azért van, mert a típus nem tudja, hogy az
    // `xml !== null` mindig `xmlBajt !== null`-lal jár.
    //
    // A `null` azt jelenti: **menjen a modellhez.** Az értelmezhetetlen séma
    // és a biztonsági okból eldobott (doctype-os, túl nagy) XML is ide esik —
    // a `xmlbolKiolvas()` fejléce sorolja fel a három esetet.
    const eredmeny = xmlbolKiolvas(felderites.xml, felderites.xmlBajt ?? bajtok.length);

    if (eredmeny !== null) {
      return {
        nyers: eredmeny.nyers,
        modell: eredmeny.nev,
        futtatottModell: null,
        // Nincs prompt-verzió: ezt nem modell olvasta ki.
        promptVerzio: null,
        bemenetToken: null,
        kimenetToken: null,
        // Nem modell olvasta ki, tehát gondolkodás sem volt. A `null` itt is
        // azt mondja, amit máshol: nincs mérésünk — nem pedig „nulla".
        gondolkodasToken: null,
        koltseg: null,
      };
    }
  }

  const apiKulcs = Deno.env.get('OPENROUTER_API_KEY') ?? '';

  // ⚠️ **A modell csak a saját bizonylatát láthatja.** Ha az egész köteget
  // kapná meg, és csak a promptban kérnénk, hogy „a 3–4. oldalt olvasd",
  // minden darabra ugyanaz történne: az első, legfeltűnőbb bizonylatot
  // olvasná ki. Ezt nem lehet prompttal kikényszeríteni — a bemenetet kell
  // szűkíteni. A kivágott PDF sehova nem kerül mentésre.
  const kuldendo = await csakAzOldalai(dokumentum, frissHatar, bajtok, fajl.mime_type);

  try {
    const valasz = await kiolvas({
      tartalom: kuldendo,
      mime: fajl.mime_type ?? 'application/pdf',
      fajlnev: fajl.original_filename ?? 'bizonylat',
      cegNev: dokumentum.companies?.name ?? null,
      cegAdoszam: dokumentum.companies?.tax_number ?? null,
      apiKulcs,
    });

    return { ...valasz, promptVerzio: valasz.promptVerzio as string | null };
  } catch (hiba) {
    if (hiba instanceof KiolvasasHiba) throw new Error(hiba.message);
    throw hiba;
  }
}

/**
 * A bizonylat saját oldalai a fájlból.
 *
 * Tartomány nélkül (a bizonylat az egész fájl) az eredeti bájtok mennek — egy
 * egybizonylatos fájl nem megy át fölösleges újraíráson.
 *
 * Ha a kivágás nem sikerül (sérült vagy titkosított PDF), a **teljes fájl**
 * megy el. Ez a mai viselkedés, tehát nem visszalépés: rosszabb esetben a
 * modell az első bizonylatot olvassa ki — pontosan úgy, ahogy a szétszedés
 * előtt tette.
 */
async function csakAzOldalai(
  dokumentum: Dokumentum,
  frissHatar: Hatar | null,
  bajtok: Uint8Array,
  mime: string | null,
): Promise<Uint8Array> {
  const tol = frissHatar?.oldal_tol ?? dokumentum.oldal_tol;
  const ig = frissHatar?.oldal_ig ?? dokumentum.oldal_ig;

  if (tol === null || ig === null || mime !== 'application/pdf') {
    return bajtok;
  }

  try {
    return await oldaltartomany(bajtok, tol, ig);
  } catch (hiba) {
    console.error('oldalvagas', hiba instanceof Error ? hiba.message : hiba);
    return bajtok;
  }
}
