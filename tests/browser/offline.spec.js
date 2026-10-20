import { test, expect } from '@playwright/test';
import { setup } from '../fixtures/setup.js';

async function prepare(page) {
  await setup(page);
  await page.goto('/');
  await expect(page.locator('.listing').first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
}

test('Gerçek bağlantı kesilince çevrimdışı sayfa açılır ve geri dönülebilir', async ({
  page,
  context,
}) => {
  await prepare(page);
  await context.setOffline(true);
  await expect(page.locator('#connection-status')).toBeVisible();
  await page.goto('/ilanlar.html?sehir=Girne');
  await expect(page.locator('#offline-title')).toHaveText('Çevrimdışısınız');
  await expect(page).toHaveURL(/ilanlar\.html\?sehir=Girne$/);
  expect(await page.locator('.brand img').evaluate((n) => n.complete && n.naturalWidth > 0)).toBe(
    true,
  );
  await page.locator('#offline-retry').click();
  await expect(page.locator('#offline-status')).toContainText('Bağlantı kurulamadı.');
  await expect(page.locator('#offline-retry')).toBeEnabled();
  await page.locator('#offline-language').click();
  await expect(page.locator('#offline-title')).toHaveText('You are offline');
  await page.reload();
  await expect(page.locator('#offline-title')).toHaveText('You are offline');
  await context.setOffline(false);
  await expect(page.locator('#offline-status')).toContainText('You can try connecting again.');
  await page.locator('#offline-retry').click();
  await expect(page.locator('#filters')).toBeVisible();
  await expect(page.locator('[name=sehir]')).toHaveValue('Girne');
  await expect(page).toHaveURL(/lang=en/);
});

test('Özel sayfalar ve servis yanıtları çevrimdışı önbelleğe girmez', async ({ page, context }) => {
  await prepare(page);
  await page.goto('/hesabim.html');
  await expect(page.locator('#account-content')).toBeVisible();
  const urls = await page.evaluate(async () => {
    const urls = [];
    for (const key of await caches.keys())
      for (const request of await (await caches.open(key)).keys())
        urls.push(new URL(request.url).pathname);
    return urls.sort();
  });
  expect(urls).toEqual([
    '/cevrimdisi.html',
    '/favicon.png',
    '/js/data.js',
    '/js/i18n.js',
    '/js/offline.js',
    '/js/state.js',
    '/js/utils.js',
    '/logo-header.webp',
    '/style.css',
  ]);
  const missing = await page.goto('/bulunamayan-sayfa');
  expect(missing.status()).toBe(404);
  await expect(page.locator('#offline-title')).toHaveCount(0);
  await context.setOffline(true);
  await page.goto('/mesajlar.html');
  await expect(page.locator('#offline-title')).toBeVisible();
  await expect(page.locator('#account-content, #main input, #main textarea')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('TEST-ACCOUNT');
});

test('Çevrimdışı sayfa mobilde taşmaz ve dış adrese yönlendirmez', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/cevrimdisi.html?next=https%3A%2F%2Fexample.invalid');
  await expect(page.locator('#offline-retry')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await setup(page);
  await page.locator('#offline-retry').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.hero h1')).toBeVisible();
});
