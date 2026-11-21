// SPDX-License-Identifier: MIT
import type { Invoice } from '../model';
import type { Finding } from './index';

/** ISO 13616 IBAN check (mod 97). */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of digits) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

/** Leitweg-ID pattern: Grobadressierung(-Feinadressierung)-Prüfziffer. */
const LEITWEG = /^(\d{2,12})(-[A-Z0-9]{1,30})?-(\d{2})$/i;

export function looksLikeLeitwegId(value: string): boolean {
  return LEITWEG.test(value.trim());
}

/** Leitweg-ID check digits according to ISO/IEC 7064 MOD 97-10. */
export function isValidLeitwegId(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (!LEITWEG.test(v)) return false;
  const digits = v.replace(/-/g, '').replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of digits) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

/** German VAT identification number: DE + 9 digits. */
export function isPlausibleVatId(value: string): boolean {
  const v = value.replace(/\s+/g, '').toUpperCase();
  if (v.startsWith('DE')) return /^DE\d{9}$/.test(v);
  return /^[A-Z]{2}[A-Z0-9+*]{2,13}$/.test(v);
}

/** Own plausibility checks that the official Schematron does not cover. */
export function plausibility(inv: Invoice): Finding[] {
  const out: Finding[] = [];
  const add = (id: string, message: string, severity: Finding['severity'] = 'warning') =>
    out.push({ id, message, severity, source: 'plausibility' });

  for (const ct of inv.payment?.creditTransfers ?? []) {
    if (/^[A-Z]{2}\d{2}/i.test(ct.iban.replace(/\s/g, '')) && !isValidIban(ct.iban)) {
      add('PL-IBAN', `The IBAN ${ct.iban} has an invalid check sum (BT-84).`);
    }
  }
  if (inv.buyerReference && looksLikeLeitwegId(inv.buyerReference) && !isValidLeitwegId(inv.buyerReference)) {
    add('PL-LEITWEG', `The Leitweg-ID ${inv.buyerReference} has invalid check digits (BT-10).`);
  }
  if (inv.dueDate && inv.issueDate && inv.dueDate < inv.issueDate) {
    add('PL-DUEDATE', `The due date ${inv.dueDate} (BT-9) is before the invoice date ${inv.issueDate} (BT-2).`);
  }
  for (const [who, p] of [['seller', inv.seller], ['buyer', inv.buyer]] as const) {
    if (p.vatId && !isPlausibleVatId(p.vatId)) {
      add('PL-VATID', `The ${who} VAT ID ${p.vatId} does not match the expected format (${who === 'seller' ? 'BT-31' : 'BT-48'}).`);
    }
  }
  const e = inv.vatBreakdown.find((v) => v.category === 'E' && /§\s*19|kleinunternehm/i.test(v.exemptionReason ?? ''));
  if (e && inv.vatBreakdown.some((v) => v.category === 'S')) {
    add('PL-KLEINUNTERNEHMER', 'The invoice mixes exempt (E) and standard rated (S) items. Small businesses under § 19 UStG must not charge VAT.', 'info');
  }
  return out;
}
