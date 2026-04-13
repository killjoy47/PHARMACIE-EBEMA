const CACHE_NAME = 'pharma-gest-v1';
const ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
