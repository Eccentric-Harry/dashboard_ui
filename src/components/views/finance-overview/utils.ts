import { 
  Utensils, ShoppingCart, Coffee, ShoppingBag, Scissors, 
  Fuel, Car, Train, Plane, Home, ReceiptText, ShieldCheck, 
  Film, MonitorPlay, Ticket, Stethoscope, Dumbbell, Pill, 
  Landmark, TrendingUp, HandCoins, Sparkles, WalletCards, 
  CircleDollarSign, Bike, Map, type LucideIcon 
} from 'lucide-react'

/**
 * Category palette — desaturated, one family.
 *
 * These were fully saturated (royal blue, crimson, emerald, magenta, bright orange),
 * which is what made the spending donut read as a stock analytics widget rather than
 * part of this app; CLAUDE.md's design system forbids saturated colour outright. Every
 * hue below is muted into the same pastel family the rest of Life OS uses, still far
 * enough apart to stay legible as adjacent donut arcs and 24px category chips.
 *
 * Rule for new entries: keep saturation low and lightness in the 45–60% band. Nothing
 * here may compete with the accent yellow (#eaff28) or the danger rose (#f16977) —
 * those two carry meaning and stop meaning anything if a category borrows their weight.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  'Home': '#5f6bab',           // dusty indigo
  'To Home': '#5f6bab',        // legacy alias
  'Bills': '#b4707a',          // clay rose — near danger, deliberately softer
  'Food': '#5f8a6a',           // sage
  'Dining': '#4e7a63',         // deeper sage
  'Lending': '#7a74a8',        // muted violet
  'Loan Recovery': '#4f8a9a',  // dusty teal
  'Shopping': '#b1935a',       // warm ochre
  'Groceries': '#8c9153',      // olive — previously hashed to a teal too close to Transport
  'Transport': '#5d87ad',      // slate blue
  'Cycling': '#b57f5f',        // terracotta
  'Entertainment': '#a1739b',  // mauve
  'Outing': '#7d84c4',         // periwinkle
  'Income': '#4e8a72',         // moss
  'Salary': '#6f9e7f',         // light moss
}

const FALLBACK_COLORS = ['#6f78b5', '#5f8a6a', '#b1935a', '#b4707a', '#a1739b', '#4f8a9a']

export const getConsistentColor = (label: string) => {
  if (CATEGORY_COLORS[label]) return CATEGORY_COLORS[label]
  
  // Check for partial matches
  const entries = Object.entries(CATEGORY_COLORS)
  for (const [key, value] of entries) {
    if (label.toLowerCase().includes(key.toLowerCase())) return value
  }

  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]
}

export function getIconForCategory(category: string): LucideIcon {
  const cat = category.toLowerCase()
  
  // Food & Dining
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return Utensils
  if (cat.includes('grocer') || cat.includes('supermarket')) return ShoppingCart
  if (cat.includes('coffee') || cat.includes('cafe')) return Coffee
  
  // Shopping & Personal Care
  if (cat.includes('shopping') || cat.includes('retail') || cat.includes('clothing')) return ShoppingBag
  if (cat.includes('salon') || cat.includes('hair') || cat.includes('care')) return Scissors
  
  // Transport
  if (cat.includes('bike') || cat.includes('cycling')) return Bike
  if (cat.includes('gas') || cat.includes('fuel')) return Fuel
  if (cat.includes('car') || cat.includes('auto') || cat.includes('uber')) return Car
  if (cat.includes('train') || cat.includes('transit') || cat.includes('subway') || cat.includes('bus')) return Train
  if (cat.includes('flight') || cat.includes('travel')) return Plane
  if (cat.includes('transport')) return Car
  
  // Housing & Bills
  if (cat.includes('home') || cat.includes('rent') || cat.includes('mortgage')) return Home
  if (cat.includes('bill') || cat.includes('utilit')) return ReceiptText
  if (cat.includes('insur')) return ShieldCheck
  
  // Entertainment & Subs
  if (cat.includes('outing') || cat.includes('trip') || cat.includes('tour')) return Map
  if (cat.includes('movie') || cat.includes('cinema')) return Film
  if (cat.includes('sub') || cat.includes('streaming') || cat.includes('netflix')) return MonitorPlay
  if (cat.includes('entertain') || cat.includes('ticket') || cat.includes('event')) return Ticket
  
  // Health & Fitness
  if (cat.includes('health') || cat.includes('medical') || cat.includes('doctor')) return Stethoscope
  if (cat.includes('gym') || cat.includes('fitness') || cat.includes('sport')) return Dumbbell
  if (cat.includes('pharmacy') || cat.includes('medicine')) return Pill
  
  // Income & Investments
  if (cat.includes('salary') || cat.includes('income')) return Landmark
  if (cat.includes('invest') || cat.includes('stock')) return TrendingUp
  if (cat.includes('lend') || cat.includes('borrow')) return HandCoins
  if (cat.includes('loan') || cat.includes('recovery') || cat.includes('repay')) return HandCoins
  
  // Miscellaneous
  if (cat.includes('misc') || cat.includes('other')) return Sparkles
  
  // Fallbacks
  if (cat.includes('card')) return WalletCards
  return CircleDollarSign
}
