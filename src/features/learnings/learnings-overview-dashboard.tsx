import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AppPath } from '@/app/routes'
import type { LearningLog } from '@/types/learnings'
import { calendarService } from '@/services/calendar-service'
import { useLearningsStore } from '@/store/learnings-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { isStandalone } from '@/lib/utils'
import { isoDate, parseIsoDate } from './learnings-utils'
import { LearningsHeader } from './components/learnings-header'
import { LearningsStatsRow } from './components/learnings-stats-row'
import { LearningsLogCard } from './components/learnings-log-card'
import { CategoryBreakdownCard } from './components/category-breakdown-card'
import { AddEntryModal } from './components/add-entry-modal'
import { FocusBlockWidget } from './components/focus-block-widget'
import { FocusSessionHost } from './components/focus-session-host'
import { ActiveStudyQueue } from './components/active-study-queue'
import { PursuitWorkspace } from './components/pursuit-workspace/pursuit-workspace'
import './learnings-overview.css'

function parseDateFromParams(searchParams: URLSearchParams): string {
  const param = searchParams.get('date')
  if (!param) return isoDate()
  const d = parseIsoDate(param)
  if (param.match(/^\d{4}-\d{2}-\d{2}$/)) return param
  return isoDate(d)
}

/** Desktop scrolls inside the dashboard's own box; phones scroll the page. */
const ownsScroll = (el: HTMLElement | null): el is HTMLElement =>
  el !== null && getComputedStyle(el).overflowY !== 'visible'

interface LearningsOverviewDashboardProps {
  searchParams: URLSearchParams
  onNavigate?: (pathname: AppPath, search?: string) => void
}

function LearningsOverviewDashboard({ searchParams, onNavigate }: LearningsOverviewDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => parseDateFromParams(searchParams))
  // `?pursuit=<id>` swaps the dashboard for that pursuit's workspace.
  const pursuitParam = searchParams.get('pursuit')

  // Summary server state comes from the learnings store (date-keyed slice).
  const summaryState = useLearningsStore.use.summary()
  const learningsActions = useLearningsStore.use.actions()
  const summary = summaryState.data
  const summaryLoading = isAwaitingData(summaryState)

  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingLearning, setEditingLearning] = useState<LearningLog | undefined>()

  const sectionRef = useRef<HTMLElement>(null)
  const dashboardScrollRef = useRef(0)
  // True while the open workspace was reached straight from the dashboard in this tab.
  const enteredFromDashboardRef = useRef(false)

  // Bottom-dock quick-add bubble opens the same "add entry" modal
  useEffect(() => {
    const handler = () => {
      setEditingLearning(undefined)
      setEntryModalOpen(true)
    }
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDate(parseDateFromParams(searchParams))
  }, [searchParams])

  // Each view opens at its top; coming back to the dashboard restores where it was.
  useLayoutEffect(() => {
    const el = sectionRef.current
    const y = pursuitParam ? 0 : dashboardScrollRef.current
    const apply = () => {
      if (ownsScroll(el)) el.scrollTop = y
      else window.scrollTo(0, y)
    }
    apply()
    if (!pursuitParam) {
      dashboardScrollRef.current = 0
      enteredFromDashboardRef.current = false
    }
    if (y === 0) return
    // The cards re-mount with the dashboard and are still growing to full height, which
    // clamps the first restore short; re-apply once they've settled.
    const frame = requestAnimationFrame(apply)
    const timer = window.setTimeout(apply, 250)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [pursuitParam])

  const reloadSummary = useCallback(() => {
    void learningsActions.loadSummary(selectedDate)
  }, [learningsActions, selectedDate])

  useEffect(() => {
    reloadSummary()
  }, [reloadSummary])

  // The full lists back several cards; the route loads them once.
  useEffect(() => {
    void learningsActions.loadLearnings()
    void learningsActions.loadPursuits()
  }, [learningsActions])

  /** Re-sync after any mutation — a completed pursuit becomes a learning, so both move. */
  const handleRefresh = useCallback(() => {
    void learningsActions.loadLearnings()
    reloadSummary()
  }, [learningsActions, reloadSummary])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    onNavigate?.('/learnings', `?date=${date}`)
  }

  /** Keeps the viewed date when moving between the dashboard and a workspace. */
  const searchWith = (pursuitId?: string) => {
    const params = new URLSearchParams()
    const date = searchParams.get('date')
    if (date) params.set('date', date)
    if (pursuitId) params.set('pursuit', pursuitId)
    const query = params.toString()
    return query ? `?${query}` : ''
  }

  const openPursuit = (pursuitId: string) => {
    if (pursuitParam) {
      // Switching pursuits inside the workspace: Back can no longer just pop one entry.
      enteredFromDashboardRef.current = false
    } else {
      const el = sectionRef.current
      dashboardScrollRef.current = ownsScroll(el) ? el.scrollTop : window.scrollY
      enteredFromDashboardRef.current = true
    }
    onNavigate?.('/learnings', searchWith(pursuitId))
  }

  const closePursuit = () => {
    // Straight back from the dashboard in a browser tab: pop history so the browser's own
    // Back and Forward stay in step. Deep links and the installed PWA navigate instead.
    if (enteredFromDashboardRef.current && !isStandalone()) {
      window.history.back()
      return
    }
    onNavigate?.('/learnings', searchWith())
  }

  const handleSessionComplete = useCallback(async (durationMinutes: number, activityType: string) => {
    try {
      const now = new Date()
      const startTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)
      const endTimeStr = endTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })

      const res = await calendarService.createItem({
        title: `Focus: ${activityType}`,
        date: selectedDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        itemType: 'EVENT' as const,
        category: 'Productivity',
        notes: `Completed a focus session of ${durationMinutes} minutes on ${activityType}.`,
        color: '#1a7a4a',
        completed: true,
      })
      if (res.error) throw new Error(res.error.message)
      handleRefresh()
    } catch (err) {
      console.error('Failed to log focus session to calendar', err)
    }
  }, [selectedDate, handleRefresh])

  return (
    <section
      ref={sectionRef}
      className="learnings-dashboard route-scroll"
      aria-label={pursuitParam ? 'Pursuit workspace' : 'Learnings overview dashboard'}
    >
      {pursuitParam ? (
        <PursuitWorkspace
          pursuitId={pursuitParam}
          onBack={closePursuit}
          onOpenPursuit={openPursuit}
          onRefresh={handleRefresh}
        />
      ) : (
        <>
          <LearningsHeader
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onNavigate={onNavigate}
            onAddEntry={() => {
              setEditingLearning(undefined)
              setEntryModalOpen(true)
            }}
            summary={summary}
          />

          <div className="learnings-dashboard-grid">
            {/* Row 1: Stats strip */}
            <LearningsStatsRow summary={summary} loading={summaryLoading} />

            {/* Row 2: Study Queue (wide) + Focus Widget */}
            <div className="lo-study-queue-wrap">
              <ActiveStudyQueue onRefresh={handleRefresh} onOpenPursuit={openPursuit} />
            </div>

            <div className="lo-focus-wrap">
              <FocusBlockWidget />
            </div>

            {/* Row 3: Category Distribution + Journal */}
            <div className="lo-distribution-wrap">
              <CategoryBreakdownCard />
            </div>

            <div className="lo-journal-wrap">
              <LearningsLogCard
                onRefresh={handleRefresh}
                onEditLearning={(learning) => {
                  setEditingLearning(learning)
                  setEntryModalOpen(true)
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Finishing a focus session is handled here so it works from either view. */}
      <FocusSessionHost onSessionComplete={handleSessionComplete} onPursuitsChanged={handleRefresh} />

      <AddEntryModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false)
          setEditingLearning(undefined)
        }}
        onSuccess={handleRefresh}
        isEdit={!!editingLearning}
        initialTab="Learning"
        initialLearningData={editingLearning}
        defaultDate={selectedDate}
      />
    </section>
  )
}

export { LearningsOverviewDashboard }
