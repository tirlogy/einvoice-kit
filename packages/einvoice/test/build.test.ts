// SPDX-License-Identifier: MIT
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCii,
  buildUbl,
  buildZugferdPdf,
  EXAMPLE_KINDS,
  exampleDraft,
  finalize,
  parseInvoice,
  SPEC,
  validateXml,
  type ValidateOptions,
} from '../src';
import { loadDefaultFonts, nodeValidateOptions } from '../src/node';

const OUT = join(__dirname, '..', '..', '..', '.cache', 'generated');
let opts: ValidateOptions;
let fonts: Awaited<ReturnType<typeof loadDefaultFonts>>;

beforeAll(async () => {
  opts = await nodeValidateOptions();
  fonts = await loadDefaultFonts();
  mkdirSync(join(OUT, 'xrechnung'), { recursive: true });
  mkdirSync(join(OUT, 'zugferd'), { recursive: true });
});

const errors = (r: Awaited<ReturnType<typeof validateXml>>) =>
  r.findings.filter((f) => f.severity === 'error').map((f) => `${f.id}: ${f.message}`);

describe.each(EXAMPLE_KINDS)('special case %s', (kind) => {
  it('builds valid XRechnung CII and UBL', async () => {
    const inv = finalize(exampleDraft(kind));
    for (const [name, xml] of [['cii', buildCii(inv)], ['ubl', buildUbl(inv)]] as const) {
      writeFileSync(join(OUT, 'xrechnung', `${kind}-${name}.xml`), xml);
      const report = await validateXml(xml, opts);
      expect(report.rulesApplied).toContain(`xrechnung-${name}`);
      expect(errors(report)).toEqual([]);
      expect(report.valid).toBe(true);
    }
  });

  it('builds a ZUGFeRD EN 16931 PDF whose embedded XML is valid', async () => {
    const inv = finalize({ ...exampleDraft(kind), specification: SPEC.EN16931 });
    const pdf = await buildZugferdPdf(inv, {
      fonts,
      layout: kind.length % 2 ? 'modern' : 'classic',
      creationDate: new Date('2026-11-20T10:00:00Z'),
      cancellation: kind === 'cancellation',
    });
    writeFileSync(join(OUT, 'zugferd', `${kind}.pdf`), pdf);
    const parsed = await parseInvoice(pdf);
    expect(parsed.source).toBe('pdf');
    expect(parsed.attachmentName).toBe('factur-x.xml');
    expect(parsed.profile).toBe('EN 16931');
    expect(parsed.invoice.totals.payable).toBe(inv.totals.payable);
    const report = await validateXml(parsed.xml, opts);
    expect(errors(report)).toEqual([]);
  });
});
