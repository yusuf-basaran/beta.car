import { esc } from './utils.js';
import { state } from './state.js';
import { $, $$, fail, footer, header, icon, syncMeta } from './ui.js';
import { t } from './i18n.js';
import { home } from './pages/home.js';
import { listPage } from './pages/list.js';
import { detailPage } from './pages/detail.js';
import { comparePage } from './pages/compare.js';
import { valuationPage } from './pages/valuation.js';
import { loginPage } from './pages/login.js';
import { accountPage } from './pages/account.js';
import { editorPage } from './pages/editor.js';
import { photosPage } from './pages/photos.js';
import { messagesPage } from './pages/messages.js';
import { wantedPage } from './pages/wanted.js';
import { packagesPage } from './pages/packages.js';
import { firmPage, firmsPage } from './pages/firms.js';
import { postsPage } from './pages/posts.js';
import { legalPage } from './pages/legal.js';
import { adminPage } from './pages/admin.js';

export function render() {
  document.documentElement.lang = state.lang;
  syncMeta();
  header();
  footer();
  $$('[data-i]').forEach((n) => (n.textContent = t(n.dataset.i)));
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
    list: listPage,
    detail: detailPage,
    compare: comparePage,
    model: () => valuationPage(true),
    valuation: () => valuationPage(false),
    login: loginPage,
    account: accountPage,
    editor: editorPage,
    photos: photosPage,
    messages: messagesPage,
    wanted: wantedPage,
    packages: packagesPage,
    firms: firmsPage,
    firm: firmPage,
    posts: postsPage,
    legal: legalPage,
    admin: adminPage,
  };
  await map[page]?.(id);
}
