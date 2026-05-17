import { useEffect, useState, useMemo } from 'react'
import { Footprints, Bike, PersonStanding, Zap, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import type { StravaActivity } from '../../../../lib/api'

type ActivityLogCardProps = {
  activities: StravaActivity[]
  loading: boolean
  onEdit?: (activity: StravaActivity) => void
  onDelete?: (activity: StravaActivity) => void
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

  const formatPace = (pace?: number) => {
    if (!pace) return '—'
    const m = Math.floor(pace)
    const s = Math.round((pace - m) * 60)
    return `${m}:${s.toString().padStart(2, '0')}`
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
          style={{ background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent', padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          <Edit2 size={14} />
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
                    <span className={sport.cls} style={getSportStyle(activity.sportType)}>
                      <SportIcon size={14} strokeWidth={2.6} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <span className={`workouts-sport-badge ${badgeCls}`}>
                      {formatPace(activity.paceMinPerKm)}
                    </span>
                    {isEditMode && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {onEdit && (
                          <button type="button" onClick={() => onEdit(activity)} title="Edit" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <Edit2 size={12} />
                          </button>
                        )}
                        {onDelete && (
                          <button type="button" onClick={() => onDelete(activity)} title="Delete" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#d83542' }}>
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
