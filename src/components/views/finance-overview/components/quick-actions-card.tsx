import { quickActions } from '../data'

function QuickActionsCard() {
  return (
    <section className="finance-card finance-quick-card">
      <h2>Quick Actions</h2>
      <div>
        {quickActions.map(({ label, icon: Icon }) => (
          <button key={label} type="button">
            <span>
              <Icon size={17} />
            </span>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

export { QuickActionsCard }
