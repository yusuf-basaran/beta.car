const cacheName = 'bc-offline-v1';
const files = [
  '/cevrimdisi.html',
  '/style.css',
  '/logo-header.webp',
  '/favicon.png',
  '/js/offline.js',
  '/js/i18n.js',
  '/js/state.js',
  '/js/data.js',
  '/js/utils.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(files))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter((key) => key.startsWith('bc-offline-') && key !== cacheName)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.open(cacheName)).match('/cevrimdisi.html')),
    );
    return;
  }
  const url = new URL(request.url);
  if (url.origin === self.location.origin && files.includes(url.pathname + url.search))
    event.respondWith(
      caches.open(cacheName).then(async (cache) => (await cache.match(request)) || fetch(request)),
    );
});
