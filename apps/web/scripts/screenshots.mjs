// SPDX-License-Identifier: MIT
// Renders the PNG app icons and the README/portfolio screenshots.
// Usage: pnpm build && (pnpm preview &) && node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const out = fileURLToPath(new URL('../../../docs/screenshots/', import.meta.url));
const pub = fileURLToPath(new URL('../public/', import.meta.url));
const browser = await chromium.launch();

// icons
const svg = readFileSync(`${pub}icon.svg`, 'utf8');
for (const size of [192, 512]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `${pub}icon-${size}.png`, omitBackground: true });
  await p.close();
}

async function shot(name, { path, scheme = 'light', width = 1280, height = 860, action, lang = 'de-DE' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: lang, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + path);
  if (action) await action(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}${name}.png` });
  await ctx.close();
}

const loadFaulty = async (page) => {
  await page.getByRole('button', { name: /Fehlerhafte Rechnung|Faulty invoice/ }).click();
  await page.getByTestId('validation-status').waitFor();
  await page.locator('.report').scrollIntoViewIfNeeded();
};
const loadValid = async (page) => {
  await page.getByRole('button', { name: /Gültige XRechnung|Valid XRechnung/ }).click();
  await page.getByTestId('validation-status').waitFor();
};

await shot('view-validate', { path: '/#/view', action: loadFaulty });
await shot('view-valid-dark', { path: '/#/view', scheme: 'dark', action: loadValid });
await shot('create', { path: '/#/create', action: async (p) => p.getByLabel('Beispiel laden').selectOption('allowances') });
await shot('mobile', { path: '/#/view', width: 390, height: 844, action: loadValid });
await shot('view-en', { path: '/#/view', lang: 'en-GB', action: loadFaulty });
await browser.close();
console.log('screenshots written to', out);
