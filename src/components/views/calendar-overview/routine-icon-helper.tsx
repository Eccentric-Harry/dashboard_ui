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
  Sparkles,
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
  { pattern: /\b(doctor|dentist|checkup|medical|clinic|hospital|therapy|massage|wellness|physio|surgery|vaccine|injection|lab test|blood test|eye test|optical|dental)\b/, icon: Heart, color: '#dc2626', bg: '#fee2e2' },
  { pattern: /\b(workout|gym|exercise|run|jog|yoga|meditation|walk|fitness|training|pilates|stretch|cardio|swim|cycle|bike|hike|trek|sport|sports|work out)\b/, icon: Dumbbell, color: '#059669', bg: '#d1fae5' },
  { pattern: /\b(meeting|interview|standup|sync|1:1|one-on-one|catch.up|conference|retro|grooming|planning|appointment|reservation|booking)\b/, icon: Users, color: '#7c3aed', bg: '#f3e8ff' },
  { pattern: /\b(study|learn|read|book|course|class|lecture|tutorial|lesson|homework|assignment|exam|skill|certification|training session|workshop|seminar|webinar)\b/, icon: BookOpen, color: '#0891b2', bg: '#ecfeff' },
  { pattern: /\b(pay|bill|finance|budget|bank|money|invest|tax|invoice|salary|payment|expense|subscription|renew|insurance|claim|reimbursement)\b/, icon: Wallet, color: '#d97706', bg: '#fffbeb' },
  { pattern: /\b(lunch|dinner|breakfast|brunch|coffee|tea|meal|eat|food|restaurant|cafe|café|dining|snack|groceries|grocery|diet|fasting|intermittent)\b/, icon: Coffee, color: '#ea580c', bg: '#ffedd5' },
  { pattern: /\b(travel|trip|vacation|flight|plane|journey|commute|drive|road.trip|holiday|getaway|pack|packing|leave|day off|offline|out of office)\b/, icon: CalendarDays, color: '#0284c7', bg: '#e0f2fe' },
  { pattern: /\b(code|sprint|bug|feature|deploy|release|pull.request|pr\b|commit|push|refactor|code.review|qa\b|testing|hotfix|rollback|migration)\b/, icon: Monitor, color: '#2563eb', bg: '#eff6ff' },
  { pattern: /\b(party|celebration|birthday|anniversary|festival|concert|wedding|reception|gala)\b/, icon: PartyPopper, color: '#db2777', bg: '#fdf2f8' },
  { pattern: /\b(clean|organize|tidy|declutter|laundry|dishes|vacuum|mop|dust|wash|chore|housework|errand|repair|fix|maintenance|organizing)\b/, icon: Sparkles, color: '#ca8a04', bg: '#fef9c3' },
  { pattern: /\b(goal|objective|milestone|deadline|achieve|accomplish|target|quarterly|annual|kpi|okr|landmark)\b/, icon: Trophy, color: '#f59e0b', bg: '#fef3c7' },
  { pattern: /\b(call|phone|skype|facetime|discord|slack|message|text|email|inbox|correspondence)\b/, icon: Users, color: '#6366f1', bg: '#eef2ff' },
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

  if (category === 'work') return { icon: Briefcase, color: '#2563eb', bg: '#eff6ff' }
  if (category === 'health') return { icon: Heart, color: '#059669', bg: '#d1fae5' }
  if (category === 'learning') return { icon: BookOpen, color: '#0891b2', bg: '#ecfeff' }
  if (category === 'finance') return { icon: Wallet, color: '#d97706', bg: '#fffbeb' }
  if (category === 'social') return { icon: Users, color: '#db2777', bg: '#fdf2f8' }
  if (category === 'personal') return { icon: Home, color: '#7c3aed', bg: '#f3e8ff' }

  if (type === 'EVENT') return { icon: CalendarDays, color: '#7c3aed', bg: '#f3e8ff' }
  if (type === 'REMINDER') return { icon: Bell, color: '#d97706', bg: '#fef3c7' }
  if (type === 'MILESTONE') return { icon: Milestone, color: '#0891b2', bg: '#ecfeff' }

  return { icon: ListChecks, color: '#2563eb', bg: '#eff6ff' }
}
