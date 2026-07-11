import { CalendarClock, CheckSquare, Droplets, Flame as FocusFlame, Utensils } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { useCountUp } from '../../../../hooks/use-count-up'
import { ArcGauge } from '../../nutrition-overview/components/arc-gauge'
import type { NutritionSummary } from '../home-types'
import { formatMinutes, formatTimeLabel, FOCUS_TARGET_MINUTES } from '../home-types'

type TodayHeroCardProps = {
  loading: boolean
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
  accent: 'tasks' | 'water' | 'fuel'
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
  focusRunning,
  onAddWater,
  onStartFocus,
  onNavigate,
}: TodayHeroCardProps) {
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
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className="home-skel" style={{ height: 58, borderRadius: 16 }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Next upcoming, non-cancelled item with a start time still ahead of now.
  const now = new Date()
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const nextEvent = (calendarItems ?? [])
    .filter((item) => !item.cancelled && !item.completed && item.startTime && item.startTime >= nowHm)
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))[0]

  const tasksDone = (todayTasks ?? []).filter((t) => t.completed).length
  const tasksTotal = (todayTasks ?? []).length

  const waterMl = hydration?.waterIntakeMl ?? 0
  const waterTarget = hydration?.targetMl ?? 3000

  const calories = nutrition?.todayTotalCalories ?? 0
  const calorieGoal = nutrition?.calorieGoal ?? 0

  const focusPct = Math.round((focusMinutesToday / FOCUS_TARGET_MINUTES) * 100)

  return (
    <section className="home-card home-card--hero" aria-label="Today at a glance">
      <div className="ntr-card-head home-hero-head">
        <div>
          <p className="ntr-eyebrow">Today · Focus loop</p>
          <h2>{focusPct}% of focus goal reached</h2>
        </div>
        {focusRunning ? (
          <span className="ntr-pill dark home-pill-live">
            <i className="home-live-dot" aria-hidden="true" />
            Session running
          </span>
        ) : (
          <span className="ntr-pill dark">
            <CheckSquare size={12} strokeWidth={2.5} />
            {tasksDone} of {tasksTotal || '—'} tasks
          </span>
        )}
      </div>

      <div className="home-hero-panel">
        <div className="home-hero-gauge-col">
          <div className={cn('ntr-gauge-wrap', focusRunning && 'is-live')}>
            <ArcGauge
              value={focusMinutesToday}
              target={FOCUS_TARGET_MINUTES}
              format={(v) => formatMinutes(v)}
              centerSub={`of ${formatMinutes(FOCUS_TARGET_MINUTES)} focus`}
            />
            <span className="ntr-gauge-badge">{focusPct}%</span>
          </div>
          <button type="button" className="home-hero-focus-btn" onClick={onStartFocus}>
            <FocusFlame size={12} />
            {focusRunning ? 'Session running' : 'Start focus'}
          </button>
        </div>

        <div className="ntr-hero-macros">
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
            sub={`/${waterTarget.toLocaleString()}ml · tap +250`}
            onClick={onAddWater}
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

          <button type="button" className="home-hero-next" onClick={() => onNavigate('/calendar')}>
            <span className="home-hero-next-ic">
              <CalendarClock size={13} />
            </span>
            {nextEvent ? (
              <>
                <b>Next up · {nextEvent.title}</b>
                <small>
                  {formatTimeLabel(nextEvent.startTime)}
                  {nextEvent.endTime ? ` – ${formatTimeLabel(nextEvent.endTime)}` : ''}
                </small>
              </>
            ) : (
              <>
                <b>Nothing scheduled</b>
                <small>open space ahead</small>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}

export { TodayHeroCard }
