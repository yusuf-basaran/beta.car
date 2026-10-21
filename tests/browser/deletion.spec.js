import { test, expect } from '@playwright/test';
import { setup, id } from '../fixtures/setup.js';

const remove = (page) => page.locator('[data-listing-op="sil"]').first();

test('Kalıcı silme iptal ve Escape ile istek göndermeden kapanır', async ({ page }) => {
  await setup(page);
  await page.goto('/hesabim.html');
  await remove(page).click();
  const dialog = page.getByRole('dialog', { name: 'İlanı kalıcı sil' });
  await expect(dialog).toContainText('Bu işlem geri alınamaz.');
  await expect(dialog.getByRole('button', { name: 'İptal et' })).toBeFocused();
  await dialog.getByRole('button', { name: 'İptal et' }).click();
  await expect(dialog).toHaveCount(0);
  await remove(page).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.calls.filter((c) => c.name === 'ilan_sil'))).toEqual(
    [],
  );
  await expect(page.locator('.account-listing').first()).toBeVisible();
});

test('Onaylanan ilan tek istekle silinir ve tarayıcı listelerinden çıkar', async ({ page }) => {
  await setup(page, (f) => (f.rpcDelay = { ilan_sil: 800 }));
  await page.addInitScript((id) => {
    for (const k of ['bc-favs', 'bc-compare', 'bc-recent'])
      localStorage.setItem(k, JSON.stringify([id]));
    localStorage.setItem('bc-draft', JSON.stringify(id));
  }, id);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hesabim.html');
  const before = await page.locator('.account-listing').count();
  await remove(page).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Kalıcı olarak sil', exact: true })
    .click();
  await expect(remove(page)).toBeDisabled();
  await expect(page.locator('.account-listing')).toHaveCount(before - 1);
  await expect(page.locator('#notice')).toContainText('İlan sunucudan kalıcı olarak silindi.');
  expect(await page.evaluate(() => globalThis.calls.filter((c) => c.name === 'ilan_sil'))).toEqual([
    { name: 'ilan_sil', p: { p_ilan: id, p_onay: true } },
  ]);
  for (const k of ['bc-favs', 'bc-compare', 'bc-recent'])
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), k)).not.toContain(id);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bc-draft')))).toBe('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Silme hatasında ilan korunur ve İngilizce onay yeniden açılabilir', async ({ page }) => {
  await setup(page, (f) => (f.rpcFailures = ['ilan_sil']));
  await page.addInitScript(() => localStorage.setItem('bc-lang', JSON.stringify('en')));
  await page.goto('/hesabim.html');
  const before = await page.locator('.account-listing').count();
  await remove(page).click();
  await expect(page.getByRole('dialog')).toContainText('This cannot be undone.');
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.locator('#notice')).toContainText('Bağlantı kesildi');
  await expect(page.locator('.account-listing')).toHaveCount(before);
  await expect(remove(page)).toBeEnabled();
  await remove(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
