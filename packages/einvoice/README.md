# @tirlogy/einvoice

Parse, validate, create and convert German and European e-invoices: **ZUGFeRD 2.x / Factur-X** (PDF/A-3 with embedded XML) and **XRechnung 3.0** (CII and UBL). Works in Node and in the browser, no server, no network calls with invoice data.

- Normalised model based on the EN 16931 business terms (BT-1 … BT-165)
- Parsers: CII (D16B), UBL 2.1 Invoice and CreditNote, ZUGFeRD/Factur-X PDF (`factur-x.xml`, `xrechnung.xml`, `zugferd-invoice.xml`)
- Builders: CII, UBL, ZUGFeRD PDF/A-3b (veraPDF clean, two layouts, logo, DE/EN/TR)
- Validation with the **official** EN 16931 (1.3.17) and XRechnung (3.0.2, Schematron 2.6.0) rules via SaxonJS, plus plausibility checks; explanations in DE/EN/TR
- Exact decimal arithmetic (big.js) with EN 16931 rounding

## Install

```bash
npm install @tirlogy/einvoice saxon-js
```

`saxon-js` is only needed for validation (optional peer dependency).

## Node

```ts
import { parseInvoice, convertInvoice } from '@tirlogy/einvoice';
import { validateFile, loadDefaultFonts } from '@tirlogy/einvoice/node';
import { readFile, writeFile } from 'node:fs/promises';

// read a ZUGFeRD PDF or an XRechnung XML
const { invoice, syntax, profile } = await parseInvoice(await readFile('invoice.pdf'));
console.log(invoice.number, invoice.totals.payable, syntax, profile);

// validate against EN 16931 (+ XRechnung if BT-24 says so)
const report = await validateFile('invoice.xml');
console.log(report.valid, report.counts, report.findings.map((f) => f.id));

// convert XRechnung to ZUGFeRD
const pdf = await convertInvoice(await readFile('xrechnung.xml'), 'ZUGFERD', { fonts: await loadDefaultFonts() });
await writeFile(pdf.filename, pdf.data);
```

## Create an invoice

```ts
import { finalize, buildCii, buildUbl, buildZugferdPdf, SPEC } from '@tirlogy/einvoice';
import { loadDefaultFonts } from '@tirlogy/einvoice/node';

const invoice = finalize({
  specification: SPEC.XRECHNUNG,
  number: 'RE-2026-0001',
  issueDate: '2026-11-21',
  typeCode: '380',
  currency: 'EUR',
  dueDate: '2026-12-05',
  buyerReference: '991-01234-38', // Leitweg-ID
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
  lines: [
    { id: '1', quantity: '8', unitCode: 'HUR', price: { net: '95.00' }, vat: { category: 'S', rate: '19' }, item: { name: 'Beratung' } },
  ],
});

const cii = buildCii(invoice);          // XRechnung CII
const ubl = buildUbl(invoice);          // XRechnung UBL
const pdf = await buildZugferdPdf({ ...invoice, specification: SPEC.EN16931 }, {
  fonts: await loadDefaultFonts(),
  layout: 'modern',
  accentColor: '#1c549e',
  lang: 'de',
});
```

`finalize` computes line amounts, VAT breakdown (BG-23) and totals (BG-22). VAT categories: `S` (standard), `E` (exempt, e.g. § 19 UStG), `AE` (reverse charge), `K` (intra-community), `G`, `O`, `Z`. Default exemption reasons are filled in automatically.

## Browser

Validation needs SaxonJS and the compiled rules. The rules ship in the package (`@tirlogy/einvoice/rules/*.sef.json`); serve them from your own origin and load SaxonJS (`SaxonJS2.rt.js`, see the Saxonica license) yourself:

```ts
import { validateInvoice } from '@tirlogy/einvoice';
import enCii from '@tirlogy/einvoice/rules/en16931-cii.sef.json?url'; // Vite

const report = await validateInvoice(bytes, {
  saxon: window.SaxonJS,
  loadRules: async (name) => (await fetch(urls[name])).json(),
});
```

Fonts for PDFs: `@tirlogy/einvoice/assets/OpenSans-Regular.ttf` and `OpenSans-Bold.ttf` (Apache-2.0).

## API overview

| Function | Purpose |
|---|---|
| `parseInvoice(input)` | PDF or XML → `{ invoice, syntax, profile, xml, source }` |
| `parseXmlInvoice(xml)` | CII/UBL string → `{ invoice, syntax }` |
| `extractInvoiceXml(pdf)`, `listEmbeddedFiles(pdf)` | read attachments of a PDF |
| `finalize(draft)` | compute totals and VAT breakdown |
| `buildCii`, `buildUbl`, `buildZugferdPdf` | create documents |
| `convertInvoice(input, target)` | `CII`, `UBL`, `XRECHNUNG-CII`, `XRECHNUNG-UBL`, `ZUGFERD` |
| `validateInvoice(input, opts)`, `validateXml(xml, opts)` | official rules + plausibility → `ValidationReport` |
| `explain(finding, lang)` | plain language explanation (`de`, `en`, `tr`) |
| `isValidIban`, `isValidLeitwegId`, `isPlausibleVatId` | helpers |
| `exampleDraft(kind)` | fictitious examples for all special cases |

Errors carry a stable `code` (`NOT_XML`, `UNKNOWN_FORMAT`, `PDF_INVALID`, `NO_EMBEDDED_XML`, `RULES_UNAVAILABLE`).

## Licenses

MIT for this package. The compiled rule files are derived from the EN 16931 artefacts (EUPL-1.2) and the XRechnung Schematron (Apache-2.0). SaxonJS is licensed by Saxonica. Details in `THIRD_PARTY.md`.
