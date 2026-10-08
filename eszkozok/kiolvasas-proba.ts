import { szamlafolyo } from '../config/szamlafolyo.ts';
import { jelentes, jsonAlak } from './jelentes.ts';
import { argumentumok, KapcsoloHiba, merj } from './meres.ts';

/**
 * `npm run kiolvasas:proba <fájl>` — **a kiolvasás mérőeszköze.**
 *
 * A régi rendszerben ez egy artisan-parancs volt, és a terv az első naptól
 * felsorolta: prompt- vagy modellcsere után enélkül nem lehet megmondani,
 * javult-e a pontosság. Egy bizonylatot végigvisz ugyanazon a láncon, amit a
 * `kiolvas` Edge Function futtat, és kiírja, amit az adatbázisba írna.
 *
 * ## Amit mér
 *
 * - **felderítés**: jelleg, oldalszám, szövegréteg, beágyazott XML;
 * - **ki olvasta ki**: az értelmező neve vagy a modell — és hogy a szolgáltató
 *   *ténylegesen* melyiket futtatta;
 * - **prompt verzió, token, gondolkodási token, költség, idő**;
 * - a 15 mező a **tárolt alakjában**, a magabiztossági **sávok**, a **bukott
 *   validátorok**, az ÁFA-bontás, a két zászló és a kredit;
 * - `--ismetles N` mellett a mezők **állandósága** futások között.
 *
 * ## Amit NEM mér, és ezt tudni kell
 *
 * ⚠️ **Ez a repó kódját futtatja, nem a telepített függvényt.** Ha a telepített
 * `kiolvas` elmarad a repótól, a script attól még zöldet mutat. A telepítés
 * bizonyítéka továbbra is a visszaolvasott forrás és egy valódi bizonylat a
 * Beérkezőben — ez a PLACEHOLDER-eset szabálya, és egy helyi script nem
 * váltja ki.
 *
 * ⚠️ **A kapuk döntése kimarad**: a hét kapuból négy a cég adatbázisbeli
 * előzményeiből dolgozik, és azok itt nincsenek. Lásd a `jelentes.ts`
 * `zaszloSorok()`-ját.
 *
 * A script **semmit nem ír**: nincs adatbázis, nincs tároló, nincs kredit, a
 * bizonylat nem kerül a Beérkezőbe. A modellhívás viszont **valódi pénz** az
 * OpenRouter-egyenlegből (nagyságrendileg 2 Ft bizonylatonként), és a fájl
 * ugyanúgy elhagyja a gépet, mint élesben — ugyanazzal a négy szolgáltatói
 * kikötéssel (`szolgaltatoiKikotes()`).
 *
 * ## Használat
 *
 * ```
 * npm run kiolvasas:proba minta/ubl-szabalyos.xml
 * npm run kiolvasas:proba -- szamla.pdf --ismetles 5
 * npm run kiolvasas:proba -- szamla.pdf --modell google/gemini-3.1-flash-lite
 * npm run --silent kiolvasas:proba -- szamla.pdf --json > meres.json
 * npm run kiolvasas:proba -- szamla.pdf --ismetles 10 --gondolkodas low
 * npm run kiolvasas:proba -- szamla.pdf --modell google/gemini-3.8-flash
 * ```
 *
 * ## Másik gyártó modellje (2026-10-08, Claude Haiku 5.5)
 *
 * A configban álló szolgáltatói névsor csak a Google két végpontját engedi,
 * ezért egy más gyártójú modell kérése „nincs kiszolgáló végpont" hibával
 * áll meg — ez szándékos. A `--szolgaltato` (ismételhető) **csak erre a
 * mérésre** cseréli a névsort; a ZDR, a `data_collection: "deny"` és a
 * tartalék útvonal tilalma ilyenkor is megy.
 *
 * ⚠️ Az Adatkezelési tájékoztató ezt a címzettet **nem nevezi meg**: így csak
 * a `tesztadat/` próbaszámláit és a saját bizonylataidat mérd, ügyfélét
 * soha. Először próbáld `--szolgaltato` nélkül: ha a modellt a Google is
 * kiszolgálja, a névsor változatlanul átengedi.
 *
 * Mérve, 2026-10-08: a Haiku 5.5-öt a Google (Vertex) kiszolgálja, a
 * `--szolgaltato anthropic` viszont 10/10 futásban 404-et adott – az
 * Anthropic saját végpontja a négy kikötéssel nem érhető el.
 *
 * ⚠️ Fájlba írásnál a `--silent` kell: nélküle az `npm run` a JSON elé a saját
 * fejlécét is kiírja (2026-09-23-án így készült három mérés; az
 * `eszkozok/meres-osszevetes.ts` azóta átugorja).
 *
 * A modellhívásos ághoz `OPENROUTER_API_KEY` kell a `.env`-ben (az npm script
 * onnan olvassa). A kulcsot **soha ne másold ki onnan** — ugyanaz a szabály,
 * mint a `service_role`-nál.
 */

const HASZNALAT = `
Használat:
  npm run kiolvasas:proba <fájl> [--ismetles N] [--modell <azonosító>] [--szolgaltato <slug>] [--json]

  --ismetles N   ugyanazt a fájlt N-szer olvastatja ki, és megmutatja, mely
                 mezők ingadoznak. N-szer annyiba is kerül. (alap: 1)
  --modell <id>  a configban álló ${szamlafolyo.modell.alapertelmezett} helyett
  --gondolkodas <low|medium|high|N>
                 a modell gondolkodásának korlátozása (csak mérés; élesben
                 nincs beállítva). N: legfeljebb ennyi token.
  --szolgaltato <slug>
                 a configban álló szolgáltatói névsor helyett, csak erre a
                 mérésre (ismételhető). Csak próbaszámlával vagy a saját
                 bizonylatoddal – ügyfélével soha.
  --json         nyers mérés JSON-ban, összeméréshez
`;

async function fo(): Promise<number> {
  const kapcsolok = argumentumok(process.argv.slice(2));
  const meres = await merj(kapcsolok, (uzenet) => console.error(`${uzenet}\n`));

  console.log(kapcsolok.json ? JSON.stringify(jsonAlak(meres), null, 2) : jelentes(meres));

  return 0;
}

process.exitCode = await fo().catch((hiba: unknown) => {
  console.error(hiba instanceof Error ? hiba.message : String(hiba));

  if (hiba instanceof KapcsoloHiba) {
    console.error(HASZNALAT);
  }

  return 1;
});
