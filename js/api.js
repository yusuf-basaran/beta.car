import { state } from './state.js';
import { t } from './i18n.js';

export async function query(q) {
  const r = await q;
  if (r.error) throw r.error;
  return r.data;
}

export const rpc = (name, data = {}) => {
  if (!state.db) throw Error(t('connect'));
  return query(state.db.rpc(name, data));
};

export const table = (name, cols = '*') => {
  if (!state.db) throw Error(t('connect'));
  return state.db.from(name).select(cols);
};

export const need = () => {
  if (!state.db) throw Error(t('connect'));
  if (!state.user) {
    location.href = `giris.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw Error(t('needLogin'));
  }
};

export async function signed(bucket, file) {
  if (!file) return '';
  const r = await state.db.storage.from(bucket).createSignedUrl(file, 120);
  if (r.error) throw r.error;
  return r.data.signedUrl;
}

export async function uploadFile(bucket, file, dir, max = 10485760) {
  need();
  if (
    !file ||
    file.size > max ||
    ![
      'image/jpeg',
      'image/png',
      'image/webp',
      ...(bucket === 'ilanlar' || bucket === 'firmalar' ? [] : ['application/pdf']),
    ].includes(file.type)
  )
    throw Error(t('fileError'));
  const ext =
    file.type === 'application/pdf'
      ? 'pdf'
      : file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
  const name = `${state.user.id}/${dir ? dir + '/' : ''}${crypto.randomUUID()}.${ext}`;
  const r = await state.db.storage
    .from(bucket)
    .upload(name, file, { contentType: file.type, upsert: false });
  if (r.error) throw r.error;
  return bucket === 'ilanlar' || bucket === 'firmalar'
    ? state.db.storage.from(bucket).getPublicUrl(name).data.publicUrl
    : name;
}
