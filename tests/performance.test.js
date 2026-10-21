import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, mapRows } from '../functions/core.js';
import { createService } from '../functions/service.js';

test('Aynı belgeye eşzamanlı okumalar tek veritabanı isteğini paylaşır', async () => {
  let calls = 0;
  const db = {
    collection: () => ({
      doc: () => ({
        path: 'markalar/1',
        get: async () => {
          calls++;
          await new Promise((r) => setTimeout(r, 5));
          return { exists: true, data: () => ({ id: 1, ad: 'Toyota' }) };
        },
      }),
    }),
  };
  const store = new Store(db);
  const result = await Promise.all(Array.from({ length: 20 }, () => store.get('markalar', 1)));
  assert.equal(calls, 1);
  assert.ok(result.every((r) => r.ad === 'Toyota'));
});

test('Paralel okumalar sıralamayı korur ve eşzamanlı işi sınırlar', async () => {
  let current = 0,
    max = 0;
  const rows = await mapRows(
    Array.from({ length: 40 }, (_, i) => i),
    async (i) => {
      current++;
      max = Math.max(max, current);
      await new Promise((r) => setTimeout(r, 1));
      current--;
      return i;
    },
  );
  assert.deepEqual(
    rows,
    Array.from({ length: 40 }, (_, i) => i),
  );
  assert.equal(max, 16);
});

test('Araç sözlüğü tüm katalog koleksiyonlarını taramadan yayımlanmış parçaları okur', async () => {
  const calls = [];
  const docs = {
    aktif: { aktif: true, surum: 'v1', parcalar: ['markalar_0', 'modeller_0'] },
    markalar_0: { tur: 'markalar', veri: '[[1,"Toyota","otomobil"]]' },
    modeller_0: { tur: 'modeller', veri: '[[2,1,"Passo",2004,2023]]' },
  };
  const db = {
    collection: (name) => {
      assert.equal(name, '_katalog');
      return {
        doc: (key) => ({
          path: name + '/' + key,
          get: async () => {
            calls.push(key);
            return { exists: !!docs[key], data: () => docs[key] };
          },
        }),
      };
    },
  };
  const service = createService({ db, auth: {}, bucket: {} });
  const [a, b] = await Promise.all([
    service.execute({ name: 'arac_sozlugu' }),
    service.execute({ name: 'arac_sozlugu' }),
  ]);
  assert.equal(a.data.modeller[0][2], 'Passo');
  assert.deepEqual(a, b);
  assert.deepEqual(calls.sort(), ['aktif', 'markalar_0', 'modeller_0']);
});
