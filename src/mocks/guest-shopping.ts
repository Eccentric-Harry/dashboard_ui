// Guest-mode grocery API: the in-memory mirror of ShoppingController (/api/v1/shopping) and
// ShoppingListService — names unique per list, a basket item re-added comes back, a repeat add
// never overwrites a quantity the user set, moved items are remembered, "Buy again" ranks by
// frequency with a two-week half-life, and checkout logs one expense in the guest ledger. Filing and ordering reuse lib/shopping, which is the
// client's port of the server's rules. Pure over module state — `resolveGuestShopping` returns
// null for anything it doesn't own.

import {
  SHOPPING_MAX_ITEMS,
  cleanItemName,
  guessCategory,
  sortItems,
} from '@/lib/shopping';
import {
  SHOPPING_CATEGORY_ORDER,
  type ShoppingCategoryKey,
  type ShoppingCheckoutPayload,
  type ShoppingItem,
  type ShoppingItemPayload,
  type ShoppingSuggestion,
} from '@/types/shopping';
import { localToday } from '@/lib/finance-ledger';
import { resolveGuestFinance } from './guest-finance';

interface Response {
  status: number;
  body: unknown;
}

const ok = (data: unknown): Response => ({ status: 200, body: { data } });
const created = (data: unknown): Response => ({ status: 201, body: { data } });
const bad = (message: string): Response => ({ status: 400, body: { message } });

class GuestShoppingError extends Error {}

let seq = 0;
const nextId = () => `shopping-guest-${++seq}`;
const now = () => new Date().toISOString();

const seed = (name: string, category: ShoppingCategoryKey, extra: Partial<ShoppingItem> = {}): ShoppingItem => {
  // Distinct, ordered creation times so the seeded list reads oldest-first like a real one.
  const createdAt = new Date(Date.now() - (60 - seq) * 60_000).toISOString();
  return { id: nextId(), name, category, quantity: null, note: null, checked: false, checkedAt: null, createdAt, ...extra };
};

let items: ShoppingItem[] = [
  seed('Tomatoes', 'PRODUCE', { quantity: '1 kg' }),
  seed('Spinach', 'PRODUCE', { quantity: '2 bunches' }),
  seed('Bananas', 'PRODUCE', { quantity: '6', note: 'ripe, not green' }),
  seed('Milk', 'DAIRY', { quantity: '2 L' }),
  seed('Paneer', 'DAIRY', { quantity: '250 g' }),
  seed('Toor dal', 'GRAINS', { quantity: '1 kg' }),
  seed('Peanut butter', 'PANTRY', { note: 'the crunchy one' }),
  seed('Dishwash liquid', 'HOUSEHOLD'),
  seed('Oats', 'GRAINS', { quantity: '1 kg', checked: true, checkedAt: now() }),
];

interface Remembered {
  name: string;
  category: ShoppingCategoryKey;
  count: number;
  lastAdded: string;
  userFiled: boolean;
}

const rememberedAgo = (name: string, category: ShoppingCategoryKey, count: number, days: number): Remembered => ({
  name, category, count, lastAdded: new Date(Date.now() - days * 86_400_000).toISOString(), userFiled: false,
});

/** What the list has learned — ShoppingMemory on the server. */
let memory: Remembered[] = [
  rememberedAgo('Milk', 'DAIRY', 14, 1),
  rememberedAgo('Curd', 'DAIRY', 11, 3),
  rememberedAgo('Bread', 'BAKERY', 9, 4),
  rememberedAgo('Onions', 'PRODUCE', 8, 6),
  rememberedAgo('Coriander', 'PRODUCE', 7, 5),
  rememberedAgo('Atta', 'GRAINS', 4, 12),
  rememberedAgo('Basmati rice', 'GRAINS', 3, 20),
  rememberedAgo('Green tea', 'BEVERAGES', 3, 9),
  rememberedAgo('Ginger', 'PRODUCE', 5, 8),
  rememberedAgo('Detergent', 'HOUSEHOLD', 2, 25),
  rememberedAgo('Tomatoes', 'PRODUCE', 10, 2),
];

const score = (r: Remembered, at: number) =>
  r.count * Math.pow(0.5, Math.max(0, (at - new Date(r.lastAdded).getTime()) / 86_400_000) / 14);

function remember(item: ShoppingItem, userFiled: boolean, count: boolean) {
  let entry = memory.find((r) => nameKey(r.name) === nameKey(item.name));
  if (!entry) {
    entry = { name: item.name, category: item.category, count: 0, lastAdded: now(), userFiled: false };
    memory.push(entry);
  }
  entry.name = item.name;
  if (!entry.userFiled || userFiled) entry.category = item.category;
  entry.userFiled ||= userFiled;
  if (count) {
    entry.count++;
    entry.lastAdded = now();
  }
}


const nameKey = (name: string) => name.trim().toLowerCase();
const blankToNull = (value?: string | null) => (value?.trim() ? value.trim() : null);

function requireCategory(value: string): ShoppingCategoryKey {
  const key = value.trim().toUpperCase().replace(/ /g, '_');
  if (!(SHOPPING_CATEGORY_ORDER as readonly string[]).includes(key)) {
    throw new GuestShoppingError(`Unknown category: ${value}`);
  }
  return key as ShoppingCategoryKey;
}

function requireName(raw: unknown): string {
  const name = typeof raw === 'string' ? cleanItemName(raw) : '';
  if (!name) throw new GuestShoppingError('Name is required');
  if (name.length > 80) throw new GuestShoppingError('Name is too long');
  return name;
}

/** Port of ShoppingListService.addAll: one result per request, existing items merged, never duplicated. */
function addAll(requests: ShoppingItemPayload[]): ShoppingItem[] {
  const byName = new Map(items.map((item) => [nameKey(item.name), item]));
  const result: ShoppingItem[] = [];
  const added: ShoppingItem[] = [];
  let size = items.length;

  for (const request of requests) {
    const name = requireName(request.name);
    const toBasket = request.checked === true;
    const match = byName.get(nameKey(name));

    if (match) {
      if (match.checked && !toBasket) {
        remember(match, false, true);
        match.checked = false;
        match.checkedAt = null;
        if (request.quantity?.trim()) match.quantity = request.quantity.trim();
      } else if (!match.checked && toBasket) {
        match.checked = true;
        match.checkedAt = now();
      }
      if (!match.quantity && request.quantity?.trim()) match.quantity = request.quantity.trim();
      if (!match.note && request.note?.trim()) match.note = request.note.trim();
      result.push(match);
      continue;
    }

    if (size >= SHOPPING_MAX_ITEMS) {
      throw new GuestShoppingError(
        `Your list is full (${SHOPPING_MAX_ITEMS} items) — clear what's in the basket before adding more`,
      );
    }
    const item: ShoppingItem = {
      id: nextId(),
      name,
      category: request.category
        ? requireCategory(request.category)
        : (memory.find((r) => nameKey(r.name) === nameKey(name))?.category ?? guessCategory(name)),
      quantity: blankToNull(request.quantity),
      note: blankToNull(request.note),
      checked: toBasket,
      checkedAt: toBasket ? now() : null,
      createdAt: now(),
    };
    byName.set(nameKey(name), item);
    if (!toBasket) remember(item, false, true);
    added.push(item);
    result.push(item);
    size++;
  }
  items = [...items, ...added];
  return result.map((item) => ({ ...item }));
}

function findItem(id: string): ShoppingItem {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new GuestShoppingError(`Shopping item not found: ${id}`);
  return item;
}

export function resolveGuestShopping(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname;
  if (!path.includes('/api/v1/shopping/')) return null;
  const body = () => JSON.parse(rawBody || '{}');

  try {
    if (path.endsWith('/shopping/items') && method === 'GET') {
      return ok(sortItems(items).map((item) => ({ ...item })));
    }
    if (path.endsWith('/shopping/items') && method === 'POST') {
      return created(addAll([body() as ShoppingItemPayload])[0]);
    }
    if (path.endsWith('/shopping/items/batch') && method === 'POST') {
      const requests = (body() as { items?: ShoppingItemPayload[] }).items ?? [];
      if (requests.length === 0) return bad('Add at least one item');
      if (requests.length > 50) return bad('Add up to 50 items at a time');
      return created(addAll(requests));
    }
    if (path.endsWith('/shopping/suggestions') && method === 'GET') {
      const onList = new Set(items.map((item) => nameKey(item.name)));
      const at = Date.now();
      const suggestions: ShoppingSuggestion[] = memory
        .filter((r) => !onList.has(nameKey(r.name)))
        .sort((a, b) => score(b, at) - score(a, at) || a.name.localeCompare(b.name))
        .slice(0, 16)
        .map(({ name, category, count, lastAdded }) => ({ name, category, count, lastAdded }));
      return ok(suggestions);
    }
    if (path.endsWith('/shopping/suggestions/forget') && method === 'POST') {
      const name = (body() as { name?: string }).name ?? '';
      memory = memory.filter((r) => nameKey(r.name) !== nameKey(name));
      return ok(null);
    }
    if (path.endsWith('/shopping/items/checkout') && method === 'POST') {
      const request = body() as ShoppingCheckoutPayload;
      const basket = items.filter((item) => item.checked);
      let transactionId: string | null = null;
      if (request.amount != null && request.amount > 0) {
        const category = request.category?.trim() || 'Groceries';
        const store = request.store?.trim();
        const parts = [category, ...(store ? [store] : []), ...(basket.length ? [`${basket.length} ${basket.length === 1 ? 'item' : 'items'}`] : [])];
        const res = resolveGuestFinance(new URL('/api/v1/finance/transactions', 'http://localhost'), 'POST', JSON.stringify({
          description: parts.join(' · '), amount: request.amount, category, type: 'Expense', date: request.date ?? localToday(),
        }));
        if (!res || res.status >= 400) return res ?? bad('Could not log the shop');
        transactionId = ((res.body as { data?: { id?: string } }).data?.id) ?? null;
      } else if (basket.length === 0) {
        return bad('The basket is empty');
      }
      items = items.filter((item) => !item.checked);
      return ok({ removed: sortItems(basket).map((item) => ({ ...item })), transactionId });
    }
    if (path.endsWith('/shopping/items/clear-checked') && method === 'POST') {
      const removed = sortItems(items.filter((item) => item.checked));
      items = items.filter((item) => !item.checked);
      return ok(removed.map((item) => ({ ...item })));
    }

    const checkedMatch = path.match(/\/shopping\/items\/([^/]+)\/checked$/);
    if (checkedMatch && method === 'PATCH') {
      const item = findItem(checkedMatch[1]);
      const checked = (body() as { checked?: boolean }).checked;
      if (typeof checked !== 'boolean') return bad('checked is required');
      if (item.checked !== checked) {
        item.checked = checked;
        item.checkedAt = checked ? now() : null;
      }
      return ok({ ...item });
    }

    const itemMatch = path.match(/\/shopping\/items\/([^/]+)$/);
    if (itemMatch && method === 'PUT') {
      const item = findItem(itemMatch[1]);
      const request = body() as ShoppingItemPayload;
      const name = requireName(request.name);
      if (nameKey(name) !== nameKey(item.name) && items.some((o) => o.id !== item.id && nameKey(o.name) === nameKey(name))) {
        return bad(`${name} is already on your list`);
      }
      item.name = name;
      if (request.category) {
        const category = requireCategory(request.category);
        const moved = category !== item.category;
        item.category = category;
        if (moved) remember(item, true, false);
      }
      item.quantity = blankToNull(request.quantity);
      item.note = blankToNull(request.note);
      return ok({ ...item });
    }
    if (itemMatch && method === 'DELETE') {
      findItem(itemMatch[1]);
      items = items.filter((item) => item.id !== itemMatch[1]);
      return ok(null);
    }
  } catch (err) {
    if (err instanceof GuestShoppingError) return bad(err.message);
    throw err;
  }
  return null;
}
