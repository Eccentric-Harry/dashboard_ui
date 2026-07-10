import type { CSSProperties } from 'react'
import { CalendarClock, CheckSquare, Droplets, Flame as FocusFlame, Plus, Timer } from 'lucide-react'
import type { CalendarItem, DailyTask, HydrationData } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
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
  focusRunning: boolean
  onAddWater: () => void
  onStartFocus: () => void
  onNavigate: (path: AppPath, search?: string) => void
}

function MiniRing({ value, target, label, className }: { value: number; target: number; label: string; className?: string }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const ratio = target > 0 ? Math.min(value / target, 1) : 0
  return (
    <div
      className={cn('home-mini-ring', ratio > 0 && 'has-progress', className)}
      style={{ '--ring-offset': circumference - ratio * circumference, '--ring-circ': circumference } as CSSProperties}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} className="track" />
        <circle cx="32" cy="32" r={radius} className="value" strokeDasharray={circumference} />
      </svg>
      <span className="home-mini-ring-center">
        <b>{target > 0 ? Math.round((value / target) * 100) : 0}%</b>
        <small>{label}</small>
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
        <div className="home-hero-row">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="home-hero-tile is-skeleton">
              <span className="home-skel home-skel--dot" />
              <span className="home-skel home-skel--line" />
              <span className="home-skel home-skel--line short" />
            </div>
          ))}
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
  const protein = nutrition?.todayTotalProtein ?? 0
  const proteinGoal = nutrition?.proteinGoal ?? 0
  const proteinRatio = proteinGoal > 0 ? Math.min(protein / proteinGoal, 1) : 0

  return (
    <section className="home-card home-card--hero" aria-label="Today at a glance">
      <div className="home-hero-row">
        <button type="button" className="home-hero-tile" onClick={() => onNavigate('/nutrition')}>
          <span className="home-tile-eyebrow">Fuel</span>
          {nutrition ? (
            <div className="home-hero-fuel">
              <MiniRing value={calories} target={calorieGoal} label="kcal" />
              <div className="home-hero-fuel-meta">
                <b>{calories.toLocaleString()}</b>
                <small>of {calorieGoal.toLocaleString()} kcal</small>
                <span className="home-protein-bar" aria-label={`Protein ${protein} of ${proteinGoal} grams`}>
                  <i style={{ width: `${proteinRatio * 100}%` }} />
                </span>
                <small>
                  {protein}g / {proteinGoal}g protein
                </small>
              </div>
            </div>
          ) : (
            <p className="home-tile-empty">Log your first meal to light this up.</p>
          )}
        </button>

        <button type="button" className="home-hero-tile" onClick={() => onNavigate('/calendar')}>
          <span className="home-tile-eyebrow">
            <CalendarClock size={12} /> Next up
          </span>
          {nextEvent ? (
            <>
              <b className="home-tile-big home-tile-big--truncate">{nextEvent.title}</b>
              <small className="home-tile-sub">
                {formatTimeLabel(nextEvent.startTime)}
                {nextEvent.endTime ? ` – ${formatTimeLabel(nextEvent.endTime)}` : ''}
              </small>
            </>
          ) : (
            <p className="home-tile-empty">Nothing scheduled — open space.</p>
          )}
        </button>

        <button type="button" className="home-hero-tile" onClick={() => onNavigate('/tasks')}>
          <span className="home-tile-eyebrow">
            <CheckSquare size={12} /> Tasks
          </span>
          {tasksTotal > 0 ? (
            <b className="home-tile-big">
              {tasksDone} <em>of {tasksTotal} today</em>
            </b>
          ) : (
            <p className="home-tile-empty">A clear list. Add one if something's looming.</p>
          )}
          {overdueCount > 0 ? (
            <span className="home-overdue-chip">
              {overdueCount} overdue
            </span>
          ) : (
            tasksTotal > 0 && <small className="home-tile-sub home-tile-sub--calm">on track</small>
          )}
        </button>

        <div className="home-hero-tile home-hero-tile--static">
          <span className="home-tile-eyebrow">
            <Droplets size={12} /> Water
          </span>
          <div className="home-hero-fuel">
            <MiniRing value={waterMl} target={waterTarget} label="ml" className="home-mini-ring--water" />
            <div className="home-hero-fuel-meta">
              <b>{waterMl.toLocaleString()}</b>
              <small>of {waterTarget.toLocaleString()} ml</small>
              <button type="button" className="home-tile-action" onClick={onAddWater}>
                <Plus size={12} /> 250ml
              </button>
            </div>
          </div>
        </div>

        <div className="home-hero-tile home-hero-tile--static">
          <span className="home-tile-eyebrow">
            <Timer size={12} /> Focus
          </span>
          <b className="home-tile-big">
            {focusMinutesToday > 0 ? formatMinutes(focusMinutesToday) : '0m'} <em>today</em>
          </b>
          <button type="button" className="home-tile-action home-tile-action--dark" onClick={onStartFocus}>
            <FocusFlame size={12} /> {focusRunning ? 'Session running' : 'Start focus'}
          </button>
        </div>
      </div>
    </section>
  )
}

export { TodayHeroCard }
