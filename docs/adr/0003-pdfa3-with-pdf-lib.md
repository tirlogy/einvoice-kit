# ADR 0003: ZUGFeRD PDF/A-3b with pdf-lib, embedded Open Sans and a CC0 sRGB profile

- Status: accepted
- Date: 2026-11-21

## Context
ZUGFeRD 2.x (current 2.3/2.4, technically identical to Factur-X 1.0.07/1.08) requires a PDF/A-3 document with the CII XML attached as `factur-x.xml` (profile XRECHNUNG: `xrechnung.xml`), an XMP extension schema in the `urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#` namespace, and an `/AF` relationship. The PDF must be generated in the browser.

## Decision
- pdf-lib draws the visual invoice and is extended with: XMP metadata (pdfaid part 3, conformance B, Factur-X extension schema, Info dictionary in sync), an OutputIntent `GTS_PDFA1` with an embedded sRGB ICC v4 profile, a trailer `/ID`, and `attach()` with `AFRelationship /Alternative` (pdf-lib adds the catalog `/AF` array).
- Fonts: Open Sans Regular and Bold (Apache-2.0, 106 KB each, covers German and Turkish characters) are embedded and subset. The standard 14 fonts are not allowed in PDF/A.
- ICC profile: `sRGB-v4.icc` from Compact-ICC-Profiles (CC0, 480 bytes), inlined as base64.
- Two visual layouts (`classic`, `modern` with accent colour) and an optional PNG/JPEG logo.
- CI checks every generated PDF with veraPDF (`verapdf/cli`, flavour 3b).

## Alternatives
- Server side generation with Mustang (Java) or a headless browser: violates privacy goal and costs money.
- jsPDF: no attachment and metadata control needed for PDF/A-3.
- The colour.org sRGB profiles: license allows redistribution but they are larger, and the download URL changed during research.

## Consequences
- Generated PDFs pass veraPDF PDF/A-3b and the embedded XML passes the KoSIT validator.
- Layout is code, not HTML, so it stays deterministic across browsers.
