const CACHE_NAME = 'stuff-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/reader.html',
  '/assets/css/styles.css',
  '/assets/js/app.js',
  '/assets/js/reader.js',
  '/assets/data/magazines.json'
];

// Initialize and install the app shell cache channels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Serve assets directly from the cache for instant app-like loading speeds
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});