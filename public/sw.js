// frontend/public/sw.js

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

// ВАЖНО: Chrome требует наличие события 'fetch', 
// чтобы признать PWA полноценным и сгенерировать чистую иконку (WebAPK).
// Мы делаем пустой перехватчик, который ничего не ломает и отдает стандартный сетевой запрос.
self.addEventListener('fetch', (event) => {
  return; 
});