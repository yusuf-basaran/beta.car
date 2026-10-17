import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.build');
const assets = [
  'style.css',
  'app.js',
  'logo.png',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'js',
];
const pages = (await readdir(root)).filter((name) => name.endsWith('.html'));
await mkdir(output, { recursive: true });
for (const name of [...pages, ...assets]) {
  await cp(path.join(root, name), path.join(output, name), { recursive: true });
}
const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';
if (url || anon) {
  if (!url.startsWith('https://') || !anon)
    throw Error('Supabase URL ve public/anon anahtarı birlikte tanımlanmalı');
  let role;
  try {
    role = JSON.parse(Buffer.from(anon.split('.')[1] || '', 'base64url')).role;
  } catch {}
  if (!anon.startsWith('sb_publishable_') && role !== 'anon')
    throw Error('Yalnız public/anon anahtarı kullanılabilir');
  await writeFile(
    path.join(output, 'js/config.js'),
    `export const cfg = ${JSON.stringify({ url, anon })};\n`,
  );
}
console.log(`${pages.length} sayfa ve istemci dosyaları .build dizinine kopyalandı.`);
