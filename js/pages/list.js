import { number, t } from '../i18n.js';
import { esc, filterUrl, read } from '../utils.js';
import {
  $,
  $$,
  bindCards,
  card,
  currencyBind,
  currencyTools,
  displayPrice,
  empty,
  fail,
  icon,
  meta,
  notify,
  pageHead,
  skeleton,
} from '../ui.js';
import { button, check, inp, label, safeAction, select } from '../forms.js';
import { params } from '../context.js';
import { cityList } from '../data.js';
import {
  bindVehicleEquipment,
  bindVehicles,
  categorySelect,
  equipmentEdit,
  vehicleForm,
} from '../vehicle.js';
import { state } from '../state.js';
import { need, query, rpc } from '../api.js';

export function readFilter(form, values) {
  const f = new FormData(form),
    p = { ...Object.fromEntries(f), ...values() };
  if (p.q) p.q = p.q.trim();
  p.donanim = f.getAll('donanim').map(Number);
  p.detay = {};
  for (const k of Object.keys(p)) {
    if (k.startsWith('d_')) {
      p.detay[k.slice(2)] = p[k] === 'on' ? 'true' : p[k];
      delete p[k];
    }
    if (p[k] === '' || k === 'website_check') delete p[k];
  }
  if (!p.ekspertizli) delete p.ekspertizli;
  else p.ekspertizli = 'true';
  return p;
}

export function mapContent(list) {
  const points = {
      Girne: [35.337, 33.319],
      Lefkoşa: [35.185, 33.365],
      Gazimağusa: [35.126, 33.942],
      İskele: [35.283, 33.891],
      Güzelyurt: [35.199, 32.994],
      Lefke: [35.111, 32.85],
    },
    zoom = 9,
    xy = ([lat, lon]) => [
      ((lon + 180) / 360) * 2 ** zoom,
      ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
    ],
    center = xy([35.22, 33.4]),
    base = [Math.floor(center[0]) - 2, Math.floor(center[1]) - 1];
  return (
    `<div class="map"><svg viewBox="0 0 1024 768" role="img" aria-label="` +
    `${esc(t('mapView'))}` +
    `">` +
    `${Array.from({ length: 12 }, (_, n) => {
      const x = n % 4,
        y = Math.floor(n / 4);
      return `<image href="https://tile.openstreetmap.org/${zoom}/${esc(base[0] + x)}/${esc(base[1] + y)}.png" x="${esc(x * 256)}" y="${esc(y * 256)}" width="256" height="256"/>`;
    }).join('')}` +
    `${Object.entries(points)
      .filter(([s]) => list.some((c) => c.sehir === s))
      .map(([s, coord]) => {
        const [x, y] = xy(coord),
          n = list.filter((c) => c.sehir === s).length;
        return (
          `<a href="ilanlar.html?sehir=` +
          `${encodeURIComponent(s)}` +
          `"><g transform="translate(` +
          `${esc((x - base[0]) * 256)}` +
          `,` +
          `${esc((y - base[1]) * 256)}` +
          `)"><circle r="21" fill="#22d3ee" stroke="#0d0f12" stroke-width="3"/><text text-anchor="middle" y="6" font-size="18" fill="#0d0f12">` +
          `${esc(n)}` +
          `</text><text text-anchor="middle" y="-30" font-size="18" fill="#10161e" stroke="#fff" stroke-width="4" paint-order="stroke">` +
          `${esc(s)}` +
          `</text></g></a>`
        );
      })
      .join('')}` +
    `</svg><a class="attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></div>`
  );
}

export async function listPage(id) {
  meta(
    t({ kullanilmis: 'used', sifir: 'new', parca: 'parts' }[params.get('kategori')] || 'listTitle'),
  );
  const order = [
    ['yeni', 'latest'],
    ['fiyat_artan', 'priceAsc'],
    ['fiyat_azalan', 'priceDesc'],
    ['yil', 'yearSort'],
    ['km', 'kmSort'],
  ];
  $('#main').innerHTML =
    pageHead(
      'listTitle',
      `<button class="btn secondary" id="filter-toggle">${esc(t('filter'))}</button>`,
    ) +
    `<div class="listing-search" role="search" aria-label="${esc(t('search'))}"><label class="keyword">${icon('search')}${inp('q', 'search', params.get('q') || '', `form="filters" maxlength="140" placeholder="${esc(t('keywords'))}" aria-label="${esc(t('keywordsLabel'))}" aria-controls="results" autocomplete="off"`)}</label><button class="btn" type="submit" form="filters">${esc(t('search'))}</button></div>` +
    (`<div class="search-layout"><form id="filters" class="panel filters"><h2>` +
      `${esc(t('filter'))}` +
      `</h2>` +
      `${label('category', categorySelect('kategori', params.get('kategori')))}` +
      `${vehicleForm()}` +
      `<div class="fields">` +
      `${label('min', inp('min', 'number', '', 'min="0"'))}` +
      `${label('max', inp('max', 'number', '', 'min="0"'))}` +
      `${label('currency', select('para_birimi', ['GBP', 'EUR', 'USD', 'TL']))}` +
      `${label('city', select('sehir', cityList))}` +
      `${label('fuel', select('yakit', ['petrol', 'diesel', 'hybrid', 'mild', 'plugin', 'electric']))}` +
      `${label('gear', select('vites', ['automatic', 'manual']))}` +
      `${label('year', inp('yil_min', 'number', '', 'min="1950"'))}` +
      `${label('max', inp('yil_max', 'number', '', 'min="1950"'))}` +
      `${label('km', inp('km_max', 'number', '', 'min="0"'))}` +
      `${label('sellerType', select('satici_tipi', [['bireysel', 'personal'], 'galeri', 'yetkili_satici']))}` +
      `${label('body', inp('d_kasa'))}` +
      `${label('color', inp('d_renk'))}` +
      `${label('steering', select('d_direksiyon', ['right', 'left']))}` +
      `${label('plate', select('d_plaka', ['localPlate', 'trPlate', 'importPlate']))}` +
      `${label('origin', select('d_ulke', ['uk', 'japan', 'other']))}` +
      `${label('grade', inp('d_grade'))}` +
      `${label(
        'bodyBox',
        select('kaporta', [
          ['orijinal', 'original'],
          ['degisensiz', 'noReplacement'],
          ['hasarsiz', 'noDamage'],
          ['1', `${esc(t('bodyLimit'))}: 1`],
          ['2', `${esc(t('bodyLimit'))}: 2`],
          ['3', `${esc(t('bodyLimit'))}: 3`],
        ]),
      )}` +
      `</div>` +
      `${check('ekspertizli', 'expertOnly')}` +
      `${['customs', 'trade', 'finance', 'warranty'].map((k) => check('d_' + k, k)).join('')}` +
      `<details><summary>` +
      `${esc(t('equipment'))}` +
      `</summary>` +
      `<div id="equipment-filter">${equipmentEdit()}</div>` +
      `</details><div class="actions">` +
      `${button('apply')}` +
      `${button('clear', 'clear-filter', 'text-btn')}` +
      `</div></form><div class="results"><div class="result-tools"><strong id="result-count" aria-live="polite">—</strong>` +
      `${select('sira', order, params.get('sira') || 'yeni', false)}` +
      `${currencyTools()}` +
      `<div class="view-switch">` +
      `${['listView', 'gridView', 'mapView'].map((k) => `<button data-view="${esc(k)}" aria-pressed="${esc(k === 'listView')}">${esc(t(k))}</button>`).join('')}` +
      `</div><button class="text-btn" id="save-search">` +
      `${esc(t('saveSearch'))}` +
      `</button></div><div id="results"></div><div class="pagination" id="pagination"></div></div></div>`);
  const form = $('#filters'),
    values = bindVehicles(form);
  let view = 'listView',
    page = Number(params.get('sayfa') || 1),
    timer,
    request = 0;
  for (const [k, v] of params) {
    const el = form.elements.namedItem(k);
    if (el && k !== 'marka' && k !== 'model' && k !== 'donanim') {
      if (el.type === 'checkbox') el.checked = v === 'on' || v === 'true';
      else el.value = v;
    }
  }
  $('[name=kategori]', form).dispatchEvent(new Event('change'));
  const type = $('[name=tip]', form);
  if (!type.disabled && [...type.options].some((o) => o.value === params.get('tip')))
    type.value = params.get('tip');
  $('[name=tip]', form).dispatchEvent(new Event('change'));
  const b = state.lex.markalar.find((m) => String(m[0]) === params.get('marka')),
    m = state.lex.modeller.find((m) => String(m[0]) === params.get('model'));
  if (b) {
    form.marka.value = b[1];
    form.marka.dispatchEvent(new Event('input'));
  }
  if (m) {
    form.model.value = m[2];
    form.model.dispatchEvent(new Event('input'));
  }
  form.yil.value = params.get('yil') || '';
  $$('[name=donanim]', form).forEach(
    (e) => (e.checked = params.getAll('donanim').includes(e.value)),
  );
  bindVehicleEquipment(form, $('#equipment-filter'));
  async function run() {
    clearTimeout(timer);
    if (id !== state.routeId) return;
    const p = readFilter(form, values);
    p.sira = $('[name=sira]').value;
    p.sayfa = page;
    if (params.get('satici')) p.satici = params.get('satici');
    if (params.get('onecikarma')) p.onecikarma = params.get('onecikarma');
    const url = new URL(location.href);
    url.search = filterUrl(p);
    if (state.lang === 'en') url.searchParams.set('lang', 'en');
    if (params.has('son')) url.searchParams.set('son', '1');
    for (const key of [...params.keys()]) params.delete(key);
    for (const [key, value] of url.searchParams) params.append(key, value);
    history.replaceState(null, '', url);
    if (!state.db) {
      $('#results').innerHTML = `<p class="empty">${esc(t('connect'))}</p>`;
      return;
    }
    const current = ++request,
      results = $('#results');
    results.setAttribute('aria-busy', 'true');
    results.innerHTML = skeleton(3);
    $('#pagination').innerHTML = '';
    let r;
    try {
      r = await rpc('ilan_ara', { p });
    } catch (error) {
      if (id !== state.routeId || current !== request) return;
      results.innerHTML = `<p class="empty" role="alert">${esc(t('error'))}</p>`;
      throw error;
    } finally {
      if (id === state.routeId && current === request) results.setAttribute('aria-busy', 'false');
    }
    if (id !== state.routeId || current !== request) return;
    state.listed = r.ilanlar;
    if (params.has('son'))
      state.listed = state.listed.filter((c) => read('bc-recent').includes(c.id));
    $('#result-count').textContent = `${number(r.toplam)} ${t('resultCount')}`;
    draw();
    const total = Math.ceil(r.toplam / 20);
    $('#pagination').innerHTML =
      total > 1
        ? `<button ` +
          `${page <= 1 ? 'disabled' : ''}` +
          ` data-p="-1">` +
          `${esc(t('prev'))}` +
          `</button><span>` +
          `${esc(page)}` +
          ` / ` +
          `${esc(total)}` +
          `</span><button ` +
          `${page >= total ? 'disabled' : ''}` +
          ` data-p="1">` +
          `${esc(t('next'))}` +
          `</button>`
        : '';
    $$('[data-p]').forEach(
      (b) =>
        (b.onclick = safeAction(async () => {
          page += Number(b.dataset.p);
          await run();
        })),
    );
  }
  function draw() {
    if ($('#results').getAttribute('aria-busy') === 'true') return;
    $('#results').className = view === 'gridView' ? 'listing-grid' : 'listing-list';
    $('#results').innerHTML =
      view === 'mapView' ? mapContent(state.listed) : state.listed.map(card).join('') || empty();
    $$('#results .listing').forEach(
      (n, i) => ($('.price', n).textContent = displayPrice(state.listed[i])),
    );
    bindCards();
    currencyBind();
  }
  form.onsubmit = safeAction(async () => {
    page = 1;
    await run();
    form.classList.remove('open');
  });
  const schedule = () => {
    clearTimeout(timer);
    page = 1;
    timer = setTimeout(() => run().catch(fail), 300);
  };
  form.onchange = schedule;
  form.q.oninput = (event) => {
    if (!event.isComposing) schedule();
  };
  form.q.oncompositionend = schedule;
  $('#filter-toggle').onclick = () => form.classList.toggle('open');
  $('#clear-filter').type = 'button';
  $('#clear-filter').onclick = () => {
    form.reset();
    form.q.value = '';
    form.tip.dispatchEvent(new Event('change'));
    page = 1;
    run().catch(fail);
  };
  $('[name=sira]').onchange = () => {
    page = 1;
    run().catch(fail);
  };
  $$('[data-view]').forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        $$('[data-view]').forEach((n) => n.setAttribute('aria-pressed', String(n === b)));
        draw();
      }),
  );
  $('#save-search').onclick = safeAction(async () => {
    need();
    const p = readFilter(form, values);
    p.sira = $('[name=sira]').value;
    await query(
      state.db.from('aramalar').insert({ ad: form.q.value || t('listTitle'), filtre: p }),
    );
    notify(t('success'));
  });
  await run();
}
