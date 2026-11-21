# ADR 0009: Official test files are downloaded, KoSIT and veraPDF run in CI

- Status: accepted
- Date: 2026-11-21

## Context
The plan requires at least 30 official test files and that generated files pass the KoSIT validator and veraPDF. The ZUGFeRD samples are published by FeRD without a clear redistribution license; the KoSIT validator and veraPDF are Java applications.

## Decision
- `tools/rules/build.mjs` downloads the KoSIT test suite (86 instances), the EN 16931 examples (36) and 13 ZUGFeRD 2.5.2 sample PDFs from a pinned commit into `.cache/` (git ignored). Nothing is redistributed.
- Unit tests read all of them (135 files), validate the valid ones with zero errors, and roundtrip CII → UBL → CII.
- The unit tests write every special case as XRechnung CII and UBL and as ZUGFeRD PDF to `.cache/generated`. CI then runs the KoSIT validator 1.6.3 with the official XRechnung configuration (`tools/ci/kosit.mjs`) and veraPDF 1.30 in Docker (`tools/ci/verapdf.sh`, flavour 3b).

## Consequences
Every push proves conformance with the reference implementations, not only with our own checks.
