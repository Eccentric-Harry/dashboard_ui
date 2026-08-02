import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { getAvatarImage } from '../../../../lib/avatar'
import { type AppPath, mobileNavItems, navItems, railBottomItems } from '../data'
import { useNotifications } from '../../../../store/notification-store'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function SideRail({ activePath, onNavigate }: DashboardStageProps) {
  const { unreadCount, isOpen, setIsOpen } = useNotifications()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarUrl') || 'luffy')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const activeMobileBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const handleUpdate = () => {
      setAvatar(localStorage.getItem('avatarUrl') || 'luffy')
    }
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [])

  // Only four of the routes are on screen at a time, so pull the active one
  // into view when navigation happens from somewhere other than the dock.
  useEffect(() => {
    activeMobileBtnRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activePath])

  const handleQuickAddClick = () => {
    window.dispatchEvent(new CustomEvent('mobile-quick-add', { detail: { path: activePath } }))
  }

  const handleSettingsClick = () => {
    setShowLogoutDialog(true)
  }

  const confirmLogout = () => {
    localStorage.clear()
    window.location.reload()
  }

  return (
    <aside className="side-rail" aria-label="Dashboard navigation">
      <button
        type="button"
        className="rail-avatar-btn"
        onClick={() => onNavigate('/profile')}
        title="View Profile"
        aria-label="View Profile"
      >
        <img className="rail-avatar" src={getAvatarImage(avatar)} alt="Profile" />
      </button>

      {/* Desktop vertical nav — full route list, unchanged */}
      <nav className="rail-nav-desktop">
        {navItems.map((item) => {
          const { label, icon: Icon, to, muted, bubble } = item
          const btnClassName = `${to && activePath === to ? 'active' : ''} ${muted ? 'muted' : ''} ${item.mobileHidden ? 'mobile-hidden' : ''}`.trim() || undefined
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              aria-current={to && activePath === to ? 'page' : undefined}
              className={btnClassName}
              onClick={to ? () => onNavigate(to) : undefined}
            >
              <Icon size={16} strokeWidth={2} />
              <span className={bubble ? 'rail-bubble' : 'rail-tooltip'}>{bubble ?? label}</span>
            </button>
          )
        })}
      </nav>

      {/* Mobile bottom dock — scrollable route island + fixed quick-add island */}
      <div className="rail-mobile-dock">
        <nav className="rail-nav-mobile">
          {mobileNavItems.map((item) => {
            const { label, icon: Icon, to } = item
            const isActive = to && activePath === to
            return (
              <button
                key={label}
                ref={isActive ? activeMobileBtnRef : undefined}
                type="button"
                aria-label={label}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : undefined}
                onClick={to ? () => onNavigate(to) : undefined}
              >
                <Icon size={16} strokeWidth={2} />
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          className="rail-add-fab"
          aria-label="Quick add"
          title="Quick add"
          onClick={handleQuickAddClick}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <div className="rail-bottom">
        {railBottomItems.map(({ label, icon: Icon, muted }) => {
          const isNotifications = label === 'Notifications'
          const btnClassName = `${muted && !isNotifications ? 'muted' : ''} ${isNotifications && isOpen ? 'active' : ''} ${isNotifications ? 'rail-notifications-btn' : ''}`.trim() || undefined
          const handleBottomClick = isNotifications
            ? () => setIsOpen(!isOpen)
            : (label === 'Logout' ? handleSettingsClick : undefined)

          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              className={btnClassName}
              onClick={handleBottomClick}
            >
              <Icon size={16} />
              {isNotifications && unreadCount > 0 && (
                <span className="rail-notification-badge">{unreadCount}</span>
              )}
            </button>
          )
        })}
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        title="Log out"
        message="Do you want to log out of your session?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </aside>
  )
}

export { SideRail }

