# ADR 0001: Monorepo with a framework-free core library and a Vite + React web app

- Status: accepted
- Date: 2026-11-21

## Context
The project ships two products: the npm package `@tirlogy/einvoice` (usable in Node and in the browser) and a static web app. Both must share one invoice model and one set of parsers and builders. Running costs must be 0 €, invoices must never leave the device.

## Decision
- pnpm workspace with `packages/einvoice` (core, no UI, no DOM dependency), `apps/web` (Vite + React 19 + TypeScript strict) and `tools/rules` (rule toolchain).
- The core uses `@xmldom/xmldom` instead of the browser `DOMParser`, so the same code runs in Node, in browsers and in tests.
- XML is written by a tiny typed tree builder (`E`, `T` in `xml.ts`) that drops empty elements. This keeps output schema clean without templates.
- Hosting as static files on Cloudflare Pages (free tier, no server code).

## Alternatives
- Next.js or Astro: server features are not needed and would tempt server side processing of invoices.
- Separate repos for library and app: duplicates release work and makes cross-cutting changes harder.
- Template strings for XML: hard to keep element order and omission rules correct.

## Consequences
- One lockfile, one CI pipeline, one version of the model.
- The web app imports the library source through the workspace, so changes are tested end to end immediately.
