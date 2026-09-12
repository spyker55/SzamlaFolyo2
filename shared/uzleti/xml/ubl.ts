import { bizonylattipus, fizetesiMod } from './kodok.ts';
import { konfidencia, type Ertelmezo, type NyersValasz } from './ertelmezo.ts';
import {
  datummaAlakit,
  gyerek,
  keresOsszes,
  keresSzam,
  keresSzoveg,
  utSzam,
  utSzoveg,
  type Csomopont,
  type Dokumentum,
} from './fa.ts';

/**
 * OASIS UBL — a Peppol és az XRechnung alakja.
 *
 * Ez az, amerre az európai e-számlázás — és vele a ViDA — halad, tehát ez a
 * formátum idővel fontosabb lesz, nem kevésbé.
 */
export const ubl: Ertelmezo = {
  nev: 'xml/ubl',

  tamogatja: (doc: Dokumentum) => {
    if (doc.gyoker.nev !== 'Invoice' && doc.gyoker.nev !== 'CreditNote') {
      return false;
    }

    // A puszta „Invoice" gyökérnév túl gyakori ahhoz, hogy elég legyen: egy
    // tetszőleges házi XML is hívhatja így a gyökerét. A névtér az, ami
    // valóban UBL-nek minősíti.
    return (doc.nevter ?? '').includes('oasis:names:specification:ubl');
  },

  ertelmez: (gyoker: Csomopont, doc: Dokumentum): NyersValasz => {
    const mezok: Record<string, unknown> = {
      doc_type: tipus(gyoker, doc),
      supplier_name: felNeve(gyoker, 'AccountingSupplierParty'),
      supplier_tax_number: adoszam(gyoker, 'AccountingSupplierParty'),
      customer_name: felNeve(gyoker, 'AccountingCustomerParty'),
      customer_tax_number: adoszam(gyoker, 'AccountingCustomerParty'),
      // A gyökér közvetlen gyerekei — nem leszármazott-keresés: az `ID` és a
      // `DueDate` a fában lejjebb is előfordul (a fizetési feltételek alatt),
      // és ott már nem a bizonylatról szól.
      doc_number: utSzoveg(gyoker, 'ID'),
      issue_date: datummaAlakit(utSzoveg(gyoker, 'IssueDate')),
      fulfillment_date: datummaAlakit(keresSzoveg(gyoker, 'Delivery', 'ActualDeliveryDate')),
      due_date: datummaAlakit(utSzoveg(gyoker, 'DueDate')),
      payment_method: fizetesiMod(keresSzoveg(gyoker, 'PaymentMeans', 'PaymentMeansCode')),
      currency: utSzoveg(gyoker, 'DocumentCurrencyCode'),
      net_amount: osszeg(gyoker, 'TaxExclusiveAmount'),
      vat_amount: afaOsszesen(gyoker),
      gross_amount: osszeg(gyoker, 'TaxInclusiveAmount'),
      fizetendo: osszeg(gyoker, 'PayableAmount'),
    };

    const bontas = bontasSorok(gyoker);

    return {
      ...mezok,
      afa_bontas: bontas,
      tobb_irat_gyanu: false,
      // A strukturált adat nem átírás kérdése: nincs mit félreolvasni.
      nehezen_olvashato: false,
      confidence: konfidencia(mezok, bontas.length > 0),
    };
  },
};

/**
 * A jóváíró számlának (`CreditNote`) saját gyökéreleme van, típuskód nélkül is
 * egyértelmű. Egyébként az UNCL1001 kód dönt.
 */
function tipus(gyoker: Csomopont, doc: Dokumentum): string | null {
  if (doc.gyoker.nev === 'CreditNote') {
    return 'sztorno_szamla';
  }

  return bizonylattipus(utSzoveg(gyoker, 'InvoiceTypeCode'));
}

/**
 * A fél neve. A **bejegyzett cégnév** (`PartyLegalEntity/RegistrationName`) a
 * pontosabb — a `PartyName` gyakran rövidített kereskedelmi név.
 */
function felNeve(gyoker: Csomopont, fel: string): string | null {
  return (
    keresSzoveg(gyoker, fel, 'Party', 'PartyLegalEntity', 'RegistrationName') ??
    keresSzoveg(gyoker, fel, 'Party', 'PartyName', 'Name')
  );
}

/**
 * Az adószám. Az UBL-ben a `PartyTaxScheme/CompanyID` az ÁFA-szám; ha az
 * nincs, a cégjegyzékszám helyett **inkább semmit** nem adunk vissza, mert az
 * nem adószám.
 */
function adoszam(gyoker: Csomopont, fel: string): string | null {
  return keresSzoveg(gyoker, fel, 'Party', 'PartyTaxScheme', 'CompanyID');
}

function osszeg(gyoker: Csomopont, nev: string): number | null {
  return keresSzam(gyoker, 'LegalMonetaryTotal', nev);
}

/**
 * A fejléc ÁFA-összesenje.
 *
 * **Csak a közvetlenül a `TaxTotal` alatt álló `TaxAmount` kell** — az
 * al-összegeknek (`TaxSubtotal`) is van ilyen nevű gyerekük, és azok
 * soronkénti értékek. Egy leszármazott-keresés itt az első kulcssor ÁFÁ-ját
 * írná a bizonylat ÁFA-végösszegébe.
 */
function afaOsszesen(gyoker: Csomopont): number | null {
  const taxTotal = gyerek(gyoker, 'TaxTotal');
  return utSzam(taxTotal, 'TaxAmount');
}

/**
 * ÁFA-bontás a `TaxSubtotal` elemekből. Az UBL a kategóriakódot és a kulcsot is
 * a `TaxCategory` alatt tartja.
 */
function bontasSorok(gyoker: Csomopont): Record<string, unknown>[] {
  return keresOsszes(gyoker, 'TaxTotal', 'TaxSubtotal').map((elem) => ({
    kulcs: keresSzam(elem, 'TaxCategory', 'Percent'),
    kategoria: keresSzoveg(elem, 'TaxCategory', 'ID'),
    netto: keresSzam(elem, 'TaxableAmount'),
    afa: keresSzam(elem, 'TaxAmount'),
  }));
}
