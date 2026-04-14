const CACHE_NAME = 'pharma-gest-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Installation : on met tout en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activation : on supprime les vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requêtes API : network-first, fallback sur réponse offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Si succès, on clone la réponse dans le cache
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          // Pas de réseau : on retourne la version cachée si dispo
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Sinon réponse vide JSON pour ne pas planter le JS
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Autres ressources : cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return res;
    }))
  );
});
