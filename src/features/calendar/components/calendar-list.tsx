import { useState, type CSSProperties } from 'react'
import { Check, MoreHorizontal, Palette, Eye } from 'lucide-react'

import { cn } from '@/lib/utils'
import { colorForCategory } from '../calendar-colors'
import { formatDuration } from '../calendar-time'
import { PopoverMenu } from './composer/popover-menu'

type Props = {
  categories: string[]
  unchecked: string[]
  /** Planned minutes per category in the range the main view shows. */
  minutes: Map<string, number>
  rangeLabel: string
  onToggle: (category: string) => void
  onOnly: (category: string) => void
  onShowAll: () => void
  onEditColors: () => void
}

/**
 * Categories as calendars you can show or hide (Google's "My calendars"), each
 * with the time it holds in the visible range — a small quantified-self read
 * of where the week is going. The stacked bar on top is the same numbers.
 */
export function CalendarList({ categories, unchecked, minutes, rangeLabel, onToggle, onOnly, onShowAll, onEditColors }: Props) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const total = categories.reduce((sum, c) => sum + (minutes.get(c) ?? 0), 0)
  const segments = categories.filter((c) => (minutes.get(c) ?? 0) > 0)

  return (
    <section className="cv-cals" aria-label="Calendars">
      <header className="cv-side-head">
        <h3>Calendars</h3>
        <button
          ref={setMenuAnchor}
          type="button"
          className="cv-icon-btn is-sm"
          aria-label="Calendar options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreHorizontal size={14} />
        </button>
      </header>

      <div className="cv-cals-total">
        <span>
          {rangeLabel} · <b>{total ? formatDuration(total) : 'nothing'}</b> planned
        </span>
        <span className="cv-cals-bar" aria-hidden="true">
          {segments.map((c) => (
            <i
              key={c}
              className={cn(unchecked.includes(c) && 'is-off')}
              style={{ '--ev': colorForCategory(c), flexGrow: minutes.get(c) } as CSSProperties}
            />
          ))}
        </span>
      </div>

      <ul className="cv-cals-list">
        {categories.map((c) => {
          const on = !unchecked.includes(c)
          const m = minutes.get(c) ?? 0
          return (
            <li key={c} className={cn('cv-cal', !on && 'is-off')} style={{ '--ev': colorForCategory(c) } as CSSProperties}>
              <button type="button" className="cv-cal-toggle" aria-pressed={on} onClick={() => onToggle(c)}>
                <span className="cv-cal-box" aria-hidden="true">
                  <Check size={10} strokeWidth={3.4} />
                </span>
                <span className="cv-cal-name">{c}</span>
              </button>
              <button type="button" className="cv-cal-only" onClick={() => onOnly(c)} title={`Show only ${c}`}>
                only
              </button>
              <span className="cv-cal-hours">{m ? formatDuration(m) : ''}</span>
            </li>
          )
        })}
      </ul>

      <PopoverMenu anchor={menuAnchor} open={menuOpen} onClose={() => setMenuOpen(false)} width={190}>
        <button
          type="button"
          className="cv-menu-action"
          onClick={() => {
            setMenuOpen(false)
            onShowAll()
          }}
        >
          <Eye size={13} /> Show all
        </button>
        <button
          type="button"
          className="cv-menu-action"
          onClick={() => {
            setMenuOpen(false)
            onEditColors()
          }}
        >
          <Palette size={13} /> Edit colours
        </button>
      </PopoverMenu>
    </section>
  )
}
