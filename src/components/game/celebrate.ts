import { useCallback, useState } from 'react'

// Celebration plumbing shared by every route: wraps the existing ConfettiBurst
// (render it with the returned trigger) and adds gentle haptics. Achievements
// fire once — deduped by `${type}:${date}` in memory and sessionStorage so a
// refetch or remount can never re-fire one.
//
// Sound is deliberately absent (haptics yes, audio no), and everything that
// moves is skipped under prefers-reduced-motion. The boolean return still
// reports "newly achieved" in that case so inline banners (not motion) can show.

export { ConfettiBurst } from '../views/home-overview/components/confetti-burst'

const firedThisSession = new Set<string>()
const STORAGE_PREFIX = 'game-celebrated:'

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function alreadyFired(key: string): boolean {
  if (firedThisSession.has(key)) return true
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + key) != null
  } catch {
    return false
  }
}

function markFired(key: string): void {
  firedThisSession.add(key)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, '1')
  } catch {
    // Private mode: the in-memory set still covers this session.
  }
}

export interface Celebration {
  /** Feed this to <ConfettiBurst trigger={...} />. */
  confettiTrigger: number
  /**
   * Fire an achievement once per `${type}:${date}`. Returns true when it
   * newly fired (show the banner), false when it was already celebrated.
   */
  celebrate: (type: string, date: string) => boolean
}

export function useCelebration(): Celebration {
  const [confettiTrigger, setConfettiTrigger] = useState(0)

  const celebrate = useCallback((type: string, date: string): boolean => {
    const key = `${type}:${date}`
    if (alreadyFired(key)) return false
    markFired(key)
    if (!prefersReducedMotion()) {
      setConfettiTrigger((n) => n + 1)
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([12, 40, 18])
      }
    }
    return true
  }, [])

  return { confettiTrigger, celebrate }
}
