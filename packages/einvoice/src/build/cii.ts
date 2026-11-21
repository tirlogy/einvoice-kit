// SPDX-License-Identifier: MIT
import type { Address, AllowanceCharge, Identifier, Invoice, Line, Party, Period } from '../model';
import { document, E, EA, T, toCiiDate, type XNode } from '../xml';

const NS = {
  'xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
  'xmlns:ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
  'xmlns:qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
  'xmlns:udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
};

const dt = (name: string, iso: string | undefined) =>
  iso ? EA(name, {}, T('udt:DateTimeString', toCiiDate(iso), { format: '102' })) : undefined;

const idEl = (name: string, i: Identifier | undefined) => (i ? T(name, i.id, i.scheme ? { schemeID: i.scheme } : undefined) : undefined);

function address(a: Address | undefined): XNode | undefined {
  if (!a) return undefined;
  return E(
    'ram:PostalTradeAddress',
    T('ram:PostcodeCode', a.postcode),
    T('ram:LineOne', a.line1),
    T('ram:LineTwo', a.line2),
    T('ram:LineThree', a.line3),
    T('ram:CityName', a.city),
    T('ram:CountryID', a.country),
    T('ram:CountrySubDivisionName', a.countrySubdivision),
  );
}

function party(name: string, p: Party, seller: boolean): XNode | undefined {
  // identifiers with scheme go to GlobalID, others to ID
  return E(
    name,
    p.identifiers.filter((i) => !i.scheme).map((i) => T('ram:ID', i.id)),
    p.identifiers.filter((i) => i.scheme).map((i) => idEl('ram:GlobalID', i)),
    T('ram:Name', p.name),
    seller ? T('ram:Description', p.legalInfo) : undefined,
    E('ram:SpecifiedLegalOrganization', idEl('ram:ID', p.legalRegistrationId), T('ram:TradingBusinessName', p.tradingName)),
    p.contact &&
      E(
        'ram:DefinedTradeContact',
        T('ram:PersonName', p.contact.name),
        E('ram:TelephoneUniversalCommunication', T('ram:CompleteNumber', p.contact.phone)),
        E('ram:EmailURIUniversalCommunication', T('ram:URIID', p.contact.email)),
      ),
    address(p.address),
    E('ram:URIUniversalCommunication', idEl('ram:URIID', p.electronicAddress)),
    E('ram:SpecifiedTaxRegistration', T('ram:ID', p.vatId, { schemeID: 'VA' })),
    seller ? E('ram:SpecifiedTaxRegistration', T('ram:ID', p.taxNumber, { schemeID: 'FC' })) : undefined,
  );
}

const period = (p: Period | undefined) =>
  p ? E('ram:BillingSpecifiedPeriod', dt('ram:StartDateTime', p.start), dt('ram:EndDateTime', p.end)) : undefined;

function allowanceCharge(ac: AllowanceCharge, charge: boolean, withTax: boolean): XNode | undefined {
  return E(
    'ram:SpecifiedTradeAllowanceCharge',
    E('ram:ChargeIndicator', T('udt:Indicator', String(charge))),
    T('ram:CalculationPercent', ac.percentage),
    T('ram:BasisAmount', ac.baseAmount),
    T('ram:ActualAmount', ac.amount),
    T('ram:ReasonCode', ac.reasonCode),
    T('ram:Reason', ac.reason),
    withTax
      ? E(
          'ram:CategoryTradeTax',
          T('ram:TypeCode', 'VAT'),
          T('ram:CategoryCode', ac.vatCategory ?? 'S'),
          T('ram:RateApplicablePercent', ac.vatRate),
        )
      : undefined,
  );
}

function line(l: Line): XNode | undefined {
  const base = l.price.baseQuantity
    ? T('ram:BasisQuantity', l.price.baseQuantity, { unitCode: l.price.baseUnitCode ?? l.unitCode })
    : undefined;
  return E(
    'ram:IncludedSupplyChainTradeLineItem',
    E('ram:AssociatedDocumentLineDocument', T('ram:LineID', l.id), E('ram:IncludedNote', T('ram:Content', l.note))),
    E(
      'ram:SpecifiedTradeProduct',
      idEl('ram:GlobalID', l.item.standardId),
      T('ram:SellerAssignedID', l.item.sellerId),
      T('ram:BuyerAssignedID', l.item.buyerId),
      T('ram:Name', l.item.name),
      T('ram:Description', l.item.description),
      (l.item.attributes ?? []).map((a) =>
        E('ram:ApplicableProductCharacteristic', T('ram:Description', a.name), T('ram:Value', a.value)),
      ),
      (l.item.classifications ?? []).map((c) =>
        E('ram:DesignatedProductClassification', T('ram:ClassCode', c.code, { listID: c.listId, listVersionID: c.listVersion })),
      ),
      E('ram:OriginTradeCountry', T('ram:ID', l.item.originCountry)),
    ),
    E(
      'ram:SpecifiedLineTradeAgreement',
      E('ram:BuyerOrderReferencedDocument', T('ram:LineID', l.orderLineReference)),
      l.price.gross &&
        E(
          'ram:GrossPriceProductTradePrice',
          T('ram:ChargeAmount', l.price.gross),
          base,
          l.price.discount &&
            E(
              'ram:AppliedTradeAllowanceCharge',
              E('ram:ChargeIndicator', T('udt:Indicator', 'false')),
              T('ram:ActualAmount', l.price.discount),
            ),
        ),
      E('ram:NetPriceProductTradePrice', T('ram:ChargeAmount', l.price.net), base),
    ),
    E('ram:SpecifiedLineTradeDelivery', T('ram:BilledQuantity', l.quantity, { unitCode: l.unitCode })),
    E(
      'ram:SpecifiedLineTradeSettlement',
      E(
        'ram:ApplicableTradeTax',
        T('ram:TypeCode', 'VAT'),
        T('ram:CategoryCode', l.vat.category),
        T('ram:RateApplicablePercent', l.vat.rate),
      ),
      period(l.period),
      l.allowances.map((a) => allowanceCharge(a, false, false)),
      l.charges.map((c) => allowanceCharge(c, true, false)),
      E('ram:SpecifiedTradeSettlementLineMonetarySummation', T('ram:LineTotalAmount', l.netAmount)),
      l.objectId &&
        E(
          'ram:AdditionalReferencedDocument',
          T('ram:IssuerAssignedID', l.objectId.id),
          T('ram:TypeCode', '130'),
          T('ram:ReferenceTypeCode', l.objectId.scheme),
        ),
      E('ram:ReceivableSpecifiedTradeAccountingAccount', T('ram:ID', l.accountingReference)),
    ),
  );
}

/** Builds a UN/CEFACT CII D16B document (ZUGFeRD 2.x / Factur-X / XRechnung CII). */
export function buildCii(inv: Invoice): string {
  const cur = inv.currency;
  const pay = inv.payment;
  const headerAgreement = E(
    'ram:ApplicableHeaderTradeAgreement',
    T('ram:BuyerReference', inv.buyerReference),
    party('ram:SellerTradeParty', inv.seller, true),
    party('ram:BuyerTradeParty', inv.buyer, false),
    inv.taxRepresentative &&
      E(
        'ram:SellerTaxRepresentativeTradeParty',
        T('ram:Name', inv.taxRepresentative.name),
        address(inv.taxRepresentative.address),
        E('ram:SpecifiedTaxRegistration', T('ram:ID', inv.taxRepresentative.vatId, { schemeID: 'VA' })),
      ),
    E('ram:SellerOrderReferencedDocument', T('ram:IssuerAssignedID', inv.salesOrderReference)),
    E('ram:BuyerOrderReferencedDocument', T('ram:IssuerAssignedID', inv.purchaseOrderReference)),
    E('ram:ContractReferencedDocument', T('ram:IssuerAssignedID', inv.contractReference)),
    inv.attachments.map((a) =>
      E(
        'ram:AdditionalReferencedDocument',
        T('ram:IssuerAssignedID', a.id),
        T('ram:URIID', a.url),
        T('ram:TypeCode', '916'),
        T('ram:Name', a.description),
        T('ram:AttachmentBinaryObject', a.content, { mimeCode: a.mimeCode, filename: a.filename }),
      ),
    ),
    inv.tenderReference &&
      E('ram:AdditionalReferencedDocument', T('ram:IssuerAssignedID', inv.tenderReference), T('ram:TypeCode', '50')),
    inv.invoicedObjectId &&
      E(
        'ram:AdditionalReferencedDocument',
        T('ram:IssuerAssignedID', inv.invoicedObjectId.id),
        T('ram:TypeCode', '130'),
        T('ram:ReferenceTypeCode', inv.invoicedObjectId.scheme),
      ),
    inv.projectReference &&
      E('ram:SpecifiedProcuringProject', T('ram:ID', inv.projectReference), T('ram:Name', 'Project reference')),
  );

  const d = inv.delivery;
  const headerDelivery = {
    name: 'ram:ApplicableHeaderTradeDelivery',
    children: [
      d &&
        E(
          'ram:ShipToTradeParty',
          inv.delivery?.locationId?.scheme ? idEl('ram:GlobalID', d.locationId) : idEl('ram:ID', d.locationId),
          T('ram:Name', d.name),
          address(d.address),
        ),
      d?.date && E('ram:ActualDeliverySupplyChainEvent', dt('ram:OccurrenceDateTime', d.date)),
      E('ram:DespatchAdviceReferencedDocument', T('ram:IssuerAssignedID', inv.despatchAdviceReference)),
      E('ram:ReceivingAdviceReferencedDocument', T('ram:IssuerAssignedID', inv.receivingAdviceReference)),
    ].filter((x): x is XNode => !!x),
  } satisfies XNode; // must exist even when empty

  const means = pay
    ? (pay.creditTransfers.length ? pay.creditTransfers : [undefined]).map((ct, i) =>
        E(
          'ram:SpecifiedTradeSettlementPaymentMeans',
          T('ram:TypeCode', pay.meansCode),
          T('ram:Information', pay.meansText),
          i === 0 && pay.card
            ? E('ram:ApplicableTradeSettlementFinancialCard', T('ram:ID', pay.card.pan), T('ram:CardholderName', pay.card.holder))
            : undefined,
          i === 0 ? E('ram:PayerPartyDebtorFinancialAccount', T('ram:IBANID', pay.directDebit?.debitedAccount)) : undefined,
          ct &&
            E(
              'ram:PayeePartyCreditorFinancialAccount',
              /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(ct.iban.replace(/\s/g, '')) ? T('ram:IBANID', ct.iban.replace(/\s/g, '')) : T('ram:ProprietaryID', ct.iban),
              T('ram:AccountName', ct.name),
            ),
          ct && E('ram:PayeeSpecifiedCreditorFinancialInstitution', T('ram:BICID', ct.bic)),
        ),
      )
    : [];

  const taxes = inv.vatBreakdown.map((v, i) =>
    E(
      'ram:ApplicableTradeTax',
      T('ram:CalculatedAmount', v.taxAmount),
      T('ram:TypeCode', 'VAT'),
      T('ram:ExemptionReason', v.exemptionReason),
      T('ram:BasisAmount', v.taxableAmount),
      T('ram:CategoryCode', v.category),
      T('ram:ExemptionReasonCode', v.exemptionReasonCode),
      i === 0 && inv.taxPointDate ? E('ram:TaxPointDate', T('udt:DateString', toCiiDate(inv.taxPointDate), { format: '102' })) : undefined,
      i === 0 ? T('ram:DueDateTypeCode', inv.taxPointDateCode) : undefined,
      T('ram:RateApplicablePercent', v.rate),
    ),
  );

  const t = inv.totals;
  const settlement = E(
    'ram:ApplicableHeaderTradeSettlement',
    T('ram:CreditorReferenceID', pay?.directDebit?.creditorId),
    T('ram:PaymentReference', pay?.remittanceInfo),
    inv.taxCurrency && inv.taxCurrency !== cur ? T('ram:TaxCurrencyCode', inv.taxCurrency) : undefined,
    T('ram:InvoiceCurrencyCode', cur),
    inv.payee &&
      E(
        'ram:PayeeTradeParty',
        inv.payee.identifier?.scheme ? idEl('ram:GlobalID', inv.payee.identifier) : idEl('ram:ID', inv.payee.identifier),
        T('ram:Name', inv.payee.name),
        E('ram:SpecifiedLegalOrganization', idEl('ram:ID', inv.payee.legalRegistrationId)),
      ),
    means,
    taxes,
    inv.invoicingPeriod && period(inv.invoicingPeriod),
    inv.allowances.map((a) => allowanceCharge(a, false, true)),
    inv.charges.map((c) => allowanceCharge(c, true, true)),
    E(
      'ram:SpecifiedTradePaymentTerms',
      T('ram:Description', inv.paymentTerms),
      dt('ram:DueDateDateTime', inv.dueDate),
      T('ram:DirectDebitMandateID', pay?.directDebit?.mandateRef),
    ),
    E(
      'ram:SpecifiedTradeSettlementHeaderMonetarySummation',
      T('ram:LineTotalAmount', t.lineNet),
      T('ram:ChargeTotalAmount', t.charges),
      T('ram:AllowanceTotalAmount', t.allowances),
      T('ram:TaxBasisTotalAmount', t.taxExclusive),
      T('ram:TaxTotalAmount', t.tax ?? '0.00', { currencyID: cur }),
      inv.taxCurrency && inv.taxCurrency !== cur
        ? T('ram:TaxTotalAmount', t.taxInTaxCurrency, { currencyID: inv.taxCurrency })
        : undefined,
      T('ram:RoundingAmount', t.rounding),
      T('ram:GrandTotalAmount', t.taxInclusive),
      T('ram:TotalPrepaidAmount', t.prepaid),
      T('ram:DuePayableAmount', t.payable),
    ),
    inv.precedingInvoices.map((p) =>
      E(
        'ram:InvoiceReferencedDocument',
        T('ram:IssuerAssignedID', p.number),
        p.issueDate ? E('ram:FormattedIssueDateTime', T('qdt:DateTimeString', toCiiDate(p.issueDate), { format: '102' })) : undefined,
      ),
    ),
    E('ram:ReceivableSpecifiedTradeAccountingAccount', T('ram:ID', inv.buyerAccountingReference)),
  );

  const root = EA(
    'rsm:CrossIndustryInvoice',
    NS,
    E(
      'rsm:ExchangedDocumentContext',
      E('ram:BusinessProcessSpecifiedDocumentContextParameter', T('ram:ID', inv.businessProcess)),
      E('ram:GuidelineSpecifiedDocumentContextParameter', T('ram:ID', inv.specification)),
    ),
    E(
      'rsm:ExchangedDocument',
      T('ram:ID', inv.number),
      T('ram:TypeCode', inv.typeCode),
      dt('ram:IssueDateTime', inv.issueDate),
      inv.notes.map((n) => E('ram:IncludedNote', T('ram:Content', n.text), T('ram:SubjectCode', n.subjectCode))),
    ),
    E('rsm:SupplyChainTradeTransaction', inv.lines.map(line), headerAgreement, headerDelivery, settlement),
  )!;
  return document(root);
}
