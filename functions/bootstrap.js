import data from './data.json' with { type: 'json' };
import { Timestamp } from 'firebase-admin/firestore';

let ready;
export function bootstrap(db) {
  ready ||= db
    .runTransaction(async (tx) => {
      const marker = db.collection('_kurulum').doc('veriler');
      if ((await tx.get(marker)).exists) return;
      const records = Object.entries(data).flatMap(([name, rows]) =>
        rows.map((row) => [name, row]),
      );
      const refs = records.map(([name, row]) =>
        db.collection(name).doc(String(row.id ?? row.anahtar ?? row.slug)),
      );
      const old = await tx.getAll(...refs);
      const names = ['kategoriler', 'donanimlar', 'markalar', 'modeller', 'bannerlar'];
      const counters = await tx.getAll(
        ...names.map((name) => db.collection('_sayaclar').doc(name)),
      );
      records.forEach(([name, row], i) => {
        if (old[i].exists) return;
        tx.create(
          refs[i],
          name === 'yazilar' ? { ...row, _publish: Timestamp.fromDate(new Date(row.yayin)) } : row,
        );
      });
      names.forEach((name, i) => {
        const n = Math.max(0, ...data[name].map((r) => Number(r.id) || 0));
        if (!counters[i].exists || counters[i].data().n < n) tx.set(counters[i].ref, { n });
      });
      tx.create(marker, { tarih: new Date().toISOString(), surum: 1 });
    })
    .catch((error) => {
      ready = null;
      throw error;
    });
  return ready;
}
export async function firstAdmin(db, user, email) {
  if (!email || !user.emailVerified || user.email?.toLowerCase() !== email.trim().toLowerCase())
    return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection('_kurulum').doc('yonetici');
    const marker = await tx.get(ref);
    if (marker.exists) return;
    const role = db.collection('_yetkiler').doc(user.uid),
      old = await tx.get(role);
    if (!old.exists || old.data().engelli) return;
    tx.update(role, { admin: true });
    tx.create(ref, { kullanici_id: user.uid, tarih: new Date().toISOString() });
  });
}
