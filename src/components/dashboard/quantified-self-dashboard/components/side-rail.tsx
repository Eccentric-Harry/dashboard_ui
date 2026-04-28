import avatarImage from '../../../../assets/reference-crops/avatar.png'
import { type AppPath, navItems, railBottomItems } from '../data'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function SideRail({ activePath, onNavigate }: DashboardStageProps) {
  return (
    <aside className="side-rail" aria-label="Dashboard navigation">
      <img className="rail-avatar" src={avatarImage} alt="" />
      <nav>
        {navItems.map(({ label, icon: Icon, to, muted, bubble }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            aria-current={to && activePath === to ? 'page' : undefined}
            className={to && activePath === to ? 'active' : muted ? 'muted' : undefined}
            onClick={to ? () => onNavigate(to) : undefined}
          >
            <Icon size={16} strokeWidth={2} />
            <span className={bubble ? 'rail-bubble' : 'rail-tooltip'}>{bubble ?? label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-bottom">
        {railBottomItems.map(({ label, icon: Icon, muted }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            className={muted ? 'muted' : undefined}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </aside>
  )
}

export { SideRail }
