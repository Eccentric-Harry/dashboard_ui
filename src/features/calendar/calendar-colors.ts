// Calendar colour resolution — shared by the route (grid, filters, popovers)
// and the add/edit modal. Category colours and per-event overrides are stored
// locally (localStorage), never on the server.

export const CATEGORY_OPTIONS = [
  { label: 'Personal', color: '#7c3aed' },
  { label: 'Work', color: '#2563eb' },
  { label: 'Health', color: '#10b981' },
  { label: 'Learning', color: '#0d9488' },
  { label: 'Finance', color: '#d97706' },
  { label: 'Social', color: '#db2777' },
  { label: 'Movies', color: '#e11d48' },
]

// Mirrors the Google Calendar event-color palette 1:1 (see GOOGLE_EVENT_COLORS
// in the backend's GoogleCalendarClient) so a per-event override picked here
// maps onto the exact same colorId when pushed to a synced Google Calendar.
export const EVENT_COLOR_SWATCHES = [
  { name: 'Lavender', hex: '#7986cb' },
  { name: 'Sage', hex: '#33b679' },
  { name: 'Grape', hex: '#8e24aa' },
  { name: 'Flamingo', hex: '#e67c73' },
  { name: 'Banana', hex: '#f6bf26' },
  { name: 'Tangerine', hex: '#f4511e' },
  { name: 'Peacock', hex: '#039be5' },
  { name: 'Graphite', hex: '#616161' },
  { name: 'Blueberry', hex: '#3f51b5' },
  { name: 'Basil', hex: '#0b8043' },
  { name: 'Tomato', hex: '#d50000' },
]

const CATEGORY_HUES: Record<string, number> = {
  personal: 270,
  work: 210,
  health: 142,
  learning: 175,
  finance: 35,
  social: 330,
}

function hueForCategory(category?: string) {
  const normalized = (category || '').trim().toLowerCase()
  if (!normalized) return 210
  if (CATEGORY_HUES[normalized] !== undefined) return CATEGORY_HUES[normalized]
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function overrideLightColors(colorStr: string) {
  const upper = colorStr.toUpperCase()
  if (upper === '#C8F3A3' || upper === 'C8F3A3') return '#7c3aed' // Bold Violet
  if (upper === '#9EE7E8' || upper === '9EE7E8') return '#10b981' // Bold Emerald
  if (upper === '#9BD7FF' || upper === '9BD7FF') return '#2563eb' // Bold Blue
  if (upper === '#C9BFF6' || upper === 'C9BFF6') return '#0d9488' // Bold Teal
  if (upper === '#FFD37D' || upper === 'FFD37D') return '#d97706' // Bold Amber
  if (upper === '#FFB4D2' || upper === 'FFB4D2') return '#db2777' // Bold Pink/Rose
  return colorStr
}

function readStore(key: string): Record<string, string> {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved)
  } catch {
    // storage blocked or corrupt — fall back to defaults
  }
  return {}
}

function writeStore(key: string, value: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked — the change still applies for this visit
  }
}

const CUSTOM_COLORS_KEY = 'calendar_category_custom_colors'
let customCategoryColors = readStore(CUSTOM_COLORS_KEY)

export function setCustomCategoryColor(category: string, color: string) {
  customCategoryColors = { ...customCategoryColors, [category.toLowerCase()]: color }
  writeStore(CUSTOM_COLORS_KEY, customCategoryColors)
}

export function resetCustomCategoryColors(categories: string[]) {
  const next = { ...customCategoryColors }
  categories.forEach((cat) => delete next[cat.trim().toLowerCase()])
  customCategoryColors = next
  writeStore(CUSTOM_COLORS_KEY, customCategoryColors)
}

export function colorForCategory(category: string) {
  const normalized = (category || '').trim().toLowerCase()
  if (customCategoryColors[normalized]) return customCategoryColors[normalized]
  const match = CATEGORY_OPTIONS.find((option) => option.label.toLowerCase() === normalized)
  if (match) return match.color
  return `hsl(${hueForCategory(category)}, 55%, 42%)`
}

// Per-event color overrides (Google Calendar-style "change this one event's
// color" independent of its category/calendar), keyed by item id.
const ITEM_COLOR_OVERRIDES_KEY = 'calendar_item_custom_colors'
let customItemColors = readStore(ITEM_COLOR_OVERRIDES_KEY)

export function getCustomItemColor(item: { id?: string }) {
  if (!item.id) return undefined
  return customItemColors[item.id]
}

export function setCustomItemColor(id: string, color: string) {
  customItemColors = { ...customItemColors, [id]: color }
  writeStore(ITEM_COLOR_OVERRIDES_KEY, customItemColors)
}

export function clearCustomItemColor(id: string) {
  if (!(id in customItemColors)) return
  const next = { ...customItemColors }
  delete next[id]
  customItemColors = next
  writeStore(ITEM_COLOR_OVERRIDES_KEY, customItemColors)
}

/**
 * Single source of truth for what color an item renders with, everywhere
 * (filters, month capsules, grid chips, popover, sidebar card). A per-event
 * custom color always wins first. Otherwise the category determines the
 * color — registered categories use the shared palette and unknown ones a
 * stable hash hue. A stored item color only applies as a last resort when the
 * item has no category at all (e.g. some Google-synced events).
 */
export function displayColorForItem(item: { id?: string; category?: string; color?: string }) {
  const override = getCustomItemColor(item)
  if (override) return override
  const normalized = (item.category || '').trim().toLowerCase()
  if (normalized) return colorForCategory(item.category!)
  if (item.color) return overrideLightColors(item.color)
  return colorForCategory('Personal')
}

const CUSTOM_CATEGORIES_KEY = 'calendar_custom_categories'

export function readCustomCategories(): string[] {
  try {
    const saved = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed.map((c: string) => c.trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

export function saveCustomCategories(list: string[]) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(list))
  } catch {
    // storage blocked — the category still applies to this save
  }
}
