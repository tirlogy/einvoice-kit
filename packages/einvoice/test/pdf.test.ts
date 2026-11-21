// SPDX-License-Identifier: MIT
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildZugferdPdf, exampleDraft, finalize, listEmbeddedFiles, parseInvoice } from '../src';
import { wrap } from '../src/build/pdf';
import { loadDefaultFonts } from '../src/node';

let fonts: Awaited<ReturnType<typeof loadDefaultFonts>>;
beforeAll(async () => {
  fonts = await loadDefaultFonts();
});

// 1x1 PNG and a tiny JPEG header are enough for pdf-lib
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

describe('buildZugferdPdf', () => {
  it('writes PDF/A-3 metadata, output intent and the Factur-X attachment', async () => {
    const inv = finalize(exampleDraft('standard'));
    const bytes = await buildZugferdPdf(inv, { fonts, creationDate: new Date('2026-11-20T00:00:00Z') });
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('<pdfaid:part>3</pdfaid:part>');
    expect(text).toContain('<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>');
    expect(text).toContain('/GTS_PDFA1');
    expect(text).toContain('/AFRelationship /Alternative');
    const files = await listEmbeddedFiles(bytes);
    expect(files.map((f) => [f.name, f.relationship])).toEqual([['factur-x.xml', 'Alternative']]);
  });

  it('uses xrechnung.xml for the XRECHNUNG profile, embeds a logo and supports languages', async () => {
    const inv = finalize(exampleDraft('public-sector'));
    for (const lang of ['de', 'en', 'tr'] as const) {
      const bytes = await buildZugferdPdf(inv, { fonts, profile: 'XRECHNUNG', logo: PNG, layout: 'modern', accentColor: '#0a7d4f', lang });
      const r = await parseInvoice(bytes);
      expect(r.attachmentName).toBe('xrechnung.xml');
      expect(r.profile).toBe('XRECHNUNG');
    }
  });

  it('breaks long invoices into several pages', async () => {
    const d = exampleDraft('standard');
    d.notes = [{ text: 'Langer Hinweis '.repeat(40) }];
    d.lines = Array.from({ length: 60 }, (_, i) => ({
      id: String(i + 1),
      quantity: '1',
      unitCode: 'C62',
      price: { net: '1.00' },
      vat: { category: 'S' as const, rate: '19' },
      item: { name: `Artikel ${i + 1}`, description: 'Beschreibung mit etwas mehr Text, damit umgebrochen wird. '.repeat(2) },
      allowances: i === 0 ? [{ amount: '0.10', reason: 'Rabatt' }] : [],
      period: i === 1 ? { start: '2026-11-01', end: '2026-11-30' } : undefined,
    }));
    const bytes = await buildZugferdPdf(finalize(d), { fonts });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });

  it('wraps very long words', async () => {
    const doc = await PDFDocument.create();
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fonts.regular);
    const lines = wrap('kurz ' + 'X'.repeat(200), font, 10, 100);
    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(100);
  });
});
