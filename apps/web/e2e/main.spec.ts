// SPDX-License-Identifier: MIT
import { expect, test, type Page } from '@playwright/test';

async function createAndDownload(page: Page, format: RegExp) {
  await page.goto('/#/create');
  await page.getByLabel('Beispiel laden').selectOption('allowances');
  await page.getByLabel('Rechnungsnummer').fill('E2E-2026-0001');
  await page.getByRole('radio', { name: format }).check();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Herunterladen' }).click()]);
  return download;
}

test('create a ZUGFeRD invoice, download it, open it again and validate it', async ({ page }) => {
  const download = await createAndDownload(page, /ZUGFeRD-PDF/);
  expect(download.suggestedFilename()).toBe('E2E-2026-0001.pdf');
  const path = await download.path();

  await page.goto('/#/view');
  await page.locator('input[type=file]').setInputFiles(path);
  await expect(page.getByTestId('file-info')).toContainText('Profil EN 16931');
  await expect(page.getByRole('heading', { name: /Rechnung E2E-2026-0001/ })).toBeVisible();
  await expect(page.getByTestId('validation-status')).toHaveText(/Gültig/);
});

test('create an XRechnung UBL, re-open it and validate it against XRechnung', async ({ page }) => {
  const download = await createAndDownload(page, /XRechnung \(UBL-XML\)/);
  const path = await download.path();
  await page.goto('/#/view');
  await page.locator('input[type=file]').setInputFiles(path);
  await expect(page.getByTestId('file-info')).toContainText('UBL · Profil XRECHNUNG');
  await expect(page.getByTestId('validation-status')).toHaveText(/Gültig/);
  await expect(page.getByText('xrechnung-ubl')).toBeVisible();
});

test('a faulty invoice shows explained errors with rule IDs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fehlerhafte Rechnung' }).click();
  await expect(page.getByTestId('validation-status')).toHaveText(/Nicht gültig/);
  await expect(page.locator('.rule-id', { hasText: 'BR-CO-15' })).toBeVisible();
  await expect(page.getByText('Der Gesamtbetrag (BT-112) muss Nettobetrag plus Umsatzsteuer ergeben.')).toBeVisible();
  await page.getByLabel('Sprache').selectOption('tr');
  await expect(page.getByText('KDV dahil toplam (BT-112), net toplam artı KDV olmalıdır.')).toBeVisible();
  await page.getByLabel('Dil').selectOption('en');
  await expect(page.getByText('The total with VAT (BT-112) must equal net total plus VAT.')).toBeVisible();
});

test('convert XRechnung to ZUGFeRD', async ({ page }) => {
  const download = await createAndDownload(page, /XRechnung \(CII-XML\)/);
  await page.goto('/#/convert');
  await page.locator('input[type=file]').setInputFiles(await download.path());
  await page.getByRole('radio', { name: /ZUGFeRD-PDF/ }).check();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Konvertieren und herunterladen' }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/zugferd\.pdf$/);
  await expect(page.getByText(/Spezifikationskennung \(BT-24\) wurde/)).toBeVisible();
});

test('master data: save, export, delete all', async ({ page }) => {
  await page.goto('/#/create');
  await page.getByRole('button', { name: 'Absender speichern' }).click();
  await expect(page.getByText('Gespeichert.').first()).toBeVisible();
  await page.goto('/#/data');
  await expect(page.getByRole('heading', { name: 'Absender (1)' })).toBeVisible();
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Als JSON exportieren' }).click()]);
  expect(json.suggestedFilename()).toBe('e-rechnung-kit-daten.json');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Alle Daten löschen' }).click();
  await expect(page.getByRole('heading', { name: 'Absender (0)' })).toBeVisible();
  await page.locator('#import-json').setInputFiles(await json.path());
  await expect(page.getByText(/Import abgeschlossen: 1 Einträge/)).toBeVisible();
});
