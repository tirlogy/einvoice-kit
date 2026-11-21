// SPDX-License-Identifier: MIT
// Keeps the README example honest.
import { expect, it } from 'vitest';
import { buildCii, buildUbl, buildZugferdPdf, finalize, SPEC, validateXml } from '../src';
import { loadDefaultFonts, nodeValidateOptions } from '../src/node';

it('README example produces valid XRechnung and a ZUGFeRD PDF', async () => {
  const invoice = finalize({
    specification: SPEC.XRECHNUNG,
    number: 'RE-2026-0001',
    issueDate: '2026-11-21',
    typeCode: '380',
    currency: 'EUR',
    dueDate: '2026-12-05',
    buyerReference: '991-01234-38',
    notes: [],
    precedingInvoices: [],
    seller: {
      name: 'Muster GmbH', identifiers: [], vatId: 'DE123456789',
      electronicAddress: { id: 'rechnung@muster.example', scheme: 'EM' },
      address: { line1: 'Hauptstr. 1', postcode: '12345', city: 'Musterstadt', country: 'DE' },
      contact: { name: 'Alex Beispiel', phone: '+49 30 123456', email: 'alex@muster.example' },
    },
    buyer: {
      name: 'Stadt Beispiel', identifiers: [],
      electronicAddress: { id: '991-01234-38', scheme: '0204' },
      address: { line1: 'Rathausplatz 1', postcode: '99999', city: 'Beispiel', country: 'DE' },
    },
    delivery: { date: '2026-11-20' },
    payment: { meansCode: '58', creditTransfers: [{ iban: 'DE60123456780012345678' }] },
    allowances: [],
    charges: [],
    attachments: [],
    lines: [{ id: '1', quantity: '8', unitCode: 'HUR', price: { net: '95.00' }, vat: { category: 'S', rate: '19' }, item: { name: 'Beratung' } }],
  });
  const opts = await nodeValidateOptions();
  for (const xml of [buildCii(invoice), buildUbl(invoice)]) {
    const r = await validateXml(xml, opts);
    expect(r.findings.filter((f) => f.severity === 'error')).toEqual([]);
  }
  const pdf = await buildZugferdPdf({ ...invoice, specification: SPEC.EN16931 }, { fonts: await loadDefaultFonts(), layout: 'modern', accentColor: '#1c549e', lang: 'de' });
  expect(pdf.length).toBeGreaterThan(10_000);
});
