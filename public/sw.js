/*
 * Service worker: PWA shell + Web Push.
 *
 * The one rule that matters here: a notification is shown when — and only when — a real
 * `push` event arrives from the push service. The worker has no timers, no polling and no
 * idea what is on the user's calendar. Everything it displays was decided by the backend
 * and delivered over the wire, which is why launching the app, reloading it, or opening a
 * second tab cannot make an alert appear.
 *
 * The API base is passed on the registration URL (`/sw.js?api=...`) because a worker has
 * no access to the app's environment or its localStorage.
 */

const CACHE_NAME = 'pwa-shell-v2';
const API_BASE = new URL(self.location.href).searchParams.get('api') || '';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/index.html')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// Navigation requests fall back to the cached shell so a cold PWA launch works offline.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  }
});

// ── Push ────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = { title: 'Personal Dashboard', body: event.data.text() };
    }
  }

  const title = data.title || 'Personal Dashboard';
  const payloadData = {
    url: data.url || '/',
    id: data.id || null,
    sourceId: data.sourceId || null,
    actionToken: data.actionToken || null,
  };

  // Only the essentials. Everything below is added conditionally, because an option a
  // browser dislikes rejects the whole showNotification promise — and a rejected promise
  // here means no banner at all, with nothing on screen to explain why.
  const options = {
    body: data.body || 'You have an upcoming event.',
    icon: '/logo.png',
    badge: '/logo.png',
    // The tag is the backend's notification id. If the same notification ever reaches this
    // device twice — a retry, a second push service attempt — the browser replaces the
    // banner instead of stacking a duplicate. renotify:false keeps that replacement quiet.
    tag: data.tag || data.id || 'dashboard-notification',
    renotify: false,
    data: payloadData,
  };

  // Safari on macOS/iOS supports neither action buttons nor requireInteraction, and reports
  // maxActions as 0. Feature-detect rather than assume Chrome.
  const maxActions = (self.Notification && self.Notification.maxActions) || 0;
  if (maxActions > 0) {
    options.requireInteraction = true;
    options.actions = [
      { action: 'snooze', title: 'Snooze 10m' },
      { action: 'open', title: 'Open' },
    ].slice(0, maxActions);
    options.vibrate = [100, 50, 100];
  }

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch((err) => {
        // Last resort: strip everything optional and try again, so a fussy option can never
        // be the reason the user saw nothing.
        console.error('[sw] showNotification failed, retrying with minimal options', err);
        return self.registration.showNotification(title, {
          body: options.body,
          icon: '/logo.png',
          tag: options.tag,
          data: payloadData,
        });
      })
      // Tell any open tab, so the in-app list and toast react to the same event rather
      // than to a second, independent timer.
      .then(() => broadcast({ type: 'PUSH_RECEIVED', notification: data }))
      .catch((err) => console.error('[sw] could not display the push', err))
  );
});

/**
 * The browser can replace a subscription at any time (key rotation, storage eviction).
 * Without this the server keeps a dead endpoint and the device silently stops receiving
 * anything — the classic "it just stopped working after a while" failure.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldSubscription = event.oldSubscription;
  // `options` is absent on some browsers' change events, and reading through it eagerly
  // would throw before waitUntil ever ran — taking the whole handler with it.
  const keyOf = (subscription) => (subscription && subscription.options
    ? subscription.options.applicationServerKey
    : undefined);
  const applicationServerKey = keyOf(event.newSubscription) || keyOf(oldSubscription);

  event.waitUntil(
    (async () => {
      try {
        const subscription =
          event.newSubscription ||
          (await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
        const raw = subscription.toJSON();
        await fetch(`${API_BASE}/push/rotate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: oldSubscription ? oldSubscription.endpoint : null,
            endpoint: raw.endpoint,
            p256dh: raw.keys.p256dh,
            auth: raw.keys.auth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          }),
        });
      } catch (err) {
        // Nothing useful to do from here; the app reconciles on its next launch.
        console.error('[sw] push subscription rotation failed', err);
      }
    })()
  );
});

// ── Notification interaction ────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if (event.action === 'snooze') {
    // Snoozing is a backend reschedule, authorised by the token that arrived inside the
    // encrypted payload. The old implementation used a setTimeout in here, which never
    // fired: a service worker is killed within seconds of going idle.
    event.waitUntil(
      (async () => {
        if (data.actionToken) {
          try {
            await fetch(`${API_BASE}/push/actions/snooze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actionToken: data.actionToken, minutes: 10 }),
            });
          } catch (err) {
            console.error('[sw] snooze request failed', err);
          }
        }
        await broadcast({ type: 'NOTIFICATION_SNOOZED', id: data.id, minutes: 10 });
      })()
    );
    return;
  }

  const urlToOpen = data.url || '/';
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await broadcast({ type: 'NOTIFICATION_CLICK', id: data.id, url: urlToOpen });
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
      return undefined;
    })()
  );
});

async function broadcast(message) {
  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  windowClients.forEach((client) => client.postMessage(message));
}
