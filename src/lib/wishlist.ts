// Wishlist card maths: what a pasted link says before the server answers (and in guest mode,
// which has no server), the cooling-off clock, price changes, totals and the budget fit. Pure —
// tested in __tests__/wishlist.test.ts.
//
// `storeFromUrl` / `titleFromUrl` port ProductLinkPreviewer.storeName / titleFromPath on the
// server, so the form is prefilled the instant a link is pasted; the server's read of the page
// (photo, price, the real title) then fills in the rest.

import type { LinkPreview, WishlistItem } from '@/types/wishlist'

/** The 30-day rule: a want waits this long before "Ready to decide". Needs don't wait. */
export const COOLING_OFF_DAYS = 30

const STORES: Record<string, string> = {
  amazon: 'Amazon', amzn: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra', ajio: 'AJIO', decathlon: 'Decathlon',
  croma: 'Croma', reliancedigital: 'Reliance Digital', nykaa: 'Nykaa', tatacliq: 'Tata CLiQ', meesho: 'Meesho',
  apple: 'Apple', ikea: 'IKEA', bigbasket: 'BigBasket', blinkit: 'Blinkit', zeptonow: 'Zepto', swiggy: 'Swiggy',
  jiomart: 'JioMart', vijaysales: 'Vijay Sales', snitch: 'Snitch', uniqlo: 'Uniqlo', hm: 'H&M', zara: 'Zara',
  nike: 'Nike', adidas: 'adidas', puma: 'PUMA', 'boat-lifestyle': 'boAt', samsung: 'Samsung', oneplus: 'OnePlus',
  mi: 'Xiaomi', lenskart: 'Lenskart', pepperfry: 'Pepperfry', urbanladder: 'Urban Ladder', firstcry: 'FirstCry',
}
const GENERIC_SLD = new Set(['co', 'com', 'net', 'org', 'gov', 'ac', 'edu'])
const NOT_A_NAME = new Set(['dp', 'p', 'gp', 'product', 'products', 'buy', 'item', 'itm', 'shop', 'store', 'en', 'in', 'en-in', 'collections', 'catalog'])
const UPPER_WORDS = new Set(['gb', 'tb', 'mb', 'ml', 'kg', 'led', 'usb', 'hd', 'fhd', 'uhd', 'oled', 'amoled', 'ssd', 'ram', 'tv', 'ac', 'uv', 'spf', 'xl', 'xxl', 'xs', '4k', '5g', '4g', 'pc'])
const BRAND_CASE: Record<string, string> = {
  iphone: 'iPhone', ipad: 'iPad', imac: 'iMac', macbook: 'MacBook', airpods: 'AirPods', oneplus: 'OnePlus',
  playstation: 'PlayStation', ps5: 'PS5', xbox: 'Xbox', boat: 'boAt', jbl: 'JBL', hp: 'HP', lg: 'LG', asus: 'ASUS',
  iqoo: 'iQOO', realme: 'realme',
}

/** True for something pasted that is a link rather than an item name. */
export function looksLikeLink(text: string): boolean {
  const t = text.trim()
  if (!t || /\s/.test(t)) return false
  return /^https?:\/\//i.test(t) || /^www\./i.test(t) || /^[\w-]+(\.[\w-]+)+\/\S+$/.test(t)
}

function parseUrl(raw: string): URL | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

/** "www.amazon.in" → "Amazon"; an unknown shop → its capitalised name. */
export function storeFromUrl(raw: string): string | null {
  const url = parseUrl(raw)
  if (!url) return null
  const labels = url.hostname.toLowerCase().replace(/^(?:www|m|shop|store)\./, '').split('.')
  let index = labels.length >= 2 ? labels.length - 2 : 0
  if (index > 0 && GENERIC_SLD.has(labels[index])) index--
  const name = labels[index]
  if (!name) return null
  return STORES[name] ?? name.charAt(0).toUpperCase() + name.slice(1)
}

/** The product-looking slug in a link's path, as words. */
export function titleFromUrl(raw: string): string | null {
  const url = parseUrl(raw)
  if (!url) return null
  let best: string | null = null
  for (const segment of url.pathname.split('/')) {
    const s = segment.trim()
    if (!s || NOT_A_NAME.has(s.toLowerCase()) || (!s.includes('-') && !s.includes('_'))) continue
    if ((s.match(/[a-z]/gi) ?? []).length < 4) continue
    if (best === null || s.length > best.length) best = s
  }
  if (!best) return null
  let decoded = best
  try {
    decoded = decodeURIComponent(best)
  } catch {
    // keep the raw segment
  }
  const words = decoded
    .replace(/\.(?:html?|aspx?|php)$/i, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase()
      if (BRAND_CASE[lower]) return BRAND_CASE[lower]
      if (UPPER_WORDS.has(lower)) return lower.toUpperCase()
      if (/[A-Z]/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
  const title = words.join(' ')
  return title ? (title.length > 120 ? `${title.slice(0, 119).trim()}…` : title) : null
}

/** What the link alone says — the instant prefill, and guest mode's whole answer. */
export function previewFromUrl(raw: string): LinkPreview | null {
  const url = parseUrl(raw)
  if (!url) return null
  return { url: url.toString(), title: titleFromUrl(raw), imageUrl: null, store: storeFromUrl(raw), price: null, fetched: false }
}

// ── Cards ────────────────────────────────────────────────────────────────

const isoDay = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null)
const dayNumber = (day: string): number => {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

export interface CoolingOff {
  /** Whole days since it was added. */
  days: number
  /** 0–1 through the cooling-off period. */
  progress: number
  /** The period is over: time to decide. */
  ready: boolean
}

/** Where a want is in its 30 days. Null for needs and closed wishes — they don't wait. */
export function coolingOff(wish: Pick<WishlistItem, 'priority' | 'status' | 'createdAt'>, today: string): CoolingOff | null {
  if (wish.priority === 'NEED' || wish.status !== 'WANTED') return null
  const added = isoDay(wish.createdAt) ?? today
  const days = Math.max(0, Math.round(dayNumber(today) - dayNumber(added)))
  return { days, progress: Math.min(1, days / COOLING_OFF_DAYS), ready: days >= COOLING_OFF_DAYS }
}

export interface PriceChange {
  delta: number
  direction: 'down' | 'up'
  /** Change as a fraction of the first price. */
  percent: number
}

/** How the price moved since it was first known; null when it hasn't (or isn't known). */
export function priceChange(wish: Pick<WishlistItem, 'price' | 'firstPrice'>): PriceChange | null {
  const { price, firstPrice } = wish
  if (price == null || firstPrice == null || firstPrice <= 0 || price === firstPrice) return null
  const delta = Math.abs(price - firstPrice)
  return { delta, direction: price < firstPrice ? 'down' : 'up', percent: delta / firstPrice }
}

export interface WishTotals {
  open: number
  /** Sum of open wishes' prices (unpriced ones left out). */
  openValue: number
  unpriced: number
  needs: number
  bought: number
  letGo: number
  /** What letting go kept in the bank. */
  letGoValue: number
}

export function wishTotals(wishes: WishlistItem[]): WishTotals {
  const t: WishTotals = { open: 0, openValue: 0, unpriced: 0, needs: 0, bought: 0, letGo: 0, letGoValue: 0 }
  for (const w of wishes) {
    if (w.status === 'WANTED') {
      t.open++
      if (w.priority === 'NEED') t.needs++
      if (w.price != null) t.openValue += w.price
      else t.unpriced++
    } else if (w.status === 'BOUGHT') t.bought++
    else {
      t.letGo++
      t.letGoValue += w.price ?? 0
    }
  }
  return t
}

/** Open wishes in the server's order (needs, then newest) and closed ones (most recent first). */
export function splitWishes(wishes: WishlistItem[]): { open: WishlistItem[]; closed: WishlistItem[] } {
  const created = (w: WishlistItem) => w.createdAt ?? ''
  const closedAt = (w: WishlistItem) => w.closedAt ?? ''
  const open = wishes
    .filter((w) => w.status === 'WANTED')
    .sort((a, b) => Number(b.priority === 'NEED') - Number(a.priority === 'NEED') || created(b).localeCompare(created(a)))
  const closed = wishes.filter((w) => w.status !== 'WANTED').sort((a, b) => closedAt(b).localeCompare(closedAt(a)))
  return { open, closed }
}

export type BudgetFit = 'fits' | 'over'

/** Whether a price fits what's left of this month's budget; null when either is unknown. */
export function budgetFit(price: number | null, budgetLeft: number | null): BudgetFit | null {
  if (price == null || budgetLeft == null) return null
  return price <= budgetLeft ? 'fits' : 'over'
}

/** A goal's progress toward a wish: saved of what it needs, 0–1. */
export function goalProgress(saved: number, target: number | null): number | null {
  if (target == null || target <= 0) return null
  return Math.max(0, Math.min(1, saved / target))
}

/** A store's monogram hue, stable per name. Muted — the photo is the colour on a card. */
const STORE_HUES = ['#6f9a6a', '#6f9bc0', '#c4935a', '#a58ac0', '#5f9aa0', '#bf7f98', '#9b8468', '#7b93c9']
export function storeHue(store: string | null): string {
  if (!store) return '#8a9590'
  let hash = 0
  for (const ch of store.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return STORE_HUES[hash % STORE_HUES.length]
}
