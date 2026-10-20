import { esc, formatPrice, key, read, write } from './utils.js';
import { catKeys, footerGroups, nav, paths, slugs } from './data.js';
import { D, locale, number, t } from './i18n.js';
import { state } from './state.js';
import { render } from './navigation.js';
import { setCategory } from './pages/home.js';
import { label, select } from './forms.js';

export const $ = (s, p = document) => p.querySelector(s);

export const $$ = (s, p = document) => [...p.querySelectorAll(s)];

export const path = (s) => {
  try {
    const u = new URL(s, location.href);
    return ['https:', 'http:'].includes(u.protocol) ? esc(u.href) : '';
  } catch {
    return '';
  }
};

export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true"><path d="` +
  `${esc(paths[name])}` +
  `"></path></svg>`;

export const titleLink = (label, url) =>
  `<div class="section-head"><h2>${esc(t(label))}</h2><a href="${esc(url)}">${esc(t('all'))}${icon('arrow')}</a></div>`;

export function notify(s) {
  const n = $('#notice');
  n.textContent = s;
  n.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => n.classList.remove('show'), 3500);
}

export function chips() {
  const list =
    state.mainCat === 'parca'
      ? ['carParts', 'motorParts', 'truckParts']
      : state.mainCat === 'sifir'
        ? ['otomobil', 'motosiklet', 'minivan', 'suv', 'deniz', 'ticari', 'is_makinesi']
        : catKeys;
  return list
    .map(
      (c, i) =>
        `<a href="ilanlar.html?kategori=${esc(state.mainCat)}-${esc(state.mainCat === 'parca' ? ['binek', 'motor', 'yuk'][i] : slugs[catKeys.indexOf(c)])}">${esc(t(c))}</a>`,
    )
    .join('');
}

export function header() {
  $('#header').innerHTML =
    `<header class="header"><div class="header-inner"><a class="brand" href="index.html" aria-label="BETA.CAR">` +
    `<img src="logo-header.webp" alt="BETA.CAR" width="154" height="72" fetchpriority="high"><span hidden>BETA<span>.CAR</span></span></a><nav class="main-nav" aria-label="` +
    `${esc(t('home'))}` +
    `">` +
    `${nav.map(([s, k]) => `<a href="ilanlar.html?kategori=${esc(s)}" data-cat="${esc(s)}" class="${state.mainCat === s ? 'active' : ''}">${esc(t(k))}</a>`).join('')}` +
    `<a href="paketler.html">` +
    `${esc(t('packages'))}` +
    `</a><a href="firmalar.html">` +
    `${esc(t('firms'))}` +
    `</a></nav><div class="header-actions"><a class="icon-btn desktop" href="ilanlar.html" aria-label="` +
    `${esc(t('search'))}` +
    `">` +
    `${icon('search')}` +
    `</a><button id="language" class="language" aria-label="` +
    `${esc(t('lang'))}` +
    `">` +
    `${esc(state.lang.toUpperCase())}` +
    `</button><a class="icon-btn desktop" href="hesabim.html?sekme=bildirimler" aria-label="` +
    `${esc(t('notifications'))}` +
    `">` +
    `${icon('bell')}` +
    `<span id="notification-count" class="count" hidden></span></a><a class="icon-btn desktop" href="mesajlar.html" aria-label="` +
    `${esc(t('messages'))}` +
    `">` +
    `${icon('message')}` +
    `<span id="message-count" class="count" hidden></span></a><a class="login desktop" href="` +
    `${state.user ? 'hesabim.html' : 'giris.html'}` +
    `">` +
    `${esc(t(state.user ? 'account' : 'login'))}` +
    `</a><a class="btn sell" href="ilan-ver.html">` +
    `${icon('plus')}` +
    `${esc(t('sell'))}` +
    `</a></div></div><nav id="chips" class="chips" aria-label="` +
    `${esc(t('type'))}` +
    `">` +
    `${chips()}` +
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
    `</nav>`;
  $('.brand img').addEventListener('error', (e) => {
    e.target.hidden = true;
    $('.brand > span').hidden = false;
  });
  $('#language').onclick = () => {
    state.lang = state.lang === 'tr' ? 'en' : 'tr';
    write('bc-lang', state.lang);
    const url = new URL(location.href);
    if (state.lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
    render();
  };
  $$('[data-cat]').forEach(
    (a) =>
      (a.onclick = (e) => {
        if (document.body.dataset.page !== 'home') return;
        e.preventDefault();
        setCategory(a.dataset.cat);
      }),
  );
}

export function footer() {
  $('#footer').innerHTML =
    `<footer class="footer"><div class="wrap footer-grid">` +
    `${footerGroups.map(([k, links]) => `<div><h2>${esc(t(k))}</h2>${links.map(([label, s]) => `<a href="${s === 'paketler' ? 'paketler.html' : `sayfa.html?s=${esc(s)}`}">${esc(t(label))}</a>`).join('')}</div>`).join('')}` +
    `</div><div class="wrap footer-bottom"><span>© ` +
    `${esc(new Date().getFullYear())}` +
    ` BETA.CAR</span><span>` +
    `${Object.entries(state.settings.sosyal || {})
      .map(
        ([n, url]) =>
          `<a class="social-link" href="${path(url)}" target="_blank" rel="noopener">${esc(n)}</a>`,
      )
      .join('')}` +
    `${esc(t('gallery'))}` +
    `</span></div></footer>` +
    `${
      read('bc-consent', null)
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
    }`;
  $$('[data-consent]').forEach(
    (b) =>
      (b.onclick = () => {
        write('bc-consent', { value: 'essential', date: new Date().toISOString() });
        $('.cookie').remove();
      }),
  );
}

export function bodySummary(c) {
  if (
    Number(c.parca_sayisi) === 13 &&
    !Number(c.boyali) &&
    !Number(c.degisen) &&
    !Number(c.hasarli)
  )
    return t('original');
  return (
    [
      [c.boyali, 'painted'],
      [c.degisen, 'replaced'],
      [c.hasarli, 'damaged'],
    ]
      .filter(([n]) => Number(n) > 0)
      .map(([n, k]) => `${n} ${t(k)}`)
      .join(', ') || t('bodyUnknown')
  );
}

export function price(c) {
  return formatPrice(c.fiyat, c.para_birimi, locale(), t('priceCall'));
}

export function card(c) {
  const saved = read('bc-favs').includes(c.id),
    compared = read('bc-compare').includes(c.id),
    title = c.baslik || [c.marka, c.model].filter(Boolean).join(' ');
  const img = c.fotograflar?.[0],
    promoted = c.onecikarma && new Date(c.onecikarma_bitis) > new Date() ? c.onecikarma : '';
  const href = `ilan.html?id=${encodeURIComponent(c.id)}&s=${encodeURIComponent(key(title))}`,
    drop =
      c.onceki_fiyat > 0 && c.fiyat != null && c.fiyat < c.onceki_fiyat
        ? Math.round((1 - c.fiyat / c.onceki_fiyat) * 100)
        : 0;
  return (
    `<article class="listing ` +
    `${promoted === 'prestij' ? 'prestige' : promoted === 'vurgulu' ? 'highlight' : ''}` +
    `"><a class="listing-image" href="` +
    `${href}` +
    `" aria-label="` +
    `${esc(title)}` +
    `">` +
    `${img ? `<img src="${path(img)}" alt="${esc(title)}" width="320" height="220" loading="lazy">` : `<span class="no-photo">${icon('car')}<span>${esc(t('noPhoto'))}</span></span>`}` +
    `${promoted === 'hizli' ? `<span class="badge urgent">${esc(t('quick'))}</span>` : promoted === 'prestij' ? `<span class="badge gold">${esc(t('prestige'))}</span>` : ''}` +
    `</a><div class="listing-info"><div class="listing-top"><span class="eyebrow">` +
    `${esc([c.marka || c.diger_marka, c.model || c.diger_model].filter(Boolean).join(' / '))}` +
    `</span><button type="button" class="icon-btn favourite ` +
    `${saved ? 'selected' : ''}` +
    `" data-fav="` +
    `${esc(c.id)}` +
    `" aria-label="` +
    `${esc(t('favs'))}` +
    `" aria-pressed="` +
    `${esc(saved)}` +
    `">` +
    `${icon('heart')}` +
    `</button></div><h3><a href="` +
    `${href}` +
    `">` +
    `${esc(title)}` +
    `</a></h3><div class="specs">` +
    `${[c.yil, D[c.vites] ? t(c.vites) : c.vites, D[c.yakit] ? t(c.yakit) : c.yakit, c.km != null ? `${esc(number(c.km))} ${esc(t('km'))}` : null].filter(Boolean).map(esc).join('<span>·</span>')}` +
    `</div><div class="listing-badges">` +
    `${drop ? `<span>${esc(t('dropped'))} %${esc(drop)}</span>` : ''}` +
    `<span class="condition">` +
    `${esc(bodySummary(c))}` +
    `</span>` +
    `${c.ekspertizli ? `<span>${esc(t('expert'))}</span>` : ''}` +
    `${c.dogrulandi ? `<span>${esc(t('verified'))}</span>` : ''}` +
    `${c.durum === 'satildi' ? `<span>${esc(t('sold'))}</span>` : ''}` +
    `</div><div class="listing-bottom"><span class="location">` +
    `${icon('pin')}` +
    `${esc(c.sehir)}` +
    `</span><strong class="price">` +
    `${esc(displayPrice(c))}` +
    `</strong></div><div class="listing-tools"><label><input type="checkbox" data-compare="` +
    `${esc(c.id)}` +
    `" ` +
    `${compared ? 'checked' : ''}` +
    `>` +
    `${esc(t('compare'))}` +
    `</label>` +
    `${saved ? `<span>${esc(t('track'))}</span>` : ''}` +
    `</div></div></article>`
  );
}

export function bindCards() {
  $$('[data-fav]').forEach(
    (b) =>
      (b.onclick = async () => {
        const id = b.dataset.fav,
          fav = read('bc-favs'),
          has = fav.includes(id);
        if (state.db && state.user) {
          const r = has
            ? await state.db
                .from('favoriler')
                .delete()
                .eq('kullanici_id', state.user.id)
                .eq('ilan_id', id)
            : await state.db
                .from('favoriler')
                .upsert({ kullanici_id: state.user.id, ilan_id: id, fiyat_takibi: true });
          if (r.error) {
            notify(t('error'));
            return;
          }
        }
        write('bc-favs', has ? fav.filter((x) => x !== id) : [...fav, id]);
        $$('[data-fav]')
          .filter((n) => n.dataset.fav === id)
          .forEach((n) => {
            n.classList.toggle('selected', !has);
            n.setAttribute('aria-pressed', String(!has));
          });
        notify(t(has ? 'removed' : 'saved'));
      }),
  );
  $$('[data-compare]').forEach(
    (b) =>
      (b.onchange = () => {
        let list = read('bc-compare').filter((id) => id !== b.dataset.compare);
        if (b.checked && list.length >= 3) {
          b.checked = false;
          notify(t('compareMax'));
          return;
        }
        if (b.checked) list.push(b.dataset.compare);
        write('bc-compare', list);
        $$('[data-compare]').forEach((n) => (n.checked = list.includes(n.dataset.compare)));
      }),
  );
}

export function fail(e) {
  notify(e?.message || t('error'));
}

export function meta(title, desc, photo) {
  document.title = `${title} | BETA.CAR`;
  desc ||= $('meta[name=description]')?.content || title;
  for (const s of ['meta[name=description]', 'meta[property="og:description"]'])
    $(s)?.setAttribute('content', desc);
  $('meta[property="og:title"]')?.setAttribute('content', document.title);
  if (photo) {
    try {
      const image = new URL(photo, location.href);
      if (['http:', 'https:'].includes(image.protocol))
        $('meta[property="og:image"]')?.setAttribute('content', image.href);
    } catch {}
  }
  syncMeta();
}

export function syncMeta() {
  let c = $('link[rel=canonical]');
  if (!c) {
    c = document.createElement('link');
    c.rel = 'canonical';
    document.head.append(c);
  }
  const canonical = new URL(c.href || location.href);
  canonical.hash = '';
  canonical.searchParams.delete('lang');
  if (state.lang === 'en') canonical.searchParams.set('lang', 'en');
  c.href = canonical.href;
  for (const [name, value] of [
    ['og:url', c.href],
    ['og:locale', state.lang === 'en' ? 'en_GB' : 'tr_TR'],
    ['twitter:title', document.title],
    ['twitter:description', $('meta[name=description]')?.content || document.title],
    [
      'twitter:image',
      $('meta[property="og:image"]')?.content || new URL('og-image.png', location.href).href,
    ],
  ]) {
    const attr = name.startsWith('og:') ? 'property' : 'name';
    let n = $(`meta[${attr}="${name}"]`);
    if (!n) {
      n = document.createElement('meta');
      n.setAttribute(attr, name);
      document.head.append(n);
    }
    n.content = value;
  }
  for (const lang of ['tr', 'en', 'x-default']) {
    let n = $(`link[rel=alternate][hreflang="${lang}"]`);
    if (!n) {
      n = document.createElement('link');
      n.rel = 'alternate';
      n.hreflang = lang;
      document.head.append(n);
    }
    const target = new URL(canonical);
    target.searchParams.delete('lang');
    if (lang === 'en') target.searchParams.set('lang', 'en');
    n.href = target.href;
  }
}

export async function clip(s) {
  try {
    await navigator.clipboard.writeText(s);
    notify(t('success'));
  } catch {
    notify(s);
  }
}

export const safety = () =>
  `<aside class="warning"><p>${esc(t('safety'))}</p><p>${esc(t('ibanWarning'))}</p></aside>`;

export const money = (n, c = 'GBP') => formatPrice(n, c, locale(), t('priceContact'));

export function currencyTools() {
  return label(
    'currency',
    select(
      'display_currency',
      [
        ['', 'nativePrice'],
        ...['GBP', 'EUR', 'USD', 'TL'].filter((c) => state.settings.kurlar?.[c] > 0),
      ],
      read('bc-currency', ''),
      false,
    ),
  );
}

export function displayPrice(c) {
  const to = read('bc-currency', ''),
    rates = state.settings.kurlar || {};
  return to && to !== c.para_birimi && rates[to] > 0 && rates[c.para_birimi] > 0 && c.fiyat != null
    ? `${t('approx')} ${money(Math.round((c.fiyat / rates[c.para_birimi]) * rates[to]), to)}`
    : price(c);
}

export function currencyBind() {
  const s = $('[name=display_currency]');
  if (s)
    s.onchange = () => {
      write('bc-currency', s.value);
      $$('.listing').forEach((n) => {
        const c = state.listed.find((c) => c.id === $('[data-fav]', n)?.dataset.fav);
        if (c) $('.price', n).textContent = displayPrice(c);
      });
    };
}

export const pageHead = (k, extra = '') =>
  `<div class="page-head"><h1>${esc(t(k))}</h1>${extra}</div>`;

export const box = (title, body) =>
  `<section class="panel"><h2>${esc(t(title))}</h2>${body}</section>`;

export const empty = () => `<p class="empty">${esc(t('empty'))}</p>`;

export const loginPrompt = () =>
  `<p class="empty">${esc(t(state.db ? 'needLogin' : 'connect'))} <a href="giris.html?next=${encodeURIComponent(location.pathname + location.search)}">${esc(t('signin'))}</a></p>`;

export { esc } from './utils.js';
