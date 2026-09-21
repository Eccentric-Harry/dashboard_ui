// Which celebrations have already had their full moment, per scope (normally a day).
//
// localStorage rather than sessionStorage: "first time today" has to survive closing
// and reopening the PWA, or the morning's fanfare replays every launch. Each key keeps
// only its latest scope, so the record never grows past one entry per goal. The
// in-memory map is both the cache and the fallback when storage is unavailable.

const STORAGE_KEY = 'celebration-ledger'

let memory: Map<string, string> | null = null

function load(): Map<string, string> {
  if (memory) return memory
  memory = new Map()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object') {
      for (const [key, scope] of Object.entries(parsed)) {
        if (typeof scope === 'string') memory.set(key, scope)
      }
    }
  } catch {
    // Unreadable or blocked storage: start empty, the memory map still dedupes this session.
  }
  return memory
}

export function hasCelebrated(key: string, scope: string): boolean {
  return load().get(key) === scope
}

export function markCelebrated(key: string, scope: string): void {
  const ledger = load()
  ledger.set(key, scope)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(ledger)))
  } catch {
    // Private mode / quota: the in-memory record covers the rest of this session.
  }
}

/** Test seam — forget everything, including what was read from storage. */
export function resetCelebrationLedger(): void {
  memory = null
}
