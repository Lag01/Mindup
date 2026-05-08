// Service Worker pour Mindup PWA
// Stratégie : network-only pour les API et la navigation,
// précache uniquement des assets statiques pour l'installation PWA.
// Bumper CACHE_NAME à chaque modification structurelle de ce fichier
// pour forcer l'invalidation des anciens caches au prochain chargement.
const CACHE_NAME = 'mindup-v2';
const OFFLINE_URL = '/';

const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/logo-full.png',
  '/logo-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icon-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Routes API : toujours réseau, jamais de cache (sinon stats / révisions deviennent stale)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation HTML : network-first avec fallback offline minimal
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Bundles Next.js (hash dans l'URL) et autres assets : laisser le cache HTTP du browser gérer
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // Assets précachés : cache-first, fallback réseau
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
