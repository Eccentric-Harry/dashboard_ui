import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus, Search, X } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { VIEWS, parseISODate, type CalendarView } from '../calendar-dates'
import { isTimed, itemKey, itemSpan, matchesQuery } from '../calendar-layout'
import { formatShortTime } from '../calendar-time'
import { MenuItem, PopoverMenu } from './composer/popover-menu'

type Props = {
  view: CalendarView
  heading: { eyebrow: string; title: string; year: string }
  showsToday: boolean
  sidebarOpen: boolean
  query: string
  searchOpen: boolean
  searchRef: RefObject<HTMLInputElement | null>
  /** Loaded items — search reads the same range the views draw. */
  items: CalendarItem[]
  todayIso: string
  onView: (view: CalendarView) => void
  onStep: (direction: 1 | -1) => void
  onToday: () => void
  onToggleSidebar: () => void
  onQuery: (query: string) => void
  onSearchOpen: (open: boolean) => void
  onPickResult: (item: CalendarItem) => void
  onAdd: () => void
  /** Phones only offer the views that fit (Day, Month, Agenda). */
  phone?: boolean
}

export function CalendarToolbar({
  view,
  heading,
  showsToday,
  sidebarOpen,
  query,
  searchOpen,
  searchRef,
  items,
  todayIso,
  onView,
  onStep,
  onToday,
  onToggleSidebar,
  onQuery,
  onSearchOpen,
  onPickResult,
  onAdd,
  phone = false,
}: Props) {
  const [cursor, setCursor] = useState(0)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewAnchor, setViewAnchor] = useState<HTMLButtonElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const searching = searchOpen || Boolean(query)

  // Upcoming matches first (soonest first), then the past (most recent first).
  const results = useMemo(() => {
    if (!query.trim()) return []
    const hits = items.filter((item) => matchesQuery(item, query))
    const ahead = hits.filter((i) => i.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
    const behind = hits.filter((i) => i.date < todayIso).sort((a, b) => b.date.localeCompare(a.date))
    return [...ahead, ...behind].slice(0, 8)
  }, [items, query, todayIso])

  useEffect(() => {
    if (!searchOpen) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node) && !query) onSearchOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [searchOpen, query, onSearchOpen])

  const close = () => {
    onQuery('')
    onSearchOpen(false)
    searchRef.current?.blur()
  }

  return (
    <header className={cn('cv-toolbar', searching && 'is-searching')}>
      <div className="cv-toolbar-lead">
        <button
          type="button"
          className="cv-icon-btn cv-side-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          title={sidebarOpen ? 'Hide sidebar ([)' : 'Show sidebar ([)'}
        >
          {sidebarOpen ? <PanelLeftClose size={16} strokeWidth={2} /> : <PanelLeftOpen size={16} strokeWidth={2} />}
        </button>
        <div className="cv-heading">
          <span className="cv-eyebrow">{heading.eyebrow}</span>
          <h2 className={cn('cv-title', heading.title.length > 7 && 'is-long')}>
            {heading.title} <em>{heading.year}</em>
          </h2>
        </div>
        <div className="cv-nav" role="group" aria-label="Navigate">
          <button type="button" className="cv-icon-btn" onClick={() => onStep(-1)} aria-label="Previous" title="Previous (←)">
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <button type="button" className={cn('cv-today', showsToday && 'is-current')} onClick={onToday} title="Jump to today (T)">
            Today
          </button>
          <button type="button" className="cv-icon-btn" onClick={() => onStep(1)} aria-label="Next" title="Next (→)">
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="cv-toolbar-tail">
        <div className="cv-search" ref={wrapRef}>
          {searching ? (
            <label className="cv-search-field">
              <Search size={14} strokeWidth={2.2} aria-hidden="true" />
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={query}
                placeholder="Search blocks"
                aria-label="Search"
                onChange={(e) => {
                  onQuery(e.target.value)
                  setCursor(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') close()
                  else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setCursor((c) => Math.min(results.length - 1, c + 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setCursor((c) => Math.max(0, c - 1))
                  } else if (e.key === 'Enter' && results[cursor]) {
                    onPickResult(results[cursor])
                  }
                }}
              />
              <button type="button" className="cv-search-clear" onClick={close} aria-label="Close search">
                <X size={13} strokeWidth={2.4} />
              </button>
            </label>
          ) : (
            <button type="button" className="cv-icon-btn" onClick={() => onSearchOpen(true)} aria-label="Search" title="Search (/)">
              <Search size={15} strokeWidth={2.2} />
            </button>
          )}
          {query.trim() && (
            <div className="cv-results" role="listbox" aria-label="Search results">
              {results.length === 0 ? (
                <p className="cv-results-none">No blocks match “{query.trim()}” in the loaded weeks.</p>
              ) : (
                results.map((item, i) => (
                  <button
                    key={itemKey(item)}
                    type="button"
                    role="option"
                    aria-selected={i === cursor}
                    className={cn('cv-result', i === cursor && 'is-cursor', item.date < todayIso && 'is-past')}
                    style={{ '--ev': eventHue(item) } as CSSProperties}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => onPickResult(item)}
                  >
                    <i aria-hidden="true" />
                    <span className="cv-result-title">{item.title}</span>
                    <span className="cv-result-when">
                      {parseISODate(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {isTimed(item) ? ` · ${formatShortTime(itemSpan(item).start)}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          ref={setViewAnchor}
          type="button"
          className="cv-view-pick"
          aria-haspopup="menu"
          aria-expanded={viewOpen}
          onClick={() => setViewOpen((o) => !o)}
        >
          {VIEWS.find((v) => v.id === view)?.label}
          <ChevronDown size={14} strokeWidth={2.2} />
        </button>
        <PopoverMenu anchor={viewAnchor} open={viewOpen} onClose={() => setViewOpen(false)} width={190}>
          {VIEWS.filter((v) => !phone || v.mobile).map((v) => (
            <MenuItem
              key={v.id}
              label={v.label}
              hint={phone ? undefined : `Press ${v.key}`}
              selected={view === v.id}
              onSelect={() => {
                onView(v.id)
                setViewOpen(false)
              }}
            />
          ))}
        </PopoverMenu>

        <button type="button" className="add-pill cv-add" onClick={onAdd} title="New block (N) — or drag on the grid">
          <span className="add-pill-ic">
            <Plus size={16} strokeWidth={2.75} />
          </span>
          <span className="cv-add-label">Add</span>
        </button>
      </div>
    </header>
  )
}
