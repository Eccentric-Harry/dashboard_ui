import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Bell,
  CheckSquare,
  CircleDollarSign,
  Compass,
  Crosshair,
  Eye,
  Home,
  Utensils,
  MessageCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'

export type AppPath = '/home' | '/finance' | '/nutrition'

export interface DashboardNavItem {
  label: string
  icon: LucideIcon
  to?: AppPath
  active?: boolean
  muted?: boolean
  bubble?: string
}

export interface CostCardConfig {
  titleLines: [string, string]
  histogramData: number[]
  histogramActiveIndex: number
  value: string
  percent: string
  variant: 'food' | 'travel' | 'saving'
}

export const dateTiles = [
  { value: '19', active: true },
  { value: '23', accent: true },
] as const

export const navItems: DashboardNavItem[] = [
  { label: 'Home', icon: Home, to: '/home' },
  { label: 'Nutrition Overview', icon: Utensils, to: '/nutrition' },
  { label: 'Finance Overview', icon: CircleDollarSign, to: '/finance' },
  { label: 'Adjust', icon: SlidersHorizontal },
  { label: 'Tasks', icon: CheckSquare, muted: true },
  { label: 'People', icon: Users, muted: true },
  { label: 'Shield', icon: ShieldCheck, muted: true },
  { label: 'Compass', icon: Compass, muted: true },
]

export const railBottomItems: DashboardNavItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Notifications', icon: Bell },
  { label: 'Messages', icon: MessageCircle, muted: true },
]

export const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const indicatorHeights = [22, 32, 47, 39, 57, 74, 93, 66, 82, 116, 8, 8]

export const calendarDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const calendarSelections = new Map([
  [1, '12 F'],
  [8, '14'],
  [10, '16'],
  [14, '08'],
  [15, '9s'],
  [16, '10s'],
  [20, '8c'],
  [6, '03'],
])

export const stripedCalendarCells = new Set([3, 4, 11, 12])

export const scaleLabels = ['0.0', '0.1', '0.2', '1.0', '1.5', '2']

export const assetRowLabels = ['0.34 BNB', '1.9 SOL', '0.09 BTC', '0.8 ETH']

export const savingsMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

export const waveform = [30, 45, 60, 40, 80, 100, 75]

export const earningsMetricRows = [
  { value: '₹14,500', suffix: 'INR', label: 'Target' },
  { value: '-₹1,200', label: 'Difference' },
  { value: '+₹2,400', label: 'Goals' },
] as const

export const earningsFooterItems = [
  { value: '23°', label: 'Success Rate', icon: Crosshair },
  { value: '19 m/s', label: 'Goes Up Percent', icon: BadgeCheck },
  { value: '64%', label: 'Positive', icon: Eye },
] as const

export const costCards: CostCardConfig[] = [
  {
    titleLines: ['Food', 'Costs'],
    histogramActiveIndex: 4,
    value: '₹4.9k',
    percent: '28.3%',
    variant: 'business',
  },
  {
    titleLines: ['Travel', 'Costs'],
    histogramActiveIndex: 5,
    value: '₹2.5k',
    percent: '42.7%',
    variant: 'travel',
  },
  {
    titleLines: ['Savings', 'Monthly'],
    histogramActiveIndex: 6,
    value: '₹10k',
    percent: '15.9%',
    variant: 'saving',
  },
]

export const monthSwitchLabels = ['M', 'M', 'W'] as const

export const monthSwitchNumbers = ['29', '30', '31'] as const

export const mockTasksData: Record<number, { time: string; title: string }[]> = {
  1: [{ time: '10:00 AM', title: 'Design Review' }, { time: '02:00 PM', title: 'Team Sync' }],
  6: [{ time: '09:00 AM', title: 'Coffee Run' }, { time: '01:00 PM', title: 'Lunch with Client' }],
  8: [{ time: '11:00 AM', title: 'Client Sync' }],
  10: [
    { time: '08:00 AM', title: 'Gym Session' },
    { time: '10:30 AM', title: 'Daily Standup' },
    { time: '02:00 PM', title: 'Code Review' },
    { time: '04:00 PM', title: 'Deployment' },
  ],
  14: [{ time: '12:00 PM', title: 'Doctor Appointment' }],
  15: [{ time: '03:00 PM', title: 'Interview Candidate' }],
  20: [{ time: '09:30 AM', title: 'Quarterly Planning' }],
  30: [
    { time: '09:00 AM', title: 'End of Month Review' },
    { time: '01:30 PM', title: 'Strategy Meeting' },
    { time: '03:00 PM', title: 'Project Kickoff' }
  ],
}
