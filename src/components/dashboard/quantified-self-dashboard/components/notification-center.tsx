import { useEffect, useRef } from 'react';
import { X, Check, Trash2, Bell, BellOff, Calendar, CheckSquare, Trophy, AlertCircle, Eye, Volume2 } from 'lucide-react';
import { useNotifications } from '../../../../contexts/NotificationContext';

function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isOpen,
    desktopEnabled,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    toggleDesktopNotifications,
    completeTaskDirectly,
    playSound,
  } = useNotifications();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
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
    } catch (e) {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    const size = 16;
    switch (type) {
      case 'TASK':
        return <CheckSquare size={size} className="text-emerald-600" />;
      case 'EVENT':
        return <Calendar size={size} className="text-blue-600" />;
      case 'REMINDER':
        return <Bell size={size} className="text-amber-500 animate-bounce" />;
      case 'MILESTONE':
        return <Trophy size={size} className="text-purple-500" />;
      default:
        return <AlertCircle size={size} className="text-gray-500" />;
    }
  };

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <div 
      className="notification-center-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      <div
        ref={drawerRef}
        className="notification-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Notification Center"
      >
        <div className="drawer-handle" />
        {/* Header */}
        <div className="notification-drawer-header">
          <div className="header-title-area">
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount} new</span>
            )}
          </div>
          <button
            type="button"
            className="close-drawer-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close Notification Center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desktop Permission Control Card */}
        <div className="desktop-alert-control">
          <div className="desktop-alert-info">
            <h4>System Desktop Alerts</h4>
            <p>
              {!isPushSupported
                ? 'Not supported in browser tab. Add to Home Screen to enable.'
                : desktopEnabled
                ? 'Desktop notifications are active.'
                : 'Get alerts when the dashboard is open in the background.'}
            </p>
          </div>
          {isPushSupported ? (
            <button
              type="button"
              onClick={toggleDesktopNotifications}
              className={`desktop-toggle-btn ${desktopEnabled ? 'active' : ''}`}
              aria-label={desktopEnabled ? 'Disable system alerts' : 'Enable system alerts'}
            >
              {desktopEnabled ? <BellOff size={16} /> : <Bell size={16} />}
              <span>{desktopEnabled ? 'Disable' : 'Enable'}</span>
            </button>
          ) : (
            <span className="text-xs font-semibold px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg select-none">
              Unavailable
            </span>
          )}
        </div>

        {/* Notification Sound Test Card */}
        <div className="desktop-alert-control" style={{ marginTop: '8px' }}>
          <div className="desktop-alert-info">
            <h4>Notification Sound</h4>
            <p>Test the new iOS Tri-Tone marimba reminder sound.</p>
          </div>
          <button
            type="button"
            onClick={playSound}
            className="desktop-toggle-btn active"
            aria-label="Test notification sound"
          >
            <Volume2 size={16} />
            <span>Test Sound</span>
          </button>
        </div>

        {/* Global Action Bar */}
        {notifications.length > 0 && (
          <div className="notification-action-bar">
            {unreadCount > 0 && (
              <button type="button" onClick={markAllAsRead} className="action-link text-xs">
                <Eye size={12} className="inline mr-1" />
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={clearAllNotifications}
              className="action-link text-xs delete-all"
            >
              <Trash2 size={12} className="inline mr-1" />
              Clear all
            </button>
          </div>
        )}

        {/* Scrollable List */}
        <div className="notification-list-container">
          {notifications.length === 0 ? (
            <div className="notification-empty-state">
              <div className="empty-bell-glow">
                <Bell size={32} className="text-[#3b4b3c] opacity-60" />
              </div>
              <h3>All caught up!</h3>
              <p>You have no notifications, reminders, or tasks waiting for you right now.</p>
            </div>
          ) : (
            <div className="notification-feed">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.isRead ? 'read' : 'unread'} item-${notif.itemType.toLowerCase()}`}
                >
                  <div className="notif-header">
                    <div className="notif-type-tag">
                      {getNotificationIcon(notif.itemType)}
                      <span className="type-label">{notif.itemType}</span>
                    </div>
                    <span className="notif-time">{formatTime(notif.timestamp)}</span>
                  </div>

                  <h3 className="notif-title">{notif.title}</h3>
                  <p className="notif-message">{notif.message}</p>

                  <div className="notif-actions">
                    <div className="flex gap-2">
                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => markAsRead(notif.id)}
                          className="notif-action-btn read-btn"
                          title="Mark as read"
                        >
                          <Eye size={12} className="mr-1" />
                          Read
                        </button>
                      )}
                      {(notif.itemType === 'TASK' || notif.itemType === 'REMINDER') && (
                        <button
                          type="button"
                          onClick={() => completeTaskDirectly(notif.itemId)}
                          className="notif-action-btn complete-btn"
                          title="Mark calendar item complete"
                        >
                          <Check size={12} className="mr-1" />
                          Done
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => clearNotification(notif.id)}
                      className="notif-delete-btn"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { NotificationCenter };
