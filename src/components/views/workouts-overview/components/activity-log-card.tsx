import { useState, useMemo } from 'react'
import { Footprints, Bike, PersonStanding, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import type { StravaActivity } from '../../../../lib/api'

type ActivityLogCardProps = {
  activities: StravaActivity[]
  loading: boolean
}

const sportIcons: Record<string, { icon: any; cls: string }> = {
  Run: { icon: Footprints, cls: 'run-icon' },
  Ride: { icon: Bike, cls: 'ride-icon' },
  Walk: { icon: PersonStanding, cls: 'walk-icon' },
  'E-Bike Ride': { icon: Zap, cls: 'ebike-icon' },
}

const sportBadgeCls: Record<string, string> = {
  Run: 'run',
  Ride: 'ride',
  Walk: 'walk',
  'E-Bike Ride': 'ebike',
}

function ActivityLogCard({ activities, loading }: ActivityLogCardProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  const sportTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.sportType))
    return Array.from(types).sort()
  }, [activities])

  const filtered = useMemo(() => {
    setCurrentPage(1) // Reset page when filter changes
    if (!filter) return activities
    return activities.filter(a => a.sportType === filter)
  }, [activities, filter])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`
  }

  const formatPace = (pace?: number) => {
    if (!pace) return '—'
    const m = Math.floor(pace)
    const s = Math.round((pace - m) * 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="workouts-card workouts-log-card">
      <div className="workouts-section-head">
        <div>
          <h2>Activity Log</h2>
          <p>{filtered.length} activities recorded</p>
        </div>
      </div>

      <div className="workouts-log-filters">
        <button
          className={`workouts-filter-btn ${filter === null ? 'active' : ''}`}
          onClick={() => setFilter(null)}
          type="button"
        >
          All
        </button>
        {sportTypes.map(type => (
          <button
            key={type}
            className={`workouts-filter-btn ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
            type="button"
          >
            {type}
          </button>
        ))}
      </div>

      <div className="workouts-log-table">
        <div className="workouts-log-row header">
          <span>Activity</span>
          <span>Distance</span>
          <span className="mobile-hide">Time</span>
          <span>Pace</span>
        </div>
        <div className="workouts-log-list">
          {loading ? (
            <div className="workouts-loading"><span className="workouts-loading-dot">Loading activities…</span></div>
          ) : paginated.length === 0 ? (
            <div className="workouts-loading">No activities found</div>
          ) : (
            paginated.map((activity, i) => {
              const sport = sportIcons[activity.sportType] || sportIcons.Run
              const SportIcon = sport.icon
              const badgeCls = sportBadgeCls[activity.sportType] || 'run'

              return (
                <div className="workouts-log-row" key={activity.id || i}>
                  <div className="workouts-activity-name">
                    <span className={sport.cls}>
                      <SportIcon size={16} strokeWidth={2} />
                    </span>
                    <p>
                      <b>{activity.activityName}</b>
                      <small>
                        {formatDate(activity.date)}
                        <span className="mobile-only"> · {activity.movingTime}</span>
                      </small>
                    </p>
                  </div>
                  <span>{activity.distanceKm.toFixed(2)} km</span>
                  <span className="mobile-hide">{activity.movingTime}</span>
                  <span className={`workouts-sport-badge ${badgeCls}`}>
                    {formatPace(activity.paceMinPerKm)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="workouts-pagination">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
              className="pagination-btn"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
              className="pagination-btn"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export { ActivityLogCard }
