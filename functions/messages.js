import { member, check, text, rate, hash, id, now, active, warning, notify } from './core.js';

export async function conversation(s, c, name, p) {
  const uid = member(c);
  if (name === 'konusma_ac') {
    await rate(s, uid, 'konusma', 10);
    const listing = p.p_ilan ? await s.get('ilanlar', p.p_ilan) : null;
    if (p.p_ilan) check(active(listing), 'İlan bulunamadı');
    const seller = listing?.kullanici_id || p.p_satici;
    check(seller && seller !== uid && (await s.get('profil', seller)), 'Konuşma açılamıyor');
    check(
      !(await s.get('engeller', uid + '_' + seller)) &&
        !(await s.get('engeller', seller + '_' + uid)),
      'Mesaj gönderilemiyor',
    );
    const key = hash(uid + ':' + seller + ':' + (p.p_ilan || ''));
    if (!(await s.get('konusmalar', key)))
      s.put('konusmalar', key, {
        id: key,
        ilan_id: p.p_ilan || null,
        alici_id: uid,
        satici_id: seller,
        katilimcilar: [uid, seller],
        ilk_yanit: null,
        olusturma: now(),
      });
    return key;
  }
  const k = await s.get('konusmalar', p.p_konusma);
  check(k && [k.alici_id, k.satici_id].includes(uid), 'Konuşma bulunamadı', 404);
  if (name === 'okundu') {
    for (const m of await s.all('mesajlar', [['konusma_id', '==', k.id]]))
      if (m.gonderen_id !== uid && !m.okundu) s.put('mesajlar', m.id, { ...m, okundu: true });
    return null;
  }
  const value = text(p.p_metin, 1, 4000),
    other = uid === k.alici_id ? k.satici_id : k.alici_id;
  await rate(s, uid, 'mesaj', 15, k.id + ':' + value);
  check(
    !(await s.get('engeller', uid + '_' + other)) && !(await s.get('engeller', other + '_' + uid)),
    'Mesaj gönderilemiyor',
  );
  const key = id();
  s.put('mesajlar', key, {
    id: key,
    konusma_id: k.id,
    gonderen_id: uid,
    katilimcilar: [k.alici_id, k.satici_id],
    metin: value,
    uyari: warning(value),
    okundu: false,
    olusturma: now(),
  });
  if (uid === k.satici_id && k.ilk_yanit == null) {
    const first = (await s.all('mesajlar', [['konusma_id', '==', k.id]]))
      .filter((m) => m.gonderen_id === k.alici_id)
      .sort((a, b) => a.olusturma.localeCompare(b.olusturma))[0];
    if (first)
      s.put('konusmalar', k.id, {
        ...k,
        ilk_yanit: Math.max(0, Math.round((Date.now() - Date.parse(first.olusturma)) / 1000)),
      });
  }
  await notify(s, other, 'yeni_mesaj', { konusma_id: k.id, ilan_id: k.ilan_id });
  return key;
}
export async function seller(s, c, uid) {
  const profile = await s.get('profil', uid);
  if (!profile) return null;
  const firms = await s.all('firmalar', [['kullanici_id', '==', uid]]);
  const visible = (await s.all('ilanlar', [['kullanici_id', '==', uid]])).some(active);
  const conversations = (await s.all('konusmalar')).filter((k) =>
    [k.alici_id, k.satici_id].includes(uid),
  );
  if (!(
    c.admin ||
    c.uid === uid ||
    firms.length ||
    visible ||
    conversations.some((k) => [k.alici_id, k.satici_id].includes(c.uid))
  ))
    return null;
  const times = conversations
    .filter((k) => k.satici_id === uid && k.ilk_yanit != null)
    .map((k) => k.ilk_yanit);
  return {
    id: uid,
    ad: profile.ad,
    telefon: profile.telefon_goster ? profile.telefon || null : null,
    firma: firms[0] || null,
    yanit: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
  };
}
