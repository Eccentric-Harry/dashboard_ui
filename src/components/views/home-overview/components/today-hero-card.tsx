import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Droplets,
  Flame as FocusFlame,
  Footprints,
  Moon,
  Smile,
  Utensils,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { useCountUp } from '../../../../hooks/use-count-up'
import type { MealQualityDay, NutritionSummary } from '../home-types'
import { formatMinutes, formatTimeLabel, FOCUS_TARGET_MINUTES } from '../home-types'
import type { LoopMetric, LoopMetricId } from '../day-loop'
import { buildDayLoop, loopClosedCount, loopScore, nextLoopNudge } from '../day-loop'
import { LoopArc } from './loop-arc'

type TodayHeroCardProps = {
  loading: boolean
  nutrition: NutritionSummary | null
  calendarItems: CalendarItem[] | null
  todayTasks: DailyTask[] | null
  overdueCount: number
  hydration: HydrationData | null
  focusMinutesToday: number
  focusRunning: boolean
  /** Minutes slept on the night that ended this morning; null when unlogged. */
  sleepMinutesToday: number | null
  /** Today's mood check-in, 1–5. */
  moodScore: number | null
  /** Workouts recorded today, and the first one's name for the row's sub-label. */
  workoutsToday: number
  workoutLabel: string | null
  /** Learning entries logged today. */
  learningsToday: number
  /** Today's meal-quality aggregate from the nutrition summary. */
  mealQuality: MealQualityDay | null
  onAddWater: () => void
  onStartFocus: () => void
  onLogSleep: () => void
  onCheckInMood: () => void
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
  mood: Smile,
  movement: Footprints,
  learning: BookOpen,
  fuel: Utensils,
}

/** One loop signal: label + value + its own bar, tappable straight through to the fix. */
function LoopRow({
  metric,
  onClick,
  onHover,
}: {
  metric: LoopMetric
  onClick: () => void
  onHover: (id: LoopMetricId | null) => void
}) {
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
      onMouseEnter={() => onHover(metric.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(metric.id)}
      onBlur={() => onHover(null)}
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

/** A signal the loop doesn't score but the day still runs on — compact, still tappable. */
function SupportChip({
  accent,
  icon,
  label,
  value,
  sub,
  ratio,
  onClick,
}: {
  accent: 'focus' | 'tasks' | 'water' | 'kcal'
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  ratio: number
  onClick: () => void
}) {
  return (
    <button type="button" className={cn('home-support-chip', `home-support--${accent}`)} onClick={onClick}>
      <span className="home-support-label">
        {icon} {label}
      </span>
      <span className="home-support-value">
        {value}
        {sub && <em>{sub}</em>}
      </span>
      <span className="home-support-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }} />
      </span>
    </button>
  )
}

function TodayHeroCard({
  loading,
  nutrition,
  calendarItems,
  todayTasks,
  overdueCount,
  hydration,
  focusMinutesToday,
  focusRunning,
  sleepMinutesToday,
  moodScore,
  workoutsToday,
  workoutLabel,
  learningsToday,
  mealQuality,
  onAddWater,
  onStartFocus,
  onLogSleep,
  onCheckInMood,
  onNavigate,
  onCelebrate,
}: TodayHeroCardProps) {
  const [hoveredId, setHoveredId] = useState<LoopMetricId | null>(null)

  // The loop is computed unconditionally so the celebration effect below can watch
  // it even while the skeleton is showing.
  const metrics = buildDayLoop({
    sleepMinutes: sleepMinutesToday,
    moodScore,
    workouts: workoutsToday,
    workoutLabel,
    learnings: learningsToday,
    meal: mealQuality,
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
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="home-skel" style={{ height: 54, borderRadius: 16 }} />
            ))}
          </div>
          <span className="home-skel home-next-strip-skel" />
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
  const laterCount = Math.max(upcoming.length - 1, 0)

  // Support signals — shown, but outside the loop score.
  const tasksDone = (todayTasks ?? []).filter((t) => t.completed).length
  const tasksTotal = (todayTasks ?? []).length
  const waterMl = hydration?.waterIntakeMl ?? 0
  const waterTarget = hydration?.targetMl ?? 3000
  const calories = nutrition?.todayTotalCalories ?? 0
  const calorieGoal = nutrition?.calorieGoal ?? 0

  const openRoute: Record<LoopMetricId, () => void> = {
    sleep: onLogSleep,
    mood: onCheckInMood,
    movement: () => onNavigate('/workouts'),
    learning: () => onNavigate('/learnings'),
    fuel: () => onNavigate('/nutrition'),
  }

  return (
    <section className="home-card home-card--hero" aria-label="Today at a glance">
      <div className="ntr-card-head home-hero-head">
        <div>
          <p className="ntr-eyebrow">Today · Day loop</p>
          <h2>{loopPhrase(dayScore, now.getHours())}</h2>
        </div>
        {/* No focus-session pill here — the running state already shows on the
            gauge button and the Focus chip, so a third copy just repeats itself. */}
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
              segments={metrics.map((m) => ({ id: m.id, label: m.label, ratio: m.ratio, done: m.done }))}
              score={dayScore}
              centerSub="of today's loop"
              activeId={hoveredId ?? nudge?.id ?? null}
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
            <LoopRow key={metric.id} metric={metric} onClick={openRoute[metric.id]} onHover={setHoveredId} />
          ))}
        </div>

        {/* Below the line: the day's other counters. They move with what the day
            demanded rather than with the same daily ask, so they inform the loop
            without scoring it — and stay one tap from where they're logged. */}
        <div className="home-support-strip">
          <SupportChip
            accent="focus"
            icon={<FocusFlame size={10} strokeWidth={2.6} />}
            label="Focus"
            value={formatMinutes(focusMinutesToday)}
            sub={focusRunning ? ' live' : ` /${formatMinutes(FOCUS_TARGET_MINUTES)}`}
            ratio={focusMinutesToday / FOCUS_TARGET_MINUTES}
            onClick={onStartFocus}
          />
          <SupportChip
            accent="tasks"
            icon={<CheckSquare size={10} strokeWidth={2.6} />}
            label="Tasks"
            value={tasksTotal > 0 ? `${tasksDone}` : '—'}
            sub={tasksTotal > 0 ? ` /${tasksTotal}` : ' clear'}
            ratio={tasksTotal > 0 ? tasksDone / tasksTotal : 1}
            onClick={() => onNavigate('/tasks')}
          />
          <SupportChip
            accent="water"
            icon={<Droplets size={10} strokeWidth={2.6} />}
            label="Water"
            value={waterMl.toLocaleString()}
            sub=" tap +250"
            ratio={waterMl / Math.max(waterTarget, 1)}
            onClick={onAddWater}
          />
          <SupportChip
            accent="kcal"
            icon={<Utensils size={10} strokeWidth={2.6} />}
            label="Calories"
            value={calorieGoal > 0 ? calories.toLocaleString() : '—'}
            sub={calorieGoal > 0 ? ` /${calorieGoal.toLocaleString()}` : ' no goal'}
            ratio={calorieGoal > 0 ? calories / calorieGoal : 0}
            onClick={() => onNavigate('/nutrition')}
          />
        </div>

        {/* Full-width agenda strip — title gets its own line so long event
            names ellipsize instead of crushing the time label. */}
        <button type="button" className="home-next-strip" onClick={() => onNavigate('/calendar')}>
          <span className="home-next-ic" aria-hidden="true">
            <CalendarClock size={14} />
          </span>
          <span className="home-next-text">
            {nextEvent ? (
              <>
                <small>
                  Up next · {formatTimeLabel(nextEvent.startTime)}
                  {nextEvent.endTime ? ` – ${formatTimeLabel(nextEvent.endTime)}` : ''}
                </small>
                <b>{nextEvent.title}</b>
              </>
            ) : (
              <>
                <small>Today's runway</small>
                <b>Nothing scheduled — open space ahead</b>
              </>
            )}
          </span>
          {laterCount > 0 && <span className="home-next-more">+{laterCount} later</span>}
          <ArrowRight className="home-next-go" size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

export { TodayHeroCard }
