import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatDuration, formatShortTime } from '../../calendar-time'
import { parseClock } from '../../natural-language'
import { PopoverMenu } from './popover-menu'

type Props = {
  value: number
  onChange: (minutes: number) => void
  /** Selectable minutes, in order. */
  options: number[]
  /** When set, each option also shows its length from this start (the end picker). */
  from?: number
  ariaLabel: string
}

const fmt = (m: number) => formatShortTime(m).replace(/^(\d+) /, '$1:00 ')

/**
 * Google Calendar's time field: type any time ("7p", "19:30", "930") or pick a
 * 15-minute slot from the list. The end picker lists durations beside each slot.
 */
export function TimeSelect({ value, onChange, options, from, ariaLabel }: Props) {
  const [anchor, setAnchor] = useState<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [active, setActive] = useState(-1)

  const shown = draft ?? fmt(value)

  // Open with the current slot centred.
  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>('.is-selected')
      el?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  const commit = (minutes: number | null) => {
    setDraft(null)
    setActive(-1)
    if (minutes != null && minutes !== value) onChange(minutes)
  }

  const commitTyped = () => {
    if (draft == null) return
    commit(parseClock(draft))
  }

  return (
    <>
      <input
        ref={setAnchor}
        type="text"
        inputMode="text"
        className={cn('cal-time-input', open && 'is-open')}
        value={shown}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onFocus={(e) => {
          setOpen(true)
          e.currentTarget.select()
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setDraft(e.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          commitTyped()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault()
            setDraft(null)
            setOpen(false)
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            const base = active >= 0 ? active : Math.max(0, options.indexOf(value))
            const next = Math.max(0, Math.min(options.length - 1, base + (e.key === 'ArrowDown' ? 1 : -1)))
            setActive(next)
            setOpen(true)
            listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (active >= 0) commit(options[active])
            else commitTyped()
            setOpen(false)
          } else if (e.key === 'Tab') {
            setOpen(false)
          }
        }}
      />
      <PopoverMenu anchor={anchor} open={open} onClose={() => { commitTyped(); setOpen(false) }} width={from != null ? 176 : 132} className="cal-time-menu">
        <div ref={listRef} role="listbox" aria-label={ariaLabel}>
          {options.map((m, i) => (
            <button
              key={m}
              type="button"
              role="option"
              aria-selected={m === value}
              className={cn('cal-time-option', m === value && 'is-selected', i === active && 'is-active')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                commit(m)
                setOpen(false)
              }}
            >
              <span>{fmt(m)}</span>
              {from != null && <small>{formatDuration(m - from)}</small>}
            </button>
          ))}
        </div>
      </PopoverMenu>
    </>
  )
}
