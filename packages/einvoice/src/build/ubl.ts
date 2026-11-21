// SPDX-License-Identifier: MIT
import { isCreditNote, type Address, type AllowanceCharge, type Identifier, type Invoice, type Line, type Party } from '../model';
import { document, E, EA, T, type XNode } from '../xml';

const CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

const idEl = (name: string, i: Identifier | undefined) => (i ? T(name, i.id, i.scheme ? { schemeID: i.scheme } : undefined) : undefined);

function address(name: string, a: Address | undefined): XNode | undefined {
  if (!a) return undefined;
  return E(
    name,
    T('cbc:StreetName', a.line1),
    T('cbc:AdditionalStreetName', a.line2),
    T('cbc:CityName', a.city),
    T('cbc:PostalZone', a.postcode),
    T('cbc:CountrySubentity', a.countrySubdivision),
    E('cac:AddressLine', T('cbc:Line', a.line3)),
    E('cac:Country', T('cbc:IdentificationCode', a.country)),
  );
}

function party(p: Party, seller: boolean, creditorId?: string): XNode | undefined {
  return E(
    'cac:Party',
    idEl('cbc:EndpointID', p.electronicAddress),
    p.identifiers.map((i) => E('cac:PartyIdentification', idEl('cbc:ID', i))),
    creditorId ? E('cac:PartyIdentification', T('cbc:ID', creditorId, { schemeID: 'SEPA' })) : undefined,
    E('cac:PartyName', T('cbc:Name', p.tradingName)),
    address('cac:PostalAddress', p.address),
    p.vatId ? E('cac:PartyTaxScheme', T('cbc:CompanyID', p.vatId), E('cac:TaxScheme', T('cbc:ID', 'VAT'))) : undefined,
    seller && p.taxNumber
      ? E('cac:PartyTaxScheme', T('cbc:CompanyID', p.taxNumber), E('cac:TaxScheme', T('cbc:ID', 'FC')))
      : undefined,
    E(
      'cac:PartyLegalEntity',
      T('cbc:RegistrationName', p.name),
      idEl('cbc:CompanyID', p.legalRegistrationId),
      seller ? T('cbc:CompanyLegalForm', p.legalInfo) : undefined,
    ),
    p.contact &&
      E('cac:Contact', T('cbc:Name', p.contact.name), T('cbc:Telephone', p.contact.phone), T('cbc:ElectronicMail', p.contact.email)),
  );
}

const money = (name: string, value: string | undefined, cur: string) => T(name, value, { currencyID: cur });

function allowanceCharge(ac: AllowanceCharge, charge: boolean, cur: string, withTax: boolean): XNode | undefined {
  return E(
    'cac:AllowanceCharge',
    T('cbc:ChargeIndicator', String(charge)),
    T('cbc:AllowanceChargeReasonCode', ac.reasonCode),
    T('cbc:AllowanceChargeReason', ac.reason),
    T('cbc:MultiplierFactorNumeric', ac.percentage),
    money('cbc:Amount', ac.amount, cur),
    money('cbc:BaseAmount', ac.baseAmount, cur),
    withTax
      ? E('cac:TaxCategory', T('cbc:ID', ac.vatCategory ?? 'S'), T('cbc:Percent', ac.vatRate), E('cac:TaxScheme', T('cbc:ID', 'VAT')))
      : undefined,
  );
}

function line(l: Line, cur: string, credit: boolean): XNode | undefined {
  return E(
    credit ? 'cac:CreditNoteLine' : 'cac:InvoiceLine',
    T('cbc:ID', l.id),
    T('cbc:Note', l.note),
    T(credit ? 'cbc:CreditedQuantity' : 'cbc:InvoicedQuantity', l.quantity, { unitCode: l.unitCode }),
    money('cbc:LineExtensionAmount', l.netAmount, cur),
    T('cbc:AccountingCost', l.accountingReference),
    l.period && E('cac:InvoicePeriod', T('cbc:StartDate', l.period.start), T('cbc:EndDate', l.period.end)),
    E('cac:OrderLineReference', T('cbc:LineID', l.orderLineReference)),
    l.objectId && E('cac:DocumentReference', idEl('cbc:ID', l.objectId), T('cbc:DocumentTypeCode', '130')),
    l.allowances.map((a) => allowanceCharge(a, false, cur, false)),
    l.charges.map((c) => allowanceCharge(c, true, cur, false)),
    E(
      'cac:Item',
      T('cbc:Description', l.item.description),
      T('cbc:Name', l.item.name),
      E('cac:BuyersItemIdentification', T('cbc:ID', l.item.buyerId)),
      E('cac:SellersItemIdentification', T('cbc:ID', l.item.sellerId)),
      E('cac:StandardItemIdentification', idEl('cbc:ID', l.item.standardId)),
      E('cac:OriginCountry', T('cbc:IdentificationCode', l.item.originCountry)),
      (l.item.classifications ?? []).map((c) =>
        E('cac:CommodityClassification', T('cbc:ItemClassificationCode', c.code, { listID: c.listId, listVersionID: c.listVersion })),
      ),
      E('cac:ClassifiedTaxCategory', T('cbc:ID', l.vat.category), T('cbc:Percent', l.vat.rate), E('cac:TaxScheme', T('cbc:ID', 'VAT'))),
      (l.item.attributes ?? []).map((a) => E('cac:AdditionalItemProperty', T('cbc:Name', a.name), T('cbc:Value', a.value))),
    ),
    E(
      'cac:Price',
      money('cbc:PriceAmount', l.price.net, cur),
      l.price.baseQuantity ? T('cbc:BaseQuantity', l.price.baseQuantity, { unitCode: l.price.baseUnitCode ?? l.unitCode }) : undefined,
      l.price.gross || l.price.discount
        ? E(
            'cac:AllowanceCharge',
            T('cbc:ChargeIndicator', 'false'),
            money('cbc:Amount', l.price.discount ?? '0.00', cur),
            money('cbc:BaseAmount', l.price.gross, cur),
          )
        : undefined,
    ),
  );
}

/** Builds an OASIS UBL 2.1 Invoice, or a CreditNote for credit note type codes. */
export function buildUbl(inv: Invoice): string {
  const cur = inv.currency;
  const credit = isCreditNote(inv.typeCode);
  const pay = inv.payment;
  const d = inv.delivery;
  const t = inv.totals;
  const taxCur = inv.taxCurrency && inv.taxCurrency !== cur ? inv.taxCurrency : undefined;

  const docRefs = [
    inv.attachments.map((a) =>
      E(
        'cac:AdditionalDocumentReference',
        T('cbc:ID', a.id),
        T('cbc:DocumentDescription', a.description),
        E(
          'cac:Attachment',
          T('cbc:EmbeddedDocumentBinaryObject', a.content, { mimeCode: a.mimeCode, filename: a.filename }),
          E('cac:ExternalReference', T('cbc:URI', a.url)),
        ),
      ),
    ),
    inv.invoicedObjectId &&
      E('cac:AdditionalDocumentReference', idEl('cbc:ID', inv.invoicedObjectId), T('cbc:DocumentTypeCode', '130')),
    credit && inv.projectReference
      ? E('cac:AdditionalDocumentReference', T('cbc:ID', inv.projectReference), T('cbc:DocumentTypeCode', '50'))
      : undefined,
  ];
  const originator = E('cac:OriginatorDocumentReference', T('cbc:ID', inv.tenderReference));

  const means = pay
    ? (pay.creditTransfers.length ? pay.creditTransfers : [undefined]).map((ct, i) =>
        E(
          'cac:PaymentMeans',
          T('cbc:PaymentMeansCode', pay.meansCode, pay.meansText ? { name: pay.meansText } : undefined),
          credit && i === 0 ? T('cbc:PaymentDueDate', inv.dueDate) : undefined,
          T('cbc:PaymentID', pay.remittanceInfo),
          i === 0 && pay.card
            ? E('cac:CardAccount', T('cbc:PrimaryAccountNumberID', pay.card.pan), T('cbc:NetworkID', 'NA'), T('cbc:HolderName', pay.card.holder))
            : undefined,
          ct &&
            E(
              'cac:PayeeFinancialAccount',
              T('cbc:ID', ct.iban.replace(/\s/g, '')),
              T('cbc:Name', ct.name),
              E('cac:FinancialInstitutionBranch', T('cbc:ID', ct.bic)),
            ),
          i === 0 && pay.directDebit
            ? E(
                'cac:PaymentMandate',
                T('cbc:ID', pay.directDebit.mandateRef),
                E('cac:PayerFinancialAccount', T('cbc:ID', pay.directDebit.debitedAccount)),
              )
            : undefined,
        ),
      )
    : [];

  const root = EA(
    credit ? 'CreditNote' : 'Invoice',
    {
      xmlns: `urn:oasis:names:specification:ubl:schema:xsd:${credit ? 'CreditNote' : 'Invoice'}-2`,
      'xmlns:cac': CAC,
      'xmlns:cbc': CBC,
    },
    T('cbc:CustomizationID', inv.specification),
    T('cbc:ProfileID', inv.businessProcess),
    T('cbc:ID', inv.number),
    T('cbc:IssueDate', inv.issueDate),
    credit ? undefined : T('cbc:DueDate', inv.dueDate),
    T(credit ? 'cbc:CreditNoteTypeCode' : 'cbc:InvoiceTypeCode', inv.typeCode),
    inv.notes.map((n) => T('cbc:Note', n.subjectCode ? `#${n.subjectCode}#${n.text}` : n.text)),
    T('cbc:TaxPointDate', inv.taxPointDate),
    T('cbc:DocumentCurrencyCode', cur),
    T('cbc:TaxCurrencyCode', taxCur),
    T('cbc:AccountingCost', inv.buyerAccountingReference),
    T('cbc:BuyerReference', inv.buyerReference),
    inv.invoicingPeriod || inv.taxPointDateCode
      ? E(
          'cac:InvoicePeriod',
          T('cbc:StartDate', inv.invoicingPeriod?.start),
          T('cbc:EndDate', inv.invoicingPeriod?.end),
          T('cbc:DescriptionCode', inv.taxPointDateCode),
        )
      : undefined,
    inv.purchaseOrderReference || inv.salesOrderReference
      ? E('cac:OrderReference', T('cbc:ID', inv.purchaseOrderReference ?? 'NA'), T('cbc:SalesOrderID', inv.salesOrderReference))
      : undefined,
    inv.precedingInvoices.map((p) =>
      E('cac:BillingReference', E('cac:InvoiceDocumentReference', T('cbc:ID', p.number), T('cbc:IssueDate', p.issueDate))),
    ),
    E('cac:DespatchDocumentReference', T('cbc:ID', inv.despatchAdviceReference)),
    E('cac:ReceiptDocumentReference', T('cbc:ID', inv.receivingAdviceReference)),
    // UBL Invoice: Originator before Contract/Additional; CreditNote: after Additional
    credit ? undefined : originator,
    E('cac:ContractDocumentReference', T('cbc:ID', inv.contractReference)),
    docRefs,
    credit ? originator : undefined,
    credit ? undefined : E('cac:ProjectReference', T('cbc:ID', inv.projectReference)),
    E('cac:AccountingSupplierParty', party(inv.seller, true, pay?.directDebit?.creditorId)),
    E('cac:AccountingCustomerParty', party(inv.buyer, false)),
    inv.payee &&
      E(
        'cac:PayeeParty',
        E('cac:PartyIdentification', idEl('cbc:ID', inv.payee.identifier)),
        E('cac:PartyName', T('cbc:Name', inv.payee.name)),
        E('cac:PartyLegalEntity', idEl('cbc:CompanyID', inv.payee.legalRegistrationId)),
      ),
    inv.taxRepresentative &&
      E(
        'cac:TaxRepresentativeParty',
        E('cac:PartyName', T('cbc:Name', inv.taxRepresentative.name)),
        address('cac:PostalAddress', inv.taxRepresentative.address),
        E('cac:PartyTaxScheme', T('cbc:CompanyID', inv.taxRepresentative.vatId), E('cac:TaxScheme', T('cbc:ID', 'VAT'))),
      ),
    d &&
      E(
        'cac:Delivery',
        T('cbc:ActualDeliveryDate', d.date),
        E('cac:DeliveryLocation', idEl('cbc:ID', d.locationId), address('cac:Address', d.address)),
        E('cac:DeliveryParty', E('cac:PartyName', T('cbc:Name', d.name))),
      ),
    means,
    E('cac:PaymentTerms', T('cbc:Note', inv.paymentTerms)),
    inv.allowances.map((a) => allowanceCharge(a, false, cur, true)),
    inv.charges.map((c) => allowanceCharge(c, true, cur, true)),
    E(
      'cac:TaxTotal',
      money('cbc:TaxAmount', t.tax ?? '0.00', cur),
      inv.vatBreakdown.map((v) =>
        E(
          'cac:TaxSubtotal',
          money('cbc:TaxableAmount', v.taxableAmount, cur),
          money('cbc:TaxAmount', v.taxAmount, cur),
          E(
            'cac:TaxCategory',
            T('cbc:ID', v.category),
            T('cbc:Percent', v.rate),
            T('cbc:TaxExemptionReasonCode', v.exemptionReasonCode),
            T('cbc:TaxExemptionReason', v.exemptionReason),
            E('cac:TaxScheme', T('cbc:ID', 'VAT')),
          ),
        ),
      ),
    ),
    taxCur ? E('cac:TaxTotal', money('cbc:TaxAmount', t.taxInTaxCurrency, taxCur)) : undefined,
    E(
      'cac:LegalMonetaryTotal',
      money('cbc:LineExtensionAmount', t.lineNet, cur),
      money('cbc:TaxExclusiveAmount', t.taxExclusive, cur),
      money('cbc:TaxInclusiveAmount', t.taxInclusive, cur),
      money('cbc:AllowanceTotalAmount', t.allowances, cur),
      money('cbc:ChargeTotalAmount', t.charges, cur),
      money('cbc:PrepaidAmount', t.prepaid, cur),
      money('cbc:PayableRoundingAmount', t.rounding, cur),
      money('cbc:PayableAmount', t.payable, cur),
    ),
    inv.lines.map((l) => line(l, cur, credit)),
  )!;
  return document(root);
}
