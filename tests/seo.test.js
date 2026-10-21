import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSeo, renderSeo, listingPath, sitemapXml, origin } from '../functions/seo.js';
import { layouts } from '../js/layout.js';
import { published, active } from '../functions/core.js';

const template = (name) =>
  name === 'layout.json'
    ? Promise.resolve(JSON.stringify(layouts()))
    : readFile(new URL('../' + name, import.meta.url), 'utf8');
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const rows = {
  ilanlar: [
    {
      id,
      no: 12,
      baslik: 'Kıyı Serisi 2020',
      aciklama: 'Bakım kayıtları mevcut.',
      durum: 'yayinda',
      bitis: '2099-01-01',
      yayin: '2026-01-01',
      guncelleme: '2026-02-01',
      marka: 'Kıyı',
      model: 'Seri',
      model_id: 1,
      yil: 2020,
      km: 42000,
      fiyat: 22000,
      para_birimi: 'GBP',
      sehir: 'Girne',
      fotograflar: ['https://example.invalid/arac.png'],
      detay: { sasi: 'OZEL-SASI' },
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      baslik: 'Gizli araç',
      gizli: true,
      durum: 'yayinda',
      bitis: '2099-01-01',
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      baslik: 'Kaldırılan araç',
      durum: 'kaldirildi',
      yayin: '2026-01-01',
    },
    { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', baslik: 'Taslak araç', durum: 'taslak' },
  ],
  yazilar: [
    {
      id: '1',
      slug: 'bakim-kaydi',
      aktif: true,
      yayin: '2026-01-01',
      baslik: 'Bakım kaydı',
      baslik_en: 'Service history',
      ozet: 'Bakım kaydını inceleyin.',
      ozet_en: 'Read the service history.',
      icerik: 'Kayıtları araçla birlikte kontrol edin.',
      icerik_en: 'Check records with the vehicle.',
    },
    { id: '2', slug: 'gelecek-yazi', aktif: true, yayin: '2099-01-01' },
    { id: '3', slug: 'pasif-yazi', aktif: false, yayin: '2026-01-01' },
  ],
  firmalar: [],
  sayfalar: [
    {
      id: 'hakkimizda',
      slug: 'hakkimizda',
      baslik: 'Hakkımızda',
      baslik_en: 'About',
      icerik: 'KKTC araç ilanları.',
      icerik_en: 'North Cyprus vehicle listings.',
    },
  ],
  markalar: [{ id: 1, ad: 'Kıyı' }],
  modeller: [{ id: 1, marka_id: 1, ad: 'Seri' }],
};
const visible = (table) =>
  (rows[table === 'ilan_kartlari' ? 'ilanlar' : table] || []).filter((r) =>
    table === 'ilan_kartlari'
      ? active(r)
      : table === 'yazilar'
        ? r.aktif && Date.parse(r.yayin) <= Date.now()
        : true,
  );
const db = {
  collection: (name) => ({
    select: () => ({
      get: async () => ({
        docs: (rows[name] || []).map((r) => ({ id: String(r.id), data: () => r })),
      }),
    }),
    doc: (id) => ({ get: async () => ({ data: () => rows[name]?.find((r) => r.id === id) }) }),
  }),
};
const service = {
  execute: async (body) => ({
    data:
      body.name === 'ilan_ara'
        ? { ilanlar: rows.ilanlar.filter(published), toplam: 1 }
        : visible(body.query.table).filter((r) =>
            body.query.filters.every(([k, , v]) => r[k] === v),
          ),
  }),
};
const seo = createSeo(db, service, template);
const canonical = (html) => /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];

test('SEO HTML güvenli metin, paylaşım bilgileri ve geçerli JSON-LD sunar', async () => {
  const html = renderSeo(await template('ilan.html'), {
    path: '/ilan.html?id=' + id,
    lang: 'tr',
    title: '</script><img src=x onerror=alert(1)>',
    description: '" onclick="alert(1)',
    schemas: [{ '@type': 'Article', headline: '</script><script>alert(1)</script>' }],
  });
  assert.doesNotMatch(html, /<img src=x|<script>alert/);
  const data = JSON.parse(/id="seo-schema">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.equal(data['@graph'].at(-1).headline, '</script><script>alert(1)</script>');
  assert.equal(canonical(html), origin + '/ilan.html?id=' + id);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /hreflang="en"[^>]+lang=en/);
});

test('İlan kaynağı fiyat, görsel ve Vehicle verisini JavaScript olmadan içerir', async () => {
  const page = await seo('/ilan.html?no=12&utm_source=arama');
  assert.equal(page.status, 200);
  assert.equal(
    canonical(page.body),
    (origin + listingPath(rows.ilanlar[0])).replaceAll('&', '&amp;'),
  );
  assert.match(page.body, /Bakım kayıtları mevcut/);
  assert.match(page.body, /property="og:image" content="https:\/\/example.invalid\/arac.png"/);
  assert.doesNotMatch(page.body, /OZEL-SASI|utm_source/);
  const vehicle = JSON.parse(/id="vehicle-schema">([\s\S]*?)<\/script>/.exec(page.body)[1]);
  assert.equal(vehicle.offers.price, 22000);
  assert.equal(vehicle.mileageFromOdometer.unitCode, 'KMT');
  assert.equal(page.cache, 'no-store');
  const alias = await seo('/ilan.html?id=gecersiz&no=12');
  assert.equal(alias.status, 200);
  assert.equal(canonical(alias.body), canonical(page.body));
  assert.equal((await seo('/ilan.html?id=' + id + '&no=gecersiz')).status, 404);
});

test('İngilizce yazı kendi canonical ve Article verisini sunar', async () => {
  const page = await seo('/yazilar.html?s=bakim-kaydi&lang=en');
  assert.equal(page.status, 200);
  assert.match(page.body, /<html lang="en"/);
  assert.match(page.body, /<title>Service history \| BETA.CAR<\/title>/);
  assert.match(page.body, /Check records with the vehicle/);
  assert.equal(canonical(page.body), origin + '/yazilar.html?s=bakim-kaydi&amp;lang=en');
  assert.match(page.body, /"@type":"Article"/);
});

test('Taslak, gizli ve eksik kayıtlar taranabilir özel içerik döndürmez', async () => {
  for (const r of rows.ilanlar.slice(1)) {
    const page = await seo('/ilan.html?id=' + r.id);
    assert.equal(page.status, r.durum === 'kaldirildi' ? 410 : 404);
    assert.equal(page.noindex, true);
    assert.equal(page.cache, 'no-store');
    assert.doesNotMatch(page.body, new RegExp(r.baslik));
    assert.match(page.body, /data-page="detail"/);
  }
  assert.equal((await seo('/model.html?model=gecersiz')).status, 404);
  assert.equal((await seo('/yazilar.html?s=gelecek-yazi')).status, 404);
});

test('Filtreler indeks dışıdır; kategori ve model canonical adresi korunur', async () => {
  const filtered = await seo('/ilanlar.html?sehir=Girne&sira=fiyat_artan');
  assert.equal(filtered.noindex, true);
  assert.equal(canonical(filtered.body), origin + '/ilanlar.html');
  const category = await seo('/ilanlar.html?kategori=kullanilmis');
  assert.equal(canonical(category.body), origin + '/kullanilmis');
  assert.equal(category.noindex, false);
  const model = await seo('/model.html?model=1');
  assert.match(model.body, /Kıyı Seri · Model Fiyatları/);
  assert.equal(canonical(model.body), origin + '/model.html?model=1');
  assert.equal((await seo('/karsilastir.html')).noindex, true);
});

test('Sitemap yalnız açık kayıtları, dil eşlerini ve gerçek güncelleme tarihini içerir', async () => {
  const page = await seo('/sitemap.xml');
  assert.equal(page.type, 'application/xml');
  assert.match(page.body, /ilan.html\?id=aaaaaaaa/);
  assert.match(page.body, /2026-02-01T00:00:00.000Z/);
  assert.match(page.body, /yazilar.html\?s=bakim-kaydi/);
  assert.match(page.body, /model.html\?model=1/);
  assert.match(page.body, /xhtml:link rel="alternate" hreflang="en"/);
  assert.doesNotMatch(
    page.body,
    /bbbbbbbb|cccccccc|dddddddd|gelecek-yazi|pasif-yazi|hesabim|admin|giris|mesajlar|foto|karsilastir/,
  );
  assert.equal((await seo('/sitemap.xml?sayfa=999999')).status, 404);
  const entries = [1, 2, 3].map((n) => ({ path: '/ilan.html?id=' + n }));
  assert.match(sitemapXml(entries, 0, 2), /sitemapindex/);
  assert.equal((sitemapXml(entries, 2, 2).match(/<url>/g) || []).length, 1);
});
