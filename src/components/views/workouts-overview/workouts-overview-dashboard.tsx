import { useEffect, useState, useCallback } from 'react'
import {
  WorkoutsHeader,
  StatCard,
  DistanceTrendCard,
  SportBreakdownCard,
  ActivityLogCard,
  StravaEmbedCard,
  AddActivityModal,
  UpdateEmbedModal,
} from './components'
import { useWorkoutsStore } from '../../../store/workouts-store'
import { Activity, Mountain, Timer, Flame } from 'lucide-react'

import { ConfirmDialog } from '../../ui/confirm-dialog'
import toast from 'react-hot-toast'
import './workouts-overview.css'

function WorkoutsOverviewDashboard() {
  // Server state from the workouts store; UI state (modals, edit/delete targets) stays local.
  const activitiesState = useWorkoutsStore.use.activities()
  const statsState = useWorkoutsStore.use.stats()
  const workoutsActions = useWorkoutsStore.use.actions()

  const activities = activitiesState.data
  const stats = statsState.data
  const loading =
    activitiesState.loading || statsState.loading ||
    (!activitiesState.loaded && !activitiesState.hasErrors)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingActivity, setEditingActivity] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activityToDelete, setActivityToDelete] = useState<any>(null)

  const refreshData = useCallback(() => {
    void workoutsActions.loadAll()
  }, [workoutsActions])

  useEffect(() => { void workoutsActions.loadAll() }, [workoutsActions])

  // Bottom-dock quick-add bubble opens the same "add activity" modal
  useEffect(() => {
    const handler = () => setIsAddModalOpen(true)
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [])

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
          toast.success('Activity deleted')
          setActivityToDelete(null)
          refreshData()
        }}
        onCancel={() => setActivityToDelete(null)}
      />
    </section>
  )
}

export { WorkoutsOverviewDashboard }
