import { test, expect } from '@playwright/test';
import { data, id, setup } from '../fixtures/setup.js';

test('Betik gecikince başlık alanı sayfayı kaydırmaz', async ({ page }) => {
  await setup(page);
  for (const width of [390, 800, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    let release;
    const ready = new Promise((resolve) => {
      release = resolve;
    });
    await page.route('**/app.js', async (route) => {
      await ready;
      await route.continue();
    });
    const navigation = page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const header = document.getElementById('header');
      return header && parseFloat(getComputedStyle(header).height) > 0;
    });
    const before = await page.locator('main').boundingBox();
    release();
    await navigation;
    await expect(page.locator('.hero h1')).toBeVisible();
    const after = await page.locator('main').boundingBox();
    expect(Math.abs(before.y - after.y)).toBeLessThan(1);
    await page.unroute('**/app.js');
  }
});

for (const guest of [false, true]) {
  test(`Geciken bağlantı yanlış uyarı göstermez: ${guest ? 'ziyaretçi' : 'üye'}`, async ({
    page,
  }) => {
    await setup(page, (f) => {
      f.guest = guest;
      f.delay = 1200;
    });
    await page.addInitScript(() => {
      globalThis.startupWarnings = [];
      new MutationObserver(() => {
        const text = document.querySelector('main')?.textContent || '';
        if (text.includes('Firebase bağlantısı yapılandırılmalı'))
          globalThis.startupWarnings.push(text);
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/ilan-ver.html');
    await expect(page.locator('main')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[data-startup] .skeleton')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Yükleniyor' })).toBeVisible();
    await expect(page.locator('main a[href^="giris.html"]')).toHaveCount(0);
    if (guest) await expect(page.locator('main')).toContainText('Bu işlem için giriş yapın.');
    else await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => globalThis.startupWarnings)).toEqual([]);
    if (guest) expect(await page.evaluate(() => globalThis.calls || [])).toEqual([]);
  });
}

test('Bağlantı hatası gerçek hata ve yeniden deneme sunar', async ({ page }) => {
  await setup(page, (f) => {
    f.failure = true;
  });
  await page.goto('/ilan-ver.html');
  await expect(page.getByRole('alert')).toContainText('Veriler alınamadı.');
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
  await page.unroute('**/js/firebase.js');
  await setup(page);
  await page.locator('#startup-retry').click();
  await expect(page.locator('#editor')).toBeVisible();
});

test('Ana sayfa gereksiz modülleri yüklemez ve sözlüğü yeniden indirmez', async ({ page }) => {
  await setup(page, (f) => {
    f.guest = true;
  });
  const scripts = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('.listing').first()).toBeVisible();
  expect(await page.evaluate(() => globalThis.calls.map((c) => c.name).sort())).toEqual([
    'ana_sayfa',
    'baslangic',
  ]);
  expect(scripts.some((s) => /\/pages\/(admin|editor|messages|account|detail)\.js/.test(s))).toBe(
    false,
  );
  expect(
    await page.evaluate(() => globalThis.calls.find((c) => c.name === 'baslangic').p.p_sozluk),
  ).toBe(true);
  await page.reload();
  await expect(page.locator('.listing').first()).toBeVisible();
  expect(
    await page.evaluate(() => globalThis.calls.find((c) => c.name === 'baslangic').p.p_sozluk),
  ).toBe(false);
  await expect(page.locator('datalist[id^=makes] option')).toHaveCount(2);
});

test('Mobil skeleton erişilebilir yüklenme metni sunar ve veri gelince kaldırılır', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, (f) => {
    f.delay = 2200;
    f.guest = true;
  });
  await page.goto('/');
  await expect(page.locator('#feed .skeleton')).toHaveCount(8);
  await expect(page.locator('#feed .skeleton').first()).toHaveAttribute('aria-hidden', 'true');
  expect(
    await page
      .locator('.skeleton-shape')
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
  ).toBe('none');
  expect(await page.locator('.skeleton a, .skeleton button, .skeleton input').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.locator('#language').click();
  await expect(page.locator('#feed [role=status]')).toHaveText('Loading…');
  await expect(page.locator('.listing').first()).toBeVisible();
  await expect(page.locator('.skeleton')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
});

test('Filtre ve sıralama beklerken skeleton gösterilir; en yeni sonuç korunur', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/ilanlar.html');
  await expect(page.locator('#results .listing')).toBeVisible();
  await page.evaluate(async () => {
    const { state } = await import('/js/state.js');
    const rpc = state.db.rpc;
    state.db.rpc = async (name, p) => {
      const response = await rpc(name, p);
      if (name === 'ilan_ara') {
        await new Promise((r) => setTimeout(r, p.p.sira === 'fiyat_artan' ? 1200 : 100));
        response.data.ilanlar = response.data.ilanlar.map((c) => ({ ...c, baslik: p.p.sira }));
      }
      return response;
    };
  });
  await page.locator('[name=sira]').selectOption('fiyat_artan');
  await expect(page.locator('#results .skeleton')).toBeVisible();
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'true');
  await page.locator('[name=sira]').selectOption('fiyat_azalan');
  await expect(page.locator('#results')).toContainText('fiyat_azalan');
  await page.waitForTimeout(1250);
  await expect(page.locator('#results')).toContainText('fiyat_azalan');
  await expect(page.locator('#results .skeleton')).toHaveCount(0);
  await expect(page.locator('#results')).toHaveAttribute('aria-busy', 'false');
});

test('Sonuç veya detay isteği başarısız olunca skeleton takılı kalmaz', async ({ page }) => {
  await setup(page, (f) => {
    f.rpcFailures = ['ilan_ara'];
    f.rpcDelay = { ilan_ara: 800 };
  });
  await page.goto('/ilanlar.html');
  await expect(page.locator('#results .skeleton')).toBeVisible();
  await expect(page.locator('#results [role=alert]')).toContainText('Veriler alınamadı.');
  await expect(page.locator('#results .skeleton')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
  await setup(page, (f) => {
    f.rpcFailures = ['satici'];
    f.rpcDelay = { satici: 800 };
  });
  await page.goto('/ilan.html?id=' + id);
  await expect(page.locator('main .skeleton')).toBeVisible();
  await expect(page.locator('main [role=alert]')).toContainText('Veriler alınamadı.');
  await expect(page.locator('main .skeleton')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
});

test('Ana sayfa ilanı ve bağlı araç listelerini yükler', async ({ page }) => {
  await setup(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.listing').first()).toBeVisible();
  await expect(page.locator('datalist[id^=makes] option')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('Şehir filtresi, sıralama ve harita görünümü', async ({ page }) => {
  await setup(page, (f) =>
    f.tables.ilan_kartlari.push({
      ...f.tables.ilan_kartlari[0],
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      sehir: 'Lefkoşa',
      fiyat: 10000,
    }),
  );
  await page.goto('/ilanlar.html');
  await expect(page.locator('#results .listing')).toHaveCount(2);
  await expect(page.locator('[name=display_currency]')).toBeVisible();
  await expect(page.locator('.result-tools')).not.toContainText('<label>');
  await page.locator('[name=sira]').selectOption('fiyat_artan');
  await expect(page.locator('#results .listing').first()).toContainText('10.000');
  await page.locator('[name=sehir]').selectOption('Girne');
  await expect(page.locator('#results .listing')).toHaveCount(1);
  await page.locator('[data-view=mapView]').click();
  await expect(page.locator('#results svg image')).toHaveCount(12);
  await expect(page.locator('#results svg circle')).toHaveCount(1);
});

test('İlan detayında kaporta ve donanım gösterilir', async ({ page }) => {
  await setup(page);
  await page.goto('/ilan.html?id=' + id);
  await expect(page.locator('.body-part')).toHaveCount(13);
  await expect(page.locator('.legend')).toHaveCount(2);
  await expect(page.locator('main')).toContainText('ABS');
  await expect(page.locator('main')).toContainText('Kaporta ve Ekspertiz');
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test('Karşılaştırma kaydedilen aracı gösterir', async ({ page }) => {
  await setup(page);
  await page.addInitScript((ids) => localStorage.setItem('bc-compare', JSON.stringify(ids)), [id]);
  await page.goto('/karsilastir.html');
  await expect(page.locator('main table')).toContainText(data.tables.ilanlar[0].baslik);
  await expect(page.locator('main table')).toContainText('Kaporta ve Ekspertiz');
});

test('Araç talebi formu doğrudan açılınca marka ve model seçeneklerini yükler', async ({
  page,
}) => {
  await setup(page, (f) => {
    f.guest = true;
  });
  await page.goto('/talepler.html');
  await expect(page.locator('#wanted-form')).toBeVisible();
  await expect(page.locator('datalist[id^=makes] option')).toHaveCount(2);
  await page.locator('#wanted-form [name=marka]').fill(data.lex.markalar[0][1]);
  await expect(page.locator('datalist[id^=models] option')).toHaveCount(2);
});

test('Giriş ve kayıt formları geçersiz alanları göndermez', async ({ page }) => {
  await setup(page, (f) => {
    f.guest = true;
  });
  await page.goto('/giris.html');
  await expect(page.locator('#auth-form')).toBeVisible();
  await page.locator('[name=email]').fill('gecersiz');
  await page.locator('[name=password]').fill('kisa');
  await page.locator('#auth-form button').click();
  expect(await page.locator('#auth-form').evaluate((f) => f.checkValidity())).toBe(false);
  await page.locator('[data-auth=register]').click();
  await page.locator('[name=email]').fill('uye@example.invalid');
  await page.locator('[name=password]').fill('uzun-bir-parola');
  await page.locator('[name=tip]').selectOption('kurumsal');
  await expect(page.locator('[name=firma]')).toBeVisible();
  expect(await page.locator('#auth-form').evaluate((f) => f.checkValidity())).toBe(false);
  expect(
    await page.evaluate(() =>
      (globalThis.calls || []).some((c) => ['signin', 'register'].includes(c.name)),
    ),
  ).toBe(false);
});

test('Dil değişimi sözlük ve sayfa dilini günceller', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  await page.locator('#language').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero h1')).toHaveText('The right vehicle. Clear details.');
  await expect(page).toHaveURL(/lang=en/);
  await expect(page).toHaveTitle('North Cyprus Vehicle Listings | BETA.CAR');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\?lang=en$/);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    'North Cyprus Vehicle Listings | BETA.CAR',
  );
  await page.locator('#language').click();
  await expect(page.locator('.hero h1')).toHaveText('Doğru araç. Net bilgi.');
  await expect(page).not.toHaveURL(/lang=en/);
});

test('404 sayfası ana sayfaya dönüş sunar', async ({ page }) => {
  await setup(page);
  await page.goto('/404.html');
  await expect(page.locator('main')).toContainText('404');
  await expect(page.locator('main a[href="index.html"]')).toBeVisible();
});

test('Veritabanı metni HTML olarak çalışmaz', async ({ page }) => {
  await setup(page, (f) => {
    f.tables.ilan_kartlari[0].baslik = '<img src=x onerror="window.injected=1">';
    f.tables.ilan_kartlari[0].para_birimi = '<svg onload="window.injected=1">';
    f.tables.paket_talepleri[0].referans_kodu = '<img src=x onerror="window.injected=1">';
    f.tables.bildirimler = [
      {
        id,
        tur: 'paket_talebi',
        kullanici_id: f.me.id,
        veri: { durum: '<svg onload="window.injected=1">' },
        olusturma: '2026-10-17',
        okundu: false,
      },
    ];
  });
  for (const url of [
    '/ilanlar.html',
    '/hesabim.html?sekme=paketler',
    '/hesabim.html?sekme=bildirimler',
  ]) {
    await page.goto(url);
    await expect(page.locator('main')).toContainText(/<img|<svg/);
    expect(await page.evaluate(() => globalThis.injected)).toBeUndefined();
    await expect(page.locator('main [onerror], main [onload]')).toHaveCount(0);
  }
});

test('Paket banka bilgisi yalnızca hesap talebinde görünür', async ({ page }) => {
  await setup(page);
  await page.goto('/paketler.html');
  await expect(page.locator('#package-list')).toContainText('İlan Hakkı');
  await expect(page.locator('body')).not.toContainText('TEST-ACCOUNT');
  await page.goto('/hesabim.html?sekme=paketler');
  await expect(page.locator('.bank-details')).toContainText('TEST-ACCOUNT');
});
