import test from 'node:test';
import assert from 'node:assert/strict';
import { csvParse, esc, filterUrl, formatPrice, key } from '../js/utils.js';

test('HTML metni ve öznitelik sınırlarını kaçırır', () => {
  assert.equal(esc(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(esc(null), '');
  assert.equal(esc(0), '0');
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('Fiyat yerel biçimi, sıfır değeri ve boş fiyatı korur', () => {
  assert.equal(formatPrice(12500.5, 'GBP', 'tr-TR', 'Ara'), '12.500,5 GBP');
  assert.equal(formatPrice(12500.5, 'GBP', 'en-GB', 'Call'), '12,500.5 GBP');
  assert.equal(formatPrice(0, 'TL', 'tr-TR', 'Ara'), '0 TL');
  assert.equal(formatPrice(null, 'GBP', 'tr-TR', 'Ara'), 'Ara');
  assert.equal(formatPrice(undefined, 'GBP', 'en-GB', 'Call'), 'Call');
  assert.equal(esc(formatPrice(1, '<svg>', 'en-GB', '')), '1 &lt;svg&gt;');
});

test('Marka anahtarı harf, boşluk ve noktalama farklarını birleştirir', () => {
  assert.equal(key('MERCEDES-BENZ'), key('Mercedes Benz'));
  assert.equal(key(' Škoda '), 'skoda');
  assert.equal(key(''), '');
});

test('CSV alıntı, virgül, satır sonu ve çift tırnağı korur', () => {
  assert.deepEqual(csvParse('ad,fiyat\r\n"Araç, iki",12000\r\n"İki ""kapı""",0'), [
    ['ad', 'fiyat'],
    ['Araç, iki', '12000'],
    ['İki "kapı"', '0'],
  ]);
  assert.deepEqual(csvParse('"ilk\nikinci",\n\n'), [['ilk\nikinci', '']]);
  assert.throws(() => csvParse('"a,b'));
});

test('Filtre URL dönüşümü çoklu donanımı ve özel karakterleri korur', () => {
  const p = {
    q: 'A & B/İ',
    min: 0,
    donanim: [1, 2],
    detay: { direksiyon: 'right', takas: 'true' },
  };
  const url = new URLSearchParams(filterUrl(p));
  assert.equal(url.get('q'), p.q);
  assert.equal(url.get('min'), '0');
  assert.deepEqual(url.getAll('donanim'), ['1', '2']);
  assert.equal(url.get('d_direksiyon'), 'right');
  assert.equal(url.get('d_takas'), 'true');
  assert.equal(filterUrl({}), '');
});
