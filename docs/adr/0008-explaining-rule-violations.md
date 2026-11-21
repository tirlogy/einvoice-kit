# ADR 0008: Explaining rule violations in German, English and Turkish

- Status: accepted
- Date: 2026-11-21

## Context
The official rule texts are English (EN 16931) or German (XRechnung) and written for developers. There are more than 400 rule IDs. Users need to understand what to fix.

## Decision
- About 100 frequent rules have a curated plain language text in DE/EN/TR (`validate/messages.ts`), including our own plausibility checks.
- Every other rule falls back to a family explanation by prefix (BR-CO calculation, BR-CL code list, BR-DE XRechnung, BR-AE reverse charge, CII-SR syntax, ...).
- The original rule text and the XPath location are always available in a disclosure element.

## Alternatives
- Machine translation at runtime: needs a network service.
- Translating all rules: high effort and maintenance with every rule release.

## Consequences
The most common errors read naturally; rare ones still get a helpful category and the exact original text.
