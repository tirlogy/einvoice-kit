# ADR 0002: Official Schematron rules compiled to SEF and executed with SaxonJS

- Status: accepted
- Date: 2026-11-21

## Context
Validation must use the official rule sets (EN 16931 by CEN/TC 434, XRechnung by KoSIT), run in the browser and stay reproducible.

Research (21 Nov 2026):

| Artefact | Latest version | License |
|---|---|---|
| EN 16931 validation artefacts | 1.3.17 (2026-10-12) | EUPL-1.2 |
| XRechnung Schematron | 2.6.0 for XRechnung 3.0.2 (2026-09-02) | Apache-2.0 |
| KoSIT validator | 1.6.3 (2026-08-20) | Apache-2.0 |
| KoSIT XRechnung configuration | 2026-08-31 (uses EN 16931 1.3.16) | Apache-2.0 |
| SaxonJS / xslt3 | 2.7 | Saxonica SaxonJS License 1.0 |

The SaxonJS license permits redistribution in unmodified binary form as part of an application, with the copyright notice and disclaimer in the documentation. It forbids putting the software on a site whose *primary purpose* is to make it available to third parties. Our web app is an application that uses it, so redistribution is allowed (notice in `THIRD_PARTY.md`, license shipped as `SaxonJS-LICENSE.txt`).

## Decision
- `tools/rules/versions.json` pins every artefact by URL **and SHA-256**. `tools/rules/build.mjs` downloads, verifies, and compiles the published XSLT with `xslt3 -export ... -relocate:on` into SEF JSON (`packages/einvoice/rules`).
- EN 16931 is pinned to 1.3.17 (newest). The KoSIT configuration still references 1.3.16; the CI cross check with the KoSIT validator shows both agree for our generated files.
- Node uses the `saxon-js` npm package (optional peer dependency). The browser uses `SaxonJS2.rt.js` from the official Saxonica download (pinned SHA-256), served from our own origin and loaded only when a check starts.
- SVRL output is mapped to findings with rule ID, severity (fatal → error, warning, information → info) and XPath location. KoSIT scenario overrides for XRechnung (BR-CL-21, BR-CL-23 → warning, UBL-CR-646 → error) are applied.
- XML Schema (XSD) validation is not done in the browser (SaxonJS has no schema processor). CI runs the KoSIT validator, which includes XSD validation, against all generated files.
- Update path: `node tools/rules/build.mjs --check-updates` lists newer releases, then edit `versions.json` and run `--pin`.

## Alternatives
- Re-implementing the rules in TypeScript: high risk of divergence from the official rules.
- Running the KoSIT validator on a server: violates "invoices never leave the device" and costs money.
- Loading SaxonJS from a CDN at runtime: adds a third-party origin and breaks offline use.

## Consequences
- Rule files are large (EN 16931 CII ≈ 5 MB raw, ≈ 160 KB gzip) and are fetched lazily on the first check, then cached by the service worker.
- Rule updates are a reviewed one-line change plus CI run.
