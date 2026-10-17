import { $, $$, empty, fail, loginPrompt, meta, notify, pageHead } from '../ui.js';
import { locale, t } from '../i18n.js';
import { state } from '../state.js';
import { query, rpc, table } from '../api.js';
import { params } from '../context.js';
import { esc } from '../utils.js';
import { button, guard, reportForm, safeAction } from '../forms.js';

export async function messagesPage() {
  meta(t('messages'));
  $('#main').innerHTML = pageHead('messages');
  if (!state.db || !state.user) {
    $('#main').insertAdjacentHTML('beforeend', loginPrompt());
    return;
  }
  const conv = await query(
    table('konusmalar')
      .or(`alici_id.eq.${state.user.id},satici_id.eq.${state.user.id}`)
      .order('olusturma', { ascending: false }),
  );
  let current = params.get('k') || conv[0]?.id,
    channel;
  $('#main').insertAdjacentHTML(
    'beforeend',
    `<div class="messages-layout"><nav id="conversations" class="panel">${conv.map((k) => `<button data-conversation="${k.id}">${k.ilan_id ? `${t('listingNo')} · ${k.ilan_id.slice(0, 8)}` : t('conversation')}<small>${new Date(k.olusturma).toLocaleDateString(locale())}</small></button>`).join('') || empty()}</nav><section class="panel" id="conversation"></section></div>`,
  );
  async function draw() {
    if (channel) state.db.removeChannel(channel);
    const k = conv.find((k) => k.id === current);
    if (!k) {
      $('#conversation').innerHTML = `<p>${t('selectConversation')}</p>`;
      return;
    }
    const other = k.alici_id === state.user.id ? k.satici_id : k.alici_id,
      s = await rpc('satici', { p_id: other });
    $('#conversation').innerHTML =
      `<div class="section-head"><h2>${esc(s?.firma?.ad || s?.ad)}</h2><button class="text-btn" id="block-user">${t('block')}</button></div>${k.ilan_id ? `<a href="ilan.html?id=${k.ilan_id}">${t('view')}</a>` : ''}<div class="message-stream" id="message-stream" aria-live="polite"></div><form id="message-form"><textarea name="metin" maxlength="4000" required aria-label="${t('messages')}"></textarea>${button('send')}</form>`;
    async function refresh() {
      const list = await query(table('mesajlar').eq('konusma_id', current).order('olusturma'));
      if (!$('#message-stream')) return;
      $('#message-stream').innerHTML =
        list
          .map(
            (m) =>
              `<article class="message ${m.gonderen_id === state.user.id ? 'own' : ''}"><p>${esc(m.metin)}</p>${m.uyari ? `<small class="warning">${t('safety')}</small>` : ''}<small>${new Date(m.olusturma).toLocaleString(locale())} · ${t(m.okundu ? 'readMessage' : 'unread')}</small>${m.gonderen_id !== state.user.id ? `<button class="text-btn" data-report-message="${m.id}">${t('reportListing')}</button>` : ''}</article>`,
          )
          .join('') || `<p class="empty">${t('emptyMessages')}</p>`;
      $$('[data-report-message]').forEach(
        (b) => (b.onclick = safeAction(() => reportForm(null, b.dataset.reportMessage))),
      );
      await rpc('okundu', { p_konusma: current });
      const stream = $('#message-stream');
      stream.scrollTop = stream.scrollHeight;
    }
    guard($('#message-form'), async (f) => {
      await rpc('mesaj_yaz', { p_konusma: current, p_metin: f.get('metin') });
      $('#message-form').metin.value = '';
      await refresh();
    });
    let blocked =
      (await query(table('engeller').eq('kullanici_id', state.user.id).eq('engellenen_id', other)))
        .length > 0;
    $('#block-user').textContent = t(blocked ? 'unblock' : 'block');
    $('#block-user').onclick = safeAction(async () => {
      if (blocked)
        await query(
          state.db
            .from('engeller')
            .delete()
            .eq('kullanici_id', state.user.id)
            .eq('engellenen_id', other),
        );
      else
        await query(
          state.db.from('engeller').upsert({ kullanici_id: state.user.id, engellenen_id: other }),
        );
      blocked = !blocked;
      $('#block-user').textContent = t(blocked ? 'unblock' : 'block');
      notify(t('success'));
    });
    await refresh();
    channel = state.db
      .channel(`messages:${current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mesajlar',
          filter: `konusma_id=eq.${current}`,
        },
        () => refresh().catch(fail),
      )
      .subscribe();
  }
  $$('[data-conversation]').forEach(
    (b) =>
      (b.onclick = () => {
        current = b.dataset.conversation;
        history.replaceState(null, '', `?k=${current}`);
        draw().catch(fail);
      }),
  );
  await draw();
}
