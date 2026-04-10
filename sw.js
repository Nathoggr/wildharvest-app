const CACHE = 'wildharvest-v4';
const ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Lato:wght@300;400;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== 'map-tiles').map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Map tiles: cache first (offline maps)
  if (e.request.url.includes('tile.openstreetmap.org')) {
    e.respondWith(caches.open('map-tiles').then(c =>
      c.match(e.request).then(r => r || fetch(e.request).then(res => {
        c.put(e.request, res.clone());
        return res;
      }))
    ));
    return;
  }

  // HTML: network first, cache fallback for offline
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
