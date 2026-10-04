// Fen's cart, client side: names, slots, prices and Fen's pitch for each item. Prices
// mirror util/CampRules.ITEMS on the server, which is what actually charges — this list
// only draws the shop. The art for each id lives in components/pip-wear.tsx (worn) and
// components/camp-decor.tsx (camp).

import type { CampSlot, CampWearSlot } from '@/types/goals'

export interface CampItemInfo {
  id: string
  slot: CampSlot
  price: number
  name: string
  /** Fen's sales pitch. */
  pitch: string
}

export const CAMP_ITEMS: CampItemInfo[] = [
  { id: 'acorn-cap', slot: 'hat', price: 30, name: 'Acorn cap', pitch: 'Fresh off the old oak. Snug as a seed.' },
  { id: 'party-hat', slot: 'hat', price: 40, name: 'Party hat', pitch: 'For days that deserve a little noise.' },
  { id: 'beanie', slot: 'hat', price: 55, name: 'Knit beanie', pitch: 'Knitted on cold nights. Pom-pom at no extra charge.' },
  { id: 'straw-hat', slot: 'hat', price: 70, name: 'Straw hat', pitch: 'Keeps the sun off a growing sprout.' },
  { id: 'flower-crown', slot: 'hat', price: 90, name: 'Flower crown', pitch: 'Picked this morning. They never wilt — I asked nicely.' },
  { id: 'wizard-hat', slot: 'hat', price: 160, name: 'Wizard hat', pitch: 'Grants no powers. Probably.' },
  { id: 'crown', slot: 'hat', price: 260, name: 'Little crown', pitch: 'For a sprout who has kept a great many weeks.' },
  { id: 'bow-tie', slot: 'neck', price: 35, name: 'Bow tie', pitch: 'Instantly distinguished.' },
  { id: 'bandana', slot: 'neck', price: 45, name: 'Trail bandana', pitch: 'For long walks and longer weeks.' },
  { id: 'scarf', slot: 'neck', price: 50, name: 'Cosy scarf', pitch: 'Extra long. Mostly for flair.' },
  { id: 'round-glasses', slot: 'face', price: 60, name: 'Round glasses', pitch: 'For reading — or looking like you have.' },
  { id: 'star-shades', slot: 'face', price: 90, name: 'Star shades', pitch: 'The future’s bright. Be ready.' },
  { id: 'flower-bed', slot: 'decor', price: 50, name: 'Flower bed', pitch: 'A little patch of colour by the tent.' },
  { id: 'bunting', slot: 'decor', price: 60, name: 'Bunting', pitch: 'Every camp is a party with flags up.' },
  { id: 'mushroom-lamps', slot: 'decor', price: 80, name: 'Mushroom lamps', pitch: 'They glow at night. Very friendly fungi.' },
  { id: 'fairy-lights', slot: 'decor', price: 100, name: 'Fairy lights', pitch: 'Strung along the tent. Twinkly.' },
  { id: 'guitar', slot: 'decor', price: 120, name: 'Camp guitar', pitch: 'Three chords and a campfire. All you need.' },
  { id: 'telescope', slot: 'decor', price: 180, name: 'Telescope', pitch: 'For counting the stars you’ve earned.' },
]

export const campItem = (id: string) => CAMP_ITEMS.find((i) => i.id === id)

export const WEAR_SLOTS: { slot: CampWearSlot; label: string }[] = [
  { slot: 'hat', label: 'Hats' },
  { slot: 'neck', label: 'Neck' },
  { slot: 'face', label: 'Face' },
]

/** The buddy's name, or the default. */
export const buddyNameOf = (name?: string | null) => (name && name.trim()) || 'Pip'
