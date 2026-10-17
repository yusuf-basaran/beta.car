import { $, loginPrompt, meta, notify, pageHead } from '../ui.js';
import { t } from '../i18n.js';
import { state } from '../state.js';
import { esc, read, write } from '../utils.js';
import { params } from '../context.js';
import { query, rpc, table, uploadFile } from '../api.js';
import { button, check, guard } from '../forms.js';
import { resizePhoto } from '../media.js';

export async function photosPage() {
  meta(t('photosTitle'));
  $('#main').innerHTML = pageHead('photosTitle');
  if (!state.db || !state.user) {
    $('#main').insertAdjacentHTML('beforeend', loginPrompt());
    return;
  }
  let id = read('bc-photo-session', {})[params.get('kod')];
  if (!id) {
    id = await rpc('foto_al', { p_kod: params.get('kod') });
    write('bc-photo-session', { ...read('bc-photo-session', {}), [params.get('kod')]: id });
  }
  const c = await query(table('ilanlar').eq('id', id).eq('kullanici_id', state.user.id).single());
  $('#main').insertAdjacentHTML(
    'beforeend',
    `<form id="phone-upload" class="panel"><h2>${esc(c.baslik)}</h2><p>${t('maxPhotos')}</p><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required>${check('watermark', 'watermark')}${button('upload')}<output></output></form>`,
  );
  guard($('#phone-upload'), async (f) => {
    let photos = (await query(table('ilanlar', 'fotograflar').eq('id', id).single())).fotograflar;
    for (const file of f.getAll('photos')) {
      if (photos.length >= 15) break;
      photos = await rpc('foto_ekle', {
        p_ilan: id,
        p_url: await uploadFile('ilanlar', await resizePhoto(file, f.has('watermark')), id),
      });
      $('output', $('#phone-upload')).textContent = `${photos.length}/15`;
    }
    notify(t('success'));
  });
}
