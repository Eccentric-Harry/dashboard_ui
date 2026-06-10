import { useCallback, useEffect, useState } from 'react'
import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import type { DailyTask, LearningLog, LearningsSummary } from '../../../lib/api'
import { fetchLearningsSummary, createCalendarItem } from '../../../lib/api'
import { isoDate, parseIsoDate } from './learnings-utils'
import { LearningsHeader } from './components/learnings-header'
import { LearningsStatsRow } from './components/learnings-stats-row'
import { TasksScheduleCard } from './components/tasks-schedule-card'
import { LearningsLogCard } from './components/learnings-log-card'
import { CategoryBreakdownCard } from './components/category-breakdown-card'
import { AddLearningModal } from './components/add-learning-modal'
import { AddTaskModal } from './components/add-task-modal'
import { GitHubProfileCard, LeetCodeProfileCard } from './components/dev-profile-card'
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

  const [learningModalOpen, setLearningModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingLearning, setEditingLearning] = useState<LearningLog | undefined>()
  const [editingTask, setEditingTask] = useState<DailyTask | undefined>()

  useEffect(() => {
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

      const payload = {
        title: `Focus: ${activityType}`,
        date: selectedDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        itemType: 'EVENT' as const,
        category: 'Productivity',
        notes: `Completed a focus session of ${durationMinutes} minutes on ${activityType}.`,
        color: '#1a7a4a',
        completed: true,
      }

      await createCalendarItem(payload)
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
        onAddLearning={() => {
          setEditingLearning(undefined)
          setLearningModalOpen(true)
        }}
        onAddTask={() => {
          setEditingTask(undefined)
          setTaskModalOpen(true)
        }}
        summary={summary}
      />

      <div className="learnings-dashboard-grid">
        <LearningsStatsRow summary={summary} loading={summaryLoading} />

        {/* Row 2: Tasks & Current Pursuits side-by-side */}
        <div className="learnings-tasks-card-wrap">
          <TasksScheduleCard
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            onEditTask={(task) => {
              setEditingTask(task)
              setTaskModalOpen(true)
            }}
          />
        </div>

        <div className="learnings-study-queue-card-wrap">
          <ActiveStudyQueue onRefresh={handleRefresh} />
        </div>

        {/* Row 3: Distribution (Category Breakdown) occupies full width */}
        <div className="learnings-distribution-card-wrap">
          <CategoryBreakdownCard refreshKey={refreshKey} />
        </div>

        {/* Row 4: Focus Block & Journal side-by-side */}
        <div className="learnings-focus-widget-card-wrap">
          <FocusBlockWidget onSessionComplete={handleSessionComplete} />
        </div>

        <div className="learnings-journal-card-wrap">
          <LearningsLogCard
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            onEditLearning={(learning) => {
              setEditingLearning(learning)
              setLearningModalOpen(true)
            }}
          />
        </div>

        {/* Row 5: GitHub & LeetCode Profiles side-by-side */}
        <div className="learnings-github-card-wrap">
          <GitHubProfileCard />
        </div>

        <div className="learnings-leetcode-card-wrap">
          <LeetCodeProfileCard />
        </div>
      </div>

      <AddLearningModal
        isOpen={learningModalOpen}
        onClose={() => {
          setLearningModalOpen(false)
          setEditingLearning(undefined)
        }}
        onSuccess={handleRefresh}
        isEdit={!!editingLearning}
        initialData={editingLearning}
        defaultDate={selectedDate}
      />

      <AddTaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setEditingTask(undefined)
        }}
        onSuccess={handleRefresh}
        isEdit={!!editingTask}
        initialData={editingTask}
        defaultDate={selectedDate}
      />
    </section>
  )
}

export { LearningsOverviewDashboard }
