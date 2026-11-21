// SPDX-License-Identifier: MIT
/**
 * Normalised invoice model based on the EN 16931 semantic data model.
 * Field comments name the Business Term (BT) or Business Group (BG).
 * Amounts and quantities are decimal strings (e.g. "19.99") to avoid float errors.
 */

export type Decimal = string;
/** ISO date `YYYY-MM-DD`. */
export type IsoDate = string;

export interface Identifier {
  id: string;
  /** Scheme identifier, e.g. ISO 6523 ICD `0088` or `EM` for e-mail. */
  scheme?: string;
}

export interface Address {
  line1?: string; // BT-35 / BT-50 / BT-75
  line2?: string; // BT-36 / BT-51 / BT-76
  line3?: string; // BT-162 / BT-163 / BT-165
  city?: string; // BT-37 / BT-52 / BT-77
  postcode?: string; // BT-38 / BT-53 / BT-78
  countrySubdivision?: string; // BT-39 / BT-54 / BT-79
  country: string; // BT-40 / BT-55 / BT-80 (ISO 3166-1 alpha-2)
}

export interface Contact {
  name?: string; // BT-41 / BT-56
  phone?: string; // BT-42 / BT-57
  email?: string; // BT-43 / BT-58
}

export interface Party {
  name: string; // BT-27 / BT-44
  tradingName?: string; // BT-28 / BT-45
  identifiers: Identifier[]; // BT-29 / BT-46
  legalRegistrationId?: Identifier; // BT-30 / BT-47
  vatId?: string; // BT-31 / BT-48
  /** German tax number (Steuernummer), BT-32 seller only. */
  taxNumber?: string;
  legalInfo?: string; // BT-33
  electronicAddress?: Identifier; // BT-34 / BT-49
  address: Address; // BG-5 / BG-8
  contact?: Contact; // BG-6 / BG-9
}

export interface Note {
  subjectCode?: string; // BT-21
  text: string; // BT-22
}

export interface PrecedingInvoice {
  number: string; // BT-25
  issueDate?: IsoDate; // BT-26
}

export interface Period {
  start?: IsoDate; // BT-73 / BT-134
  end?: IsoDate; // BT-74 / BT-135
}

export interface Delivery {
  name?: string; // BT-70
  locationId?: Identifier; // BT-71
  date?: IsoDate; // BT-72
  address?: Address; // BG-15
}

export interface CreditTransfer {
  iban: string; // BT-84
  name?: string; // BT-85
  bic?: string; // BT-86
}

export interface Payment {
  meansCode: string; // BT-81 (UNTDID 4461)
  meansText?: string; // BT-82
  remittanceInfo?: string; // BT-83
  creditTransfers: CreditTransfer[]; // BG-17
  card?: { pan: string; holder?: string }; // BG-18
  directDebit?: { mandateRef?: string; creditorId?: string; debitedAccount?: string }; // BG-19
}

/** Document or line level allowance (discount) or charge (surcharge). */
export interface AllowanceCharge {
  amount: Decimal; // BT-92 / BT-99 / BT-136 / BT-141
  baseAmount?: Decimal; // BT-93 / BT-100 / BT-137 / BT-142
  percentage?: Decimal; // BT-94 / BT-101 / BT-138 / BT-143
  /** VAT category (document level only), BT-95 / BT-102. */
  vatCategory?: VatCategory;
  vatRate?: Decimal; // BT-96 / BT-103
  reason?: string; // BT-97 / BT-104 / BT-139 / BT-144
  reasonCode?: string; // BT-98 / BT-105 / BT-140 / BT-145
}

/**
 * UNCL 5305 VAT category codes allowed by EN 16931.
 * S standard, Z zero, E exempt, AE reverse charge, K intra-community,
 * G export, O not subject to VAT, L Canary Islands, M Ceuta/Melilla.
 */
export type VatCategory = 'S' | 'Z' | 'E' | 'AE' | 'K' | 'G' | 'O' | 'L' | 'M';

export interface VatBreakdown {
  category: VatCategory; // BT-118
  rate?: Decimal; // BT-119
  taxableAmount: Decimal; // BT-116
  taxAmount: Decimal; // BT-117
  exemptionReason?: string; // BT-120
  exemptionReasonCode?: string; // BT-121
}

export interface Totals {
  lineNet: Decimal; // BT-106
  allowances?: Decimal; // BT-107
  charges?: Decimal; // BT-108
  taxExclusive: Decimal; // BT-109
  tax?: Decimal; // BT-110
  taxInTaxCurrency?: Decimal; // BT-111
  taxInclusive: Decimal; // BT-112
  prepaid?: Decimal; // BT-113
  rounding?: Decimal; // BT-114
  payable: Decimal; // BT-115
}

export interface Attachment {
  id: string; // BT-122
  description?: string; // BT-123
  url?: string; // BT-124
  mimeCode?: string;
  filename?: string;
  /** Base64 encoded content, BT-125. */
  content?: string;
}

export interface Item {
  name: string; // BT-153
  description?: string; // BT-154
  sellerId?: string; // BT-155
  buyerId?: string; // BT-156
  standardId?: Identifier; // BT-157
  classifications?: { code: string; listId?: string; listVersion?: string }[]; // BT-158
  originCountry?: string; // BT-159
  attributes?: { name: string; value: string }[]; // BG-32
}

export interface Line {
  id: string; // BT-126
  note?: string; // BT-127
  objectId?: Identifier; // BT-128
  quantity: Decimal; // BT-129
  unitCode: string; // BT-130 (UN/ECE Rec 20)
  netAmount: Decimal; // BT-131
  orderLineReference?: string; // BT-132
  accountingReference?: string; // BT-133
  period?: Period; // BG-26
  allowances: AllowanceCharge[]; // BG-27
  charges: AllowanceCharge[]; // BG-28
  price: {
    net: Decimal; // BT-146
    discount?: Decimal; // BT-147
    gross?: Decimal; // BT-148
    baseQuantity?: Decimal; // BT-149
    baseUnitCode?: string; // BT-150
  };
  vat: { category: VatCategory; rate?: Decimal }; // BT-151 / BT-152
  item: Item;
}

export type Syntax = 'CII' | 'UBL';

export interface Invoice {
  /** BT-24 specification identifier, e.g. `urn:cen.eu:en16931:2017`. */
  specification: string;
  businessProcess?: string; // BT-23
  number: string; // BT-1
  issueDate: IsoDate; // BT-2
  /** UNTDID 1001 document type, e.g. 380 invoice, 381 credit note, 386 prepayment. BT-3 */
  typeCode: string;
  currency: string; // BT-5
  taxCurrency?: string; // BT-6
  taxPointDate?: IsoDate; // BT-7
  taxPointDateCode?: string; // BT-8
  dueDate?: IsoDate; // BT-9
  buyerReference?: string; // BT-10 (Leitweg-ID for German public buyers)
  projectReference?: string; // BT-11
  contractReference?: string; // BT-12
  purchaseOrderReference?: string; // BT-13
  salesOrderReference?: string; // BT-14
  receivingAdviceReference?: string; // BT-15
  despatchAdviceReference?: string; // BT-16
  tenderReference?: string; // BT-17
  invoicedObjectId?: Identifier; // BT-18
  buyerAccountingReference?: string; // BT-19
  paymentTerms?: string; // BT-20
  notes: Note[]; // BG-1
  precedingInvoices: PrecedingInvoice[]; // BG-3
  seller: Party; // BG-4
  buyer: Party; // BG-7
  payee?: { name: string; identifier?: Identifier; legalRegistrationId?: Identifier }; // BG-10
  taxRepresentative?: { name: string; vatId: string; address: Address }; // BG-11
  delivery?: Delivery; // BG-13
  invoicingPeriod?: Period; // BG-14
  payment?: Payment; // BG-16
  allowances: AllowanceCharge[]; // BG-20
  charges: AllowanceCharge[]; // BG-21
  totals: Totals; // BG-22
  vatBreakdown: VatBreakdown[]; // BG-23
  attachments: Attachment[]; // BG-24
  lines: Line[]; // BG-25
}

/** Well-known BT-24 values. */
export const SPEC = {
  EN16931: 'urn:cen.eu:en16931:2017',
  XRECHNUNG: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
  XRECHNUNG_EXTENSION:
    'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0',
  FACTURX_MINIMUM: 'urn:factur-x.eu:1p0:minimum',
  FACTURX_BASICWL: 'urn:factur-x.eu:1p0:basicwl',
  FACTURX_BASIC: 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic',
  FACTURX_EXTENDED: 'urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended',
} as const;

/** Default BT-23 for XRechnung / Peppol style processes. */
export const DEFAULT_BUSINESS_PROCESS = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

export type Profile = 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED' | 'XRECHNUNG';

/** Derives the ZUGFeRD / Factur-X profile from BT-24. */
export function profileOf(specification: string): Profile {
  const s = specification.toLowerCase();
  if (s.includes('xrechnung')) return 'XRECHNUNG';
  if (s.includes('minimum')) return 'MINIMUM';
  if (s.includes('basicwl')) return 'BASIC WL';
  if (s.includes('extended')) return 'EXTENDED';
  if (s.includes(':basic')) return 'BASIC';
  return 'EN 16931';
}

/**
 * MINIMUM and BASIC WL lack line items and are not invoices in the sense of
 * § 14 UStG (BMF letter of 15 Oct 2024). They only serve as booking aids.
 */
export function isGermanEInvoiceProfile(profile: Profile): boolean {
  return profile !== 'MINIMUM' && profile !== 'BASIC WL';
}

export function isCreditNote(typeCode: string): boolean {
  return ['381', '261', '262', '296', '308', '396', '420', '458', '532'].includes(typeCode);
}
