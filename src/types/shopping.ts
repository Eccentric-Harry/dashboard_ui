// Grocery list domain types — single source of truth. Mirrors the `shopping_items` and
// `shopping_memory` collections + ShoppingController (/api/v1/shopping); labels, icons and hues
// live in features/shopping/shopping-categories.ts. The wishlist is in ./wishlist.ts.

/**
 * Category keys, in aisle order — the order the list is shown in. Mirrors
 * ShoppingCategories.ORDER on the server; keys are permanent once used.
 */
export const SHOPPING_CATEGORY_ORDER = [
  'PRODUCE',
  'DAIRY',
  'BAKERY',
  'GRAINS',
  'SPICES',
  'PANTRY',
  'SNACKS',
  'BEVERAGES',
  'FROZEN',
  'HOUSEHOLD',
  'PERSONAL_CARE',
  'OTHER',
] as const;

export type ShoppingCategoryKey = (typeof SHOPPING_CATEGORY_ORDER)[number];

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategoryKey;
  /** Free text — "2 kg", "3". */
  quantity: string | null;
  /** A brand or a reminder. */
  note: string | null;
  /** True while the item is in the basket. */
  checked: boolean;
  checkedAt: string | null;
  createdAt: string | null;
}

/** Add or edit an item. `category` omitted → the server files it by name (add) or keeps it (edit). */
export interface ShoppingItemPayload {
  name: string;
  category?: ShoppingCategoryKey;
  quantity?: string | null;
  note?: string | null;
  /** Add only: straight into the basket (restores a deleted or cleared item). */
  checked?: boolean;
}

/** A remembered grocery item — "Buy again" and the add bar's autocomplete. */
export interface ShoppingSuggestion {
  name: string;
  category: ShoppingCategoryKey;
  /** Times it has been put on the list. */
  count: number;
  lastAdded: string | null;
}

/** "Done shopping". Without an amount the basket is just cleared. */
export interface ShoppingCheckoutPayload {
  amount?: number | null;
  store?: string | null;
  /** Finance category; defaults to Groceries. */
  category?: string;
  /** 'YYYY-MM-DD'; defaults to today. */
  date?: string;
}

export interface ShoppingCheckout {
  removed: ShoppingItem[];
  /** The ledger row written, or null when no amount was given. */
  transactionId: string | null;
}
