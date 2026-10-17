import { $, $$, bodySummary, empty, fail, meta, pageHead, price } from '../ui.js';
import { D, bodyName, groupName, t } from '../i18n.js';
import { esc, read, write } from '../utils.js';
import { state } from '../state.js';
import { query, table } from '../api.js';
import { groups, partsDef } from '../data.js';

export async function comparePage() {
  meta(t('compare'));
  $('#main').innerHTML = pageHead('compare');
  const ids = read('bc-compare').slice(0, 3);
  if (!state.db || !ids.length) {
    $('#main').insertAdjacentHTML('beforeend', empty());
    return;
  }
  const list = await query(table('ilan_kartlari').in('id', ids));
  const panels = await query(table('ilan_parca').in('ilan_id', ids)),
    equipment = await query(table('ilan_donanim').in('ilan_id', ids));
  const rows = [
    ['title', ...list.map((c) => c.baslik)],
    ['amount', ...list.map(price)],
    ...['yil', 'km', 'yakit', 'vites', 'sehir'].map((k, i) => [
      ['year', 'km', 'fuel', 'gear', 'city'][i],
      ...list.map((c) => (D[c[k]] ? t(c[k]) : c[k])),
    ]),
    ['bodyBox', ...list.map(bodySummary)],
    ...partsDef.map(([k, tr, en]) => [
      state.lang === 'en' ? en : tr,
      ...list.map((c) =>
        bodyName(panels.find((p) => p.ilan_id === c.id && p.parca === k)?.durum || ''),
      ),
    ]),
    ...groups.map((g) => [
      groupName(g),
      ...list.map(
        (c) =>
          state.eqs
            .filter(
              (e) =>
                e.grup === g && equipment.some((x) => x.ilan_id === c.id && x.donanim_id === e.id),
            )
            .map((e) => (state.lang === 'en' ? e.ad_en : e.ad))
            .join(', ') || t('unknown'),
      ),
    ]),
    ...state.eqs
      .filter((e) => equipment.some((x) => x.donanim_id === e.id))
      .map((e) => [
        `${groupName(e.grup)} / ${state.lang === 'en' ? e.ad_en : e.ad}`,
        ...list.map((c) =>
          t(equipment.some((x) => x.ilan_id === c.id && x.donanim_id === e.id) ? 'yes' : 'no'),
        ),
      ]),
  ];
  $('#main').insertAdjacentHTML(
    'beforeend',
    `<div class="table-scroll"><table class="compare-table"><thead><tr><th></th>${list.map((c) => `<th><a href="ilan.html?id=${c.id}">${esc(c.baslik)}</a><button class="text-btn" data-remove-compare="${c.id}">×</button></th>`).join('')}</tr></thead><tbody>${rows.map(([k, ...values]) => `<tr class="${new Set(values.map(String)).size > 1 ? 'different' : ''}"><th>${D[k] ? t(k) : esc(k)}</th>${values.map((v) => `<td>${esc(v ?? t('unknown'))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  );
  $$('[data-remove-compare]').forEach(
    (b) =>
      (b.onclick = () => {
        write(
          'bc-compare',
          ids.filter((i) => i !== b.dataset.removeCompare),
        );
        comparePage().catch(fail);
      }),
  );
}
