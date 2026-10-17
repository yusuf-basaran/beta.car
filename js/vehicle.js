import { bodyName, groupName, locale, t } from './i18n.js';
import { bodyLabels, bodyStates, groups, partsDef, popular, types } from './data.js';
import { $, $$, box } from './ui.js';
import { esc, key } from './utils.js';
import { state } from './state.js';

export function vehicleForm() {
  return `<div class="vehicle-fields"><label>${t('type')}<select name="tip"><option value="">${t('any')}</option>${types.map((x) => `<option value="${x}">${t(x)}</option>`).join('')}</select></label><label>${t('make')}<input name="marka" list="makes" autocomplete="off" placeholder="${t('any')}"><datalist id="makes"></datalist></label><label>${t('model')}<input name="model" list="models" autocomplete="off" placeholder="${t('any')}"><datalist id="models"></datalist></label><label>${t('year')}<select name="yil"><option value="">${t('any')}</option></select></label><label class="other-field" hidden>${t('otherMake')}<input name="diger_marka" maxlength="80"></label><label class="other-field" hidden>${t('otherModel')}<input name="diger_model" maxlength="80"></label></div>`;
}

export function bindVehicles(form) {
  const type = $('[name=tip]', form),
    make = $('[name=marka]', form),
    model = $('[name=model]', form),
    year = $('[name=yil]', form);
  let brands = [],
    models = [];
  const chosenMake = () => brands.find((m) => key(m[1]) === key(make.value));
  function years() {
    const m = models.find((m) => key(m[2]) === key(model.value)),
      first = m?.[3] || 1950,
      last = m?.[4] || new Date().getFullYear() + 1,
      prev = year.value;
    year.innerHTML =
      `<option value="">${t('any')}</option>` +
      Array.from(
        { length: Math.max(0, last - first + 1) },
        (_, i) => `<option>${last - i}</option>`,
      ).join('');
    year.value = prev;
    const other = key(model.value) === key(t('other'));
    $('[name=diger_model]', form).closest('label').hidden = !other;
    $('[name=diger_model]', form).required = other;
  }
  function updateModels(reset = true) {
    const m = chosenMake();
    make.dataset.id = m?.[0] || '';
    const ids = brands.filter((b) => key(b[1]) === key(make.value)).map((b) => b[0]);
    models = state.lex.modeller.filter((x) => ids.includes(x[1]));
    $('datalist[id^=models]', form).innerHTML =
      models.map((m) => `<option value="${esc(m[2])}"></option>`).join('') +
      `<option value="${t('other')}"></option>`;
    if (reset) model.value = '';
    const other = key(make.value) === key(t('other'));
    $('[name=diger_marka]', form).closest('label').hidden = !other;
    $('[name=diger_marka]', form).required = other;
    years();
  }
  function updateMakes(reset = true) {
    brands = state.lex.markalar
      .filter((m) => !type.value || m[2] === type.value)
      .sort((a, b) => {
        const pa = popular.indexOf(key(a[1])),
          pb = popular.indexOf(key(b[1]));
        return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb) || a[1].localeCompare(b[1], locale());
      });
    const seen = new Set();
    $('datalist[id^=makes]', form).innerHTML =
      brands
        .filter((m) => !seen.has(m[1]) && seen.add(m[1]))
        .map((m) => `<option value="${esc(m[1])}"></option>`)
        .join('') + `<option value="${t('other')}"></option>`;
    if (reset) make.value = '';
    updateModels(reset);
  }
  type.onchange = () => updateMakes();
  make.oninput = () => updateModels();
  model.oninput = years;
  updateMakes(false);
  return () => {
    const m = models.find((m) => key(m[2]) === key(model.value));
    return {
      tip: type.value,
      marka: m?.[1] || make.dataset.id,
      model: m?.[0] || '',
      yil: year.value,
      diger_marka: $('[name=diger_marka]', form).value,
      diger_model: $('[name=diger_model]', form).value,
    };
  };
}

export function bodySvg(data = {}, edit = false) {
  return (
    `<svg class="body-svg" viewBox="0 0 240 390" role="group" aria-label="` +
    `${t('bodyBox')}` +
    `"><defs><pattern id="damage-pattern" width="7" height="7" patternUnits="userSpaceOnUse"><path fill="#70232a" d="M0 0h7v7H0z"/>` +
    `<path stroke="#e8949b" d="M-1 1l7 7M3-3l7 7"/></pattern></defs>` +
    `<path fill="#111820" stroke="#46546a" d="M70 18Q120 0 170 18L206 63V325L173 365Q120 388 67 365L34 325V63Z"/>` +
    `<path fill="#22314b" stroke="#526079" d="M77 124Q120 110 163 124L159 149Q120 139 81 149ZM81 248Q120 260 159 248L163 273Q120 286 77 273Z"/>` +
    `${partsDef.map(([id, tr, en, d]) => `<path class="body-part state-${data[id] || 'none'}" d="${d}" data-part="${id}" tabindex="0" role="${edit ? 'button' : 'img'}" aria-label="${esc(state.lang === 'en' ? en : tr)}: ${bodyName(data[id] || '')}" ${edit ? '' : 'aria-roledescription="panel"'}><title>${esc(state.lang === 'en' ? en : tr)}: ${bodyName(data[id] || '')}</title></path>`).join('')}` +
    `</svg>`
  );
}

export function bodyBox(data = {}, report) {
  const summary = partsDef.every((p) => data[p[0]] === 'orijinal')
    ? t('allOriginalText')
    : !Object.keys(data).length
      ? t('noBody')
      : bodyStates
          .slice(1)
          .filter((s) => s !== 'orijinal')
          .map((s) => {
            const n = Object.values(data).filter((x) => x === s).length;
            return n ? `${n} ${bodyName(s).toLowerCase()}` : '';
          })
          .filter(Boolean)
          .join(', ');
  return box(
    'bodyBox',
    `<div class="body-layout">${bodySvg(data)}<div><p class="body-summary">${esc(summary || t('unknown'))}</p>${bodyStates
      .map((s, i) => {
        const names = partsDef
          .filter((p) => (data[p[0]] || '') === s)
          .map((p) => (state.lang === 'en' ? p[2] : p[1]));
        return names.length
          ? `<p class="legend"><span class="swatch state-${s || 'none'}"></span><strong>${t(bodyLabels[i])}</strong><span>${esc(names.join(', '))}</span></p>`
          : '';
      })
      .join(
        '',
      )}<p data-part-label aria-live="polite"></p><small>${t('declaration')}</small>${report ? `<p>${esc(report.firma)} · ${esc(report.tarih)}</p><button class="text-btn" data-report="${esc(report.dosya)}">${t('report')}</button>` : ''}</div></div>`,
  );
}

export function bindPanels() {
  $$('.body-layout .body-part').forEach((p) => {
    const show = () => {
      const label = $('[data-part-label]', p.closest('.body-layout'));
      if (label) label.textContent = p.getAttribute('aria-label');
    };
    p.onclick = show;
    p.onfocus = show;
    p.onmouseenter = show;
  });
}

export function equipmentBox(ids = []) {
  return box(
    'equipment',
    groups
      .map(
        (g, i) =>
          `<details ${i < 2 ? 'open' : ''}><summary>${groupName(g)}</summary><p>${
            state.eqs
              .filter((e) => e.grup === g && ids.includes(e.id))
              .map(
                (e) =>
                  `<abbr title="${esc({ ABS: t('absTip'), ESP: t('espTip'), AEB: t('aebTip') }[e.ad] || e.ad)}">${esc(state.lang === 'en' ? e.ad_en : e.ad)}</abbr>`,
              )
              .join(', ') || `<span class="muted">${t('unknown')}</span>`
          }</p></details>`,
      )
      .join(''),
  );
}

export function equipmentEdit(ids = [], tip = '') {
  return `<input id="equipment-search" type="search" placeholder="${t('searchEquipment')}">${groups
    .map(
      (g) =>
        `<details open><summary>${groupName(g)}</summary><button type="button" class="text-btn" data-select-group="${esc(g)}">${t('selectAll')}</button><div class="checks">${state.eqs
          .filter((e) => e.grup === g && (!tip || e.arac_tipi.includes(tip)))
          .map(
            (e) =>
              `<label class="check" data-equipment-label><input type="checkbox" name="donanim" value="${e.id}" ${ids.includes(e.id) ? 'checked' : ''}>${esc(state.lang === 'en' ? e.ad_en : e.ad)}</label>`,
          )
          .join('')}</div></details>`,
    )
    .join('')}`;
}

export function bindEquipment() {
  const s = $('#equipment-search');
  if (s)
    s.oninput = () =>
      $$('[data-equipment-label]').forEach(
        (l) => (l.hidden = !key(l.textContent).includes(key(s.value))),
      );
  $$('[data-select-group]').forEach(
    (b) =>
      (b.onclick = () => {
        const checks = $$('input[type=checkbox]', b.closest('details'));
        const value = !checks.every((c) => c.checked);
        checks.forEach((c) => (c.checked = value));
      }),
  );
}
