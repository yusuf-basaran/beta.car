import { test, expect } from '@playwright/test';
import { setup } from '../fixtures/setup.js';
const ready = (page) =>
  page.waitForFunction(
    () => Date.now() - Number(document.querySelector('form').dataset.start) >= 700,
  );
for (const lang of ['tr', 'en'])
  test(`Kayıt e-posta bağlantısı onayı gösterir: ${lang}`, async ({ page }) => {
    await setup(page, (f) => {
      f.guest = true;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/giris.html' + (lang === 'en' ? '?lang=en' : ''));
    await page.locator('[data-auth=register]').click();
    await page.locator('[name=ad]').fill('Kıyı Üye');
    await page.locator('[name=email]').fill('uye@example.invalid');
    await page.locator('[name=password]').fill('Test-parola-42!');
    await page.locator('#auth-form input[type=checkbox]').check();
    await ready(page);
    await page.locator('#auth-form button').click();
    await expect(page.locator('#notice')).toContainText(
      lang === 'en'
        ? 'Check your email verification link.'
        : 'E-posta doğrulama bağlantınızı kontrol edin.',
    );
    await expect(page.locator('input[autocomplete=one-time-code]')).toHaveCount(0);
    const calls = await page.evaluate(() => globalThis.calls.filter((c) => c.name !== 'baslangic'));
    expect(calls.map((c) => c.name)).toEqual(['register']);
    expect(calls[0].p.options.emailRedirectTo).toMatch(/\/hesabim\.html$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
test('Doğrulanmamış üyeye e-posta onayı uyarısı gösterilir', async ({ page }) => {
  await setup(page, (f) => {
    f.guest = true;
    f.unverified = true;
  });
  await page.goto('/giris.html');
  await page.locator('[name=email]').fill('uye@example.invalid');
  await page.locator('[name=password]').fill('Test-parola-42!');
  await ready(page);
  await page.locator('#auth-form button').click();
  await expect(page.locator('#notice')).toContainText('E-posta adresinizi doğrulayın');
  await expect(page.locator('#auth-form')).toBeVisible();
  await expect(page).toHaveURL(/giris\.html$/);
  expect(
    await page.evaluate(() =>
      globalThis.calls.filter((c) => c.name !== 'baslangic').map((c) => c.name),
    ),
  ).toEqual(['signin']);
});
test('Şifre sıfırlama bağlantısı mevcut akışla gönderilir', async ({ page }) => {
  await setup(page, (f) => {
    f.guest = true;
  });
  await page.goto('/giris.html');
  await page.locator('[data-auth=reset]').click();
  await page.locator('[name=email]').fill('uye@example.invalid');
  await ready(page);
  await page.locator('#auth-form button').click();
  await expect(page.locator('#notice')).toContainText(
    'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
  );
  const calls = await page.evaluate(() => globalThis.calls.filter((c) => c.name !== 'baslangic'));
  expect(calls.map((c) => c.name)).toEqual(['resetPassword']);
  expect(calls[0].p.options.redirectTo).toMatch(/\/giris\.html$/);
});
