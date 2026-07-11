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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlignLeft,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import {
  createCalendarItem,
  deleteCalendarItem,
  disconnectGoogleCalendar,
  fetchCalendarItemsForRange,
  fetchGoogleAuthUrl,
  fetchGoogleSyncStatus,
  pushLocalEventsToGoogle,
  toggleCalendarItem,
  toggleCancelCalendarItem,
  triggerGoogleSync,
  updateCalendarItem,
} from '../../../lib/api'
import type { CalendarItem, CalendarItemPayload, CalendarItemType, CalendarRecurrence, GoogleCalendarAccount, GoogleSyncStatus } from '../../../lib/api'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { MiniMonth } from '../../ui/mini-month'
import { getRoutineIconDetails } from './routine-icon-helper'
import { getAvatarImage } from '../../../lib/avatar'


import './calendar-overview.css'

const TYPE_OPTIONS: CalendarItemType[] = ['TASK', 'EVENT', 'REMINDER', 'MILESTONE']

const CATEGORY_HUES: Record<string, number> = {
  personal: 270,
  work: 210,
  health: 142,
  learning: 175,
  finance: 35,
  social: 330,
}

function hueForCategory(category?: string) {
  const normalized = (category || '').trim().toLowerCase()
  if (!normalized) return 210
  if (CATEGORY_HUES[normalized] !== undefined) return CATEGORY_HUES[normalized]
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

/*
const MOCK_USERS = [
  { name: 'John Doe', avatar: getAvatarImage('luffy') },
  { name: 'Sarah Connor', avatar: getAvatarImage('avatar1') },
  { name: 'Alex Mercer', avatar: getAvatarImage('avatar2') },
  { name: 'Emma Watson', avatar: getAvatarImage('avatar3') },
  { name: 'Bruce Wayne', avatar: '' },
  { name: 'Clark Kent', avatar: '' },
]
*/

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

/*
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
*/

function overrideLightColors(colorStr: string, category?: string) {
  const upper = colorStr.toUpperCase()
  if (upper === '#C8F3A3' || upper === 'C8F3A3' || (category && category.toLowerCase() === 'personal')) {
    return '#7c3aed' // Bold Violet
  }
  if (upper === '#9EE7E8' || upper === '9EE7E8' || (category && category.toLowerCase() === 'health')) {
    return '#10b981' // Bold Emerald
  }
  if (upper === '#9BD7FF' || upper === '9BD7FF' || (category && category.toLowerCase() === 'work')) {
    return '#2563eb' // Bold Blue
  }
  if (upper === '#C9BFF6' || upper === 'C9BFF6' || (category && category.toLowerCase() === 'learning')) {
    return '#0d9488' // Bold Teal
  }
  if (upper === '#FFD37D' || upper === 'FFD37D' || (category && category.toLowerCase() === 'finance')) {
    return '#d97706' // Bold Amber
  }
  if (upper === '#FFB4D2' || upper === 'FFB4D2' || (category && category.toLowerCase() === 'social')) {
    return '#db2777' // Bold Pink/Rose
  }
  return colorStr
}

function bannerForCategory(category?: string) {
  const cat = (category || 'default').toLowerCase()
  if (cat === 'personal') return '/banners/personal.jpg'
  if (cat === 'work') return '/banners/work.jpg'
  if (cat === 'health') return '/banners/health.jpg'
  if (cat === 'learning') return '/banners/learning.jpg'
  return '/banners/default.jpg'
}

function getEventStyleClasses(item: CalendarItem) {
  const color = displayColorForItem(item)

  let formattedColor = color
  if (!color.startsWith('#') && !color.startsWith('hsl')) {
    formattedColor = `#${color}`
  }
  
  // Subtle pastel background (12% of the theme color mixed with white)
  const bgSubtle = `color-mix(in srgb, ${formattedColor} 12%, #ffffff)`
  
  return {
    style: {
      backgroundColor: bgSubtle,
      color: '#1e293b',
      fontWeight: '600',
      borderRadius: '8px',
      border: 'none',
      boxShadow: 'none',
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

function getThreeDays(dateStr: string) {
  const selected = parseISODate(dateStr)
  const d1 = new Date(selected)
  d1.setDate(selected.getDate() - 1)
  
  return Array.from({ length: 3 }, (_, idx) => {
    const d = new Date(d1)
    d.setDate(d1.getDate() + idx)
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
  { label: 'Movies', color: '#e11d48' },
]

/**
 * Single source of truth for what color an item renders with, everywhere
 * (filters, month capsules, grid chips, popover, sidebar card). The category
 * always determines the color — registered categories use the shared palette
 * and unknown ones a stable hash hue — so a category can never render two
 * different colors across the UI. A stored item color only applies when the
 * item has no category at all (e.g. some Google-synced events).
 */
function displayColorForItem(item: { category?: string; color?: string }) {
  const normalized = (item.category || '').trim().toLowerCase()
  if (normalized) return colorForCategory(item.category!)
  if (item.color) return overrideLightColors(item.color, item.category)
  return colorForCategory('Personal')
}

function getPopoverStyle(rect: { top: number; left: number; width: number; height: number }) {
  if (typeof window === 'undefined') return {}
  const isMobile = window.innerWidth <= 600

  if (isMobile) {
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '400px',
      zIndex: 2000,
    }
  }

  const popoverWidth = 400
  const popoverHeight = 440 // estimated max height
  const gap = 8
  const padding = 16
  const sidebarBoundary = 490 // Desktop sidebar boundary

  // Horizontal calculation: default right side of the card
  let left = rect.left + rect.width + gap
  if (left + popoverWidth + padding > window.innerWidth) {
    // Try left side, ensuring it doesn't overlap the left sidebar menu area
    const leftTry = rect.left - popoverWidth - gap
    if (leftTry >= sidebarBoundary) {
      left = leftTry
    } else {
      // Overlap the event chip itself (align right edges) instead of pushing to the left part of the screen
      left = Math.max(sidebarBoundary, rect.left + rect.width - popoverWidth)
    }
  }

  // Vertical calculation: default center alignment relative to the chip
  let top = rect.top + (rect.height / 2) - (popoverHeight / 2)
  // Clamp top to keep it in viewport
  top = Math.max(padding, Math.min(window.innerHeight - popoverHeight - padding, top))

  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 2000,
  }
}

function getOverflowPopoverStyle(rect: { top: number; left: number; width: number; height: number }) {
  if (typeof window === 'undefined') return {}
  const isMobile = window.innerWidth <= 600

  if (isMobile) {
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 48px)',
      maxWidth: '320px',
      zIndex: 2000,
    }
  }

  // Sit on top of the day cell, slightly expanded beyond its bounds
  const width = Math.max(rect.width + 32, 260)
  const padding = 12
  const left = Math.max(padding, Math.min(window.innerWidth - width - padding, rect.left - 16))
  const top = Math.max(padding, Math.min(window.innerHeight - 340, rect.top - 8))

  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    zIndex: 2000,
  }
}

type CalendarOverviewDashboardProps = {
  searchParams: URLSearchParams
  onNavigate: (pathname: AppPath, search?: string) => void
}

type ModalState =
  | { open: false; item?: never; date?: never }
  | { open: true; item?: CalendarItem; date: string }

const CalendarSkeleton = ({ viewType }: { viewType: 'daily' | 'weekly' | 'monthly' }) => {
  return (
    <div className={`calendar-skeleton view-${viewType}`}>
      {/* Header / Navigation row skeleton */}
      <div className="skeleton-nav-row">
        <div className="skeleton-pill skeleton-date" />
        <div className="skeleton-pill skeleton-tabs" />
        <div className="skeleton-pill skeleton-btn" />
      </div>

      {viewType === 'monthly' ? (
        <div className="skeleton-monthly-grid">
          <div className="skeleton-month-header">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton-month-header-cell" />
            ))}
          </div>
          <div className="skeleton-month-cells">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton-month-cell">
                <div className="skeleton-month-date" />
                {i % 4 === 0 && <div className="skeleton-month-event" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Grid header skeleton */}
          <div className="skeleton-grid-header" style={{ gridTemplateColumns: `56px repeat(${viewType === 'weekly' ? 3 : 1}, minmax(0, 1fr))` }}>
            <div className="skeleton-tz-box" />
            {Array.from({ length: viewType === 'weekly' ? 3 : 1 }).map((_, i) => (
              <div key={i} className="skeleton-day-card" />
            ))}
          </div>

          {/* Grid body skeleton */}
          <div className="skeleton-grid-body" style={{ gridTemplateColumns: `56px repeat(${viewType === 'weekly' ? 3 : 1}, minmax(0, 1fr))` }}>
            <div className="skeleton-time-column">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-time-slot" />
              ))}
            </div>
            <div className="skeleton-columns" style={{ gridColumn: `span ${viewType === 'weekly' ? 3 : 1}`, gridTemplateColumns: `repeat(${viewType === 'weekly' ? 3 : 1}, minmax(0, 1fr))` }}>
              {Array.from({ length: viewType === 'weekly' ? 3 : 1 }).map((_, i) => (
                <div key={i} className="skeleton-column">
                  {i === 0 && (
                    <>
                      <div className="skeleton-event-chip" style={{ top: '20%', height: '80px', width: '90%' }} />
                      <div className="skeleton-event-chip" style={{ top: '55%', height: '50px', width: '80%' }} />
                    </>
                  )}
                  {i === 1 && (
                    <div className="skeleton-event-chip" style={{ top: '35%', height: '110px', width: '85%' }} />
                  )}
                  {i === 2 && (
                    <div className="skeleton-event-chip" style={{ top: '15%', height: '60px', width: '90%' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

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
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [overflowDay, setOverflowDay] = useState<{ date: string; rect: { top: number; left: number; width: number; height: number } } | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)

  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 820) {
      return 'daily'
    }
    return 'weekly'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [uncheckedCategories, setUncheckedCategories] = useState<string[]>([])
  const [upcomingItems, setUpcomingItems] = useState<CalendarItem[]>([])
  const [upcomingCardIndex, setUpcomingCardIndex] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 820) {
      return false
    }
    return true
  })
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [colorEditModalOpen, setColorEditModalOpen] = useState(false)
  const [colorEditDraft, setColorEditDraft] = useState<Record<string, string>>({})
  const [isFullView, setIsFullView] = useState(false)

  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const weeklyScrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Daily/Weekly view: vertical auto-scroll to current time
      if ((viewType === 'daily' || viewType === 'weekly') && weeklyScrollContainerRef.current) {
        const container = weeklyScrollContainerRef.current
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const minutesSinceMidnight = currentHour * 60 + currentMinute
        const timeOffset = (minutesSinceMidnight / 60) * 80 // each hour row is 80px tall

        const isInternallyScrollable = container.scrollHeight > container.clientHeight + 8
        if (isInternallyScrollable) {
          // Desktop: the grid scrolls inside its own container — center current time.
          container.scrollTo({
            top: Math.max(0, timeOffset - container.clientHeight / 2),
            behavior: 'smooth',
          })
        } else {
          // Mobile: the grid flows freely and the page itself scrolls (Apple
          // Calendar style) — scroll the window so current time is centered.
          const containerTop = container.getBoundingClientRect().top + window.scrollY
          window.scrollTo({
            top: Math.max(0, containerTop + timeOffset - window.innerHeight / 2),
            behavior: 'smooth',
          })
        }
      }
      
      // 2. Monthly view: horizontal auto-scroll to current day (is-today cell)
      if (viewType === 'monthly' && canvasContainerRef.current) {
        const container = canvasContainerRef.current
        const todayCell = container.querySelector('.month-day-cell.is-today')
        if (todayCell) {
          const containerRect = container.getBoundingClientRect()
          const cellRect = todayCell.getBoundingClientRect()
          const offset = cellRect.left - containerRect.left - (containerRect.width - cellRect.width) / 2
          container.scrollTo({
            left: container.scrollLeft + offset,
            behavior: 'smooth'
          })
        }
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [viewType, selectedDate, loading, items])

  const [profileAvatar, setProfileAvatar] = useState(() => getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))
  const [googleSyncStatus, setGoogleSyncStatus] = useState<GoogleSyncStatus | null>(null)
  const [googlePushingEmail, setGooglePushingEmail] = useState<string | null>(null)
  const [googleSyncingEmail, setGoogleSyncingEmail] = useState<string | null>(null)
  const [googleDisconnectingEmail, setGoogleDisconnectingEmail] = useState<string | null>(null)
  const [googleConnecting, setGoogleConnecting] = useState(false)

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileAvatar(getAvatarImage(localStorage.getItem('avatarUrl') || 'luffy'))
    }

    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [])

  useEffect(() => {
    if (deleteTarget) {
      document.body.classList.add('calendar-modal-open')
    } else {
      document.body.classList.remove('calendar-modal-open')
    }
  }, [deleteTarget])

  useEffect(() => {
    const handleDocumentClick = () => {
      setSelectedItemKey(null)
      setAnchorRect(null)
      setOverflowDay(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedItemKey(null)
        setAnchorRect(null)
        setOverflowDay(null)
      }
    }
    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedItemKey(null)
    setAnchorRect(null)
    setOverflowDay(null)
  }, [isFullView])

  // The fetch window must always cover everything the current view can render.
  // Monthly: the exact month grid. Daily/3-day: a 4-week window snapped to week
  // boundaries so navigating between nearby dates reuses the same range (no refetch).
  const visibleRange = useMemo(() => {
    const selected = parseISODate(selectedDate)
    if (viewType === 'monthly') {
      const gridDays = monthGrid(selected)
      return { start: toISODate(gridDays[0]), end: toISODate(gridDays[gridDays.length - 1]) }
    }
    const anchor = startOfWeek(selected)
    const start = new Date(anchor)
    start.setDate(anchor.getDate() - 7)
    const end = new Date(anchor)
    end.setDate(anchor.getDate() + 20)
    return { start: toISODate(start), end: toISODate(end) }
  }, [selectedDate, viewType])

  const loadUpcomingItem = useCallback(async () => {
    try {
      const now = new Date()
      const todayStr = toISODate(now)
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureStr = toISODate(futureDate)

      const response = await fetchCalendarItemsForRange(todayStr, futureStr)
      const candidates = (response?.data ?? []).filter((item: CalendarItem) => {
        if (item.completed || item.cancelled) return false
        if (item.date > todayStr) return true
        // For today's items, skip timed events whose endTime has already passed
        if (item.date === todayStr) {
          if (!item.startTime || item.allDay) return true
          const endMinutes = item.endTime ? timeToMinutes(item.endTime) : timeToMinutes(item.startTime) + 60
          return endMinutes > nowMinutes
        }
        return false
      })

      candidates.sort((a: CalendarItem, b: CalendarItem) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
      })

      setUpcomingItems(candidates.slice(0, 5))
      setUpcomingCardIndex(0)
    } catch (err) {
      console.error('Failed to load upcoming item', err)
    }
  }, [])

  // Monotonic sequence guards against out-of-order responses: only the most
  // recently issued request may update state, so rapid date clicks can never
  // leave stale data on screen.
  const requestSeqRef = useRef(0)

  const loadItems = useCallback(async () => {
    const seq = ++requestSeqRef.current
    setLoading(true)
    try {
      const response = await fetchCalendarItemsForRange(visibleRange.start, visibleRange.end)
      if (seq !== requestSeqRef.current) return
      setItems(response?.data ?? [])
    } catch (error) {
      if (seq !== requestSeqRef.current) return
      toast.error(error instanceof Error ? error.message : 'Failed to load calendar')
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false)
        setHasLoadedOnce(true)
      }
    }
  }, [visibleRange.end, visibleRange.start])

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 0)
    return () => window.clearTimeout(timer)
  }, [loadItems])

  useEffect(() => {
    const timer = window.setTimeout(loadUpcomingItem, 0)
    return () => window.clearTimeout(timer)
  }, [loadUpcomingItem])

  useEffect(() => {
    const handleCalendarUpdate = () => {
      loadItems()
      loadUpcomingItem()
    }
    window.addEventListener('calendar-updated', handleCalendarUpdate)
    return () => {
      window.removeEventListener('calendar-updated', handleCalendarUpdate)
    }
  }, [loadItems, loadUpcomingItem])

  useEffect(() => {
    fetchGoogleSyncStatus()
      .then((res) => setGoogleSyncStatus(res.data))
      .catch(() => setGoogleSyncStatus(null))
  }, [])

  const refreshGoogleStatus = async () => {
    const res = await fetchGoogleSyncStatus()
    setGoogleSyncStatus(res.data)
  }

  const handleGoogleConnect = async () => {
    setGoogleConnecting(true)
    try {
      const res = await fetchGoogleAuthUrl()
      const url = res.data?.url
      if (!url) throw new Error('No auth URL returned')
      const popup = window.open(url, 'google-oauth', 'width=600,height=700,left=200,top=100')
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
          window.removeEventListener('message', onMsg)
          refreshGoogleStatus().catch(() => {})
          toast.success(`Connected ${e.data.email}`)
          setGoogleConnecting(false)
        }
      }
      window.addEventListener('message', onMsg)
      // Fallback: if popup closes without postMessage
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          window.removeEventListener('message', onMsg)
          setGoogleConnecting(false)
          refreshGoogleStatus().catch(() => {})
        }
      }, 800)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to start Google login')
      setGoogleConnecting(false)
    }
  }

  const handleGooglePushLocal = async (email?: string) => {
    setGooglePushingEmail(email ?? '__all__')
    try {
      const res = await pushLocalEventsToGoogle(email)
      const pushed = res.data?.totalPushed ?? 0
      toast.success(`Pushed ${pushed} event${pushed === 1 ? '' : 's'} to Google Calendar`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to push events')
    } finally {
      setGooglePushingEmail(null)
    }
  }

  const handleGooglePullSync = async (email?: string) => {
    setGoogleSyncingEmail(email ?? '__all__')
    try {
      await triggerGoogleSync(email)
      toast.success('Google Calendar sync triggered')
      await refreshGoogleStatus()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Sync failed')
    } finally {
      setGoogleSyncingEmail(null)
    }
  }

  const handleGoogleDisconnect = async (email: string) => {
    if (!window.confirm(`Disconnect ${email} from Google Calendar sync?`)) return
    setGoogleDisconnectingEmail(email)
    try {
      await disconnectGoogleCalendar(email)
      toast.success(`Disconnected ${email}`)
      await refreshGoogleStatus()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Failed to disconnect account')
    } finally {
      setGoogleDisconnectingEmail(null)
    }
  }

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

  const existingCustomCategories = useMemo(() => {
    const standardLabels = new Set(CATEGORY_OPTIONS.map((opt) => opt.label))
    const custom = new Set<string>()
    
    try {
      const saved = localStorage.getItem('calendar_custom_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          parsed.forEach((cat) => {
            const trimmed = cat.trim()
            if (trimmed) custom.add(trimmed)
          })
        }
      }
    } catch (e) {
      console.error('Failed to load custom categories from localStorage', e)
    }

    items.forEach((item) => {
      if (item.category) {
        const trimmed = item.category.trim()
        if (trimmed && !standardLabels.has(trimmed)) {
          custom.add(trimmed)
        }
      }
    })

    return Array.from(custom)
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
    
    // 3. Next, use the loaded upcomingItems carousel
    const upcomingItem = upcomingItems[upcomingCardIndex] ?? null
    if (upcomingItem) {
      const todayStr2 = toISODate(new Date())
      const nowMin2 = new Date().getHours() * 60 + new Date().getMinutes()
      const isPast = upcomingItem.date < todayStr2 ||
        (upcomingItem.date === todayStr2 && upcomingItem.endTime && timeToMinutes(upcomingItem.endTime) <= nowMin2)
      const classification = getEventClassification(upcomingItem)
      let eyebrow = isPast ? 'Past activity' : 'Upcoming event'
      if (!isPast) {
        if (classification === 'MEETING') eyebrow = 'Upcoming meeting'
        else if (classification === 'DEADLINE' || classification === 'TASK') eyebrow = 'Upcoming task'
        else if (classification === 'MILESTONE') eyebrow = 'Upcoming milestone'
      }
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
  }, [items, upcomingItems, upcomingCardIndex])

  const threeDays = useMemo(() => getThreeDays(selectedDate), [selectedDate])
  
  const weekItemsByDay = useMemo(() => {
    return threeDays.map((d) => {
      const iso = toISODate(d)
      const dayItems = filteredItems.filter((item) => item.date === iso)
      return dayItems.sort(compareItems)
    })
  }, [threeDays, filteredItems])

  const currentItem = useMemo(() => findCurrentItem(selectedItems, selectedDate), [selectedDate, selectedItems])
  const selectedItem = useMemo(() => {
    if (selectedItemKey) {
      const explicit = filteredItems.find((item) => itemKey(item) === selectedItemKey)
      if (explicit) return explicit
    }
    if (currentItem && !currentItem.completed) return currentItem
    return selectedItems.find((item) => !item.completed) ?? selectedItems[0] ?? null
  }, [currentItem, selectedItemKey, selectedItems, filteredItems])

  const activeItem = useMemo(() => {
    if (selectedItemKey) {
      return filteredItems.find((item) => itemKey(item) === selectedItemKey) ?? null
    }
    return null
  }, [selectedItemKey, filteredItems])

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

  // Mutations apply optimistically: the local list updates instantly, the API
  // call runs in the background, and 'calendar-updated' triggers a single
  // guarded refetch for server truth. On failure the local change is reverted.
  const handleToggle = async (item: CalendarItem) => {
    if (!item.id) return
    const key = itemKey(item)
    const nextCompleted = !item.completed
    setItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, completed: nextCompleted } : it)))
    try {
      const isRecurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      await toggleCalendarItem(item.id, isRecurring ? item.date : undefined)
      toast.success(nextCompleted ? `Completed "${item.title}"` : `Reopened "${item.title}"`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      setItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, completed: item.completed } : it)))
      toast.error(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleToggleCancel = async (item: CalendarItem) => {
    if (!item.id) return
    const key = itemKey(item)
    const nextCancelled = !item.cancelled
    setItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, cancelled: nextCancelled } : it)))
    try {
      const isRecurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      await toggleCancelCalendarItem(item.id, isRecurring ? item.date : undefined)
      toast.success(nextCancelled ? `Cancelled "${item.title}"` : `Restored "${item.title}"`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      setItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, cancelled: item.cancelled } : it)))
      toast.error(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleDelete = async () => {
    const target = deleteTarget
    if (!target?.id) return
    const prevItems = items
    setItems((prev) => prev.filter((it) => it.id !== target.id))
    setDeleteTarget(null)
    setSelectedItemKey(null)
    setAnchorRect(null)
    try {
      await deleteCalendarItem(target.id)
      toast.success(`Deleted "${target.title}"`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      setItems(prevItems)
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }


  const handleDeleteRecurring = async (mode: 'ONLY_THIS' | 'ALL') => {
    const target = deleteTarget
    if (!target?.id) return
    const prevItems = items
    setItems((prev) =>
      prev.filter((it) => (mode === 'ONLY_THIS' ? !(it.id === target.id && it.date === target.date) : it.id !== target.id)),
    )
    setDeleteTarget(null)
    setSelectedItemKey(null)
    setAnchorRect(null)
    try {
      await deleteCalendarItem(target.id, mode === 'ONLY_THIS' ? target.date : undefined)
      toast.success(mode === 'ONLY_THIS' ? 'Occurrence deleted' : 'Recurring routine deleted')
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      setItems(prevItems)
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  const HOUR_TICKS = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const h = i
      const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
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
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={itemKey(item)}
                      className="month-event-capsule"
                      style={{ '--capsule-color': displayColorForItem(item), cursor: 'pointer' } as React.CSSProperties}
                      title={item.title}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setSelectedItemKey(itemKey(item))
                        setOverflowDay(null)
                        setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
                      }}
                    >
                      {item.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <button
                      type="button"
                      className="month-more-indicator"
                      onClick={(e) => {
                        e.stopPropagation()
                        const cell = e.currentTarget.closest('.month-day-cell')
                        const rect = (cell ?? e.currentTarget).getBoundingClientRect()
                        setSelectedItemKey(null)
                        setAnchorRect(null)
                        setOverflowDay({ date: iso, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } })
                      }}
                    >
                      +{dayItems.length - 3} more
                    </button>
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
          onClick={(e) => {
            e.stopPropagation()
            setSelectedItemKey(null)
            setAnchorRect(null)
          }}
        >
          {loading && !hasLoadedOnce ? (
            <CalendarSkeleton viewType={viewType} />
          ) : (
            <>
              {/* Navigation & view selection row */}
          <div className="stage-navigation-row">
            <div className="date-range-navigator">
              <button type="button" className="nav-arrow" onClick={() => handleStep(viewType === 'weekly' ? -3 : -1)}>
                <ChevronLeft size={16} />
              </button>
              <h2 className="range-title">
                {viewType === 'weekly' || viewType === 'daily'
                  ? formatSelectedDateHeader(selectedDate)
                  : parseISODate(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" className="nav-arrow" onClick={() => handleStep(viewType === 'weekly' ? 3 : 1)}>
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
                  {view === 'weekly' ? '3-Day' : view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <div className="stage-actions-group">
              <button
                type="button"
                className="create-event-btn"
                onClick={() => setModal({ open: true, date: selectedDate })}
              >
                <Plus size={14} />
                <span className="create-event-text-desktop">Create event</span>
                <span className="create-event-text-ipad">Add</span>
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
          <div className="stage-grid-canvas" ref={canvasContainerRef}>
            {viewType === 'monthly' ? (
              <MonthViewGrid />
            ) : (
              <div className={`calendar-grid-scrollable view-${viewType}`} ref={weeklyScrollContainerRef}>
                {/* Day Columns Header */}
                <div className="grid-header-days" style={{ gridTemplateColumns: `56px repeat(${viewType === 'weekly' ? 3 : 1}, minmax(0, 1fr))` }}>
                  <div className="grid-header-tz">
                    <span>{viewType === 'weekly' ? 'GMT+5:30' : 'Time'}</span>
                  </div>
                  {(viewType === 'weekly' ? threeDays : [parseISODate(selectedDate)]).map((d, dayIdx) => {
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
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setSelectedItemKey(itemKey(item))
                                    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
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
                                    boxShadow: isActive ? `0 0 0 2px #ffffff, 0 0 0 4px ${displayColorForItem(item)}` : 'none',
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

                  <div className="grid-columns-container" style={{ gridTemplateColumns: `56px repeat(${viewType === 'weekly' ? 3 : 1}, minmax(0, 1fr))` }}>
                    <div className="time-column-spacer" />
                    {(viewType === 'weekly' ? threeDays : [parseISODate(selectedDate)]).map((d, dayIdx) => {
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
                            return (
                              <button
                                type="button"
                                key={itemKey(item)}
                                className={`grid-event-card status-${status} ${isActive ? 'is-active' : ''} ${cardStyles.className}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setSelectedItemKey(itemKey(item))
                                  setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
                                }}
                                style={{
                                  position: 'absolute',
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  width: width,
                                  left: left,
                                  ...cardStyles.style,
                                  ...(isActive ? {
                                    boxShadow: `0 0 0 2px #ffffff, 0 0 0 4px ${displayColorForItem(item)}`,
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

            {/* Google Calendar Overlap Popover Card */}
            {activeItem && anchorRect && createPortal(
              <>
                <div className="popover-backdrop-mobile" onClick={() => {
                  setSelectedItemKey(null)
                  setAnchorRect(null)
                }} />
                <div
                  className="calendar-details-popover"
                  style={getPopoverStyle(anchorRect)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Banner Image header */}
                  <div 
                    className="popover-banner-header"
                    style={{
                      height: '140px',
                      backgroundImage: `url(${bannerForCategory(activeItem.category)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Top-Right Action overlay */}
                    <div className="popover-banner-actions">
                      <button 
                        type="button" 
                        className="popover-action-btn"
                        title="Edit"
                        onClick={() => {
                          setSelectedItemKey(null)
                          setAnchorRect(null)
                          setModal({ open: true, item: activeItem, date: activeItem.date })
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="popover-action-btn"
                        title="Delete"
                        onClick={() => {
                          setDeleteTarget(activeItem)
                          setSelectedItemKey(null)
                          setAnchorRect(null)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="popover-action-btn close-btn"
                        title="Close"
                        onClick={() => {
                          setSelectedItemKey(null)
                          setAnchorRect(null)
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Popover content body */}
                  <div className="popover-body-content">
                    <div className="popover-title-row">
                      <span
                        className="category-bullet"
                        style={{ backgroundColor: displayColorForItem(activeItem) }}
                      />
                      <div className="title-text-col">
                        <h4 className="popover-title">{activeItem.title}</h4>
                        <span className="popover-category-tag" style={{ color: displayColorForItem(activeItem) }}>
                          {activeItem.category || 'Personal'}
                        </span>
                      </div>
                    </div>

                    <div className="popover-detail-section">
                      <div className="popover-detail-row">
                        <Clock size={16} className="detail-icon" />
                        <div className="detail-text">
                          <span className="detail-date-range">
                            {formatSelectedDateHeader(activeItem.date)}
                          </span>
                          <span className="detail-time-range">
                            {activeItem.allDay || !activeItem.startTime ? 'All day' : `${activeItem.startTime} - ${activeItem.endTime || ''}`}
                          </span>
                        </div>
                      </div>

                      {activeItem.notes && (
                        <div className="popover-detail-row align-start">
                          <AlignLeft size={16} className="detail-icon mt-0.5" />
                          <span className="detail-text notes-text">{stripChecklist(activeItem.notes) || activeItem.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions footer */}
                  <div className="popover-footer-actions">
                    <span className="going-label">Complete task?</span>
                    <div className="going-options">
                      <button
                        type="button"
                        className={`going-btn ${activeItem.completed ? 'is-active' : ''}`}
                        onClick={() => {
                          if (!activeItem.completed) handleToggle(activeItem)
                        }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className={`going-btn ${!activeItem.completed ? 'is-active' : ''}`}
                        onClick={() => {
                          if (activeItem.completed) handleToggle(activeItem)
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )}

            {/* "+N more" day overflow popover (Google Calendar style) */}
            {overflowDay && createPortal(
              <>
                <div className="popover-backdrop-mobile" onClick={() => setOverflowDay(null)} />
                <div
                  className="month-overflow-popover"
                  style={getOverflowPopoverStyle(overflowDay.rect)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="overflow-popover-header">
                    <div className="overflow-popover-date">
                      <span className="overflow-day-name">
                        {parseISODate(overflowDay.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <strong className="overflow-day-number">{parseISODate(overflowDay.date).getDate()}</strong>
                    </div>
                    <button type="button" className="overflow-close-btn" aria-label="Close" onClick={() => setOverflowDay(null)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="overflow-popover-list">
                    {byDate(filteredItems, overflowDay.date).map((item) => (
                      <button
                        type="button"
                        key={itemKey(item)}
                        className={`overflow-event-row ${item.completed ? 'is-completed' : ''}`}
                        style={{ '--capsule-color': displayColorForItem(item) } as React.CSSProperties}
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setOverflowDay(null)
                          setSelectedItemKey(itemKey(item))
                          setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
                        }}
                      >
                        <span className="overflow-event-dot" />
                        <span className="overflow-event-title">{item.title}</span>
                        <span className="overflow-event-time">
                          {item.allDay || !item.startTime ? 'All day' : formatClockTime(item.startTime)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>,
              document.body
            )}
          </div>
          </>
        )}
        </div>
      </main>
    )
  }

  return (
    <section className="calendar-dashboard theme-glassmorphic" aria-label="Daily routine">
      <header className="calendar-header">
        <div>
          <span className="calendar-eyebrow">Routine & Schedule</span>
          <h1>Daily Routine</h1>
          <p>Plan your day, track tasks, and build consistent habits.</p>
        </div>
      </header>

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
              highlightedRange={viewType === 'weekly' ? threeDays.map((d) => toISODate(d)) : undefined}
            />
          </div>

          {/* Dynamic Upcoming/Live Card */}
          {sidebarUpcomingItem && (() => {
            const { item: sidebarItem, label: sidebarLabel } = sidebarUpcomingItem
            const categoryColor = displayColorForItem(sidebarItem)
            const showCarousel = upcomingItems.length > 1 && sidebarItem.id !== 'mock-meeting'

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
                  {showCarousel && (
                    <span className="upcoming-carousel-controls">
                      <button
                        type="button"
                        className="carousel-arrow"
                        onClick={(e) => { e.stopPropagation(); setUpcomingCardIndex(i => Math.max(0, i - 1)) }}
                        disabled={upcomingCardIndex === 0}
                        aria-label="Previous"
                      >‹</button>
                      <span className="carousel-index">{upcomingCardIndex + 1}/{upcomingItems.length}</span>
                      <button
                        type="button"
                        className="carousel-arrow"
                        onClick={(e) => { e.stopPropagation(); setUpcomingCardIndex(i => Math.min(upcomingItems.length - 1, i + 1)) }}
                        disabled={upcomingCardIndex === upcomingItems.length - 1}
                        aria-label="Next"
                      >›</button>
                    </span>
                  )}
                </div>
                <h3 className="reminder-title">{sidebarItem.title}</h3>
                <div className="reminder-time-row">
                  <Clock size={12} />
                  <span>
                    {(() => {
                      const todayStr = toISODate(new Date())
                      const isToday = sidebarItem.date === todayStr
                      const datePart = isToday 
                        ? '' 
                        : `${parseISODate(sidebarItem.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • `
                      
                      const timePart = sidebarItem.allDay || !sidebarItem.startTime
                        ? 'All day'
                        : `${formatClockTime(sidebarItem.startTime)} - ${formatClockTime(sidebarItem.endTime || '10:00')}`
                      
                      return `${datePart}${timePart}`
                    })()}
                  </span>
                </div>
                <div className="reminder-footer">
                  {sidebarItem.id === 'mock-meeting' && renderAvatarStack([
                    { name: 'John Doe', avatar: profileAvatar },
                    { name: 'Sarah Connor', avatar: getAvatarImage('avatar1') },
                    { name: 'Alex Mercer', avatar: getAvatarImage('avatar2') },
                    { name: 'Emma Watson', avatar: getAvatarImage('avatar3') },
                  ])}
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
            <div className="filter-header-row">
              <button
                type="button"
                className="filter-header-btn"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <span>Filters</span>
                <ChevronDown size={14} className={`accordion-chevron ${filtersOpen ? 'open' : ''}`} />
              </button>
              <div className="filter-menu-anchor">
                <button
                  type="button"
                  className="filter-three-dot"
                  onClick={(e) => { e.stopPropagation(); setFilterMenuOpen(!filterMenuOpen) }}
                  title="Filter options"
                >
                  <MoreHorizontal size={14} />
                </button>
                {filterMenuOpen && (
                  <>
                    <div className="filter-menu-backdrop" onClick={() => setFilterMenuOpen(false)} />
                    <div className="filter-menu-dropdown">
                      <button
                        type="button"
                        className="filter-menu-item"
                        onClick={() => {
                          setFiltersOpen(!filtersOpen)
                          setFilterMenuOpen(false)
                        }}
                      >
                        {filtersOpen ? 'Hide filters' : 'Show filters'}
                      </button>
                      <button
                        type="button"
                        className="filter-menu-item"
                        onClick={() => {
                          const draft: Record<string, string> = {}
                          actualCategories.forEach((cat) => { draft[cat] = colorForCategory(cat) })
                          setColorEditDraft(draft)
                          setColorEditModalOpen(true)
                          setFilterMenuOpen(false)
                        }}
                      >
                        <Palette size={11} />
                        Edit colors
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {filtersOpen && (
              <div className="filter-list">
                {actualCategories.map((cat) => {
                  const checked = !uncheckedCategories.includes(cat)
                  const color = colorForCategory(cat)
                  return (
                    <div key={cat} className="filter-checkbox-row">
                      <label className="filter-checkbox-item">
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Google Calendar Sync Card */}
          <div className="calendar-google-sync-card">
            <div className="google-sync-header">
              <span className="google-sync-dot" style={{ background: googleSyncStatus?.connected ? '#4caf50' : '#aaa' }} />
              <span className="google-sync-label">Google Calendar</span>
            </div>

            {(googleSyncStatus?.accounts ?? []).map((account: GoogleCalendarAccount) => {
              const isPulling = googleSyncingEmail === account.email
              const isPushing = googlePushingEmail === account.email
              const isDisconnecting = googleDisconnectingEmail === account.email
              return (
                <div key={account.email} className="google-account-row">
                  <div className="google-account-info">
                    <span className="google-account-email">{account.email}</span>
                    {account.lastSyncedAt && (
                      <span className="google-account-synced">
                        {new Date(account.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="google-sync-actions">
                    <button
                      type="button"
                      className="google-sync-btn"
                      disabled={isPulling || isPushing}
                      onClick={() => handleGooglePullSync(account.email)}
                      title="Pull latest events from this Google account"
                    >
                      {isPulling ? <Loader2 size={11} className="spin-icon" /> : '↓'} Pull
                    </button>
                    <button
                      type="button"
                      className="google-sync-btn google-sync-btn--push"
                      disabled={isPulling || isPushing}
                      onClick={() => handleGooglePushLocal(account.email)}
                      title="Push local-only events to this Google account"
                    >
                      {isPushing ? <Loader2 size={11} className="spin-icon" /> : '↑'} Push
                    </button>
                    <button
                      type="button"
                      className="google-sync-btn google-sync-btn--disconnect"
                      disabled={isDisconnecting}
                      onClick={() => handleGoogleDisconnect(account.email)}
                      title="Disconnect this Google account"
                    >
                      {isDisconnecting ? <Loader2 size={11} className="spin-icon" /> : '×'}
                    </button>
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              className="google-connect-btn"
              disabled={googleConnecting}
              onClick={handleGoogleConnect}
            >
              {googleConnecting ? <Loader2 size={11} className="spin-icon" /> : '+'}
              {googleConnecting ? ' Connecting…' : (googleSyncStatus?.connected ? ' Add account' : ' Connect Google')}
            </button>
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


      {modal.open && createPortal(
        <CalendarItemModal
          date={modal.date}
          item={modal.item}
          existingCustomCategories={existingCustomCategories}
          onClose={() => setModal({ open: false })}
          onSaved={() => {
            setModal({ open: false })
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

      {/* Color Edit Modal */}
      {colorEditModalOpen && createPortal(
        <div className="calendar-modal-backdrop" onClick={() => setColorEditModalOpen(false)}>
          <div className="color-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="color-edit-modal-header">
              <Palette size={15} />
              <span>Edit category colors</span>
              <button type="button" className="color-edit-close" onClick={() => setColorEditModalOpen(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="color-edit-list">
              {actualCategories.map((cat) => (
                <div key={cat} className="color-edit-row">
                  <span
                    className="color-edit-dot"
                    style={{ background: colorEditDraft[cat] ?? colorForCategory(cat) }}
                  />
                  <span className="color-edit-label">{cat}</span>
                  <label
                    className="color-edit-swatch"
                    style={{ background: colorEditDraft[cat] ?? colorForCategory(cat) }}
                    title={`Pick color for ${cat}`}
                  >
                    <input
                      type="color"
                      value={colorEditDraft[cat] ?? colorForCategory(cat)}
                      onChange={(e) => {
                        setColorEditDraft((prev) => ({ ...prev, [cat]: e.target.value }))
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="color-edit-footer">
              <button
                type="button"
                className="color-edit-reset"
                onClick={() => {
                  actualCategories.forEach((cat) => {
                    // Remove custom override so defaults are restored
                    const normalized = cat.trim().toLowerCase()
                    delete _customCategoryColors[normalized]
                  })
                  // eslint-disable-next-line no-empty
                  try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(_customCategoryColors)) } catch {}
                  const fresh: Record<string, string> = {}
                  actualCategories.forEach((cat) => { fresh[cat] = colorForCategory(cat) })
                  setColorEditDraft(fresh)
                  setUncheckedCategories([...uncheckedCategories])
                }}
              >
                Reset all
              </button>
              <button
                type="button"
                className="color-edit-apply"
                onClick={() => {
                  Object.entries(colorEditDraft).forEach(([cat, color]) => {
                    setCustomCategoryColor(cat, color)
                  })
                  setColorEditModalOpen(false)
                  setUncheckedCategories([...uncheckedCategories])
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
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

function CalendarItemModal({
  date,
  item,
  existingCustomCategories = [],
  onClose,
  onSaved,
}: {
  date: string
  item?: CalendarItem
  existingCustomCategories?: string[]
  onClose: () => void
  onSaved: () => void
}) {
  useEffect(() => {
    document.body.classList.add('calendar-modal-open')
    return () => document.body.classList.remove('calendar-modal-open')
  }, [])

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
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const unique = new Set(existingCustomCategories)
    if (item?.category) {
      const standardLabels = new Set(CATEGORY_OPTIONS.map((opt) => opt.label))
      const trimmed = item.category.trim()
      if (trimmed && !standardLabels.has(trimmed)) {
        unique.add(trimmed)
      }
    }
    try {
      const saved = localStorage.getItem('calendar_custom_categories')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => unique.add(c.trim()))
        }
      }
    } catch {
      // ignore
    }
    return Array.from(unique)
  })

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
    // eslint-disable-next-line no-useless-assignment
    let nextList = customCategories
    if (!customCategories.includes(trimmed)) {
      nextList = [...customCategories, trimmed]
      setCustomCategories(nextList)
      try {
        localStorage.setItem('calendar_custom_categories', JSON.stringify(nextList))
      } catch (e) {
        console.error('Failed to save custom category to localStorage', e)
      }
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
                  placeholder="Add context to your event"
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



function stripChecklist(notes?: string) {
  if (!notes) return ''
  return notes
    .split('\n')
    .filter((line) => !/^[-*]\s+\[[ xX]\]\s+/.test(line.trim()))
    .join(' ')
    .trim()
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

const CUSTOM_COLORS_KEY = 'calendar_category_custom_colors'

let _customCategoryColors: Record<string, string> = (() => {
  try {
    const saved = localStorage.getItem(CUSTOM_COLORS_KEY)
    if (saved) return JSON.parse(saved)
  // eslint-disable-next-line no-empty
  } catch {}
  return {}
})()

function setCustomCategoryColor(category: string, color: string) {
  _customCategoryColors = { ..._customCategoryColors, [category.toLowerCase()]: color }
  // eslint-disable-next-line no-empty
  try { localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(_customCategoryColors)) } catch {}
}

function colorForCategory(category: string) {
  const normalized = (category || '').trim().toLowerCase()
  if (_customCategoryColors[normalized]) return _customCategoryColors[normalized]
  const match = CATEGORY_OPTIONS.find((option) => option.label.toLowerCase() === normalized)
  if (match) return match.color
  const h = hueForCategory(category)
  return `hsl(${h}, 55%, 42%)`
}








function calculateTimeStyles(item: CalendarItem) {
  if (item.allDay || !item.startTime) {
    return { top: 0, height: 50, isAllDay: true }
  }
  
  const startMin = timeToMinutes(item.startTime)
  const endMin = item.endTime ? timeToMinutes(item.endTime) : startMin + 60
  
  const gridStartMin = 0 * 60
  const gridEndMin = 24 * 60
  
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
