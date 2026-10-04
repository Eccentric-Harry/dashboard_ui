import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  BookOpen,
  Brain,
  Code,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Moon,
  Music,
  Palette,
  PenLine,
  Phone,
  Sprout,
  Target,
  Wallet,
} from 'lucide-react'

/**
 * The fixed icon set a goal can wear. The key is what the backend stores
 * (`Goal.icon`), so keys are forever — rename a label, never a key.
 */
export const GOAL_ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'book', label: 'Reading', icon: BookOpen },
  { key: 'dumbbell', label: 'Strength', icon: Dumbbell },
  { key: 'footprints', label: 'Walking', icon: Footprints },
  { key: 'bike', label: 'Cycling', icon: Bike },
  { key: 'graduation', label: 'Learning', icon: GraduationCap },
  { key: 'code', label: 'Building', icon: Code },
  { key: 'pen', label: 'Writing', icon: PenLine },
  { key: 'languages', label: 'Languages', icon: Languages },
  { key: 'music', label: 'Music', icon: Music },
  { key: 'palette', label: 'Making', icon: Palette },
  { key: 'leaf', label: 'Calm', icon: Leaf },
  { key: 'moon', label: 'Sleep', icon: Moon },
  { key: 'droplets', label: 'Water', icon: Droplets },
  { key: 'heart', label: 'Care', icon: Heart },
  { key: 'phone', label: 'Calls', icon: Phone },
  { key: 'coffee', label: 'Mornings', icon: Coffee },
  { key: 'wallet', label: 'Money', icon: Wallet },
  { key: 'brain', label: 'Focus', icon: Brain },
  { key: 'sprout', label: 'Growing', icon: Sprout },
]

const BY_KEY = new Map(GOAL_ICONS.map((i) => [i.key, i.icon]))

export function goalIcon(key: string | null | undefined): LucideIcon {
  return (key && BY_KEY.get(key)) || Target
}
