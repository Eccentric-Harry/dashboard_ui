import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlarmClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Timer,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import {
  createCalendarItem,
  deleteCalendarItem,
  fetchCalendarItemsForRange,
  toggleCalendarItem,
  toggleCancelCalendarItem,
  updateCalendarItem,
} from '../../../lib/api'
import type { CalendarItem, CalendarItemPayload, CalendarItemType, CalendarRecurrence } from '../../../lib/api'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { MiniMonth } from '../../ui/mini-month'
import { getRoutineIconDetails } from './routine-icon-helper'
import avatarImage from '../../../assets/reference-crops/avatar_luffy.png'
import { getTagColor } from '../../../lib/tag-colors'

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
  const [selectedDate, setSelectedDate] = useState(() => {
    const fromParams = searchParams.get('date')
    if (fromParams) return fromParams
    const isGuest = localStorage.getItem('isGuest') === 'true'
    if (isGuest) return '2026-06-09'
    return toISODate(new Date())
  })
  const [items, setItems] = useState<CalendarItem[]>([])
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dropdownOpenFor, setDropdownOpenFor] = useState<string | null>(null)
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; right?: number; left?: number } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const routineListRef = useRef<HTMLDivElement>(null)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const scrollableDays = useMemo(() => getScrollableDays(selectedDate), [selectedDate])
  const visibleRange = useMemo(
    () => ({ start: toISODate(scrollableDays[0]), end: toISODate(scrollableDays[scrollableDays.length - 1]) }),
    [scrollableDays],
  )

  useEffect(() => {
    if (!ribbonRef.current) return
    const timer = setTimeout(() => {
      const selectedBtn = ribbonRef.current?.querySelector('.is-selected') as HTMLElement
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [selectedDate, scrollableDays])

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

  useEffect(() => {
    if (!dropdownOpenFor) return
    const handler = () => {
      setDropdownOpenFor(null)
      setDropdownCoords(null)
    }
    window.addEventListener('click', handler)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [dropdownOpenFor])

  const selectedItems = useMemo(() => byDate(items, selectedDate), [items, selectedDate])

  useEffect(() => {
    if (loading || !selectedItems.length) return
    const isIpad = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches
    if (!isIpad) return
    const timer = setTimeout(() => {
      if (routineListRef.current) {
        routineListRef.current.scrollTop = 200
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [loading, selectedItems.length])
  const currentItem = useMemo(() => findCurrentItem(selectedItems, selectedDate), [selectedDate, selectedItems])
  const selectedItem = useMemo(() => {
    const explicit = selectedItems.find((item) => itemKey(item) === selectedItemKey)
    if (explicit) return explicit
    if (currentItem && !currentItem.completed) return currentItem
    return selectedItems.find((item) => !item.completed) ?? selectedItems[0] ?? null
  }, [currentItem, selectedItemKey, selectedItems])

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

  const handleDateSelect = (dateStr: string) => {
    updateSelectedDate(dateStr)
    setIsCalendarOpen(false)
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

  const handleToggleCancel = async (item: CalendarItem) => {
    if (!item.id) return
    try {
      const isRecurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      await toggleCancelCalendarItem(item.id, isRecurring ? item.date : undefined)
      toast.success(item.cancelled ? `Restored "${item.title}"` : `Cancelled "${item.title}"`)
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

  const handleMoveToTomorrow = async (item: CalendarItem) => {
    if (!item.id) return
    const parsed = parseISODate(item.date)
    parsed.setDate(parsed.getDate() + 1)
    try {
      await updateCalendarItem(item.id, {
        title: item.title,
        date: toISODate(parsed),
        startTime: item.startTime,
        endTime: item.endTime,
        allDay: item.allDay,
        itemType: item.itemType,
        category: item.category,
        color: item.color,
        notes: item.notes,
        completed: item.completed,
        sortOrder: item.sortOrder,
        recurrenceFrequency: item.recurrenceFrequency,
        recurrenceUntil: item.recurrenceUntil,
      })
      toast.success(`Moved "${item.title}" to tomorrow`)
      await loadItems()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move item')
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
        <div className="calendar-date-picker" ref={calendarRef}>
          <span className="calendar-eyebrow">Daily rhythm</span>
          <button
            type="button"
            className="calendar-date-trigger"
            aria-expanded={isCalendarOpen}
            aria-haspopup="dialog"
            onClick={() => setIsCalendarOpen((open) => !open)}
          >
            <span>
              <span className="calendar-date-title-wrap">
                <strong>{formatHeaderDate(parseISODate(selectedDate))}</strong>
                <ChevronDown size={20} className="calendar-date-chevron" />
              </span>
              <small>
                {selectedItems.length
                  ? `${selectedItems.filter((item) => item.completed).length} of ${selectedItems.length} complete`
                  : 'A quiet day with room to focus'}
              </small>
            </span>
          </button>

          {isCalendarOpen && (
            <>
              <div className="calendar-calendar-overlay" onClick={() => setIsCalendarOpen(false)} />
              <div className="calendar-calendar-popover" role="dialog" aria-label="Choose date">
                <MiniMonth
                  selectedDate={selectedDate}
                  onSelect={handleDateSelect}
                  allowFuture
                />
              </div>
            </>
          )}
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
          <div className="week-ribbon-wrapper">
            <div className="week-ribbon" aria-label="Scrollable dates" ref={ribbonRef}>
              {scrollableDays.map((date) => {
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

          <div className="routine-list-scroll" ref={routineListRef}>
            {loading ? (
              <div className="routine-timeline" style={{ pointerEvents: 'none' }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div className="routine-row status-future" key={idx}>
                    <span className="routine-node skeleton-circle skeleton-shimmer" style={{ width: 14, height: 14, border: 'none' }} />
                    <div className="routine-card-wrapper" style={{ flex: 1 }}>
                      <div className="routine-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                        <span className="routine-card-icon skeleton-circle skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }} />
                        <div className="routine-card-copy" style={{ flex: 1 }}>
                          <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: '30%', height: 10 }} />
                          <strong className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: idx % 2 === 0 ? '70%' : '55%', height: 14 }} />
                          <span className="skeleton-rect skeleton-shimmer" style={{ width: '85%', height: 10 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedItems.length ? (
              <div className="routine-timeline">
                {selectedItems.map((item) => {
                  const isActive = selectedItem && itemKey(item) === itemKey(selectedItem)
                  const status = getItemStatus(item, selectedDate)
                  return (
                    <div className={`routine-row status-${status}`} key={itemKey(item)}>
                      <span className={`routine-node ${isActive ? 'is-active' : ''}`}>
                        {item.completed ? <Check size={11} /> : item.cancelled ? <X size={11} /> : null}
                      </span>
                      <div className="routine-card-wrapper">
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
                          <span
                            className="routine-card-more-trigger"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (dropdownOpenFor === itemKey(item)) {
                                setDropdownOpenFor(null)
                                setDropdownCoords(null)
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const zoom = parseFloat(window.getComputedStyle(document.documentElement).zoom || '1')
                                const isLeftHalf = rect.left < window.innerWidth / 2
                                setDropdownOpenFor(itemKey(item))
                                setDropdownCoords({ 
                                  top: rect.bottom / zoom, 
                                  ...(isLeftHalf ? { left: rect.left / zoom } : { right: (window.innerWidth - rect.right) / zoom })
                                })
                              }
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </span>
                        </button>
                        {dropdownOpenFor === itemKey(item) && dropdownCoords && createPortal(
                          <div className="routine-card-dropdown" style={{ position: 'fixed', top: dropdownCoords.top + 8, left: dropdownCoords.left ?? 'auto', right: dropdownCoords.right ?? 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setModal({ open: true, item, date: item.date }); setDropdownOpenFor(null) }}>
                              <Pencil size={14} /> Edit
                            </button>
                            <button onClick={() => { setDropdownOpenFor(null); handleMoveToTomorrow(item) }}>
                              <CalendarDays size={14} /> Move to tomorrow
                            </button>
                            <button onClick={() => { setDropdownOpenFor(null); handleToggle(item) }}>
                              <Check size={14} /> {item.completed ? 'Mark incomplete' : 'Mark complete'}
                            </button>
                            <button onClick={() => { setDropdownOpenFor(null); handleToggleCancel(item) }}>
                              <XCircle size={14} /> {item.cancelled ? 'Restore' : 'Mark cancelled'}
                            </button>
                            <button className="danger" onClick={() => { setDropdownOpenFor(null); setDeleteTarget(item) }}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
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
          {loading ? (
            <div className="focus-detail" style={{ pointerEvents: 'none' }}>
              <div className="focus-detail-top">
                <div className="focus-status">
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: 80, height: 14 }} />
                </div>
                <span className="skeleton-rect skeleton-shimmer" style={{ width: 100, height: 14 }} />
              </div>

              <div className="focus-hero" style={{ marginTop: 24 }}>
                <span className="focus-icon skeleton-circle skeleton-shimmer" style={{ width: 50, height: 50 }} />
                <div style={{ flex: 1 }}>
                  <span className="skeleton-rect skeleton-shimmer mb-2.5" style={{ width: '30%', height: 12 }} />
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 22 }} />
                </div>
              </div>

              <div className="focus-time-block" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="skeleton-circle skeleton-shimmer" style={{ width: 32, height: 32 }} />
                <div style={{ flex: 1 }}>
                  <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: '40%', height: 10 }} />
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 14 }} />
                </div>
              </div>

              <div className="focus-content" style={{ marginTop: 24 }}>
                <section>
                  <span className="skeleton-rect skeleton-shimmer mb-2.5" style={{ width: 50, height: 10 }} />
                  <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: '80%', height: 12 }} />
                  <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: '90%', height: 12 }} />
                  <span className="skeleton-rect skeleton-shimmer" style={{ width: '50%', height: 12 }} />
                </section>
              </div>
            </div>
          ) : selectedItem ? (
            <FocusDetail
              item={selectedItem}
              isCurrent={currentItem ? itemKey(currentItem) === itemKey(selectedItem) : false}
              onToggle={() => handleToggle(selectedItem)}
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

      {modal.open && createPortal(
        <CalendarItemModal
          date={modal.date}
          item={modal.item}
          onClose={() => setModal({ open: false })}
          onSaved={async () => {
            setModal({ open: false })
            await loadItems()
            window.dispatchEvent(new CustomEvent('calendar-updated'))
          }}
        />,
        document.body
      )}

      {deleteTarget && createPortal(
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
        ),
        document.body
      )}

      {/* Mobile FAB */}
      <button 
        type="button" 
        className="calendar-mobile-fab" 
        onClick={() => setModal({ open: true, date: selectedDate })}
        aria-label="Add routine"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </section>
  )
}

function FocusDetail({
  item,
  isCurrent,
  onToggle,
}: {
  item: CalendarItem
  isCurrent: boolean
  onToggle: () => void
}) {
  const checklist = parseChecklist(item.notes)
  const routineIcon = getRoutineIconDetails(item)
  const RoutineIcon = routineIcon.icon
  const category = item.category || 'Personal'
  const categoryColors = getTagColor(category)

  return (
    <div className="focus-detail">
      <div className="focus-detail-panel-header">
        <h3>Routine Details</h3>
      </div>

      <div className="focus-detail-body">
        <div className="focus-header-group">
          <div className="focus-hero">
            <span className="focus-icon" style={{ '--focus-color': routineIcon.color } as React.CSSProperties}>
              <RoutineIcon size={22} />
            </span>
            <h2 className="focus-detail-title">{item.title}</h2>
          </div>

          <div className="focus-detail-meta-tags">
            <span className="k-tag" style={{ background: categoryColors.bg, color: categoryColors.text }}>
              <span className="dot" style={{ background: categoryColors.dot }} />
              {category}
            </span>
            {isCurrent && (
              <span className="k-tag is-live-pill" style={{ background: 'rgba(79, 147, 237, 0.11)', color: '#317bd8' }}>
                <span className="dot animate-pulse" style={{ background: '#317bd8', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                Live now
              </span>
            )}
            {item.completed && (
              <span className="k-tag completed-pill" style={{ background: '#d1fae5', color: '#047857' }}>
                <Check size={10} />
                Completed
              </span>
            )}
            {item.cancelled && (
              <span className="k-tag cancelled-pill" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                <XCircle size={10} />
                Cancelled
              </span>
            )}
            <span className="k-tag calendar-pill" style={{ background: 'rgba(16, 19, 18, 0.03)', color: '#4b5563' }}>
              <CalendarDays size={10} />
              {formatShortDate(item.date)}
            </span>
            {item.startTime && (
              <span className="k-tag time-pill" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                <Timer size={10} />
                {formatItemTime(item)}
              </span>
            )}
            <span className="k-tag duration-pill" style={{ background: 'rgba(67, 135, 226, 0.1)', color: '#4387e2' }}>
              <Clock size={10} />
              {formatDuration(item)}
            </span>
            {item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' && (
              <span className="k-tag repeat-pill" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                <Repeat2 size={10} />
                {item.recurrenceFrequency.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <div className="focus-detail-section">
          <span className="focus-section-label">Assignee</span>
          <div className="focus-assignees-list">
            <div className="focus-assignee-avatar" style={{ backgroundImage: `url(${avatarImage})` }} title="Eccentric Harry" />
          </div>
        </div>

        <div className="focus-detail-section">
          <span className="focus-section-label">Notes</span>
          <div className="focus-detail-notes">
            {stripChecklist(item.notes) || getFallbackDescription(item)}
          </div>
        </div>

        {checklist.length > 0 && (
          <div className="focus-detail-section">
            <span className="focus-section-label">Micro checklist</span>
            <div className="focus-detail-checklist">
              {checklist.map((entry, index) => (
                <div 
                  key={`${entry.text}-${index}`} 
                  className={`focus-detail-checkbox-item ${entry.checked ? 'is-completed' : ''}`}
                >
                  <div className={`focus-circle-check ${entry.checked ? 'checked' : ''}`}>
                    {entry.checked && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className="subtask-text">{entry.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="focus-detail-section">
          <span className="focus-section-label">Timeline</span>
          <div className="focus-detail-timeline">
            {item.createdAt && (
              <div className="focus-timeline-item">
                <span className="timestamp">{formatTimelineDate(item.createdAt)}</span>
                Routine block created
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="focus-footer">
        {item.cancelled ? (
          <button type="button" className="focus-footer-btn is-cancelled" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
            <XCircle size={18} /> Cancelled
          </button>
        ) : (
          <button type="button" className={`focus-footer-btn ${item.completed ? 'is-complete' : ''}`} onClick={onToggle}>
            {item.completed ? <CircleCheck size={18} /> : <Check size={18} />}
            {item.completed ? 'Completed' : 'Mark complete'}
          </button>
        )}
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

function getScrollableDays(date: string) {
  const selected = parseISODate(date)
  const start = new Date(selected)
  start.setDate(selected.getDate() - 14)
  return Array.from({ length: 45 }, (_, index) => {
    const next = new Date(start)
    next.setDate(start.getDate() + index)
    return next
  })
}

function byDate(items: CalendarItem[], date: string) {
  return items.filter((item) => item.date === date).sort(compareItems)
}

function compareItems(a: CalendarItem, b: CalendarItem) {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? 1 : -1
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
  if (item.cancelled) return 'cancelled'
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

function formatHeaderDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
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

function formatTimelineDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${month} ${day}, ${year} ${hh}:${mm}`
  } catch {
    return dateStr
  }
}

export { CalendarOverviewDashboard }
