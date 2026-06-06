const CACHE_NAME = 'auracalc-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - caching assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests (ignores chrome-extension:// etc)
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.startsWith('https://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If a cached response exists, return it immediately
      // and fetch a fresh version in the background to update the cache.
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('[Service Worker] Background fetch failed (offline):', err);
      });

      return cachedResponse || fetchPromise;
    })
  );
});
