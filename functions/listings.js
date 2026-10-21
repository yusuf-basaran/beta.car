import {
  published,
  check,
  member,
  text,
  number,
  object,
  fields,
  norm,
  id,
  now,
  days,
  setting,
  audit,
  warning,
  same,
} from './core.js';
import { statistics } from './data.js';

export const listingFields = [
  'kategori_id',
  'marka_id',
  'model_id',
  'diger_marka',
  'diger_model',
  'baslik',
  'aciklama',
  'yil',
  'km',
  'fiyat',
  'para_birimi',
  'yakit',
  'vites',
  'sehir',
  'detay',
  'fotograflar',
  'video',
];
export async function saveListing(s, c, data, old, file) {
  member(c);
  fields(data, listingFields);
  check(old?.durum !== 'siliniyor', 'İlan siliniyor; değiştirilemez', 409);
  const row = {
    id: id(),
    kullanici_id: c.uid,
    no: 0,
    baslik: '',
    aciklama: '',
    marka_id: null,
    model_id: null,
    diger_marka: null,
    diger_model: null,
    yil: null,
    km: null,
    fiyat: null,
    para_birimi: 'GBP',
    yakit: null,
    vites: null,
    sehir: null,
    detay: {},
    fotograflar: [],
    video: null,
    durum: 'taslak',
    gizli: false,
    onecikarma: null,
    onecikarma_bitis: null,
    uyari: false,
    yayin: null,
    bitis: null,
    yukari: null,
    satilma: null,
    olusturma: now(),
    _parts: {},
    _equipment: [],
    _report: false,
    _previous_price: null,
    ...old,
    ...data,
    guncelleme: now(),
  };
  check(row.kullanici_id === c.uid || c.admin, 'İlan yetkisi yok', 403);
  row.baslik = text(row.baslik, 5, 140);
  row.aciklama = text(row.aciklama, 0, 12000);
  check(['GBP', 'EUR', 'USD', 'TL'].includes(row.para_birimi), 'Para birimi geçersiz');
  if (row.fiyat != null) number(row.fiyat);
  if (row.km != null) number(row.km, 0, 1e8);
  if (row.yil != null) {
    number(row.yil, 1950, new Date().getFullYear() + 1);
    check(Number.isInteger(row.yil), 'Model yılı geçersiz');
  }
  if (row.sehir)
    check(
      ['Girne', 'Lefkoşa', 'Gazimağusa', 'İskele', 'Güzelyurt', 'Lefke'].includes(row.sehir),
      'Şehir geçersiz',
    );
  const category = await s.get('kategoriler', row.kategori_id);
  check(category?.ust_id && category.arac_tipi, 'Alt kategori seçin');
  if (row.marka_id) {
    const make = await s.get('markalar', row.marka_id);
    check(make && make.tip === category.arac_tipi, 'Marka seçilen kategoriye uygun değil');
  }
  if (row.model_id) {
    const model = await s.get('modeller', row.model_id);
    check(same(model?.marka_id, row.marka_id), 'Marka ile model uyuşmuyor');
    if (row.yil != null)
      check(
        (!model.bas_yil || row.yil >= model.bas_yil) &&
          (!model.bit_yil || row.yil <= model.bit_yil),
        'Model yılı aralığa uygun değil',
      );
  }
  for (const field of ['diger_marka', 'diger_model'])
    if (row[field]) row[field] = text(row[field], 1, 80);
  object(row.detay);
  check(
    JSON.stringify(row.detay).length <= 8000 &&
      Object.values(row.detay).every(
        (v) => v == null || ['string', 'number', 'boolean'].includes(typeof v),
      ),
    'Araç ayrıntıları geçersiz',
  );
  delete row.detay.telefon;
  check(
    Array.isArray(row.fotograflar) && row.fotograflar.length <= 15,
    'En çok 15 fotoğraf yüklenebilir',
  );
  if (JSON.stringify(row.fotograflar) !== JSON.stringify(old?.fotograflar || []))
    for (const url of row.fotograflar) await file('ilanlar', url, row.kullanici_id);
  row.uyari = warning(row.baslik + ' ' + row.aciklama);
  const all = await s.all('ilanlar');
  if (!old)
    check(
      all.filter((r) => r.kullanici_id === c.uid && Date.parse(r.olusturma) > Date.now() - 3600000)
        .length < ((await s.get('profil', c.uid))?.tip === 'kurumsal' ? 500 : 10),
      'Saatlik ilan sınırı aşıldı',
      429,
    );
  if (
    row.aciklama.length > 80 &&
    all.some(
      (r) =>
        r.id !== row.id &&
        r.kullanici_id !== row.kullanici_id &&
        ['yayinda', 'beklemede'].includes(r.durum) &&
        norm(r.aciklama) === norm(row.aciklama),
    )
  )
    row.uyari = true;
  const market = statistics(
    all.filter(
      (r) =>
        published(r) &&
        same(r.model_id, row.model_id) &&
        same(r.yil, row.yil) &&
        r.para_birimi === row.para_birimi,
    ),
  );
  if (row.fiyat > 0 && market.adet >= 5 && row.fiyat < market.medyan * 0.55) row.uyari = true;
  if (row.uyari && ['yayinda', 'satildi'].includes(row.durum)) row.durum = 'beklemede';
  for (const key of ['sasi', 'plaka_no']) {
    const before = norm(old?.detay?.[key]),
      after = norm(row.detay[key]);
    if (after) {
      const uniqueKey = key + '_' + after,
        lock = await s.get('_araclar', uniqueKey);
      check(!lock || lock.ilan_id === row.id, 'Aynı araç için açık ilan var');
      s.put('_araclar', uniqueKey, { ilan_id: row.id });
    }
    if (before && before !== after) s.del('_araclar', key + '_' + before);
  }
  if (!old) row.no = await s.seq('ilan_no');
  if (!old || old.fiyat !== row.fiyat || old.para_birimi !== row.para_birimi) {
    if (old && old.para_birimi === row.para_birimi) row._previous_price = old.fiyat;
    const k = id();
    s.put('fiyat_gecmisi', k, {
      id: k,
      ilan_id: row.id,
      fiyat: row.fiyat,
      para_birimi: row.para_birimi,
      tarih: now(),
    });
  }
  s.put('ilanlar', row.id, row);
  return row;
}
export async function quota(s, c, p) {
  const uid = member(c),
    r = await s.get('ilanlar', p.p_ilan),
    profile = await s.get('profil', uid);
  check(r?.kullanici_id === uid, 'İlan bulunamadı', 404);
  check(r.durum !== 'siliniyor', 'İlan siliniyor; değiştirilemez', 409);
  const next = { ...r, guncelleme: now() };
  if (p.p_islem === 'yayinla') {
    check(
      ['taslak', 'kaldirildi', 'suresi_doldu', 'reddedildi'].includes(r.durum),
      'İlan yayın işlemine uygun değil',
    );
    if (r.model_id) {
      const m = await s.get('modeller', r.model_id);
      check(
        m &&
          same(m.marka_id, r.marka_id) &&
          (!m.bas_yil || r.yil >= m.bas_yil) &&
          (!m.bit_yil || r.yil <= m.bit_yil),
        'Marka, model ve yıl uyuşmuyor',
      );
    }
    if (await setting(s, 'sms_zorunlu', false))
      check(c.phone && norm(c.phone) === norm(profile.telefon), 'Telefon doğrulaması gerekli');
    const previous = await s.get('_haklar', r.id),
      freeLimit = await setting(s, 'ucretsiz_ilan_limiti', 3);
    const used = (await s.all('ilanlar', [['kullanici_id', '==', uid]])).filter(
      (x) =>
        x.id !== r.id &&
        ['yayinda', 'beklemede'].includes(x.durum) &&
        Date.parse(x.bitis) > Date.now(),
    ).length;
    if (previous && !previous.ucretli)
      check(
        profile.tip === 'bireysel' && used < freeLimit,
        'Mevcut ilanlarından birini kaldırıp yeniden dene',
      );
    if (!previous && (profile.tip === 'kurumsal' || used >= freeLimit)) {
      const sub = (await s.all('abonelikler', [['kullanici_id', '==', uid]]))
        .filter((x) => x.durum === 'aktif' && Date.parse(x.bitis) > Date.now() && x.kalan_ilan > 0)
        .sort((a, b) => a.bitis.localeCompare(b.bitis))[0];
      if (!sub)
        throw Object.assign(Error('Paket al veya mevcut ilanlarından birini kaldır'), {
          status: 400,
          hint: 'paketler.html',
        });
      s.put('abonelikler', sub.id, { ...sub, kalan_ilan: sub.kalan_ilan - 1 });
      s.put('_haklar', r.id, { ucretli: true, abonelik_id: sub.id });
    } else if (!previous) s.put('_haklar', r.id, { ucretli: false });
    next.durum = r.uyari || (await setting(s, 'ilan_onayi', false)) ? 'beklemede' : 'yayinda';
    next.yayin = now();
    next.bitis = days(30);
  } else if (p.p_islem === 'onecikar') {
    check(
      published(r) && ['seckin', 'hizli', 'prestij', 'vurgulu'].includes(p.p_tur),
      'Öne çıkarma seçimi geçersiz',
    );
    const sub = (await s.all('abonelikler', [['kullanici_id', '==', uid]]))
      .filter(
        (x) => x.durum === 'aktif' && Date.parse(x.bitis) > Date.now() && x.kalan_onecikarma > 0,
      )
      .sort((a, b) => a.bitis.localeCompare(b.bitis))[0];
    check(sub, 'Öne çıkarma hakkı yok');
    s.put('abonelikler', sub.id, { ...sub, kalan_onecikarma: sub.kalan_onecikarma - 1 });
    next.onecikarma = p.p_tur;
    next.onecikarma_bitis = days(await setting(s, 'onecikarma_gun', 7));
  } else if (p.p_islem === 'yukari') {
    const day = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Nicosia' });
    check(
      published(r) && (!r.yukari || day(r.yukari) !== day(Date.now())),
      'Günde bir kez kullanılabilir',
    );
    next.yukari = now();
  } else {
    check(['kaldir', 'satildi', 'arsiv'].includes(p.p_islem), 'Geçersiz işlem');
    if (p.p_islem === 'satildi')
      check(published(r), 'Yalnız yayındaki ilan satıldı işaretlenebilir');
    next.durum = { kaldir: 'kaldirildi', satildi: 'satildi', arsiv: 'arsiv' }[p.p_islem];
    if (p.p_islem === 'satildi') next.satilma = now();
  }
  if (next.durum === 'arsiv')
    for (const key of ['sasi', 'plaka_no'])
      if (norm(r.detay?.[key])) s.del('_araclar', key + '_' + norm(r.detay[key]));
  s.put('ilanlar', r.id, next);
  await audit(s, c, 'ilanlar', r.id, r, next);
  return { id: r.id, durum: next.durum };
}
export async function photos(s, c, name, p, file) {
  const uid = member(c);
  if (name === 'foto_al') {
    const token = await s.get('_foto', p.p_kod);
    check(
      token?.kullanici_id === uid &&
        !token.kullanildi &&
        Date.parse(token.bitis) > Date.now() &&
        (await s.get('ilanlar', token.ilan_id))?.durum !== 'siliniyor',
      'Fotoğraf oturumu geçersiz',
    );
    s.put('_foto', p.p_kod, { ...token, kullanildi: true });
    return token.ilan_id;
  }
  const r = await s.get('ilanlar', p.p_ilan);
  check(r?.kullanici_id === uid, 'İlan bulunamadı', 404);
  check(r.durum !== 'siliniyor', 'İlan siliniyor; değiştirilemez', 409);
  if (name === 'foto_oturum') {
    const token = id();
    s.put('_foto', token, {
      ilan_id: r.id,
      kullanici_id: uid,
      bitis: days(15 / 1440),
      kullanildi: false,
    });
    return token;
  }
  check(r.fotograflar.length < 15, 'En çok 15 fotoğraf yüklenebilir');
  await file('ilanlar', p.p_url, uid);
  const result = [...r.fotograflar, p.p_url];
  s.put('ilanlar', r.id, { ...r, fotograflar: result, guncelleme: now() });
  return result;
}
