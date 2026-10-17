import { cp, mkdir, readdir } from 'node:fs/promises';
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
console.log(`${pages.length} sayfa ve istemci dosyaları .build dizinine kopyalandı.`);
