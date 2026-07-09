// Vegetarian-only food imagery. Every asset in src/assets/food/ has been
// visually verified to contain no meat, poultry, fish, or eggs — keep it
// that way when adding new mappings (the user is strictly vegetarian).
import southIndianPlatter from '../../../../assets/food/south_indian_platter.jpg'
import idliBananaLeaf from '../../../../assets/food/idli_banana_leaf.jpg'
import paneerCurry from '../../../../assets/food/paneer_curry.jpg'
import vegCurryRice from '../../../../assets/food/veg_curry_rice.jpg'
import indianThali from '../../../../assets/food/indian_thali.jpg'
import oatsPorridge from '../../../../assets/food/oats_porridge.jpg'
import muesliBowl from '../../../../assets/food/muesli_bowl.jpg'
import pancakeStack from '../../../../assets/food/pancake_stack.jpg'
import frenchToast from '../../../../assets/food/french_toast.jpg'
import chocolateDark from '../../../../assets/food/chocolate_dark.jpg'
import yogurtBerries from '../../../../assets/food/yogurt_berries.jpg'
import berrySmoothie from '../../../../assets/food/berry_smoothie.jpg'
import greenSmoothie from '../../../../assets/food/green_smoothie.jpg'
import riceBowl from '../../../../assets/food/rice_bowl.jpg'
import healthySalad from '../../../../assets/food/healthy_salad.jpg'
import fruitBowl from '../../../../assets/food/fruit_bowl.jpg'
import freshVegetables from '../../../../assets/food/fresh_vegetables.jpg'

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
