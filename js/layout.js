import { nav, paths, footerGroups, catKeys, slugs } from './data.js';
import { t as translate } from './i18n.js';
import { esc } from './utils.js';

export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true"><path d="` +
  `${esc(paths[name])}` +
  `"></path></svg>`;

export function skeletonHtml(count = 1, announce = true, lang = 'tr') {
  return `<div class="skeleton" ${announce ? 'role="status"' : 'aria-hidden="true"'}>
    ${announce ? `<span class="sr-only">${esc(translate('loading', lang))}</span>` : ''}
    ${Array.from({ length: count }, () => `<div class="skeleton-card" aria-hidden="true"><span class="skeleton-shape"></span><div class="skeleton-body">${'<span class="skeleton-shape skeleton-bar"></span>'.repeat(4)}</div></div>`).join('')}
  </div>`;
}

export function chipsHtml(category = 'kullanilmis', lang = 'tr') {
  const t = (k) => translate(k, lang);
  const list = category === 'sifir' ? catKeys.filter((c) => c !== 'nostalji') : catKeys;
  return list
    .map(
      (c) =>
        `<a href="/ilanlar.html?kategori=${esc(category)}-${esc(slugs[catKeys.indexOf(c)])}">${esc(t(c))}</a>`,
    )
    .join('');
}

export function headerHtml({
  lang = 'tr',
  category = 'kullanilmis',
  user = false,
  online = true,
  current = '/',
} = {}) {
  const t = (k) => translate(k, lang);
  return (
    `<header class="header"><div class="header-inner"><a class="brand" href="/" aria-label="KONTAK">` +
    `<img src="/assets/logo-white.webp" alt="KONTAK" width="190" height="38" fetchpriority="high"><span hidden>KONTAK</span></a><nav class="main-nav" aria-label="` +
    `${esc(t('home'))}` +
    `">` +
    `${nav.map(([s, k]) => `<a href="/ilanlar.html?kategori=${esc(s)}" data-cat="${esc(s)}" class="${category === s ? 'active' : ''}">${esc(t(k))}</a>`).join('')}` +
    `<a href="paketler.html">` +
    `${esc(t('packages'))}` +
    `</a><a href="firmalar.html">` +
    `${esc(t('firms'))}` +
    `</a></nav><div class="header-actions"><a class="icon-btn desktop" href="ilanlar.html" aria-label="` +
    `${esc(t('search'))}` +
    `" title="${esc(t('search'))}">` +
    `${icon('search')}` +
    `</a><button id="language" class="language" aria-label="` +
    `${esc(t('lang'))}` +
    `">` +
    `${esc(lang.toUpperCase())}` +
    `</button><a class="icon-btn desktop" href="hesabim.html?sekme=bildirimler" aria-label="` +
    `${esc(t('notifications'))}` +
    `" title="${esc(t('notifications'))}">` +
    `${icon('bell')}` +
    `<span id="notification-count" class="count" hidden></span></a><a class="icon-btn desktop" href="mesajlar.html" aria-label="` +
    `${esc(t('messages'))}` +
    `" title="${esc(t('messages'))}">` +
    `${icon('message')}` +
    `<span id="message-count" class="count" hidden></span></a><a class="login desktop" href="` +
    `${user ? 'hesabim.html' : 'giris.html'}` +
    `">` +
    `${esc(t(user ? 'account' : 'login'))}` +
    `</a><a class="btn sell" href="ilan-ver.html">` +
    `${icon('plus')}` +
    `${esc(t('sell'))}` +
    `</a></div></div><nav id="chips" class="chips" aria-label="` +
    `${esc(t('type'))}` +
    `">` +
    `${chipsHtml(category, lang)}` +
    `</nav></header><nav class="mobile-nav" aria-label="` +
    `${esc(t('home'))}` +
    `">` +
    `${[
      ['home', 'index.html', 'home'],
      ['search', 'ilanlar.html', 'search'],
      ['sell', 'ilan-ver.html', 'plus'],
      ['favs', 'hesabim.html?sekme=favoriler', 'heart'],
      ['account', 'hesabim.html', 'user'],
    ]
      .map(
        ([label, href, i]) =>
          `<a href="${esc(href)}" class="${label === 'sell' ? 'mobile-sell' : ''}">${icon(i)}<span>${esc(t(label))}</span></a>`,
      )
      .join('')}` +
    `</nav><div id="connection-status" class="connection-status" role="status" ${online ? 'hidden' : ''}>${esc(t('offlineNotice'))}<a href="/cevrimdisi.html?next=${encodeURIComponent(current)}">${esc(t('offlineView'))}</a></div>`
  );
}

const safeUrl = (value, base) => {
  try {
    const u = new URL(value, base);
    return ['http:', 'https:'].includes(u.protocol) ? esc(u.href) : '';
  } catch {
    return '';
  }
};

export function footerHtml({
  lang = 'tr',
  social = {},
  consent = true,
  base = new URL('/', import.meta.url).href,
} = {}) {
  const t = (k) => translate(k, lang);
  return (
    `<footer class="footer"><div class="wrap"><a href="/" aria-label="KONTAK"><img class="footer-logo" src="/assets/logo-white.webp" alt="KONTAK" width="190" height="38" loading="lazy"></a></div><div class="wrap footer-grid">` +
    `${footerGroups.map(([k, links]) => `<div><h2>${esc(t(k))}</h2>${links.map(([label, s]) => `<a href="${s === 'paketler' ? 'paketler.html' : `sayfa.html?s=${esc(s)}`}">${esc(t(label))}</a>`).join('')}</div>`).join('')}` +
    `</div><div class="wrap footer-bottom"><span>© ` +
    `${esc(new Date().getFullYear())}` +
    ` KONTAK</span><span>` +
    `${Object.entries(social || {})
      .map(
        ([n, url]) =>
          `<a class="social-link" href="${safeUrl(url, base)}" target="_blank" rel="noopener">${esc(n)}</a>`,
      )
      .join('')}` +
    `${esc(t('gallery'))}` +
    `</span></div></footer>` +
    `${
      consent
        ? ''
        : `<aside class="cookie" aria-label="` +
          `${esc(t('cookies'))}` +
          `"><p>` +
          `${esc(t('cookieText'))}` +
          ` <a href="sayfa.html?s=cerez-politikasi">` +
          `${esc(t('cookies'))}` +
          `</a></p><div><button class="btn" data-consent="essential">` +
          `${esc(t('cookieOnly'))}` +
          `</button></div></aside>`
    }`
  );
}

export const layouts = () =>
  Object.fromEntries(
    ['tr', 'en'].map((lang) => [
      lang,
      {
        header: Object.fromEntries(
          nav.map(([category]) => [category, headerHtml({ lang, category })]),
        ),
        footer: footerHtml({ lang }),
        legal: Object.fromEntries(
          footerGroups
            .flatMap(([, links]) => links)
            .filter(([, slug]) => slug !== 'paketler')
            .map(([, slug]) => [
              slug,
              {
                title: translate('seoTitle_' + slug, lang),
                description: translate('seo_' + slug, lang),
              },
            ]),
        ),
      },
    ]),
  );
