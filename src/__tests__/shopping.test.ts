import { describe, expect, it } from 'vitest'
import type { ShoppingItem } from '@/types/shopping'
import {
  aislesOf,
  basketOf,
  cleanItemName,
  draftItem,
  foldIn,
  mergeServerItems,
  guessCategory,
  listAsText,
  parseQuickAdd,
  parseQuickItem,
  sortItems,
  tallyOf,
} from '@/lib/shopping'

const item = (over: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 'i1',
  name: 'Milk',
  category: 'DAIRY',
  quantity: null,
  note: null,
  checked: false,
  checkedAt: null,
  createdAt: '2026-10-06T09:00:00Z',
  ...over,
})

// These mirror ShoppingCategoriesTest on the server: the two tables must agree.
describe('guessCategory', () => {
  it('files common items by name', () => {
    expect(guessCategory('Tomatoes')).toBe('PRODUCE')
    expect(guessCategory('paneer')).toBe('DAIRY')
    expect(guessCategory('brown bread')).toBe('BAKERY')
    expect(guessCategory('basmati rice')).toBe('GRAINS')
    expect(guessCategory('toor dal')).toBe('GRAINS')
    expect(guessCategory('turmeric powder')).toBe('SPICES')
    expect(guessCategory('sunflower oil')).toBe('PANTRY')
    expect(guessCategory('Digestive biscuits')).toBe('SNACKS')
    expect(guessCategory('orange juice')).toBe('BEVERAGES')
    expect(guessCategory('dishwash liquid')).toBe('HOUSEHOLD')
    expect(guessCategory('shampoo')).toBe('PERSONAL_CARE')
  })

  it('lets the head noun decide when a word points two ways', () => {
    expect(guessCategory('tomato ketchup')).toBe('PANTRY')
    expect(guessCategory('coconut oil')).toBe('PANTRY')
    expect(guessCategory('chocolate milk')).toBe('DAIRY')
  })

  it('lets phrases beat their parts', () => {
    expect(guessCategory('ice cream')).toBe('FROZEN')
    expect(guessCategory('frozen peas')).toBe('FROZEN')
    expect(guessCategory('peanut butter')).toBe('PANTRY')
    expect(guessCategory('tea bags')).toBe('BEVERAGES')
    expect(guessCategory('toilet paper')).toBe('HOUSEHOLD')
    expect(guessCategory('black pepper')).toBe('SPICES')
    expect(guessCategory('bell pepper')).toBe('PRODUCE')
  })

  it('ignores quantities, punctuation and case, and handles plurals', () => {
    expect(guessCategory('2 KG Onions!')).toBe('PRODUCE')
    expect(guessCategory('  milk  (1 L)')).toBe('DAIRY')
    expect(guessCategory('potatoes')).toBe('PRODUCE')
    expect(guessCategory('mangoes')).toBe('PRODUCE')
    expect(guessCategory('cookies')).toBe('SNACKS')
  })

  it('falls back to OTHER', () => {
    expect(guessCategory('thingamajig')).toBe('OTHER')
    expect(guessCategory('   ')).toBe('OTHER')
    expect(guessCategory('123')).toBe('OTHER')
  })
})

describe('parseQuickItem', () => {
  it('reads a leading quantity, with or without a unit', () => {
    expect(parseQuickItem('2 kg tomatoes')).toEqual({ name: 'Tomatoes', quantity: '2 kg' })
    expect(parseQuickItem('2kg tomatoes')).toEqual({ name: 'Tomatoes', quantity: '2 kg' })
    expect(parseQuickItem('12 eggs')).toEqual({ name: 'Eggs', quantity: '12' })
    expect(parseQuickItem('1 litre of milk')).toEqual({ name: 'Milk', quantity: '1 L' })
    expect(parseQuickItem('500 gms paneer')).toEqual({ name: 'Paneer', quantity: '500 g' })
  })

  it('does not mistake a word that starts like a unit for one', () => {
    expect(parseQuickItem('2 garlic')).toEqual({ name: 'Garlic', quantity: '2' })
    expect(parseQuickItem('3 lemons')).toEqual({ name: 'Lemons', quantity: '3' })
  })

  it('reads a trailing quantity or multiplier', () => {
    expect(parseQuickItem('milk 2 l')).toEqual({ name: 'Milk', quantity: '2 L' })
    expect(parseQuickItem('bananas x6')).toEqual({ name: 'Bananas', quantity: '6' })
    expect(parseQuickItem('bananas × 6')).toEqual({ name: 'Bananas', quantity: '6' })
  })

  it('leaves plain names alone', () => {
    expect(parseQuickItem('  green   tea ')).toEqual({ name: 'Green tea' })
    expect(parseQuickItem('7up')).toEqual({ name: '7up' })
    expect(parseQuickItem('   ')).toBeNull()
  })
})

describe('parseQuickAdd', () => {
  it('splits on commas, semicolons and new lines and drops empties', () => {
    const items = parseQuickAdd('milk, 2 kg tomatoes;; bread\nsoap,')
    expect(items.map((i) => i.name)).toEqual(['Milk', 'Tomatoes', 'Bread', 'Soap'])
    expect(items[1].quantity).toBe('2 kg')
  })

  it('applies a picked category to every piece', () => {
    expect(parseQuickAdd('a, b', 'HOUSEHOLD').every((i) => i.category === 'HOUSEHOLD')).toBe(true)
  })

  it('caps a batch at 50', () => {
    const many = Array.from({ length: 80 }, (_, n) => `item ${n}`).join(',')
    expect(parseQuickAdd(many)).toHaveLength(50)
  })
})

describe('reading the list', () => {
  const list = [
    item({ id: '1', name: 'Soap', category: 'HOUSEHOLD' }),
    item({ id: '2', name: 'Milk', category: 'DAIRY', checked: true, checkedAt: '2026-10-06T10:00:00Z' }),
    item({ id: '3', name: 'Curd', category: 'DAIRY', createdAt: '2026-10-06T09:30:00Z' }),
    item({ id: '4', name: 'Onions', category: 'PRODUCE' }),
    item({ id: '5', name: 'Eggs', category: 'DAIRY', checked: true, checkedAt: '2026-10-06T11:00:00Z' }),
  ]

  it('sorts into aisle order, to-get before in-basket', () => {
    expect(sortItems(list).map((i) => i.name)).toEqual(['Onions', 'Curd', 'Eggs', 'Milk', 'Soap'])
  })

  it('groups only what is still to get, by aisle', () => {
    const aisles = aislesOf(list)
    expect(aisles.map((a) => a.category)).toEqual(['PRODUCE', 'DAIRY', 'HOUSEHOLD'])
    expect(aisles[1].toGet.map((i) => i.name)).toEqual(['Curd'])
  })

  it('lists the basket most recent first', () => {
    expect(basketOf(list).map((i) => i.name)).toEqual(['Eggs', 'Milk'])
  })

  it('tallies the progress', () => {
    expect(tallyOf(list)).toEqual({ total: 5, toGet: 3, inBasket: 2, done: 0.4 })
    expect(tallyOf([]).done).toBe(0)
  })

  it('renders the to-get items as plain text by aisle', () => {
    const text = listAsText([...list, item({ id: '6', name: 'Tomatoes', category: 'PRODUCE', quantity: '2 kg' })])
    expect(text).toBe(
      ['Shopping list', '', 'Fruits & vegetables', '• Onions', '• Tomatoes — 2 kg', '', 'Dairy', '• Curd', '', 'Household', '• Soap'].join('\n'),
    )
  })
})

describe('drafts', () => {
  it('files and cleans a payload the way the server will', () => {
    const draft = draftItem({ name: ' tomato  ketchup', quantity: ' 1 ' }, 'tmp-1', '2026-10-06T09:00:00Z')
    expect(draft).toMatchObject({ name: 'Tomato ketchup', category: 'PANTRY', quantity: '1', checked: false })
    expect(cleanItemName('  ')).toBe('')
  })
})

describe('optimistic updates', () => {
  let n = 0
  const makeId = () => `tmp-${++n}`
  const NOW = '2026-10-06T12:00:00Z'

  it('adds a placeholder filed by name', () => {
    const next = foldIn([], [{ name: 'milk', quantity: '2 L' }], makeId, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ name: 'Milk', category: 'DAIRY', quantity: '2 L', checked: false })
    expect(next[0].id.startsWith('tmp-')).toBe(true)
  })

  it('leaves an item that is already to get alone', () => {
    const list = [item({ id: 'a', name: 'Milk', quantity: '1 L' })]
    const next = foldIn(list, [{ name: 'MILK', quantity: '5 L' }], makeId, NOW)
    expect(next).toEqual(list)
  })

  it('brings a basket item back onto the list with its new quantity', () => {
    const list = [item({ id: 'a', name: 'Milk', checked: true, checkedAt: NOW })]
    const next = foldIn(list, [{ name: 'milk', quantity: '2 L' }], makeId, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'a', checked: false, checkedAt: null, quantity: '2 L' })
  })

  it('collapses duplicates inside one batch and does not mutate its input', () => {
    const list = [item({ id: 'a', name: 'Bread', category: 'BAKERY' })]
    const next = foldIn(list, [{ name: 'Eggs' }, { name: 'eggs' }], makeId, NOW)
    expect(next.map((i) => i.name)).toEqual(['Bread', 'Eggs'])
    expect(list).toHaveLength(1)
  })

  it('swaps placeholders for the server items', () => {
    const local = foldIn([item({ id: 'a' })], [{ name: 'Soap' }], makeId, NOW)
    const server = [item({ id: 'a', quantity: '3 L' }), item({ id: 's9', name: 'Soap', category: 'HOUSEHOLD' })]
    const merged = mergeServerItems(local, server)
    expect(merged.map((i) => i.id).sort()).toEqual(['a', 's9'])
    expect(merged.find((i) => i.id === 'a')?.quantity).toBe('3 L')
  })
})
