import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Milestone,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import {
  createCalendarItem,
  deleteCalendarItem,
  fetchCalendarItemsForRange,
  toggleCalendarItem,
  updateCalendarItem,
} from '../../../lib/api'
import type { CalendarItem, CalendarItemPayload, CalendarItemType, CalendarRecurrence } from '../../../lib/api'
import { ConfirmDialog } from '../../ui/confirm-dialog'

import './calendar-overview.css'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPE_OPTIONS: CalendarItemType[] = ['TASK', 'EVENT', 'REMINDER', 'MILESTONE']
const CATEGORY_OPTIONS = [
  { label: 'Personal', color: '#c8f3a3' },
  { label: 'Work', color: '#9bd7ff' },
  { label: 'Health', color: '#9ee7e8' },
  { label: 'Learning', color: '#c9bff6' },
  { label: 'Finance', color: '#ffd37d' },
  { label: 'Social', color: '#ffb4d2' },
]

type CalendarOverviewDashboardProps = {
  searchParams: URLSearchParams
  onNavigate: (pathname: AppPath, search?: string) => void
}

type ModalState =
  | { open: false; item?: never; date?: never }
  | { open: true; item?: CalendarItem; date: string }

function CalendarOverviewDashboard({ searchParams, onNavigate }: CalendarOverviewDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || toISODate(new Date()))
  const [currentMonth, setCurrentMonth] = useState(() =>
    parseISODate(searchParams.get('date') || toISODate(new Date())),
  )
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)

  useEffect(() => {
    const nextDate = searchParams.get('date')
    if (nextDate && nextDate !== selectedDate) {
      setSelectedDate(nextDate)
      setCurrentMonth(parseISODate(nextDate))
    }
  }, [searchParams, selectedDate])

  // Fetch the full month grid range so month-dot indicators work
  const visibleRange = useMemo(() => {
    const grid = monthGrid(currentMonth)
    return { start: toISODate(grid[0]), end: toISODate(grid[grid.length - 1]) }
  }, [currentMonth])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchCalendarItemsForRange(visibleRange.start, visibleRange.end)
      setItems(res?.data ?? [])
    } catch (err) {
      setItems([])
      toast.error(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [visibleRange.start, visibleRange.end])

  useEffect(() => {
    loadItems()
    window.addEventListener('calendar-updated', loadItems)
    return () => window.removeEventListener('calendar-updated', loadItems)
  }, [loadItems])

  const updateSelectedDate = (date: string) => {
    setSelectedDate(date)
    // If the new date is outside the displayed month, sync the month view
    const parsed = parseISODate(date)
    if (
      parsed.getMonth() !== currentMonth.getMonth() ||
      parsed.getFullYear() !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(parsed)
    }
    onNavigate('/calendar', `?date=${date}`)
  }

  const handleMonthStep = (direction: -1 | 1) => {
    const next = new Date(currentMonth)
    next.setMonth(currentMonth.getMonth() + direction)
    setCurrentMonth(next)
  }

  const selectedItems = useMemo(() => byDate(items, selectedDate), [items, selectedDate])

  const subtitle = useMemo(() => {
    const total = selectedItems.length
    if (total === 0) return 'Nothing scheduled for today'
    const completed = selectedItems.filter((i) => i.completed).length
    return `${total} item${total > 1 ? 's' : ''} today · ${completed} done`
  }, [selectedItems])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const handleToggle = async (item: CalendarItem) => {
    if (!item.id) return
    try {
      await toggleCalendarItem(item.id)
      toast.success(item.completed ? `Marked "${item.title}" as incomplete` : `Completed "${item.title}"!`)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteCalendarItem(deleteTarget.id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      setDeleteTarget(null)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  return (
    <section className="cal-shell" aria-label="Calendar schedule">
      {/* Greeting header */}
      <header className="cal-greeting">
        <div>
          <h1 className="cal-greeting-title">
            {greeting}, <em>Harry</em>
          </h1>
          <p className="cal-greeting-sub">{subtitle}</p>
        </div>
        <button
          id="cal-header-add-btn"
          type="button"
          className="cal-header-add"
          onClick={() => setModal({ open: true, date: selectedDate })}
          aria-label="Add event"
        >
          <Plus size={16} />
        </button>
      </header>

      {/* Month grid */}
      <div className="cal-card cal-month-card">
        <MonthGridInline
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          items={items}
          onSelect={updateSelectedDate}
          onMonthStep={handleMonthStep}
          onAdd={() => setModal({ open: true, date: selectedDate })}
        />
      </div>

      {/* Agenda card: week strip + day timeline */}
      <div className="cal-card cal-agenda-card">
        <WeekDayStrip selectedDate={selectedDate} items={items} onSelect={updateSelectedDate} />
        <div className="cal-agenda-body">
          {loading ? (
            <div className="cal-loading">
              <Loader2 className="animate-spin" size={15} />
              <span>Loading schedule…</span>
            </div>
          ) : (
            <DayAgendaList
              date={selectedDate}
              items={selectedItems}
              onEdit={(item) => setModal({ open: true, item, date: item.date })}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
              onCreate={() => setModal({ open: true, date: selectedDate })}
            />
          )}
        </div>
      </div>

      {modal.open && (
        <CalendarItemModal
          date={modal.date}
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSaved={async () => {
            setModal({ open: false })
            await loadItems()
            window.dispatchEvent(new CustomEvent('calendar-updated'))
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete calendar item?"
        message={`Remove "${deleteTarget?.title}" from your schedule?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <button
        id="cal-fab-btn"
        type="button"
        className="cal-fab"
        onClick={() => setModal({ open: true, date: selectedDate })}
        aria-label="Add calendar item"
      >
        <Plus size={22} />
      </button>
    </section>
  )
}

// ─── Month Grid ──────────────────────────────────────────────────────────────

function MonthGridInline({
  selectedDate,
  currentMonth,
  items,
  onSelect,
  onMonthStep,
  onAdd,
}: {
  selectedDate: string
  currentMonth: Date
  items: CalendarItem[]
  onSelect: (date: string) => void
  onMonthStep: (direction: -1 | 1) => void
  onAdd: () => void
}) {
  const days = monthGrid(currentMonth)
  const activeMonth = currentMonth.getMonth()
  const today = toISODate(new Date())

  return (
    <div className="cal-month">
      <div className="cal-month-header">
        <div className="cal-month-nav">
          <button type="button" onClick={() => onMonthStep(-1)} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <h2>
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(currentMonth)}
          </h2>
          <button type="button" onClick={() => onMonthStep(1)} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
        <button type="button" className="cal-add-circle" onClick={onAdd} aria-label="Add event">
          <Plus size={14} />
        </button>
      </div>

      <div className="cal-month-weekdays">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day}>{day[0]}</span>
        ))}
      </div>

      <div className="cal-month-grid">
        {days.map((date) => {
          const iso = toISODate(date)
          const dayItems = byDate(items, iso)
          const isSelected = iso === selectedDate
          const isToday = iso === today
          const isMuted = date.getMonth() !== activeMonth

          return (
            <button
              key={iso}
              type="button"
              className={[
                'cal-day-cell',
                isSelected ? 'is-selected' : '',
                isToday && !isSelected ? 'is-today' : '',
                isMuted ? 'is-muted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(iso)}
              aria-label={iso}
              aria-pressed={isSelected}
            >
              <span>{date.getDate()}</span>
              {dayItems.length > 0 && (
                <i className="cal-day-dot" style={{ background: dayItems[0].color ?? '#9ee7e8' }} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week Day Strip ───────────────────────────────────────────────────────────

function WeekDayStrip({
  selectedDate,
  items,
  onSelect,
}: {
  selectedDate: string
  items: CalendarItem[]
  onSelect: (date: string) => void
}) {
  const today = toISODate(new Date())

  const weekDays = useMemo(() => {
    const parsed = parseISODate(selectedDate)
    const start = startOfWeek(parsed)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [selectedDate])

  return (
    <div className="cal-week-strip" role="group" aria-label="Week day selector">
      {weekDays.map((date) => {
        const iso = toISODate(date)
        const isSelected = iso === selectedDate
        const isToday = iso === today
        const hasItems = byDate(items, iso).length > 0

        return (
          <button
            key={iso}
            type="button"
            className={[
              'cal-week-pill',
              isSelected ? 'is-selected' : '',
              isToday && !isSelected ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(iso)}
            aria-pressed={isSelected}
          >
            <span className="cal-wp-label">{WEEKDAY_LABELS[date.getDay()][0]}</span>
            <span className="cal-wp-num">{date.getDate()}</span>
            {hasItems && <i className="cal-wp-dot" />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Day Agenda List ──────────────────────────────────────────────────────────

function DayAgendaList({
  date,
  items,
  onEdit,
  onDelete,
  onToggle,
  onCreate,
}: {
  date: string
  items: CalendarItem[]
  onEdit: (item: CalendarItem) => void
  onDelete: (item: CalendarItem) => void
  onToggle: (item: CalendarItem) => void
  onCreate: () => void
}) {
  const allDay = items.filter((i) => i.allDay || !i.startTime)
  const timed = [...items.filter((i) => !i.allDay && i.startTime)].sort(compareItems)

  const dayLabel = useMemo(() => {
    return parseISODate(date)
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      .toUpperCase()
  }, [date])

  if (items.length === 0) {
    return (
      <div className="cal-empty-state">
        <div className="cal-empty-icon">
          <CalendarDays size={32} strokeWidth={1.4} />
        </div>
        <h3>No Events Today</h3>
        <p>Your schedule is clear. Add a task, event, or reminder.</p>
        <button type="button" className="cal-empty-cta" onClick={onCreate}>
          <Plus size={14} />
          Create Event
        </button>
      </div>
    )
  }

  return (
    <div className="cal-day-agenda">
      <div className="cal-day-header-row">
        <span className="cal-day-label">{dayLabel}</span>
        <button
          type="button"
          className="cal-day-add-btn"
          onClick={onCreate}
          aria-label="Add event for this day"
        >
          <Plus size={12} />
        </button>
      </div>

      {allDay.length > 0 && (
        <div className="cal-allday-chips">
          {allDay.map((item) => (
            <button
              key={item.occurrenceId ?? item.id}
              type="button"
              className={`cal-allday-chip${item.completed ? ' is-done' : ''}`}
              onClick={() => onEdit(item)}
            >
              <i style={{ background: item.color ?? '#9ee7e8' }} />
              <span>{item.title}</span>
              {item.completed && <Check size={9} strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}

      <div className="cal-tl-list">
        {timed.map((item, idx) => (
          <AgendaRow
            key={item.occurrenceId ?? item.id}
            item={item}
            isLast={idx === timed.length - 1}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
            onToggle={() => onToggle(item)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Single agenda row (time + spine dot + content card) ─────────────────────

function AgendaRow({
  item,
  isLast,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: CalendarItem
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const Icon = iconForType(item.itemType)

  return (
    <div className={`cal-tl-row${item.completed ? ' is-done' : ''}`}>
      {/* Left: time labels */}
      <div className="cal-tl-time-col">
        <span className="cal-tl-start">{item.startTime}</span>
        {item.endTime && <span className="cal-tl-end">{item.endTime}</span>}
      </div>

      {/* Centre: dot + vertical line */}
      <div className="cal-tl-spine">
        <button
          type="button"
          className="cal-tl-dot"
          style={{ background: item.color ?? '#9ee7e8' }}
          onClick={onToggle}
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && <Check size={7} strokeWidth={3.5} color="#fff" />}
        </button>
        {!isLast && <span className="cal-tl-line" />}
      </div>

      {/* Right: content + delete */}
      <div className="cal-tl-content-col">
        <button type="button" className="cal-tl-card" onClick={onEdit}>
          <div className="cal-tl-card-top">
            <span className="cal-tl-type-tag">
              <Icon size={10} strokeWidth={2.5} />
              {item.itemType ?? 'TASK'}
            </span>
            {item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' && (
              <span className="cal-tl-recur">
                <Repeat size={9} />
                {item.recurrenceFrequency.toLowerCase()}
              </span>
            )}
          </div>
          <strong className="cal-tl-title">{item.title}</strong>
          {item.notes && <p className="cal-tl-notes">{item.notes}</p>}
        </button>
        <button
          type="button"
          className="cal-tl-del"
          onClick={onDelete}
          aria-label="Delete event"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Calendar Item Modal ──────────────────────────────────────────────────────

function CalendarItemModal({
  date,
  item,
  onClose,
  onSaved,
}: {
  date: string
  item?: CalendarItem
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(item?.title ?? '')
  const [itemDate, setItemDate] = useState(item?.originalDate ?? item?.date ?? date)
  const [itemType, setItemType] = useState<CalendarItemType>(item?.itemType ?? 'TASK')
  const [category, setCategory] = useState(item?.category ?? 'Personal')
  const [color, setColor] = useState(item?.color ?? colorForCategory(item?.category ?? 'Personal'))
  const allDay = false
  const [startTime, setStartTime] = useState(item?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(item?.endTime ?? '10:00')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [completed, setCompleted] = useState(item?.completed ?? false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<CalendarRecurrence>(
    item?.recurrenceFrequency ?? 'NONE',
  )
  const [recurrenceUntil, setRecurrenceUntil] = useState(item?.recurrenceUntil ?? '')
  const [error, setError] = useState('')

  const handleCategory = (nextCategory: string) => {
    setCategory(nextCategory)
    setColor(colorForCategory(nextCategory))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!allDay && endTime && startTime >= endTime) {
      setError('End time must be after start time')
      return
    }
    setSaving(true)
    setError('')
    const payload: CalendarItemPayload = {
      title: title.trim(),
      date: itemDate,
      itemType,
      category,
      color,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      notes: notes.trim() || undefined,
      completed,
      recurrenceFrequency,
      recurrenceUntil: recurrenceFrequency === 'NONE' ? undefined : recurrenceUntil || undefined,
    }
    try {
      if (item?.id) {
        await updateCalendarItem(item.id, payload)
        toast.success(`Updated "${title.trim()}"`)
      } else {
        await createCalendarItem(payload)
        toast.success(`Added "${title.trim()}"`)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="calendar-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="calendar-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="calendar-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <h2>{item ? 'Edit Schedule Item' : 'Add Schedule Item'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </label>
          <div className="calendar-form-row">
            <label>
              Type
              <select value={itemType} onChange={(event) => setItemType(event.target.value as CalendarItemType)}>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => handleCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.label}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="calendar-form-row">
            <label>
              Date
              <input type="date" value={itemDate} onChange={(event) => setItemDate(event.target.value)} />
            </label>
            <label>
              Color
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </label>
          </div>
          <div className="calendar-form-row">
            <label>
              Starts
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label>
              Ends
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
          </div>
          <div className="calendar-form-row">
            <label>
              Repeats
              <select
                value={recurrenceFrequency}
                onChange={(event) => setRecurrenceFrequency(event.target.value as CalendarRecurrence)}
              >
                <option value="NONE">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </label>
            {recurrenceFrequency !== 'NONE' ? (
              <label>
                Repeat Until
                <input
                  type="date"
                  value={recurrenceUntil}
                  onChange={(event) => setRecurrenceUntil(event.target.value)}
                  min={itemDate}
                />
              </label>
            ) : (
              <div />
            )}
          </div>
          <label>
            Notes
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <label className="calendar-checkbox-row">
            <input
              type="checkbox"
              checked={completed}
              onChange={(event) => setCompleted(event.target.checked)}
            />
            Completed
          </label>
          {error && <p className="calendar-form-error">{error}</p>}
          <button type="submit" className="calendar-modal-submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save item'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function iconForType(type?: CalendarItemType) {
  if (type === 'EVENT') return CalendarDays
  if (type === 'REMINDER') return Bell
  if (type === 'MILESTONE') return Milestone
  return Clock
}

function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setDate(date.getDate() - date.getDay())
  return next
}

function byDate(items: CalendarItem[], date: string) {
  return items.filter((item) => item.date === date).sort(compareItems)
}

function compareItems(a: CalendarItem, b: CalendarItem) {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1
  return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
}

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function colorForCategory(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.label === category)?.color ?? '#9ee7e8'
}

export { CalendarOverviewDashboard }
