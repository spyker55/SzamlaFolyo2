import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { szamlafolyo } from '../config/szamlafolyo.ts';
import { ellenoriz } from '../shared/uzleti/fajltipus.ts';
import { hatarokErtelmez, type Hatar } from '../shared/uzleti/koteg.ts';
import { KiolvasasHiba, szetszed } from '../shared/uzleti/openrouter.ts';
import { felderit, igenyelModellt, type Felderites } from '../supabase/functions/kiolvas/felderites.ts';

/**
 * A `szetszedes:proba` **logikája** – a terminál nélkül.
 *
 * A kötegszétszedés (`szetszed()` + `hatarokErtelmez()`) ugyanazt a modellt
 * használja, mint a kiolvasás (`modell.alapertelmezett`). Modellcsere előtt
 * tehát ezt is mérni kell – 2026-10-08-ig erre nem volt eszköz.
 *
 * ## Amit mér
 *
 * - **élesben szétszednénk-e egyáltalán** (többoldalas PDF, nem XML);
 * - **melyik úton**: az oldalak szövegével vagy a fájllal – ugyanaz a szabály,
 *   mint a `kiolvas/index.ts` `esetlegSzetszed()`-jében;
 * - **a határokat**, ahogy a `hatarokErtelmez()` elfogadja őket (a
 *   besorolatlan oldalak pótlásával együtt), vagy az indokot, amiért nem;
 * - ha a helyes határok ismertek: **hány futás találta el**;
 * - token, gondolkodás, költség, idő, és **ki szolgálta ki**.
 *
 * ## Amit kiír, és amit nem
 *
 * Csak oldalszámokat és a mi magyar indokainkat – a bizonylat tartalmából
 * semmit. A kimenet tehát valódi bizonylatnál is bemásolható.
 *
 * A script **semmit nem ír**: nincs adatbázis, nincs tároló, nincs kredit.
 * A modellhívás viszont valódi pénz, és a fájl (vagy a szövege) ugyanúgy
 * elhagyja a gépet, mint élesben.
 */

export class SzetKapcsoloHiba extends Error {}

export type SzetKapcsolok = {
  utvonal: string;
  ismetles: number;
  /** `null` elem: a configban álló modell. Több modell egymás mellé kerül. */
  modellek: (string | null)[];
  /** A szöveges út helyett a fájlt küldi (a szkennelt kötegek útja). */
  fajlkent: boolean;
  /** A helyes határok, ha ismertek – a kapcsolóból vagy az `ISMERT_HATAROK`-ból. */
  vart: Hatar[] | null;
  json: boolean;
};

/**
 * A saját, kitalált próbafájljaink helyes határai.
 *
 * A `harom-szamla-rendes.pdf` három számla, oldalanként egy
 * (`tesztadat/harom-szamla-rendes.json`, `OLVASS-EL.md`).
 */
export const ISMERT_HATAROK: Readonly<Record<string, readonly Hatar[]>> = {
  'harom-szamla-rendes.pdf': [
    { oldal_tol: 1, oldal_ig: 1 },
    { oldal_tol: 2, oldal_ig: 2 },
    { oldal_tol: 3, oldal_ig: 3 },
  ],
};

export type SzetFutas = {
  /** A **kért** modell. */
  modell: string;
  futtatottModell: string | null;
  szolgaltato: string | null;
  /** Szét lett-e szedve – a `hatarokErtelmez()` döntése. */
  szet: boolean;
  /** Az elfogadott határok (pótlás után), vagy `null`. */
  hatarok: Hatar[] | null;
  /** Ha a modell hagyott besorolatlan oldalt: mit pótoltunk. */
  javitas: string | null;
  /** Ha nem szedtük szét: miért. */
  indok: string | null;
  /** Ha a hívás maga bukott el. */
  hiba: string | null;
  bemenetToken: number | null;
  kimenetToken: number | null;
  gondolkodasToken: number | null;
  koltseg: number | null;
  idoMs: number;
};

export type SzetMeres = {
  fajl: { nev: string; oldalszam: number | null; jelleg: string };
  /** `szoveg` / `fajl`, vagy `null`, ha élesben nem is szednénk szét. */
  ut: 'szoveg' | 'fajl' | null;
  /** Ha `ut` null: miért nem. */
  kihagyva: string | null;
  vart: Hatar[] | null;
  futasok: SzetFutas[];
};

/** `1–1, 2–3` alak. */
export function hatarSzo(hatarok: readonly Hatar[]): string {
  return hatarok.map((h) => `${h.oldal_tol}–${h.oldal_ig}`).join(', ');
}

/** `1-1,2-3` (vagy `1–1, 2–3`) → határok. Rossz alakra megáll. */
export function vartErtelmez(szoveg: string): Hatar[] {
  const darabok = szoveg.split(',').map((d) => d.trim()).filter((d) => d !== '');
  const hatarok: Hatar[] = [];

  for (const d of darabok) {
    const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(d) ?? /^(\d+)$/.exec(d);
    if (m === null) {
      throw new SzetKapcsoloHiba(`A --vart alakja: 1-1,2-3 – ezt nem értem: „${d}"`);
    }
    const tol = Number(m[1]);
    const ig = Number(m[2] ?? m[1]);
    if (tol < 1 || ig < tol) {
      throw new SzetKapcsoloHiba(`Érvénytelen tartomány a --vart-ban: „${d}"`);
    }
    hatarok.push({ oldal_tol: tol, oldal_ig: ig });
  }

  if (hatarok.length === 0) {
    throw new SzetKapcsoloHiba('A --vart üres.');
  }

  return hatarok;
}

/**
 * Helyes-e egy futás. Egyetlen várt bizonylatnál a helyes válasz az, hogy
 * **nem** szedjük szét; többnél a határoknak pontosan egyezniük kell.
 */
export function helyes(futas: SzetFutas, vart: readonly Hatar[]): boolean {
  if (futas.hiba !== null) return false;
  if (vart.length === 1) return !futas.szet;
  return futas.szet && futas.hatarok !== null && hatarSzo(futas.hatarok) === hatarSzo(vart);
}

/**
 * Melyik úton menne élesben – **szó szerint** a `kiolvas/index.ts`
 * `esetlegSzetszed()` feltételei. A kettő együttmozgását a
 * `szetszedesMeres.test.ts` a forrásból ellenőrzi.
 */
export function eselyesUt(
  felderites: Pick<Felderites, 'jelleg' | 'oldalszam' | 'oldalSzovegek'>,
): { ut: 'szoveg' | 'fajl' | null; kihagyva: string | null } {
  const oldalszam = felderites.oldalszam;

  if (oldalszam === null || oldalszam < 2 || !igenyelModellt(felderites.jelleg)) {
    return {
      ut: null,
      kihagyva:
        oldalszam === null || oldalszam < 2
          ? 'Egyoldalas (vagy oldalszám nélküli) fájl: élesben nincs szétszedés.'
          : 'Strukturált XML: élesben nincs szétszedés.',
    };
  }

  const szoveges =
    felderites.jelleg === 'szovegreteg' &&
    felderites.oldalSzovegek !== null &&
    oldalszam <= szamlafolyo.koteg.szovegMaxOldal;

  return { ut: szoveges ? 'szoveg' : 'fajl', kihagyva: null };
}

export async function szetMerj(
  k: SzetKapcsolok,
  figyelmeztet: (uzenet: string) => void = () => {},
): Promise<SzetMeres> {
  const bajtok = new Uint8Array(await readFile(k.utvonal));
  const nev = basename(k.utvonal);

  const tipus = ellenoriz(bajtok, bajtok.byteLength, nev);
  if (!tipus.ok) {
    throw new SzetKapcsoloHiba(tipus.hiba);
  }

  const felderites = await felderit(bajtok, tipus.tipus.mime);
  const eles = eselyesUt(felderites);
  const ut = eles.ut === 'szoveg' && k.fajlkent ? 'fajl' : eles.ut;
  const vart = k.vart ?? (ISMERT_HATAROK[nev] ? [...ISMERT_HATAROK[nev]] : null);
  const meres: SzetMeres = {
    fajl: { nev, oldalszam: felderites.oldalszam, jelleg: felderites.jelleg },
    ut,
    kihagyva: eles.kihagyva,
    vart,
    futasok: [],
  };

  // Ami élesben nem menne a szétszedőhöz, azért itt sem fizetünk.
  if (ut === null) {
    figyelmeztet(eles.kihagyva ?? 'Élesben nincs szétszedés.');
    return meres;
  }

  if (k.fajlkent && eles.ut === 'szoveg') {
    figyelmeztet('⚠️ --fajlkent: a fájl megy a szöveg helyett – élesben ezen a fájlon a szöveges út futna.');
  }

  const apiKulcs = process.env['OPENROUTER_API_KEY'] ?? '';
  if (apiKulcs === '') {
    throw new SzetKapcsoloHiba(
      'Nincs OPENROUTER_API_KEY a környezetben. Tedd a `.env`-be — és ne másold sehova máshova.',
    );
  }

  for (const modell of k.modellek) {
    for (let i = 0; i < k.ismetles; i++) {
      meres.futasok.push(await egyFutas(bajtok, tipus.tipus.mime, nev, felderites, ut, modell, apiKulcs));
    }
  }

  return meres;
}

async function egyFutas(
  bajtok: Uint8Array,
  mime: string,
  nev: string,
  felderites: Felderites,
  ut: 'szoveg' | 'fajl',
  modell: string | null,
  apiKulcs: string,
): Promise<SzetFutas> {
  const kezdet = Date.now();
  const oldalszam = felderites.oldalszam ?? 0;
  const kertModell = modell ?? szamlafolyo.modell.alapertelmezett;

  try {
    const valasz = await szetszed({
      tartalom: bajtok,
      mime,
      fajlnev: nev,
      oldalszam,
      oldalSzovegek: ut === 'szoveg' ? felderites.oldalSzovegek : null,
      modell,
      apiKulcs,
    });
    const dontes = hatarokErtelmez(valasz.nyers, oldalszam);

    return {
      modell: kertModell,
      futtatottModell: valasz.futtatottModell,
      szolgaltato: valasz.szolgaltato,
      szet: dontes.szet,
      hatarok: dontes.szet ? dontes.hatarok : null,
      javitas: dontes.szet ? dontes.javitas : null,
      indok: dontes.szet ? null : dontes.indok,
      hiba: null,
      bemenetToken: valasz.bemenetToken,
      kimenetToken: valasz.kimenetToken,
      gondolkodasToken: valasz.gondolkodasToken,
      koltseg: valasz.koltseg,
      idoMs: Date.now() - kezdet,
    };
  } catch (hiba) {
    if (!(hiba instanceof KiolvasasHiba)) throw hiba;

    return {
      modell: kertModell,
      futtatottModell: hiba.nyom?.futtatottModell ?? null,
      szolgaltato: hiba.nyom?.szolgaltato ?? null,
      szet: false,
      hatarok: null,
      javitas: null,
      indok: null,
      hiba: hiba.reszlet === null ? hiba.message : `${hiba.message} ${hiba.reszlet.slice(0, 200)}`,
      bemenetToken: hiba.nyom?.bemenetToken ?? null,
      kimenetToken: hiba.nyom?.kimenetToken ?? null,
      gondolkodasToken: hiba.nyom?.gondolkodasToken ?? null,
      koltseg: hiba.nyom?.koltseg ?? null,
      idoMs: Date.now() - kezdet,
    };
  }
}

function median(szamok: number[]): number | null {
  if (szamok.length === 0) return null;
  const r = [...szamok].sort((a, b) => a - b);
  const k = Math.floor(r.length / 2);
  return r.length % 2 === 1 ? r[k]! : Math.round((r[k - 1]! + r[k]!) / 2);
}

function tartomany(szamok: (number | null)[]): string {
  const t = szamok.filter((s): s is number => s !== null);
  if (t.length === 0) return '–';
  return `${median(t)} (${Math.min(...t)}–${Math.max(...t)})`;
}

function pad(s: string, n: number): string {
  const h = [...s].length;
  return h >= n ? `${s} ` : s + ' '.repeat(n - h);
}

/** Egy futás eredménye egy szóban: a határok, „nem: …" vagy „hiba: …". */
export function eredmenySzo(f: SzetFutas): string {
  if (f.hiba !== null) return `hiba: ${f.hiba}`;
  if (f.szet && f.hatarok !== null) return f.hatarok.length > 0 ? hatarSzo(f.hatarok) : '–';
  return `nem: ${f.indok ?? '?'}`;
}

/** A jelentés: modellenként egy oszlop. Csak oldalszám és a mi indokaink. */
export function szetJelentes(m: SzetMeres): string {
  const sorok: string[] = [
    `fájl: ${m.fajl.nev} · ${m.fajl.oldalszam ?? '?'} oldal · ${m.fajl.jelleg}`,
  ];

  if (m.ut === null) {
    sorok.push(m.kihagyva ?? 'Élesben nincs szétszedés.');
    return sorok.join('\n');
  }

  sorok.push(`út: ${m.ut === 'szoveg' ? 'az oldalak szövege (mint élesben)' : 'a fájl maga'}`);
  sorok.push(`helyes határok: ${m.vart === null ? 'nem ismertek (add meg: --vart 1-1,2-3)' : hatarSzo(m.vart)}`);
  sorok.push('');

  const modellek = [...new Set(m.futasok.map((f) => f.modell))];
  const SZ = 26;
  const OSZ = 30;
  const sor = (cim: string, ertekek: string[]) => pad(cim, SZ) + ertekek.map((e) => pad(e, OSZ)).join('');
  const ezek = (modell: string) => m.futasok.filter((f) => f.modell === modell);

  sorok.push(sor('', modellek));
  sorok.push(sor('kiszolgálta', modellek.map((x) => [...new Set(ezek(x).map((f) => f.szolgaltato ?? '?'))].join(', '))));
  sorok.push(
    sor(
      'futás / szétszedve / hiba',
      modellek.map((x) => {
        const f = ezek(x);
        return `${f.length} / ${f.filter((y) => y.szet).length} / ${f.filter((y) => y.hiba !== null).length}`;
      }),
    ),
  );
  if (m.vart !== null) {
    const vart = m.vart;
    sorok.push(
      sor(
        'HELYES',
        modellek.map((x) => {
          const f = ezek(x);
          const jo = f.filter((y) => helyes(y, vart)).length;
          return `${jo}/${f.length}${jo < f.length ? '  ✗' : ''}`;
        }),
      ),
    );
  }
  sorok.push(sor('pótolt oldal (futás)', modellek.map((x) => String(ezek(x).filter((y) => y.javitas !== null).length))));
  sorok.push(sor('gondolkodás (med, min–max)', modellek.map((x) => tartomany(ezek(x).map((f) => f.gondolkodasToken)))));
  sorok.push(sor('kimenet (med, min–max)', modellek.map((x) => tartomany(ezek(x).map((f) => f.kimenetToken)))));
  sorok.push(sor('idő ms (med, min–max)', modellek.map((x) => tartomany(ezek(x).map((f) => f.idoMs)))));
  sorok.push(
    sor(
      'költség össz. (USD)',
      modellek.map((x) => ezek(x).reduce((s, f) => s + (f.koltseg ?? 0), 0).toFixed(4)),
    ),
  );

  sorok.push('', 'EREDMÉNYEK (darab)');
  for (const x of modellek) {
    const db = new Map<string, number>();
    for (const f of ezek(x)) db.set(eredmenySzo(f), (db.get(eredmenySzo(f)) ?? 0) + 1);
    for (const [szo, n] of db) sorok.push(`  ${x} · ${szo} ×${n}`);
  }

  const javitasok = m.futasok.filter((f) => f.javitas !== null);
  if (javitasok.length > 0) {
    sorok.push('', 'PÓTOLT OLDALAK');
    for (const f of javitasok) sorok.push(`  ${f.modell} · ${f.javitas}`);
  }

  return sorok.join('\n');
}

/** Parancssori kapcsolók. Ismeretlen kapcsolóra megáll. */
export function szetArgumentumok(argv: readonly string[]): SzetKapcsolok {
  let utvonal: string | null = null;
  let ismetles = 3;
  const modellek: (string | null)[] = [];
  let fajlkent = false;
  let vart: Hatar[] | null = null;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const darab = argv[i]!;

    if (darab === '--json') {
      json = true;
    } else if (darab === '--fajlkent') {
      fajlkent = true;
    } else if (darab === '--ismetles') {
      const ertek = Number(argv[++i]);
      if (!Number.isInteger(ertek) || ertek < 1 || ertek > 20) {
        throw new SzetKapcsoloHiba('Az --ismetles egész szám 1 és 20 között.');
      }
      ismetles = ertek;
    } else if (darab === '--modell') {
      const ertek = argv[++i];
      if (ertek === undefined || ertek === '' || ertek.startsWith('--')) {
        throw new SzetKapcsoloHiba('A --modell után modellazonosító kell (a configban állóhoz: alap).');
      }
      modellek.push(ertek === 'alap' ? null : ertek);
    } else if (darab === '--vart') {
      const ertek = argv[++i];
      if (ertek === undefined || ertek.startsWith('--')) {
        throw new SzetKapcsoloHiba('A --vart után a helyes határok kellenek, pl. 1-1,2-3.');
      }
      vart = vartErtelmez(ertek);
    } else if (darab.startsWith('--')) {
      throw new SzetKapcsoloHiba(`Ismeretlen kapcsoló: ${darab}`);
    } else if (utvonal === null) {
      utvonal = darab;
    } else {
      throw new SzetKapcsoloHiba('Egyszerre egy fájl mérhető.');
    }
  }

  if (utvonal === null) {
    throw new SzetKapcsoloHiba('Melyik fájlt mérjem?');
  }

  return { utvonal, ismetles, modellek: modellek.length === 0 ? [null] : modellek, fajlkent, vart, json };
}
