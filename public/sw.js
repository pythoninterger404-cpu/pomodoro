// Focus Popup Service Worker — v3 (network-first, auto-update)
const CACHE = 'focus-popup-v3';

// Immediately take control when a new version is detected
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Clean old caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first for navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    // Try network first for HTML navigation
    if (event.request.mode === 'navigate') {
      try {
        const netResp = await fetch(event.request);
        if (netResp.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, netResp.clone());
        }
        return netResp;
      } catch {
        const cached = await caches.match(event.request);
        return cached || new Response('Offline — coba lagi saat tersambung internet.', { status: 503 });
      }
    }

    // For assets: cache first, network fallback
    const cached = await caches.match(event.request);
    const fetchPromise = fetch(event.request).then(async (netResp) => {
      if (netResp.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, netResp.clone());
      }
      return netResp;
    }).catch(() => null);

    return cached || fetchPromise.then(r => r || new Response('', { status: 504 }));
  })());
});

// Listen for update message from the page
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
