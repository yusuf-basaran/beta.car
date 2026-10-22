import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { check, fields } from './core.js';

const lifetime = 600000,
  cooldown = 60000;
const digest = (mail, uid, row, code) =>
  createHmac('sha256', mail.key)
    .update(['beta-email', uid, row.email, row.nonce, code].join(':'))
    .digest('hex');
const ready = (mail) =>
  !!(mail.enabled && mail.key && mail.from && /^https:\/\//.test(mail.url || ''));

export async function verification(db, auth, c, name, p, mail = {}) {
  if (name === 'eposta_kod_durumu') return { enabled: ready(mail) };
  check(c.uid, 'Giriş yapın', 401);
  check(ready(mail), 'E-posta gönderimi şu anda kullanılamıyor', 503);
  const user = await auth.getUser(c.uid);
  check(user.email && !user.disabled, 'E-posta hesabı bulunamadı', 403);
  if (user.emailVerified) return { verified: true };
  const email = user.email,
    ref = db.collection('_eposta_kodlari').doc(c.uid);
  if (name === 'eposta_kod_gonder') {
    fields(p, ['lang']);
    const code = String(randomInt(1000000)).padStart(6, '0'),
      nonce = randomUUID(),
      time = Date.now();
    const challenge = await db.runTransaction(async (tx) => {
      const old = (await tx.get(ref)).data() || {},
        sent = (old.sent || []).filter((t) => t > time - 3600000);
      if (
        old.email === email &&
        old.delivered &&
        !old.used &&
        old.attempts < 5 &&
        old.expires > time &&
        time - old.created < cooldown
      )
        return {
          expires: old.expires,
          retryAfter: Math.ceil((cooldown - time + old.created) / 1000),
        };
      check(
        sent.length < 5 && (!old.created || time - old.created >= cooldown),
        'Yeni kod için lütfen bekleyin',
        429,
      );
      const row = {
        email,
        nonce,
        created: time,
        expires: time + lifetime,
        attempts: 0,
        used: false,
        delivered: false,
        sent: [...sent, time],
      };
      row.hash = digest(mail, c.uid, row, code);
      tx.set(ref, row);
      return { expires: row.expires, retryAfter: 60, nonce };
    });
    if (!challenge.nonce) return challenge;
    try {
      const en = p.lang === 'en';
      const response = await (mail.fetch || fetch)(mail.url, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + mail.key,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'bc-verify-' + nonce,
        },
        body: JSON.stringify({
          from: mail.from,
          to: [email],
          subject: en ? 'KONTAK · Email verification code' : 'KONTAK · E-posta doğrulama kodu',
          text: en
            ? `Your KONTAK verification code: ${code}\n\nEnter this code on the KONTAK website within 10 minutes. Do not share it. If you did not request this code, ignore this email.`
            : `KONTAK doğrulama kodunuz: ${code}\n\nBu kodu 10 dakika içinde KONTAK sitesine yazın. Kodu kimseyle paylaşmayın. Bu kodu siz istemediyseniz e-postayı dikkate almayın.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      check(response.ok, 'Doğrulama kodu gönderilemedi; daha sonra tekrar deneyin', 503);
      await db.runTransaction(async (tx) => {
        const row = (await tx.get(ref)).data();
        if (row?.nonce === nonce) tx.update(ref, { delivered: true });
      });
    } catch {
      throw Object.assign(Error('Doğrulama kodu gönderilemedi; daha sonra tekrar deneyin'), {
        status: 503,
      });
    }
    return { expires: challenge.expires, retryAfter: 60 };
  }
  fields(p, ['code']);
  check(typeof p.code === 'string' && /^\d{6}$/.test(p.code), '6 haneli doğrulama kodunu girin');
  const result = await db.runTransaction(async (tx) => {
    const row = (await tx.get(ref)).data();
    check(
      row && row.email === email && row.delivered && !row.used && row.expires > Date.now(),
      'Kodun süresi doldu veya kod kullanılamıyor',
    );
    check(row.attempts < 5, 'Deneme sınırına ulaşıldı; yeni kod isteyin', 429);
    const valid = timingSafeEqual(
      Buffer.from(row.hash, 'hex'),
      Buffer.from(digest(mail, c.uid, row, p.code), 'hex'),
    );
    tx.update(ref, valid ? { used: true } : { attempts: row.attempts + 1 });
    return { valid, email: row.email, nonce: row.nonce };
  });
  check(result.valid, 'Doğrulama kodu yanlış');
  try {
    await auth.updateUser(c.uid, { email: result.email, emailVerified: true });
  } catch (error) {
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.nonce === result.nonce) tx.update(ref, { used: false });
    });
    throw error;
  }
  await db.runTransaction(async (tx) => {
    const row = (await tx.get(ref)).data();
    if (row?.nonce === result.nonce) {
      delete row.hash;
      delete row.nonce;
      tx.set(ref, { ...row, used: true });
    }
  });
  return { verified: true };
}
