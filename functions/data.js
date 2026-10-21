import { active, published, same, clean, check, number, norm, matches, mapRows } from './core.js';

export async function card(s, r, c) {
  const [make, model, profile, firms, parts, equipment, reports, history] = await Promise.all([
    r.marka_id ? s.get('markalar', r.marka_id) : null,
    r.model_id ? s.get('modeller', r.model_id) : null,
    s.get('profil', r.kullanici_id),
    s.all('firmalar', [['kullanici_id', '==', r.kullanici_id]]),
    r._parts
      ? Object.entries(r._parts).map(([parca, durum]) => ({ parca, durum }))
      : s.all('ilan_parca', [['ilan_id', '==', r.id]]),
    r._equipment
      ? r._equipment.map((donanim_id) => ({ donanim_id }))
      : s.all('ilan_donanim', [['ilan_id', '==', r.id]]),
    r._report !== undefined ? r._report : s.get('ilan_ekspertiz', r.id),
    r._previous_price !== undefined ? [] : s.all('fiyat_gecmisi', [['ilan_id', '==', r.id]]),
  ]);
  const result = {
    ...clean(r),
    marka: make?.ad || null,
    model: model?.ad || null,
    satici: profile?.ad || '',
    firma: firms[0]?.ad || null,
    dogrulandi: !!(firms[0]?.dogrulandi || profile?.dogrulandi),
    parca_sayisi: parts.length,
    boyali: parts.filter((x) => ['boyali', 'lokal_boyali'].includes(x.durum)).length,
    degisen: parts.filter((x) => x.durum === 'degisen').length,
    hasarli: parts.filter((x) => x.durum === 'hasarli').length,
    ekspertizli: !!reports,
    donanim_ids: equipment.map((x) => x.donanim_id),
    onceki_fiyat:
      r._previous_price !== undefined
        ? r._previous_price
        : (history
            .filter((x) => x.para_birimi === r.para_birimi)
            .sort((a, b) => b.tarih.localeCompare(a.tarih))[1]?.fiyat ?? null),
  };
  if (!c.admin && c.uid !== r.kullanici_id) {
    result.detay = { ...r.detay };
    delete result.detay.sasi;
    delete result.detay.plaka_no;
  }
  return result;
}
export async function canRead(s, c, table, r) {
  if (c.admin) return true;
  if (
    [
      'kategoriler',
      'markalar',
      'modeller',
      'donanimlar',
      'sayfalar',
      'firmalar',
      'yorumlar',
      'profil',
    ].includes(table)
  )
    return true;
  if (['paketler', 'bannerlar'].includes(table)) return !!r.aktif;
  if (table === 'yazilar') return r.aktif && Date.parse(r.yayin) <= Date.now();
  if (['ilanlar', 'ilan_kartlari'].includes(table)) return active(r) || c.uid === r.kullanici_id;
  if (['ilan_parca', 'ilan_donanim', 'ilan_ekspertiz', 'fiyat_gecmisi'].includes(table)) {
    const i = await s.get('ilanlar', r.ilan_id);
    return i && (active(i) || c.uid === i.kullanici_id);
  }
  if (table === 'talepler') return r.aktif || c.uid === r.kullanici_id;
  if (!c.uid || !c.verified) return false;
  if (table === 'konusmalar') return [r.alici_id, r.satici_id].includes(c.uid);
  if (table === 'mesajlar') {
    const k = await s.get('konusmalar', r.konusma_id);
    return k && [k.alici_id, k.satici_id].includes(c.uid);
  }
  if (table === 'firma_ozel' || (table === 'randevular' && r.firma_id)) {
    const f = await s.get('firmalar', r.firma_id);
    if (f?.kullanici_id === c.uid) return true;
  }
  return !!r.kullanici_id && c.uid === r.kullanici_id;
}
export const tables = [
  'profil',
  'kategoriler',
  'markalar',
  'modeller',
  'donanimlar',
  'sayfalar',
  'firmalar',
  'firma_ozel',
  'yorumlar',
  'paketler',
  'bannerlar',
  'yazilar',
  'ilanlar',
  'ilan_kartlari',
  'ilan_parca',
  'ilan_donanim',
  'ilan_ekspertiz',
  'fiyat_gecmisi',
  'talepler',
  'konusmalar',
  'mesajlar',
  'favoriler',
  'aramalar',
  'takipler',
  'engeller',
  'oneriler',
  'bildirimler',
  'sikayetler',
  'randevular',
  'iletisim',
  'abonelikler',
  'paket_talepleri',
  'ayarlar',
  'islem_kaydi',
];
export async function read(s, c, q) {
  check(tables.includes(q.table), 'Koleksiyona erişim kapalı', 403);
  let name = q.table === 'ilan_kartlari' ? 'ilanlar' : q.table;
  if (
    !c.admin &&
    (['ayarlar', 'islem_kaydi'].includes(name) ||
      ((!c.uid || !c.verified) &&
        [
          'abonelikler',
          'paket_talepleri',
          'favoriler',
          'aramalar',
          'takipler',
          'engeller',
          'oneriler',
          'bildirimler',
          'sikayetler',
          'iletisim',
          'mesajlar',
          'konusmalar',
          'firma_ozel',
          'randevular',
        ].includes(name)))
  )
    return { data: q.one || q.head ? null : [], count: 0, error: null };
  const filters = q.filters || [];
  check(
    Array.isArray(filters) &&
      filters.length <= 20 &&
      filters.every(
        (f) =>
          Array.isArray(f) &&
          f.length === 3 &&
          typeof f[0] === 'string' &&
          /^[a-z_]+$/.test(f[0]) &&
          ['eq', 'neq', 'in'].includes(f[1]) &&
          (f[1] !== 'in' || (Array.isArray(f[2]) && f[2].length <= 100)),
      ),
    'Filtre geçersiz',
  );
  const exact = filters.find(([k, op]) => k === 'id' && op === 'eq');
  let list;
  if (exact) {
    const r = await s.get(name, exact[2]);
    list = r ? [r] : [];
  } else {
    const where = filters
      .filter(([k, op, v]) => op === 'eq' && v !== null && !['durum', 'aktif'].includes(k))
      .map(([k, , v]) => [k, '==', v]);
    if (
      !c.admin &&
      c.uid &&
      [
        'abonelikler',
        'paket_talepleri',
        'favoriler',
        'aramalar',
        'takipler',
        'engeller',
        'oneriler',
        'bildirimler',
        'sikayetler',
        'iletisim',
      ].includes(name) &&
      !where.some(([k]) => k === 'kullanici_id')
    )
      where.push(['kullanici_id', '==', c.uid]);
    if (!c.admin && c.uid && ['konusmalar', 'mesajlar'].includes(name))
      where.splice(0, where.length, ['katilimcilar', 'array-contains', c.uid]);
    list = await s.all(name, where.slice(0, 1));
  }
  const result = (
    await mapRows(list, async (r) => {
      if (!matches(r, filters) || !(await canRead(s, c, q.table, r))) return null;
      let row = clean(r);
      if (q.table === 'ilan_kartlari') row = await card(s, r, c);
      if (name === 'profil')
        row = {
          id: r.id,
          ad: r.ad,
          tip: r.tip,
          sehir: r.sehir || null,
          dogrulandi: !!r.dogrulandi,
        };
      if (name === 'paket_talepleri' && !c.admin) delete row.makbuz_notu;
      if (name === 'ilanlar' && !c.admin && c.uid !== r.kullanici_id) {
        row.detay = { ...r.detay };
        delete row.detay.sasi;
        delete row.detay.plaka_no;
      }
      return row;
    })
  ).filter(Boolean);
  const order = q.order || [];
  check(
    Array.isArray(order) &&
      order.length <= 3 &&
      order.every(
        (r) =>
          Array.isArray(r) &&
          r.length === 2 &&
          typeof r[0] === 'string' &&
          /^[a-z_]+$/.test(r[0]) &&
          typeof r[1] === 'boolean',
      ),
    'Sıralama geçersiz',
  );
  check(
    !q.cols || (typeof q.cols === 'string' && q.cols.length <= 1000 && /^[a-z_,*]+$/.test(q.cols)),
    'Alan listesi geçersiz',
  );
  result.sort((a, b) => {
    for (const [k, asc] of order) {
      const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0;
      if (n) return asc ? n : -n;
    }
    return 0;
  });
  const count = result.length;
  let output = result.slice(0, q.limit == null ? 1000 : number(q.limit, 1, 1000));
  if (q.cols && q.cols !== '*')
    output = output.map((r) =>
      Object.fromEntries(
        q.cols
          .split(',')
          .filter((k) => k in r)
          .map((k) => [k, r[k]]),
      ),
    );
  if (q.one === 'required') check(output.length === 1, 'Kayıt bulunamadı', 404);
  return { data: q.head ? null : q.one ? output[0] || null : output, count, error: null };
}
export async function search(s, c, p = {}) {
  const categories = await s.all('kategoriler');
  const selected =
    p.kategori &&
    categories
      .filter((k) => k.slug === p.kategori || k.slug.startsWith(p.kategori + '-'))
      .map((k) => k.id);
  let source;
  if (p.id) {
    const row = await s.get('ilanlar', p.id);
    source = row ? [row] : [];
  } else if (p.model) source = await s.all('ilanlar', [['model_id', '==', Number(p.model)]]);
  else if (p.marka) source = await s.all('ilanlar', [['marka_id', '==', Number(p.marka)]]);
  else if (p.satici) source = await s.all('ilanlar', [['kullanici_id', '==', p.satici]]);
  else source = await s.all('ilanlar', [['durum', '==', 'yayinda']]);
  source = source.filter(
    (r) => published(r) && (!selected || selected.some((x) => same(x, r.kategori_id))),
  );
  const rows = (
    await mapRows(source, async (r) => {
      if (
        ['id', 'marka', 'model', 'yil', 'para_birimi', 'yakit', 'vites', 'sehir', 'satici'].some(
          (k) =>
            p[k] != null &&
            p[k] !== '' &&
            !same(
              r[{ marka: 'marka_id', model: 'model_id', satici: 'kullanici_id' }[k] || k],
              p[k],
            ),
        )
      )
        return null;
      if (
        (p.min != null && r.fiyat < Number(p.min)) ||
        (p.max != null && r.fiyat > Number(p.max)) ||
        (p.yil_min && r.yil < Number(p.yil_min)) ||
        (p.yil_max && r.yil > Number(p.yil_max)) ||
        (p.km_max && r.km > Number(p.km_max))
      )
        return null;
      if (
        p.onecikarma &&
        (r.onecikarma !== p.onecikarma || Date.parse(r.onecikarma_bitis) <= Date.now())
      )
        return null;
      if (p.tip && !categories.some((k) => same(k.id, r.kategori_id) && k.arac_tipi === p.tip))
        return null;
      if (p.detay && Object.entries(p.detay).some(([k, v]) => !same(r.detay?.[k], v))) return null;
      const row = await card(s, r, c);
      if (p.q && !norm([row.baslik, row.marka, row.model, row.no].join(' ')).includes(norm(p.q)))
        return null;
      if (p.ekspertizli === 'true' && !row.ekspertizli) return null;
      if (p.donanim?.length && !p.donanim.every((x) => row.donanim_ids.some((d) => same(d, x))))
        return null;
      if (
        p.kaporta &&
        (row.parca_sayisi !== 13 ||
          (p.kaporta === 'orijinal' && row.boyali + row.degisen + row.hasarli > 0) ||
          (p.kaporta === 'degisensiz' && row.degisen > 0) ||
          (p.kaporta === 'hasarsiz' && row.hasarli > 0) ||
          (['1', '2', '3'].includes(p.kaporta) &&
            (row.boyali + row.degisen > Number(p.kaporta) || row.hasarli > 0)))
      )
        return null;
      if (p.satici_tipi) {
        const firms = await s.all('firmalar', [['kullanici_id', '==', r.kullanici_id]]);
        if (p.satici_tipi === 'bireysel' ? firms.length : firms[0]?.tur !== p.satici_tipi)
          return null;
      }
      return row;
    })
  ).filter(Boolean);
  const key = { fiyat_artan: 'fiyat', fiyat_azalan: 'fiyat', yil: 'yil', km: 'km' }[p.sira];
  rows.sort((a, b) =>
    key
      ? a[key] == null
        ? 1
        : b[key] == null
          ? -1
          : (Number(a[key]) - Number(b[key])) * (['fiyat_azalan', 'yil'].includes(p.sira) ? -1 : 1)
      : (b.yukari || b.yayin || '').localeCompare(a.yukari || a.yayin || ''),
  );
  return {
    toplam: rows.length,
    ilanlar: rows.slice(
      (Math.max(1, Math.min(10000, Number(p.sayfa) || 1)) - 1) * 20,
      Math.max(1, Math.min(10000, Number(p.sayfa) || 1)) * 20,
    ),
  };
}
export function statistics(rows) {
  const prices = rows
    .map((r) => r.fiyat)
    .filter((x) => x != null && x > 0)
    .sort((a, b) => a - b);
  const n = prices.length;
  if (!n)
    return {
      adet: 0,
      medyan: null,
      ortalama: null,
      en_dusuk: null,
      en_yuksek: null,
      alt: null,
      ust: null,
      dagilim: [],
    };
  const quantile = (q) => {
    const pos = (n - 1) * q,
      i = Math.floor(pos);
    return prices[i] + (prices[Math.ceil(pos)] - prices[i]) * (pos - i);
  };
  const median = n % 2 ? prices[(n - 1) / 2] : (prices[n / 2 - 1] + prices[n / 2]) / 2;
  const buckets = [0, 0, 0, 0, 0];
  prices.forEach(
    (x) =>
      buckets[Math.min(4, Math.floor(((x - prices[0]) / (prices[n - 1] - prices[0] || 1)) * 5))]++,
  );
  return {
    adet: n,
    medyan: median,
    ortalama: prices.reduce((a, b) => a + b, 0) / n,
    en_dusuk: prices[0],
    en_yuksek: prices[n - 1],
    alt: quantile(0.2),
    ust: quantile(0.8),
    dagilim: buckets.map((v, i) => [i, v]),
  };
}
