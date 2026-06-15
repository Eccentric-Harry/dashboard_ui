import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Dumbbell,
  Home,
  Utensils,
  MessageCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  TrendingDown,
  TrendingUp,
  Wallet,
  GraduationCap,
  Terminal,
} from 'lucide-react'

export type AppPath = '/home' | '/finance' | '/nutrition' | '/learnings' | '/workouts' | '/calendar' | '/prompts' | '/tasks'

export interface DashboardNavItem {
  label: string
  icon: LucideIcon
  to?: AppPath
  active?: boolean
  muted?: boolean
  bubble?: string
  mobileHidden?: boolean
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

const enableHomeRoute = import.meta.env.VITE_ENABLE_HOME_ROUTE === 'true'

export const navItems: DashboardNavItem[] = [
  ...(enableHomeRoute ? [{ label: 'Home', icon: Home, to: '/home' as const }] : []),
  { label: 'Learnings Map', icon: GraduationCap, to: '/learnings' },
  { label: 'Nutrition Overview', icon: Utensils, to: '/nutrition' },
  { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
  { label: 'Finance Overview', icon: CircleDollarSign, to: '/finance' },
  { label: 'Workouts', icon: Dumbbell, to: '/workouts' },
  { label: 'Prompts', icon: Terminal, to: '/prompts', mobileHidden: true },

  { label: 'Adjust', icon: SlidersHorizontal, muted: true },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks' },
  { label: 'People', icon: Users, muted: true },
  { label: 'Shield', icon: ShieldCheck, muted: true },
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
  { value: '₹1.5L', label: 'Total Income', icon: TrendingUp },
  { value: '₹80k', label: 'Expenses', icon: TrendingDown },
  { value: '₹70k', label: 'Net Savings', icon: Wallet },
] as const

export const costCards: CostCardConfig[] = [
  {
    titleLines: ['Food', 'Costs'],
    histogramData: [30, 45, 20, 60, 90, 45, 55, 30, 20, 15, 80, 50, 40],
    histogramActiveIndex: 4,
    value: '₹4.9k',
    percent: '28.3%',
    variant: 'food',
  },
  {
    titleLines: ['Travel', 'Costs'],
    histogramData: [10, 20, 60, 45, 50, 90, 80, 30, 20, 40, 50, 60, 70],
    histogramActiveIndex: 5,
    value: '₹2.5k',
    percent: '42.7%',
    variant: 'travel',
  },
  {
    titleLines: ['Savings', 'Monthly'],
    histogramData: [10, 30, 50, 60, 40, 20, 80, 100, 70, 50, 30, 60, 90],
    histogramActiveIndex: 7,
    value: '₹10k',
    percent: '15.9%',
    variant: 'saving',
  },
]

export const monthSwitchLabels = ['T', 'W', 'T'] as const

export const monthSwitchNumbers = ['28', '29', '30'] as const

export const mockTasksData: Record<number, { time: string; title: string }[]> = {
  1: [{ time: '10:00 AM', title: 'Design Review' }, { time: '02:00 PM', title: 'Team Sync' }],
  2: [{ time: '09:00 AM', title: 'Coffee Run' }, { time: '01:00 PM', title: 'Lunch with Client' }],
  3: [{ time: '11:00 AM', title: 'Client Sync' }],
  4: [{ time: '09:00 AM', title: 'Drafting Proposal' }, { time: '02:30 PM', title: 'Status Check' }],
  5: [{ time: '11:00 AM', title: '1on1 Meeting' }],
  6: [{ time: '09:00 AM', title: 'Coffee Run' }, { time: '01:00 PM', title: 'Lunch with Client' }],
  7: [{ time: '10:00 AM', title: 'Project Kickoff' }, { time: '02:00 PM', title: 'Sprint Planning' }],
  8: [{ time: '11:00 AM', title: 'Client Sync' }],
  9: [{ time: '01:00 PM', title: 'Performance Review' }],
  10: [
    { time: '08:00 AM', title: 'Gym Session' },
    { time: '10:30 AM', title: 'Daily Standup' },
    { time: '02:00 PM', title: 'Code Review' },
    { time: '04:00 PM', title: 'Deployment' },
  ],
  11: [{ time: '09:00 AM', title: 'Tech Talk' }, { time: '01:00 PM', title: 'Architecture Review' }],
  12: [{ time: '10:00 AM', title: 'Weekly Sync' }],
  14: [{ time: '12:00 PM', title: 'Doctor Appointment' }],
  15: [{ time: '03:00 PM', title: 'Interview Candidate' }],
  18: [{ time: '11:00 AM', title: 'Town Hall' }, { time: '02:30 PM', title: 'Bug Bash' }],
  19: [{ time: '09:00 AM', title: 'Team Building Activity' }],
  20: [{ time: '09:30 AM', title: 'Quarterly Planning' }],
  21: [{ time: '01:00 PM', title: 'Release Setup' }, { time: '04:00 PM', title: 'Retrospective' }],
  23: [{ time: '10:00 AM', title: 'Vendor Meeting' }],
  24: [{ time: '02:00 PM', title: 'Design Review' }],
  25: [{ time: '11:30 AM', title: 'Lunch and Learn' }],
  28: [{ time: '09:00 AM', title: 'Code Freeze' }],
  29: [{ time: '10:00 AM', title: 'Demo Preparation' }, { time: '01:00 PM', title: 'Stakeholder Demo' }],
  30: [
    { time: '09:00 AM', title: 'End of Month Review' },
    { time: '01:30 PM', title: 'Strategy Meeting' },
    { time: '03:00 PM', title: 'Project Kickoff' }
  ],
}

function dummyTest(){
  console.log("Just testing build...")
}

dummyTest();
