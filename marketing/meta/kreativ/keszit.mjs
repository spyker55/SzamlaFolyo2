/**
 * A Meta-hirdetések képeit **ez a script állítja elő**, nem kézi grafika.
 *
 * Az indok ugyanaz, amiért a nyitólap mintakártyája sem rajzolt képernyőkép:
 * a hirdetés arculata és a termék arculata ne tudjon szétcsúszni. Minden
 * hexa, betű és osztályszerű elem innen jön:
 *
 *   - a színek a `src/app.css` `@theme` blokkjából (vászon, terrakotta,
 *     zsálya, mustár), szó szerint;
 *   - a betűk a repó saját, **helyben tárolt** fájljaiból (`node_modules/
 *     @fontsource*`) — ugyanazok, amiket a látogató böngészője is kap, tehát
 *     a hirdetés és a céloldal betűje azonos;
 *   - a mintakártya mezői és a hibaüzenet a `Nyitolap.tsx`
 *     `EllenorzesMinta()`-jából, szintén szó szerint.
 *
 * ⚠️ A képen álló minden **állítás** a termék mai tudása. Ha egy ígéret
 * megváltozik (pl. a gépi jóváhagyás alapállása), az itteni szöveget is
 * javítani kell — egy hirdetés, ami többet ígér a felületnél, ugyanaz a
 * hibaosztály, mint egy valótlan jogi mondat, csak drágább.
 *
 * Futtatás:  node marketing/meta/kreativ/keszit.mjs
 */

import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITT = dirname(fileURLToPath(import.meta.url));
const GYOKER = resolve(ITT, '../../..');
const BETU = `${GYOKER}/node_modules`;

/* A paletta. Forrás: src/app.css @theme — nem közelítés, másolat. */
const SZIN = {
  vaszon: '#f6ede4',
  papir: '#fbf8f4',
  tinta: '#2a2a26',
  tintaLagy: '#42423d',
  halvany: '#787066',
  keret: '#e9ded1',
  marka: '#be6846',
  markaTinta: '#3a3634',
  terrakotta: '#9e5537',
  terrakottaVilagos: '#c66c47',
  zsalya: '#8c9c86',
  mustar: '#dfb671',
  gyanus: '#b91c1c',
  biztos: '#15803d',
};

/* A jel geometriája a `src/komponensek/Logo.tsx`-ből, pixelre. */
const JEL = `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
  <rect width="56" height="56" fill="#be6846"/>
  <path d="M14 11 H34 L42 19 V45 H14 Z" fill="#f5ece2"/>
  <path d="M18 27 C22 23, 26 31, 30 27 S38 23, 38 27" stroke="#be6846" stroke-width="3" fill="none"/>
  <path d="M18 35 C22 31, 26 39, 30 35 S38 31, 38 35" stroke="#be6846" stroke-width="3" fill="none"/>
</svg>`;

const PIPA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const FIGYELEM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`;

/*
 * A méretek a Meta ajánlott vászonméretei. A 4:5 az elsődleges: a Feed ma
 * azt adja ki a legnagyobb területen mobilon, és a hirdetések döntő része
 * mobilon jelenik meg.
 */
const MERETEK = [
  { id: '4x5', sz: 1080, ma: 1350, hol: 'Feed (elsődleges)' },
  { id: '1x1', sz: 1080, ma: 1080, hol: 'Feed, Marketplace, jobb oldali sáv' },
  { id: '9x16', sz: 1080, ma: 1920, hol: 'Stories és Reels' },
  { id: '1.91x1', sz: 1200, ma: 628, hol: 'Link, Audience Network' },
];

/*
 * Öt üzenet, öt külön hirdetéskészlethez. Szándékosan nem egy üzenet öt
 * díszítésben: a Metán az **üzenet** a változó, amit mérni érdemes, a szín
 * nem. Mindegyik mögött a termék egy valóban meglévő tulajdonsága áll.
 */
const UZENETEK = [
  {
    id: '1-igeret',
    jelveny: 'Számlafeldolgozás',
    cim: ['Dokumentumból', 'könyvelésre kész adat', 'percek alatt.'],
    kiemelt: 1,
    alcim: 'Számla, nyugta, e-számla XML — egy folyamatban, egy exportban.',
    vizual: 'kartya',
  },
  {
    id: '2-te-hagyod-jova',
    jelveny: 'Az utolsó szó a tiéd',
    cim: ['Minden bizonylatot', 'te hagysz jóvá.'],
    kiemelt: 1,
    alcim: 'A gép megjelöli, amiben bizonytalan. Semmi nem kerül exportba emberi jóváhagyás nélkül.',
    vizual: 'kartya',
  },
  {
    id: '3-matek',
    jelveny: 'Nem a modell mondja meg',
    cim: ['Nettó + ÁFA = bruttó.', 'Ezt kiszámoljuk.'],
    kiemelt: 0,
    alcim: 'Az adószám ellenőrző számjegye és az ÁFA-bontás matematika, nem vélemény. Ha nem stimmel, szólunk.',
    vizual: 'kartya',
  },
  {
    id: '4-xml',
    jelveny: 'E-számla XML',
    cim: ['Az e-számlát gép', 'olvassa ki. AI nélkül.'],
    kiemelt: 1,
    alcim: 'UBL, Factur-X, ZUGFeRD és a magyar formátumok: másodperc alatt, modellhívás nélkül.',
    vizual: 'xml',
  },
  {
    id: '5-proba',
    jelveny: 'Ingyenes próba',
    cim: ['14 nap.', '50 dokumentum.', 'Bankkártya nélkül.'],
    kiemelt: 2,
    alcim: 'Próbáld ki a saját bizonylataidon — fizetési adat megadása nélkül.',
    vizual: 'szamok',
  },
];

/*
 * A mintakártya mezői a Nyitolap.tsx EllenorzesMinta()-jából, szó szerint.
 *
 * ⚠️ A `suru` nem kozmetika. Az első renderben az öt mező a négyzetes és a
 * 4:5-ös vásznon **túlnyúlt a kép alján**, és pont az veszett el, amiért a
 * kártya ott van: a piros, megjelölt végösszeg és a validátor mondata. Ahol
 * kevés a hely, ott inkább kevesebb mező áll, de a történet teljes: egy
 * átment mező, egy megbukott, és az indok.
 */
function kartya(lepx, suru) {
  const mezo = (cimke, ertek, gyanus) => `
    <div class="mezosor">
      <p class="mezocimke">${cimke}${gyanus ? '<span class="jelveny-hiba">Ellenőrizendő</span>' : ''}</p>
      <div class="mezo ${gyanus ? 'gyanus' : 'biztos'}">
        <span>${ertek}</span>
        <i class="ikon">${gyanus ? FIGYELEM : PIPA}</i>
      </div>
    </div>`;

  const mezok = suru
    ? [
        ['Szállító neve', 'Hegyvidék Nyomda Zrt.', false],
        ['Nettó', '100 000 Ft', false],
        ['Végösszeg (bruttó)', '130 000 Ft', true],
      ]
    : [
        ['Szállító neve', 'Hegyvidék Nyomda Zrt.', false],
        ['Szállító adószáma', '12345676-2-42', false],
        ['Nettó', '100 000 Ft', false],
        ['ÁFA', '27 000 Ft', false],
        ['Végösszeg (bruttó)', '130 000 Ft', true],
      ];

  return `
  <div class="kartya" style="--le:${lepx}px">
    <div class="kartya-fej">
      <p>Dokumentum jóváhagyása</p>
      <div class="pottyok"><i style="background:${SZIN.terrakottaVilagos}"></i><i style="background:${SZIN.mustar}"></i><i style="background:${SZIN.zsalya}"></i></div>
    </div>
    <div class="kartya-test">
      ${mezok.map((m) => mezo(m[0], m[1], m[2])).join('')}
      <p class="hibauzenet">A nettó és az ÁFA összege nem adja ki a bruttót.</p>
    </div>
  </div>`;
}

/*
 * ⚠️ Itt **nem** „0 Ft" áll, pedig a modellköltség tényleg nulla. Egy
 * hirdetésképen a „0 Ft" azt jelenti, hogy a bizonylat ingyen van — az
 * e-számla viszont ugyanúgy beleszámít a havi darabkeretbe, mint bármelyik
 * másik (`Nyitolap.tsx`, „E-számla XML modellhívás nélkül"). A „0
 * modellhívás" ugyanazt a valódi előnyt mondja el, félreolvashatatlanul.
 */
function xmlVizual() {
  return `
  <div class="kartya">
    <div class="kartya-fej">
      <p>Kiolvasás forrása</p>
      <div class="pottyok"><i style="background:${SZIN.terrakottaVilagos}"></i><i style="background:${SZIN.mustar}"></i><i style="background:${SZIN.zsalya}"></i></div>
    </div>
    <div class="kartya-test">
      <div class="xml-jel">UBL e-számla</div>
      <p class="xml-mondat">A bizonylat adatai a fájlban lévő strukturált e-számlából származnak: a szállító rendszere írta ki őket, mi átvettük.</p>
      <div class="xml-szamok">
        <div><b>0,4 mp</b><span>kiolvasás</span></div>
        <div><b>0</b><span>modellhívás</span></div>
      </div>
    </div>
  </div>`;
}

/*
 * A három szám a `config/szamlafolyo.ts` `proba` blokkjából való: 14 nap, 50
 * dokumentum, 3 felhasználó. A harmadik helyén eredetileg „0 Ft / bankkártya
 * nélkül" állt — az viszont a címben és a láblécben is ott van, és egy
 * háromszor elmondott állítás helyét elveszi egy el nem mondott.
 */
function szamokVizual() {
  const blokk = (ertek, cimke) => `<div class="szamblokk"><b>${ertek}</b><span>${cimke}</span></div>`;
  return `<div class="szamok">
    ${blokk('14', 'nap')}
    ${blokk('50', 'dokumentum')}
    ${blokk('3', 'felhasználó')}
  </div>`;
}

function oldal(uzenet, meret) {
  const fekvo = meret.sz > meret.ma;
  const magas = meret.ma / meret.sz > 1.4;
  /* A tipográfia a vászon szélességéhez kötött, nem fix pixelhez: így a
     story és a link kreatív ugyanazt a súlyarányt viszi. */
  const e = meret.sz / 100;
  const cimMeret = fekvo ? 6.6 * e : magas ? 8.2 * e : 8.6 * e;

  /*
   * A négyzetes vásznon az alcím elmarad. Nem elfért volna — mérve nem fér:
   * a kép tartalmát az illesztés addig zsugorítaná, amíg a mintakártya
   * olvashatatlan lesz. A Meta úgyis kiírja a szövegtörzset a kép mellé;
   * egy zsúfolt kreatív viszont a kézbesítést is rontja.
   */
  const mutatAlcim = !(meret.id === '1x1');

  const cimSorok = uzenet.cim
    .map((sor, i) => (i === uzenet.kiemelt ? `<span class="kiemelt">${sor}</span>` : sor))
    .join(' ');

  const vizual =
    uzenet.vizual === 'kartya' ? kartya(e, !fekvo && !magas) : uzenet.vizual === 'xml' ? xmlVizual() : szamokVizual();

  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>
  @font-face{font-family:'DMS';src:url('file://${BETU}/@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2') format('woff2');font-weight:100 1000}
  @font-face{font-family:'DMSE';src:url('file://${BETU}/@fontsource-variable/dm-sans/files/dm-sans-latin-ext-opsz-normal.woff2') format('woff2');font-weight:100 1000}
  @font-face{font-family:'ARCH';src:url('file://${BETU}/@fontsource/archivo/files/archivo-latin-800-normal.woff2') format('woff2');font-weight:800}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${meret.sz}px;height:${meret.ma}px;background:${SZIN.vaszon};
       font-family:'DMS','DMSE',sans-serif;color:${SZIN.tinta};overflow:hidden;position:relative}

  /* Két halvány folt a kísérőszínekből — az app.css szerint dísz, nem jelzés. */
  .folt{position:absolute;border-radius:50%;filter:blur(${8 * e}px);opacity:.35}
  .folt-a{width:${52 * e}px;height:${52 * e}px;background:${SZIN.zsalya};right:${-14 * e}px;top:${-12 * e}px}
  .folt-b{width:${40 * e}px;height:${40 * e}px;background:${SZIN.mustar};left:${-16 * e}px;bottom:${-10 * e}px}

  .lap{position:relative;height:100%;display:flex;overflow:hidden;align-items:center;
       justify-content:center;padding:${fekvo ? 5 * e : 7 * e}px}
  .belso{width:100%;display:flex;gap:${fekvo ? 4 * e : 3.6 * e}px;transform-origin:center center;
         ${fekvo ? 'flex-direction:row;align-items:center' : 'flex-direction:column'}}
  .szoveg{${fekvo ? 'flex:1 1 56%' : ''}}

  .logo{display:flex;align-items:center;gap:${1.4 * e}px;margin-bottom:${fekvo ? 2.4 * e : 3.4 * e}px}
  .logo svg{width:${fekvo ? 5 * e : 6 * e}px;height:${fekvo ? 5 * e : 6 * e}px;border-radius:${0.8 * e}px}
  .logo span{font-family:'ARCH',sans-serif;font-weight:800;letter-spacing:-.035em;
             font-size:${fekvo ? 3.9 * e : 4.6 * e}px;line-height:1;color:${SZIN.markaTinta}}
  .logo span b{color:${SZIN.marka};font-weight:800}

  .jelveny{display:inline-block;border:1px solid rgba(198,108,71,.25);background:rgba(198,108,71,.10);
           color:${SZIN.terrakotta};font-weight:700;border-radius:999px;
           padding:${1.1 * e}px ${2.4 * e}px;font-size:${fekvo ? 2.4 * e : 2.9 * e}px;margin-bottom:${2.6 * e}px}

  h1{font-size:${cimMeret}px;line-height:1.04;font-weight:800;letter-spacing:-.03em;
     color:${SZIN.tinta};max-width:${fekvo ? '100%' : '15.5em'}}
  .kiemelt{background:linear-gradient(90deg,${SZIN.terrakotta},${SZIN.terrakottaVilagos});
           -webkit-background-clip:text;background-clip:text;color:transparent}
  .alcim{margin-top:${2.6 * e}px;font-size:${fekvo ? 2.7 * e : 3.3 * e}px;line-height:1.45;
         color:${SZIN.tintaLagy};max-width:22em;font-weight:500}

  .lablec{display:flex;align-items:center;gap:${2 * e}px;margin-top:${fekvo ? 3 * e : 0}px}
  .cta{background:${SZIN.terrakotta};color:#fff;font-weight:700;border-radius:999px;
       padding:${1.8 * e}px ${3.4 * e}px;font-size:${fekvo ? 2.6 * e : 3.1 * e}px}
  .cimke{font-size:${fekvo ? 2.3 * e : 2.7 * e}px;color:${SZIN.halvany};font-weight:600}

  /* A mintakártya. Ugyanazok a mezőállapotok, mint az éles felületen. */
  .kartya{background:#fff;border:1px solid rgba(140,156,134,.22);border-radius:${2.2 * e}px;
          box-shadow:0 ${2.4 * e}px ${6 * e}px rgba(58,54,52,.14);overflow:hidden;
          ${fekvo ? `flex:1 1 44%;` : `width:100%;`}}
  .kartya-fej{display:flex;align-items:center;justify-content:space-between;
              padding:${2.2 * e}px ${2.6 * e}px;border-bottom:1px solid rgba(140,156,134,.22);background:rgba(246,237,228,.5)}
  .kartya-fej p{font-weight:700;font-size:${fekvo ? 2.2 * e : 2.6 * e}px}
  .pottyok{display:flex;gap:${0.8 * e}px}
  .pottyok i{width:${1.4 * e}px;height:${1.4 * e}px;border-radius:50%;display:block}
  .kartya-test{padding:${2.6 * e}px;display:flex;flex-direction:column;gap:${1.7 * e}px}
  .mezocimke{display:flex;align-items:center;justify-content:space-between;
             font-size:${fekvo ? 1.9 * e : 2.2 * e}px;font-weight:600;color:${SZIN.halvany};margin-bottom:${0.7 * e}px}
  .jelveny-hiba{background:#fee2e2;color:${SZIN.gyanus};font-weight:700;border-radius:${0.6 * e}px;
                padding:${0.3 * e}px ${1 * e}px;font-size:${fekvo ? 1.6 * e : 1.9 * e}px}
  .mezo{display:flex;align-items:center;justify-content:space-between;background:#fff;
        border-radius:${0.9 * e}px;padding:${1.5 * e}px ${1.6 * e}px;
        font-weight:600;font-size:${fekvo ? 2.2 * e : 2.6 * e}px;color:${SZIN.tinta}}
  .mezo.biztos{border:1px solid ${SZIN.keret};border-left:${0.5 * e}px solid ${SZIN.zsalya}}
  .mezo.gyanus{border:1px solid #fca5a5;border-left:${0.5 * e}px solid ${SZIN.gyanus};background:#fef2f2}
  .ikon{width:${2.2 * e}px;height:${2.2 * e}px;display:block}
  .mezo.biztos .ikon{color:${SZIN.zsalya}}
  .mezo.gyanus .ikon{color:${SZIN.gyanus}}
  .ikon svg{width:100%;height:100%}
  .hibauzenet{color:${SZIN.gyanus};font-weight:600;font-size:${fekvo ? 2 * e : 2.3 * e}px;line-height:1.4}

  .xml-jel{display:inline-block;background:rgba(140,156,134,.2);color:${SZIN.tintaLagy};font-weight:700;
           border-radius:${0.8 * e}px;padding:${1 * e}px ${1.8 * e}px;font-size:${fekvo ? 2.3 * e : 2.7 * e}px;align-self:flex-start}
  .xml-mondat{font-size:${fekvo ? 2.1 * e : 2.5 * e}px;line-height:1.5;color:${SZIN.halvany}}
  .xml-szamok{display:flex;gap:${2.4 * e}px;margin-top:${0.6 * e}px}
  .xml-szamok div{flex:1;background:${SZIN.papir};border:1px solid ${SZIN.keret};border-radius:${1.2 * e}px;padding:${1.8 * e}px}
  .xml-szamok b{display:block;font-size:${fekvo ? 3.4 * e : 4 * e}px;font-weight:800;color:${SZIN.terrakotta};letter-spacing:-.02em}
  .xml-szamok span{font-size:${fekvo ? 1.9 * e : 2.2 * e}px;color:${SZIN.halvany};font-weight:600}

  .szamok{display:flex;gap:${2 * e}px;${fekvo ? 'flex:1 1 40%;flex-direction:column' : 'width:100%'}}
  .szamblokk{flex:1;background:#fff;border:1px solid ${SZIN.keret};border-radius:${1.6 * e}px;
             padding:${2.6 * e}px;text-align:center;box-shadow:0 ${1.2 * e}px ${3 * e}px rgba(58,54,52,.08)}
  .szamblokk b{display:block;font-size:${fekvo ? 5 * e : 6.4 * e}px;font-weight:800;color:${SZIN.terrakotta};
               letter-spacing:-.03em;line-height:1}
  .szamblokk span{display:block;margin-top:${0.8 * e}px;font-size:${fekvo ? 2 * e : 2.4 * e}px;
                  color:${SZIN.halvany};font-weight:600}
  </style></head><body>
    <div class="folt folt-a"></div><div class="folt folt-b"></div>
    <div class="lap">
      <div class="belso">
        <div class="szoveg">
          <div class="logo">${JEL}<span>Számla<b>Folyó</b></span></div>
          <p class="jelveny">${uzenet.jelveny}</p>
          <h1>${cimSorok}</h1>
          ${mutatAlcim ? `<p class="alcim">${uzenet.alcim}</p>` : ''}
          ${fekvo ? `<div class="lablec"><span class="cta">szamlafolyo.hu</span><span class="cimke">14 nap ingyen</span></div>` : ''}
        </div>
        ${vizual}
        ${fekvo ? '' : `<div class="lablec"><span class="cta">szamlafolyo.hu</span><span class="cimke">14 nap ingyen · bankkártya nélkül</span></div>`}
      </div>
    </div>
  </body></html>`;
}

const bongeszo = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
mkdirSync(`${ITT}/kep`, { recursive: true });
let db = 0;
const kicsinyitve = [];

for (const uzenet of UZENETEK) {
  for (const meret of MERETEK) {
    const lap = await bongeszo.newPage({ viewport: { width: meret.sz, height: meret.ma }, deviceScaleFactor: 1 });
    const utvonal = `${ITT}/kep/${uzenet.id}_${meret.id}.png`;
    const html = `${ITT}/.munka.html`;
    writeFileSync(html, oldal(uzenet, meret));
    await lap.goto(`file://${html}`);
    await lap.evaluate(() => document.fonts.ready);

    /*
     * Az illesztés **mérésből** jön, nem tippelt betűméretekből. A magyar
     * szöveg hossza formátumonként máshol tör sort; egy kézzel hangolt érték
     * a következő szövegváltozásnál csendben újra levágná a kártya alját.
     */
    const arany = await lap.evaluate(() => {
      const lapElem = document.querySelector('.lap');
      const belso = document.querySelector('.belso');
      const stilus = getComputedStyle(lapElem);
      const helyM = lapElem.clientHeight - parseFloat(stilus.paddingTop) - parseFloat(stilus.paddingBottom);
      const kellM = belso.getBoundingClientRect().height;
      const a = Math.min(1, helyM / kellM);
      if (a < 1) belso.style.transform = `scale(${a})`;
      return a;
    });
    if (arany < 1) kicsinyitve.push(`${uzenet.id}_${meret.id} → ${(arany * 100).toFixed(0)}%`);

    await lap.screenshot({ path: utvonal });
    await lap.close();
    db += 1;
  }
}

await bongeszo.close();
rmSync(`${ITT}/.munka.html`, { force: true });
console.log(`Kész: ${db} kép a marketing/meta/kreativ/kep/ alatt.`);
if (kicsinyitve.length > 0) {
  console.log(`Illesztve (a tartalom nem fért el natúr méretben): ${kicsinyitve.join(', ')}`);
}
