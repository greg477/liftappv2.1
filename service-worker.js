// LIFT — Service Worker
// NETWORK-FIRST for the app shell so users always get the latest deployed version
// when online, with offline fallback to the last-known-good cached copy.
const VERSION = 'lift-v10';           // bump this string on every deploy to force cache refresh
const CACHE = VERSION;
const ASSETS = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.filter(u => !u.startsWith('http') || navigator.onLine)))
      .then(() => self.skipWaiting())   // activate new SW immediately
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // Delete ALL old caches that aren't the current version
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  // Allow the page to tell a waiting SW to activate now
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const isAppShell = req.mode === 'navigate' ||
                     req.url.includes('index.html') ||
                     req.url.endsWith('/');

  if (isAppShell) {
    // NETWORK-FIRST: try the network, fall back to cache only if offline.
    e.respondWith(
      fetch(req)
        .then(resp => {
          // Cache the fresh copy for offline use
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
  } else if (req.url.includes('chart.umd.min.js')) {
    // Cache-first for the static Chart.js dependency (it's versioned in the URL)
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return resp;
      }))
    );
  }
  // Everything else: let the browser handle it normally
});
