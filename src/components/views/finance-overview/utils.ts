import { 
  Utensils, ShoppingCart, Coffee, ShoppingBag, Scissors, 
  Fuel, Car, Train, Plane, Home, ReceiptText, ShieldCheck, 
  Film, MonitorPlay, Ticket, Stethoscope, Dumbbell, Pill, 
  Landmark, TrendingUp, HandCoins, Sparkles, WalletCards, 
  CircleDollarSign, Bike, Map, type LucideIcon 
} from 'lucide-react'

export const CATEGORY_COLORS: Record<string, string> = {
  'Home': '#4684ff',      // Royal Blue
  'To Home': '#4684ff',   // Legacy Royal Blue
  'Bills': '#ff6c61',     // Crimson
  'Food': '#039855',      // Emerald Green
  'Dining': '#10b981',    // Teal Green
  'Lending': '#7A5AF8',   // Royal Purple
  'Loan Recovery': '#0BA5EC', // Ocean Blue
  'Shopping': '#DC6803',  // Burnt Orange
  'Transport': '#0BA5EC', // Light Blue
  'Cycling': '#f97316',   // Bright Orange
  'Entertainment': '#DD2590', // Magenta
  'Outing': '#8b5cf6',    // Violet
  'Income': '#12B76A',    // Green for income
  'Salary': '#32D583',    // Light Green for salary
}

const FALLBACK_COLORS = ['#6172F3', '#12B76A', '#F79009', '#F04438', '#EE46BC', '#0E9384']

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
