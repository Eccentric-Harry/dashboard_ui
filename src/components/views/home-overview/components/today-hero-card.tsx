import { useEffect, useRef } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckSquare, Droplets, Flame as FocusFlame, Utensils } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { useCountUp } from '../../../../hooks/use-count-up'
import { ArcGauge } from '../../nutrition-overview/components/arc-gauge'
import type { NutritionSummary } from '../home-types'
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  formatMinutes,
  formatTimeLabel,
  FOCUS_TARGET_MINUTES,
  greetingFor,
} from '../home-types'

type TodayHeroCardProps = {
  loading: boolean
  /** ISO date the page is showing — drives the weekday/month line. */
  dateIso: string
  nutrition: NutritionSummary | null
  calendarItems: CalendarItem[] | null
  todayTasks: DailyTask[] | null
  overdueCount: number
  hydration: HydrationData | null
  focusMinutesToday: number
  focusRunning: boolean
  onAddWater: () => void
  onStartFocus: () => void
  onNavigate: (path: AppPath, search?: string) => void
  /** Fires once when today's loop first reaches 100%. */
  onCelebrate?: () => void
}

/** Sub-line per score band — progress phrased as a story, never a shortfall. */
function loopPhrase(score: number, hour: number): string {
  if (score <= 0) return hour < 12 ? 'The day is wide open.' : 'Still time to make a mark.'
  if (score < 25) return 'First marks on the page.'
  if (score < 50) return 'Momentum is building.'
  if (score < 75) return 'Past the halfway mark.'
  if (score < 100) return 'Closing the loop.'
  return 'Loop closed. Take a bow.'
}

/** One loop tile — frosted chip on the dark hero, with its domain accent. */
function HeroLoopTile({
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
  const pct = Math.round(ratio * 100)
  return (
    <button
      type="button"
      className={cn('home-loop-tile', `home-loop--${accent}`, pct >= 100 && 'is-full')}
      aria-label={`${label}: ${display}${sub ? ` ${sub}` : ''}`}
      onClick={onClick}
    >
      <span className="home-loop-tile-top">
        <span className="home-loop-ic" aria-hidden="true">
          {icon}
        </span>
        <span className="home-loop-label">{label}</span>
        {badge}
      </span>
      <span className="home-loop-value">
        {display}
        {sub && <em>{sub}</em>}
      </span>
      <span className="home-loop-bar" aria-hidden="true">
        <i style={{ width: `${ratio * 100}%` }} />
      </span>
    </button>
  )
}

/** Thin rail showing how much of the waking day (06:00–23:00) has burned. */
function DayRail({ now }: { now: Date }) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const span = DAY_END_MINUTES - DAY_START_MINUTES
  const elapsed = Math.min(Math.max(minutes - DAY_START_MINUTES, 0), span)
  const pct = (elapsed / span) * 100
  const left = span - elapsed

  return (
    <div className="home-day-rail">
      <span className="home-day-rail-track" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
        <b style={{ left: `${pct}%` }} />
      </span>
      <small>
        {left > 0 ? `${formatMinutes(left)} of the day left` : 'The day is done — rest counts too'}
      </small>
    </div>
  )
}

function TodayHeroCard({
  loading,
  dateIso,
  nutrition,
  calendarItems,
  todayTasks,
  overdueCount,
  hydration,
  focusMinutesToday,
  focusRunning,
  onAddWater,
  onStartFocus,
  onNavigate,
  onCelebrate,
}: TodayHeroCardProps) {
  // Composite "day loop" score, computed unconditionally so the celebration
  // effect below can watch it even while the skeleton is showing.
  const tasksDone = (todayTasks ?? []).filter((t) => t.completed).length
  const tasksTotal = (todayTasks ?? []).length
  const waterMl = hydration?.waterIntakeMl ?? 0
  const waterTarget = hydration?.targetMl ?? 3000
  const calories = nutrition?.todayTotalCalories ?? 0
  const calorieGoal = nutrition?.calorieGoal ?? 0
  const scoreRatios: number[] = [Math.min(focusMinutesToday / FOCUS_TARGET_MINUTES, 1)]
  if (tasksTotal > 0) scoreRatios.push(Math.min(tasksDone / tasksTotal, 1))
  scoreRatios.push(Math.min(waterMl / Math.max(waterTarget, 1), 1))
  if (calorieGoal > 0) scoreRatios.push(Math.min(calories / calorieGoal, 1))
  const dayScore = Math.round((scoreRatios.reduce((sum, r) => sum + r, 0) / scoreRatios.length) * 100)

  const prevScoreRef = useRef(dayScore)
  useEffect(() => {
    if (!loading && dayScore >= 100 && prevScoreRef.current < 100) {
      onCelebrate?.()
    }
    prevScoreRef.current = dayScore
  }, [dayScore, loading, onCelebrate])

  const now = new Date()
  const hour = now.getHours()
  const name = (localStorage.getItem('displayName') || 'friend').split(' ')[0]
  const date = new Date(`${dateIso}T00:00:00`)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  // Upcoming, non-cancelled items with a start time still ahead of now.
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const upcoming = (calendarItems ?? [])
    .filter((item) => !item.cancelled && !item.completed && item.startTime && item.startTime >= nowHm)
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const nextEvent = upcoming[0]
  const laterCount = Math.max(upcoming.length - 1, 0)

  return (
    <section
      className={cn('home-card home-card--hero', dayScore >= 100 && 'is-complete')}
      aria-label="Today at a glance"
    >
      <span className="home-hero-aurora" aria-hidden="true" />
      <span className="home-hero-grain" aria-hidden="true" />

      <header className="home-hero-head">
        <div className="home-hero-greet">
          <p className="home-hero-date">
            <em>{weekday},</em> {monthDay}
          </p>
          <h2>
            {greetingFor(hour)}, {name}
          </h2>
          <p className="home-hero-sub">{loading ? 'Pulling your day together…' : loopPhrase(dayScore, hour)}</p>
        </div>

        {/* A running session is already announced by the button under the
            ring — the pill skips it and shows the next thing that needs you. */}
        {overdueCount > 0 ? (
          <span className="home-hero-pill is-urgent">
            <AlertTriangle size={12} strokeWidth={2.5} />
            {overdueCount} overdue
          </span>
        ) : nextEvent ? (
          <span className="home-hero-pill">
            <CalendarClock size={12} strokeWidth={2.5} />
            Next · {formatTimeLabel(nextEvent.startTime)}
          </span>
        ) : (
          <span className="home-hero-pill">
            <CheckSquare size={12} strokeWidth={2.5} />
            All caught up
          </span>
        )}
      </header>

      <DayRail now={now} />

      {loading ? (
        <div className="home-hero-body is-skeleton">
          <div className="home-hero-gauge-col">
            <span className="home-skel" style={{ width: 186, height: 186, borderRadius: '50%' }} />
          </div>
          <div className="home-loop-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="home-skel" style={{ height: 76, borderRadius: 18 }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="home-hero-body">
          <div className="home-hero-gauge-col">
            <div className={cn('ntr-gauge-wrap', focusRunning && 'is-live')}>
              <ArcGauge value={dayScore} target={100} format={(v) => `${v}%`} centerSub="of today's loop" />
            </div>
            <button type="button" className="home-hero-focus-btn" onClick={onStartFocus}>
              <FocusFlame size={12} />
              {focusRunning ? 'Session running' : 'Start focus'}
            </button>
          </div>

          <div className="home-loop-grid">
            <HeroLoopTile
              accent="focus"
              icon={<FocusFlame size={11} strokeWidth={2.6} />}
              label="Focus"
              value={focusMinutesToday}
              target={FOCUS_TARGET_MINUTES}
              display={formatMinutes(focusMinutesToday)}
              sub={`/${formatMinutes(FOCUS_TARGET_MINUTES)}${focusRunning ? ' · live' : ''}`}
              onClick={onStartFocus}
            />
            <HeroLoopTile
              accent="tasks"
              icon={<CheckSquare size={11} strokeWidth={2.6} />}
              label="Tasks"
              value={tasksDone}
              target={Math.max(tasksTotal, 1)}
              display={tasksTotal > 0 ? `${tasksDone}` : 'Clear'}
              sub={tasksTotal > 0 ? `/${tasksTotal} done` : undefined}
              onClick={() => onNavigate('/tasks')}
              badge={overdueCount > 0 ? <span className="home-overdue-chip">{overdueCount} late</span> : undefined}
            />
            <HeroLoopTile
              accent="water"
              icon={<Droplets size={11} strokeWidth={2.6} />}
              label="Water"
              value={waterMl}
              target={waterTarget}
              display={waterMl.toLocaleString()}
              sub={`/${waterTarget.toLocaleString()}ml`}
              onClick={onAddWater}
              badge={<span className="home-tap-chip">+250</span>}
            />
            <HeroLoopTile
              accent="fuel"
              icon={<Utensils size={11} strokeWidth={2.6} />}
              label="Fuel"
              value={calories}
              target={calorieGoal}
              display={calorieGoal > 0 ? calories.toLocaleString() : 'Log a meal'}
              sub={calorieGoal > 0 ? `/${calorieGoal.toLocaleString()} kcal` : undefined}
              onClick={() => onNavigate('/nutrition')}
            />
          </div>
        </div>
      )}

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
    </section>
  )
}

export { TodayHeroCard }
