import { useEffect, useState, useCallback } from 'react'
import { WorkoutsHeader } from './components/workouts-header'
import { StatCard } from './components/stat-card'
import { DistanceTrendCard } from './components/distance-trend-card'
import { SportBreakdownCard } from './components/sport-breakdown-card'
import { ActivityLogCard } from './components/activity-log-card'
import { StravaEmbedCard } from './components/strava-embed-card'
import { AddActivityModal } from './components/add-activity-modal'
import { fetchStravaActivities, fetchStravaActivityStats } from '../../../lib/api'
import type { StravaActivity, StravaActivityStats } from '../../../lib/api'
import { Activity, Mountain, Timer, Flame } from 'lucide-react'

import './workouts-overview.css'

function WorkoutsOverviewDashboard() {
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [stats, setStats] = useState<StravaActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const refreshData = useCallback(() => {
    setLoading(true)
    Promise.all([fetchStravaActivities(), fetchStravaActivityStats()])
      .then(([activitiesRes, statsRes]) => {
        setActivities(activitiesRes.data || [])
        setStats(statsRes.data || null)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching workouts data:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => { refreshData() }, [refreshData])

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = Math.floor(mins % 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <section className="workouts-dashboard" aria-label="Workouts overview dashboard">
      <WorkoutsHeader onAddClick={() => setIsAddModalOpen(true)} />
      <div className="workouts-dashboard-grid">
        <StatCard
          label="Total Distance"
          value={stats ? `${stats.totalDistanceKm.toFixed(1)}` : '—'}
          unit="km"
          icon={Activity}
          iconClass="run"
        />
        <StatCard
          label="Total Activities"
          value={stats ? `${stats.totalActivities}` : '—'}
          unit="sessions"
          icon={Flame}
          iconClass="streak"
        />
        <StatCard
          label="Best 5K Pace"
          value={stats?.best5kPaceFormatted || '—'}
          unit="min/km"
          icon={Timer}
          iconClass="pace"
        />
        <StatCard
          label="Total Elevation"
          value={stats ? `${stats.totalElevationMeters.toLocaleString()}` : '—'}
          unit="m"
          icon={Mountain}
          iconClass="elev"
        />
        <DistanceTrendCard activities={activities} loading={loading} />
        <SportBreakdownCard stats={stats} loading={loading} />
        <ActivityLogCard activities={activities} loading={loading} />
        <StravaEmbedCard stats={stats} />
      </div>

      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshData}
      />
    </section>
  )
}

export { WorkoutsOverviewDashboard }
