// Enhanced service worker with proper caching strategies
const CACHE_NAME = 'magicdj-cache-v2';
const RUNTIME_CACHE = 'magicdj-runtime-v2';

// Assets to precache
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
  HTML: 'network-first',
  ASSETS: 'stale-while-revalidate',
  API: 'network-only'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

function isHTML(request) {
  return request.destination === 'document' ||
         request.mode === 'navigate' ||
         request.headers.get('accept')?.includes('text/html');
}

function isAsset(request) {
  return ['script', 'style', 'image', 'font'].includes(request.destination);
}

function isAPI(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
      return;
    }
  } catch {
    return;
  }

  if (isAPI(request)) {
    // API calls: network only
    return;
  }

  if (isHTML(request)) {
    // HTML: network-first
    event.respondWith(networkFirst(request));
  } else if (isAsset(request)) {
    // Assets: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});
