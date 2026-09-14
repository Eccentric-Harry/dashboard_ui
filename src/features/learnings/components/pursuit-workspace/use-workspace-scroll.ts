import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { sectionDomId } from './curriculum-ids'

/** Up next counts as scrolled away once it passes under the sticky bar. */
const BAR_CLEARANCE = 64
/** A milestone becomes "current" once its top crosses this line below the viewport top. */
const SPY_LINE = 140
/** Room left above a milestone jumped to, clear of the sticky bar. */
const START_GAP = 66

/** The nearest ancestor that scrolls, or null when the window does (the phone layout). */
export function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** On-screen pixels per CSS pixel of the element — the desktop stage can be zoomed. */
const scaleOf = (el: HTMLElement) => (el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1)

/** Where a scroll container's content is actually visible on screen. */
function visibleBounds(parent: HTMLElement | null) {
  if (!parent) return { top: 0, bottom: window.innerHeight }
  const box = parent.getBoundingClientRect()
  return { top: Math.max(box.top, 0), bottom: Math.min(box.bottom, window.innerHeight) }
}

/** Whether the element is fully on screen and clear of the sticky bar. */
export function isComfortablyVisible(el: HTMLElement): boolean {
  const { top, bottom } = visibleBounds(getScrollParent(el))
  const rect = el.getBoundingClientRect()
  return rect.top >= top + BAR_CLEARANCE && rect.bottom <= bottom - 24
}

/**
 * Scrolls only the element's own scroll container. scrollIntoView would also drag the
 * page shell around the fixed-height desktop stage.
 */
export function scrollToElement(el: HTMLElement, align: 'start' | 'center') {
  const parent = getScrollParent(el)
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
  const { top, bottom } = visibleBounds(parent)
  const rect = el.getBoundingClientRect()
  const delta = align === 'start'
    ? rect.top - top - START_GAP
    : rect.top - top - (bottom - top - rect.height) / 2
  if (parent) parent.scrollTo({ top: parent.scrollTop + delta / scaleOf(parent), behavior })
  else window.scrollTo({ top: window.scrollY + delta, behavior })
}

/**
 * Scroll state for the workspace: whether the sticky bar is pinned over content
 * (`stuck`), whether it should condense (Up next has scrolled away), and which
 * milestone is in view. Tracks the dashboard's own scroll box on desktop and the
 * window on phones.
 */
export function useWorkspaceScroll(
  rootRef: RefObject<HTMLElement | null>,
  upNextRef: RefObject<HTMLElement | null>,
  sectionIds: string[],
) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const [condensed, setCondensed] = useState(false)
  // Set by a navigator jump and held until the reader scrolls by hand, so a short last
  // milestone that can't reach the spy line keeps its highlight.
  const lockedRef = useRef(false)
  const idsKey = sectionIds.join('|')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const parent = getScrollParent(root)
    const ids = idsKey ? idsKey.split('|') : []
    let frame = 0

    const measure = () => {
      frame = 0
      const top = parent ? parent.getBoundingClientRect().top : 0
      // The bar sits in flow at the top of the workspace, so it's pinned once that top passes.
      setStuck(root.getBoundingClientRect().top < top + 8)
      const upNext = upNextRef.current
      setCondensed(upNext ? upNext.getBoundingClientRect().bottom < top + BAR_CLEARANCE : false)

      if (ids.length === 0 || lockedRef.current) return
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(sectionDomId(id))
        if (el && el.getBoundingClientRect().top <= top + SPY_LINE) current = id
      }
      const scrollTop = parent ? parent.scrollTop : window.scrollY
      const atBottom = parent
        ? parent.scrollTop + parent.clientHeight >= parent.scrollHeight - 2
        : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (atBottom && scrollTop > 0) current = ids[ids.length - 1]
      setActiveId(current)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const release = () => {
      lockedRef.current = false
    }

    const target: HTMLElement | Window = parent ?? window
    target.addEventListener('scroll', schedule, { passive: true })
    target.addEventListener('wheel', release, { passive: true })
    target.addEventListener('touchmove', release, { passive: true })
    window.addEventListener('keydown', release)
    window.addEventListener('resize', schedule)
    // Folding milestones changes the layout without a scroll event.
    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    schedule()

    return () => {
      target.removeEventListener('scroll', schedule)
      target.removeEventListener('wheel', release)
      target.removeEventListener('touchmove', release)
      window.removeEventListener('keydown', release)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [rootRef, upNextRef, idsKey])

  /** Highlight a milestone straight away and hold it while the jump scrolls there. */
  const lockTo = useCallback((id: string) => {
    lockedRef.current = true
    setActiveId(id)
  }, [])

  return { activeId, stuck, condensed, lockTo }
}
