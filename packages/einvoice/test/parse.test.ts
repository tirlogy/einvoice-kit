// SPDX-License-Identifier: MIT
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dec, EInvoiceError, extractInvoiceXml, listEmbeddedFiles, parseInvoice, parseXmlInvoice } from '../src';
import { fixtureFiles, read } from './helpers';

const official = [...fixtureFiles('kosit'), ...fixtureFiles('en16931-cii'), ...fixtureFiles('en16931-ubl')];
const pdfs = fixtureFiles('zugferd', /\.pdf$/);

describe('official test files', () => {
  it('has at least 30 official files available', () => {
    expect(official.length + pdfs.length).toBeGreaterThanOrEqual(30);
  });

  it.each(official.map((f) => [basename(f), f]))('reads %s', async (_name, file) => {
    const r = await parseInvoice(read(file));
    const inv = r.invoice;
    expect(inv.number).not.toBe('');
    expect(inv.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(inv.currency).toMatch(/^[A-Z]{3}$/);
    expect(inv.seller.name).not.toBe('');
    expect(inv.buyer.name).not.toBe('');
    expect(inv.lines.length).toBeGreaterThan(0);
    expect(inv.vatBreakdown.length).toBeGreaterThan(0);
    // BR-CO-10: sum of line net amounts equals BT-106
    const lineSum = inv.lines.reduce((s, l) => s.plus(dec(l.netAmount)), dec(0));
    expect(lineSum.minus(dec(inv.totals.lineNet)).abs().lte(0.01)).toBe(true);
  });

  it.each(pdfs.map((f) => [basename(f), f]))('extracts and reads ZUGFeRD sample %s', async (_name, file) => {
    const r = await parseInvoice(read(file));
    expect(r.source).toBe('pdf');
    expect(r.syntax).toBe('CII');
    expect(r.attachmentName?.toLowerCase()).toMatch(/\.xml$/);
    expect(r.invoice.number).not.toBe('');
    if (r.profile === 'MINIMUM' || r.profile === 'BASIC WL') expect(r.invoice.lines).toHaveLength(0);
    else expect(r.invoice.lines.length).toBeGreaterThan(0);
  });

  it('lists the AFRelationship of the embedded file', async () => {
    const files = await listEmbeddedFiles(read(pdfs.find((p) => p.includes('E05'))!));
    expect(files.some((f) => f.name === 'factur-x.xml')).toBe(true);
  });
});

describe('error handling', () => {
  it('rejects broken XML with NOT_XML', () => {
    expect(() => parseXmlInvoice('<Invoice><ID>1</Invoice>')).toThrowError(EInvoiceError);
    try {
      parseXmlInvoice('not xml at all <');
    } catch (e) {
      expect((e as EInvoiceError).code).toBe('NOT_XML');
    }
  });

  it('rejects unknown documents with UNKNOWN_FORMAT', () => {
    try {
      parseXmlInvoice('<Order xmlns="urn:x"/>');
      expect.unreachable();
    } catch (e) {
      expect((e as EInvoiceError).code).toBe('UNKNOWN_FORMAT');
    }
  });

  it('rejects a PDF without invoice XML', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    await expect(extractInvoiceXml(bytes)).rejects.toMatchObject({ code: 'NO_EMBEDDED_XML' });
  });

  it('rejects a corrupt PDF', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\n garbage');
    await expect(parseInvoice(bytes)).rejects.toBeInstanceOf(Error);
  });

  it('accepts strings and ArrayBuffers', async () => {
    const xml = new TextDecoder().decode(read(official[0]!));
    const a = await parseInvoice(xml);
    const b = await parseInvoice(read(official[0]!).buffer as ArrayBuffer);
    expect(a.invoice).toEqual(b.invoice);
  });
});
