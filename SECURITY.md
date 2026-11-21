# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x | yes |

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting ("Security" tab → "Report a vulnerability") of `tirlogy/einvoice-kit`. You get an answer within 7 days.

## Design notes

- Invoices are processed only in the browser or in your own Node process. The web app has no backend and sends no invoice data anywhere (enforced by CSP `connect-src 'self'` and an E2E test that records all requests).
- XML is parsed with `@xmldom/xmldom`, which does not resolve external entities (no XXE). Uploaded files are limited to 20 MB.
- Imported JSON (master data) is validated and sanitised field by field before it is stored.
- Rule files and the SaxonJS runtime are downloaded at build time from pinned URLs and verified with SHA-256.
- Strict security headers are set in `apps/web/public/_headers` (CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`).
