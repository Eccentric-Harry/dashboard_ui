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
  Code2,
  GitCommit,
  Loader2,
  Milestone,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
  Zap,
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
import { MiniMonth } from '../../ui/mini-month'

import './calendar-overview.css'

type CalendarMode = 'month' | 'week' | 'day'

const TYPE_OPTIONS: CalendarItemType[] = ['TASK', 'EVENT', 'REMINDER', 'MILESTONE']
const CATEGORY_OPTIONS = [
  { label: 'Personal', color: '#7c3aed' },
  { label: 'Work', color: '#2563eb' },
  { label: 'Health', color: '#059669' },
  { label: 'Learning', color: '#0891b2' },
  { label: 'Finance', color: '#d97706' },
  { label: 'Social', color: '#db2777' },
]

// Placeholder dev activity slots — wire to real API (GitHub, LeetCode, etc.) when ready.
// Each entry maps an hour (0–23) to a marker rendered in Track 2 of the timeline.
const MOCK_DEV_ACTIVITIES: Array<{ hour: number; type: 'commit' | 'code' | 'zap'; label: string }> = []

type HourSegment =
  | { type: 'hour'; hour: number; events: CalendarItem[] }
  | { type: 'gap'; hours: number[]; key: string }

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
  // Stats scoped to the selected day only (items now covers the full month)
  const stats = useMemo(() => {
    const completed = selectedItems.filter((item) => item.completed).length
    const timed = selectedItems.filter((item) => !item.allDay && item.startTime).length
    const recurring = selectedItems.filter((item) => item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE').length
    return { completed, timed, recurring, total: selectedItems.length }
  }, [selectedItems])

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
      const isRecurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      await toggleCalendarItem(item.id, isRecurring ? item.date : undefined)
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

  const handleDeleteRecurring = async (mode: 'ONLY_THIS' | 'ALL') => {
    if (!deleteTarget?.id) return
    try {
      if (mode === 'ONLY_THIS') {
        await deleteCalendarItem(deleteTarget.id, deleteTarget.date)
        toast.success(`Deleted this occurrence of "${deleteTarget.title}"`)
      } else {
        await deleteCalendarItem(deleteTarget.id)
        toast.success(`Deleted entire series of "${deleteTarget.title}"`)
      }
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
                  activeDates={new Set(items.map((item) => item.date))}
                  allowFuture={true}
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
            monthItems={items}
            onEdit={(item) => setModal({ open: true, item, date: item.date })}
            onDelete={setDeleteTarget}
            onToggle={handleToggle}
            onCreate={() => setModal({ open: true, date: selectedDate })}
            onDateSelect={updateSelectedDate}
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

      {deleteTarget && (
        deleteTarget.recurrenceFrequency && deleteTarget.recurrenceFrequency !== 'NONE' ? (
          <div className="confirm-modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="confirm-popover" onClick={e => e.stopPropagation()}>
              <button type="button" className="confirm-modal-close" onClick={() => setDeleteTarget(null)}>
                <X size={16} />
              </button>
              <h2>Delete recurring item?</h2>
              <p className="confirm-message">
                "{deleteTarget.title}" is a recurring event. Do you want to delete only this occurrence or the entire series?
              </p>
              <div className="confirm-actions-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="confirm-btn"
                  onClick={() => handleDeleteRecurring('ONLY_THIS')}
                  style={{
                    background: 'rgba(53, 182, 75, 0.08)',
                    border: '1px solid rgba(53, 182, 75, 0.2)',
                    color: '#2f9d43',
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                    height: '38px',
                    lineHeight: '38px',
                    padding: '0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(53, 182, 75, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(53, 182, 75, 0.08)'
                  }}
                >
                  Delete this occurrence
                </button>
                <button
                  type="button"
                  className="confirm-btn confirm"
                  onClick={() => handleDeleteRecurring('ALL')}
                  style={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                    height: '38px',
                    lineHeight: '38px',
                    padding: '0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Delete entire series
                </button>
                <button
                  type="button"
                  className="confirm-btn cancel"
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    width: '100%',
                    display: 'block',
                    textAlign: 'center',
                    height: '38px',
                    lineHeight: '38px',
                    padding: '0',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ConfirmDialog
            open={!!deleteTarget}
            title="Delete calendar item?"
            message={`Remove "${deleteTarget.title}" from your schedule?`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )
      )}

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

function DayView({
  date,
  items,
  monthItems,
  onEdit,
  onDelete,
  onToggle,
  onCreate,
  onDateSelect,
}: {
  date: string
  items: CalendarItem[]
  monthItems: CalendarItem[]
  onEdit: (item: CalendarItem) => void
  onDelete: (item: CalendarItem) => void
  onToggle: (item: CalendarItem) => void
  onCreate: () => void
  onDateSelect: (date: string) => void
}) {
  const timed = items.filter((item) => !item.allDay && item.startTime)
  const isToday = date === toISODate(new Date())
  const completedCount = items.filter((i) => i.completed).length
  const timedCompleted = timed.filter((i) => i.completed).length



  return (
    <>
      {/* Day Agenda — horizontal slider, preserved */}
      <div className="calendar-surface calendar-agenda-card">
        <AgendaList
          title="Day Agenda"
          items={items}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onCreate={onCreate}
          compact
        />
      </div>

      {/* Bento Grid: 65% Smart Timeline + 35% Context Sidebar */}
      <div className="calendar-bento-grid">
        {/* Left column — Smart Timeline */}
        <div className="calendar-surface bento-left-panel">
          <div className="calendar-timeline-header">
            <h2>Smart Timeline</h2>
            {isToday && <span className="timeline-live-badge">&#9679; Live</span>}
          </div>
          {timed.length > 0 ? (
            <SmartTimeline date={date} timed={timed} isToday={isToday} onEdit={onEdit} />
          ) : (
            <div className="smart-timeline-no-timed">
              <Clock size={28} className="no-timed-icon" />
              <p>No timed events today</p>
              <small>Add a start time to see events on the timeline</small>
            </div>
          )}
        </div>

        {/* Right column — Context & Metrics Sidebar */}
        <div className="context-sidebar">
          <ActivityRings
            total={items.length}
            completed={completedCount}
            timed={timed.length}
            timedCompleted={timedCompleted}
          />
          <MiniMonthMatrix selectedDate={date} monthItems={monthItems} onSelect={onDateSelect} />
          <UnscheduledSandbox items={monthItems} onEdit={onEdit} onToggle={onToggle} />
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Smart Timeline
// ─────────────────────────────────────────────────────────

function buildHourSegments(timed: CalendarItem[]): HourSegment[] {
  const eventsByHour = new Map<number, CalendarItem[]>()
  for (const item of timed) {
    const hour = parseInt(item.startTime!.split(':')[0], 10)
    if (!eventsByHour.has(hour)) eventsByHour.set(hour, [])
    eventsByHour.get(hour)!.push(item)
  }
  const segments: HourSegment[] = []
  let emptyRun: number[] = []
  const flushRun = () => {
    if (emptyRun.length >= 3) {
      segments.push({ type: 'gap', hours: emptyRun, key: `gap-${emptyRun[0]}` })
    } else {
      for (const h of emptyRun) segments.push({ type: 'hour', hour: h, events: [] })
    }
    emptyRun = []
  }
  for (let h = 0; h < 24; h++) {
    const events = eventsByHour.get(h) ?? []
    if (events.length > 0) { flushRun(); segments.push({ type: 'hour', hour: h, events }) }
    else emptyRun.push(h)
  }
  flushRun()
  return segments
}

function SmartTimeline({
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
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const segments = useMemo(() => buildHourSegments(timed), [timed])
  const currentHour = isToday ? new Date().getHours() : -1

  useEffect(() => {
    if (containerRef.current) {
      const firstEl = containerRef.current.querySelector('[data-first-event]') as HTMLElement | null
      if (firstEl) {
        containerRef.current.scrollTo({ top: Math.max(0, firstEl.offsetTop - 48), behavior: 'smooth' })
      }
    }
  }, [date, timed.length])

  const toggleGap = (key: string) =>
    setExpandedGaps((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  let firstActiveMarked = false

  return (
    <div className="smart-timeline-body" ref={containerRef}>
      {segments.map((seg) => {
        if (seg.type === 'gap') {
          const isExpanded = expandedGaps.has(seg.key)
          return (
            <div key={seg.key} className="smart-timeline-gap-wrapper">
              <button
                type="button"
                className={`smart-timeline-gap ${isExpanded ? 'is-expanded' : ''}`}
                onClick={() => toggleGap(seg.key)}
                aria-expanded={isExpanded}
              >
                <ChevronRight size={10} className="gap-chevron" />
                <span className="gap-label">{seg.hours.length} Empty Hours</span>
                <span className="gap-range">
                  {formatHour(seg.hours[0])} – {formatHour(seg.hours[seg.hours.length - 1] + 1)}
                </span>
              </button>
              {isExpanded && (
                <div className="smart-timeline-expanded-hours">
                  {seg.hours.map((h) => (
                    <HourRow key={h} hour={h} events={[]} isCurrentHour={h === currentHour} onEdit={onEdit} isFirst={false} />
                  ))}
                </div>
              )}
            </div>
          )
        }

        const isFirst = seg.events.length > 0 && !firstActiveMarked
        if (seg.events.length > 0 && !firstActiveMarked) firstActiveMarked = true

        return (
          <HourRow
            key={seg.hour}
            hour={seg.hour}
            events={seg.events}
            isCurrentHour={seg.hour === currentHour}
            onEdit={onEdit}
            isFirst={isFirst}
          />
        )
      })}
    </div>
  )
}

function HourRow({
  hour,
  events,
  isCurrentHour,
  onEdit,
  isFirst,
}: {
  hour: number
  events: CalendarItem[]
  isCurrentHour: boolean
  onEdit: (item: CalendarItem) => void
  isFirst: boolean
}) {
  const hasEvents = events.length > 0
  const devActivity = MOCK_DEV_ACTIVITIES.filter((a) => a.hour === hour)

  return (
    <div
      data-first-event={isFirst ? 'true' : undefined}
      className={`smart-timeline-hour-row ${hasEvents ? 'has-events' : 'is-empty'} ${isCurrentHour ? 'is-current-hour' : ''}`}
    >
      <span className="hour-time-label">{formatHour(hour)}</span>
      <div className="hour-track-1">
        {events.map((item) => (
          <EventBlock
            key={item.occurrenceId ?? item.id}
            item={item}
            onClick={() => onEdit(item)}
            hour={hour}
          />
        ))}
      </div>
      <div className="hour-track-2" aria-label="Developer activity track">
        {devActivity.map((act, i) => {
          const Icon = act.type === 'commit' ? GitCommit : act.type === 'code' ? Code2 : Zap
          return (
            <span key={i} className={`dev-activity-dot dev-dot--${act.type}`} title={act.label}>
              <Icon size={9} />
            </span>
          )
        })}
        {devActivity.length === 0 && hasEvents && (
          <span className="dev-slot-empty" title="Dev activity slot — wire up API to populate" />
        )}
      </div>
    </div>
  )
}

function EventBlock({ item, onClick, hour }: { item: CalendarItem; onClick: () => void; hour: number }) {
  const color = item.color ?? CATEGORY_OPTIONS[0].color
  const isMicro = isMicroTask(item)
  const height = getEventHeight(item)
  const startMinutes = item.startTime ? item.startTime.split(':').map(Number) : [hour, 0]
  const startOffset = startMinutes[1]

  return (
    <button
      type="button"
      className={`event-block ${item.completed ? 'is-completed' : ''} ${isMicro ? 'is-micro' : ''}`}
      style={{
        '--block-bg': `${color}2E`,
        '--block-border': `${color}4D`,
        '--block-accent': color,
        '--block-height': `${height}px`,
        '--start-offset': `${startOffset}px`,
      } as React.CSSProperties}
      onClick={onClick}
      title={item.title}
    >
      <div className="event-block-inner">
        <span className="event-block-dot" style={{ background: color }} />
        <div className="event-block-content">
          <strong className="event-block-title">{item.title}</strong>
          <time className="event-block-time">{formatItemTime(item)}</time>
        </div>
        <div className="event-block-accent" style={{ background: color }} />
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// Context & Metrics Sidebar Widgets
// ─────────────────────────────────────────────────────────

function ActivityRings({
  total,
  completed,
  timed,
  timedCompleted,
}: {
  total: number
  completed: number
  timed: number
  timedCompleted: number
}) {
  const SIZE = 110
  const CX = SIZE / 2
  const CY = SIZE / 2
  const STROKE = 9
  const r1 = 44
  const r2 = 30
  const circ1 = 2 * Math.PI * r1
  const circ2 = 2 * Math.PI * r2
  const ratio1 = total > 0 ? Math.min(completed / total, 1) : 0
  const ratio2 = timed > 0 ? Math.min(timedCompleted / timed, 1) : 0

  const ring1Color = '#101312'
  const ring1Bg = 'rgba(16,19,18,0.08)'
  const ring2Color = '#3b82f6'
  const ring2Bg = 'rgba(59,130,246,0.12)'

  return (
    <div className="activity-rings-widget">
      <div className="widget-header">
        <h3>Activity Rings</h3>
        <span className="widget-subtext">Today</span>
      </div>
      <div className="rings-container">
        <div className="rings-svg-wrap">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle cx={CX} cy={CY} r={r1} fill="none" stroke={ring1Bg} strokeWidth={STROKE} />
            <circle cx={CX} cy={CY} r={r2} fill="none" stroke={ring2Bg} strokeWidth={STROKE} />
            <circle
              cx={CX} cy={CY} r={r1} fill="none" stroke={ring1Color} strokeWidth={STROKE}
              strokeDasharray={circ1} strokeDashoffset={circ1 * (1 - ratio1)}
              strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
            />
            <circle
              cx={CX} cy={CY} r={r2} fill="none" stroke={ring2Color} strokeWidth={STROKE}
              strokeDasharray={circ2} strokeDashoffset={circ2 * (1 - ratio2)}
              strokeLinecap="round" transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
            />
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="#101312" fontFamily="inherit">
              {Math.round(ratio1 * 100)}%
            </text>
            <text x={CX} y={CY + 11} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="rgba(16,19,18,0.45)" fontFamily="inherit">
              velocity
            </text>
          </svg>
        </div>
        <div className="rings-legend">
          <div className="legend-row">
            <span className="legend-swatch" style={{ background: ring1Color }} />
            <div className="legend-text">
              <span className="legend-label">Task Velocity</span>
              <strong className="legend-value">{completed}<small>/{total}</small></strong>
            </div>
          </div>
          <div className="legend-row">
            <span className="legend-swatch" style={{ background: ring2Color }} />
            <div className="legend-text">
              <span className="legend-label">Focus Time</span>
              <strong className="legend-value">{timedCompleted}<small>/{timed}</small></strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniMonthMatrix({
  selectedDate,
  monthItems,
  onSelect,
}: {
  selectedDate: string
  monthItems: CalendarItem[]
  onSelect: (date: string) => void
}) {
  const parsed = parseISODate(selectedDate)
  const today = toISODate(new Date())
  const activeMonth = parsed.getMonth()
  const firstDay = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
  const gridStart = startOfWeek(firstDay)
  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const statsByDate = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>()
    for (const item of monthItems) {
      const s = map.get(item.date) ?? { total: 0, completed: 0 }
      map.set(item.date, { total: s.total + 1, completed: s.completed + (item.completed ? 1 : 0) })
    }
    return map
  }, [monthItems])

  const ABBR = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="mini-month-matrix-widget">
      <div className="widget-header">
        <h3>Month View</h3>
        <span className="widget-subtext">
          {new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(parsed)}
        </span>
      </div>
      <div className="mmm-weekdays">
        {ABBR.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mmm-grid" role="grid" aria-label="Month view">
        {days.map((date) => {
          const iso = toISODate(date)
          const isMuted = date.getMonth() !== activeMonth
          const isSelected = iso === selectedDate
          const isToday = iso === today
          const s = statsByDate.get(iso)
          const ratio = s ? s.completed / Math.max(s.total, 1) : 0
          const hasItems = !!s
          const tintA = hasItems ? 0.04 + ratio * 0.06 : 0

          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={`mmm-day ${isMuted ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''} ${isToday && !isSelected ? 'is-today' : ''}`}
              onClick={() => onSelect(iso)}
              title={s ? `${iso} – ${s.completed}/${s.total} done` : iso}
              style={hasItems && !isSelected ? { background: `rgba(16,19,18,${tintA})` } : undefined}
            >
              {date.getDate()}
              {hasItems && !isSelected && <i className="mmm-activity-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function UnscheduledSandbox({
  items,
  onEdit,
  onToggle,
}: {
  items: CalendarItem[]
  onEdit: (item: CalendarItem) => void
  onToggle: (item: CalendarItem) => void
}) {
  const unscheduled = useMemo(() => items.filter((item) => item.allDay || !item.startTime), [items])

  return (
    <div className="unscheduled-sandbox-widget">
      <div className="widget-header">
        <h3>Backlog</h3>
        {unscheduled.length > 0 && <span className="widget-badge">{unscheduled.length}</span>}
      </div>
      {unscheduled.length === 0 ? (
        <p className="sandbox-empty">All tasks have time blocks ✓</p>
      ) : (
        <ul className="sandbox-list" aria-label="Unscheduled tasks">
          {unscheduled.map((item) => {
            const Icon = iconForType(item.itemType)
            const color = item.color ?? '#9ee7e8'
            return (
              <li
                key={item.occurrenceId ?? item.id}
                className={`sandbox-item ${item.completed ? 'is-completed' : ''}`}
                data-drag-ready="true"
              >
                <span className="sandbox-item-icon" style={{ background: `${color}30`, color }}>
                  <Icon size={11} strokeWidth={2.2} />
                </span>
                <span className="sandbox-item-title">{item.title}</span>
                <div className="sandbox-item-actions">
                  <button
                    type="button"
                    className="sandbox-action-btn"
                    onClick={() => onToggle(item)}
                    aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {item.completed ? <Check size={10} /> : <Circle size={10} />}
                  </button>
                  <button
                    type="button"
                    className="sandbox-action-btn"
                    onClick={() => onEdit(item)}
                    aria-label="Edit item"
                  >
                    <Pencil size={10} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
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
        <div className="calendar-agenda-head-controls">
          <span>{items.length}</span>
          <button
            type="button"
            className={`calendar-agenda-edit-btn ${isEditMode ? 'is-active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? 'Finish Editing' : 'Edit Agenda'}
            aria-label="Toggle edit mode"
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
            const itemColor = item.color ?? '#9ee7e8'
            const categoryClass = `cat-${(item.category || 'Personal').toLowerCase()}`
            return (
              <article
                key={item.occurrenceId ?? item.id}
                className={`calendar-agenda-card-item ${categoryClass} ${item.completed ? 'is-completed' : ''}`}
              >
                {/* Top: title area */}
                <div className="agenda-card-body">
                  <div className="agenda-card-type-row">
                    <span className="agenda-card-icon" style={{ background: `${itemColor}48`, color: itemColor }}>
                      <Icon size={15} strokeWidth={2.2} />
                    </span>
                    <span className="agenda-card-tag">{item.itemType ?? 'TASK'}</span>
                  </div>
                  <strong>{item.title}</strong>
                  {item.notes && <p>{item.notes}</p>}
                </div>

                {/* Bottom: time + edit actions */}
                <div className="agenda-card-footer">
                  <div className="agenda-card-time-group">
                    <span className="agenda-card-time">
                      <Clock size={11} />
                      {formatItemTime(item)}
                    </span>
                    {item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' && (
                      <span className="agenda-card-recurrence">
                        <Repeat size={10} />
                        {item.recurrenceFrequency.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <div className="agenda-card-actions-row">
                    <button
                      type="button"
                      className="calendar-agenda-check"
                      onClick={() => onToggle(item)}
                      aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.completed ? <Check size={11} /> : <Circle size={11} />}
                    </button>
                    {isEditMode && (
                      <>
                        <button type="button" onClick={() => onEdit(item)} aria-label="Edit item" className="agenda-card-edit-btn">
                          <Pencil size={11} />
                        </button>
                        <button type="button" onClick={() => onDelete(item)} aria-label="Delete item" className="agenda-card-edit-btn">
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Decorative wave overlay */}
                <div className="agenda-card-wave" />
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
    // Fetch the full month so MiniMonthMatrix can show contribution data
    const firstDay = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    const lastDay = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0)
    return { start: toISODate(firstDay), end: toISODate(lastDay), label: 'Day focus' }
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

function formatHour(hour: number) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
}

function formatItemTime(item: CalendarItem) {
  if (item.allDay || !item.startTime) return 'All day'
  return item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime
}

function getEventDurationMinutes(item: CalendarItem): number {
  if (!item.startTime || !item.endTime) return 60
  const [startH, startM] = item.startTime.split(':').map(Number)
  const [endH, endM] = item.endTime.split(':').map(Number)
  return (endH * 60 + endM) - (startH * 60 + startM)
}

function getEventHeight(item: CalendarItem): number {
  const durationMinutes = getEventDurationMinutes(item)
  const BASE_PX_PER_HOUR = 80
  const height = Math.max(44, Math.round((durationMinutes / 60) * BASE_PX_PER_HOUR))
  return height
}

function isMicroTask(item: CalendarItem): boolean {
  return getEventDurationMinutes(item) <= 15
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
