import { useCallback, useEffect, useState } from 'react'
import type { AppPath } from '../../dashboard/quantified-self-dashboard/data'
import type { DailyTask, LearningLog, LearningsSummary } from '../../../lib/api'
import { fetchLearningsSummary } from '../../../lib/api'
import { isoDate, parseIsoDate } from './learnings-utils'
import { LearningsHeader } from './components/learnings-header'
import { LearningsStatsRow } from './components/learnings-stats-row'
import { TasksScheduleCard } from './components/tasks-schedule-card'
import { LearningsLogCard } from './components/learnings-log-card'
import { CategoryBreakdownCard } from './components/category-breakdown-card'
import { CodingPulseCard } from './components/coding-pulse-card'
import { ActivityHeatmapCard } from './components/activity-heatmap-card'
import { AddLearningModal } from './components/add-learning-modal'
import { AddTaskModal } from './components/add-task-modal'
import { DevProfileCard } from './components/dev-profile-card'
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

        <div className="learnings-focus-stack">
          <TasksScheduleCard
            selectedDate={selectedDate}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
            onEditTask={(task) => {
              setEditingTask(task)
              setTaskModalOpen(true)
            }}
          />
        </div>

        <LearningsLogCard
          selectedDate={selectedDate}
          refreshKey={refreshKey}
          onRefresh={handleRefresh}
          onEditLearning={(learning) => {
            setEditingLearning(learning)
            setLearningModalOpen(true)
          }}
        />

        <CategoryBreakdownCard categories={summary?.today.categories ?? []} />

        <CodingPulseCard
          streakDays={summary?.stats.streakDays}
          githubCommits={summary?.stats.githubCommits}
          leetCodeSolved={summary?.stats.leetCodeSolved}
          selectedDate={selectedDate}
        />

        <ActivityHeatmapCard timeline={summary?.sevenDayTimeline ?? []} />

        <DevProfileCard />
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
