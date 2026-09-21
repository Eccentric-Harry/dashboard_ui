// Notification store.
//
// The client does NOT decide when a scheduled notification fires. The backend plans every
// notification, claims it when its instant arrives, and pushes it; this store only reacts
// to two things: a real `push` event relayed by the service worker, and the server's own
// notification feed. That separation is deliberate — the previous version ran a 10-second
// interval that compared the current time against every calendar item it had fetched and
// fired anything whose start time had passed, deduplicated only by a localStorage key.
// Opening the app on a new device, after clearing site data, or after editing an event
// therefore replayed the whole day at once.
//
// What is still local, and legitimately so: the AI meal-scan progress notices, which are
// client-initiated work with a client-visible result and no server schedule behind them.
//
// Global, app-lifetime side effects (AudioContext, service worker registration, the
// calendar-items poll) are bootstrapped once from App.tsx via notificationActions.bootstrap(),
// guarded by a module-level flag so React StrictMode's dev double-invoke cannot double-register.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import toast from 'react-hot-toast';
import { Bell, Calendar, Clock, Trophy, Info, Moon } from 'lucide-react';
import type { CalendarItem } from '../types/calendar';
import type { MealAnalysisApiResponse } from '../types/nutrition';
import { calendarService } from '../services/calendar-service';
import { pushService } from '../services/push-service';
import { notificationService } from '../services/notification-service';
import { hasSession, isGuestSession } from '../services/http/session';
import { CONFIG } from '../services/api-config';
import type {
  PushNotificationPayload,
  ServerNotification,
  ServiceWorkerMessage,
} from '../types/notifications';
import { nutritionService } from '../services/nutrition-service';
import { mealAnalysisService, type MealAnalysisError } from '../services/meal-analysis-service';
import { createSelectors } from './zustand-utils';
import { getErrorMessage } from '../lib/errors';

export interface InAppNotification {
  id: string;
  itemId: string;
  title: string;
  message: string;
  timestamp: string;
  itemType: 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
  isRead: boolean;
  /**
   * True for notices this client produced itself (AI meal scans). Server-owned records are
   * reconciled from /notifications on every load; local ones would be wiped by that sync,
   * so they are kept apart and never sent read/dismiss calls the backend knows nothing about.
   */
  local?: boolean;
}

/** The slice of a persisted food entry used when a scan is recovered after a lost response. */
export interface RecoveredMealEntry {
  id?: string;
  mealType?: string;
  description?: string;
  calories?: number;
  proteinGrams?: number;
  imageUrl?: string | null;
}

export interface BackgroundScanTask {
  id: string;
  description: string;
  mealType: string;
  date: string;
  status: 'processing' | 'success' | 'failed';
  /** User-facing failure message. */
  error?: string;
  /** HTTP status behind the failure, when the backend returned one. */
  errorCode?: number;
  /** Full analysis on a normal success; only the persisted entry when `recovered`. */
  result?: MealAnalysisApiResponse | RecoveredMealEntry;
  recovered?: boolean;
}

/** Narrows a scan result to the full analysis payload (absent on a recovered scan). */
export const hasFullAnalysis = (
  result: BackgroundScanTask['result'],
): result is MealAnalysisApiResponse => !!result && 'analysis' in result && !!result.analysis;

const getLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const getIconForItemType = (type?: string) => {
  switch (type) {
    case 'TASK':
      return <Clock size={18} className="text-blue-500" />;
    case 'EVENT':
      return <Calendar size={18} className="text-indigo-500" />;
    case 'REMINDER':
      return <Bell size={18} className="text-amber-500" />;
    case 'MILESTONE':
      return <Trophy size={18} className="text-emerald-500" />;
    default:
      return <Info size={18} className="text-gray-500" />;
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request. The parameters could not be processed.',
  404: 'Service endpoint not found.',
  429: 'Too many requests. Rate limit reached, please try again in a minute.',
  500: 'Internal server error while processing your meal.',
  503: 'AI Service temporarily unavailable due to high load. Please retry.',
};

function describeMealAnalysisError(error: MealAnalysisError): string {
  const source = error.source ?? '';
  if (/gemini-error|provider-error/.test(source)) {
    return 'AI nutrition analysis pipeline encountered a service error. Please try again.';
  }
  if (source.includes('validation-error')) {
    return 'Invalid input details provided. Please review and try again.';
  }
  if (source.includes('persistence-error')) {
    return 'Could not save the meal entry. Database error.';
  }
  return (error.httpStatus && HTTP_STATUS_MESSAGES[error.httpStatus]) || error.message;
}

async function snapshotEntryIds(date: string): Promise<Set<string> | null> {
  const res = await nutritionService.getFoodEntries(undefined, date, date);
  if (res.error || !Array.isArray(res.data)) return res.error ? null : new Set();
  const list = res.data as RecoveredMealEntry[];
  return new Set(list.map((e) => e?.id).filter((id): id is string => Boolean(id)));
}

/**
 * After an ambiguous failure (timeout, network), the meal may still have been
 * persisted server-side. Look for an entry that wasn't there before the scan started.
 */
async function findRecoveredEntry(
  date: string,
  mealType: string,
  priorIds: Set<string> | null,
): Promise<RecoveredMealEntry | null> {
  if (!priorIds) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 4000));
    const res = await nutritionService.getFoodEntries(undefined, date, date);
    if (res.error || !Array.isArray(res.data)) continue;
    const list = res.data as RecoveredMealEntry[];
    const fresh = list.filter((e) => e?.id && !priorIds.has(e.id));
    if (fresh.length > 0) {
      return fresh.find((e) => (e.mealType || '').toLowerCase() === mealType.toLowerCase()) || fresh[0];
    }
  }
  return null;
}

interface NotificationState {
  notifications: InAppNotification[];
  /** True only when this browser holds a live push subscription the server knows about. */
  desktopEnabled: boolean;
  /** Mirrors Notification.permission, or 'unsupported' where the API is missing. */
  permission: NotificationPermission | 'unsupported';
  pushSupported: boolean;
  backgroundScans: BackgroundScanTask[];
  items: CalendarItem[];
  isLoadingItems: boolean;
  isLoadingNotifications: boolean;
  isOpen: boolean;
}

interface NotificationActions {
  actions: {
    bootstrap: () => void;
    setIsOpen: (open: boolean) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
    clearAllNotifications: () => void;
    toggleDesktopNotifications: () => Promise<boolean>;
    refetchItems: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
    /** Best-effort teardown before the session is cleared, so this device stops receiving. */
    unregisterDevice: () => Promise<void>;
    /** Pushes a test notification to this account's devices and reports the transport result. */
    sendTestNotification: () => Promise<boolean>;
    playSound: () => void;
    startBackgroundScan: (files: File[], description: string | null, mealType: string, date: string) => Promise<string>;
  };
}

type NotificationStore = NotificationState & NotificationActions;

const PUSH_SUPPORTED =
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

const currentPermission = (): NotificationPermission | 'unsupported' =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

/**
 * Keys written by the old client-side scheduler. They recorded which alerts this browser
 * had already fired — state that only existed because the browser was deciding when to fire.
 * Left behind they are dead weight, so they are cleared once on boot.
 */
const LEGACY_KEYS = ['dashboard_notifications', 'dashboard_notified_keys', 'dashboard_snoozed_items'];

/** Stable per-install id, so a rotated push endpoint is still recognisable as this device. */
const deviceId = (): string => {
  const existing = localStorage.getItem('dashboard_device_id');
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem('dashboard_device_id', generated);
  return generated;
};

/** Server record → the shape the notification centre already renders. */
const toInAppNotification = (record: ServerNotification): InAppNotification => ({
  id: record.id,
  itemId: record.sourceId ?? '',
  title: record.title,
  message: record.body,
  timestamp: record.sentAt ?? record.fireAt,
  itemType: record.itemType ?? 'REMINDER',
  isRead: Boolean(record.readAt),
});

const initialState: NotificationState = {
  notifications: [],
  // Optimistic only until reconcilePushState() has checked the browser and the server; the
  // flag alone has repeatedly outlived the subscription it claimed to describe.
  desktopEnabled: false,
  permission: currentPermission(),
  pushSupported: PUSH_SUPPORTED,
  backgroundScans: [],
  items: [],
  isLoadingItems: false,
  isLoadingNotifications: false,
  isOpen: false,
};

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let bootstrapped = false;

const useNotificationStoreBase = create<NotificationStore>()(
  devtools(
    immer((set, get) => {
      // The server is the store of record for delivered notifications, so the list is not
      // persisted locally any more — a second device, a reinstall, or cleared site data all
      // show the same history because they all read the same feed.
      const updateNotifications = (updater: (prev: InAppNotification[]) => InAppNotification[]) => {
        set((s) => {
          s.notifications = updater(s.notifications);
        });
      };

      const addLocalNotice = (notice: InAppNotification) => {
        updateNotifications((prev) => [{ ...notice, local: true }, ...prev]);
      };

      const playSynthesizedSound = () => {
        try {
          if (!audioCtx) return;
          if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

          const playNote = (frequency: number, startTime: number, duration: number) => {
            const ctx = audioCtx as AudioContext;
            const oscFundamental = ctx.createOscillator();
            const gainFundamental = ctx.createGain();
            const oscStrike = ctx.createOscillator();
            const gainStrike = ctx.createGain();

            oscFundamental.type = 'sine';
            oscFundamental.frequency.setValueAtTime(frequency, startTime);
            oscFundamental.connect(gainFundamental);
            gainFundamental.connect(ctx.destination);

            oscStrike.type = 'sine';
            oscStrike.frequency.setValueAtTime(frequency * 3, startTime);
            oscStrike.connect(gainStrike);
            gainStrike.connect(ctx.destination);

            gainFundamental.gain.setValueAtTime(0, startTime);
            gainFundamental.gain.linearRampToValueAtTime(0.12, startTime + 0.008);
            gainFundamental.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            gainStrike.gain.setValueAtTime(0, startTime);
            gainStrike.gain.linearRampToValueAtTime(0.05, startTime + 0.004);
            gainStrike.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);

            oscFundamental.start(startTime);
            oscFundamental.stop(startTime + duration);
            oscStrike.start(startTime);
            oscStrike.stop(startTime + 0.07);
          };

          const now = audioCtx.currentTime;
          playNote(587.33, now, 0.4);
          playNote(880.0, now + 0.11, 0.4);
          playNote(1174.66, now + 0.22, 0.7);
        } catch (e) {
          console.warn('Audio synthesis failed:', e);
        }
      };

      const playSound = () => playSynthesizedSound();

      /**
       * An OS-level notice for work this client did (an AI meal scan finishing while the user
       * is on another tab). Goes through the service worker registration rather than
       * `new Notification(...)`, which Android Chrome refuses outright with an
       * "Illegal constructor" — that is why these silently never appeared on mobile.
       */
      const showLocalOsNotification = async (title: string, body: string, tag: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, { body, icon: '/logo.png', tag });
            return;
          }
          new Notification(title, { body, icon: '/logo.png' });
        } catch (err) {
          console.warn('[notify] local OS notification failed', err);
        }
      };

      // ── Foreground handling of a push that already fired ────────────────
      // The OS banner was shown by the service worker before this ran. All that is left for
      // the page is the in-app list, a toast, and a sound — presentation, never scheduling.
      const handlePushReceived = (payload: PushNotificationPayload) => {
        if (!payload?.id) return;

        let alreadyKnown = false;
        set((s) => {
          alreadyKnown = s.notifications.some((n) => n.id === payload.id);
          if (alreadyKnown) return;
          s.notifications.unshift({
            id: payload.id,
            itemId: payload.sourceId ?? '',
            title: payload.title,
            message: payload.body,
            timestamp: payload.fireAt ?? new Date().toISOString(),
            itemType: payload.itemType ?? 'REMINDER',
            isRead: false,
          });
        });
        if (alreadyKnown) return;

        // Only make noise for someone who is actually looking at the page; a background tab
        // already got the OS notification and does not need a second one.
        if (!document.hidden) {
          toast(
            <div className="flex flex-col">
              <span className="font-medium text-sm">{payload.title}</span>
              <span className="text-xs opacity-80">{payload.body}</span>
            </div>,
            { icon: getIconForItemType(payload.itemType), duration: 6000 },
          );
          playSound();
        }

        // Close the loop: the server moves SENT → DELIVERED, so a notification that never
        // reached a device is visible as such rather than being assumed delivered.
        void notificationService.acknowledge(payload.id);
      };

      /** Resolves true when the read failed, so the poller can back off. */
      const fetchUpcomingItems = async (): Promise<boolean> => {
        set((s) => { s.isLoadingItems = true; });
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const res = await calendarService.getItemsForRange(getLocalDateStr(today), getLocalDateStr(tomorrow));
        set((s) => {
          if (!res.error && res.data) s.items = res.data;
          s.isLoadingItems = false;
        });
        return Boolean(res.error);
      };

      // ── Upcoming-items poll ──────────────────────────────────────────────
      // A bare `setInterval` over an async read is a pile-up waiting to happen:
      // when the backend is slow, a read that takes longer than the interval is
      // still running when the next tick starts another, and each one carries its
      // own retries. That is how one slow endpoint turns into eight concurrent
      // requests against an instance that is already struggling.
      //
      // So the poll reschedules itself only once the previous read has settled,
      // backs off while the backend is failing, and does nothing at all in a
      // background tab — polling a sleeping instance from a tab nobody is looking
      // at only keeps it warm at the cost of a stream of errors.
      const BASE_POLL_MS = 60_000;
      const MAX_POLL_MS = 8 * 60_000;
      let pollTimer = 0;
      let pollInFlight = false;
      let consecutiveFailures = 0;

      const schedulePoll = () => {
        window.clearTimeout(pollTimer);
        const backoff = BASE_POLL_MS * 2 ** Math.min(consecutiveFailures, 3);
        pollTimer = window.setTimeout(() => void pollUpcomingItems(), Math.min(MAX_POLL_MS, backoff));
      };

      const pollUpcomingItems = async (force = false) => {
        if (pollInFlight) return;
        if (document.hidden && !force) {
          schedulePoll();
          return;
        }
        pollInFlight = true;
        try {
          const failed = await fetchUpcomingItems();
          consecutiveFailures = failed ? consecutiveFailures + 1 : 0;
        } finally {
          pollInFlight = false;
          schedulePoll();
        }
      };

      // ── Server-owned notification feed ──────────────────────────────────
      // A plain read. It can surface a notification the user missed while the app was shut,
      // but it can never *fire* one: the OS banner was the push, and this is only history.
      const loadNotifications = async () => {
        if (!hasSession() || isGuestSession()) return;
        set((s) => { s.isLoadingNotifications = true; });
        const res = await notificationService.list(50);
        set((s) => {
          s.isLoadingNotifications = false;
          if (res.error || !res.data) return;
          const fromServer = res.data.map(toInAppNotification);
          const localOnly = s.notifications.filter((n) => n.local);
          s.notifications = [...localOnly, ...fromServer].sort(
            (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
          );
        });
      };

      // ── Push subscription lifecycle ─────────────────────────────────────

      /** The browser's current subscription for this origin, or null. */
      const currentSubscription = async (): Promise<PushSubscription | null> => {
        if (!PUSH_SUPPORTED) return null;
        try {
          const reg = await navigator.serviceWorker.ready;
          return await reg.pushManager.getSubscription();
        } catch (err) {
          console.warn('[push] could not read the current subscription', err);
          return null;
        }
      };

      const sendRegistration = async (subscription: PushSubscription) => {
        const raw = subscription.toJSON();
        if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
          throw new Error('The browser returned an incomplete push subscription');
        }
        return pushService.subscribeDevice({
          endpoint: raw.endpoint,
          p256dh: raw.keys.p256dh,
          auth: raw.keys.auth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          deviceId: deviceId(),
        });
      };

      /**
       * Makes the toggle tell the truth on boot. Three things can disagree — the browser's
       * permission, the browser's subscription, and the server's record — and previously the
       * UI trusted a localStorage flag that survived all three being revoked.
       *
       * Reconciling never prompts: permission is only ever requested from a user gesture.
       */
      const reconcilePushState = async () => {
        set((s) => { s.permission = currentPermission(); });
        if (!PUSH_SUPPORTED || !hasSession() || isGuestSession()) {
          set((s) => { s.desktopEnabled = false; });
          return;
        }

        const subscription = await currentSubscription();
        if (currentPermission() !== 'granted' || !subscription) {
          // Permission revoked in browser settings, or the subscription was dropped. Either
          // way this device is not receiving anything, so say so.
          set((s) => { s.desktopEnabled = false; });
          if (subscription) {
            // A subscription without permission is dead weight; clean both sides up.
            await pushService.unsubscribeDevice(subscription.endpoint);
            await subscription.unsubscribe().catch(() => {});
          }
          return;
        }

        // A live subscription: re-register it. This is an idempotent upsert keyed on the
        // endpoint, and it keeps the timezone and last-seen stamp current — which matters
        // because the backend resolves fire times in the user's zone.
        const res = await sendRegistration(subscription);
        set((s) => { s.desktopEnabled = !res.error; });
        if (res.error) {
          console.warn('[push] could not re-register this device:', res.error.message);
        }
      };

      /**
       * Tears this device's registration down on both sides. Called when alerts are switched
       * off and, importantly, on logout: the endpoint belongs to the browser, not the account,
       * so leaving it registered would send the previous user's reminders to whoever logs in next.
       */
      const unregisterThisDevice = async () => {
        const subscription = await currentSubscription();
        if (subscription) {
          if (hasSession() && !isGuestSession()) {
            await pushService.unsubscribeDevice(subscription.endpoint);
          }
          await subscription.unsubscribe().catch(() => {});
        }
        set((s) => { s.desktopEnabled = false; });
      };

      const markSuccess = (taskId: string, data: MealAnalysisApiResponse | RecoveredMealEntry, recovered: boolean) => {
        set((s) => {
          const t = s.backgroundScans.find((x) => x.id === taskId);
          if (t) { t.status = 'success'; t.result = data; t.recovered = recovered; }
        });
        playSound();

        const kcal = data.calories ?? 0;
        const protein = data.proteinGrams ?? 0;
        const desc = data.description || 'AI meal';
        addLocalNotice({
          id: `ai-meal-success-${Date.now()}`,
          itemId: ('mealEntryId' in data ? data.mealEntryId : data.id) ?? '',
          title: 'AI Meal Logged!',
          message: `Added: ${desc} (${kcal} kcal, ${protein}g Protein)`,
          timestamp: new Date().toISOString(),
          itemType: 'MILESTONE',
          isRead: false,
        });

        void showLocalOsNotification('AI Meal Logged!', `Added: ${desc} (${kcal} kcal)`, `meal-scan-${taskId}`);

        toast.success(
          recovered
            ? 'Your meal was logged — open your food log to see the full analysis.'
            : 'AI Meal Analysis complete and logged!',
        );
        window.dispatchEvent(new Event('dashboard-updated'));
      };

      const markFailure = (taskId: string, description: string | null, error: MealAnalysisError) => {
        const parsedError = describeMealAnalysisError(error);
        set((s) => {
          const t = s.backgroundScans.find((x) => x.id === taskId);
          if (t) { t.status = 'failed'; t.error = parsedError; t.errorCode = error.httpStatus; }
        });
        playSound();

        addLocalNotice({
          id: `ai-meal-failed-${Date.now()}`,
          itemId: '',
          title: 'AI Meal Scan Failed',
          message: `Failed to analyze "${description || 'AI meal scan'}": ${parsedError}`,
          timestamp: new Date().toISOString(),
          itemType: 'REMINDER',
          isRead: false,
        });

        void showLocalOsNotification('AI Meal Scan Failed', `Failed: ${parsedError}`, `meal-scan-${taskId}`);
        toast.error(`AI Meal analysis failed: ${parsedError}`);
      };

      return {
        ...initialState,
        actions: {
          bootstrap: () => {
            if (bootstrapped) return;
            bootstrapped = true;

            // AudioContext (created once; unlocked on first user gesture)
            try {
              const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              if (AudioContextClass) audioCtx = new AudioContextClass();
            } catch (e) {
              console.warn('Failed to create persistent AudioContext:', e);
            }

            const unlockAudio = () => {
              if (audioUnlocked) return;
              audioUnlocked = true;
              if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume()
                  .then(() => {
                    if (!audioCtx) return;
                    const buffer = audioCtx.createBuffer(1, 1, 22050);
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioCtx.destination);
                    source.start(0);
                  })
                  .catch((err) => console.warn('AudioContext resume failed:', err));
              }
              document.removeEventListener('click', unlockAudio);
              document.removeEventListener('touchstart', unlockAudio);
            };
            document.addEventListener('click', unlockAudio);
            document.addEventListener('touchstart', unlockAudio, { passive: true });

            // Old client-scheduler bookkeeping. Nothing reads it any more, and leaving it
            // behind only invites a future regression that trusts it again.
            LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

            // ── Service worker ─────────────────────────────────────────────
            // One registration for one scope. The API base rides on the script URL because a
            // worker can read neither import.meta.env nor localStorage, and it needs the base
            // to answer a snooze tap or re-register a rotated subscription with the app closed.
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker
                .register(`/sw.js?api=${encodeURIComponent(CONFIG.BACKEND_API_BASE_URL)}`, { scope: '/' })
                .then((reg) => console.info('[push] service worker registered for', reg.scope))
                .catch((err) => console.error('[push] service worker registration failed:', err));

              // Registered exactly once (the bootstrap guard above) — a duplicate listener
              // would show every foreground toast twice.
              navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
                const message = event.data as ServiceWorkerMessage | undefined;
                if (!message || typeof message.type !== 'string') return;

                if (message.type === 'PUSH_RECEIVED') {
                  handlePushReceived(message.notification);
                  return;
                }
                if (message.type === 'NOTIFICATION_SNOOZED') {
                  // The reschedule itself happened server-side; this is just feedback.
                  toast.success('Alert snoozed for 10 minutes', {
                    icon: <Moon size={18} className="text-indigo-400" />,
                  });
                  void loadNotifications();
                  return;
                }
                if (message.type === 'NOTIFICATION_CLICK') {
                  if (message.id) void notificationService.markRead(message.id);
                  if (message.url) {
                    window.history.pushState({}, '', message.url);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                  void loadNotifications();
                }
              });
            }

            // ── Reads ──────────────────────────────────────────────────────
            // The items poll feeds the calendar views; it no longer decides anything about
            // alerts. The notification feed is history, fetched the same way as any other list.
            void pollUpcomingItems(true);
            void loadNotifications();
            void reconcilePushState();

            window.addEventListener('calendar-updated', () => { void pollUpcomingItems(true); });
            document.addEventListener('visibilitychange', () => {
              if (document.hidden) return;
              // Coming back to the tab shows current data immediately rather than waiting out
              // the poll's backoff. Re-reading the feed can add a notification that arrived
              // while the tab was hidden — it is already on screen as an OS banner, so this
              // only catches the list up; it never re-announces anything.
              void pollUpcomingItems(true);
              void loadNotifications();
            });
          },

          setIsOpen: (open) => set((s) => { s.isOpen = open; }),

          // Read/dismiss state lives on the server so it is consistent across devices.
          // Each one updates optimistically and then tells the backend; a local notice
          // (an AI meal scan) has no server record, so it stays purely local.
          markAsRead: (id) => {
            const isLocal = get().notifications.find((n) => n.id === id)?.local;
            updateNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
            if (!isLocal) void notificationService.markRead(id);
          },
          markAllAsRead: () => {
            const hasServerNotifications = get().notifications.some((n) => !n.local);
            updateNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            if (hasServerNotifications) void notificationService.markAllRead();
          },
          clearNotification: (id) => {
            const isLocal = get().notifications.find((n) => n.id === id)?.local;
            updateNotifications((prev) => prev.filter((n) => n.id !== id));
            if (!isLocal) void notificationService.dismiss(id);
          },
          clearAllNotifications: () => {
            const hasServerNotifications = get().notifications.some((n) => !n.local);
            set((s) => { s.notifications = []; });
            if (hasServerNotifications) void notificationService.dismissAll();
          },

          refetchItems: () => pollUpcomingItems(true),
          refreshNotifications: () => loadNotifications(),
          unregisterDevice: () => unregisterThisDevice(),
          playSound,

          /**
           * Proves the delivery path end to end without waiting for a scheduled time. The
           * interesting case is a partial failure: the server reports per-device outcomes, so
           * "Apple rejected it with 403" is distinguishable from "it was delivered and your OS
           * is hiding it" — which are very different problems and look identical from here.
           */
          sendTestNotification: async () => {
            if (!get().desktopEnabled) {
              toast.error('Turn alerts on for this device first.');
              return false;
            }
            const res = await pushService.sendTest();
            if (res.error || !res.data) {
              toast.error(getErrorMessage(res.error, 'Could not send the test notification.'));
              return false;
            }

            const { deviceCount, accepted, outcomes } = res.data;
            if (deviceCount === 0) {
              toast.error('No devices are registered for alerts on this account.');
              return false;
            }
            if (accepted === 0) {
              const reason = outcomes[0];
              console.error('[push] test push rejected by every device', outcomes);
              toast.error(
                `Push rejected by the browser's push service (${reason?.kind ?? 'unknown'}${
                  reason?.statusCode ? ` ${reason.statusCode}` : ''
                }). Check the backend logs.`,
              );
              return false;
            }
            toast.success(
              accepted === deviceCount
                ? `Test sent to ${accepted} device${accepted === 1 ? '' : 's'}. If nothing appears, the browser or OS is suppressing it.`
                : `Test accepted by ${accepted} of ${deviceCount} devices.`,
            );
            return true;
          },

          toggleDesktopNotifications: async () => {
            if (!PUSH_SUPPORTED) {
              toast.error('This browser does not support Web Push notifications.');
              return false;
            }
            if (isGuestSession()) {
              toast.error('Alerts need an account — guest mode has no device to deliver to.');
              return false;
            }

            try {
              if (get().desktopEnabled) {
                await unregisterThisDevice();
                toast.success('Alerts turned off for this device.');
                return false;
              }

              // Asking again after a hard denial does nothing: the browser resolves it
              // instantly with 'denied' and some browsers count the attempt against the
              // origin. Tell the user where the switch actually is instead.
              if (currentPermission() === 'denied') {
                set((s) => { s.permission = 'denied'; });
                toast.error('Notifications are blocked for this site. Re-enable them in your browser settings.');
                return false;
              }

              // Only ask when we do not already have an answer. Re-prompting an origin that
              // already granted permission is pointless, and requirement-wise the user should
              // never see a permission dialog they have already dealt with.
              if (currentPermission() !== 'granted') {
                // Requested from the click that got us here — the only time it is allowed.
                const permission = await Notification.requestPermission();
                set((s) => { s.permission = permission; });
                if (permission !== 'granted') {
                  toast.error('Permission denied for system notifications.');
                  return false;
                }
              }

              const reg = await navigator.serviceWorker.ready;
              // Reuse whatever the browser already has. Subscribing again over a live
              // subscription is how duplicate registrations appear.
              const existing = await reg.pushManager.getSubscription();
              let subscription = existing;
              if (!subscription) {
                const vapidRes = await pushService.getVapidPublicKey();
                if (vapidRes.error || !vapidRes.data) {
                  throw new Error(vapidRes.error?.message ?? 'Failed to fetch the VAPID key');
                }
                subscription = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(vapidRes.data) as BufferSource,
                });
              }

              const subRes = await sendRegistration(subscription);
              if (subRes.error) throw new Error(subRes.error.message);

              set((s) => { s.desktopEnabled = true; });
              toast.success('Alerts are on for this device.');
              return true;
            } catch (err) {
              console.error('[push] registration failed:', err);
              set((s) => { s.desktopEnabled = false; });
              toast.error(getErrorMessage(err, 'Could not turn on alerts for this device.'));
              return false;
            }
          },

          startBackgroundScan: async (files, description, mealType, date) => {
            const taskId = `scan-${Date.now()}`;
            set((s) => {
              s.backgroundScans.unshift({
                id: taskId,
                description: description || 'AI meal scan',
                mealType,
                date,
                status: 'processing',
              });
            });

            // Snapshot before the upload so a meal persisted by an "failed" scan can be told apart.
            const priorIdsPromise = snapshotEntryIds(date);

            // Runs in the background; the caller tracks progress through backgroundScans.
            void (async () => {
              const outcome = await mealAnalysisService.analyze({ files, description, mealType, date });
              if (outcome.data) {
                markSuccess(taskId, outcome.data, false);
                return;
              }

              if (!outcome.error.isDefinite) {
                try {
                  const recovered = await findRecoveredEntry(date, mealType, await priorIdsPromise);
                  if (recovered) {
                    markSuccess(taskId, recovered, true);
                    return;
                  }
                } catch (reconErr) {
                  console.warn('Meal persistence reconciliation failed:', reconErr);
                }
              }
              markFailure(taskId, description, outcome.error);
            })();

            return taskId;
          },
        },
      };
    }),
    { name: 'NotificationStore' },
  ),
);

export const useNotificationStore = createSelectors(useNotificationStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const notificationActions = useNotificationStoreBase.getState().actions;

/**
 * Compatibility hook mirroring the old NotificationContext value shape, backed
 * by atomic store selectors. Lets existing consumers migrate with a one-line
 * import swap; new code can use useNotificationStore.use.x() directly.
 */
export function useNotifications() {
  const notifications = useNotificationStore.use.notifications();
  const desktopEnabled = useNotificationStore.use.desktopEnabled();
  const backgroundScans = useNotificationStore.use.backgroundScans();
  const items = useNotificationStore.use.items();
  const isLoadingItems = useNotificationStore.use.isLoadingItems();
  const isOpen = useNotificationStore.use.isOpen();
  const actions = useNotificationStore.use.actions();

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
    isOpen,
    desktopEnabled,
    items,
    isLoadingItems,
    backgroundScans,
    ...actions,
  };
}
