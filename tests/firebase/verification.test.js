import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, getAuth, getFirestore } from '../../scripts/firebase/admin.mjs';
import { createService } from '../../functions/service.js';
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST,
  'Emülatörler gerekli',
);
initializeApp({ projectId: 'demo-beta-car' });
const db = getFirestore(),
  auth = getAuth(),
  sent = [];
const mail = {
  enabled: true,
  url: 'https://mail.example.invalid/send',
  key: 'test-mail-key',
  from: 'KONTAK <site@example.invalid>',
  fetch: async (url, options) => {
    sent.push(JSON.parse(options.body));
    return new Response('{}', { status: 200 });
  },
};
const service = createService({ db, auth, mail }),
  uid = 'kod-dogrulama',
  other = 'kod-diger',
  email = 'kod@example.invalid';
const ref = db.collection('_eposta_kodlari').doc(uid);
let user;
const call = (name, data = {}) => service.execute({ name, data }, user);
const code = () => sent.at(-1).text.match(/\b\d{6}\b/)[0];
async function reset() {
  await ref.delete();
  sent.length = 0;
  user = await auth.updateUser(uid, { email, emailVerified: false, disabled: false });
}
await test('E-posta kodu kimliği, kullanım süresi ve deneme sınırını sunucuda korur', async (t) => {
  for (const [id, address] of [
    [uid, email],
    [other, 'diger-kod@example.invalid'],
  ]) {
    await auth.deleteUser(id).catch(() => {});
    await auth.createUser({
      uid: id,
      email: address,
      emailVerified: false,
      password: 'Test-parola-42!',
    });
  }
  await t.test('Gönderim yokken eski bağlantılı akış için durum kapalıdır', async () => {
    await reset();
    const disabled = createService({ db, auth });
    assert.deepEqual((await disabled.execute({ name: 'eposta_kod_durumu' })).data, {
      enabled: false,
    });
    await assert.rejects(
      () => disabled.execute({ name: 'eposta_kod_gonder' }, user),
      /kullanılamıyor/,
    );
  });
  await t.test(
    'Kod altı hanelidir, bağlantısız gönderilir ve açık metin olarak saklanmaz',
    async () => {
      await reset();
      await assert.rejects(() => service.execute({ name: 'eposta_kod_gonder' }), /Giriş/);
      await assert.rejects(
        () => call('eposta_kod_gonder', { email: 'baskasi@example.invalid' }),
        /yetkisi/,
      );
      const result = (await call('eposta_kod_gonder', { lang: 'tr' })).data;
      assert.equal(sent.length, 1);
      assert.deepEqual(sent[0].to, [email]);
      assert.match(code(), /^\d{6}$/);
      assert.doesNotMatch(sent[0].text, /https?:|href/);
      assert.ok(result.expires > Date.now() + 590000);
      assert.equal(result.retryAfter, 60);
      const row = (await ref.get()).data();
      assert.equal(row.code, undefined);
      assert.match(row.hash, /^[a-f0-9]{64}$/);
      assert.notEqual(row.hash, code());
      assert.equal(row.delivered, true);
      await call('eposta_kod_gonder', { lang: 'tr' });
      assert.equal(sent.length, 1);
      const roleRead = await fetch(
        `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-beta-car/databases/(default)/documents/_eposta_kodlari/${uid}`,
      );
      assert.equal(roleRead.status, 403);
    },
  );
  await t.test('Yanlış kod hakkı azalır, beş denemeden sonra doğru kod da reddedilir', async () => {
    await reset();
    await call('eposta_kod_gonder');
    const wrong = code() === '111111' ? '222222' : '111111';
    for (let n = 0; n < 5; n++)
      await assert.rejects(() => call('eposta_kod_onayla', { code: wrong }), /yanlış/);
    assert.equal((await ref.get()).data().attempts, 5);
    await assert.rejects(() => call('eposta_kod_onayla', { code: code() }), /Deneme sınırı/);
    await assert.rejects(() => call('eposta_kod_gonder'), /bekleyin/);
    assert.equal((await auth.getUser(uid)).emailVerified, false);
  });
  await t.test('Süresi dolmuş ve başka hesaba ait kod onay vermez', async () => {
    await reset();
    await call('eposta_kod_gonder');
    const current = code(),
      otherUser = await auth.getUser(other);
    await assert.rejects(
      () => service.execute({ name: 'eposta_kod_onayla', data: { code: current } }, otherUser),
      /süresi/,
    );
    await ref.update({ expires: Date.now() - 1 });
    await assert.rejects(() => call('eposta_kod_onayla', { code: current }), /süresi/);
    assert.equal((await auth.getUser(uid)).emailVerified, false);
    assert.equal((await auth.getUser(other)).emailVerified, false);
  });
  await t.test(
    'Yeni kod eskisini geçersiz kılar; doğrulama Firebase Auth durumunu değiştirir',
    async () => {
      await reset();
      await call('eposta_kod_gonder');
      const old = code();
      await ref.update({ created: Date.now() - 61000 });
      await call('eposta_kod_gonder', { lang: 'en' });
      const current = code();
      assert.equal(sent.length, 2);
      assert.match(sent.at(-1).subject, /Email verification/);
      if (old !== current)
        await assert.rejects(() => call('eposta_kod_onayla', { code: old }), /yanlış/);
      await call('eposta_kod_onayla', { code: current });
      assert.equal((await auth.getUser(uid)).emailVerified, true);
      const row = (await ref.get()).data();
      assert.equal(row.used, true);
      assert.equal(row.hash, undefined);
      assert.equal(row.nonce, undefined);
    },
  );
  await t.test('E-posta değişince önceki adrese giden kod kullanılamaz', async () => {
    await reset();
    await call('eposta_kod_gonder');
    const old = code();
    await auth.updateUser(uid, { email: 'degisen-kod@example.invalid', emailVerified: false });
    await assert.rejects(() => call('eposta_kod_onayla', { code: old }), /süresi/);
    assert.equal((await auth.getUser(uid)).emailVerified, false);
  });
  await t.test('Kod onayı hesapta kayıtlı e-posta yazımını değiştirmez', async () => {
    await reset();
    user = await auth.updateUser(uid, { email: 'Kod@example.invalid', emailVerified: false });
    const stored = user.email;
    await call('eposta_kod_gonder');
    assert.deepEqual(sent.at(-1).to, [stored]);
    await call('eposta_kod_onayla', { code: code() });
    assert.equal((await auth.getUser(uid)).email, stored);
  });
  await t.test('Gönderim hatası kodu teslim edilmiş veya hesabı doğrulanmış saymaz', async () => {
    await reset();
    const unavailable = createService({
      db,
      auth,
      mail: { ...mail, fetch: async () => new Response('{}', { status: 503 }) },
    });
    await assert.rejects(
      () => unavailable.execute({ name: 'eposta_kod_gonder' }, user),
      /gönderilemedi/,
    );
    assert.equal((await ref.get()).data().delivered, false);
    assert.equal((await auth.getUser(uid)).emailVerified, false);
  });
  await t.test('Saatlik beş gönderim sınırı ve eşzamanlı istekler aşılmaz', async () => {
    await reset();
    await Promise.allSettled([call('eposta_kod_gonder'), call('eposta_kod_gonder')]);
    assert.equal(sent.length, 1);
    for (let n = 1; n < 5; n++) {
      await ref.update({ created: Date.now() - 61000 });
      await call('eposta_kod_gonder');
    }
    await ref.update({ created: Date.now() - 61000 });
    await assert.rejects(() => call('eposta_kod_gonder'), /bekleyin/);
    assert.equal(sent.length, 5);
  });
});
