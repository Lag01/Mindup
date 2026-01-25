// Service Worker pour Mindup PWA
const CACHE_NAME = 'mindup-v1';
const OFFLINE_URL = '/';

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        OFFLINE_URL,
        '/manifest.json',
        '/favicon.ico',
        '/favicon.png',
        '/logo-full.png',
        '/logo-icon.png',
        '/icon-192.png',
        '/icon-512.png',
        '/apple-touch-icon.png',
        '/icon-maskable.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Gestion des requêtes
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse
        const responseToCache = response.clone();

        // Mettre en cache si c'est une réponse valide
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Si la requête échoue, essayer de récupérer depuis le cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }

          // Si pas dans le cache, retourner la page offline
          if (event.request.destination === 'document') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// ============================================================================
// Push Notifications
// ============================================================================

// Événement déclenché quand une notification push est reçue
self.addEventListener('push', (event) => {
  let data = {
    title: 'Mindup',
    body: 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'mindup-notification',
    url: '/'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('Error parsing push notification data:', error);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'mindup-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Événement déclenché quand l'utilisateur clique sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Chercher une fenêtre existante avec l'app
        for (const client of clientList) {
          if (client.url === new URL(urlToOpen, self.location.origin).href && 'focus' in client) {
            return client.focus();
          }
        }

        // Si aucune fenêtre existante, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Événement déclenché quand une notification est fermée (optionnel, pour analytics)
self.addEventListener('notificationclose', (event) => {
  // Possibilité d'ajouter du tracking ici plus tard
  console.log('Notification closed:', event.notification.tag);
});
