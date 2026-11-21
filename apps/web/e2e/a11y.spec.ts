// SPDX-License-Identifier: MIT
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['/#/start', '/#/view', '/#/create', '/#/convert', '/#/data', '/#/privacy'];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const path of pages) {
      test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
    test('loaded invoice and report have no violations', async ({ page }) => {
      await page.goto('/#/view');
      await page.getByRole('button', { name: 'Fehlerhafte Rechnung' }).click();
      await expect(page.getByTestId('validation-status')).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  });
}

test('keyboard: skip link and navigation work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'Erstellen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Rechnung erstellen' })).toBeVisible();
});
