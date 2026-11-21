# ADR 0005: Decimal arithmetic with big.js and EN 16931 rounding

- Status: accepted
- Date: 2026-11-21

## Context
Invoice totals must be exact. JavaScript numbers produce errors such as 0.1 + 0.2 = 0.30000000000000004. EN 16931 checks the totals with rules BR-CO-10 to BR-CO-17 and expects amounts with two decimals.

## Decision
- All amounts, quantities and rates are decimal strings in the model. Calculations use big.js (6 KB, MIT).
- Rounding is commercial (half up) to two decimals at the points EN 16931 defines: line net amount (BT-131), allowance/charge amounts, taxable amount and tax amount per VAT group (BT-116, BT-117) and the document totals. The sum of rounded values is used for the next level, as the rules require.
- Percentage allowances are resolved to amounts with their base (BT-93, BT-137) so the output is self contained.

## Alternatives
- Integer cents: breaks with prices that have more than two decimals (allowed for BT-146) and quantities with decimals.
- decimal.js: larger than needed.

## Consequences
All generated invoices pass BR-CO-10 to BR-CO-17 in the official rules and in the KoSIT validator.
