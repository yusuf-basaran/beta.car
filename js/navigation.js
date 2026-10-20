import { esc } from './utils.js';
import { state } from './state.js';
import { $, $$, fail, footer, header, icon, skeleton, syncMeta } from './ui.js';
import { t } from './i18n.js';
import { home } from './pages/home.js';

export function render() {
  document.documentElement.lang = state.lang;
  syncMeta();
  header();
  footer();
  $$('[data-i]').forEach((n) => (n.textContent = t(n.dataset.i)));
  const main = $('#main');
  main.setAttribute('aria-busy', String(state.phase === 'loading'));
  if (state.phase === 'loading') {
    if (document.body.dataset.page === 'home') home();
    else {
      const loading = `<div class="wrap page" data-startup>${skeleton(2)}</div>`;
      if (main.querySelector('[data-startup]'))
        main.querySelector('[data-startup]').outerHTML = loading;
      else main.insertAdjacentHTML('beforeend', loading);
    }
    return;
  }
  if (state.phase === 'error' || state.phase === 'unconfigured') {
    main.innerHTML = `<div class="wrap empty" role="alert"><p>${esc(t(state.phase === 'error' ? 'error' : 'connect'))}</p><button class="btn" id="startup-retry">${esc(t('retry'))}</button></div>`;
    $('#startup-retry').onclick = () => location.reload();
    return;
  }
  if (document.body.dataset.page === 'home') home();
  else if (document.body.dataset.page !== '404') route().catch(fail);
  else if (document.body.dataset.page === '404') {
    document.title = `${t('notFound')} | BETA.CAR`;
    $('#main').innerHTML =
      `<section class="wrap missing"><span class="error-code">404</span><h1>` +
      `${esc(t('notFound'))}` +
      `</h1><p>` +
      `${esc(t('notFoundText'))}` +
      `</p><a class="btn" href="index.html">` +
      `${esc(t('backHome'))}` +
      `${icon('arrow')}` +
      `</a></section>`;
  }
}

export async function route() {
  const id = ++state.routeId,
    page = document.body.dataset.page;
  $('#main').className = 'wrap page';
  const map = {
    list: ['list', 'listPage'],
    detail: ['detail', 'detailPage'],
    compare: ['compare', 'comparePage'],
    model: ['valuation', 'valuationPage', true],
    valuation: ['valuation', 'valuationPage', false],
    login: ['login', 'loginPage'],
    account: ['account', 'accountPage'],
    editor: ['editor', 'editorPage'],
    photos: ['photos', 'photosPage'],
    messages: ['messages', 'messagesPage'],
    wanted: ['wanted', 'wantedPage'],
    packages: ['packages', 'packagesPage'],
    firms: ['firms', 'firmsPage'],
    firm: ['firms', 'firmPage'],
    posts: ['posts', 'postsPage'],
    legal: ['legal', 'legalPage'],
    admin: ['admin', 'adminPage'],
  };
  const entry = map[page];
  if (!entry) return;
  const main = $('#main');
  main.setAttribute('aria-busy', 'true');
  try {
    const module = await import(`./pages/${entry[0]}.js`);
    if (id === state.routeId) await module[entry[1]](entry.length > 2 ? entry[2] : id);
  } catch (error) {
    if (id === state.routeId && main.querySelector('.skeleton'))
      main.innerHTML = `<p class="empty" role="alert">${esc(t('error'))}</p>`;
    throw error;
  } finally {
    if (id === state.routeId) main.setAttribute('aria-busy', 'false');
  }
}
