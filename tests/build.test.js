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
      'supabase.sql',
      '.env',
    ])
      await writeFile(path.join(root, name), '');
    const source = "export const cfg = { url: '', anon: '' };";
    await writeFile(path.join(root, 'js/config.js'), source);
    const build = (env) =>
      promisify(execFile)(process.execPath, ['scripts/build.mjs'], {
        cwd: root,
        env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '', ...env },
      });
    await build({});
    assert.equal(await readFile(path.join(root, '.build/js/config.js'), 'utf8'), source);
    const files = await readdir(path.join(root, '.build'));
    assert(!files.includes('supabase.sql') && !files.includes('.env'));
    await build({ SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'sb_publishable_test' });
    assert.match(
      await readFile(path.join(root, '.build/js/config.js'), 'utf8'),
      /sb_publishable_test/,
    );
    assert.equal(await readFile(path.join(root, 'js/config.js'), 'utf8'), source);
    const token = [
      'test',
      Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'),
      'test',
    ].join('.');
    await assert.rejects(
      build({ SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: token }),
      /Yalnız public\/anon/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
