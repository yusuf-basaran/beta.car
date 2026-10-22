import { t } from './i18n.js';
import { state } from './state.js';
import { read, write } from './utils.js';

const current = new URL(location.href);
let target;
try {
  target =
    current.pathname === '/cevrimdisi.html'
      ? new URL(current.searchParams.get('next') || '/', current.origin)
      : new URL(current);
  if (
    target.origin !== current.origin ||
    target.username ||
    target.password ||
    target.pathname === '/cevrimdisi.html'
  )
    target = new URL('/', current.origin);
} catch {
  target = new URL('/', current.origin);
}
state.lang =
  (current.searchParams.get('lang') || target.searchParams.get('lang') || read('bc-lang', 'tr')) ===
  'en'
    ? 'en'
    : 'tr';
const button = document.getElementById('offline-retry');
const status = document.getElementById('offline-status');
function render() {
  document.documentElement.lang = state.lang;
  document.title = `${t('offlineTitle')} | KONTAK`;
  document.querySelectorAll('[data-i]').forEach((n) => {
    n.textContent = t(n.dataset.i);
  });
  document.querySelector('meta[name=description]').content = t('offlineDescription');
  const language = document.getElementById('offline-language');
  language.textContent = state.lang.toUpperCase();
  language.setAttribute('aria-label', t('lang'));
  document.getElementById('offline-home').href = state.lang === 'en' ? '/?lang=en' : '/';
}
document.getElementById('offline-language').onclick = () => {
  state.lang = state.lang === 'tr' ? 'en' : 'tr';
  write('bc-lang', state.lang);
  status.textContent = '';
  render();
};
button.onclick = async () => {
  button.disabled = true;
  status.textContent = t('checkingConnection');
  try {
    const response = await fetch('/manifest.json', {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error();
    if (state.lang === 'en') target.searchParams.set('lang', 'en');
    else target.searchParams.delete('lang');
    if (target.pathname + target.search === current.pathname + current.search) location.reload();
    else location.replace(target.href);
  } catch {
    status.textContent = t('stillOffline');
  } finally {
    button.disabled = false;
  }
};
window.addEventListener('online', () => {
  status.textContent = t('connectionAvailable');
});
window.addEventListener('offline', () => {
  status.textContent = t('offlineNotice');
});
render();
