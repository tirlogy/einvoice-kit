// SPDX-License-Identifier: MIT
import { buildCii } from './build/cii';
import { buildZugferdPdf, type PdfOptions } from './build/pdf';
import { buildUbl } from './build/ubl';
import { DEFAULT_BUSINESS_PROCESS, isGermanEInvoiceProfile, profileOf, SPEC, type Invoice } from './model';
import { parseInvoice } from './parse';

export type ConvertTarget = 'CII' | 'UBL' | 'XRECHNUNG-CII' | 'XRECHNUNG-UBL' | 'ZUGFERD';

export interface ConvertResult {
  data: Uint8Array | string;
  filename: string;
  mimeType: string;
  /** Notes about adjustments made during conversion (English, stable codes in brackets). */
  warnings: string[];
}

/** Sets BT-24 (and a default BT-23) for the target standard. */
export function withSpecification(inv: Invoice, target: ConvertTarget): Invoice {
  if (target === 'XRECHNUNG-CII' || target === 'XRECHNUNG-UBL') {
    return { ...inv, specification: SPEC.XRECHNUNG, businessProcess: inv.businessProcess ?? DEFAULT_BUSINESS_PROCESS };
  }
  if (target === 'ZUGFERD' || profileOf(inv.specification) === 'XRECHNUNG') {
    return { ...inv, specification: SPEC.EN16931 };
  }
  return inv;
}

/** Converts between XRechnung (CII/UBL), plain EN 16931 CII/UBL and ZUGFeRD EN 16931 PDF. */
export async function convertInvoice(
  input: Uint8Array | ArrayBuffer | string,
  target: ConvertTarget,
  pdf?: Omit<PdfOptions, 'xml' | 'profile'>,
): Promise<ConvertResult> {
  const { invoice, profile } = await parseInvoice(input);
  const warnings: string[] = [];
  if (!isGermanEInvoiceProfile(profile)) {
    throw new Error(`[PROFILE] Profile ${profile} has no line items and cannot be converted into an EN 16931 invoice.`);
  }
  if (profile === 'EXTENDED') {
    warnings.push('[EXTENDED] Elements beyond EN 16931 (EXTENDED profile) are not carried over.');
  }
  const inv = withSpecification(invoice, target);
  if (inv.specification !== invoice.specification) {
    warnings.push(`[SPEC] Specification identifier changed to ${inv.specification}.`);
  }
  const base = inv.number.replace(/[^\w.-]+/g, '_') || 'invoice';
  switch (target) {
    case 'CII':
    case 'XRECHNUNG-CII':
      return { data: buildCii(inv), filename: `${base}${target === 'CII' ? '-cii' : '-xrechnung-cii'}.xml`, mimeType: 'application/xml', warnings };
    case 'UBL':
    case 'XRECHNUNG-UBL':
      return { data: buildUbl(inv), filename: `${base}${target === 'UBL' ? '-ubl' : '-xrechnung-ubl'}.xml`, mimeType: 'application/xml', warnings };
    case 'ZUGFERD': {
      if (!pdf) throw new Error('[PDF] Fonts are required to build a ZUGFeRD PDF.');
      const data = await buildZugferdPdf(inv, { ...pdf, profile: 'EN 16931' });
      return { data, filename: `${base}-zugferd.pdf`, mimeType: 'application/pdf', warnings };
    }
  }
}
