import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.build');
const assets = [
  'style.css',
  'app.js',
  'logo.png',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
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
const config = process.env.FIREBASE_WEB_CONFIG ? JSON.parse(process.env.FIREBASE_WEB_CONFIG) : null;
if (config) {
  const allowed = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'measurementId',
    'databaseURL',
  ];
  if (
    !config.projectId ||
    !config.apiKey ||
    Object.keys(config).some((k) => !allowed.includes(k)) ||
    Object.values(config).some((v) => typeof v !== 'string' || v.length > 2000 || /[\r\n]/.test(v))
  )
    throw Error('Yalnız Firebase web yapılandırması kullanılabilir');
  await writeFile(
    path.join(output, 'js/config.js'),
    `export const cfg = ${JSON.stringify({ url: '', anon: '', firebase: config, api: '/api', emulators: process.env.FIREBASE_EMULATORS === 'true' ? { host: '127.0.0.1' } : null })};\n`,
  );
}
console.log(`${pages.length} sayfa ve istemci dosyaları .build dizinine kopyalandı.`);
