import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('Build yalnız istemci dosyalarını yayımlar ve özel anahtarı reddeder', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beta-build-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'js'));
    await cp(
      new URL('../scripts/build.mjs', import.meta.url),
      path.join(root, 'scripts/build.mjs'),
    );
    for (const name of [
      'index.html',
      'style.css',
      'app.js',
      'logo.png',
      'manifest.json',
      'robots.txt',
      'sitemap.xml',
      'icon-192.png',
      'icon-512.png',
      'favicon.png',
      'apple-touch-icon.png',
      'supabase.sql',
      '.env',
    ])
      await writeFile(path.join(root, name), '');
    const source = "export const cfg = { url: '', anon: '' };";
    await writeFile(path.join(root, 'js/config.js'), source);
    const build = (env) =>
      promisify(execFile)(process.execPath, ['scripts/build.mjs'], {
        cwd: root,
        env: { ...process.env, FIREBASE_WEB_CONFIG: '', ...env },
      });
    await build({});
    assert.equal(await readFile(path.join(root, '.build/js/config.js'), 'utf8'), source);
    const files = await readdir(path.join(root, '.build'));
    assert(!files.includes('supabase.sql') && !files.includes('.env'));
    const config = {
      apiKey: 'public-test',
      projectId: 'demo-beta-car',
      storageBucket: 'demo-beta-car.firebasestorage.app',
    };
    await build({ FIREBASE_WEB_CONFIG: JSON.stringify(config) });
    assert.match(await readFile(path.join(root, '.build/js/config.js'), 'utf8'), /demo-beta-car/);
    assert.equal(await readFile(path.join(root, 'js/config.js'), 'utf8'), source);
    await assert.rejects(
      build({ FIREBASE_WEB_CONFIG: JSON.stringify({ ...config, private_key: 'not-public' }) }),
      /Yalnız Firebase web/,
    );
    await assert.rejects(
      build({
        FIREBASE_WEB_CONFIG: JSON.stringify({ ...config, apiKey: { private_key: 'not-public' } }),
      }),
      /Yalnız Firebase web/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
