// SPDX-License-Identifier: MIT
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFStream,
  decodePDFRawStream,
  type PDFObject,
} from 'pdf-lib';
import { EInvoiceError } from '../errors';

export interface EmbeddedFile {
  name: string;
  relationship?: string;
  data: Uint8Array;
}

/** File names used by ZUGFeRD 1/2, Factur-X and XRechnung-in-PDF, in order of preference. */
export const INVOICE_ATTACHMENT_NAMES = ['factur-x.xml', 'xrechnung.xml', 'zugferd-invoice.xml', 'ZUGFeRD-invoice.xml'];

function decodeName(obj: PDFObject | undefined): string | undefined {
  if (!obj) return undefined;
  const o = obj as unknown as { decodeText?: () => string; asString?: () => string };
  if (typeof o.decodeText === 'function') return o.decodeText();
  if (typeof o.asString === 'function') return o.asString();
  return obj.toString().replace(/^\(|\)$/g, '');
}

function readFileSpec(doc: PDFDocument, spec: PDFDict): EmbeddedFile | undefined {
  const name = decodeName(spec.lookup(PDFName.of('UF'))) ?? decodeName(spec.lookup(PDFName.of('F')));
  const ef = spec.lookup(PDFName.of('EF'));
  if (!(ef instanceof PDFDict) || !name) return undefined;
  const stream = ef.lookup(PDFName.of('F')) ?? ef.lookup(PDFName.of('UF'));
  if (!(stream instanceof PDFStream)) return undefined;
  const data = stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents();
  const rel = spec.lookup(PDFName.of('AFRelationship'));
  void doc;
  return { name, data, relationship: rel instanceof PDFName ? rel.decodeText() : undefined };
}

function walkNameTree(doc: PDFDocument, node: PDFDict, out: EmbeddedFile[], depth = 0): void {
  if (depth > 32) return;
  const names = node.lookup(PDFName.of('Names'));
  if (names instanceof PDFArray) {
    for (let i = 1; i < names.size(); i += 2) {
      const spec = names.lookup(i);
      if (spec instanceof PDFDict) {
        const f = readFileSpec(doc, spec);
        if (f) out.push(f);
      }
    }
  }
  const children = node.lookup(PDFName.of('Kids'));
  if (children instanceof PDFArray) {
    for (let i = 0; i < children.size(); i++) {
      const k = children.lookup(i);
      if (k instanceof PDFDict) walkNameTree(doc, k, out, depth + 1);
    }
  }
}

/** Lists all embedded files of a PDF (EmbeddedFiles name tree and the /AF array). */
export async function listEmbeddedFiles(bytes: Uint8Array): Promise<EmbeddedFile[]> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  } catch (e) {
    throw new EInvoiceError('PDF_INVALID', `PDF could not be read: ${(e as Error).message}`);
  }
  const out: EmbeddedFile[] = [];
  const names = doc.catalog.lookup(PDFName.of('Names'));
  const tree = names instanceof PDFDict ? names.lookup(PDFName.of('EmbeddedFiles')) : undefined;
  if (tree instanceof PDFDict) walkNameTree(doc, tree, out);
  const af = doc.catalog.lookup(PDFName.of('AF'));
  if (af instanceof PDFArray) {
    for (let i = 0; i < af.size(); i++) {
      const spec = af.lookup(i);
      if (spec instanceof PDFDict) {
        const f = readFileSpec(doc, spec);
        if (f && !out.some((o) => o.name === f.name)) out.push(f);
      }
    }
  }
  return out;
}

/** Extracts the invoice XML embedded in a ZUGFeRD / Factur-X PDF. */
export async function extractInvoiceXml(bytes: Uint8Array): Promise<{ name: string; xml: string; relationship?: string }> {
  const files = await listEmbeddedFiles(bytes);
  const lower = (s: string) => s.toLowerCase();
  const hit =
    INVOICE_ATTACHMENT_NAMES.map((n) => files.find((f) => lower(f.name) === lower(n))).find(Boolean) ??
    files.find((f) => lower(f.name).endsWith('.xml'));
  if (!hit) throw new EInvoiceError('NO_EMBEDDED_XML', 'The PDF contains no embedded invoice XML');
  return { name: hit.name, xml: new TextDecoder('utf-8').decode(hit.data), relationship: hit.relationship };
}
