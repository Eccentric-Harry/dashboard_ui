import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Bell, BellOff, Calendar, CheckSquare, Trophy, Eye, EyeOff, Clock, Loader2, RefreshCw, Terminal, LogOut } from 'lucide-react';
import { useNotifications } from '../../../../contexts/NotificationContext';
import type { AppPath } from '../data';

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
  } = useNotifications();

  const drawerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'refresh' | 'toggle' | null>(null);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return '';
    }
  };



  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return createPortal(
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

        {/* Quick Access Section */}
        <div className="quick-access-section">
          <h3 className="quick-access-section-title">Quick Access</h3>
          <div className="quick-access-grid">
            <button 
              type="button"
              onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('/prompts'); }}
              className="quick-access-tile"
            >
              <div className="tile-icon-wrapper">
                <Terminal size={16} />
              </div>
              <div className="tile-info">
                <span className="tile-title">Prompts</span>
                <span className="tile-subtitle">Manage library</span>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => {
                setBusy('refresh');
                location.reload();
              }}
              className="quick-access-tile"
              title="Reload page (⌘R)"
              aria-label="Reload page"
            >
              <div className="tile-icon-wrapper">
                <RefreshCw size={16} className={busy === 'refresh' ? 'animate-spin' : ''} />
              </div>
              <div className="tile-info">
                <span className="tile-title">Refresh</span>
                <span className="tile-subtitle">Sync dashboard</span>
              </div>
            </button>

            {isPushSupported && (
              <button 
                type="button"
                onClick={async () => {
                  setBusy('toggle');
                  await toggleDesktopNotifications();
                  setBusy(null);
                }}
                className={`quick-access-tile ${desktopEnabled ? 'active' : ''}`}
                title={desktopEnabled ? 'Disable push alerts' : 'Enable push alerts'}
                aria-label={desktopEnabled ? 'Disable push alerts' : 'Enable push alerts'}
              >
                <div className="tile-icon-wrapper">
                  {busy === 'toggle' ? <Loader2 size={16} className="animate-spin" /> : desktopEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
                <div className="tile-info">
                  <span className="tile-title">Push Alerts</span>
                  <span className="tile-subtitle">{desktopEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </button>
            )}

            <button 
              type="button"
              onClick={toggleFinanceGrids}
              className={`quick-access-tile ${showFinanceGrids ? 'active' : ''}`}
              title={showFinanceGrids ? 'Hide Repayment Grids' : 'Show Repayment Grids'}
            >
              <div className="tile-icon-wrapper">
                {showFinanceGrids ? <Eye size={16} /> : <EyeOff size={16} />}
              </div>
              <div className="tile-info">
                <span className="tile-title">Finance Grids</span>
                <span className="tile-subtitle">{showFinanceGrids ? 'Visible' : 'Hidden'}</span>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => {
                if (window.confirm('Do you want to log out of your session?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="quick-access-tile logout-tile full-width-tile"
              title="Log out session"
            >
              <div className="tile-icon-wrapper logout-icon-wrapper">
                <LogOut size={16} />
              </div>
              <div className="tile-info">
                <span className="tile-title">Log Out</span>
                <span className="tile-subtitle font-semibold">End current session</span>
              </div>
            </button>
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
              <div className="status-indicator">
                <span className="status-dot animate-pulse"></span>
                All systems operational
              </div>
            </div>
          ) : (
            <div className="notification-feed">
              {notifications.map((notif) => {
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
                      {/* Left Column: Double-ring Icon Container */}
                      <div className="notif-left-column">
                        <div className="notif-icon-outer-ring">
                          <div className="notif-icon-inner-circle">
                            <span className="notif-static-icon">
                              {notif.itemType === 'TASK' && <CheckSquare size={16} />}
                              {notif.itemType === 'EVENT' && <Calendar size={16} />}
                              {notif.itemType === 'REMINDER' && <Clock size={16} />}
                              {notif.itemType === 'MILESTONE' && <Trophy size={16} />}
                              {notif.itemType !== 'TASK' && notif.itemType !== 'EVENT' && notif.itemType !== 'REMINDER' && notif.itemType !== 'MILESTONE' && <Bell size={16} />}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Title and Message */}
                      <div className="notif-right-column">
                        <div className="notif-header">
                          <span className={`notif-badge-tag tag-${notif.itemType.toLowerCase()}`}>
                            {notif.itemType}
                          </span>
                          <span className="notif-time">{formatTime(notif.timestamp)}</span>
                        </div>
                        <h3 className="notif-title">{notif.title}</h3>
                        <p className="notif-message">{notif.message}</p>
                      </div>

                      {/* Clean Hover-visible Close Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notif.id);
                        }}
                        className="notif-delete-btn"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

export { NotificationCenter };
