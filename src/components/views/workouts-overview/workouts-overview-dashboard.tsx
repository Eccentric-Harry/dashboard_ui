import { useEffect, useState, useCallback } from 'react'
import {
  WorkoutsHeader,
  StatCard,
  DistanceTrendCard,
  SportBreakdownCard,
  ActivityLogCard,
  StravaEmbedCard,
  AddActivityModal,
  UpdateEmbedModal
} from './components'
import { fetchStravaActivities, fetchStravaActivityStats } from '../../../lib/api'
import type { StravaActivity, StravaActivityStats } from '../../../lib/api'
import { Activity, Mountain, Timer, Flame } from 'lucide-react'

import { ConfirmDialog } from '../../ui/confirm-dialog'
import './workouts-overview.css'

function WorkoutsOverviewDashboard() {
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [stats, setStats] = useState<StravaActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [activityToDelete, setActivityToDelete] = useState<any>(null)

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

  return (
    <section className="workouts-dashboard" aria-label="Workouts overview dashboard">
      <WorkoutsHeader onAddClick={() => setIsAddModalOpen(true)} />
      <div className="workouts-dashboard-grid">
        <div className="workouts-stats-row">
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
        </div>
        <ActivityLogCard 
          activities={activities} 
          loading={loading} 
          onEdit={(activity) => {
            setEditingActivity(activity)
            setIsAddModalOpen(true)
          }}
          onDelete={(activity) => {
            setActivityToDelete(activity)
          }}
        />
        <StravaEmbedCard stats={stats} onEditClick={() => setIsEmbedModalOpen(true)} />
        <SportBreakdownCard stats={stats} loading={loading} />
        <DistanceTrendCard activities={activities} loading={loading} />
      </div>

      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingActivity(null)
        }}
        onSuccess={refreshData}
        isEdit={!!editingActivity}
        initialData={editingActivity}
      />

      <UpdateEmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        onSuccess={refreshData}
        currentEmbed={stats?.recentEmbeds?.[0]}
      />

      <ConfirmDialog
        open={!!activityToDelete}
        title="Delete Workout"
        message={`Are you sure you want to delete "${activityToDelete?.activityName}"?`}
        confirmLabel="Delete"
        onConfirm={() => {
          import('react-hot-toast').then(toast => {
            toast.default.success('Activity deleted')
            setActivityToDelete(null)
            refreshData()
          })
        }}
        onCancel={() => setActivityToDelete(null)}
      />
    </section>
  )
}

export { WorkoutsOverviewDashboard }
