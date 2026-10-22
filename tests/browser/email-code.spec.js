import { test, expect } from '@playwright/test';
import { setup } from '../fixtures/setup.js';
const ready = (page) =>
  page.waitForFunction(
    () => Date.now() - Number(document.querySelector('form').dataset.start) >= 700,
  );
async function register(page) {
  await page.locator('[data-auth=register]').click();
  await page.locator('[name=ad]').fill('Kıyı Üye');
  await page.locator('[name=email]').fill('uye@example.invalid');
  await page.locator('[name=password]').fill('Test-parola-42!');
  await page.locator('#auth-form input[type=checkbox]').check();
  await ready(page);
  await page.locator('#auth-form button').click();
}
test('Kayıttan sonra altı haneli kod ekranı açılır ve doğrulanınca hesaba geçer', async ({
  page,
}) => {
  await setup(page, (f) => {
    f.guest = true;
    f.emailCode = true;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/giris.html');
  await register(page);
  const code = page.locator('#code-form input[name=code]');
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('inputmode', 'numeric');
  await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.locator('#code-status')).toContainText('Kod gönderildi.');
  await expect(page.locator('main')).toContainText('bağlantıya tıklamanız gerekmez');
  await code.fill('12345');
  await page.locator('#code-form button').click();
  expect(
    await page.evaluate(() => (globalThis.calls || []).filter((c) => c.name === 'verifyEmailCode')),
  ).toHaveLength(0);
  await code.fill('123456');
  await ready(page);
  await page.locator('#code-form button').click();
  await expect(page).toHaveURL(/hesabim\.html/);
});
test('Bekleyen onay yeniden açılır; yanlış kod ve erken yeniden gönderim engellenir', async ({
  page,
}) => {
  await setup(page, (f) => {
    f.guest = true;
    f.pendingEmail = 'uye@example.invalid';
  });
  await page.goto('/giris.html');
  await expect(page.locator('#code-form')).toBeVisible();
  await page.locator('#code-form input[name=code]').fill('999999');
  await ready(page);
  await page.locator('#code-form button').click();
  await expect(page.locator('#code-error')).toContainText('Doğrulama kodu yanlış');
  await page.locator('#code-resend').click();
  await expect(page.locator('#notice')).toContainText('60 saniye');
  expect(
    await page.evaluate(() => globalThis.calls.filter((c) => c.name === 'sendEmailCode')),
  ).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
test('Doğrulanmamış giriş kod ekranına geçer; İngilizce ve gönderim hatası görünür', async ({
  page,
}) => {
  await setup(page, (f) => {
    f.guest = true;
    f.emailCode = true;
    f.codeSendFailure = true;
  });
  await page.goto('/giris.html?lang=en');
  await page.locator('[name=email]').fill('uye@example.invalid');
  await page.locator('[name=password]').fill('Test-parola-42!');
  await ready(page);
  await page.locator('#auth-form button').click();
  await expect(page.locator('#code-form')).toBeVisible();
  await expect(page.locator('main')).toContainText('Enter the 6-digit code');
  await expect(page.locator('#code-status')).toContainText('Kod gönderilemedi');
  await expect(page.locator('#code-status')).not.toContainText('Code sent');
});
test('Gönderim hizmeti açılana kadar mevcut kayıt akışı kullanılabilir', async ({ page }) => {
  await setup(page, (f) => (f.guest = true));
  await page.goto('/giris.html');
  await register(page);
  await expect(page.locator('#notice')).toContainText(
    'E-posta doğrulama bağlantınızı kontrol edin.',
  );
  await expect(page.locator('#code-form')).toHaveCount(0);
});
