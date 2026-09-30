// The route's primary "add" action, kept within reach once the header's add pill has
// scrolled away. Desktop only — phones already have the dock's quick-add bubble.
//
// It renders inside the route so the route's modals still cover it, but it parks in the
// stage's empty right margin (routes inset their content 58px from the stage edge) so it
// never sits on top of an amount. `position: fixed` is relative to the window here — the
// stage's `container-type` doesn't make it a containing block — so the offset to the
// stage's edge is measured, and converted out of `html { zoom }` (rendered ÷ layout width).

import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

import './floating-add.css'

interface FloatingAddProps {
  /** The header's own add button — the floating one shows only while it is out of view. */
  watch: RefObject<HTMLElement | null>
  label: string
  onClick: () => void
  /** Keep it away regardless of scroll, e.g. while a full-page detail view covers the route. */
  suppressed?: boolean
}

/** Gap between the button and the stage's right edge, in CSS px. */
const INSET = 3

function FloatingAdd({ watch, label, onClick, suppressed = false }: FloatingAddProps) {
  const [outOfView, setOutOfView] = useState(false)
  const [right, setRight] = useState<number | null>(null)

  useEffect(() => {
    const target = watch.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    // The header sits at the top of the content, so out of view means scrolled past. A
    // hidden header button (display: none on phones) reports the same — the button is
    // hidden there by CSS anyway.
    const observer = new IntersectionObserver(([entry]) => setOutOfView(!entry.isIntersecting))
    observer.observe(target)
    return () => observer.disconnect()
  }, [watch])

  useEffect(() => {
    const stage = watch.current?.closest<HTMLElement>('.dashboard-stage')
    if (!stage) return
    const place = () => {
      const rect = stage.getBoundingClientRect()
      const zoom = stage.offsetWidth > 0 ? rect.width / stage.offsetWidth : 1
      setRight(Math.max(0, (window.innerWidth - rect.right) / (zoom || 1)) + INSET)
    }
    place()
    const resize = new ResizeObserver(place)
    resize.observe(stage)
    window.addEventListener('resize', place)
    return () => {
      resize.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [watch])

  const shown = outOfView && !suppressed

  return (
    <button
      type="button"
      className={cn('floating-add', shown && 'is-shown')}
      style={right != null ? ({ right } as CSSProperties) : undefined}
      onClick={onClick}
      aria-label={label}
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
    >
      <span className="floating-add-ic" aria-hidden="true">
        <Plus size={18} strokeWidth={2.75} />
      </span>
      <span className="floating-add-label">{label}</span>
    </button>
  )
}

export { FloatingAdd }
