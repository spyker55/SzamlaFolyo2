import { bizonylattipus, fizetesiMod } from './kodok.ts';
import { konfidencia, type Ertelmezo, type NyersValasz } from './ertelmezo.ts';
import {
  datummaAlakit,
  keres,
  keresOsszes,
  keresSzam,
  keresSzoveg,
  type Csomopont,
  type Dokumentum,
} from './fa.ts';

/**
 * UN/CEFACT Cross Industry Invoice — a Factur-X és a ZUGFeRD ezt használja.
 *
 * **A PDF-be ágyazott e-számlák túlnyomó része ilyen**, ezért ez a
 * legfontosabb értelmező.
 */
export const cii: Ertelmezo = {
  nev: 'xml/cii',

  // A ZUGFeRD 1.0 „CrossIndustryDocument"-nek hívja ugyanezt.
  tamogatja: (doc: Dokumentum) =>
    doc.gyoker.nev === 'CrossIndustryInvoice' || doc.gyoker.nev === 'CrossIndustryDocument',

  ertelmez: (gyoker: Csomopont): NyersValasz => {
    const mezok: Record<string, unknown> = {
      doc_type: bizonylattipus(keresSzoveg(gyoker, 'ExchangedDocument', 'TypeCode')),
      supplier_name: keresSzoveg(gyoker, 'SellerTradeParty', 'Name'),
      supplier_tax_number: adoszam(gyoker, 'SellerTradeParty'),
      customer_name: keresSzoveg(gyoker, 'BuyerTradeParty', 'Name'),
      customer_tax_number: adoszam(gyoker, 'BuyerTradeParty'),
      doc_number: keresSzoveg(gyoker, 'ExchangedDocument', 'ID'),
      issue_date: datummaAlakit(
        keresSzoveg(gyoker, 'ExchangedDocument', 'IssueDateTime', 'DateTimeString'),
      ),
      fulfillment_date: datummaAlakit(
        keresSzoveg(gyoker, 'ActualDeliverySupplyChainEvent', 'OccurrenceDateTime', 'DateTimeString'),
      ),
      due_date: datummaAlakit(
        keresSzoveg(gyoker, 'SpecifiedTradePaymentTerms', 'DueDateDateTime', 'DateTimeString'),
      ),
      payment_method: fizetesiMod(
        keresSzoveg(gyoker, 'SpecifiedTradeSettlementPaymentMeans', 'TypeCode'),
      ),
      currency: keresSzoveg(gyoker, 'InvoiceCurrencyCode'),
      net_amount: osszeg(gyoker, 'TaxBasisTotalAmount'),
      vat_amount: osszeg(gyoker, 'TaxTotalAmount'),
      gross_amount: osszeg(gyoker, 'GrandTotalAmount'),
      fizetendo: osszeg(gyoker, 'DuePayableAmount'),
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
 * Az összegek **a fejléc-összesítőből**.
 *
 * A `SpecifiedTradeSettlementHeaderMonetarySummation` alatt kell keresni, mert
 * ugyanezek a nevek a tételsorok alatt is előfordulnak — ott viszont
 * soronkénti értékek állnak, nem a végösszeg.
 */
function osszeg(gyoker: Csomopont, nev: string): number | null {
  return keresSzam(gyoker, 'SpecifiedTradeSettlementHeaderMonetarySummation', nev);
}

/**
 * Az adószám.
 *
 * A `SpecifiedTaxRegistration` többször is szerepelhet (ÁFA-szám és belföldi
 * adószám), ezért a **`VA` sémájút** keressük elsőként — az igazolja az
 * ÁFA-alanyiságot.
 */
function adoszam(gyoker: Csomopont, fel: string): string | null {
  const felCsomopont = keres(gyoker, fel);
  if (felCsomopont === null) return null;

  const azonositok = keresOsszes(felCsomopont, 'SpecifiedTaxRegistration', 'ID');

  const afaSzam = azonositok.find((id) => id.attr['schemeID'] === 'VA');
  const valasztott = afaSzam ?? azonositok[0];

  const ertek = valasztott?.szoveg.trim() ?? '';
  return ertek === '' ? null : ertek;
}

/**
 * ÁFA-bontás az `ApplicableTradeTax` elemekből — a CII eleve **kulcsonként egy
 * elemet** ír elő, tehát itt nincs mit összevonni.
 */
function bontasSorok(gyoker: Csomopont): Record<string, unknown>[] {
  return keresOsszes(gyoker, 'ApplicableHeaderTradeSettlement', 'ApplicableTradeTax').map((elem) => ({
    kulcs: keresSzam(elem, 'RateApplicablePercent'),
    kategoria: keresSzoveg(elem, 'CategoryCode'),
    netto: keresSzam(elem, 'BasisAmount'),
    afa: keresSzam(elem, 'CalculatedAmount'),
  }));
}
