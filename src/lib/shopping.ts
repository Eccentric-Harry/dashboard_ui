// Shopping list maths: filing an item by name, reading "2 kg tomatoes, milk" as items, and the
// aisle-order sort / grouping the route renders. Pure — no store, no DOM — so it is unit-tested
// (__tests__/shopping.test.ts) and guest mode (mocks/guest-shopping.ts) reuses it.
//
// `guessCategory` is a port of ShoppingCategories.guess on the server, over the generated word
// tables in ./shopping-words. The server is the source of truth: the client only guesses so an
// item lands in the right place the instant it is typed; the server's answer replaces it.

import {
  SHOPPING_CATEGORY_ORDER,
  type ShoppingCategoryKey,
  type ShoppingItem,
  type ShoppingItemPayload,
} from '@/types/shopping';
import { SHOPPING_PHRASES, SHOPPING_WORDS } from './shopping-words';

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategoryKey, string> = {
  PRODUCE: 'Fruits & vegetables',
  DAIRY: 'Dairy',
  BAKERY: 'Bakery',
  GRAINS: 'Grains & pulses',
  SPICES: 'Spices',
  PANTRY: 'Pantry',
  SNACKS: 'Snacks & sweets',
  BEVERAGES: 'Drinks',
  FROZEN: 'Frozen',
  HOUSEHOLD: 'Household',
  PERSONAL_CARE: 'Personal care',
  OTHER: 'Other',
};

/** Matches the server: a list is a list, not an archive. */
export const SHOPPING_MAX_ITEMS = 300;
/** The most items one quick-add (and one batch request) carries. */
export const SHOPPING_MAX_BATCH = 50;

// ── Filing ───────────────────────────────────────────────────────────────

const PHRASE_LIST: [string, ShoppingCategoryKey][] = (
  Object.entries(SHOPPING_PHRASES) as [ShoppingCategoryKey, string[]][]
).flatMap(([category, phrases]) => phrases.map((phrase): [string, ShoppingCategoryKey] => [phrase, category]));

// First registration of a word wins, as on the server (putIfAbsent).
const WORD_MAP: Map<string, ShoppingCategoryKey> = (() => {
  const map = new Map<string, ShoppingCategoryKey>();
  for (const [category, words] of Object.entries(SHOPPING_WORDS) as [ShoppingCategoryKey, string[]][]) {
    for (const word of words) if (!map.has(word)) map.set(word, category);
  }
  return map;
})();

function lookup(token: string): ShoppingCategoryKey | undefined {
  const direct = WORD_MAP.get(token);
  if (direct) return direct;
  if (token.endsWith('ies') && token.length > 4) {
    const singular = WORD_MAP.get(`${token.slice(0, -3)}y`);
    if (singular) return singular;
  }
  if (token.endsWith('es') && token.length > 3) {
    const singular = WORD_MAP.get(token.slice(0, -2));
    if (singular) return singular;
  }
  if (token.endsWith('s') && token.length > 3) return WORD_MAP.get(token.slice(0, -1));
  return undefined;
}

/**
 * The best category for an item name — never undefined; 'OTHER' when nothing matches. The longest
 * matching phrase wins, then the head noun (the last word: a tomato ketchup is a ketchup), then
 * the other words right to left.
 */
export function guessCategory(name: string): ShoppingCategoryKey {
  const tokens = name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (tokens.length === 0) return 'OTHER';

  const spaced = ` ${tokens.join(' ')} `;
  let best: ShoppingCategoryKey | undefined;
  let bestLength = 0;
  for (const [phrase, category] of PHRASE_LIST) {
    if (phrase.length > bestLength && spaced.includes(` ${phrase} `)) {
      best = category;
      bestLength = phrase.length;
    }
  }
  if (best) return best;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const category = lookup(tokens[i]);
    if (category) return category;
  }
  return 'OTHER';
}

// ── Quick add ────────────────────────────────────────────────────────────

const UNIT_ALIASES: Record<string, string> = {
  kg: 'kg', kgs: 'kg', g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
  l: 'L', ltr: 'L', ltrs: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L', ml: 'ml',
  pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs',
  pack: 'pack', packs: 'packs', packet: 'packet', packets: 'packets',
  dozen: 'dozen', doz: 'dozen', box: 'box', boxes: 'boxes', bottle: 'bottle', bottles: 'bottles',
  can: 'can', cans: 'cans', bunch: 'bunch', bunches: 'bunches', bag: 'bag', bags: 'bags',
  tin: 'tin', tins: 'tins', loaf: 'loaf', loaves: 'loaves',
};
const UNIT_WORDS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length).join('|');
const NUMBER = String.raw`\d+(?:[.,]\d+)?(?:\/\d+)?`;
const LEADING_QUANTITY = new RegExp(`^(${NUMBER})\\s*(${UNIT_WORDS})?(?=\\s)\\s+(?:of\\s+)?(.+)$`, 'i');
const TRAILING_QUANTITY = new RegExp(`^(.+?)\\s+(${NUMBER})\\s*(${UNIT_WORDS})$`, 'i');
const TIMES_QUANTITY = /^(.+?)\s*[x×]\s*(\d+)$/i;

const quantityText = (amount: string, unit?: string) =>
  unit ? `${amount} ${UNIT_ALIASES[unit.toLowerCase()] ?? unit.toLowerCase()}` : amount;

/** Trims, collapses whitespace and capitalises the first letter, as the server does. */
export function cleanItemName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

/** One typed piece → a name and an optional quantity: "2 kg tomatoes", "milk 2 l", "eggs x12". */
export function parseQuickItem(piece: string): ShoppingItemPayload | null {
  const text = piece.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  let name = text;
  let quantity: string | undefined;

  const leading = LEADING_QUANTITY.exec(text);
  const trailing = leading ? null : TRAILING_QUANTITY.exec(text);
  const times = leading || trailing ? null : TIMES_QUANTITY.exec(text);
  if (leading) {
    quantity = quantityText(leading[1], leading[2]);
    name = leading[3];
  } else if (trailing) {
    name = trailing[1];
    quantity = quantityText(trailing[2], trailing[3]);
  } else if (times) {
    name = times[1];
    quantity = times[2];
  }

  name = cleanItemName(name).slice(0, 80);
  if (!name) return null;
  return quantity ? { name, quantity: quantity.slice(0, 24) } : { name };
}

/**
 * Reads what was typed into the add bar: pieces separated by commas, semicolons or new lines.
 * A category picked in the bar applies to every piece; otherwise they are filed by name.
 */
export function parseQuickAdd(text: string, category?: ShoppingCategoryKey): ShoppingItemPayload[] {
  const items = text
    .split(/[,;\n]+/)
    .map(parseQuickItem)
    .filter((item): item is ShoppingItemPayload => item !== null)
    .slice(0, SHOPPING_MAX_BATCH);
  return category ? items.map((item) => ({ ...item, category })) : items;
}

// ── Reading the list ─────────────────────────────────────────────────────

const categoryRank = (category: string) => {
  const index = (SHOPPING_CATEGORY_ORDER as readonly string[]).indexOf(category);
  return index < 0 ? SHOPPING_CATEGORY_ORDER.length : index;
};

/** The server's display order: aisle, then to-get before in-basket, then oldest first, then A–Z. */
export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      Number(a.checked) - Number(b.checked) ||
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );
}

export interface ShoppingAisle {
  category: ShoppingCategoryKey;
  /** Still to get, oldest first. */
  toGet: ShoppingItem[];
}

/** The to-get items grouped by category, in aisle order, empty aisles left out. */
export function aislesOf(items: ShoppingItem[]): ShoppingAisle[] {
  const byCategory = new Map<ShoppingCategoryKey, ShoppingItem[]>();
  for (const item of sortItems(items)) {
    if (item.checked) continue;
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
  }
  return SHOPPING_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    toGet: byCategory.get(category) ?? [],
  }));
}

/** What's in the basket, most recently picked first. */
export function basketOf(items: ShoppingItem[]): ShoppingItem[] {
  return items
    .filter((item) => item.checked)
    .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? '') || a.name.localeCompare(b.name));
}

export interface ShoppingTally {
  total: number;
  toGet: number;
  inBasket: number;
  /** 0–1; 0 for an empty list. */
  done: number;
}

export function tallyOf(items: ShoppingItem[]): ShoppingTally {
  const inBasket = items.filter((item) => item.checked).length;
  return {
    total: items.length,
    toGet: items.length - inBasket,
    inBasket,
    done: items.length === 0 ? 0 : inBasket / items.length,
  };
}

/** A placeholder shown at once while the server files the real item; its id marks it as unsaved. */
export const TEMP_ID_PREFIX = 'tmp-';
export const isTempItem = (item: ShoppingItem) => item.id.startsWith(TEMP_ID_PREFIX);

export function draftItem(payload: ShoppingItemPayload, id: string, now: string): ShoppingItem {
  return {
    id,
    name: cleanItemName(payload.name),
    category: payload.category ?? guessCategory(payload.name),
    quantity: payload.quantity?.trim() || null,
    note: payload.note?.trim() || null,
    checked: payload.checked ?? false,
    checkedAt: payload.checked ? now : null,
    createdAt: now,
  };
}

/** Plain text for pasting into a chat: the to-get items by aisle. */
export function listAsText(items: ShoppingItem[]): string {
  const lines = ['Shopping list'];
  for (const { category, toGet } of aislesOf(items)) {
    lines.push('', SHOPPING_CATEGORY_LABELS[category]);
    for (const item of toGet) {
      lines.push(`• ${item.name}${item.quantity ? ` — ${item.quantity}` : ''}`);
    }
  }
  return lines.join('\n');
}

// ── Optimistic updates ───────────────────────────────────────────────────

const nameKey = (name: string) => name.trim().toLowerCase();

/**
 * What the list will look like once the server has added these: the same merge rules as
 * ShoppingListService.addAll, applied locally so the route can answer a keystroke at once.
 * A name already to get is left alone, one in the basket comes back (taking a new quantity),
 * anything else becomes a placeholder with a temp id that {@link mergeServerItems} swaps out.
 */
export function foldIn(
  items: ShoppingItem[],
  payloads: ShoppingItemPayload[],
  makeId: () => string,
  now: string,
): ShoppingItem[] {
  const next = items.map((item) => ({ ...item }));
  const byName = new Map(next.map((item) => [nameKey(item.name), item]));
  for (const payload of payloads) {
    const name = cleanItemName(payload.name);
    if (!name) continue;
    const match = byName.get(nameKey(name));
    if (match) {
      const toBasket = payload.checked === true;
      if (match.checked && !toBasket) {
        match.checked = false;
        match.checkedAt = null;
        if (payload.quantity?.trim()) match.quantity = payload.quantity.trim();
      } else if (!match.checked && toBasket) {
        match.checked = true;
        match.checkedAt = now;
      }
      if (!match.quantity && payload.quantity?.trim()) match.quantity = payload.quantity.trim();
      if (!match.note && payload.note?.trim()) match.note = payload.note.trim();
      continue;
    }
    const draft = draftItem({ ...payload, name }, makeId(), now);
    byName.set(nameKey(name), draft);
    next.push(draft);
  }
  return next;
}

/** Swaps placeholders for what the server filed, and replaces any item it returned by id. */
export function mergeServerItems(items: ShoppingItem[], returned: ShoppingItem[]): ShoppingItem[] {
  const byId = new Map(returned.map((item) => [item.id, item]));
  const kept = items.filter((item) => !isTempItem(item)).map((item) => byId.get(item.id) ?? item);
  const known = new Set(kept.map((item) => item.id));
  return [...kept, ...returned.filter((item) => !known.has(item.id))];
}
