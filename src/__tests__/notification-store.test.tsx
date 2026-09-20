/**
 * The store's side of the contract: it reacts to push events and reads server state, and it
 * never decides on its own that something is due.
 *
 * The headline regression test is the first one — bootstrapping the store (which is what
 * opening or reloading the app does) must not produce a notification, however many calendar
 * items are already due today.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerNotification } from '@/types/notifications';

const notificationServiceMock = {
  list: vi.fn(),
  acknowledge: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
  dismissAll: vi.fn(),
};

const pushServiceMock = {
  getVapidPublicKey: vi.fn(),
  subscribeDevice: vi.fn(),
  unsubscribeDevice: vi.fn(),
  getStatus: vi.fn(),
};

const calendarServiceMock = { getItemsForRange: vi.fn() };
const toastMock = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });

vi.mock('@/services/notification-service', () => ({ notificationService: notificationServiceMock }));
vi.mock('../services/notification-service', () => ({ notificationService: notificationServiceMock }));
vi.mock('../services/push-service', () => ({ pushService: pushServiceMock }));
vi.mock('../services/calendar-service', () => ({ calendarService: calendarServiceMock }));
vi.mock('../services/nutrition-service', () => ({ nutritionService: { getFoodEntries: vi.fn() } }));
vi.mock('../services/meal-analysis-service', () => ({ mealAnalysisService: { analyze: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: toastMock, toast: toastMock }));

const ok = <T,>(data: T) => ({ data, meta: undefined, status: 'OK', httpStatus: 200, error: undefined });

/** An item that started an hour ago — the exact shape that used to replay on every load. */
const overdueItem = () => {
  const now = new Date();
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id: 'task-1',
    title: 'Standup',
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    startTime: `${pad(past.getHours())}:${pad(past.getMinutes())}`,
    allDay: false,
    itemType: 'EVENT' as const,
    completed: false,
  };
};

const serverNotification = (overrides: Partial<ServerNotification> = {}): ServerNotification => ({
  id: 'user-1|CALENDAR_ITEM|task-1|2026-09-21|START',
  title: 'Standup',
  body: 'Starts now · 11:30',
  url: '/calendar',
  sourceId: 'task-1',
  itemType: 'EVENT',
  fireAt: '2026-09-21T06:00:00Z',
  sentAt: '2026-09-21T06:00:01Z',
  status: 'SENT',
  ...overrides,
});

/** Loads a pristine copy of the store (its bootstrap guard is module-level). */
async function loadStore() {
  vi.resetModules();
  return import('@/store/notification-store');
}

function installServiceWorkerStub() {
  const listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  const registration = {
    scope: '/',
    showNotification: vi.fn().mockResolvedValue(undefined),
    pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn() },
  };
  const serviceWorker = {
    register: vi.fn().mockResolvedValue(registration),
    ready: Promise.resolve(registration),
    addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
      (listeners[type] ??= []).push(listener);
    },
  };
  Object.defineProperty(window.navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
  Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
  return {
    registration,
    serviceWorker,
    emit: (data: unknown) => (listeners.message ?? []).forEach((l) => l({ data } as MessageEvent)),
  };
}

describe('notification store', () => {
  let sw: ReturnType<typeof installServiceWorkerStub>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('authToken', 'token-123');
    sw = installServiceWorkerStub();
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(vi.fn(), { permission: 'granted', requestPermission: vi.fn() }),
      configurable: true,
    });
    notificationServiceMock.list.mockResolvedValue(ok<ServerNotification[]>([]));
    notificationServiceMock.acknowledge.mockResolvedValue(ok(null));
    notificationServiceMock.markRead.mockResolvedValue(ok(null));
    notificationServiceMock.markAllRead.mockResolvedValue(ok({ updated: 0 }));
    notificationServiceMock.dismiss.mockResolvedValue(ok(null));
    notificationServiceMock.dismissAll.mockResolvedValue(ok({ dismissed: 0 }));
    pushServiceMock.unsubscribeDevice.mockResolvedValue(ok(null));
    pushServiceMock.subscribeDevice.mockResolvedValue(ok(null));
    calendarServiceMock.getItemsForRange.mockResolvedValue(ok([overdueItem()]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** The reported bug, at its source. */
  it('bootstrapping does not produce a notification, even with an item already overdue today', async () => {
    const { notificationActions, useNotificationStore } = await loadStore();

    notificationActions.bootstrap();
    await vi.waitFor(() => expect(calendarServiceMock.getItemsForRange).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));

    const state = useNotificationStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.notifications).toHaveLength(0);
    expect(sw.registration.showNotification).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('loading the feed shows history without re-announcing any of it', async () => {
    notificationServiceMock.list.mockResolvedValue(ok([serverNotification()]));
    const { notificationActions, useNotificationStore } = await loadStore();

    notificationActions.bootstrap();
    await vi.waitFor(() => expect(useNotificationStore.getState().notifications).toHaveLength(1));

    expect(sw.registration.showNotification).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(notificationServiceMock.acknowledge).not.toHaveBeenCalled();
  });

  it('read state comes from the server, not from a local flag', async () => {
    notificationServiceMock.list.mockResolvedValue(ok([
      serverNotification({ id: 'read', readAt: '2026-09-21T07:00:00Z' }),
      serverNotification({ id: 'unread' }),
    ]));
    const { notificationActions, useNotificationStore } = await loadStore();

    notificationActions.bootstrap();
    await vi.waitFor(() => expect(useNotificationStore.getState().notifications).toHaveLength(2));

    const byId = Object.fromEntries(useNotificationStore.getState().notifications.map((n) => [n.id, n]));
    expect(byId.read.isRead).toBe(true);
    expect(byId.unread.isRead).toBe(false);
  });

  it('a push event adds the notification and acknowledges delivery', async () => {
    const { notificationActions, useNotificationStore } = await loadStore();
    notificationActions.bootstrap();
    await vi.waitFor(() => expect(sw.serviceWorker.register).toHaveBeenCalled());

    sw.emit({ type: 'PUSH_RECEIVED', notification: { ...serverNotification(), body: 'Starts now' } });

    const notifications = useNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('Standup');
    await vi.waitFor(() => expect(notificationServiceMock.acknowledge).toHaveBeenCalledWith(serverNotification().id));
  });

  /** Two tabs both receive the broadcast; the same record must not appear twice in one list. */
  it('the same push arriving twice is added once', async () => {
    const { notificationActions, useNotificationStore } = await loadStore();
    notificationActions.bootstrap();
    await vi.waitFor(() => expect(sw.serviceWorker.register).toHaveBeenCalled());

    const payload = { type: 'PUSH_RECEIVED', notification: serverNotification() };
    sw.emit(payload);
    sw.emit(payload);

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(notificationServiceMock.acknowledge).toHaveBeenCalledTimes(1);
  });

  it('a reload after a push does not re-announce it — the feed just contains it', async () => {
    notificationServiceMock.list.mockResolvedValue(ok([serverNotification()]));
    const first = await loadStore();
    first.notificationActions.bootstrap();
    await vi.waitFor(() => expect(first.useNotificationStore.getState().notifications).toHaveLength(1));

    // "Reload": a brand-new module instance, as a page load would give.
    vi.clearAllMocks();
    notificationServiceMock.list.mockResolvedValue(ok([serverNotification()]));
    const second = await loadStore();
    second.notificationActions.bootstrap();
    await vi.waitFor(() => expect(second.useNotificationStore.getState().notifications).toHaveLength(1));

    expect(toastMock).not.toHaveBeenCalled();
    expect(notificationServiceMock.acknowledge).not.toHaveBeenCalled();
  });

  it('marking read updates optimistically and tells the server', async () => {
    notificationServiceMock.list.mockResolvedValue(ok([serverNotification({ id: 'n1' })]));
    const { notificationActions, useNotificationStore } = await loadStore();
    notificationActions.bootstrap();
    await vi.waitFor(() => expect(useNotificationStore.getState().notifications).toHaveLength(1));

    notificationActions.markAsRead('n1');

    expect(useNotificationStore.getState().notifications[0].isRead).toBe(true);
    expect(notificationServiceMock.markRead).toHaveBeenCalledWith('n1');
  });

  it('clearing the feed reaches the server so other devices agree', async () => {
    notificationServiceMock.list.mockResolvedValue(ok([serverNotification({ id: 'n1' })]));
    const { notificationActions, useNotificationStore } = await loadStore();
    notificationActions.bootstrap();
    await vi.waitFor(() => expect(useNotificationStore.getState().notifications).toHaveLength(1));

    notificationActions.clearAllNotifications();

    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(notificationServiceMock.dismissAll).toHaveBeenCalled();
  });

  it('drops the old client-scheduler keys so nothing can start trusting them again', async () => {
    localStorage.setItem('dashboard_notified_keys', '["task-1:2026-09-21:11:30"]');
    localStorage.setItem('dashboard_notifications', '[{"id":"stale"}]');
    localStorage.setItem('dashboard_snoozed_items', '{"task-1":123}');
    const { notificationActions } = await loadStore();

    notificationActions.bootstrap();

    expect(localStorage.getItem('dashboard_notified_keys')).toBeNull();
    expect(localStorage.getItem('dashboard_notifications')).toBeNull();
    expect(localStorage.getItem('dashboard_snoozed_items')).toBeNull();
  });

  describe('permission and subscription handling', () => {
    it('never prompts on boot', async () => {
      (window.Notification as unknown as { permission: string }).permission = 'default';
      const { notificationActions } = await loadStore();

      notificationActions.bootstrap();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('reports alerts as off when the browser holds no subscription', async () => {
      const { notificationActions, useNotificationStore } = await loadStore();

      notificationActions.bootstrap();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(useNotificationStore.getState().desktopEnabled).toBe(false);
      expect(pushServiceMock.subscribeDevice).not.toHaveBeenCalled();
    });

    it('re-registers a live subscription on boot instead of creating a second one', async () => {
      sw.registration.pushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://push.example/aaa',
        toJSON: () => ({ endpoint: 'https://push.example/aaa', keys: { p256dh: 'p', auth: 'a' } }),
        unsubscribe: vi.fn(),
      });
      const { notificationActions, useNotificationStore } = await loadStore();

      notificationActions.bootstrap();
      await vi.waitFor(() => expect(pushServiceMock.subscribeDevice).toHaveBeenCalledTimes(1));

      expect(useNotificationStore.getState().desktopEnabled).toBe(true);
      expect(sw.registration.pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('cleans up a subscription left behind after permission was revoked', async () => {
      (window.Notification as unknown as { permission: string }).permission = 'denied';
      const unsubscribe = vi.fn().mockResolvedValue(true);
      sw.registration.pushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://push.example/aaa',
        toJSON: () => ({ endpoint: 'https://push.example/aaa', keys: { p256dh: 'p', auth: 'a' } }),
        unsubscribe,
      });
      const { notificationActions, useNotificationStore } = await loadStore();

      notificationActions.bootstrap();
      await vi.waitFor(() => expect(pushServiceMock.unsubscribeDevice).toHaveBeenCalled());

      expect(unsubscribe).toHaveBeenCalled();
      expect(useNotificationStore.getState().desktopEnabled).toBe(false);
    });

    it('does not re-prompt once notifications are blocked', async () => {
      (window.Notification as unknown as { permission: string }).permission = 'denied';
      const { notificationActions } = await loadStore();
      notificationActions.bootstrap();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const enabled = await notificationActions.toggleDesktopNotifications();

      expect(enabled).toBe(false);
      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
      expect(toastMock.error).toHaveBeenCalled();
    });

    it('reuses an existing subscription when alerts are switched back on', async () => {
      sw.registration.pushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://push.example/aaa',
        toJSON: () => ({ endpoint: 'https://push.example/aaa', keys: { p256dh: 'p', auth: 'a' } }),
        unsubscribe: vi.fn(),
      });
      const { notificationActions, useNotificationStore } = await loadStore();
      notificationActions.bootstrap();
      await vi.waitFor(() => expect(useNotificationStore.getState().desktopEnabled).toBe(true));

      // off...
      await notificationActions.toggleDesktopNotifications();
      expect(pushServiceMock.unsubscribeDevice).toHaveBeenCalledTimes(1);

      // ...and on again
      vi.clearAllMocks();
      await notificationActions.toggleDesktopNotifications();

      expect(sw.registration.pushManager.subscribe).not.toHaveBeenCalled();
      expect(pushServiceMock.subscribeDevice).toHaveBeenCalledTimes(1);
      expect(pushServiceMock.getVapidPublicKey).not.toHaveBeenCalled();
    });

    it('guest mode cannot switch alerts on', async () => {
      localStorage.setItem('isGuest', 'true');
      const { notificationActions } = await loadStore();

      const enabled = await notificationActions.toggleDesktopNotifications();

      expect(enabled).toBe(false);
      expect(pushServiceMock.subscribeDevice).not.toHaveBeenCalled();
    });

    it('logging out unregisters this device on both sides', async () => {
      const unsubscribe = vi.fn().mockResolvedValue(true);
      sw.registration.pushManager.getSubscription.mockResolvedValue({
        endpoint: 'https://push.example/aaa',
        toJSON: () => ({ endpoint: 'https://push.example/aaa', keys: { p256dh: 'p', auth: 'a' } }),
        unsubscribe,
      });
      const { notificationActions } = await loadStore();

      await notificationActions.unregisterDevice();

      expect(pushServiceMock.unsubscribeDevice).toHaveBeenCalledWith('https://push.example/aaa');
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
