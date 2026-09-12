import { szamlafolyo } from '../../config/szamlafolyo.ts';
import { FUGGVENY_NEV, toolSema } from './sema.ts';
import { felhasznalo, rendszer, VERZIO } from './prompt.ts';

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

export class KiolvasasHiba extends Error {}

export async function kiolvas(keres: KiolvasasKeres): Promise<KiolvasasValasz> {
  if (keres.apiKulcs === '') {
    throw new KiolvasasHiba('Nincs beállítva az OpenRouter API-kulcs.');
  }

  const modell = keres.modell ?? szamlafolyo.modell.alapertelmezett;
  const adatUrl = `data:${keres.mime};base64,${base64(keres.tartalom)}`;

  // A PDF fájlként, a kép képként megy — a modellek ezt a két alakot értik, és
  // a kettő nem cserélhető fel.
  const resz = keres.mime.startsWith('image/')
    ? { type: 'image_url', image_url: { url: adatUrl } }
    : { type: 'file', file: { filename: keres.fajlnev, file_data: adatUrl } };

  const torzs = {
    model: modell,

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

    messages: [
      { role: 'system', content: rendszer(keres.cegNev, keres.cegAdoszam) },
      { role: 'user', content: [resz, { type: 'text', text: felhasznalo() }] },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: FUGGVENY_NEV,
          description: 'A bizonylatról leolvasott adatok rögzítése.',
          parameters: toolSema(),
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: FUGGVENY_NEV } },
    max_tokens: 2048,
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
    modell,
    futtatottModell: typeof valaszJson['model'] === 'string' ? valaszJson['model'] : null,
    promptVerzio: VERZIO,
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
