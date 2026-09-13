import { createElement } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  BookOpen,
  Brain,
  Briefcase,
  Code2,
  DollarSign,
  Dumbbell,
  Film,
  FolderKanban,
  GraduationCap,
  Hash,
  HeartPulse,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Plane,
  Rocket,
  Server,
  ShoppingCart,
  User,
  Users,
  Wrench,
} from 'lucide-react'

/**
 * One glyph per task category, shared by the filter chips, the list headers and
 * the add-task preview so a category always wears the same icon. Custom
 * categories fall back to a keyword match, then to "#".
 */
const EXACT: Record<string, LucideIcon> = {
  work: Briefcase,
  career: Rocket,
  learning: BookOpen,
  study: GraduationCap,
  fitness: Dumbbell,
  health: HeartPulse,
  mind: Brain,
  shopping: ShoppingCart,
  chores: Home,
  home: Home,
  finance: DollarSign,
  personal: User,
  social: Users,
  movies: Film,
  projects: FolderKanban,
  development: Code2,
  frontend: LayoutTemplate,
  backend: Server,
  devops: Server,
  travel: Plane,
  maintenance: Wrench,
  dashboard: LayoutDashboard,
  general: Hash,
}

const KEYWORDS: [RegExp, LucideIcon][] = [
  [/code|dev|engineer|api|program/, Code2],
  [/design|ui|ux|front/, LayoutTemplate],
  [/server|infra|ops|cloud|deploy/, Server],
  [/learn|study|course|read|book/, BookOpen],
  [/gym|run|workout|fit|sport/, Dumbbell],
  [/health|medic|doctor|care/, HeartPulse],
  [/mind|mental|medit|journal/, Brain],
  [/money|budget|bill|pay|finan/, DollarSign],
  [/movie|film|watch|show|series/, Film],
  [/project/, FolderKanban],
  [/trip|travel/, Plane],
  [/friend|family|social/, Users],
  [/career|job|interview/, Rocket],
]

function iconFor(category: string): LucideIcon {
  const key = category.trim().toLowerCase()
  return EXACT[key] ?? KEYWORDS.find(([re]) => re.test(key))?.[1] ?? Hash
}

export function CategoryIcon({ category, ...props }: LucideProps & { category: string }) {
  // createElement rather than `const Icon = …; <Icon />`: the icon is looked up,
  // not defined, per render, but the lint rule can't tell the two apart.
  return createElement(iconFor(category), props)
}
