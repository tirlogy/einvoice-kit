# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Web: overview page as the new start page. Explains the German e-invoicing mandate (deadlines 2025, 2027, 2028, what counts as an e-invoice, exceptions) with sources from the Federal Ministry of Finance, plus a four-step guide to the tools. The next deadline is highlighted by date.

### Changed
- Web: own colour scheme (petrol ink with a stamp accent) for app, icon and manifest.

## [1.0.0] - 2026-11-21

### Added
- `@tirlogy/einvoice` library: normalised EN 16931 model, parsers for CII, UBL (Invoice and CreditNote) and ZUGFeRD/Factur-X PDF.
- Builders for CII, UBL and ZUGFeRD PDF/A-3b (two layouts, logo, DE/EN/TR labels, `factur-x.xml` or `xrechnung.xml`).
- Validation with the official EN 16931 1.3.17 and XRechnung 3.0.2 (Schematron 2.6.0) rules via SaxonJS, plus plausibility checks (IBAN, Leitweg-ID, VAT ID, dates).
- Explanations of about 100 rules in German, English and Turkish, family fallback for all others.
- Conversion XRechnung CII/UBL ↔ ZUGFeRD EN 16931 and CII ↔ UBL.
- German special cases: small business (§ 19 UStG), 19 % and 7 %, reverse charge (§ 13b UStG), intra-community supply, allowances and charges, prepayment, partial and final invoice, credit note, cancellation, corrected invoice, Leitweg-ID.
- Web app (DE/EN/TR, dark mode, PWA): view, validate, create, convert; local master data in IndexedDB with export, import and delete all.
- Rule toolchain with pinned, hash verified downloads and an update check.
- CI: lint, typecheck, unit tests with coverage gate, KoSIT validator, veraPDF, Playwright E2E with axe, Lighthouse.

[Unreleased]: https://github.com/tirlogy/einvoice-kit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tirlogy/einvoice-kit/releases/tag/v1.0.0
