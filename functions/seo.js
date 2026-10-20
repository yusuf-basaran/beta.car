import { readFile } from 'node:fs/promises';
import { published } from './core.js';
import config from './seo-config.json' with { type: 'json' };

export const origin = config.origin;
export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const summary = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 170);
const slug = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const url = (path, lang = 'tr') => {
  const u = new URL(path, origin);
  u.searchParams.delete('lang');
  if (lang === 'en') u.searchParams.set('lang', 'en');
  return u.href;
};
const link = (href, text) => '<a href="' + esc(href) + '">' + esc(text) + '</a>';
const paragraphs = (s) =>
  String(s || '')
    .split(/\n\s*\n/)
    .map((p) => '<p>' + esc(p) + '</p>')
    .join('');
const image = (s) => {
  try {
    const u = new URL(s || '/og-image.png', origin);
    return u.protocol === 'https:' && !u.username && !u.password
      ? u.href
      : origin + '/og-image.png';
  } catch {
    return origin + '/og-image.png';
  }
};
const money = (r, lang) =>
  r.fiyat == null
    ? lang === 'en'
      ? 'Contact for pricing'
      : 'Fiyat İçin Arayınız'
    : new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'tr-TR', {
        style: 'currency',
        currency: r.para_birimi === 'TL' ? 'TRY' : r.para_birimi || 'GBP',
        maximumFractionDigits: 0,
      }).format(r.fiyat);
export const listingPath = (r) =>
  '/ilan.html?' + new URLSearchParams({ id: r.id, s: slug(r.baslik) });
const field = (r, name, lang) => (lang === 'en' && r[name + '_en']) || r[name] || '';
const json = (data) =>
  JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
const structured = (id, data) =>
  '<script type="application/ld+json" id="' +
  id +
  '">' +
  json({ '@context': 'https://schema.org', ...data }) +
  '</script>';

export function renderSeo(template, page) {
  const en = page.lang === 'en',
    canonical = url(page.path, page.lang);
  const meta = (name, content) =>
    '<meta ' +
    (name.startsWith('og:') ? 'property' : 'name') +
    '="' +
    name +
    '" content="' +
    esc(content) +
    '">';
  const title = page.title.includes('BETA.CAR') ? page.title : page.title + ' | BETA.CAR';
  const desc = summary(page.description),
    photo = image(page.image);
  const head =
    '<title>' +
    esc(title) +
    '</title>' +
    [
      ['description', desc],
      ['robots', page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'],
      ['og:title', title],
      ['og:description', desc],
      ['og:type', page.type || 'website'],
      ['og:url', canonical],
      ['og:site_name', 'BETA.CAR'],
      ['og:locale', en ? 'en_GB' : 'tr_TR'],
      ['og:image', photo],
      ...(photo === origin + '/og-image.png'
        ? [
            ['og:image:width', '1200'],
            ['og:image:height', '630'],
          ]
        : []),
      ['og:image:alt', page.title],
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title],
      ['twitter:description', desc],
      ['twitter:image', photo],
    ]
      .map(([k, v]) => meta(k, v))
      .join('') +
    '<link rel="canonical" href="' +
    esc(canonical) +
    '">' +
    ['tr', 'en', 'x-default']
      .map(
        (lang) =>
          '<link rel="alternate" hreflang="' +
          lang +
          '" href="' +
          esc(url(page.path, lang === 'en' ? 'en' : 'tr')) +
          '">',
      )
      .join('') +
    structured('seo-schema', {
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': origin + '/#site',
          name: 'BETA.CAR',
          url: origin + '/',
          inLanguage: ['tr', 'en'],
        },
        {
          '@type': 'Organization',
          '@id': origin + '/#organization',
          name: 'BETA.CAR',
          url: origin + '/',
          logo: origin + '/logo.png',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: en ? 'Home' : 'Ana Sayfa',
              item: url('/', page.lang),
            },
            ...(page.path === '/'
              ? []
              : [{ '@type': 'ListItem', position: 2, name: page.title, item: canonical }]),
          ],
        },
        ...(page.schemas || []),
      ],
    }) +
    (page.vehicle ? structured('vehicle-schema', page.vehicle) : '');
  return template
    .replace(/<html lang="[^"]*"/, '<html lang="' + page.lang + '"')
    .replace(
      /<title>[\s\S]*?<\/title>|<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[\s\S]*?\/?\s*>|<link\s+rel="(?:canonical|alternate)"[^>]*>/g,
      '',
    )
    .replace('</head>', head + '</head>')
    .replace(
      /<noscript>[\s\S]*?<\/noscript>/,
      '<noscript>' +
        (en
          ? 'Enable JavaScript for search, account and listing actions.'
          : "Arama, hesap ve ilan işlemleri için JavaScript'i açın.") +
        '</noscript>',
    )
    .replace(
      /<main id="main"[^>]*>[\s\S]*?<\/main>/,
      '<main id="main" tabindex="-1"><section class="wrap page"><nav aria-label="' +
        (en ? 'Main navigation' : 'Ana menü') +
        '">' +
        Object.entries(config.pages)
          .filter(([p]) =>
            [
              '/',
              '/kullanilmis',
              '/sifir',
              '/parca',
              '/firmalar.html',
              '/paketler.html',
              '/yazilar.html',
            ].includes(p),
          )
          .map(([p, titles]) => link(url(p, page.lang), titles[en ? 1 : 0]))
          .join(' · ') +
        '</nav><h1>' +
        esc(page.title) +
        '</h1><p>' +
        esc(desc) +
        '</p>' +
        (page.content || '') +
        '</section></main>',
    );
}

export function sitemapXml(entries, page = 0, size = 40000) {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>';
  const chunks = Math.ceil(entries.length / size);
  if (!page && chunks > 1)
    return (
      xml +
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      Array.from(
        { length: chunks },
        (_, i) => '<sitemap><loc>' + origin + '/sitemap.xml?sayfa=' + (i + 1) + '</loc></sitemap>',
      ).join('') +
      '</sitemapindex>'
    );
  if (page > chunks || page < 0) return null;
  return (
    xml +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    entries
      .slice(Math.max(0, page - 1) * size, (page || 1) * size)
      .map((e) => {
        const modified = e.modified && new Date(e.modified);
        return (
          '<url><loc>' +
          esc(url(e.path, e.lang)) +
          '</loc>' +
          (modified && Number.isFinite(modified.getTime())
            ? '<lastmod>' + modified.toISOString() + '</lastmod>'
            : '') +
          ['tr', 'en', 'x-default']
            .map(
              (lang) =>
                '<xhtml:link rel="alternate" hreflang="' +
                lang +
                '" href="' +
                esc(url(e.path, lang === 'en' ? 'en' : 'tr')) +
                '"/>',
            )
            .join('') +
          '</url>'
        );
      })
      .join('') +
    '</urlset>'
  );
}

export function createSeo(
  db,
  service,
  template = (name) => readFile(new URL('./site/' + name, import.meta.url), 'utf8'),
) {
  let sitemap;
  const call = async (name, data = {}) => (await service.execute({ name, data })).data;
  const query = async (table, filters = [], more = {}) =>
    (await service.execute({ query: { table, op: 'read', filters, ...more } })).data;
  const cards = (rows, lang) =>
    '<div class="listing-list">' +
    rows
      .map(
        (r) =>
          '<article class="panel"><h2>' +
          link(url(listingPath(r), lang), r.baslik) +
          '</h2><p>' +
          esc([r.yil, r.sehir, money(r, lang)].filter(Boolean).join(' · ')) +
          '</p></article>',
      )
      .join('') +
    '</div>';
  const missing = async (lang, status = 404, file = '404.html') => ({
    status,
    noindex: true,
    cache: 'no-store',
    body: renderSeo(await template(file), {
      lang,
      path: '/404.html',
      title: lang === 'en' ? 'Page not found' : 'Sayfa bulunamadı',
      description:
        lang === 'en' ? 'Return to BETA.CAR vehicle listings.' : 'BETA.CAR araç ilanlarına dönün.',
      noindex: true,
      content: link(url('/', lang), lang === 'en' ? 'Home' : 'Ana Sayfa'),
    }),
  });
  async function sitemapEntries() {
    const select = async (name, fields) =>
      (
        await db
          .collection(name)
          .select(...fields)
          .get()
      ).docs.map((d) => ({ ...d.data(), id: d.id }));
    const [listings, firms, posts, pages] = await Promise.all([
      select('ilanlar', ['baslik', 'durum', 'gizli', 'bitis', 'guncelleme', 'yayin', 'model_id']),
      select('firmalar', ['guncelleme', 'olusturma']),
      select('yazilar', ['slug', 'aktif', 'yayin', 'guncelleme']),
      select('sayfalar', ['slug', 'guncelleme']),
    ]);
    const rows = Object.keys(config.pages)
      .filter((p) => p !== '/karsilastir.html')
      .map((path) => ({ path }));
    for (const r of listings.filter(published))
      rows.push({ path: listingPath(r), modified: r.guncelleme || r.yayin });
    for (const r of firms)
      rows.push({
        path: '/firma.html?id=' + encodeURIComponent(r.id),
        modified: r.guncelleme || r.olusturma,
      });
    for (const r of posts.filter((r) => r.aktif && Date.parse(r.yayin) <= Date.now()))
      rows.push({
        path: '/yazilar.html?s=' + encodeURIComponent(r.slug),
        modified: r.guncelleme || r.yayin,
      });
    for (const r of pages)
      rows.push({ path: '/sayfa.html?s=' + encodeURIComponent(r.slug), modified: r.guncelleme });
    for (const id of new Set(
      listings
        .filter(published)
        .map((r) => r.model_id)
        .filter(Boolean),
    ))
      rows.push({ path: '/model.html?model=' + encodeURIComponent(id) });
    return rows.flatMap((r) => [
      { ...r, lang: 'tr' },
      { ...r, lang: 'en' },
    ]);
  }
  return async (address) => {
    const u = new URL(address, origin),
      lang = u.searchParams.get('lang') === 'en' ? 'en' : 'tr',
      en = lang === 'en';
    if (u.pathname === '/sitemap.xml') {
      if (!sitemap || sitemap.expires < Date.now())
        sitemap = {
          expires: Date.now() + 300000,
          data: sitemapEntries().catch((e) => {
            sitemap = null;
            throw e;
          }),
        };
      const page = u.searchParams.get('sayfa') || '0';
      if (!/^\d{1,6}$/.test(page)) return missing(lang);
      const body = sitemapXml(await sitemap.data, Number(page));
      return body ? { status: 200, body, type: 'application/xml' } : missing(lang);
    }
    const path = u.pathname === '/index.html' ? '/' : u.pathname;
    const category = { '/kullanilmis': 'kullanilmis', '/sifir': 'sifir', '/parca': 'parca' }[path];
    const base = config.pages[path];
    const page = {
      path,
      lang,
      title: base?.[en ? 1 : 0],
      description: base?.[en ? 3 : 2],
      content: '',
      schemas: [],
    };
    let file = path === '/' ? 'index.html' : category ? 'ilanlar.html' : path.slice(1);
    if (['/', '/ilanlar.html', '/kullanilmis', '/sifir', '/parca', '/model.html'].includes(path)) {
      if (path === '/model.html' && u.searchParams.has('model')) {
        if (!/^\d{1,10}$/.test(u.searchParams.get('model'))) return missing(lang);
        const model = (
          await query('modeller', [['id', 'eq', Number(u.searchParams.get('model'))]])
        )[0];
        if (!model) return missing(lang);
        const make = (await query('markalar', [['id', 'eq', model.marka_id]]))[0];
        page.path += '?model=' + encodeURIComponent(model.id);
        page.title =
          (make?.ad || '') + ' ' + model.ad + ' · ' + (en ? 'Model Prices' : 'Model Fiyatları');
        page.description =
          page.title +
          (en
            ? ' in North Cyprus. Current BETA.CAR listings.'
            : ' · KKTC güncel BETA.CAR ilanları.');
      }
      const found = await call('ilan_ara', {
        p: {
          ...(category ? { kategori: category } : {}),
          ...(path === '/model.html' && u.searchParams.has('model')
            ? { model: u.searchParams.get('model') }
            : {}),
          sayfa: 1,
        },
      });
      page.content = cards(found.ilanlar, lang);
      if (path === '/') {
        const posts = await query('yazilar');
        page.content +=
          '<h2>' +
          (en ? 'Garage Journal' : 'Garaj Yazıları') +
          '</h2>' +
          posts
            .map(
              (r) =>
                '<p>' +
                link(
                  url('/yazilar.html?s=' + encodeURIComponent(r.slug), lang),
                  field(r, 'baslik', lang),
                ) +
                '</p>',
            )
            .join('');
      }
      if (
        path === '/ilanlar.html' &&
        ['kullanilmis', 'sifir', 'parca'].includes(u.searchParams.get('kategori'))
      )
        page.path = '/' + u.searchParams.get('kategori');
    } else if (path === '/ilan.html') {
      const no = u.searchParams.get('no'),
        id = no ? null : u.searchParams.get('id');
      if (no ? !/^\d{1,12}$/.test(no) : !id || !/^[0-9a-f-]{36}$/i.test(id))
        return missing(lang, 404, 'ilan.html');
      const r = (await query('ilan_kartlari', [[id ? 'id' : 'no', 'eq', id || Number(no)]]))[0];
      if (!r) {
        const raw = id ? (await db.collection('ilanlar').doc(id).get()).data() : null;
        return missing(
          lang,
          raw?.yayin &&
            !raw.gizli &&
            ['yayinda', 'kaldirildi', 'suresi_doldu', 'arsiv', 'satildi'].includes(raw.durum)
            ? 410
            : 404,
          'ilan.html',
        );
      }
      page.path = listingPath(r);
      page.title = r.baslik;
      page.description = [
        r.marka || r.diger_marka,
        r.model || r.diger_model,
        r.yil,
        r.km != null ? r.km + ' km' : '',
        money(r, lang),
        r.sehir,
      ]
        .filter(Boolean)
        .join(' · ');
      page.image = r.fotograflar?.[0];
      page.content = paragraphs(r.aciklama) + '<p>' + esc(page.description) + '</p>';
      page.vehicle = {
        '@type': 'Vehicle',
        name: r.baslik,
        url: url(page.path, lang),
        brand: r.marka || r.diger_marka,
        model: r.model || r.diger_model,
        vehicleModelDate: String(r.yil || ''),
        image: (r.fotograflar || []).map(image),
        ...(r.km != null
          ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: r.km, unitCode: 'KMT' } }
          : {}),
        ...(r.fiyat != null
          ? {
              offers: {
                '@type': 'Offer',
                price: r.fiyat,
                priceCurrency: r.para_birimi === 'TL' ? 'TRY' : r.para_birimi,
                availability:
                  'https://schema.org/' + (r.durum === 'satildi' ? 'SoldOut' : 'InStock'),
                url: url(page.path, lang),
              },
            }
          : {}),
      };
    } else if (path === '/firma.html') {
      const id = u.searchParams.get('id');
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return missing(lang);
      const r = (await query('firmalar', [['id', 'eq', id]]))[0];
      if (!r) return missing(lang);
      page.path += '?id=' + encodeURIComponent(r.id);
      page.title = r.ad;
      page.description =
        summary(r.hakkinda) || [r.ad, r.sehir, 'BETA.CAR'].filter(Boolean).join(' · ');
      page.image = r.kapak || r.logo;
      page.content =
        paragraphs(r.hakkinda) +
        cards((await call('ilan_ara', { p: { satici: r.kullanici_id } })).ilanlar, lang);
    } else if (path === '/yazilar.html' || path === '/sayfa.html') {
      const table = path === '/sayfa.html' ? 'sayfalar' : 'yazilar',
        s = u.searchParams.get('s') || (table === 'sayfalar' ? 'hakkimizda' : '');
      if (s) {
        if (s.length > 160) return missing(lang);
        const r = (await query(table, [['slug', 'eq', s]]))[0];
        if (!r) return missing(lang);
        page.path += '?s=' + encodeURIComponent(r.slug);
        page.title = field(r, 'baslik', lang);
        page.description = field(r, 'ozet', lang) || summary(field(r, 'icerik', lang));
        page.content = paragraphs(field(r, 'icerik', lang));
        page.image = r.kapak;
        if (table === 'yazilar') {
          page.type = 'article';
          page.schemas.push({
            '@type': 'Article',
            headline: page.title,
            description: summary(page.description),
            image: image(r.kapak),
            datePublished: r.yayin,
            ...(r.guncelleme ? { dateModified: r.guncelleme } : {}),
            inLanguage: lang,
            mainEntityOfPage: url(page.path, lang),
            publisher: { '@id': origin + '/#organization' },
          });
        }
      } else
        page.content = (await query(table))
          .map(
            (r) =>
              '<article class="panel"><h2>' +
              link(url(path + '?s=' + encodeURIComponent(r.slug), lang), field(r, 'baslik', lang)) +
              '</h2>' +
              paragraphs(field(r, 'ozet', lang)) +
              '</article>',
          )
          .join('');
    } else if (path === '/firmalar.html') {
      page.content = (await query('firmalar'))
        .map(
          (r) =>
            '<p>' +
            link(url('/firma.html?id=' + encodeURIComponent(r.id), lang), r.ad) +
            ' · ' +
            esc(r.sehir) +
            '</p>',
        )
        .join('');
    } else if (path === '/paketler.html') {
      page.content = (await query('paketler'))
        .map(
          (r) =>
            '<section class="panel"><h2>' +
            esc(r.ad) +
            '</h2>' +
            paragraphs(r.aciklama) +
            '<p>' +
            esc(
              [
                r.ilan_kotasi + (en ? ' listings' : ' ilan'),
                r.onecikarma_hakki + (en ? ' promotion rights' : ' öne çıkarma hakkı'),
                r.sure_gun + (en ? ' days' : ' gün'),
                money(r, lang),
              ].join(' · '),
            ) +
            '</p></section>',
        )
        .join('');
    } else if (path === '/talepler.html') {
      page.content = (await query('talepler'))
        .map(
          (r) =>
            '<article class="panel"><h2>' +
            esc(r.baslik || r.sehir) +
            '</h2>' +
            paragraphs(r.metin) +
            '</article>',
        )
        .join('');
    } else if (path === '/karsilastir.html') page.noindex = true;
    else if (!base) return missing(lang);
    const allowed =
      {
        '/ilan.html': ['id', 's', 'no'],
        '/firma.html': ['id'],
        '/yazilar.html': ['s'],
        '/sayfa.html': ['s'],
        '/model.html': ['model'],
        '/ilanlar.html': ['kategori'],
      }[path] || [];
    page.noindex ||= [...u.searchParams.keys()].some(
      (k) => k !== 'lang' && !allowed.includes(k) && !/^utm_|^gclid$|^fbclid$/.test(k),
    );
    return {
      status: 200,
      noindex: !!page.noindex,
      ...(['/ilan.html', '/firma.html'].includes(path) ? { cache: 'no-store' } : {}),
      body: renderSeo(await template(file), page),
    };
  };
}
