const CACHE_NAME = 'kurginian-premium-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Удаляем старые версии кэша, чтобы не забивать память телефона
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Надежный перехватчик, который удовлетворяет строгим требованиям Google WebAPK
self.addEventListener('fetch', (event) => {
  // Игнорируем запросы к API и методы кроме GET
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      // Если нет интернета, отдаем 200 OK только для HTML-страниц (navigate). 
      // Это убедит Google, что наше PWA работает оффлайн, и он подпишет WebAPK,
      // при этом мы не сломаем не загрузившиеся картинки и иконки.
      if (event.request.mode === 'navigate') {
        return new Response('Mode hors ligne / Offline Mode', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      return Response.error();
    })
  );
});