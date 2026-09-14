import { formaz as adoszamFormaz } from '../adoszam.ts';
import { konfidencia, type Ertelmezo, type NyersValasz } from './ertelmezo.ts';
import {
  datummaAlakit,
  gyerek,
  gyerekek,
  nevterTartalmaz,
  ut,
  utSzam,
  utSzoveg,
  type Csomopont,
  type Dokumentum,
} from './fa.ts';

/**
 * NAV Online Számla (OSA 3.0) — **a magyar számlázóprogramok alapértelmezett
 * exportja**.
 *
 * Ezért fontos: minden ide terelt bizonylat modellhívás nélkül olvasódik ki.
 * Mérve, ugyanazon a napon, ugyanazon a láncon: egy PDF kiolvasása 10,1
 * másodperc és 0,006429 USD, egy strukturált XML-é 436 ezredmásodperc és
 * nulla forint — miközben a vevő ugyanúgy egy kreditet fizet érte.
 *
 * A séma a NAV saját XSD-iből (`invoiceData.xsd`, `invoiceBase.xsd`) van, nem
 * másodkézből.
 */
export const nav: Ertelmezo = {
  nev: 'xml/nav',

  tamogatja: (doc: Dokumentum) => {
    // Az `InvoiceData` az egy bizonylatot tartalmazó fájl gyökere, az
    // `Invoices` az Online Számla felület több számlás exportjáé.
    if (doc.gyoker.nev !== 'InvoiceData' && doc.gyoker.nev !== 'Invoices') {
      return false;
    }

    // A gyökérnév önmagában kevés — `InvoiceData`-nak bármelyik házi XML
    // hívhatja magát. A névtér az, ami NAV-nak minősíti.
    return nevterTartalmaz(doc, 'schemas.nav.gov.hu');
  },

  ertelmez: (gyoker: Csomopont): NyersValasz => {
    const egysegek = szamlaEgysegek(gyoker);
    const egyseg = egysegek[0] ?? null;
    const szamla = elsoSzamla(egyseg);

    const fej = ut(szamla, 'invoiceHead');
    const szallito = ut(fej, 'supplierInfo');
    const vevo = ut(fej, 'customerInfo');
    const reszletek = ut(fej, 'invoiceDetail');
    const osszesito = ut(szamla, 'invoiceSummary');
    const normal = ut(osszesito, 'summaryNormal');

    const mezok: Record<string, unknown> = {
      doc_type: tipus(szamla),
      supplier_name: utSzoveg(szallito, 'supplierName'),
      supplier_tax_number: adoszam(ut(szallito, 'supplierTaxNumber')),
      // 3.0 óta a vevő neve **elhagyható**: magánszemély vevőnél a NAV
      // kifejezetten tiltja a feltüntetését. A hiányzó név itt nem hiba.
      customer_name: utSzoveg(vevo, 'customerName'),
      customer_tax_number: vevoAdoszam(vevo),
      // ⚠️ A bizonylatszám és a kelt az **egység közvetlen gyereke**, nem az
      // `invoiceHead` alatt: a 2.0-s séma emelte ki őket a gyökérre. A régi
      // dokumentációk (és a netes példák jó része) még a régi helyet írják.
      doc_number: utSzoveg(egyseg, 'invoiceNumber'),
      issue_date: datummaAlakit(utSzoveg(egyseg, 'invoiceIssueDate')),
      fulfillment_date: datummaAlakit(utSzoveg(reszletek, 'invoiceDeliveryDate')),
      // A NAV-ban a `paymentDate` az egyetlen fizetési határidő.
      due_date: datummaAlakit(utSzoveg(reszletek, 'paymentDate')),
      payment_method: fizetesiMod(utSzoveg(reszletek, 'paymentMethod')),
      currency: utSzoveg(reszletek, 'currencyCode'),
      // A **számla pénznemében**, nem forintra váltva: a `currencyCode` és az
      // összegek így ugyanarról szólnak. A HUF-változatok (`…AmountHUF`)
      // devizás számlán a NAV-nak szóló átszámítást hordozzák, nem a
      // bizonylat értékét.
      net_amount: utSzam(normal, 'invoiceNetAmount'),
      vat_amount: utSzam(normal, 'invoiceVatAmount'),
      gross_amount: brutto(osszesito),
      // A NAV nem ismer a bruttótól eltérő fizetendő összeget.
      fizetendo: null,
    };

    const bontas = bontasSorok(normal);

    return {
      ...mezok,
      afa_bontas: bontas,
      // Egy fájlban több számla is lehet. Az elsőt olvassuk ki, a zászló pedig
      // emberhez viszi (`kapuk.ts` „e) Szétszedetlen köteg"), és az Ellenőrzés
      // képernyő ki is írja, hogy az adatok az elsőre vonatkoznak.
      tobb_irat_gyanu: szamlakSzama(egysegek) > 1,
      // A strukturált adat nem átírás kérdése: nincs mit félreolvasni.
      nehezen_olvashato: false,
      confidence: konfidencia(mezok, bontas.length > 0),
    };
  },
};

/**
 * A „számla-egységek": azok a csomópontok, amiknek **közvetlen `invoiceMain`
 * gyerekük van**.
 *
 * Miért így, és miért nem a gyökérre építve: a NAV háromféle alakban tesz
 * számlá(ka)t egy fájlba — `InvoiceData` egy `invoice`-szal, `InvoiceData`
 * több `batchInvoice`-szal („több számla módosítása egy okirattal"), és az
 * Online Számla felület `Invoices` gyökerű exportja. Az utóbbira **nincs
 * kiadott XSD** (a NAV saját GitHubján ez nyitott kérdés), tehát a gyerek
 * pontos alakját nem tudjuk. Az `invoiceMain` viszont mindháromban ott van,
 * közvetlenül a számla adatai fölött — ez a legkevesebb, amit biztosan
 * tudunk, és fix mélységet nem feltételez.
 */
function szamlaEgysegek(gyoker: Csomopont): Csomopont[] {
  const talalatok: Csomopont[] = [];
  const sor: Csomopont[] = [gyoker];

  while (sor.length > 0) {
    const aktualis = sor.shift()!;

    if (gyerek(aktualis, 'invoiceMain') !== null) {
      talalatok.push(aktualis);
    }

    sor.push(...aktualis.gyerekek);
  }

  return talalatok;
}

/** Hány bizonylat van a fájlban. A kötegelt okirat egységenként több. */
function szamlakSzama(egysegek: readonly Csomopont[]): number {
  let osszes = 0;

  for (const egyseg of egysegek) {
    const koteg = gyerekek(gyerek(egyseg, 'invoiceMain'), 'batchInvoice').length;
    osszes += koteg > 0 ? koteg : 1;
  }

  return osszes;
}

/** Az első bizonylat törzse. Az `invoiceMain` vagy egy számlát tart, vagy köteget. */
function elsoSzamla(egyseg: Csomopont | null): Csomopont | null {
  const fo = ut(egyseg, 'invoiceMain');
  return ut(fo, 'invoice') ?? ut(fo, 'batchInvoice', 'invoice');
}

/**
 * A bizonylattípus.
 *
 * ⚠️ **Az `invoiceOperation` (CREATE / MODIFY / STORNO) nincs benne a számla
 * XML-jében** — csak a NAV-nak küldött kérés borítékában (`invoiceApi.xsd`),
 * ami a könyvelőhöz eljutó fájlból hiányzik. Sztornót és részleges
 * helyesbítést tehát ebből a fájlból **nem lehet megkülönböztetni**: az
 * egyetlen jel az `invoiceReference` megléte.
 *
 * Ezért a pontos **gyűjtőfogalmat** adjuk: minden `invoiceReference`-es
 * okirat helyesbítő okirat, a sztornó ennek a teljes esete. Szűkíteni
 * veszélyes volna — egy helyesbítést sztornónak minősíteni **egy egész
 * számlát érvénytelenítene**. Az ellenőrző képernyőn az ember egy
 * kattintással szűkítheti.
 */
function tipus(szamla: Csomopont | null): string {
  return gyerek(szamla, 'invoiceReference') === null ? 'szamla' : 'helyesbito_szamla';
}

/**
 * A bruttó végösszeg.
 *
 * ⚠️ A `summaryGrossData` a `summaryNormal` **testvére**, nem gyereke — és
 * elhagyható. Egy leszármazott-keresés innen a `summaryByVatRate` alatti
 * `vatRateGrossAmount`-ba csúszna, vagyis egy kulcssor bruttóját írná a
 * bizonylat végösszegébe.
 *
 * Ha hiányzik, **nem számoljuk ki** nettó + ÁFÁ-ból, pedig kézenfekvő volna.
 * Két okból: a származtatott érték nem kiolvasás, és — ami fontosabb — a
 * „nettó + ÁFA = bruttó" validátorunk ettől soha többé nem bukhatna meg.
 * Egy mérőeszközt cserélnénk tautológiára. Üresen a `gross_amount`
 * kulcsmező hiányzik, tehát a bizonylat emberhez megy: pontosan a helyes
 * viselkedés.
 */
function brutto(osszesito: Csomopont | null): number | null {
  return utSzam(ut(osszesito, 'summaryGrossData'), 'invoiceGrossAmount');
}

/**
 * Az adószám a NAV három darabjából.
 *
 * A `taxpayerId` + `vatCode` + `countyCode` a `base` névtérben áll, a szülő a
 * `data`-ban — a helyi nevekre épülő fánk ezt észre sem veszi.
 *
 * A `formaz()` a 11 jegyből `12345678-2-42`-t csinál; ha csak a törzsszám van
 * meg, azt adja vissza, ahogy jött. **Nem toldunk ki semmit**: egy kitalált
 * ÁFA-kód rosszabb, mint egy rövid adószám.
 */
function adoszam(csomopont: Csomopont | null): string | null {
  if (csomopont === null) {
    return null;
  }

  const darabok = [
    utSzoveg(csomopont, 'taxpayerId'),
    utSzoveg(csomopont, 'vatCode'),
    utSzoveg(csomopont, 'countyCode'),
  ].filter((darab): darab is string => darab !== null);

  return darabok.length === 0 ? null : adoszamFormaz(darabok.join(''));
}

/**
 * A vevő adószáma. A 3.0 séma szerint a három alak **választás**: pontosan
 * egy állhat közülük (2.0-ban még egymás mellett is szerepelhettek).
 */
function vevoAdoszam(vevo: Csomopont | null): string | null {
  const adatok = ut(vevo, 'customerVatData');

  if (adatok === null) {
    return null;
  }

  return (
    adoszam(ut(adatok, 'customerTaxNumber')) ??
    utSzoveg(adatok, 'communityVatNumber') ??
    utSzoveg(adatok, 'thirdStateTaxId')
  );
}

/**
 * Fizetési mód a NAV saját enumjából, magyarul.
 *
 * Nem az UNCL4461 számkódlista (`kodok.ts`), hanem öt szöveges érték — ezért
 * van itt, és nem ott. Az ismeretlen kódot ugyanazzal a doktrínával **magát
 * adjuk vissza**: nálunk ez szabad szöveges mező, így legalább látszik, mi
 * állt a bizonylaton.
 */
function fizetesiMod(kod: string | null): string | null {
  switch (kod) {
    case null:
      return null;
    case 'TRANSFER':
      return 'átutalás';
    case 'CASH':
      return 'készpénz';
    case 'CARD':
      return 'bankkártya';
    case 'VOUCHER':
      return 'utalvány';
    case 'OTHER':
      return 'egyéb';
    default:
      return kod;
  }
}

/**
 * ÁFA-bontás a `summaryByVatRate` elemekből — közvetlen gyerekek, mert az
 * egyszerűsített számla `summarySimplified`-jei ugyanitt állnának.
 */
function bontasSorok(normal: Csomopont | null): Record<string, unknown>[] {
  return gyerekek(normal, 'summaryByVatRate').map((sor) => ({
    ...afaKulcs(ut(sor, 'vatRate')),
    netto: utSzam(ut(sor, 'vatRateNetData'), 'vatRateNetAmount'),
    afa: utSzam(ut(sor, 'vatRateVatData'), 'vatRateVatAmount'),
  }));
}

/**
 * A `VatRateType` nyolc ága a mi kulcs + kategória párunkra.
 *
 * A **nulla kulcs nem kozmetika**: a `tisztitBontas()` a kulcs nélküli sort
 * eldobja (`sema.ts`), vagyis `null`-lal egy alanyi mentes számla egész
 * ÁFA-bontása csendben eltűnne. A nulla kulcs nálunk elsőrangú fogalom, saját
 * export-oszloppal (`afaBontas.ts` → `netto_0`).
 *
 * A `K` (közösségi) és `G` (export) kategóriát **nem** adjuk ki: a NAV ezeket
 * `vatExemption` / `vatOutOfScope` alá teszi szöveges `case` kóddal, és egy
 * kódszótárat valódi minták nélkül kitalálni pont az a találgatás, amit ez a
 * lánc kerülni hivatott.
 */
function afaKulcs(vatRate: Csomopont | null): { kulcs: number | null; kategoria: string | null } {
  if (vatRate === null) {
    return { kulcs: null, kategoria: null };
  }

  const szazalek = utSzam(vatRate, 'vatPercentage');
  if (szazalek !== null) {
    return { kulcs: szazalekka(szazalek), kategoria: 'S' };
  }

  // ⚠️ A `vatAmountMismatch` **saját `vatRate` gyereket** tartalmaz, tehát a
  // fában `vatRate/vatAmountMismatch/vatRate` áll. Közvetlen gyerek-bejárás
  // kell: egy rekurzív keresés a szülőt és a gyereket is megtalálná.
  const elteres = utSzam(ut(vatRate, 'vatAmountMismatch'), 'vatRate');
  if (elteres !== null) {
    return { kulcs: szazalekka(elteres), kategoria: 'S' };
  }

  if (gyerek(vatRate, 'vatExemption') !== null) {
    return { kulcs: 0, kategoria: 'E' };
  }

  if (gyerek(vatRate, 'vatOutOfScope') !== null) {
    return { kulcs: 0, kategoria: 'O' };
  }

  if (gyerek(vatRate, 'vatDomesticReverseCharge') !== null) {
    return { kulcs: 0, kategoria: 'AE' };
  }

  // Különbözeti adózás és „nincs ÁFA felszámítva": a kulcs nulla, de egyik sem
  // UNCL5305 kategória — inkább üresen hagyjuk, mint hogy rosszat írjunk.
  if (gyerek(vatRate, 'marginSchemeIndicator') !== null || gyerek(vatRate, 'noVatCharge') !== null) {
    return { kulcs: 0, kategoria: null };
  }

  // Marad a `vatContent`: az az egyszerűsített számla **bruttóra vetített**
  // adótartalma (0,2126), nem ÁFA-kulcs. Nem nevezzük annak.
  return { kulcs: null, kategoria: null };
}

/**
 * Tört → százalék, lebegőpontos szemét nélkül.
 *
 * ⚠️ **A NAV `vatPercentage`-e tört, nem százalék**: az XSD `RateType`-ja
 * `maxInclusive="1"`, vagyis `0.27` — a `27` séma szerint érvénytelen.
 * Enélkül a szorzás nélkül 27 százalékból csendben 27 forint lenne.
 *
 * A kerekítés sem elhagyható: `0.27 * 100` a JavaScriptben
 * `27.000000000000004`. A `RateType` legfeljebb négy tizedest enged, tehát a
 * szorzás után két tizedesre kerekítünk.
 */
function szazalekka(tort: number): number {
  return Math.round(tort * 10000) / 100;
}
