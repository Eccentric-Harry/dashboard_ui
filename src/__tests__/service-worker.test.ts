/**
 * Service worker behaviour, exercised by loading public/sw.js into a fake
 * ServiceWorkerGlobalScope. These are the paths that are impossible to reason about from
 * the app: what happens on a push, on a click, on a snooze tap, and when the browser
 * rotates a subscription out from under us.
 *
 * The central assertion is negative — nothing in here shows a notification unless a push
 * event delivered one.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SW_SOURCE = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../public/sw.js'),
  'utf8',
);

const API_BASE = 'https://api.example.test/api/v1';

type Listener = (event: Record<string, unknown>) => void;

interface FakeClient {
  url: string;
  focus: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
}

interface FakeScope {
  listeners: Map<string, Listener[]>;
  showNotification: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  openWindow: ReturnType<typeof vi.fn>;
  clientList: FakeClient[];
  fetchMock: ReturnType<typeof vi.fn>;
  dispatch: (type: string, event: Record<string, unknown>) => Promise<void>;
}

/** Builds a scope, evaluates sw.js inside it, and returns the handles the tests poke at. */
function loadServiceWorker(clients: FakeClient[] = []): FakeScope {
  const listeners = new Map<string, Listener[]>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const subscribe = vi.fn();
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  const waits: unknown[] = [];

  const self = {
    location: { href: `https://app.example.test/sw.js?api=${encodeURIComponent(API_BASE)}` },
    addEventListener: (type: string, listener: Listener) => {
      const existing = listeners.get(type) ?? [];
      existing.push(listener);
      listeners.set(type, existing);
    },
    skipWaiting: vi.fn(),
    registration: {
      showNotification,
      pushManager: { subscribe },
    },
    clients: {
      claim: vi.fn(),
      matchAll: vi.fn().mockImplementation(async () => clients),
      openWindow,
    },
  };

  const scope = {
    self,
    caches: {
      open: vi.fn().mockResolvedValue({ add: vi.fn().mockResolvedValue(undefined) }),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
      match: vi.fn(),
    },
    fetch: fetchMock,
    console,
    Intl,
    URL,
    Date,
    JSON,
    Promise,
  };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(
    'self', 'caches', 'fetch', 'console', 'Intl', 'URL', 'Date', 'JSON', 'Promise',
    SW_SOURCE,
  );
  factory(
    scope.self, scope.caches, scope.fetch, scope.console,
    scope.Intl, scope.URL, scope.Date, scope.JSON, scope.Promise,
  );

  return {
    listeners,
    showNotification,
    subscribe,
    openWindow,
    clientList: clients,
    fetchMock,
    dispatch: async (type, event) => {
      const handlers = listeners.get(type) ?? [];
      for (const handler of handlers) {
        handler({
          ...event,
          waitUntil: (promise: unknown) => { waits.push(promise); },
        });
      }
      await Promise.all(waits.splice(0, waits.length));
      // A second flush: waitUntil chains often schedule follow-up work.
      await Promise.all(waits.splice(0, waits.length));
    },
  };
}

const pushEvent = (payload: Record<string, unknown>) => ({
  data: { json: () => payload, text: () => JSON.stringify(payload) },
});

const samplePayload = {
  id: 'user-1|CALENDAR_ITEM|task-1|2026-09-21|START',
  title: 'Standup',
  body: 'Starts now · 11:30',
  url: '/calendar?date=2026-09-21',
  tag: 'user-1|CALENDAR_ITEM|task-1|2026-09-21|START',
  sourceId: 'task-1',
  itemType: 'EVENT',
  actionToken: 'token-abc',
  fireAt: '2026-09-21T06:00:00Z',
};

describe('service worker: push', () => {
  let sw: FakeScope;

  beforeEach(() => {
    sw = loadServiceWorker();
  });

  it('shows a notification only in response to a real push event', async () => {
    // Install and activate are the events a page load triggers. Neither may notify.
    await sw.dispatch('install', {});
    await sw.dispatch('activate', {});
    expect(sw.showNotification).not.toHaveBeenCalled();

    await sw.dispatch('push', pushEvent(samplePayload));
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
  });

  it('renders the payload the backend sent', async () => {
    await sw.dispatch('push', pushEvent(samplePayload));

    const [title, options] = sw.showNotification.mock.calls[0];
    expect(title).toBe('Standup');
    expect(options.body).toBe('Starts now · 11:30');
    expect(options.data.url).toBe('/calendar?date=2026-09-21');
    expect(options.data.actionToken).toBe('token-abc');
  });

  /** A duplicate push must replace the banner, not stack a second one. */
  it('tags the notification with the backend record id and does not renotify', async () => {
    await sw.dispatch('push', pushEvent(samplePayload));

    const options = sw.showNotification.mock.calls[0][1];
    expect(options.tag).toBe(samplePayload.id);
    expect(options.renotify).toBe(false);
  });

  it('is audible — the old handler set silent:true and swallowed every alert sound', async () => {
    await sw.dispatch('push', pushEvent(samplePayload));

    expect(sw.showNotification.mock.calls[0][1].silent).toBeUndefined();
  });

  it('survives a payload that is not JSON', async () => {
    await sw.dispatch('push', {
      data: {
        json: () => { throw new SyntaxError('not json'); },
        text: () => 'plain text alert',
      },
    });

    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(sw.showNotification.mock.calls[0][1].body).toBe('plain text alert');
  });

  it('tells open pages about the push so the in-app list follows the same event', async () => {
    const client: FakeClient = { url: 'https://app.example.test/home', focus: vi.fn(), postMessage: vi.fn() };
    sw = loadServiceWorker([client]);

    await sw.dispatch('push', pushEvent(samplePayload));

    expect(client.postMessage).toHaveBeenCalledWith({
      type: 'PUSH_RECEIVED',
      notification: samplePayload,
    });
  });

  it('broadcasts to every open tab exactly once each', async () => {
    const a: FakeClient = { url: 'https://app.example.test/home', focus: vi.fn(), postMessage: vi.fn() };
    const b: FakeClient = { url: 'https://app.example.test/calendar', focus: vi.fn(), postMessage: vi.fn() };
    sw = loadServiceWorker([a, b]);

    await sw.dispatch('push', pushEvent(samplePayload));

    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(a.postMessage).toHaveBeenCalledTimes(1);
    expect(b.postMessage).toHaveBeenCalledTimes(1);
  });
});

describe('service worker: notification click', () => {
  const notification = (data: Record<string, unknown>) => ({
    close: vi.fn(),
    data,
    title: 'Standup',
  });

  it('focuses an open tab instead of opening another one', async () => {
    const client: FakeClient = { url: 'https://app.example.test/home', focus: vi.fn(), postMessage: vi.fn() };
    const sw = loadServiceWorker([client]);

    await sw.dispatch('notificationclick', {
      action: '',
      notification: notification({ url: '/calendar', id: 'n1' }),
    });

    expect(client.focus).toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
  });

  it('opens a window when nothing is running', async () => {
    const sw = loadServiceWorker([]);

    await sw.dispatch('notificationclick', {
      action: '',
      notification: notification({ url: '/calendar?date=2026-09-21', id: 'n1' }),
    });

    expect(sw.openWindow).toHaveBeenCalledWith('/calendar?date=2026-09-21');
  });

  it('tells the page which notification was clicked so it can navigate and mark it read', async () => {
    const client: FakeClient = { url: 'https://app.example.test/home', focus: vi.fn(), postMessage: vi.fn() };
    const sw = loadServiceWorker([client]);

    await sw.dispatch('notificationclick', {
      action: '',
      notification: notification({ url: '/calendar', id: 'n1' }),
    });

    expect(client.postMessage).toHaveBeenCalledWith({ type: 'NOTIFICATION_CLICK', id: 'n1', url: '/calendar' });
  });

  /**
   * Snooze used to be a setTimeout inside the worker, which never fired — a worker is killed
   * within seconds of going idle. It is now a backend reschedule.
   */
  it('snooze asks the backend to reschedule, using the token from the push payload', async () => {
    const sw = loadServiceWorker([]);

    await sw.dispatch('notificationclick', {
      action: 'snooze',
      notification: notification({ url: '/calendar', id: 'n1', actionToken: 'token-abc' }),
    });

    expect(sw.fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = sw.fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/push/actions/snooze`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ actionToken: 'token-abc', minutes: 10 });
    expect(sw.showNotification).not.toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
  });

  it('a snooze without a token does not blow up', async () => {
    const sw = loadServiceWorker([]);

    await sw.dispatch('notificationclick', {
      action: 'snooze',
      notification: notification({ url: '/calendar', id: 'n1' }),
    });

    expect(sw.fetchMock).not.toHaveBeenCalled();
  });
});

describe('service worker: subscription rotation', () => {
  it('re-registers the replacement endpoint with the backend', async () => {
    const sw = loadServiceWorker([]);
    const newSubscription = {
      options: { applicationServerKey: 'key' },
      toJSON: () => ({ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } }),
    };

    await sw.dispatch('pushsubscriptionchange', {
      oldSubscription: { endpoint: 'https://push.example/old', options: { applicationServerKey: 'key' } },
      newSubscription,
    });

    const [url, init] = sw.fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/push/rotate`);
    expect(JSON.parse(init.body)).toMatchObject({
      oldEndpoint: 'https://push.example/old',
      endpoint: 'https://push.example/new',
      p256dh: 'p',
      auth: 'a',
    });
  });

  it('subscribes again itself when the browser hands over no replacement', async () => {
    const sw = loadServiceWorker([]);
    sw.subscribe.mockResolvedValue({
      toJSON: () => ({ endpoint: 'https://push.example/fresh', keys: { p256dh: 'p', auth: 'a' } }),
    });

    await sw.dispatch('pushsubscriptionchange', {
      oldSubscription: { endpoint: 'https://push.example/old', options: { applicationServerKey: 'key' } },
      newSubscription: null,
    });

    expect(sw.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: 'key' });
    expect(JSON.parse(sw.fetchMock.mock.calls[0][1].body).endpoint).toBe('https://push.example/fresh');
  });

  it('a failed rotation does not throw out of the worker', async () => {
    const sw = loadServiceWorker([]);
    sw.fetchMock.mockRejectedValue(new Error('offline'));

    await expect(sw.dispatch('pushsubscriptionchange', {
      oldSubscription: { endpoint: 'https://push.example/old', options: { applicationServerKey: 'key' } },
      newSubscription: {
        toJSON: () => ({ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } }),
      },
    })).resolves.not.toThrow();
  });
});
