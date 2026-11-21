# ADR 0004: React API with the Preact runtime in the web app

- Status: accepted
- Date: 2026-11-21

## Context
The quality bar requires Lighthouse Mobile Performance ≥ 90. With React 19 the first load was 102 KB gzip of JavaScript and the editor page scored 0.84 to 0.86 in local Lighthouse runs (simulated slow 4G, 4× CPU throttling). `react-dom` alone was about 60 KB gzip.

## Decision
The app is written against the React API (`react`, `react-dom/client`, hooks, `lazy`, `Suspense`) and Vite aliases these imports to `preact/compat`. In addition the preview of the editor follows the form with a 120 ms delay, so the first paint is not one long task, and `main` has a minimum height so the footer does not shift.

## Alternatives
- Keep React and split more chunks: the editor still needs the framework on first paint, the gain was small.
- Server side rendering: needs a server or a build step per page, and the app has no server by design.
- Svelte or Solid: a rewrite for the same result.

## Consequences
- First load JavaScript drops to about 47 KB gzip. Lighthouse mobile: 0.98 (viewer), 0.95 to 0.97 (editor), accessibility 1.0.
- The code stays React code. Switching back to React is a matter of removing four alias lines.
- `useDeferredValue` is a no-op in Preact, so the preview delay is implemented with a timer.
