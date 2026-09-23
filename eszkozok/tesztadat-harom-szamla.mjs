/**
 * A `tesztadat/harom-szamla-rendes.pdf` előállítása a mellette álló JSON-ból:
 * `node eszkozok/tesztadat-harom-szamla.mjs`
 *
 * Chromiumban nyomtatott PDF, oldalanként egy számla. A JSON az igazság
 * forrása; a `felderites.test.ts` azt ellenőrzi, hogy a PDF oldalai pontosan
 * ezt hordozzák, a validátorok pedig egyetlen mezőn sem jeleznek.
 *
 * Miért kell: a 2026-09-23-i `harom-szamla.pdf` szándékosan hibás volt (a
 * fizetendő nem egyezett a tételekkel, az adószámok ellenőrző számjegye
 * rossz), és mérve ez a modell gondolkodását nagyjából megduplázta, az
 * elszaladását megháromszorozta. Egy sebességmérés ne a modell zavarát mérje.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const GYOKER = new URL('../', import.meta.url);
const adat = JSON.parse(readFileSync(new URL('tesztadat/harom-szamla-rendes.json', GYOKER), 'utf8'));

const ft = (n) => `${n.toLocaleString('hu-HU').replace(/\s/g, ' ')} Ft`;
const datum = (d) => `${d.replaceAll('-', '. ')}.`;

const oldal = (sz) => {
  const sorok = sz.tetelek
    .map((t) => {
      const afa = Math.round(t.netto * 0.27);
      return `<tr><td>${t.megnevezes}</td><td>${ft(t.netto)}</td><td>27%</td><td>${ft(afa)}</td><td>${ft(t.netto + afa)}</td></tr>`;
    })
    .join('');

  return `<section style="page-break-after:always;font-family:sans-serif;font-size:13px">
<h1>SZÁMLA</h1>
<p>Számlaszám: <b>${sz.doc_number}</b></p>
<p><b>Eladó:</b> ${sz.supplier_name}, 1011 Budapest, Fő utca 1. – Adószám: ${sz.supplier_tax_number}</p>
<p><b>Vevő:</b> ${sz.customer_name}, 9021 Győr, Ősz utca 1. – Adószám: ${sz.customer_tax_number}</p>
<p>Kelt: ${datum(sz.issue_date)} · Teljesítés: ${datum(sz.fulfillment_date)} · Fizetési határidő: ${datum(sz.due_date)} · Fizetési mód: átutalás</p>
<table border="1" cellpadding="4" style="border-collapse:collapse">
<tr><th>Megnevezés</th><th>Nettó</th><th>ÁFA-kulcs</th><th>ÁFA</th><th>Bruttó</th></tr>
${sorok}
<tr><td><b>Összesen</b></td><td><b>${ft(sz.net_amount)}</b></td><td></td><td><b>${ft(sz.vat_amount)}</b></td><td><b>${ft(sz.gross_amount)}</b></td></tr>
</table>
<p><b>Fizetendő: ${ft(sz.gross_amount)}</b></p>
</section>`;
};

const bongeszo = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const lap = await bongeszo.newPage();
await lap.setContent(`<html lang="hu"><body>${adat.szamlak.map(oldal).join('')}</body></html>`);
writeFileSync(new URL('tesztadat/harom-szamla-rendes.pdf', GYOKER), await lap.pdf({ format: 'A4' }));
await bongeszo.close();
console.log('kész: tesztadat/harom-szamla-rendes.pdf');
