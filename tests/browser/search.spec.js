import { test, expect } from '@playwright/test';
import { setup } from '../fixtures/setup.js';

async function prepare(page) {
  await setup(page, (f) =>
    f.tables.ilan_kartlari.push({
      ...f.tables.ilan_kartlari[0],
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      no: 8088,
      baslik: 'Yamaç Sedan',
      marka: 'Yamaç',
      model: 'Sedan',
      fiyat: 10000,
    }),
  );
}
const searchCalls = (page) =>
  page.evaluate(() => globalThis.calls.filter((c) => c.name === 'ilan_ara').map((c) => c.p.p));

test('Mobilde harfler yazıldıkça arar, silince tüm sonuçlara döner', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ilanlar.html');
  await expect(page.locator('#results .listing')).toHaveCount(2);
  const input = page.getByRole('searchbox', { name: 'Kelime veya ilan no ile ara' });
  await expect(input).toBeVisible();
  await expect(page.locator('#filters')).toBeHidden();
  await expect(page.locator('input[name=q]')).toHaveCount(1);
  const before = (await searchCalls(page)).length;
  await input.pressSequentially('ser', { delay: 30 });
  await expect(page.locator('#results .listing')).toHaveCount(1);
  await expect(page.locator('#results')).toContainText('Kıyı Serisi');
  expect((await searchCalls(page)).slice(before)).toHaveLength(1);
  expect((await searchCalls(page)).at(-1).q).toBe('ser');
  await input.fill('8088');
  await expect(page.locator('#results')).toContainText('Yamaç Sedan');
  await expect(page.locator('#results .listing')).toHaveCount(1);
  await input.fill('999999');
  await expect(page.locator('#results .empty')).toBeVisible();
  await input.fill('');
  await expect(page.locator('#results .listing')).toHaveCount(2);
  expect((await searchCalls(page)).at(-1).q).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Ara ve Enter tek istek çalıştırır; şehir ve sıralama korunur', async ({ page }) => {
  await prepare(page);
  await page.goto('/ilanlar.html?sehir=Girne&sira=fiyat_artan&sayfa=3');
  await expect(page.locator('#results .listing')).toHaveCount(2);
  const input = page.locator('.listing-search input');
  let before = (await searchCalls(page)).length;
  await input.fill('ser');
  await page.locator('.listing-search button').click();
  await expect(page.locator('#results .listing')).toHaveCount(1);
  await page.waitForTimeout(450);
  expect((await searchCalls(page)).slice(before)).toEqual([
    expect.objectContaining({ q: 'ser', sehir: 'Girne', sira: 'fiyat_artan', sayfa: 1 }),
  ]);
  before = (await searchCalls(page)).length;
  await input.fill('8088');
  await input.press('Enter');
  await expect(page.locator('#results')).toContainText('Yamaç Sedan');
  await page.waitForTimeout(450);
  expect((await searchCalls(page)).slice(before)).toHaveLength(1);
  expect((await searchCalls(page)).at(-1)).toEqual(
    expect.objectContaining({ q: '8088', sehir: 'Girne', sira: 'fiyat_artan', sayfa: 1 }),
  );
  await page.locator('#save-search').click();
  const saved = await page.evaluate(
    () => globalThis.calls.findLast((c) => c.name === 'aramalar:insert').p,
  );
  expect(saved.filtre).toEqual(
    expect.objectContaining({ q: '8088', sehir: 'Girne', sira: 'fiyat_artan' }),
  );
});

test('Geciken eski arama yeni sonucu değiştirmez; temizleme ve dil çalışır', async ({ page }) => {
  await prepare(page);
  await page.goto('/ilanlar.html?q=ser');
  const input = page.locator('.listing-search input');
  await expect(input).toHaveValue('ser');
  await expect(page.locator('#results .listing')).toHaveCount(1);
  await page.evaluate(async () => {
    const { state } = await import('/js/state.js');
    const call = state.db.rpc;
    state.db.rpc = async (name, p) => {
      const result = await call(name, p);
      if (name === 'ilan_ara' && p.p.q === '8088') await new Promise((r) => setTimeout(r, 1200));
      return result;
    };
  });
  await input.fill('8088');
  await expect(page.locator('#results .skeleton')).toBeVisible();
  await input.fill('ser');
  await expect(page.locator('#results')).toContainText('Kıyı Serisi');
  await page.waitForTimeout(1300);
  await expect(page.locator('#results')).not.toContainText('Yamaç Sedan');
  await page.locator('#clear-filter').click();
  await expect(input).toHaveValue('');
  await expect(page.locator('#results .listing')).toHaveCount(2);
  await page.locator('#language').click();
  await expect(
    page.getByRole('searchbox', { name: 'Search by keyword or listing number' }),
  ).toBeVisible();
  await expect(page.locator('.listing-search button')).toHaveText('Search');
  await expect(page.locator('.listing-search input')).toHaveValue('');
  await expect(page.locator('#results .listing')).toHaveCount(2);
});
