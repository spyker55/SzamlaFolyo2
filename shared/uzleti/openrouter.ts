import { szamlafolyo } from '../../config/szamlafolyo.ts';
import { FUGGVENY_NEV, toolSema } from './sema.ts';
import { KOTEG_FUGGVENY_NEV, kotegSema } from './koteg.ts';
import {
  felhasznalo,
  rendszer,
  szetszedoFelhasznalo,
  szetszedoRendszer,
  SZETSZEDES_VERZIO,
  VERZIO,
} from './prompt.ts';

/**
 * Az OpenRouter hívása.
 *
 * OpenAI-kompatibilis végpont, ezért nincs szükség SDK-ra — egy HTTP kérés az
 * egész. A kötött kimenetet **egyetlen, kikényszerített függvényhívással**
 * érjük el: így a válasz nem szabad szöveg, amiből JSON-t kellene bányászni,
 * hanem eleve a mi sémánk szerinti objektum.
 */

export type KiolvasasKeres = {
  /** A bizonylat nyers bájtjai. */
  tartalom: Uint8Array;
  mime: string;
  fajlnev: string;
  cegNev?: string | null;
  cegAdoszam?: string | null;
  /** Felülírja a konfigurált modellt (összeméréshez). */
  modell?: string | null;
  apiKulcs: string;
  /** Az `HTTP-Referer` fejléchez; az OpenRouter ezzel azonosítja a hívót. */
  hivoUrl?: string;
};

export type KiolvasasValasz = {
  nyers: Record<string, unknown>;
  /** Amit kértünk. */
  modell: string;
  /** Amit a szolgáltató **ténylegesen** futtatott — nem feltétlenül ugyanaz. */
  futtatottModell: string | null;
  promptVerzio: string;
  bemenetToken: number | null;
  kimenetToken: number | null;
  koltseg: number | null;
};

export type SzetszedesKeres = {
  /** A PDF nyers bájtjai. Csak akkor megy át, ha nincs `oldalSzovegek`. */
  tartalom: Uint8Array;
  mime: string;
  fajlnev: string;
  /** A fájl oldalszáma — a prompt és a válasz ellenőrzése is erre épül. */
  oldalszam: number;
  /** Oldalankénti szöveg, ha van szövegréteg. `null` esetén a fájl megy. */
  oldalSzovegek?: readonly string[] | null;
  modell?: string | null;
  apiKulcs: string;
  hivoUrl?: string;
};

export type SzetszedesValasz = {
  /** A `koteg.ts` `hatarokErtelmez()`-e értelmezi — itt nem hiszünk el semmit. */
  nyers: Record<string, unknown>;
  modell: string;
  futtatottModell: string | null;
  promptVerzio: string;
  bemenetToken: number | null;
  kimenetToken: number | null;
  koltseg: number | null;
};

export class KiolvasasHiba extends Error {}

export async function kiolvas(keres: KiolvasasKeres): Promise<KiolvasasValasz> {
  if (keres.apiKulcs === '') {
    throw new KiolvasasHiba('Nincs beállítva az OpenRouter API-kulcs.');
  }

  const modell = keres.modell ?? szamlafolyo.modell.alapertelmezett;

  const eredmeny = await hivas({
    modell,
    uzenetek: [
      { role: 'system', content: rendszer(keres.cegNev, keres.cegAdoszam) },
      { role: 'user', content: [fajlResz(keres.tartalom, keres.mime, keres.fajlnev), { type: 'text', text: felhasznalo() }] },
    ],
    fuggvenyNev: FUGGVENY_NEV,
    fuggvenyLeiras: 'A bizonylatról leolvasott adatok rögzítése.',
    sema: toolSema(),
    maxTokens: 2048,
    apiKulcs: keres.apiKulcs,
    hivoUrl: keres.hivoUrl,
  });

  return { ...eredmeny, modell, promptVerzio: VERZIO };
}

/**
 * A kötegszétszedés: **hol kezdődik és hol ér véget egy-egy bizonylat.**
 *
 * Külön hívás, külön prompttal és külön sémával. Nem takarékosságból külön:
 * ha ugyanaz a hívás olvasná ki az adatokat *és* jelölné a határokat, a modell
 * a hosszú kimenet végére elfáradna, és pont a határok romlanának el — azok
 * viszont minden további lépést eldöntenek.
 *
 * ⚠️ **Szövegréteg esetén nem a PDF-et küldjük, hanem az oldalak szövegét.**
 * A határok felismeréséhez a szöveg elég (fejléc, bizonylatszám, „1/3. oldal"),
 * és ez nagyságrenddel olcsóbb, mint hatvan oldalnyi képet átvinni. Kép
 * alapú (szkennelt) PDF-nél nincs mit szöveggé tenni: ott a fájl megy.
 */
export async function szetszed(keres: SzetszedesKeres): Promise<SzetszedesValasz> {
  if (keres.apiKulcs === '') {
    throw new KiolvasasHiba('Nincs beállítva az OpenRouter API-kulcs.');
  }

  const modell = keres.modell ?? szamlafolyo.modell.alapertelmezett;

  const eredmeny = await hivas({
    modell,
    uzenetek: [
      { role: 'system', content: szetszedoRendszer(keres.oldalszam) },
      {
        role: 'user',
        content: [
          keres.oldalSzovegek === null || keres.oldalSzovegek === undefined
            ? fajlResz(keres.tartalom, keres.mime, keres.fajlnev)
            : { type: 'text', text: oldalakSzovege(keres.oldalSzovegek) },
          { type: 'text', text: szetszedoFelhasznalo() },
        ],
      },
    ],
    fuggvenyNev: KOTEG_FUGGVENY_NEV,
    fuggvenyLeiras: 'A fájlban található bizonylatok oldalhatárainak rögzítése.',
    sema: kotegSema(),
    // Harminc tartomány két számmal bőven elfér ennyiben; a séma nem enged
    // hosszabb kimenetet érdemben.
    maxTokens: 1024,
    apiKulcs: keres.apiKulcs,
    hivoUrl: keres.hivoUrl,
  });

  return { ...eredmeny, modell, promptVerzio: SZETSZEDES_VERZIO };
}

/** A PDF fájlként, a kép képként megy — a modellek ezt a két alakot értik, és a kettő nem cserélhető fel. */
function fajlResz(tartalom: Uint8Array, mime: string, fajlnev: string): Record<string, unknown> {
  const adatUrl = `data:${mime};base64,${base64(tartalom)}`;

  return mime.startsWith('image/')
    ? { type: 'image_url', image_url: { url: adatUrl } }
    : { type: 'file', file: { filename: fajlnev, file_data: adatUrl } };
}

/**
 * Az oldalankénti szöveg egyetlen üzenetté.
 *
 * Az oldalszám **kiírva** megy, nem a sorrendre bízva: a modellnek 1-alapú
 * oldalszámokkal kell válaszolnia, és a saját bemenetében kell látnia, melyik
 * szöveg hányadik oldal.
 */
function oldalakSzovege(oldalak: readonly string[]): string {
  return oldalak
    .map((szoveg, i) => {
      const tiszta = szoveg.replace(/[ \t]+/g, ' ').trim();
      return `--- ${i + 1}. oldal ---\n${tiszta === '' ? '(nincs szöveg ezen az oldalon)' : tiszta}`;
    })
    .join('\n\n');
}

type HivasKeres = {
  modell: string;
  uzenetek: unknown[];
  fuggvenyNev: string;
  fuggvenyLeiras: string;
  sema: Record<string, unknown>;
  maxTokens: number;
  apiKulcs: string;
  hivoUrl?: string | undefined;
};

/**
 * A közös szállító: egy kikényszerített függvényhívás az OpenRouteren.
 *
 * Mindkét kör ezen megy át, tehát az adatvédelmi kikötés, az időkorlát és a
 * hibakezelés **egy helyen** él — a szétszedés ugyanolyan idegen cégek adatait
 * viszi magával, mint a kiolvasás.
 */
async function hivas(keres: HivasKeres): Promise<{
  nyers: Record<string, unknown>;
  futtatottModell: string | null;
  bemenetToken: number | null;
  kimenetToken: number | null;
  koltseg: number | null;
}> {
  const torzs = {
    model: keres.modell,

    // A bizonylat idegen cégek adatait viszi magával, ezért csak olyan
    // szolgáltatóhoz mehet, amelyik nem tárolja és nem tanul belőle. Az
    // OpenRouter a többit ilyenkor kihagyja az útválasztásból.
    //
    // **Nem kapcsolható ki környezeti változóból, és ez szándékos.** Az
    // adatkezelési tájékoztató ígéretet tesz erről; egy átbillenthető ígéret
    // pedig rosszabb, mint a semmilyen, mert az olvasó nem látja, épp melyik
    // állapotban van. Ha egyszer nem marad választható szolgáltató, a kérés
    // hibával áll meg — a dokumentum a Beérkezőben marad, és újrapróbálható.
    // Ez a helyes irány: a csendben átengedett adatot már nem lehet visszakérni.
    provider: { data_collection: 'deny' },

    messages: keres.uzenetek,
    tools: [
      {
        type: 'function',
        function: {
          name: keres.fuggvenyNev,
          description: keres.fuggvenyLeiras,
          parameters: keres.sema,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: keres.fuggvenyNev } },
    max_tokens: keres.maxTokens,
    usage: { include: true },
  };

  const vezerlo = new AbortController();
  const idozito = setTimeout(() => vezerlo.abort(), szamlafolyo.modell.idokorlatMp * 1000);

  let valasz: Response;
  try {
    valasz = await fetch(`${szamlafolyo.modell.alapUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keres.apiKulcs}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': keres.hivoUrl ?? 'https://szamlafolyo.hu',
        'X-Title': 'SzamlaFolyo',
      },
      body: JSON.stringify(torzs),
      signal: vezerlo.signal,
    });
  } catch (hiba) {
    throw new KiolvasasHiba(
      hiba instanceof Error && hiba.name === 'AbortError'
        ? 'A kiolvasás túllépte az időkorlátot.'
        : 'Nem sikerült elérni a kiolvasó szolgáltatást.',
    );
  } finally {
    clearTimeout(idozito);
  }

  if (!valasz.ok) {
    const szoveg = await valasz.text().catch(() => '');
    throw new KiolvasasHiba(`A kiolvasó szolgáltatás hibát adott (${valasz.status}). ${szoveg.slice(0, 300)}`);
  }

  const valaszJson = (await valasz.json()) as Record<string, unknown>;

  return {
    nyers: argumentumok(valaszJson),
    futtatottModell: typeof valaszJson['model'] === 'string' ? valaszJson['model'] : null,
    ...hasznalat(valaszJson),
  };
}

/** A kikényszerített függvényhívás argumentumai. Ha nincs, az hiba. */
function argumentumok(valasz: Record<string, unknown>): Record<string, unknown> {
  const valasztasok = valasz['choices'];
  const elso = Array.isArray(valasztasok) ? valasztasok[0] : null;
  const uzenet = (elso as Record<string, unknown> | null)?.['message'] as
    | Record<string, unknown>
    | undefined;
  const hivasok = uzenet?.['tool_calls'];
  const hivas = Array.isArray(hivasok) ? hivasok[0] : null;
  const fuggveny = (hivas as Record<string, unknown> | null)?.['function'] as
    | Record<string, unknown>
    | undefined;
  const nyersArgumentumok = fuggveny?.['arguments'];

  if (typeof nyersArgumentumok !== 'string') {
    // Ha a modell nem a függvényt hívta, nincs értelmezhető eredményünk. A
    // szabad szövegből való JSON-bányászás pont az a bizonytalanság, amit a
    // kikényszerített hívással kerülünk el.
    throw new KiolvasasHiba('A modell nem a kért függvénnyel válaszolt.');
  }

  try {
    const elemzett = JSON.parse(nyersArgumentumok) as unknown;
    if (elemzett === null || typeof elemzett !== 'object') {
      throw new Error('nem objektum');
    }
    return elemzett as Record<string, unknown>;
  } catch {
    throw new KiolvasasHiba('A modell válasza nem értelmezhető.');
  }
}

function hasznalat(valasz: Record<string, unknown>): {
  bemenetToken: number | null;
  kimenetToken: number | null;
  koltseg: number | null;
} {
  const u = valasz['usage'] as Record<string, unknown> | undefined;

  return {
    bemenetToken: szamVagyNull(u?.['prompt_tokens']),
    kimenetToken: szamVagyNull(u?.['completion_tokens']),
    koltseg: szamVagyNull(u?.['cost']),
  };
}

function szamVagyNull(ertek: unknown): number | null {
  return typeof ertek === 'number' && Number.isFinite(ertek) ? ertek : null;
}

/** Bájtok base64-be, futtatókörnyezettől függetlenül. */
function base64(bajtok: Uint8Array): string {
  let s = '';
  const darab = 0x8000;

  for (let i = 0; i < bajtok.length; i += darab) {
    s += String.fromCharCode(...bajtok.subarray(i, i + darab));
  }

  return btoa(s);
}
