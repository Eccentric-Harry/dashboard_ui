import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  fetchCalendarItemsForRange,
  toggleCalendarItem as toggleCalendarItemApi,
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
  completeTaskDirectly: (itemId: string) => Promise<void>;
  refetchItems: () => Promise<void>;
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
    .replace(/\-/g, '+')
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

  // Notification sound generator using Web Audio API
  const playSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

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
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Desktop notification trigger failed:', e);
      }
    }

    // 4. Save to feed
    const newNotif: InAppNotification = {
      id: `${item.id || 'notif'}-${Date.now()}`,
      itemId: item.id || '',
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
  }, []);

  // Alert schedule checker effect
  useEffect(() => {
    fetchUpcomingItems();
    const pollInterval = setInterval(fetchUpcomingItems, 60000); // refresh list every 1 minute
    return () => clearInterval(pollInterval);
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
        
        // Prevent notifying multiple times for the exact same event on the same date
        const key = `${item.id}:${item.date}`;
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
          // Ensure it's for today (we also fetch tomorrow's items, which shouldn't alert today)
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

  const completeTaskDirectly = async (itemId: string) => {
    try {
      await toggleCalendarItemApi(itemId);
      toast.success('Task marked as completed!');
      await fetchUpcomingItems();
    } catch (err) {
      console.error('Failed to complete task:', err);
      toast.error('Could not update task completion.');
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
        completeTaskDirectly,
        refetchItems,
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
