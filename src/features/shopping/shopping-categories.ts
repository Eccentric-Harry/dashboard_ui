// How each shopping category looks: a Lucide icon and a muted hue (never neon). Labels and
// the aisle order live in lib/shopping.ts / types/shopping.ts so the pure maths can use them;
// keys are permanent once used.

import {
  Apple,
  Cookie,
  Croissant,
  CupSoda,
  Milk,
  Package,
  ShoppingBasket,
  Snowflake,
  Sparkles,
  SprayCan,
  Wheat,
  Flame,
  type LucideIcon,
} from 'lucide-react'
import { SHOPPING_CATEGORY_LABELS } from '@/lib/shopping'
import { toneStyle } from '@/lib/tone'
import type { ShoppingCategoryKey } from '@/types/shopping'

export interface ShoppingCategoryLook {
  label: string
  icon: LucideIcon
  /** Base hue; chips derive their wash, ink and border from it (and re-tint themselves in dark). */
  hue: string
}

const LOOKS: Record<ShoppingCategoryKey, Omit<ShoppingCategoryLook, 'label'>> = {
  PRODUCE: { icon: Apple, hue: '#6f9a6a' },
  DAIRY: { icon: Milk, hue: '#6f9bc0' },
  BAKERY: { icon: Croissant, hue: '#c4935a' },
  GRAINS: { icon: Wheat, hue: '#b39a5c' },
  SPICES: { icon: Flame, hue: '#c0705a' },
  PANTRY: { icon: Package, hue: '#9b8468' },
  SNACKS: { icon: Cookie, hue: '#bf7f98' },
  BEVERAGES: { icon: CupSoda, hue: '#5f9aa0' },
  FROZEN: { icon: Snowflake, hue: '#7b93c9' },
  HOUSEHOLD: { icon: SprayCan, hue: '#8791a0' },
  PERSONAL_CARE: { icon: Sparkles, hue: '#a58ac0' },
  OTHER: { icon: ShoppingBasket, hue: '#8a9590' },
}

export const categoryLook = (key: ShoppingCategoryKey): ShoppingCategoryLook => ({
  label: SHOPPING_CATEGORY_LABELS[key],
  ...LOOKS[key],
})

/**
 * Inline style for a category chip or icon disc: a pastel wash of its hue with ink pulled toward
 * the page ink so small text stays readable. In dark, theme-dark.css re-derives all three from
 * --chip-hue, so the literals here only ever render in light.
 */
export const categoryTone = (look: ShoppingCategoryLook, washAlpha = '1f', withBorder = false) =>
  toneStyle({
    hue: look.hue,
    bg: `${look.hue}${washAlpha}`,
    ink: `color-mix(in srgb, ${look.hue} 55%, #101312)`,
    ...(withBorder && { border: `${look.hue}38` }),
  })
