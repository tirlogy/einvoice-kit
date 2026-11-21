// SPDX-License-Identifier: MIT
import type {
  Address,
  AllowanceCharge,
  Attachment,
  Identifier,
  Invoice,
  Line,
  Party,
  Payment,
  Period,
  VatCategory,
} from '../model';
import { at, attr, kids, text, type XEl } from '../xml';

const id = (el: XEl | undefined): Identifier | undefined => {
  const v = el?.textContent?.trim();
  if (!v) return undefined;
  const scheme = attr(el, 'schemeID');
  return scheme ? { id: v, scheme } : { id: v };
};

function address(el: XEl | undefined): Address | undefined {
  if (!el) return undefined;
  return {
    line1: text(el, 'StreetName'),
    line2: text(el, 'AdditionalStreetName'),
    line3: text(el, 'AddressLine', 'Line'),
    city: text(el, 'CityName'),
    postcode: text(el, 'PostalZone'),
    countrySubdivision: text(el, 'CountrySubentity'),
    country: text(el, 'Country', 'IdentificationCode') ?? '',
  };
}

function party(el: XEl | undefined): Party {
  const schemes = kids(el, 'PartyTaxScheme');
  const tax = (pred: (s: string | undefined) => boolean) =>
    text(schemes.find((s) => pred(text(s, 'TaxScheme', 'ID'))), 'CompanyID');
  const contact = at(el, 'Contact');
  const legal = at(el, 'PartyLegalEntity');
  return {
    name: text(legal, 'RegistrationName') ?? text(el, 'PartyName', 'Name') ?? '',
    tradingName: text(legal, 'RegistrationName') ? text(el, 'PartyName', 'Name') : undefined,
    identifiers: kids(el, 'PartyIdentification')
      .map((p) => id(at(p, 'ID')))
      .filter((x): x is Identifier => !!x),
    legalRegistrationId: id(at(legal, 'CompanyID')),
    vatId: tax((s) => s === 'VAT'),
    taxNumber: tax((s) => s !== 'VAT'),
    legalInfo: text(legal, 'CompanyLegalForm'),
    electronicAddress: id(at(el, 'EndpointID')),
    address: address(at(el, 'PostalAddress')) ?? { country: '' },
    contact: contact
      ? { name: text(contact, 'Name'), phone: text(contact, 'Telephone'), email: text(contact, 'ElectronicMail') }
      : undefined,
  };
}

function period(el: XEl | undefined): Period | undefined {
  if (!el) return undefined;
  return { start: text(el, 'StartDate'), end: text(el, 'EndDate') };
}

function allowanceCharges(els: XEl[]): { allowances: AllowanceCharge[]; charges: AllowanceCharge[] } {
  const allowances: AllowanceCharge[] = [];
  const charges: AllowanceCharge[] = [];
  for (const el of els) {
    const ac: AllowanceCharge = {
      amount: text(el, 'Amount') ?? '0',
      baseAmount: text(el, 'BaseAmount'),
      percentage: text(el, 'MultiplierFactorNumeric'),
      vatCategory: text(el, 'TaxCategory', 'ID') as VatCategory | undefined,
      vatRate: text(el, 'TaxCategory', 'Percent'),
      reason: text(el, 'AllowanceChargeReason'),
      reasonCode: text(el, 'AllowanceChargeReasonCode'),
    };
    (text(el, 'ChargeIndicator') === 'true' ? charges : allowances).push(ac);
  }
  return { allowances, charges };
}

function line(el: XEl): Line {
  const qty = at(el, 'InvoicedQuantity') ?? at(el, 'CreditedQuantity');
  const item = at(el, 'Item');
  const price = at(el, 'Price');
  const priceAc = at(price, 'AllowanceCharge');
  const base = at(price, 'BaseQuantity');
  const { allowances, charges } = allowanceCharges(kids(el, 'AllowanceCharge'));
  const docRef = kids(el, 'DocumentReference').find((d) => text(d, 'DocumentTypeCode') === '130');
  return {
    id: text(el, 'ID') ?? '',
    note: text(el, 'Note'),
    objectId: id(at(docRef, 'ID')),
    quantity: qty?.textContent?.trim() ?? '0',
    unitCode: attr(qty, 'unitCode') ?? 'C62',
    netAmount: text(el, 'LineExtensionAmount') ?? '0',
    orderLineReference: text(el, 'OrderLineReference', 'LineID'),
    accountingReference: text(el, 'AccountingCost'),
    period: period(at(el, 'InvoicePeriod')),
    allowances,
    charges,
    price: {
      net: text(price, 'PriceAmount') ?? '0',
      discount: text(priceAc, 'Amount'),
      gross: text(priceAc, 'BaseAmount'),
      baseQuantity: base?.textContent?.trim() || undefined,
      baseUnitCode: attr(base, 'unitCode'),
    },
    vat: {
      category: (text(item, 'ClassifiedTaxCategory', 'ID') ?? 'S') as VatCategory,
      rate: text(item, 'ClassifiedTaxCategory', 'Percent'),
    },
    item: {
      name: text(item, 'Name') ?? '',
      description: text(item, 'Description'),
      sellerId: text(item, 'SellersItemIdentification', 'ID'),
      buyerId: text(item, 'BuyersItemIdentification', 'ID'),
      standardId: id(at(item, 'StandardItemIdentification', 'ID')),
      classifications: kids(item, 'CommodityClassification').map((c) => {
        const code = at(c, 'ItemClassificationCode');
        return { code: code?.textContent?.trim() ?? '', listId: attr(code, 'listID'), listVersion: attr(code, 'listVersionID') };
      }),
      originCountry: text(item, 'OriginCountry', 'IdentificationCode'),
      attributes: kids(item, 'AdditionalItemProperty').map((p) => ({ name: text(p, 'Name') ?? '', value: text(p, 'Value') ?? '' })),
    },
  };
}

function payment(root: XEl): Payment | undefined {
  const means = kids(root, 'PaymentMeans');
  const first = means[0];
  if (!first) return undefined;
  const code = at(first, 'PaymentMeansCode');
  const card = at(first, 'CardAccount');
  const mandate = at(first, 'PaymentMandate');
  const creditor = kids(at(root, 'AccountingSupplierParty', 'Party'), 'PartyIdentification')
    .map((p) => at(p, 'ID'))
    .find((i) => attr(i, 'schemeID') === 'SEPA');
  return {
    meansCode: code?.textContent?.trim() ?? '',
    meansText: attr(code, 'name'),
    remittanceInfo: text(first, 'PaymentID'),
    creditTransfers: means
      .map((m) => at(m, 'PayeeFinancialAccount'))
      .filter((a): a is XEl => !!a)
      .map((a) => ({ iban: text(a, 'ID') ?? '', name: text(a, 'Name'), bic: text(a, 'FinancialInstitutionBranch', 'ID') })),
    card: card ? { pan: text(card, 'PrimaryAccountNumberID') ?? '', holder: text(card, 'HolderName') } : undefined,
    directDebit: mandate
      ? {
          mandateRef: text(mandate, 'ID'),
          creditorId: creditor?.textContent?.trim(),
          debitedAccount: text(mandate, 'PayerFinancialAccount', 'ID'),
        }
      : undefined,
  };
}

function attachments(root: XEl): Attachment[] {
  return kids(root, 'AdditionalDocumentReference')
    .filter((d) => !['130', '50'].includes(text(d, 'DocumentTypeCode') ?? ''))
    .map((d) => {
      const bin = at(d, 'Attachment', 'EmbeddedDocumentBinaryObject');
      return {
        id: text(d, 'ID') ?? '',
        description: text(d, 'DocumentDescription'),
        url: text(d, 'Attachment', 'ExternalReference', 'URI'),
        mimeCode: attr(bin, 'mimeCode'),
        filename: attr(bin, 'filename'),
        content: bin?.textContent?.replace(/\s+/g, '') || undefined,
      };
    });
}

/** Parses an OASIS UBL 2.1 Invoice or CreditNote (XRechnung UBL, Peppol BIS). */
export function parseUblDocument(root: XEl): Invoice {
  const isCredit = root.localName === 'CreditNote';
  const currency = text(root, 'DocumentCurrencyCode') ?? '';
  const taxCurrency = text(root, 'TaxCurrencyCode');
  const taxTotals = kids(root, 'TaxTotal');
  const mainTax = taxTotals.find((t) => attr(at(t, 'TaxAmount'), 'currencyID') === currency) ?? taxTotals[0];
  const otherTax = taxTotals.find((t) => t !== mainTax);
  const sum = at(root, 'LegalMonetaryTotal');
  const { allowances, charges } = allowanceCharges(kids(root, 'AllowanceCharge'));
  const additional = kids(root, 'AdditionalDocumentReference');
  const objectRef = additional.find((d) => text(d, 'DocumentTypeCode') === '130');
  const projectRef = additional.find((d) => text(d, 'DocumentTypeCode') === '50');
  const deliveryEl = at(root, 'Delivery');
  const payee = at(root, 'PayeeParty');
  const taxRep = at(root, 'TaxRepresentativeParty');
  const firstMeans = at(root, 'PaymentMeans');

  return {
    specification: text(root, 'CustomizationID') ?? '',
    businessProcess: text(root, 'ProfileID'),
    number: text(root, 'ID') ?? '',
    issueDate: text(root, 'IssueDate') ?? '',
    typeCode: text(root, isCredit ? 'CreditNoteTypeCode' : 'InvoiceTypeCode') ?? (isCredit ? '381' : '380'),
    currency,
    taxCurrency,
    taxPointDate: text(root, 'TaxPointDate'),
    taxPointDateCode: text(root, 'InvoicePeriod', 'DescriptionCode'),
    dueDate: text(root, 'DueDate') ?? text(firstMeans, 'PaymentDueDate'),
    buyerReference: text(root, 'BuyerReference'),
    projectReference: text(root, 'ProjectReference', 'ID') ?? text(projectRef, 'ID'),
    contractReference: text(root, 'ContractDocumentReference', 'ID'),
    purchaseOrderReference: text(root, 'OrderReference', 'ID'),
    salesOrderReference: text(root, 'OrderReference', 'SalesOrderID'),
    receivingAdviceReference: text(root, 'ReceiptDocumentReference', 'ID'),
    despatchAdviceReference: text(root, 'DespatchDocumentReference', 'ID'),
    tenderReference: text(root, 'OriginatorDocumentReference', 'ID'),
    invoicedObjectId: id(at(objectRef, 'ID')),
    buyerAccountingReference: text(root, 'AccountingCost'),
    paymentTerms: text(root, 'PaymentTerms', 'Note'),
    notes: kids(root, 'Note').map((n) => {
      const raw = n.textContent?.trim() ?? '';
      const m = /^#([A-Z]{3})#([\s\S]*)$/.exec(raw);
      return m ? { subjectCode: m[1], text: m[2]!.trim() } : { text: raw };
    }),
    precedingInvoices: kids(root, 'BillingReference').map((b) => ({
      number: text(b, 'InvoiceDocumentReference', 'ID') ?? '',
      issueDate: text(b, 'InvoiceDocumentReference', 'IssueDate'),
    })),
    seller: party(at(root, 'AccountingSupplierParty', 'Party')),
    buyer: party(at(root, 'AccountingCustomerParty', 'Party')),
    payee: payee
      ? {
          name: text(payee, 'PartyName', 'Name') ?? '',
          identifier: id(at(payee, 'PartyIdentification', 'ID')),
          legalRegistrationId: id(at(payee, 'PartyLegalEntity', 'CompanyID')),
        }
      : undefined,
    taxRepresentative: taxRep
      ? {
          name: text(taxRep, 'PartyName', 'Name') ?? '',
          vatId: text(taxRep, 'PartyTaxScheme', 'CompanyID') ?? '',
          address: address(at(taxRep, 'PostalAddress')) ?? { country: '' },
        }
      : undefined,
    delivery: deliveryEl
      ? {
          name: text(deliveryEl, 'DeliveryParty', 'PartyName', 'Name'),
          locationId: id(at(deliveryEl, 'DeliveryLocation', 'ID')),
          date: text(deliveryEl, 'ActualDeliveryDate'),
          address: address(at(deliveryEl, 'DeliveryLocation', 'Address')),
        }
      : undefined,
    invoicingPeriod: period(at(root, 'InvoicePeriod')),
    payment: payment(root),
    allowances,
    charges,
    totals: {
      lineNet: text(sum, 'LineExtensionAmount') ?? '0',
      allowances: text(sum, 'AllowanceTotalAmount'),
      charges: text(sum, 'ChargeTotalAmount'),
      taxExclusive: text(sum, 'TaxExclusiveAmount') ?? '0',
      tax: text(mainTax, 'TaxAmount'),
      taxInTaxCurrency: otherTax ? text(otherTax, 'TaxAmount') : undefined,
      taxInclusive: text(sum, 'TaxInclusiveAmount') ?? '0',
      prepaid: text(sum, 'PrepaidAmount'),
      rounding: text(sum, 'PayableRoundingAmount'),
      payable: text(sum, 'PayableAmount') ?? '0',
    },
    vatBreakdown: kids(mainTax, 'TaxSubtotal').map((s) => ({
      category: (text(s, 'TaxCategory', 'ID') ?? 'S') as VatCategory,
      rate: text(s, 'TaxCategory', 'Percent'),
      taxableAmount: text(s, 'TaxableAmount') ?? '0',
      taxAmount: text(s, 'TaxAmount') ?? '0',
      exemptionReason: text(s, 'TaxCategory', 'TaxExemptionReason'),
      exemptionReasonCode: text(s, 'TaxCategory', 'TaxExemptionReasonCode'),
    })),
    attachments: attachments(root),
    lines: kids(root, isCredit ? 'CreditNoteLine' : 'InvoiceLine').map(line),
  };
}
