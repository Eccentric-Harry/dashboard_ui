import { useEffect, useRef } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  Droplets,
  Flame as FocusFlame,
  Moon,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { useCountUp } from '../../../../hooks/use-count-up'
import type { MealQualityDay } from '../home-types'
import { formatTimeLabel } from '../home-types'
import type { LoopMetric, LoopMetricId } from '../day-loop'
import { buildDayLoop, loopClosedCount, loopScore, nextLoopNudge } from '../day-loop'
import { LoopArc } from './loop-arc'

type TodayHeroCardProps = {
  loading: boolean
  calendarItems: CalendarItem[] | null
  todayTasks: DailyTask[] | null
  overdueCount: number
  hydration: HydrationData | null
  focusRunning: boolean
  /** Minutes slept on the night that ended this morning; null when unlogged. */
  sleepMinutesToday: number | null
  /** Today's meal-quality aggregate from the nutrition summary. */
  mealQuality: MealQualityDay | null
  onAddWater: () => void
  onStartFocus: () => void
  onLogSleep: () => void
  onNavigate: (path: AppPath, search?: string) => void
  /** Fires once when today's loop first reaches 100%. */
  onCelebrate?: () => void
}

/** Serif headline per score band — progress phrased as a story, never a shortfall. */
function loopPhrase(score: number, hour: number): string {
  if (score <= 0) return hour < 12 ? 'The day is wide open' : 'Still time to make a mark'
  if (score < 25) return 'First marks on the page'
  if (score < 50) return 'Momentum is building'
  if (score < 75) return 'Past the halfway mark'
  if (score < 100) return 'Closing the loop'
  return 'Loop closed. Take a bow.'
}

const LOOP_ICONS: Record<LoopMetricId, LucideIcon> = {
  sleep: Moon,
  water: Droplets,
  fuel: Utensils,
  tasks: CheckSquare,
}

/** One loop signal: label + value + its own bar, tappable straight through to the fix. */
function LoopRow({ metric, onClick }: { metric: LoopMetric; onClick: () => void }) {
  const animated = useCountUp(metric.ratio)
  const Icon = LOOP_ICONS[metric.id]
  return (
    <div
      className={cn(
        'ntr-macro-row',
        `home-loop--${metric.id}`,
        metric.done && 'is-done',
        metric.empty && 'is-empty',
      )}
      role="button"
      tabIndex={0}
      aria-label={`${metric.label}: ${metric.display}${metric.sub ? ` ${metric.sub}` : ''}. ${metric.hint}.`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="ntr-macro-header">
        <p>
          <Icon size={11} strokeWidth={2.5} /> {metric.label}
          {metric.done && <span className="home-loop-tick" aria-hidden="true" />}
        </p>
        <strong>
          {metric.display}
          {metric.sub && <em> {metric.sub}</em>}
        </strong>
      </div>
      <span className="ntr-macro-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(Math.max(animated, 0), 1) * 100}%` }} />
      </span>
    </div>
  )
}

function TodayHeroCard({
  loading,
  calendarItems,
  todayTasks,
  overdueCount,
  hydration,
  focusRunning,
  sleepMinutesToday,
  mealQuality,
  onAddWater,
  onStartFocus,
  onLogSleep,
  onNavigate,
  onCelebrate,
}: TodayHeroCardProps) {
  const tasksDone = (todayTasks ?? []).filter((t) => t.completed).length
  const tasksTotal = (todayTasks ?? []).length

  // The loop is computed unconditionally so the celebration effect below can watch
  // it even while the skeleton is showing.
  const metrics = buildDayLoop({
    sleepMinutes: sleepMinutesToday,
    waterMl: hydration?.waterIntakeMl ?? 0,
    waterTargetMl: hydration?.targetMl ?? 0,
    meal: mealQuality,
    tasksCompleted: tasksDone,
    tasksTotal,
  })
  const dayScore = loopScore(metrics)
  const closed = loopClosedCount(metrics)
  const nudge = nextLoopNudge(metrics)

  const prevScoreRef = useRef(dayScore)
  useEffect(() => {
    if (!loading && dayScore >= 100 && prevScoreRef.current < 100) {
      onCelebrate?.()
    }
    prevScoreRef.current = dayScore
  }, [dayScore, loading, onCelebrate])

  if (loading) {
    return (
      <section className="home-card home-card--hero" aria-label="Today at a glance">
        <div className="ntr-card-head home-hero-head">
          <div>
            <p className="ntr-eyebrow">Today</p>
            <span className="home-skel home-skel--title" style={{ width: 260, marginTop: 6 }} />
          </div>
        </div>
        <div className="home-hero-panel is-skeleton">
          <div className="home-hero-gauge-col">
            <span className="home-skel" style={{ width: 190, height: 190, borderRadius: '50%' }} />
          </div>
          <div className="ntr-hero-macros">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="home-skel" style={{ height: 54, borderRadius: 16 }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Upcoming, non-cancelled items with a start time still ahead of now.
  const now = new Date()
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const upcoming = (calendarItems ?? [])
    .filter((item) => !item.cancelled && !item.completed && item.startTime && item.startTime >= nowHm)
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const nextEvent = upcoming[0]

  const openRoute: Record<LoopMetricId, () => void> = {
    sleep: onLogSleep,
    water: onAddWater,
    fuel: () => onNavigate('/nutrition'),
    tasks: () => onNavigate('/tasks'),
  }

  return (
    <section className="home-card home-card--hero" aria-label="Today at a glance">
      <div className="ntr-card-head home-hero-head">
        <div>
          <p className="ntr-eyebrow">Today · Day loop</p>
          <h2>{loopPhrase(dayScore, now.getHours())}</h2>
        </div>
        {/* No focus-session pill here — the running state already shows on the
            gauge button, so a second copy just repeats itself. */}
        {overdueCount > 0 ? (
          <span className="ntr-pill dark home-pill-urgent">
            <AlertTriangle size={12} strokeWidth={2.5} />
            {overdueCount} overdue
          </span>
        ) : nextEvent ? (
          <span className="ntr-pill dark">
            <CalendarClock size={12} strokeWidth={2.5} />
            Next · {formatTimeLabel(nextEvent.startTime)}
          </span>
        ) : (
          <span className="ntr-pill dark">
            <CheckSquare size={12} strokeWidth={2.5} />
            All caught up
          </span>
        )}
      </div>

      <div className={cn('home-hero-panel', dayScore >= 100 && 'is-complete')}>
        <div className="home-hero-gauge-col">
          <div className={cn('ntr-gauge-wrap', focusRunning && 'is-live')}>
            <LoopArc
              score={dayScore}
              centerSub="of today's loop"
              description={metrics.map((m) => `${m.label} ${Math.round(m.ratio * 100)}%`).join(', ')}
            />
          </div>
          <p className="home-loop-count">
            <strong>{closed}</strong> of {metrics.length} closed
          </p>
          {/* The cheapest unlogged signal — the gauge's "so what". Falls back to
              the focus button once there's nothing left to suggest. */}
          {nudge ? (
            <button type="button" className="home-hero-focus-btn" onClick={openRoute[nudge.id]}>
              <ArrowRight size={12} />
              {nudge.cta}
            </button>
          ) : (
            <button type="button" className="home-hero-focus-btn" onClick={onStartFocus}>
              <FocusFlame size={12} />
              {focusRunning ? 'Session running' : 'Start focus'}
            </button>
          )}
        </div>

        <div className="ntr-hero-macros">
          {metrics.map((metric) => (
            <LoopRow key={metric.id} metric={metric} onClick={openRoute[metric.id]} />
          ))}
        </div>
      </div>
    </section>
  )
}

export { TodayHeroCard }
