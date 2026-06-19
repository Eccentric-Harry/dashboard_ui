import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  Coffee,
  Dumbbell,
  Heart,
  Home,
  ListChecks,
  Milestone,
  Monitor,
  PartyPopper,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'

interface RoutineIconDetails {
  icon: typeof ListChecks
  color: string
  bg: string
}

const rules: { pattern: RegExp; icon: typeof ListChecks; color: string; bg: string }[] = [
  { pattern: /\b(doctor|dentist|checkup|medical|clinic|hospital|therapy|massage|wellness|physio|surgery|vaccine|injection|lab test|blood test|eye test|optical|dental|medicine|medication|meds|pill|pills|supplement|supplements)\b/, icon: Heart, color: '#be123c', bg: '#fce8ec' },
  { pattern: /\b(workout|gym|exercise|run|jog|yoga|meditation|walk|fitness|training|pilates|stretch|cardio|swim|cycle|bike|hike|trek|sport|sports|work out)\b/, icon: Dumbbell, color: '#047857', bg: '#e0f2ec' },
  { pattern: /\b(meeting|interview|standup|sync|1:1|one-on-one|catch.up|conference|retro|grooming|planning|appointment|reservation|booking)\b/, icon: Users, color: '#6d28d9', bg: '#f0ebf7' },
  { pattern: /\b(study|learn|read|book|course|class|lecture|tutorial|lesson|homework|assignment|exam|skill|certification|training session|workshop|seminar|webinar)\b/, icon: BookOpen, color: '#0e7490', bg: '#e8f4f7' },
  { pattern: /\b(pay|bill|finance|budget|bank|money|invest|tax|invoice|salary|payment|expense|subscription|renew|insurance|claim|reimbursement)\b/, icon: Wallet, color: '#b45309', bg: '#f7f0df' },
  { pattern: /\b(lunch|dinner|breakfast|brunch|coffee|tea|meal|eat|food|restaurant|cafe|café|dining|snack|groceries|grocery|diet|fasting|intermittent)\b/, icon: Coffee, color: '#c2410c', bg: '#f7ede5' },
  { pattern: /\b(travel|trip|vacation|flight|plane|journey|commute|drive|road.trip|holiday|getaway|pack|packing|leave|day off|offline|out of office)\b/, icon: CalendarDays, color: '#0369a1', bg: '#e5f1f7' },
  { pattern: /\b(code|sprint|bug|feature|deploy|release|pull.request|pr\b|commit|push|refactor|code.review|qa\b|testing|hotfix|rollback|migration)\b/, icon: Monitor, color: '#1d4ed8', bg: '#e9eef7' },
  { pattern: /\b(party|celebration|birthday|anniversary|festival|concert|wedding|reception|gala)\b/, icon: PartyPopper, color: '#be185d', bg: '#f7e8ef' },
  { pattern: /\b(clean|organize|tidy|declutter|laundry|dishes|vacuum|mop|dust|wash|chore|housework|errand|repair|fix|maintenance|organizing)\b/, icon: ListChecks, color: '#a16207', bg: '#f7f0df' },
  { pattern: /\b(goal|objective|milestone|deadline|achieve|accomplish|target|quarterly|annual|kpi|okr|landmark)\b/, icon: Trophy, color: '#d97706', bg: '#f7f0df' },
  { pattern: /\b(call|phone|skype|facetime|discord|slack|message|text|email|inbox|correspondence)\b/, icon: Users, color: '#6366f1', bg: '#eef0f7' },
]

export const getRoutineIconDetails = (item: {
  itemType?: string
  title?: string
  category?: string
  notes?: string
}): RoutineIconDetails => {
  const title = (item.title || '').toLowerCase().trim()
  const category = (item.category || '').toLowerCase().trim()
  const notes = (item.notes || '').toLowerCase().trim()
  const type = (item.itemType || '').toUpperCase()
  const text = `${title} ${notes}`

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return rule
    }
  }

  if (category === 'work') return { icon: Briefcase, color: '#1d4ed8', bg: '#e9eef7' }
  if (category === 'health') return { icon: Heart, color: '#be123c', bg: '#fce8ec' }
  if (category === 'learning') return { icon: BookOpen, color: '#0e7490', bg: '#e8f4f7' }
  if (category === 'finance') return { icon: Wallet, color: '#b45309', bg: '#f7f0df' }
  if (category === 'social') return { icon: Users, color: '#be185d', bg: '#f7e8ef' }
  if (category === 'personal') return { icon: Home, color: '#6d28d9', bg: '#f0ebf7' }

  if (type === 'EVENT') return { icon: CalendarDays, color: '#6d28d9', bg: '#f0ebf7' }
  if (type === 'REMINDER') return { icon: Bell, color: '#b45309', bg: '#f7f0df' }
  if (type === 'MILESTONE') return { icon: Milestone, color: '#0e7490', bg: '#e8f4f7' }

  return { icon: ListChecks, color: '#1d4ed8', bg: '#e9eef7' }
}
