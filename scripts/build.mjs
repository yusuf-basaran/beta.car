import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.build');
const assets = [
  'style.css',
  'app.js',
  'sw.js',
  'logo.png',
  'logo-header.webp',
  'favicon.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json',
  'robots.txt',
  'sitemap.xml',
  'og-image.png',
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
const modules = [
  'app.js',
  ...(await readdir(path.join(output, 'js'), { recursive: true }))
    .filter((name) => name.endsWith('.js'))
    .map((name) => 'js/' + name),
].sort();
const hash = createHash('sha256');
const source = await Promise.all(modules.map((name) => readFile(path.join(output, name), 'utf8')));
for (let i = 0; i < modules.length; i++) hash.update(modules[i]).update(source[i]);
for (const name of ['style.css', 'sw.js', 'cevrimdisi.html', 'logo-header.webp', 'favicon.png'])
  hash.update(await readFile(path.join(output, name)));
const version = hash.digest('hex').slice(0, 12);
await Promise.all(
  modules.map((name, i) =>
    writeFile(
      path.join(output, name),
      source[i].replace(
        /(['"`])((?:\.\/|\.\.\/)[^'"`\n]*?\.js)\1/g,
        (_, quote, url) => `${quote}${url}?v=${version}${quote}`,
      ),
    ),
  ),
);
for (const name of pages) {
  const file = path.join(output, name);
  const html = await readFile(file, 'utf8');
  await writeFile(
    file,
    html.replace(/(src="\/?(?:app\.js|js\/offline\.js)|href="\/?style\.css)"/g, `$1?v=${version}"`),
  );
}
const worker = await readFile(path.join(output, 'sw.js'), 'utf8');
await writeFile(
  path.join(output, 'sw.js'),
  worker
    .replace('bc-offline-v1', `bc-offline-${version}`)
    .replace(/'(\/(?:js\/[^']+\.js|style\.css))'/g, (_, url) => `'${url}?v=${version}'`),
);
const templates = path.join(root, 'functions/site');
await mkdir(templates, { recursive: true });
for (const name of pages) await cp(path.join(output, name), path.join(templates, name));
if (process.argv.includes('--firebase')) {
  const hosting = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8')).hosting;
  for (const name of hosting.ignore.filter((name) => /^[a-z-]+\.(html|xml)$/.test(name)))
    await rm(path.join(output, name), { force: true });
}
console.log(`${pages.length} sayfa ve istemci dosyaları yayına hazırlandı.`);
