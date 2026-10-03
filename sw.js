const CACHE_NAME = 'spiewnik-v2026-10-03';

// Instalacja i natychmiastowe przejęcie kontroli (skipWaiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Aktywacja i czyszczenie starych wersji cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Usuwanie starego cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategia Network First dla aplikacji, pomijanie cache dla Google Drive API
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Zapytania do Google Drive API / pobieranie multimediów zawsze idą z sieci (nigdy nie są cache'owane przez SW)
  if (url.includes('googleapis.com') || url.includes('googleusercontent.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jeśli pobrano nową wersję pliku z serwera, zapisz ją do cache
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // W razie braku połączenia z siecią zwracamy z cache
        return caches.match(event.request);
      })
  );
});
