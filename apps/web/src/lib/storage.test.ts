// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { exportJson, parseImport } from './storage';

describe('master data import', () => {
  it('round trips an export', () => {
    const data = {
      senders: [{ id: 's1', party: { name: 'A', street: '', postcode: '', city: '', country: 'de', vatId: '', taxNumber: '', registration: '', contactName: '', phone: '', email: '', eAddress: '', identifier: '' }, iban: 'DE60', bic: '', accountName: '', layout: 'modern' as const }],
      customers: [],
      articles: [{ id: 'a1', name: 'X', description: '', unitCode: 'HUR', price: '85.00', vatRate: '19' }],
    };
    const back = parseImport(JSON.parse(exportJson(data)));
    expect(back.senders[0]?.party.country).toBe('DE');
    expect(back.articles[0]).toEqual(data.articles[0]);
  });

  it('rejects unknown formats and sanitises values', () => {
    expect(() => parseImport({ foo: 1 })).toThrow();
    expect(() => parseImport(null)).toThrow();
    const r = parseImport({
      format: 'einvoice-kit/masterdata',
      version: 1,
      senders: [{ logo: 'javascript:alert(1)', accent: 'red', party: { name: 'x'.repeat(1000) } }],
      articles: [{ price: '1e9; DROP', vatRate: 'abc' }],
    });
    expect(r.senders[0]?.logo).toBeUndefined();
    expect(r.senders[0]?.accent).toBeUndefined();
    expect(r.senders[0]?.party.name).toHaveLength(500);
    expect(r.articles[0]).toMatchObject({ price: '0', vatRate: '19', unitCode: 'C62' });
  });
});
