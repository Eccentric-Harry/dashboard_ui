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
import { AddEntryModal } from './components/add-entry-modal'
import { GitHubProfileCard, LeetCodeProfileCard } from './components/dev-profile-card'
import type { GithubProfile, GithubRepo, LeetcodeStats, LeetcodeProfile } from './components/dev-profile-card'
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
  const [editingTask, setEditingTask] = useState<DailyTask | undefined>()
  const [initialTab, setInitialTab] = useState<'Task' | 'Learning'>('Task')

  const isGuest = localStorage.getItem('isGuest') === 'true'
  const [githubProfile, setGithubProfile] = useState<GithubProfile | null>(null)
  const [githubRepos, setGithubRepos] = useState<GithubRepo[] | null>(null)
  const [leetcodeStats, setLeetcodeStats] = useState<LeetcodeStats | null>(null)
  const [leetcodeProfile, setLeetcodeProfile] = useState<LeetcodeProfile | null>(null)

  useEffect(() => {
    if (isGuest) return

    fetch('https://api.github.com/users/Eccentric-Harry')
      .then(r => r.json())
      .then(setGithubProfile)
      .catch(() => {})

    fetch('https://api.github.com/users/Eccentric-Harry/repos')
      .then(r => r.json())
      .then(setGithubRepos)
      .catch(() => {})

    fetch('https://leetcode-api-faisalshohag.vercel.app/Eccentric-Harry')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.totalSolved === 'number') {
          setLeetcodeStats(data)
        }
      })
      .catch(() => {})

    fetch('https://alfa-leetcode-api.onrender.com/Eccentric-Harry/profile')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.username === 'string') {
          setLeetcodeProfile(data)
        }
      })
      .catch(() => {})
  }, [isGuest])

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
        onAddEntry={() => {
          setEditingLearning(undefined)
          setEditingTask(undefined)
          setInitialTab('Task')
          setEntryModalOpen(true)
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
              setEditingLearning(undefined)
              setInitialTab('Task')
              setEntryModalOpen(true)
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
              setEditingTask(undefined)
              setInitialTab('Learning')
              setEntryModalOpen(true)
            }}
          />
        </div>

        {/* Row 5: GitHub & LeetCode Profiles side-by-side */}
        <div className="learnings-github-card-wrap">
          <GitHubProfileCard
            profile={githubProfile ?? undefined}
            repos={githubRepos ?? undefined}
          />
        </div>

        <div className="learnings-leetcode-card-wrap">
          <LeetCodeProfileCard
            stats={leetcodeStats ?? undefined}
            profile={leetcodeProfile ?? undefined}
          />
        </div>
      </div>

      <AddEntryModal
        isOpen={entryModalOpen}
        onClose={() => {
          setEntryModalOpen(false)
          setEditingLearning(undefined)
          setEditingTask(undefined)
        }}
        onSuccess={handleRefresh}
        isEdit={!!editingLearning || !!editingTask}
        initialTab={initialTab}
        initialLearningData={editingLearning}
        initialTaskData={editingTask}
        defaultDate={selectedDate}
      />
    </section>
  )
}

export { LearningsOverviewDashboard }
