import {
  Apple,
  Bean,
  Coffee,
  Cookie,
  CupSoda,
  GlassWater,
  Milk,
  Pill,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  Candy
} from 'lucide-react'

// Custom high-fidelity food icons designed to perfectly match the Lucide design language
interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

export const Cheese = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 20v-5.8a1 1 0 0 0-.6-.9L4.9 6.5A1 1 0 0 0 3.5 7.4V20a2 2 0 0 0 2 2h13a2 2 0 0 0 1.5-.7z" />
    <circle cx="9" cy="17" r="1.2" fill={color} />
    <circle cx="14" cy="15" r="0.9" fill={color} />
    <circle cx="8" cy="12" r="0.9" fill={color} />
  </svg>
)

export const Banana = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22c7.2-1.5 14-8 16-16 0-.8-.3-1.6-1-2.2-.6-.7-1.4-1-2.2-1C10.8 4.8 4.3 11.6 2.8 18.8c-.3 1.2.2 2.4 1.2 3.2z" />
    <path d="M18 4l2-2" />
  </svg>
)

export const Egg = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2C7.5 2 4 7 4 12s3.5 10 8 10 8-5 8-10-3.5-10-8-10z" />
    <path d="M15 9a3 3 0 0 0-3-3" />
  </svg>
)

export const Fish = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 12c-4 3-9 3-13 1l-6 5v-12l6 5c4-2 9-2 13 1z" />
    <circle cx="17" cy="11" r="1" fill={color} />
    <path d="M4 6v12" />
  </svg>
)

export const Drumstick = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.4 9.5a6 6 0 1 0-7.9 7.9l-3 3a1.5 1.5 0 0 0 2.1 2.1l3-3a6 6 0 0 0 7.9-7.9z" />
    <path d="M3 21a1.5 1.5 0 0 1-2.1-2.1" />
  </svg>
)

export const Croissant = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 16.5c2-2.5 5.5-4.5 9.5-4.5s7.5 2 9.5 4.5" />
    <path d="M12 12a14.6 14.6 0 0 1 8-5.5" />
    <path d="M4 6.5A14.6 14.6 0 0 1 12 12" />
    <path d="M8 8.5C10 5.5 14 5.5 16 8.5" />
  </svg>
)

export const IceCream = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22l5-12H7l5 12z" />
    <path d="M17 10c0-2.8-2.2-5-5-5s-5 2.2-5 5h10z" />
    <circle cx="12" cy="3" r="1.2" fill={color} />
  </svg>
)

export const Citrus = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
    <line x1="4.9" y1="19.1" x2="19.1" y2="4.9" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
)

export const Grape = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="9" r="2.5" />
    <circle cx="9.5" cy="13" r="2.5" />
    <circle cx="14.5" cy="13" r="2.5" />
    <circle cx="12" cy="17" r="2.5" />
    <path d="M12 6.5V3c0-.6.4-1 1-1" />
  </svg>
)

export const Rice = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12h18" />
    <path d="M4 12a8 8 0 0 0 16 0" />
    <path d="M5 12c0-3.5 3-6 7-6s7 2.5 7 6" />
    <path d="M9 3c.5-.5.5-1 0-1.5" />
    <path d="M12 3c.5-.5.5-1 0-1.5" />
    <path d="M15 3c.5-.5.5-1 0-1.5" />
  </svg>
)

// Map of meal type colors for consistent decorative borders
export const mealDotColors: Record<string, string> = {
  Breakfast: '#f97316', // Premium Orange
  Lunch: '#059669', // Premium Emerald Green
  Dinner: '#38bdf8', // Sky Blue
  Snack: '#a78bfa', // Lavender
  Midnight: '#6366f1', // Indigo
  'Post Workout': '#f87171', // Coral Red
  'Mid-Morning': '#fb923c', // Warm Peach
}

export const getFoodIconDetails = (description: string = '', mealType: string = '') => {
  const desc = description.toLowerCase()
  const meal = mealType.toLowerCase()

  // 1. Supplements & Pills
  if (desc.includes('creatine') || desc.includes('protein powder') || desc.includes('whey') || desc.includes('pill') || desc.includes('vitamin') || desc.includes('capsule') || desc.includes('tablet') || desc.includes('supplement')) {
    return { icon: Pill, color: '#2563eb', bg: '#eff6ff' } // High-performance royal blue
  }

  // 2. Beverages & Coffee
  if (desc.includes('coffee') || desc.includes('tea') || desc.includes('chai') || desc.includes('latte') || desc.includes('cappuccino') || desc.includes('espresso') || desc.includes('macchiato')) {
    return { icon: Coffee, color: '#854d0e', bg: '#fef9c3' } // Warm roasted amber brown
  }
  if (desc.includes('water') || desc.includes('hydrate') || desc.includes('hydration') || desc.includes('coconut water') || desc.includes('nariyal')) {
    return { icon: GlassWater, color: '#0284c7', bg: '#e0f2fe' } // Cool mineral sky blue
  }
  if (desc.includes('shake') || desc.includes('smoothie') || desc.includes('juice') || desc.includes('drink') || desc.includes('soda') || desc.includes('cola') || desc.includes('pepsi') || desc.includes('sprite')) {
    return { icon: CupSoda, color: '#059669', bg: '#d1fae5' } // Vibrant mint green
  }
  if (desc.includes('bacardi') || desc.includes('alcohol') || desc.includes('cocktail') || desc.includes('wine') || desc.includes('beer') || desc.includes('whiskey') || desc.includes('vodka')) {
    return { icon: GlassWater, color: '#dc2626', bg: '#fee2e2' } // Deep red spirits theme
  }

  // 3. Indian Paneer & Tofu (High Protein Blocks)
  if (desc.includes('paneer') || desc.includes('tofu') || desc.includes('cottage cheese') || desc.includes('chena') || desc.includes('soya chunks') || desc.includes('soy chunks')) {
    return { icon: Cheese, color: '#0d9488', bg: '#ccfbf1' } // Refreshing protein teal with cheese block icon
  }

  // 4. Dairy & Curd
  if (desc.includes('curd') || desc.includes('yogurt') || desc.includes('dahi') || desc.includes('buttermilk') || desc.includes('lassi') || desc.includes('raita') || desc.includes('milk') || desc.includes('dairy') || desc.includes('cheese')) {
    return { icon: Milk, color: '#4f46e5', bg: '#e0e7ff' } // Indigo dairy sky theme
  }

  // 5. Indian Flatbreads (Roti, Chapati, Naan)
  if (desc.includes('roti') || desc.includes('chapati') || desc.includes('chapatti') || desc.includes('paratha') || desc.includes('parantha') || desc.includes('naan') || desc.includes('phulka') || desc.includes('thepla') || desc.includes('puri') || desc.includes('poori') || desc.includes('flatbread') || desc.includes('kulcha') || desc.includes('roti/chapati')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fffbeb' } // Earthy warm amber wheat
  }

  // 6. Rice Staples
  if (desc.includes('rice') || desc.includes('biryani') || desc.includes('pulao') || desc.includes('fried rice') || desc.includes('khichdi') || desc.includes('jeera rice') || desc.includes('risotto') || desc.includes('basmati')) {
    return { icon: Rice, color: '#b45309', bg: '#fef3c7' } // Warm golden rice bowl
  }

  // 7. Lentils, Dals, and Indian Curries
  if (desc.includes('dal') || desc.includes('dhal') || desc.includes('sambar') || desc.includes('rasam') || desc.includes('curry') || desc.includes('chole') || desc.includes('rajma') || desc.includes('korma') || desc.includes('gravy') || desc.includes('kadhi') || desc.includes('paneer masala')) {
    return { icon: Soup, color: '#ea580c', bg: '#ffedd5' } // Spiced orange bowl
  }

  // 8. Oats & Porridge
  if (desc.includes('oats') || desc.includes('oatmeal') || desc.includes('porridge') || desc.includes('muesli') || desc.includes('granola') || desc.includes('cereal') || desc.includes('cornflakes')) {
    return { icon: Soup, color: '#d97706', bg: '#fffbeb' } // Golden fiber oats bowl
  }

  // 9. Eggs
  if (desc.includes('egg') || desc.includes('eggs') || desc.includes('omelet') || desc.includes('omlet') || desc.includes('scrambled') || desc.includes('boiled egg') || desc.includes('bhurji')) {
    return { icon: Egg, color: '#d97706', bg: '#fffbeb' } // Sunshine yellow egg theme
  }

  // 10. Meat & Chicken
  if (desc.includes('chicken') || desc.includes('meat') || desc.includes('beef') || desc.includes('mutton') || desc.includes('pork') || desc.includes('kebab') || desc.includes('tikka') || desc.includes('steak') || desc.includes('lamb') || desc.includes('bacon')) {
    return { icon: Drumstick, color: '#b45309', bg: '#fef3c7' } // Hearty golden savory meat
  }

  // 11. Fish & Seafood
  if (desc.includes('fish') || desc.includes('salmon') || desc.includes('tuna') || desc.includes('shrimp') || desc.includes('prawn') || desc.includes('seafood') || desc.includes('crab') || desc.includes('lobster')) {
    return { icon: Fish, color: '#0891b2', bg: '#ecfeff' } // Cyan deep water seafood
  }

  // 12. Specific Fruits
  if (desc.includes('banana') || desc.includes('bananas')) {
    return { icon: Banana, color: '#ca8a04', bg: '#fef9c3' } // Ripe bright yellow banana
  }
  if (desc.includes('orange') || desc.includes('citrus') || desc.includes('lemon') || desc.includes('lime') || desc.includes('grapefruit') || desc.includes('mosambi') || desc.includes('sweet lime')) {
    return { icon: Citrus, color: '#f97316', bg: '#ffedd5' } // Zesty citrus orange
  }
  if (desc.includes('grape') || desc.includes('grapes') || desc.includes('raisin') || desc.includes('raisins') || desc.includes('kishmish')) {
    return { icon: Grape, color: '#7c3aed', bg: '#f3e8ff' } // Sweet purple grape theme
  }
  if (desc.includes('apple') || desc.includes('fruit') || desc.includes('berry') || desc.includes('berries') || desc.includes('strawberry') || desc.includes('cherry') || desc.includes('pomegranate') || desc.includes('mango') || desc.includes('papaya') || desc.includes('watermelon') || desc.includes('guava')) {
    return { icon: Apple, color: '#e11d48', bg: '#fff1f2' } // Vibrant crimson rose apple/fruit
  }

  // 13. Fast Food & Pizza
  if (desc.includes('pizza')) {
    return { icon: Pizza, color: '#ea580c', bg: '#ffedd5' } // Tangy pizza orange
  }
  if (desc.includes('sandwich') || desc.includes('burger') || desc.includes('wrap') || desc.includes('bread') || desc.includes('toast') || desc.includes('taco') || desc.includes('burrito') || desc.includes('shawarma') || desc.includes('subway')) {
    return { icon: Sandwich, color: '#ca8a04', bg: '#fef9c3' } // Toasted sandwich yellow-brown
  }
  if (desc.includes('croissant') || desc.includes('bun') || desc.includes('pastry') || desc.includes('bagel') || desc.includes('muffin') || desc.includes('donut')) {
    return { icon: Croissant, color: '#c2410c', bg: '#ffedd5' } // Flaky brown croissant
  }

  // 14. Sweets & Desserts
  if (desc.includes('ice cream') || desc.includes('gelato') || desc.includes('kulfi') || desc.includes('sundae') || desc.includes('sorbet') || desc.includes('froyo') || desc.includes('frozen yogurt')) {
    return { icon: IceCream, color: '#db2777', bg: '#fdf2f8' } // Creamy magenta ice cream
  }
  if (desc.includes('cookie') || desc.includes('biscuit') || desc.includes('chocolate') || desc.includes('brownie') || desc.includes('waffle') || desc.includes('pancake') || desc.includes('cake') || desc.includes('sweet') || desc.includes('crepe')) {
    return { icon: Cookie, color: '#78350f', bg: '#fef3c7' } // Indulgent chocolate cookie brown
  }
  if (desc.includes('candy') || desc.includes('sweets') || desc.includes('mithai') || desc.includes('gulab jamun') || desc.includes('jalebi') || desc.includes('halwa') || desc.includes('barfi')) {
    return { icon: Candy, color: '#ec4899', bg: '#fce7f3' } // Playful pink candy theme
  }

  // 15. Savory Crunchy Snacks
  if (desc.includes('chips') || desc.includes('crisps') || desc.includes('popcorn') || desc.includes('nachos') || desc.includes('namkeen') || desc.includes('bhujia') || desc.includes('puff') || desc.includes('puffs') || desc.includes('snack') || desc.includes('samosa') || desc.includes('kachori')) {
    return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' } // Golden popped popcorn yellow
  }

  // 16. Salad & Greens (Default Veggies)
  if (desc.includes('salad') || desc.includes('vegetable') || desc.includes('veg') || desc.includes('green') || desc.includes('lettuce') || desc.includes('spinach') || desc.includes('broccoli') || desc.includes('cucumber') || desc.includes('bhindi') || desc.includes('gobi') || desc.includes('sabzi')) {
    return { icon: Salad, color: '#16a34a', bg: '#f0fdf4' } // Fresh organic green
  }
  if (desc.includes('bean') || desc.includes('lentil') || desc.includes('chickpea') || desc.includes('peanut') || desc.includes('nut') || desc.includes('almond') || desc.includes('seed') || desc.includes('kaju') || desc.includes('badam')) {
    return { icon: Bean, color: '#7c2d12', bg: '#ffedd5' } // Nut brown
  }

  // Fallbacks by meal type
  if (meal.includes('breakfast')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fef9c3' }
  }
  if (meal.includes('snack')) {
    return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' }
  }
  if (meal.includes('workout')) {
    return { icon: CupSoda, color: '#059669', bg: '#d1fae5' }
  }

  // Absolute fallback
  return { icon: Utensils, color: '#4b5563', bg: '#f3f4f6' }
}

const mealOrder = [
  'breakfast',
  'mid-morning',
  'lunch',
  'snack',
  'post workout',
  'dinner',
  'midnight'
]

export const sortFoodEntries = <T extends { mealType?: string }>(entries: T[]): T[] => {
  return [...entries].sort((a, b) => {
    const mealA = (a.mealType || 'Snack').toLowerCase()
    const mealB = (b.mealType || 'Snack').toLowerCase()
    
    let indexA = mealOrder.indexOf(mealA)
    let indexB = mealOrder.indexOf(mealB)
    
    if (indexA === -1) indexA = 99
    if (indexB === -1) indexB = 99
    
    return indexA - indexB
  })
}
