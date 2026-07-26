const CACHE_NAME = 'kasku-cache-v2'; // Update cache version
const urlsToCache = [
  './', // Cache the root path (index.html)
  './index.html',
  './manifest.json',
  './app.js',
  './style.css', // Asumsi ada file style.css
  // Tambahkan aset lokal lainnya seperti gambar, font, dll. jika ada
  // Contoh:
  // './icons/icon-72x72.png',
  // './icons/icon-96x96.png',
  // ... (semua ikon yang didefinisikan di manifest.json)
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        // Cache semua aset lokal
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache during install:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // No cache hit - fetch from network and cache it for future use
        return fetch(event.request).then(networkResponse => {
          // Hanya cache respons yang valid (status 200, bukan opaque response)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch failed:', error);
          // Anda bisa mengembalikan halaman offline kustom di sini jika diinginkan
          // return caches.match('/offline.html');
        });
      })
  );
});
