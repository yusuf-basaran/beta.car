import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { renderSeo } from '../functions/seo.js';

test('Build yalnız istemci dosyalarını yayımlar ve özel anahtarı reddeder', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beta-build-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'js'));
    await cp(
      new URL('../scripts/build.mjs', import.meta.url),
      path.join(root, 'scripts/build.mjs'),
    );
    for (const name of ['layout.js', 'data.js', 'i18n.js', 'utils.js', 'state.js'])
      await cp(new URL('../js/' + name, import.meta.url), path.join(root, 'js', name));
    await cp(new URL('../firebase.json', import.meta.url), path.join(root, 'firebase.json'));
    for (const name of [
      'index.html',
      'cevrimdisi.html',
      'sw.js',
      'style.css',
      'app.js',
      'logo.png',
      'logo-header.webp',
      'manifest.json',
      'robots.txt',
      'sitemap.xml',
      'icon-192.png',
      'icon-512.png',
      'favicon.png',
      'apple-touch-icon.png',
      'og-image.png',
      'supabase.sql',
      '.env',
    ])
      await writeFile(path.join(root, name), '');
    await cp(new URL('../sw.js', import.meta.url), path.join(root, 'sw.js'));
    await writeFile(path.join(root, 'app.js'), "import './js/config.js';");
    await cp(new URL('../index.html', import.meta.url), path.join(root, 'index.html'));
    const source = "export const cfg = { url: '', anon: '' };";
    await writeFile(path.join(root, 'js/config.js'), source);
    const build = (env, args = []) =>
      promisify(execFile)(process.execPath, ['scripts/build.mjs', ...args], {
        cwd: root,
        env: { ...process.env, FIREBASE_WEB_CONFIG: '', ...env },
      });
    await build({});
    assert.equal(await readFile(path.join(root, '.build/js/config.js'), 'utf8'), source);
    const files = await readdir(path.join(root, '.build'));
    assert(!files.includes('supabase.sql') && !files.includes('.env'));
    await build({}, ['--firebase']);
    assert(!(await readdir(path.join(root, '.build'))).includes('index.html'));
    const template = await readFile(path.join(root, 'functions/site/index.html'), 'utf8');
    assert.match(template, /id="header"><header class="header"/);
    assert.match(template, /data-startup/);
    const layout = JSON.parse(
      await readFile(path.join(root, 'functions/site/layout.json'), 'utf8'),
    );
    const translated = renderSeo(
      template,
      {
        lang: 'en',
        path: '/sifir',
        title: 'New Vehicles',
        description: 'Vehicle listings',
      },
      layout.en,
    );
    assert.equal((translated.match(/class="header"/g) || []).length, 1);
    assert.equal((translated.match(/class="footer"/g) || []).length, 1);
    assert.equal((translated.match(/<main /g) || []).length, 1);
    assert.match(translated, /data-cat="sifir" class="active"/);
    assert.match(translated, /New Vehicles/);
    assert.doesNotMatch(translated, /data-startup|Kullanılmış Araçlar/);
    const version = template.match(/app\.js\?v=([a-f0-9]{12})/)[1];
    const worker = await readFile(path.join(root, '.build/sw.js'), 'utf8');
    assert.ok(worker.includes('bc-offline-' + version));
    assert.ok(worker.includes('/style.css?v=' + version));
    assert.ok(worker.includes('/js/offline.js?v=' + version));
    assert.match(
      await readFile(path.join(root, '.build/app.js'), 'utf8'),
      new RegExp('config\\.js\\?v=' + version),
    );
    await build({}, ['--firebase']);
    assert.equal(await readFile(path.join(root, 'functions/site/index.html'), 'utf8'), template);
    await writeFile(path.join(root, 'js/config.js'), source + '\n');
    await build({}, ['--firebase']);
    assert.notEqual(await readFile(path.join(root, 'functions/site/index.html'), 'utf8'), template);
    await writeFile(path.join(root, 'js/config.js'), source);
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
