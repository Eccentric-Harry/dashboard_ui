import { BookOpen, CheckSquare, GraduationCap, Target } from 'lucide-react'
import type { LearningsSummary } from '../../../../lib/api'

interface LearningsStatsRowProps {
  summary: LearningsSummary | null
  loading?: boolean
  refreshKey?: number
}

export function LearningsStatsRow({ summary, loading }: LearningsStatsRowProps) {
  const stats = summary?.stats
  const timeline = summary?.timeline || []
  const last7Days = timeline.slice(-7)

  const items = [
    {
      label: 'Learnings',
      value: loading ? '—' : String(stats?.totalLearningsCount ?? 0),
      hint: 'total logged',
      icon: BookOpen,
      tone: 'learnings' as const,
    },
    {
      label: 'Tasks',
      value: loading ? '—' : `${stats?.totalTasksCompleted ?? 0}/${stats?.totalTasksCount ?? 0}`,
      hint: 'done',
      icon: CheckSquare,
      tone: 'tasks' as const,
    },
    {
      label: 'Pursuits',
      value: loading ? '—' : String(stats?.totalPursuitsCount ?? 0),
      hint: 'active',
      icon: GraduationCap,
      tone: 'streak' as const,
    },
    {
      label: 'This week',
      value: loading ? '—' : String(stats?.weeklyLearningCount ?? 0),
      hint: 'entries',
      icon: Target,
      tone: 'week' as const,
    },
  ]

  return (
    <div className="learnings-stats-row" aria-live="polite">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className={`learnings-stat-card learnings-stat-card--${item.tone}`}>
            <div className={`learnings-stat-icon learnings-stat-icon--${item.tone}`}>
              <Icon size={15} strokeWidth={2.2} />
            </div>
            <p>{item.label}</p>
            <strong>
              {item.value}
              <small>{item.hint}</small>
            </strong>
            {item.tone === 'week' && !loading && last7Days.length > 0 && (
              <div className="learnings-weekly-dots">
                {last7Days.map((day, idx) => {
                  const parts = day.date.split('-')
                  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })
                  const isActive = (day.learningsCount ?? 0) > 0 || (day.tasksCompleted ?? 0) > 0
                  const tooltipText = `${day.date}: ${day.learningsCount ?? 0} learnings, ${day.tasksCompleted ?? 0} tasks done`
                  return (
                    <div key={idx} className="weekly-dot-col" title={tooltipText}>
                      <span className="weekly-dot-label">{weekday}</span>
                      <span className={`weekly-dot ${isActive ? 'is-active' : ''}`} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
