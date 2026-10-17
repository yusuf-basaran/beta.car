import { $, $$, bindCards, card, chips, header, icon, path, titleLink } from '../ui.js';
import { number, t } from '../i18n.js';
import { nav, sections } from '../data.js';
import { state } from '../state.js';
import { bindVehicles, vehicleForm } from '../vehicle.js';
import { esc, key, read, write } from '../utils.js';
import { rpc } from '../api.js';

export const drawing = () =>
  `<svg class="hero-car" viewBox="0 0 840 300" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.3">` +
  `<path opacity=".25" d="M0 250H840M100 270H780M680 20V285M180 60V285M0 205H840"/>` +
  `<path d="M62 201l18-42 70-20 112-71q24-13 77-14h144q43 0 87 26l94 58 94 21 21 34-9 34h-68q0-63-50-63t-50 63H239q0-63-50-63t-50 63H73z"/>` +
  `<path d="M169 137h444l-69-45q-27-17-60-19H343q-36 0-58 12zM360 75l-18 61M466 76l35 61M322 147l-6 65h227l-4-65M570 146l19 25M273 145l-21 ` +
  `40M84 166h62l-13 15H77M708 164l37 10 9 17h-46M354 158h24M558 158h24M244 224h350"/><circle cx="189" cy="223" r="39"/>` +
  `<circle cx="189" cy="223" r="24"/><circle cx="189" cy="223" r="7"/><circle cx="652" cy="223" r="39"/><circle cx="652" cy="223" r="24"/>` +
  `<circle cx="652" cy="223" r="7"/><path opacity=".5" d="M189 186v74M152 223h74M652 186v74M615 223h74M70 282h690M70 278v8M760 278v8"/></g>` +
  `</svg>`;

export function home() {
  $('#main').innerHTML =
    `<section class="hero"><div class="wrap hero-top"><div><p class="eyebrow">` +
    `${esc(t('island'))}` +
    `</p><h1>` +
    `${esc(t('hero'))}` +
    `</h1><p class="hero-intro">` +
    `${esc(t('intro'))}` +
    `</p><span class="signature">` +
    `${esc(t('gallery'))}` +
    `</span></div>` +
    `${drawing()}` +
    `</div><div class="wrap"><div class="search-box"><div class="search-tabs" role="tablist" aria-label="` +
    `${esc(t('search'))}` +
    `">` +
    `${nav.map(([s], i) => `<button type="button" role="tab" aria-selected="${esc(s === state.mainCat)}" data-tab="${esc(s)}">${esc(t(['usedShort', 'newShort', 'parts'][i]))}</button>`).join('')}` +
    `</div><form id="search-form"><div class="keyword-row"><label class="keyword">` +
    `${icon('search')}` +
    `<input name="q" type="search" placeholder="` +
    `${esc(t('keywords'))}` +
    `" aria-label="` +
    `${esc(t('keywordsLabel'))}` +
    `" autocomplete="off" aria-controls="suggestions"></label><button class="btn search-submit" type="submit">` +
    `${esc(t('search'))}` +
    `${icon('arrow')}` +
    `</button></div><div id="suggestions" class="suggestions" aria-label="` +
    `${esc(t('results'))}` +
    `" hidden></div>` +
    `${vehicleForm()}` +
    `</form></div><div class="budget"><span>` +
    `${esc(t('budget'))}` +
    `</span>` +
    `${[
      ['under', 'max=10000'],
      ['middle', 'min=10000&max=25000'],
      ['over', 'min=25000'],
    ]
      .map(
        ([k, q]) =>
          `<a href="ilanlar.html?${esc(q)}&para_birimi=GBP">${esc(t(k))}${icon('arrow')}</a>`,
      )
      .join('')}` +
    `</div></div></section><div class="stats wrap">` +
    `${[
      ['kullanilmis', 'usedCount'],
      ['sifir', 'newCount'],
      ['parca', 'partCount'],
      ['firma', 'firmCount'],
    ]
      .map(
        ([key, label]) =>
          `<div><strong>${esc(state.counts ? number(state.counts[key]) : '—')}</strong><span>${esc(t(label))}</span></div>`,
      )
      .join('')}` +
    `</div><div class="wrap actions"><a href="degerleme.html">` +
    `${esc(t('valuationTitle'))}` +
    `</a><a href="karsilastir.html">` +
    `${esc(t('compare'))}` +
    `</a><a href="talepler.html">` +
    `${esc(t('wantedTitle'))}` +
    `</a></div><div id="feed" class="wrap feed">` +
    `${!state.db ? `<p class="connection" role="status">${esc(t('offline'))}</p>` : ''}` +
    `${sections.map(([s, filter], i) => section(s, filter) + (i === 1 ? banner(1) : i === 5 ? banner(2) : '')).join('')}` +
    `</div>`;
  const form = $('#search-form'),
    values = bindVehicles(form);
  $$('[data-tab]').forEach((b) => (b.onclick = () => setCategory(b.dataset.tab)));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const query = $('[name=q]', form).value.trim(),
      v = values(),
      exact = state.cars.find(
        (c) => String(c.no) === query.replace(/^#/, '') && /^#?\d+$/.test(query),
      );
    if (exact) {
      location.href = `ilan.html?id=${exact.id}`;
      return;
    }
    if (/^#?\d+$/.test(query)) {
      location.href = `ilan.html?no=${encodeURIComponent(query.replace(/^#/, ''))}`;
      return;
    }
    const params = new URLSearchParams({ kategori: state.mainCat, ...v, q: query });
    for (const [k, val] of [...params]) if (!val) params.delete(k);
    const history = read('bc-searches').filter((s) => s.query !== params.toString());
    history.unshift({ query: params.toString(), date: Date.now() });
    write('bc-searches', history.slice(0, 10));
    if (state.db && state.user)
      await rpc('arama_gecmis', { p_sorgu: params.toString() }).catch(() => {});
    location.href = `ilanlar.html?${params}`;
  };
  let suggestTimer;
  $('[name=q]', form).oninput = (e) => {
    const q = key(e.target.value),
      box = $('#suggestions');
    const matches =
      q.length > 1
        ? state.cars.filter((c) => key(c.baslik).includes(q) || String(c.no) === q).slice(0, 5)
        : [];
    box.hidden = !matches.length;
    const show = (list) => {
      box.hidden = !list.length;
      box.innerHTML = list
        .map(
          (c) =>
            `<a href="ilan.html?id=${esc(c.id)}"><span>${esc(c.baslik)}</span><small>${esc(t('listingNo'))} ${esc(c.no)}</small></a>`,
        )
        .join('');
    };
    show(matches);
    clearTimeout(suggestTimer);
    if (state.db && q.length > 1) {
      const typed = e.target.value;
      suggestTimer = setTimeout(
        () =>
          rpc('ilan_ara', { p: { q: typed, kategori: state.mainCat } })
            .then((r) => {
              if ($('[name=q]', form)?.value === typed) show(r.ilanlar.slice(0, 5));
            })
            .catch(() => {}),
        220,
      );
    }
  };
  $('[name=q]', form).onkeydown = (e) => {
    if (e.key === 'Escape') $('#suggestions').hidden = true;
  };
  bindCards();
}

export function section(s, filter) {
  const href =
    s === 'galleries' || s === 'dealers'
      ? `firmalar.html?tur=${filter}`
      : s === 'journal'
        ? 'yazilar.html'
        : `ilanlar.html?${s === 'parts' ? 'kategori=parca' : filter ? `onecikarma=${filter}` : s === 'recent' ? 'son=1' : ''}`;
  let content;
  if (s === 'galleries' || s === 'dealers') {
    const list = state.firms.filter((f) => f.tur === filter);
    content = list.length
      ? `<div class="firms">` +
        `${list
          .map(
            (f) =>
              `<a class="firm-card" href="firma.html?id=` +
              `${esc(f.id)}` +
              `"><span class="firm-initial">` +
              `${esc(f.ad.slice(0, 1))}` +
              `</span><div><h3>` +
              `${esc(f.ad)}` +
              `</h3><p>` +
              `${esc(f.sehir)}` +
              `</p>` +
              `${f.dogrulandi ? `<small>${esc(t('verified'))}</small>` : ''}` +
              `</div>` +
              `${icon('arrow')}` +
              `</a>`,
          )
          .join('')}` +
        `</div>`
      : `<p class="empty">${esc(t('noFirm'))}</p>`;
  } else if (s === 'journal') {
    content = state.posts.length
      ? `<div class="articles">` +
        `${state.posts
          .map(
            (p) =>
              `<a href="yazilar.html?s=` +
              `${encodeURIComponent(p.slug)}` +
              `"><span class="eyebrow">` +
              `${esc(p.kategori)}` +
              `</span><h3>` +
              `${esc(state.lang === 'en' ? p.baslik_en : p.baslik)}` +
              `</h3><p>` +
              `${esc(state.lang === 'en' ? p.ozet_en : p.ozet)}` +
              `</p>` +
              `${icon('arrow')}` +
              `</a>`,
          )
          .join('')}` +
        `</div>`
      : `<p class="empty">${esc(t('noArticle'))}</p>`;
  } else {
    let list =
      s === 'recent'
        ? read('bc-recent')
            .slice(0, 10)
            .map((id) => state.cars.find((c) => c.id === id))
            .filter(Boolean)
        : s === 'parts'
          ? state.cars.filter((c) =>
              state.cats.find((k) => k.id === c.kategori_id)?.slug.startsWith('parca'),
            )
          : filter
            ? state.cars.filter(
                (c) => c.onecikarma === filter && new Date(c.onecikarma_bitis) > new Date(),
              )
            : state.cars.filter(
                (c) => !state.cats.find((k) => k.id === c.kategori_id)?.slug.startsWith('parca'),
              );
    content = list.length
      ? `<div class="listing-list">${list
          .slice(0, s === 'recent' ? 10 : 4)
          .map(card)
          .join('')}</div>`
      : `<p class="empty">${esc(t(s === 'recent' ? 'noRecent' : 'empty'))}</p>`;
  }
  return `<section class="home-section" id="${esc(s)}">${titleLink(s, href)}${content}</section>`;
}

export function banner(place) {
  const b = state.banners.find((b) => b.yer === place);
  if (!b) return '';
  const image = b.resim
    ? `<img src="${path(b.resim)}" alt="" width="500" height="160" loading="lazy">`
    : '';
  return (
    `<aside class="banner">` +
    `${image}` +
    `<div><h2>` +
    `${esc(state.lang === 'en' ? b.baslik_en : b.baslik)}` +
    `</h2><p>` +
    `${esc(state.lang === 'en' ? b.metin_en : b.metin)}` +
    `</p>` +
    `${b.baglanti ? `<a href="${path(b.baglanti)}" class="icon-btn" aria-label="${esc(state.lang === 'en' ? b.baslik_en : b.baslik)}">${icon('arrow')}</a>` : ''}` +
    `</div></aside>`
  );
}

export function setCategory(cat) {
  state.mainCat = cat;
  header();
  $('#chips').innerHTML = chips();
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === cat)));
}

export async function load() {
  if (!state.db) return;
  const res = await Promise.allSettled([
    state.db.rpc('ana_akim', {
      p_son: read('bc-recent')
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        .slice(0, 10),
    }),
    state.db.from('kategoriler').select('*').order('sira'),
    state.db.from('firmalar').select('*').eq('one_cikan', true).limit(12),
    state.db
      .from('yazilar')
      .select('slug,baslik,baslik_en,ozet,ozet_en,kategori')
      .eq('aktif', true)
      .order('yayin', { ascending: false })
      .limit(3),
    state.db.from('bannerlar').select('*').eq('aktif', true),
    state.db.rpc('sayaclar'),
  ]);
  const values = res.map((r) => (r.status === 'fulfilled' && !r.value.error ? r.value.data : null));
  [state.cars, state.cats, state.firms, state.posts, state.banners, state.counts] = values.map(
    (r, i) => r ?? (i === 5 ? undefined : []),
  );
  home();
  if (res.some((r) => r.status === 'rejected' || r.value.error)) {
    const p = document.createElement('div');
    p.className = 'connection';
    p.setAttribute('role', 'status');
    p.innerHTML = `${esc(t('error'))} <button class="text-btn">${esc(t('retry'))}</button>`;
    p.querySelector('button').onclick = load;
    $('#feed').prepend(p);
  }
}
