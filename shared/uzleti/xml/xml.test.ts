import { describe, expect, test } from 'vitest';
import { xmltFelolvas, XmlHiba } from './parser.ts';
import { ertelmez, MAX_BAJT } from './xmlKiolvaso.ts';
import { tisztitBontas } from '../sema.ts';

function olvas(xml: string) {
  const doc = xmltFelolvas(xml, new TextEncoder().encode(xml).length);
  expect(doc).not.toBeNull();
  return ertelmez(doc!);
}

/**
 * UBL számla két ÁFA-kulccsal.
 *
 * Szándékosan tartalmaz két csapdát:
 *  - a `TaxTotal` alatt van egy fejléc `TaxAmount`, és **a `TaxSubtotal`-ok
 *    alatt is** — ha az utóbbit olvasnánk, az első kulcssor ÁFÁ-ja kerülne a
 *    bizonylat ÁFA-végösszegébe;
 *  - a `PaymentTerms` alatt is van egy `ID`, ami nem a bizonylatszám.
 */
const UBL = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>SZ-2026-0042</ID>
  <IssueDate>2026-03-14</IssueDate>
  <DueDate>2026-03-28</DueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>HUF</DocumentCurrencyCode>
  <PaymentTerms><ID>NEM-EZ-A-SZAMLASZAM</ID></PaymentTerms>
  <AccountingSupplierParty>
    <Party>
      <PartyName><Name>Példa Kft. (rövid)</Name></PartyName>
      <PartyLegalEntity><RegistrationName>Példa Kereskedelmi Korlátolt Felelősségű Társaság</RegistrationName></PartyLegalEntity>
      <PartyTaxScheme><CompanyID>10773381-2-44</CompanyID></PartyTaxScheme>
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyLegalEntity><RegistrationName>Vevő Zrt.</RegistrationName></PartyLegalEntity>
      <PartyTaxScheme><CompanyID>10537914-4-44</CompanyID></PartyTaxScheme>
    </Party>
  </AccountingCustomerParty>
  <Delivery><ActualDeliveryDate>2026-03-10</ActualDeliveryDate></Delivery>
  <PaymentMeans><PaymentMeansCode>30</PaymentMeansCode></PaymentMeans>
  <TaxTotal>
    <TaxAmount>1130.00</TaxAmount>
    <TaxSubtotal>
      <TaxableAmount>4000.00</TaxableAmount>
      <TaxAmount>1080.00</TaxAmount>
      <TaxCategory><ID>S</ID><Percent>27</Percent></TaxCategory>
    </TaxSubtotal>
    <TaxSubtotal>
      <TaxableAmount>1000.00</TaxableAmount>
      <TaxAmount>50.00</TaxAmount>
      <TaxCategory><ID>S</ID><Percent>5</Percent></TaxCategory>
    </TaxSubtotal>
  </TaxTotal>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount>5000.00</TaxExclusiveAmount>
    <TaxInclusiveAmount>6130.00</TaxInclusiveAmount>
    <PayableAmount>6130.00</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;

/**
 * CII (Factur-X / ZUGFeRD).
 *
 * A csapda itt: a **tételsor** (`IncludedSupplyChainTradeLineItem`) alatt is
 * van `TaxBasisTotalAmount` és `GrandTotalAmount` — ha nem a
 * fejléc-összesítőből olvasnánk, a tételsor összege kerülne a végösszegbe.
 * Pontosan ez a hiba fordult elő élesben a modellnél.
 */
const CII = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocument>
    <ram:ID>FX-2026-7</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20260314</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:SpecifiedTradeSettlementLineMonetarySummation>
        <ram:TaxBasisTotalAmount>999.00</ram:TaxBasisTotalAmount>
        <ram:GrandTotalAmount>999.00</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementLineMonetarySummation>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>Szállító Bt.</ram:Name>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">cégjegyzék-123</ram:ID></ram:SpecifiedTaxRegistration>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">10773381-2-44</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Vevő Kft.</ram:Name>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">10537914-4-44</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime><udt:DateTimeString format="102">20260310</udt:DateTimeString></ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>HUF</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>30</ram:TypeCode></ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>1080.00</ram:CalculatedAmount>
        <ram:BasisAmount>4000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>27</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>50.00</ram:CalculatedAmount>
        <ram:BasisAmount>1000.00</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>5</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime><udt:DateTimeString format="102">20260328</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>5000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount>1130.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>6130.00</ram:GrandTotalAmount>
        <ram:DuePayableAmount>6130.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

/**
 * NAV Online Számla 3.0, belföldi számla három ÁFA-sorral (27%, 5%, TAM).
 *
 * Négy csapdát tartalmaz szándékosan:
 *  - a `invoiceHead` alatt is van egy `invoiceNumber`, **a 2.0 előtti
 *    helyén** — a régi dokumentációk (és a netes példák jó része) még oda
 *    teszik. A bizonylatszám a gyökéré;
 *  - a `summaryByVatRate` alatt van `vatRateGrossData`, más értékkel, mint a
 *    bizonylat bruttója — a `summaryGrossData` a `summaryNormal`
 *    **testvére**, nem gyereke;
 *  - a tételsorok alatt is állnak összeg-elemek;
 *  - a `vatPercentage` **tört** (`0.27`), ahogy az XSD előírja.
 */
const NAV = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceData xmlns="http://schemas.nav.gov.hu/OSA/3.0/data" xmlns:base="http://schemas.nav.gov.hu/OSA/3.0/base">
  <invoiceNumber>NAV-2026-0042</invoiceNumber>
  <invoiceIssueDate>2026-03-14</invoiceIssueDate>
  <completenessIndicator>false</completenessIndicator>
  <invoiceMain>
    <invoice>
      <invoiceHead>
        <invoiceData><invoiceNumber>NEM-EZ-A-SZAMLASZAM</invoiceNumber></invoiceData>
        <supplierInfo>
          <supplierTaxNumber>
            <base:taxpayerId>12345676</base:taxpayerId>
            <base:vatCode>2</base:vatCode>
            <base:countyCode>41</base:countyCode>
          </supplierTaxNumber>
          <supplierName>Példa Kereskedelmi Kft.</supplierName>
        </supplierInfo>
        <customerInfo>
          <customerVatStatus>DOMESTIC</customerVatStatus>
          <customerVatData>
            <customerTaxNumber>
              <base:taxpayerId>24680132</base:taxpayerId>
              <base:vatCode>2</base:vatCode>
              <base:countyCode>02</base:countyCode>
            </customerTaxNumber>
          </customerVatData>
          <customerName>Vevő Zrt.</customerName>
        </customerInfo>
        <invoiceDetail>
          <invoiceCategory>NORMAL</invoiceCategory>
          <invoiceDeliveryDate>2026-03-10</invoiceDeliveryDate>
          <currencyCode>HUF</currencyCode>
          <exchangeRate>1</exchangeRate>
          <paymentMethod>TRANSFER</paymentMethod>
          <paymentDate>2026-03-28</paymentDate>
          <invoiceAppearance>ELECTRONIC</invoiceAppearance>
        </invoiceDetail>
      </invoiceHead>
      <invoiceLines>
        <mergedItemIndicator>false</mergedItemIndicator>
        <line>
          <lineNumber>1</lineNumber>
          <lineExpressionIndicator>true</lineExpressionIndicator>
          <lineDescription>Tanácsadás</lineDescription>
          <lineAmountsNormal>
            <lineNetAmountData><lineNetAmount>160000</lineNetAmount></lineNetAmountData>
            <lineVatRate><vatPercentage>0.27</vatPercentage></lineVatRate>
            <lineVatData><lineVatAmount>43200</lineVatAmount></lineVatData>
          </lineAmountsNormal>
        </line>
      </invoiceLines>
      <invoiceSummary>
        <summaryNormal>
          <summaryByVatRate>
            <vatRate><vatPercentage>0.27</vatPercentage></vatRate>
            <vatRateNetData><vatRateNetAmount>160000</vatRateNetAmount></vatRateNetData>
            <vatRateVatData><vatRateVatAmount>43200</vatRateVatAmount></vatRateVatData>
            <vatRateGrossData><vatRateGrossAmount>203200</vatRateGrossAmount></vatRateGrossData>
          </summaryByVatRate>
          <summaryByVatRate>
            <vatRate><vatPercentage>0.05</vatPercentage></vatRate>
            <vatRateNetData><vatRateNetAmount>100000</vatRateNetAmount></vatRateNetData>
            <vatRateVatData><vatRateVatAmount>5000</vatRateVatAmount></vatRateVatData>
            <vatRateGrossData><vatRateGrossAmount>105000</vatRateGrossAmount></vatRateGrossData>
          </summaryByVatRate>
          <summaryByVatRate>
            <vatRate>
              <vatExemption><case>TAM</case><reason>Mentes ÁFA tv. 85.§ (1) i)</reason></vatExemption>
            </vatRate>
            <vatRateNetData><vatRateNetAmount>40000</vatRateNetAmount></vatRateNetData>
            <vatRateVatData><vatRateVatAmount>0</vatRateVatAmount></vatRateVatData>
          </summaryByVatRate>
          <invoiceNetAmount>300000</invoiceNetAmount>
          <invoiceNetAmountHUF>300000</invoiceNetAmountHUF>
          <invoiceVatAmount>48200</invoiceVatAmount>
          <invoiceVatAmountHUF>48200</invoiceVatAmountHUF>
        </summaryNormal>
        <summaryGrossData>
          <invoiceGrossAmount>348200</invoiceGrossAmount>
          <invoiceGrossAmountHUF>348200</invoiceGrossAmountHUF>
        </summaryGrossData>
      </invoiceSummary>
    </invoice>
  </invoiceMain>
</InvoiceData>`;

/**
 * Prefixes gyökér, **alapértelmezett névtér nélkül** — a Java/JAXB alapú
 * magyar számlázók jellemző alakja.
 *
 * ⚠️ Mérve: a javítás előtt a `doc.nevterek` itt üres maradt volna, mert csak
 * az `xmlns` attribútumot olvastuk. Egy ilyen bizonylat felismeretlenül a
 * modellhez esett volna — pénzért, találgatva.
 */
const NAV_PREFIXES = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:InvoiceData xmlns:ns2="http://schemas.nav.gov.hu/OSA/3.0/data" xmlns:ns3="http://schemas.nav.gov.hu/OSA/3.0/base">
  <ns2:invoiceNumber>PRE-2026-0007</ns2:invoiceNumber>
  <ns2:invoiceIssueDate>2026-03-14</ns2:invoiceIssueDate>
  <ns2:invoiceMain>
    <ns2:invoice>
      <ns2:invoiceHead>
        <ns2:supplierInfo>
          <ns2:supplierTaxNumber>
            <ns3:taxpayerId>12345676</ns3:taxpayerId>
            <ns3:vatCode>2</ns3:vatCode>
            <ns3:countyCode>41</ns3:countyCode>
          </ns2:supplierTaxNumber>
          <ns2:supplierName>Prefixes Kft.</ns2:supplierName>
        </ns2:supplierInfo>
      </ns2:invoiceHead>
    </ns2:invoice>
  </ns2:invoiceMain>
</ns2:InvoiceData>`;

describe('UBL', () => {
  test('a mezők a helyükre kerülnek', () => {
    const e = olvas(UBL);

    expect(e?.nev).toBe('xml/ubl');
    const m = e!.nyers;
    expect(m['doc_type']).toBe('szamla');
    expect(m['doc_number']).toBe('SZ-2026-0042');
    expect(m['issue_date']).toBe('2026-03-14');
    expect(m['due_date']).toBe('2026-03-28');
    expect(m['fulfillment_date']).toBe('2026-03-10');
    expect(m['currency']).toBe('HUF');
    expect(m['payment_method']).toBe('átutalás');
    expect(m['customer_tax_number']).toBe('10537914-4-44');
  });

  /** A bejegyzett cégnév a pontosabb — a `PartyName` gyakran rövidített. */
  test('a bejegyzett cégnevet részesíti előnyben', () => {
    expect(olvas(UBL)!.nyers['supplier_name']).toBe(
      'Példa Kereskedelmi Korlátolt Felelősségű Társaság',
    );
  });

  /**
   * ⚠️ A `TaxTotal` alatt a fejléc ÁFA-összesen áll, a `TaxSubtotal`-ok alatt
   * viszont soronkénti értékek. Egy leszármazott-keresés az első kulcssor
   * ÁFÁ-ját (1080) írná a végösszegbe 1130 helyett.
   */
  test('az ÁFA-végösszeg a fejlécé, nem az első kulcssoré', () => {
    const m = olvas(UBL)!.nyers;
    expect(m['vat_amount']).toBe(1130);
    expect(m['net_amount']).toBe(5000);
    expect(m['gross_amount']).toBe(6130);
  });

  /** A `PaymentTerms` alatti `ID` nem a bizonylatszám. */
  test('a bizonylatszám a gyökér közvetlen gyereke', () => {
    expect(olvas(UBL)!.nyers['doc_number']).not.toBe('NEM-EZ-A-SZAMLASZAM');
  });

  test('mindkét ÁFA-kulcs sora megvan', () => {
    const bontas = olvas(UBL)!.nyers['afa_bontas'] as Record<string, unknown>[];

    expect(bontas).toHaveLength(2);
    expect(bontas[0]).toEqual({ kulcs: 27, kategoria: 'S', netto: 4000, afa: 1080 });
    expect(bontas[1]).toEqual({ kulcs: 5, kategoria: 'S', netto: 1000, afa: 50 });
  });

  /**
   * A puszta „Invoice" gyökérnév túl gyakori: egy házi XML is hívhatja így a
   * gyökerét. A névtér az, ami valóban UBL-nek minősíti.
   */
  test('névtér nélkül nem UBL', () => {
    const idegen = '<Invoice><ID>X</ID></Invoice>';
    expect(olvas(idegen)).toBeNull();
  });

  test('a CreditNote sztornó, típuskód nélkül is', () => {
    const cn = UBL.replace('<Invoice xmlns=', '<CreditNote xmlns=')
      .replace('</Invoice>', '</CreditNote>')
      .replace('<InvoiceTypeCode>380</InvoiceTypeCode>', '');

    expect(olvas(cn)!.nyers['doc_type']).toBe('sztorno_szamla');
  });
});

describe('CII', () => {
  test('a mezők a helyükre kerülnek', () => {
    const e = olvas(CII);

    expect(e?.nev).toBe('xml/cii');
    const m = e!.nyers;
    expect(m['doc_type']).toBe('szamla');
    expect(m['doc_number']).toBe('FX-2026-7');
    expect(m['supplier_name']).toBe('Szállító Bt.');
    expect(m['customer_name']).toBe('Vevő Kft.');
    expect(m['currency']).toBe('HUF');
    expect(m['payment_method']).toBe('átutalás');
  });

  /** A CII a `102`-es formátumot használja: `20260314`. */
  test('a nyolcjegyű dátumot értelmezi', () => {
    const m = olvas(CII)!.nyers;
    expect(m['issue_date']).toBe('2026-03-14');
    expect(m['due_date']).toBe('2026-03-28');
    expect(m['fulfillment_date']).toBe('2026-03-10');
  });

  /**
   * ⚠️ A tételsor alatt is van `TaxBasisTotalAmount` és `GrandTotalAmount`.
   * A fejléc-összesítőből kell olvasni — különben a tételsor összege kerül a
   * végösszegbe, és pontosan ez a hiba fordult elő élesben a modellnél.
   */
  test('az összegek a fejléc-összesítőből jönnek, nem a tételsorból', () => {
    const m = olvas(CII)!.nyers;

    expect(m['net_amount']).toBe(5000);
    expect(m['net_amount']).not.toBe(999);
    expect(m['vat_amount']).toBe(1130);
    expect(m['gross_amount']).toBe(6130);
    expect(m['fizetendo']).toBe(6130);
  });

  /**
   * A `SpecifiedTaxRegistration` többször is szerepelhet: a `VA` sémájú az
   * ÁFA-szám, a többi (pl. cégjegyzékszám) nem az.
   */
  test('a VA sémájú adószámot választja, nem a cégjegyzékszámot', () => {
    expect(olvas(CII)!.nyers['supplier_tax_number']).toBe('10773381-2-44');
  });

  test('mindkét ÁFA-kulcs sora megvan', () => {
    const bontas = olvas(CII)!.nyers['afa_bontas'] as Record<string, unknown>[];

    expect(bontas).toHaveLength(2);
    expect(bontas[0]).toEqual({ kulcs: 27, kategoria: 'S', netto: 4000, afa: 1080 });
    expect(bontas[1]).toEqual({ kulcs: 5, kategoria: 'S', netto: 1000, afa: 50 });
  });

  test('a ZUGFeRD 1.0 gyökérnevét is felismeri', () => {
    const zugferd = CII.replace(/CrossIndustryInvoice/g, 'CrossIndustryDocument');
    expect(olvas(zugferd)?.nev).toBe('xml/cii');
  });
});

describe('NAV Online Számla', () => {
  test('a mezők a helyükre kerülnek', () => {
    const e = olvas(NAV);

    expect(e?.nev).toBe('xml/nav');
    expect(e?.nyers).toMatchObject({
      doc_type: 'szamla',
      supplier_name: 'Példa Kereskedelmi Kft.',
      supplier_tax_number: '12345676-2-41',
      customer_name: 'Vevő Zrt.',
      customer_tax_number: '24680132-2-02',
      doc_number: 'NAV-2026-0042',
      issue_date: '2026-03-14',
      fulfillment_date: '2026-03-10',
      due_date: '2026-03-28',
      payment_method: 'átutalás',
      currency: 'HUF',
      net_amount: 300000,
      vat_amount: 48200,
      gross_amount: 348200,
      // A NAV nem ismer a bruttótól eltérő fizetendő összeget.
      fizetendo: null,
    });
  });

  /**
   * ⚠️ A 2.0-s séma emelte a bizonylatszámot és a keltet a gyökérre. A régi
   * helyükön (`invoiceHead/invoiceData`) még találgatnak a netes példák — a
   * fixtúra oda tesz egy csapdát.
   */
  test('a bizonylatszám a gyökérről jön, nem a régi helyéről', () => {
    expect(olvas(NAV)?.nyers['doc_number']).toBe('NAV-2026-0042');
  });

  /**
   * ⚠️ A `summaryGrossData` a `summaryNormal` **testvére**, nem gyereke. Egy
   * leszármazott-keresés a `summaryByVatRate/vatRateGrossData` alá csúszna, és
   * az első kulcssor bruttóját (203 200) írná a bizonylat végösszegébe.
   */
  test('a bruttó a bizonylat összesítőjéből jön, nem egy kulcssoréból', () => {
    expect(olvas(NAV)?.nyers['gross_amount']).toBe(348200);
  });

  /**
   * ⚠️ A NAV `vatPercentage`-e **tört**: az XSD `maxInclusive="1"`, vagyis
   * `0.27` — a `27` séma szerint érvénytelen. Szorzás nélkül 27 százalékból
   * csendben 27 forint lenne. A kerekítés sem elhagyható: `0.27 * 100` a
   * JavaScriptben `27.000000000000004`.
   */
  test('a törtből százalék lesz, lebegőpontos szemét nélkül', () => {
    const bontas = olvas(NAV)!.nyers['afa_bontas'] as Record<string, unknown>[];

    expect(bontas[0]).toEqual({ kulcs: 27, kategoria: 'S', netto: 160000, afa: 43200 });
    expect(bontas[1]).toEqual({ kulcs: 5, kategoria: 'S', netto: 100000, afa: 5000 });
  });

  /**
   * ⚠️ A mentes soron nincs százalék. Ha `null` kulcsot adnánk, a
   * `tisztitBontas()` **eldobná a sort** — egy alanyi mentes számla egész
   * ÁFA-bontása csendben eltűnne. A nulla kulcs nálunk elsőrangú fogalom,
   * saját export-oszloppal.
   */
  test('a mentes sor nulla kulccsal marad bent, nem esik ki', () => {
    const bontas = olvas(NAV)!.nyers['afa_bontas'] as Record<string, unknown>[];

    expect(bontas).toHaveLength(3);
    expect(bontas[2]).toEqual({ kulcs: 0, kategoria: 'E', netto: 40000, afa: 0 });

    // És a tisztítás tényleg átengedi — ez a sor a lényeg.
    expect(tisztitBontas(bontas)).toHaveLength(3);
  });

  test('a három darabból összerakott adószám a mi alakunkban jön ki', () => {
    expect(olvas(NAV)?.nyers['supplier_tax_number']).toBe('12345676-2-41');
  });

  test('a közösségi adószám a belföldi helyett is jó', () => {
    const kozossegi = NAV.replace(
      /<customerTaxNumber>[\s\S]*?<\/customerTaxNumber>/,
      '<communityVatNumber>ATU12345678</communityVatNumber>',
    );

    expect(olvas(kozossegi)?.nyers['customer_tax_number']).toBe('ATU12345678');
  });

  /**
   * A magánszemély vevő neve 3.0 óta **nem is szerepelhet** a bizonylaton —
   * a hiányzó név itt nem hiba, és nem is kap magabiztossági pontot.
   */
  test('a névtelen vevő nem baj', () => {
    const maganszemely = NAV.replace('<customerName>Vevő Zrt.</customerName>', '');
    const e = olvas(maganszemely);

    expect(e?.nyers['customer_name']).toBeNull();
    expect(e?.nyers['confidence']).not.toHaveProperty('customer_name');
  });

  /**
   * ⚠️ Az `invoiceOperation` (CREATE / MODIFY / STORNO) **nincs a számla
   * XML-jében**, csak a NAV-nak küldött kérés borítékában. Sztornót és
   * részleges helyesbítést ebből a fájlból nem lehet megkülönböztetni, ezért
   * a pontos gyűjtőfogalmat adjuk: egy helyesbítést sztornónak minősíteni
   * **egy egész számlát érvénytelenítene**.
   */
  test('az invoiceReference helyesbítővé teszi, és a mínusz túléli', () => {
    const helyesbito = NAV.replace(
      '<invoiceHead>',
      `<invoiceReference>
         <originalInvoiceNumber>NAV-2026-0041</originalInvoiceNumber>
         <modifyWithoutMaster>false</modifyWithoutMaster>
         <modificationIndex>1</modificationIndex>
       </invoiceReference>
       <invoiceHead>`,
    )
      .replace('<invoiceNetAmount>300000</invoiceNetAmount>', '<invoiceNetAmount>-300000</invoiceNetAmount>')
      .replace('<invoiceVatAmount>48200</invoiceVatAmount>', '<invoiceVatAmount>-48200</invoiceVatAmount>')
      .replace('<invoiceGrossAmount>348200</invoiceGrossAmount>', '<invoiceGrossAmount>-348200</invoiceGrossAmount>');

    const e = olvas(helyesbito);

    expect(e?.nyers['doc_type']).toBe('helyesbito_szamla');
    // A helyesbítő okirat **különbözetet** ír, nem új végösszeget — és a
    // különbözet a könyvelendő tétel. Előjelet nem módosítunk.
    expect(e?.nyers['net_amount']).toBe(-300000);
    expect(e?.nyers['vat_amount']).toBe(-48200);
    expect(e?.nyers['gross_amount']).toBe(-348200);
  });

  /**
   * ⚠️ A `vatAmountMismatch` **saját `vatRate` gyereket** tartalmaz, tehát a
   * fában `vatRate/vatAmountMismatch/vatRate` áll. Egy rekurzív keresés a
   * szülőt és a gyereket is megtalálná.
   */
  test('a vatAmountMismatch beágyazott kulcsa nem zavar össze', () => {
    const elteres = NAV.replace(
      '<vatRate><vatPercentage>0.27</vatPercentage></vatRate>\n            <vatRateNetData><vatRateNetAmount>160000</vatRateNetAmount></vatRateNetData>',
      '<vatRate><vatAmountMismatch><vatRate>0.27</vatRate><case>AAM</case></vatAmountMismatch></vatRate>\n            <vatRateNetData><vatRateNetAmount>160000</vatRateNetAmount></vatRateNetData>',
    );

    const bontas = olvas(elteres)!.nyers['afa_bontas'] as Record<string, unknown>[];
    expect(bontas[0]).toEqual({ kulcs: 27, kategoria: 'S', netto: 160000, afa: 43200 });
  });

  /**
   * ⚠️ A `summaryGrossData` elhagyható. Kézenfekvő volna kiszámolni nettó +
   * ÁFÁ-ból — **nem tesszük**: a „nettó + ÁFA = bruttó" validátorunk ettől
   * soha többé nem bukhatna meg, vagyis egy mérőeszközt cserélnénk
   * tautológiára. Üresen a `gross_amount` kulcsmező hiányzik, tehát a
   * bizonylat emberhez megy — pontosan a helyes viselkedés.
   */
  test('a hiányzó bruttót nem számoljuk ki', () => {
    const bruttoNelkul = NAV.replace(/<summaryGrossData>[\s\S]*?<\/summaryGrossData>/, '');
    const e = olvas(bruttoNelkul);

    expect(e?.nyers['gross_amount']).toBeNull();
    expect(e?.nyers['net_amount']).toBe(300000);
    expect(e?.nyers['confidence']).not.toHaveProperty('gross_amount');
  });

  /**
   * Az egyszerűsített számlán **se nettó, se ÁFA nincs sehol** a
   * dokumentumban — csak bruttó és `vatContent`, ami a bruttóra vetített
   * adótartalom (0,2126), nem ÁFA-kulcs. Nem nevezzük annak, és nem is
   * osztunk vissza belőle.
   */
  test('az egyszerűsített számlából a bruttó jön ki, nettó és ÁFA nélkül', () => {
    const egyszerusitett = NAV.replace(
      /<summaryNormal>[\s\S]*?<\/summaryNormal>/,
      `<summarySimplified>
         <vatRate><vatContent>0.2126</vatContent></vatRate>
         <vatContentGrossAmount>348200</vatContentGrossAmount>
       </summarySimplified>`,
    ).replace('<invoiceCategory>NORMAL</invoiceCategory>', '<invoiceCategory>SIMPLIFIED</invoiceCategory>');

    const e = olvas(egyszerusitett);

    expect(e?.nyers['gross_amount']).toBe(348200);
    expect(e?.nyers['net_amount']).toBeNull();
    expect(e?.nyers['vat_amount']).toBeNull();
    expect(e?.nyers['afa_bontas']).toEqual([]);
  });

  test('egy számla nem gyanús', () => {
    expect(olvas(NAV)?.nyers['tobb_irat_gyanu']).toBe(false);
  });

  /**
   * A NAV háromféleképpen tesz több számlát egy fájlba. A lánc egy fájl = egy
   * bizonylat, ezért az elsőt olvassuk ki, és a zászló viszi emberhez: a
   * `kapuk.ts` kizárja az automatikus jóváhagyást, az Ellenőrzés képernyő
   * pedig ki is írja, hogy az adatok az elsőre vonatkoznak.
   */
  test('a kötegelt okirat több bizonylata gyanút kelt', () => {
    const koteg = NAV.replace(
      '<invoiceMain>',
      '<invoiceMain><batchInvoice><batchIndex>1</batchIndex>',
    ).replace(
      '</invoiceMain>',
      `</batchInvoice>
       <batchInvoice><batchIndex>2</batchIndex><invoice/></batchInvoice>
     </invoiceMain>`,
    );

    const e = olvas(koteg);

    expect(e?.nyers['tobb_irat_gyanu']).toBe(true);
    // Az első számla adatai attól még kijönnek.
    expect(e?.nyers['doc_number']).toBe('NAV-2026-0042');
    expect(e?.nyers['gross_amount']).toBe(348200);
  });

  test('az Invoices gyökerű export több számlája is gyanút kelt', () => {
    const torzs = NAV.replace(/^[\s\S]*?<InvoiceData[^>]*>/, '').replace('</InvoiceData>', '');
    const tobb = `<?xml version="1.0" encoding="UTF-8"?>
<Invoices xmlns="http://schemas.nav.gov.hu/OSA/3.0/data" xmlns:base="http://schemas.nav.gov.hu/OSA/3.0/base">
  <invoice>${torzs}</invoice>
  <invoice>${torzs}</invoice>
</Invoices>`;

    const e = olvas(tobb);

    expect(e?.nev).toBe('xml/nav');
    expect(e?.nyers['tobb_irat_gyanu']).toBe(true);
    expect(e?.nyers['doc_number']).toBe('NAV-2026-0042');
  });

  test('a prefixes gyökeret is felismeri', () => {
    const e = olvas(NAV_PREFIXES);

    expect(e?.nev).toBe('xml/nav');
    expect(e?.nyers['doc_number']).toBe('PRE-2026-0007');
    expect(e?.nyers['supplier_tax_number']).toBe('12345676-2-41');
  });

  test('a NAV-enumból magyar fizetési mód lesz, az ismeretlen kód önmaga marad', () => {
    expect(olvas(NAV)?.nyers['payment_method']).toBe('átutalás');

    const ismeretlen = NAV.replace('<paymentMethod>TRANSFER</paymentMethod>', '<paymentMethod>BARTER</paymentMethod>');
    expect(olvas(ismeretlen)?.nyers['payment_method']).toBe('BARTER');
  });

  test('névtér nélkül nem NAV', () => {
    const nevterNelkul = NAV.replace(
      '<InvoiceData xmlns="http://schemas.nav.gov.hu/OSA/3.0/data" xmlns:base="http://schemas.nav.gov.hu/OSA/3.0/base">',
      '<InvoiceData>',
    );

    // Nem hiba: megy a modellhez, ahogy minden fel nem ismert alak.
    expect(olvas(nevterNelkul)).toBeNull();
  });
});

describe('a strukturált adat magabiztossága', () => {
  /**
   * A strukturált adat nem találgatás: a szállító gépe írta, nem egy modell
   * olvasta le egy fényképről. A validátorok ettől még lehúzhatják.
   */
  test('a kitöltött mezők 1.0-t kapnak, a hiányzók semmit', () => {
    const k = olvas(UBL)!.nyers['confidence'] as Record<string, number>;

    expect(k['supplier_name']).toBe(1);
    expect(k['net_amount']).toBe(1);
    expect(k['afa_bontas']).toBe(1);

    // Amit a bizonylat nem tartalmaz, arra nem adunk pontszámot: a hiányzó
    // mező más állapot, mint a magabiztosan kiolvasott.
    const vevoNelkul = UBL.replace(
      '<PartyTaxScheme><CompanyID>10537914-4-44</CompanyID></PartyTaxScheme>',
      '',
    );
    const k2 = olvas(vevoNelkul)!.nyers['confidence'] as Record<string, number>;

    expect(k2).not.toHaveProperty('customer_tax_number');
    expect(k2['customer_name']).toBe(1);
  });

  test('a zászlók hamisak: nincs mit félreolvasni', () => {
    const m = olvas(CII)!.nyers;
    expect(m['tobb_irat_gyanu']).toBe(false);
    expect(m['nehezen_olvashato']).toBe(false);
  });
});

describe('biztonság', () => {
  /**
   * ⚠️ Külső entitást csak `<!DOCTYPE>`-ban lehet deklarálni. Ha a
   * doctype-os fájlt eleve eldobjuk, az XXE-támadások egész osztálya kiesik —
   * és nem kell bíznunk abban, hogy a parser jól van beállítva.
   */
  test('a doctype-os XML-t eldobja, még értelmezés előtt', () => {
    const xxe = `<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>&xxe;</ID></Invoice>`;

    expect(() => xmltFelolvas(xxe, xxe.length)).toThrow(XmlHiba);
  });

  test('a kisbetűs doctype sem csúszik át', () => {
    const xxe = '<!doctype foo><Invoice/>';
    expect(() => xmltFelolvas(xxe, xxe.length)).toThrow(XmlHiba);
  });

  test('a méretkorlát fölötti fájlt eldobja', () => {
    expect(() => xmltFelolvas('<Invoice/>', MAX_BAJT + 1)).toThrow(XmlHiba);
  });

  /** A szabványos entitások viszont mennek: saját entitást deklarálni nincs hol. */
  test('a szabványos entitást feloldja', () => {
    const xml = UBL.replace('Szállító Bt.', 'X').replace(
      '<PartyLegalEntity><RegistrationName>Példa Kereskedelmi Korlátolt Felelősségű Társaság</RegistrationName></PartyLegalEntity>',
      '<PartyLegalEntity><RegistrationName>Kovács &amp; Társa Kft.</RegistrationName></PartyLegalEntity>',
    );

    expect(olvas(xml)!.nyers['supplier_name']).toBe('Kovács & Társa Kft.');
  });

  test('az üres tartalom nem dob hibát, csak nincs mit értelmezni', () => {
    expect(xmltFelolvas('', 0)).toBeNull();
  });
});
