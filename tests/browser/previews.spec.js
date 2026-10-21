import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createSeo } from '../../functions/seo.js';
import { layouts } from '../../js/layout.js';
import { data, id, setup } from '../fixtures/setup.js';

const tables = data.tables;
const service = {
  execute: async (body) => ({
    data: body.query
      ? (tables[body.query.table] || []).filter((r) =>
          body.query.filters.every(([k, , v]) => r[k] === v),
        )
      : { ilanlar: tables.ilan_kartlari, toplam: tables.ilan_kartlari.length },
  }),
};
const seo = createSeo({}, service, (name) =>
  name === 'layout.json'
    ? Promise.resolve(JSON.stringify(layouts()))
    : readFile(new URL('../../' + name, import.meta.url), 'utf8'),
);
async function preview(page, path) {
  const result = await seo(path);
  expect(result.status).toBe(200);
  await page.route(
    (u) => u.pathname === new URL(path, 'http://localhost').pathname,
    (route) =>
      route.fulfill({ status: result.status, contentType: 'text/html', body: result.body }),
  );
}

for (const path of [
  '/',
  '/ilanlar.html',
  '/ilan.html?id=' + id,
  '/paketler.html',
  '/firmalar.html',
  '/yazilar.html',
  '/sayfa.html?s=guvenli-alim',
])
  test(`Betik yüklenmeden sayfa düzeni tamamdır: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await preview(page, path);
    await page.route('**/app.js', (r) => r.abort());
    await page.goto(path);
    await expect(page.locator('#header .brand img')).toBeVisible();
    await expect(page.locator('#header .main-nav')).toBeVisible();
    await expect(page.locator('main [data-server-page]')).toBeVisible();
    await expect(page.locator('#footer .footer')).toBeVisible();
    await expect(page.locator('main nav')).toHaveCount(0);
    await expect(page.locator('main h1')).toHaveCount(1);
    const header = await page.locator('#header').boundingBox(),
      main = await page.locator('#main').boundingBox();
    expect(Math.abs(header.y + header.height - main.y)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    expect(
      await page.locator('main h1').evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
    ).toBeLessThanOrEqual(40);
  });

test('Veri beklerken sunucu görünümüne ikinci yüklenme alanı eklenmez', async ({ page }) => {
  await setup(page, (f) => {
    f.delay = 1200;
  });
  await preview(page, '/ilanlar.html');
  await page.goto('/ilanlar.html');
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-server-page]')).toBeVisible();
  await expect(page.locator('[data-startup]')).toHaveCount(0);
  await expect(page.locator('#filters')).toBeVisible();
  await expect(page.locator('[data-server-page]')).toHaveCount(0);
  await expect(page.locator('#header .header')).toHaveCount(1);
  await expect(page.locator('main h1')).toHaveCount(1);
});

test('JavaScript kapalıyken içerik, başlık ve gezinme kullanılabilir', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 740 },
  });
  try {
    const page = await context.newPage();
    await preview(page, '/?lang=en');
    await page.goto('/?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#header .brand')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Garage Journal' })).toBeVisible();
    await expect(page.locator('noscript')).toBeVisible();
    await expect(page.locator('.server-links a').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    const link = await page.locator('.server-links p').first().boundingBox();
    expect(link.height).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});
