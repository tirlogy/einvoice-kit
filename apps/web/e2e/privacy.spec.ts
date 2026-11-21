// SPDX-License-Identifier: MIT
import { expect, test } from '@playwright/test';

/**
 * Invoices must never leave the device: during the whole flow the app may only
 * load its own static files (GET, same origin) and must not send any request body.
 */
test('no network request carries invoice data', async ({ page, baseURL }) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() }));

  await page.goto('/#/create');
  await page.getByLabel('Rechnungsnummer').fill('GEHEIM-4711');
  await page.getByLabel('Name oder Firma').first().fill('Vertraulich GmbH');
  await page.getByRole('button', { name: 'Prüfen' }).click();
  await expect(page.getByTestId('validation-status')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Herunterladen' }).click()]);
  await page.goto('/#/view');
  await page.locator('input[type=file]').setInputFiles(await download.path());
  await expect(page.getByTestId('validation-status')).toBeVisible();

  const origin = new URL(baseURL!).origin;
  const external = requests.filter((r) => !r.url.startsWith(origin) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'));
  expect(external, 'requests to other origins').toEqual([]);
  expect(requests.filter((r) => r.method !== 'GET'), 'non GET requests').toEqual([]);
  expect(requests.filter((r) => r.body), 'requests with a body').toEqual([]);
  expect(requests.filter((r) => /GEHEIM|Vertraulich/i.test(decodeURIComponent(r.url))), 'invoice data in URLs').toEqual([]);
});
