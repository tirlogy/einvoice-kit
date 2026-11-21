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
import { all, at, attr, fromCiiDate, kids, text, type XEl } from '../xml';

const id = (el: XEl | undefined): Identifier | undefined => {
  const v = el?.textContent?.trim();
  if (!v) return undefined;
  const scheme = attr(el, 'schemeID');
  return scheme ? { id: v, scheme } : { id: v };
};

const date = (el: XEl | undefined, ...path: string[]) => fromCiiDate(text(el, ...path));

function address(el: XEl | undefined): Address | undefined {
  if (!el) return undefined;
  return {
    line1: text(el, 'LineOne'),
    line2: text(el, 'LineTwo'),
    line3: text(el, 'LineThree'),
    city: text(el, 'CityName'),
    postcode: text(el, 'PostcodeCode'),
    countrySubdivision: text(el, 'CountrySubDivisionName'),
    country: text(el, 'CountryID') ?? '',
  };
}

function party(el: XEl | undefined): Party {
  const identifiers = [...kids(el, 'ID'), ...kids(el, 'GlobalID')]
    .map(id)
    .filter((x): x is Identifier => !!x);
  const contact = at(el, 'DefinedTradeContact');
  const reg = kids(el, 'SpecifiedTaxRegistration');
  const taxId = (scheme: string) => reg.map((r) => at(r, 'ID')).find((i) => attr(i, 'schemeID') === scheme)?.textContent?.trim();
  return {
    name: text(el, 'Name') ?? '',
    tradingName: text(el, 'SpecifiedLegalOrganization', 'TradingBusinessName'),
    identifiers,
    legalRegistrationId: id(at(el, 'SpecifiedLegalOrganization', 'ID')),
    vatId: taxId('VA'),
    taxNumber: taxId('FC'),
    legalInfo: text(el, 'Description'),
    electronicAddress: id(at(el, 'URIUniversalCommunication', 'URIID')),
    address: address(at(el, 'PostalTradeAddress')) ?? { country: '' },
    contact: contact
      ? {
          name: text(contact, 'PersonName') ?? text(contact, 'DepartmentName'),
          phone: text(contact, 'TelephoneUniversalCommunication', 'CompleteNumber'),
          email: text(contact, 'EmailURIUniversalCommunication', 'URIID'),
        }
      : undefined,
  };
}

function period(el: XEl | undefined): Period | undefined {
  if (!el) return undefined;
  return {
    start: date(el, 'StartDateTime', 'DateTimeString'),
    end: date(el, 'EndDateTime', 'DateTimeString'),
  };
}

function allowanceCharges(els: XEl[]): { allowances: AllowanceCharge[]; charges: AllowanceCharge[] } {
  const allowances: AllowanceCharge[] = [];
  const charges: AllowanceCharge[] = [];
  for (const el of els) {
    const ac: AllowanceCharge = {
      amount: text(el, 'ActualAmount') ?? '0',
      baseAmount: text(el, 'BasisAmount'),
      percentage: text(el, 'CalculationPercent'),
      vatCategory: text(el, 'CategoryTradeTax', 'CategoryCode') as VatCategory | undefined,
      vatRate: text(el, 'CategoryTradeTax', 'RateApplicablePercent'),
      reason: text(el, 'Reason'),
      reasonCode: text(el, 'ReasonCode'),
    };
    (text(el, 'ChargeIndicator', 'Indicator') === 'true' ? charges : allowances).push(ac);
  }
  return { allowances, charges };
}

function line(el: XEl): Line {
  const doc = at(el, 'AssociatedDocumentLineDocument');
  const product = at(el, 'SpecifiedTradeProduct');
  const agreement = at(el, 'SpecifiedLineTradeAgreement');
  const settlement = at(el, 'SpecifiedLineTradeSettlement');
  const qty = at(el, 'SpecifiedLineTradeDelivery', 'BilledQuantity');
  const net = at(agreement, 'NetPriceProductTradePrice');
  const gross = at(agreement, 'GrossPriceProductTradePrice');
  const { allowances, charges } = allowanceCharges(kids(settlement, 'SpecifiedTradeAllowanceCharge'));
  const objectRef = kids(settlement, 'AdditionalReferencedDocument').find((d) => text(d, 'TypeCode') === '130');
  return {
    id: text(doc, 'LineID') ?? '',
    note: text(doc, 'IncludedNote', 'Content'),
    objectId: objectRef
      ? { id: text(objectRef, 'IssuerAssignedID') ?? '', scheme: text(objectRef, 'ReferenceTypeCode') }
      : undefined,
    quantity: qty?.textContent?.trim() ?? '0',
    unitCode: attr(qty, 'unitCode') ?? 'C62',
    netAmount: text(settlement, 'SpecifiedTradeSettlementLineMonetarySummation', 'LineTotalAmount') ?? '0',
    orderLineReference: text(agreement, 'BuyerOrderReferencedDocument', 'LineID'),
    accountingReference: text(settlement, 'ReceivableSpecifiedTradeAccountingAccount', 'ID'),
    period: period(at(settlement, 'BillingSpecifiedPeriod')),
    allowances,
    charges,
    price: {
      net: text(net, 'ChargeAmount') ?? '0',
      gross: text(gross, 'ChargeAmount'),
      discount: text(gross, 'AppliedTradeAllowanceCharge', 'ActualAmount'),
      baseQuantity: text(net, 'BasisQuantity') ?? text(gross, 'BasisQuantity'),
      baseUnitCode: attr(at(net, 'BasisQuantity') ?? at(gross, 'BasisQuantity'), 'unitCode'),
    },
    vat: {
      category: (text(settlement, 'ApplicableTradeTax', 'CategoryCode') ?? 'S') as VatCategory,
      rate: text(settlement, 'ApplicableTradeTax', 'RateApplicablePercent'),
    },
    item: {
      name: text(product, 'Name') ?? '',
      description: text(product, 'Description'),
      sellerId: text(product, 'SellerAssignedID'),
      buyerId: text(product, 'BuyerAssignedID'),
      standardId: id(at(product, 'GlobalID')),
      classifications: kids(product, 'DesignatedProductClassification').map((c) => {
        const code = at(c, 'ClassCode');
        return { code: code?.textContent?.trim() ?? '', listId: attr(code, 'listID'), listVersion: attr(code, 'listVersionID') };
      }),
      originCountry: text(product, 'OriginTradeCountry', 'ID'),
      attributes: kids(product, 'ApplicableProductCharacteristic').map((c) => ({
        name: text(c, 'Description') ?? '',
        value: text(c, 'Value') ?? '',
      })),
    },
  };
}

function payment(settlement: XEl | undefined): Payment | undefined {
  const means = kids(settlement, 'SpecifiedTradeSettlementPaymentMeans');
  const first = means[0];
  if (!first) return undefined;
  const card = at(first, 'ApplicableTradeSettlementFinancialCard');
  const mandate = text(settlement, 'SpecifiedTradePaymentTerms', 'DirectDebitMandateID');
  const creditorId = text(settlement, 'CreditorReferenceID');
  const debited = text(first, 'PayerPartyDebtorFinancialAccount', 'IBANID');
  return {
    meansCode: text(first, 'TypeCode') ?? '',
    meansText: text(first, 'Information'),
    remittanceInfo: text(settlement, 'PaymentReference'),
    creditTransfers: means
      .map((m) => ({
        iban: text(m, 'PayeePartyCreditorFinancialAccount', 'IBANID') ?? text(m, 'PayeePartyCreditorFinancialAccount', 'ProprietaryID') ?? '',
        name: text(m, 'PayeePartyCreditorFinancialAccount', 'AccountName'),
        bic: text(m, 'PayeeSpecifiedCreditorFinancialInstitution', 'BICID'),
      }))
      .filter((c) => c.iban),
    card: card ? { pan: text(card, 'ID') ?? '', holder: text(card, 'CardholderName') } : undefined,
    directDebit: mandate || debited ? { mandateRef: mandate, creditorId, debitedAccount: debited } : undefined,
  };
}

function attachments(agreement: XEl | undefined): Attachment[] {
  return kids(agreement, 'AdditionalReferencedDocument')
    .filter((d) => text(d, 'TypeCode') === '916')
    .map((d) => {
      const bin = at(d, 'AttachmentBinaryObject');
      return {
        id: text(d, 'IssuerAssignedID') ?? '',
        description: text(d, 'Name'),
        url: text(d, 'URIID'),
        mimeCode: attr(bin, 'mimeCode'),
        filename: attr(bin, 'filename'),
        content: bin?.textContent?.replace(/\s+/g, '') || undefined,
      };
    });
}

/** Parses a UN/CEFACT Cross Industry Invoice (ZUGFeRD 2.x, Factur-X, XRechnung CII). */
export function parseCiiDocument(root: XEl): Invoice {
  const ctx = at(root, 'ExchangedDocumentContext');
  const doc = at(root, 'ExchangedDocument');
  const tx = at(root, 'SupplyChainTradeTransaction');
  const agreement = at(tx, 'ApplicableHeaderTradeAgreement');
  const delivery = at(tx, 'ApplicableHeaderTradeDelivery');
  const settlement = at(tx, 'ApplicableHeaderTradeSettlement');
  const sum = at(settlement, 'SpecifiedTradeSettlementHeaderMonetarySummation');
  const currency = text(settlement, 'InvoiceCurrencyCode') ?? '';
  const taxCurrency = text(settlement, 'TaxCurrencyCode');
  const taxTotals = kids(sum, 'TaxTotalAmount');
  const taxIn = (cur: string | undefined) => taxTotals.find((t) => !cur || attr(t, 'currencyID') === cur || !attr(t, 'currencyID'))?.textContent?.trim();
  const { allowances, charges } = allowanceCharges(kids(settlement, 'SpecifiedTradeAllowanceCharge'));
  const additional = kids(agreement, 'AdditionalReferencedDocument');
  const refOf = (code: string) => additional.find((d) => text(d, 'TypeCode') === code);
  const objectRef = refOf('130');
  const shipTo = at(delivery, 'ShipToTradeParty');
  const payee = at(settlement, 'PayeeTradeParty');
  const taxRep = at(agreement, 'SellerTaxRepresentativeTradeParty');
  const headerTaxes = kids(settlement, 'ApplicableTradeTax');

  return {
    specification: text(ctx, 'GuidelineSpecifiedDocumentContextParameter', 'ID') ?? '',
    businessProcess: text(ctx, 'BusinessProcessSpecifiedDocumentContextParameter', 'ID'),
    number: text(doc, 'ID') ?? '',
    issueDate: date(doc, 'IssueDateTime', 'DateTimeString') ?? '',
    typeCode: text(doc, 'TypeCode') ?? '380',
    currency,
    taxCurrency,
    taxPointDate: headerTaxes.map((t) => fromCiiDate(text(t, 'TaxPointDate', 'DateString'))).find(Boolean),
    taxPointDateCode: headerTaxes.map((t) => text(t, 'DueDateTypeCode')).find(Boolean),
    dueDate: date(settlement, 'SpecifiedTradePaymentTerms', 'DueDateDateTime', 'DateTimeString'),
    buyerReference: text(agreement, 'BuyerReference'),
    projectReference: text(agreement, 'SpecifiedProcuringProject', 'ID'),
    contractReference: text(agreement, 'ContractReferencedDocument', 'IssuerAssignedID'),
    purchaseOrderReference: text(agreement, 'BuyerOrderReferencedDocument', 'IssuerAssignedID'),
    salesOrderReference: text(agreement, 'SellerOrderReferencedDocument', 'IssuerAssignedID'),
    receivingAdviceReference: text(delivery, 'ReceivingAdviceReferencedDocument', 'IssuerAssignedID'),
    despatchAdviceReference: text(delivery, 'DespatchAdviceReferencedDocument', 'IssuerAssignedID'),
    tenderReference: text(refOf('50'), 'IssuerAssignedID'),
    invoicedObjectId: objectRef
      ? { id: text(objectRef, 'IssuerAssignedID') ?? '', scheme: text(objectRef, 'ReferenceTypeCode') }
      : undefined,
    buyerAccountingReference: text(settlement, 'ReceivableSpecifiedTradeAccountingAccount', 'ID'),
    paymentTerms: all(settlement, 'SpecifiedTradePaymentTerms')
      .map((t) => text(t, 'Description'))
      .filter(Boolean)
      .join('\n') || undefined,
    notes: kids(doc, 'IncludedNote').map((n) => ({ text: text(n, 'Content') ?? '', subjectCode: text(n, 'SubjectCode') })),
    precedingInvoices: kids(settlement, 'InvoiceReferencedDocument').map((r) => ({
      number: text(r, 'IssuerAssignedID') ?? '',
      issueDate: date(r, 'FormattedIssueDateTime', 'DateTimeString'),
    })),
    seller: party(at(agreement, 'SellerTradeParty')),
    buyer: party(at(agreement, 'BuyerTradeParty')),
    payee: payee
      ? {
          name: text(payee, 'Name') ?? '',
          identifier: id(at(payee, 'GlobalID') ?? at(payee, 'ID')),
          legalRegistrationId: id(at(payee, 'SpecifiedLegalOrganization', 'ID')),
        }
      : undefined,
    taxRepresentative: taxRep
      ? {
          name: text(taxRep, 'Name') ?? '',
          vatId: text(taxRep, 'SpecifiedTaxRegistration', 'ID') ?? '',
          address: address(at(taxRep, 'PostalTradeAddress')) ?? { country: '' },
        }
      : undefined,
    delivery:
      shipTo || at(delivery, 'ActualDeliverySupplyChainEvent')
        ? {
            name: text(shipTo, 'Name'),
            locationId: id(at(shipTo, 'GlobalID') ?? at(shipTo, 'ID')),
            date: date(delivery, 'ActualDeliverySupplyChainEvent', 'OccurrenceDateTime', 'DateTimeString'),
            address: address(at(shipTo, 'PostalTradeAddress')),
          }
        : undefined,
    invoicingPeriod: period(at(settlement, 'BillingSpecifiedPeriod')),
    payment: payment(settlement),
    allowances,
    charges,
    totals: {
      lineNet: text(sum, 'LineTotalAmount') ?? '0',
      allowances: text(sum, 'AllowanceTotalAmount'),
      charges: text(sum, 'ChargeTotalAmount'),
      taxExclusive: text(sum, 'TaxBasisTotalAmount') ?? '0',
      tax: taxIn(currency),
      taxInTaxCurrency: taxCurrency && taxCurrency !== currency ? taxIn(taxCurrency) : undefined,
      taxInclusive: text(sum, 'GrandTotalAmount') ?? '0',
      prepaid: text(sum, 'TotalPrepaidAmount'),
      rounding: text(sum, 'RoundingAmount'),
      payable: text(sum, 'DuePayableAmount') ?? '0',
    },
    vatBreakdown: headerTaxes.map((t) => ({
      category: (text(t, 'CategoryCode') ?? 'S') as VatCategory,
      rate: text(t, 'RateApplicablePercent'),
      taxableAmount: text(t, 'BasisAmount') ?? '0',
      taxAmount: text(t, 'CalculatedAmount') ?? '0',
      exemptionReason: text(t, 'ExemptionReason'),
      exemptionReasonCode: text(t, 'ExemptionReasonCode'),
    })),
    attachments: attachments(agreement),
    lines: kids(tx, 'IncludedSupplyChainTradeLineItem').map(line),
  };
}
