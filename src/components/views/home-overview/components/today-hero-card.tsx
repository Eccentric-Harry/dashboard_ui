import { useEffect, useRef } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckSquare, Droplets, Flame as FocusFlame, Utensils } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { useCountUp } from '../../../../hooks/use-count-up'
import type { NutritionSummary } from '../home-types'
import { formatMinutes, formatTimeLabel } from '../home-types'

type TodayHeroCardProps = {
  loading: boolean
  nutrition: NutritionSummary | null
  calendarItems: CalendarItem[] | null
  todayTasks: DailyTask[] | null
  overdueCount: number
  hydration: HydrationData | null
  focusMinutesToday: number
  /** The user's focus target from their profile (resolved, minutes). */
  focusTargetMinutes: number
  focusRunning: boolean
  onAddWater: () => void
  onStartFocus: () => void
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

/** One stacked loop bar — the Nutrition macro-row component re-aimed at a daily loop. */
function HeroLoopRow({
  accent,
  icon,
  label,
  value,
  target,
  display,
  sub,
  onClick,
  badge,
}: {
  accent: 'focus' | 'tasks' | 'water' | 'fuel'
  icon: React.ReactNode
  label: string
  value: number
  target: number
  display: string
  sub?: string
  onClick: () => void
  badge?: React.ReactNode
}) {
  const animated = useCountUp(value)
  const ratio = target > 0 ? Math.min(animated / target, 1) : 0
  return (
    <div
      className={cn('ntr-macro-row', `home-loop--${accent}`)}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${display}${sub ? ` ${sub}` : ''}`}
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
          {icon} {label}
          {badge}
        </p>
        <strong>
          {display}
          {sub && <em> {sub}</em>}
        </strong>
      </div>
      <span className="ntr-macro-bar" aria-hidden="true">
        <i style={{ width: `${ratio * 100}%` }} />
      </span>
    </div>
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
  focusTargetMinutes,
  focusRunning,
  onAddWater,
  onStartFocus,
  onNavigate,
  onCelebrate,
}: TodayHeroCardProps) {
  // Composite "day loop" score, computed unconditionally so the celebration
  // effect below can watch it even while the skeleton is showing.
  const tasksDoneAll = (todayTasks ?? []).filter((t) => t.completed).length
  const tasksTotalAll = (todayTasks ?? []).length
  const waterMlAll = hydration?.waterIntakeMl ?? 0
  const waterTargetAll = hydration?.targetMl ?? 3000
  const caloriesAll = nutrition?.todayTotalCalories ?? 0
  const calorieGoalAll = nutrition?.calorieGoal ?? 0
  const scoreRatios: number[] = [Math.min(focusMinutesToday / Math.max(focusTargetMinutes, 1), 1)]
  if (tasksTotalAll > 0) scoreRatios.push(Math.min(tasksDoneAll / tasksTotalAll, 1))
  scoreRatios.push(Math.min(waterMlAll / Math.max(waterTargetAll, 1), 1))
  if (calorieGoalAll > 0) scoreRatios.push(Math.min(caloriesAll / calorieGoalAll, 1))
  const dayScore = Math.round((scoreRatios.reduce((sum, r) => sum + r, 0) / scoreRatios.length) * 100)

  const prevScoreRef = useRef(dayScore)
  useEffect(() => {
    if (!loading && dayScore >= 100 && prevScoreRef.current < 100) {
      onCelebrate?.()
    }
    prevScoreRef.current = dayScore
  }, [dayScore, loading, onCelebrate])

  if (loading) {
    return (
      <section className="home-card home-card--hero home-card--also" aria-label="Also today">
        <div className="ntr-card-head home-hero-head">
          <div>
            <p className="ntr-eyebrow">Also today</p>
            <span className="home-skel home-skel--title" style={{ width: 200, marginTop: 6 }} />
          </div>
        </div>
        <div className="home-hero-panel home-also-panel is-skeleton">
          <div className="ntr-hero-macros">
            {Array.from({ length: 4 }, (_, i) => (
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

  // Aliases so the JSX below reads the same as before the hoist.
  const tasksDone = tasksDoneAll
  const tasksTotal = tasksTotalAll
  const waterMl = waterMlAll
  const waterTarget = waterTargetAll
  const calories = caloriesAll
  const calorieGoal = calorieGoalAll

  return (
    <section className="home-card home-card--hero home-card--also" aria-label="Also today">
      <div className="ntr-card-head home-hero-head">
        <div>
          <p className="ntr-eyebrow">Also today · {dayScore}% of the loop</p>
          <h2 className="home-card-title">{loopPhrase(dayScore, now.getHours())}</h2>
        </div>
        {focusRunning ? (
          <span className="ntr-pill dark home-pill-live">
            <i className="home-live-dot" aria-hidden="true" />
            Session running
          </span>
        ) : overdueCount > 0 ? (
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

      {/* Demoted to the ALSO TODAY strip: the loop rows and runway keep
          working at reduced weight; the big gauge ceded the hero to the
          Non-Negotiables rings, its score lives on in the eyebrow. */}
      <div className={cn('home-hero-panel', 'home-also-panel', dayScore >= 100 && 'is-complete')}>
        <div className="ntr-hero-macros">
          <HeroLoopRow
            accent="focus"
            icon={<FocusFlame size={11} strokeWidth={2.5} />}
            label="Focus"
            value={focusMinutesToday}
            target={focusTargetMinutes}
            display={formatMinutes(focusMinutesToday)}
            sub={`/${formatMinutes(focusTargetMinutes)}${focusRunning ? ' · live' : ''}`}
            onClick={onStartFocus}
          />
          <HeroLoopRow
            accent="tasks"
            icon={<CheckSquare size={11} strokeWidth={2.5} />}
            label="Tasks"
            value={tasksDone}
            target={Math.max(tasksTotal, 1)}
            display={tasksTotal > 0 ? `${tasksDone}` : 'Clear list'}
            sub={tasksTotal > 0 ? `/${tasksTotal} done` : undefined}
            onClick={() => onNavigate('/tasks')}
            badge={overdueCount > 0 ? <span className="home-overdue-chip">{overdueCount} overdue</span> : undefined}
          />
          <HeroLoopRow
            accent="water"
            icon={<Droplets size={11} strokeWidth={2.5} />}
            label="Water"
            value={waterMl}
            target={waterTarget}
            display={waterMl.toLocaleString()}
            sub={`/${waterTarget.toLocaleString()}ml`}
            onClick={onAddWater}
            badge={<span className="home-tap-chip">tap +250</span>}
          />
          <HeroLoopRow
            accent="fuel"
            icon={<Utensils size={11} strokeWidth={2.5} />}
            label="Fuel"
            value={calories}
            target={calorieGoal}
            display={calorieGoal > 0 ? calories.toLocaleString() : 'Log a meal'}
            sub={calorieGoal > 0 ? `/${calorieGoal.toLocaleString()} kcal` : undefined}
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
