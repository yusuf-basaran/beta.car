import { Store, now, published, notify, audit } from './core.js';
import { search } from './data.js';

export async function maintenance(db) {
  const current = Date.now();
  for (const snap of (await db.collection('paket_talepleri').get()).docs)
    await db.runTransaction(async (tx) => {
      const s = new Store(db, tx),
        r = await s.get('paket_talepleri', snap.id);
      const timeout = (await s.get('ayarlar', 'talep_zaman_asimi_gun'))?.deger || 7;
      if (
        r &&
        ((r.durum === 'beklemede' && Date.parse(r.olusturma) < current - timeout * 86400000) ||
          (['odeme_bekliyor', 'reddedildi'].includes(r.durum) &&
            r.son_odeme &&
            Date.parse(r.son_odeme) <= current))
      ) {
        const next = { ...r, durum: 'suresi_doldu', guncelleme: now() };
        s.put('paket_talepleri', r.id, next);
        await audit(s, {}, 'paket_talepleri', r.id, r, next);
        await notify(s, r.kullanici_id, 'paket_talebi', { talep_id: r.id, durum: next.durum });
      }
      s.flush();
    });
  for (const snap of (await db.collection('abonelikler').get()).docs)
    await db.runTransaction(async (tx) => {
      const s = new Store(db, tx),
        r = await s.get('abonelikler', snap.id);
      if (r?.durum === 'aktif' && Date.parse(r.bitis) <= current + 7 * 86400000) {
        const expired = Date.parse(r.bitis) <= current;
        await notify(
          s,
          r.kullanici_id,
          expired ? 'paket_bitti' : 'paket_bitiyor',
          { abonelik_id: r.id, bitis: r.bitis },
          r.id + ':' + r.bitis + ':' + expired,
        );
        if (expired) s.put('abonelikler', r.id, { ...r, durum: 'bitti' });
      }
      s.flush();
    });
  for (const snap of (await db.collection('ilanlar').get()).docs)
    await db.runTransaction(async (tx) => {
      const s = new Store(db, tx),
        r = await s.get('ilanlar', snap.id);
      if (!r) return;
      const next = { ...r };
      if (r.durum === 'yayinda') {
        if (Date.parse(r.bitis) <= current) next.durum = 'suresi_doldu';
        else if (Date.parse(r.bitis) <= current + 3 * 86400000)
          await notify(
            s,
            r.kullanici_id,
            'ilan_bitiyor',
            { ilan_id: r.id, bitis: r.bitis },
            r.id + ':' + r.bitis,
          );
      }
      if (r.durum === 'satildi' && Date.parse(r.satilma) <= current - 7 * 86400000)
        next.durum = 'arsiv';
      if (r.onecikarma_bitis && Date.parse(r.onecikarma_bitis) <= current) {
        next.onecikarma = null;
        next.onecikarma_bitis = null;
      }
      if (next.durum !== r.durum || next.onecikarma !== r.onecikarma) s.put('ilanlar', r.id, next);
      s.flush();
    });
}
export async function cleanup(db) {
  for (const name of ['_hiz', '_foto', '_ziyaretler', '_dosyalar']) {
    const rows = await db.collection(name).get();
    const writer = db.bulkWriter();
    for (const doc of rows.docs) {
      const r = doc.data();
      if (
        (typeof r.expires === 'number' ? r.expires : Date.parse(r.expires || r.bitis)) <= Date.now()
      )
        writer.delete(doc.ref);
    }
    await writer.close();
  }
}
export async function listingEvent(db, before, after, eventId) {
  if (!after) return;
  const first = published(after) && !published(before),
    reduced = before && after.fiyat < before.fiyat && after.para_birimi === before.para_birimi;
  if (!first && !reduced) return;
  const targets = [];
  if (first)
    for (const r of (await db.collection('aramalar').get()).docs) {
      const a = r.data();
      if (a.kullanici_id === after.kullanici_id) continue;
      const match = await search(
        new Store(db),
        { admin: false, uid: a.kullanici_id },
        { ...a.filtre, id: after.id, sayfa: 1 },
      );
      if (match.toplam)
        targets.push({
          uid: a.kullanici_id,
          type: 'arama_eslesmesi',
          data: { ilan_id: after.id, arama: a.ad },
          key: a.id + ':' + after.id,
          email: a.eposta,
        });
    }
  if (reduced)
    for (const r of (await db.collection('favoriler').where('ilan_id', '==', after.id).get())
      .docs) {
      const f = r.data();
      if (f.fiyat_takibi)
        targets.push({
          uid: f.kullanici_id,
          type: 'fiyat_degisti',
          data: { ilan_id: after.id, fiyat: after.fiyat, para_birimi: after.para_birimi },
          key: eventId + ':' + f.kullanici_id,
          email: true,
        });
    }
  for (const t of targets)
    await db.runTransaction(async (tx) => {
      const s = new Store(db, tx);
      await notify(s, t.uid, t.type, t.data, t.key, t.email);
      s.flush();
    });
}
export async function emailQueue(db, auth, config) {
  if (!config.url || !config.key || !config.from) return;
  if (!config.url.startsWith('https://')) throw Error('E-posta adresi HTTPS olmalı');
  const queue = (await db.collection('_eposta').where('durum', '==', 'beklemede').limit(20).get())
    .docs;
  for (const doc of queue) {
    const claimed = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(doc.ref),
        r = snapshot.data();
      if (
        !r ||
        r.durum !== 'beklemede' ||
        r.deneme >= 5 ||
        (r.son_deneme && Date.parse(r.son_deneme) > Date.now() - 600000)
      )
        return null;
      tx.update(doc.ref, { durum: 'gonderiliyor', deneme: r.deneme + 1, son_deneme: now() });
      return r;
    });
    if (!claimed) continue;
    try {
      const user = await auth.getUser(claimed.kullanici_id),
        profile = (await db.collection('profil').doc(user.uid).get()).data();
      if (!user.emailVerified || user.disabled || !profile?.eposta_ozet) {
        await doc.ref.update({ durum: 'iptal' });
        continue;
      }
      const r = await fetch(config.url, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + config.key,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'bc-' + doc.id,
        },
        body: JSON.stringify({
          from: config.from,
          to: [user.email],
          subject: 'KONTAK · Hesap bildirimi',
          text: 'Hesabınızda yeni bildirim var. Ayrıntıları Hesabım > Bildirimler ekranından inceleyin.\n\nKONTAK hiçbir zaman mesajla IBAN istemez; paket ödeme bilgisi yalnızca Hesabım > Paketlerim ekranında görünür.',
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error('E-posta sağlayıcısı isteği reddetti');
      await doc.ref.update({ durum: 'gonderildi' });
    } catch {
      await doc.ref.update({ durum: claimed.deneme + 1 >= 5 ? 'hata' : 'beklemede' });
    }
  }
  for (const doc of (await db.collection('_eposta').where('durum', '==', 'gonderiliyor').get())
    .docs)
    if (Date.parse(doc.data().son_deneme) < Date.now() - 600000)
      await doc.ref.update({ durum: doc.data().deneme >= 5 ? 'hata' : 'beklemede' });
}
