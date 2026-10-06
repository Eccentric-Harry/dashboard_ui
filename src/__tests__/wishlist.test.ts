import { describe, expect, it } from 'vitest'
import type { WishlistItem } from '@/types/wishlist'
import {
  budgetFit,
  coolingOff,
  goalProgress,
  looksLikeLink,
  previewFromUrl,
  priceChange,
  splitWishes,
  storeFromUrl,
  storeHue,
  titleFromUrl,
  wishTotals,
} from '@/lib/wishlist'

const wish = (over: Partial<WishlistItem> = {}): WishlistItem => ({
  id: 'w1',
  name: 'Nike Pegasus 41',
  url: null,
  store: 'Amazon',
  imageUrl: null,
  price: 9995,
  firstPrice: 9995,
  priceCheckedAt: null,
  priority: 'WANT',
  note: null,
  status: 'WANTED',
  boughtOn: null,
  boughtFor: null,
  transactionId: null,
  savingsGoalId: null,
  closedAt: null,
  createdAt: '2026-10-01T10:00:00Z',
  ...over,
})

// Mirrors ProductLinkPreviewerTest on the server: the two must agree.
describe('reading a link', () => {
  it('names stores from domains', () => {
    expect(storeFromUrl('https://www.amazon.in/dp/X')).toBe('Amazon')
    expect(storeFromUrl('amzn.in/d/abc')).toBe('Amazon')
    expect(storeFromUrl('https://www.amazon.co.uk/dp/X')).toBe('Amazon')
    expect(storeFromUrl('https://www.flipkart.com/x/p/itm1')).toBe('Flipkart')
    expect(storeFromUrl('https://bluetokai.com/products/x')).toBe('Bluetokai')
    expect(storeFromUrl('not a link at all')).toBeNull()
  })

  it('names products from their slug', () => {
    expect(titleFromUrl('https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4')).toBe('Apple iPhone 15 Black 128 GB')
    expect(titleFromUrl('https://www.amazon.in/Apple-iPhone-15-128-GB/dp/B0CHX1W1XY')).toBe('Apple iPhone 15 128 GB')
    expect(titleFromUrl('https://www.myntra.com/sports-shoes/nike/nike-men-revolution-7-running-shoes/27460372/buy')).toBe(
      'Nike Men Revolution 7 Running Shoes',
    )
    expect(titleFromUrl('https://www.amazon.in/dp/B0CHX1W1XY')).toBeNull()
  })

  it('previews from the URL alone', () => {
    expect(previewFromUrl('flipkart.com/apple-iphone-15-black-128-gb/p/itm1')).toEqual({
      url: 'https://flipkart.com/apple-iphone-15-black-128-gb/p/itm1',
      title: 'Apple iPhone 15 Black 128 GB',
      imageUrl: null,
      store: 'Flipkart',
      price: null,
      fetched: false,
    })
    expect(previewFromUrl('ftp://x/y')).toBeNull()
  })

  it('tells links from item names', () => {
    expect(looksLikeLink('https://www.amazon.in/dp/X')).toBe(true)
    expect(looksLikeLink('www.decathlon.in/p/123')).toBe(true)
    expect(looksLikeLink('amazon.in/dp/X')).toBe(true)
    expect(looksLikeLink('milk')).toBe(false)
    expect(looksLikeLink('2 kg tomatoes')).toBe(false)
    expect(looksLikeLink('dr.oetker')).toBe(false)
  })
})

describe('cards', () => {
  it('runs the 30-day cooling-off clock for wants only', () => {
    expect(coolingOff(wish(), '2026-10-05')).toEqual({ days: 4, progress: 4 / 30, ready: false })
    expect(coolingOff(wish(), '2026-11-05')?.ready).toBe(true)
    expect(coolingOff(wish({ priority: 'NEED' }), '2026-10-05')).toBeNull()
    expect(coolingOff(wish({ status: 'BOUGHT' }), '2026-10-05')).toBeNull()
  })

  it('reports price changes since the first price', () => {
    expect(priceChange(wish({ price: 8995 }))).toEqual({ delta: 1000, direction: 'down', percent: 1000 / 9995 })
    expect(priceChange(wish({ price: 10995 }))?.direction).toBe('up')
    expect(priceChange(wish())).toBeNull()
    expect(priceChange(wish({ firstPrice: null }))).toBeNull()
  })

  it('totals open, bought and let-go wishes', () => {
    const totals = wishTotals([
      wish({ id: 'a', price: 1000 }),
      wish({ id: 'b', price: null, priority: 'NEED' }),
      wish({ id: 'c', status: 'BOUGHT' }),
      wish({ id: 'd', status: 'LET_GO', price: 2500 }),
    ])
    expect(totals).toEqual({ open: 2, openValue: 1000, unpriced: 1, needs: 1, bought: 1, letGo: 1, letGoValue: 2500 })
  })

  it('splits open (needs, then newest) from closed (most recent first)', () => {
    const { open, closed } = splitWishes([
      wish({ id: 'old' }),
      wish({ id: 'new', createdAt: '2026-10-05T00:00:00Z' }),
      wish({ id: 'need', priority: 'NEED' }),
      wish({ id: 'gone', status: 'LET_GO', closedAt: '2026-10-02T00:00:00Z' }),
      wish({ id: 'got', status: 'BOUGHT', closedAt: '2026-10-04T00:00:00Z' }),
    ])
    expect(open.map((w) => w.id)).toEqual(['need', 'new', 'old'])
    expect(closed.map((w) => w.id)).toEqual(['got', 'gone'])
  })

  it('fits a price against what is left of the budget', () => {
    expect(budgetFit(5000, 8000)).toBe('fits')
    expect(budgetFit(9000, 8000)).toBe('over')
    expect(budgetFit(null, 8000)).toBeNull()
    expect(budgetFit(5000, null)).toBeNull()
  })

  it('clamps goal progress', () => {
    expect(goalProgress(5000, 10000)).toBe(0.5)
    expect(goalProgress(12000, 10000)).toBe(1)
    expect(goalProgress(10, null)).toBeNull()
  })

  it('gives each store a stable hue', () => {
    expect(storeHue('Amazon')).toBe(storeHue('amazon'))
    expect(storeHue(null)).toBe('#8a9590')
  })
})
