/**
 * A bemutatóvideó adatai – **mind kitalált.**
 *
 * Valódi számlaadat soha nem kerülhet ide: a videó nyilvános. Az adószámok
 * vagy a projekt próbaszámai, vagy nyolc egyforma jegy (ezeknek az ellenőrző
 * jegye stimmel, de nyilvánvalóan nem létező cégek).
 */

export const CEG = 'bbbbbbbb-0000-0000-0000-000000000001';

/** A bejelentkezett felhasználó cége. */
function cegSor(name, tax_number) {
  return {
    id: CEG,
    name,
    tax_number,
    trial_ends_at: null,
    stripe_status: null,
    stripe_price_id: null,
    auto_jovahagyas_be: true,
    overage_enabled: false,
    overage_limit_ft: null,
    file_retention_days: 30,
  };
}

const CEG_SOR = cegSor('Minta Könyvelőiroda Kft.', '22222222-2-42');

const PROBA = { nev: 'Próba Kft.', adoszam: '11111111-2-41' };
const MINTA_VEVO = { nev: 'Minta Vevő Kft.', adoszam: '23456787-2-13' };
const MINTA_SZALLITO = { nev: 'Minta Szállító Bt.', adoszam: '12345676-2-13' };
const MINTA_ENERGIA = { nev: 'Minta Energia Zrt.', adoszam: '33333333-2-43' };
const MINTA_IRODAHAZ = { nev: 'Minta Irodaház Kft.', adoszam: '44444444-2-44' };
const MINTA_PEKSEG = { nev: 'Minta Pékség Bt.', adoszam: '55555555-1-45' };
const MINTA_NYOMDA = { nev: 'Minta Nyomda Kft.', adoszam: '66666666-2-41' };

/** Egy bizonylatsor minden oszloppal, amit valamelyik képernyő kér. */
function bizonylat(o) {
  const netto = o.netto;
  const afa = Math.round((netto * (o.kulcs ?? 27)) / 100);
  const brutto = netto + afa;
  const penz = (n) => n.toFixed(2);

  return {
    id: o.id,
    company_id: CEG,
    file_id: o.fajlId,
    status: o.allapot,
    doc_type: o.tipus ?? 'szamla',
    supplier_name: o.szallito.nev,
    supplier_tax_number: o.szallito.adoszam,
    customer_name: o.vevo.nev,
    customer_tax_number: o.vevo.adoszam,
    doc_number: o.szam,
    issue_date: o.kelt,
    fulfillment_date: o.kelt,
    due_date: o.hatarido ?? null,
    payment_method: o.fizetes ?? 'átutalás',
    currency: 'HUF',
    net_amount: penz(netto),
    vat_amount: penz(afa),
    gross_amount: penz(brutto),
    fizetendo: penz(brutto),
    afa_bontas: [{ kulcs: o.kulcs ?? 27, kategoria: 'S', netto: penz(netto), afa: penz(afa) }],
    note: null,
    error: null,
    created_at: o.beerkezett,
    oldal_tol: o.oldalTol ?? null,
    oldal_ig: o.oldalIg ?? null,
    tobb_irat_gyanu: false,
    nehezen_olvashato: false,
    auto_jovahagyva: o.auto ?? false,
    auto_indok: o.auto ? 'E-számla XML: minden ellenőrzés rendben.' : null,
    export_id: null,
    files: {
      original_filename: o.fajlnev,
      mime_type: o.mime ?? 'application/pdf',
      storage_path: `${CEG}/${o.fajlId}.${o.kit ?? 'pdf'}`,
      file_deleted_at: null,
      source: o.forras ?? 'upload',
      size_bytes: o.meret ?? 180_000,
    },
    document_extractions: [{ model: o.auto ? 'xml/nav' : 'modell', created_at: o.beerkezett }],
  };
}

/** A felvétel eleji állapot. */
function kezdoBizonylatok() {
  return [
    // Már jóváhagyottak – a Tételek és az Export ezekből áll.
    bizonylat({
      id: 'b-energia', fajlId: 'f-energia', allapot: 'jovahagyva', auto: true,
      szallito: MINTA_ENERGIA, vevo: PROBA, szam: 'ME-2026-091544',
      kelt: '2026-09-15', hatarido: '2026-09-30', netto: 38_000,
      fajlnev: 'ME-2026-091544.xml', mime: 'application/xml', kit: 'xml',
      forras: 'email', beerkezett: '2026-09-15T07:12:00Z', meret: 24_000,
    }),
    bizonylat({
      id: 'b-berlet', fajlId: 'f-berlet', allapot: 'jovahagyva',
      szallito: MINTA_IRODAHAZ, vevo: PROBA, szam: 'MI-2026/0917',
      kelt: '2026-09-01', hatarido: '2026-09-10', netto: 200_000,
      fajlnev: 'berleti-dij-szeptember.pdf', beerkezett: '2026-09-02T08:40:00Z',
    }),
    bizonylat({
      id: 'b-kimeno', fajlId: 'f-kimeno', allapot: 'jovahagyva',
      szallito: PROBA, vevo: MINTA_VEVO, szam: 'PRB-2026-0142',
      kelt: '2026-09-12', hatarido: '2026-09-27', netto: 300_000,
      fajlnev: 'PRB-2026-0142.pdf', beerkezett: '2026-09-12T13:05:00Z',
    }),

    // E-mailben jött köteg: egy PDF, két blokk, szétszedve.
    bizonylat({
      id: 'b-pek-1', fajlId: 'f-koteg', allapot: 'ellenorzesre_var',
      szallito: MINTA_PEKSEG, vevo: PROBA, szam: 'ESZ-0412/00731',
      kelt: '2026-09-22', netto: 4_720, kulcs: 5, fizetes: 'készpénz',
      fajlnev: 'blokkok-szeptember.pdf', forras: 'email', oldalTol: 1, oldalIg: 1,
      beerkezett: '2026-09-23T06:58:00Z',
    }),
    bizonylat({
      id: 'b-pek-2', fajlId: 'f-koteg', allapot: 'ellenorzesre_var',
      szallito: MINTA_PEKSEG, vevo: PROBA, szam: 'ESZ-0412/00802',
      kelt: '2026-09-23', netto: 3_150, kulcs: 5, fizetes: 'készpénz',
      fajlnev: 'blokkok-szeptember.pdf', forras: 'email', oldalTol: 2, oldalIg: 2,
      beerkezett: '2026-09-23T06:58:00Z',
    }),
  ];
}

/**
 * A feltöltött számlafotó kiolvasása. **Szándékosan egy hibával:** a modell
 * a szállító adószámában 6 helyett 8-at olvasott, és az ellenőrző jegy ezt
 * elkapja – a videó erről szól.
 */
const FOTO_OLVASAT = {
  doc_type: 'szamla',
  supplier_name: MINTA_SZALLITO.nev,
  supplier_tax_number: '12345678-2-13',
  customer_name: PROBA.nev,
  customer_tax_number: PROBA.adoszam,
  doc_number: 'MSZ-2026/0412',
  issue_date: '2026-09-18',
  fulfillment_date: '2026-09-18',
  due_date: '2026-10-02',
  payment_method: 'átutalás',
  currency: 'HUF',
  net_amount: '63000.00',
  vat_amount: '17010.00',
  gross_amount: '80010.00',
  fizetendo: '80010.00',
  afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: '63000.00', afa: '17010.00' }],
};

const FOTO_FAJLNEV = 'szamla-foto.jpg';

/** Egy fotózott számla HTML-je – ebből készül a feltöltendő JPG. */
function szamlaHtml(o) {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>
  body { margin:0; background:#6b5b4b; display:flex; align-items:center; justify-content:center;
    width:1000px; height:1300px; font-family: 'DejaVu Sans', Arial, sans-serif; }
  .lap { width:780px; height:1100px; background:#fbfaf6; padding:56px 60px; box-sizing:border-box;
    transform: rotate(-1.6deg); box-shadow: 0 18px 40px rgba(0,0,0,.45); color:#222; font-size:17px; }
  h1 { font-size:34px; letter-spacing:.08em; margin:0 0 28px; }
  .ket { display:flex; gap:40px; margin-bottom:26px; }
  .ket div { flex:1; line-height:1.5; }
  .cim { font-size:13px; color:#777; text-transform:uppercase; letter-spacing:.06em; }
  table { width:100%; border-collapse:collapse; margin:22px 0; }
  th, td { border-bottom:1px solid #ccc; padding:9px 6px; text-align:left; }
  td.sz, th.sz { text-align:right; }
  .ossz { margin-left:auto; width:340px; line-height:1.9; }
  .ossz b { float:right; }
  .lab { margin-top:60px; font-size:13px; color:#888; }
</style></head><body><div class="lap">
  <h1>SZÁMLA</h1>
  <div class="ket">
    <div><div class="cim">Eladó</div><b>${o.elado.nev}</b><br>${o.elado.cim}<br>Adószám: ${o.elado.adoszam}</div>
    <div><div class="cim">Vevő</div><b>Próba Kft.</b><br>2222 Mintafalva, Fő tér 2.<br>Adószám: 11111111-2-41</div>
  </div>
  <div class="ket">
    <div>Számlaszám: <b>${o.szam}</b><br>Fizetési mód: átutalás</div>
    <div>Kelt: ${o.kelt}<br>Teljesítés: ${o.kelt}<br>Fizetési határidő: ${o.hatarido}</div>
  </div>
  <table>
    <tr><th>Megnevezés</th><th class="sz">Menny.</th><th class="sz">Nettó</th><th class="sz">ÁFA</th></tr>
    ${o.sorok.map(([n, m, e]) => `<tr><td>${n}</td><td class="sz">${m}</td><td class="sz">${e}</td><td class="sz">27%</td></tr>`).join('')}
  </table>
  <div class="ossz">
    Nettó összesen: <b>${o.netto} Ft</b><br>
    ÁFA 27%: <b>${o.afa} Ft</b><br>
    Bruttó végösszeg: <b>${o.brutto} Ft</b>
  </div>
  <div class="lab">Kitalált számla a SzámlaFolyó bemutatójához.</div>
</div></body></html>`;
}

const SZAMLA_HTML = szamlaHtml({
  elado: { ...MINTA_SZALLITO, cim: '1111 Budapest, Próba utca 1.' },
  szam: 'MSZ-2026/0412', kelt: '2026.09.18.', hatarido: '2026.10.02.',
  sorok: [['Nyomtatópapír A4, 500 lap', '10 csom.', '25 000'], ['Tonerkazetta, fekete', '2 db', '38 000']],
  netto: '63 000', afa: '17 010', brutto: '80 010',
});

// ---------------------------------------------------------------------------
// A nyitólap változata: egy vállalkozó (Próba Kft.) a saját számláival
// ---------------------------------------------------------------------------

/** A nyitólap-videó eleji állapota: üres Beérkező, két jóváhagyott tétel. */
function nyitolapKezdo() {
  return [
    bizonylat({
      id: 'b-energia', fajlId: 'f-energia', allapot: 'jovahagyva', auto: true,
      szallito: MINTA_ENERGIA, vevo: PROBA, szam: 'ME-2026-091544',
      kelt: '2026-09-15', hatarido: '2026-09-30', netto: 38_000,
      fajlnev: 'ME-2026-091544.xml', mime: 'application/xml', kit: 'xml',
      forras: 'email', beerkezett: '2026-09-15T07:12:00Z', meret: 24_000,
    }),
    bizonylat({
      id: 'b-berlet', fajlId: 'f-berlet', allapot: 'jovahagyva',
      szallito: MINTA_IRODAHAZ, vevo: PROBA, szam: 'MI-2026/0917',
      kelt: '2026-09-01', hatarido: '2026-09-10', netto: 200_000,
      fajlnev: 'berleti-dij-szeptember.pdf', beerkezett: '2026-09-02T08:40:00Z',
    }),
  ];
}

/**
 * A nyomdaszámla kiolvasása. **Szándékosan egy hibával:** a modell a
 * bruttóban 7 helyett 1-et olvasott (127 000 → 121 000), és a „nettó + ÁFA =
 * bruttó” ellenőrzés ezt elkapja – ugyanaz a jelzés, amit a nyitólap régi
 * mintakártyája mutatott.
 */
const NYOMDA_OLVASAT = {
  doc_type: 'szamla',
  supplier_name: MINTA_NYOMDA.nev,
  supplier_tax_number: MINTA_NYOMDA.adoszam,
  customer_name: PROBA.nev,
  customer_tax_number: PROBA.adoszam,
  doc_number: 'MNY-2026/0877',
  issue_date: '2026-09-19',
  fulfillment_date: '2026-09-19',
  due_date: '2026-10-03',
  payment_method: 'átutalás',
  currency: 'HUF',
  net_amount: '100000.00',
  vat_amount: '27000.00',
  gross_amount: '121000.00',
  fizetendo: null,
  afa_bontas: [{ kulcs: 27, kategoria: 'S', netto: '100000.00', afa: '27000.00' }],
};

const NYOMDA_HTML = szamlaHtml({
  elado: { ...MINTA_NYOMDA, cim: '6666 Nyomdafalva, Papír utca 6.' },
  szam: 'MNY-2026/0877', kelt: '2026.09.19.', hatarido: '2026.10.03.',
  sorok: [['Szórólap A5, színes', '5000 db', '60 000'], ['Névjegykártya', '1000 db', '40 000']],
  netto: '100 000', afa: '27 000', brutto: '127 000',
});

/** A két videó adatai. A forgatókönyv a `felvetel.mjs`-ben van. */
export const VALTOZATOK = {
  konyveloknek: {
    ceg: CEG_SOR,
    kezdo: kezdoBizonylatok,
    foto: { html: SZAMLA_HTML, fajlnev: FOTO_FAJLNEV, olvasat: FOTO_OLVASAT },
    kontir: true,
    feliratMeret: 22,
  },
  nyitolap: {
    ceg: cegSor(PROBA.nev, PROBA.adoszam),
    kezdo: nyitolapKezdo,
    foto: { html: NYOMDA_HTML, fajlnev: 'nyomda-szamla.jpg', olvasat: NYOMDA_OLVASAT },
    kontir: false,
    // A nyitólapon kisebb a videó (a hero fél szélessége): nagyobb felirat kell.
    feliratMeret: 30,
  },
};
