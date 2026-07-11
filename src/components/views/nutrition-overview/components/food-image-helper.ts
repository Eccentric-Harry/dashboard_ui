// Vegetarian-only food imagery. Every asset in src/assets/food/ has been
// visually verified to contain no meat, poultry, fish, or eggs — keep it
// that way when adding new mappings (the user is strictly vegetarian).

import southIndianPlatter from '../../../../assets/food/pastel/breakfast_platter_1783621638654.png'
import idliBananaLeaf from '../../../../assets/food/pastel/buttermilk_1783622060985.png'
import paneerCurry from '../../../../assets/food/pastel/paratha_1783622072239.png'
import vegCurryRice from '../../../../assets/food/pastel/curry_rice_1783621652075.png'
import indianThali from '../../../../assets/food/pastel/indian_thali_1783621675714.png'
import oatsPorridge from '../../../../assets/food/pastel/oats_bowl_1783621691705.png'

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

// New batch
import palakPaneer from '../../../../assets/food/pastel/palak_paneer_1783662857217.png'
import masalaDosa from '../../../../assets/food/pastel/masala_dosa_1783662868093.png'
import avocadoToast from '../../../../assets/food/pastel/avocado_toast_1783662879742.png'
import proteinShake from '../../../../assets/food/pastel/protein_shake_1783662896369.png'
import tomatoSoup from '../../../../assets/food/pastel/tomato_soup_1783662907249.png'
import samosa from '../../../../assets/food/pastel/samosa_1783662953552.png'
import poha from '../../../../assets/food/pastel/poha_1783662964295.png'
import mixedDal from '../../../../assets/food/pastel/mixed_dal_1783662974169.png'
import quinoaSalad from '../../../../assets/food/pastel/quinoa_salad_1783662987242.png'
import tofuStirfry from '../../../../assets/food/pastel/tofu_stirfry_1783662997428.png'
import pestoPasta from '../../../../assets/food/pastel/pesto_pasta_1783663052761.png'
import vegBiryani from '../../../../assets/food/pastel/veg_biryani_1783663064654.png'
import chickpeaCurry from '../../../../assets/food/pastel/chickpea_curry_1783663075636.png'
import garlicNaan from '../../../../assets/food/pastel/garlic_naan_1783663086551.png'
import alooGobi from '../../../../assets/food/pastel/aloo_gobi_1783663097684.png'
import dalMakhani from '../../../../assets/food/pastel/dal_makhani_1783663165767.png'
import mixedNuts from '../../../../assets/food/pastel/mixed_nuts_1783663175675.png'

// Third batch (specific logs)
import meduVada from '../../../../assets/food/pastel/medu_vada_1783750678490.png'
import alooParatha from '../../../../assets/food/pastel/aloo_paratha_1783750702152.png'
import rotiSabzi from '../../../../assets/food/pastel/roti_sabzi_1783750726806.png'
import lemonRice from '../../../../assets/food/pastel/lemon_rice_1783750746370.png'
import lobiaMasala from '../../../../assets/food/pastel/lobia_masala_1783750769841.png'
import curdRice from '../../../../assets/food/pastel/curd_rice_1783750796521.png'
import rawJackfruit from '../../../../assets/food/pastel/raw_jackfruit_1783750823231.png'
import maggiNoodles from '../../../../assets/food/pastel/maggi_noodles_1783750851125.png'
import matkaChaas from '../../../../assets/food/pastel/matka_chaas_1783750898050.png'
import popcornBowl from '../../../../assets/food/pastel/popcorn_1783750924279.png'
import uttapamDish from '../../../../assets/food/pastel/uttapam_1783750952204.png'
import iceCreamBowl from '../../../../assets/food/pastel/ice_cream_1783750986396.png'
import greenPeasSnack from '../../../../assets/food/pastel/green_peas_1783751014463.png'
import blackCoffeeMug from '../../../../assets/food/pastel/black_coffee_1783751047479.png'
import cookiesPlate from '../../../../assets/food/pastel/cookies_1783751076940.png'
import spriteGlass from '../../../../assets/food/pastel/sprite_glass_1783751129701.png'
import bhindiSabzi from '../../../../assets/food/pastel/bhindi_sabzi_1783751173982.png'
export type FoodImage = {
  src: string
  alt: string
}

type FoodImageRule = FoodImage & { pattern: RegExp }

// Ordered — first match wins. More specific dishes come before broad
// categories (e.g. "curry" before "rice" so combo plates get the curry shot).
const RULES: FoodImageRule[] = [
  // Third batch mappings
  { pattern: /medu vada|vada/i, src: meduVada, alt: 'Medu vada with chutney' },
  { pattern: /aloo paratha|paratha/i, src: alooParatha, alt: 'Aloo paratha' },
  { pattern: /lemon rice/i, src: lemonRice, alt: 'Lemon rice' },
  { pattern: /lobia/i, src: lobiaMasala, alt: 'Lobia masala (black-eyed peas)' },
  { pattern: /curd rice/i, src: curdRice, alt: 'Curd rice' },
  { pattern: /jackfruit/i, src: rawJackfruit, alt: 'Jackfruit curry' },
  { pattern: /maggi|noodles/i, src: maggiNoodles, alt: 'Maggi noodles' },
  { pattern: /chaas|buttermilk/i, src: matkaChaas, alt: 'Spiced buttermilk (chaas)' },
  { pattern: /popcorn/i, src: popcornBowl, alt: 'Popcorn' },
  { pattern: /uttapam/i, src: uttapamDish, alt: 'Uttapam' },
  { pattern: /ice cream|icecream/i, src: iceCreamBowl, alt: 'Ice cream' },
  { pattern: /green peas/i, src: greenPeasSnack, alt: 'Fried green peas' },
  { pattern: /black coffee|coffee/i, src: blackCoffeeMug, alt: 'Black coffee' },
  { pattern: /cooki|biscuit|bourbon/i, src: cookiesPlate, alt: 'Cookies' },
  { pattern: /sprite|soda|soft drink/i, src: spriteGlass, alt: 'Sprite glass' },
  { pattern: /bhindi|okra/i, src: bhindiSabzi, alt: 'Bhindi (okra) fry' },
  { pattern: /roti.*sabzi|roti.*curry|roti/i, src: rotiSabzi, alt: 'Roti with curry' },

  // Newly generated mappings
  { pattern: /palak paneer|spinach curry|saag paneer/i, src: palakPaneer, alt: 'Palak paneer' },
  { pattern: /dosa|masala dosa/i, src: masalaDosa, alt: 'Masala dosa with chutney' },
  { pattern: /avocado toast/i, src: avocadoToast, alt: 'Avocado toast' },
  { pattern: /protein shake|whey/i, src: proteinShake, alt: 'Chocolate protein shake' },
  { pattern: /tomato soup/i, src: tomatoSoup, alt: 'Creamy tomato soup' },
  { pattern: /samosa/i, src: samosa, alt: 'Samosa with green chutney' },
  { pattern: /poha/i, src: poha, alt: 'Poha with peanuts' },
  { pattern: /quinoa/i, src: quinoaSalad, alt: 'Quinoa salad bowl' },
  { pattern: /tofu|broccoli/i, src: tofuStirfry, alt: 'Tofu and broccoli stir fry' },
  { pattern: /pesto|pasta|spaghetti/i, src: pestoPasta, alt: 'Pesto pasta with cherry tomatoes' },
  { pattern: /biryani|pulao|pulav/i, src: vegBiryani, alt: 'Vegetable biryani with raita' },
  { pattern: /chole|chickpea|chana/i, src: chickpeaCurry, alt: 'Chickpea curry (chole)' },
  { pattern: /naan|garlic naan|kulcha/i, src: garlicNaan, alt: 'Garlic naan bread' },
  { pattern: /aloo|gobi|cauliflower|potato/i, src: alooGobi, alt: 'Aloo gobi curry' },
  { pattern: /dal makhani|black dal|urad dal/i, src: dalMakhani, alt: 'Dal makhani' },
  { pattern: /mixed dal|yellow dal|dal tadka/i, src: mixedDal, alt: 'Mixed dal stew' },

  // Original mappings
  { pattern: /idli/, src: idliBananaLeaf, alt: 'Idli with coconut chutney on a banana leaf' },
  { pattern: /vada|sambar|uttapam|upma|pongal|appam|idiyappam/i, src: southIndianPlatter, alt: 'South Indian breakfast platter with sambar and chutneys' },
  { pattern: /paneer/i, src: paneerCurry, alt: 'Paneer curry with rice and papad' },
  { pattern: /oats|oatmeal|porridge|dalia|daliya|kanji/i, src: oatsPorridge, alt: 'Oats porridge topped with fresh berries' },
  { pattern: /pancake|waffle|crepe/i, src: pancakeStack, alt: 'Pancake stack with banana and syrup' },
  { pattern: /toast|bread|sandwich|bun\b|wrap/i, src: frenchToast, alt: 'Toast with banana and blueberries' },
  { pattern: /muesli|granola|trail mix|dry fruits?|nuts|almond|cashew|walnut/i, src: mixedNuts, alt: 'Bowl of mixed nuts and almonds' },
  { pattern: /chocolate|choco|brownie|cocoa|candy/i, src: chocolateDark, alt: 'Pieces of dark chocolate' },
  { pattern: /smoothie|milkshake|shake/i, src: berrySmoothie, alt: 'Berry smoothie topped with fresh fruit' },
  { pattern: /juice|zumo/i, src: greenSmoothie, alt: 'Green juice with kiwi, cucumber, and mint' },
  { pattern: /curry|masala|korma|sabzi|sabji|subzi|poriyal|stir[- ]?fry|kootu|gravy|bhaji|kurma/i, src: vegCurryRice, alt: 'Vegetable curry with steamed rice' },
  { pattern: /\bdal\b|lentil|rajma|kadhi|thali|roti|chapat[hi]i?|paratha|phulka|papad/i, src: indianThali, alt: 'Vegetarian thali with dal, naan, and papad' },
  { pattern: /rice|khichdi/i, src: riceBowl, alt: 'Bowl of steamed rice' },
  { pattern: /curd|yogurt|yoghurt|raita|buttermilk|lassi|panna cotta/i, src: yogurtBerries, alt: 'Yogurt jars with fresh strawberries' },
  { pattern: /salad|sprouts|greens/i, src: healthySalad, alt: 'Fresh vegetable salad bowl' },
  { pattern: /fruit|apple|banana|mango|berr(y|ies)|orange|grape|papaya|melon|pomegranate|kiwi|guava|chikoo|sapota/i, src: fruitBowl, alt: 'Fruit bowl with chocolate' },
  { pattern: /vegetable|veggie|beetroot|cucumber|tomato|spinach|palak|bhindi|beans/i, src: freshVegetables, alt: 'Fresh raw vegetables' },
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
