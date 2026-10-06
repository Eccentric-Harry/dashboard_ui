// Guest-mode wishlist API: the in-memory mirror of WishlistController / WishlistService.
// A guest can't reach the web, so a pasted link is read from the URL alone (lib/wishlist's
// port of the server's fallback). "Bought it" and "Save up for it" go through the guest
// finance resolver, so the ledger and "Saving for" on /finance show them exactly as for a
// real account. Pure over module state — `resolveGuestWishlist` returns null for anything it
// doesn't own.

import { localToday } from '@/lib/finance-ledger';
import { previewFromUrl } from '@/lib/wishlist';
import type { WishlistBuyPayload, WishlistItem, WishlistPayload } from '@/types/wishlist';
import { attachGuestGoalPhoto, resolveGuestFinance } from './guest-finance';

interface Response {
  status: number;
  body: unknown;
}

const ok = (data: unknown): Response => ({ status: 200, body: { data } });
const created = (data: unknown): Response => ({ status: 201, body: { data } });
const bad = (message: string): Response => ({ status: 400, body: { message } });

const MAX_OPEN = 100;
let seq = 0;
const nextId = () => `wish-guest-${++seq}`;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const seed = (over: Partial<WishlistItem> & Pick<WishlistItem, 'name'>): WishlistItem => ({
  id: nextId(),
  url: null,
  store: null,
  imageUrl: null,
  price: null,
  firstPrice: over.price ?? null,
  priceCheckedAt: null,
  priority: 'WANT',
  note: null,
  status: 'WANTED',
  boughtOn: null,
  boughtFor: null,
  transactionId: null,
  savingsGoalId: null,
  closedAt: null,
  createdAt: daysAgo(1),
  ...over,
});

let wishes: WishlistItem[] = [
  seed({
    name: 'iPhone 18 Pro', store: 'Apple', url: 'https://www.apple.com/in/iphone-18-pro/',
    imageUrl: '/goals/iphone-18-pro/light-silver.jpg', price: 164900, savingsGoalId: 'goal-guest-phone',
    note: 'Exchange the old phone — ₹30k off', createdAt: daysAgo(60),
  }),
  seed({
    name: 'Apple iPhone 15 (128 GB) - Black', store: 'Amazon', url: 'https://www.amazon.in/dp/B0CHX1W1XY',
    imageUrl: 'https://m.media-amazon.com/images/I/71657TiFeHL._SL1500_.jpg', price: 61999, firstPrice: 69900,
    note: 'Backup option if the Pro waits', createdAt: daysAgo(6),
  }),
  seed({
    name: 'Men Running T-Shirt Kiprun 100', store: 'Decathlon',
    url: 'https://www.decathlon.in/p/8771124/men-s-running-shoes-jogflow-100-1-black',
    imageUrl: 'https://contents.mediadecathlon.com/p3106744/e342e66f660f7c693db906127d08571c/p3106744.jpg?format=auto&f=768x0',
    price: 299, priority: 'NEED', createdAt: daysAgo(3),
  }),
  seed({ name: 'Kindle Paperwhite', store: 'Amazon', url: 'https://www.amazon.in/dp/B0CFPJYX7P', price: 16999, createdAt: daysAgo(34) }),
  seed({ name: 'Noise-cancelling headphones', store: 'Croma', price: 24990, note: 'Try them in the store first', createdAt: daysAgo(12) }),
  seed({ name: 'Yoga mat', store: 'Decathlon', price: 1299, status: 'BOUGHT', boughtOn: localToday(), boughtFor: 1199, closedAt: daysAgo(2), createdAt: daysAgo(20) }),
  seed({ name: 'Smartwatch', store: 'Flipkart', price: 14999, status: 'LET_GO', closedAt: daysAgo(9), createdAt: daysAgo(45) }),
];

const finance = (path: string, method: string, body?: unknown) =>
  resolveGuestFinance(new URL(path, 'http://localhost'), method, body === undefined ? undefined : JSON.stringify(body));

const clean = (value?: string | null) => (value?.trim() ? value.trim() : null);

function apply(wish: WishlistItem, payload: WishlistPayload): string | null {
  const name = (payload.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return 'Name is required';
  if (name.length > 120) return 'Name is too long';
  const url = clean(payload.url);
  const parsed = url ? previewFromUrl(url) : null;
  if (url && !parsed) return "That doesn't look like a web link";
  const image = clean(payload.imageUrl);
  if (image && !previewFromUrl(image) && !image.startsWith('/')) return "That doesn't look like a web link";
  wish.name = name;
  wish.url = parsed?.url ?? null;
  wish.store = clean(payload.store);
  wish.imageUrl = image;
  wish.price = payload.price != null && payload.price > 0 ? payload.price : null;
  wish.priority = payload.priority ?? 'WANT';
  wish.note = clean(payload.note);
  return null;
}

/** Port of WishlistService.reconcileGoals: a goal bought or archived on /finance shows up here. */
function reconcile() {
  const res = finance('/api/v1/savings-goals', 'GET');
  const goals = ((res?.body as { data?: { id: string; status: string; boughtOn: string | null; boughtFor: number | null }[] })?.data) ?? [];
  for (const wish of wishes) {
    if (!wish.savingsGoalId) continue;
    const goal = goals.find((g) => g.id === wish.savingsGoalId);
    if (!goal || goal.status === 'ARCHIVED') wish.savingsGoalId = null;
    else if (goal.status === 'BOUGHT' && wish.status === 'WANTED') {
      Object.assign(wish, { status: 'BOUGHT', boughtOn: goal.boughtOn, boughtFor: goal.boughtFor, closedAt: new Date().toISOString() });
    }
  }
}

const copy = (wish: WishlistItem) => ({ ...wish });

export function resolveGuestWishlist(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname;
  if (!path.includes('/api/v1/wishlist')) return null;
  const body = () => JSON.parse(rawBody || '{}');

  if (path.endsWith('/wishlist') && method === 'GET') {
    reconcile();
    return ok(wishes.map(copy));
  }
  if (path.endsWith('/wishlist/preview') && method === 'POST') {
    const preview = previewFromUrl((body() as { url?: string }).url ?? '');
    return preview ? ok(preview) : bad("That doesn't look like a web link");
  }
  if (path.endsWith('/wishlist') && method === 'POST') {
    if (wishes.filter((w) => w.status === 'WANTED').length >= MAX_OPEN) {
      return bad(`Your wishlist has ${MAX_OPEN} things on it — let some go first`);
    }
    const wish = seed({ name: '', createdAt: new Date().toISOString() });
    const error = apply(wish, body() as WishlistPayload);
    if (error) return bad(error);
    wish.firstPrice = wish.price;
    wish.priceCheckedAt = wish.price != null ? new Date().toISOString() : null;
    wishes = [wish, ...wishes];
    return created(copy(wish));
  }

  const action = path.match(/\/wishlist\/([^/]+)\/(refresh|buy|save-for|let-go|reopen)$/);
  const one = path.match(/\/wishlist\/([^/]+)$/);
  const id = action?.[1] ?? one?.[1];
  const wish = wishes.find((w) => w.id === id);
  if ((action || one) && !wish) return bad(`Wish not found: ${id}`);
  if (!wish) return null;

  if (one && method === 'PUT') {
    const before = wish.price;
    const error = apply(wish, body() as WishlistPayload);
    if (error) return bad(error);
    if (wish.price != null && wish.price !== before) {
      wish.priceCheckedAt = new Date().toISOString();
      wish.firstPrice ??= wish.price;
    }
    return ok(copy(wish));
  }
  if (one && method === 'DELETE') {
    wishes = wishes.filter((w) => w.id !== wish.id);
    return ok(null);
  }

  switch (action?.[2]) {
    case 'refresh':
      return bad(`Guest mode can't reach ${wish.store ?? 'the store'} — check the price there`);
    case 'buy': {
      if (wish.status !== 'WANTED') return bad(`${wish.name} is already ${wish.status === 'BOUGHT' ? 'bought' : 'let go'}`);
      const req = body() as WishlistBuyPayload;
      if (!(req.price > 0)) return bad('Price must be greater than 0');
      const date = req.date ?? localToday();
      const category = req.category?.trim() || 'Shopping';
      const description = wish.store ? `${wish.name.slice(0, 60)} · ${wish.store}` : wish.name.slice(0, 60);
      const goalOpen = wish.savingsGoalId != null;
      const res = goalOpen
        ? finance(`/api/v1/savings-goals/${wish.savingsGoalId}/buy`, 'POST', { price: req.price, category, description: description.slice(0, 80), date })
        : finance('/api/v1/finance/transactions', 'POST', { description, amount: req.price, category, type: 'Expense', date });
      if (!res || res.status >= 400) return res ?? bad('Could not log the purchase');
      if (!goalOpen) wish.transactionId = ((res.body as { data?: { id?: string } }).data?.id) ?? null;
      Object.assign(wish, { status: 'BOUGHT', boughtOn: date, boughtFor: req.price, closedAt: new Date().toISOString() });
      return ok(copy(wish));
    }
    case 'save-for': {
      if (wish.status !== 'WANTED') return bad(`${wish.name} is already ${wish.status === 'BOUGHT' ? 'bought' : 'let go'}`);
      if (wish.savingsGoalId) return ok(copy(wish));
      if (!(wish.price && wish.price > 0)) return bad('Add a price first — it becomes the goal\'s target');
      const name = wish.name.length <= 40 ? wish.name : `${wish.name.slice(0, 39).trim()}…`;
      const res = finance('/api/v1/savings-goals', 'POST', { name, kind: 'PURCHASE', icon: 'bag', listPrice: wish.price });
      if (!res || res.status >= 400) return res ?? bad('Could not create the goal');
      const goalId = (res.body as { data: { id: string } }).data.id;
      if (wish.imageUrl) attachGuestGoalPhoto(goalId, wish.imageUrl);
      wish.savingsGoalId = goalId;
      return ok(copy(wish));
    }
    case 'let-go':
      if (wish.status !== 'WANTED') return bad(`${wish.name} is already closed`);
      Object.assign(wish, { status: 'LET_GO', closedAt: new Date().toISOString() });
      return ok(copy(wish));
    case 'reopen':
      Object.assign(wish, { status: 'WANTED', boughtOn: null, boughtFor: null, transactionId: null, closedAt: null });
      return ok(copy(wish));
  }
  return null;
}
