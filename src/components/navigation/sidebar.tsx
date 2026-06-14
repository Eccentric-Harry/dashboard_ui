import type { LucideIcon } from 'lucide-react'
import { CircleDollarSign, Home } from 'lucide-react'
import type { MouseEvent } from 'react'

import avatarImage from '../../assets/reference-crops/avatar_luffy.png'

type SidebarItem = {
  to: '/finance' | '/nutrition'
  label: string
  icon: LucideIcon
}

const sidebarItems: SidebarItem[] = [
  { to: '/finance', label: 'Finance', icon: CircleDollarSign },
  { to: '/nutrition', label: 'Nutrition', icon: Home },
]

type SidebarProps = {
  activePath: '/finance' | '/nutrition'
  onNavigate: (pathname: '/finance' | '/nutrition') => void
}

function Sidebar({ activePath, onNavigate }: SidebarProps) {
  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, pathname: '/finance' | '/nutrition') => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    onNavigate(pathname)
  }

  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <img className="app-sidebar__avatar" src={avatarImage} alt="" />
      <nav className="app-sidebar__nav" aria-label="Dashboard sections">
        {sidebarItems.map(({ to, label, icon: Icon }) => (
          <a
            key={to}
            href={to}
            aria-label={label}
            aria-current={activePath === to ? 'page' : undefined}
            className={`app-sidebar__link${activePath === to ? ' is-active' : ''}`}
            onClick={(event) => handleNavigate(event, to)}
          >
            <Icon size={16} strokeWidth={2} />
            <span className="app-sidebar__tooltip">{label}</span>
          </a>
        ))}
      </nav>
    </aside>
  )
}

export { Sidebar }