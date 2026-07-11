import { Plus, Moon } from 'lucide-react'

type WorkoutsHeaderProps = {
  onAddClick: () => void
  onLogSleepClick: () => void
}

function WorkoutsHeader({ onAddClick, onLogSleepClick }: WorkoutsHeaderProps) {
  return (
    <header className="workouts-header">
      <div>
        <p>Strava Activity Tracker</p>
        <h1>Workouts</h1>
      </div>
      <div className="workouts-header-actions">
        <button className="workouts-sleep-btn" onClick={onLogSleepClick} type="button">
          <Moon size={14} strokeWidth={2.5} />
          <span>Log Sleep</span>
        </button>
        <button className="workouts-add-btn" onClick={onAddClick} type="button">
          <Plus size={14} strokeWidth={2.5} />
          <span>Record Activity</span>
        </button>
      </div>
    </header>
  )
}

export { WorkoutsHeader }
