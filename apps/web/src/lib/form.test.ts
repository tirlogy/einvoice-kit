// SPDX-License-Identifier: MIT
import { finalize } from '@core/calc';
import { SPEC } from '@core/model';
import { describe, expect, it } from 'vitest';
import { emptyForm, formFromExample, num, toDraft } from './form';

describe('form mapping', () => {
  it('parses German decimal input', () => {
    expect(num('1.234,50')).toBe('1234.50');
    expect(num('39,90')).toBe('39.90');
    expect(num(' 85.00 ')).toBe('85.00');
  });

  it('maps every example to a draft whose totals match the example', () => {
    for (const kind of ['standard', 'allowances', 'final', 'small-business', 'reverse-charge', 'intra-community', 'credit-note', 'cancellation', 'public-sector', 'prepayment'] as const) {
      const f = formFromExample(kind, emptyForm());
      const inv = finalize(toDraft(f));
      expect(inv.lines.length).toBeGreaterThan(0);
      expect(Number(inv.totals.payable)).not.toBeNaN();
    }
  });

  it('sets the tax category, notes and specification from the tax case and output', () => {
    const f = { ...formFromExample('standard', emptyForm()), taxCase: 'reverse' as const, output: 'xrechnung-ubl' as const };
    const d = toDraft(f);
    expect(d.specification).toBe(SPEC.XRECHNUNG);
    expect(d.lines.every((l) => l.vat.category === 'AE' && l.vat.rate === '0')).toBe(true);
    expect(d.notes[0]?.text).toMatch(/§ 13b/);
    const ic = toDraft({ ...f, taxCase: 'ic', output: 'zugferd' });
    expect(ic.specification).toBe(SPEC.EN16931);
    expect(ic.delivery?.address?.country).toBe('DE');
  });

  it('only keeps preceding invoices and prepaid amounts for the matching document types', () => {
    const base = { ...formFromExample('final', emptyForm()) };
    expect(toDraft(base).prepaid).toBe('1785.00');
    expect(toDraft(base).precedingInvoices).toHaveLength(1);
    const inv = toDraft({ ...base, docType: 'invoice' });
    expect(inv.prepaid).toBeUndefined();
    expect(inv.precedingInvoices).toHaveLength(0);
  });

  it('skips empty lines and adds line discounts', () => {
    const f = emptyForm();
    f.lines = [
      { ...f.lines[0]!, name: 'A', price: '100', discountPct: '10' },
      { ...f.lines[0]!, key: 'x', name: '', price: '' },
    ];
    const inv = finalize(toDraft(f));
    expect(inv.lines).toHaveLength(1);
    expect(inv.lines[0]!.netAmount).toBe('90.00');
  });
});
