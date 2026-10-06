// Wishlist domain types — single source of truth. Mirrors the `wishlist_items` collection +
// WishlistController (/api/v1/wishlist). Card maths live in lib/wishlist.ts.

export type WishStatus = 'WANTED' | 'BOUGHT' | 'LET_GO';
export type WishPriority = 'NEED' | 'WANT';

export interface WishlistItem {
  id: string;
  name: string;
  /** The product page, when there is one. */
  url: string | null;
  /** Where it would be bought: "Amazon", "Decathlon Kondapur". */
  store: string | null;
  /** A remote image URL on the store's CDN — never downloaded or stored. */
  imageUrl: string | null;
  /** Latest known price. */
  price: number | null;
  /** Price when first known — the baseline for price changes. */
  firstPrice: number | null;
  priceCheckedAt: string | null;
  priority: WishPriority;
  note: string | null;
  status: WishStatus;
  boughtOn: string | null;
  boughtFor: number | null;
  /** The ledger row "Bought it" wrote (null when bought through a savings goal). */
  transactionId: string | null;
  /** The "Saving for" goal created by "Save up for it". */
  savingsGoalId: string | null;
  closedAt: string | null;
  createdAt: string | null;
}

export interface WishlistPayload {
  name: string;
  url?: string | null;
  store?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  priority?: WishPriority;
  note?: string | null;
}

export interface WishlistBuyPayload {
  price: number;
  /** Spending category in Finance; defaults to Shopping. */
  category?: string;
  /** 'YYYY-MM-DD'; defaults to today. */
  date?: string;
}

/** What a pasted product link says. `fetched` = the page itself was read (not just the URL). */
export interface LinkPreview {
  url: string;
  title: string | null;
  imageUrl: string | null;
  store: string | null;
  price: number | null;
  fetched: boolean;
}
