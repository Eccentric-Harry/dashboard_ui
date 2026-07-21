import { Bean, CalendarCheck, CheckSquare, Dumbbell, Flame, Lightbulb, Moon, Utensils, Wallet } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { DayRecord } from '../insights-engine'
import type { NutritionSummary, SpendingSummary } from '../home-types'
import { formatMinutes } from '../home-types'

type WeekRollupCardProps = {
  loading: boolean
  /** Last 7 days (ascending) from the shared 14-day record window. */
  weekRecords: DayRecord[]
  /** The 7 days before those — powers the week-over-week deltas. */
  prevWeekRecords: DayRecord[]
  nutrition: NutritionSummary | null
  spending: SpendingSummary | null
}

type Tone = 'good' | 'watch' | 'flat'

type RollupTile = {
  id: string
  icon: React.ReactNode
  value: string
  label: string
  isZero: boolean
  watch?: boolean
  mobileOnly?: boolean
  /** Week-over-week line, e.g. "▲ 1h 10m vs last wk"; null hides the row. */
  delta: { text: string; tone: Tone } | null
}

/** "▲ +2 vs last wk" — tone follows whether more of this metric is good. */
function weekDelta(
  current: number,
  previous: number,
  format: (n: number) => string,
  goodWhen: 'up' | 'down' = 'up',
): { text: string; tone: Tone } | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) return { text: 'new this week', tone: 'good' }
  const diff = current - previous
  if (diff === 0) return { text: 'same as last wk', tone: 'flat' }
  const arrow = diff > 0 ? '▲' : '▼'
  const improved = goodWhen === 'up' ? diff > 0 : diff < 0
  return { text: `${arrow} ${format(Math.abs(diff))} vs last wk`, tone: improved ? 'good' : 'watch' }
}

function WeekRollupCard({
  loading,
  weekRecords,
  prevWeekRecords,
  nutrition,
  spending,
}: WeekRollupCardProps) {
  const sum = (records: DayRecord[], pick: (r: DayRecord) => number) =>
    records.reduce((total, r) => total + pick(r), 0)
  const avgSleep = (records: DayRecord[]) => {
    const nights = records.filter((r) => r.sleepMinutes != null)
    if (nights.length === 0) return null
    return Math.round(nights.reduce((total, r) => total + (r.sleepMinutes as number), 0) / nights.length)
  }

  const focus = sum(weekRecords, (r) => r.focusMinutes)
  const prevFocus = sum(prevWeekRecords, (r) => r.focusMinutes)
  const tasks = sum(weekRecords, (r) => r.tasksCompleted)
  const prevTasks = sum(prevWeekRecords, (r) => r.tasksCompleted)
  const workouts = sum(weekRecords, (r) => r.workouts)
  const prevWorkouts = sum(prevWeekRecords, (r) => r.workouts)
  const learnings = sum(weekRecords, (r) => r.learnings)
  const prevLearnings = sum(prevWeekRecords, (r) => r.learnings)
  const sleep = avgSleep(weekRecords)
  const prevSleep = avgSleep(prevWeekRecords)

  const mealsLoggedDays = nutrition
    ? Object.values(nutrition.dailyCalories).filter((kcal) => kcal > 0).length
    : 0

  // Guarded because guest mode's fetch fallback can hand back a shape-less payload.
  const budgetUtilization =
    spending && Number.isFinite(spending.budgetUtilization) ? spending.budgetUtilization : null

  const count = (n: number) => String(n)
  const pctFormat = (n: number) => `${n}%`

  const proteinGoal = nutrition?.proteinGoal ?? 0
  const weeklyProteinGoal = proteinGoal * 7
  const proteinGrams = sum(weekRecords, (r) => r.proteinGrams ?? 0)
  const prevProteinGrams = sum(prevWeekRecords, (r) => r.proteinGrams ?? 0)
  const proteinPct = weeklyProteinGoal > 0 ? Math.round((proteinGrams / weeklyProteinGoal) * 100) : null
  const prevProteinPct = weeklyProteinGoal > 0 ? Math.round((prevProteinGrams / weeklyProteinGoal) * 100) : null

  const tiles: RollupTile[] = [
    {
      id: 'focus',
      icon: <Flame size={13} strokeWidth={2.4} />,
      value: focus > 0 ? formatMinutes(focus) : '—',
      label: 'focused',
      isZero: focus === 0,
      delta: weekDelta(focus, prevFocus, formatMinutes),
    },
    {
      id: 'tasks',
      icon: <CheckSquare size={13} strokeWidth={2.4} />,
      value: tasks > 0 ? String(tasks) : '—',
      label: 'tasks done',
      isZero: tasks === 0,
      delta: weekDelta(tasks, prevTasks, count),
    },
    {
      id: 'workouts',
      icon: <Dumbbell size={13} strokeWidth={2.4} />,
      value: workouts > 0 ? String(workouts) : '—',
      label: 'workouts',
      isZero: workouts === 0,
      delta: weekDelta(workouts, prevWorkouts, count),
    },
    {
      id: 'learnings',
      icon: <Lightbulb size={13} strokeWidth={2.4} />,
      value: learnings > 0 ? String(learnings) : '—',
      label: 'learnings',
      isZero: learnings === 0,
      delta: weekDelta(learnings, prevLearnings, count),
    },
    {
      id: 'meals',
      icon: <Utensils size={13} strokeWidth={2.4} />,
      value: mealsLoggedDays > 0 ? `${mealsLoggedDays}d` : '—',
      label: 'meals logged',
      isZero: mealsLoggedDays === 0,
      delta: null,
    },
    {
      id: 'sleep',
      icon: <Moon size={13} strokeWidth={2.4} />,
      value: sleep != null ? formatMinutes(sleep) : '—',
      label: 'avg sleep',
      isZero: sleep == null,
      delta: sleep != null && prevSleep != null ? weekDelta(sleep, prevSleep, formatMinutes) : null,
    },
    {
      id: 'spend',
      icon: <Wallet size={13} strokeWidth={2.4} />,
      value: budgetUtilization != null ? `${Math.round(budgetUtilization)}%` : '—',
      label: 'budget used',
      isZero: budgetUtilization == null,
      watch: budgetUtilization != null && budgetUtilization > 100,
      delta: null,
    },
    {
      id: 'protein',
      icon: <Bean size={13} strokeWidth={2.4} />,
      value: proteinPct != null ? `${proteinPct}%` : '—',
      label: 'protein goal',
      isZero: proteinPct == null || proteinPct === 0,
      delta: proteinPct != null && prevProteinPct != null ? weekDelta(proteinPct, prevProteinPct, pctFormat) : null,
      mobileOnly: true,
    },
  ]

  const allZero = tiles.every((t) => t.isZero)

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
        <div className="home-rollup-grid">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="home-skel home-skel--tile" />
          ))}
        </div>
      ) : allZero ? (
        <div className="home-card-empty">
          <p>A quiet week so far — and that's okay. Anything you log starts showing up here.</p>
        </div>
      ) : (
        <div className="home-rollup-grid">
          {tiles.map((tile) => (
            <article
              key={tile.id}
              className={cn(
                'home-rollup-tile',
                `home-rollup--${tile.id}`,
                tile.isZero && 'is-quiet',
                tile.watch && 'is-watch',
                tile.mobileOnly && 'home-rollup-mobile-only'
              )}
            >
              <span className="home-rollup-ic" aria-hidden="true">
                {tile.icon}
              </span>
              <b>{tile.value}</b>
              {tile.delta && (
                <span className={cn('home-rollup-delta', `tone-${tile.delta.tone}`)}>{tile.delta.text}</span>
              )}
              <small>{tile.label}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export { WeekRollupCard }
