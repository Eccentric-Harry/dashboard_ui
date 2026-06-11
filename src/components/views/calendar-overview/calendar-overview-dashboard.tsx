import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Timer,
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
import { getRoutineIconDetails } from './routine-icon-helper'

import './calendar-overview.css'

const TYPE_OPTIONS: CalendarItemType[] = ['TASK', 'EVENT', 'REMINDER', 'MILESTONE']
const CATEGORY_OPTIONS = [
  { label: 'Personal', color: '#7c3aed' },
  { label: 'Work', color: '#2563eb' },
  { label: 'Health', color: '#059669' },
  { label: 'Learning', color: '#0891b2' },
  { label: 'Finance', color: '#d97706' },
  { label: 'Social', color: '#db2777' },
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
  const [items, setItems] = useState<CalendarItem[]>([])
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)

  const week = useMemo(() => getWeek(selectedDate), [selectedDate])
  const visibleRange = useMemo(
    () => ({ start: toISODate(week[0]), end: toISODate(week[week.length - 1]) }),
    [week],
  )

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchCalendarItemsForRange(visibleRange.start, visibleRange.end)
      setItems(response?.data ?? [])
    } catch (error) {
      setItems([])
      toast.error(error instanceof Error ? error.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [visibleRange.end, visibleRange.start])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadItems, 0)
    const handleCalendarUpdate = () => loadItems()
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    return () => {
      window.clearTimeout(initialLoad)
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [loadItems])

  const selectedItems = useMemo(() => byDate(items, selectedDate), [items, selectedDate])
  const currentItem = useMemo(() => findCurrentItem(selectedItems, selectedDate), [selectedDate, selectedItems])
  const selectedItem = useMemo(
    () => selectedItems.find((item) => itemKey(item) === selectedItemKey) ?? currentItem ?? selectedItems[0] ?? null,
    [currentItem, selectedItemKey, selectedItems],
  )

  const updateSelectedDate = (date: string) => {
    setSelectedDate(date)
    setSelectedItemKey(null)
    onNavigate('/calendar', `?date=${date}`)
  }

  const handleStep = (direction: -1 | 1) => {
    const date = parseISODate(selectedDate)
    date.setDate(date.getDate() + direction)
    updateSelectedDate(toISODate(date))
  }

  const handleToggle = async (item: CalendarItem) => {
    if (!item.id) return
    try {
      const isRecurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      await toggleCalendarItem(item.id, isRecurring ? item.date : undefined)
      toast.success(item.completed ? `Reopened "${item.title}"` : `Completed "${item.title}"`)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteCalendarItem(deleteTarget.id)
      toast.success(`Deleted "${deleteTarget.title}"`)
      setDeleteTarget(null)
      setSelectedItemKey(null)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  const handleDeleteRecurring = async (mode: 'ONLY_THIS' | 'ALL') => {
    if (!deleteTarget?.id) return
    try {
      await deleteCalendarItem(deleteTarget.id, mode === 'ONLY_THIS' ? deleteTarget.date : undefined)
      toast.success(mode === 'ONLY_THIS' ? 'Occurrence deleted' : 'Recurring routine deleted')
      setDeleteTarget(null)
      setSelectedItemKey(null)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  return (
    <section className="calendar-dashboard" aria-label="Daily routine">
      <header className="calendar-header">
        <div>
          <span className="calendar-eyebrow">Daily rhythm</span>
          <h1>{formatDateHeading(selectedDate)}</h1>
          <p>
            {selectedItems.length
              ? `${selectedItems.filter((item) => item.completed).length} of ${selectedItems.length} complete`
              : 'A quiet day with room to focus'}
          </p>
        </div>

        <div className="calendar-header-actions">
          <div className="calendar-day-nav" aria-label="Change date">
            <button type="button" onClick={() => handleStep(-1)} aria-label="Previous day">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => updateSelectedDate(toISODate(new Date()))}>Today</button>
            <button type="button" onClick={() => handleStep(1)} aria-label="Next day">
              <ChevronRight size={17} />
            </button>
          </div>
          <button
            type="button"
            className="calendar-add-button"
            onClick={() => setModal({ open: true, date: selectedDate })}
          >
            <Plus size={17} />
            Add routine
          </button>
        </div>
      </header>

      <div className="calendar-focus-split">
        <aside className="routine-navigator">
          <div className="week-ribbon" aria-label="Current week">
            {week.map((date) => {
              const isoDate = toISODate(date)
              const isSelected = isoDate === selectedDate
              const isToday = isoDate === toISODate(new Date())
              return (
                <button
                  type="button"
                  key={isoDate}
                  className={isSelected ? 'is-selected' : ''}
                  onClick={() => updateSelectedDate(isoDate)}
                  aria-current={isSelected ? 'date' : undefined}
                >
                  <span>{date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</span>
                  <strong>{date.getDate()}</strong>
                  {isToday && <i />}
                </button>
              )
            })}
          </div>

          <div className="routine-list-header">
            <div>
              <span>Routine</span>
              <strong>{selectedItems.length} blocks</strong>
            </div>
            <button type="button" onClick={() => setModal({ open: true, date: selectedDate })} aria-label="Add routine">
              <Plus size={17} />
            </button>
          </div>

          <div className="routine-list-scroll">
            {loading ? (
              <div className="calendar-loading">
                <Loader2 className="animate-spin" size={18} />
                Loading your routine
              </div>
            ) : selectedItems.length ? (
              <div className="routine-timeline">
                {selectedItems.map((item) => {
                  const isActive = selectedItem && itemKey(item) === itemKey(selectedItem)
                  const status = getItemStatus(item, selectedDate)
                  return (
                    <div className={`routine-row status-${status}`} key={itemKey(item)}>
                      <span className={`routine-node ${isActive ? 'is-active' : ''}`}>
                        {item.completed ? <Check size={11} /> : null}
                      </span>
                      <button
                        type="button"
                        className={`routine-card ${isActive ? 'is-active' : ''}`}
                        onClick={() => setSelectedItemKey(itemKey(item))}
                      >
                        <span className="routine-card-icon" style={{ '--card-color': getRoutineIconDetails(item).color, '--card-bg': getRoutineIconDetails(item).bg } as React.CSSProperties}>
                          {(() => {
                            const CardIcon = getRoutineIconDetails(item).icon
                            return <CardIcon size={16} />
                          })()}
                        </span>
                        <div className="routine-card-copy">
                          <span>{formatItemTime(item)}</span>
                          <strong>{item.title}</strong>
                          <p>{item.notes || getFallbackDescription(item)}</p>
                        </div>
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="routine-empty">
                <span><Sparkles size={22} /></span>
                <strong>Your day is open</strong>
                <p>Add the first block and shape a calm, intentional routine.</p>
                <button type="button" onClick={() => setModal({ open: true, date: selectedDate })}>
                  <Plus size={16} />
                  Add a routine
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="focus-canvas">
          {selectedItem ? (
            <FocusDetail
              item={selectedItem}
              isCurrent={currentItem ? itemKey(currentItem) === itemKey(selectedItem) : false}
              onToggle={() => handleToggle(selectedItem)}
              onEdit={() => setModal({ open: true, item: selectedItem, date: selectedItem.date })}
              onDelete={() => setDeleteTarget(selectedItem)}
            />
          ) : (
            <div className="focus-empty">
              <span><AlarmClock size={28} /></span>
              <p>Current focus</p>
              <h2>Nothing scheduled</h2>
              <small>This space is yours. Add a routine block when you are ready.</small>
              <button type="button" onClick={() => setModal({ open: true, date: selectedDate })}>
                <Plus size={17} />
                Create focus block
              </button>
            </div>
          )}
        </main>
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

      {deleteTarget && (
        deleteTarget.recurrenceFrequency && deleteTarget.recurrenceFrequency !== 'NONE' ? (
          <div className="calendar-modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="calendar-delete-dialog" onClick={(event) => event.stopPropagation()}>
              <span className="calendar-delete-icon"><Trash2 size={20} /></span>
              <h2>Delete recurring routine?</h2>
              <p>Choose whether to remove only this occurrence or the complete series.</p>
              <button type="button" className="danger" onClick={() => handleDeleteRecurring('ONLY_THIS')}>
                Delete this occurrence
              </button>
              <button type="button" className="danger-secondary" onClick={() => handleDeleteRecurring('ALL')}>
                Delete entire series
              </button>
              <button type="button" className="cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <ConfirmDialog
            open
            title="Delete routine?"
            message={`Remove "${deleteTarget.title}" from your schedule?`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )
      )}
    </section>
  )
}

function FocusDetail({
  item,
  isCurrent,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: CalendarItem
  isCurrent: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const checklist = parseChecklist(item.notes)
  const routineIcon = getRoutineIconDetails(item)
  const RoutineIcon = routineIcon.icon

  return (
    <div className="focus-detail">
      <div className="focus-detail-top">
        <div className="focus-status">
          <span className={isCurrent ? 'is-live' : ''}>{isCurrent ? 'Current focus' : 'Routine detail'}</span>
          {isCurrent && <i>Live now</i>}
        </div>
        <div className="focus-actions">
          <button type="button" onClick={onEdit} aria-label="Edit routine"><Pencil size={16} /></button>
          <button type="button" onClick={onDelete} aria-label="Delete routine"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="focus-hero">
        <span className="focus-icon" style={{ '--focus-color': routineIcon.color } as React.CSSProperties}>
          <RoutineIcon size={25} />
        </span>
        <div>
          <p>{item.category || 'Personal routine'}</p>
          <h2>{item.title}</h2>
        </div>
      </div>

      <div className="focus-time-block">
        <span className="time-block-icon" style={{ color: '#4387e2', background: 'rgba(67, 135, 226, 0.12)' }}>
          <Timer size={18} />
        </span>
        <div>
          <span>Time block</span>
          <strong>{formatItemTime(item)}</strong>
        </div>
        <small>{formatDuration(item)}</small>
      </div>

      <div className="focus-content">
        <section>
          <span className="focus-section-label">Notes</span>
          <p>{stripChecklist(item.notes) || getFallbackDescription(item)}</p>
        </section>

        {checklist.length > 0 && (
          <section>
            <span className="focus-section-label">Micro checklist</span>
            <div className="focus-checklist">
              {checklist.map((entry) => (
                <div key={entry.text}>
                  <span className={entry.checked ? 'is-checked' : ''}>
                    {entry.checked ? <Check size={12} /> : null}
                  </span>
                  <p>{entry.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="focus-footer">
        <div>
          {item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' && (
            <span><Repeat2 size={14} /> {titleCase(item.recurrenceFrequency)}</span>
          )}
          <span><CalendarDays size={14} /> {formatShortDate(item.date)}</span>
        </div>
        <button type="button" className={item.completed ? 'is-complete' : ''} onClick={onToggle}>
          {item.completed ? <CircleCheck size={18} /> : <Check size={18} />}
          {item.completed ? 'Completed' : 'Mark complete'}
        </button>
      </div>
    </div>
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
    if (!title.trim()) return setError('Title is required')
    if (endTime && startTime >= endTime) return setError('End time must be after start time')

    setSaving(true)
    setError('')
    const payload: CalendarItemPayload = {
      title: title.trim(),
      date: itemDate,
      itemType,
      category,
      color,
      allDay: false,
      startTime,
      endTime,
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save item')
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
        <span className="calendar-modal-kicker">{item ? 'Refine routine' : 'Shape your day'}</span>
        <h2>{item ? 'Edit routine block' : 'Add routine block'}</h2>
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
              Accent
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
                Repeat until
                <input
                  type="date"
                  value={recurrenceUntil}
                  onChange={(event) => setRecurrenceUntil(event.target.value)}
                  min={itemDate}
                />
              </label>
            ) : <div />}
          </div>
          <label>
            Notes or checklist
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={'Add context, or use lines like “- [ ] Prepare notes”'}
            />
          </label>
          <label className="calendar-checkbox-row">
            <input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />
            Completed
          </label>
          {error && <p className="calendar-form-error">{error}</p>}
          <button type="submit" className="calendar-modal-submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save routine'}
          </button>
        </form>
      </div>
    </div>
  )
}

function getWeek(date: string) {
  const selected = parseISODate(date)
  const day = selected.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(selected)
  monday.setDate(selected.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday)
    next.setDate(monday.getDate() + index)
    return next
  })
}

function byDate(items: CalendarItem[], date: string) {
  return items.filter((item) => item.date === date).sort(compareItems)
}

function compareItems(a: CalendarItem, b: CalendarItem) {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1
  return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
}

function findCurrentItem(items: CalendarItem[], selectedDate: string) {
  if (selectedDate !== toISODate(new Date())) return null
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  return items.find((item) => {
    if (!item.startTime) return false
    const start = timeToMinutes(item.startTime)
    const end = item.endTime ? timeToMinutes(item.endTime) : start + 60
    return now >= start && now < end
  }) ?? null
}

function getItemStatus(item: CalendarItem, selectedDate: string) {
  if (item.completed) return 'past'
  if (selectedDate !== toISODate(new Date()) || !item.startTime) return 'future'
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  const start = timeToMinutes(item.startTime)
  const end = item.endTime ? timeToMinutes(item.endTime) : start + 60
  if (now >= start && now < end) return 'current'
  return now >= end ? 'past' : 'future'
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function itemKey(item: CalendarItem) {
  return item.occurrenceId ?? `${item.id ?? item.title}-${item.date}-${item.startTime ?? 'all-day'}`
}

function parseChecklist(notes?: string) {
  if (!notes) return []
  return notes.split('\n').flatMap((line) => {
    const match = line.trim().match(/^[-*]\s+\[([ xX])\]\s+(.+)$/)
    return match ? [{ checked: match[1].toLowerCase() === 'x', text: match[2] }] : []
  })
}

function stripChecklist(notes?: string) {
  if (!notes) return ''
  return notes
    .split('\n')
    .filter((line) => !/^[-*]\s+\[[ xX]\]\s+/.test(line.trim()))
    .join(' ')
    .trim()
}

function getFallbackDescription(item: CalendarItem) {
  const category = item.category?.toLowerCase() || 'personal'
  return `A focused ${category} block for moving the day forward.`
}

function formatDuration(item: CalendarItem) {
  if (!item.startTime || !item.endTime) return item.allDay ? 'All day' : 'Flexible'
  const minutes = timeToMinutes(item.endTime) - timeToMinutes(item.startTime)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

function formatItemTime(item: CalendarItem) {
  if (item.allDay || !item.startTime) return 'All day'
  const start = formatClockTime(item.startTime)
  return item.endTime ? `${start} - ${formatClockTime(item.endTime)}` : start
}

function formatClockTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: minutes ? '2-digit' : undefined,
  })
}

function formatDateHeading(date: string) {
  const parsed = parseISODate(date)
  const today = toISODate(new Date())
  const prefix = date === today ? 'Today, ' : ''
  return `${prefix}${parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
}

function formatShortDate(date: string) {
  return parseISODate(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
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
  return CATEGORY_OPTIONS.find((option) => option.label === category)?.color ?? '#2563eb'
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

export { CalendarOverviewDashboard }
