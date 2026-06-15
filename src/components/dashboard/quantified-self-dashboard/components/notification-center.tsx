import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Bell, BellOff, Calendar, CheckSquare, Trophy, Eye, Clock, Loader2, RefreshCw, Terminal } from 'lucide-react';
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
        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(16, 19, 18, 0.06)', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(16,19,18,0.5)', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 700 }}>Quick Access</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button 
              onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('/prompts'); }}
              style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', height: '52px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(16,19,18,0.04)', borderRadius: '12px', color: '#101312', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
            >
              <Terminal size={16} />
              <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6 }}>Prompts</span>
            </button>
            <button 
              onClick={() => {
                setBusy('refresh');
                location.reload();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', height: '52px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(16,19,18,0.04)', borderRadius: '12px', color: '#101312', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
              title="Reload page (⌘R)"
              aria-label="Reload page"
            >
              <RefreshCw size={16} className={busy === 'refresh' ? 'animate-spin' : ''} />
              <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6 }}>Refresh</span>
            </button>

            {isPushSupported && (
              <button 
                onClick={async () => {
                  setBusy('toggle');
                  await toggleDesktopNotifications();
                  setBusy(null);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', height: '52px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(16,19,18,0.04)', borderRadius: '12px', color: desktopEnabled ? '#10b981' : '#101312', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
                title={desktopEnabled ? 'Disable push alerts' : 'Enable push alerts'}
                aria-label={desktopEnabled ? 'Disable push alerts' : 'Enable push alerts'}
              >
                {busy === 'toggle' ? <Loader2 size={16} className="animate-spin" /> : desktopEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6 }}>{desktopEnabled ? 'Alerts On' : 'Alerts Off'}</span>
              </button>
            )}

            {/* Empty placeholders */}
            {Array.from({ length: isPushSupported ? 3 : 4 }).map((_, i) => (
              <div 
                key={i} 
                style={{ height: '52px', background: 'rgba(16,19,18,0.03)', borderRadius: '12px' }} 
              />
            ))}
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
