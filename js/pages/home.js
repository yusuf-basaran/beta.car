import {
  $,
  $$,
  bindCards,
  card,
  chips,
  header,
  icon,
  path,
  titleLink,
  meta,
  skeleton,
} from '../ui.js';
import { number, t } from '../i18n.js';
import { nav, sections } from '../data.js';
import { state } from '../state.js';
import { bindVehicles, vehicleForm } from '../vehicle.js';
import { esc, key, read, write } from '../utils.js';
import { rpc } from '../api.js';

export const drawing = () =>
  `<svg class="hero-car" viewBox="0 0 840 300" fill="none" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">
    <path d="M100 286H770" stroke="var(--line)"/>
    ${[232, 650]
      .map(
        (x) => `<g transform="translate(${x} 232)">
      <circle r="49" fill="var(--bg)" stroke="var(--line)" stroke-width="2"/>
      <circle r="38" stroke="var(--muted)" stroke-width="3"/>
      <circle r="29" fill="var(--surface)" stroke="var(--line)"/>
      <path d="M20-18Q32-8 28 11" stroke="currentColor" stroke-width="5"/>
      ${[0, 72, 144, 216, 288].map((a) => `<path d="M-5-8-8-33 1-36 7-9 19 24 11 31 0 9Z" fill="var(--muted)" transform="rotate(${a})"/>`).join('')}
      <circle r="9" fill="var(--bg)" stroke="var(--text)" stroke-width="2"/>
      <circle r="3" fill="currentColor"/>
    </g>`,
      )
      .join('')}
    <path d="M69 197 82 165Q91 151 132 146L224 126 302 73Q331 54 380 54H460Q496 54 533 81L607 129 732 148Q764 153 779 177L795 202 789 225Q761 238 709 239L706 222C703 189 681 173 650 173S595 193 594 226L590 240H286L284 223C282 190 261 173 232 173S178 193 177 227L173 240H101L80 229 69 212Z" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>
    <path d="M93 159 224 137 303 85Q331 65 382 65H459Q491 65 527 91L593 133 734 155 757 166 602 144H221L105 174Z" fill="var(--text)" opacity=".08"/>
    <path d="M252 126 318 83Q340 69 380 69H458Q488 69 517 89L573 128Z" fill="var(--bg)" stroke="var(--text)" stroke-width="1.8"/>
    <path d="M376 73 363 126M472 77 503 127" stroke="var(--muted)" stroke-width="3"/>
    <path d="M318 88Q342 76 375 76M388 76H454Q479 76 498 86" stroke="currentColor" stroke-width="2"/>
    <path d="M516 130 537 124Q548 124 551 135L529 141Z" fill="var(--muted)"/>
    <path d="M90 177 154 161 227 151H558Q585 151 607 143L730 161" stroke="currentColor" stroke-width="1.7"/>
    <path d="M296 146 286 188 293 221H548Q563 220 566 205L570 157M493 143 508 215" stroke="var(--line)" stroke-width="1.5"/>
    <path d="M309 159H333" stroke="var(--muted)" stroke-width="3"/>
    <path d="M301 229H575" stroke="var(--muted)" stroke-width="2"/>
    <path d="M110 190 155 181M111 199 151 190M610 159 641 153" stroke="var(--line)" stroke-width="2"/>
    <path d="M716 169 759 179 773 193 733 184Z" fill="var(--text)"/>
    <path d="M732 188 774 198" stroke="currentColor" stroke-width="2"/>
    <path d="M752 209 781 205 775 222 740 227Z" fill="var(--bg)" stroke="var(--line)"/>
    <path d="M78 177 112 171 107 183 73 190" stroke="var(--red)" stroke-width="3"/>
    <path d="M91 220 122 228H161M721 234 771 225" stroke="var(--muted)" stroke-width="2"/>
  </svg>`;

export function home() {
  meta(t('seoHomeTitle'), t('seoHomeDescription'));
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
    `</div><form id="search-form" data-category="${esc(state.mainCat)}"><div class="keyword-row"><label class="keyword">` +
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
    `${state.phase === 'loading' ? `<span class="sr-only" role="status">${esc(t('loading'))}</span>` : !state.db ? `<p class="connection" role="status">${esc(t('offline'))}</p>` : ''}` +
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
  if (state.homeError) {
    const p = document.createElement('div');
    p.className = 'connection';
    p.setAttribute('role', 'status');
    p.innerHTML = `${esc(t('error'))} <button class="text-btn">${esc(t('retry'))}</button>`;
    p.querySelector('button').onclick = () => load();
    $('#feed').prepend(p);
  }
}

export function section(s, filter) {
  const href =
    s === 'galleries' || s === 'dealers'
      ? `firmalar.html?tur=${filter}`
      : s === 'journal'
        ? 'yazilar.html'
        : `ilanlar.html?${s === 'parts' ? 'kategori=parca' : filter ? `onecikarma=${filter}` : s === 'recent' ? 'son=1' : ''}`;
  let content;
  if (state.phase === 'loading') content = skeleton(1, false);
  else if (s === 'galleries' || s === 'dealers') {
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
  const form = $('#search-form');
  if (form) {
    form.dataset.category = cat;
    form.dispatchEvent(new Event('categorychange'));
  }
}

export async function load(draw = true) {
  if (!state.db) return;
  try {
    const data = await rpc('ana_sayfa', {
      p_son: read('bc-recent')
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        .slice(0, 10),
    });
    Object.assign(state, data);
    state.homeError = false;
  } catch {
    state.homeError = true;
  }
  if (draw) home();
}
