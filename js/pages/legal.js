import { params } from '../context.js';
import { $, box, empty, meta, notify, pageHead, safety } from '../ui.js';
import { state } from '../state.js';
import { t } from '../i18n.js';
import { need, query, table } from '../api.js';
import { esc } from '../utils.js';
import { paragraphs } from './posts.js';
import { button, guard, inp, label } from '../forms.js';

export async function legalPage() {
  const slug = params.get('s') || 'hakkimizda';
  $('#main').innerHTML = pageHead('beta');
  if (!state.db) {
    $('#main').insertAdjacentHTML('beforeend', `<p class="empty">${esc(t('connect'))}</p>`);
    return;
  }
  const p = await query(table('sayfalar').eq('slug', slug).maybeSingle());
  if (!p) {
    $('#main').insertAdjacentHTML('beforeend', empty());
    return;
  }
  const title = state.lang === 'en' ? p.baslik_en : p.baslik;
  meta(title);
  $('#main').innerHTML =
    `<article class="panel prose legal"><h1>` +
    `${esc(title)}` +
    `</h1>` +
    `${paragraphs(state.lang === 'en' ? p.icerik_en : p.icerik)}` +
    `</article>` +
    `${['guvenli-alim', 'guvenli-satis'].includes(slug) ? safety() : ''}`;
  if (['reklam-ver', 'iletisim'].includes(slug)) {
    $('#main').insertAdjacentHTML(
      'beforeend',
      box(
        'contact',
        `<form id="contact-form">` +
          `${label('title', inp('konu', 'text', title, 'required maxlength="140"'))}` +
          `${label('description', '<textarea name="metin" required minlength="5" maxlength="4000"></textarea>')}` +
          `${button('send')}` +
          `</form>`,
      ),
    );
    guard($('#contact-form'), async (f) => {
      need();
      await query(state.db.from('iletisim').insert({ konu: f.get('konu'), metin: f.get('metin') }));
      notify(t('success'));
    });
  }
}
