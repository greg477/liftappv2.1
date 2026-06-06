// LIFT — Service Worker
// Caches the app shell for full offline support
const CACHE = 'lift-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.filter(u => !u.startsWith('http') || navigator.onLine)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for app shell, network-first for everything else
  if (e.request.mode === 'navigate' || e.request.url.includes('index.html')) {
    e.respondWith(
      caches.match(e.request)
        .then(r => r || fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        }))
    );
  } else if (e.request.url.includes('chart.umd.min.js')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
