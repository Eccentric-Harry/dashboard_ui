import {
  Activity,
  Bell,
  BookOpen,
  Briefcase,
  Code2,
  Coffee,
  Dumbbell,
  Flag,
  Home,
  ListChecks,
  Moon,
  NotebookPen,
  PartyPopper,
  Phone,
  Plane,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import type { CalendarItemType } from '@/types/calendar'

// Structured-style block icons: guessed from the title first, then the
// category, then the type. Colour always comes from calendar-colors.ts.
const TITLE_RULES: [RegExp, LucideIcon][] = [
  [/\b(doctor|dentist|checkup|clinic|hospital|therapy|physio|medicine|meds|pills?|vaccine)\b/, Activity],
  [/\b(gym|workout|work out|exercise|run|jog|yoga|walk|fitness|training|pilates|stretch|cardio|swim|cycle|hike|trek|sport)\b/, Dumbbell],
  [/\b(meditat\w*|sleep|nap|wind down|bed ?time|rest)\b/, Moon],
  [/\b(journal|diary|reflect\w*|write|writing|notes?)\b/, NotebookPen],
  [/\b(meeting|interview|standup|sync|1:1|one-on-one|catch.?up|retro|huddle|appointment)\b/, Users],
  [/\b(call|phone|facetime|zoom)\b/, Phone],
  [/\b(study|learn\w*|read\w*|book|course|class|lecture|tutorial|lesson|homework|exam|leetcode|practice)\b/, BookOpen],
  [/\b(code|coding|sprint|bug|feature|deploy|release|refactor|review|pr|build|ship)\b/, Code2],
  [/\b(pay|bill|budget|bank|money|invest\w*|tax|invoice|salary|rent|emi|insurance)\b/, Wallet],
  [/\b(lunch|dinner|breakfast|brunch|coffee|tea|meal|cook\w*|groceries|grocery|snack)\b/, Coffee],
  [/\b(travel|trip|flight|vacation|holiday|commute|drive|pack\w*|airport)\b/, Plane],
  [/\b(party|birthday|anniversary|festival|concert|wedding|celebrat\w*|movie|date night)\b/, PartyPopper],
  [/\b(clean\w*|tidy|laundry|dishes|chores?|errands?|repair|fix)\b/, Home],
  [/\b(goal|deadline|milestone|launch|due|submit)\b/, Flag],
]

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  work: Briefcase,
  health: Activity,
  learning: BookOpen,
  finance: Wallet,
  social: Users,
  personal: Sparkles,
  movies: PartyPopper,
}

const TYPE_ICONS: Record<CalendarItemType, LucideIcon> = {
  TASK: ListChecks,
  EVENT: Users,
  REMINDER: Bell,
  MILESTONE: Flag,
}

export function iconForItem(item: { title?: string; category?: string; itemType?: CalendarItemType }): LucideIcon {
  const title = (item.title || '').toLowerCase()
  for (const [re, icon] of TITLE_RULES) {
    if (re.test(title)) return icon
  }
  const byCategory = CATEGORY_ICONS[(item.category || '').trim().toLowerCase()]
  if (byCategory) return byCategory
  return TYPE_ICONS[item.itemType ?? 'TASK'] ?? ListChecks
}

export { TYPE_ICONS }
