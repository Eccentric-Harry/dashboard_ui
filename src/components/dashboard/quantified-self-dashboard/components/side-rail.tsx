import type { CSSProperties } from 'react'
import avatarImage from '../../../../assets/reference-crops/avatar.png'
import { type AppPath, navItems, railBottomItems } from '../data'
import { useNotifications } from '../../../../contexts/NotificationContext'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function SideRail({ activePath, onNavigate }: DashboardStageProps) {
  const { unreadCount, isOpen, setIsOpen } = useNotifications()

  const mobileNavItems = navItems.filter((item) => item.to && !item.mobileHidden)
  const activeMobileIndex = Math.max(
    0,
    mobileNavItems.findIndex((item) => item.to === activePath),
  )
  const navStyle = {
    '--active-index': activeMobileIndex,
    '--visible-count': mobileNavItems.length,
  } as CSSProperties

  return (
    <aside className="side-rail" aria-label="Dashboard navigation">
      <img className="rail-avatar" src={avatarImage} alt="" />
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
              className={`${muted && !isNotifications ? 'muted' : ''} ${isNotifications && isOpen ? 'active' : ''}`.trim() || undefined}
              onClick={isNotifications ? () => setIsOpen(!isOpen) : undefined}
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

