import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
test('Modül yolları mevcut dosyalara bağlanır', async () => {
  const files = [
    'app.js',
    ...(await readdir(new URL('js/', root), { recursive: true }))
      .filter((s) => s.endsWith('.js'))
      .map((s) => 'js/' + s),
  ];
  for (const file of files) {
    const url = new URL(file, root);
    const text = await readFile(url, 'utf8');
    for (const [, path] of text.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      if (path.startsWith('.')) await access(new URL(path, url));
    }
  }
});

test('İstemci ayarları boş ve güvenlik başlıkları etkindir', async () => {
  const { cfg } = await import('../js/config.js');
  assert.deepEqual(cfg, { url: '', anon: '' });
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const headers = Object.fromEntries(
    config.headers[0].headers.map(({ key, value }) => [key, value]),
  );
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Content-Security-Policy'], /style-src 'self'/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /unsafe-inline|unsafe-eval/);
  assert.match(headers['Strict-Transport-Security'], /max-age=31536000/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});
