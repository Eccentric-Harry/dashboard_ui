import { BookOpen, CheckSquare, Flame, Target } from 'lucide-react'
import type { LearningsSummary } from '../../../../lib/api'

interface LearningsStatsRowProps {
  summary: LearningsSummary | null
  loading?: boolean
  refreshKey?: number
}

export function LearningsStatsRow({ summary, loading }: LearningsStatsRowProps) {
  const today = summary?.today
  const stats = summary?.stats

  const items = [
    {
      label: 'Learnings',
      value: loading ? '—' : String(today?.learningsCount ?? 0),
      hint: 'logged today',
      icon: BookOpen,
      tone: 'learnings' as const,
    },
    {
      label: 'Tasks',
      value: loading ? '—' : `${today?.tasksCompleted ?? 0}/${today?.tasksTotal ?? 0}`,
      hint: 'done today',
      icon: CheckSquare,
      tone: 'tasks' as const,
    },
    {
      label: 'Streak',
      value: loading ? '—' : `${stats?.streakDays ?? 0}`,
      hint: 'days',
      icon: Flame,
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
          </div>
        )
      })}
    </div>
  )
}
