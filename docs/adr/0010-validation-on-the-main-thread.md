# ADR 0010: Browser validation on the main thread, lazy loaded

- Status: accepted
- Date: 2026-11-21

## Context
The browser build of SaxonJS parses XML with the DOM `DOMParser`, which does not exist in Web Workers. A check takes 0.2 to 0.5 s on a laptop.

## Decision
- SaxonJS (`/vendor/SaxonJS2.rt.js`, 166 KB gzip) and the rule files (70 to 190 KB gzip each) are loaded only when a check starts and cached by the service worker afterwards.
- The check runs on the main thread after a short yield so the "checking" status is painted first.
- Known quirk: the browser runtime evaluates long `xs:integer` values with double precision. The XRechnung function `xr:checkIBAN` therefore reports BR-DE-19 for correct IBANs. The library drops BR-DE-19 when its own exact mod-97 check of all IBANs passes; otherwise both BR-DE-19 and `PL-IBAN` are shown.

## Alternatives
- Worker with an XML parser polyfill: SaxonJS does not support swapping its parser.
- Server side validation: not allowed by the privacy goal.

## Consequences
The UI blocks for a fraction of a second during a check, which is acceptable for an explicit user action.
