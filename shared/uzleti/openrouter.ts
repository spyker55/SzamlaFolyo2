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
  /** A gondolkodás korlátozása – **csak mérésre**, lásd `Gondolkodas`. */
  gondolkodas?: Gondolkodas | null;
};

/**
 * A modell gondolkodásának korlátozása (az OpenRouter `reasoning` mezője).
 *
 * ⚠️ **Élesben nincs beállítva** – a `kiolvas` Edge Function nem adja át, a
 * kérés tehát pontosan az, ami eddig volt. Csak a `kiolvasas:proba
 * --gondolkodas` tölti ki, hogy lemérhessük, mit tesz a kiolvasással.
 *
 * Mérve, 2026-09-23: a gondolkodás időnként **elszalad**, és ilyenkor
 * annyit gondolkodik, amennyi keretet kap (2048-ból 1965, 4096-ból 3936
 * token, `MAX_TOKENS`, válasz nélkül). A keret emelése ezt csak drágította.
 *
 * Hogy a Gemini melyik alakot és milyen értéket fogad el, azt innen nem
 * tudtuk ellenőrizni (az `openrouter.ai` ebből a környezetből nem érhető el):
 * **a mérés dönti el**. A jelentés minden futás gondolkodási tokenjét
 * kiírja, tehát egy hatástalan beállítás ott rögtön látszik.
 */
export type Gondolkodas = { effort: 'low' | 'medium' | 'high' } | { max_tokens: number };

export type KiolvasasValasz = {
  nyers: Record<string, unknown>;
  /** Amit kértünk. */
  modell: string;
  /** Amit a szolgáltató **ténylegesen** futtatott — nem feltétlenül ugyanaz. */
  futtatottModell: string | null;
  promptVerzio: string;
  bemenetToken: number | null;
  kimenetToken: number | null;
  /**
   * A gondolkodásra elment tokenek — a `kimenetToken` **része**, nem afölött.
   * `null`, ha a szolgáltató nem küldte. Lásd a `hasznalatOlvas()` fejlécét.
   */
  gondolkodasToken: number | null;
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
  gondolkodasToken: number | null;
  koltseg: number | null;
};

/**
 * Amit egy modellválaszról tudunk — akkor is, ha a válasz használhatatlan.
 *
 * # Miért kell a hibához is
 *
 * 2026-09-23-án a Google (Vertex) egy kiolvasásra **200-as, de üres** választ
 * adott: 0 → 0 token, függvényhívás nélkül, $0 költséggel. Mi ebből annyit
 * mentettünk, hogy „a modell nem a kért függvénnyel válaszolt" — sem a
 * generációazonosítót, sem a leállás okát, sem a válasz testét. Az okot végül
 * az OpenRouter naplójából, képernyőképről kellett összerakni.
 *
 * Mostantól a hiba **magával viszi** a válasz nyomát, és a `kiolvas` a
 * kiolvasási sorba írja: a teljes boríték a `raw_response`-ba kerül (ugyanaz a
 * 90 napos takarítás vonatkozik rá, mint a sikeresre), az azonosító és a
 * leállás oka pedig a naplóba.
 */
export type ValaszNyom = {
  /** Az OpenRouter generációazonosítója (`gen-…`) — ezzel kereshető a naplójukban. */
  generacioId: string | null;
  futtatottModell: string | null;
  /** A `finish_reason`; ha a szolgáltató sajátja is megvan, az utána áll. */
  leallasOka: string | null;
  bemenetToken: number | null;
  kimenetToken: number | null;
  gondolkodasToken: number | null;
  koltseg: number | null;
  /** A teljes válaszboríték, érintetlenül. */
  nyers: Record<string, unknown>;
};

export class KiolvasasHiba extends Error {
  /** A modell válaszának nyoma, ha a hiba a válasz **után** keletkezett. */
  readonly nyom: ValaszNyom | null;
  /**
   * **Gyors, átmeneti** hiba: érdemes azonnal újrapróbálni (429, 5xx,
   * hálózati hiba). Lásd `atmenetiHibanUjra()`.
   *
   * Az időtúllépés **nem** ilyen – az már elhasználta a türelmi időt, és egy
   * újabb kör megduplázná a várakozást –, és az üres vagy értelmezhetetlen
   * válasz sem: az a modell viselkedése (például az elszaladt gondolkodás),
   * amire egy azonnali újrahívás csak újra fizet.
   */
  readonly atmeneti: boolean;
  /**
   * A szolgáltató nyers hibaszövege – **csak az audit-sorba és a naplóba**.
   * Az `message` a felhasználó elé kerül (`documents.error`), ez nem: angol,
   * és a 429-nél az OpenRouter saját ajánlatát is hozza („add your own
   * key…").
   */
  readonly reszlet: string | null;

  constructor(uzenet: string, nyom: ValaszNyom | null = null, atmeneti = false, reszlet: string | null = null) {
    super(uzenet);
    this.nyom = nyom;
    this.atmeneti = atmeneti;
    this.reszlet = reszlet;
  }
}

/** A szolgáltatói hibakód magyar, felhasználónak szóló alakja. */
export function szolgaltatoiHibaUzenet(kod: number): string {
  if (kod === 429) return 'A kiolvasó szolgáltatás átmenetileg túlterhelt (429).';
  if (kod >= 500) return `A kiolvasó szolgáltatás átmeneti hibát adott (${kod}).`;
  return `A kiolvasó szolgáltatás hibát adott (${Number.isFinite(kod) ? kod : '?'}).`;
}

/** A szolgáltatói hiba: magyar üzenet, nyers részlet, átmeneti-e. */
function szolgaltatoiHiba(kod: number, szoveg: string, nyom: ValaszNyom | null = null): KiolvasasHiba {
  return new KiolvasasHiba(
    szolgaltatoiHibaUzenet(kod),
    nyom,
    kod === 429 || kod >= 500,
    szoveg.slice(0, 300) || null,
  );
}

/**
 * Egyetlen újrapróbálás gyors, átmeneti hibára (`KiolvasasHiba.atmeneti`),
 * rövid várakozás után. Minden más hiba – és a második kudarc – változatlanul
 * továbbmegy.
 *
 * # Miért kell – mérve, 2026-09-23
 *
 * A Google-t az OpenRouter közös kereten éri el, és aznap ~22 modellhívásból
 * kettő 429-et kapott (*„temporarily rate-limited upstream"*). A kiolvasásnak
 * saját újrapróbálása van (kísérletszám, `kiolvasast_indit`), a
 * kötegszétszedésnek nincs: egyetlen 429 után a tartalék út visz tovább, és a
 * fájl **végleg** egyben marad – utólag senki nem szedi szét. Az első 429 után
 * ugyanaz a fájl 18 s múlva már átment; hogy a rövid várakozás elég-e, azt ez
 * nem bizonyítja, csak az esélyt javítja.
 */
export async function atmenetiHibanUjra<T>(hivas: () => Promise<T>, varakozasMs: number): Promise<T> {
  try {
    return await hivas();
  } catch (hiba) {
    if (!(hiba instanceof KiolvasasHiba) || !hiba.atmeneti) throw hiba;

    // Naplóba kerül, különben egy sikeres második kísérlet nyomtalan volna.
    console.warn(JSON.stringify({ esemeny: 'atmeneti_hiba_ujra', hiba: hiba.message.slice(0, 160) }));

    await new Promise((kesz) => setTimeout(kesz, varakozasMs));
    return await hivas();
  }
}

/**
 * A kiolvasás kimeneti tokenkerete – **a gondolkodással együtt**.
 *
 * # Miért 4096, és miért nem volt elég a 2048 – mérve, 2026-09-23
 *
 * A `max_tokens` a teljes kimenetet korlátozza, és abba a modell gondolkodása
 * is beleszámít (lásd `hasznalatOlvas()`: a `reasoning_tokens` a
 * `completion_tokens` része). Az addigi sikeres kiolvasásokban a kimenet
 * legfeljebb **1194** token volt, ebből **891** gondolkodás – a válasz maga
 * ~300. A 2048 ehhez képest 1,7-szeres tartalék volt.
 *
 * Aztán egy egyoldalas PDF-en a modell **1965 tokent gondolkodott**, és a
 * keret elfogyott a válasz előtt: `finish_reason: length`, natívan
 * `MAX_TOKENS`, tartalom és függvényhívás nélkül – egy kifizetett (~$0,01),
 * eredménytelen hívás. Ugyanaz a fájl a következő kísérleten 548 token
 * gondolkodással ment át: a gondolkodás hossza nem a bizonylattól függ, hanem
 * időnként elszalad.
 *
 * A keret emelése **a rendes esetben semmibe nem kerül** – csak a ténylegesen
 * legyártott tokent fizetjük –, az elszaladt esetben pedig egy drágább, de
 * sikeres hívás lesz belőle kettő helyett. A 4096 a mért elszaladást a
 * legnagyobb mért válasszal együtt másfélszeres tartalékkal fedi.
 */
export const KIOLVASAS_MAX_TOKEN = 4096;

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
    maxTokens: KIOLVASAS_MAX_TOKEN,
    apiKulcs: keres.apiKulcs,
    hivoUrl: keres.hivoUrl,
    gondolkodas: keres.gondolkodas ?? null,
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
    // A szöveges út rövidebb korlátot kap – lásd `koteg.szovegIdokorlatMp`.
    idokorlatMp:
      keres.oldalSzovegek === null || keres.oldalSzovegek === undefined
        ? undefined
        : szamlafolyo.koteg.szovegIdokorlatMp,
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
  /** A teljes hívás időkorlátja (kérés + választörzs). Alapból a kiolvasásé. */
  idokorlatMp?: number | undefined;
  /** Csak mérésre; `null` esetén a kérésben nincs `reasoning` mező. */
  gondolkodas?: Gondolkodas | null;
};

/**
 * A szolgáltatói kikötés — a kérés adatvédelmi kapuja.
 *
 * Négy mező, és **egyik sem helyettesíti a másikat**; ez a szétválasztás a
 * jogi felülvizsgálat egyik kifejezett kérése volt, mert a „nem tanítanak
 * vele" és a „nem tárolják" két különböző ígéret:
 *
 * - `only` — **kinek szabad kiszolgálnia.** Enélkül a tájékoztató nem tudna
 *   céget megnevezni, az ÁSZF 11. pontja viszont név szerinti felsorolást
 *   ígér. A névsor a configban áll, a mérésével együtt.
 * - `allow_fallbacks: false` — **és senki másnak.** Az OpenRouter
 *   alapértelmezésben továbbejti a kérést egy másik szolgáltatóhoz, ha az
 *   első nem elérhető. Pont ez az a csendes út, amin egy meg nem nevezett
 *   címzetthez kerülne a bizonylat. Inkább álljon meg.
 * - `zdr: true` — **ne is tárolják.** Ez az OpenRouter külön jelzője a nulla
 *   adatmegőrzésű végpontokra. ⚠️ Azért mertük bekapcsolni, mert előbb
 *   megmértük: a `/models` listája 446 modellt ad, a `?zdr=true` szűrővel
 *   318-at, és a `google/gemini-3.8-flash` **benne van** a szűkített listában
 *   (2026-09-20). Enélkül ez a sor minden kiolvasást megállíthatott volna.
 *
 *   **Azóta élesben is lefutott** (2026-09-20 18:33 UTC, `kiolvas` v14): egy
 *   valódi PDF mind a négy kikötéssel átment — `error: null`, `attempts: 1`,
 *   `model_version: google/gemini-3.8-flash`, 0,006703 USD, 9,0 s. Ez a
 *   különbség számít: a modell-lista azt mondta meg, hogy *létezik* ilyen
 *   végpont, ez pedig azt, hogy a négy kikötés **együtt** is kiszolgálható.
 *   Ha az útválasztás kiürült volna, nem lassabb választ kaptunk volna,
 *   hanem semmit — a bizonylat három próbálkozás után `hiba` lesz.
 *
 *   Összemérve a szigorítás előtti, ugyanilyen méretű PDF-fel (3457 bemeneti
 *   token mindkétszer): 0,006429 → 0,006703 USD, 10,1 → 9,0 s. Vagyis a
 *   névsor lekötésének **mérve nincs ára** — ugyanaz a Google-végpont
 *   szolgál ki, csak most már ki is van mondva, hogy más nem.
 * - `data_collection: 'deny'` — **ne is tanuljanak belőle.** Ez marad a
 *   legrégebbi kikötésünk, de magában kevés: az OpenRouter saját leírása
 *   szerint ez az ő legjobb tudásuk, nem garancia.
 *
 * **Egyik sem kapcsolható ki környezeti változóból, és ez szándékos.** Az
 * adatkezelési tájékoztató ígéretet tesz róluk; egy átbillenthető ígéret
 * rosszabb, mint a semmilyen, mert az olvasó nem látja, épp melyik állapotban
 * van. Ha nem marad választható szolgáltató, a kérés hibával áll meg — a
 * dokumentum a Beérkezőben marad, és újrapróbálható. Ez a helyes irány: a
 * csendben átengedett adatot már nem lehet visszakérni.
 */
export function szolgaltatoiKikotes(): {
  only: readonly string[];
  allow_fallbacks: false;
  zdr: true;
  data_collection: 'deny';
} {
  return {
    only: szamlafolyo.modell.szolgaltatok,
    allow_fallbacks: false,
    zdr: true,
    data_collection: 'deny',
  };
}

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
  gondolkodasToken: number | null;
  koltseg: number | null;
}> {
  const torzs = {
    model: keres.modell,

    // A bizonylat idegen cégek adatait viszi magával, ezért négy kikötés
    // megy vele — és a négy **külön dolgot** mond ki. Lásd a
    // `szolgaltatoiKikotes()` fejlécét.
    provider: szolgaltatoiKikotes(),

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
    // Csak ha kérték – élesben soha (lásd `Gondolkodas`).
    ...(keres.gondolkodas ? { reasoning: keres.gondolkodas } : {}),
  };

  // ⚠️ **Az időkorlát a teljes hívásra vonatkozik, a választörzsre is.**
  // 2026-09-23-ig az időzítő a fejléc megérkezésekor leállt, és a
  // `valasz.json()` korlát nélkül futott: egy fejléc után elakadó törzs a
  // függvényt az Edge Runtime saját határáig tartotta volna, a bizonylatot
  // pedig addig „feldolgozás alatt". A jel a törzs olvasását is megszakítja.
  const idokorlatMp = keres.idokorlatMp ?? szamlafolyo.modell.idokorlatMp;
  const vezerlo = new AbortController();
  const idozito = setTimeout(() => vezerlo.abort(), idokorlatMp * 1000);
  const idotullepes = () =>
    new KiolvasasHiba(`A kiolvasás túllépte az időkorlátot (${idokorlatMp} s).`);

  let valaszJson: Record<string, unknown>;
  try {
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
      throw vezerlo.signal.aborted
        ? idotullepes()
        : new KiolvasasHiba('Nem sikerült elérni a kiolvasó szolgáltatást.', null, true);
    }

    if (!valasz.ok) {
      const szoveg = await valasz.text().catch(() => '');
      throw szolgaltatoiHiba(valasz.status, szoveg);
    }

    try {
      valaszJson = (await valasz.json()) as Record<string, unknown>;
    } catch {
      throw vezerlo.signal.aborted
        ? idotullepes()
        : new KiolvasasHiba('A kiolvasó szolgáltatás válasza nem értelmezhető.');
    }
  } finally {
    clearTimeout(idozito);
  }

  const nyom = valaszNyom(valaszJson);

  let nyers: Record<string, unknown>;

  try {
    nyers = argumentumok(valaszJson);
  } catch (hiba) {
    // A válasz megjött, csak nem használható: a nyomot a hibához csatoljuk,
    // hogy a hívó el tudja menteni.
    if (hiba instanceof KiolvasasHiba) throw new KiolvasasHiba(hiba.message, nyom, hiba.atmeneti, hiba.reszlet);
    throw hiba;
  }

  return {
    nyers,
    futtatottModell: nyom.futtatottModell,
    bemenetToken: nyom.bemenetToken,
    kimenetToken: nyom.kimenetToken,
    gondolkodasToken: nyom.gondolkodasToken,
    koltseg: nyom.koltseg,
  };
}

/** A válasz nyoma — **exportált és tiszta**, hogy tesztelhető legyen. */
export function valaszNyom(valasz: Record<string, unknown>): ValaszNyom {
  const elso = elsoValasztas(valasz);
  const okok = [elso?.['finish_reason'], elso?.['native_finish_reason']].filter(
    (ok): ok is string => typeof ok === 'string' && ok !== '',
  );

  return {
    generacioId: typeof valasz['id'] === 'string' ? valasz['id'] : null,
    futtatottModell: typeof valasz['model'] === 'string' ? valasz['model'] : null,
    leallasOka: okok.length > 0 ? [...new Set(okok)].join(' / ') : null,
    ...hasznalatOlvas(valasz),
    nyers: valasz,
  };
}

function elsoValasztas(valasz: Record<string, unknown>): Record<string, unknown> | null {
  const valasztasok = valasz['choices'];
  const elso: unknown = Array.isArray(valasztasok) ? valasztasok[0] : null;

  return elso !== null && typeof elso === 'object' ? (elso as Record<string, unknown>) : null;
}

/**
 * A kikényszerített függvényhívás argumentumai. Ha nincs, az hiba.
 *
 * Két hibát különböztetünk meg, mert mást jelentenek: az **üres** válasz
 * (se függvényhívás, se szöveg — a 2026-09-23-i Vertex-eset) a szolgáltató
 * átmeneti hibája, a **szöveges** válasz viszont azt jelenti, hogy a modell
 * nem követte a kikényszerített hívást.
 *
 * ⚠️ **A 200-as válasz is hordozhat szolgáltatói hibát.** Mérve, 2026-09-23:
 * három „üres válasz" valójában a választás `error` mezőjébe csomagolt **429**
 * volt (`finish_reason: "error"`, `{"code":429,"message":"… temporarily
 * rate-limited upstream …"}`, 0 token, $0). Mivel ezt nem néztük, a
 * felhasználó „A modell üres választ adott." szöveget látott, a szétszedés pedig
 * nem próbált újra. Most ez ugyanazt a hibát adja, mint egy HTTP-429, és
 * ugyanúgy átmeneti.
 */
export function argumentumok(valasz: Record<string, unknown>): Record<string, unknown> {
  const elso = elsoValasztas(valasz);
  const beagyazottHiba = elso?.['error'] as Record<string, unknown> | undefined;

  if (beagyazottHiba !== null && typeof beagyazottHiba === 'object') {
    const kod = Number(beagyazottHiba['code']);
    const szoveg = typeof beagyazottHiba['message'] === 'string' ? beagyazottHiba['message'] : '';

    throw szolgaltatoiHiba(kod, szoveg);
  }

  const uzenet = elso?.['message'] as Record<string, unknown> | undefined;
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
    const tartalom = uzenet?.['content'];
    const vanSzoveg =
      (typeof tartalom === 'string' && tartalom.trim() !== '') ||
      (Array.isArray(tartalom) && tartalom.length > 0);

    throw new KiolvasasHiba(
      vanSzoveg ? 'A modell nem a kért függvénnyel válaszolt.' : 'A modell üres választ adott.',
    );
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

/**
 * A `usage` blokk kiolvasása — **exportált és tiszta**, hogy tesztelhető legyen
 * hálózat nélkül. Ez nem kényelmi döntés: ez a függvény a mérőeszközünk, és egy
 * mérőeszköz, amit nem lehet megmérni, nem ér semmit.
 *
 * ## Miért van itt a gondolkodási token
 *
 * Egy valódi, egyoldalas PDF kiolvasása 9,0 másodperc volt (2026-09-20). A
 * tárolt nyers válasz **836 karakter** — nagyjából 250-300 token —, a számlázott
 * kimenet viszont **1096 token**. A különbség, úgy 800 token, **nincs benne a
 * válaszban**: ez a modell gondolkodása.
 *
 * **A gyanú beigazolódott** (2026-09-21, az első mérés a `reasoning_tokens`
 * oszloppal): `output_tokens: 1194`, ebből `reasoning_tokens: 891` — a kimenet
 * **74,6%-a** gondolkodás, a tényleges válasz nagyjából 300 token.
 *
 * ⚠️ **A `reasoning_tokens` a `completion_tokens` RÉSZE, nem afölött van.**
 * Aki egyszer összeadja a kettőt, az a kimenetet másfélszer számolja el. Ezért
 * áll ez itt is, az oszlop megjegyzésében is, és ezért van rá külön teszt.
 *
 * `null`, ha a szolgáltató nem küldte — és ez tartalmi állítás: *nem tudjuk*,
 * nem pedig *nulla*. A kettő különbsége akkor fog számítani, amikor a
 * gondolkodás korlátozását mérjük: egy odaírt nulla úgy nézne ki, mintha a
 * korlátozás már hatna.
 */
export function hasznalatOlvas(valasz: Record<string, unknown>): {
  bemenetToken: number | null;
  kimenetToken: number | null;
  gondolkodasToken: number | null;
  koltseg: number | null;
} {
  const u = valasz['usage'] as Record<string, unknown> | undefined;
  const reszletek = u?.['completion_tokens_details'] as Record<string, unknown> | undefined;

  return {
    bemenetToken: szamVagyNull(u?.['prompt_tokens']),
    kimenetToken: szamVagyNull(u?.['completion_tokens']),
    gondolkodasToken: szamVagyNull(reszletek?.['reasoning_tokens']),
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
