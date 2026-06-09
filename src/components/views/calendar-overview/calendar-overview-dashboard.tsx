import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  Milestone,
  Pencil,
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

type CalendarMode = 'month' | 'week' | 'day'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
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
  const [mode] = useState<CalendarMode>('day')
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || toISODate(new Date()))
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  useEffect(() => {
    const nextDate = searchParams.get('date')
    if (nextDate && nextDate !== selectedDate) {
      setSelectedDate(nextDate)
    }
  }, [searchParams, selectedDate])

  const visibleRange = useMemo(() => getVisibleRange(selectedDate, mode), [selectedDate, mode])

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
    const handleCalendarUpdate = () => {
      loadItems()
    }
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    return () => {
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [loadItems])

  const updateSelectedDate = (date: string) => {
    setSelectedDate(date)
    onNavigate('/calendar', `?date=${date}`)
  }

  const selectedItems = useMemo(() => byDate(items, selectedDate), [items, selectedDate])
  const stats = useMemo(() => {
    const completed = items.filter((item) => item.completed).length
    const timed = items.filter((item) => !item.allDay && item.startTime).length
    const recurring = items.filter((item) => item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE').length
    return { completed, timed, recurring, total: items.length }
  }, [items])

  const subtitle = useMemo(() => {
    if (selectedItems.length === 0) return 'No items scheduled'
    const completed = selectedItems.filter((item) => item.completed).length
    return `${completed}/${selectedItems.length} items completed`
  }, [selectedItems])

  const handleStep = (direction: -1 | 1) => {
    const date = parseISODate(selectedDate)
    date.setDate(date.getDate() + direction)
    updateSelectedDate(toISODate(date))
  }

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
    <section className="calendar-dashboard" aria-label="Calendar schedule dashboard">
      <header className="calendar-header">
        <div className="calendar-date-picker-wrap">
          <button
            type="button"
            className="calendar-date-trigger"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            aria-expanded={isCalendarOpen}
          >
            <div className="calendar-date-trigger-text">
              <h1 className="calendar-date-title-wrap">
                {formatLongDate(selectedDate)}
                <ChevronDown size={20} className="calendar-date-chevron" />
              </h1>
              <span className="calendar-date-trigger-sub">{subtitle}</span>
            </div>
          </button>

          {isCalendarOpen && (
            <>
              <div
                className="calendar-calendar-backdrop"
                role="presentation"
                onClick={() => setIsCalendarOpen(false)}
              />
              <div className="calendar-header-popover calendar-surface" role="dialog" aria-label="Choose date">
                <MiniMonth
                  selectedDate={selectedDate}
                  items={items}
                  onSelect={(date) => {
                    updateSelectedDate(date)
                    setIsCalendarOpen(false)
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="calendar-header-actions">
          <div className="calendar-nav-group">
            <button type="button" onClick={() => handleStep(-1)} aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => updateSelectedDate(toISODate(new Date()))}>
              Today
            </button>
            <button type="button" onClick={() => handleStep(1)} aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            className="calendar-add-button"
            onClick={() => setModal({ open: true, date: selectedDate })}
            aria-label="Add calendar item"
          >
            <Plus size={17} />
          </button>
        </div>
      </header>

      <div className="calendar-stat-row">
        <MetricCard value={String(selectedItems.length)} label="Today" hint="scheduled" icon={CalendarDays} tone="today" />
        <MetricCard value={String(stats.timed)} label="Timed" hint="timed" icon={Clock} tone="timed" />
        <MetricCard value={String(stats.completed)} label="Done" hint="completed" icon={Check} tone="done" />
        <MetricCard value={String(stats.recurring)} label="Repeats" hint="repeats" icon={Repeat} tone="repeats" />
      </div>

      <div className="calendar-dashboard-grid">
        {loading && (
          <div className="calendar-surface" style={{ minHeight: '300px', display: 'grid', placeItems: 'center' }}>
            <div className="calendar-loading">
              <Loader2 className="animate-spin" size={16} />
              Loading schedule...
            </div>
          </div>
        )}
        {!loading && (
          <DayView
            date={selectedDate}
            items={selectedItems}
            onEdit={(item) => setModal({ open: true, item, date: item.date })}
            onDelete={setDeleteTarget}
            onToggle={handleToggle}
            onCreate={() => setModal({ open: true, date: selectedDate })}
          />
        )}
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
        type="button"
        className="calendar-fab-trigger"
        onClick={() => setModal({ open: true, date: selectedDate })}
        aria-label="Add calendar item"
      >
        <Plus size={24} />
      </button>
    </section>
  )
}

function MetricCard({
  value,
  label,
  hint,
  icon: Icon,
  tone,
}: {
  value: string
  label: string
  hint: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  tone: 'today' | 'timed' | 'done' | 'repeats'
}) {
  return (
    <div className={`calendar-stat-card calendar-stat-card--${tone}`}>
      <div className={`calendar-stat-icon calendar-stat-icon--${tone}`}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <p>{label}</p>
      <strong>
        {value}
        <small>{hint}</small>
      </strong>
    </div>
  )
}

function MiniMonth({
  selectedDate,
  items,
  onSelect,
}: {
  selectedDate: string
  items: CalendarItem[]
  onSelect: (date: string) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(() => parseISODate(selectedDate))

  useEffect(() => {
    setCurrentMonth(parseISODate(selectedDate))
  }, [selectedDate])

  const days = monthGrid(currentMonth)
  const activeMonth = currentMonth.getMonth()

  const handleMonthStep = (direction: -1 | 1) => {
    const next = new Date(currentMonth)
    next.setMonth(currentMonth.getMonth() + direction)
    setCurrentMonth(next)
  }

  return (
    <section className="mini-month" aria-label="Month selector">
      <div className="mini-month-head">
        <div className="mini-month-title">
          <CalendarDays size={15} />
          <b>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(currentMonth)}</b>
        </div>
        <div className="mini-month-nav">
          <button type="button" onClick={() => handleMonthStep(-1)} aria-label="Previous Month">
            <ChevronLeft size={14} />
          </button>
          <button type="button" onClick={() => handleMonthStep(1)} aria-label="Next Month">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="mini-month-weekdays">
        {WEEKDAY_LABELS.map((day) => <span key={day}>{day[0]}</span>)}
      </div>
      <div className="mini-month-grid">
        {days.map((date) => {
          const iso = toISODate(date)
          const dayItems = byDate(items, iso)
          return (
            <button
              key={iso}
              type="button"
              className={`${iso === selectedDate ? 'is-selected' : ''} ${date.getMonth() !== activeMonth ? 'is-muted' : ''}`}
              onClick={() => onSelect(iso)}
            >
              {date.getDate()}
              {dayItems.length > 0 && <i />}
            </button>
          )
        })}
      </div>
    </section>
  )
}


function DayView({
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
  const timed = items.filter((item) => !item.allDay && item.startTime)
  const hasItems = items.length > 0
  const isToday = date === toISODate(new Date())

  if (!hasItems) {
    return (
      <div className="calendar-surface">
        <div className="calendar-empty-state">
          <div className="calendar-empty-icon-wrap">
            <CalendarDays size={44} className="calendar-empty-icon" />
          </div>
          <h3>No Activities Scheduled</h3>
          <p>Your schedule is clear for this day. Click below to add tasks, events, or reminders.</p>
          <button type="button" className="calendar-empty-add-btn" onClick={onCreate}>
            <Plus size={15} />
            Create Event
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="calendar-surface calendar-agenda-card">
        <AgendaList
          title="Day Agenda"
          items={items}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          compact
        />
      </div>

      {timed.length > 0 && (
        <div className="calendar-surface calendar-timeline-card">
          <div className="calendar-timeline-header">
            <h2>Timeline</h2>
          </div>
          <DayTimeline
            date={date}
            timed={timed}
            isToday={isToday}
            onEdit={onEdit}
          />
        </div>
      )}
    </>
  )
}

function DayTimeline({
  date,
  timed,
  isToday,
  onEdit,
}: {
  date: string
  timed: CalendarItem[]
  isToday: boolean
  onEdit: (item: CalendarItem) => void
}) {
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timelineRef.current) {
      let targetHour = 8 // Default to 8 AM
      if (timed.length > 0) {
        const getHour = (timeStr: string) => parseInt(timeStr.split(':')[0], 10)
        const eventHours = timed.map((item) => getHour(item.startTime!))
        targetHour = Math.min(...eventHours)
      } else if (isToday) {
        targetHour = new Date().getHours()
      }
      const scrollPosition = Math.max(0, (targetHour - 1) * 60)
      timelineRef.current.scrollTop = scrollPosition
    }
  }, [date, timed.length, isToday])

  return (
    <div className="calendar-day-timeline" ref={timelineRef}>
      <div className="calendar-time-rail">
        {HOURS.map((hour) => <span key={hour}>{formatHour(hour)}</span>)}
      </div>
      <div className="calendar-day-column is-single">
        {HOURS.map((hour) => <span key={hour} className="calendar-hour-line" />)}
        {isToday && <CurrentTimeLine />}
        {timed.map((item, index) => (
          <TimeBlock
            key={item.occurrenceId ?? item.id}
            item={item}
            index={index}
            onClick={() => onEdit(item)}
            wide
          />
        ))}
      </div>
    </div>
  )
}

function CurrentTimeLine() {
  const now = new Date()
  const top = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100
  return <span className="calendar-now-line" style={{ top: `${top}%` }} />
}

function TimeBlock({
  item,
  index,
  onClick,
  wide,
}: {
  item: CalendarItem
  index: number
  onClick: () => void
  wide?: boolean
}) {
  const startMinutes = timeToMinutes(item.startTime)
  const endMinutes = item.endTime ? timeToMinutes(item.endTime) : startMinutes + 45
  const top = (startMinutes / 1440) * 100
  const height = Math.max(((endMinutes - startMinutes) / 1440) * 100, wide ? 2.8 : 4)
  return (
    <button
      type="button"
      className={`calendar-time-block ${item.completed ? 'is-completed' : ''}`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        background: item.color ?? '#9ee7e8',
        left: wide ? '12px' : `${8 + (index % 2) * 8}px`,
        right: wide ? '18px' : `${8 + (index % 2) * 4}px`,
      }}
      onClick={onClick}
      title={item.title}
    >
      <strong>{item.title}</strong>
      <span>{formatItemTime(item)}</span>
    </button>
  )
}

function AgendaList({
  title,
  items,
  onEdit,
  onDelete,
  onToggle,
  onCreate,
  compact,
}: {
  title: string
  items: CalendarItem[]
  onEdit: (item: CalendarItem) => void
  onDelete: (item: CalendarItem) => void
  onToggle: (item: CalendarItem) => void
  onCreate?: () => void
  compact?: boolean
}) {
  const [isEditMode, setIsEditMode] = useState(false)
  const sorted = [...items].sort(compareItems)
  return (
    <section className={`calendar-agenda ${compact ? 'is-compact' : ''}`}>
      <div className="calendar-agenda-head">
        <h2>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{items.length}</span>
          <button
            type="button"
            className={`calendar-agenda-edit-btn ${isEditMode ? 'is-active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? 'Finish Editing' : 'Edit Agenda'}
            aria-label="Toggle edit mode"
            style={{
              width: '28px',
              height: '28px',
              padding: '0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '8px',
              background: isEditMode ? 'rgba(16, 19, 18, 0.08)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              transition: 'background 0.2s',
            }}
          >
            <Pencil size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="calendar-empty">Nothing scheduled.</p>
      ) : (
        <div className="calendar-agenda-list">
          {sorted.map((item) => {
            const Icon = iconForType(item.itemType)
            return (
              <article
                key={item.occurrenceId ?? item.id}
                className={item.completed ? 'is-completed' : undefined}
                style={{
                  gridTemplateColumns: isEditMode ? '24px 4px minmax(0, 1fr) auto' : '24px 4px minmax(0, 1fr)',
                }}
              >
                <button
                  type="button"
                  className="calendar-agenda-check"
                  onClick={() => onToggle(item)}
                  aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {item.completed ? <Check size={12} /> : <Circle size={12} />}
                </button>
                <span className="calendar-agenda-color" style={{ background: item.color ?? '#9ee7e8' }} />
                <div>
                  <small style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <Icon size={12} />
                    {item.itemType ?? 'TASK'} · {formatItemTime(item)}
                    {item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' && (
                      <>
                        · <Repeat size={10} style={{ display: 'inline' }} />
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.recurrenceFrequency.toLowerCase()}
                        </span>
                      </>
                    )}
                  </small>
                  <strong>{item.title}</strong>
                  {item.notes && <p>{item.notes}</p>}
                </div>
                {isEditMode && (
                  <div className="calendar-agenda-actions">
                    <button type="button" onClick={() => onEdit(item)} aria-label="Edit item">
                      <Pencil size={13} />
                    </button>
                    <button type="button" onClick={() => onDelete(item)} aria-label="Delete item">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
      {onCreate && (
        <button type="button" className="calendar-agenda-add-btn" onClick={onCreate}>
          <Plus size={14} />
          Add item
        </button>
      )}
    </section>
  )
}

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
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<CalendarRecurrence>(item?.recurrenceFrequency ?? 'NONE')
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
      <div className="calendar-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
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
                {TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => handleCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => <option key={option.label}>{option.label}</option>)}
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
            <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
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

function iconForType(type?: CalendarItemType) {
  if (type === 'EVENT') return CalendarDays
  if (type === 'REMINDER') return Bell
  if (type === 'MILESTONE') return Milestone
  return Clock
}

function getVisibleRange(date: string, mode: CalendarMode) {
  const parsed = parseISODate(date)
  if (mode === 'month') {
    const grid = monthGrid(parsed)
    return {
      start: toISODate(grid[0]),
      end: toISODate(grid[grid.length - 1]),
      label: formatMonthYear(date),
    }
  }
  if (mode === 'day') {
    return { start: date, end: date, label: 'Day focus' }
  }
  const start = startOfWeek(parsed)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toISODate(start), end: toISODate(end), label: `${formatShortDate(start)} - ${formatShortDate(end)}` }
}

function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(first)
  return daysBetween(gridStart, 42)
}

function daysBetween(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
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

function timeToMinutes(time?: string) {
  if (!time) return 0
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function formatHour(hour: number) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
}

function formatItemTime(item: CalendarItem) {
  if (item.allDay || !item.startTime) return 'All day'
  return item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime
}

function formatLongDate(date: string) {
  return parseISODate(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMonthYear(date: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(parseISODate(date))
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function colorForCategory(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.label === category)?.color ?? '#9ee7e8'
}

export { CalendarOverviewDashboard }
