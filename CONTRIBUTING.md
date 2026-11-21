# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Setup

```bash
corepack enable
pnpm install
pnpm rules        # downloads and compiles the official rule sets, fetches test fixtures
pnpm test         # unit tests (library and web)
pnpm --filter web dev
```

The rule step needs Java only for the optional KoSIT check: `node tools/rules/build.mjs --kosit && node tools/ci/kosit.mjs`. The PDF/A check needs Docker: `tools/ci/verapdf.sh`.

## Rules

- TypeScript strict, ESLint clean (`pnpm lint`), `pnpm typecheck` passes.
- Core logic changes come with tests; the coverage gate is 80 %.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` ...).
- Code, comments, commits and ADRs in English. UI texts in German, English and Turkish (German: "KI" instead of "AI", no dashes as sentence separators).
- Use fictitious data only in examples and tests.
- Significant decisions get an ADR in `docs/adr/`.

## Updating the official rules

```bash
node tools/rules/build.mjs --check-updates   # shows newer releases
# edit tools/rules/versions.json (URL and version)
node tools/rules/build.mjs --pin             # recomputes the SHA-256 values
pnpm rules && pnpm test
```
