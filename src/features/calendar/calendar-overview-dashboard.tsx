// /calendar — a personal calendar in the Apple / Google / Notion Calendar mould:
// a sidebar (quick add, month, up next, calendars, Google sync) beside one
// stage that draws Day, Work week, Week, Month or Agenda. Server state lives in
// calendar-store; everything here is view state plus the mutations, which run
// optimistically and broadcast 'calendar-updated' for a guarded refetch.
// The pure maths is in calendar-dates.ts / calendar-layout.ts; each view and
// sidebar block is its own component under components/.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

import type { AppPath } from '@/app/routes'
import type { CalendarItem, CalendarItemPayload } from '@/types/calendar'
import { calendarService } from '@/services/calendar-service'
import { useCalendarStore } from '@/store/calendar-store'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { clearCustomItemColor, resetCustomCategoryColors, setCustomCategoryColor } from './calendar-colors'
import {
  AGENDA_DAYS,
  VIEWS,
  addDaysIso,
  fetchRange,
  gridDays,
  parseISODate,
  rangeHeading,
  relativeDay,
  stepDate,
  toISODate,
  viewDates,
  type CalendarView,
} from './calendar-dates'
import { compareItems, isTimed, itemKey, itemSpan, minutesByCategory } from './calendar-layout'
import { DAY_MINUTES, formatDuration, formatMinuteRange, minutesToTime, timeToMinutes } from './calendar-time'
import { useGridDrag, type GridDrag } from './use-grid-drag'
import { AgendaView } from './components/agenda-view'
import { CalendarItemModal, type CalendarDraft } from './components/calendar-item-modal'
import { CalendarList } from './components/calendar-list'
import { CalendarToolbar } from './components/calendar-toolbar'
import { ColorEditDialog, DeleteSeriesDialog, ShortcutsDialog } from './components/calendar-dialogs'
import { DayOverflow, EventPopover, type AnchorRect } from './components/event-popover'
import { GoogleSync } from './components/google-sync'
import { MiniMonth } from './components/mini-month'
import { MonthView } from './components/month-view'
import { QuickAdd } from './components/quick-add'
import { TimeGrid } from './components/time-grid'
import { UpNext } from './components/up-next'
import { WeekPulse } from './components/week-pulse'

import './calendar-overview.css'

type CalendarOverviewDashboardProps = {
  searchParams: URLSearchParams
  onNavigate: (pathname: AppPath, search?: string) => void
}

type ModalState =
  | { open: false }
  | { open: true; date: string; item?: CalendarItem; draft?: CalendarDraft; seed?: Partial<CalendarItem>; text?: string }

const BASE_CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Finance', 'Social']
const PHONE_QUERY = '(max-width: 768px)'
const VIEW_KEY = 'calendarView'
const SIDEBAR_KEY = 'calendarSidebar'
const HIDDEN_KEY = 'calendarHiddenCategories'

function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked — the choice still holds for this visit
  }
}

function isPhone() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
}

function usePhone() {
  const [phone, setPhone] = useState(isPhone)
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return phone
}

function initialView(): CalendarView {
  const stored = readStorage(VIEW_KEY) as CalendarView | null
  const meta = VIEWS.find((v) => v.id === stored)
  if (isPhone()) return meta?.mobile ? meta.id : 'day'
  return meta?.id ?? 'week'
}

function rectOf(el: Element): AnchorRect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function typingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
}

function CalendarOverviewDashboard({ searchParams, onNavigate }: CalendarOverviewDashboardProps) {
  // ── Clock ── minute resolution drives the now-line, live blocks and Up next.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const todayIso = toISODate(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // ── View state ──
  const paramDate = searchParams.get('date')
  const [selectedDate, setSelectedDate] = useState(() => paramDate ?? toISODate(new Date()))
  const [seenParam, setSeenParam] = useState(paramDate)
  if (paramDate !== seenParam) {
    setSeenParam(paramDate)
    if (paramDate && paramDate !== selectedDate) setSelectedDate(paramDate)
  }
  const [view, setViewState] = useState<CalendarView>(initialView)
  const phone = usePhone()
  // Week doesn't fit a phone; a remembered Week or Work week opens as Day there.
  const effectiveView: CalendarView = phone && (view === 'week' || view === 'workweek') ? 'day' : view
  const [sidebarOpen, setSidebarOpen] = useState(() => readStorage(SIDEBAR_KEY) === 'open')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [hidden, setHidden] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(readStorage(HIDDEN_KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : []
    } catch {
      return []
    }
  })
  const [, setColorVersion] = useState(0)

  const [pop, setPop] = useState<{ item: CalendarItem; rect: AnchorRect | null } | null>(null)
  const [overflow, setOverflow] = useState<{ iso: string; rect: AnchorRect } | null>(null)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null)
  const [colorsOpen, setColorsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null)
  const [pendingFocus, setPendingFocus] = useState<CalendarItem | null>(null)

  const [googlePulling, setGooglePulling] = useState<string | null>(null)
  const [googlePushing, setGooglePushing] = useState<string | null>(null)
  const [googleDisconnecting, setGoogleDisconnecting] = useState<string | null>(null)
  const [googleConnecting, setGoogleConnecting] = useState(false)

  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const quickRef = useRef<HTMLInputElement | null>(null)

  // ── Server state ──
  const itemsState = useCalendarStore.use.items()
  const googleState = useCalendarStore.use.googleStatus()
  const upcoming = useCalendarStore.use.upcoming()
  const calendarActions = useCalendarStore.use.actions()
  const items = itemsState.data
  const firstLoad = itemsState.loading && !itemsState.loaded && !itemsState.hasErrors
  const loadFailed = itemsState.hasErrors && !itemsState.loaded

  const range = useMemo(() => fetchRange(effectiveView, selectedDate), [effectiveView, selectedDate])

  const loadItems = useCallback(async () => {
    const res = await calendarActions.loadItems(range.start, range.end)
    if (res?.error) toast.error(res.error.message || 'Couldn’t load the calendar')
  }, [calendarActions, range.start, range.end])

  // Up next reads its own window (today → a week out) so it stays right
  // whichever month the main view has wandered to.
  const loadUpcoming = useCallback(async () => {
    const start = toISODate(new Date())
    const res = await calendarService.getItemsForRange(start, addDaysIso(start, 7))
    if (!res.error) calendarActions.setUpcoming(res.data ?? [])
  }, [calendarActions])

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 0)
    return () => window.clearTimeout(timer)
  }, [loadItems])

  useEffect(() => {
    const timer = window.setTimeout(loadUpcoming, 0)
    return () => window.clearTimeout(timer)
  }, [loadUpcoming, todayIso])

  useEffect(() => {
    const onUpdate = () => {
      void loadItems()
      void loadUpcoming()
    }
    window.addEventListener('calendar-updated', onUpdate)
    return () => window.removeEventListener('calendar-updated', onUpdate)
  }, [loadItems, loadUpcoming])

  useEffect(() => {
    void calendarActions.loadGoogleStatus()
  }, [calendarActions])

  // ── Derived ── (plain per-render work: a few hundred items at most)
  const categories = [...new Set([...BASE_CATEGORIES, ...items.map((item) => item.category?.trim() ?? '').filter(Boolean)])]
  const isShown = (item: CalendarItem) => !hidden.includes(item.category?.trim() || 'Personal')
  const visibleItems = items.filter(isShown)
  const itemsByDay = new Map<string, CalendarItem[]>()
  for (const item of visibleItems) {
    const list = itemsByDay.get(item.date)
    if (list) list.push(item)
    else itemsByDay.set(item.date, [item])
  }
  for (const list of itemsByDay.values()) list.sort(compareItems)

  const dates = useMemo(() => viewDates(effectiveView, selectedDate), [effectiveView, selectedDate])
  const days = useMemo(() => gridDays(effectiveView, selectedDate), [effectiveView, selectedDate])
  const showsToday = effectiveView === 'month' ? selectedDate.slice(0, 7) === todayIso.slice(0, 7) : dates.includes(todayIso)

  const inRange = new Set(dates)
  const categoryMinutes = minutesByCategory(items.filter((item) => inRange.has(item.date)))

  const rangeLabel =
    effectiveView === 'week'
      ? showsToday
        ? 'This week'
        : 'That week'
      : effectiveView === 'day'
        ? relativeDay(selectedDate, todayIso)
        : effectiveView === 'workweek'
          ? showsToday
            ? 'This work week'
            : 'Work week'
          : effectiveView === 'month'
            ? parseISODate(selectedDate).toLocaleDateString('en-US', { month: 'long' })
            : 'Next 3 weeks'

  let heading = rangeHeading(effectiveView, selectedDate)
  if (effectiveView === 'month') {
    const monthItems = visibleItems.filter((item) => inRange.has(item.date) && !item.cancelled)
    const minutes = [...minutesByCategory(monthItems).values()].reduce((a, b) => a + b, 0)
    heading = { ...heading, eyebrow: `${monthItems.length} ${monthItems.length === 1 ? 'block' : 'blocks'}${minutes ? ` · ${formatDuration(minutes)}` : ''}` }
  }

  // The open card follows the item through refetches and optimistic edits.
  const popKey = pop ? itemKey(pop.item) : null
  const popItem = pop ? (items.find((it) => itemKey(it) === popKey) ?? upcoming.find((it) => itemKey(it) === popKey) ?? pop.item) : null
  const activeKey = popItem ? itemKey(popItem) : null

  // ── Navigation ──
  const goTo = useCallback(
    (date: string) => {
      setSelectedDate(date)
      setPop(null)
      setOverflow(null)
      onNavigate('/calendar', `?date=${date}`)
    },
    [onNavigate, setSelectedDate, setPop, setOverflow],
  )

  const setView = useCallback((next: CalendarView) => {
    setViewState(next)
    writeStorage(VIEW_KEY, next)
    setPop(null)
    setOverflow(null)
  }, [setViewState, setPop, setOverflow])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      writeStorage(SIDEBAR_KEY, open ? 'closed' : 'open')
      return !open
    })
  }, [setSidebarOpen])

  const updateHidden = (next: string[]) => {
    setHidden(next)
    writeStorage(HIDDEN_KEY, JSON.stringify(next))
  }

  const openItem = useCallback((item: CalendarItem, e: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
    e.stopPropagation()
    setOverflow(null)
    setPop({ item, rect: rectOf(e.currentTarget) })
  }, [setOverflow, setPop])

  const openComposer = useCallback((state: Omit<Extract<ModalState, { open: true }>, 'open'>) => {
    setPop(null)
    setOverflow(null)
    setModal({ open: true, ...state })
  }, [setPop, setOverflow, setModal])

  // A search pick (or anything else) can ask for an item's card once the view has drawn it.
  useEffect(() => {
    if (!pendingFocus) return
    const timer = window.setTimeout(() => {
      const id = pendingFocus.occurrenceId ?? pendingFocus.id
      const el = id ? document.querySelector(`.calendar-dashboard [data-ev-key="${CSS.escape(id)}"]`) : null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        window.setTimeout(() => setPop({ item: pendingFocus, rect: rectOf(el) }), 260)
      } else {
        setPop({ item: pendingFocus, rect: null })
      }
      setPendingFocus(null)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [pendingFocus])

  // Land the time grid on something useful when the visible days change: now
  // when today is in view, otherwise just before the first block (or 8 AM).
  const firstStart = Math.min(8 * 60, ...days.flatMap((d) => (itemsByDay.get(toISODate(d)) ?? []).filter(isTimed).map((it) => itemSpan(it).start)))
  const scrolledFor = useRef('')
  useEffect(() => {
    if (effectiveView === 'month' || effectiveView === 'agenda' || firstLoad) return
    const key = `${effectiveView}:${toISODate(days[0])}`
    if (scrolledFor.current === key) return
    const el = gridScrollRef.current
    const body = el?.querySelector<HTMLElement>('.cv-grid-body')
    if (!el || !body) return
    scrolledFor.current = key
    const isos = days.map(toISODate)
    let minute: number
    let center = false
    if (isos.includes(todayIso)) {
      minute = nowMinutes
      center = true
    } else {
      minute = Math.max(0, firstStart - 30)
    }
    const head = el.querySelector<HTMLElement>('.cv-grid-head')?.offsetHeight ?? 0
    const y = body.offsetTop + (minute / DAY_MINUTES) * body.offsetHeight
    el.scrollTo({ top: Math.max(0, center ? y - head - (el.clientHeight - head) / 2.4 : y - head), behavior: 'smooth' })
  }, [effectiveView, days, firstLoad, firstStart, todayIso, nowMinutes])

  // ── Mutations ──
  const rescheduleItem = async (item: CalendarItem, date: string, startTime: string, endTime: string, undoable = true) => {
    if (!item.id) return
    const id = item.id
    const payload: CalendarItemPayload = {
      title: item.title,
      date,
      itemType: item.itemType,
      category: item.category,
      color: item.color,
      allDay: false,
      startTime,
      endTime,
      notes: item.notes,
      completed: item.completed,
      cancelled: item.cancelled,
      recurrenceFrequency: item.recurrenceFrequency ?? 'NONE',
      recurrenceUntil: item.recurrenceUntil,
    }
    calendarActions.applyItems((prev) => prev.map((it) => (it.id === id ? { ...it, date, startTime, endTime, allDay: false } : it)))
    try {
      const res = await calendarService.updateItem(id, payload)
      if (res.error) throw new Error(res.error.message)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
      if (!undoable) return
      const range = formatMinuteRange(timeToMinutes(startTime), timeToMinutes(endTime))
      toast.success(
        (t) => (
          <span className="cv-toast">
            <span>
              <b>{item.title}</b> · {date === item.date ? '' : `${relativeDay(date, toISODate(new Date()))} · `}
              {range}
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id)
                const origStart = item.startTime ?? startTime
                const origEnd = item.endTime ?? minutesToTime(Math.min(DAY_MINUTES - 1, timeToMinutes(origStart) + 60))
                void rescheduleItem({ ...item, date, startTime, endTime }, item.date, origStart, origEnd, false)
              }}
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000 },
      )
    } catch (error) {
      calendarActions.applyItems((prev) => prev.map((it) => (it.id === id ? item : it)))
      toast.error(getErrorMessage(error, 'Couldn’t move that block'))
    }
  }

  const toggleDone = async (item: CalendarItem) => {
    if (!item.id) return
    const key = itemKey(item)
    const next = !item.completed
    const patch = (value: boolean) => (prev: CalendarItem[]) => prev.map((it) => (itemKey(it) === key ? { ...it, completed: value } : it))
    calendarActions.applyItems(patch(next))
    calendarActions.setUpcoming(patch(next)(upcoming))
    try {
      const res = await calendarService.toggleItem(item.id, item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE' ? item.date : undefined)
      if (res.error) throw new Error(res.error.message)
      toast.success(next ? `Done — “${item.title}”` : `Reopened “${item.title}”`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      calendarActions.applyItems(patch(Boolean(item.completed)))
      toast.error(getErrorMessage(error, 'Couldn’t update that block'))
    }
  }

  const toggleCancel = async (item: CalendarItem) => {
    if (!item.id) return
    const key = itemKey(item)
    const next = !item.cancelled
    calendarActions.applyItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, cancelled: next } : it)))
    try {
      const recurring = item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE'
      const res = await calendarService.toggleCancelItem(item.id, recurring ? item.date : undefined)
      if (res.error) throw new Error(res.error.message)
      toast.success(next ? (recurring ? `Skipped “${item.title}” this time` : `Cancelled “${item.title}”`) : `Restored “${item.title}”`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      calendarActions.applyItems((prev) => prev.map((it) => (itemKey(it) === key ? { ...it, cancelled: item.cancelled } : it)))
      toast.error(getErrorMessage(error, 'Couldn’t update that block'))
    }
  }

  const deleteItem = async (target: CalendarItem, mode: 'ONE' | 'ONLY_THIS' | 'ALL') => {
    if (!target.id) return
    const prevItems = items.slice()
    calendarActions.applyItems((prev) =>
      prev.filter((it) => (mode === 'ONLY_THIS' ? !(it.id === target.id && it.date === target.date) : it.id !== target.id)),
    )
    setDeleteTarget(null)
    setPop(null)
    try {
      const res = await calendarService.deleteItem(target.id, mode === 'ONLY_THIS' ? target.date : undefined)
      if (res.error) throw new Error(res.error.message)
      if (mode !== 'ONLY_THIS') clearCustomItemColor(target.id)
      toast.success(mode === 'ONLY_THIS' ? 'Removed this occurrence' : mode === 'ALL' ? 'Deleted the series' : `Deleted “${target.title}”`)
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (error) {
      calendarActions.applyItems(() => prevItems)
      toast.error(getErrorMessage(error, 'Couldn’t delete that block'))
    }
  }

  const quickCreate = async (payload: CalendarItemPayload) => {
    const res = await calendarService.createItem(payload)
    if (res.error || !res.data) {
      toast.error(res.error?.message || 'Couldn’t add that')
      return false
    }
    const created = res.data
    window.dispatchEvent(new CustomEvent('calendar-updated'))
    const when = payload.allDay
      ? relativeDay(payload.date, todayIso)
      : `${relativeDay(payload.date, todayIso)} · ${formatMinuteRange(timeToMinutes(payload.startTime!), timeToMinutes(payload.endTime!))}`
    const visible = dates.includes(payload.date)
    toast.success(
      (t) => (
        <span className="cv-toast">
          <span>
            Added <b>{payload.title}</b> · {when}
          </span>
          {!visible && (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id)
                goTo(payload.date)
              }}
            >
              Show
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id)
              if (!created.id) return
              const del = await calendarService.deleteItem(created.id)
              if (del.error) toast.error('Couldn’t undo that')
              else window.dispatchEvent(new CustomEvent('calendar-updated'))
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 6000 },
    )
    return true
  }

  // ── Google ──
  const refreshGoogle = () => calendarActions.loadGoogleStatus()

  const connectGoogle = async () => {
    setGoogleConnecting(true)
    try {
      const res = await calendarService.getGoogleAuthUrl()
      if (res.error) throw new Error(res.error.message)
      const url = res.data?.url
      if (!url) throw new Error('No sign-in link came back')
      const popup = window.open(url, 'google-oauth', 'width=600,height=700,left=200,top=100')
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
          window.removeEventListener('message', onMsg)
          void refreshGoogle()
          toast.success(`Connected ${e.data.email}`)
          setGoogleConnecting(false)
        }
      }
      window.addEventListener('message', onMsg)
      const timer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(timer)
          window.removeEventListener('message', onMsg)
          setGoogleConnecting(false)
          void refreshGoogle()
        }
      }, 800)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Couldn’t start Google sign-in'))
      setGoogleConnecting(false)
    }
  }

  const pullGoogle = async (email: string) => {
    setGooglePulling(email)
    try {
      const res = await calendarService.syncGoogle(email)
      if (res.error) throw new Error(res.error.message)
      toast.success('Pulling the latest from Google')
      await refreshGoogle()
      window.dispatchEvent(new CustomEvent('calendar-updated'))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Sync failed'))
    } finally {
      setGooglePulling(null)
    }
  }

  const pushGoogle = async (email: string) => {
    setGooglePushing(email)
    try {
      const res = await calendarService.pushLocalToGoogle(email)
      if (res.error) throw new Error(res.error.message)
      const pushed = res.data?.totalPushed ?? 0
      toast.success(pushed ? `Pushed ${pushed} block${pushed === 1 ? '' : 's'} to Google` : 'Google already has everything')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Couldn’t push to Google'))
    } finally {
      setGooglePushing(null)
    }
  }

  const disconnectGoogle = async (email: string) => {
    setDisconnectTarget(null)
    setGoogleDisconnecting(email)
    try {
      const res = await calendarService.disconnectGoogle(email)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Disconnected ${email}`)
      await refreshGoogle()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Couldn’t disconnect that account'))
    } finally {
      setGoogleDisconnecting(null)
    }
  }

  // ── Grid drag ──
  const grid = useGridDrag({
    scrollRef: gridScrollRef,
    canCreate: () => !pop && !overflow && !modal.open,
    onCreate: (date, start, end) => openComposer({ date, draft: { startTime: minutesToTime(start), endTime: minutesToTime(end) } }),
    onCommit: (item, date, start, end) => void rescheduleItem(item, date, minutesToTime(start), minutesToTime(end)),
  })

  const pendingDraft: GridDrag | null =
    modal.open && !modal.item && modal.draft
      ? { kind: 'create', date: modal.date, start: timeToMinutes(modal.draft.startTime), end: timeToMinutes(modal.draft.endTime) }
      : null

  // ── Global listeners ──
  useEffect(() => {
    const handler = () => setModal((m) => (m.open ? m : { open: true, date: selectedDate }))
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [selectedDate])

  useEffect(() => {
    if (!deleteTarget) return
    document.body.classList.add('calendar-modal-open')
    return () => document.body.classList.remove('calendar-modal-open')
  }, [deleteTarget])

  // Keyboard (Google / Notion Calendar keys). Never while typing, and never
  // while a modal or a drag owns the keyboard.
  const shortcut = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    shortcut.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typingTarget(e.target)) return
      if (modal.open || deleteTarget || colorsOpen || shortcutsOpen || disconnectTarget) return
      if (document.body.classList.contains('calendar-grid-dragging')) return
      const key = e.key.toLowerCase()
      const views: Record<string, CalendarView> = { d: 'day', x: 'workweek', w: 'week', m: 'month', a: 'agenda', '1': 'day', '2': 'workweek', '3': 'week', '4': 'month', '5': 'agenda' }
      if (views[key]) setView(views[key])
      else if (key === 't') goTo(toISODate(new Date()))
      else if (key === 'arrowleft' || key === 'j') goTo(stepDate(effectiveView, selectedDate, -1))
      else if (key === 'arrowright' || key === 'k') goTo(stepDate(effectiveView, selectedDate, 1))
      else if (key === 'n' || key === 'c') openComposer({ date: selectedDate })
      else if (key === '/') setSearchOpen(true)
      else if (key === '[') toggleSidebar()
      else if (key === '?') setShortcutsOpen(true)
      else if (key === 'q') {
        if (!sidebarOpen) toggleSidebar()
        window.setTimeout(() => quickRef.current?.focus(), 0)
      } else if (key === 'e' && popItem) openComposer({ item: popItem, date: popItem.date })
      else if ((key === 'backspace' || key === 'delete') && popItem) {
        setDeleteTarget(popItem)
        setPop(null)
      }
      else return
      e.preventDefault()
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => shortcut.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Render ──
  const hourPx = effectiveView === 'day' ? (phone ? 56 : 60) : phone ? 52 : 48
  const timeGridView = effectiveView === 'day' || effectiveView === 'workweek' || effectiveView === 'week'

  const stage = firstLoad ? (
    <div className="cv-skeleton" aria-busy="true" aria-label="Loading calendar">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} style={{ top: `${12 + i * 13}%`, left: `${14 + ((i * 17) % 60)}%`, height: `${7 + (i % 3) * 4}%` }} />
      ))}
    </div>
  ) : loadFailed && items.length === 0 ? (
    <div className="cv-empty">
      <strong>The calendar didn’t load</strong>
      <span>{getErrorMessage(itemsState.error, 'The server didn’t answer.')}</span>
      <button type="button" className="cv-btn is-ghost" onClick={() => void loadItems()}>
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  ) : timeGridView ? (
    <div className="cv-dayview">
      <TimeGrid
        days={days}
        itemsByDay={itemsByDay}
        todayIso={todayIso}
        nowMinutes={nowMinutes}
        hourPx={hourPx}
        activeKey={activeKey}
        query={query}
        scrollRef={gridScrollRef}
        grid={grid}
        pendingDraft={pendingDraft}
        interactive={!pop && !overflow && !modal.open}
        showDayLoad={effectiveView === 'day'}
        onOpen={openItem}
        onToggleDone={toggleDone}
        onPickDay={(iso) => {
          if (effectiveView === 'day') return
          goTo(iso)
          setView('day')
        }}
        onCreateAllDay={(iso) => openComposer({ date: iso, seed: { date: iso, allDay: true } })}
      />
    </div>
  ) : effectiveView === 'month' ? (
    <MonthView
      selected={selectedDate}
      itemsByDay={itemsByDay}
      todayIso={todayIso}
      nowMinutes={nowMinutes}
      activeKey={activeKey}
      query={query}
      onOpen={openItem}
      onToggleDone={toggleDone}
      onOverflow={(iso, cell) => {
        setPop(null)
        setOverflow({ iso, rect: rectOf(cell) })
      }}
      onPickDay={(iso) => {
        goTo(iso)
        setView('day')
      }}
      onCreate={(iso) => openComposer({ date: iso })}
    />
  ) : (
    <AgendaView
      start={selectedDate}
      days={AGENDA_DAYS}
      itemsByDay={itemsByDay}
      todayIso={todayIso}
      nowMinutes={nowMinutes}
      activeKey={activeKey}
      query={query}
      onOpen={openItem}
      onToggleDone={toggleDone}
      onCreate={(iso) => openComposer({ date: iso })}
      onPickDay={(iso) => {
        goTo(iso)
        setView('day')
      }}
    />
  )

  return (
    <section className="calendar-dashboard" aria-label="Calendar">
      <div className={cn('cv-shell', !sidebarOpen && 'is-side-closed', `is-view-${effectiveView}`)}>
        <aside className="cv-side route-scroll" aria-label="Calendar sidebar" hidden={!sidebarOpen && !phone}>
          <QuickAdd
            inputRef={quickRef}
            defaultDate={selectedDate < todayIso ? todayIso : selectedDate}
            todayIso={todayIso}
            onCreate={quickCreate}
            onExpand={(text) => openComposer({ date: selectedDate < todayIso ? todayIso : selectedDate, text })}
          />
          <UpNext
            items={upcoming.filter(isShown)}
            todayIso={todayIso}
            nowMinutes={nowMinutes}
            onOpen={openItem}
            onToggleDone={toggleDone}
            onPlan={() => quickRef.current?.focus()}
          />
          {!phone && <MiniMonth selected={selectedDate} todayIso={todayIso} inView={effectiveView === 'month' ? [] : dates} itemsByDay={itemsByDay} onSelect={goTo} />}
          <CalendarList
            categories={categories}
            unchecked={hidden}
            minutes={categoryMinutes}
            rangeLabel={rangeLabel}
            onToggle={(c) => updateHidden(hidden.includes(c) ? hidden.filter((h) => h !== c) : [...hidden, c])}
            onOnly={(c) => updateHidden(categories.filter((x) => x !== c))}
            onShowAll={() => updateHidden([])}
            onEditColors={() => setColorsOpen(true)}
          />
          {!phone && <WeekPulse selected={selectedDate} todayIso={todayIso} itemsByDay={itemsByDay} onPick={goTo} />}
          <div className="cv-side-foot">
            <GoogleSync
              status={googleState.data}
              pulling={googlePulling}
              pushing={googlePushing}
              disconnecting={googleDisconnecting}
              connecting={googleConnecting}
              onConnect={connectGoogle}
              onPull={pullGoogle}
              onPush={pushGoogle}
              onDisconnect={setDisconnectTarget}
            />
          </div>
        </aside>

        <main className="cv-main">
          <CalendarToolbar
            view={effectiveView}
            heading={heading}
            showsToday={showsToday}
            sidebarOpen={sidebarOpen}
            query={query}
            searchOpen={searchOpen}
            searchRef={searchRef}
            items={items}
            todayIso={todayIso}
            onView={setView}
            onStep={(dir) => goTo(stepDate(effectiveView, selectedDate, dir))}
            onToday={() => goTo(toISODate(new Date()))}
            onToggleSidebar={toggleSidebar}
            onQuery={setQuery}
            onSearchOpen={setSearchOpen}
            onPickResult={(item) => {
              setQuery('')
              setSearchOpen(false)
              if (hidden.includes(item.category?.trim() || 'Personal')) updateHidden(hidden.filter((h) => h !== (item.category?.trim() || 'Personal')))
              goTo(item.date)
              setPendingFocus(item)
            }}
            onAdd={() => openComposer({ date: selectedDate })}
          />
          <div className="cv-stage">{stage}</div>
        </main>
      </div>

      {popItem && (
        <EventPopover
          key={itemKey(popItem)}
          item={popItem}
          anchor={pop?.rect ?? null}
          onClose={() => setPop(null)}
          onEdit={() => openComposer({ item: popItem, date: popItem.date })}
          onDuplicate={() => openComposer({ date: popItem.date, seed: popItem })}
          onDelete={() => {
            setDeleteTarget(popItem)
            setPop(null)
          }}
          onToggleDone={() => void toggleDone(popItem)}
          onToggleCancel={() => void toggleCancel(popItem)}
        />
      )}

      {overflow && (
        <DayOverflow
          iso={overflow.iso}
          items={itemsByDay.get(overflow.iso) ?? []}
          anchor={overflow.rect}
          onClose={() => setOverflow(null)}
          onOpen={(item, rect) => {
            setOverflow(null)
            setPop({ item, rect })
          }}
        />
      )}

      {modal.open &&
        createPortal(
          <CalendarItemModal
            key={modal.item ? itemKey(modal.item) : `new-${modal.date}-${modal.draft?.startTime ?? ''}-${modal.seed?.title ?? modal.text ?? ''}`}
            date={modal.date}
            item={modal.item}
            draft={modal.draft}
            seed={modal.seed}
            initialText={modal.text}
            items={items}
            existingCustomCategories={categories.filter((c) => !BASE_CATEGORIES.includes(c))}
            onDelete={(target) => {
              setModal({ open: false })
              setDeleteTarget(target)
            }}
            onClose={() => setModal({ open: false })}
            onSaved={() => {
              setModal({ open: false })
              window.dispatchEvent(new CustomEvent('calendar-updated'))
            }}
          />,
          document.body,
        )}

      {deleteTarget &&
        (deleteTarget.recurrenceFrequency && deleteTarget.recurrenceFrequency !== 'NONE' ? (
          <DeleteSeriesDialog
            title={deleteTarget.title}
            onOnlyThis={() => void deleteItem(deleteTarget, 'ONLY_THIS')}
            onAll={() => void deleteItem(deleteTarget, 'ALL')}
            onCancel={() => setDeleteTarget(null)}
          />
        ) : (
          <ConfirmDialog
            open
            title="Delete this block?"
            message={`“${deleteTarget.title}” will be removed from your calendar.`}
            onConfirm={() => void deleteItem(deleteTarget, 'ONE')}
            onCancel={() => setDeleteTarget(null)}
          />
        ))}

      {disconnectTarget && (
        <ConfirmDialog
          open
          title="Disconnect Google?"
          message={`Stop syncing ${disconnectTarget}. Blocks already here stay.`}
          confirmLabel="Disconnect"
          onConfirm={() => void disconnectGoogle(disconnectTarget)}
          onCancel={() => setDisconnectTarget(null)}
        />
      )}

      {colorsOpen && (
        <ColorEditDialog
          categories={categories}
          onClose={() => setColorsOpen(false)}
          onReset={() => {
            resetCustomCategoryColors(categories)
            setColorVersion((v) => v + 1)
          }}
          onApply={(colors) => {
            Object.entries(colors).forEach(([c, color]) => setCustomCategoryColor(c, color))
            setColorsOpen(false)
            setColorVersion((v) => v + 1)
          }}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </section>
  )
}

export { CalendarOverviewDashboard }
