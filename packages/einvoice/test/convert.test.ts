// SPDX-License-Identifier: MIT
import { basename } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCii,
  buildUbl,
  convertInvoice,
  exampleDraft,
  finalize,
  parseInvoice,
  parseXmlInvoice,
  profileOf,
  SPEC,
  type Invoice,
} from '../src';
import { loadDefaultFonts } from '../src/node';
import { fixtureFiles, read } from './helpers';

/** EN 16931 mandatory business terms (and the groups that contain them). */
function mandatory(inv: Invoice) {
  return {
    number: inv.number,
    issueDate: inv.issueDate,
    typeCode: inv.typeCode,
    currency: inv.currency,
    specification: inv.specification,
    seller: { name: inv.seller.name, country: inv.seller.address.country, vatId: inv.seller.vatId },
    buyer: { name: inv.buyer.name, country: inv.buyer.address.country },
    totals: { ...inv.totals },
    vat: inv.vatBreakdown.map((v) => ({ category: v.category, rate: v.rate, base: v.taxableAmount, tax: v.taxAmount })),
    lines: inv.lines.map((l) => ({
      id: l.id,
      qty: l.quantity,
      unit: l.unitCode,
      net: l.netAmount,
      price: l.price.net,
      vat: l.vat,
      name: l.item.name,
    })),
    payment: inv.payment?.meansCode,
  };
}

const standard = fixtureFiles('kosit').filter((f) => /standard__.*uncefact/.test(f));

describe('roundtrip CII -> UBL -> CII', () => {
  it.each(standard.map((f) => [basename(f), f]))('%s keeps all mandatory fields', async (_n, file) => {
    const original = (await parseInvoice(read(file))).invoice;
    const ubl = buildUbl(original);
    const viaUbl = parseXmlInvoice(ubl).invoice;
    const back = parseXmlInvoice(buildCii(viaUbl)).invoice;
    expect(mandatory(viaUbl)).toEqual(mandatory(original));
    expect(mandatory(back)).toEqual(mandatory(original));
  });

  it('keeps the complete model for the built-in examples', () => {
    for (const kind of ['standard', 'allowances', 'public-sector', 'credit-note', 'final'] as const) {
      const inv = parseXmlInvoice(buildCii(finalize(exampleDraft(kind)))).invoice;
      const back = parseXmlInvoice(buildCii(parseXmlInvoice(buildUbl(inv)).invoice)).invoice;
      expect(back).toEqual(inv);
    }
  });
});

describe('convertInvoice', () => {
  let fonts: Awaited<ReturnType<typeof loadDefaultFonts>>;
  beforeAll(async () => {
    fonts = await loadDefaultFonts();
  });

  it('converts XRechnung UBL to ZUGFeRD EN 16931 and back to XRechnung CII', async () => {
    const xr = buildUbl(finalize(exampleDraft('standard')));
    const pdf = await convertInvoice(xr, 'ZUGFERD', { fonts });
    expect(pdf.mimeType).toBe('application/pdf');
    expect(pdf.warnings.join()).toMatch(/SPEC/);
    const parsed = await parseInvoice(pdf.data as Uint8Array);
    expect(parsed.profile).toBe('EN 16931');
    const back = await convertInvoice(pdf.data as Uint8Array, 'XRECHNUNG-CII');
    expect(profileOf(parseXmlInvoice(back.data as string).invoice.specification)).toBe('XRECHNUNG');
    expect(back.filename).toMatch(/xrechnung-cii\.xml$/);
  });

  it('converts CII to UBL and keeps the specification', async () => {
    const cii = buildCii({ ...finalize(exampleDraft('standard')), specification: SPEC.EN16931 });
    const ubl = await convertInvoice(cii, 'UBL');
    expect(parseXmlInvoice(ubl.data as string).invoice.specification).toBe(SPEC.EN16931);
    expect(ubl.warnings).toEqual([]);
    const back = await convertInvoice(ubl.data as string, 'CII');
    expect(back.filename).toMatch(/-cii\.xml$/);
  });

  it('refuses MINIMUM profiles and warns for EXTENDED', async () => {
    const z = fixtureFiles('zugferd', /\.pdf$/);
    await expect(convertInvoice(read(z.find((f) => f.includes('MINIMUM'))!), 'UBL')).rejects.toThrow(/PROFILE/);
    const ext = await convertInvoice(read(z.find((f) => f.includes('X04'))!), 'UBL');
    expect(ext.warnings.join()).toMatch(/EXTENDED/);
  });

  it('needs fonts for PDF output', async () => {
    await expect(convertInvoice(buildCii(finalize(exampleDraft('standard'))), 'ZUGFERD')).rejects.toThrow(/PDF/);
  });
});
