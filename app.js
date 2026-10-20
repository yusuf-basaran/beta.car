import { render } from './js/navigation.js';
import { cfg } from './js/config.js';
import { state } from './js/state.js';
import { read, write } from './js/utils.js';
import { $, notify } from './js/ui.js';
import { t } from './js/i18n.js';
import { query, rpc, table } from './js/api.js';
import { load } from './js/pages/home.js';
import { createClient } from './js/firebase.js';

async function start() {
  if (document.body.dataset.page === '404') {
    state.phase = 'ready';
    render();
    return;
  }
  render();
  try {
    state.db = await createClient(cfg);
    if (!state.db) {
      state.phase = 'unconfigured';
      render();
      return;
    }
    const { data } = await state.db.auth.getUser();
    state.user = data?.user;
    const page = document.body.dataset.page;
    if (!state.user && ['account', 'editor', 'photos', 'messages', 'admin'].includes(page)) {
      state.phase = 'ready';
      render();
      return;
    }
    const references = async () => {
      const vehicles = ['home', 'list', 'editor', 'valuation', 'model'].includes(page);
      let cached;
      if (vehicles) {
        try {
          cached = JSON.parse(sessionStorage.getItem('bc-vehicles') || 'null');
        } catch {}
      }
      if (cached?.url === state.db.projectId && Date.now() - cached.time < 86400000)
        state.lex = cached.data;
      else cached = null;
      const data = await rpc('baslangic', {
        p_sozluk: vehicles && !cached,
        p_donanim: ['list', 'editor', 'detail', 'compare'].includes(page),
      });
      state.cats = data.cats;
      state.eqs = data.eqs;
      state.settings = data.settings;
      if (data.lex) {
        state.lex = data.lex;
        try {
          sessionStorage.setItem(
            'bc-vehicles',
            JSON.stringify({
              url: state.db.projectId,
              time: Date.now(),
              data: state.lex,
            }),
          );
        } catch {}
      }
    };
    const favorites = async () => {
      if (!state.user) return;
      const favs = read('bc-favs');
      if (favs.length) {
        const r = await state.db.from('favoriler').upsert(
          favs.map((id) => ({ kullanici_id: state.user.id, ilan_id: id, fiyat_takibi: true })),
          { onConflict: 'kullanici_id,ilan_id', ignoreDuplicates: true },
        );
        if (r.error) notify(t('error'));
      }
      const r = await state.db
        .from('favoriler')
        .select('ilan_id')
        .eq('kullanici_id', state.user.id);
      if (!r.error)
        write(
          'bc-favs',
          r.data.map((f) => f.ilan_id),
        );
    };
    const profile = async () => {
      if (!state.user) return;
      state.me = await rpc('profilim');
      const pending = read('bc-company', null);
      if (pending && pending.email?.toLowerCase() === state.user.email?.toLowerCase()) {
        let firm = await query(table('firmalar').eq('kullanici_id', state.user.id).maybeSingle());
        if (!firm)
          firm = await query(
            state.db
              .from('firmalar')
              .insert({ kullanici_id: state.user.id, ad: pending.ad, tur: pending.tur })
              .select()
              .single(),
          );
        await query(
          state.db.from('firma_ozel').upsert({ firma_id: firm.id, vergi: pending.vergi }),
        );
        write('bc-company', null);
      }
    };
    await Promise.all([references(), favorites(), profile(), page === 'home' ? load(false) : null]);
    state.phase = 'ready';
    render();
    if (state.user) {
      const refresh = async () => {
        const r = await state.db
          .from('bildirimler')
          .select('id', { count: 'exact', head: true })
          .eq('kullanici_id', state.user.id)
          .eq('okundu', false);
        const n = $('#notification-count');
        if (n) {
          n.hidden = !r.count;
          n.textContent = r.count > 99 ? '99+' : r.count;
        }
      };
      const messages = async () => {
        const r = await state.db
          .from('mesajlar')
          .select('id', { count: 'exact', head: true })
          .neq('gonderen_id', state.user.id)
          .eq('okundu', false);
        const n = $('#message-count');
        if (n) {
          n.hidden = !r.count;
          n.textContent = r.count > 99 ? '99+' : r.count;
        }
      };
      await Promise.all([refresh(), messages()]);
      state.db
        .channel(`unread:${state.user.id}`)
        .on('change', { table: 'mesajlar' }, messages)
        .subscribe();
      state.db
        .channel(`notifications:${state.user.id}`)
        .on(
          'change',
          {
            table: 'bildirimler',
            filter: `kullanici_id=eq.${state.user.id}`,
          },
          refresh,
        )
        .subscribe();
    }
  } catch {
    state.phase = 'error';
    render();
  }
}
state.lang =
  (new URLSearchParams(location.search).get('lang') || read('bc-lang', 'tr')) === 'en'
    ? 'en'
    : 'tr';
const category =
  new URLSearchParams(location.search).get('kategori') ||
  { '/kullanilmis': 'kullanilmis', '/sifir': 'sifir', '/parca': 'parca' }[location.pathname];
state.mainCat = ['kullanilmis', 'sifir', 'parca'].includes(category) ? category : 'kullanilmis';
start();
