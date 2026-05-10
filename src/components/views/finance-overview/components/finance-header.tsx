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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>Today</span>
        {onAddClick && (
          <button 
            type="button" 
            onClick={onAddClick}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '32px', padding: '0 16px', borderRadius: '16px',
              background: '#101312', color: '#fff', fontSize: '12px',
              fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 19, 18, 0.15)'
            }}
          >
            <Plus size={14} strokeWidth={3} />
            Add
          </button>
        )}
      </div>
    </header>
  )
}

export { FinanceHeader }
