import { $, bindCards, box, card, meta, money, pageHead } from '../ui.js';
import { t } from '../i18n.js';
import { bindVehicles, vehicleForm } from '../vehicle.js';
import { button, guard, inp, label, select } from '../forms.js';
import { rpc } from '../api.js';
import { write } from '../utils.js';
import { state } from '../state.js';
import { params } from '../context.js';

export async function valuationPage(modelOnly) {
  meta(t(modelOnly ? 'modelTitle' : 'valuationTitle'));
  $('#main').innerHTML =
    pageHead(modelOnly ? 'modelTitle' : 'valuationTitle') +
    `<form id="valuation" class="panel">${vehicleForm()}<div class="fields">${label('km', inp('km', 'number', '', 'min="0"'))}${label('fuel', select('yakit', ['petrol', 'diesel', 'hybrid', 'mild', 'plugin', 'electric']))}${label('gear', select('vites', ['automatic', 'manual']))}${label('currency', select('para_birimi', ['GBP', 'EUR', 'USD', 'TL'], 'GBP', false))}</div>${button('calculate')}</form><div id="valuation-result"></div>`;
  const form = $('#valuation'),
    values = bindVehicles(form);
  guard(form, async () => {
    const v = values();
    if (!v.model) throw Error(t('invalid'));
    const [m, rows] = await Promise.all([
      rpc('model_ozeti', {
        p_model: Number(v.model),
        p_yil: v.yil ? Number(v.yil) : null,
        p_km: !modelOnly && form.km.value ? Number(form.km.value) : null,
        p_yakit: !modelOnly ? form.yakit.value : null,
        p_vites: !modelOnly ? form.vites.value : null,
        p_para: form.para_birimi.value,
      }),
      rpc('ilan_ara', { p: { ...v, para_birimi: form.para_birimi.value } }),
    ]);
    const lower = modelOnly ? m.en_dusuk : m.adet >= 5 ? m.alt : null,
      upper = modelOnly ? m.en_yuksek : m.adet >= 5 ? m.ust : null;
    $('#valuation-result').innerHTML =
      box(
        'estimate',
        m && lower
          ? `<strong class="detail-price">${money(lower, form.para_birimi.value)} – ${money(upper, form.para_birimi.value)}</strong><dl class="spec-table"><div><dt>${t('average')}</dt><dd>${money(m.ortalama, form.para_birimi.value)}</dd></div><div><dt>${t('count')}</dt><dd>${m.adet}</dd></div></dl><div class="distribution"><h3>${t('distribution')}</h3>${(m.dagilim || []).map(([i, n]) => `<label>${money(Math.round(Number(m.en_dusuk) + ((Number(m.en_yuksek) - Number(m.en_dusuk)) * i) / 5), form.para_birimi.value)}<meter min="0" max="${m.adet}" value="${n}"></meter><span>${n}</span></label>`).join('')}</div>`
          : `<p>${t('insufficient')}</p>`,
      ) +
      `<a class="btn" id="sell-estimate" href="ilan-ver.html">${t('sellMine')}</a><div class="listing-list">${rows.ilanlar.map(card).join('')}</div>`;
    $('#sell-estimate').onclick = () =>
      write('bc-valuation', {
        ...v,
        km: form.km.value,
        yakit: form.yakit.value,
        vites: form.vites.value,
      });
    if (modelOnly)
      meta(
        `${form.marka.value} ${form.model.value} · ${t('modelTitle')}`,
        `${form.marka.value} ${form.model.value}: ${rows.toplam} ${t('resultCount')}`,
      );
    bindCards();
  });
  const m = state.lex.modeller.find((x) => String(x[0]) === params.get('model')),
    b = state.lex.markalar.find((x) => x[0] === m?.[1]);
  if (b && m) {
    form.marka.value = b[1];
    form.marka.dispatchEvent(new Event('input'));
    form.model.value = m[2];
    form.model.dispatchEvent(new Event('input'));
    form.dataset.start = Date.now() - 1000;
    form.requestSubmit();
  }
}
