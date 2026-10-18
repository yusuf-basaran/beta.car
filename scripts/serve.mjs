import { createServer, request } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};
createServer(async (req, res) => {
  let file;
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (process.env.FIREBASE_EMULATORS === 'true' && name.startsWith('/api')) {
      const proxy = request(
        'http://127.0.0.1:5001/demo-beta-car/europe-west1/api' + req.url.slice(4),
        { method: req.method, headers: req.headers },
        (upstream) => {
          res.writeHead(upstream.statusCode, upstream.headers);
          upstream.pipe(res);
        },
      );
      proxy.on('error', () => {
        res.writeHead(502);
        res.end();
      });
      req.pipe(proxy);
      return;
    }
    if (process.env.FIREBASE_EMULATORS === 'true' && name === '/js/config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(
        `export const cfg = ${JSON.stringify({ url: '', anon: '', firebase: { apiKey: 'demo-key', projectId: 'demo-beta-car', authDomain: 'localhost', storageBucket: 'demo-beta-car.appspot.com', appId: 'demo-beta-car-web' }, api: '/api', emulators: { host: '127.0.0.1' } })};`,
      );
      return;
    }
    const page = ['/kullanilmis', '/sifir', '/parca'].includes(name) ? '/ilanlar.html' : name;
    file = path.resolve(root, '.' + (page === '/' ? '/index.html' : page));
    if (!file.startsWith(root) || name.split('/').some((s) => s.startsWith('.'))) throw Error();
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(await readFile(path.join(root, '404.html')));
  }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1');
