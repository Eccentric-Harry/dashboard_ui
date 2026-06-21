const CACHE_NAME = 'pwa-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add('/index.html');
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept navigation requests and serve the SPA shell.
// This ensures the app loads correctly on all routes when running as a
// standalone PWA on iOS, even after a cold launch or page refresh.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
  }
});

// Listen for push events from browser push service
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Personal Dashboard Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'Personal Dashboard Alert';
  const options = {
    body: data.body || 'You have an upcoming event.',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.tag || 'dashboard-notification',
    data: { url: data.url || '/', itemId: data.itemId || null },
    vibrate: [100, 50, 100],
    sound: '/iphone-notification.mp3',
    requireInteraction: true,
    actions: [
      { action: 'snooze', title: 'Snooze 10m' },
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'snooze') {
    const itemId = event.notification.data?.itemId;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        if (windowClients.length > 0) {
          windowClients.forEach(client => {
            client.postMessage({ type: 'SNOOZE_NOTIFICATION', itemId });
          });
        } else {
          // Best effort snooze if app is closed.
          setTimeout(() => {
            const title = event.notification.title;
            const options = {
              body: event.notification.body,
              icon: event.notification.icon,
              badge: event.notification.badge,
              tag: event.notification.tag,
              data: event.notification.data,
              requireInteraction: true,
              actions: event.notification.actions
            };
            self.registration.showNotification(title, options);
          }, 10 * 60 * 1000);
        }
      })
    );
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
