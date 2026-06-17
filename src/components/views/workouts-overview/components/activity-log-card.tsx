import { useEffect, useState, useMemo } from 'react'
import { Footprints, Bike, PersonStanding, Zap, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { StravaActivity } from '../../../../lib/api'

type ActivityLogCardProps = {
  activities: StravaActivity[]
  loading: boolean
  onEdit?: (activity: StravaActivity) => void
  onDelete?: (activity: StravaActivity) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function ActivityLogCard({ activities, loading, onEdit, onDelete }: ActivityLogCardProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const pageSize = 6

  const getSportStyle = (sportType: string) => {
    switch (sportType) {
      case 'Run':
        return {
          background: '#eafaf1',
          color: '#16a34a',
          border: 'none',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }
      case 'Ride':
        return {
          background: '#e6f0ff',
          color: '#2563eb',
          border: 'none',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }
      case 'Walk':
        return {
          background: '#fff4e6',
          color: '#d97706',
          border: 'none',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }
      case 'E-Bike Ride':
        return {
          background: '#f5f2ff',
          color: '#7c3aed',
          border: 'none',
          borderRadius: '10px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
        }
      default:
        return {
          background: 'rgba(107, 114, 128, 0.12)',
          color: '#4b5563',
          border: '1px solid rgba(107, 114, 128, 0.25)',
          borderRadius: '10px',
          boxShadow: 'none'
        }
    }
  }

  const sportTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.sportType))
    return Array.from(types).sort()
  }, [activities])

  const filtered = useMemo(() => {
    if (!filter) return activities
    return activities.filter(a => a.sportType === filter)
  }, [activities, filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [filter])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`
  }

  const formatActivityMetric = (activity: StravaActivity) => {
    const { sportType, paceMinPerKm, distanceKm, movingTimeMinutes } = activity
    if (sportType === 'Run' || sportType === 'Walk') {
      if (!paceMinPerKm) return '—'
      const m = Math.floor(paceMinPerKm)
      const s = Math.round((paceMinPerKm - m) * 60)
      return `${m}:${s.toString().padStart(2, '0')}/km`
    }
    if (sportType === 'Ride' || sportType === 'E-Bike Ride') {
      if (!distanceKm || !movingTimeMinutes || movingTimeMinutes === 0) return '—'
      const speedKmh = distanceKm / (movingTimeMinutes / 60)
      return `${speedKmh.toFixed(1)} KM/H`
    }
    return '—'
  }

  return (
    <div className="workouts-card workouts-log-card">
      <div className="workouts-section-head" style={{ alignItems: 'center' }}>
        <div>
          <h2>Activity Log</h2>
          <p>{filtered.length} activities recorded</p>
        </div>
        <button 
          className={`workouts-transaction-action-btn ${isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(!isEditMode)}
          aria-label="Toggle edit mode"
          style={{ 
            background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent', 
            padding: '0', 
            borderRadius: '8px', 
            border: 'none', 
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: '32px',
            minHeight: '32px',
            boxShadow: 'none',
          }}
        >
          <Pencil size={14} strokeWidth={2.5} />
        </button>
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
          <span className="mobile-hide">Pace/Speed</span>
          <span>Duration</span>
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
                    <span className={sport.cls} style={getSportStyle(activity.sportType)}>
                      <SportIcon size={14} strokeWidth={2.6} />
                    </span>
                    <p>
                      <b>{activity.activityName}</b>
                      <small>
                        {formatDate(activity.date)}
                        <span className="mobile-only">
                          {' · '}
                          <span style={{ 
                            color: '#ca8a04', 
                            background: '#fef9c3', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            fontWeight: 700,
                            fontSize: '9px',
                            display: 'inline-block',
                          }}>
                            {formatActivityMetric(activity)}
                          </span>
                        </span>
                      </small>
                    </p>
                  </div>
                  <span>{activity.distanceKm.toFixed(2)} km</span>
                  <span className="mobile-hide">
                    <span style={{ 
                      color: '#ca8a04', 
                      background: '#fef9c3', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 700,
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      display: 'inline-block',
                    }}>
                      {formatActivityMetric(activity)}
                    </span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <span className={`workouts-sport-badge ${badgeCls}`}>
                      {activity.movingTime}
                    </span>
                    {isEditMode && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {onEdit && (
                          <button 
                            type="button" 
                            onClick={() => onEdit(activity)}
                            aria-label="Edit activity"
                            style={{
                              display: 'grid',
                              width: '28px',
                              height: '28px',
                              placeItems: 'center',
                              border: '0',
                              borderRadius: '6px',
                              background: 'rgba(23, 28, 25, 0.05)',
                              color: 'rgba(23, 28, 25, 0.7)',
                              cursor: 'pointer',
                              transition: 'background 0.2s, color 0.2s',
                              boxShadow: 'none',
                              minWidth: '28px',
                              minHeight: '28px',
                              padding: '0',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(23, 28, 25, 0.1)'
                              e.currentTarget.style.color = 'rgba(23, 28, 25, 0.9)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(23, 28, 25, 0.05)'
                              e.currentTarget.style.color = 'rgba(23, 28, 25, 0.7)'
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            type="button" 
                            onClick={() => onDelete(activity)}
                            aria-label="Delete activity"
                            style={{
                              display: 'grid',
                              width: '28px',
                              height: '28px',
                              placeItems: 'center',
                              border: '0',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#dc2626',
                              cursor: 'pointer',
                              transition: 'background 0.2s, color 0.2s',
                              boxShadow: 'none',
                              minWidth: '28px',
                              minHeight: '28px',
                              padding: '0',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                              e.currentTarget.style.color = '#b91c1c'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
                              e.currentTarget.style.color = '#dc2626'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
