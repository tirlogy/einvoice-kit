// SPDX-License-Identifier: MIT
/**
 * Fictitious example invoices covering the special cases of German invoicing.
 * All names, addresses, IBANs and IDs are made up.
 */
import type { InvoiceDraft, LineDraft } from './calc';
import { DEFAULT_BUSINESS_PROCESS, SPEC, type Party } from './model';

export type ExampleKind =
  | 'standard'
  | 'small-business'
  | 'reverse-charge'
  | 'intra-community'
  | 'allowances'
  | 'prepayment'
  | 'final'
  | 'credit-note'
  | 'cancellation'
  | 'public-sector';

export const EXAMPLE_KINDS: ExampleKind[] = [
  'standard',
  'small-business',
  'reverse-charge',
  'intra-community',
  'allowances',
  'prepayment',
  'final',
  'credit-note',
  'cancellation',
  'public-sector',
];

export const EXAMPLE_SELLER: Party = {
  name: 'Lindenhof Webdesign GmbH',
  identifiers: [],
  legalRegistrationId: { id: 'HRB 12345' },
  vatId: 'DE123456789',
  legalInfo: 'Sitz Musterstadt, Amtsgericht Musterstadt HRB 12345, Geschäftsführung: Alex Beispiel',
  electronicAddress: { id: 'rechnung@lindenhof-web.example', scheme: 'EM' },
  address: { line1: 'Lindenallee 12', city: 'Musterstadt', postcode: '12345', country: 'DE' },
  contact: { name: 'Alex Beispiel', phone: '+49 30 1234567', email: 'buchhaltung@lindenhof-web.example' },
};

export const EXAMPLE_BUYER: Party = {
  name: 'Bäckerei Sonnenschein KG',
  identifiers: [{ id: 'K-1007' }],
  vatId: 'DE987654321',
  electronicAddress: { id: 'einkauf@sonnenschein.example', scheme: 'EM' },
  address: { line1: 'Marktplatz 3', city: 'Beispielhausen', postcode: '54321', country: 'DE' },
  contact: { name: 'Kim Sonnenschein', email: 'einkauf@sonnenschein.example' },
};

const line = (id: string, name: string, quantity: string, unitCode: string, price: string, rate = '19', extra: Partial<LineDraft> = {}): LineDraft => ({
  id,
  quantity,
  unitCode,
  price: { net: price },
  vat: { category: 'S', rate },
  item: { name },
  ...extra,
});

/** Returns a fresh draft for the given special case (dates relative to `today`). */
export function exampleDraft(kind: ExampleKind, today = '2026-11-20'): InvoiceDraft {
  const due = addDays(today, 14);
  const base: InvoiceDraft = {
    specification: SPEC.XRECHNUNG,
    businessProcess: DEFAULT_BUSINESS_PROCESS,
    number: `RE-2026-${String(EXAMPLE_KINDS.indexOf(kind) + 101).padStart(4, '0')}`,
    issueDate: today,
    typeCode: '380',
    currency: 'EUR',
    dueDate: due,
    buyerReference: 'K-1007',
    paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.',
    notes: [],
    precedingInvoices: [],
    seller: structuredClone(EXAMPLE_SELLER),
    buyer: structuredClone(EXAMPLE_BUYER),
    delivery: { date: addDays(today, -3) },
    payment: {
      meansCode: '58',
      remittanceInfo: undefined,
      creditTransfers: [{ iban: 'DE60123456780012345678', name: 'Lindenhof Webdesign GmbH', bic: 'BEISDEXXXXX' }],
    },
    allowances: [],
    charges: [],
    attachments: [],
    lines: [
      line('1', 'Webdesign Startseite', '12', 'HUR', '85.00'),
      line('2', 'Fachbuch Barrierefreiheit', '2', 'C62', '39.90', '7'),
    ],
  };
  base.payment!.remittanceInfo = base.number;

  switch (kind) {
    case 'standard':
      return base;
    case 'small-business':
      return {
        ...base,
        seller: { ...base.seller, name: 'Fotostudio Abendrot', identifiers: [{ id: 'LIEF-2040' }], vatId: undefined, taxNumber: '12/345/67890', legalRegistrationId: undefined, legalInfo: undefined },
        lines: [
          line('1', 'Fotoshooting Produktbilder', '1', 'LS', '450.00', '0', { vat: { category: 'E' } }),
          line('2', 'Bildbearbeitung', '3', 'HUR', '45.00', '0', { vat: { category: 'E' } }),
        ],
      };
    case 'reverse-charge':
      return {
        ...base,
        notes: [{ text: 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG.' }],
        lines: [line('1', 'Dachdeckerarbeiten nach Aufmaß', '120', 'MTK', '38.50', '0', { vat: { category: 'AE' } })],
      };
    case 'intra-community':
      return {
        ...base,
        buyer: {
          ...base.buyer,
          name: 'Atelier Lumière SARL',
          vatId: 'FR12345678901',
          address: { line1: '8 Rue des Exemples', city: 'Lyon', postcode: '69001', country: 'FR' },
        },
        delivery: { date: addDays(today, -3), address: { line1: '8 Rue des Exemples', city: 'Lyon', postcode: '69001', country: 'FR' } },
        lines: [line('1', 'Designerleuchte Modell Linde', '4', 'C62', '310.00', '0', { vat: { category: 'K' } })],
      };
    case 'allowances':
      return {
        ...base,
        lines: [
          line('1', 'Webdesign Startseite', '12', 'HUR', '85.00', '19', {
            allowances: [{ amount: '', percentage: '10', reason: 'Stammkundenrabatt', reasonCode: '95' }],
          }),
          line('2', 'Express-Zuschlag Druck', '1', 'C62', '120.00', '19', {
            charges: [{ amount: '15.00', reason: 'Expresszuschlag', reasonCode: 'FC' }],
          }),
          line('3', 'Fachbuch Barrierefreiheit', '2', 'C62', '37.90', '7', { price: { net: '37.90', gross: '39.90', discount: '2.00' } }),
        ],
        allowances: [{ amount: '20.00', reason: 'Treuerabatt', reasonCode: '95', vatCategory: 'S', vatRate: '19' }],
        charges: [{ amount: '9.90', reason: 'Versandkosten', reasonCode: 'FC', vatCategory: 'S', vatRate: '19' }],
      };
    case 'prepayment':
      return {
        ...base,
        typeCode: '386',
        notes: [{ text: 'Anzahlung von 30 % auf das Angebot AN-2026-077.' }],
        lines: [line('1', 'Anzahlung Relaunch Website (30 %)', '1', 'LS', '1500.00')],
      };
    case 'final':
      return {
        ...base,
        notes: [{ text: 'Schlussrechnung zum Angebot AN-2026-077. Die Anzahlung wird verrechnet.' }],
        precedingInvoices: [{ number: 'RE-2026-0106', issueDate: addDays(today, -60) }],
        lines: [line('1', 'Relaunch Website gesamt', '1', 'LS', '5000.00')],
        prepaid: '1785.00',
      };
    case 'credit-note':
      return {
        ...base,
        typeCode: '381',
        notes: [{ text: 'Gutschrift für die Reklamation vom 10.11.2026.' }],
        precedingInvoices: [{ number: 'RE-2026-0101', issueDate: addDays(today, -20) }],
        paymentTerms: 'Der Betrag wird Ihrem Konto gutgeschrieben.',
        lines: [line('1', 'Gutschrift Fachbuch (beschädigt)', '1', 'C62', '39.90', '7')],
      };
    case 'cancellation':
      return {
        ...base,
        typeCode: '381',
        notes: [{ text: 'Storno der Rechnung RE-2026-0101 vom 31.10.2026.' }],
        precedingInvoices: [{ number: 'RE-2026-0101', issueDate: addDays(today, -20) }],
        paymentTerms: 'Die Rechnung RE-2026-0101 wird vollständig storniert.',
      };
    case 'public-sector':
      return {
        ...base,
        buyerReference: '991-01234-38',
        buyer: {
          name: 'Stadtverwaltung Beispielstadt',
          identifiers: [],
          electronicAddress: { id: '991-01234-38', scheme: '0204' },
          address: { line1: 'Rathausplatz 1', city: 'Beispielstadt', postcode: '99999', country: 'DE' },
          contact: { name: 'Amt für Digitales' },
        },
        purchaseOrderReference: 'BEST-2026-4711',
        invoicingPeriod: { start: addDays(today, -30), end: today },
        delivery: undefined,
        lines: [line('1', 'Barrierefreiheitsprüfung Bürgerportal', '16', 'HUR', '95.00')],
      };
  }
}

/** Adds days to an ISO date (UTC). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
