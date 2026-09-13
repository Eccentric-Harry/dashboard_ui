import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Brain,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Dumbbell,
  GraduationCap,
  Home,
  LogOut,
  Terminal,
  Users,
  Utensils,
} from 'lucide-react'

import type { AppPath } from './routes'

export interface DashboardNavItem {
  label: string
  icon: LucideIcon
  to?: AppPath
  active?: boolean
  muted?: boolean
  bubble?: string
  mobileHidden?: boolean
  desktopHidden?: boolean
}

// Desktop sidebar nav — the full route list
export const navItems: DashboardNavItem[] = [
  { label: 'Home', icon: Home, to: '/home' },
  { label: 'Learnings Map', icon: GraduationCap, to: '/learnings' },
  { label: 'Nutrition Overview', icon: Utensils, to: '/nutrition' },
  { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
  { label: 'Finance Overview', icon: CircleDollarSign, to: '/finance' },
  { label: 'Workouts', icon: Dumbbell, to: '/workouts' },
  { label: 'Prompts', icon: Terminal, to: '/prompts' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
  { label: 'Mind Space', icon: Brain, to: '/mind' },
  { label: 'People', icon: Users, to: '/people' },
]

/**
 * Mobile bottom dock order. The dock is sized to show four routes at a time
 * (see --dock-visible-count in styles/index.css) and still scrolls horizontally
 * for the rest, so the four checked daily lead the list — they're what's on
 * screen at rest, everything else is one swipe away.
 */
const MOBILE_DOCK_LEAD: AppPath[] = ['/home', '/nutrition', '/calendar', '/tasks']

const isLeadItem = (item: DashboardNavItem) => Boolean(item.to && MOBILE_DOCK_LEAD.includes(item.to))

export const mobileNavItems: DashboardNavItem[] = [
  ...MOBILE_DOCK_LEAD.map((path) => navItems.find((item) => item.to === path)).filter(
    (item): item is DashboardNavItem => item != null,
  ),
  ...navItems.filter((item) => !isLeadItem(item)),
]

export const railBottomItems: DashboardNavItem[] = [
  { label: 'Logout', icon: LogOut },
  { label: 'Notifications', icon: Bell },
]
