/**
 * A bemutatóvideók felvétele – a Könyvelőknek oldalé és a nyitólapé.
 *
 *   node scripts/bemutato-video/felvetel.mjs konyveloknek
 *   node scripts/bemutato-video/felvetel.mjs nyitolap
 *
 * A SzámlaFolyó **valódi felületét** veszi fel egy Vite dev szerveren, de a
 * Supabase helyett egy memóriabeli álszerver válaszol (`bemutato.supabase.co`,
 * a böngészőből ki sem megy). Az adatok kitaláltak (`adatok.mjs`).
 *
 * Hogyan lesz belőle videó: a Chromium képernyőközvetítése (CDP screencast)
 * minden változáskor egy JPG-t küld az időbélyegével; ezekből az ffmpeg a
 * valódi időzítéssel H.264 MP4-et és VP9 WebM-et fűz. A Playwright saját `recordVideo`-ja
 * alacsony bitrátájú VP8, azon a kis betű elmosódik.
 *
 * Kell hozzá egy ffmpeg libx264-gyel (`FFMPEG` környezeti változó, alapból a
 * PATH-on lévő `ffmpeg`).
 */

import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CEG, VALTOZATOK } from './adatok.mjs';

const VALTOZAT = process.argv[2] ?? 'konyveloknek';
const V = VALTOZATOK[VALTOZAT];
if (V === undefined) {
  throw new Error(`Ismeretlen változat: ${VALTOZAT} (lehet: ${Object.keys(VALTOZATOK).join(', ')})`);
}

const GYOKER = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Próbafelvételhez máshová is írhat, hogy a kitett videót ne írja felül.
const KIMENET = process.env.BEMUTATO_KIMENET ?? join(GYOKER, 'public/bemutato');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const PORT = 5288;
const HOST = 'bemutato.supabase.co';
const SZELES = 1280;
const MAGAS = 720;
const SURUSEG = 1.5; // 1920×1080-as kockák

/** Az egér helye – a felvett kurzor ehhez úszik. */
let eger = { x: SZELES / 2, y: MAGAS / 2 };

const munka = mkdtempSync(join(tmpdir(), 'szamlafolyo-bemutato-'));
const kockaMappa = join(munka, 'kockak');
mkdirSync(kockaMappa);
mkdirSync(KIMENET, { recursive: true });

// ---------------------------------------------------------------------------
// Vite dev szerver – a valódi alkalmazás, álszerverre állítva
// ---------------------------------------------------------------------------

// Közvetlenül a Vite, nem `npx`-en át: az `npx` leállítása árván hagyná a szervert.
const vite = spawn(process.execPath, [join(GYOKER, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort'], {
  cwd: GYOKER,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: `https://${HOST}`,
    VITE_SUPABASE_PUBLISHABLE_KEY: 'bemutato',
    VITE_FEJLESZTES_ALATT: 'false',
    VITE_REGISZTRACIO_NYITVA: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((kesz, hiba) => {
  const idozito = setTimeout(() => hiba(new Error('A Vite nem indult el 60 mp alatt.')), 60_000);
  vite.stdout.on('data', (d) => {
    if (String(d).includes(`localhost:${PORT}`)) {
      clearTimeout(idozito);
      kesz();
    }
  });
  vite.on('exit', (kod) => hiba(new Error(`A Vite kilépett (${kod}).`)));
});

// A magyar dátummezőkhöz a `LANG` kell (mérve): a `locale` és a `--lang`
// a dátumbeviteli mezőt nem állítja át, az amerikai sorrendben maradna.
const bongeszo = await chromium.launch({
  args: ['--lang=hu-HU'],
  env: { ...process.env, LANG: 'hu_HU.UTF-8', LANGUAGE: 'hu' },
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
});

try {
  // -------------------------------------------------------------------------
  // A feltöltendő „fotó” és a köteg-PDF – mindkettő kitalált, itt készül
  // -------------------------------------------------------------------------

  const gyar = await bongeszo.newPage({ viewport: { width: 1000, height: 1300 } });
  await gyar.setContent(V.foto.html);
  const fotoUt = join(munka, V.foto.fajlnev);
  writeFileSync(fotoUt, await gyar.screenshot({ type: 'jpeg', quality: 82 }));
  await gyar.setContent(blokkHtml());
  const kotegPdf = await gyar.pdf({ width: '80mm', height: '140mm', printBackground: true });
  await gyar.close();

  // -------------------------------------------------------------------------
  // Az álszerver
  // -------------------------------------------------------------------------

  const allapot = { sorok: V.kezdo(), fajlok: new Map(), exportok: [] };

  const ctx = await bongeszo.newContext({
    viewport: { width: SZELES, height: MAGAS },
    deviceScaleFactor: SURUSEG,
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
  });

  await ctx.addInitScript(belepes, { host: HOST });
  await ctx.addInitScript(retegek, { feliratMeret: V.feliratMeret });
  await ctx.route(`https://${HOST}/**`, (u) => alszerver(u, allapot, { fotoUt, kotegPdf }));

  const oldal = await ctx.newPage();
  // Az export „Folytatod?” kérdése: igen.
  oldal.on('dialog', (d) => void d.accept());
  const hibak = [];
  oldal.on('pageerror', (e) => hibak.push(e.message));
  oldal.on('console', (m) => {
    // A keret-lekérdezés szándékosan 400-at kap: így nem jelenik meg keret-sáv.
    if (m.type() === 'error' && !m.text().includes('status of 400')) hibak.push(m.text());
  });

  // -------------------------------------------------------------------------
  // Felvétel: a képernyőközvetítés kockái az időbélyegükkel
  // -------------------------------------------------------------------------

  const forgatokonyv = forgatokonyvek()[VALTOZAT];
  await forgatokonyv.elokeszit(oldal);

  const cdp = await ctx.newCDPSession(oldal);
  const kockak = [];
  cdp.on('Page.screencastFrame', (k) => {
    const nev = `k${String(kockak.length).padStart(5, '0')}.jpg`;
    writeFileSync(join(kockaMappa, nev), Buffer.from(k.data, 'base64'));
    kockak.push({ nev, ido: k.metadata.timestamp });
    void cdp.send('Page.screencastFrameAck', { sessionId: k.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: SZELES * SURUSEG,
    maxHeight: MAGAS * SURUSEG,
  });

  // A poszter pillanata: a forgatókönyv jelöli meg (`jelol`), különben a
  // címkártya.
  let poszterIdo = null;
  const jelol = () => {
    poszterIdo = Date.now() / 1000;
  };

  try {
    await forgatokonyv.felvesz(oldal, fotoUt, jelol);
  } catch (e) {
    await oldal.screenshot({ path: join(munka, 'hiba.png') });
    console.error(`Elakadt: ${oldal.url()} – kép: ${join(munka, 'hiba.png')}`);
    console.error('Böngészőhibák:\n  ' + hibak.join('\n  '));
    throw e;
  }

  await cdp.send('Page.stopScreencast');
  const vege = Date.now() / 1000;

  if (hibak.length > 0) {
    console.warn('Böngészőhibák a felvétel közben:\n  ' + hibak.join('\n  '));
  }

  // -------------------------------------------------------------------------
  // Összefűzés: minden kocka addig áll, amíg a következő meg nem jön
  // -------------------------------------------------------------------------

  const lista = kockak
    .map((k, i) => {
      const kov = kockak[i + 1]?.ido ?? vege;
      return `file '${join(kockaMappa, k.nev)}'\nduration ${Math.max(kov - k.ido, 0.001).toFixed(4)}`;
    })
    .join('\n');
  // A concat demuxer az utolsó kocka hosszát csak akkor veszi figyelembe,
  // ha a fájl még egyszer szerepel.
  const listaUt = join(munka, 'lista.txt');
  writeFileSync(listaUt, `${lista}\nfile '${join(kockaMappa, kockak.at(-1).nev)}'\n`);

  const mp4 = join(KIMENET, `${VALTOZAT}.mp4`);
  futtat(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listaUt,
    '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-tune', 'stillimage',
    '-movflags', '+faststart', '-an', mp4,
  ]);
  // A WebM (VP9) tartalék: a nyílt forrású Chromium és a rendszerkodek nélküli
  // Firefox H.264-et nem játszik le (mérve: `canPlayType('avc1…')` üres).
  futtat(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listaUt,
    '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
    '-an', join(KIMENET, `${VALTOZAT}.webm`),
  ]);
  const poszterMp = poszterIdo === null ? 2.5 : poszterIdo - kockak[0].ido;
  futtat(FFMPEG, [
    '-y', '-loglevel', 'error', '-ss', poszterMp.toFixed(2), '-i', mp4, '-frames:v', '1',
    '-vf', 'scale=1280:720', '-q:v', '4', join(KIMENET, `${VALTOZAT}-poszter.jpg`),
  ]);

  console.log(`Kész: ${mp4} (${kockak.length} kocka)`);
} finally {
  await bongeszo.close();
  vite.kill();
  if (!process.env.MEGTART) rmSync(munka, { recursive: true, force: true });
  else console.log(`Munkamappa: ${munka}`);
}

// ===========================================================================
// A forgatókönyvek
// ===========================================================================

/** Függvény, nem konstans: a fenti, felső szintű kód előbb fut, mint ez a sor. */
function forgatokonyvek() {
  return {
    konyveloknek: { elokeszit: konyvelokElokeszit, felvesz: konyvelokFelvesz },
    nyitolap: { elokeszit: nyitolapElokeszit, felvesz: nyitolapFelvesz },
  };
}

async function konyvelokElokeszit(oldal) {
  await oldal.goto(`http://localhost:${PORT}/beerkezo`);
  await oldal.waitForSelector('text=Ellenőrzésre vár');
  await kartya(oldal, 'SzámlaFolyó könyvelőirodáknak', 'Bizonylattól a könyvelőprogramig');
  await oldal.waitForTimeout(800);
}

async function konyvelokFelvesz(oldal, fotoUt) {
  await oldal.waitForTimeout(3200);
  await kartya(oldal, null);

  // 1. Beérkező -----------------------------------------------------------
  await felirat(oldal, 'Az ügyfél e-mailben küldi a bizonylatokat. Egy több oldalas PDF-et a SzámlaFolyó bizonylatonként szétszed.');
  await mutat(oldal, 'tr:has-text("ESZ-0412/00731") td >> nth=0');
  await oldal.waitForTimeout(4200);

  await felirat(oldal, 'Vagy te töltöd fel: PDF, fénykép, e-számla XML.');
  await mutat(oldal, 'label[for="fajlok"]');
  await oldal.waitForTimeout(1800);
  await oldal.setInputFiles('#fajlok', fotoUt);
  await oldal.waitForSelector(`tr:has-text("${V.foto.fajlnev}")`);
  await felirat(oldal, 'Pár másodperc, és kiolvasta: partnerek, dátumok, összegek, ÁFA-bontás.');
  await oldal.waitForSelector('tr:has-text("MSZ-2026/0412") >> text=Ellenőrzésre vár', { timeout: 20_000 });
  await oldal.waitForTimeout(1500);

  // 2. Ellenőrzés ---------------------------------------------------------
  await kattint(oldal, 'tr:has-text("MSZ-2026/0412") a:has-text("Ellenőrzés")');
  await oldal.waitForSelector('#supplier_tax_number');
  await felirat(oldal, 'Balra a bizonylat, jobbra a kiolvasott adatok. Ami gyanús, meg van jelölve: itt az adószám ellenőrző jegye nem stimmel.');
  await mutat(oldal, '#supplier_tax_number');
  await oldal.waitForTimeout(5200);

  await felirat(oldal, 'Ránézel a képre, és kijavítod.');
  await kattint(oldal, '#supplier_tax_number', { clickCount: 3 });
  await oldal.keyboard.type('12345676-2-13', { delay: 110 });
  await oldal.waitForTimeout(1600);

  await felirat(oldal, 'Jóváhagyod – és már jön is a következő.');
  await kattint(oldal, 'button:has-text("Jóváhagyás")');
  await oldal.waitForSelector('text=több bizonylat');
  await oldal.waitForTimeout(2000);

  await felirat(oldal, 'A köteg darabjai külön sorok, oldalszámmal. Ami rendben van, az egy kattintás.');
  await oldal.waitForTimeout(2600);
  await kattint(oldal, 'button:has-text("Jóváhagyás")');
  await oldal.waitForFunction(() => document.querySelector('#doc_number')?.value === 'ESZ-0412/00802');
  // A PDF-néző a saját tempójában tölt be – addig fekete a doboz.
  await oldal.waitForTimeout(2600);
  await kattint(oldal, 'button:has-text("Jóváhagyás")');

  // 3. Tételek ------------------------------------------------------------
  await oldal.waitForURL(/tetelek/);
  await oldal.waitForSelector('text=MSZ-2026/0412');
  await felirat(oldal, 'A Tételek közt minden jóváhagyott bizonylat. Az e-számla XML-t a gép magától is átengedheti – de jelölve, indokkal.');
  await mutat(oldal, 'text=automatikusan >> nth=0');
  await oldal.waitForTimeout(5000);

  // 4. Export -------------------------------------------------------------
  await kattint(oldal, 'nav a:has-text("Export") >> visible=true');
  await oldal.waitForSelector('text=tétel kerül exportba');
  await felirat(oldal, 'Exportnál kiválasztod az ügyfelet…');
  await mutat(oldal, '#ugyfel');
  await oldal.waitForTimeout(1400);
  await oldal.selectOption('#ugyfel', { label: await ugyfelCimke(oldal, 'Próba Kft.') });
  await oldal.waitForTimeout(1800);

  await felirat(oldal, '…és a könyvelőprogramot: RLB Kettős, Novitax NTAX vagy Kulcs-Könyvelés.');
  await kattint(oldal, 'label:has-text("Kulcs-Könyvelés")');
  await oldal.waitForSelector('text=Betöltés');
  await oldal.waitForTimeout(1200);
  await gorget(oldal, 'text=Betöltés');
  await felirat(oldal, 'A betöltés lépései ott vannak mellette. A fájl egyenesen a programba megy, nem kell átírni semmit.');
  await oldal.waitForTimeout(5200);

  await gorget(oldal, 'button:has-text("Export elkészítése")');
  await felirat(oldal, 'Mellé ZIP-ben az eredeti bizonylatok – a megőrzéshez.');
  await mutat(oldal, 'button:has-text("Eredeti bizonylatok")');
  await oldal.waitForTimeout(3200);
  await mutat(oldal, 'button:has-text("Export elkészítése")');
  await oldal.waitForTimeout(2200);

  // 5. Zárás --------------------------------------------------------------
  await felirat(oldal, null);
  await kartya(oldal, 'Próbáld ki egy ügyfél egy hónapjával.', 'szamlafolyo.hu');
  await oldal.waitForTimeout(4500);
}

async function nyitolapElokeszit(oldal) {
  await oldal.goto(`http://localhost:${PORT}/beerkezo`);
  await oldal.waitForSelector('text=Itt jelennek meg a bizonylatok');
  await kartya(oldal, 'SzámlaFolyó', 'Bizonylatból könyvelésre kész adat');
  await oldal.waitForTimeout(800);
}

/**
 * A vállalkozó útja: egy fotózott számla, egy megjelölt bruttó, jóváhagyás,
 * Excel-export. A nyitólapon ismétlődve fut, ezért rövid, és a zárókártya
 * után újra a címkártya jön.
 */
async function nyitolapFelvesz(oldal, fotoUt, jelol) {
  await oldal.waitForTimeout(2400);
  await kartya(oldal, null);

  // 1. Beérkező -----------------------------------------------------------
  await felirat(oldal, 'Feltöltöd a számlát – fotót, PDF-et vagy e-számla XML-t. Vagy e-mailben továbbítod.');
  await mutat(oldal, 'label[for="fajlok"]');
  await oldal.waitForTimeout(3400);
  await oldal.setInputFiles('#fajlok', fotoUt);
  await oldal.waitForSelector(`tr:has-text("${V.foto.fajlnev}")`);
  await felirat(oldal, 'Pár másodperc, és kiolvasta.');
  await oldal.waitForSelector('tr:has-text("MNY-2026/0877") >> text=Ellenőrzésre vár', { timeout: 20_000 });
  await oldal.waitForTimeout(1200);

  // 2. Ellenőrzés ---------------------------------------------------------
  await kattint(oldal, 'tr:has-text("MNY-2026/0877") a:has-text("Ellenőrzés")');
  await oldal.waitForSelector('#gross_amount');
  await felirat(oldal, 'Ami nem stimmel, azt megjelöli: itt a nettó és az ÁFA nem adja ki a bruttót.');
  await mutat(oldal, '#gross_amount');
  await oldal.waitForTimeout(1500);
  jelol();
  await oldal.waitForTimeout(3500);

  await felirat(oldal, 'Ránézel a képre, és kijavítod.');
  await kattint(oldal, '#gross_amount', { clickCount: 3 });
  await oldal.keyboard.type('127000', { delay: 120 });
  await oldal.waitForTimeout(1800);

  await felirat(oldal, 'Jóváhagyod.');
  await kattint(oldal, 'button:has-text("Jóváhagyás")');

  // 3. Tételek ------------------------------------------------------------
  await oldal.waitForURL(/tetelek/);
  await oldal.waitForSelector('text=MNY-2026/0877');
  await felirat(oldal, 'A jóváhagyott tételek egy helyen várják az exportot.');
  await mutat(oldal, 'tr:has-text("MNY-2026/0877") td >> nth=0');
  await oldal.waitForTimeout(3600);

  // 4. Export -------------------------------------------------------------
  await kattint(oldal, 'nav a:has-text("Export") >> visible=true');
  await oldal.waitForSelector('text=tétel kerül exportba');
  await felirat(oldal, 'Export Excelbe, CSV-be vagy JSON-ba – vagy egyenesen a könyvelőprogramba.');
  await mutat(oldal, 'label:has-text("Excel")');
  await oldal.waitForTimeout(3800);
  await kattint(oldal, 'button:has-text("Export elkészítése")');
  await oldal.waitForURL(/archivum/);
  await felirat(oldal, 'Kész: az Excel letöltődött, és az export az Archívumban marad.');
  await oldal.waitForTimeout(4200);

  // 5. Zárás --------------------------------------------------------------
  await felirat(oldal, null);
  await kartya(oldal, 'Próbáld ki a saját bizonylataiddal.', 'szamlafolyo.hu');
  await oldal.waitForTimeout(4000);
}

// ===========================================================================
// Segédek a felvételhez
// ===========================================================================

async function ugyfelCimke(oldal, nev) {
  const cimkek = await oldal.$$eval('#ugyfel option', (os) => os.map((o) => o.textContent.trim()));
  const talalat = cimkek.find((c) => c.includes(nev));
  if (talalat === undefined) throw new Error(`Nincs ilyen ügyfél a listában: ${nev} (${cimkek.join(' | ')})`);
  return talalat;
}


/** Az egér odaúszik az elem közepére. */
async function mutat(oldal, valaszto) {
  const elem = oldal.locator(valaszto).first();
  await elem.scrollIntoViewIfNeeded();
  const doboz = await elem.boundingBox();
  if (doboz === null) throw new Error(`Nem látható: ${valaszto}`);
  const cel = { x: doboz.x + Math.min(doboz.width / 2, 120), y: doboz.y + doboz.height / 2 };
  const tav = Math.hypot(cel.x - eger.x, cel.y - eger.y);
  await oldal.mouse.move(cel.x, cel.y, { steps: Math.max(8, Math.round(tav / 14)) });
  eger = cel;
  await oldal.waitForTimeout(250);
}

async function kattint(oldal, valaszto, opciok = {}) {
  await mutat(oldal, valaszto);
  await oldal.evaluate(() => window.__kattintas?.());
  await oldal.mouse.click(eger.x, eger.y, opciok);
  await oldal.waitForTimeout(400);
}

/** Lassú görgetés, hogy az elem a képernyő felső harmadába kerüljön. */
async function gorget(oldal, valaszto) {
  const doboz = await oldal.locator(valaszto).first().boundingBox();
  if (doboz === null) return;
  const cel = doboz.y - MAGAS / 3;
  const lepes = 40;
  for (let tett = 0; Math.abs(cel - tett) > lepes; tett += Math.sign(cel) * lepes) {
    await oldal.mouse.wheel(0, Math.sign(cel) * lepes);
    await oldal.waitForTimeout(16);
  }
  await oldal.waitForTimeout(400);
}

async function felirat(oldal, szoveg) {
  await oldal.evaluate((s) => window.__felirat?.(s), szoveg);
}

async function kartya(oldal, cim, al) {
  await oldal.evaluate(([c, a]) => window.__kartya?.(c, a), [cim, al]);
}

function futtat(parancs, argumentumok) {
  const e = spawnSync(parancs, argumentumok, { stdio: 'inherit' });
  if (e.status !== 0) throw new Error(`${parancs} hibával lépett ki (${e.status ?? e.error}).`);
}

// ===========================================================================
// A böngészőbe fecskendezett részek
// ===========================================================================

/** Bejelentkezett munkamenet – a Supabase-kliens a localStorage-ból veszi. */
function belepes({ host }) {
  const kulcs = `sb-${host.split('.')[0]}-auth-token`;
  if (localStorage.getItem(kulcs) !== null) return;
  const most = Math.floor(Date.now() / 1000);
  localStorage.setItem(kulcs, JSON.stringify({
    access_token: 'bemutato', token_type: 'bearer', expires_in: 360000,
    expires_at: most + 360000, refresh_token: 'bemutato',
    user: {
      id: 'u-bemutato', email: 'kovacs.anna@minta.example', aud: 'authenticated',
      role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
    },
  }));
}

/** Felirat, egérmutató, kattintás-hullám és címkártya. */
function retegek({ feliratMeret }) {
  const telepit = () => {
    const stilus = document.createElement('style');
    stilus.textContent = `
      #bm-felirat { position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:2147483600;
        max-width:960px; padding:14px 26px; border-radius:14px; background:rgba(42,42,38,.92); color:#f6ede4;
        font:600 ${feliratMeret}px/1.4 'DM Sans Variable','DM Sans',system-ui,sans-serif; text-align:center;
        box-shadow:0 10px 30px rgba(0,0,0,.25); transition:opacity .35s; opacity:0; pointer-events:none; }
      #bm-eger { position:fixed; left:0; top:0; z-index:2147483646; width:22px; height:22px; margin:-3px 0 0 -3px;
        pointer-events:none; transition:transform .06s linear; }
      #bm-hullam { position:fixed; z-index:2147483645; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%;
        border:3px solid rgba(37,99,235,.7); pointer-events:none; opacity:0; }
      #bm-hullam.megy { animation: bm-hullam .45s ease-out; }
      @keyframes bm-hullam { from { opacity:1; transform:scale(.3); } to { opacity:0; transform:scale(1.4); } }
      #bm-kartya { position:fixed; inset:0; z-index:2147483640; display:flex; flex-direction:column; align-items:center;
        justify-content:center; gap:18px; background:linear-gradient(135deg,#2a2a26 0%,#42423d 100%); color:#f6ede4;
        font-family:'DM Sans Variable','DM Sans',system-ui,sans-serif; transition:opacity .5s; opacity:0; pointer-events:none; }
      #bm-kartya h1 { margin:0; font:800 54px/1.15 'Archivo','DM Sans',sans-serif; color:#fff; text-align:center; max-width:1000px; }
      #bm-kartya p { margin:0; font-size:26px; color:#dfb671; font-weight:600; }
    `;
    document.head.append(stilus);

    const felirat = Object.assign(document.createElement('div'), { id: 'bm-felirat' });
    const eger = Object.assign(document.createElement('div'), { id: 'bm-eger' });
    eger.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const hullam = Object.assign(document.createElement('div'), { id: 'bm-hullam' });
    const kartya = Object.assign(document.createElement('div'), { id: 'bm-kartya' });
    document.body.append(felirat, hullam, eger, kartya);

    let hely = { x: -50, y: -50 };
    document.addEventListener('mousemove', (e) => {
      hely = { x: e.clientX, y: e.clientY };
      eger.style.transform = `translate(${hely.x}px, ${hely.y}px)`;
    }, true);

    window.__kattintas = () => {
      hullam.style.left = `${hely.x}px`;
      hullam.style.top = `${hely.y}px`;
      hullam.classList.remove('megy');
      void hullam.offsetWidth;
      hullam.classList.add('megy');
    };
    window.__felirat = (s) => {
      if (s === null) {
        felirat.style.opacity = '0';
        return;
      }
      felirat.textContent = s;
      felirat.style.opacity = '1';
    };
    window.__kartya = (cim, al) => {
      eger.style.opacity = cim === null ? '1' : '0';
      if (cim === null) {
        kartya.style.opacity = '0';
        return;
      }
      kartya.innerHTML = '';
      const h = document.createElement('h1');
      h.textContent = cim;
      const p = document.createElement('p');
      p.textContent = al ?? '';
      kartya.append(h, p);
      kartya.style.opacity = '1';
    };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', telepit);
  else telepit();
}

/** Két kitalált pékségi egyszerűsített számla – ez a köteg, amit „e-mailben küldtek”. */
function blokkHtml() {
  const blokk = (szam, datum, sorok, ossz) => `
    <section style="page-break-after:always;padding:18px 16px;font:14px/1.5 'DejaVu Sans Mono',monospace;">
      <div style="text-align:center;font-weight:bold">MINTA PÉKSÉG BT.</div>
      <div style="text-align:center">3333 Kiflifalva, Kenyér u. 3.<br>Adószám: 55555555-1-45</div>
      <hr><div>EGYSZERŰSÍTETT SZÁMLA</div><div>${szam}</div><div>${datum}</div>
      <div>Vevő: Próba Kft.</div><div>Adószám: 11111111-2-41</div><hr>
      ${sorok.map(([n, a]) => `<div style="display:flex;justify-content:space-between"><span>${n}</span><span>${a}</span></div>`).join('')}
      <hr><div style="display:flex;justify-content:space-between;font-weight:bold"><span>ÖSSZESEN</span><span>${ossz}</span></div>
      <div>Készpénz</div>
      <div style="margin-top:14px;font-size:11px;color:#666">Kitalált blokk a bemutatóhoz.</div>
    </section>`;
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">
    ${blokk('ESZ-0412/00731', '2026.09.22. 07:41', [['Kenyér 1 kg', '1 890'], ['Kifli 20 db', '2 400'], ['Pogácsa', '666']], '4 956 Ft')}
    ${blokk('ESZ-0412/00802', '2026.09.23. 07:38', [['Kenyér 1 kg', '1 890'], ['Kakaós csiga 3 db', '1 418']], '3 308 Ft')}
  </body></html>`;
}

// ===========================================================================
// Az álszerver: a PostgREST, a Storage és a függvényhívások annyi része,
// amennyit a felvett képernyők használnak
// ===========================================================================

async function alszerver(utvonal, allapot, { fotoUt, kotegPdf }) {
  const olvasat = V.foto.olvasat;
  const keres = utvonal.request();
  const u = new URL(keres.url());
  const ut = u.pathname;
  const mod = keres.method();
  const fejlec = keres.headers();

  const json = (test, statusz = 200, fej = {}) =>
    utvonal.fulfill({ status: statusz, contentType: 'application/json', headers: fej, body: JSON.stringify(test) });
  const bajtok = (utvonalNev) => {
    const kep = utvonalNev.endsWith('.jpg');
    return utvonal.fulfill({
      status: 200,
      contentType: kep ? 'image/jpeg' : 'application/pdf',
      body: kep ? readFileSync(fotoUt) : kotegPdf,
    });
  };

  if (mod === 'OPTIONS') {
    return utvonal.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  }

  if (ut.startsWith('/auth/v1/')) return json({ id: 'u-bemutato', email: 'kovacs.anna@minta.example' });

  if (ut.startsWith('/functions/v1/kiolvas')) {
    const { dokumentum_id: id } = JSON.parse(keres.postData() ?? '{}');
    setTimeout(() => modosit(allapot, id, { status: 'feldolgozas_alatt' }), 1200);
    setTimeout(() => {
      modosit(allapot, id, {
        ...olvasat,
        status: 'ellenorzesre_var',
        document_extractions: [{ model: 'modell', created_at: new Date().toISOString() }],
      });
    }, 4800);
    return json({ ok: true });
  }

  if (ut.startsWith('/storage/v1/object/sign/')) {
    if (mod === 'POST') {
      const fajlUt = ut.replace('/storage/v1/object/sign/', '');
      return json({ signedURL: `/object/sign/${fajlUt}?token=bemutato` });
    }
    return bajtok(ut);
  }

  if (ut.startsWith('/storage/v1/object/')) {
    if (mod === 'POST' || mod === 'PUT') return json({ Key: ut.replace('/storage/v1/object/', '') });
    return bajtok(ut);
  }

  if (ut === '/rest/v1/company_members') {
    return json([{ role: 'tulajdonos', created_at: '2026-01-01T00:00:00Z', companies: V.ceg }]);
  }

  if (ut === '/rest/v1/rpc/keret_adatok') {
    return json({ message: 'nincs a bemutatóban' }, 400);
  }

  if (ut === '/rest/v1/files') {
    if (mod === 'POST') {
      const sor = JSON.parse(keres.postData());
      allapot.fajlok.set(sor.id, sor);
      return utvonal.fulfill({ status: 201, body: '' });
    }
    return json([]);
  }

  if (ut === '/rest/v1/document_extractions') {
    const id = (u.searchParams.get('document_id') ?? '').replace('eq.', '');
    const sor = allapot.sorok.find((s) => s.id === id);
    if (sor === undefined) return json([]);
    const mezok = Object.fromEntries(Object.keys(olvasat).map((m) => [m, sor[m]]));
    const kezdo = sor.id.startsWith('b-') ? mezok : olvasat;
    return json([{
      id: `x-${id}`,
      fields: kezdo,
      confidence: Object.fromEntries(Object.keys(olvasat).map((m) => [m, 0.97])),
      model: 'modell',
    }]);
  }

  // Az ügyfél kontírja be van állítva – enélkül a programfájl nem készülne el.
  if (ut === '/rest/v1/konyvelo_beallitasok') {
    if (!V.kontir) return json([]);
    return json([
      { ugyfel_torzsszam: null, beallitas: { koltseg: '529', arbevetel: '911' } },
      { ugyfel_torzsszam: '11111111', beallitas: { koltseg: '529', arbevetel: '911' } },
    ]);
  }

  if (ut === '/rest/v1/document_corrections') return utvonal.fulfill({ status: 201, body: '' });

  // Az export rögzítése: a tételek átkerülnek, az Archívum listázza.
  if (ut === '/rest/v1/rpc/export_rogzit') {
    const be = JSON.parse(keres.postData());
    const id = `exp-${allapot.exportok.length + 1}`;
    for (const s of allapot.sorok) {
      if (be.dokumentum_idk.includes(s.id)) Object.assign(s, { status: 'exportalva', export_id: id });
    }
    allapot.exportok.unshift({
      id, format: be.formatum, filters: be.szurok, item_count: be.dokumentum_idk.length,
      file_name: be.fajl_nev, file_path: be.fajl_utvonal, file_deleted_at: null,
      file_bytes: be.fajl_bajt, created_at: new Date().toISOString(),
      documents: [{ count: be.dokumentum_idk.length }],
    });
    return json({ export_id: id, darab: be.dokumentum_idk.length, torolheto: [] });
  }

  if (ut === '/rest/v1/exports') return json(allapot.exportok);

  if (ut === '/rest/v1/documents') {
    if (mod === 'POST') {
      const be = JSON.parse(keres.postData());
      const fajl = allapot.fajlok.get(be.file_id);
      const uj = {
        ...Object.fromEntries(Object.keys(olvasat).map((m) => [m, null])),
        id: crypto.randomUUID(),
        company_id: CEG,
        file_id: be.file_id,
        status: be.status,
        created_at: new Date().toISOString(),
        oldal_tol: null, oldal_ig: null, error: null, note: null,
        tobb_irat_gyanu: false, nehezen_olvashato: false,
        auto_jovahagyva: false, auto_indok: null, export_id: null,
        files: {
          original_filename: fajl?.original_filename ?? null,
          mime_type: fajl?.mime_type ?? null,
          storage_path: fajl?.storage_path ?? null,
          file_deleted_at: null,
          source: 'upload',
          size_bytes: fajl?.size_bytes ?? null,
        },
        document_extractions: [],
      };
      allapot.sorok.push(uj);
      return (fejlec['accept'] ?? '').includes('vnd.pgrst.object') ? json({ id: uj.id }, 201) : json([{ id: uj.id }], 201);
    }

    const talalat = rendez(szur(allapot.sorok, u.searchParams), u.searchParams.get('order'));

    if (mod === 'PATCH') {
      const valtozas = JSON.parse(keres.postData());
      for (const s of talalat) Object.assign(s, valtozas);
      return utvonal.fulfill({ status: 204, body: '' });
    }

    if (mod === 'HEAD' || (fejlec['prefer'] ?? '').includes('count=exact')) {
      const n = talalat.length;
      return utvonal.fulfill({
        status: 200,
        headers: { 'content-range': n === 0 ? '*/0' : `0-${n - 1}/${n}`, 'content-type': 'application/json' },
        body: mod === 'HEAD' ? '' : JSON.stringify(talalat),
      });
    }

    const limit = Number(u.searchParams.get('limit') ?? Infinity);
    const ki = talalat.slice(0, limit);
    if ((fejlec['accept'] ?? '').includes('vnd.pgrst.object')) {
      return ki.length === 1 ? json(ki[0]) : json({ message: 'nem egy sor' }, 406);
    }
    return json(ki);
  }

  return json([]);
}

function modosit(allapot, id, valtozas) {
  const sor = allapot.sorok.find((s) => s.id === id);
  if (sor !== undefined) Object.assign(sor, valtozas);
}

/** A PostgREST-szűrők annyi része, amennyit az alkalmazás küld. */
function szur(sorok, parameterek) {
  let ki = sorok;
  for (const [kulcs, ertek] of parameterek) {
    if (['select', 'order', 'limit', 'offset', 'or'].includes(kulcs)) continue;
    const pont = ertek.indexOf('.');
    const muvelet = ertek.slice(0, pont);
    const mivel = ertek.slice(pont + 1);
    ki = ki.filter((s) => {
      const x = s[kulcs];
      switch (muvelet) {
        case 'eq': return String(x) === mivel;
        case 'neq': return String(x) !== mivel;
        case 'in': return mivel.replace(/[()]/g, '').split(',').includes(String(x));
        case 'is': return mivel === 'null' ? x === null || x === undefined : true;
        case 'gte': return x != null && String(x) >= mivel;
        case 'gt': return x != null && String(x) > mivel;
        case 'lte': return x != null && String(x).slice(0, mivel.length) <= mivel;
        case 'lt': return x != null && String(x) < mivel;
        default: return true;
      }
    });
  }
  return ki;
}

function rendez(sorok, rendezes) {
  if (!rendezes) return [...sorok];
  const [mezo, irany] = rendezes.split(',')[0].split('.');
  const elojel = irany === 'desc' ? -1 : 1;
  return [...sorok].sort((a, b) => {
    if (a[mezo] == null) return 1;
    if (b[mezo] == null) return -1;
    return String(a[mezo]).localeCompare(String(b[mezo])) * elojel;
  });
}
