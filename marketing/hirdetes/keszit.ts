/**
 * A hirdetéscsomag gyártója: képek (Meta, Google) és szöveges kimenetek.
 *
 * Futtatás:  npx vite-node marketing/hirdetes/keszit.ts
 *
 * # Miért gyártott, és nem kézi grafika
 *
 * A hirdetés arculata és a termék arculata ne tudjon szétcsúszni:
 *
 * - a színek a `src/app.css` palettájából, szó szerint;
 * - a betűk a repó saját, helyben tárolt fájljaiból (`node_modules/
 *   @fontsource*`) – ugyanazok, amiket a látogató böngészője kap;
 * - a jel a `src/komponensek/Logo.tsx` geometriája;
 * - a felületszövegek (állapotcímke, hibaüzenet, forrásjelzés) a `minta.ts`-en
 *   át az alkalmazásból;
 * - a hirdetésszövegek a `szovegek.ts`-ből.
 *
 * Az illesztés **mérésből** jön: ha a tartalom nem fér el a vásznon, a gyártó
 * kicsinyít, és kiírja, melyik képen. Egy kézzel hangolt betűméret a következő
 * szövegváltozásnál csendben levágná a kép alját.
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { keresesHirdetesekCsv, kulcsszavakCsv, szovegMd } from './kimenet.ts';
import { GOOGLE_LOGOK, GOOGLE_MERETEK, META_MERETEK, type Meret } from './meretek.ts';
import { BEERKEZO_SOROK, EMAIL, EXPORT_SOROK, MEZOK, MINTA_BEKULDESI_CIM, MINTA_UGYFEL, VALIDATOR_UZENET, XML_FORRAS } from './minta.ts';
import { GOOGLE_KEP_UZENETEK, META, type MetaUzenet } from './szovegek.ts';
import { szamlafolyo } from '@config/szamlafolyo.ts';

const ITT = new URL('.', import.meta.url).pathname;
const BETU = new URL('../../node_modules', import.meta.url).pathname;

/* A paletta. Forrás: src/app.css – nem közelítés, másolat. */
const SZIN = {
  vaszon: '#f6ede4',
  papir: '#fbf8f4',
  tinta: '#2a2a26',
  tintaLagy: '#4d473f',
  halvany: '#787066',
  keret: '#e9ded1',
  marka: '#be6846',
  markaTinta: '#3a3634',
  terrakotta: '#9e5537', // --color-blue-700: a felület „kiemelt" színe
  terrakottaVilagos: '#c66c47',
  zsalya: '#8c9c86',
  mustar: '#dfb671',
  gyanus: '#b91c1c',
  borostyan: '#92400e',
  borostyanHatter: '#fef3c7',
  smaragd: '#065f46',
  smaragdHatter: '#d1fae5',
};

/* A jel a `Logo.tsx`-ből, pixelre. */
const JEL = `<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
  <rect width="56" height="56" fill="#be6846"/>
  <path d="M14 11 H34 L42 19 V45 H14 Z" fill="#f5ece2"/>
  <path d="M18 27 C22 23, 26 31, 30 27 S38 23, 38 27" stroke="#be6846" stroke-width="3" fill="none"/>
  <path d="M18 35 C22 31, 26 39, 30 35 S38 31, 38 35" stroke="#be6846" stroke-width="3" fill="none"/>
</svg>`;

const PIPA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const FIGYELEM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>`;
const NYIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`;
const LEVEL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;
const FAJL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* -------------------------------------------------------------------------
 * A vizuálok – mind ugyanabból a kártyakeretből
 * ---------------------------------------------------------------------- */

function keret(fejlec: string, test: string): string {
  return `<div class="kartya"><div class="kartya-fej"><p>${esc(fejlec)}</p>
    <div class="pottyok"><i style="background:${SZIN.terrakottaVilagos}"></i><i style="background:${SZIN.mustar}"></i><i style="background:${SZIN.zsalya}"></i></div>
  </div><div class="kartya-test">${test}</div></div>`;
}

/*
 * ⚠️ A `suru` nem kozmetika: a négyzetes és a 4:5-ös vásznon az öt mező a kép
 * alján túlnyúlna, és pont az veszne el, amiért a kártya ott van – a piros
 * mező és a validátor mondata. Ott három mező áll: egy átment, egy nevet
 * mutató, és a megbukott.
 */
function mezoKartya(suru: boolean): string {
  const mezok = suru ? MEZOK.filter((m) => m.cimke !== 'Szállító adószáma' && m.cimke !== 'ÁFA') : MEZOK;
  const sor = (m: (typeof MEZOK)[number]) => `<div>
      <p class="mezocimke">${esc(m.cimke)}</p>
      <div class="mezo ${m.gyanus ? 'gyanus' : 'biztos'}"><span>${esc(m.ertek)}</span><i class="ikon">${m.gyanus ? FIGYELEM : PIPA}</i></div>
    </div>`;
  return keret('Ellenőrzés', `${mezok.map(sor).join('')}<p class="hibauzenet">${esc(VALIDATOR_UZENET)}</p>`);
}

function beerkezo(): string {
  const sor = (s: (typeof BEERKEZO_SOROK)[number]) => `<div class="lista-sor ${s.varakozik ? 'varakozik' : ''}">
      <span class="lista-ikon">${FAJL}</span>
      <span class="lista-szoveg"><b>${esc(s.fajl)}</b><span>${esc(s.mit)}</span></span>
      <span class="jelveny-allapot ${s.varakozik ? 'varakozo' : 'kesz'}">${esc(s.allapot)}</span>
    </div>`;
  return keret('Beérkező', BEERKEZO_SOROK.map(sor).join(''));
}

/* Sűrű vásznon egysoros sorok: a „mit" alcím nélkül is egyértelmű a lista. */
function programok(suru: boolean): string {
  const sor = (p: (typeof EXPORT_SOROK)[number]) =>
    `<div class="lista-sor"><span class="lista-ikon">${FAJL}</span><span class="lista-szoveg"><b>${esc(p.nev)}</b>${suru ? '' : `<span>${esc(p.mit)}</span>`}</span></div>`;
  return keret('Export', `<div class="szuro">${esc(MINTA_UGYFEL)}</div>${EXPORT_SOROK.map(sor).join('')}`);
}

function email(): string {
  return keret(
    'Továbbított levél',
    `<div class="level">
      <p><span>Címzett</span><b>${esc(MINTA_BEKULDESI_CIM)}</b></p>
      <p><span>Tárgy</span><b>${esc(EMAIL.targy)}</b></p>
      <div class="csatolmany">${FAJL}<b>${esc(EMAIL.melleklet)}</b></div>
    </div>
    <div class="lefele">${NYIL}</div>
    <div class="eredmeny">${LEVEL}<b>${esc(EMAIL.eredmeny)}</b></div>`,
  );
}

function xml(): string {
  return keret(
    'Kiolvasás forrása',
    `<div class="xml-jel">${esc(XML_FORRAS.rovid)}</div>
     <p class="xml-mondat">${esc(XML_FORRAS.mondat)}</p>
     <div class="formatumok"><span>UBL</span><span>Factur-X</span><span>ZUGFeRD</span><span>NAV XML</span></div>`,
  );
}

/* A három szám a `config/szamlafolyo.ts` `proba` blokkjából. */
function szamok(): string {
  const { napok, dokumentumok, felhasznalok } = szamlafolyo.proba;
  const blokk = (ertek: number, cimke: string) => `<div class="szamblokk"><b>${ertek}</b><span>${cimke}</span></div>`;
  return `<div class="szamok">${blokk(napok, 'nap')}${blokk(dokumentumok, 'dokumentum')}${blokk(felhasznalok, 'felhasználó')}</div>`;
}

function vizual(u: MetaUzenet, suru: boolean): string {
  switch (u.kep.vizual) {
    case 'beerkezo':
      return beerkezo();
    case 'kartya':
      return mezoKartya(suru);
    case 'programok':
      return programok(suru);
    case 'email':
      return email();
    case 'xml':
      return xml();
    case 'szamok':
      return szamok();
  }
}

/* -------------------------------------------------------------------------
 * Az oldal
 * ---------------------------------------------------------------------- */

type Mod = 'meta' | 'google';

/*
 * A 9:16-os vásznon a Meta saját felülete takar: felül kb. 250, alul kb. 340
 * képpontot (profilsor, illetve gomb és felirat). Ide semmi lényeges nem
 * kerülhet – ezért ez a párnázás, nem a szokásos 7%.
 */
const VEDETT = { felul: 270, alul: 360 };

function stilus(m: Meret, fekvo: boolean): string {
  const e = m.sz / 100;
  const magas = m.ma / m.sz > 1.4;
  const cim = fekvo ? 4.6 * e : magas ? 8.2 * e : 8 * e;
  const k = fekvo ? 0.72 : 1; // a fekvő kártya betűi kisebbek

  return `
  @font-face{font-family:'DMS';src:url('file://${BETU}/@fontsource-variable/dm-sans/files/dm-sans-latin-opsz-normal.woff2') format('woff2');font-weight:100 1000}
  @font-face{font-family:'DMSE';src:url('file://${BETU}/@fontsource-variable/dm-sans/files/dm-sans-latin-ext-opsz-normal.woff2') format('woff2');font-weight:100 1000}
  @font-face{font-family:'ARCH';src:url('file://${BETU}/@fontsource/archivo/files/archivo-latin-800-normal.woff2') format('woff2');font-weight:800}
  @font-face{font-family:'ARCHE';src:url('file://${BETU}/@fontsource/archivo/files/archivo-latin-ext-800-normal.woff2') format('woff2');font-weight:800}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${m.sz}px;height:${m.ma}px;background:${SZIN.vaszon};font-family:'DMS','DMSE',sans-serif;color:${SZIN.tinta};overflow:hidden;position:relative}
  .folt{position:absolute;border-radius:50%;filter:blur(${8 * e}px);opacity:.35}
  .folt-a{width:${52 * e}px;height:${52 * e}px;background:${SZIN.zsalya};right:${-14 * e}px;top:${-12 * e}px}
  .folt-b{width:${40 * e}px;height:${40 * e}px;background:${SZIN.mustar};left:${-16 * e}px;bottom:${-10 * e}px}
  .lap{position:relative;height:100%;display:flex;align-items:center;justify-content:center;padding:${fekvo ? `${4 * e}px ${5 * e}px` : magas ? `${VEDETT.felul}px ${7 * e}px ${VEDETT.alul}px` : `${7 * e}px`}}
  .belso{width:100%;display:flex;gap:${fekvo ? 4 * e : 3.6 * e}px;transform-origin:center center;${fekvo ? 'flex-direction:row;align-items:center' : 'flex-direction:column'}}
  .szoveg{${fekvo ? 'flex:1 1 52%' : ''}}
  .jobb{${fekvo ? 'flex:1 1 48%' : 'width:100%'}}
  .logo{display:flex;align-items:center;gap:${1.2 * e}px;margin-bottom:${fekvo ? 2 * e : 3.4 * e}px}
  .logo svg{width:${fekvo ? 4 * e : 6 * e}px;height:${fekvo ? 4 * e : 6 * e}px;border-radius:${0.8 * e}px}
  .logo span{font-family:'ARCH','ARCHE',sans-serif;font-weight:800;letter-spacing:-.035em;font-size:${fekvo ? 3.2 * e : 4.6 * e}px;line-height:1;color:${SZIN.markaTinta}}
  .logo span b{color:${SZIN.marka};font-weight:800}
  .jelveny{display:inline-block;border:1px solid rgba(198,108,71,.25);background:rgba(198,108,71,.10);color:${SZIN.terrakotta};font-weight:700;border-radius:999px;padding:${fekvo ? 0.7 * e : 1.1 * e}px ${fekvo ? 1.6 * e : 2.4 * e}px;font-size:${fekvo ? 1.8 * e : 2.9 * e}px;margin-bottom:${fekvo ? 1.8 * e : 2.6 * e}px;white-space:nowrap}
  h1{font-size:${cim}px;line-height:1.05;font-weight:800;letter-spacing:-.03em;color:${SZIN.tinta}}
  .kiemelt{color:${SZIN.terrakotta}}
  .alcim{margin-top:${2.6 * e}px;font-size:${fekvo ? 2.6 * e : 3.3 * e}px;line-height:1.45;color:${SZIN.tintaLagy};font-weight:500}
  .lablec{display:flex;align-items:center;gap:${2 * e}px;margin-top:${fekvo ? 3 * e : 0}px}
  .cta{background:${SZIN.terrakotta};color:#fff;font-weight:700;border-radius:999px;padding:${fekvo ? 1.2 * e : 1.8 * e}px ${fekvo ? 2.4 * e : 3.4 * e}px;font-size:${fekvo ? 2 * e : 3.1 * e}px;white-space:nowrap}
  .cimke{font-size:${fekvo ? 1.8 * e : 2.7 * e}px;color:${SZIN.halvany};font-weight:600}

  .kartya{background:#fff;border:1px solid rgba(140,156,134,.22);border-radius:${2.2 * e}px;box-shadow:0 ${2.4 * e}px ${6 * e}px rgba(58,54,52,.14);overflow:hidden}
  .kartya-fej{display:flex;align-items:center;justify-content:space-between;padding:${2.2 * e * k}px ${2.6 * e * k}px;border-bottom:1px solid rgba(140,156,134,.22);background:rgba(246,237,228,.5)}
  .kartya-fej p{font-weight:700;font-size:${2.6 * e * k}px}
  .pottyok{display:flex;gap:${0.8 * e}px}
  .pottyok i{width:${1.4 * e}px;height:${1.4 * e}px;border-radius:50%;display:block}
  .kartya-test{padding:${2.6 * e * k}px;display:flex;flex-direction:column;gap:${1.7 * e * k}px}
  .mezocimke{font-size:${2.2 * e * k}px;font-weight:600;color:${SZIN.halvany};margin-bottom:${0.7 * e}px}
  .mezo{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:${0.9 * e}px;padding:${1.5 * e * k}px ${1.6 * e * k}px;font-weight:600;font-size:${2.6 * e * k}px}
  .mezo.biztos{border:1px solid ${SZIN.keret};border-left:${0.5 * e}px solid ${SZIN.zsalya}}
  .mezo.gyanus{border:1px solid #fca5a5;border-left:${0.5 * e}px solid ${SZIN.gyanus};background:#fef2f2}
  .ikon{width:${2.2 * e * k}px;height:${2.2 * e * k}px;display:block}
  .mezo.biztos .ikon{color:${SZIN.zsalya}} .mezo.gyanus .ikon{color:${SZIN.gyanus}}
  .ikon svg,.lista-ikon svg,.csatolmany svg,.eredmeny svg,.lefele svg{width:100%;height:100%}
  .hibauzenet{color:${SZIN.gyanus};font-weight:600;font-size:${2.3 * e * k}px;line-height:1.4}

  .lista-sor{display:flex;align-items:center;gap:${1.8 * e * k}px;border:1px solid rgba(140,156,134,.18);border-radius:${1.2 * e}px;padding:${1.8 * e * k}px}
  .lista-sor.varakozik{box-shadow:0 0 0 ${0.4 * e}px #fcd34d}
  .lista-ikon{flex:none;width:${5 * e * k}px;height:${5 * e * k}px;border-radius:${0.9 * e}px;background:rgba(140,156,134,.12);color:${SZIN.zsalya};padding:${1.1 * e * k}px}
  .lista-sor.varakozik .lista-ikon{background:${SZIN.borostyanHatter};color:${SZIN.borostyan}}
  .lista-szoveg{min-width:0;flex:1;display:flex;flex-direction:column;gap:${0.4 * e}px}
  .lista-szoveg b{font-size:${2.4 * e * k}px}
  .lista-szoveg span{font-size:${1.9 * e * k}px;color:${SZIN.halvany};line-height:1.35}
  .jelveny-allapot{flex:none;border-radius:999px;padding:${0.6 * e * k}px ${1.4 * e * k}px;font-size:${1.8 * e * k}px;font-weight:700}
  .jelveny-allapot.kesz{background:${SZIN.smaragdHatter};color:${SZIN.smaragd}}
  .jelveny-allapot.varakozo{background:${SZIN.borostyanHatter};color:${SZIN.borostyan}}
  .szuro{align-self:flex-start;border:1px solid ${SZIN.keret};background:${SZIN.papir};border-radius:999px;padding:${0.8 * e * k}px ${1.8 * e * k}px;font-size:${2 * e * k}px;font-weight:600;color:${SZIN.tintaLagy}}

  .level{display:flex;flex-direction:column;gap:${1.2 * e * k}px}
  .level p{display:flex;flex-direction:column;gap:${0.3 * e}px}
  .level p span{font-size:${1.9 * e * k}px;color:${SZIN.halvany};font-weight:600}
  .level p b{font-size:${2.3 * e * k}px;word-break:break-all}
  .csatolmany{display:flex;align-items:center;gap:${1.2 * e}px;align-self:flex-start;border:1px solid ${SZIN.keret};border-radius:${1 * e}px;padding:${1 * e * k}px ${1.6 * e * k}px;font-size:${2.1 * e * k}px}
  .csatolmany svg{width:${2.6 * e * k}px;height:${2.6 * e * k}px;color:${SZIN.terrakotta}}
  .lefele{align-self:center;width:${3.4 * e * k}px;height:${3.4 * e * k}px;color:${SZIN.zsalya}}
  .eredmeny{display:flex;align-items:center;gap:${1.4 * e}px;background:${SZIN.smaragdHatter};color:${SZIN.smaragd};border-radius:${1.2 * e}px;padding:${1.6 * e * k}px ${2 * e * k}px;font-size:${2.3 * e * k}px}
  .eredmeny svg{width:${3 * e * k}px;height:${3 * e * k}px;flex:none}

  .xml-jel{display:inline-block;align-self:flex-start;background:rgba(140,156,134,.2);color:${SZIN.tintaLagy};font-weight:700;border-radius:${0.8 * e}px;padding:${1 * e * k}px ${1.8 * e * k}px;font-size:${2.7 * e * k}px}
  .xml-mondat{font-size:${2.4 * e * k}px;line-height:1.5;color:${SZIN.tintaLagy}}
  .formatumok{display:flex;flex-wrap:wrap;gap:${1 * e}px}
  .formatumok span{border:1px solid ${SZIN.keret};background:${SZIN.papir};border-radius:999px;padding:${0.7 * e * k}px ${1.6 * e * k}px;font-size:${2 * e * k}px;font-weight:700;color:${SZIN.terrakotta}}

  .szamok{display:flex;gap:${2 * e}px;${fekvo ? 'flex-direction:column' : ''}}
  .szamblokk{flex:1;background:#fff;border:1px solid ${SZIN.keret};border-radius:${1.6 * e}px;padding:${2.6 * e * k}px;text-align:center;box-shadow:0 ${1.2 * e}px ${3 * e}px rgba(58,54,52,.08)}
  .szamblokk b{display:block;font-size:${6.4 * e * k}px;font-weight:800;color:${SZIN.terrakotta};letter-spacing:-.03em;line-height:1}
  .szamblokk span{display:block;margin-top:${0.8 * e}px;font-size:${2.4 * e * k}px;color:${SZIN.halvany};font-weight:600}`;
}

function oldal(u: MetaUzenet, m: Meret, mod: Mod): string {
  const fekvo = m.sz > m.ma;
  const negyzet = m.sz === m.ma;
  const cimSorok = u.kep.cim.map((sor, i) => (i === u.kep.kiemelt ? `<span class="kiemelt">${esc(sor)}</span>` : esc(sor))).join(' ');

  /*
   * A Meta a hirdetés szövegét a kép mellé írja, a Google pedig a kevés
   * szöveget ajánlja a képen. Ezért: a Google-képen nincs jelvény, alcím és
   * gomb; a Meta négyzetes és fekvő képén nincs alcím (mérve nem fér el a kártya
   * mellett olvashatóan).
   */
  const jelveny = mod === 'meta' ? `<p class="jelveny">${esc(u.kep.jelveny)}</p>` : '';
  const alcim = mod === 'meta' && !negyzet && !fekvo ? `<p class="alcim">${esc(u.kep.alcim)}</p>` : '';
  const lablecSzoveg = `${szamlafolyo.proba.napok} nap ingyenes próba · bankkártya nélkül`;
  const lablec =
    mod === 'meta'
      ? `<div class="lablec"><span class="cta">szamlafolyo.hu</span><span class="cimke">${esc(fekvo ? `${szamlafolyo.proba.napok} nap ingyenes próba` : lablecSzoveg)}</span></div>`
      : '';

  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>${stilus(m, fekvo)}</style></head><body>
    <div class="folt folt-a"></div><div class="folt folt-b"></div>
    <div class="lap"><div class="belso">
      <div class="szoveg">
        <div class="logo">${JEL}<span>Számla<b>Folyó</b></span></div>
        ${jelveny}<h1>${cimSorok}</h1>${alcim}
        ${fekvo ? lablec : ''}
      </div>
      <div class="jobb">${vizual(u, m.ma / m.sz < 1.4)}</div>
      ${fekvo ? '' : lablec}
    </div></div>
  </body></html>`;
}

function logoOldal(m: Meret): string {
  const fekvo = m.sz > m.ma;
  const e = m.ma / 100;
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>${stilus(m, fekvo)}
    body{background:#fff}
    .l{height:100%;display:flex;align-items:center;justify-content:center;gap:${fekvo ? 8 * e : 5 * e}px;${fekvo ? '' : 'flex-direction:column'}}
    .l svg{width:${fekvo ? 52 * e : 44 * e}px;height:${fekvo ? 52 * e : 44 * e}px;border-radius:${fekvo ? 7 * e : 5 * e}px}
    .l span{font-family:'ARCH','ARCHE',sans-serif;font-weight:800;letter-spacing:-.035em;font-size:${fekvo ? 30 * e : 11 * e}px;line-height:1;color:${SZIN.markaTinta}}
    .l span b{color:${SZIN.marka}}
  </style></head><body><div class="l">${JEL}<span>Számla<b>Folyó</b></span></div></body></html>`;
}

/* -------------------------------------------------------------------------
 * Gyártás
 * ---------------------------------------------------------------------- */

const bongeszo = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const munka = `${ITT}.munka.html`;
const kicsinyitve: string[] = [];
let db = 0;

async function lefenykep(html: string, m: Meret, ut: string, cimke: string): Promise<void> {
  const lap = await bongeszo.newPage({ viewport: { width: m.sz, height: m.ma }, deviceScaleFactor: 1 });
  writeFileSync(munka, html);
  await lap.goto(`file://${munka}`);
  await lap.evaluate(() => document.fonts.ready);
  const arany = await lap.evaluate(() => {
    const lapElem = document.querySelector('.lap');
    const belso = document.querySelector<HTMLElement>('.belso');
    if (lapElem === null || belso === null) return 1;
    const st = getComputedStyle(lapElem);
    const helyM = lapElem.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    const helySz = lapElem.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    const r = belso.getBoundingClientRect();
    const a = Math.min(1, helyM / r.height, helySz / belso.scrollWidth);
    if (a < 1) belso.style.transform = `scale(${a})`;
    return a;
  });
  if (arany < 0.999) kicsinyitve.push(`${cimke} → ${(arany * 100).toFixed(0)}%`);
  await lap.screenshot({ path: ut });
  await lap.close();
  db += 1;
}

// A régi képek ki: egy átnevezett üzenet képe ne maradjon ott árván.
rmSync(`${ITT}kep`, { recursive: true, force: true });
mkdirSync(`${ITT}kep/meta`, { recursive: true });
mkdirSync(`${ITT}kep/google`, { recursive: true });
mkdirSync(`${ITT}google`, { recursive: true });

for (const u of META) {
  for (const m of META_MERETEK) await lefenykep(oldal(u, m, 'meta'), m, `${ITT}kep/meta/${u.id}_${m.id}.png`, `meta/${u.id}_${m.id}`);
}
for (const id of GOOGLE_KEP_UZENETEK) {
  const u = META.find((x) => x.id === id);
  if (u === undefined) throw new Error(`Ismeretlen üzenet: ${id}`);
  for (const m of GOOGLE_MERETEK) await lefenykep(oldal(u, m, 'google'), m, `${ITT}kep/google/${u.id}_${m.id}.png`, `google/${u.id}_${m.id}`);
}
for (const m of GOOGLE_LOGOK) await lefenykep(logoOldal(m), m, `${ITT}kep/google/${m.id}.png`, `google/${m.id}`);

await bongeszo.close();
rmSync(munka, { force: true });

writeFileSync(`${ITT}SZOVEGEK.md`, szovegMd());
writeFileSync(`${ITT}google/kereses-hirdetesek.csv`, keresesHirdetesekCsv());
writeFileSync(`${ITT}google/kulcsszavak.csv`, kulcsszavakCsv());

console.log(`Kész: ${db} kép, SZOVEGEK.md és két CSV a marketing/hirdetes/ alatt.`);
if (kicsinyitve.length > 0) console.log(`Illesztve (natúr méretben nem fért el):\n  ${kicsinyitve.join('\n  ')}`);
