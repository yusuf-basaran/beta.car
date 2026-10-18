import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { initializeApp, getFirestore, getAuth, getStorage } from '../../scripts/firebase/admin.mjs';
import { seed } from '../../scripts/firebase/seed.mjs';
import { createService } from '../../functions/service.js';
import { maintenance } from '../../functions/jobs.js';
import { hash } from '../../functions/core.js';
import { firstAdmin } from '../../functions/bootstrap.js';

const project = 'demo-beta-car',
  bucketName = project + '.appspot.com';
assert.ok(
  process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    process.env.FIREBASE_STORAGE_EMULATOR_HOST,
  'Emülatörler gerekli',
);
initializeApp({ projectId: project, storageBucket: bucketName });
const db = getFirestore(),
  auth = getAuth(),
  bucket = getStorage().bucket(),
  service = createService({ db, auth, bucket });
const users = {},
  tokens = {};
const rpc = async (uid, name, data = {}) =>
  (await service.execute({ name, data }, users[uid])).data;
const query = async (uid, table, op = 'read', value, filters = [], more = {}) =>
  (await service.execute({ query: { table, op, value, filters, ...more } }, users[uid])).data;
const doc = async (table, key) => (await db.collection(table).doc(String(key)).get()).data();
const put = (table, key, data) => db.collection(table).doc(String(key)).set(data);
const reject = (fn, pattern = /./) => assert.rejects(fn, pattern);
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const rest = (url, uid, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...(uid ? { Authorization: 'Bearer ' + tokens[uid] } : {}), ...options.headers },
  });
const firestore = (table, key) =>
  `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents/${table}/${key}`;
const upload = async (uid, path, contentType = 'application/pdf', bytes = 'rapor') =>
  rest(
    `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    uid,
    { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes },
  );

await test('Firebase sunucu işlemleri ve erişim kuralları', async (t) => {
  await seed(project);
  for (const uid of ['uye-a', 'uye-b', 'uye-c', 'yonetici', 'dogrulanmamis']) {
    await auth.deleteUser(uid).catch(() => {});
    users[uid] = await auth.createUser({
      uid,
      email: uid + '@example.invalid',
      password: 'Test-parola-42!',
      emailVerified: uid !== 'dogrulanmamis',
    });
    await rpc(uid, 'profil_kaydet', { ad: uid, tip: 'bireysel' });
    const response = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: users[uid].email,
          password: 'Test-parola-42!',
          returnSecureToken: true,
        }),
      },
    );
    const result = await response.json();
    assert.ok(result.idToken, JSON.stringify(result));
    tokens[uid] = result.idToken;
  }
  await put('_yetkiler', 'yonetici', { kullanici_id: 'yonetici', admin: true, engelli: false });
  let listing, request, pack, conversation;
  const base = {
    baslik: 'Şehir içi bakım kayıtlı araç',
    kategori_id: 4,
    marka_id: 3,
    model_id: 1,
    yil: 2018,
    km: 50000,
    fiyat: 12000,
    para_birimi: 'GBP',
    sehir: 'Girne',
    aciklama: 'Bakım kayıtları incelenebilir.',
    detay: {},
    fotograflar: [],
  };
  const catalogue = await rpc(null, 'arac_sozlugu');
  base.marka_id = catalogue.modeller[0][1];
  base.model_id = catalogue.modeller[0][0];
  base.yil = Math.min(2018, catalogue.modeller[0][4]);
  base.kategori_id =
    (await query(null, 'kategoriler')).find((r) => r.arac_tipi === 'otomobil')?.id || 4;
  await t.test(
    'Hosting sayfa, ikon, güvenlik başlıkları ve API yönlendirmesini sunar',
    async () => {
      const home = await fetch('http://127.0.0.1:5000/');
      assert.equal(home.status, 200);
      assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
      assert.equal((await fetch('http://127.0.0.1:5000/icon-192.png')).status, 200);
      assert.equal((await fetch('http://127.0.0.1:5000/bulunamayan-sayfa')).status, 404);
      const response = await fetch('http://127.0.0.1:5000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'sayaclar' }),
      });
      assert.equal(response.status, 200, await response.clone().text());
      assert.equal((await response.json()).data.firma, 0);
    },
  );
  await t.test('Yetki yükseltme, doğrulanmamış hesap ve özel kayıtlar kapalıdır', async () => {
    assert.equal((await rest(firestore('_yetkiler', 'yonetici'), 'uye-a')).status, 403);
    assert.equal(
      (
        await rest(firestore('_yetkiler', 'uye-a'), 'uye-a', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { admin: { booleanValue: true } } }),
        })
      ).status,
      403,
    );
    await reject(() => rpc('uye-a', 'admin_veri', { p_tablo: 'ayarlar' }), /Yönetici/);
    await reject(
      () => query('uye-a', 'profil', 'update', { dogrulandi: true }, [['id', 'eq', 'uye-a']]),
      /yetkisi/,
    );
    await reject(() => rpc('dogrulanmamis', 'talep_ac', { p_paket: 'x' }), /Doğrulanmış/);
    assert.deepEqual(await query(null, 'ayarlar'), []);
    const response = await fetch(`http://127.0.0.1:5001/${project}/europe-west1/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokens['uye-a'] },
      body: JSON.stringify({ name: 'profilim' }),
    });
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).data.id, 'uye-a');
  });
  await t.test('İlan sahipliği, ücretsiz limit, gövde ve donanım korunur', async () => {
    listing = (await query('uye-a', 'ilanlar', 'insert', base, [], { one: 'required' })).id;
    await query('uye-a', 'ilan_parca', 'upsert', {
      ilan_id: listing,
      parca: 'kaput',
      durum: 'orijinal',
    });
    await query('uye-a', 'ilan_donanim', 'upsert', { ilan_id: listing, donanim_id: 1 });
    await reject(
      () =>
        query('uye-b', 'ilan_parca', 'upsert', {
          ilan_id: listing,
          parca: 'tavan',
          durum: 'degisen',
        }),
      /yetkisi/,
    );
    await rpc('uye-a', 'kota', { p_ilan: listing, p_islem: 'yayinla' });
    assert.equal((await doc('ilanlar', listing)).durum, 'yayinda');
    assert.equal((await rpc(null, 'ilan_ara', { p: { id: listing } })).toplam, 1);
    await reject(() => rpc('uye-b', 'kota', { p_ilan: listing, p_islem: 'kaldir' }), /bulunamadı/);
    const ids = [];
    for (let i = 0; i < 3; i++)
      ids.push(
        (
          await query(
            'uye-a',
            'ilanlar',
            'insert',
            { ...base, baslik: 'Bakım kayıtlı araç ' + i },
            [],
            { one: 'required' },
          )
        ).id,
      );
    for (const id of ids.slice(0, 2))
      await rpc('uye-a', 'kota', { p_ilan: id, p_islem: 'yayinla' });
    await reject(() => rpc('uye-a', 'kota', { p_ilan: ids[2], p_islem: 'yayinla' }), /Paket al/);
    await rpc('uye-a', 'kota', { p_ilan: listing, p_islem: 'yukari' });
    await reject(() => rpc('uye-a', 'kota', { p_ilan: listing, p_islem: 'yukari' }), /Günde/);
  });
  await t.test('Eşzamanlı paket taleplerinden yalnız biri açılır; IBAN gizli kalır', async () => {
    pack = (await query(null, 'paketler')).find(
      (r) => r.hedef === 'bireysel' && r.ilan_kotasi > 0,
    ).id;
    const requests = await Promise.allSettled([
      rpc('uye-a', 'talep_ac', { p_paket: pack }),
      rpc('uye-a', 'talep_ac', { p_paket: pack }),
    ]);
    assert.equal(requests.filter((r) => r.status === 'fulfilled').length, 1);
    request = requests.find((r) => r.status === 'fulfilled').value;
    await reject(() => rpc('uye-a', 'banka_bilgisi', { p_talep: request }), /kapalı/);
    for (const [key, value] of [
      ['iban', 'TR00 TEST'],
      ['hesap_sahibi', 'Test hesabı'],
      ['banka', 'Test bankası'],
    ])
      await rpc('yonetici', 'yonet', { p_tablo: 'ayarlar', p_id: key, p_veri: value });
    await rpc('yonetici', 'talep_isle', {
      p_talep: request,
      p_durum: 'odeme_bekliyor',
      p_fiyat: 25,
    });
    assert.equal((await rpc('uye-a', 'banka_bilgisi', { p_talep: request })).iban, 'TR00 TEST');
    await reject(() => rpc('uye-b', 'banka_bilgisi', { p_talep: request }), /bulunamadı/);
    assert.equal((await rest(firestore('paket_talepleri', request), 'uye-a')).status, 403);
    assert.equal((await query('uye-b', 'paket_talepleri')).length, 0);
  });
  await t.test('Dekont türü, boyutu, sahipliği ve zaman aşımı uygulanır', async () => {
    const path = `dekontlar/uye-a/${request}/dekont.pdf`;
    assert.equal((await upload('uye-b', path)).status, 403);
    assert.equal((await upload('uye-a', path.replace('.pdf', '.html'), 'text/html')).status, 403);
    assert.equal(
      (
        await upload(
          'uye-a',
          path.replace('.pdf', '-buyuk.pdf'),
          'application/pdf',
          new Uint8Array(5242881),
        )
      ).status,
      403,
    );
    const response = await upload('uye-a', path);
    assert.ok(response.ok, await response.text());
    assert.equal(
      (
        await rest(
          `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`,
          'uye-b',
        )
      ).status,
      403,
    );
    await rpc('uye-a', 'dekont_ekle', { p_talep: request, p_dosya: `uye-a/${request}/dekont.pdf` });
    await rpc('yonetici', 'talep_isle', {
      p_talep: request,
      p_durum: 'onaylandi',
      p_makbuz: 'Yalnız yönetim',
    });
    assert.equal(
      (await doc('abonelikler', request)).kalan_ilan,
      (await doc('paketler', pack)).ilan_kotasi,
    );
    await reject(
      () => rpc('yonetici', 'talep_isle', { p_talep: request, p_durum: 'onaylandi' }),
      /geçişi/,
    );
    assert.equal((await query('uye-a', 'paket_talepleri'))[0].makbuz_notu, undefined);
    await reject(
      () => query('uye-a', 'abonelikler', 'update', { kalan_ilan: 100 }, [['id', 'eq', request]]),
      /kapalı/,
    );
    assert.equal((await upload('uye-a', path.replace('.pdf', '-sonra.pdf'))).status, 403);
    const api = `http://127.0.0.1:5001/${project}/europe-west1/api`;
    const link = await rest(api, 'uye-a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dosya_url',
        data: { bucket: 'dekontlar', file: `uye-a/${request}/dekont.pdf` },
      }),
    });
    assert.equal(link.status, 200, await link.clone().text());
    const pathUrl = (await link.json()).data,
      url = api + pathUrl.slice(4);
    assert.equal((await fetch(url)).status, 200);
    const token = new URL(url).searchParams.get('token');
    await db.collection('_dosyalar').doc(hash(token)).update({ expires: 0 });
    assert.equal((await fetch(url)).status, 403);
  });
  await t.test('Son öne çıkarma hakkı eşzamanlı isteklerde bir kez kullanılır', async () => {
    await rpc('yonetici', 'yonet', {
      p_tablo: 'abonelikler',
      p_id: request,
      p_veri: { kalan_onecikarma: 1 },
    });
    const result = await Promise.allSettled([
      rpc('uye-a', 'kota', { p_ilan: listing, p_islem: 'onecikar', p_tur: 'seckin' }),
      rpc('uye-a', 'kota', { p_ilan: listing, p_islem: 'onecikar', p_tur: 'prestij' }),
    ]);
    assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal((await doc('abonelikler', request)).kalan_onecikarma, 0);
  });
  await t.test('Mesaj erişimi, okundu, tekrar sınırı, kapora uyarısı ve engelleme', async () => {
    conversation = await rpc('uye-b', 'konusma_ac', { p_ilan: listing });
    const message = await rpc('uye-b', 'mesaj_yaz', {
      p_konusma: conversation,
      p_metin: 'IBAN veya kapora isteniyor mu?',
    });
    assert.equal((await doc('mesajlar', message)).uyari, true);
    await reject(
      () =>
        rpc('uye-b', 'mesaj_yaz', {
          p_konusma: conversation,
          p_metin: 'IBAN veya kapora isteniyor mu?',
        }),
      /tekrarlanamaz/,
    );
    await reject(
      () => rpc('uye-c', 'mesaj_yaz', { p_konusma: conversation, p_metin: 'Merhaba' }),
      /bulunamadı/,
    );
    assert.equal((await rest(firestore('mesajlar', message), 'uye-a')).status, 200);
    assert.equal((await rest(firestore('mesajlar', message), 'uye-c')).status, 403);
    await rpc('uye-a', 'okundu', { p_konusma: conversation });
    assert.equal((await doc('mesajlar', message)).okundu, true);
    await query('uye-a', 'engeller', 'upsert', { kullanici_id: 'uye-a', engellenen_id: 'uye-b' });
    await reject(
      () => rpc('uye-b', 'mesaj_yaz', { p_konusma: conversation, p_metin: 'Araç duruyor mu?' }),
      /gönderilemiyor/,
    );
    await reject(
      () => rpc('uye-a', 'mesaj_yaz', { p_konusma: conversation, p_metin: 'x'.repeat(4001) }),
      /uzunluğu/,
    );
  });
  await t.test('Formlar sunucuda doğrulanır; üç şikâyette ilan gizlenir', async () => {
    await reject(
      () => query('uye-a', 'iletisim', 'insert', { konu: 'Konu', metin: 'x'.repeat(4001) }),
      /uzunluğu/,
    );
    await reject(
      () =>
        query('uye-a', 'randevular', 'insert', {
          ilan_id: listing,
          ad: 'Üye',
          telefon: '<script>',
          notu: '',
        }),
      /Telefon/,
    );
    for (const uid of ['uye-b', 'uye-c', 'yonetici'])
      await query(uid, 'sikayetler', 'insert', {
        ilan_id: listing,
        sebep: 'fiyat',
        notu: 'Fiyat doğrulansın',
      });
    assert.equal((await doc('ilanlar', listing)).gizli, true);
    assert.equal((await rpc(null, 'ilan_ara', { p: { id: listing } })).toplam, 0);
  });
  await t.test('Tarayıcı gerçek Firebase SDK ile giriş yapıp sunucuya erişir', async () => {
    const server = spawn(process.execPath, ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: '4180', FIREBASE_EMULATORS: 'true' },
      stdio: 'ignore',
    });
    let browser;
    try {
      for (let i = 0; i < 50; i++) {
        try {
          if ((await fetch('http://127.0.0.1:4180/')).ok) break;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      browser = await chromium.launch({
        ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
        ...(process.env.CHROMIUM_PROXY
          ? { proxy: { server: process.env.CHROMIUM_PROXY, bypass: '127.0.0.1,localhost' } }
          : {}),
      });
      const page = await browser.newPage({ ignoreHTTPSErrors: !!process.env.CHROMIUM_PROXY });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') console.log('Tarayıcı:', m.text());
      });
      page.on('requestfailed', (r) =>
        console.log('İstek:', new URL(r.url()).pathname, r.failure()?.errorText),
      );
      await page.route(
        /^https:\/\/(identitytoolkit|securetoken|firestore|firebasestorage)\.googleapis\.com\//,
        (route) => {
          errors.push('Canlı servis çağrısı');
          return route.abort();
        },
      );

      await page.goto('http://127.0.0.1:4180/giris.html');
      const loadedState = await page.evaluateHandle(
        async () => (await import('/js/state.js')).state,
      );
      await page.waitForFunction((state) => !!state.db && state.cats.length > 0, loadedState);
      await loadedState.dispose();
      let interrupted = false;
      await page.route('**/api', (route) => {
        const request = route.request().postDataJSON();
        if (request.name === 'profil_kaydet' && !interrupted) {
          interrupted = true;
          return route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'Bağlantı kesildi' } }),
          });
        }
        return route.continue();
      });
      const registration = await page.evaluate(async () => {
        const { state } = await import('/js/state.js');
        const value = {
          email: 'yeni-uye@example.invalid',
          password: 'Test-parola-42!',
          options: {
            data: { ad: 'Yeni Üye', tip: 'bireysel' },
            emailRedirectTo: new URL('hesabim.html', location.href).href,
          },
        };
        const first = await state.db.auth.signUp(value),
          second = await state.db.auth.signUp(value);
        const hidden = !(await state.db.auth.getUser()).data.user;
        await state.db.auth.signOut();
        return {
          failed: !!first.error,
          error: second.error?.message || null,
          uid: second.data?.user?.id,
          hidden,
        };
      });
      assert.equal(registration.failed, true);
      assert.equal(registration.error, null);
      assert.equal(registration.hidden, true);
      assert.equal((await doc('profil', registration.uid)).ad, 'Yeni Üye');
      await page.unroute('**/api');
      await page.locator('[name="email"]').fill('uye-a@example.invalid');
      await page.locator('[name="password"]').fill('Test-parola-42!');
      await page.waitForTimeout(1000);
      await page.locator('#auth-form .btn').click();
      try {
        await page.waitForURL('**/hesabim.html', { timeout: 30000 });
      } catch (error) {
        console.log('Giriş ekranı:', await page.locator('#main').innerText());
        console.log('Uyarı:', await page.locator('#notice').allTextContents());
        console.log('Hatalar:', errors);
        throw error;
      }
      await page.waitForFunction(() =>
        document.querySelector('#main')?.textContent.includes('İlanlarım'),
      );
      assert.deepEqual(errors, []);
      await page.locator('[data-account="paketler"]').click();
      await page.waitForFunction(() =>
        document.querySelector('#account-content')?.textContent.includes('BC-'),
      );
      assert.equal(
        await page.evaluate(async () => {
          const { state } = await import('/js/state.js');
          return state.user.id;
        }),
        'uye-a',
      );
      await auth.updateUser('uye-a', { disabled: true });
      await page.reload();
      const refreshedState = await page.evaluateHandle(
        async () => (await import('/js/state.js')).state,
      );
      await page.waitForFunction((state) => !!state.db && state.cats.length > 0, refreshedState);
      assert.equal(await refreshedState.evaluate((state) => state.user || null), null);
      await refreshedState.dispose();
      assert.ok(await page.locator('a[href^="giris.html"]').count());
      await auth.updateUser('uye-a', { disabled: false });
    } finally {
      await browser?.close();
      server.kill();
      await once(server, 'exit');
    }
  });
  await t.test('İlk yönetici doğrulanmış sunucu ayarıyla yalnız bir kez atanır', async () => {
    await firstAdmin(db, users.dogrulanmamis, users.dogrulanmamis.email);
    assert.equal((await doc('_yetkiler', 'dogrulanmamis')).admin, false);
    await firstAdmin(db, users['uye-c'], 'farkli@example.invalid');
    assert.equal((await doc('_yetkiler', 'uye-c')).admin, false);
    await firstAdmin(db, users['uye-c'], users['uye-c'].email);
    assert.equal((await doc('_yetkiler', 'uye-c')).admin, true);
    await firstAdmin(db, users['uye-b'], users['uye-b'].email);
    assert.equal((await doc('_yetkiler', 'uye-b')).admin, false);
  });
  await t.test('Zamanlanmış bakım süreleri uygular ve yinelenen bildirim göndermez', async () => {
    const pending = await rpc('uye-b', 'talep_ac', { p_paket: pack });
    await db
      .collection('paket_talepleri')
      .doc(pending)
      .update({ olusturma: future(-8) });
    await db
      .collection('abonelikler')
      .doc(request)
      .update({ bitis: future(-1) });
    await maintenance(db);
    await maintenance(db);
    assert.equal((await doc('paket_talepleri', pending)).durum, 'suresi_doldu');
    assert.equal((await doc('abonelikler', request)).durum, 'bitti');
    const notices = await db.collection('bildirimler').where('kullanici_id', '==', 'uye-a').get();
    assert.equal(notices.docs.filter((d) => d.data().tur === 'paket_bitti').length, 1);
  });
});
