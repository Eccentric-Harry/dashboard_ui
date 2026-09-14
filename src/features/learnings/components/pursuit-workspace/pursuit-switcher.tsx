import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Star } from 'lucide-react'
import type { LearningPursuit } from '@/types/learnings'
import { cn } from '@/lib/utils'
import { countLeaves } from '../../pursuit-tree'

interface PursuitSwitcherProps {
  pursuits: LearningPursuit[]
  currentId: string
  onSelect: (pursuitId: string) => void
}

/** Jump between active pursuits without going back to the dashboard. */
export function PursuitSwitcher({ pursuits, currentId, onSelect }: PursuitSwitcherProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (pursuits.length < 2) return null
  const position = pursuits.findIndex((p) => p.id === currentId) + 1

  return (
    <div className="pw-switch" ref={wrapRef}>
      <button
        type="button"
        className="pw-chip-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {position > 0 ? `Pursuit ${position} of ${pursuits.length}` : `${pursuits.length} pursuits`}
        <ChevronDown size={14} className={cn('pw-switch-chevron', open && 'is-open')} />
      </button>

      {open && (
        <div className="pw-switch-menu" role="menu" aria-label="Switch pursuit">
          {pursuits.map((p) => {
            const { done, total } = countLeaves(p.steps)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const current = p.id === currentId
            return (
              <button
                key={p.id}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                className={cn('pw-switch-item', current && 'is-current')}
                onClick={() => {
                  setOpen(false)
                  if (!current) onSelect(p.id)
                }}
              >
                <span className="pw-switch-title">
                  {p.isPrimary && <Star size={10} fill="currentColor" strokeWidth={0} className="pw-switch-star" aria-label="Main pursuit" />}
                  {p.title}
                </span>
                <span className="pw-switch-sub">{p.category} · {done}/{total} steps</span>
                <span className="pw-switch-pct">{current ? <Check size={14} strokeWidth={2.6} /> : `${pct}%`}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
