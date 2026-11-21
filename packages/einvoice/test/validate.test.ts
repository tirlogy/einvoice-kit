// SPDX-License-Identifier: MIT
import { basename } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildCii,
  buildUbl,
  EXPLAINED_RULE_IDS,
  exampleDraft,
  explain,
  finalize,
  parseSvrl,
  validateInvoice,
  validateXml,
  type ValidateOptions,
} from '../src';
import { nodeValidateOptions } from '../src/node';
import { fixtureFiles, read } from './helpers';

let opts: ValidateOptions;
beforeAll(async () => {
  opts = await nodeValidateOptions();
});

const ids = (r: { findings: { id: string; severity: string }[] }, sev = 'error') =>
  r.findings.filter((f) => f.severity === sev).map((f) => f.id);

// positive KoSIT test cases; the CVD and extension scenarios use separate KoSIT configurations
const valid = [
  ...fixtureFiles('kosit').filter((f) => /(standard|cius)__/.test(f)),
  ...fixtureFiles('en16931-cii'),
  ...fixtureFiles('en16931-ubl').filter((f) => !/negativ/i.test(f)),
];

describe('valid official invoices', () => {
  it.each(valid.map((f) => [basename(f), f]))('%s has no errors', async (_n, file) => {
    const report = await validateInvoice(read(file), opts);
    expect(ids(report)).toEqual([]);
    expect(report.valid).toBe(true);
  });
});

describe('invalid invoices report the expected rule IDs', () => {
  const xr = () => finalize(exampleDraft('standard'));
  const cases: [string, (cii: string) => string, string[]][] = [
    ['missing invoice number', (x) => x.replace(/<ram:ID>RE-2026-0101<\/ram:ID>/, ''), ['BR-02']],
    ['wrong line total', (x) => x.replace('<ram:LineTotalAmount>1099.80</ram:LineTotalAmount>', '<ram:LineTotalAmount>1000.00</ram:LineTotalAmount>'), ['BR-CO-10']],
    ['wrong grand total', (x) => x.replace('<ram:GrandTotalAmount>1299.19</ram:GrandTotalAmount>', '<ram:GrandTotalAmount>1300.00</ram:GrandTotalAmount>'), ['BR-CO-15']],
    ['missing buyer reference', (x) => x.replace(/<ram:BuyerReference>[^<]*<\/ram:BuyerReference>/, ''), ['BR-DE-15']],
    ['missing seller phone', (x) => x.replace(/<ram:TelephoneUniversalCommunication>[\s\S]*?<\/ram:TelephoneUniversalCommunication>/, ''), ['BR-DE-6']],
    ['unknown currency', (x) => x.replace(/<ram:InvoiceCurrencyCode>EUR/, '<ram:InvoiceCurrencyCode>XXY'), ['BR-CL-04']],
  ];
  it.each(cases)('%s', async (_name, mutate, expected) => {
    const xml = mutate(buildCii(xr()));
    const report = await validateXml(xml, opts);
    for (const id of expected) expect(ids(report)).toContain(id);
    expect(report.valid).toBe(false);
  });

  it('detects a missing VAT exemption reason in UBL (BR-E-10)', async () => {
    const inv = finalize(exampleDraft('small-business'));
    const xml = buildUbl(inv).replace(/<cbc:TaxExemptionReason>[^<]*<\/cbc:TaxExemptionReason>/, '');
    expect(ids(await validateXml(xml, opts))).toContain('BR-E-10');
  });

  it('marks MINIMUM profiles as not valid in Germany', async () => {
    const pdf = fixtureFiles('zugferd', /\.pdf$/).find((f) => f.includes('MINIMUM'))!;
    const report = await validateInvoice(read(pdf), opts);
    expect(report.germanEInvoice).toBe(false);
    expect(report.valid).toBe(false);
    expect(ids(report, 'warning')).toContain('DE-PROFILE');
    expect(report.rulesApplied).toEqual([]);
  });

  it('applies only EN 16931 rules to plain EN 16931 invoices and notes EXTENDED scope', async () => {
    const pdf = fixtureFiles('zugferd', /\.pdf$/).find((f) => f.includes('X04'))!;
    const report = await validateInvoice(read(pdf), opts);
    expect(report.rulesApplied).toEqual(['en16931-cii']);
    expect(report.findings.some((f) => f.id === 'EXTENDED-SCOPE')).toBe(true);
  });

  it('can force XRechnung rules on a plain EN 16931 invoice', async () => {
    const xml = buildCii({ ...finalize(exampleDraft('standard')), specification: 'urn:cen.eu:en16931:2017' });
    const report = await validateXml(xml, { ...opts, xrechnung: true });
    expect(report.rulesApplied).toContain('xrechnung-cii');
    expect(report.findings.map((f) => f.id)).toContain('BR-DE-21');
  });

  it('reports unavailable rules with a stable code', async () => {
    const xml = buildCii(finalize(exampleDraft('standard')));
    await expect(validateXml(xml, { ...opts, loadRules: () => Promise.reject(new Error('offline')) })).rejects.toMatchObject({
      code: 'RULES_UNAVAILABLE',
    });
  });
});

describe('messages', () => {
  it('explains every curated rule in all three languages', () => {
    for (const id of EXPLAINED_RULE_IDS) {
      for (const lang of ['de', 'en', 'tr'] as const) expect(explain({ id }, lang)).toBeTruthy();
    }
  });
  it('falls back to rule families', () => {
    expect(explain({ id: 'BR-CL-99' }, 'de')).toMatch(/Codeliste/);
    expect(explain({ id: 'BR-AE-99' }, 'tr')).toMatch(/Reverse charge/);
    expect(explain({ id: 'CII-SR-001' }, 'en')).toMatch(/Syntax/);
    expect(explain({ id: 'XYZ' }, 'en')).toBeUndefined();
  });
  it('parses SVRL including flags', () => {
    const svrl = `<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">
      <svrl:failed-assert id="BR-01" flag="fatal" location="/a"><svrl:text>[BR-01]-x</svrl:text></svrl:failed-assert>
      <svrl:failed-assert flag="warning" location="/b"><svrl:text>[BR-CL-23]- y</svrl:text></svrl:failed-assert>
      <svrl:successful-report id="R" flag="information"><svrl:text>z</svrl:text></svrl:successful-report>
    </svrl:schematron-output>`;
    expect(parseSvrl(svrl, 'en16931-cii')).toEqual([
      { id: 'BR-01', severity: 'error', message: '[BR-01]-x', location: '/a', source: 'en16931-cii' },
      { id: 'BR-CL-23', severity: 'warning', message: '[BR-CL-23]- y', location: '/b', source: 'en16931-cii' },
      { id: 'R', severity: 'info', message: 'z', location: undefined, source: 'en16931-cii' },
    ]);
  });
});
