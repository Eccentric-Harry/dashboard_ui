// Notification store — replaces NotificationContext. Global, app-lifetime side
// effects (AudioContext, service worker registration, the 60s calendar poll and
// the 10s alert-check poll) are bootstrapped once from App.tsx via
// notificationActions.bootstrap(), guarded by a module-level flag so React
// StrictMode's dev double-invoke can't double-register intervals/listeners.
//
// Interval callbacks read state via the store's own `get()` instead of the
// original's manual ref-mirroring (itemsRef/notifiedKeysRef/...) — Zustand's
// getState() is always current, so the refs were only ever a workaround for
// stale closures over React state, which isn't a concern here.
//
// `useNotifications()` is a compatibility hook: same shape as the old context
// value, backed by atomic store selectors, so the 5 existing consumers don't
// need to change at all. New code can use `useNotificationStore.use.x()` directly.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import toast from 'react-hot-toast';
import { Bell, Calendar, Clock, Trophy, Info, Moon } from 'lucide-react';
import { analyzeMeal } from '../lib/api';
import type { CalendarItem } from '../lib/api';
import { calendarService } from '../services/calendar-service';
import { pushService } from '../services/push-service';
import { nutritionService } from '../services/nutrition-service';
import { createSelectors } from './zustand-utils';

export interface InAppNotification {
  id: string;
  itemId: string;
  title: string;
  message: string;
  timestamp: string;
  itemType: 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
  isRead: boolean;
}

export interface BackgroundScanTask {
  id: string;
  description: string;
  mealType: string;
  date: string;
  status: 'processing' | 'success' | 'failed';
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  recovered?: boolean;
}

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

function parseNotificationError(errorMsg: string): string {
  const match = errorMsg.match(/^(\d{3}):\s*(.*)$/);
  if (match) {
    const code = match[1];
    const jsonStr = match[2];
    try {
      const parsed = JSON.parse(jsonStr);
      const source = parsed?.meta?.source;
      if (source) {
        if (source.includes('gemini-error') || source.includes('provider-error')) {
          return 'AI nutrition analysis pipeline encountered a service error. Please try again.';
        }
        if (source.includes('validation-error')) {
          return 'Invalid input details provided. Please review and try again.';
        }
        if (source.includes('persistence-error')) {
          return 'Could not save the meal entry. Database error.';
        }
      }
    } catch {
      // ignore
    }
    if (code === '500') return 'Internal server error while processing your meal.';
    if (code === '404') return 'Service endpoint not found.';
    if (code === '400') return 'Bad request. The parameters could not be processed.';
    if (code === '503') return 'AI Service temporarily unavailable due to high load. Please retry.';
    if (code === '429') return 'Too many requests. Rate limit reached, please try again in a minute.';
  }
  return errorMsg;
}

function isDefiniteBusinessFailure(errorMsg: string): boolean {
  const match = errorMsg.match(/^(\d{3}):\s*(.*)$/);
  if (!match) return false;
  try {
    const source: string = JSON.parse(match[2])?.meta?.source || '';
    return /validation-error|gemini-error|persistence-error/.test(source);
  } catch {
    return false;
  }
}

type FoodEntryLite = { id?: string; mealType?: string; description?: string; calories?: number; proteinGrams?: number; imageUrl?: string | null };

async function snapshotEntryIds(date: string): Promise<Set<string> | null> {
  const res = await nutritionService.getFoodEntries(undefined, date, date);
  if (res.error || !Array.isArray(res.data)) return res.error ? null : new Set();
  const list = res.data as FoodEntryLite[];
  return new Set(list.map((e) => e?.id).filter((id): id is string => Boolean(id)));
}

async function findRecoveredEntry(
  date: string,
  mealType: string,
  priorIds: Set<string> | null,
): Promise<FoodEntryLite | null> {
  if (!priorIds) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 4000));
    const res = await nutritionService.getFoodEntries(undefined, date, date);
    if (res.error || !Array.isArray(res.data)) continue;
    const list = res.data as FoodEntryLite[];
    const fresh = list.filter((e) => e?.id && !priorIds.has(e.id));
    if (fresh.length > 0) {
      return fresh.find((e) => (e.mealType || '').toLowerCase() === mealType.toLowerCase()) || fresh[0];
    }
  }
  return null;
}

interface NotificationState {
  notifications: InAppNotification[];
  notifiedKeys: string[];
  desktopEnabled: boolean;
  backgroundScans: BackgroundScanTask[];
  snoozedItems: Record<string, number>;
  items: CalendarItem[];
  isLoadingItems: boolean;
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
    playSound: () => void;
    startBackgroundScan: (files: File[], description: string | null, mealType: string, date: string) => Promise<string>;
  };
}

type NotificationStore = NotificationState & NotificationActions;

const readJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
};

const initialState: NotificationState = {
  notifications: readJson('dashboard_notifications', [] as InAppNotification[]),
  notifiedKeys: readJson('dashboard_notified_keys', [] as string[]),
  desktopEnabled: localStorage.getItem('dashboard_desktop_notifications_enabled') === 'true',
  backgroundScans: [],
  snoozedItems: readJson('dashboard_snoozed_items', {} as Record<string, number>),
  items: [],
  isLoadingItems: false,
  isOpen: false,
};

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let bootstrapped = false;

const useNotificationStoreBase = create<NotificationStore>()(
  devtools(
    immer((set, get) => {
      const persistNotifications = (updater: (prev: InAppNotification[]) => InAppNotification[]) => {
        set((s) => {
          s.notifications = updater(s.notifications);
          localStorage.setItem('dashboard_notifications', JSON.stringify(s.notifications));
        });
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

      const triggerAlert = (item: CalendarItem, message: string) => {
        toast(
          <div className="flex flex-col">
            <span className="font-medium text-sm">{item.title}</span>
            <span className="text-xs opacity-80">{message}</span>
          </div>,
          { icon: getIconForItemType(item.itemType), duration: 6000 },
        );

        playSound();

        if (get().desktopEnabled && 'Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(item.title, {
                  body: message,
                  icon: '/logo.png',
                  tag: `dashboard-notification-${item.id}`,
                  requireInteraction: true,
                  actions: [
                    { action: 'snooze', title: 'Snooze 10m' },
                    { action: 'open', title: 'Open' },
                  ],
                  data: { url: '/', itemId: item.id },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
              });
            } else {
              new Notification(item.title, { body: message, icon: '/logo.png' });
            }
          } catch (e) {
            console.error('Desktop notification trigger failed:', e);
          }
        }

        const newNotif: InAppNotification = {
          id: `${item.id || 'notif'}-${Date.now()}`,
          itemId: item.occurrenceId || item.id || '',
          title: item.title,
          message,
          timestamp: new Date().toISOString(),
          itemType: item.itemType || 'TASK',
          isRead: false,
        };
        persistNotifications((prev) => [newNotif, ...prev]);
      };

      const fetchUpcomingItems = async () => {
        set((s) => { s.isLoadingItems = true; });
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        const res = await calendarService.getItemsForRange(getLocalDateStr(today), getLocalDateStr(tomorrow));
        set((s) => {
          if (!res.error && res.data) s.items = res.data;
          s.isLoadingItems = false;
        });
      };

      const checkAlerts = () => {
        const now = new Date();
        const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const todayStr = getLocalDateStr(now);
        const { items: currentItems, notifiedKeys: currentNotified, snoozedItems } = get();

        const newNotifiedKeys = [...currentNotified];
        let updated = false;

        currentItems.forEach((item) => {
          if (!item.id) return;
          const key = `${item.id}:${item.date}:${item.startTime || 'allday'}`;
          if (currentNotified.includes(key)) return;
          if (snoozedItems[item.id] && Date.now() < snoozedItems[item.id]) return;
          if ((item.itemType === 'TASK' || item.itemType === 'REMINDER') && item.completed) return;

          let shouldTrigger = false;
          let alertMessage = '';

          if (item.allDay) {
            if (item.date === todayStr && now.getHours() >= 9) {
              shouldTrigger = true;
              alertMessage = 'Scheduled for today';
            }
          } else if (item.startTime) {
            if (item.date === todayStr && currentHHMM >= item.startTime) {
              shouldTrigger = true;
              alertMessage = 'Starting now';
            }
          }

          if (shouldTrigger) {
            newNotifiedKeys.push(key);
            updated = true;
            triggerAlert(item, alertMessage);
          }
        });

        if (updated) {
          set((s) => { s.notifiedKeys = newNotifiedKeys; });
          localStorage.setItem('dashboard_notified_keys', JSON.stringify(newNotifiedKeys));
        }
      };

      const markSuccess = (taskId: string, data: FoodEntryLite & { mealEntryId?: string }, recovered: boolean) => {
        set((s) => {
          const t = s.backgroundScans.find((x) => x.id === taskId);
          if (t) { t.status = 'success'; t.result = data; t.recovered = recovered; }
        });
        playSound();

        const kcal = data.calories ?? 0;
        const protein = data.proteinGrams ?? 0;
        const desc = data.description || 'AI meal';
        persistNotifications((prev) => [{
          id: `ai-meal-success-${Date.now()}`,
          itemId: data.mealEntryId || data.id || '',
          title: 'AI Meal Logged!',
          message: `Added: ${desc} (${kcal} kcal, ${protein}g Protein)`,
          timestamp: new Date().toISOString(),
          itemType: 'MILESTONE',
          isRead: false,
        }, ...prev]);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('AI Meal Logged!', { body: `Added: ${desc} (${kcal} kcal)`, icon: '/logo.png' });
          } catch (e) {
            console.error('Desktop notification failed:', e);
          }
        }

        toast.success(
          recovered
            ? 'Your meal was logged — open your food log to see the full analysis.'
            : 'AI Meal Analysis complete and logged!',
        );
        window.dispatchEvent(new Event('dashboard-updated'));
      };

      const markFailure = (taskId: string, description: string | null, parsedError: string) => {
        set((s) => {
          const t = s.backgroundScans.find((x) => x.id === taskId);
          if (t) { t.status = 'failed'; t.error = parsedError; }
        });
        playSound();

        persistNotifications((prev) => [{
          id: `ai-meal-failed-${Date.now()}`,
          itemId: '',
          title: 'AI Meal Scan Failed',
          message: `Failed to analyze "${description || 'AI meal scan'}": ${parsedError}`,
          timestamp: new Date().toISOString(),
          itemType: 'REMINDER',
          isRead: false,
        }, ...prev]);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('AI Meal Scan Failed', { body: `Failed: ${parsedError}`, icon: '/logo.png' });
          } catch (e) {
            console.error('Desktop notification failed:', e);
          }
        }
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

            // Service worker registration + snooze message handling
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('Notification Service Worker registered successfully:', reg.scope))
                .catch((err) => console.error('Notification Service Worker registration failed:', err));

              navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
                if (event.data && event.data.type === 'SNOOZE_NOTIFICATION') {
                  const itemId = event.data.itemId;
                  if (!itemId) return;
                  const resumeAt = Date.now() + 10 * 60 * 1000;
                  set((s) => {
                    s.snoozedItems[itemId] = resumeAt;
                    localStorage.setItem('dashboard_snoozed_items', JSON.stringify(s.snoozedItems));
                    s.notifiedKeys = s.notifiedKeys.filter((k) => !k.startsWith(`${itemId}:`));
                    localStorage.setItem('dashboard_notified_keys', JSON.stringify(s.notifiedKeys));
                  });
                  toast.success('Alert snoozed for 10 minutes', { icon: <Moon size={18} className="text-indigo-400" /> });
                }
              });
            }

            // Pollers: calendar items every 60s (+ on calendar-updated), alert check every 10s
            void fetchUpcomingItems();
            setInterval(fetchUpcomingItems, 60000);
            window.addEventListener('calendar-updated', () => { void fetchUpcomingItems(); });
            setInterval(checkAlerts, 10000);
          },

          setIsOpen: (open) => set((s) => { s.isOpen = open; }),

          markAsRead: (id) => persistNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))),
          markAllAsRead: () => persistNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))),
          clearNotification: (id) => persistNotifications((prev) => prev.filter((n) => n.id !== id)),
          clearAllNotifications: () => {
            set((s) => { s.notifications = []; });
            localStorage.removeItem('dashboard_notifications');
          },

          refetchItems: fetchUpcomingItems,
          playSound,

          toggleDesktopNotifications: async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
              toast.error('This browser does not support Web Push notifications.');
              return false;
            }
            try {
              if (get().desktopEnabled) {
                const reg = await navigator.serviceWorker.ready;
                const subscription = await reg.pushManager.getSubscription();
                if (subscription) {
                  await subscription.unsubscribe();
                  const res = await pushService.unsubscribeDevice(subscription.endpoint);
                  if (res.error) throw new Error(res.error.message);
                }
                set((s) => { s.desktopEnabled = false; });
                localStorage.setItem('dashboard_desktop_notifications_enabled', 'false');
                toast.success('Desktop alerts disabled.');
                return false;
              }

              const permission = await Notification.requestPermission();
              if (permission !== 'granted') {
                toast.error('Permission denied for system notifications.');
                return false;
              }

              const reg = await navigator.serviceWorker.ready;
              const vapidRes = await pushService.getVapidPublicKey();
              if (vapidRes.error || !vapidRes.data) throw new Error(vapidRes.error?.message ?? 'Failed to fetch VAPID key');
              const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidRes.data),
              });

              const rawSub = JSON.parse(JSON.stringify(subscription));
              const subRes = await pushService.subscribeDevice({
                endpoint: rawSub.endpoint,
                p256dh: rawSub.keys.p256dh,
                auth: rawSub.keys.auth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              });
              if (subRes.error) throw new Error(subRes.error.message);

              set((s) => { s.desktopEnabled = true; });
              localStorage.setItem('dashboard_desktop_notifications_enabled', 'true');
              toast.success('Desktop push alerts activated!');
              return true;
            } catch (err) {
              console.error('Failed to register push alerts:', err);
              toast.error('Web Push registration failed. Make sure the backend is running.');
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

            const priorIdsPromise = snapshotEntryIds(date);

            analyzeMeal(files, description, mealType, date)
              .then((res) => markSuccess(taskId, res.data, false))
              .catch(async (err: unknown) => {
                const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
                if (!isDefiniteBusinessFailure(errorMsg)) {
                  try {
                    const priorIds = await priorIdsPromise;
                    const recovered = await findRecoveredEntry(date, mealType, priorIds);
                    if (recovered) {
                      markSuccess(taskId, recovered, true);
                      return;
                    }
                  } catch (reconErr) {
                    console.warn('Meal persistence reconciliation failed:', reconErr);
                  }
                }
                markFailure(taskId, description, parseNotificationError(errorMsg));
              });

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
