import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, BellOff, BellRing, Calendar, CheckSquare, Trophy, Eye, EyeOff, Clock, Loader2, RefreshCw, Terminal, LogOut, Layers, Square, Moon, Sun } from 'lucide-react';
import { useNotifications } from '@/store/notification-store';
import { DARK_THEME_ROUTES, useAppearanceStore } from '@/store/appearance-store';
import type { AppPath } from '@/app/routes';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { logoutAndReload } from '@/services/http/session';

type NotificationCenterProps = {
  onNavigate?: (path: AppPath) => void;
};

function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isOpen,
    desktopEnabled,
    items,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleDesktopNotifications,
    sendTestNotification,
  } = useNotifications();

  const surfaceStyle = useAppearanceStore.use.surfaceStyle();
  const themePreference = useAppearanceStore.use.themePreference();
  const activePath = useAppearanceStore.use.activePath();
  const { toggleSurfaceStyle, toggleTheme } = useAppearanceStore.use.actions();

  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'refresh' | 'toggle' | 'test' | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [showFinanceGrids, setShowFinanceGrids] = useState(() => {
    const stored = localStorage.getItem('showFinanceGrids');
    return stored ? stored === 'true' : false;
  });

  const toggleFinanceGrids = () => {
    const newValue = !showFinanceGrids;
    setShowFinanceGrids(newValue);
    localStorage.setItem('showFinanceGrids', newValue.toString());
    window.dispatchEvent(new CustomEvent('financeGridsVisibilityChanged', { detail: newValue }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) { return ''; }
  };

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  const quickActions = [
    {
      key: 'prompts',
      icon: <Terminal size={18} />,
      label: 'Prompts',
      color: 'var(--qa-blue)',
      bg: 'var(--qa-blue-bg)',
      onClick: () => { setIsOpen(false); if (onNavigate) onNavigate('/prompts'); },
    },
    {
      key: 'refresh',
      icon: <RefreshCw size={18} className={busy === 'refresh' ? 'animate-spin' : ''} />,
      label: 'Refresh',
      color: 'var(--qa-green)',
      bg: 'var(--qa-green-bg)',
      onClick: () => { setBusy('refresh'); location.reload(); },
    },
    ...(isPushSupported && desktopEnabled ? [{
      key: 'test-alert',
      icon: busy === 'test' ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />,
      label: 'Test Alert',
      hint: 'Send a push to this account right now to check delivery',
      color: 'var(--qa-blue)',
      bg: 'var(--qa-blue-bg)',
      onClick: async () => { setBusy('test'); await sendTestNotification(); setBusy(null); },
    }] : []),
    ...(isPushSupported ? [{
      key: 'push',
      icon: busy === 'toggle' ? <Loader2 size={18} className="animate-spin" /> : desktopEnabled ? <Bell size={18} /> : <BellOff size={18} />,
      label: desktopEnabled ? 'Alerts On' : 'Alerts Off',
      color: desktopEnabled ? 'var(--qa-amber)' : 'var(--qa-muted)',
      bg: desktopEnabled ? 'var(--qa-amber-bg)' : 'var(--qa-muted-bg)',
      active: desktopEnabled,
      onClick: async () => { setBusy('toggle'); await toggleDesktopNotifications(); setBusy(null); },
    }] : []),
    {
      key: 'finance',
      icon: showFinanceGrids ? <Eye size={18} /> : <EyeOff size={18} />,
      label: showFinanceGrids ? 'Grids On' : 'Grids Off',
      color: showFinanceGrids ? 'var(--qa-teal)' : 'var(--qa-muted)',
      bg: showFinanceGrids ? 'var(--qa-teal-bg)' : 'var(--qa-muted-bg)',
      active: showFinanceGrids,
      onClick: toggleFinanceGrids,
    },
    {
      key: 'surface',
      icon: surfaceStyle === 'solid' ? <Square size={18} /> : <Layers size={18} />,
      label: surfaceStyle === 'solid' ? 'Solid UI' : 'Glass UI',
      hint: surfaceStyle === 'solid' ? 'Switch to glass surfaces' : 'Switch to solid white surfaces',
      color: 'var(--qa-indigo)',
      bg: 'var(--qa-indigo-bg)',
      onClick: toggleSurfaceStyle,
    },
    {
      key: 'theme',
      icon: themePreference === 'dark' ? <Moon size={18} /> : <Sun size={18} />,
      label: themePreference === 'dark' ? 'Dark' : 'Light',
      hint: !DARK_THEME_ROUTES.has(activePath)
        ? "Dark theme isn't available on this page yet"
        : themePreference === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      color: 'var(--qa-indigo)',
      bg: 'var(--qa-indigo-bg)',
      active: themePreference === 'dark',
      onClick: toggleTheme,
    },
    {
      key: 'logout',
      icon: <LogOut size={18} />,
      label: 'Log Out',
      color: 'var(--qa-red)',
      bg: 'var(--qa-red-bg)',
      onClick: () => setShowLogoutDialog(true),
    },
  ];

  return (
    <>
    {createPortal(
      <div
        className="nc-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
      >
        <div
          ref={panelRef}
          className="nc-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Notification Center"
        >
          {/* Header row */}
          <div className="nc-header">
            <div className="nc-header-left">
              <span className="nc-title">Notifications</span>
              {unreadCount > 0 && <span className="nc-badge">{unreadCount}</span>}
            </div>
            <div className="nc-header-right">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button type="button" className="nc-text-btn" onClick={markAllAsRead}>
                      Mark read
                    </button>
                  )}
                  <button type="button" className="nc-text-btn nc-text-btn--danger" onClick={clearAllNotifications}>
                    Clear all
                  </button>
                </>
              )}
              <button type="button" className="nc-close-btn" onClick={() => setIsOpen(false)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick actions — horizontal icon strip */}
          <div className="nc-quick-strip">
            {quickActions.map((action) => (
              <button
                key={action.key}
                type="button"
                className={`nc-qa-btn${action.active ? ' nc-qa-btn--active' : ''}`}
                style={{ '--qa-color': action.color, '--qa-bg': action.bg } as React.CSSProperties}
                onClick={action.onClick}
                title={'hint' in action ? action.hint : action.label}
              >
                <span className="nc-qa-icon">{action.icon}</span>
                <span className="nc-qa-label">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="nc-divider" />

          {/* Notification list */}
          <div className="nc-list">
            {notifications.length === 0 ? (
              <div className="nc-empty">
                <div className="nc-empty-icon">
                  <Bell size={28} />
                </div>
                <p className="nc-empty-title">All caught up</p>
                <p className="nc-empty-sub">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const calendarItem = items.find((item) => item.id === notif.itemId);
                const isCompleted = calendarItem?.completed ?? false;
                return (
                  <div
                    key={notif.id}
                    className={`nc-item nc-item--${notif.itemType.toLowerCase()} ${notif.isRead ? 'nc-item--read' : ''} ${isCompleted ? 'nc-item--done' : ''}`}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                    style={{ cursor: notif.isRead ? 'default' : 'pointer' }}
                  >
                    <div className={`nc-item-dot nc-item-dot--${notif.itemType.toLowerCase()}`} />
                    <div className="nc-item-icon">
                      {notif.itemType === 'TASK' && <CheckSquare size={14} />}
                      {notif.itemType === 'EVENT' && <Calendar size={14} />}
                      {notif.itemType === 'REMINDER' && <Clock size={14} />}
                      {notif.itemType === 'MILESTONE' && <Trophy size={14} />}
                      {!['TASK','EVENT','REMINDER','MILESTONE'].includes(notif.itemType) && <Bell size={14} />}
                    </div>
                    <div className="nc-item-body">
                      <div className="nc-item-meta">
                        <span className={`nc-item-tag nc-item-tag--${notif.itemType.toLowerCase()}`}>{notif.itemType}</span>
                        <span className="nc-item-time">{formatTime(notif.timestamp)}</span>
                      </div>
                      <p className="nc-item-title">{notif.title}</p>
                      <p className="nc-item-msg">{notif.message}</p>
                    </div>
                    <button
                      type="button"
                      className="nc-item-del"
                      onClick={(e) => { e.stopPropagation(); clearNotification(notif.id); }}
                      aria-label="Delete"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

      <ConfirmDialog
        open={showLogoutDialog}
        title="Log out"
        message="Do you want to log out of your session?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={() => { void logoutAndReload(); }}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}

export { NotificationCenter };
