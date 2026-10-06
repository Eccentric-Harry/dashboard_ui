// Generated from the PHRASES / WORDS tables in the backend's util/ShoppingCategories.java, so the
// client can file an item the instant it is typed (and guest mode, which has no server, can too).
// The server is the source of truth: when a list changes there, regenerate this table.

import type { ShoppingCategoryKey } from '@/types/shopping';

/** Multi-word names whose meaning is not their last word's ("ice cream", "peanut butter"). */
export const SHOPPING_PHRASES: Partial<Record<ShoppingCategoryKey, string[]>> = {
  FROZEN: [
    'ice cream', 'frozen peas', 'frozen corn', 'french fries', 'frozen yogurt',
  ],
  PANTRY: [
    'peanut butter', 'almond butter', 'tomato puree', 'tomato paste', 'coconut milk', 'soy sauce',
    'chilli sauce', 'chili sauce', 'apple cider vinegar',
  ],
  BEVERAGES: [
    'tea bag', 'tea bags', 'green tea', 'black tea', 'cold coffee', 'coconut water', 'soda water',
  ],
  HOUSEHOLD: [
    'toilet paper', 'toilet roll', 'tissue paper', 'kitchen roll', 'paper towel', 'dish soap',
    'dishwash liquid', 'washing powder', 'floor cleaner', 'bin bag', 'garbage bag', 'trash bag',
    'aluminium foil', 'cling film',
  ],
  PERSONAL_CARE: [
    'tooth paste', 'tooth brush', 'hand wash', 'hand soap', 'body wash', 'face wash', 'hair oil',
    'sanitary pad', 'shaving cream', 'lip balm',
  ],
  DAIRY: [
    'cream cheese', 'butter milk', 'sour cream', 'almond milk', 'oat milk', 'soy milk',
  ],
  SPICES: [
    'black pepper', 'red chilli', 'chilli powder', 'curry leaves', 'bay leaf', 'bay leaves',
    'coriander powder', 'pepper powder',
  ],
  PRODUCE: [
    'bell pepper', 'curry leaf', 'green chilli', 'green chillies', 'spring onion', 'sweet potato',
    'raw banana',
  ],
  GRAINS: [
    'chana dal', 'toor dal', 'moong dal', 'urad dal', 'masoor dal',
  ],
  BAKERY: [
    'pizza base',
  ],
};

/** Single words, in the order the server registers them (the first registration of a word wins). */
export const SHOPPING_WORDS: Partial<Record<ShoppingCategoryKey, string[]>> = {
  PRODUCE: [
    'tomato', 'onion', 'potato', 'garlic', 'ginger', 'carrot', 'cucumber', 'spinach', 'cabbage',
    'cauliflower', 'broccoli', 'capsicum', 'brinjal', 'eggplant', 'okra', 'bhindi', 'peas', 'beans',
    'corn', 'beetroot', 'radish', 'pumpkin', 'gourd', 'lemon', 'lime', 'coriander', 'cilantro',
    'mint', 'methi', 'palak', 'lettuce', 'mushroom', 'zucchini', 'banana', 'apple', 'mango',
    'orange', 'grapes', 'grape', 'papaya', 'pomegranate', 'watermelon', 'melon', 'pineapple',
    'guava', 'pear', 'kiwi', 'strawberry', 'strawberries', 'blueberry', 'blueberries', 'berries',
    'coconut', 'avocado', 'fruit', 'fruits', 'vegetable', 'vegetables', 'veggies', 'greens',
    'herbs', 'chilli', 'chillies', 'chili', 'sapota', 'chikoo', 'dates', 'fig', 'figs', 'plum',
    'peach', 'cherry', 'cherries', 'drumstick',
  ],
  DAIRY: [
    'milk', 'curd', 'yogurt', 'yoghurt', 'dahi', 'paneer', 'cheese', 'butter', 'ghee', 'cream',
    'buttermilk', 'lassi', 'egg', 'eggs', 'khoa', 'mawa',
  ],
  BAKERY: [
    'bread', 'bun', 'buns', 'pav', 'roll', 'rolls', 'cake', 'croissant', 'bagel', 'toast', 'muffin',
    'muffins', 'baguette', 'rusk', 'naan', 'tortilla', 'wrap', 'wraps',
  ],
  GRAINS: [
    'rice', 'atta', 'flour', 'maida', 'wheat', 'dal', 'dals', 'daal', 'lentil', 'lentils', 'pulses',
    'rajma', 'chickpea', 'chickpeas', 'chana', 'besan', 'rava', 'sooji', 'semolina', 'poha', 'oats',
    'oat', 'quinoa', 'millet', 'ragi', 'jowar', 'bajra', 'barley', 'vermicelli', 'pasta', 'noodles',
    'macaroni', 'spaghetti', 'cornflakes', 'muesli', 'granola', 'cereal', 'moong', 'toor', 'urad',
    'masoor', 'lobia', 'soya',
  ],
  SPICES: [
    'salt', 'turmeric', 'haldi', 'cumin', 'jeera', 'masala', 'garam', 'cardamom', 'elaichi',
    'cinnamon', 'clove', 'cloves', 'mustard', 'hing', 'pepper', 'asafoetida', 'saffron', 'kesar',
    'fenugreek', 'ajwain', 'oregano', 'paprika', 'spice', 'spices', 'chaat', 'seasoning', 'fennel',
    'saunf', 'nutmeg', 'tamarind', 'imli',
  ],
  PANTRY: [
    'oil', 'sugar', 'jaggery', 'honey', 'vinegar', 'sauce', 'ketchup', 'mayonnaise', 'mayo', 'jam',
    'spread', 'pickle', 'achar', 'chutney', 'syrup', 'nuts', 'almond', 'almonds', 'cashew',
    'cashews', 'walnut', 'walnuts', 'pistachio', 'pistachios', 'raisin', 'raisins', 'peanut',
    'peanuts', 'seeds', 'puree', 'stock', 'baking', 'yeast', 'cornstarch', 'cornflour', 'cocoa',
    'papad', 'canned', 'tinned', 'dryfruits',
  ],
  SNACKS: [
    'chips', 'biscuit', 'biscuits', 'cookie', 'cookies', 'chocolate', 'chocolates', 'namkeen',
    'bhujia', 'popcorn', 'crackers', 'candy', 'sweets', 'mithai', 'wafers', 'snack', 'snacks',
    'makhana', 'chikki', 'kurkure', 'maggi',
  ],
  BEVERAGES: [
    'tea', 'coffee', 'juice', 'water', 'soda', 'cola', 'coke', 'pepsi', 'lemonade', 'squash',
    'smoothie', 'drink', 'drinks', 'beer', 'wine', 'whisky', 'rum', 'vodka', 'milkshake',
    'bournvita', 'horlicks', 'boost', 'chai', 'kombucha', 'sprite',
  ],
  FROZEN: [
    'frozen', 'icecream', 'gelato', 'sorbet', 'popsicle', 'nuggets',
  ],
  HOUSEHOLD: [
    'detergent', 'soap', 'cleaner', 'bleach', 'sponge', 'scrub', 'mop', 'broom', 'bulb', 'battery',
    'batteries', 'napkin', 'napkins', 'tissue', 'tissues', 'foil', 'freshener', 'phenyl', 'harpic',
    'dishwash', 'lizol', 'matchbox', 'candle', 'candles', 'garbage', 'trash', 'bag', 'bags',
    'container', 'containers', 'bottle', 'bottles', 'mosquito',
  ],
  PERSONAL_CARE: [
    'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'deo', 'lotion',
    'moisturiser', 'moisturizer', 'sunscreen', 'razor', 'trimmer', 'perfume', 'cologne', 'facewash',
    'handwash', 'talc', 'lipstick', 'makeup', 'cotton', 'earbuds', 'pads', 'tampons', 'floss',
    'mouthwash', 'comb', 'serum',
  ],
};
