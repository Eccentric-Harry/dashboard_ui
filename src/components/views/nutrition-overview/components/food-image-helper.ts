// Vegetarian-only food imagery. Every asset in src/assets/food/ has been
// visually verified to contain no meat, poultry, fish, or eggs — keep it
// that way when adding new mappings (the user is strictly vegetarian).

import southIndianPlatter from '../../../../assets/food/pastel/breakfast_platter_1783621638654.png'
import idliBananaLeaf from '../../../../assets/food/pastel/buttermilk_1783622060985.png'
import paneerCurry from '../../../../assets/food/pastel/paratha_1783622072239.png'
import vegCurryRice from '../../../../assets/food/pastel/curry_rice_1783621652075.png'
import indianThali from '../../../../assets/food/pastel/indian_thali_1783621675714.png'
import oatsPorridge from '../../../../assets/food/pastel/oats_bowl_1783621691705.png'
import muesliBowl from '../../../../assets/food/pastel/muesli_bowl_1783621766237.png'
import pancakeStack from '../../../../assets/food/pastel/pancake_stack_1783621702337.png'
import frenchToast from '../../../../assets/food/pastel/french_toast_1783621755953.png'
import chocolateDark from '../../../../assets/food/pastel/chocolate_dark_1783621777444.png'
import yogurtBerries from '../../../../assets/food/pastel/yogurt_berries_1783621885295.png'
import berrySmoothie from '../../../../assets/food/pastel/berry_smoothie_1783621789127.png'
import greenSmoothie from '../../../../assets/food/pastel/green_smoothie_1783621802355.png'
import riceBowl from '../../../../assets/food/pastel/rice_bowl_1783621897512.png'
import healthySalad from '../../../../assets/food/pastel/healthy_salad_1783621908365.png'
import fruitBowl from '../../../../assets/food/pastel/fruit_bowl_1783621919134.png'
import freshVegetables from '../../../../assets/food/pastel/fresh_vegetables_1783621931837.png'

export type FoodImage = {
  src: string
  alt: string
}

type FoodImageRule = FoodImage & { pattern: RegExp }

// Ordered — first match wins. More specific dishes come before broad
// categories (e.g. "curry" before "rice" so combo plates get the curry shot).
const RULES: FoodImageRule[] = [
  { pattern: /idli/, src: idliBananaLeaf, alt: 'Idli with coconut chutney on a banana leaf' },
  { pattern: /dosa|vada|sambar|uttapam|upma|pongal|appam|idiyappam/, src: southIndianPlatter, alt: 'South Indian breakfast platter with sambar and chutneys' },
  { pattern: /paneer/, src: paneerCurry, alt: 'Paneer curry with rice and papad' },
  { pattern: /oats|oatmeal|porridge|dalia|daliya|kanji/, src: oatsPorridge, alt: 'Oats porridge topped with fresh berries' },
  { pattern: /pancake|waffle|crepe/, src: pancakeStack, alt: 'Pancake stack with banana and syrup' },
  { pattern: /toast|bread|sandwich|bun\b|wrap/, src: frenchToast, alt: 'Toast with banana and blueberries' },
  { pattern: /muesli|granola|trail mix|dry fruits?|nuts|almond|cashew|walnut/, src: muesliBowl, alt: 'Muesli bowl with nuts and dried fruit' },
  { pattern: /chocolate|choco|brownie|cocoa|candy/, src: chocolateDark, alt: 'Pieces of dark chocolate' },
  { pattern: /smoothie|milkshake|shake/, src: berrySmoothie, alt: 'Berry smoothie topped with fresh fruit' },
  { pattern: /juice|zumo/, src: greenSmoothie, alt: 'Green juice with kiwi, cucumber, and mint' },
  { pattern: /curry|masala|korma|sabzi|sabji|subzi|poriyal|stir[- ]?fry|kootu|gravy|bhaji|kurma/, src: vegCurryRice, alt: 'Vegetable curry with steamed rice' },
  { pattern: /\bdal\b|lentil|rajma|chole|chana|kadhi|thali|roti|chapat[hi]i?|naan|paratha|phulka|papad/, src: indianThali, alt: 'Vegetarian thali with dal, naan, and papad' },
  { pattern: /rice|biryani|pulao|khichdi/, src: riceBowl, alt: 'Bowl of steamed rice' },
  { pattern: /curd|yogurt|yoghurt|raita|buttermilk|lassi|panna cotta/, src: yogurtBerries, alt: 'Yogurt jars with fresh strawberries' },
  { pattern: /salad|sprouts|greens/, src: healthySalad, alt: 'Fresh vegetable salad bowl' },
  { pattern: /fruit|apple|banana|mango|berr(y|ies)|orange|grape|papaya|melon|pomegranate|kiwi|guava|chikoo|sapota/, src: fruitBowl, alt: 'Fruit bowl with chocolate' },
  { pattern: /vegetable|veggie|broccoli|carrot|beetroot|cucumber|tomato|spinach|palak|gobi|aloo|bhindi|beans/, src: freshVegetables, alt: 'Fresh raw vegetables' },
]

// Vegetarian category fallbacks when no dish keyword matches.
const MEAL_TYPE_FALLBACKS: Record<string, FoodImage> = {
  Breakfast: { src: southIndianPlatter, alt: 'South Indian breakfast platter' },
  'Mid-Morning': { src: fruitBowl, alt: 'Fruit bowl' },
  Lunch: { src: indianThali, alt: 'Vegetarian thali' },
  Snack: { src: fruitBowl, alt: 'Fruit bowl' },
  'Post Workout': { src: berrySmoothie, alt: 'Berry smoothie' },
  Dinner: { src: indianThali, alt: 'Vegetarian thali' },
  Midnight: { src: yogurtBerries, alt: 'Yogurt with strawberries' },
}

const DEFAULT_IMAGE: FoodImage = { src: healthySalad, alt: 'Fresh vegetarian bowl' }

export function getFoodImage(description?: string, mealType?: string): FoodImage {
  const text = (description || '').toLowerCase()

  if (text) {
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        return { src: rule.src, alt: rule.alt }
      }
    }
  }

  return MEAL_TYPE_FALLBACKS[mealType || ''] || DEFAULT_IMAGE
}
