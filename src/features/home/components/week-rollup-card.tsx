import { cn } from '@/lib/utils'
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
  value: string
  label: string
  isZero: boolean
  watch?: boolean
  mobileOnly?: boolean
  /** Week-over-week change, e.g. "▲ 1h 10m"; null hides the row. */
  delta: { text: string; tone: Tone } | null
}

/** "▲ 2" against last week (the card's pill names the baseline) — tone follows whether more is good. */
function weekDelta(
  current: number,
  previous: number,
  format: (n: number) => string,
  goodWhen: 'up' | 'down' = 'up',
): { text: string; tone: Tone } | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) return { text: 'new', tone: 'good' }
  const diff = current - previous
  if (diff === 0) return { text: 'same', tone: 'flat' }
  const arrow = diff > 0 ? '▲' : '▼'
  const improved = goodWhen === 'up' ? diff > 0 : diff < 0
  return { text: `${arrow} ${format(Math.abs(diff))}`, tone: improved ? 'good' : 'watch' }
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

  // A total of logged minutes reads as "at least this much", so counting an
  // unlogged day as 0 is honest here — unlike the averages and correlations in
  // insights-engine.ts, where it would invent a data point.
  const focus = sum(weekRecords, (r) => r.focusMinutes ?? 0)
  const prevFocus = sum(prevWeekRecords, (r) => r.focusMinutes ?? 0)
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
      value: focus > 0 ? formatMinutes(focus) : '—',
      label: 'focused',
      isZero: focus === 0,
      delta: weekDelta(focus, prevFocus, formatMinutes),
    },
    {
      id: 'tasks',
      value: tasks > 0 ? String(tasks) : '—',
      label: 'tasks done',
      isZero: tasks === 0,
      delta: weekDelta(tasks, prevTasks, count),
    },
    {
      id: 'workouts',
      value: workouts > 0 ? String(workouts) : '—',
      label: 'workouts',
      isZero: workouts === 0,
      delta: weekDelta(workouts, prevWorkouts, count),
    },
    {
      id: 'learnings',
      value: learnings > 0 ? String(learnings) : '—',
      label: 'learnings',
      isZero: learnings === 0,
      delta: weekDelta(learnings, prevLearnings, count),
    },
    {
      id: 'meals',
      value: mealsLoggedDays > 0 ? `${mealsLoggedDays}d` : '—',
      label: 'meals logged',
      isZero: mealsLoggedDays === 0,
      delta: null,
    },
    {
      id: 'sleep',
      value: sleep != null ? formatMinutes(sleep) : '—',
      label: 'avg sleep',
      isZero: sleep == null,
      delta: sleep != null && prevSleep != null ? weekDelta(sleep, prevSleep, formatMinutes) : null,
    },
    {
      id: 'spend',
      value: budgetUtilization != null ? `${Math.round(budgetUtilization)}%` : '—',
      label: 'budget used',
      isZero: budgetUtilization == null,
      watch: budgetUtilization != null && budgetUtilization > 100,
      delta: null,
    },
    {
      id: 'protein',
      value: proteinPct != null ? `${proteinPct}%` : '—',
      label: 'protein goal',
      isZero: proteinPct == null || proteinPct === 0,
      delta: proteinPct != null && prevProteinPct != null ? weekDelta(proteinPct, prevProteinPct, pctFormat) : null,
      mobileOnly: true,
    },
  ]

  // Focus stays off the strip until it has ever been logged in the window — the
  // Focus log card owns that empty state, so a third "—" adds nothing.
  const visibleTiles = tiles.filter((t) => t.id !== 'focus' || focus > 0 || prevFocus > 0)
  const allZero = visibleTiles.every((t) => t.isZero)

  return (
    <section className="home-card home-card--rollup" aria-label="This week">
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">This week</span>
          <h2 className="home-card-title">{allZero ? 'A quiet week so far' : 'You showed up'}</h2>
        </div>
        {!loading && !allZero && <span className="hm-pill">vs last week</span>}
      </header>

      {loading ? (
        <span className="home-skel" style={{ height: 72, borderRadius: 18 }} />
      ) : allZero ? (
        <div className="home-card-empty">
          <p>That's okay. Anything you log starts showing up here.</p>
        </div>
      ) : (
        <div className="hm-strip hm-strip--rollup">
          {visibleTiles.map((tile) => (
            <div
              key={tile.id}
              className={cn(
                'hm-strip-stat',
                `home-rollup--${tile.id}`,
                tile.isZero && 'is-quiet',
                tile.watch && 'is-watch',
                tile.mobileOnly && 'home-rollup-mobile-only',
              )}
            >
              <strong>{tile.value}</strong>
              <span>{tile.label}</span>
              {tile.delta && !tile.isZero && (
                <em className={cn('hm-delta', `tone-${tile.delta.tone}`)}>{tile.delta.text}</em>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export { WeekRollupCard }
