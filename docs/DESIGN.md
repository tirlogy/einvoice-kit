# Design

The app is a working tool for people who handle invoices: calm, dense where it helps (tables, reports), generous where people type (44 px targets, clear labels). No decoration that competes with the invoice.

## Colours

Tokens live in `apps/web/src/styles.css` as CSS custom properties. Dark mode follows the system and can be forced with the theme switch (`data-theme`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f6f7f9` | `#0f1216` | page background |
| `--surface` | `#ffffff` | `#171b21` | cards, inputs |
| `--surface-2` | `#eef1f5` | `#1f252d` | findings, active nav |
| `--text` | `#15171a` | `#e8eaed` | body text |
| `--muted` | `#545a65` | `#a7adb7` | secondary text (≥ 4.5:1 on surface) |
| `--primary` | `#1c549e` | `#8db8ff` | links, primary buttons, PDF accent default |
| `--ok` / `--ok-bg` | `#1b6e3a` / `#e5f4ea` | `#74d99a` / `#12301e` | valid |
| `--bad` / `--bad-bg` | `#b3261e` / `#fbe9e7` | `#ff9a8f` / `#3a1714` | errors |
| `--warn` / `--warn-bg` | `#7a4f00` / `#fff4d6` | `#ffd27a` / `#352a0f` | warnings |
| `--focus` | `#b45309` | `#fbbf24` | 3 px focus ring |

All text/background pairs meet WCAG 2.1 AA; axe runs on every page in both schemes in CI.

## Typography

System font stack (`system-ui, -apple-system, Segoe UI, Roboto, Noto Sans`) for zero font downloads. Base 16 px, line height 1.5, headings with `clamp()`. The PDF uses embedded Open Sans (PDF/A requires embedded fonts).

## Components

| Component | File | Notes |
|---|---|---|
| File drop | `components/FileDrop.tsx` | drag and drop plus a labelled file input; keyboard reachable |
| Invoice view | `components/InvoiceView.tsx` | semantic sections, `dl` for key/value, scrollable table region with focus, print CSS |
| Validation report | `components/ValidationReport.tsx` | status with icon and text (not colour only), filter chips with `aria-pressed`, explanation first, original text in `details` |
| Form fields | `components/Field.tsx` | every input has a visible `label`, hints via `aria-describedby` |
| Editor | `pages/CreatePage.tsx` | fieldsets with legends, radio groups for tax case and format, sticky action bar, live preview |

## Layout

Mobile first. One column below 1000 px; above, a two column layout with a sticky side panel (report or preview). Navigation scrolls horizontally on small screens.

## PDF layouts

- **Classic**: black headings, thin rules, logo top right.
- **Modern**: accent colour band, coloured table header, zebra rows, logo top left.

Both include sender line, address block, meta box, line table with wrapping, totals, VAT exemption reasons, payment details and a footer with company data and page numbers on every page.
