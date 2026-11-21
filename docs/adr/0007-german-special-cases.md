# ADR 0007: Mapping German special cases to EN 16931

- Status: accepted
- Date: 2026-11-21

## Decision

| Case | Mapping |
|---|---|
| Kleinunternehmer § 19 UStG | VAT category `E`, 0 %, exemption reason text (BT-120) "Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG", seller tax number (BT-32, scheme `FC`). A seller identifier (BT-29) or register number is needed for BR-CO-26. |
| 19 % and 7 % | category `S`, one VAT breakdown per rate |
| Reverse charge § 13b UStG | category `AE`, 0 %, `VATEX-EU-AE` plus German text, note on the invoice, both VAT IDs |
| Intra-community supply | category `K`, `VATEX-EU-IC`, both VAT IDs, delivery date and deliver-to country (BR-IC-11, BR-IC-12) |
| Allowances and charges | line level BG-27/BG-28, document level BG-20/BG-21 with VAT category, price discount via gross price (BT-148/BT-147). Reason codes UNTDID 5189 (`95` discount) and 7161 |
| Prepayment invoice | type code `386` |
| Partial invoice | type code `326` |
| Final invoice | type code `380`, prepaid amount BT-113, reference to the prepayment invoice (BG-3) |
| Credit note | type code `381` (UBL: `CreditNote` document) with reference BG-3 |
| Cancellation (Storno) | type code `381` with reference BG-3, title "Stornorechnung" in the PDF |
| Corrected invoice | type code `384` with mandatory BG-3 (BR-DE-26) |
| Public buyers | Leitweg-ID in BT-10, check digits verified (ISO 7064 MOD 97-10), electronic address with scheme `0204` |

## Alternatives
- Negative invoices (380 with negative amounts) for cancellations: allowed but harder to book and to read; 381 is the common practice for XRechnung.

## Consequences
Every case is a test fixture (`exampleDraft`), validated with the official rules in unit tests and with the KoSIT validator and veraPDF in CI.
