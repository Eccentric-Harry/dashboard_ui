import { Plus } from 'lucide-react'

interface FinanceHeaderProps {
  onAddClick?: () => void
}

function FinanceHeader({ onAddClick }: FinanceHeaderProps) {
  return (
    <header className="finance-header">
      <div>
        <p>Finance Overview</p>
        <h1>Welcome back, Harry!</h1>
      </div>
      {onAddClick && (
        <div className="finance-header-actions">
          <button
            type="button"
            onClick={onAddClick}
            className="finance-add-btn"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Add</span>
          </button>
        </div>
      )}
    </header>
  )
}

export { FinanceHeader }
