import { Plus } from 'lucide-react'

type WorkoutsHeaderProps = {
  onAddClick: () => void
}

function WorkoutsHeader({ onAddClick }: WorkoutsHeaderProps) {
  return (
    <header className="workouts-header">
      <div>
        <p>Strava Activity Tracker</p>
        <h1>Workouts</h1>
      </div>
      <div className="workouts-header-actions">
        <button className="workouts-add-btn" onClick={onAddClick} type="button">
          <Plus size={14} strokeWidth={2.5} />
          Record Activity
        </button>
      </div>
    </header>
  )
}

export { WorkoutsHeader }
