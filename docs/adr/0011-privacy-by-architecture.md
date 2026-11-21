# ADR 0011: Privacy by architecture

- Status: accepted
- Date: 2026-11-21

## Decision
- No backend. The site is static on Cloudflare Pages; invoices are processed in memory only.
- CSP `connect-src 'self'` and `default-src 'self'`, no third-party scripts, fonts or analytics. The same CSP is set as `<meta>` (effective in local preview and tests) and as HTTP header (`_headers`, plus `frame-ancestors 'none'`).
- The service worker caches only same-origin GET responses (app files, rules, fonts). It never sees invoice data because no invoice data is ever requested.
- IndexedDB holds only master data the user saves explicitly (senders, customers, articles), with export, import (validated) and "delete all". The editor keeps its current form in `sessionStorage` of the tab, so a reload does not lose input; it disappears with the tab.
- An E2E test records every request during a full create, check and open flow and fails if a request goes to another origin, uses a method other than GET, carries a body, or contains invoice data in the URL.

## Consequences
There is nothing personal on a server that could be deleted, so the demo needs no deletion period.
