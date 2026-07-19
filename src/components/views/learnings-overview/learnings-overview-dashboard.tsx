import { useCallback, useEffect, useState } from 'react'
import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import type { LearningLog, LearningsSummary } from '../../../lib/api'
import { fetchLearningsSummary, createCalendarItem } from '../../../lib/api'
import { isoDate, parseIsoDate } from './learnings-utils'
import { LearningsHeader } from './components/learnings-header'
import { LearningsStatsRow } from './components/learnings-stats-row'
import { LearningsLogCard } from './components/learnings-log-card'
import { CategoryBreakdownCard } from './components/category-breakdown-card'
import { AddEntryModal } from './components/add-entry-modal'
import { FocusBlockWidget } from './components/focus-block-widget'
import { ActiveStudyQueue } from './components/active-study-queue'
import './learnings-overview.css'

function parseDateFromParams(searchParams: URLSearchParams): string {
  const param = searchParams.get('date')
  if (!param) return isoDate()
  const d = parseIsoDate(param)
  if (param.match(/^\d{4}-\d{2}-\d{2}$/)) return param
  return isoDate(d)
}

interface LearningsOverviewDashboardProps {
  searchParams: URLSearchParams
  onNavigate?: (pathname: AppPath, search?: string) => void
}

function LearningsOverviewDashboard({ searchParams, onNavigate }: LearningsOverviewDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(() => parseDateFromParams(searchParams))
  const [refreshKey, setRefreshKey] = useState(0)
  const [summary, setSummary] = useState<LearningsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [editingLearning, setEditingLearning] = useState<LearningLog | undefined>()

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

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetchLearningsSummary(selectedDate)
      setSummary(res?.data ?? null)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummary()
  }, [loadSummary, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    void loadSummary()
  }, [loadSummary])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    onNavigate?.('/learnings', `?date=${date}`)
  }

  const handleSessionComplete = useCallback(async (durationMinutes: number, activityType: string) => {
    try {
      const now = new Date()
      const startTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)
      const endTimeStr = endTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })

      await createCalendarItem({
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
      handleRefresh()
    } catch (err) {
      console.error('Failed to log focus session to calendar', err)
    }
  }, [selectedDate, handleRefresh])

  return (
    <section className="learnings-dashboard" aria-label="Learnings overview dashboard">
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
          <ActiveStudyQueue onRefresh={handleRefresh} />
        </div>

        <div className="lo-focus-wrap">
          <FocusBlockWidget onSessionComplete={handleSessionComplete} />
        </div>

        {/* Row 3: Category Distribution + Journal */}
        <div className="lo-distribution-wrap">
          <CategoryBreakdownCard refreshKey={refreshKey} />
        </div>

        <div className="lo-journal-wrap">
          <LearningsLogCard
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            onEditLearning={(learning) => {
              setEditingLearning(learning)
              setEntryModalOpen(true)
            }}
          />
        </div>
      </div>

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
