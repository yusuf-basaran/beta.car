import { $, empty, meta, pageHead, path } from '../ui.js';
import { locale, t } from '../i18n.js';
import { state } from '../state.js';
import { params } from '../context.js';
import { query, table } from '../api.js';
import { esc } from '../utils.js';

export async function postsPage() {
  meta(t('seoPostsTitle'), t('seoPostsDescription'));
  $('#main').innerHTML = pageHead('journal');
  if (!state.db) {
    $('#main').insertAdjacentHTML('beforeend', empty());
    return;
  }
  if (params.has('s')) {
    const p = await query(
      table('yazilar').eq('slug', params.get('s')).eq('aktif', true).maybeSingle(),
    );
    if (!p) {
      $('#main').insertAdjacentHTML('beforeend', empty());
      return;
    }
    const title = state.lang === 'en' ? p.baslik_en : p.baslik,
      content = state.lang === 'en' ? p.icerik_en : p.icerik;
    meta(title, state.lang === 'en' ? p.ozet_en : p.ozet, p.kapak);
    $('#main').innerHTML = '';
    $('#main').insertAdjacentHTML(
      'beforeend',
      `<article class="panel prose article"><h1>` +
        `${esc(title)}` +
        `</h1><p class="muted">` +
        `${esc(p.kategori)}` +
        ` · ` +
        `${esc(new Date(p.yayin).toLocaleDateString(locale()))}` +
        `</p>` +
        `${p.kapak ? `<img src="${path(p.kapak)}" alt="${esc(title)}" width="840" height="420">` : ''}` +
        `<div>` +
        `${paragraphs(content)}` +
        `</div></article>`,
    );
    const related = await query(
      table('yazilar').eq('kategori', p.kategori).neq('id', p.id).limit(3),
    );
    $('#main').insertAdjacentHTML(
      'beforeend',
      `<div class="articles">` +
        `${related.map((p) => `<a href="yazilar.html?s=${encodeURIComponent(p.slug)}"><h2>${esc(state.lang === 'en' ? p.baslik_en : p.baslik)}</h2></a>`).join('')}` +
        `</div>`,
    );
  } else {
    const list = await query(
      table('yazilar').eq('aktif', true).order('yayin', { ascending: false }),
    );
    $('#main').insertAdjacentHTML(
      'beforeend',
      `<div class="articles">` +
        `${
          list
            .map(
              (p) =>
                `<a href="yazilar.html?s=` +
                `${encodeURIComponent(p.slug)}` +
                `">` +
                `${p.kapak ? `<img src="${path(p.kapak)}" alt="${esc(state.lang === 'en' ? p.baslik_en : p.baslik)}" width="600" height="360" loading="lazy">` : ''}` +
                `<span class="eyebrow">` +
                `${esc(p.kategori)}` +
                `</span><h2>` +
                `${esc(state.lang === 'en' ? p.baslik_en : p.baslik)}` +
                `</h2><p>` +
                `${esc(state.lang === 'en' ? p.ozet_en : p.ozet)}` +
                `</p></a>`,
            )
            .join('') || empty()
        }` +
        `</div>`,
    );
  }
}

export function paragraphs(text) {
  return esc(text || '')
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
