// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { amount, computeLine, dec, exampleDraft, finalize, formatMoney, formatNumber, type LineDraft } from '../src';
import { plain } from '../src/decimal';

const l = (over: Partial<LineDraft> = {}): LineDraft => ({
  id: '1',
  quantity: '3',
  unitCode: 'C62',
  price: { net: '0.10' },
  vat: { category: 'S', rate: '19' },
  item: { name: 'x' },
  ...over,
});

describe('decimal', () => {
  it('avoids float errors', () => {
    expect(amount(dec('0.1').plus(dec('0.2')))).toBe('0.30');
    expect(amount(dec('1.005'))).toBe('1.01');
    expect(amount(dec('-1.005'))).toBe('-1.01');
    expect(plain('19.000')).toBe('19');
    expect(dec('abc').toString()).toBe('0');
    expect(dec(undefined).toString()).toBe('0');
    expect(dec(2.5).toString()).toBe('2.5');
  });
  it('formats money and numbers per locale', () => {
    expect(formatMoney('1234.5', 'EUR', 'de-DE')).toMatch(/1\.234,50\s€/);
    expect(formatMoney('1', 'XXX1', 'de-DE')).toBe('1.00 XXX1');
    expect(formatNumber('1.25', 'tr-TR')).toBe('1,25');
  });
});

describe('computeLine', () => {
  it('multiplies quantity and price', () => {
    expect(computeLine(l()).netAmount).toBe('0.30');
  });
  it('respects the price base quantity', () => {
    expect(computeLine(l({ quantity: '250', price: { net: '12.00', baseQuantity: '100' } })).netAmount).toBe('30.00');
  });
  it('applies percentage allowances and absolute charges', () => {
    const r = computeLine(
      l({ quantity: '10', price: { net: '10' }, allowances: [{ amount: '', percentage: '10' }], charges: [{ amount: '5' }] }),
    );
    expect(r.allowances[0]).toMatchObject({ amount: '10.00', baseAmount: '100.00' });
    expect(r.netAmount).toBe('95.00');
  });
  it('forces 0 % for exempt categories and no rate for O', () => {
    expect(computeLine(l({ vat: { category: 'E', rate: '19' } })).vat).toEqual({ category: 'E', rate: '0' });
    expect(computeLine(l({ vat: { category: 'O' } })).vat).toEqual({ category: 'O' });
  });
});

describe('finalize', () => {
  it('builds VAT breakdown per rate and totals', () => {
    const inv = finalize(exampleDraft('standard'));
    expect(inv.vatBreakdown).toEqual([
      { category: 'S', rate: '19', taxableAmount: '1020.00', taxAmount: '193.80' },
      { category: 'S', rate: '7', taxableAmount: '79.80', taxAmount: '5.59' },
    ]);
    expect(inv.totals).toEqual({ lineNet: '1099.80', taxExclusive: '1099.80', tax: '199.39', taxInclusive: '1299.19', payable: '1299.19' });
  });
  it('includes document allowances and charges in the right VAT group', () => {
    const inv = finalize(exampleDraft('allowances'));
    expect(inv.totals.allowances).toBe('20.00');
    expect(inv.totals.charges).toBe('9.90');
    const s19 = inv.vatBreakdown.find((v) => v.rate === '19')!;
    expect(s19.taxableAmount).toBe('1042.90');
  });
  it('subtracts prepaid amounts and adds rounding', () => {
    const inv = finalize({ ...exampleDraft('final'), rounding: '0.01' });
    expect(inv.totals).toMatchObject({ taxInclusive: '5950.00', prepaid: '1785.00', rounding: '0.01', payable: '4165.01' });
  });
  it('adds exemption reasons for 0 % categories', () => {
    expect(finalize(exampleDraft('reverse-charge')).vatBreakdown[0]).toMatchObject({
      category: 'AE',
      taxAmount: '0.00',
      exemptionReasonCode: 'VATEX-EU-AE',
    });
    expect(finalize(exampleDraft('small-business')).vatBreakdown[0]!.exemptionReason).toMatch(/§ 19 UStG/);
    const custom = finalize({ ...exampleDraft('intra-community'), exemptions: { K: { reason: 'Eigene Begründung' } } });
    expect(custom.vatBreakdown[0]).toMatchObject({ exemptionReason: 'Eigene Begründung' });
  });
  it('handles O (not subject to VAT) without a rate', () => {
    const d = exampleDraft('standard');
    d.lines = [l({ vat: { category: 'O' } })];
    d.allowances = [{ amount: '0.10', reason: 'x', vatCategory: 'O' }];
    const inv = finalize(d);
    expect(inv.vatBreakdown).toEqual([
      { category: 'O', taxableAmount: '0.20', taxAmount: '0.00', exemptionReason: 'Nicht im Inland steuerbare Leistung', exemptionReasonCode: 'VATEX-EU-O' },
    ]);
  });
});
