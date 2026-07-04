/**
 * CODEBASE ANALYSIS FINDINGS (PHASE 1)
 * 
 * 1A — FRONTEND ANALYSIS
 * 1. Page Component: `CalendarOverview` in `components/views/calendar-view.tsx` acts as the frame. It renders `CalendarOverviewDashboard` inside `dashboard-stage`.
 * 2. Weekly/Day Grid Component: Implemented directly in `CalendarOverviewDashboard` (this file). Day headers are mapped over `weekDays` or `selectedDate` under `.grid-header-days`, and day columns are mapped under `.grid-columns-container` rendering `.grid-day-column`.
 * 3. Event Card/Chip Component: Rendered as `<button className="grid-event-card">` within each `.grid-day-column`.
 * 4. Left Sidebar Panel: Contains `.sidebar-search-block` (Search Input), `.sidebar-month-card` (`MiniMonth` component), `.quick-reminder-card` (Meeting Reminder), `.calendar-filter-card` (Filters Accordion), and `.calendar-other-accordion` (Other Calendars).
 * 5. Custom Hooks: State (e.g. `selectedDate`, `items`, `viewType`, `categoryFilters`) is managed directly via React standard hooks (`useState`, `useMemo`, `useCallback`, `useEffect`).
 * 6. TypeScript Interfaces: `CalendarItem` (defined in `lib/api.ts`) contains: `id`, `occurrenceId`, `date`, `originalDate`, `title`, `startTime`, `endTime`, `allDay`, `itemType`, `category`, `color`, `notes`, `completed`, `cancelled`, `sortOrder`, `recurrenceFrequency`, `recurrenceUntil`, `history`, `createdAt`. It has no `attendees` field.
 * 7. API Service: Functions in `lib/api.ts` fetch data via browser `fetch` (e.g. `fetchCalendarItemsForRange`, `createCalendarItem`, `updateCalendarItem`, `toggleCalendarItem`, `deleteCalendarItem`).
 * 
 * 1B — BACKEND ANALYSIS
 * 1. Controller: `CalendarController` in backend handles requests mapped to `/api/v1/calendar/items`.
 * 2. Endpoints:
 *    - GET `/api/v1/calendar/items/range`: Accepts query params `startDate` and `endDate`. Returns a list of `CalendarItemOccurrence` wrapped in `ApiResponse`.
 *    - GET `/api/v1/calendar/items/{id}`: Fetches a single source `DailyTask` item.
 *    - POST `/api/v1/calendar/items`: Creates a new calendar item (request payload: `CalendarItemRequest`).
 *    - PUT `/api/v1/calendar/items/{id}`: Updates a source calendar item.
 *    - PATCH `/api/v1/calendar/items/{id}/toggle`: Toggles completion.
 *    - PATCH `/api/v1/calendar/items/{id}/toggle-cancel`: Toggles cancellation.
 *    - DELETE `/api/v1/calendar/items/{id}`: Deletes a calendar item or a specific occurrence.
 * 3. Entity Class: `DailyTask` (MongoDB collection `daily_tasks`) has: `id`, `userId`, `title`, `date`, `scheduledTime`, `startTime`, `endTime`, `allDay`, `itemType`, `category`, `color`, `notes`, `completed`, `cancelled`, `status`, `completedAt`, `sortOrder`, `recurrenceFrequency`, `recurrenceUntil`, `completedDates`, `cancelledDates`, `excludedDates`, `subtasks`, `tags`, `history`, `googleEventId`, `lastSyncedAt`, `createdAt`, `updatedAt`.
 * 4. Enums: Recurrence is defined by `CalendarRecurrence` (`NONE`, `DAILY`, `WEEKLY`, `MONTHLY`). Event types in UI are `TASK`, `EVENT`, `REMINDER`, `MILESTONE`.
 * 5. Attendees: Attendees are not stored or returned in the database/API response.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Search,
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
import { getAvatarImage } from '../../../lib/avatar'
import { getTagColor } from '../../../lib/tag-colors'

import './calendar-overview.css'

const TYPE_OPTIONS: CalendarItemType[] = ['TASK', 'EVENT', 'REMINDER', 'MILESTONE']

const CATEGORY_HUES: Record<string, number> = {
  Personal: 270,
  Work: 210,
  Health: 142,
  Learning: 175,
  Finance: 35,
  Social: 330,
}

function hueForCategory(category?: string) {
  if (!category) return 210
  if (CATEGORY_HUES[category]) return CATEGORY_HUES[category]
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

const MOCK_USERS = [
  { name: 'John Doe', avatar: getAvatarImage('luffy') },
  { name: 'Sarah Connor', avatar: getAvatarImage('avatar1') },
  { name: 'Alex Mercer', avatar: getAvatarImage('avatar2') },
  { name: 'Emma Watson', avatar: getAvatarImage('avatar3') },
  { name: 'Bruce Wayne', avatar: '' },
  { name: 'Clark Kent', avatar: '' },
]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getInitialsBg(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 60%, 80%)`
}

function getInitialsColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 60%, 25%)`
}

function getEventClassification(item: CalendarItem): 'BIRTHDAY' | 'DEADLINE' | 'MEETING' | 'MILESTONE' | 'PERSONAL' | 'TASK' | 'DEFAULT' {
  const titleLower = (item.title || '').toLowerCase()
  const categoryLower = (item.category || '').toLowerCase()
  const typeUpper = (item.itemType || '').toUpperCase()

  if (categoryLower === 'birthday' || titleLower.includes('birthday')) {
    return 'BIRTHDAY'
  }
  if (titleLower.includes('deadline') || titleLower.includes('due') || titleLower.includes('submit')) {
    return 'DEADLINE'
  }
  if (
    typeUpper === 'EVENT' ||
    categoryLower === 'social' ||
    titleLower.includes('meeting') ||
    titleLower.includes('sync') ||
    titleLower.includes('huddle') ||
    titleLower.includes('call')
  ) {
    return 'MEETING'
  }
  if (typeUpper === 'MILESTONE') {
    return 'MILESTONE'
  }
  if (categoryLower === 'personal') {
    return 'PERSONAL'
  }
  if (typeUpper === 'TASK') {
    return 'TASK'
  }
  return 'DEFAULT'
}

function getMockAttendeesForItem(item: CalendarItem) {
  const isMeeting = getEventClassification(item) === 'MEETING'
  if (!isMeeting) return []

  const hash = item.id ? item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : item.title.length
  const count = (hash % 4) + 2
  
  const attendeesList = []
  for (let i = 0; i < count; i++) {
    attendeesList.push(MOCK_USERS[(hash + i) % MOCK_USERS.length])
  }
  return attendeesList
}

function getEventStyleClasses(item: CalendarItem) {
  // Use custom item color if set
  const color = item.color || colorForCategory(item.category || 'Personal')
  
  let formattedColor = color
  if (!color.startsWith('#') && !color.startsWith('hsl')) {
    formattedColor = `#${color}`
  }
  
  // Google Calendar style: solid background with white text and bold fonts
  return {
    style: {
      backgroundColor: formattedColor,
      color: '#ffffff',
      fontWeight: '700',
      borderRadius: '8px',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    },
    className: 'event-custom',
  }
}

function renderAvatarStack(attendees: Array<{ name: string; avatar: string }>) {
  if (!attendees || attendees.length === 0) return null
  const maxVisible = 3
  const visibleAttendees = attendees.slice(0, maxVisible)
  const remaining = attendees.length - maxVisible

  return (
    <div className="event-avatar-stack">
      {visibleAttendees.map((att, idx) => {
        const initials = getInitials(att.name)
        const bg = getInitialsBg(att.name)
        const textColor = getInitialsColor(att.name)
        return att.avatar ? (
          <img
            key={idx}
            src={att.avatar}
            alt={att.name}
            className="avatar-circle"
            style={{ zIndex: 5 - idx }}
          />
        ) : (
          <span
            key={idx}
            className="avatar-circle-initials"
            style={{
              zIndex: 5 - idx,
              backgroundColor: bg,
              color: textColor,
            }}
          >
            {initials}
          </span>
        )
      })}
      {remaining > 0 && (
        <span className="avatar-more-badge" style={{ zIndex: 1 }}>
          +{remaining}
        </span>
      )}
    </div>
  )
}

function getFourDays(dateStr: string) {
  const selected = parseISODate(dateStr)
  const day = selected.getDay()
  
  let startDate: Date
  if (day >= 1 && day <= 4) {
    const diff = selected.getDate() - day + 1
    startDate = new Date(selected.setDate(diff))
  } else {
    const diff = selected.getDate() - (day === 0 ? 2 : day - 5)
    startDate = new Date(selected.setDate(diff))
  }
  
  return Array.from({ length: 4 }, (_, idx) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + idx)
    return d
  })
}

function formatSelectedDateHeader(dateStr: string) {
  const date = parseISODate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const CATEGORY_OPTIONS = [
  { label: 'Personal', color: '#7c3aed' },
  { label: 'Work', color: '#2563eb' },
  { label: 'Health', color: '#10b981' },
  { label: 'Learning', color: '#0d9488' },
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

  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [searchQuery, setSearchQuery] = useState('')
  const [uncheckedCategories, setUncheckedCategories] = useState<string[]>([])
  const [upcomingItem, setUpcomingItem] = useState<CalendarItem | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [otherCalendarsOpen, setOtherCalendarsOpen] = useState(true)
  const [isFullView, setIsFullView] = useState(false)

  const [profileAvatar, setProfileAvatar] = useState(() => getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileAvatar(getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))
    }
    
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [])
  const scrollableDays = useMemo(() => getScrollableDays(selectedDate), [selectedDate])
  const visibleRange = useMemo(
    () => ({ start: toISODate(scrollableDays[0]), end: toISODate(scrollableDays[scrollableDays.length - 1]) }),
    [scrollableDays],
  )

  const loadUpcomingItem = useCallback(async () => {
    try {
      const todayStr = toISODate(new Date())
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureStr = toISODate(futureDate)
      
      const response = await fetchCalendarItemsForRange(todayStr, futureStr)
      const futureItems = (response?.data ?? []).filter((item: CalendarItem) => {
        if (item.completed || item.cancelled) return false
        return item.date >= todayStr
      })
      
      if (futureItems.length > 0) {
        futureItems.sort((a: CalendarItem, b: CalendarItem) => {
          const dateCompare = a.date.localeCompare(b.date)
          if (dateCompare !== 0) return dateCompare
          return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
        })
        setUpcomingItem(futureItems[0])
      } else {
        setUpcomingItem(null)
      }
    } catch (err) {
      console.error('Failed to load upcoming item', err)
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchCalendarItemsForRange(visibleRange.start, visibleRange.end)
      setItems(response?.data ?? [])
      await loadUpcomingItem()
    } catch (error) {
      setItems([])
      toast.error(error instanceof Error ? error.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }, [visibleRange.end, visibleRange.start, loadUpcomingItem])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadItems, 0)
    const handleCalendarUpdate = () => loadItems()
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    return () => {
      window.clearTimeout(initialLoad)
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [loadItems])

  const actualCategories = useMemo(() => {
    const cats = new Set<string>()
    cats.add('Work')
    cats.add('Personal')
    cats.add('Health')
    cats.add('Learning')
    cats.add('Finance')
    cats.add('Social')
    items.forEach((item) => {
      if (item.category) {
        const formatted = item.category.trim()
        if (formatted) cats.add(formatted)
      }
    })
    return Array.from(cats)
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const title = (item.title || '').toLowerCase()
        const notes = (item.notes || '').toLowerCase()
        if (!title.includes(query) && !notes.includes(query)) {
          return false
        }
      }
      const itemCategory = item.category || 'Personal'
      return !uncheckedCategories.includes(itemCategory)
    })
  }, [items, searchQuery, uncheckedCategories])

  const selectedItems = useMemo(() => byDate(filteredItems, selectedDate), [filteredItems, selectedDate])

  const sidebarUpcomingItem = useMemo(() => {
    // 1. Prioritize a timed event happening right now today
    const todayStr = toISODate(new Date())
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    
    // Get all today's items from the local loaded items
    const todayItems = items.filter(item => item.date === todayStr && !item.completed && !item.cancelled)
    
    const current = todayItems.find(item => {
      if (!item.startTime) return false
      const start = timeToMinutes(item.startTime)
      const end = item.endTime ? timeToMinutes(item.endTime) : start + 60
      return now >= start && now < end
    })
    
    if (current) {
      return { item: current, label: 'Live Now' }
    }
    
    // 2. Next, check if there's an all-day event for today
    const todayAllDay = todayItems.find(item => item.allDay || !item.startTime)
    if (todayAllDay) {
      return { item: todayAllDay, label: "Today's Event" }
    }
    
    // 3. Next, use the loaded upcomingItem
    if (upcomingItem) {
      const classification = getEventClassification(upcomingItem)
      let eyebrow = 'Upcoming event'
      if (classification === 'MEETING') eyebrow = 'Upcoming meeting'
      else if (classification === 'DEADLINE' || classification === 'TASK') eyebrow = 'Upcoming task'
      else if (classification === 'MILESTONE') eyebrow = 'Upcoming milestone'
      return { item: upcomingItem, label: eyebrow }
    }
    
    // 4. Fallback to mock item
    return {
      item: {
        id: 'mock-meeting',
        title: 'UX Huddle Call',
        startTime: '09:00',
        endTime: '09:30',
        date: todayStr,
        itemType: 'EVENT',
        category: 'Social',
        completed: false,
        cancelled: false,
      } as CalendarItem,
      label: 'Meeting reminder'
    }
  }, [items, upcomingItem])

  const fourDays = useMemo(() => getFourDays(selectedDate), [selectedDate])
  
  const weekItemsByDay = useMemo(() => {
    return fourDays.map((d) => {
      const iso = toISODate(d)
      const dayItems = filteredItems.filter((item) => item.date === iso)
      return dayItems.sort(compareItems)
    })
  }, [fourDays, filteredItems])

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

  const handleStep = (direction: number) => {
    const date = parseISODate(selectedDate)
    if (viewType === 'monthly') {
      date.setMonth(date.getMonth() + direction)
    } else {
      date.setDate(date.getDate() + direction)
    }
    updateSelectedDate(toISODate(date))
  }

  const handleDateSelect = (dateStr: string) => {
    updateSelectedDate(dateStr)
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
    try {
      const currentDate = parseISODate(item.date)
      currentDate.setDate(currentDate.getDate() + 1)
      const tomorrowStr = toISODate(currentDate)
      
      const payload: CalendarItemPayload = {
        title: item.title,
        date: tomorrowStr,
        startTime: item.startTime,
        endTime: item.endTime,
        allDay: item.allDay,
        itemType: item.itemType,
        category: item.category,
        color: item.color,
        notes: item.notes,
        completed: item.completed,
        recurrenceFrequency: item.recurrenceFrequency,
        recurrenceUntil: item.recurrenceUntil,
      }
      
      await updateCalendarItem(item.id, payload)
      toast.success(`Moved "${item.title}" to tomorrow`)
      setSelectedItemKey(null)
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

  const HOUR_TICKS = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const h = i + 8
      const label = h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
      return { hour: h, label }
    })
  }, [])

  const MonthViewGrid = () => {
    const current = parseISODate(selectedDate)
    const days = monthGrid(current)
    
    return (
      <div className="monthly-view-grid">
        <div className="month-grid-header">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <div key={day} className="month-grid-header-cell">{day}</div>
          ))}
        </div>
        <div className="month-grid-body">
          {days.map((d) => {
            const iso = toISODate(d)
            const isSelected = iso === selectedDate
            const isToday = iso === toISODate(new Date())
            const isSameMonth = d.getMonth() === current.getMonth()
            const dayItems = filteredItems.filter((item) => item.date === iso)
            
            return (
              <div
                key={iso}
                className={`month-day-cell ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${isSameMonth ? 'is-current-month' : 'is-other-month'}`}
                onClick={() => updateSelectedDate(iso)}
              >
                <span className="month-day-num">{d.getDate()}</span>
                <div className="month-day-events">
                  {dayItems.slice(0, 3).map((item) => {
                    const routineIcon = getRoutineIconDetails(item)
                    return (
                      <div
                        key={itemKey(item)}
                        className="month-event-capsule"
                        style={{ '--capsule-color': routineIcon.color } as React.CSSProperties}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    )
                  })}
                  {dayItems.length > 3 && (
                    <div className="month-more-indicator">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMainCanvas = (isFullMode: boolean) => {
    return (
      <main
        className={`focus-canvas ${isFullMode ? 'is-full-view-active' : ''}`}
        onClick={() => {
          if (isFullMode) setIsFullView(false)
        }}
      >
        <div
          className="calendar-main-stage"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Navigation & view selection row */}
          <div className="stage-navigation-row">
            <div className="date-range-navigator">
              <button type="button" className="nav-arrow" onClick={() => handleStep(viewType === 'weekly' ? -4 : -1)}>
                <ChevronLeft size={16} />
              </button>
              <h2 className="range-title">
                {viewType === 'weekly' || viewType === 'daily'
                  ? formatSelectedDateHeader(selectedDate)
                  : parseISODate(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" className="nav-arrow" onClick={() => handleStep(viewType === 'weekly' ? 4 : 1)}>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="view-switcher-tabs">
              {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`view-tab ${viewType === view ? 'is-selected' : ''}`}
                  onClick={() => setViewType(view)}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="create-event-btn"
                onClick={() => setModal({ open: true, date: selectedDate })}
              >
                <Plus size={14} />
                Create event
              </button>
              <button
                type="button"
                className="calendar-expand-btn"
                onClick={() => setIsFullView(!isFullView)}
                aria-label={isFullView ? "Minimize calendar" : "Expand calendar"}
                title={isFullView ? "Minimize calendar" : "Expand calendar"}
              >
                {isFullView ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Stage Calendar Body Grid */}
          <div className="stage-grid-canvas">
            {loading ? (
              <div className="stage-loader">
                <Loader2 size={32} className="animate-spin text-teal-600" />
              </div>
            ) : viewType === 'monthly' ? (
              <MonthViewGrid />
            ) : (
              <div className={`calendar-grid-scrollable view-${viewType}`}>
                {/* Day Columns Header */}
                <div className="grid-header-days" style={{ gridTemplateColumns: `80px repeat(${viewType === 'weekly' ? 4 : 1}, minmax(0, 1fr))` }}>
                  <div className="grid-header-tz">
                    <span>{viewType === 'weekly' ? 'GMT+05:30' : 'Time'}</span>
                  </div>
                  {(viewType === 'weekly' ? fourDays : [parseISODate(selectedDate)]).map((d, dayIdx) => {
                    const iso = toISODate(d)
                    const isSelected = iso === selectedDate
                    const isToday = iso === toISODate(new Date())
                    const dayItems = viewType === 'weekly' ? weekItemsByDay[dayIdx] : selectedItems
                    const dayAllDayItems = dayItems.filter((item) => item.allDay || !item.startTime)
                    return (
                      <div
                        key={iso}
                        className="grid-header-column-wrapper"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          padding: '4px 0',
                        }}
                      >
                        <div
                          className={`grid-header-day-card ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                          onClick={() => updateSelectedDate(iso)}
                        >
                          <span className="day-name">{d.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                          <strong className="day-number-pill">{d.getDate()}</strong>
                        </div>
                        {dayAllDayItems.length > 0 && (
                          <div className="all-day-events-container" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dayAllDayItems.map((item) => {
                              const cardStyles = getEventStyleClasses(item)
                              const isActive = selectedItem && itemKey(item) === itemKey(selectedItem)
                              return (
                                <button
                                  type="button"
                                  key={itemKey(item)}
                                  className={`all-day-event-chip ${isActive ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedItemKey(itemKey(item))
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: cardStyles.style.backgroundColor,
                                    color: cardStyles.style.color,
                                    boxShadow: isActive ? `0 0 0 2px #ffffff, 0 0 0 4px ${cardStyles.style.color}` : 'none',
                                    zIndex: isActive ? 2 : 1,
                                  }}
                                >
                                  <div className="event-title" style={{ fontSize: 11, WebkitLineClamp: 1, color: 'inherit' }}>
                                    {item.title}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Grid hour cells */}
                <div className="grid-body-canvas">
                  <div className="grid-lines-container">
                    {HOUR_TICKS.map((tick) => (
                      <div key={tick.hour} className="grid-hour-row" style={{ height: 80 }}>
                        <span className="hour-label">{tick.label}</span>
                        <div className="grid-line" />
                      </div>
                    ))}
                  </div>

                  <div className="grid-columns-container" style={{ gridTemplateColumns: `80px repeat(${viewType === 'weekly' ? 4 : 1}, minmax(0, 1fr))` }}>
                    <div className="time-column-spacer" />
                    {(viewType === 'weekly' ? fourDays : [parseISODate(selectedDate)]).map((d, dayIdx) => {
                      const iso = toISODate(d)
                      const dayItems = viewType === 'weekly' ? weekItemsByDay[dayIdx] : selectedItems
                      const positioned = getPositionedItems(dayItems)
                      return (
                        <div key={iso} className="grid-day-column">
                          {positioned.map(({ item, top, height, width, left }) => {
                            const status = getItemStatus(item, iso)
                            const isActive = selectedItem && itemKey(item) === itemKey(selectedItem)
                            const isAllDay = item.allDay || !item.startTime
                            const cardStyles = getEventStyleClasses(item)
                            const attendees = getMockAttendeesForItem(item)
                            return (
                              <button
                                type="button"
                                key={itemKey(item)}
                                className={`grid-event-card status-${status} ${isActive ? 'is-active' : ''} ${cardStyles.className}`}
                                onClick={() => setSelectedItemKey(itemKey(item))}
                                style={{
                                  position: 'absolute',
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  width: width,
                                  left: left,
                                  ...cardStyles.style,
                                  ...(isActive ? {
                                    boxShadow: `0 0 0 2px #ffffff, 0 0 0 4px ${cardStyles.style?.color || '#7c3aed'}`,
                                    zIndex: 11,
                                  } : {})
                                } as React.CSSProperties}
                              >
                                {isAllDay ? (
                                  <div className="event-card-content is-all-day">
                                    <strong className="event-title">{item.title}</strong>
                                  </div>
                                ) : (
                                  <div className="event-card-content">
                                    <div className="event-details-top">
                                      <strong className="event-title">{item.title}</strong>
                                      <span className="event-time">
                                        <Clock size={12} />
                                        {formatItemTime(item)}
                                      </span>
                                    </div>
                                    {attendees.length > 0 && renderAvatarStack(attendees)}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <section className="calendar-dashboard theme-glassmorphic" aria-label="Daily routine">
      <div className="calendar-focus-split">
        {/* Left Sidebar Panel */}
        <aside className="routine-navigator">
          {/* Search Input Bar */}
          <div className="sidebar-search-block">
            <div className="search-input-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search a task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="search-shortcut">⌘S</kbd>
            </div>
          </div>

          {/* Mini Calendar Widget */}
          <div className="sidebar-month-card">
            <MiniMonth
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
              allowFuture
              highlightedRange={viewType === 'weekly' ? fourDays.map((d) => toISODate(d)) : undefined}
            />
          </div>

          {/* Dynamic Upcoming/Live Card */}
          {sidebarUpcomingItem && (() => {
            const { item: sidebarItem, label: sidebarLabel } = sidebarUpcomingItem
            const categoryColor = colorForCategory(sidebarItem.category || 'Personal')
            
            return (
              <div 
                className="quick-reminder-card"
                style={{
                  background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor})`,
                  boxShadow: `0 10px 25px ${categoryColor}40`,
                }}
              >
                <div className="reminder-eyebrow">
                  {sidebarLabel}
                </div>
                <h3 className="reminder-title">{sidebarItem.title}</h3>
                <div className="reminder-time-row">
                  <Clock size={12} />
                  <span>
                    {sidebarItem.allDay || !sidebarItem.startTime
                      ? 'All day'
                      : `${formatClockTime(sidebarItem.startTime)} - ${formatClockTime(sidebarItem.endTime || '10:00')}`
                    }
                  </span>
                </div>
                <div className="reminder-footer">
                  {renderAvatarStack(
                    sidebarItem.id === 'mock-meeting'
                      ? [
                          { name: 'John Doe', avatar: profileAvatar },
                          { name: 'Sarah Connor', avatar: getAvatarImage('avatar1') },
                          { name: 'Alex Mercer', avatar: getAvatarImage('avatar2') },
                          { name: 'Emma Watson', avatar: getAvatarImage('avatar3') },
                        ]
                      : getMockAttendeesForItem(sidebarItem)
                  )}
                  <div className="reminder-actions">
                    <button
                      type="button"
                      className="btn-decline"
                      aria-label="Decline"
                      onClick={() => {
                        if (sidebarItem.id !== 'mock-meeting') {
                          handleToggleCancel(sidebarItem)
                        } else {
                          toast.success('Mock meeting declined')
                        }
                      }}
                    >
                      <X size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn-accept"
                      aria-label="Accept"
                      onClick={() => {
                        if (sidebarItem.id !== 'mock-meeting') {
                          handleToggle(sidebarItem)
                        } else {
                          toast.success('Mock meeting accepted')
                        }
                      }}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Filters Collapsible Accordion */}
          <div className="calendar-filter-card">
            <button
              type="button"
              className="filter-header-btn"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span>Filters</span>
              <ChevronDown size={14} className={`accordion-chevron ${filtersOpen ? 'open' : ''}`} />
            </button>
            {filtersOpen && (
              <div className="filter-list">
                {actualCategories.map((cat) => {
                  const checked = !uncheckedCategories.includes(cat)
                  const color = colorForCategory(cat)
                  return (
                    <label key={cat} className="filter-checkbox-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setUncheckedCategories([...uncheckedCategories, cat])
                          } else {
                            setUncheckedCategories(uncheckedCategories.filter((c) => c !== cat))
                          }
                        }}
                      />
                      <span className="checkbox-custom" style={{ '--checkbox-color': color } as React.CSSProperties} />
                      <span className="checkbox-label">{cat}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Other Calendars Accordion */}
          <div className="calendar-other-accordion">
            <button
              type="button"
              className="filter-header-btn"
              onClick={() => setOtherCalendarsOpen(!otherCalendarsOpen)}
            >
              <span>Other Calendars</span>
              <ChevronDown size={14} className={`accordion-chevron ${otherCalendarsOpen ? 'open' : ''}`} />
            </button>
            {otherCalendarsOpen && (
              <div className="other-calendars-list">
                <div className="other-calendar-item">
                  <span className="bullet-dot" style={{ background: '#10b981' }} />
                  <span>Holidays in United States</span>
                </div>
                <div className="other-calendar-item">
                  <span className="bullet-dot" style={{ background: '#3b82f6' }} />
                  <span>GitHub Contributions</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Grid Stage */}
        {isFullView ? (
          <div className="focus-canvas-placeholder" style={{ flex: 1 }} />
        ) : (
          renderMainCanvas(false)
        )}
      </div>

      {isFullView && createPortal(
        renderMainCanvas(true),
        document.body
      )}
      {/* Sleek details inspection popup modal */}
      {selectedItemKey && selectedItem && (
        <div className="details-modal-overlay" onClick={() => setSelectedItemKey(null)}>
          <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
            <FocusDetail
              item={selectedItem}
              isCurrent={currentItem ? itemKey(currentItem) === itemKey(selectedItem) : false}
              onToggle={() => handleToggle(selectedItem)}
              onToggleCancel={() => handleToggleCancel(selectedItem)}
              onDelete={() => {
                setDeleteTarget(selectedItem)
                setSelectedItemKey(null)
              }}
              onEdit={() => {
                setSelectedItemKey(null)
                setModal({ open: true, item: selectedItem, date: selectedItem.date })
              }}
              onMoveToTomorrow={() => handleMoveToTomorrow(selectedItem)}
              onClose={() => setSelectedItemKey(null)}
            />
          </div>
        </div>
      )}

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
      {!modal.open && !deleteTarget && (
        <button 
          type="button" 
          className="calendar-mobile-fab" 
          onClick={() => setModal({ open: true, date: selectedDate })}
          aria-label="Add routine"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </section>
  )
}

function FocusDetail({
  item,
  isCurrent,
  onToggle,
  onToggleCancel,
  onDelete,
  onEdit,
  onMoveToTomorrow,
  onClose,
}: {
  item: CalendarItem
  isCurrent: boolean
  onToggle: () => void
  onToggleCancel: () => void
  onDelete: () => void
  onEdit: () => void
  onMoveToTomorrow: () => void
  onClose?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const checklist = parseChecklist(item.notes)
  const routineIcon = getRoutineIconDetails(item)
  const RoutineIcon = routineIcon.icon
  const category = item.category || 'Personal'
  const categoryColors = getTagColor(category)
  const catHue = hueForCategory(category)
  const notes = stripChecklist(item.notes) || getFallbackDescription(item)
  const statusLabel = item.cancelled ? 'Cancelled' : item.completed ? 'Completed' : isCurrent ? 'Live now' : 'Planned'
  const [avatarSrc, setAvatarSrc] = useState(() => getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))

  useEffect(() => {
    const handleUpdate = () => setAvatarSrc(getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [])

  return (
    <div
      className="focus-detail"
      style={{ '--cat-hue': catHue, '--focus-color': routineIcon.color } as React.CSSProperties}
    >
      <div className="focus-detail-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <h3>Routine Details</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="drawer-more-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More actions"
          >
            <MoreHorizontal size={15} />
          </button>
          {onClose && (
            <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close details">
              <X size={15} />
            </button>
          )}
          <div className="focus-assignee-avatar" style={{ width: 28, height: 28, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', backgroundImage: `url(${avatarSrc})` }} title="Profile" />
        </div>

        {menuOpen && (
          <div className="focus-detail-dropdown">
            <button
              type="button"
              className="focus-detail-dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                onEdit()
              }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              className="focus-detail-dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                onMoveToTomorrow()
              }}
            >
              <CalendarDays size={14} /> Move to tomorrow
            </button>
            <button
              type="button"
              className="focus-detail-dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                onToggle()
              }}
            >
              <Check size={14} /> {item.completed ? 'Mark incomplete' : 'Mark complete'}
            </button>
            <button
              type="button"
              className="focus-detail-dropdown-item"
              onClick={() => {
                setMenuOpen(false)
                onToggleCancel()
              }}
            >
              <XCircle size={14} /> {item.cancelled ? 'Restore event' : 'Mark cancelled'}
            </button>
            <div style={{ height: 1, backgroundColor: 'rgba(0, 0, 0, 0.05)', margin: '4px 0' }} />
            <button
              type="button"
              className="focus-detail-dropdown-item danger"
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="focus-detail-body">
        <div className="focus-summary-card">
          <div className="focus-summary-main">
            <span className="focus-icon">
              <RoutineIcon size={22} />
            </span>
            <div>
              <div className="focus-status-strip">
                <span className={`focus-status-pill ${isCurrent ? 'is-live' : ''} ${item.completed ? 'is-done' : ''} ${item.cancelled ? 'is-cancelled' : ''}`}>
                  <span />
                  {statusLabel}
                </span>
                <span className="focus-category-mark" style={{ background: categoryColors.bg, color: categoryColors.text }}>
                  <span style={{ background: categoryColors.dot }} />
                  {category}
                </span>
              </div>
              <h2 className="focus-detail-title">{item.title}</h2>
              <p className="focus-summary-note">{notes}</p>
            </div>
          </div>
        </div>

        <div className="focus-detail-layout">
          <section className="focus-detail-section focus-schedule-card">
            <span className="focus-section-label">Schedule</span>
            <div className="focus-facts-grid">
              <div className="focus-fact">
                <CalendarDays size={15} />
                <span>Date</span>
                <strong>{formatShortDate(item.date)}</strong>
              </div>
              <div className="focus-fact">
                <Timer size={15} />
                <span>Time</span>
                <strong>{formatItemTime(item)}</strong>
              </div>
              <div className="focus-fact">
                <Clock size={15} />
                <span>Duration</span>
                <strong>{formatDuration(item)}</strong>
              </div>
              <div className="focus-fact">
                <Repeat2 size={15} />
                <span>Repeats</span>
                <strong>{formatRecurrence(item)}</strong>
              </div>
            </div>
          </section>

          <div className="focus-detail-right-column">
            <section className="focus-detail-section focus-notes-card">
              <span className="focus-section-label">Notes</span>
              <div className="focus-detail-notes">
                {notes}
              </div>
            </section>

            {checklist.length > 0 && (
              <section className="focus-detail-section focus-checklist-card">
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
              </section>
            )}

            <section className="focus-detail-section focus-history-card">
              <span className="focus-section-label">History</span>
              <div className="focus-detail-timeline">
                {item.history && item.history.length > 0 ? (
                  [...item.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((hist, idx) => {
                    const { date, time } = formatTimelineDateParts(hist.timestamp)
                    return (
                      <div className="focus-timeline-item" key={idx}>
                        <span className="timestamp-date">{date}</span>
                        <div className="focus-timeline-content">
                          <span className="timestamp-time">{time}</span>
                          <span className="timestamp-msg">{hist.message}</span>
                        </div>
                      </div>
                    )
                  })
                ) : null}
                {item.createdAt ? (
                  <div className="focus-timeline-item">
                    <span className="timestamp-date">{formatTimelineDateParts(item.createdAt).date}</span>
                    <div className="focus-timeline-content">
                      <span className="timestamp-time">{formatTimelineDateParts(item.createdAt).time}</span>
                      <span className="timestamp-msg">Routine block created</span>
                    </div>
                  </div>
                ) : !item.history?.length ? (
                  <div className="focus-timeline-item">No history yet</div>
                ) : null}
              </div>
            </section>
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
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [customCategories, setCustomCategories] = useState<string[]>([])

  const allCategoryOptions = [...CATEGORY_OPTIONS, ...customCategories.map((name) => ({ label: name, color: colorForCategory(name) }))]

  const handleCategory = (nextCategory: string) => {
    if (nextCategory === '__custom__') {
      setShowCustomCategory(true)
      setCustomCategoryInput('')
      return
    }
    setShowCustomCategory(false)
    setCategory(nextCategory)
    setColor(colorForCategory(nextCategory))
  }

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim()
    if (!trimmed) return
    if (!customCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed])
    }
    setCategory(trimmed)
    setColor(colorForCategory(trimmed))
    setShowCustomCategory(false)
    setCustomCategoryInput('')
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
        let toastMsg = `Updated "${title.trim()}"`
        if (item.title !== title.trim()) {
          toastMsg = `Task title updated from "${item.title}" to "${title.trim()}"`
        } else if (item.date !== itemDate && item.originalDate !== itemDate) {
          toastMsg = `Task moved from ${item.date} to ${itemDate}`
        } else if (item.startTime !== startTime) {
          toastMsg = `Task time updated from ${item.startTime || 'none'} to ${startTime || 'none'}`
        }
        toast.success(toastMsg)
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

  const tempItem = { title, category, notes, itemType, startTime, endTime }
  const routineIconDetails = getRoutineIconDetails(tempItem)
  const RoutineIcon = routineIconDetails.icon

  const getFormattedTimeRange = () => {
    if (!startTime) return 'All day'
    try {
      const formatTime = (t: string) => {
        if (!t || !t.includes(':')) return ''
        const [h, m] = t.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) return ''
        return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: m ? '2-digit' : undefined,
        })
      }
      const start = formatTime(startTime)
      if (!start) return 'All day'
      const end = endTime ? formatTime(endTime) : ''
      return end ? `${start} - ${end}` : start
    } catch {
      return startTime
    }
  }

  return (
    <div className="tasks-add-modal-overlay theme-glassmorphic" onClick={onClose}>
      <div className="tasks-add-entry-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{item ? 'Edit routine block' : 'Add routine block'}</h3>
          <button type="button" className="close-modal-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-entry-form">
          <div className="tasks-modal-grid">
            {/* Left Column: Form */}
            <div className="tasks-modal-form-col">
              <div className="form-group">
                <label>ROUTINE TITLE</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Morning Walk, Read Book..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>TYPE</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as CalendarItemType)}
                    className="form-input"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>CATEGORY</label>
                  {showCustomCategory ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Enter category name"
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory() }
                        }}
                        className="form-input"
                        autoFocus
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="modal-btn-save"
                        onClick={handleAddCustomCategory}
                        disabled={!customCategoryInput.trim()}
                        style={{ padding: '0 12px', fontSize: '11px', whiteSpace: 'nowrap', height: 'auto' }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="modal-btn-cancel"
                        onClick={() => setShowCustomCategory(false)}
                        style={{ padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap', height: 'auto' }}
                      >
                        Back
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => handleCategory(e.target.value)}
                      className="form-input"
                    >
                      {allCategoryOptions.map((option) => (
                        <option key={option.label} value={option.label}>{option.label}</option>
                      ))}
                      <option value="__custom__">+ Add custom...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>DATE</label>
                  <div className="input-with-icon">
                    <input
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      className="form-input"
                    />
                    <CalendarDays size={14} className="input-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label>REPEATS</label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as CalendarRecurrence)}
                    className="form-input"
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              {recurrenceFrequency !== 'NONE' && (
                <div className="form-group">
                  <label>REPEAT UNTIL</label>
                  <div className="input-with-icon">
                    <input
                      type="date"
                      value={recurrenceUntil}
                      onChange={(e) => setRecurrenceUntil(e.target.value)}
                      min={itemDate}
                      className="form-input"
                    />
                    <CalendarDays size={14} className="input-icon" />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>STARTS</label>
                  <div className="input-with-icon">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="form-input"
                    />
                    <Clock size={14} className="input-icon" />
                  </div>
                </div>
                <div className="form-group">
                  <label>ENDS</label>
                  <div className="input-with-icon">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="form-input"
                    />
                    <Clock size={14} className="input-icon" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>NOTES OR CHECKLIST (OPTIONAL)</label>
                <textarea
                  placeholder="Add context, or use lines like '- [ ] Prepare notes'..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  rows={3}
                />
              </div>

              <label className="calendar-checkbox-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 700, color: 'rgba(16, 19, 18, 0.5)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  checked={completed} 
                  onChange={(e) => setCompleted(e.target.checked)} 
                  style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: '#101312', cursor: 'pointer' }}
                />
                Completed
              </label>
            </div>

            {/* Right Column: Preview */}
            <div className="tasks-modal-preview-col">
              <div className="preview-label">Preview</div>
              
              <div
                className="routine-card preview-mode"
                style={{
                  pointerEvents: 'none',
                  width: '100%',
                  maxWidth: '280px',
                  '--card-color-default': routineIconDetails.color,
                  '--card-bg-default': routineIconDetails.bg
                } as React.CSSProperties}
              >
                <span className="routine-card-icon">
                  <RoutineIcon size={16} />
                </span>
                <div className="routine-card-copy" style={{ display: 'grid', gap: '2px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(16, 19, 18, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {getFormattedTimeRange()}
                  </span>
                  <strong style={{ fontSize: '13.5px', fontWeight: 700, color: '#101312', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title || 'Untitled Routine'}</strong>
                  <p style={{ margin: 0, fontSize: '11.5px', color: 'rgba(16, 19, 18, 0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {notes || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer-actions">
            {item?.createdAt ? (
              <div className="modal-last-updated">
                Created: {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            ) : <div />}
            {error && <p className="calendar-form-error" style={{ color: '#b4232e', fontSize: '11px', fontWeight: 800 }}>{error}</p>}
            <div className="modal-btn-group">
              <button type="button" className="modal-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modal-btn-save" disabled={!title.trim() || saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : 'Save routine'}
              </button>
            </div>
          </div>
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
  const title = item.title?.toLowerCase() || ''
  
  if (title.includes('medicine') || title.includes('pill') || title.includes('supplement') || title.includes('dose')) {
    return 'Scheduled health routine for supplements and medications.'
  }
  if (title.includes('workout') || title.includes('gym') || title.includes('run') || title.includes('exercise') || title.includes('fit')) {
    return 'Physical activity and body fitness routine block.'
  }
  if (title.includes('meeting') || title.includes('sync') || title.includes('1:1') || title.includes('standup') || title.includes('discuss')) {
    return 'Collaboration and team alignment sync session.'
  }
  if (title.includes('study') || title.includes('learn') || title.includes('read') || title.includes('course') || title.includes('book')) {
    return 'Dedicated learning hour for skills development.'
  }
  if (title.includes('code') || title.includes('deploy') || title.includes('bug') || title.includes('pr') || title.includes('dev')) {
    return 'Active engineering focus block for coding and deployment.'
  }
  if (title.includes('pay') || title.includes('bill') || title.includes('finance') || title.includes('tax')) {
    return 'Financial planning and utility dues tracking log.'
  }
  if (title.includes('lunch') || title.includes('dinner') || title.includes('breakfast') || title.includes('coffee') || title.includes('meal')) {
    return 'Nutritional intake and scheduled meal break.'
  }
  
  return `A structured ${category} focus slot to optimize daily progress.`
}

function formatDuration(item: CalendarItem) {
  if (!item.startTime || !item.endTime) return item.allDay ? 'All day' : 'Flexible'
  const minutes = timeToMinutes(item.endTime) - timeToMinutes(item.startTime)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}



function formatRecurrence(item: CalendarItem) {
  if (!item.recurrenceFrequency || item.recurrenceFrequency === 'NONE') return 'None'
  return item.recurrenceFrequency.charAt(0) + item.recurrenceFrequency.slice(1).toLowerCase()
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
    minute: '2-digit',
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
  const match = CATEGORY_OPTIONS.find((option) => option.label === category)
  if (match) return match.color
  const h = hueForCategory(category)
  return `hsl(${h}, 55%, 42%)`
}


function formatTimelineDateParts(dateStr: string) {
  if (!dateStr) return { date: '', time: '' }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: dateStr, time: '' }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const month = months[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return { date: `${month} ${day}, ${year}`, time: `${hh}:${mm}` }
  } catch {
    return { date: dateStr, time: '' }
  }
}





function calculateTimeStyles(item: CalendarItem) {
  if (item.allDay || !item.startTime) {
    return { top: 0, height: 50, isAllDay: true }
  }
  
  const startMin = timeToMinutes(item.startTime)
  const endMin = item.endTime ? timeToMinutes(item.endTime) : startMin + 60
  
  const gridStartMin = 8 * 60
  const gridEndMin = 22 * 60
  
  const clampedStart = Math.max(gridStartMin, Math.min(gridEndMin, startMin))
  const clampedEnd = Math.max(gridStartMin, Math.min(gridEndMin, endMin))
  
  const topOffset = ((clampedStart - gridStartMin) / 60) * 80
  const heightVal = ((clampedEnd - clampedStart) / 60) * 80
  
  return {
    top: topOffset,
    height: Math.max(52, heightVal),
    isAllDay: false
  }
}

interface PositionedItem {
  item: CalendarItem
  top: number
  height: number
  width: string
  left: string
  isAllDay: boolean
}

function getPositionedItems(dayItems: CalendarItem[]): PositionedItem[] {
  const timed = dayItems.filter((item) => !item.allDay && item.startTime)
  
  const result: PositionedItem[] = []
  const sorted = [...timed].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  
  const columns: CalendarItem[][] = []
  for (const item of sorted) {
    let placed = false
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const lastItem = columns[colIdx][columns[colIdx].length - 1]
      const lastEnd = lastItem.endTime ? timeToMinutes(lastItem.endTime) : timeToMinutes(lastItem.startTime ?? '00:00') + 60
      const currentStart = timeToMinutes(item.startTime ?? '00:00')
      
      if (currentStart >= lastEnd) {
        columns[colIdx].push(item)
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push([item])
    }
  }
  
  const totalCols = columns.length
  columns.forEach((colItems, colIdx) => {
    colItems.forEach((item) => {
      const { top, height, isAllDay } = calculateTimeStyles(item)
      result.push({
        item,
        top,
        height,
        width: `${100 / totalCols}%`,
        left: `${(colIdx * 100) / totalCols}%`,
        isAllDay
      })
    })
  })
  
  return result
}

function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const gridEnd = startOfWeek(lastDay)
  gridEnd.setDate(gridEnd.getDate() + 6)
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return daysBetween(gridStart, totalDays)
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

export { CalendarOverviewDashboard }
