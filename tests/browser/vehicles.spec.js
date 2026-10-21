import { test, expect } from '@playwright/test';
import { setup } from '../fixtures/setup.js';

async function catalogue(page) {
  await setup(page, (f) => {
    f.lex = {
      markalar: [
        [1, 'Toyota', 'otomobil'],
        [2, 'Toyota', 'suv'],
        [3, 'Honda', 'motosiklet'],
      ],
      modeller: [
        [1, 1, 'Passo', 2004, 2023],
        [2, 2, 'RAV4', 1994, 2027],
        [3, 3, 'PCX', 2010, 2027],
      ],
    };
    f.tables.kategoriler.push(
      { id: 20, ust_id: null, slug: 'parca', ad: 'Parça & Donanım', ad_en: 'Parts & Equipment' },
      {
        id: 21,
        ust_id: 20,
        slug: 'parca-binek',
        ad: 'Binek Araç Parçaları',
        ad_en: 'Car Parts',
        arac_tipi: 'otomobil',
      },
      {
        id: 27,
        ust_id: 20,
        slug: 'parca-motor',
        ad: 'Motor Parçaları',
        ad_en: 'Motorcycle Parts',
        arac_tipi: 'motosiklet',
      },

      {
        id: 3,
        ust_id: 1,
        slug: 'kullanilmis-suv',
        ad: 'SUV & Çift Kabin',
        ad_en: 'SUV & Pickup',
        arac_tipi: 'suv',
      },
      {
        id: 4,
        ust_id: 1,
        slug: 'kullanilmis-motor',
        ad: 'Motor & Scooter',
        ad_en: 'Motorcycles & Scooters',
        arac_tipi: 'motosiklet',
      },
    );
    f.tables.donanimlar.push({
      id: 999,
      grup: 'Güvenlik',
      ad: 'Motosiklet ABS',
      ad_en: 'Motorcycle ABS',
      arac_tipi: ['motosiklet'],
    });
  });
}

test('Kategori marka, model, yıl ve donanımı birlikte değiştirir', async ({ page }) => {
  await catalogue(page);
  await page.goto('/ilan-ver.html');
  await expect(page.locator('[name=tip]')).toHaveValue('otomobil');
  await expect(page.locator('[name=tip]')).toBeDisabled();
  await expect(page.locator('[name=model]')).toBeDisabled();
  await page.locator('#step-next').click();
  await page.locator('[name=baslik]').fill('Bakım kayıtlı Toyota Passo');
  await page.locator('[name=marka]').fill('Toyota');
  await page.locator('[name=model]').fill('Passo');
  await expect(page.locator('[name=yil] option')).toHaveCount(21);
  await page.locator('[name=yil]').selectOption('2020');
  await page.locator('#step-prev').click();
  await page.locator('[name=kategori_id]').selectOption('3');
  await expect(page.locator('[name=tip]')).toHaveValue('suv');
  await expect(page.locator('[name=marka]')).toHaveValue('');
  await expect(page.locator('[name=model]')).toHaveValue('');
  await expect(page.locator('[name=yil]')).toHaveValue('');
  await page.locator('#step-next').click();
  await page.locator('[name=marka]').fill('Toyota');
  await expect(page.locator('#models option[value=RAV4]')).toHaveCount(1);
  await expect(page.locator('#models option[value=Passo]')).toHaveCount(0);
  await page.locator('#step-prev').click();
  await page.locator('[name=kategori_id]').selectOption('4');
  await page.locator('#step-next').click();
  await expect(page.locator('#makes option[value=Toyota]')).toHaveCount(0);
  await page.locator('[name=marka]').fill('Honda');
  await page.locator('[name=model]').fill('PCX');
  await page.locator('[name=yil]').selectOption('2024');
  await page.locator('#step-next').click();
  await expect(page.locator('[name=donanim][value="999"]')).toBeVisible();
  await expect(page.locator('[name=donanim][value="1"]')).toHaveCount(0);
});

test('Araç taslağı tüm ayrıntıları tek kayıt isteğiyle gönderir', async ({ page }) => {
  await catalogue(page);
  await page.goto('/ilan-ver.html');
  await page.locator('#step-next').click();
  await page.locator('[name=baslik]').fill('Bakım kayıtlı Toyota Passo');
  await page.locator('[name=marka]').fill('Toyota');
  await page.locator('[name=model]').fill('Passo');
  await page.locator('[name=yil]').selectOption('2020');
  await page.locator('#step-next').click();
  await page.locator('#all-original').click();
  await page.locator('#draft-save').click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.calls.filter((c) => c.name === 'ilan_kaydet').length),
    )
    .toBe(1);
  const calls = await page.evaluate(() => globalThis.calls);
  const saved = calls.find((c) => c.name === 'ilan_kaydet').p;
  expect(saved.p_veri.marka_id).toBe(1);
  expect(saved.p_veri.model_id).toBe(1);
  expect(saved.p_veri.yil).toBe(2020);
  expect(Object.keys(saved.p_parcalar)).toHaveLength(13);
  expect(calls.some((c) => /:(insert|update|delete|upsert)$/.test(c.name))).toBe(false);
});

test('Serbest metin seçili model gibi gönderilmez ve Diğer alanları temizlenir', async ({
  page,
}) => {
  await catalogue(page);
  await page.goto('/ilan-ver.html');
  await page.locator('#step-next').click();
  await page.locator('[name=marka]').fill('Toyota');
  await page.locator('[name=model]').fill('RAV4');
  expect(await page.locator('[name=model]').evaluate((n) => n.checkValidity())).toBe(false);
  await expect(page.locator('[name=yil]')).toBeDisabled();
  await page.locator('[name=marka]').fill('Diğer');
  await page.locator('[name=diger_marka]').fill('Marka adı');
  await page.locator('[name=model]').fill('Diğer');
  await page.locator('[name=diger_model]').fill('Model adı');
  await page.locator('[name=marka]').fill('Toyota');
  await expect(page.locator('[name=diger_marka]')).toBeHidden();
  await expect(page.locator('[name=diger_model]')).toBeHidden();
  await expect(page.locator('[name=diger_marka]')).toHaveValue('');
  await expect(page.locator('[name=diger_model]')).toHaveValue('');
});

test('Ana sayfa sekmesi ve arama kategorisi uygun araç türlerini sınırlar', async ({ page }) => {
  await catalogue(page);
  await page.goto('/');
  await page.locator('[name=tip]').selectOption('suv');
  await page.locator('[name=marka]').fill('Toyota');
  await page.locator('[name=model]').fill('RAV4');
  await page.getByRole('tab', { name: 'Parça & Donanım' }).click();
  await expect(page.locator('[name=tip] option[value=suv]')).toHaveCount(0);
  await expect(page.locator('[name=marka]')).toHaveValue('');
  await expect(page.locator('[name=model]')).toHaveValue('');
  await page.goto('/ilanlar.html?kategori=kullanilmis-motor');
  await expect(page.locator('[name=tip]')).toHaveValue('motosiklet');
  await expect(page.locator('[name=tip]')).toBeDisabled();
  await expect(page.locator('#makes option[value=Toyota]')).toHaveCount(0);
  await page.locator('[name=marka]').fill('Honda');
  await expect(page.locator('#models option[value=PCX]')).toHaveCount(1);
  await expect(page.locator('[name=donanim][value="999"]')).toHaveCount(1);
  await expect(page.locator('[name=donanim][value="1"]')).toHaveCount(0);
});
