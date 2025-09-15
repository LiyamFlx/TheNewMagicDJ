// Very small offline-first SW for static assets
const CACHE_NAME = 'magicdj-cache-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const response = await fetch(request);
      // Cache same-origin successful responses
      try {
        const url = new URL(request.url);
        if (url.origin === self.location.origin && response && response.status === 200) {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, clone);
        }
      } catch {}
      return response;
    } catch (e) {
      if (cached) return cached;
      // Offline fallback: return cached index for navigations
      if (request.mode === 'navigate') {
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
