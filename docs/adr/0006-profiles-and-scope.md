# ADR 0006: Profiles: what is read, validated and created

- Status: accepted
- Date: 2026-11-21

## Context
ZUGFeRD 2.x / Factur-X has the profiles MINIMUM, BASIC WL, BASIC, EN 16931, EXTENDED and XRECHNUNG. Since 2025 German businesses must receive e-invoices. According to the BMF letter of 15 October 2024, MINIMUM and BASIC WL are not invoices under § 14 UStG because they lack line items. The concept excludes creating EXTENDED.

## Decision
- Reading: all profiles, CII (D16B) and UBL 2.1 Invoice and CreditNote.
- Validation: EN 16931 Schematron for BASIC, EN 16931, EXTENDED and XRECHNUNG; XRechnung Schematron when BT-24 names XRechnung (or on request). MINIMUM and BASIC WL get a prominent warning `DE-PROFILE` and count as "not a German e-invoice". EXTENDED gets the note `EXTENDED-SCOPE`, because the profile specific FeRD rules are not public.
- Creation: ZUGFeRD EN 16931 (PDF/A-3, `factur-x.xml`), optional profile XRECHNUNG in the PDF (`xrechnung.xml`), XRechnung CII and UBL.
- Conversion: MINIMUM and BASIC WL are refused (no lines), EXTENDED converts the EN 16931 core with a warning.

## Consequences
The app gives a clear answer to the question German users actually have: "Is this a valid e-invoice?"
