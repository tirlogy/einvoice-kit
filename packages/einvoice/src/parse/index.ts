// SPDX-License-Identifier: MIT
import { EInvoiceError } from '../errors';
import { profileOf, type Invoice, type Profile, type Syntax } from '../model';
import { compact, toBytes } from '../util';
import { parseXml, XmlParseError, type XEl } from '../xml';
import { parseCiiDocument } from './cii';
import { extractInvoiceXml } from './pdf';
import { parseUblDocument } from './ubl';

export interface ParseResult {
  invoice: Invoice;
  syntax: Syntax;
  profile: Profile;
  /** The invoice XML (extracted from the PDF when the input was a PDF). */
  xml: string;
  source: 'xml' | 'pdf';
  /** Name of the embedded file when the input was a PDF. */
  attachmentName?: string;
}

export function detectSyntax(root: XEl): Syntax | undefined {
  if (root.localName === 'CrossIndustryInvoice') return 'CII';
  if (root.localName === 'Invoice' || root.localName === 'CreditNote') return 'UBL';
  return undefined;
}

/** Parses CII or UBL XML into the normalised model. */
export function parseXmlInvoice(xml: string): { invoice: Invoice; syntax: Syntax } {
  let root: XEl;
  try {
    root = parseXml(xml);
  } catch (e) {
    throw new EInvoiceError('NOT_XML', e instanceof XmlParseError ? e.message : String(e));
  }
  const syntax = detectSyntax(root);
  if (!syntax) throw new EInvoiceError('UNKNOWN_FORMAT', `Unsupported root element <${root.localName}>`);
  const invoice = syntax === 'CII' ? parseCiiDocument(root) : parseUblDocument(root);
  return { invoice: compact(invoice), syntax };
}

const isPdf = (b: Uint8Array) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF

/** Parses a ZUGFeRD/Factur-X PDF, a CII XML or a UBL XML (auto detected). */
export async function parseInvoice(input: Uint8Array | ArrayBuffer | string): Promise<ParseResult> {
  if (typeof input !== 'string') {
    const bytes = toBytes(input);
    if (isPdf(bytes)) {
      const { name, xml } = await extractInvoiceXml(bytes);
      const { invoice, syntax } = parseXmlInvoice(xml);
      return { invoice, syntax, profile: profileOf(invoice.specification), xml, source: 'pdf', attachmentName: name };
    }
    input = new TextDecoder('utf-8').decode(bytes);
  }
  const { invoice, syntax } = parseXmlInvoice(input);
  return { invoice, syntax, profile: profileOf(invoice.specification), xml: input, source: 'xml' };
}
