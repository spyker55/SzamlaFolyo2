/**
 * A `kiolvas` telepíthető csomagja.
 *
 * # Miért van erre szükség
 *
 * A függvény forrása huszonnégy fájl (a `shared/uzleti` magja, a config és a
 * három saját modul), és **ez a repóban is így marad** — a tiszta üzleti logika
 * egyetlen példányban él, azt importálja a böngésző és az Edge Function is.
 *
 * A telepítés viszont ebből a környezetből csak a Supabase MCP-n át megy (a
 * `*.supabase.co` és az `api.supabase.com` is zárt innen), az MCP pedig a
 * fájlokat a hívásba ágyazva várja. Huszonnégy fájl így nem fér el egy
 * hívásban; **egy csomag igen.**
 *
 * # Amit tudni kell róla
 *
 * - A kimenet **generált**: soha ne szerkeszd kézzel. Ami itt változik, az a
 *   forrásban változzon, és futtasd újra: `npm run kiolvas:csomag`.
 * - A kommentek kiesnek belőle. Ez nem veszteség: a magyarázat a forrásban van,
 *   ez a fájl a build eredménye.
 * - **Minifikált**, azonosítókkal együtt. Ez nem hanyagság: a csomagnak egyetlen
 *   MCP-hívásba kell beleférnie, és a méret ott valódi korlát. A veszteség
 *   kisebb, mint elsőre látszik — a hibakeresés felülete itt nem a veremnyom,
 *   hanem a **magyar hibaüzenet**, ami a `documents.error` oszlopba és a naplóba
 *   kerül; azt a minifikálás nem érinti.
 * - A nem ASCII karaktereket az esbuild `\uXXXX` alakra írja át, és ez itt
 *   előny: a csomag egyetlen `€` jelet leszámítva tiszta ASCII, tehát átmegy
 *   bármilyen közvetítőn anélkül, hogy egy láthatatlan karakter elromolhatna.
 * - A három csomagfüggőség (`@supabase/supabase-js`, `unpdf`, `fast-xml-parser`)
 *   **kívül marad**: azokat a Deno oldja fel a `supabase/functions/deno.json`
 *   import-térképéből, ugyanúgy, ahogy a nem csomagolt változatnál tenné.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const itt = dirname(fileURLToPath(import.meta.url));
const gyoker = resolve(itt, '../../..');

const eredmeny = await build({
  entryPoints: [resolve(itt, 'index.ts')],
  outfile: resolve(itt, 'kiolvas.bundle.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  // Az import-térkép oldja fel őket futásidőben, ahogy a forrásban is.
  external: ['unpdf', 'fast-xml-parser', '@supabase/supabase-js'],
  minify: true,
  legalComments: 'none',
  // A fejlec szandekosan ekezet nelkuli: igy a teljes csomag tiszta ASCII
  // (egyetlen `€` jelet leszamitva), es semmi nem tud eltorni rajta ut kozben.
  banner: {
    js:
      '// GENERALT FAJL - ne szerkeszd. Forras: supabase/functions/kiolvas/ es shared/uzleti/.\n' +
      '// Ujrageneralas: npm run kiolvas:csomag\n',
  },
  metafile: true,
  absWorkingDir: gyoker,
});

// Az esbuild a sztringekben `\uXXXX`-re ir at minden nem ASCII karaktert, a
// **regex-literalokban** viszont nem tudja: ott a karakter marad. Egyetlen ilyen
// van (a penznem-jelek kozti `€`), es azt itt csereljuk le a sajat escape-jere.
// A `u` zaszlos regexben ez betu szerint ugyanaz — a csomag viszont igy szo
// szerint tiszta ASCII lesz, es nem tud elromlani egyetlen kozvetitotol sem.
const utvonal = resolve(itt, 'kiolvas.bundle.js');
const csomag = readFileSync(utvonal, 'utf8');
const asciira = csomag.replace(/[^\x00-\x7F]/g, (ch) =>
  '\\u' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
);

if (asciira !== csomag) {
  writeFileSync(utvonal, asciira);
}

const bemenetek = Object.keys(eredmeny.metafile.outputs).flatMap((ki) =>
  Object.keys(eredmeny.metafile.outputs[ki].inputs),
);

console.log(`${bemenetek.length} forrásfájl → kiolvas.bundle.js`);
