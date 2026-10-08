import { szamlafolyo } from '../config/szamlafolyo.ts';
import { SzetKapcsoloHiba, szetArgumentumok, szetJelentes, szetMerj } from './szetszedesMeres.ts';

/**
 * `npm run szetszedes:proba <pdf>` — **a kötegszétszedés mérőeszköze.**
 *
 * Ugyanazt a hívást és ugyanazt az értelmezést futtatja, mint a `kiolvas`
 * Edge Function (`szetszed()` + `hatarokErtelmez()`), ugyanazon az úton
 * (szöveg vagy fájl). Több `--modell` egymás mellé kerül. A logika és a
 * részletek: `szetszedesMeres.ts`.
 *
 * ```
 * npm run szetszedes:proba -- tesztadat/harom-szamla-rendes.pdf --modell alap --modell anthropic/claude-haiku-5.5
 * npm run szetszedes:proba -- koteg.pdf --vart 1-2,3-3,4-6 --modell alap --modell anthropic/claude-haiku-5.5
 * npm run szetszedes:proba -- tesztadat/harom-szamla-rendes.pdf --fajlkent --modell alap --modell anthropic/claude-haiku-5.5
 * ```
 *
 * A modellhívás valódi pénz az OpenRouter-egyenlegből. A kulcs a `.env`-ből
 * jön (`OPENROUTER_API_KEY`) – **soha ne másold ki onnan**.
 */

const HASZNALAT = `
Használat:
  npm run szetszedes:proba -- <pdf> [--modell <id>|alap]… [--ismetles N] [--vart 1-1,2-3] [--fajlkent] [--json]

  --modell <id>  ismételhető; az „alap" a configban álló ${szamlafolyo.modell.alapertelmezett}
  --ismetles N   modellenként ennyi futás (alap: 3)
  --vart …       a helyes határok; a saját próbafájlunknál magától tudja
  --fajlkent     a szöveg helyett a fájlt küldi (a szkennelt kötegek útja)
  --json         nyers mérés JSON-ban
`;

async function fo(): Promise<number> {
  const k = szetArgumentumok(process.argv.slice(2));
  const meres = await szetMerj(k, (uzenet) => console.error(`${uzenet}\n`));

  console.log(k.json ? JSON.stringify(meres, null, 2) : szetJelentes(meres));
  return 0;
}

process.exitCode = await fo().catch((hiba: unknown) => {
  console.error(hiba instanceof Error ? hiba.message : String(hiba));
  if (hiba instanceof SzetKapcsoloHiba) console.error(HASZNALAT);
  return 1;
});
