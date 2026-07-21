import { createElement, useMemo } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bike,
  Dumbbell,
  Footprints,
  Mountain,
  PersonStanding,
  Timer,
  Waves,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StravaActivity, StravaActivityStats } from '../../../../lib/api'
import type { AppPath } from '../../../dashboard/quantified-self-dashboard/data'
import { cn } from '../../../../lib/utils'
import { formatMinutes } from '../home-types'

type ActivityCardProps = {
  loading: boolean
  failed: boolean
  activities: StravaActivity[] | null
  stats: StravaActivityStats | null
  /** Last 7 dates, oldest → newest, shared with the rest of Home. */
  weekDates: string[]
  today: string
  onNavigate: (path: AppPath, search?: string) => void
  onRetry: () => void
}

const SPORT_ICONS: Record<string, LucideIcon> = {
  Run: Footprints,
  Ride: Bike,
  'E-Bike Ride': Zap,
  Walk: PersonStanding,
  Hike: Mountain,
  Swim: Waves,
  Workout: Dumbbell,
  WeightTraining: Dumbbell,
}

function sportIcon(sportType: string): LucideIcon {
  return SPORT_ICONS[sportType] ?? Activity
}

/** "5:26/km" for foot sports, "24.1 km/h" for wheels — the read people expect. */
function paceOrSpeed(activity: StravaActivity): { value: string; label: string } | null {
  const wheeled = activity.sportType === 'Ride' || activity.sportType === 'E-Bike Ride'
  if (wheeled) {
    if (!activity.distanceKm || !activity.movingTimeMinutes) return null
    const kmh = activity.distanceKm / (activity.movingTimeMinutes / 60)
    return { value: `${kmh.toFixed(1)}`, label: 'km/h avg' }
  }
  if (!activity.paceMinPerKm) return null
  const mins = Math.floor(activity.paceMinPerKm)
  const secs = Math.round((activity.paceMinPerKm - mins) * 60)
  return { value: `${mins}:${String(secs).padStart(2, '0')}`, label: 'min/km' }
}

/** "Today" / "Yesterday" / "Sat · 19 Jul" — never a bare ISO string. */
function whenLabel(dateIso: string, today: string): string {
  if (dateIso === today) return 'Today'
  const date = new Date(`${dateIso}T00:00:00`)
  const diffDays = Math.round((new Date(`${today}T00:00:00`).getTime() - date.getTime()) / 86400000)
  if (diffDays === 1) return 'Yesterday'
  const weekday = date.toLocaleDateString('en', { weekday: 'short' })
  const day = date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
  return diffDays < 7 ? `${weekday} · ${day}` : day
}

function ActivityCard({
  loading,
  failed,
  activities,
  stats,
  weekDates,
  today,
  onNavigate,
  onRetry,
}: ActivityCardProps) {
  const sorted = useMemo(
    () =>
      [...(activities ?? [])].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date)
        return byDate !== 0 ? byDate : (b.startTime ?? '').localeCompare(a.startTime ?? '')
      }),
    [activities],
  )
  const latest = sorted[0] ?? null

  // This week's slice — sessions, distance, and which days actually moved.
  const week = useMemo(() => {
    const inWeek = sorted.filter((a) => weekDates.includes(a.date))
    const byDate = new Map<string, number>()
    for (const a of inWeek) byDate.set(a.date, (byDate.get(a.date) ?? 0) + 1)
    return {
      sessions: inWeek.length,
      distanceKm: inWeek.reduce((sum, a) => sum + (a.distanceKm ?? 0), 0),
      minutes: inWeek.reduce((sum, a) => sum + (a.movingTimeMinutes ?? 0), 0),
      byDate,
    }
  }, [sorted, weekDates])

  if (loading) {
    return (
      <section className="home-card home-card--activity" aria-label="Movement">
        <header className="home-card-head">
          <div>
            <span className="home-card-eyebrow">Movement</span>
            <span className="home-skel home-skel--title" style={{ width: 170, marginTop: 6 }} />
          </div>
        </header>
        <div className="home-activity-body">
          <span className="home-skel" style={{ height: 128, borderRadius: 20 }} />
          <span className="home-skel" style={{ height: 128, borderRadius: 20 }} />
        </div>
      </section>
    )
  }

  const metric = latest ? paceOrSpeed(latest) : null

  return (
    <section className="home-card home-card--activity" aria-label="Movement">
      <Activity className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Movement</span>
          <h2 className="home-card-title">{latest ? 'Latest activity' : 'Nothing logged yet'}</h2>
        </div>
        {!failed && (
          <button type="button" className="home-btn-quiet" onClick={() => onNavigate('/workouts')}>
            All workouts <ArrowUpRight size={13} />
          </button>
        )}
      </header>

      {failed ? (
        <div className="home-card-empty">
          <p>Couldn't load activities right now.</p>
          <button type="button" className="home-btn-quiet" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : !latest ? (
        <div className="home-card-empty">
          <p>No activity recorded yet. Import a Strava run or log one by hand and it shows up here.</p>
          <button type="button" className="home-btn-quiet" onClick={() => onNavigate('/workouts')}>
            Open workouts
          </button>
        </div>
      ) : (
        <div className="home-activity-body">
          {/* Latest session — the hero half */}
          <button
            type="button"
            className="home-activity-latest"
            onClick={() => onNavigate('/workouts')}
            aria-label={`Latest activity: ${latest.activityName}`}
          >
            <span className="home-activity-top">
              <span className="home-activity-ic" aria-hidden="true">
                {/* createElement, not a capitalised local: the sport type is
                    data, and a component built during render trips the
                    react-hooks/static-components rule. */}
                {createElement(sportIcon(latest.sportType), { size: 15, strokeWidth: 2.4 })}
              </span>
              <span className="home-activity-name">
                <b>{latest.activityName}</b>
                <small>
                  {whenLabel(latest.date, today)}
                  {latest.startTime ? ` · ${latest.startTime}` : ''}
                </small>
              </span>
              <span className="home-activity-sport">{latest.sportType}</span>
            </span>

            <span className="home-activity-headline">
              <strong>{latest.distanceKm > 0 ? latest.distanceKm.toFixed(2) : latest.movingTime}</strong>
              <em>{latest.distanceKm > 0 ? 'km' : 'moving'}</em>
            </span>

            <span className="home-activity-metrics">
              <span className="home-activity-metric">
                <span>time</span>
                <b>{latest.movingTime}</b>
              </span>
              {metric && (
                <span className="home-activity-metric">
                  <span>{metric.label}</span>
                  <b>{metric.value}</b>
                </span>
              )}
              <span className="home-activity-metric">
                <span>climb</span>
                <b>{Math.round(latest.elevationGainMeters)} m</b>
              </span>
            </span>
          </button>

          {/* This week — the pattern half */}
          <div className="home-activity-week">
            <p className="home-activity-week-head">
              <span>This week</span>
              <b>
                {week.sessions} {week.sessions === 1 ? 'session' : 'sessions'}
              </b>
            </p>

            <div className="home-activity-strip" role="list" aria-label="Activity by day this week">
              {weekDates.map((date) => {
                const count = week.byDate.get(date) ?? 0
                const label = new Date(`${date}T00:00:00`).toLocaleDateString('en', { weekday: 'narrow' })
                return (
                  <span
                    key={date}
                    role="listitem"
                    className={cn(
                      'home-activity-day',
                      count > 0 && 'is-on',
                      date === today && 'is-today',
                    )}
                    title={`${date} · ${count} ${count === 1 ? 'activity' : 'activities'}`}
                  >
                    <i aria-hidden="true" />
                    {label}
                  </span>
                )
              })}
            </div>

            <div className="home-activity-stats">
              <span className="home-activity-stat">
                <span>distance</span>
                <b>{week.distanceKm > 0 ? `${week.distanceKm.toFixed(1)} km` : '—'}</b>
              </span>
              <span className="home-activity-stat">
                <span>moving</span>
                <b>{week.minutes > 0 ? formatMinutes(week.minutes) : '—'}</b>
              </span>
              <span className="home-activity-stat">
                <span>streak</span>
                <b>
                  {stats?.currentStreakWeeks
                    ? `${stats.currentStreakWeeks} ${stats.currentStreakWeeks === 1 ? 'wk' : 'wks'}`
                    : '—'}
                </b>
              </span>
            </div>

            {stats?.best5kPaceFormatted && stats.best5kPaceFormatted !== '—' && (
              <p className="home-activity-foot">
                <Timer size={11} strokeWidth={2.5} />
                Best 5k pace {stats.best5kPaceFormatted}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export { ActivityCard }
