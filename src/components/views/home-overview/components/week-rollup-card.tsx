import { CalendarCheck } from 'lucide-react'
import type { MindSummary } from '../../../../lib/api'
import { cn } from '../../../../lib/utils'
import type { NutritionSummary, SpendingSummary } from '../home-types'
import { formatMinutes } from '../home-types'

type WeekRollupCardProps = {
  loading: boolean
  mind: MindSummary | null
  nutrition: NutritionSummary | null
  spending: SpendingSummary | null
  avgSleepMinutes: number | null
}

type RollupStat = {
  id: string
  value: string
  label: string
  isZero: boolean
  watch?: boolean
}

function WeekRollupCard({ loading, mind, nutrition, spending, avgSleepMinutes }: WeekRollupCardProps) {
  const mealsLoggedDays = nutrition
    ? Object.values(nutrition.dailyCalories).filter((kcal) => kcal > 0).length
    : 0

  // Guarded because guest mode's fetch fallback can hand back a shape-less payload.
  const budgetUtilization =
    spending && Number.isFinite(spending.budgetUtilization) ? spending.budgetUtilization : null

  const stats: RollupStat[] = [
    {
      id: 'focus',
      value: mind && mind.focusMinutes > 0 ? formatMinutes(mind.focusMinutes) : '—',
      label: 'focused',
      isZero: !mind || mind.focusMinutes === 0,
    },
    {
      id: 'tasks',
      value: mind && mind.tasksCompleted > 0 ? String(mind.tasksCompleted) : '—',
      label: 'tasks done',
      isZero: !mind || mind.tasksCompleted === 0,
    },
    {
      id: 'workouts',
      value: mind && mind.workouts > 0 ? String(mind.workouts) : '—',
      label: 'workouts',
      isZero: !mind || mind.workouts === 0,
    },
    {
      id: 'learnings',
      value: mind && mind.learnings > 0 ? String(mind.learnings) : '—',
      label: 'learnings',
      isZero: !mind || mind.learnings === 0,
    },
    {
      id: 'meals',
      value: mealsLoggedDays > 0 ? `${mealsLoggedDays}d` : '—',
      label: 'meals logged',
      isZero: mealsLoggedDays === 0,
    },
    {
      id: 'sleep',
      value: avgSleepMinutes != null ? formatMinutes(avgSleepMinutes) : '—',
      label: 'avg sleep',
      isZero: avgSleepMinutes == null,
    },
    {
      id: 'spend',
      value: budgetUtilization != null ? `${Math.round(budgetUtilization)}%` : '—',
      label: 'of month budget',
      isZero: budgetUtilization == null,
      watch: budgetUtilization != null && budgetUtilization > 100,
    },
  ]

  const allZero = stats.every((s) => s.isZero)

  return (
    <section className="home-card home-card--rollup" aria-label="This week">
      <CalendarCheck className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">This week</span>
          <h2 className="home-card-title">You showed up</h2>
        </div>
      </header>

      {loading ? (
        <div className="home-rollup-row">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="home-skel home-skel--stat" />
          ))}
        </div>
      ) : allZero ? (
        <div className="home-card-empty">
          <p>A quiet week so far — and that's okay. Anything you log starts showing up here.</p>
        </div>
      ) : (
        <div className="home-rollup-row">
          {stats.map((stat) => (
            <span key={stat.id} className={cn('home-rollup-stat', stat.isZero && 'is-quiet', stat.watch && 'is-watch')}>
              <b>{stat.value}</b>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export { WeekRollupCard }
