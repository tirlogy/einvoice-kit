// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import {
  addDays,
  compact,
  documentTitle,
  exampleDraft,
  finalize,
  isCreditNote,
  isGermanEInvoiceProfile,
  isPlausibleVatId,
  isValidIban,
  isValidLeitwegId,
  label,
  profileOf,
  SPEC,
  unitName,
} from '../src';
import { plausibility } from '../src/validate/plausibility';
import { base64Decode, base64Encode } from '../src/util';
import { escapeXml, fromCiiDate, parseXml, serialize, T } from '../src/xml';

describe('plausibility helpers', () => {
  it('checks IBANs', () => {
    expect(isValidIban('DE60 1234 5678 0012 3456 78')).toBe(true);
    expect(isValidIban('DE61123456780012345678')).toBe(false);
    expect(isValidIban('nope')).toBe(false);
  });
  it('checks Leitweg-IDs', () => {
    expect(isValidLeitwegId('991-01234-38')).toBe(true);
    expect(isValidLeitwegId('991-33333TEST-33')).toBe(true);
    expect(isValidLeitwegId('04011000-12345-34')).toBe(false);
    expect(isValidLeitwegId('Leitweg-ID')).toBe(false);
  });
  it('checks VAT IDs', () => {
    expect(isPlausibleVatId('DE123456789')).toBe(true);
    expect(isPlausibleVatId('DE12345ABC')).toBe(false);
    expect(isPlausibleVatId('ATU12345678')).toBe(true);
  });
  it('reports findings for a sloppy invoice', () => {
    const inv = finalize(exampleDraft('standard'));
    inv.payment!.creditTransfers[0]!.iban = 'DE00123456780012345678';
    inv.buyerReference = '991-01234-39';
    inv.dueDate = '2020-01-01';
    inv.seller.vatId = 'DE12';
    inv.vatBreakdown.push({ category: 'E', taxableAmount: '1', taxAmount: '0', exemptionReason: 'Kleinunternehmer § 19 UStG' });
    expect(plausibility(inv).map((f) => f.id)).toEqual(['PL-IBAN', 'PL-LEITWEG', 'PL-DUEDATE', 'PL-VATID', 'PL-KLEINUNTERNEHMER']);
  });
});

describe('model helpers', () => {
  it('derives profiles', () => {
    expect(profileOf(SPEC.XRECHNUNG)).toBe('XRECHNUNG');
    expect(profileOf(SPEC.FACTURX_MINIMUM)).toBe('MINIMUM');
    expect(profileOf(SPEC.FACTURX_BASICWL)).toBe('BASIC WL');
    expect(profileOf(SPEC.FACTURX_BASIC)).toBe('BASIC');
    expect(profileOf(SPEC.FACTURX_EXTENDED)).toBe('EXTENDED');
    expect(profileOf(SPEC.EN16931)).toBe('EN 16931');
    expect(isGermanEInvoiceProfile('BASIC WL')).toBe(false);
    expect(isCreditNote('381')).toBe(true);
    expect(isCreditNote('380')).toBe(false);
  });
  it('labels documents and units', () => {
    expect(documentTitle('386', 'de')).toBe('Anzahlungsrechnung');
    expect(documentTitle('381', 'tr', true)).toBe('İptal faturası');
    expect(documentTitle('999', 'en')).toBe('Invoice');
    expect(unitName('HUR', 'tr')).toBe('saat');
    expect(unitName('XYZ', 'de')).toBe('XYZ');
    expect(label('de', 'page', { n: '1', total: '2' })).toBe('Seite 1 von 2');
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });
});

describe('xml and util', () => {
  it('escapes and strips invalid characters', () => {
    expect(escapeXml('a<b>&"\u0001')).toBe('a&lt;b&gt;&amp;&quot;');
  });
  it('serialises attributes and skips empty ones', () => {
    expect(serialize(T('x', '1', { a: 'b', c: undefined })!)).toBe('<x a="b">1</x>');
    expect(T('x', '')).toBeUndefined();
  });
  it('converts CII dates', () => {
    expect(fromCiiDate('20261120')).toBe('2026-11-20');
    expect(fromCiiDate('2026-11-20')).toBe('2026-11-20');
    expect(fromCiiDate(undefined)).toBeUndefined();
  });
  it('does not resolve external entities', () => {
    const xml = '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>';
    let content: string;
    try {
      content = parseXml(xml).textContent ?? '';
    } catch {
      content = '';
    }
    expect(content).not.toMatch(/root:/);
  });
  it('compacts objects but keeps arrays', () => {
    expect(compact({ a: undefined, b: '', c: { d: undefined }, e: [], f: 0 })).toEqual({ e: [], f: 0 });
  });
  it('round trips base64', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    expect(base64Decode(base64Encode(bytes))).toEqual(bytes);
  });
});
