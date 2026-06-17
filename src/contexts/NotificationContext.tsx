/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  fetchCalendarItemsForRange,
  fetchVapidPublicKey,
  subscribeDevice,
  unsubscribeDevice,
} from '../lib/api';
import type { CalendarItem } from '../lib/api';

export interface InAppNotification {
  id: string;
  itemId: string;
  title: string;
  message: string;
  timestamp: string;
  itemType: 'TASK' | 'EVENT' | 'REMINDER' | 'MILESTONE';
  isRead: boolean;
}

type NotificationContextType = {
  notifications: InAppNotification[];
  unreadCount: number;
  isOpen: boolean;
  desktopEnabled: boolean;
  items: CalendarItem[];
  isLoadingItems: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  toggleDesktopNotifications: () => Promise<boolean>;
  refetchItems: () => Promise<void>;
  playSound: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const getLocalDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const getEmojiForItemType = (type?: string) => {
  switch (type) {
    case 'TASK':
      return '📝';
    case 'EVENT':
      return '📅';
    case 'REMINDER':
      return '🔔';
    case 'MILESTONE':
      return '🏆';
    default:
      return '📢';
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
   
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    const saved = localStorage.getItem('dashboard_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifiedKeys, setNotifiedKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_notified_keys');
    return saved ? JSON.parse(saved) : [];
  });

  const [desktopEnabled, setDesktopEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dashboard_desktop_notifications_enabled') === 'true';
  });

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ---------------------------------------------------------------------------
  // Persistent singleton Audio element + AudioContext
  // These are created once on mount and "warmed up" on the very first user
  // interaction (click / touchstart). Because iOS tracks unlock state per
  // element / context instance, reusing the same objects lets timer-triggered
  // playback succeed after the initial warm-up tap.
  // ---------------------------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  // Create the singleton Audio element once on mount
  useEffect(() => {
    try {
      const audio = new Audio('/iphone-notification.mp3');
      audio.preload = 'auto';
      audioRef.current = audio;
    } catch (e) {
      console.warn('Failed to create persistent Audio element:', e);
    }

     
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    } catch (e) {
      console.warn('Failed to create persistent AudioContext:', e);
    }

    return () => {
      // Clean up on unmount
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // iOS Autoplay Audio Unlocker
  // On the very first user interaction we play a silent (volume=0) buffer and
  // resume the AudioContext so that subsequent programmatic calls are allowed.
  // We remove the listeners after the first unlock so they don't fire again.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;

      // 1. Warm up the persistent HTML5 Audio element (silent play/pause)
      if (audioRef.current) {
        const prevVolume = audioRef.current.volume;
        audioRef.current.volume = 0;
        audioRef.current.play()
          .then(() => {
            audioRef.current!.pause();
            audioRef.current!.currentTime = 0;
            audioRef.current!.volume = prevVolume > 0 ? prevVolume : 1.0;
          })
          .catch((err) => {
            console.warn('HTML5 Audio unlock failed:', err);
            audioRef.current!.volume = prevVolume > 0 ? prevVolume : 1.0;
          });
      }

      // 2. Resume the persistent AudioContext
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
          .then(() => {
            // Play a completely silent single-sample buffer to warm up hardware path
            if (audioCtxRef.current) {
              const buffer = audioCtxRef.current.createBuffer(1, 1, 22050);
              const source = audioCtxRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioCtxRef.current.destination);
              source.start(0);
            }
          })
          .catch((err) => console.warn('AudioContext resume failed:', err));
      }

      // Remove listeners — we only need to unlock once per session
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Notification Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('Notification Service Worker registration failed:', err);
        });
    }
  }, []);

  // Sync references for interval timer
  const itemsRef = useRef(items);
  const notifiedKeysRef = useRef(notifiedKeys);
  const desktopEnabledRef = useRef(desktopEnabled);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    notifiedKeysRef.current = notifiedKeys;
  }, [notifiedKeys]);

  useEffect(() => {
    desktopEnabledRef.current = desktopEnabled;
  }, [desktopEnabled]);

  // Fetch occurrences for today and tomorrow
  const fetchUpcomingItems = useCallback(async () => {
    setIsLoadingItems(true);
    try {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const startStr = getLocalDateStr(today);
      const endStr = getLocalDateStr(tomorrow);

      const res = await fetchCalendarItemsForRange(startStr, endStr);
      // Ensure we format / filter items safely
      if (res && res.data) {
        setItems(res.data);
      } else if (Array.isArray(res)) {
        setItems(res);
      }
    } catch (err) {
      console.error('Failed to fetch calendar items for notifications:', err);
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const refetchItems = async () => {
    await fetchUpcomingItems();
  };

  // ---------------------------------------------------------------------------
  // Synthesized notification sound fallback using the persistent AudioContext
  // ---------------------------------------------------------------------------
  const playSynthesizedSound = useCallback(() => {
    try {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
      }

      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscFundamental = audioCtx.createOscillator();
        const gainFundamental = audioCtx.createGain();
        const oscStrike = audioCtx.createOscillator();
        const gainStrike = audioCtx.createGain();

        oscFundamental.type = 'sine';
        oscFundamental.frequency.setValueAtTime(frequency, startTime);
        oscFundamental.connect(gainFundamental);
        gainFundamental.connect(audioCtx.destination);

        oscStrike.type = 'sine';
        oscStrike.frequency.setValueAtTime(frequency * 3, startTime);
        oscStrike.connect(gainStrike);
        gainStrike.connect(audioCtx.destination);

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
      playNote(587.33, now, 0.4);       // D5
      playNote(880.00, now + 0.11, 0.4); // A5
      playNote(1174.66, now + 0.22, 0.7); // D6
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Primary sound player — reuses the persistent Audio element so iOS allows it
  // ---------------------------------------------------------------------------
  const playSound = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      // Reset to start in case a previous play is mid-way through
      try {
        audio.currentTime = 0;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Persistent Audio play failed, falling back to synthesis:', err);
            playSynthesizedSound();
          });
        }
        return;
      } catch (e) {
        console.warn('Persistent Audio play threw, falling back to synthesis:', e);
      }
    }
    // No persistent element — try a fresh Audio instance as a last resort
    try {
      const fallbackAudio = new Audio('/iphone-notification.mp3');
      fallbackAudio.volume = 1.0;
      fallbackAudio.play().catch(() => playSynthesizedSound());
    } catch {
      playSynthesizedSound();
    }
  }, [playSynthesizedSound]);

  const triggerAlert = useCallback((item: CalendarItem, message: string) => {
    // 1. In-App Toast
    toast(message, {
      icon: getEmojiForItemType(item.itemType),
      duration: 6000,
    });

    // 2. Audio Beep
    playSound();

    // 3. Desktop Native Alert
    if (desktopEnabledRef.current && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(item.title, {
          body: message,
          icon: '/logo.png',
        });
      } catch (e) {
        console.error('Desktop notification trigger failed:', e);
      }
    }

    // 4. Save to feed
    const newNotif: InAppNotification = {
      id: `${item.id || 'notif'}-${Date.now()}`,
      itemId: item.occurrenceId || item.id || '',
      title: item.title,
      message,
      timestamp: new Date().toISOString(),
      itemType: item.itemType || 'TASK',
      isRead: false,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('dashboard_notifications', JSON.stringify(updated));
      return updated;
    });
  }, [playSound]);

  // Alert schedule checker effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUpcomingItems();
    const pollInterval = setInterval(fetchUpcomingItems, 60000); // refresh list every 1 minute

    const handleCalendarUpdate = () => {
      fetchUpcomingItems();
    };
    window.addEventListener('calendar-updated', handleCalendarUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('calendar-updated', handleCalendarUpdate);
    };
  }, [fetchUpcomingItems]);

  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = getLocalDateStr(now);

      const currentItems = itemsRef.current;
      const currentNotified = notifiedKeysRef.current;

      const newNotifiedKeys = [...currentNotified];
      let updated = false;

      currentItems.forEach((item) => {
        if (!item.id) return;

        // Prevent notifying multiple times for the exact same event on the same date/time
        const key = `${item.id}:${item.date}:${item.startTime || 'allday'}`;
        if (currentNotified.includes(key)) return;

        // Skip completed tasks/reminders
        if ((item.itemType === 'TASK' || item.itemType === 'REMINDER') && item.completed) {
          return;
        }

        let shouldTrigger = false;
        let alertMessage = '';

        if (item.allDay) {
          // Trigger all-day items at 9:00 AM local time
          const isPast9AM = now.getHours() >= 9;
          if (item.date === todayStr && isPast9AM) {
            shouldTrigger = true;
            alertMessage = `Today: ${item.title} (All day)`;
          }
        } else if (item.startTime) {
          // Trigger timed items when start time is reached/passed today
          if (item.date === todayStr && currentHHMM >= item.startTime) {
            shouldTrigger = true;
            alertMessage = `${item.itemType === 'EVENT' ? 'Event' : 'Reminder'}: "${item.title}" starts now at ${item.startTime}`;
          }
        }

        if (shouldTrigger) {
          newNotifiedKeys.push(key);
          updated = true;
          triggerAlert(item, alertMessage);
        }
      });

      if (updated) {
        setNotifiedKeys(newNotifiedKeys);
        localStorage.setItem('dashboard_notified_keys', JSON.stringify(newNotifiedKeys));
      }
    };

    const checker = setInterval(checkAlerts, 10000); // Check state every 10 seconds
    return () => clearInterval(checker);
  }, [triggerAlert]);

  // Actions
  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      localStorage.setItem('dashboard_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      localStorage.setItem('dashboard_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem('dashboard_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('dashboard_notifications');
  };

  const toggleDesktopNotifications = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('This browser does not support Web Push notifications.');
      return false;
    }

    try {
      if (desktopEnabled) {
        // Unsubscribe from push
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await unsubscribeDevice(subscription.endpoint);
        }

        setDesktopEnabled(false);
        localStorage.setItem('dashboard_desktop_notifications_enabled', 'false');
        toast.success('Desktop alerts disabled.');
        return false;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Permission denied for system notifications.');
        return false;
      }

      // Get ready registration
      const reg = await navigator.serviceWorker.ready;

      // Fetch public key
      const vapidPublicKey = await fetchVapidPublicKey();

      // Subscribe
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send to backend
      const rawSub = JSON.parse(JSON.stringify(subscription));
      const payload = {
        endpoint: rawSub.endpoint,
        p256dh: rawSub.keys.p256dh,
        auth: rawSub.keys.auth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      };

      await subscribeDevice(payload);

      setDesktopEnabled(true);
      localStorage.setItem('dashboard_desktop_notifications_enabled', 'true');
      toast.success('Desktop push alerts activated!');
      return true;
    } catch (err) {
      console.error('Failed to register push alerts:', err);
      toast.error('Web Push registration failed. Make sure the backend is running.');
      return false;
    }
  };



  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        desktopEnabled,
        items,
        isLoadingItems,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        toggleDesktopNotifications,
        refetchItems,
        playSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
