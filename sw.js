/**
 * Service Worker — HMO Equipment PWA
 * Chiến lược: Cache-first cho tĩnh (app shell), Network-first cho API (borrow status)
 */

const CACHE_NAME = 'hmo-equipment-v8';
const SHELL_ASSETS = [
  '/HMO-equipment/',
  '/HMO-equipment/index.html',
  '/HMO-equipment/manifest.json',
  '/HMO-equipment/icons/icon-192.png',
  '/HMO-equipment/icons/icon-512.png'
];

// ===== Install: cache app shell =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ===== Activate: xóa cache cũ =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== Fetch: routing strategy =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first cho Google Apps Script API (cần real-time)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(
          JSON.stringify({ error: 'offline', available: null, borrowedCount: 0 }),
          { headers: { 'Content-Type': 'application/json' } }
        ))
    );
    return;
  }

  // Cache-first cho app shell (HTML, icons, manifest)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Chỉ cache request GET thành công từ origin của app
        // (cache.put với method khác GET sẽ throw lỗi)
        if (event.request.method === 'GET' &&
            response.ok &&
            url.hostname === self.location.hostname) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('/HMO-equipment/index.html'))
  );
});
