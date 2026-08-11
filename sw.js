const CACHE_NAME = 'sidini-tensi-v6';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/expertSystem.js',
  './assets/LogoKKN.png',
  './assets/LogoAgam.png',
  './assets/LogoNagariKotoTangah.png',
  './assets/LogoPuskesmas.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://unpkg.com/aos@next/dist/aos.css',
  'https://unpkg.com/aos@next/dist/aos.js'
];

// Instalasi Service Worker
self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru untuk langsung aktif (bypass waiting state)
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Resource
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Aktivasi & Pembersihan Cache Lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Memaksa SW baru mengambil alih semua tab yang terbuka
    })
  );
});
