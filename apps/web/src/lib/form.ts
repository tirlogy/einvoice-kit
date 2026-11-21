// SPDX-License-Identifier: MIT
/** Maps the simplified create form to the EN 16931 draft and back. */
import { addDays, exampleDraft, type ExampleKind } from '@core/examples';
import type { InvoiceDraft, LineDraft } from '@core/calc';
import { DEFAULT_BUSINESS_PROCESS, SPEC, type AllowanceCharge, type Party, type VatCategory } from '@core/model';
import type { PartyData } from './storage';

export type DocType = 'invoice' | 'prepayment' | 'partial' | 'final' | 'credit' | 'cancellation' | 'corrected';
export type TaxCase = 'standard' | 'small' | 'reverse' | 'ic';
export type OutputFormat = 'zugferd' | 'xrechnung-cii' | 'xrechnung-ubl';

export const DOC_TYPES: { id: DocType; code: string }[] = [
  { id: 'invoice', code: '380' },
  { id: 'prepayment', code: '386' },
  { id: 'partial', code: '326' },
  { id: 'final', code: '380' },
  { id: 'credit', code: '381' },
  { id: 'cancellation', code: '381' },
  { id: 'corrected', code: '384' },
];
export const TAX_CASES: TaxCase[] = ['standard', 'small', 'reverse', 'ic'];
const TAX_CATEGORY: Record<TaxCase, VatCategory> = { standard: 'S', small: 'E', reverse: 'AE', ic: 'K' };

export interface FormLine {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unitCode: string;
  price: string;
  vatRate: string;
  discountPct: string;
}

export interface FormAc {
  key: string;
  kind: 'allowance' | 'charge';
  reason: string;
  amount: string;
  vatRate: string;
}

export interface FormState {
  docType: DocType;
  taxCase: TaxCase;
  number: string;
  issueDate: string;
  dueDate: string;
  deliveryDate: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  buyerReference: string;
  orderReference: string;
  precedingNumber: string;
  precedingDate: string;
  prepaid: string;
  note: string;
  paymentTerms: string;
  seller: PartyData;
  buyer: PartyData;
  iban: string;
  bic: string;
  accountName: string;
  lines: FormLine[];
  acs: FormAc[];
  output: OutputFormat;
  layout: 'classic' | 'modern';
  accent: string;
  logo?: string;
  pdfLang: 'de' | 'en' | 'tr';
}

let counter = 0;
export const key = () => `k${++counter}`;

export const emptyParty = (): PartyData => ({
  name: '',
  street: '',
  postcode: '',
  city: '',
  country: 'DE',
  vatId: '',
  taxNumber: '',
  registration: '',
  contactName: '',
  phone: '',
  email: '',
  eAddress: '',
  identifier: '',
});

export const emptyLine = (): FormLine => ({
  key: key(),
  name: '',
  description: '',
  quantity: '1',
  unitCode: 'C62',
  price: '',
  vatRate: '19',
  discountPct: '',
});

export const today = () => new Date().toISOString().slice(0, 10);

export function emptyForm(): FormState {
  const d = today();
  return {
    docType: 'invoice',
    taxCase: 'standard',
    number: '',
    issueDate: d,
    dueDate: addDays(d, 14),
    deliveryDate: d,
    periodStart: '',
    periodEnd: '',
    currency: 'EUR',
    buyerReference: '',
    orderReference: '',
    precedingNumber: '',
    precedingDate: '',
    prepaid: '',
    note: '',
    paymentTerms: '',
    seller: emptyParty(),
    buyer: emptyParty(),
    iban: '',
    bic: '',
    accountName: '',
    lines: [emptyLine()],
    acs: [],
    output: 'zugferd',
    layout: 'classic',
    accent: '#1c549e',
    pdfLang: 'de',
  };
}

const t = (s: string) => s.trim();
const opt = (s: string) => (t(s) ? t(s) : undefined);
/** Accepts German decimal commas. */
export const num = (s: string) => t(s).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');

function toParty(p: PartyData, seller: boolean): Party {
  return {
    name: t(p.name),
    identifiers: opt(p.identifier) ? [{ id: t(p.identifier) }] : [],
    legalRegistrationId: seller && opt(p.registration) ? { id: t(p.registration) } : undefined,
    vatId: opt(p.vatId)?.replace(/\s/g, '').toUpperCase(),
    taxNumber: seller ? opt(p.taxNumber) : undefined,
    electronicAddress: opt(p.eAddress) || opt(p.email) ? { id: t(p.eAddress) || t(p.email), scheme: 'EM' } : undefined,
    address: { line1: opt(p.street), city: opt(p.city), postcode: opt(p.postcode), country: t(p.country).toUpperCase() || 'DE' },
    contact: opt(p.contactName) || opt(p.phone) || opt(p.email) ? { name: opt(p.contactName), phone: opt(p.phone), email: opt(p.email) } : undefined,
  };
}

function fromParty(p: Party): PartyData {
  return {
    name: p.name,
    street: p.address.line1 ?? '',
    postcode: p.address.postcode ?? '',
    city: p.address.city ?? '',
    country: p.address.country,
    vatId: p.vatId ?? '',
    taxNumber: p.taxNumber ?? '',
    registration: p.legalRegistrationId?.id ?? '',
    contactName: p.contact?.name ?? '',
    phone: p.contact?.phone ?? '',
    email: p.contact?.email ?? '',
    eAddress: p.electronicAddress?.scheme === 'EM' && p.electronicAddress.id !== p.contact?.email ? p.electronicAddress.id : '',
    identifier: p.identifiers[0]?.id ?? '',
  };
}

/** Converts the form into an EN 16931 draft for the chosen output. */
export function toDraft(f: FormState): InvoiceDraft {
  const category = TAX_CATEGORY[f.taxCase];
  const rate = (r: string) => (category === 'S' ? num(r) || '0' : '0');
  const code = DOC_TYPES.find((d) => d.id === f.docType)?.code ?? '380';
  const lines: LineDraft[] = f.lines
    .filter((l) => t(l.name) || t(l.price))
    .map((l, i) => {
      const discount = num(l.discountPct);
      return {
        id: String(i + 1),
        quantity: num(l.quantity) || '0',
        unitCode: l.unitCode || 'C62',
        price: { net: num(l.price) || '0' },
        vat: { category, rate: rate(l.vatRate) },
        item: { name: t(l.name) || '–', description: opt(l.description) },
        allowances: discount && Number(discount) !== 0 ? [{ amount: '', percentage: discount, reason: 'Rabatt', reasonCode: '95' }] : [],
      };
    });
  const ac = (a: FormAc): AllowanceCharge => ({
    amount: num(a.amount) || '0',
    reason: t(a.reason) || (a.kind === 'allowance' ? 'Nachlass' : 'Zuschlag'),
    reasonCode: a.kind === 'allowance' ? '95' : 'ZZZ',
    vatCategory: category,
    vatRate: rate(a.vatRate),
  });
  const seller = toParty(f.seller, true);
  const buyer = toParty(f.buyer, false);
  const xrechnung = f.output !== 'zugferd';
  const needsPreceding = ['final', 'credit', 'cancellation', 'corrected'].includes(f.docType);
  const notes = [
    ...(f.taxCase === 'reverse' ? [{ text: 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.' }] : []),
    ...(opt(f.note) ? [{ text: t(f.note) }] : []),
  ];
  return {
    specification: xrechnung ? SPEC.XRECHNUNG : SPEC.EN16931,
    businessProcess: DEFAULT_BUSINESS_PROCESS,
    number: t(f.number),
    issueDate: f.issueDate,
    typeCode: code,
    currency: t(f.currency).toUpperCase() || 'EUR',
    dueDate: opt(f.dueDate),
    buyerReference: opt(f.buyerReference),
    purchaseOrderReference: opt(f.orderReference),
    paymentTerms: opt(f.paymentTerms),
    notes,
    precedingInvoices: needsPreceding && opt(f.precedingNumber) ? [{ number: t(f.precedingNumber), issueDate: opt(f.precedingDate) }] : [],
    seller,
    buyer,
    delivery:
      opt(f.deliveryDate) || f.taxCase === 'ic'
        ? {
            date: opt(f.deliveryDate),
            address: f.taxCase === 'ic' ? { ...buyer.address } : undefined,
          }
        : undefined,
    invoicingPeriod: opt(f.periodStart) || opt(f.periodEnd) ? { start: opt(f.periodStart), end: opt(f.periodEnd) } : undefined,
    payment: {
      meansCode: '58',
      remittanceInfo: opt(f.number),
      creditTransfers: opt(f.iban) ? [{ iban: t(f.iban).replace(/\s/g, '').toUpperCase(), name: opt(f.accountName), bic: opt(f.bic) }] : [],
    },
    allowances: f.acs.filter((a) => a.kind === 'allowance').map(ac),
    charges: f.acs.filter((a) => a.kind === 'charge').map(ac),
    attachments: [],
    lines,
    prepaid: f.docType === 'final' ? opt(num(f.prepaid)) : undefined,
  };
}

const KIND_TO_DOC: Partial<Record<ExampleKind, DocType>> = {
  prepayment: 'prepayment',
  final: 'final',
  'credit-note': 'credit',
  cancellation: 'cancellation',
};
const KIND_TO_TAX: Partial<Record<ExampleKind, TaxCase>> = {
  'small-business': 'small',
  'reverse-charge': 'reverse',
  'intra-community': 'ic',
};

/** Fills the form with one of the built-in fictitious examples. */
export function formFromExample(kind: ExampleKind, base: FormState): FormState {
  const d = exampleDraft(kind, today());
  const pay = d.payment?.creditTransfers[0];
  return {
    ...base,
    docType: KIND_TO_DOC[kind] ?? 'invoice',
    taxCase: KIND_TO_TAX[kind] ?? 'standard',
    number: d.number,
    issueDate: d.issueDate,
    dueDate: d.dueDate ?? '',
    deliveryDate: d.delivery?.date ?? '',
    periodStart: d.invoicingPeriod?.start ?? '',
    periodEnd: d.invoicingPeriod?.end ?? '',
    currency: d.currency,
    buyerReference: d.buyerReference ?? '',
    orderReference: d.purchaseOrderReference ?? '',
    precedingNumber: d.precedingInvoices[0]?.number ?? '',
    precedingDate: d.precedingInvoices[0]?.issueDate ?? '',
    prepaid: d.prepaid ?? '',
    note: d.notes.filter((n) => !n.text.includes('§ 13b')).map((n) => n.text).join('\n'),
    paymentTerms: d.paymentTerms ?? '',
    seller: fromParty(d.seller),
    buyer: fromParty(d.buyer),
    iban: pay?.iban ?? '',
    bic: pay?.bic ?? '',
    accountName: pay?.name ?? '',
    lines: d.lines.map((l) => ({
      key: key(),
      name: l.item.name,
      description: l.item.description ?? '',
      quantity: l.quantity,
      unitCode: l.unitCode,
      price: l.price.net,
      vatRate: l.vat.rate ?? '0',
      discountPct: l.allowances?.[0]?.percentage ?? '',
    })),
    acs: [
      ...d.allowances.map((a) => ({ key: key(), kind: 'allowance' as const, reason: a.reason ?? '', amount: a.amount, vatRate: a.vatRate ?? '19' })),
      ...d.charges.map((c) => ({ key: key(), kind: 'charge' as const, reason: c.reason ?? '', amount: c.amount, vatRate: c.vatRate ?? '19' })),
    ],
    output: kind === 'public-sector' ? 'xrechnung-cii' : base.output,
  };
}
