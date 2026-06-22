import { type CSSProperties, useEffect, useState } from 'react'
import { getAvatarImage } from '../../../views/profile-view'
import { type AppPath, navItems, railBottomItems } from '../data'
import { useNotifications } from '../../../../contexts/NotificationContext'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function SideRail({ activePath, onNavigate }: DashboardStageProps) {
  const { unreadCount, isOpen, setIsOpen } = useNotifications()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarUrl') || 'luffy')

  useEffect(() => {
    const handleUpdate = () => {
      setAvatar(localStorage.getItem('avatarUrl') || 'luffy')
    }
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [])

  const mobileNavItems = navItems.filter((item) => item.to && !item.mobileHidden)
  const rawActiveMobileIndex = mobileNavItems.findIndex((item) => item.to === activePath)
  const showActiveIndicator = rawActiveMobileIndex !== -1
  const activeMobileIndex = showActiveIndicator ? rawActiveMobileIndex : 0
  const navStyle = {
    '--active-index': activeMobileIndex,
    '--visible-count': mobileNavItems.length,
    '--indicator-opacity': showActiveIndicator ? 1 : 0,
  } as CSSProperties

  const handleSettingsClick = () => {
    if (window.confirm('Do you want to log out of your session?')) {
      localStorage.clear()
      window.location.reload()
    }
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
      <nav style={navStyle}>
        {navItems.map((item) => {
          const { label, icon: Icon, to, muted, bubble } = item
          return (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            aria-current={to && activePath === to ? 'page' : undefined}
            className={`${to && activePath === to ? 'active' : ''} ${muted ? 'muted' : ''} ${item.mobileHidden ? 'mobile-hidden' : ''}`.trim() || undefined}
            onClick={to ? () => onNavigate(to) : undefined}
          >
            <Icon size={16} strokeWidth={2} />
            <span className={bubble ? 'rail-bubble' : 'rail-tooltip'}>{bubble ?? label}</span>
          </button>
          )
        })}
      </nav>
      <div className="rail-bottom">
        {railBottomItems.map(({ label, icon: Icon, muted }) => {
          const isNotifications = label === 'Notifications'
          
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              className={`${muted && !isNotifications ? 'muted' : ''} ${isNotifications && isOpen ? 'active' : ''} ${isNotifications ? 'rail-notifications-btn' : ''}`.trim() || undefined}
              onClick={isNotifications ? () => setIsOpen(!isOpen) : (label === 'Settings' ? handleSettingsClick : undefined)}
            >
              <Icon size={16} />
              {isNotifications && unreadCount > 0 && (
                <span className="rail-notification-badge">{unreadCount}</span>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export { SideRail }

