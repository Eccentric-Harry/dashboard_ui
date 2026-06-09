import { useState, useEffect, useRef } from 'react';
import { X, Check, Trash2, Bell, BellOff, Calendar, CheckSquare, Trophy, AlertCircle, Eye, Volume2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotifications } from '../../../../contexts/NotificationContext';

function NotificationCenter() {
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
    completeTaskDirectly,
    playSound,
  } = useNotifications();

  const drawerRef = useRef<HTMLDivElement>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

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

        {/* Settings Accordion Trigger */}
        <button
          type="button"
          onClick={() => setSettingsExpanded(!settingsExpanded)}
          className="settings-accordion-trigger"
          aria-expanded={settingsExpanded}
        >
          <div className="trigger-left">
            <Settings size={14} className="text-gray-500" />
            <span>Alert Settings</span>
          </div>
          {settingsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Collapsible Content wrapper */}
        <div className={`settings-accordion-content ${settingsExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="accordion-content-inner">
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
          </div>
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
              {notifications.map((notif) => {
                const isTaskOrReminder = notif.itemType === 'TASK' || notif.itemType === 'REMINDER';
                const calendarItem = items.find((item) => item.id === notif.itemId);
                const isCompleted = calendarItem ? calendarItem.completed : false;
                return (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.isRead ? 'read' : 'unread'} item-${notif.itemType.toLowerCase()} ${isCompleted ? 'completed-item' : ''}`}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                    style={{ cursor: notif.isRead ? 'default' : 'pointer' }}
                  >
                    <div className="notif-layout-row">
                      {/* Left Column: Checkbox for Tasks/Reminders, or simple Type Icon */}
                      <div className="notif-left-column">
                        {isTaskOrReminder ? (
                          <button
                            type="button"
                            className={`notif-check-circle ${isCompleted ? 'completed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              completeTaskDirectly(notif.itemId);
                            }}
                            disabled={isCompleted}
                            title={isCompleted ? "Completed" : "Mark complete"}
                          >
                            <Check size={10} className="check-icon" style={{ opacity: isCompleted ? 1 : undefined }} />
                          </button>
                        ) : (
                          <div className="notif-type-icon">
                            {getNotificationIcon(notif.itemType)}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Title, description, tags, relative time, and delete actions */}
                      <div className="notif-right-column">
                        <div className="notif-header">
                          <span className={`notif-badge-tag tag-${notif.itemType.toLowerCase()}`}>
                            {notif.itemType}
                          </span>
                          <div className="notif-meta-actions">
                            <span className="notif-time">{formatTime(notif.timestamp)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notif.id);
                              }}
                              className="notif-delete-btn-top"
                              title="Delete notification"
                              aria-label="Delete notification"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <h3 className="notif-title">{notif.title}</h3>
                        <p className="notif-message">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { NotificationCenter };
