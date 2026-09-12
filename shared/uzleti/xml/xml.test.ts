import { describe, expect, test } from 'vitest';
import { xmltFelolvas, XmlHiba } from './parser.ts';
import { ertelmez, MAX_BAJT } from './xmlKiolvaso.ts';

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
