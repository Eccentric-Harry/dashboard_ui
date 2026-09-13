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
        <button className="workouts-add-btn add-pill" onClick={onAddClick} type="button">
          <span className="add-pill-ic"><Plus size={16} strokeWidth={2.75} /></span>
          <span>Add activity</span>
        </button>
      </div>
    </header>
  )
}

export { WorkoutsHeader }
