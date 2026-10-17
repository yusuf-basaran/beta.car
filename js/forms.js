import { $, fail, notify } from './ui.js';
import { D, t } from './i18n.js';
import { esc } from './utils.js';
import { need, query, rpc } from './api.js';
import { state } from './state.js';

export const safeAction = (fn) => async (e) => {
  e?.preventDefault();
  const b = e?.submitter;
  if (b) b.disabled = true;
  try {
    await fn(e);
  } catch (err) {
    fail(err);
  } finally {
    if (b) b.disabled = false;
  }
};

export const label = (k, input) => `<label>${esc(t(k))}${input}</label>`;

export const inp = (name, type = 'text', value = '', extra = '') =>
  `<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}>`;

export const opts = (list, val = '', any = true) =>
  `${any ? `<option value="">${esc(t('any'))}</option>` : ''}` +
  `${list
    .map((x) => {
      const [v, k] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(D[k] ? t(k) : k)}</option>`;
    })
    .join('')}`;

export const select = (name, list, val = '', any = true) =>
  `<select name="${esc(name)}">${opts(list, val, any)}</select>`;

export const check = (name, k, checked = false) =>
  `<label class="check"><input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''}>${esc(t(k))}</label>`;

export const button = (k, id = '', cls = 'btn') =>
  `<button class="${cls}" ${id ? `id="${id}"` : ''}>${esc(t(k))}</button>`;

export function guard(form, fn) {
  form.dataset.start = Date.now();
  form.insertAdjacentHTML(
    'beforeend',
    '<input class="trap" name="website_check" tabindex="-1" autocomplete="off" aria-hidden="true">',
  );
  form.onsubmit = safeAction(async (e) => {
    if (form.website_check.value || Date.now() - Number(form.dataset.start) < 700)
      throw Error(t('invalid'));
    await fn(new FormData(form), e);
  });
}

export function reportForm(ilan, mesaj) {
  need();
  const dlg = document.createElement('dialog');
  dlg.innerHTML =
    `<form><h2>` +
    `${esc(t('reportListing'))}` +
    `</h2>` +
    `${label(
      'reason',
      select(
        'sebep',
        [
          ['sahte', 'fake'],
          ['kapora', 'deposit'],
          ['fiyat', 'wrongPrice'],
          ['satilmis', 'soldReport'],
          ['diger', 'other'],
        ],
        'sahte',
        false,
      ),
    )}` +
    `${label('note', '<textarea name="notu" maxlength="2000"></textarea>')}` +
    `<div class="actions">` +
    `${button('send')}` +
    `<button type="button" class="text-btn">` +
    `${esc(t('cancel'))}` +
    `</button></div></form>`;
  document.body.append(dlg);
  $('button[type=button]', dlg).onclick = () => dlg.close();
  dlg.onclose = () => dlg.remove();
  guard($('form', dlg), async (f) => {
    await query(
      state.db.from('sikayetler').insert({
        ilan_id: ilan || null,
        mesaj_id: mesaj || null,
        sebep: f.get('sebep'),
        notu: f.get('notu'),
      }),
    );
    dlg.close();
    notify(t('success'));
  });
  dlg.showModal();
}

export function promoteDialog(ilan) {
  const d = document.createElement('dialog');
  d.innerHTML =
    `<form><h2>` +
    `${esc(t('promote'))}` +
    `</h2>` +
    `${select('tur', ['seckin', 'hizli', 'prestij', 'vurgulu'], 'seckin', false)}` +
    `${button('promote')}` +
    `<a href="paketler.html">` +
    `${esc(t('buyRights'))}` +
    `</a><button type="button" class="text-btn">` +
    `${esc(t('cancel'))}` +
    `</button></form>`;
  document.body.append(d);
  $('button[type=button]', d).onclick = () => d.close();
  d.onclose = () => d.remove();
  guard($('form', d), async (f) => {
    await rpc('kota', { p_ilan: ilan, p_islem: 'onecikar', p_tur: f.get('tur') });
    d.close();
    notify(t('success'));
  });
  d.showModal();
}
