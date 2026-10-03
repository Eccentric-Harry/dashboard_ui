// Savings-goal icons — Lucide, the same family as the category icons, so a goal sits in
// the ledger and the chips like everything else on /finance. A goal stores the key, never
// the component; keys are permanent once a goal has saved one.

import {
  Backpack,
  Bike,
  Camera,
  Car,
  Coins,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Guitar,
  Headphones,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Mountain,
  PiggyBank,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sprout,
  Target,
  Ticket,
  TrainFront,
  TreePalm,
  Umbrella,
  Watch,
  type LucideIcon,
} from 'lucide-react'
import type { SavingsGoal, SavingsGoalKind } from '@/types/finance'
import type { GoalColor } from '@/lib/finance-goals'

export const GOAL_ICONS: Record<string, LucideIcon> = {
  bag: ShoppingBag,
  phone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  camera: Camera,
  watch: Watch,
  gamepad: Gamepad2,
  bike: Bike,
  car: Car,
  sofa: Sofa,
  guitar: Guitar,
  plane: Plane,
  beach: TreePalm,
  mountain: Mountain,
  train: TrainFront,
  backpack: Backpack,
  ticket: Ticket,
  gift: Gift,
  ring: Gem,
  graduation: GraduationCap,
  home: House,
  shield: ShieldCheck,
  health: HeartPulse,
  umbrella: Umbrella,
  piggy: PiggyBank,
  sprout: Sprout,
  bank: Landmark,
  target: Target,
  coins: Coins,
}

/** What the new-goal picker offers for each kind — the first is the kind's default. */
export const ICONS_BY_KIND: Record<SavingsGoalKind, string[]> = {
  PURCHASE: ['bag', 'phone', 'laptop', 'headphones', 'camera', 'watch', 'gamepad', 'bike', 'car', 'sofa', 'guitar'],
  TRIP: ['plane', 'beach', 'mountain', 'train', 'backpack', 'ticket', 'gift', 'ring', 'graduation', 'home'],
  SAFETY_NET: ['shield', 'umbrella', 'health', 'home', 'bank'],
  OPEN: ['piggy', 'sprout', 'coins', 'bank', 'target'],
}

export const defaultIconFor = (kind: SavingsGoalKind): string => ICONS_BY_KIND[kind][0]

/** The goal's icon key, falling back to its kind's default for an unknown or missing key. */
export const iconKeyOf = (goal: Pick<SavingsGoal, 'icon' | 'kind'>): string =>
  goal.icon && GOAL_ICONS[goal.icon] ? goal.icon : defaultIconFor(goal.kind)

export const goalIcon = (goal: Pick<SavingsGoal, 'icon' | 'kind'>): LucideIcon => GOAL_ICONS[iconKeyOf(goal)]

/** A goal as a chip or a ledger tag shows it: its name, icon and hue. */
export interface GoalTag {
  name: string
  icon: string
  color?: GoalColor
}
