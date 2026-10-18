import {
  check,
  member,
  admin,
  id,
  now,
  days,
  text,
  number,
  setting,
  notify,
  audit,
} from './core.js';

export async function packages(s, c, name, p, file) {
  const uid = member(c);
  if (name === 'talep_ac') {
    await s.get('profil', uid);
    check(
      !(await s.all('paket_talepleri', [['kullanici_id', '==', uid]])).some((r) =>
        ['beklemede', 'odeme_bekliyor', 'dekont_yuklendi'].includes(r.durum),
      ),
      'Bekleyen paket talebiniz var',
    );
    const pack = await s.get('paketler', p.p_paket),
      profile = await s.get('profil', uid);
    check(pack?.aktif && pack.hedef === profile.tip, 'Paket hesap türüne uygun değil');
    const key = id(),
      t = now();
    const row = {
      id: key,
      kullanici_id: uid,
      paket_id: pack.id,
      referans_kodu: 'BC-' + id().replaceAll('-', '').slice(0, 8).toUpperCase(),
      durum: 'beklemede',
      dekont_dosya: null,
      kullanici_notu: text(p.p_not || '', 0, 2000),
      admin_notu: '',
      makbuz_notu: '',
      ozet: pack,
      son_odeme: null,
      olusturma: t,
      guncelleme: t,
    };
    s.put('paket_talepleri', key, row);
    await audit(s, c, 'paket_talepleri', key, null, row);
    return key;
  }
  const r = await s.get('paket_talepleri', p.p_talep);
  check(r && (r.kullanici_id === uid || c.admin), 'Talep bulunamadı', 404);
  if (name === 'banka_bilgisi') {
    check(
      r.kullanici_id === uid &&
        r.durum === 'odeme_bekliyor' &&
        Date.parse(r.son_odeme) > Date.now(),
      'Banka bilgisi bu talep için kapalı',
      403,
    );
    const result = {
      tutar: r.ozet.fiyat,
      para_birimi: r.ozet.para_birimi,
      referans_kodu: r.referans_kodu,
    };
    for (const key of ['iban', 'banka', 'hesap_sahibi', 'odeme_notu'])
      result[key] = await setting(s, key, '');
    return result;
  }
  if (['dekont_ekle', 'talep_isle'].includes(name)) {
    const lock = (await s.get('_kilitler', r.kullanici_id)) || { version: 0 };
    s.put('_kilitler', r.kullanici_id, { version: lock.version + 1 });
  }
  if ((name === 'dekont_ekle' || p.p_durum === 'odeme_bekliyor') && r.durum === 'reddedildi')
    check(
      !(await s.all('paket_talepleri', [['kullanici_id', '==', r.kullanici_id]])).some(
        (x) =>
          x.id !== r.id && ['beklemede', 'odeme_bekliyor', 'dekont_yuklendi'].includes(x.durum),
      ),
      'Bekleyen başka paket talebi var',
    );
  if (name === 'dekont_ekle') {
    check(
      r.kullanici_id === uid &&
        ['odeme_bekliyor', 'reddedildi'].includes(r.durum) &&
        Date.parse(r.son_odeme) > Date.now(),
      'Dekont yükleme süresi doldu',
    );
    await file('dekontlar', p.p_dosya, uid, r.id);
    const next = { ...r, dekont_dosya: p.p_dosya, durum: 'dekont_yuklendi', guncelleme: now() };
    s.put('paket_talepleri', r.id, next);
    await audit(s, c, 'paket_talepleri', r.id, r, next);
    return null;
  }
  admin(c);
  const transitions = {
    odeme_bekliyor: ['beklemede', 'reddedildi'],
    onaylandi: ['dekont_yuklendi'],
    reddedildi: ['beklemede', 'odeme_bekliyor', 'dekont_yuklendi'],
    iptal: ['beklemede', 'odeme_bekliyor', 'dekont_yuklendi', 'reddedildi'],
  };
  check(transitions[p.p_durum]?.includes(r.durum), 'Geçersiz durum geçişi');
  const next = {
    ...r,
    durum: p.p_durum,
    admin_notu: text(p.p_not || '', p.p_durum === 'reddedildi' ? 1 : 0, 2000),
    makbuz_notu: text(p.p_makbuz || '', 0, 2000),
    guncelleme: now(),
  };
  if (p.p_fiyat != null) {
    check(p.p_durum === 'odeme_bekliyor', 'Tutar yalnız ödeme bilgisi açılırken belirlenir');
    next.ozet = { ...r.ozet, fiyat: number(p.p_fiyat) };
  }
  if (['odeme_bekliyor', 'onaylandi'].includes(p.p_durum))
    check(next.ozet.fiyat != null, 'Talep tutarı belirlenmeli');
  if (p.p_durum === 'odeme_bekliyor') {
    for (const k of ['iban', 'banka', 'hesap_sahibi'])
      check(await setting(s, k, ''), 'Banka ayarlarını tamamlayın');
    next.son_odeme = days(await setting(s, 'talep_zaman_asimi_gun', 7));
  }
  if (p.p_durum === 'onaylandi') {
    check(
      r.dekont_dosya && !(await s.get('abonelikler', r.id)),
      'Onaylı abonelik var veya dekont eksik',
    );
    await file('dekontlar', r.dekont_dosya, r.kullanici_id, r.id);
    const sub = {
      id: r.id,
      kullanici_id: r.kullanici_id,
      paket_id: r.paket_id,
      talep_id: r.id,
      baslangic: now(),
      bitis: days(r.ozet.sure_gun),
      kalan_ilan: r.ozet.ilan_kotasi,
      kalan_onecikarma: r.ozet.onecikarma_hakki,
      durum: 'aktif',
    };
    s.put('abonelikler', r.id, sub);
    await audit(s, c, 'abonelikler', r.id, null, sub);
  }
  s.put('paket_talepleri', r.id, next);
  await audit(s, c, 'paket_talepleri', r.id, r, next);
  await notify(s, r.kullanici_id, 'paket_talebi', {
    talep_id: r.id,
    durum: next.durum,
    not: next.admin_notu,
  });
  return null;
}
