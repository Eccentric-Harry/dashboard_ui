import {
  Apple,
  Bean,
  CupSoda,
  GlassWater,
  Milk,
  Pill,
  Salad,
  Sandwich,
  Wheat,
  Coffee,
  Cookie,
  Pizza,
  Soup,
  Utensils,
  Popcorn,
  Candy
} from 'lucide-react'

export const getFoodIconDetails = (description: string = '', mealType: string = '') => {
  const desc = description.toLowerCase()
  const meal = mealType.toLowerCase()

  // 1. Check description keywords
  if (desc.includes('coffee') || desc.includes('tea') || desc.includes('latte') || desc.includes('cappuccino') || desc.includes('espresso')) {
    return { icon: Coffee, color: '#854d0e', bg: '#fef9c3' } // Warm brown icon, yellow bg
  }
  if (desc.includes('shake') || desc.includes('smoothie') || desc.includes('juice') || desc.includes('drink') || desc.includes('supplement')) {
    return { icon: CupSoda, color: '#059669', bg: '#d1fae5' } // Emerald green icon, light green bg
  }
  if (desc.includes('bacardi') || desc.includes('alcohol') || desc.includes('cocktail') || desc.includes('wine') || desc.includes('beer') || desc.includes('cranberry')) {
    return { icon: GlassWater, color: '#dc2626', bg: '#fee2e2' } // Red icon, light red bg
  }
  if (desc.includes('water') || desc.includes('hydrate') || desc.includes('hydration')) {
    return { icon: GlassWater, color: '#0284c7', bg: '#e0f2fe' } // Sky blue icon, light blue bg
  }
  if (desc.includes('paneer') || desc.includes('tofu') || desc.includes('cottage cheese')) {
    return { icon: Milk, color: '#0d9488', bg: '#ccfbf1' } // Rich teal theme for protein-rich paneer/tofu blocks
  }
  if (desc.includes('milk') || desc.includes('yogurt') || desc.includes('curd') || desc.includes('cheese') || desc.includes('dairy')) {
    return { icon: Milk, color: '#4f46e5', bg: '#e0e7ff' } // Indigo icon, light indigo bg
  }
  if (desc.includes('chips') || desc.includes('crisps') || desc.includes('popcorn') || desc.includes('nachos') || desc.includes('namkeen') || desc.includes('bhujia') || desc.includes('puff') || desc.includes('puffs')) {
    return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' } // Gold Popcorn theme for savory snacks/chips
  }
  if (desc.includes('candy') || desc.includes('sweets') || desc.includes('bar') || desc.includes('snack')) {
    return { icon: Candy, color: '#ec4899', bg: '#fce7f3' } // Pink Candy theme for snacks/sweets
  }
  if (desc.includes('apple') || desc.includes('banana') || desc.includes('fruit') || desc.includes('berry') || desc.includes('berries') || desc.includes('grape') || desc.includes('orange') || desc.includes('citrus')) {
    return { icon: Apple, color: '#e11d48', bg: '#fff1f2' } // Rose pink icon, rose bg
  }
  if (desc.includes('salad') || desc.includes('vegetable') || desc.includes('veg') || desc.includes('green') || desc.includes('lettuce') || desc.includes('spinach') || desc.includes('broccoli')) {
    return { icon: Salad, color: '#16a34a', bg: '#f0fdf4' } // Green icon, light green bg
  }
  if (desc.includes('sandwich') || desc.includes('burger') || desc.includes('wrap') || desc.includes('bread') || desc.includes('toast')) {
    return { icon: Sandwich, color: '#ca8a04', bg: '#fef9c3' } // Yellow-brown icon, light yellow bg
  }
  if (desc.includes('pizza')) {
    return { icon: Pizza, color: '#ea580c', bg: '#ffedd5' } // Pizza orange icon, light orange bg
  }
  if (desc.includes('waffle') || desc.includes('chocolate') || desc.includes('sweet') || desc.includes('cake') || desc.includes('cookie') || desc.includes('dessert') || desc.includes('ice cream') || desc.includes('sugar') || desc.includes('crepe') || desc.includes('pancake')) {
    return { icon: Cookie, color: '#db2777', bg: '#fdf2f8' } // Pink icon, light pink bg
  }
  if (desc.includes('rice') || desc.includes('biryani') || desc.includes('pulao') || desc.includes('khichdi') || desc.includes('jeera rice')) {
    return { icon: Soup, color: '#b45309', bg: '#fef3c7' } // Golden warm bowl for rice meals
  }
  if (desc.includes('roti') || desc.includes('chapati') || desc.includes('paratha') || desc.includes('naan') || desc.includes('phulka') || desc.includes('thepla') || desc.includes('puri') || desc.includes('flatbread')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fffbeb' } // Warm wheat/amber theme for Indian rotis
  }
  if (desc.includes('soup') || desc.includes('curry') || desc.includes('oats') || desc.includes('oatmeal') || desc.includes('porridge') || desc.includes('dal') || desc.includes('chole')) {
    return { icon: Soup, color: '#d97706', bg: '#fffbeb' } // Warm soup icon, warm bg
  }
  if (desc.includes('bean') || desc.includes('lentil') || desc.includes('chickpea') || desc.includes('peanut') || desc.includes('nut') || desc.includes('almond') || desc.includes('seed')) {
    return { icon: Bean, color: '#7c2d12', bg: '#ffedd5' } // Brown icon, light orange bg
  }
  if (desc.includes('wheat') || desc.includes('grain') || desc.includes('cereal') || desc.includes('tortilla') || desc.includes('carb')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fef9c3' } // Golden wheat icon, yellow bg
  }
  if (desc.includes('pill') || desc.includes('creatine') || desc.includes('vitamin') || desc.includes('capsule') || desc.includes('tablet')) {
    return { icon: Pill, color: '#2563eb', bg: '#eff6ff' } // Blue icon, light blue bg
  }

  // 2. Check mealType fallbacks
  if (meal.includes('breakfast')) {
    return { icon: Wheat, color: '#854d0e', bg: '#fef9c3' } // Golden wheat theme for healthy morning cereal/breakfast
  }
  if (meal.includes('snack')) {
    return { icon: Popcorn, color: '#eab308', bg: '#fef9c3' } // Savory snack fallback
  }
  if (meal.includes('workout')) {
    return { icon: CupSoda, color: '#059669', bg: '#d1fae5' }
  }

  // 3. Absolute Fallback
  return { icon: Utensils, color: '#4b5563', bg: '#f3f4f6' }
}
