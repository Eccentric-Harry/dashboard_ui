import { useEffect, useState } from 'react'
import { getAvatarImage } from '../../../../lib/avatar'
import { type AppPath, navItems, mobileNavItems, railBottomItems } from '../data'
import { useNotifications } from '../../../../contexts/NotificationContext'
import { ConfirmDialog } from '../../../ui/confirm-dialog'

// Module-level: survives component remounts on route changes
let prevMobileIndex = -1

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function SideRail({ activePath, onNavigate }: DashboardStageProps) {
  const { unreadCount, isOpen, setIsOpen } = useNotifications()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarUrl') || 'luffy')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [liquidClass, setLiquidClass] = useState('')

  useEffect(() => {
    const handleUpdate = () => {
      setAvatar(localStorage.getItem('avatarUrl') || 'luffy')
    }
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [])

  // Mobile dock — active index from the separate mobileNavItems array
  const rawActiveMobileIndex = mobileNavItems.findIndex((item) => item.to === activePath)
  const showActiveIndicator = rawActiveMobileIndex !== -1
  const activeMobileIndex = showActiveIndicator ? rawActiveMobileIndex : 0

  // Liquid glass slide animation — module-level prev persists across remounts
  useEffect(() => {
    if (!showActiveIndicator) {
      prevMobileIndex = -1
      return
    }
    const prev = prevMobileIndex
    const curr = activeMobileIndex
    if (prev !== -1 && prev !== curr) {
      const dir = curr > prev ? 'liquid-right' : 'liquid-left'
      setLiquidClass(dir)
      const t = setTimeout(() => setLiquidClass(''), 500)
      prevMobileIndex = curr
      return () => clearTimeout(t)
    }
    prevMobileIndex = curr
  }, [activeMobileIndex, showActiveIndicator])

  const mobileNavStyle = {
    '--active-index': activeMobileIndex,
    '--visible-count': mobileNavItems.length,
    '--indicator-opacity': showActiveIndicator ? 1 : 0,
  } as React.CSSProperties

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

      {/* Mobile bottom dock — 5 items, Home centred, with liquid slide indicator */}
      <nav
        className={`rail-nav-mobile${liquidClass ? ` ${liquidClass}` : ''}`}
        style={mobileNavStyle}
      >
        {mobileNavItems.map((item) => {
          const { label, icon: Icon, to } = item
          const isActive = to && activePath === to
          return (
            <button
              key={label}
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

