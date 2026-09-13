import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { szamlafolyo } from '../../../config/szamlafolyo.ts';
import { bizonylatOldalszama, feldolgoz as lancotFuttat } from '../../../shared/uzleti/lanc.ts';
import { kiolvas, KiolvasasHiba } from '../../../shared/uzleti/openrouter.ts';
import { ertelmez as xmlErtelmez } from '../../../shared/uzleti/xml/xmlKiolvaso.ts';
import { xmltFelolvas, XmlHiba } from '../../../shared/uzleti/xml/parser.ts';
import { szolgaltatasSzerep } from '../../../shared/uzleti/token.ts';

import { felderit, igenyelModellt, naplo } from './felderites.ts';
import { elozmenyt } from './elozmeny.ts';

/**
 * A kiolvasó.
 *
 * A lánc: **claim → felderítés → XML-ág vagy modellhívás → tisztítás →
 * normalizálás → validátorok → konfidencia → kapuk → állapot + kredit.**
 *
 * A claim egyetlen feltételes `UPDATE`: aki elsőnek írja át az állapotot, azé a
 * munka. Nem kell hozzá sorzár, és két párhuzamos hívás sem tudja ugyanazt az
 * iratot kétszer feldolgozni. A logika a régi `Sorkezelo`-ből jön — az jó volt,
 * csak a kényszer tűnt el mögüle (osztott tárhelyen nem volt hova workert tenni).
 *
 * ⚠️ Ez a függvény `service_role`-lal fut, tehát **megkerüli az RLS-t**. Minden
 * lekérdezés kézzel szűr `company_id`-re; itt nincs mögöttes háló.
 */

Deno.serve(async (keres: Request): Promise<Response> => {
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
    headers: { 'Content-Type': 'application/json' },
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
  const dokumentum = await claim(db, id);

  if (dokumentum === null) {
    // Valaki más már elvitte, vagy nincs felvehető állapotban. Ez nem hiba.
    return { id, allapot: 'kihagyva' };
  }

  const kezdet = Date.now();

  try {
    const eredmeny = await vegigfut(db, dokumentum, kezdet);
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

async function vegigfut(
  db: SupabaseClient,
  dokumentum: Dokumentum,
  kezdet: number,
): Promise<Record<string, string>> {
  const fajl = dokumentum.files;

  if (fajl === null || fajl.storage_path === null) {
    throw new Error('A bizonylat fájlja már nem érhető el.');
  }

  const { data: letoltes, error: letoltesiHiba } = await db.storage
    .from('bizonylatok')
    .download(fajl.storage_path);

  if (letoltesiHiba !== null || letoltes === null) {
    throw new Error('A bizonylat fájlja nem tölthető le.');
  }

  const bajtok = new Uint8Array(await letoltes.arrayBuffer());
  const felderites = await felderit(bajtok, fajl.mime_type ?? '');

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

  const { nyers, modell, futtatottModell, promptVerzio, bemenetToken, kimenetToken, koltseg } =
    await kiolvasas(dokumentum, felderites, bajtok, fajl);

  // Az előzményt a nyers válaszból kérdezzük: a szállító adószámára, a
  // bizonylatszámra és a végösszegre kell, és ezek a tárolási alakra hozás
  // előtt is összevethetők (a törzsszám amúgy is normalizálva illeszt).
  const elozmeny = await elozmenyt(
    db,
    dokumentum.company_id,
    dokumentum.id,
    elozmenyMezok(nyers),
  );

  // Innentől minden a tiszta láncban történik: tisztítás → normalizálás →
  // validátorok → konfidencia → kapuk → kredit. Ebben a fájlban csak az
  // adatbázis-huzalozás marad.
  const lanc = lancotFuttat({
    nyers,
    oldalszam: bizonylatOldalszama(
      dokumentum.oldal_tol,
      dokumentum.oldal_ig,
      felderites.oldalszam,
    ),
    duplikatum: false,
    autoJovahagyasBe: dokumentum.companies?.auto_jovahagyas_be ?? true,
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
      cost: koltseg,
      duration_ms: Date.now() - kezdet,
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
    kiolvasas_id: String(kiolvasasSor?.id ?? ''),
  };
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
) {
  if (!igenyelModellt(felderites.jelleg) && felderites.xml !== null) {
    try {
      const doc = xmltFelolvas(felderites.xml, bajtok.length);
      const eredmeny = doc === null ? null : xmlErtelmez(doc);

      if (eredmeny !== null) {
        return {
          nyers: eredmeny.nyers,
          modell: eredmeny.nev,
          futtatottModell: null,
          // Nincs prompt-verzió: ezt nem modell olvasta ki.
          promptVerzio: null,
          bemenetToken: null,
          kimenetToken: null,
          koltseg: null,
        };
      }
    } catch (hiba) {
      // Egy értelmezhetetlen vagy gyanús XML nem állítja meg a feldolgozást:
      // a modell még megpróbálhatja. A `doctype` miatt eldobott fájl is ide
      // esik — XML-ként nem nyúlunk hozzá, de a tartalmát a modell láthatja.
      if (!(hiba instanceof XmlHiba)) throw hiba;
    }
  }

  const apiKulcs = Deno.env.get('OPENROUTER_API_KEY') ?? '';

  try {
    const valasz = await kiolvas({
      tartalom: bajtok,
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
